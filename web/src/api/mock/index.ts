// The whole HTTP API in memory, with fake latency, so the UI runs with no backend (npm run dev:mock, Playwright).
import { ApiError, networkError } from "../errors.ts";
import type { Api, Clip, ClipPostOptions, Job, JobDeleteClips, JobDeleted, Platform, Post, Settings, SimilarClip, TikTokPostOptions } from "../types.ts";
import { clipOptionsProblem, presetOf, presetProblem } from "../../lib/preset.ts";
import { TIKTOK_PICK_AGAIN } from "../../lib/upload.ts";
import { PLATFORM_LABEL, PLATFORM_ORDER } from "../../lib/format.ts";
import { MOMENTS, PLATFORMS, STEP_KEYS, coverArt, seed, stepsAt, thumbArt, ulid, type Store } from "./fixtures.ts";
import { installMockLiveControls, mockLive } from "./live.ts";
import { lineFor, sampleLine, SCRIPT } from "./jobLive.ts";
import { setupApi } from "./setup.ts";
import { statsApi, type StatsFaults } from "./stats.ts";
import { skillsApi, type MockSkillControls } from "./skills.ts";
import { lessonsApi, type LessonsFault } from "./lessons.ts";
import { followsApi } from "./follows.ts";
import { followersApi } from "./followers.ts";
import { mockMoneyGrant, moneyApi } from "./money.ts";
import { pushApi } from "./push.ts";
import { isSoundId } from "../../lib/soundCatalog.ts";
import { isBackgroundMode, isGlassStrength, isHexColour, MAX_COLOURS } from "../../lib/background.ts";
import { currentClipModel, isClipModel } from "../../lib/models.ts";

const STEP_MS = 3500;
/** api settings.MAX_USD_PER_1000: the retired `earningsRates` (§21) are still validated, never read (§25.6). */
const RETIRED_MAX_RATE = 100;
const clone = <T>(v: T): T => structuredClone(v);

/** Browser automation (Playwright) freezes job progress so screens and screenshots stay stable. */
const frozen = () => typeof navigator !== "undefined" && navigator.webdriver === true;

function delay(min = 160, max = 420): Promise<void> {
  const slow =
    typeof window === "undefined"
      ? undefined
      : (window as unknown as { __cfMockFaults?: MockFaults }).__cfMockFaults
          ?.latencyMs;
  const ms =
    slow !== undefined
      ? slow
      : frozen()
        ? 30
        : min + Math.random() * (max - min);
  return new Promise((r) => setTimeout(r, ms));
}

const notFound = (what: string) => new ApiError(404, "not_found", `That ${what} no longer exists.`);
const conflict = (msg: string) => new ApiError(409, "conflict", msg);
const bad = (msg: string) => new ApiError(400, "bad_request", msg);
const ALREADY_DECIDED = "This clip has already been confirmed or declined.";

/**
 * Knobs for tests (Playwright reaches them as window.__cfMockFaults). `keepStopsAfterSave` makes the next N Keeps
 * save the clip and then fail like a dropped connection, before posting starts. `resumeAfterMs` is how old a
 * stuck Keep must be before Keep again finishes it (the API waits 60 seconds).
 */
export interface MockFaults extends StatsFaults {
  keepStopsAfterSave: number;
  resumeAfterMs: number;
  /** "Like clips that did well" finds nothing (the strip must hide). */
  similarEmpty?: boolean;
  /** Jobs list pages hold at most this many jobs, whatever limit is asked for (so "Show older jobs" shows). */
  jobsPageSize?: number;
  /** The next N "Show older jobs" pages (listJobs with a cursor) fail like a server error. */
  olderJobsFails?: number;
  /** The next N job deletes (deleteJob, deleteJobs) fail like a server error (§34). */
  deleteJobFails?: number;
  /** The next N Make clips (createJob) fail like a server error. */
  createJobFails?: number;
  /** The next N setup checks (getSetup) fail like a server error (Review must not guess where a clip goes). */
  setupFails?: number;
  /** Every answer takes this long (ms), like a slow connection to the cloud (a page change must not blink meanwhile). */
  latencyMs?: number;
  /** Settings › What it learned shows the never-checked ("empty") or not-enough-clips ("needs-more") state. */
  lessons?: LessonsFault;
}

const serverDown = () => new ApiError(503, "internal", "Something went wrong on our side. Try again in a moment.");

/** How often each API method was called (window.__cfMockCalls), so tests can tell a poll from a live update. */
export type MockCalls = Record<string, number>;

/** The setup to-do list's confirmed skips live on the "server", so in mock mode they survive a reload (§17.13). */
const SKIPPED_KEY = "cf-mock-setup-skipped";
function loadSkipped(): Settings["setupSkipped"] | null {
  try {
    const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(SKIPPED_KEY);
    const list: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(list) ? PLATFORMS.filter((p) => list.includes(p)) : null;
  } catch {
    return null;
  }
}
function saveSkipped(list: Settings["setupSkipped"]) {
  try {
    sessionStorage.setItem(SKIPPED_KEY, JSON.stringify(list ?? []));
  } catch {
    /* private mode: kept for this page only */
  }
}

const EMPTY_KEY = "cf-mock-empty";
function emptyAccount(): boolean {
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(EMPTY_KEY) === "1";
  } catch {
    return false;
  }
}

// The look settings (§22) survive a reload of the mock, like the real server, so persistence can be tested.
const LOOK_KEY = "cf-mock-look";
const LOOK_FIELDS = ["backgroundMode", "backgroundColours", "glassStrength"] as const;
function saveMockLook(s: Settings) {
  try {
    sessionStorage.setItem(LOOK_KEY, JSON.stringify(Object.fromEntries(LOOK_FIELDS.map((k) => [k, s[k]]))));
  } catch {
    /* no storage: the look resets on reload */
  }
}
function loadMockLook(): Partial<Settings> {
  try {
    const raw = JSON.parse(sessionStorage.getItem(LOOK_KEY) ?? "{}") as Partial<Settings>;
    const out: Partial<Settings> = {};
    if (isBackgroundMode(raw.backgroundMode)) out.backgroundMode = raw.backgroundMode;
    if (isGlassStrength(raw.glassStrength)) out.glassStrength = raw.glassStrength;
    if (Array.isArray(raw.backgroundColours) && raw.backgroundColours.every(isHexColour)) out.backgroundColours = raw.backgroundColours;
    return out;
  } catch {
    return {};
  }
}

/** A job waiting for the owner's Mac (§35): blocked by YouTube, or made in the desktop app. */
function macWaiting(j: Job): boolean {
  const state = j.macFetch?.state;
  return (j.status === "queued" || j.status === "running") && (state === "waiting" || state === "getting" || state === "sending");
}

export function mockApi(store: Store = seed(), faults: MockFaults = { keepStopsAfterSave: 0, resumeAfterMs: 60_000 }): Api {
  const calls: MockCalls = {};
  const skipped = loadSkipped();
  if (skipped) store.settings.setupSkipped = skipped;
  if (typeof window !== "undefined") {
    (window as unknown as { __cfMockFaults?: MockFaults }).__cfMockFaults = faults;
    (window as unknown as { __cfMockCalls?: MockCalls }).__cfMockCalls = calls;
    store.settings = { ...store.settings, ...loadMockLook() };
  }

  // Live events carry the same public shapes as the HTTP API, minus the presigned media links (§14.2).
  const publishJob = (j: Job) => mockLive.publish({ type: "job", op: "upsert", id: j.jobId, item: clone(j) });
  const publishClip = (c: Clip) => {
    const { videoUrl: _v, coverUrl: _c, ...rest } = clone(c);
    mockLive.publish({ type: "clip", op: "upsert", id: c.clipId, item: rest });
  };
  /** A fetched job carries its live line while it runs, like GET /v1/jobs and /v1/jobs/{id} (§31). */
  const withLive = (j: Job): Job => {
    const live = sampleLine(j);
    return live ? { ...clone(j), live } : clone(j);
  };
  const publishLine = (j: Job, frame: (typeof SCRIPT)[number]) => {
    const item = lineFor(j, frame);
    mockLive.publish({ type: "jobLive", op: "upsert", id: j.jobId, item });
  };
  let scriptAt = 0;
  const publishPost = (p: Post) => mockLive.publish({ type: "post", op: "upsert", id: p.postId, item: clone(p) });
  // When each kept clip's posting was last started (stands in for the API's publishState: "pending" timing).
  const claimedAt = new Map<string, number>();
  // The TikTok sheet's choices stored on each TikTok post (the API's postOptions.tiktok, never returned).
  const postOptions = new Map<string, TikTokPostOptions>();
  // Each place's own choices sent with Upload (§36.3), by post (the API's postOptions, never returned).
  const clipOptions = new Map<string, object>();

  /**
   * Try again on a failed clip (§14.5): failed posts go back to queued and the clip to confirmed. New TikTok sheet
   * choices replace the failed TikTok post's postOptions, like the API's _try_again.
   */
  function tryAgain(c: Clip, tiktok?: TikTokPostOptions, platforms?: Platform[]) {
    const failed = store.posts.filter((p) => p.clipId === c.clipId && p.status === "failed" && (!platforms || platforms.includes(p.platform)));
    // Naming no failed place changes nothing (§33).
    if (!failed.length) return { clip: clone(c), posts: clone(store.posts.filter((p) => p.clipId === c.clipId)) };
    for (const p of failed) {
      p.status = "queued";
      delete p.error;
      if (tiktok && p.platform === "tiktok") postOptions.set(p.postId, clone(tiktok));
      publishPost(p);
    }
    // A failed clip goes back to confirmed; an uploaded one (one place did not work) stays posted (§33).
    if (c.status === "failed") c.status = "confirmed";
    publishClip(c);
    return { clip: clone(c), posts: clone(store.posts.filter((p) => p.clipId === c.clipId)) };
  }

  /** Test knob (window.__cfMock.posting): a kept clip whose TikTok post failed because its privacy choice is gone. */
  const posting = {
    failTikTok(): { clipId: string; postId: string; hook: string } {
      const c = store.clips.find((x) => x.status === "confirmed" || x.status === "posted" || x.status === "publishing");
      if (!c) throw new Error("no kept clip");
      let p = store.posts.find((x) => x.clipId === c.clipId && x.platform === "tiktok");
      if (!p) {
        p = { postId: ulid(), clipId: c.clipId, platform: "tiktok", status: "failed" };
        store.posts.push(p);
      }
      for (const x of store.posts) if (x.clipId === c.clipId && x.status !== "posted") x.status = "failed";
      Object.assign(p, { status: "failed", error: TIKTOK_PICK_AGAIN });
      delete p.url;
      delete p.postedAt;
      delete p.metrics;
      c.status = "failed";
      for (const x of store.posts) if (x.clipId === c.clipId) publishPost(x);
      publishClip(c);
      return { clipId: c.clipId, postId: p.postId, hook: c.hook };
    },
    /**
     * §33: the clip's posts go up, except `platform`, which did not work (with a plain reason). The clip is posted, so
     * that place gets its own Try again.
     */
    settleWithOneFailed(clipId: string, platform: Platform, reason = "X said no this time. Press Try again."): void {
      const c = clip(clipId);
      for (const x of store.posts.filter((p) => p.clipId === clipId)) {
        if (x.platform === platform) Object.assign(x, { status: "failed", error: reason });
        else if (x.status === "queued") Object.assign(x, { status: "posted", postedAt: new Date().toISOString(), url: `https://example.com/${x.platform}/${x.postId}` });
        publishPost(x);
      }
      c.status = "posted";
      publishClip(c);
    },
    /** The clip's posts, as the server holds them. */
    posts(clipId: string): Post[] {
      return clone(store.posts.filter((p) => p.clipId === clipId));
    },
    options(postId: string): TikTokPostOptions | null {
      return clone(postOptions.get(postId) ?? null);
    },
    /** §36.3: the YouTube, Instagram or X choices stored on a post. */
    clipOptions(postId: string): object | null {
      return clone(clipOptions.get(postId) ?? null);
    },
  };
  if (typeof window !== "undefined") {
    const w = window as unknown as { __cfMock?: Record<string, unknown> };
    w.__cfMock = { ...(w.__cfMock ?? {}), posting };
  }

  // When each running job's current step began, to move it along over time.
  const clock = new Map<string, { at: number; done: number }>();
  for (const j of store.jobs) {
    if (j.status === "running") clock.set(j.jobId, { at: Date.now(), done: j.steps.findIndex((s) => s.status === "running") });
  }

  function finish(job: Job) {
    const count = job.clipTarget.min + Math.floor(Math.random() * (job.clipTarget.max - job.clipTarget.min + 1));
    const tags = job.notes?.match(/#\w+/g)?.join(" ") ?? "#clips";
    for (let i = 0; i < count; i++) {
      const m = MOMENTS[(i + job.jobId.charCodeAt(25)) % MOMENTS.length]!;
      const layout = i % 3 === 0 ? "blur_fill" : "facecam_top";
      store.clips.push({
        clipId: ulid(),
        jobId: job.jobId,
        rank: i + 1,
        status: "review",
        momentType: m.type,
        hook: m.hook,
        summary: m.summary,
        durationSec: 20 + i * 3,
        sourceStart: 300 + i * 600,
        sourceEnd: 320 + i * 603,
        sourceUrlAt: job.source.url,
        layout,
        coverUrl: coverArt(i + 2, m.hook, layout),
        captions: {
          youtubeTitle: `${m.hook} ${tags}`,
          youtubeDescription: m.summary,
          instagram: `${m.hook}\n${tags}`,
          facebook: m.hook,
          tiktok: `${m.hook} ${tags}`,
          x: `${m.hook} ${tags}`,
        },
        checklist: { items: [{ key: "hook_3s", label: "Hook lands in the first 3 seconds", pass: true }], fixes: [] },
        score: m.score,
        pickedFor: m.why,
        createdAt: new Date().toISOString(),
      });
    }
    job.status = "ready";
    job.clipCount = count;
    job.progress = 1;
    job.steps = stepsAt(STEP_KEYS.length, "ready");
    job.updatedAt = new Date().toISOString();
    for (const c of store.clips) if (c.jobId === job.jobId) publishClip(c);
  }

  function tick() {
    if (frozen()) return;
    const now = Date.now();
    for (const job of store.jobs) {
      // Waiting for the owner's Mac (§35): nothing moves until the Mac reports (macProgress) or sends the video.
      if (macWaiting(job)) continue;
      if (job.status === "queued" && now - Date.parse(job.createdAt) > 4000) {
        job.status = "running";
        clock.set(job.jobId, { at: now, done: 0 });
      }
      const c = clock.get(job.jobId);
      if (job.status !== "running" || !c) continue;
      const before = job.progress;
      const done = Math.min(STEP_KEYS.length, c.done + Math.floor((now - c.at) / STEP_MS));
      if (done >= STEP_KEYS.length) {
        finish(job);
        clock.delete(job.jobId);
      } else {
        const within = ((now - c.at) % STEP_MS) / STEP_MS;
        job.steps = stepsAt(done, "running", STEP_KEYS[done] === "render" ? "Cutting the clips" : undefined);
        job.progress = Math.min(0.99, (done + within) / STEP_KEYS.length);
      }
      job.updatedAt = new Date().toISOString();
      const live = sampleLine(job);
      if (live) mockLive.publish({ type: "jobLive", op: "upsert", id: job.jobId, item: live });
      // Like the agent's heartbeats: a message only when the job really moved.
      if (Math.round(job.progress * 100) !== Math.round(before * 100) || job.status !== "running") publishJob(job);
    }
  }

  /** One step forward for the newest running job, pushed live (tests use it; automation freezes the clock). */
  function advance() {
    const j = [...store.jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find((x) => x.status === "running");
    if (!j) return;
    const done = j.steps.findIndex((s) => s.status === "running") + 1;
    clock.delete(j.jobId);
    if (done >= STEP_KEYS.length) finish(j);
    else {
      j.steps = stepsAt(done, "running");
      j.progress = done / STEP_KEYS.length;
      j.updatedAt = new Date().toISOString();
    }
    publishJob(j);
  }
  /** The next scripted live line for the newest running job, pushed live (tests and screenshots, §31). */
  function line(at?: number) {
    const j = [...store.jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find((x) => x.status === "running");
    if (!j) return;
    const k = at ?? scriptAt;
    scriptAt = k + 1;
    publishLine(j, SCRIPT[k % SCRIPT.length]!);
  }
  mockLive.tick = tick;
  installMockLiveControls(advance, line);

  // An empty account (window.__cfMock.jobs.clear()) lasts until the tab closes, so a reload shows the empty states.
  if (emptyAccount()) {
    store.jobs.length = 0;
    store.clips.length = 0;
  }
  /** Test knob (window.__cfMock.jobs): a finished job as it was saved before the "watch" step existed (nine steps). */
  const jobKnobs = {
    /** No jobs and no clips, as for a new owner, so the empty Home and Jobs can be checked (reload to see them). */
    clear() {
      store.jobs.length = 0;
      store.clips.length = 0;
      try {
        sessionStorage.setItem(EMPTY_KEY, "1");
      } catch {
        /* no storage: empty for this page only */
      }
    },
    oldSteps(): { jobId: string; title: string } | null {
      const j = store.jobs.find((x) => x.status === "ready");
      if (!j) return null;
      j.steps = j.steps.filter((s) => s.key !== "watch");
      publishJob(j);
      return { jobId: j.jobId, title: j.source.title ?? "" };
    },
    /** A working job whose record says 100% while steps are left (as a run before the 2026-11-20 fix wrote it). */
    fullBar(): { jobId: string; title: string } | null {
      const j = store.jobs.find((x) => x.status === "running");
      if (!j) return null;
      j.progress = 1;
      publishJob(j);
      return { jobId: j.jobId, title: j.source.title ?? "" };
    },
  };
  if (typeof window !== "undefined") {
    const w = window as unknown as { __cfMock?: Record<string, unknown> };
    w.__cfMock = { ...(w.__cfMock ?? {}), jobs: jobKnobs };
  }

  const stats = statsApi({ store, publish: (ev) => mockLive.publish(ev), faults, automated: frozen });
  const setup = setupApi({
    onAccounts: (accounts) => {
      store.accounts = accounts;
    },
    publish: (platform) => mockLive.publish({ type: "setup", op: "upsert", id: platform, partial: true }),
  });

  const job = (jobId: string) => {
    const j = store.jobs.find((x) => x.jobId === jobId);
    if (!j) throw notFound("job");
    return j;
  };
  const clip = (clipId: string) => {
    const c = store.clips.find((x) => x.clipId === clipId);
    if (!c) throw notFound("clip");
    return c;
  };
  /** Deletes one job like the API (§34): thrown-away clips always, Review clips only with "delete", never others. */
  const removeJob = (jobId: string, clips: JobDeleteClips): JobDeleted => {
    const j = store.jobs.find((x) => x.jobId === jobId);
    if (!j) return { jobId, deleted: false, clipsDeleted: 0, clipsKept: 0 };
    const mine = store.clips.filter((c) => c.jobId === jobId);
    const gone = mine.filter((c) => c.status === "declined" || (clips === "delete" && c.status === "review"));
    store.clips = store.clips.filter((c) => !gone.includes(c));
    store.jobs = store.jobs.filter((x) => x !== j);
    clock.delete(jobId);
    for (const c of gone) mockLive.publish({ type: "clip", op: "delete", id: c.clipId });
    mockLive.publish({ type: "job", op: "delete", id: jobId });
    return { jobId, deleted: true, clipsDeleted: gone.length, clipsKept: mine.length - gone.length };
  };
  const skills = skillsApi(store, delay);
  const lessons = lessonsApi(() => store.clips, () => faults.lessons, () => delay());
  const follows = followsApi((ev) => mockLive.publish(ev), () => delay());
  const money = moneyApi(() => delay(), { clips: () => store.clips, posts: () => store.posts });
  const followers = followersApi(() => delay());
  if (typeof window !== "undefined") {
    // Merge, never replace: posting (above) and setup (mock/setup.ts) keep their knobs on the same object.
    const w = window as unknown as { __cfMock?: Record<string, unknown> & Partial<MockSkillControls> };
    w.__cfMock = Object.assign(w.__cfMock ?? {}, skills.controls, { follows: follows.controls, money: money.controls, followers: followers.controls });
  }

  const api: Api = {
    async health() {
      await delay();
      return { ok: true, version: "mock" };
    },
    async me() {
      await delay();
      tick();
      return {
        user: { id: "mock-owner", email: "owner@example.com" },
        settings: clone(store.settings),
        counts: {
          review: store.clips.filter((c) => c.status === "review").length,
          running: store.jobs.filter((j) => j.status === "running" || j.status === "queued").length,
          posted: store.clips.filter((c) => c.status === "posted").length,
        },
      };
    },
    async createUpload({ filename, contentType, size }) {
      await delay();
      if (!contentType.startsWith("video/")) throw bad("Pick a video file, like an MP4 or MOV.");
      if (size > 5 * 1024 ** 3) throw new ApiError(413, "too_large", "Videos can be up to 5 GB.");
      const uploadId = ulid();
      return {
        uploadId,
        key: `uploads/mock-owner/${uploadId}/${filename}`,
        uploadUrl: "mock://upload",
        headers: { "Content-Type": contentType },
      };
    },
    async createJob(body) {
      await delay();
      if ((faults.createJobFails ?? 0) > 0) {
        faults.createJobFails!--;
        throw serverDown();
      }
      const now = new Date().toISOString();
      const isLink = body.source.type === "link";
      const url = isLink ? (body.source as { url: string }).url : undefined;
      const platform = !isLink ? "upload" : /twitch\.tv/.test(url!) ? "twitch" : /kick\.com/.test(url!) ? "kick" : "youtube";
      const filename = body.source.type === "upload" ? body.source.filename : undefined;
      const j: Job = {
        jobId: ulid(),
        status: "queued",
        source: {
          type: body.source.type,
          platform,
          url,
          key: body.source.type === "upload" ? body.source.key : undefined,
          filename,
          title: filename ?? "Reading the link…",
          thumbnailUrl: thumbArt(store.jobs.length, platform === "upload" ? "Upload" : platform),
        },
        clipTarget: body.clipTarget,
        steps: stepsAt(0, "queued"),
        // Like the API (§35): every YouTube link job may wait for the Mac; from the desktop app it does from the start.
        ...(isLink && platform === "youtube"
          ? { macFetch: body.macFetch ? { state: "waiting" as const, up: true, since: now } : { state: "cloud" as const } }
          : {}),
        progress: 0,
        clipCount: 0,
        notes: body.notes,
        // Like the agent (ADR-42): the job is made with the model picked in Settings at the time.
        model: currentClipModel(store.settings.clipModel),
        createdAt: now,
        updatedAt: now,
      };
      store.jobs.unshift(j);
      publishJob(j);
      // Like the API (§35.8): the file replaces the link job it came from, and that job's wait for the Mac ends.
      const old = body.replaces && body.source.type === "upload" ? store.jobs.find((o) => o.jobId === body.replaces) : undefined;
      const oldState = old?.macFetch?.state;
      if (old && (old.status === "queued" || old.status === "running") && oldState && oldState !== "cloud" && oldState !== "failed") {
        old.status = "canceled";
        old.replacedBy = j.jobId;
        old.steps = old.steps.map((s) => (s.status === "running" ? { ...s, status: "pending", message: undefined } : s));
        clock.delete(old.jobId);
        old.updatedAt = now;
        publishJob(old);
      }
      return clone(j);
    },
    async listJobs({ limit = 20, cursor } = {}) {
      await delay();
      if (cursor && (faults.olderJobsFails ?? 0) > 0) {
        faults.olderJobsFails!--;
        throw serverDown();
      }
      if (faults.jobsPageSize) limit = Math.min(limit, faults.jobsPageSize);
      tick();
      const sorted = [...store.jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const start = cursor ? Number(cursor) : 0;
      const page = sorted.slice(start, start + limit);
      const next = start + limit < sorted.length ? String(start + limit) : null;
      return { jobs: page.map(withLive), nextCursor: next };
    },
    async getJob(jobId) {
      await delay();
      tick();
      const j = job(jobId);
      const clips = store.clips.filter((c) => c.jobId === jobId).sort((a, b) => a.rank - b.rank);
      return { job: withLive(j), clips: clone(clips) };
    },
    async cancelJob(jobId) {
      await delay();
      const j = job(jobId);
      if (j.status !== "queued" && j.status !== "running") throw conflict("Only a job that is still working can be canceled.");
      j.status = "canceled";
      j.steps = j.steps.map((s) => (s.status === "running" ? { ...s, status: "pending", message: undefined } : s));
      clock.delete(jobId);
      j.updatedAt = new Date().toISOString();
      publishJob(j);
      return clone(j);
    },
    async macProgress(jobId, body) {
      await delay();
      const j = job(jobId);
      if (!macWaiting(j)) throw conflict("This job is not waiting for your Mac.");
      const now = new Date().toISOString();
      if (body.phase === "failed") {
        j.status = "failed";
        j.error = body.error === "full" ? `Your Mac is full. Free up ${body.needGb ?? 1} GB.` : "Your Mac could not get the video. Tap Try again, or tap Use a video file.";
        j.macFetch = { ...j.macFetch!, state: "failed", at: now };
      } else {
        j.status = "running";
        j.macFetch = { ...j.macFetch!, state: body.phase, pct: body.pct ?? 0, at: now };
        const text = body.phase === "getting" ? "Your Mac is getting the video" : "Your Mac is sending the video";
        mockLive.publish({
          type: "jobLive",
          op: "upsert",
          id: j.jobId,
          item: { jobId: j.jobId, step: "resolve", text, detail: `${body.pct ?? 0}%`, pct: body.pct ?? 0, at: now, lastChange: now, run: j.run },
        });
      }
      j.updatedAt = now;
      publishJob(j);
      return clone(j);
    },
    async macSourceUpload(jobId, body) {
      await delay();
      const j = job(jobId);
      if (!macWaiting(j)) throw conflict("This job is not waiting for your Mac.");
      const partSize = 64 * 1024 * 1024;
      const count = Math.max(1, Math.ceil(body.size / partSize));
      j.macFetch = { ...j.macFetch!, state: "sending", pct: 0 };
      return { partSize, parts: Array.from({ length: count }, (_, i) => ({ n: i + 1, url: `mock://part/${i + 1}` })) };
    },
    async macSourceComplete(jobId, body) {
      await delay();
      const j = job(jobId);
      if (!macWaiting(j)) throw conflict("This job stopped waiting for your Mac.");
      const now = new Date().toISOString();
      j.source = {
        ...j.source,
        type: "upload",
        platform: "upload",
        fetchedBy: "mac",
        linkPlatform: "youtube",
        title: body.title ?? j.source.title,
        channel: body.creator ?? j.source.channel,
      };
      j.macFetch = { ...j.macFetch!, state: "done", at: now };
      j.status = "queued";
      j.note = "Your Mac sent the video.";
      j.createdAt = now;
      j.updatedAt = now;
      publishJob(j);
      return clone(j);
    },
    async retryJob(jobId) {
      await delay();
      const j = job(jobId);
      if (j.status !== "failed" && j.status !== "canceled") throw conflict("Only a failed or canceled job can be retried.");
      j.status = "queued";
      j.error = undefined;
      j.replacedBy = undefined;
      j.steps = stepsAt(0, "queued");
      j.progress = 0;
      j.model = currentClipModel(store.settings.clipModel);
      j.modelWanted = undefined;
      j.createdAt = new Date().toISOString();
      j.updatedAt = j.createdAt;
      publishJob(j);
      return clone(j);
    },
    async deleteJob(jobId, clips = "keep") {
      await delay();
      if ((faults.deleteJobFails ?? 0) > 0) {
        faults.deleteJobFails!--;
        throw serverDown();
      }
      return removeJob(jobId, clips);
    },
    async deleteJobs(jobIds, clips = "keep") {
      await delay();
      if ((faults.deleteJobFails ?? 0) > 0) {
        faults.deleteJobFails!--;
        throw serverDown();
      }
      if (!jobIds.length || jobIds.length > 25) throw bad("jobIds must list 1 to 25 jobs.");
      return [...new Set(jobIds)].map((id) => removeJob(id, clips));
    },
    async listClips({ status = "review", jobId } = {}) {
      await delay();
      tick();
      return clone(
        store.clips
          .map((c) => stats.withTotal(c))
          .filter((c) => status === "all" || c.status === status)
          .filter((c) => !jobId || c.jobId === jobId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.rank - b.rank),
      );
    },
    async getClip(clipId) {
      await delay();
      return clone(stats.withTotal(clip(clipId)));
    },
    async updateClip(clipId, captions) {
      await delay(120, 260);
      const c = clip(clipId);
      if (c.status !== "review") throw conflict("Captions can only be changed while the clip waits for review.");
      c.captions = { ...c.captions, ...captions };
      publishClip(c);
      return clone(c);
    },
    async confirmClip(clipId, captions, tiktok, platforms, options) {
      await delay();
      if (options !== undefined) {
        const wrong = clipOptionsProblem(options);
        if (wrong) throw bad(wrong);
      }
      const c = clip(clipId);
      const connected = setup.connected();
      // The places picked on Upload (§33): known, each once, not empty, and each set up.
      let chosen: Platform[] | undefined;
      if (platforms !== undefined) {
        if (!Array.isArray(platforms) || !platforms.length) throw bad("Pick at least one place to upload to.");
        if (!platforms.every((p) => PLATFORMS.includes(p))) throw bad("One of the places to upload to is not one Clip Factory knows.");
        const twice = platforms.find((p, i) => platforms.indexOf(p) !== i);
        if (twice) throw bad(`${PLATFORM_LABEL[twice]} is in the list twice. Pick each place once.`);
        chosen = PLATFORM_ORDER.filter((p) => platforms.includes(p));
      }
      if (c.status === "review" && chosen) {
        const missing = chosen.find((p) => !connected.includes(p));
        if (missing) throw bad(`${PLATFORM_LABEL[missing]} is not set up yet. Turn it off, then tap Upload.`);
      }
      // TikTok's rules: the owner picks who can see it before anything is posted there (§17.8).
      const tiktokGoing = chosen ? chosen.includes("tiktok") : store.settings.platforms.includes("tiktok") && connected.includes("tiktok");
      if (c.status === "review" && tiktokGoing && !tiktok?.privacyLevel) throw bad("Pick who can see it on TikTok.");
      const startPosting = () => {
        const have = new Set(store.posts.filter((p) => p.clipId === clipId).map((p) => p.platform));
        const targets = c.uploadTo ?? store.settings.platforms;
        const created: Post[] = targets
          .filter((platform) => !have.has(platform))
          .map((platform) => ({ postId: ulid(), clipId, platform, status: connected.includes(platform) ? "queued" : "pending_integration" }));
        store.posts.push(...created);
        for (const p of created) if (p.platform === "tiktok" && p.status === "queued" && tiktok) postOptions.set(p.postId, clone(tiktok));
        for (const p of created) {
          const own = options?.[p.platform as keyof ClipPostOptions];
          if (own) clipOptions.set(p.postId, clone(own));
        }
        publishClip(c);
        for (const p of created) publishPost(p);
        return { clip: clone(c), posts: clone(store.posts.filter((p) => p.clipId === clipId)) };
      };
      // Keep again on a kept clip whose posting never started: finished once the last try is old enough.
      if (c.status === "confirmed" && !store.posts.some((p) => p.clipId === clipId)) {
        const last = claimedAt.get(clipId) ?? Date.parse(c.decidedAt ?? "");
        if (Number.isNaN(last) || Date.now() - last < faults.resumeAfterMs) throw conflict(ALREADY_DECIDED);
        claimedAt.set(clipId, Date.now());
        return startPosting();
      }
      if (c.status === "failed" || (c.status === "posted" && chosen)) return tryAgain(c, tiktok, chosen);
      if (c.status !== "review") throw conflict(ALREADY_DECIDED);
      if (captions) c.captions = { ...c.captions, ...captions };
      if (chosen) c.uploadTo = chosen;
      c.status = "confirmed";
      c.decidedAt = new Date().toISOString();
      claimedAt.set(clipId, Date.now());
      if (faults.keepStopsAfterSave > 0) {
        faults.keepStopsAfterSave--;
        throw networkError();
      }
      return startPosting();
    },
    async declineClip(clipId) {
      await delay();
      const c = clip(clipId);
      if (c.status !== "review") throw conflict(ALREADY_DECIDED);
      c.status = "declined";
      c.decidedAt = new Date().toISOString();
      c.coverUrl = undefined;
      c.videoUrl = undefined;
      publishClip(c);
      return clone(c);
    },
    ...skills.api,
    ...lessons,
    ...follows.api,
    ...money.api,
    ...followers.api,
    ...pushApi(),
    async getSettings() {
      await delay();
      return clone(store.settings);
    },
    async putSettings(patch) {
      await delay(100, 240);
      const next: Settings = { ...store.settings, ...patch, hasYoutubeCookies: store.settings.hasYoutubeCookies };
      if (next.clipMin < 1 || next.clipMin > 10) throw bad("The smallest number of clips must be between 1 and 10.");
      if (next.clipMax < next.clipMin || next.clipMax > 10) throw bad("The largest number of clips must be between the smallest and 10.");
      if (next.maxSourceHours < 1 || next.maxSourceHours > 12) throw bad("Source length must be between 1 and 12 hours.");
      if (!next.platforms.every((p) => PLATFORMS.includes(p))) throw bad("Unknown platform.");
      if (!isSoundId(next.clickSound)) throw bad("Pick a click sound from 1 to 30.");
      if (!isSoundId(next.errorSound)) throw bad("Pick an error sound from 1 to 30.");
      if (next.youtubePrivacy !== undefined && !["public", "unlisted", "private"].includes(next.youtubePrivacy))
        throw bad("Pick who can see your YouTube clips.");
      // Retired by §25 (no screen reads them), still checked like the API so stored values stay valid.
      for (const [field, map] of [["earningsRates", next.earningsRates], ["earningsPaid", next.earningsPaid]] as const) {
        if (map === undefined) continue;
        if (typeof map !== "object" || map === null || Array.isArray(map)) throw bad("Money settings must list each app by name.");
        for (const [p, v] of Object.entries(map)) {
          if (!PLATFORMS.includes(p as Platform)) throw bad(`Unknown platform: ${p}.`);
          if (field === "earningsPaid" && typeof v !== "boolean") throw bad(`Say yes or no for ${p}: true or false.`);
          if (field === "earningsRates") {
            if (typeof v !== "number" || !Number.isFinite(v)) throw bad(`Type the ${p} amount as a number, like 0.05.`);
            if (v < 0) throw bad(`The ${p} amount cannot be less than 0.`);
            if (v > RETIRED_MAX_RATE) throw bad(`The ${p} amount can be at most ${RETIRED_MAX_RATE} dollars for 1,000 views.`);
            if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) throw bad(`Use at most 2 numbers after the dot for ${p}, like 0.05.`);
          }
        }
        // Like the API: the usual platform order, nothing else.
        (next as unknown as Record<string, unknown>)[field] = Object.fromEntries(PLATFORMS.filter((p) => p in map).map((p) => [p, (map as Record<string, unknown>)[p]]));
      }
      if (next.setupSkipped !== undefined) {
        // Same rule as the API (§17.13): known platforms only, kept in canonical order without repeats.
        if (!Array.isArray(next.setupSkipped) || !next.setupSkipped.every((p) => PLATFORMS.includes(p))) throw bad("Unknown platform.");
        next.setupSkipped = PLATFORMS.filter((p) => next.setupSkipped!.includes(p));
        saveSkipped(next.setupSkipped);
      }
      if (next.backgroundMode !== undefined && !isBackgroundMode(next.backgroundMode)) throw bad("Pick See-through, Picture or Colours.");
      if (next.glassStrength !== undefined && !isGlassStrength(next.glassStrength)) throw bad("Pick Clear or Frosted.");
      if (next.clipModel !== undefined && !isClipModel(next.clipModel)) throw bad("Pick one of the AI models in the list.");
      // §24: the same ranges as the API (0 is "no limit").
      const whole = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
      if (next.followDailyMax !== undefined && !whole(next.followDailyMax, 0, 20)) throw bad("How many a day must be a number from 1 to 20.");
      if (next.notify !== undefined) {
        // §32.3: the same rule as the API: known keys only, each on or off; a missing one keeps its default.
        const n = next.notify as unknown as Record<string, unknown>;
        const keys = ["ready", "stopped", "resumed", "steps"];
        if (typeof n !== "object" || n === null || Object.keys(n).some((k) => !keys.includes(k)) || Object.values(n).some((v) => typeof v !== "boolean"))
          throw bad("Notifications must say on or off for: clips ready, stopped, picked up, every step.");
        next.notify = { ready: true, stopped: true, resumed: true, steps: false, ...(n as Partial<Settings["notify"] & object>) };
      }
      if (next.followMinMinutes !== undefined && !whole(next.followMinMinutes, 10, 240)) throw bad("The shortest video must be a number from 10 to 240 minutes.");
      if (next.followPaused !== undefined && typeof next.followPaused !== "boolean") throw bad("followPaused must be true or false.");
      if (patch.postPreset !== undefined) {
        // §36: the same check as the API (never made for kids), each platform merged over the defaults.
        const wrong = presetProblem(patch.postPreset);
        if (wrong) throw bad(wrong);
        next.postPreset = presetOf(patch.postPreset);
      }
      if (next.backgroundColours !== undefined) {
        const c = next.backgroundColours;
        if (!Array.isArray(c) || c.length < 1 || c.length > MAX_COLOURS || !c.every(isHexColour)) throw bad("Pick 1 to 3 colours.");
        next.backgroundColours = c.map((x) => x.toLowerCase());
      }
      store.settings = next;
      saveMockLook(next);
      return clone(next);
    },
    async createCookiesUpload(_filename) {
      await delay();
      // The mock marks cookies present once the upload URL is issued; the real API checks the object.
      store.settings.hasYoutubeCookies = true;
      return { key: "private/mock-owner/youtube-cookies.txt", uploadUrl: "mock://upload", headers: { "Content-Type": "text/plain" } };
    },
    async deleteCookies() {
      await delay();
      store.settings.hasYoutubeCookies = false;
    },
    async listAccounts() {
      await delay();
      return setup.accounts();
    },
    async connectAccount(platform, grant) {
      await delay();
      // §25.4 "Allow money reading": the pretend platform approves at once and comes back to the Money page.
      if (grant === "money") return mockMoneyGrant(platform);
      return setup.connect(platform);
    },
    async chooseAccount(platform, accountId) {
      await delay();
      return setup.choose(platform, accountId);
    },
    async disconnectAccount(platform) {
      await delay();
      setup.disconnect(platform);
    },
    async tiktokCreatorInfo() {
      await delay();
      return setup.creator();
    },
    async getSetup() {
      await delay();
      if ((faults.setupFails ?? 0) > 0) {
        faults.setupFails!--;
        throw serverDown();
      }
      return setup.overview();
    },
    async getPlatformSetup(platform) {
      await delay();
      return setup.get(platform);
    },
    async setSetupStep(platform, step, done) {
      await delay(80, 180);
      return setup.setStep(platform, step, done);
    },
    async setReviewState(review) {
      await delay(80, 180);
      return setup.setReview(review);
    },
    async saveSetupKeys(platform, keys) {
      await delay();
      return setup.saveKeys(platform, keys);
    },
    async deleteSetupKeys(platform) {
      await delay();
      setup.deleteKeys(platform);
    },
    async checkSetup(platform) {
      await delay(300, 600);
      return setup.check(platform);
    },
    async uploadVerificationFile(filename, content) {
      await delay();
      return setup.uploadFile(filename, content);
    },
    async deleteVerificationFile(filename) {
      await delay();
      setup.deleteFile(filename);
    },
    async listPosts(clipId) {
      await delay();
      return clone(store.posts.filter((p) => !clipId || p.clipId === clipId));
    },
    async insights() {
      await delay();
      return { learnings: clone(store.learnings), posts: clone(store.posts.filter((p) => p.metrics)) };
    },
    async similarClips(clipId) {
      await delay();
      const self = clip(clipId);
      if (faults.similarEmpty) return [];
      return similar(store, self);
    },
    async clipPerformance(clipId) {
      await delay();
      return stats.performance(clipId);
    },
    async refreshStats(clipId, platforms) {
      await delay(120, 260);
      return stats.refresh(clipId, platforms);
    },
    async getWeek(week, from, to) {
      await delay();
      return stats.getWeek(week, from, to);
    },
    async saveWeekBest(week, body) {
      await delay(120, 260);
      return stats.saveBest(week, body);
    },
  };

  // Counts every call, so tests can prove an update came over the live connection and not from a poll.
  return new Proxy(api, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof prop !== "string" || typeof value !== "function") return value;
      return (...args: unknown[]) => {
        calls[prop] = (calls[prop] ?? 0) + 1;
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}

/**
 * Stand-in for the S3 Vectors search (§14.6): the owner's measured clips (posted, with numbers), most alike first.
 * Same moment type counts most, then a similar score. Never the clip itself; at most five.
 */
export function similar(store: Store, self: Clip): SimilarClip[] {
  const measured = new Map<string, Post[]>();
  for (const p of store.posts) {
    if (!p.metrics) continue;
    measured.set(p.clipId, [...(measured.get(p.clipId) ?? []), p]);
  }
  return store.clips
    .filter((c) => c.clipId !== self.clipId && c.status === "posted" && measured.has(c.clipId))
    .map((c): SimilarClip => {
      const posts = measured.get(c.clipId)!;
      const sum = (k: "views" | "likes" | "comments" | "shares") => posts.reduce((n, p) => n + (p.metrics?.[k] ?? 0), 0);
      const base = c.momentType === self.momentType ? 0.91 : 0.66;
      const similarity = Math.round(Math.max(0.3, base - Math.abs(c.score - self.score) * 0.04) * 100) / 100;
      return {
        clipId: c.clipId,
        hook: c.hook,
        title: c.captions.youtubeTitle,
        momentType: c.momentType,
        similarity,
        coverUrl: c.coverUrl,
        performance: {
          views: sum("views"),
          likes: sum("likes"),
          comments: sum("comments"),
          shares: sum("shares"),
          posts: posts.length,
          checkedAt: posts.map((p) => p.metrics!.checkedAt).sort().at(-1)!,
        },
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

