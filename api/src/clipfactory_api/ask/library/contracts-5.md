## 5. HTTP API (API Gateway HTTP API v2 → Lambda `cf-prod-api`)

Base: `${apiUrl}/v1`. JSON in and out, camelCase. Every route requires the JWT except `GET /v1/health`.
CORS: allow origins `app_url` and `http://localhost:5173`, methods GET/POST/PUT/PATCH/DELETE/OPTIONS, headers
`authorization, content-type`. Route `OPTIONS /v1/{proxy+}` is public (`NONE`, with the API integration attached, as AWS requires; a route with no target is skipped) so API Gateway's CORS
answers the browser's preflight with 204; without it `ANY /v1/{proxy+}`'s JWT authorizer refused the token-less
preflight with 401 and every signed-in call failed in every browser. The deploy's smoke job checks it.
Errors: HTTP 4xx/5xx with body `{ "error": { "code": "snake_case_code", "message": "Plain sentence for the owner.",
"field"?: "title" | "description" | "instructions" }, "requestId": "<API Gateway request id>" }`. `field` is optional
and set only on the Skills form's bad-answer `400`s and the duplicate-name `409` (`field: "title"`), so the web shows
the message under that question (§18.2); every other error leaves it out. `requestId` sits at the top level, next to
`error`, on every `cf-prod-api` error since §19.6, and the `error` object may carry extra fields such as `retryAfter`
on a 429.
Codes: `bad_request`, `unauthorized`, `forbidden` (REST hooks API only, §14.3), `not_found`, `conflict`, `too_large`,
`not_implemented`, `unavailable` (503, posting setup not configured on the server, §17.4), `platform_down` (503, a
platform such as TikTok did not answer or was busy, also while Clip Factory refreshed its token; the message says to
try again in a minute, §17.4), `internal`.

| Method & path | Body | 2xx response |
|---|---|---|
| GET `/v1/health` | – | `{ "ok": true, "version": "..." }` |
| GET `/v1/me` | – | `{ "user": { "id", "email" }, "settings": Settings, "counts": { "review": n, "running": n, "posted": n } }` |
| POST `/v1/uploads` | `{ "filename", "contentType", "size" }` (video/*, ≤ 5 GB) | `{ "uploadId", "key", "uploadUrl", "headers": {"Content-Type": "..."} }` (presigned PUT, 1 h) |
| POST `/v1/jobs` | `{ "source": { "type": "link", "url" } \| { "type": "upload", "key", "filename" }, "clipTarget": { "min": 5, "max": 10 }, "notes"?: string }` | `201 { "job": Job }` |
| GET `/v1/jobs` | query `limit` (≤50), `cursor` | `{ "jobs": Job[], "nextCursor": string\|null }` newest first |
| GET `/v1/jobs/{jobId}` | – | `{ "job": Job, "clips": Clip[] }` |
| POST `/v1/jobs/{jobId}/cancel` | – | `{ "job": Job }` (only queued/running) |
| POST `/v1/jobs/{jobId}/retry` | – | `{ "job": Job }` (only failed/canceled; restarts from the beginning, cached source reused) |
| DELETE `/v1/jobs/{jobId}` | query `clips` (`keep` default \| `delete`) | `{ "jobId", "deleted": bool, "clipsDeleted": n, "clipsKept": n }` (§34; a working job is stopped first; idempotent: `deleted: false` when not there) |
| POST `/v1/jobs/delete` | `{ "jobIds": string[] (1–25), "clips"?: "keep" \| "delete" }` | `{ "results": [{ "jobId", "deleted", "clipsDeleted", "clipsKept" }] }` (§34, in order, each id once) |
| GET `/v1/clips` | query `status` (`review`\|`confirmed`\|`posted`\|`declined`\|`all`, default `review`), `jobId?` | `{ "clips": Clip[] }` |
| GET `/v1/clips/{clipId}` | – | `{ "clip": Clip }` |
| PATCH `/v1/clips/{clipId}` | `{ "captions": Partial<Captions> }` (only while `review`) | `{ "clip": Clip }` |
| GET `/v1/clips/{clipId}/similar` | – | `{ "clips": SimilarClip[] }` (≤ 5 of the owner's measured clips most like this one, §14.6; `[]` when none) |
| POST `/v1/clips/{clipId}/confirm` | `{ "captions"?: Partial<Captions> }` | `{ "clip": Clip, "posts": Post[] }` (writes the posts, starts the durable `cf-prod-clip-flow`, §14.5) |
| POST `/v1/clips/{clipId}/decline` | – | `{ "clip": Clip }` (video files and the clip's vector deleted) |
| GET `/v1/skills` | – | `{ "skills": Skill[] }` (§18.3: built-ins first, then the owner's by name; no `enabled`) |
| GET `/v1/skills/{skillId}` | – | `SkillDetail` (§18.3) |
| POST `/v1/skills/uploads` | `{ "filename", "skillId"? }` (`.md` ≤ 1 MB or `.zip` ≤ 20 MB; `skillId` = replace that skill's file, §18.4) | `{ "skillId", "key", "uploadUrl", "headers" }` (key per revision, §18.1) |
| POST `/v1/skills` | `{ "skillId", "key" }` (after the PUT) **or** `{ "title", "description", "instructions" }` (written in the app, §18.2) | `201 { "skill": Skill }` |
| PUT `/v1/skills/{skillId}` | `{ "version", "title", "description", "instructions" }` **or** `{ "version", "key" }` (§18.4) | `{ "skill": Skill }`; `409 conflict` on a stale `version` |
| PATCH `/v1/skills/{skillId}` | – | always `400 bad_request` "Skills are always used now, so there is no switch." (§18.1; the on/off switch is gone) |
| DELETE `/v1/skills/{skillId}` | – | `204` (owner skills only; built-ins → `409 conflict`, §18.5) |
| GET `/v1/skills/{skillId}/content` | – | `{ "content": "<SKILL.md text>" }` (kept for old clients; the web uses `GET /v1/skills/{skillId}`) |
| POST `/v1/skills/{skillId}/sections` | `{ "key", "action": "add" \| "undo", "version" }` or `{ "key", "action": "not_now" }` | `{ "skill": Skill, "newSections": SectionOffer[] }` (§38.3; owner skills only, built-ins → `409`) |
| GET `/v1/settings` | – | `{ "settings": Settings }` |
| PUT `/v1/settings` | `Partial<Settings>` (validated) | `{ "settings": Settings }` |
| POST `/v1/settings/cookies` | `{ "filename" }` | presigned PUT for an optional YouTube `cookies.txt` (helps when YouTube blocks cloud IPs) |
| DELETE `/v1/settings/cookies` | – | `204` |
| GET `/v1/accounts` | – | `{ "accounts": Account[] }` (one entry per platform; shape and the setup routes in §17.4) |
| POST `/v1/accounts/{platform}/connect` | – | `{ "authorizeUrl", "expiresAt" }` (§17.4; superseded the phase-1 `501`) |
| GET `/v1/posts` | query `clipId?` | `{ "posts": Post[] }` |
| GET `/v1/insights` | – | `{ "learnings": Learning[], "posts": Post[] }` (posts with metrics) |
| GET `/v1/lessons` | – | `{ "lessons": Lesson[], "creators": LessonCreator[], "checkedAt"? }` (§16.12) |
| PATCH `/v1/lessons/{lessonId}` | `{ "status": "off" \| "on" }` | `{ "lesson": Lesson }` (§16.12; 404 unknown or deleted) |
| DELETE `/v1/lessons/{lessonId}` | – | `204` (§16.12: a tombstone stays; 404 unknown) |
| GET `/v1/clips/{clipId}/performance` | – | `ClipPerformance` (§16.2; 404 if not the caller's or `review`/`declined`) |
| POST `/v1/clips/{clipId}/stats/refresh` | `{ "platforms"?: Platform[] }` (default: all) | `202 { "platforms": RefreshResult[] }` (§16.2; never bypasses a platform's limits) |
| GET `/v1/weeks/{week}` | `week` = `yyyy-Www` (ISO week); query `from`, `to` (ISO UTC instants of the owner's local Monday 00:00 and next Monday 00:00) | `{ "week": WeekView }` (§16.2) |
| PUT `/v1/weeks/{week}/best` | `{ "from", "to", "clipIds": string[] }` (0–10 ids of that week's clips) | `202 { "week": WeekView }` (starts the async `cf-prod-learn`, §16.6); `200` when the picks did not change |

### Shapes (TypeScript notation; the Python side uses the same keys)

```ts
type JobStatus = "queued" | "running" | "ready" | "failed" | "canceled";
type StepKey = "resolve" | "download" | "transcribe" | "analyze" | "watch" | "select" | "render" | "checklist" | "captions" | "finalize";
// Ten steps since ADR-40 ("watch" after "analyze"). Labels, in this order (the API writes them on create and retry,
// the agent on every update; one list in api/.../jobs.py, agent/.../jobs.py and web/src/api/mock/fixtures.ts):
// "Find the video", "Get the video", "Write down the words", "Listen for big moments", "Watch the video",
// "Pick the best moments", "Cut the clips", "Check each clip", "Write the captions", "Finish up".
// A job saved before ADR-40 keeps its nine steps (and its old labels) and is served as saved; clients render
// whatever list `steps` holds and never index it by position.
type StepStatus = "pending" | "running" | "done" | "failed" | "skipped";
interface Step { key: StepKey; label: string; status: StepStatus; message?: string; startedAt?: string; finishedAt?: string }
interface Source { type: "link" | "upload"; platform: "youtube" | "twitch" | "kick" | "upload"; url?: string;
                   key?: string; filename?: string; title?: string; channel?: string; durationSec?: number; thumbnailUrl?: string }
interface Job { jobId: string; status: JobStatus; source: Source; clipTarget: { min: number; max: number };
                steps: Step[]; progress: number /* 0..1 */; clipCount: number; notes?: string;
                error?: string; createdAt: string; updatedAt: string;
                model?: string /* §23: key of the model that made the clips; absent on older jobs */;
                modelWanted?: string /* §23: the owner's pick, only when it could not be used */ }
type ClipStatus = "review" | "confirmed" | "declined" | "publishing" | "posted" | "failed";
type MomentType = "rage" | "chaos" | "interaction" | "no_way" | "first_reaction" | "hot_take";
interface Captions { youtubeTitle: string; youtubeDescription: string; instagram: string; facebook: string; tiktok: string; x: string }
interface ChecklistItem { key: string; label: string; pass: boolean; note?: string }
interface Clip { clipId: string; jobId: string; rank: number; status: ClipStatus; momentType: MomentType;
                 hook: string; summary: string; durationSec: number; sourceStart: number; sourceEnd: number;
                 sourceUrlAt?: string; layout: "facecam_top" | "blur_fill";
                 videoUrl?: string; coverUrl?: string;      // presigned GET, 1 h, added by the API
                 captions: Captions; checklist: { items: ChecklistItem[]; fixes: string[] };
                 score: number /* 1..10 */; createdAt: string; decidedAt?: string;
                 pickedFor?: string /* why it was picked, at most 40 characters, e.g. "Loud laugh + Fast action";
                                       built by agent code from evidence inside the clip (§8), never by a model;
                                       absent on older clips and when nothing stood out */;
                 best?: boolean /* starred "Best this week" (§16) */; bestWeek?: string /* "yyyy-Www" */;
                 totalViews?: number /* sum of Post.metrics.views over posted posts; absent when none measured */ }
interface Skill { skillId: string; name: string /* frontmatter slug */; title: string /* shown name, §18.2 */;
                  description: string; builtin: boolean; source: "builtin" | "written" | "upload";
                  format: "md" | "zip"; size: number; createdAt: string; updatedAt: string;
                  version: number /* ≥ 1, optimistic concurrency, §18.4 */ }   // `enabled` removed by §18.1
// SkillDetail, SkillForm: §18.3.
interface Settings { clipMin: number /* 1..10, default 5 */; clipMax: number /* clipMin..10, default 10 */;
                     maxSourceHours: number /* 1..12, default 6 */; soundEnabled: boolean /* default true */;
                     reduceMotion: boolean /* default false */; hasYoutubeCookies: boolean /* read-only */;
                     platforms: Platform[] /* default all five */;
                     clickSound: number /* 1..30, default 6 "Water drop" (§15) */;
                     errorSound: number /* 1..30, default 5 "Nope nope nope" (§15) */;
                     setupSkipped: Platform[] /* default [], confirmed skips on the setup to-do list (§17.13) */;
                     clipModel: string /* §23: a key of clipModels in config/models.json, default agentModel "fable-5-1" */ }
type Platform = "youtube" | "instagram" | "facebook" | "tiktok" | "x";
// Account: superseded by §17.4 (adds "choose_account", name, avatarUrl, connectedAt, missing, reason, reconnectBy, choices)
interface Account { platform: Platform; status: "not_connected" | "connected" | "needs_reconnect" | "choose_account"; handle?: string }
interface Post { postId: string; clipId: string; platform: Platform; status: "pending_integration" | "queued" | "posted" | "failed";
                 url?: string; postedAt?: string; perfCheckAt?: string;
                 metrics?: PostMetrics /* §16.3; views/likes/comments/shares may be null = "this platform does not say" */;
                 privacy?: "public" | "private" /* TikTok unaudited posts are private, §16.3 */;
                 refreshing?: boolean /* a stats refresh is running (refreshStartedAt < 5 min ago) */;
                 nextRefreshAt?: string /* earliest manual refresh, §16.5 */; error?: string }
interface Learning { learningId: string; text: string; createdAt: string; postIds: string[];
                     kind?: "post" | "week" /* absent = "post": the retired 48-hour learning, shown as an older note */;
                     week?: string; title?: string /* "Best of week 2026-W46" */;
                     clipIds?: string[] /* week learnings: the picked clips */ }
interface Performance { views: number; likes: number; comments: number; shares: number; posts: number; checkedAt: string }
interface SimilarClip { clipId: string; hook: string; title: string; momentType: MomentType;
                        similarity: number /* 0..1 = 1 - cosine distance, 2 decimals */; performance?: Performance;
                        coverUrl?: string /* presigned GET, 1 h */ }
// PostMetrics, ClipPerformance, PlatformPerformance, RefreshResult, WeekView, WeekClip: §16.2–§16.3.
```
Home checks a pasted link as it is typed (`web/src/lib/links.ts` `checkLink`): a one-word Twitch or Kick path is a
live channel, except the sites' own pages (for example `twitch.tv/directory`, `/settings`, `/videos`, `/search`;
`kick.com/categories`, `/browse`, `/following`), which are refused on the spot with "That Twitch link goes to a Twitch
page, not a video, clip or channel. Open the video or the channel and copy its link." (Kick the same).

`Performance` sums treat a `null` metric as 0. Ids are ULIDs (26 chars, time-sortable). Timestamps are ISO-8601 UTC strings.
