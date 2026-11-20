// GET /v1/followers (docs/CONTRACTS.md §38) in memory. Tests and screenshots pick a scenario with
// window.__cfMock.followers.setScenario(name) (kept in sessionStorage, so a reload keeps it). The numbers are
// fixtures for the pretend app only: the real app shows only what each platform reported. Only bundled into mock builds.
import { ApiError } from "../errors.ts";
import type { Api, FollowerCount, FollowersView, Platform } from "../types.ts";

export type FollowersApi = Pick<Api, "getFollowers">;

export const FOLLOWER_SCENARIOS = ["owner", "all", "start", "first_check", "error"] as const;
export type FollowerScenario = (typeof FOLLOWER_SCENARIOS)[number];

export interface MockFollowerControls {
  setScenario(name: FollowerScenario): void;
  scenario(): FollowerScenario;
}

const KEY = "cf-mock-followers";
const ORDER: Platform[] = ["youtube", "tiktok", "instagram", "facebook", "x"];
const LABEL: Record<Platform, string> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", x: "X" };
const word = (p: Platform) => (p === "youtube" ? "subscribers" : "followers");

function load(): FollowerScenario {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw && FOLLOWER_SCENARIOS.includes(raw as FollowerScenario)) return raw as FollowerScenario;
  } catch {
    /* no storage: the default */
  }
  return "owner";
}

function counted(p: Platform, count: number, weekChange: number | undefined, hoursAgo: number): FollowerCount {
  const out: FollowerCount = {
    platform: p,
    word: word(p),
    state: "counted",
    count,
    checkedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
  };
  if (weekChange !== undefined) out.weekChange = weekChange;
  if (p === "youtube") out.rounded = true;
  return out;
}

const off = (p: Platform): FollowerCount => ({
  platform: p,
  word: word(p),
  state: "not_connected",
  count: null,
  note: `Connect ${LABEL[p]} in Settings › Posting › Set up posting.`,
});

const notYet = (p: Platform): FollowerCount => ({
  platform: p,
  word: word(p),
  state: "not_checked_yet",
  count: null,
  note: "Clip Factory checks once a day. Your number shows after the next check.",
});

export function buildFollowers(scenario: FollowerScenario): FollowersView {
  const by: Partial<Record<Platform, FollowerCount>> = {};
  if (scenario === "owner") {
    // Like the owner today: YouTube and Instagram connected, the rest not yet.
    by.youtube = counted("youtube", 1240, 34, 3);
    by.instagram = counted("instagram", 512, 9, 3);
  } else if (scenario === "all") {
    by.youtube = counted("youtube", 12_400, 310, 2);
    by.tiktok = counted("tiktok", 48_200, -120, 2);
    by.instagram = counted("instagram", 3_050, 0, 2);
    by.facebook = counted("facebook", 870, undefined, 2);
    by.x = counted("x", 1, 1, 2);
  } else if (scenario === "first_check") {
    by.youtube = notYet("youtube");
    by.tiktok = { platform: "tiktok", word: "followers", state: "missing", count: null, note: "Press Allow follower reading once TikTok approves it." };
    by.instagram = counted("instagram", 512, undefined, 1);
  }
  return { platforms: ORDER.map((p) => by[p] ?? off(p)) };
}

export function followersApi(wait: () => Promise<void>): { api: FollowersApi; controls: MockFollowerControls } {
  const controls: MockFollowerControls = {
    setScenario(name) {
      try {
        sessionStorage.setItem(KEY, name);
      } catch {
        /* no storage */
      }
    },
    scenario: load,
  };
  const api: FollowersApi = {
    async getFollowers() {
      await wait();
      const s = load();
      if (s === "error") throw new ApiError(500, "internal", "Something went wrong. Try again.");
      return buildFollowers(s);
    },
  };
  return { api, controls };
}
