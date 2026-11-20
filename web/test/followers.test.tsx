// Followers and subscribers (docs/CONTRACTS.md §38): the words per platform, a clip's new followers only where the
// platform reports them (a plain note elsewhere, never a guess), the totals' lines, the mock's scenarios and the
// Home tile and clip section as rendered.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Api, ClipPerformance, FollowerCount, Platform } from "../src/api/types.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let current: Partial<Api> = {};
vi.mock("../src/api/index.ts", async (orig) => ({ ...(await orig<object>()), api: () => current as Api }));

const f = await import("../src/lib/followers.ts");
const { buildFollowers, followersApi, FOLLOWER_SCENARIOS } = await import("../src/api/mock/followers.ts");
const { FollowersTile } = await import("../src/screens/home/FollowersTile.tsx");
const { ClipFollowers } = await import("../src/screens/clip/ClipFollowers.tsx");
const { forgetLoaded } = await import("../src/lib/hooks.ts");
const { STATS_ORDER } = await import("../src/lib/metrics.ts");

const T = "2026-11-20T10:00:00.000Z";
const NOW = Date.parse("2026-11-20T13:00:00.000Z");

function perf(over: Partial<Record<Platform, { status?: string; extra?: Record<string, number> }>>): ClipPerformance {
  return {
    clip: { clipId: "C1", hook: "Hook" } as ClipPerformance["clip"],
    posts: STATS_ORDER.map((platform) => {
      const o = over[platform];
      return {
        platform,
        status: (o?.status ?? (o ? "posted" : "not_posted")) as ClipPerformance["posts"][number]["status"],
        account: "connected" as const,
        metrics: o ? { views: 100, likes: 1, comments: 0, shares: null, checkedAt: T, metricsUpdatedAt: T, extra: o.extra ?? {} } : null,
        refreshing: false,
        final: false,
      };
    }),
    series: {},
    totals: { views: 0, likes: 0, comments: 0, shares: 0, platformsPosted: 0 },
    bestPlatform: null,
    bestThisWeek: false,
    week: null,
    weekAnchorAt: T,
  } as unknown as ClipPerformance;
}

describe("words", () => {
  it("says subscribers on YouTube and followers everywhere else", () => {
    expect(STATS_ORDER.map(f.followerWord)).toEqual(["subscribers", "followers", "followers", "followers", "followers"]);
  });

  it("only YouTube and Facebook report new followers per video", () => {
    const perVideo = STATS_ORDER.filter((p) => "field" in f.PER_VIDEO[p]);
    expect(perVideo).toEqual(["youtube", "facebook"]);
    expect(f.PER_VIDEO.instagram).toMatchObject({ note: "Instagram doesn't share new followers for reels." });
    expect(f.PER_VIDEO.tiktok).toMatchObject({ note: "TikTok doesn't share new followers for each video." });
    expect(f.PER_VIDEO.x).toMatchObject({ note: "X doesn't share new followers for each post." });
  });

  it("counts in the singular for one, and never says +0", () => {
    expect(f.gainedText(1, "subscribers")).toBe("1 new subscriber");
    expect(f.gainedText(12, "followers")).toBe("12 new followers");
    expect(f.gainedText(1500, "subscribers")).toBe("1.5K new subscribers");
    expect(f.gainedText(0, "followers")).toBe("No new followers yet");
  });

  it("writes the week's change with a real minus sign, and nothing without a week-old number", () => {
    expect(f.weekChangeText(34)).toBe("+34 this week");
    expect(f.weekChangeText(-3)).toBe("−3 this week");
    expect(f.weekChangeText(0)).toBe("Same as a week ago");
    expect(f.weekChangeText(undefined)).toBeNull();
  });
});

describe("a clip's new followers", () => {
  it("shows reported numbers, waits where they are slow, and says plainly where an app never shares", () => {
    const lines = f.clipFollowerLines(
      perf({
        youtube: { extra: { subscribersGained: 12 } },
        tiktok: {},
        instagram: { extra: { reach: 900 } },
        facebook: {},
        x: { status: "posted_private" },
      }),
    );
    expect(lines.map((l) => [l.platform, l.kind, l.text])).toEqual([
      ["youtube", "count", "12 new subscribers"],
      ["tiktok", "not_shared", "Doesn't share this for each video."],
      ["instagram", "not_shared", "Doesn't share this for reels."],
      ["facebook", "waiting", "Not in yet"],
      ["x", "not_shared", "Doesn't share this for each post."],
    ]);
    expect(lines[2]!.spoken).toBe("Instagram doesn't share new followers for reels.");
    expect(lines[3]!.slow).toBe("Can take 2 days");
    expect(lines[0]!.spoken).toBe("YouTube: 12 new subscribers");
  });

  it("leaves out apps the clip did not go to, and a reported 0 stays a 0", () => {
    const lines = f.clipFollowerLines(perf({ facebook: { extra: { followsGained: 0 } }, youtube: { status: "failed" } }));
    expect(lines).toEqual([
      { platform: "facebook", kind: "count", count: 0, text: "No new followers yet", spoken: "Facebook: No new followers yet" },
    ]);
    expect(f.clipFollowerLines(perf({}))).toEqual([]);
  });
});

describe("totals", () => {
  const yt: FollowerCount = { platform: "youtube", word: "subscribers", state: "counted", count: 1240, checkedAt: T, weekChange: 34, rounded: true };

  it("a counted row has the number, the week's change, when it was checked and YouTube's rounding", () => {
    expect(f.totalRow(yt, NOW)).toEqual({
      platform: "youtube",
      state: "counted",
      value: "1.2K subscribers",
      spoken: "YouTube: 1,240 subscribers, +34 this week",
      change: "+34 this week",
      fine: "Checked 3 h ago · YouTube rounds this number.",
    });
    expect(f.totalRow({ platform: "x", word: "followers", state: "counted", count: 1 }, NOW).value).toBe("1 follower");
  });

  it("a row with no number shows the server's reason and no number at all", () => {
    const row = f.totalRow({ platform: "tiktok", word: "followers", state: "missing", count: null, note: "Press Allow follower reading once TikTok approves it." });
    expect(row.value).toBeUndefined();
    expect(row.note).toBe("Press Allow follower reading once TikTok approves it.");
  });

  it("the tile's line follows what is connected", () => {
    expect(f.followersTileLine(buildFollowers("start").platforms)).toBe("Connect an app to see your followers here.");
    expect(f.followersTileLine(buildFollowers("owner").platforms)).toBe("How many follow you on each app right now.");
    expect(f.joinNames(["tiktok", "facebook", "x"])).toBe("TikTok, Facebook and X");
  });
});

describe("the mock", () => {
  it("always answers five platforms in order, with counts only when counted", () => {
    for (const s of FOLLOWER_SCENARIOS.filter((x) => x !== "error")) {
      const view = buildFollowers(s);
      expect(view.platforms.map((c) => c.platform)).toEqual([...STATS_ORDER]);
      for (const c of view.platforms) {
        expect(c.word).toBe(f.followerWord(c.platform));
        expect(c.count === null).toBe(c.state !== "counted");
        if (c.state !== "counted") expect(c.note).toBeTruthy();
      }
    }
  });

  it("the error scenario answers 500", async () => {
    const mock = followersApi(async () => {});
    mock.controls.setScenario("error");
    await expect(mock.api.getFollowers()).rejects.toMatchObject({ status: 500 });
    mock.controls.setScenario("owner");
    expect((await mock.api.getFollowers()).platforms[0]!.count).toBe(1240);
  });
});

describe("rendered", () => {
  let host: HTMLElement;
  let root: Root;
  beforeEach(() => {
    sessionStorage.clear();
    forgetLoaded();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("Home shows each connected app's number and one line for the rest", async () => {
    current = { getFollowers: async () => buildFollowers("owner") };
    await act(async () => root.render(<FollowersTile />));
    const rows = [...host.querySelectorAll<HTMLElement>(".followers-tile__row")];
    expect(rows.map((r) => r.dataset.platform)).toEqual(["youtube", "instagram"]);
    expect(rows[0]!.textContent).toContain("1.2K subscribers");
    expect(rows[1]!.textContent).toContain("512 followers");
    expect(host.querySelector(".followers-tile__off")!.textContent).toBe("Not connected: TikTok, Facebook and X.");
  });

  it("Home hides the tile when the load fails", async () => {
    current = { getFollowers: async () => Promise.reject(new Error("down")) };
    await act(async () => root.render(<FollowersTile />));
    expect(host.querySelector(".followers-tile")).toBeNull();
  });

  it("the clip page lists only the apps the clip went to", async () => {
    await act(async () => root.render(<ClipFollowers perf={perf({ youtube: { extra: { subscribersGained: 3 } }, instagram: {} })} />));
    expect(host.querySelector("h2")!.textContent).toBe("New followers from this clip");
    const rows = [...host.querySelectorAll<HTMLElement>(".perf-followers__row")];
    expect(rows.map((r) => [r.dataset.platform, r.dataset.kind])).toEqual([
      ["youtube", "count"],
      ["instagram", "not_shared"],
    ]);
    await act(async () => root.render(<ClipFollowers perf={perf({})} />));
    expect(host.querySelector(".perf-followers")).toBeNull();
  });
});
