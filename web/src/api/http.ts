import { announceSignedOut, type AuthClient } from "../lib/auth.ts";
import { ApiError, errorFromResponse, networkError } from "./errors.ts";
import type {
  Account,
  Api,
  Clip,
  ClipPerformance,
  Job,
  JobDeleted,
  KeyCheck,
  Follow,
  Lesson,
  MacUploadParts,
  PlatformSetup,
  Post,
  PushDevice,
  RefreshResult,
  Settings,
  SimilarClip,
  Skill,
  SkillDetail,
  TikTokCreator,
  WeekView,
} from "./types.ts";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface Deps {
  baseUrl: string;
  auth: Pick<AuthClient, "accessToken">;
  fetcher?: typeof fetch;
}

/** The contract's HTTP API (docs/CONTRACTS.md §5) with the owner's access token on every call. */
export function httpApi({ baseUrl, auth, fetcher = (...a) => fetch(...a) }: Deps): Api {
  async function send(method: Method, path: string, token: string | null, body?: unknown, keep = false): Promise<Response> {
    const headers: Record<string, string> = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    const json = body === undefined ? undefined : JSON.stringify(body);
    try {
      return await fetcher(`${baseUrl}/v1${path}`, {
        method,
        headers,
        body: json,
        cache: "no-store",
        // Small changes (a caption edit saved as the app closes) must still reach the server after the page goes.
        // So must a delete sent as its Undo runs out while the page closes (§34.5).
        ...((method === "PATCH" || keep) && (json?.length ?? 0) < 60_000 ? { keepalive: true } : {}),
      });
    } catch {
      throw networkError();
    }
  }

  async function call<T>(method: Method, path: string, body?: unknown, keep = false): Promise<T> {
    let res = await send(method, path, await auth.accessToken(), body, keep);
    // One forced refresh covers a token that expired between Amplify's check and the request.
    if (res.status === 401) {
      const fresh = await auth.accessToken(true);
      if (fresh) res = await send(method, path, fresh, body, keep);
    }
    if (res.status === 204) return undefined as T;
    const parsed: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = errorFromResponse(res.status, parsed);
      if (err.status === 401) announceSignedOut();
      throw err;
    }
    if (parsed === null) throw new ApiError(res.status, "internal", "The server sent an empty answer. Try again.");
    return parsed as T;
  }

  const q = (params: Record<string, string | number | null | undefined>) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
    const str = s.toString();
    return str ? `?${str}` : "";
  };
  const id = encodeURIComponent;

  return {
    health: () => call("GET", "/health"),
    me: () => call("GET", "/me"),
    createUpload: (body) => call("POST", "/uploads", body),
    createJob: async (body) => (await call<{ job: Job }>("POST", "/jobs", body)).job,
    listJobs: (query = {}) => call("GET", `/jobs${q({ limit: query.limit, cursor: query.cursor })}`),
    getJob: (jobId) => call("GET", `/jobs/${id(jobId)}`),
    cancelJob: async (jobId) => (await call<{ job: Job }>("POST", `/jobs/${id(jobId)}/cancel`)).job,
    retryJob: async (jobId) => (await call<{ job: Job }>("POST", `/jobs/${id(jobId)}/retry`)).job,
    macProgress: async (jobId, body) => (await call<{ job: Job }>("POST", `/jobs/${id(jobId)}/mac-progress`, body)).job,
    macSourceUpload: (jobId, body) => call<MacUploadParts>("POST", `/jobs/${id(jobId)}/source-upload`, body),
    macSourceComplete: async (jobId, body) =>
      (await call<{ job: Job }>("POST", `/jobs/${id(jobId)}/source-upload/complete`, body)).job,
    deleteJob: (jobId, clips = "keep") => call("DELETE", `/jobs/${id(jobId)}${q({ clips })}`, undefined, true),
    deleteJobs: async (jobIds, clips = "keep") =>
      (await call<{ results: JobDeleted[] }>("POST", "/jobs/delete", { jobIds, clips }, true)).results,
    listClips: async (query = {}) =>
      (await call<{ clips: Clip[] }>("GET", `/clips${q({ status: query.status, jobId: query.jobId })}`)).clips,
    getClip: async (clipId) => (await call<{ clip: Clip }>("GET", `/clips/${id(clipId)}`)).clip,
    updateClip: async (clipId, captions) =>
      (await call<{ clip: Clip }>("PATCH", `/clips/${id(clipId)}`, { captions })).clip,
    confirmClip: (clipId, captions, tiktok, platforms, options) =>
      call("POST", `/clips/${id(clipId)}/confirm`, {
        ...(captions ? { captions } : {}),
        ...(tiktok ? { tiktok } : {}),
        ...(platforms ? { platforms } : {}),
        ...(options && Object.keys(options).length ? { options } : {}),
      }),
    declineClip: async (clipId) => (await call<{ clip: Clip }>("POST", `/clips/${id(clipId)}/decline`)).clip,
    listSkills: async () => (await call<{ skills: Skill[] }>("GET", "/skills")).skills,
    getSkill: (skillId) => call<SkillDetail>("GET", `/skills/${id(skillId)}`),
    writeSkill: async (form) => (await call<{ skill: Skill }>("POST", "/skills", form)).skill,
    updateSkill: async (skillId, body) => (await call<{ skill: Skill }>("PUT", `/skills/${id(skillId)}`, body)).skill,
    createSkillUpload: (filename, skillId) =>
      call("POST", "/skills/uploads", skillId ? { filename, skillId } : { filename }),
    createSkill: async (body) => (await call<{ skill: Skill }>("POST", "/skills", body)).skill,
    deleteSkill: (skillId) => call("DELETE", `/skills/${id(skillId)}`),
    getSettings: async () => (await call<{ settings: Settings }>("GET", "/settings")).settings,
    putSettings: async (patch) => (await call<{ settings: Settings }>("PUT", "/settings", patch)).settings,
    pushKey: async () => (await call<{ publicKey: string }>("GET", "/push/key")).publicKey,
    listPushDevices: async () => (await call<{ devices: PushDevice[] }>("GET", "/push/devices")).devices,
    savePushDevice: async (deviceId, body) =>
      (await call<{ device: PushDevice }>("PUT", `/push/devices/${encodeURIComponent(deviceId)}`, body)).device,
    deletePushDevice: (deviceId) => call<void>("DELETE", `/push/devices/${encodeURIComponent(deviceId)}`),
    sendTestPush: (deviceId) => call<{ sent: number; devices: number }>("POST", "/push/test", deviceId ? { deviceId } : {}),
    createCookiesUpload: (filename) => call("POST", "/settings/cookies", { filename }),
    deleteCookies: () => call("DELETE", "/settings/cookies"),
    listAccounts: async () => (await call<{ accounts: Account[] }>("GET", "/accounts")).accounts,
    connectAccount: (platform, grant) => call("POST", `/accounts/${id(platform)}/connect`, grant ? { grant } : undefined),
    chooseAccount: async (platform, accountId) =>
      (await call<{ setup: PlatformSetup }>("POST", `/accounts/${id(platform)}/choose`, { accountId })).setup,
    disconnectAccount: (platform) => call("DELETE", `/accounts/${id(platform)}`),
    tiktokCreatorInfo: async () => (await call<{ creator: TikTokCreator }>("GET", "/accounts/tiktok/creator-info")).creator,
    getSetup: () => call("GET", "/setup"),
    getPlatformSetup: async (platform) => (await call<{ setup: PlatformSetup }>("GET", `/setup/${id(platform)}`)).setup,
    setSetupStep: async (platform, step, done) =>
      (await call<{ setup: PlatformSetup }>("PATCH", `/setup/${id(platform)}`, { step, done })).setup,
    setReviewState: async (state) =>
      (await call<{ setup: PlatformSetup }>("PATCH", "/setup/tiktok", { gate: "app_review", state })).setup,
    saveSetupKeys: async (platform, keys) =>
      (await call<{ setup: PlatformSetup }>("PUT", `/setup/${id(platform)}/keys`, keys)).setup,
    deleteSetupKeys: (platform) => call("DELETE", `/setup/${id(platform)}/keys`),
    checkSetup: (platform) => call<{ check: KeyCheck; setup: PlatformSetup }>("POST", `/setup/${id(platform)}/check`),
    uploadVerificationFile: async (filename, content) =>
      (await call<{ setup: PlatformSetup }>("POST", "/setup/tiktok/verification-file", { filename, content })).setup,
    deleteVerificationFile: (filename) => call("DELETE", `/setup/tiktok/verification-file/${id(filename)}`),
    listPosts: async (clipId) => (await call<{ posts: Post[] }>("GET", `/posts${q({ clipId })}`)).posts,
    insights: () => call("GET", "/insights"),
    listLessons: () => call("GET", "/lessons"),
    setLessonStatus: async (lessonId, to) => (await call<{ lesson: Lesson }>("PATCH", `/lessons/${id(lessonId)}`, { status: to })).lesson,
    deleteLesson: (lessonId) => call("DELETE", `/lessons/${id(lessonId)}`),
    similarClips: async (clipId) =>
      (await call<{ clips: SimilarClip[] }>("GET", `/clips/${id(clipId)}/similar`)).clips ?? [],
    clipPerformance: (clipId) => call<ClipPerformance>("GET", `/clips/${id(clipId)}/performance`),
    refreshStats: async (clipId, platforms) =>
      (await call<{ platforms: RefreshResult[] }>("POST", `/clips/${id(clipId)}/stats/refresh`, platforms ? { platforms } : {}))
        .platforms,
    getMoney: () => call("GET", "/money"),
    refreshMoney: () => call("POST", "/money/refresh"),
    seenMoney: (key) => call("POST", "/money/seen", { key }),
    setMoneyCountry: (country) => call("PUT", "/money/country", { country }),
    getMoneySummary: (platforms, chart) => call("GET", `/money/summary${q({ platforms: platforms.join(","), chart })}`),
    getMoneyClips: (query) =>
      call(
        "GET",
        `/money/clips${q({ platforms: query.platforms.join(","), period: query.period, sort: query.sort, cursor: query.cursor, limit: query.limit })}`,
      ),
    getFollowers: () => call("GET", "/followers"),
    listFollows: () => call("GET", "/follows"),
    lookupFollow: (text, platform) => call("POST", "/follows/lookup", platform ? { text, platform } : { text }),
    follow: async (platform, platformId) =>
      (await call<{ follow: Follow }>("POST", "/follows", { platform, platformId, permission: true })).follow,
    setFollowAuto: async (platform, platformId, on) =>
      (await call<{ follow: Follow }>("PATCH", `/follows/${id(platform)}/${id(platformId)}`, { autoClips: on })).follow,
    unfollow: (platform, platformId) => call("DELETE", `/follows/${id(platform)}/${id(platformId)}`),
    saveFollowKeys: (platform, keys) => call("PUT", `/follows/keys/${id(platform)}`, keys),
    deleteFollowKeys: (platform) => call("DELETE", `/follows/keys/${id(platform)}`),
    checkFollowKeys: (platform) => call("POST", `/follows/keys/${id(platform)}/check`),
    getWeek: async (week, from, to) => (await call<{ week: WeekView }>("GET", `/weeks/${id(week)}${q({ from, to })}`)).week,
    saveWeekBest: async (week, body) => {
      const out = (await call<{ week: WeekView | string }>("PUT", `/weeks/${id(week)}/best`, body)).week;
      // "Nothing changed" may answer with just the week id: read the week as it stands.
      if (typeof out === "string" || !out || !Array.isArray(out.clips))
        return (await call<{ week: WeekView }>("GET", `/weeks/${id(week)}${q({ from: body.from, to: body.to })}`)).week;
      return out;
    },
  };
}
