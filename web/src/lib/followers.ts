// Followers and subscribers (docs/CONTRACTS.md §38): what each clip brought in, and the totals right now.
// "Subscribers" on YouTube, "followers" everywhere else. Only numbers a platform reported: where a platform does not
// share new followers per video, the line says so in plain words and never shows a guess.
import type { AnyExtra, ClipPerformance, FollowerCount, FollowerWord, Platform } from "../api/types.ts";
import { PLATFORM_LABEL, PLATFORM_ORDER } from "./format.ts";
import { ago, compact, full } from "./metrics.ts";

export function followerWord(platform: Platform): FollowerWord {
  return platform === "youtube" ? "subscribers" : "followers";
}

/** Which platforms report new followers for one video, and from which PostMetrics.extra field (§16.3). */
type PerVideo = { field: "subscribersGained" | "followsGained"; slow: string } | { note: string; short: string };

/**
 * Checked against each platform's own API reference (Nov 2026):
 * - YouTube Analytics `subscribersGained` with `dimensions=video`.
 * - Facebook Reels insights `post_video_followers` ("The number of follows for your reel").
 * - Instagram media insights `follows` exists only for photo posts and stories, not for reels.
 * - TikTok's video object has views, likes, comments and shares only.
 * - X post metrics have no follows field (profile clicks are not follows).
 */
export const PER_VIDEO: Record<Platform, PerVideo> = {
  youtube: { field: "subscribersGained", slow: "Updates daily" },
  tiktok: { note: "TikTok doesn't share new followers for each video.", short: "Doesn't share this for each video." },
  instagram: { note: "Instagram doesn't share new followers for reels.", short: "Doesn't share this for reels." },
  facebook: { field: "followsGained", slow: "Can take 2 days" },
  x: { note: "X doesn't share new followers for each post.", short: "Doesn't share this for each post." },
};

export interface ClipFollowerLine {
  platform: Platform;
  /** "count": the platform reported a number. "waiting": it will, not yet. "not_shared": it never does per video. */
  kind: "count" | "waiting" | "not_shared";
  /** Only for "count". */
  count?: number;
  /** "12 new subscribers", "Not in yet", or "Doesn't share this for reels." (shown after the app's name). */
  text: string;
  /** For screen readers. */
  spoken: string;
  /** "Updates daily" / "Can take 2 days" while waiting. */
  slow?: string;
}

const POSTED = new Set(["posted", "posted_private"]);

/** "1 new subscriber", "12 new followers", "No new followers yet". */
export function gainedText(n: number, word: FollowerWord): string {
  if (n <= 0) return `No new ${word} yet`;
  const one = word === "subscribers" ? "subscriber" : "follower";
  return `${compact(n)} new ${n === 1 ? one : word}`;
}

/** One line per platform the clip went to (posted or posted privately), in STATS_ORDER. */
export function clipFollowerLines(perf: ClipPerformance): ClipFollowerLine[] {
  const out: ClipFollowerLine[] = [];
  for (const platform of PLATFORM_ORDER) {
    const post = perf.posts.find((p) => p.platform === platform);
    if (!post || !POSTED.has(post.status)) continue;
    const rule = PER_VIDEO[platform];
    const name = PLATFORM_LABEL[platform];
    if ("note" in rule) {
      out.push({ platform, kind: "not_shared", text: rule.short, spoken: rule.note });
      continue;
    }
    const extra = (post.metrics?.extra ?? {}) as AnyExtra;
    const n = extra[rule.field];
    const word = followerWord(platform);
    if (typeof n === "number" && Number.isFinite(n)) {
      const text = gainedText(n, word);
      const spoken = n > 0 ? `${name}: ${full(n)} new ${n === 1 ? word.slice(0, -1) : word}` : `${name}: ${text}`;
      out.push({ platform, kind: "count", count: n, text, spoken });
    } else {
      out.push({ platform, kind: "waiting", text: "Not in yet", spoken: `${name}: new ${word} not in yet. ${rule.slow}.`, slow: rule.slow });
    }
  }
  return out;
}

/** "+34 this week", "−3 this week", "Same as a week ago"; null when no week-old number was read. */
export function weekChangeText(change: number | undefined): string | null {
  if (change === undefined || !Number.isFinite(change)) return null;
  if (change === 0) return "Same as a week ago";
  return `${change > 0 ? "+" : "−"}${compact(Math.abs(change))} this week`;
}

export interface TotalRow {
  platform: Platform;
  state: FollowerCount["state"];
  /** "1.2K subscribers" when counted. */
  value?: string;
  spoken: string;
  change?: string;
  /** "Checked 3 h ago", plus "YouTube rounds this number." for YouTube. */
  fine?: string;
  note?: string;
}

export function totalRow(c: FollowerCount, now = Date.now()): TotalRow {
  const name = PLATFORM_LABEL[c.platform];
  if (c.state === "counted" && typeof c.count === "number") {
    const change = weekChangeText(c.weekChange) ?? undefined;
    const fine = [c.checkedAt ? `Checked ${ago(c.checkedAt, now)}` : "", c.rounded ? `${name} rounds this number.` : ""]
      .filter(Boolean)
      .join(" · ");
    return {
      platform: c.platform,
      state: c.state,
      value: `${compact(c.count)} ${c.count === 1 ? c.word.slice(0, -1) : c.word}`,
      spoken: `${name}: ${full(c.count)} ${c.word}${change ? `, ${change}` : ""}`,
      change,
      fine: fine || undefined,
    };
  }
  const note = c.note ?? `${name} hasn't shared this yet.`;
  return { platform: c.platform, state: c.state, spoken: `${name}: ${note}`, note };
}

/** What the Home tile says under its title. */
export function followersTileLine(counts: FollowerCount[]): string {
  if (counts.every((c) => c.state === "not_connected")) return "Connect an app to see your followers here.";
  if (counts.some((c) => c.state === "counted")) return "How many follow you on each app right now.";
  return "Your numbers show after the first daily check.";
}

/** "TikTok, Facebook and X" for the one not-connected line. */
export function joinNames(platforms: Platform[]): string {
  const names = platforms.map((p) => PLATFORM_LABEL[p]);
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
