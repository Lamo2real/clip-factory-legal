## 37. Chat hype: the crowd as a signal (owner request, 2026-11-20)

### 37.1 The owner's words

"If the chat of the streamer is scrolling or rolling really fast, or they're spamming something, that also might
indicate that there is something viral going on." So a stream's chat is read like the sound: a sudden burst, or many
people typing the same word, is a hint that a moment just happened. Decision record: ADR-61.

### 37.2 What the owner sees

* While the analyze step ("Listen for big moments") waits for the chat, the live line (§31) says **Reading the chat**
  · "12,430 messages" · "Twitch chat replay" (or "YouTube chat replay", "Kick chat").
* The analyze step message gains one sentence when chat went wild at least once: "Found 14 loud moments. Chat went
  wild 6 times." With no chat, or no spike, the message is exactly what it was.
* A Review card's **Why:** line may say "Chat went wild" (for example "Chat went wild + Loud laugh", §5 `pickedFor`).
* Ask knows "What Chat went wild means" (help guide `review-chat-went-wild`).

### 37.3 Sources and their limits

| Source | How | Login or cookies | Rules |
|---|---|---|---|
| YouTube live chat replay | yt-dlp `--skip-download --write-subs --sub-langs live_chat`, with `--load-info-json <workdir>/chat-info.json` from resolve, the PO token, the optional proxy | only the owner's already saved cookies | 12 min at most; on a timeout the `.part` file is read up to its last line; not started with under 1.5 GB of free disk; at most 400,000 messages read (then covered only up to where it stopped) |
| Twitch VOD chat | the web player's public comments query on gql.twitch.tv (`VideoCommentsByOffsetOrCursor`, public web Client-ID), **by time offset only** | none | 8 evenly spaced stretches at once, at most 4 requests in flight and 5 a second, 3,600 requests at most; each page is asked again from its last second (messages seen are dropped by id), a network error ends only that stretch and keeps what arrived, one back off for all stretches on a 429 or 5xx, 8 of them stop the walk, and a cancel leaves no request running; an integrity check, a challenge or "replay off" stops it for good on this job |
| Kick VOD chat | one probe of `kick.com/api/v2/channels/{channel_id}/messages?start_time=…` | none | an HTML page, a 403 or a challenge means "no chat", never retried or worked around; only a real messages page goes on, one request at a time |
| Chat shown in the picture | our own CPU work on the 2 fps analysis parts (`chatscreen.py`) | n/a | only when the replay is missing or covers < 50% of the video, and only when the picture was prepared |

`meta.chatSource` (written by resolve): `{platform: "youtube"}` when the info has a `live_chat` track, `{platform:
"twitch", videoId}` for a Twitch VOD (`v123…`), `{platform: "kick", channelId, start}` for a Kick VOD, else null.
Uploads never fetch remote chat. The fetch starts in the background right after the sound is downloaded and runs
during transcription; analyze waits for it at most `chat_deadline` = 3 min + 2 min per hour of video (≤ 12 min) plus
30 s, then goes on with whatever arrived.

### 37.4 `chat.json`

```
{ version: 1,
  source: "twitch" | "kick" | "youtube" | "screen",
  coverage: 0..1,                 // share of the video's seconds with chat to count
  messages: int,                  // counted after the filters (screen: lines that scrolled by)
  lagSeconds: number,             // 2..10, learned from the loudness spikes, else 5
  rate: (number | null)[],        // per second; null = not covered (screen: lines per second)
  box: {x, y, w, h} | null,       // screen only, in 768×432 picture pixels
  spikes: [ { t,                  // the moment, estimated: onset − lag
              onset, peak, z, lift, strength,
              window: [a, b],     // where the moment probably is: [onset − 10, onset − 2]
              spam: string | null,// at most 24 characters, cleaned, no links or @names
              share: number,      // share of the burst saying the spam text
              mood: "laugh" | "hype" | "shock" | "clip" | "fail" | null,
              flag: null | "raid" | "giveaway" | "subs" | "bots" } ] }
```

No chatter name, id or message body is stored or logged. Names are counted through a salted hash that lives only in
memory for one job. `chat.json` is reused by a Try again (§30) like `loudness.json`, by its version.

### 37.5 The maths (`chat.py`, `chatscreen.py`)

* **Filters**: messages starting with `!`, known bots (nightbot, streamelements, streamlabs, moobot, fossabot,
  sery_bot, botrix, kicbot, wizebot) and system notices (subs, gifts, raids, memberships; YouTube counts only
  `liveChatTextMessageRenderer`, Kick only `type == "message"`) are not chat. Notices are counted for the `subs` flag.
* **Rate**: messages per second; the 5-second sum centred on each second.
* **Baseline**: the median of the covered seconds within ±300 s (worked out every 15 s), `sd = max(1.4826·MAD,
  √median, 1)`; `z = (rate − median)/sd`, `lift = rate/max(median, 1)`.
* **Spike**: `z ≥ 3`, `lift ≥ 1.8` and at least 6 messages in the 5 s (screen: 2 lines). Hot seconds within 20 s are
  one spike; its onset is the first second within 15 s before the peak halfway up from the baseline. At most 60.
* **Lag**: for each lag 2..10 s, the onsets that land within ±2 s of a loudness spike; the lag with the most (then the
  closest) when at least 4 match **and** that beats chance: the median of the lags more than 2 away from it is the
  chance control, and the best must be 1.5× it and 3 binomial sigma above it, else 5. Flagged bursts do not take part.
  `t = onset − lag`.
* **Spam**: messages are cleaned (lowercase, no links or @names, runs of one character squashed, a repeated word said
  once); a burst floods when its most common text is ≥ 30% of it, at least 5 copies from at least 4 people. The word
  shown to the finder is the softly cleaned form (runs of 3+ shortened to 2, so "good" stays "good") and is never a
  word on the kid-proof list (`chat.profane`: whole words, letter swaps and stretched forms); such a flood has no spam
  word.
* **Mood**: fixed word lists (laugh: lul, lol, lmao, kekw, omegalul, icant, 😂, 🤣, 💀, xd; hype: w, pog, poggers,
  letsgo, 🔥, goat, insane; shock: ?, what, no way, wtf, monkas, 😱, holy; clip: clip it, clip that, clip, +clip;
  fail: l, f, rip, 🤡), said to the finder as "chat laughing", "chat hyped", "chat shocked", "chat says clip it",
  "chat says L".
* **Flags**: `raid` (raid words from ≥ 5 people and ≥ 30% of the burst, one long copy-paste, or ≥ 40% first-time
  chatters after the first 10 minutes **of the same gap-free stretch of chat**), `giveaway` (≥ 30% say giveaway,
  giveaways, raffle, ticket or tickets), `subs` (≥ 10 notices), `bots`
  (fewer than 4 people make up ≥ 60% of it). A flagged spike keeps 0.3× its strength, is never a reason on a clip and
  never adds to a hot spot.
* **Strength**: `min(2, z/3) + 0.4 (spam) + 0.3 (mood "clip")`.
* **Chat box in the picture**: the parts are decoded to 384×216 grey and streamed through numpy. The box is the
  largest group of grid cells (24×12) that look like text, keep changing and keep moving **up** (row-profile
  correlation, frame pairs half a second apart, 8 parts × 30 s sampled, and only those parts are fetched for it), taller than wide, 5–40% of the frame. Line
  height from the autocorrelation of its rows. Speed = rows moved / line height (a box replaced at once counts its
  height); a second with a cut (scene score > 0.4, or the whole frame changing) is null. Then the same spike maths.
  No box: nothing, which is always safe.

### 37.6 What the finder reads (only when chat exists)

* System prompt, after the speaker note: `CHAT_NOTE` (about 110 tokens).
* `hints` (so `read_transcript` and `list_spikes` too), at most 10 per window, strongest first, in time order:
  `Chat spikes: 1:02:07 (x6, chat laughing, spam "kekw", moment ~1:01:57–1:02:05), 1:40:12 (x3, maybe a raid)`.
* `get_brief`: `"chat": {"source", "coveragePercent", "messages"}`.
* Hot spots: an unflagged spike is one more source ("chat went wild"), so the bonus for two sources applies.
* The Converse gate reads a quiet window that holds an unflagged spike of strength ≥ 1.5.
* With a chat box on screen, Fable's watch prompt gets one sentence asking it to put the flood word in
  `text_on_screen` as `chat: KEKW`; those words become `chatWords` in the chunk checkpoint, and an event whose text starts
  with `chat:` is dropped (no event, no hot spot): chat is counted once, as chat.
* With no chat, `system_prompt`, `hints`, `read_transcript` and `brief_json` are byte for byte what they were
  (`test_without_signals_every_prompt_is_byte_identical_to_before`). The tool descriptions are unchanged.
* The built-in skill `viral-clip-editing` §1 "Reading the signals" has a **Chat** block: what it means, the lag, how
  to weigh it, what to ignore. An owner's own copy of that skill made before it is offered the block, and gets it as a
  note until then (§38).

### 37.7 Switches

Environment variables of the agent, default on: `CF_CHAT=off` (every chat source and the chat box), `CF_CHAT_TWITCH=off`,
`CF_CHAT_KICK=off`, `CF_CHAT_YOUTUBE=off`, `CF_CHAT_SCREEN=off`. No Terraform or table change.

### 37.8 What never happens

No cookies just for chat; no integrity-token or Cloudflare workaround; nothing stored about chatters; no message text
in logs; a missing, blocked, slow or broken chat never fails a job or a step. Image cost: `numpy` (about 20 MB).

### 37.9 Tests

`agent/tests/test_chat.py`, `test_chatfetch.py` (fixtures in `agent/tests/fixtures/chat/`, a socket guard in
`conftest.py`), `test_chatscreen.py` (synthetic video, `tests/chat_video.py`), `test_skill_text.py`, and chat cases in
`test_agent.py`, `test_signals.py`, `test_pipeline.py`, `test_livestatus.py`, `test_watch.py`; web
`test/deepSteps.test.tsx` and `test/liveLine.test.tsx`.
