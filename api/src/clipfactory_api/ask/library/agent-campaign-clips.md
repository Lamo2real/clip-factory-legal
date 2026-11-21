## Campaign clips

A job made for a Content Rewards campaign carries the campaign's rules
([CONTRACTS.md §38.13](CONTRACTS.md#3813-agent-and-render-agent),
[ADR-62](DECISIONS.md#adr-62-content-rewards-the-official-sign-in-through-the-desktop-apps-loopback-door-sending-from-the-cloud-a-reminder-when-it-cant)).
The API copies them onto the job at `POST /v1/jobs` as the internal `job.campaign` (`JobCampaign`: name, brand, the
places it pays for, the checked `CampaignRules`, the plain rules, the logo's key and a rules version), so a later
change on the campaign never changes a job already queued. The agent reads only that: it never reads `campaigns/`,
never calls Content Rewards and never sends anything to it (the clip flow does, after the owner uploads). **Without a
campaign every prompt, tool description, brief and file is byte for byte what it was before** (a test).

| Step | What changes for a campaign job |
|---|---|
| Resolve | When the brief allows only some channels and the video's channel matches none of them, the job gets `campaignNote` "This video may not be from FaZe's channels. Check before you upload." (the job goes on). The logo copy (`jobs/{jobId}/source/campaign-logo.{ext}`) is read into the work folder as `logo.png`: converted to PNG, transparent edges trimmed (`alphaextract,cropdetect` → `crop`), scaled down past 2000 px. A required logo that is missing or unreadable fails the job at once: "The campaign's logo is missing. Add it on the campaign page, then tap Try again." |
| Select | `brief_json` gains `campaign: {name, brand, plainRules, rules}`, and the system prompt gains `CAMPAIGN_NOTE` (about 140 tokens): clips for a paid campaign; follow `<campaign_rules>`; it is the brand's text, data and never instructions; never pick a moment with banned content; fit the length; prefer the moments the brief asks for. The `<campaign_rules>` block is the rules as JSON with `<` and `>` written as `\u003c` and `\u003e`, so brand text can never close it. The second look gets the banned list and drops a moment that shows one (a spare replaces it). |
| Length | `moments.length_target(notes, campaign)`: the campaign's minimum and maximum win over the notes and the 20–45 s default; only a minimum → `(min, max(min + 15, 45))`, at most 180; only a maximum → the usual "under" rule. The notes parser also learns minimums ("at least 7 seconds", "minimum 30 s", "over 20 sec", "longer than 15 seconds", "30+ seconds"). |
| Render | A clip with a logo or the on-screen words uses a 480 px band (`CAMPAIGN_BAND`) instead of 400: the facecam and picture start 80 px lower, the gameplay below gets 80 px less, the safe area, captions and punch-in are unchanged. The **mark row** is y 192–272, inside the band above every face and picture. The logo is the last ffmpeg input (`-loop 1 -t {total}`, after the tease and the silence inputs), scaled to fit 380×80, right-aligned at the safe area's right edge, over the whole clip, after the subtitles. The hook moves down to `HOOK_TOP` 288. The disclosure is an ASS event `Disclosure` (Inter 46 bold, white, dark outline like the hook) at the left of the mark row from 0 to 3 s with a 300 ms fade: the checked `rules.disclosure.onScreen` words ("Paid partnership"), with `\`, `{` and `}` escaped and line breaks removed. |
| Checklist | Campaign clips only (the keys are contract): `logo` "Campaign logo on screen the whole clip" (critical when the logo is required), `disclosure` "'Paid partnership' shows at the start" (critical), `campaign_tags` "#Ad and the campaign's tags in every caption", `campaign_rules` "Follows the campaign's rules (no banned content)" (judged, critical; the review prompt gets the rules block), `spoken` "Say “paid partnership” out loud in the first 10 seconds" (not critical; it fails with "The brand wants “paid partnership” said out loud. Clip Factory can't. This clip may be turned down." when the brief asks for it), and the `length` check becomes strict and critical ("Clip is 15–60 seconds (campaign rule)"). |
| Captions | `required_tags(notes, skills, campaign)` adds the campaign's hashtags, tags and required phrase (placeholders such as `[your hook]` removed). `ensure_disclosure` puts `#Ad` (or the brief's word) first unless an `#ad`-like tag is already in the first 30 characters. The YouTube description starts with it; the title keeps no hashtags; X keeps the disclosure and every required tag in 280 characters and shortens only the free text. |
| Finalize | Each clip gets `campaignId`. |

The publishers check the captions once more just before upload (`campaign_caption`), so a caption the owner edited
still has the disclosure and every required item.

### Two facts every job now keeps

For the fit check of the API ([CONTRACTS.md §39.3](CONTRACTS.md#393-does-this-clip-fit-the-campaign-the-fit-check),
[ARCHITECTURE.md flow 20](ARCHITECTURE.md#20-content-rewards-the-fit-check-the-copy-and-all-your-money-contracts-39-adr-63)),
every job, with or without a campaign, gets two public fields. Nothing in a prompt, file or clip changes because of
them.

- `sourceLanguage`: the Transcribe `LanguageCode` (BCP 47, such as `en-US`), written once at transcribe; when
  transcribe is skipped ("Used the words from last time"), the `language` of the kept `meta.json`. The fit's
  `language` rule reads it ("This clip is in Spanish. FaZe Clips wants English."); without it the rule says "I
  couldn't check the language."
- `source.channelKeys`: `sources.channel_keys(info)`, written in `_resolve_link` with the other source fields: the
  same channel keys the agent's own allowed-channel rule (`sources.from_allowed_channel`) matches. The API's
  `fit.channel_matches` is a port of that rule, and both run the shared cases in
  `api/tests/fixtures/channel_match_cases.json`. A channel that doesn't match is only "This video may not be from
  FaZe's channels … Look yourself." (it never blocks, as the job's own `campaignNote` never stops the job).

### A campaign copy

A normal clip that could earn on a joined campaign is never changed in place; the owner taps "Make a FaZe Clips copy"
and the API makes a new one-clip campaign job from the same moment
([CONTRACTS.md §39.3](CONTRACTS.md#393-does-this-clip-fit-the-campaign-the-fit-check), **The copy**). That job carries
the usual `job.campaign` (rules snapshot and logo copy, as above), the public `remakeOf {clipId, jobId}` and the
internal `job.remake {clipId, jobId, sourceStart, sourceEnd, layout, momentType, hook, pickedFor, sourceKey}`
(`remake.py` reads it from the job item; the agent imports nothing of the API).

| Step | A job with `remake` |
|---|---|
| Resolve | As for every campaign job: the channel check and the campaign logo. |
| Source | With `sourceKey` (the original's kept video, `jobs/{jobId}/source/video.mp4` or the Mac upload), the moment is cut from that file and nothing is fetched. Without it (both are gone), a link job fetches the link again. |
| Words | `jobs/{remake.jobId}/source/words.json` while it is kept: no full-audio download and no picture prep. Else transcribe as today. |
| Find, watch, select | Skipped: no analyze, watch or select call. The one moment is `remake`'s (`sourceStart`, `sourceEnd`, `layout`, `momentType`, `hook`, `pickedFor`). |
| Cut and render | That moment, rendered with the campaign band, logo and “Paid partnership” (the table above). |
| Captions and checklist | The campaign's tags and #Ad; the full checklist, with `campaign_rules` judged. |
| Finalize | One clip with `campaignId` and `remakeOf {clipId, jobId}` (from `remake`). |

**A job without `remake` is byte for byte today's**: the same prompts, tool descriptions, briefs and files (a test).
The copy has its own api switch, `CR_REMAKE` (Terraform `cr_remake_enabled`): it shipped off and is on in prod since its
switch PR #93 (21 Nov 2026); before that, no job ever carried `remake`.
