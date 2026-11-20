// Shapes from docs/CONTRACTS.md §5. Keep in step with the contract, never the other way round.
import type { BackgroundMode, GlassStrength } from "../lib/background.ts";

export type JobStatus = "queued" | "running" | "ready" | "failed" | "canceled";
export type StepKey =
  | "resolve"
  | "download"
  | "transcribe"
  | "analyze"
  | "watch"
  | "select"
  | "render"
  | "checklist"
  | "captions"
  | "finalize";
export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped";
export type SourcePlatform = "youtube" | "twitch" | "kick" | "upload";
export type Platform = "youtube" | "instagram" | "facebook" | "tiktok" | "x";
export type ClipStatus = "review" | "confirmed" | "declined" | "publishing" | "posted" | "failed";
export type MomentType = "rage" | "chaos" | "interaction" | "no_way" | "first_reaction" | "hot_take";
export type ClipFilter = "review" | "confirmed" | "posted" | "declined" | "all";

export interface Step {
  key: StepKey;
  label: string;
  status: StepStatus;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface Source {
  type: "link" | "upload";
  platform: SourcePlatform;
  url?: string;
  key?: string;
  filename?: string;
  title?: string;
  channel?: string;
  durationSec?: number;
  thumbnailUrl?: string;
  /** "mac": the owner's Mac or Windows app got this video because YouTube blocked the cloud (CONTRACTS §35). */
  fetchedBy?: "mac";
  /** Where a Mac-fetched video came from ("youtube"); `url` keeps the link. */
  linkPlatform?: SourcePlatform;
}

/** Mac fetches it (CONTRACTS §35): where a YouTube job stands with the owner's Mac. */
export type MacFetchState = "cloud" | "waiting" | "getting" | "sending" | "done" | "failed";

export interface JobMacFetch {
  state: MacFetchState;
  /** Started from the desktop app: the Mac gets the video from the start. */
  up?: boolean;
  since?: string;
  /** The "Open Clip Factory on your Mac" notification went out (no Mac claimed it within 2 minutes). */
  nudgedAt?: string;
  pct?: number;
  at?: string;
}

/** POST /v1/jobs/{id}/mac-progress (§35.3). */
export interface MacProgress {
  deviceId: string;
  phase: "getting" | "sending" | "failed";
  pct?: number;
  error?: string;
  needGb?: number;
}

export interface MacUploadParts {
  partSize: number;
  parts: { n: number; url: string }[];
}

export interface ClipTarget {
  min: number;
  max: number;
}

export interface Job {
  jobId: string;
  status: JobStatus;
  source: Source;
  clipTarget: ClipTarget;
  steps: Step[];
  progress: number;
  clipCount: number;
  notes?: string;
  error?: string;
  /** A short plain sentence while the job runs, e.g. "Picking up where it stopped…" after a stop (CONTRACTS §30). */
  note?: string;
  /** A short tag of the run that owns the job; a live line of another run is ignored (CONTRACTS §31). */
  run?: string;
  /** The live status line while the job is queued or running, from GET /v1/jobs and /v1/jobs/{id} (CONTRACTS §31). */
  live?: JobLive;
  /** The AI model that made the clips, a key of config/models.json (ADR-42). Absent on jobs from before it. */
  model?: string;
  /** The model the owner picked when it could not be used and the default model made the clips instead. */
  modelWanted?: string;
  /** YouTube link jobs only (CONTRACTS §35). */
  macFetch?: JobMacFetch;
  /** Stopped because the owner's video file replaced it (Use a video file, CONTRACTS §35.8): the new job's id. */
  replacedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Captions {
  youtubeTitle: string;
  youtubeDescription: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  x: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  pass: boolean;
  note?: string;
}

export interface Clip {
  clipId: string;
  jobId: string;
  rank: number;
  status: ClipStatus;
  momentType: MomentType;
  hook: string;
  summary: string;
  durationSec: number;
  sourceStart: number;
  sourceEnd: number;
  sourceUrlAt?: string;
  layout: "facecam_top" | "blur_fill";
  videoUrl?: string;
  coverUrl?: string;
  captions: Captions;
  checklist: { items: ChecklistItem[]; fixes: string[] };
  score: number;
  createdAt: string;
  decidedAt?: string;
  /** Starred "Best this week" (docs/CONTRACTS.md §16). */
  best?: boolean;
  /** The ISO week it was starred in, "yyyy-Www". */
  bestWeek?: string;
  /** Why it was picked, in a few plain words ("Loud laugh + Fast action"). Absent when nothing stood out (§5). */
  pickedFor?: string;
  /** Sum of the posted posts' views; absent when nothing was measured yet. */
  totalViews?: number;
  /** The places the owner picked on Upload, in STATS_ORDER (§33). Absent on clips uploaded before §33. */
  uploadTo?: Platform[];
}

/** One skill (docs/CONTRACTS.md §5, §18). Every skill is always used: there is no on/off switch. */
export interface Skill {
  skillId: string;
  /** The frontmatter slug. */
  name: string;
  /** The name people see (§18.2). */
  title: string;
  description: string;
  builtin: boolean;
  source: "builtin" | "written" | "upload";
  format: "md" | "zip";
  /** Bytes of the stored file. */
  size: number;
  createdAt: string;
  updatedAt: string;
  /** ≥ 1; sent back on every save so a change made somewhere else is noticed (§18.4). */
  version: number;
}

/** The three questions of "Write a skill" (§18.2). */
export interface SkillForm {
  title: string;
  description: string;
  instructions: string;
}

/** GET /v1/skills/{skillId} (§18.3). */
export interface SkillDetail {
  skill: Skill;
  /** The SKILL.md text. */
  content: string;
  /** null for built-ins, or when it cannot be changed here (`formBlocked` says why). */
  form: SkillForm | null;
  formBlocked?: "builtin" | "too_long";
  /** Zip only: the other files inside, sorted; [] for .md. */
  files: string[];
}

/** PUT /v1/skills/{skillId}: the form, or a whole new file, with the version last read. */
export type SkillUpdate = { version: number } & (SkillForm | { key: string });

export interface Settings {
  clipMin: number;
  clipMax: number;
  maxSourceHours: number;
  soundEnabled: boolean;
  /** Click sound 1..30, default 6 "Water drop" (docs/CONTRACTS.md §15.3). */
  clickSound: number;
  /** Error sound 1..30, default 5 "Nope nope nope". */
  errorSound: number;
  reduceMotion: boolean;
  hasYoutubeCookies: boolean;
  platforms: Platform[];
  /** Who can see new YouTube clips (docs/CONTRACTS.md §17.6). Absent on old servers: "public". */
  youtubePrivacy?: YoutubePrivacy;
  /** Retired by docs/CONTRACTS.md §25: stored and validated, never read or shown. Absent on old servers. */
  earningsRates?: Partial<Record<Platform, number>>;
  /** Retired by §25, like `earningsRates`. */
  earningsPaid?: Partial<Record<Platform, boolean>>;
  /**
   * Platforms the owner skipped (and confirmed) on the floating setup to-do list (docs/CONTRACTS.md §17.13). Only
   * hides their row; posting still follows `platforms` and the connected accounts. Absent on old servers: none.
   */
  setupSkipped?: Platform[];
  /** What sits behind the glass (§22). Absent until the owner saves one: then this device decides (§22.1). */
  backgroundMode?: BackgroundMode;
  /** 1 to 3 `#rrggbb` colours for the colours backdrop. Absent on old servers: the Clip Factory colours. */
  backgroundColours?: string[];
  /** See-through glass: "clear" (default) or "frosted". */
  glassStrength?: GlassStrength;
  /**
   * The AI model that makes the clips (docs/DECISIONS.md ADR-42): a key of `clipModels` in config/models.json.
   * Absent on old servers: the default (`agentModel`).
   */
  clipModel?: string;
  /** Follow creators (docs/CONTRACTS.md §24.1): "Stop all automatic clips". Absent on old servers: false. */
  followPaused?: boolean;
  /** At most this many automatic videos a day; 0 means no limit (the default). The UI never shows 0. */
  followDailyMax?: number;
  /** The shortest finished stream or video (minutes, 10 to 240) that counts. Absent on old servers: 30. */
  followMinMinutes?: number;
  /** Which notifications the owner's devices get (docs/CONTRACTS.md §32.3). Absent on old servers: the defaults. */
  notify?: NotifyChoices;
  /** My settings (§36): the owner's own post choices per platform. Absent on old servers: the defaults. */
  postPreset?: PostPreset;
}

/** §32.3: "Clips ready", "It stopped" and "Picked up" are on by default; "Every step" is off (each one shows on the phone). */
export interface NotifyChoices {
  ready: boolean;
  stopped: boolean;
  /** A stopped run picked up again. Absent on servers before it: on. */
  resumed: boolean;
  steps: boolean;
}

/** A device that gets notifications (GET /v1/push/devices). Its address and keys never leave the server. */
export interface PushDevice {
  deviceId: string;
  kind: "webpush";
  deviceLabel: string;
  createdAt: string;
  updatedAt: string;
}

/** PUT /v1/push/devices/{deviceId}: `PushSubscription.toJSON()` and a plain device name. */
export interface PushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  deviceLabel: string;
}

export type YoutubePrivacy = "public" | "unlisted" | "private";

/**
 * My settings (§36), one part per platform. YouTube's "who can see it" is `Settings.youtubePrivacy`, not here. There is
 * no made-for-kids field: My settings never mark a clip as made for kids. TikTok's Commercial content is per clip only.
 */
export interface YouTubePreset {
  /** A YouTube category id: "20" Gaming (the default), "24", "23", "22", "17". */
  category: string;
  notifySubscribers: boolean;
  embeddable: boolean;
}
export interface TikTokPreset {
  privacy: string;
  comments: boolean;
  duet: boolean;
  stitch: boolean;
}
export interface InstagramPreset {
  shareToFeed: boolean;
}
export type XReplies = "everyone" | "following" | "mentionedUsers" | "verified";
export interface XPreset {
  replies: XReplies;
}
export interface PostPreset {
  youtube: YouTubePreset;
  tiktok: TikTokPreset;
  instagram: InstagramPreset;
  /** Reels on a Facebook Page are public: nothing to choose. */
  facebook: Record<string, never>;
  x: XPreset;
}
/** One clip's choices sent with Upload (§36.3). TikTok's go in `tiktok` (§17.8). */
export interface YouTubeClipOptions {
  privacy: YoutubePrivacy;
  category: string;
  /** YouTube asks every creator; starts off (No). */
  madeForKids: boolean;
  notifySubscribers: boolean;
  embeddable: boolean;
}
export interface ClipPostOptions {
  youtube?: YouTubeClipOptions;
  instagram?: InstagramPreset;
  x?: XPreset;
}

// ---------- Posting setup (docs/CONTRACTS.md §17.4) ----------
export type AccountStatus = "not_connected" | "connected" | "needs_reconnect" | "choose_account";

export interface AccountChoice {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Account {
  platform: Platform;
  status: AccountStatus;
  /** "@name" or the channel title. */
  handle?: string;
  name?: string;
  avatarUrl?: string;
  connectedAt?: string;
  /** Permissions the owner did not tick. */
  missing?: string[];
  reason?: "token_dead" | "missing_permissions" | "keys_changed" | "expires_soon";
  /** TikTok: connect again before this. */
  reconnectBy?: string;
  /** Meta with several Pages or Instagram accounts: pick one. */
  choices?: AccountChoice[];
}

export type GateKey = "published_app" | "app_review" | "posting_audit" | "app_live" | "credits";
export type GateState = "ok" | "limited" | "waiting" | "action" | "unknown";
export interface Gate {
  key: GateKey;
  state: GateState;
  at?: string;
}
/** The TikTok review state the owner picks (PATCH /v1/setup/tiktok). */
export type ReviewState = "draft" | "in_review" | "live" | "not_approved";

export type KeyName = "clientId" | "clientSecret" | "configId";
export type CheckCode =
  | "ok"
  | "keys_wrong"
  | "redirect_wrong"
  | "not_connected"
  | "token_dead"
  | "missing_permissions"
  | "credits_empty"
  | "platform_down";

export interface KeyCheck {
  at: string;
  ok: boolean;
  code: CheckCode;
  message: string;
  account?: "ok" | "dead" | "none";
}

export interface PlatformSetup {
  platform: Platform;
  stepsDone: string[];
  /** Connected and no gate needs the owner. */
  ready: boolean;
  keys: { saved: boolean; hints?: Partial<Record<KeyName, string>>; savedAt?: string; check?: KeyCheck };
  account: Account;
  gates: Gate[];
  /** TikTok verification files online. */
  files?: string[];
  updatedAt?: string;
}

export interface SetupValues {
  appName: string;
  websiteUrl: string;
  websitePrefix: string;
  privacyUrl: string;
  termsUrl: string;
  dataDeletionUrl: string;
  appDomain: string;
  hooksDomain: string;
  redirectUris: Record<Platform, string>;
  scopes: Record<Platform, string[]>;
  ownerEmail: string;
}

export interface SetupOverview {
  /** Always five, in SETUP_ORDER. */
  platforms: PlatformSetup[];
  ready: number;
  values: SetupValues;
}

export interface SetupKeys {
  clientId: string;
  clientSecret: string;
  configId?: string;
}

/** The OAuth result codes the hooks API sends back in `?result=` (§17.5). */
export type ConnectResult =
  | "connected"
  | "choose"
  | "denied"
  | "expired"
  | "keys_wrong"
  | "redirect_wrong"
  | "missing_permissions"
  | "no_channel"
  | "no_accounts"
  | "wrong_account_type"
  | "no_pages"
  | "platform_down"
  | "error";

export type TikTokPrivacy = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";

export interface TikTokCreator {
  nickname: string;
  username: string;
  avatarUrl?: string;
  privacyOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxDurationSec: number;
}

/** What the Post to TikTok sheet adds to Upload (§17.8). */
export interface TikTokPostOptions {
  privacyLevel: string;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
}

// ---------- Stats (docs/CONTRACTS.md §16.3) ----------
// Every extra field is optional: a number the platform did not send is absent, never 0. Times are in seconds.
export interface YouTubeExtra {
  engagedViews?: number;
  watchMinutes?: number;
  avgViewSeconds?: number;
  avgViewPercent?: number;
  subscribersGained?: number;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- TikTok only sends the common four.
export interface TikTokExtra {}
export interface InstagramExtra {
  reach?: number;
  saved?: number;
  reposts?: number;
  totalInteractions?: number;
  avgWatchSeconds?: number;
  totalWatchSeconds?: number;
  skipRatePercent?: number;
}
export interface FacebookExtra {
  initialPlays?: number;
  replays?: number;
  reactions?: Record<string, number>;
  commentsAndShares?: number;
  avgWatchSeconds?: number;
  totalWatchSeconds?: number;
  followsGained?: number;
  reachUnique?: number;
}
export interface XExtra {
  impressions?: number;
  reposts?: number;
  quotes?: number;
  bookmarks?: number;
  linkClicks?: number;
  profileClicks?: number;
  engagements?: number;
  playback0?: number;
  playback25?: number;
  playback50?: number;
  playback75?: number;
  playback100?: number;
}
export type AnyExtra = YouTubeExtra & TikTokExtra & InstagramExtra & FacebookExtra & XExtra;

export interface PostMetrics {
  /** null = "this platform does not say" (yet). */
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  checkedAt: string;
  /** When the fast counts were read. */
  metricsUpdatedAt?: string;
  /** When the slow insights were read. */
  insightsUpdatedAt?: string;
  final?: true;
  extra?: YouTubeExtra | TikTokExtra | InstagramExtra | FacebookExtra | XExtra;
}

export interface Post {
  postId: string;
  clipId: string;
  platform: Platform;
  status: "pending_integration" | "queued" | "posted" | "failed";
  url?: string;
  postedAt?: string;
  perfCheckAt?: string;
  metrics?: PostMetrics;
  /** TikTok posts from an app that is not approved yet are private (§16.3). */
  privacy?: "public" | "private";
  /** A stats refresh is running. */
  refreshing?: boolean;
  /** Earliest manual refresh. */
  nextRefreshAt?: string;
  error?: string;
}

export interface Learning {
  learningId: string;
  text: string;
  createdAt: string;
  postIds: string[];
  /** Absent = "post". */
  kind?: "post" | "week";
  week?: string;
  title?: string;
  clipIds?: string[];
}

/** A lesson the daily run learned from clips that did much better than normal 7 days after posting (§16.12). */
export type LessonStatus = "trial" | "active" | "off" | "expired";

export interface LessonEvidence {
  /** "creator": this creator's own clips were the yardstick; "all": every creator's clips on that platform. */
  baseline: "creator" | "all";
  /** Posted clips measured 7 days after posting. */
  measured: number;
  /** Of those, the ones that did much better than normal. */
  winners: number;
  medianViews: number | null;
  winnerViews: { clipId: string; postId: string; views: number }[];
  trait: {
    winnersWith: number;
    winnersKnown: number;
    othersWith: number;
    othersKnown: number;
    winnerPercent: number;
    otherPercent: number;
    sources: number;
  };
  computedAt: string;
}

export interface Lesson {
  lessonId: string;
  kind: "creator";
  /** "*" = all creators. */
  creatorKey: string;
  creatorName?: string;
  scope: "creator" | "all";
  platform: Platform;
  trait: string;
  traitLabel?: string;
  text: string;
  status: LessonStatus;
  evidence?: LessonEvidence;
  clipIds: string[];
  /** The winner clips it cites that still exist, with their hooks, for the links. */
  clips: { clipId: string; hook: string }[];
  createdAt: string;
  confirmedAt?: string;
  expiresAt?: string;
  updatedAt?: string;
}

/** Per creator ("*" = all creators) and platform: clips measured, winners, and how many more are needed. */
export interface LessonCreator {
  creatorKey: string;
  creatorName: string;
  platforms: Partial<Record<Platform, { measured: number; needed: number; winners: number }>>;
}

export interface LessonsView {
  lessons: Lesson[];
  creators: LessonCreator[];
  /** When the daily check last ran (absent before the first run). */
  checkedAt?: string;
}

export type PerfStatus = "posted" | "posted_private" | "waiting_for_connection" | "posting" | "failed" | "not_posted";

// ---------- Followers and subscribers (docs/CONTRACTS.md §38) ----------
/** "subscribers" on YouTube, "followers" everywhere else. */
export type FollowerWord = "subscribers" | "followers";
export type FollowerState = "counted" | "not_connected" | "not_checked_yet" | "missing";

/** One platform's total right now, as the platform last reported it (the daily check, §25.6 ACCTSTAT#). */
export interface FollowerCount {
  platform: Platform;
  word: FollowerWord;
  state: FollowerState;
  /** Only when state is "counted"; never a guess or a 0 standing in for "unknown". */
  count: number | null;
  /** When the platform reported that number. */
  checkedAt?: string;
  /** count minus the count reported 7 days before; absent when that day was not read. */
  weekChange?: number;
  /** YouTube rounds subscriber counts. */
  rounded?: true;
  /** Why there is no number, in plain words. */
  note?: string;
}

/** GET /v1/followers: always five, in STATS_ORDER. */
export interface FollowersView {
  platforms: FollowerCount[];
}

export interface PlatformPerformance {
  platform: Platform;
  status: PerfStatus;
  account: "connected" | "not_connected" | "needs_reconnect";
  postId?: string;
  url?: string;
  postedAt?: string;
  metrics: PostMetrics | null;
  updatedAt?: string;
  insightsUpdatedAt?: string;
  nextAllowedAt?: string;
  refreshing: boolean;
  final: boolean;
  error?: string;
  /** §25.3: what this platform reported this clip made (YouTube's estimate today). Absent when nothing was reported. */
  revenue?: ReportedMoney;
}

export interface SeriesPoint {
  at: string;
  views: number;
}

export interface ClipPerformance {
  clip: Clip;
  /** Always five, in STATS_ORDER. */
  posts: PlatformPerformance[];
  series: Partial<Record<Platform, SeriesPoint[]>>;
  totals: { views: number; likes: number; comments: number; shares: number; platformsPosted: number; updatedAt?: string };
  bestPlatform: Platform | null;
  bestThisWeek: boolean;
  week: string | null;
  weekAnchorAt: string;
}

export interface RefreshResult {
  platform: Platform;
  status: "started" | "too_soon" | "blocked" | "not_posted" | "not_connected" | "private";
  nextAllowedAt?: string;
  note?: string;
}

export interface WeekClip {
  clip: Clip;
  anchorAt: string;
  posted: boolean;
  totals: { views: number; likes: number; comments: number; shares: number };
  views: Partial<Record<Platform, number | null>>;
  /** Retired with §21: still sent by the API, never read. */
  paidViews?: Partial<Record<Platform, number | null>>;
  best: boolean;
}

export type LearnState = "none" | "learning" | "done" | "skipped" | "failed";

export interface WeekSummary {
  week: string;
  from: string;
  to: string;
  clipIds: string[];
  savedAt?: string;
  learnState: LearnState;
  learningId?: string;
}

export interface WeekView extends WeekSummary {
  clips: WeekClip[];
  learning?: Learning;
  /** §25.5: each platform's reported money for the week, in its own currency. Absent when nothing was reported. */
  revenueByPlatform?: Partial<Record<Platform, ReportedMoney>>;
}

export interface Performance {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  posts: number;
  checkedAt: string;
}

/** One of the owner's measured clips that is most like a given clip (docs/CONTRACTS.md §14.6). */
export interface SimilarClip {
  clipId: string;
  hook: string;
  title: string;
  momentType: MomentType;
  /** 0..1 (1 - cosine distance, 2 decimals). */
  similarity: number;
  performance?: Performance;
  coverUrl?: string;
}

// ---------- Follow creators (docs/CONTRACTS.md §24) ----------

export type FollowPlatform = "youtube" | "twitch" | "kick";
/** Where the owner pastes keys for following: Twitch, Kick, and the optional YouTube read key. */
export type FollowKeyPlatform = "twitch" | "kick" | "youtube-read";

export interface FollowLive {
  isLive: boolean;
  title?: string;
  /** Rounded to 2 figures. */
  viewers?: number;
  startedAt?: string;
  checkedAt?: string;
}

/** What Clip Factory last noticed: a stream that ended or a new video. */
export interface FollowLast {
  state: "noticed";
  text: string;
  at: string;
  videoKey?: string;
}

export interface Follow {
  /** "twitch:somestreamer" (the live event id too). */
  followId: string;
  platform: FollowPlatform;
  /** YouTube channel id (UC…), Twitch login or Kick slug. */
  platformId: string;
  handle: string;
  name: string;
  /** Only from the platforms' picture hosts; "" shows initials. */
  avatarUrl: string;
  url: string;
  /** "Make clips by itself" for this creator (used once that part ships). */
  autoClips: boolean;
  permissionAt: string;
  followedAt: string;
  /** Absent: not known yet (Twitch or Kick before the keys, YouTube without the read key). */
  live?: FollowLive;
  last?: FollowLast;
  /** false: found by name only; the name and picture fill in once the keys are pasted. */
  resolved: boolean;
}

export interface FollowCreator {
  platform: FollowPlatform;
  platformId: string;
  handle: string;
  name: string;
  avatarUrl: string;
  url: string;
  live?: FollowLive;
  resolved: boolean;
  /** Twitch or Kick without keys: following works, the live badge waits for a grown-up's keys. */
  needsKeys: boolean;
}

export type FollowLookup = { needsPlatform: true; name: string } | { needsPlatform: false; creator: FollowCreator };

export interface FollowKeyCheck {
  ok: boolean;
  code: "ok" | "no_keys" | "keys_rejected" | "platform_down";
  message: string;
  at: string;
}

export interface FollowKeySlot {
  platform: FollowKeyPlatform;
  saved: boolean;
  /** Someone the owner follows is on this platform. */
  needed: boolean;
  /** The YouTube read key: nice to have, never needed. */
  optional: boolean;
  savedAt?: string;
  hints?: Record<string, string>;
  check?: FollowKeyCheck;
}

export interface FollowsView {
  follows: Follow[];
  keys: FollowKeySlot[];
  /** Kick's app needs this webhook address (Copy chip in the Kick steps). */
  kickWebhookUrl: string;
}

export type FollowKeys = { clientId: string; clientSecret: string } | { apiKey: string };

/**
 * The live status line of a working job (docs/CONTRACTS.md §31): what it is doing right now, in one line. Every word
 * comes from the agent's fixed templates; never a command line, path, link or key.
 */
export interface JobLive {
  jobId: string;
  /** The run that wrote it (matches Job.run while it is current). */
  run?: string;
  /** The step key (resolve … finalize). */
  step: string;
  /** The big plain sentence, e.g. "Cutting clip 3 of 10". */
  text: string;
  /** The small grey detail, e.g. "0:41 of 0:58" or "412 MB of 1.2 GB · 34%". */
  detail?: string;
  /** The tiny "what is running" line, e.g. "ffmpeg · 1080×1920 · 30 fps" or "Claude Opus 5.5 · thinking". */
  tech?: string;
  /** When a model call started: the web counts the seconds itself. */
  since?: string;
  /** Clip (or part) i of n. */
  i?: number;
  n?: number;
  pct?: number;
  /** When the agent wrote it. */
  at: string;
  /** When the words last really changed (`at` also moves with the 30-second refresh). */
  lastChange?: string;
}

/** What the live connection pushes (docs/CONTRACTS.md §14.2). One message per changed item. */
export type LiveItemType = "job" | "clip" | "post" | "learning" | "week" | "setup" | "follow" | "jobLive";
export type LiveEvent =
  | { type: "job"; op: "upsert"; id: string; item: Job; partial?: undefined }
  | { type: "clip"; op: "upsert"; id: string; item: Clip; partial?: undefined }
  | { type: "post"; op: "upsert"; id: string; item: Post; partial?: undefined }
  | { type: "learning"; op: "upsert"; id: string; item: Learning; partial?: undefined }
  | { type: "week"; op: "upsert"; id: string; item: WeekSummary; partial?: undefined }
  | { type: "follow"; op: "upsert"; id: string; item: Follow; partial?: undefined }
  | { type: "jobLive"; op: "upsert"; id: string; item: JobLive; partial?: undefined }
  | { type: LiveItemType; op: "delete"; id: string; item?: undefined; partial?: undefined }
  | { type: LiveItemType; op: "upsert"; id: string; partial: true; item?: undefined };

export interface Me {
  user: { id: string; email: string };
  settings: Settings;
  counts: { review: number; running: number; posted: number };
}

export interface PresignedPut {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
}

export type NewJobSource = { type: "link"; url: string } | { type: "upload"; key: string; filename: string };

export interface NewJob {
  source: NewJobSource;
  clipTarget: ClipTarget;
  notes?: string;
  /** Made in the desktop app: a YouTube link is fetched by this computer from the start (CONTRACTS §35.1). */
  macFetch?: boolean;
  /** Use a video file on a link job (CONTRACTS §35.8): that job stops waiting for the Mac; this file replaces it. */
  replaces?: string;
}

// ---------- Real earnings (docs/CONTRACTS.md §25) ----------

/** A platform card's state (§25.1). In the programme and Earning never go down by themselves. */
export type MoneyState =
  | "earning"
  | "in_program"
  | "goal_reached"
  | "not_yet"
  | "counting"
  | "unknown"
  | "needs_permission"
  | "not_available"
  | "not_connected"
  | "error";

export interface MoneyWhere {
  label: string;
  url?: string;
}

/** One goal from config/monetization.json measured against the account's real numbers; never money. */
export interface MoneyGoal {
  key: string;
  label: string;
  kind: "bar" | "tick" | "number";
  current: number | null;
  goal: number | null;
  reached: boolean;
  approx: boolean;
  windowDays?: number;
  note?: string;
  help?: string;
  /** The key of the goal this one is an "or" with (watch hours or Shorts views). */
  or?: string;
  /** Why there is no number (the platform did not share it, a permission is missing). */
  missing?: string;
  countingDaysLeft?: number;
  sourceUrl: string;
}

export interface MoneyDay {
  date: string;
  amountMicros: number;
}

/** Money a platform reported, in its own currency (never converted), always tagged as that platform's estimate. */
export interface MoneyRevenue {
  platform: Platform;
  currency: string;
  unit: string;
  source: string;
  /** "YouTube's estimate". */
  tag: string;
  note: string;
  month: string;
  thisMonthMicros: number;
  last30: MoneyDay[];
  months: { month: string; amountMicros: number }[];
  revised?: boolean;
}

export interface MoneyPermission {
  what: "money" | "followers";
  /** "Allow money reading" or "Allow follower reading". */
  button: string;
  steps: string[];
  copy?: { label: string; value: string }[];
  open?: { label: string; url: string };
}

export interface MoneyCard {
  platform: Platform;
  state: MoneyState;
  /** Fixed short text for the state pill. */
  pill: string;
  /** One plain sentence. */
  line: string;
  programme: string;
  statusWhere: MoneyWhere;
  paidWhere: MoneyWhere;
  goals: MoneyGoal[];
  more: MoneyGoal[];
  extras: string[];
  checkedAt?: string;
  detectedAt?: string;
  earningSince?: string;
  lastError?: string;
  lagNote?: string;
  revenue?: MoneyRevenue;
  approxMonth?: { month: string; amountMicros: number; currency: string; source: string; tag: string; note: string };
  split?: { month: string; shortsMicros?: number; longMicros?: number; liveMicros?: number };
  notShared?: string;
  comingSoon?: string;
  needsPermission?: MoneyPermission;
}

export interface MoneyCelebration {
  key: string;
  platform: Platform;
  kind: "goal" | "in_program" | "first_money";
  text: string;
}

export interface MoneyView {
  platforms: MoneyCard[];
  country: string | null;
  countries: { code: string; name: string }[];
  /** Earning platforms only, one line per currency. */
  thisMonth: { currency: string; amountMicros: number; platforms: Platform[] }[];
  celebrations: MoneyCelebration[];
  nextCheckAllowedAt?: string;
  asOf: string;
}

/** A Post's money as its platform reported it (only YouTube today), for the clip page. */
export interface ReportedMoney {
  platform: Platform;
  amountMicros: number;
  currency: string;
  source: string;
  through?: string | null;
  tag: string;
}

// ---------- Money dashboard (docs/CONTRACTS.md §27) ----------

export type MoneyChart = 7 | 30 | 90 | 365;
export type MoneyClipPeriod = 7 | 30 | 90 | "all";
export type MoneyClipSort = "money" | "views";

/** Why an app is left out of the totals (§27.3). Never a number. */
export interface MoneyExcluded {
  platform: Platform;
  /** `behind`: its newest day is over 6 days old while another app is up to date. `error`: its check failed and
   * nothing is stored yet. */
  reason: "not_shared" | "coming_soon" | "not_connected" | "needs_permission" | "no_money_yet" | "behind" | "error";
  text: string;
  where?: MoneyWhere;
}

/** The comparison chip's data, worked out on the server: the web only words it. */
export interface MoneyChange {
  previousPeriodMicros: number | null;
  changePct: number | null;
  direction: "up" | "down" | "same" | "new" | "none";
}

export interface MoneyChartPoint {
  start: string;
  end: string;
  amountMicros: number;
  byPlatform: Partial<Record<Platform, number>>;
  partial?: true;
}

/** One currency's cards (never converted or added to another currency). */
export interface MoneyCurrencySummary {
  currency: string;
  /** "YouTube's estimate", "Meta's estimate" or "Apps' estimates". */
  tag: string;
  platforms: Platform[];
  /** The days of the last 30 that stored history covers (30 once it reaches that far): Daily and the pace use it. */
  coveredDays: number;
  monthly: { amountMicros: number; from: string; to: string } & MoneyChange;
  weekly: { amountMicros: number; from: string; to: string } & MoneyChange;
  daily: { averageMicros: number; from: string; to: string; latest: { date: string; amountMicros: number } | null } & MoneyChange;
  /** `paceMicros` is Monthly × 12 (over the covered days while under 30), always shown as "at this pace";
   * `last365Micros` a real sum once covered. */
  yearly: { paceMicros: number; last365Micros: number | null };
  chart: { period: MoneyChart; bucket: "day" | "week"; from: string; to: string; points: MoneyChartPoint[] };
}

/** GET /v1/money/summary (§27.5). */
export interface MoneySummary {
  platforms: Platform[];
  included: Platform[];
  excluded: MoneyExcluded[];
  /** yyyy-mm-dd: the earliest newest reported day across the counted apps; every period ends here. */
  through: string | null;
  throughBy: Partial<Record<Platform, string>>;
  historyFrom: Partial<Record<Platform, string>>;
  lagNote?: string;
  /** Biggest monthly first; empty when nothing can be counted. */
  currencies: MoneyCurrencySummary[];
  revised: { days: number; platforms: Platform[] };
  errors: { platform: Platform; text: string; checkedAt?: string }[];
  /** Apps whose newest day is over 6 days old (left out while another app is current; all of them when `stale`). */
  behind: Platform[];
  stale: boolean;
  asOf: string;
}

export interface MoneyClipLine {
  platform: Platform;
  postId: string;
  url?: string;
  postedAt: string;
  /** Lifetime views, "so far". */
  views: number | null;
  money: { amountMicros: number; currency: string; from: string | null; to: string; tag: string; source: string } | null;
  /** Only YouTube, only from the same report as the money, only from 1,000 views. */
  per1000Views: { amountMicros: number; currency: string; views: number; tag: string } | null;
  moneyState: "reported" | "not_shared" | "coming_soon" | "not_reported_yet" | "needs_permission" | "not_connected";
}

export interface MoneyClip {
  clipId: string;
  title: string;
  coverUrl?: string;
  firstPostedAt: string;
  views: number | null;
  totals: { currency: string; amountMicros: number }[];
  platforms: MoneyClipLine[];
}

/** GET /v1/money/clips (§27.5). */
export interface MoneyClips {
  period: MoneyClipPeriod;
  from: string | null;
  to: string | null;
  sort: MoneyClipSort;
  sortedBy: MoneyClipSort;
  note?: string;
  clips: MoneyClip[];
  nextCursor?: string;
}

export interface MoneyClipsQuery {
  platforms: Platform[];
  period: MoneyClipPeriod;
  sort: MoneyClipSort;
  cursor?: string;
  limit?: number;
}

/** The result codes the money grant sends back to /settings/posting/money?result=…&platform=… (§25.4). */
export type MoneyResult =
  | "money_allowed"
  | "money_denied"
  | "money_missing"
  | "money_not_connected"
  | "money_wrong_account"
  | "money_error";

/** §34: what happens to a deleted job's clips still waiting in Review ("keep" unless the owner ticked the box). */
export type JobDeleteClips = "keep" | "delete";
/** §34: one deleted job. Kept, posting and posted clips are never deleted and count in `clipsKept`. */
export interface JobDeleted {
  jobId: string;
  deleted: boolean;
  clipsDeleted: number;
  clipsKept: number;
}

/** Everything the screens need from the backend. The HTTP client and the mock both implement it. */
export interface Api {
  health(): Promise<{ ok: boolean; version: string }>;
  me(): Promise<Me>;
  createUpload(body: { filename: string; contentType: string; size: number }): Promise<PresignedPut & { uploadId: string }>;
  createJob(body: NewJob): Promise<Job>;
  listJobs(query?: { limit?: number; cursor?: string | null }): Promise<{ jobs: Job[]; nextCursor: string | null }>;
  getJob(jobId: string): Promise<{ job: Job; clips: Clip[] }>;
  cancelJob(jobId: string): Promise<Job>;
  retryJob(jobId: string): Promise<Job>;
  /** Mac fetches it (§35.3): progress, the signed part addresses for the video, and finishing the upload. */
  macProgress(jobId: string, body: MacProgress): Promise<Job>;
  macSourceUpload(jobId: string, body: { deviceId: string; size: number }): Promise<MacUploadParts>;
  macSourceComplete(
    jobId: string,
    body: { deviceId: string; parts: { n: number; etag: string }[]; title?: string; creator?: string; durationSec?: number },
  ): Promise<Job>;
  /** DELETE /v1/jobs/{jobId} (§34): a working job is stopped first; idempotent (`deleted: false` when not there). */
  deleteJob(jobId: string, clips?: JobDeleteClips): Promise<JobDeleted>;
  /** POST /v1/jobs/delete (§34): up to 25 jobs at once, one result each, in order. */
  deleteJobs(jobIds: string[], clips?: JobDeleteClips): Promise<JobDeleted[]>;
  listClips(query?: { status?: ClipFilter; jobId?: string }): Promise<Clip[]>;
  getClip(clipId: string): Promise<Clip>;
  updateClip(clipId: string, captions: Partial<Captions>): Promise<Clip>;
  /** `tiktok` carries the Post to TikTok sheet's choices (§17.8). */
  /**
   * Upload a clip (§14.5, §33). `platforms`: exactly where it goes (each must be set up); left out, Settings › Where
   * clips go decides (older clients). On an uploaded clip, `platforms` names the failed places to try again.
   */
  confirmClip(
    clipId: string,
    captions?: Partial<Captions>,
    tiktok?: TikTokPostOptions,
    platforms?: Platform[],
    options?: ClipPostOptions,
  ): Promise<{ clip: Clip; posts: Post[] }>;
  declineClip(clipId: string): Promise<Clip>;
  /** GET /v1/skills: built-ins first, then the owner's, by name (§18.3). */
  listSkills(): Promise<Skill[]>;
  /** GET /v1/skills/{skillId}. */
  getSkill(skillId: string): Promise<SkillDetail>;
  /** POST /v1/skills with the three answers (§18.2). */
  writeSkill(form: SkillForm): Promise<Skill>;
  /** PUT /v1/skills/{skillId} (§18.4); 409 when `version` is stale. */
  updateSkill(skillId: string, body: SkillUpdate): Promise<Skill>;
  /** POST /v1/skills/uploads; with `skillId` the file replaces that skill's file (§18.4). */
  createSkillUpload(filename: string, skillId?: string): Promise<PresignedPut & { skillId: string }>;
  /** POST /v1/skills after the upload. */
  createSkill(body: { skillId: string; key: string }): Promise<Skill>;
  deleteSkill(skillId: string): Promise<void>;
  getSettings(): Promise<Settings>;
  putSettings(patch: Partial<Settings>): Promise<Settings>;
  // Notifications (§32.3)
  /** GET /v1/push/key: the public key for `pushManager.subscribe`. 503 until the deploy made one. */
  pushKey(): Promise<string>;
  /** GET /v1/push/devices. */
  listPushDevices(): Promise<PushDevice[]>;
  /** PUT /v1/push/devices/{deviceId}: idempotent. */
  savePushDevice(deviceId: string, body: PushSubscriptionBody): Promise<PushDevice>;
  /** DELETE /v1/push/devices/{deviceId}. */
  deletePushDevice(deviceId: string): Promise<void>;
  /** POST /v1/push/test: "Notifications are on 🎉" to this device (or every device). 429 within 10 s. */
  sendTestPush(deviceId?: string): Promise<{ sent: number; devices: number }>;
  createCookiesUpload(filename: string): Promise<PresignedPut>;
  deleteCookies(): Promise<void>;
  listAccounts(): Promise<Account[]>;
  /**
   * POST /v1/accounts/{platform}/connect: where to send the owner to approve (same tab). `grant: "money"` is "Allow
   * money reading" (§25.4): YouTube and TikTok only, merged into the existing connection.
   */
  connectAccount(platform: Platform, grant?: "money"): Promise<{ authorizeUrl: string; expiresAt: string }>;
  /** POST /v1/accounts/{platform}/choose (Meta with several Pages or Instagram accounts). */
  chooseAccount(platform: Platform, accountId: string): Promise<PlatformSetup>;
  /** DELETE /v1/accounts/{platform}: the keys stay. */
  disconnectAccount(platform: Platform): Promise<void>;
  /** GET /v1/accounts/tiktok/creator-info, fetched each time the Post to TikTok sheet opens. */
  tiktokCreatorInfo(): Promise<TikTokCreator>;
  // Posting setup (§17.4)
  getSetup(): Promise<SetupOverview>;
  getPlatformSetup(platform: Platform): Promise<PlatformSetup>;
  setSetupStep(platform: Platform, step: string, done: boolean): Promise<PlatformSetup>;
  setReviewState(state: ReviewState): Promise<PlatformSetup>;
  saveSetupKeys(platform: Platform, keys: SetupKeys): Promise<PlatformSetup>;
  deleteSetupKeys(platform: Platform): Promise<void>;
  checkSetup(platform: Platform): Promise<{ check: KeyCheck; setup: PlatformSetup }>;
  uploadVerificationFile(filename: string, content: string): Promise<PlatformSetup>;
  deleteVerificationFile(filename: string): Promise<void>;
  listPosts(clipId?: string): Promise<Post[]>;
  insights(): Promise<{ learnings: Learning[]; posts: Post[] }>;
  /** GET /v1/lessons: Settings › Clip making › What it learned (§16.12). */
  listLessons(): Promise<LessonsView>;
  /** PATCH /v1/lessons/{lessonId} `{ status: "off" | "on" }`. */
  setLessonStatus(lessonId: string, to: "off" | "on"): Promise<Lesson>;
  /** DELETE /v1/lessons/{lessonId}. */
  deleteLesson(lessonId: string): Promise<void>;
  similarClips(clipId: string): Promise<SimilarClip[]>;
  /** GET /v1/clips/{clipId}/performance (§16.2). */
  clipPerformance(clipId: string): Promise<ClipPerformance>;
  /** POST /v1/clips/{clipId}/stats/refresh: one result per platform asked (default all five). */
  refreshStats(clipId: string, platforms?: Platform[]): Promise<RefreshResult[]>;
  /** GET /v1/weeks/{week}?from=&to= */
  getWeek(week: string, from: string, to: string): Promise<WeekView>;
  /** PUT /v1/weeks/{week}/best: 202 when the picks changed (learning starts), 200 when they did not. */
  saveWeekBest(week: string, body: { from: string; to: string; clipIds: string[] }): Promise<WeekView>;
  // Real earnings (§25.5)
  /** GET /v1/money. */
  getMoney(): Promise<MoneyView>;
  /** POST /v1/money/refresh: Check now, at most once an hour. */
  refreshMoney(): Promise<{ started: boolean; nextAllowedAt?: string | null }>;
  /** POST /v1/money/seen: a celebration was shown (it never plays again). */
  seenMoney(key: string): Promise<MoneyView>;
  /** PUT /v1/money/country. */
  setMoneyCountry(country: string): Promise<MoneyView>;
  /** GET /v1/money/summary?platforms=&chart= (§27.5): an empty list means every app. */
  getMoneySummary(platforms: Platform[], chart: MoneyChart): Promise<MoneySummary>;
  /** GET /v1/money/clips?platforms=&period=&sort=&cursor=&limit= (§27.5). */
  getMoneyClips(query: MoneyClipsQuery): Promise<MoneyClips>;
  /** GET /v1/followers (§38): followers and subscribers right now, per platform. */
  getFollowers(): Promise<FollowersView>;
  // Follow creators (§24.1)
  /** GET /v1/follows: the follows, the key slots and the Kick webhook address. */
  listFollows(): Promise<FollowsView>;
  /** POST /v1/follows/lookup: a link or a name (with the platform once the owner picked one). */
  lookupFollow(text: string, platform?: FollowPlatform): Promise<FollowLookup>;
  /** POST /v1/follows, only after "Yes, they said I can". */
  follow(platform: FollowPlatform, platformId: string): Promise<Follow>;
  /** PATCH /v1/follows/{platform}/{platformId} `{ autoClips }`. */
  setFollowAuto(platform: FollowPlatform, platformId: string, on: boolean): Promise<Follow>;
  /** DELETE /v1/follows/{platform}/{platformId}: only this follow; noticed streams and jobs stay. */
  unfollow(platform: FollowPlatform, platformId: string): Promise<void>;
  /** PUT /v1/follows/keys/{platform}: masked hints come back, never a key. */
  saveFollowKeys(platform: FollowKeyPlatform, keys: FollowKeys): Promise<FollowsView>;
  /** DELETE /v1/follows/keys/{platform}. */
  deleteFollowKeys(platform: FollowKeyPlatform): Promise<void>;
  /** POST /v1/follows/keys/{platform}/check. */
  checkFollowKeys(platform: FollowKeyPlatform): Promise<{ check: FollowKeyCheck } & FollowsView>;
}
