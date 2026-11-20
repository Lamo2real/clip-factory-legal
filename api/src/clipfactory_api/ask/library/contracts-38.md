## 38. Followers and subscribers: per clip and in total (owner request, 2026-11-20)

The owner's ask: see **per video** how many followers each posted clip brought in, on each platform it went to, and
**in total** how many followers they have right now on each platform. The word is "subscribers" on YouTube and
"followers" on TikTok, Instagram, Facebook and X. Only numbers a platform reported are shown; where a platform gives
no per-video number the clip shows a short plain note and the total only, never an estimate.

### 38.1 What each platform's official API allows (checked 2026-11-20)

| Platform | New followers per video | Total right now |
|---|---|---|
| YouTube | Yes: Analytics `subscribersGained` with `dimensions=video` (§16.3 `extra.subscribersGained`, slow group "Updates daily", already read) | `channels.list part=statistics` `subscriberCount` (YouTube rounds it; hidden counts are never a 0), already read daily by §25 |
| Facebook | Yes, for reels: Reels insights `post_video_followers` "The number of follows for your reel", lifetime (§16.3 `extra.followsGained`, "Can take 2 days", already read). Regular Page videos have no such metric | Page `followers_count`, already read daily by §25 |
| Instagram | **No for reels.** Media insights `follows` exists only for `FEED` (photo posts) and `STORY`, not `REELS`; Clip Factory posts reels, so it is never asked for (asking would cost a code-100 retry every run) | `followers_count` on the IG user, already read daily by §25 |
| TikTok | **No.** The video object has views, likes, comments and shares only | `user/info` `follower_count` (needs `user.info.stats`: Allow follower reading, §25.4), already read daily by §25 |
| X | **No.** Post metrics have no follows field (`user_profile_clicks` are profile visits, not follows) | `users/me` `public_metrics.followers_count`, already kept in the daily `ACCTSTAT#x#` snapshot by §25 |

So no new platform call, scope, table, index, bucket, Lambda or role is needed: every number is already fetched and
stored. The only server change is one read-only route.

### 38.2 API (additive, under `ANY /v1/{proxy+}`; `api/src/clipfactory_api/followers.py`, `routes/followers.py`)

| Method & path | Body | Answer |
|---|---|---|
| GET `/v1/followers` | – | `FollowersView` |

```ts
interface FollowersView { platforms: FollowerCount[] }   // always five, STATS_ORDER
interface FollowerCount {
  platform: Platform;
  word: "subscribers" | "followers";                      // "subscribers" for YouTube only
  state: "counted" | "not_connected" | "not_checked_yet" | "missing";
  count: number | null;                                   // only when state is "counted"
  checkedAt?: string;                                     // readAt of the snapshot the count came from
  weekChange?: number;                                    // count minus the same key on the ACCTSTAT item dated 7 days before
  rounded?: true;                                         // YouTube, when counted
  note?: string;                                          // why there is no number, in plain words
}
```

Per platform, first match wins:
1. No connected Account → `not_connected`, note "Connect {App} in Settings › Posting › Set up posting."
2. The newest `ACCTSTAT#{platform}#` item (newest first, at most 10 read) whose `subscribers` (YouTube) or
   `followers` (others) is a whole number ≥ 0 → `counted`, with `checkedAt` its `readAt`, `weekChange` only when the
   item dated exactly 7 days before holds the same key (one GetItem), `rounded: true` for YouTube.
3. `MONEYSTATE#{platform}.missing[key]` is a sentence → `missing` with that sentence (e.g. "Your subscriber count is
   hidden on YouTube.", "Press Allow follower reading once TikTok approves it.").
4. Otherwise `not_checked_yet`, note "Clip Factory checks once a day. Your number shows after the next check."

Like `GET /v1/money` it registers the owner on `MONEYOWNERS` (so the daily run reads them). Nothing is written about the
platforms, and no token, account id, raw body, `pk`, `sk` or `ttl` is in the answer. The numbers are as fresh as the
daily `cf-prod-money` run (06:00 UTC) or the last Check now (§25.5).

Per-video numbers come from the existing `GET /v1/clips/{id}/performance` (`metrics.extra.subscribersGained` on
YouTube, `metrics.extra.followsGained` on Facebook); that answer is unchanged.

### 38.3 Web

* **Home › Your followers** (`FollowersTile`, after the money tile, `data-help="home-followers"`): one row per app that
  is connected: its mark, "YouTube: 1.2K subscribers", "+34 this week" / "−3 this week" / "Same as a week ago" when
  `weekChange` is present, and a grey "Checked 3 h ago · YouTube rounds this number."; an app with no number shows
  its `note` and no digits. Apps that are not connected share one grey line "Not connected: TikTok, Facebook and X.".
  With nothing connected: "Connect an app to see your followers here." and **Set up posting**
  (`/settings/posting/setup`). A failed load hides the tile (Home's other rows still show).
* **Clip page › New followers from this clip** (`ClipFollowers`, under the stacks, `data-help="clip-followers"`): one
  line per app the clip was posted to (`posted` or `posted_private`), in STATS_ORDER: "YouTube: 12 new subscribers",
  "Facebook: 1 new follower", "No new followers yet" for a reported 0, "Not in yet · Updates daily" (YouTube) or
  "Not in yet · Can take 2 days" (Facebook) while the slow insight has not arrived, and for the apps that never report
  it: "Instagram: Doesn't share this for reels.", "TikTok: Doesn't share this for each video.", "X: Doesn't share this
  for each post." (screen readers hear "Instagram doesn't share new followers for reels." and so on). Hidden when the
  clip went nowhere. The stacks keep their "New subscribers" / "New followers" rows.
* `web/src/lib/followers.ts` holds the words, the per-video rules (`PER_VIDEO`) and every line's text.

### 38.4 Mock

`web/src/api/mock/followers.ts`, scenario in `sessionStorage["cf-mock-followers"]` (or
`window.__cfMock.followers.setScenario`): `owner` (default, like the owner today: YouTube 1,240 subscribers +34 and
Instagram 512 followers +9, the rest not connected), `all` (all five counted, a fall and a "same"), `start` (nothing
connected), `first_check` (YouTube not checked yet, TikTok waiting for Allow follower reading), `error` (500).

### 38.5 Tests

`api/tests/test_followers.py` (order, each state, the week's change and its absence, older snapshots behind a newer one
without the key, no internal keys, the owner registered, 401 without a JWT), `api/tests/test_http.py` (the route is
registered), `web/test/followers.test.tsx` (words, per-video rules, singular and 0, the week's change, every mock
scenario, the tile and the clip section rendered) and `web/e2e/followers.spec.ts` (every scenario on Home, the clip
page's lines, 375 px light and dark with no sideways scroll and axe contrast).

### 38.6 Not verified live

That Instagram's media listing with `follows` would really refuse reels with code 100 (the reference says reels are not
supported, so it is not asked for); that Facebook's `post_video_followers` counts new followers rather than all follow
actions (Meta's wording is "follows for your reel").
