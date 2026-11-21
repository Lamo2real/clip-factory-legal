# Business requirements

Source: the owner's brief for Clip Factory Cloud (November 2026) and the owner's follow-up after the first build
(Get the app, the update bar, the desktop app and kid-proof design: BR-15 to BR-17, NFR-11, NFR-12, UX-12, UX-13), and
the owner's request for a fully serverless Python and Terraform stack with WebSockets, a REST API, durable functions
and S3 Vectors (NFR-02 AC3 and AC4, NFR-13 to NFR-16, BR-11 AC5, BR-18), and the owner's request to organise
Settings like a field of apple trees and to choose the click and error sounds (BR-13 AC3 to AC5, UX-09 update, UX-14,
UX-15), and the owner's request to see how every clip performs on each platform, refresh those numbers by itself
and pick the best clips of each week (BR-19 to BR-21, NFR-17, UX-16), the owner's request for one kid-proof setup per
platform so the app can post to all five (BR-09 AC3, BR-10 AC3 to AC5, BR-23, UX-17), and the owner's request to
create, read, change and delete skills in Settings and to have every AI call use every skill (BR-05 and BR-06 update,
BR-22), and the owner's request for an in-app helper that answers questions and shows the way, built on the in-app
assistant pattern and using the skills (BR-24, NFR-18, UX-18), and the owner's request to join Content Rewards
campaigns by pasting their link and have every clip follow the campaign's rules, kid-proof from setup to getting paid
(BR-25, NFR-19, UX-19), and his follow-up the same day: Connect in time order, a pleasant choice between campaign clips
and normal clips, all his money from every place in one view, and knowing before an upload whether a clip can earn on
a campaign (BR-25 update, BR-26 to BR-28, NFR-19 AC8 to AC10, UX-19 AC8 to AC10).
Every requirement below traces back to one of them. Where
the brief was open or unclear, the interpretation we chose is stated in [Interpretations and open questions](#interpretations-and-open-questions).

Numbering:
- **BR-xx** functional (what the product does)
- **NFR-xx** non-functional (how it runs: cloud, reliability, security, delivery)
- **UX-xx** design and experience

Each requirement has acceptance criteria (AC). A requirement is done when every AC holds. The technical detail lives
in [CONTRACTS.md](CONTRACTS.md); this file says *what* and *why*.

---

## Functional requirements

### BR-01 Add a video by link
The owner can start a job by pasting a link to a YouTube video, a YouTube stream (live or past), a Twitch VOD or a
Kick VOD.
- AC1: The New job screen accepts `youtube.com`, `youtu.be`, `twitch.tv` and `kick.com` links and shows the detected platform before starting.
- AC2: Any other link is refused with a plain message, before a job is created.
- AC3: `POST /v1/jobs` with `{ "source": { "type": "link", "url" } }` returns `201` and a job in `queued`.

### BR-02 Add a video by upload
The owner can upload a video file instead of a link ("I need to be able to upload").
- AC1: Files up to 5 GB of any `video/*` type can be uploaded from phone or desktop.
- AC2: The upload goes straight to S3 with a presigned URL (no file passes through a Lambda) and shows progress.
- AC3: A finished upload can be turned into a job (`source.type = "upload"`).

### BR-03 Cloud agent cuts the clips
An AI agent on Amazon Bedrock AgentCore, running Claude Fable 5.1, processes each job in the cloud.
- AC1: The agent runs on AgentCore Runtime (`cf_prod_clip_agent`) and calls Claude Fable 5.1 through Amazon Bedrock.
- AC2: The job runs without the owner's computer being on.
- AC3: The job goes through the steps resolve, download, transcribe, analyze, select, render, checklist, captions,
  finalize, and the app shows each step's status live (pushed over the WebSocket API within seconds, NFR-13; polling
  only while disconnected).

### BR-04 Between 5 and 10 viral clips per job
- AC1: Each finished job has between `clipMin` and `clipMax` clips (defaults 5 and 10; the owner can change both
  in Settings, within 1–10). The agent chooses how many within the range from what the source offers.
- AC2: When the source cannot give the minimum (for example a short video), the job still finishes with what it found
  and says so plainly.
- AC3: Each clip carries a moment type (rage, chaos, interaction, no-way, first reaction, hot take), a score from 1 to 10
  and a one-line reason.

### BR-05 Clips follow best practice from the owner's skills
"Clip them up into viral segments with the best practices based on the skill that I'm going to give you."
- AC1: Every clip is vertical 1080×1920, 20–45 seconds unless a skill says otherwise, with a 6–8 word text hook,
  burned-in captions and a cover image.
- AC2: Each clip runs the pre-post checklist from the skills (section D of the built-in playbook) and shows
  every item as pass or fail. A failing clip gets one fix pass or is replaced by a spare moment.
- AC3: Each clip has a caption for every platform: YouTube title and description, Instagram, Facebook, TikTok and X.

### BR-06 Skills in Settings: add, read, change, delete
"I should be able to attach skills in the settings of this application." Updated by the owner on 2026-11-16: "I want
to be able to create, read, update, delete skills in Settings, following the trees, branches, apples, leaves
structure." ([CONTRACTS.md §18](CONTRACTS.md#18-skills-full-create-read-update-delete-every-ai-call-uses-every-skill-owner-request-2026-11-16),
[the skill pages](UX_DESIGN_SYSTEM.md#skill-pages))
- AC1: **Create.** In Settings › Clip making › Skills the owner can **write** a skill by answering three questions
  ("What is the skill called?", "When should Clip Factory use it?", "What should it do?"), or **upload** a `SKILL.md`
  (≤ 1 MB) or a `.zip` that contains one `SKILL.md` (≤ 20 MB). Two skills cannot have the same name; the app says so
  under the first question.
- AC2: **Read.** Every skill (built-in and the owner's) is listed with its title, when it is used, an **Always used**
  badge, a **Built in** badge where it applies, its size and the date it last changed. Tapping a skill opens its own
  page, which shows the whole skill as formatted text (and, for a `.zip`, the other files in it). Nothing in a skill
  can run code in the app.
- AC3: **Update.** The owner can change any of their own skills with the same three questions, or replace its whole
  file with a new upload. If the skill was changed somewhere else in the meantime, the app says so and offers "Use the
  newest" or "Save mine anyway". Leaving with unsaved changes asks first.
- AC4: **Delete.** The owner can delete any of their own skills: a small confirm sheet, then the usual 8-second
  **Undo** toast; nothing is deleted until the toast ends.
- AC5: **Built-in skills** can be read but never changed or deleted, and are always used.
- AC6: **No on/off switch.** Every skill in the list is always used (BR-22). The old switch is gone.
- AC7: **Trees, branches, apples, leaves** (UX-14): the Skills branch has two apples, **Your skills** and **Add a
  skill**, each with a leaf; writing, reading and editing a skill each have their own address under the branch, with a
  breadcrumb, a big Back on phones, and deep links and reloads that work.
- AC8: A change counts from the next AI call that loads skills (for a clip job, the next job); nothing is redeployed.

### BR-07 Review clips in the app
"Send me those clips in the app. So the app will showcase the clips."
- AC1: A Review screen lists every clip waiting for a decision, newest job first, with a badge count in the navigation.
- AC2: Each clip plays in place (vertical player), and shows its hook, moment type, score, source timestamp (with a
  link to that point in the source when there is one), checklist and captions.
- AC3: Captions can be edited before confirming.

### BR-08 Confirm each clip before anything is posted
"If I click confirm on each video, then you will upload each video to those social media accounts."
- AC1: Nothing is ever posted without the owner pressing **Confirm** on that clip.
- AC2: Confirm creates one post per enabled platform and queues it for publishing.
- AC3: **Decline** removes the clip and deletes its video files. It is offered with an 8-second Undo first (UX-13 AC7);
  the request is sent only when the Undo window passes.
- AC4: Confirm and Decline (once its Undo window has passed) are final for that clip and each shows clear feedback.

### BR-09 Publish confirmed clips to the connected accounts (phase 2)
Upload to X, Meta (Facebook and Instagram) and YouTube; TikTok is added because the existing Clip Factory and its
legal pages already cover it.
- AC1 (phase 1): Confirmed posts are stored with status `pending_integration` and the app says "Waiting for the account connection".
- AC1b: A waiting post goes out once its account is connected (no tap needed), and the Library gives a place that is
  set up since its own **Post now** ([CONTRACTS.md §17.6, §33.6](CONTRACTS.md#176-tokens-and-real-posting)).
- AC2 (phase 2): A queued post is uploaded through the platform's official API and gets its public URL.
- AC3: Every upload is sent from Clip Factory as a file; a retried step never posts twice; when posting fails the clip
  says why in one sentence and what to press ([CONTRACTS.md §17.6](CONTRACTS.md#176-tokens-and-real-posting)).

### BR-10 Connect social accounts (phase 2)
"This is a process to connect the social media accounts, of course. But we're gonna hold off that for now."
- AC1 (phase 1): Settings › Posting › Accounts lists YouTube, Instagram, Facebook, TikTok and X as "Not connected"; the Connect
  button explains that connecting arrives in the next phase (`501 not_implemented`).
- AC2 (phase 2): Each platform connects through its official sign-in (OAuth), tokens are stored in AWS Secrets Manager.
- AC3: Settings › Posting › Set up posting replaces Accounts (the old address redirects); see BR-23.
- AC4: Connect opens the platform in the same tab and comes back with confetti and "Connected as …", or with one plain
  sentence saying what to redo. Meta accounts with several Pages or Instagram accounts get a picker.
- AC5: Disconnect shows an 8-second Undo and keeps the keys, so **Connect again** works later.

### BR-11 48-hour performance check feeding learnings
From "2 days after we've uploaded to the social media on the clips" (see interpretation I-01).
- AC1: When a clip is posted, its clip flow waits 48 hours (a durable wait that costs nothing while waiting) and then
  checks every post of that clip.
- AC2: The check stores views, likes, comments and shares on the post through the same stats refresh as BR-20, so it
  never goes over a platform's limit (phase 2 for real numbers).
- AC3: (Changed 2026-11-18, CONTRACTS.md §16.12.) Once a day Clip Factory freezes each post's day-7 views, finds the
  clips that did much better than that creator's normal on that platform and turns what they share into lessons;
  active lessons reach every job as "Prior learnings". The one-sentence 48-hour learning is retired.
- AC4: The Insights screen lists the learnings and the posts with their numbers.
- AC5: After the check the clip is remembered with its numbers in the learning memory (NFR-14), so later jobs and the
  review screens can find it.

### BR-12 Job control
- AC1: The owner can cancel a queued or running job.
- AC2: A failed or cancelled job can be retried from the beginning; an already downloaded source is reused.
- AC3: A job whose agent stops responding is picked back up on its own within about 6 minutes of its last heartbeat,
  from the moments and clips it already saved, at most twice; only then is it marked failed with "Making the clips
  stopped. Tap Try again to pick up where it left off." (job-flow callback heartbeat timeout, no scanning watchdog;
  CONTRACTS §30)

### BR-13 Settings
- AC1: Settings holds clip range, the longest source length to process (`maxSourceHours`, 1–12, default 6), sound
  on/off, the click sound and the error sound, reduce motion, the platforms to post to, skills, accounts and an
  optional YouTube `cookies.txt`.
- AC2: These settings are saved to the account (`PUT /v1/settings`), so they follow the owner across devices. The
  background picture is the one exception: it stays on the device (BR-14).
- AC3: Every setting has exactly one place in the Settings tree (UX-14,
  [CONTRACTS.md §15](CONTRACTS.md#15-settings-as-a-tree-and-choosing-your-click-sounds-owner-request-2026-11-16)):
  Clip making (Clips, Skills, YouTube help), Posting (Accounts, Where clips go), Look & feel (Sounds, Motion,
  Background), App & account (Get the app, Updates, Account).
- AC4: `clickSound` and `errorSound` are whole numbers from 1 to 30. `PUT /v1/settings` refuses anything else with a
  plain message (400). Settings saved before they existed read as the defaults, 6 and 5.
- AC5: The owner's picks are the defaults for everyone: click sound 6 "Water drop", error sound 5 "Nope nope nope".

### BR-14 Background of the owner's choice
From "I should be able to see the background of my phone image" (see interpretation I-02).
- AC1: The owner can pick a background image in Settings; the glass surfaces show it through them. The image stays
  on that device (it is a personal look, not account data).
- AC2: Without an image the app shows its own soft animated bottle-green backdrop with a vermilion glow and a bone highlight.

### BR-15 Get the app, matched to the device
Added after the first build ([CONTRACTS.md §12.1](CONTRACTS.md#121-get-the-app-sidebar-item-on-phones-a-card-in-settings-plus-a-one-time-banner-on-home)).
"When I use the app through the browser, there should be a feature in the sidebar to download it to the machine ...
it should basically recommend the operating system ... if it's a Mac, then it should be a DMG file ... if it's on
Windows ... an exe file."
- AC1: From 768 px up, the sidebar has a **Get the app** item. On phones it is the **Settings › App & account › Get the app**
  branch plus a one-time banner on Home (the phone tab bar keeps its five items).
- AC2: The app detects the device (Mac, Windows, Linux, ChromeOS, Android, iPhone or iPad) and shows **one** big button
  for it, in plain words:

  | Device | Main button | Second choice |
  |---|---|---|
  | Mac | "Download for Mac" → `/downloads/Clip-Factory.dmg` | "or install from this browser" |
  | Windows | "Download for Windows" → `/downloads/Clip-Factory-Setup.exe` | "or install from this browser" |
  | Linux, ChromeOS | Install from the browser (Linux also gets the `.AppImage` when one is listed) | – |
  | Android | "Install app" (the browser's own install prompt) | picture steps: menu ⋮ → Install app |
  | iPhone, iPad | three picture steps: Share icon → "Add to Home Screen" → Add (no download button) | in Chrome, Firefox and others: "Open this page in Safari first" |

- AC3: Which desktop files exist is read from `/downloads/manifest.json`. When the file for this device is missing,
  the card offers the browser install instead. A download button never leads to a missing file.
- AC4: The Mac and Windows cards show a one-line hint for the first open of an unsigned app (see NFR-11).
- AC5: The file size is shown next to the download button ("Download for Mac · 9 MB").

### BR-16 Never offer the app once it is installed
"Once you actually download it, then it should not show you that part of the application to install it again."
- AC1: Get the app (sidebar item, the Settings branch and Home banner) is hidden when the app runs installed: the browser
  reports `display-mode: standalone` or `window-controls-overlay`, iOS reports `navigator.standalone`, or the desktop
  app is detected (`window.__CF_DESKTOP__` or `ClipFactoryDesktop` in the user agent).
- AC2: After the browser's `appinstalled` event the device remembers it (`cf.installed=1`) and stops offering the app
  in that browser too.
- AC3: "Not now" on the Home banner hides it for 30 days on that device. The sidebar item and the Settings branch stay
  available until the app is installed. Once installed, the branch leaves the Settings tree and search; its old
  address says "You already have the app." with a Back button, so a saved link is never a dead end.

### BR-17 Update bar: what is new, and a Reload button
"For every single update that I make ... I should have a reload button in the bottom of the page ... And there should
be a brief word of the area where a new feature has been modified ... 'settings profile picture' or just 'profile picture'."
- AC1: Every deploy publishes `/version.json` with the version, the build time and up to three **area labels**.
- AC2: The app compares that version with its own on start, every 5 minutes, when it comes back to the screen, and
  when the service worker finds a new version. When they differ, a glass bar slides up at the bottom of the page
  (above the phone tab bar), in the browser and in installed apps alike.
- AC3: The bar shows a sparkle, the area labels as small pills (for example `Settings · Profile picture`) and a vermilion
  **Reload** button. No sentences, no version numbers, no technical words.
- AC4: Each label is 1–3 words; there are at most 3. They come from the `Area:` lines in the commits since the last
  deploy, else from the folders that changed, else "Improvements"; the very first deploy says "First release"
  ([GIT_WORKFLOW.md](GIT_WORKFLOW.md#area-lines-what-the-update-bar-says)).
- AC5: "Later" hides the bar until the next check.

### BR-18 "Like clips that did well" while reviewing
- AC1: Review and Library show, under a clip, up to 5 of the owner's own clips that were posted and measured and are
  most like it, each with cover, hook and views.
- AC2: The strip is hidden when there are none (today, until posting exists) and never shows an error.
- AC3: A clip thrown away is removed from this memory.

### BR-19 See how a clip did on each platform
"I will see which ones get most views and how many views they get and what the status is from each social media
platform ... so that I can click on any video and see how they performed for each social media platform."
([CONTRACTS.md §16](CONTRACTS.md#16-clip-performance-stats-refresh-and-weekly-best-owner-request-2026-11-16),
[the page](UX_DESIGN_SYSTEM.md#clip-performance-page))
- AC1: Tapping any clip in Library opens its performance page at `/clips/{clipId}`. On Review, a kept clip's card
  shows "See how it does", which opens the same page. Back returns to where the owner came from (else Library).
- AC2: The page always shows five platform stacks, in this order: YouTube, TikTok, Instagram, Facebook, X. Each stack
  shows its status in plain words: Posted, Posted privately, Waiting for connection, Posting, Failed or Not posted.
- AC3: Each stack shows only the numbers that platform really gives (YouTube: views, likes, comments, and daily
  insights such as watch time; TikTok: views, likes, comments, shares; Instagram: likes, comments, and views, reach,
  saves and watch time that can take 2 days; Facebook: plays, reactions, watch time; X: video views, impressions,
  likes, reposts, replies, bookmarks). A number the platform did not return is left out, never shown as 0.
- AC4: The top of the page shows the total views across platforms with the note "(each app counts views its own
  way)", and the platform with the most views carries a crown.
- AC5: Each stack shows when its numbers were last checked ("Updated 3 min ago"), a small views-over-time line once
  there are two or more readings, and an "Open on {Platform}" link to the post.
- AC6: A stack with no numbers is calm, never red (except Failed), and says what to do: connect the account, turn the
  platform on, wait, or press Try again on Review.
- AC7: A clip still in review, a thrown-away clip, or another owner's clip gives "This clip has no numbers yet. Keep it
  first." with a way back.

### BR-20 Numbers that refresh by themselves, and a Refresh button
"The stats on the video for each social media platform should be a API call where I can just refresh it. But also, it
should do it every 15 minutes or 30 minutes. Or whatever the lowest limit is for each API."
([ADR-29](DECISIONS.md#adr-29-stats-refresh-intervals-per-platform),
[ADR-30](DECISIONS.md#adr-30-one-eventbridge-rule-and-a-due-queue-for-stats-polling))
- AC1: Every posted post is checked automatically: YouTube, TikTok and X every 15 minutes, Instagram and Facebook every
  30 minutes, for the first 48 hours; then every 30 / 60 minutes up to 7 days and every 2 / 6 hours up to 30 days;
  then one final reading. The intervals live in one file, `config/platforms.json`.
- AC2: YouTube's slower insights (watch time, engaged views, shares, new subscribers) are read at most every 6 hours,
  because YouTube needs 2–3 days to process them.
- AC3: The page has one vermilion **Refresh numbers** button that asks every platform at once
  (`POST /v1/clips/{clipId}/stats/refresh`). New numbers appear on screen by themselves within seconds (WebSocket), and
  the button spins while they are on the way.
- AC4: A refresh never goes over a platform's limit: a platform checked moments ago answers "Next check in 4 min";
  a platform that is resting after a limit answers when it can be asked again. When every platform has to wait, the
  button reads "Next check in … min" and a tap plays the error sound with a toast saying when.
- AC5: Instagram and Facebook results carry "{Platform} numbers can take up to 2 days to settle."
- AC6: While the page is open and the live connection is down, it refetches every 60 seconds.

### BR-21 Pick the best clips of each week, so the next clips are cut better
"I should be able to select the ones for the week. So each week, I will select the ones that perform best during
that week, so that it knows how to edit better in the future."
([ADR-31](DECISIONS.md#adr-31-the-weekly-best-is-an-explicit-owner-signal), [AGENT.md](AGENT.md#best-of-the-week))
- AC1: Library has two tabs, "All clips" and "This week". This week lists the week's kept clips sorted by total views,
  each with its cover, hook, views per platform and a big **Best this week** star (≥ 48 px).
- AC2: ‹ and › arrows move between weeks (› is off on the current week). A week runs Monday to Sunday in the owner's
  own time zone; a clip belongs to the week of its first post (or, if not posted yet, the week it was kept).
- AC3: Starring and unstarring is instant and saved once, 800 ms after the last tap, with "Saved. Clip Factory will
  learn from your picks." Up to 10 picks a week. The star on the clip's performance page is the same choice.
- AC4: After a save, Claude Fable 5.1 compares the picks with the rest of that week (hooks, moment types, length,
  captions, numbers) and writes one short "Best of week" learning; the page shows "Learning from your picks…" and then
  the learning itself. If it cannot, it says "Could not learn this time. Change a pick to try again."
- AC5: The agent reads the latest 4 "Best of week" learnings first, before the other learnings, and the starred clips
  come first in "What worked before", labelled "Owner's pick: best of the week".
- AC6: Unstarring everything in a week removes that week's learning and the clips' "best" mark. Changing picks again
  replaces the learning; an older save never overwrites a newer one.
- AC7: An empty week says "No clips this week yet. Make clips on Home." with a link.

### BR-22 Every AI call uses every skill
"The whole AI system should use all of these skills by default, no matter what, as long as I add them: whatever AI
service we use (Bedrock, AgentCore, whatever), when it is generating stuff or reading stuff."
([CONTRACTS.md §18.6](CONTRACTS.md#186-every-ai-call-uses-every-skill-one-shared-rule),
[ADR-32](DECISIONS.md#adr-32-every-ai-call-gets-every-skill-through-one-shared-skills-block))
- AC1: Every call that asks Claude to write, pick, judge, describe or read something gets **every** skill: the
  built-in ones and every skill the owner added. That covers the clip agent on AgentCore (moment picking with the
  Claude Agent SDK and its Bedrock fallback, the facecam check, the checklist with its hook rewrite, the captions) and
  the API's Bedrock calls (the daily creator lessons, the weekly best learning and Ask Clip Factory's optional rewrite,
  [BR-24](#br-24-ask-clip-factory-answers-that-take-you-there)).
- AC2: There is no way to switch a skill off, and no call may skip the skills: a test in each code package fails the
  build if a model call does not go through the shared helpers that add them.
- AC3: The skills always come first in the instructions, in the same order (built-in ones, then the owner's by name),
  so every call sees the same thing.
- AC4: If the skills together are too long for one call, each is kept up to 40,000 characters and all together up to
  120,000; a skill that does not fit is shortened or, if too little room is left, left out and named in the logs.
  Built-in skills are never left out.
- AC5: A skill that cannot be read is retried, then skipped and reported (the job step says "1 skill could not be read");
  if the list of skills itself cannot be read, the step fails and retries instead of running without skills.
- AC6: Turning text into search vectors (Titan embeddings) is not writing or reading by Claude, so it does not get
  skills.

### BR-23 A setup list: one setup per platform, so Clip Factory can post everywhere
"Facebook, Instagram, YouTube, TikTok, and X should all be a step to connect to in order for this automation to work
… The steps to set up YouTube should be up to date to today … The user shouldn't have to write code … Even an
8-year-old should be able to do it." ([the steps](SETUP_POSTING.md),
[CONTRACTS.md §17](CONTRACTS.md#17-posting-setup-a-setup-list-per-platform-real-connect-real-posting-owner-request-2026-11-16))
- AC1: Settings › Posting › Set up posting lists the five platforms in the order YouTube, TikTok, Instagram, Facebook,
  X, with a ring "n of 5 ready" and one line per platform ("Ready", "Step 7 of 23", "Needs you: connect again", "Not
  started", "Works now, posts stay private").
- AC2: Each platform's page has four parts (Get ready, Make your {Platform} key, Connect, Go public) of big numbered
  steps, with everything the platform requires as of the "Steps checked on" date (16 Nov 2026), including the
  developer account, app, permissions, return address, review or audit, and what each costs.
- AC3: No code and no typing of values: every value has a Copy button, every page an Open button, every key a paste
  box that checks its format; uncertain screens get an "If you see…" hint.
- AC4: The app remembers ticked steps and reopens at the first unfinished one, on any device.
- AC5: The limits are said plainly before the owner starts: TikTok posts may stay "Only me", Facebook Reels may be
  visible only to the owner until the app is Live, X costs about $0.015 per post (stopped at $10 a month).
- AC6: A floating "Set up posting" to-do list (top right on every signed-in page: an open list on wide screens, a
  pill that opens it on smaller ones) shows until every platform is ready or skipped and confirmed; then it celebrates
  and goes away, and comes back if a platform needs the owner again. Any platform that is not ready can be skipped.
  Settings › Posting › Set up posting always lists every platform, each with **Skip** or, once skipped, **Un-skip**
  ([CONTRACTS.md §17.13](CONTRACTS.md#1713-the-floating-setup-to-do-list-owner-request-2026-11-16)).
- AC7: [SETUP_POSTING.md](SETUP_POSTING.md) has the same steps, numbers and titles as the app, checked by a test.

### BR-24 Ask Clip Factory: answers that take you there
The owner asked for the in-app assistant pattern, "tailored towards the Clip Factory app's use case", applied to the
whole application, and for every AI call to use the skills.
([CONTRACTS.md §19](CONTRACTS.md#19-ask-clip-factory-grounded-in-app-help-assistant-owner-request-2026-11-16),
[HELP_ASSISTANT.md](HELP_ASSISTANT.md))
- AC1: Every signed-in page has an **Ask** launcher that opens **Ask Clip Factory**. It answers how-to and where-is
  questions about every screen and every setting of the app.
- AC2: Each answer is one or two short sentences, at most 6 numbered steps using the app's own button names in bold,
  and up to two buttons that open the right page and light up the right control.
- AC3: These questions are answered correctly: "How do I make clips from a Twitch link?", "Where do I change my click
  sound?", "Why is my clip private on TikTok?", "How do I connect Instagram?", "How many views did my best clip get
  this week?", "How do I add a skill?", "What does Keep do?", "What does Upload do?", plus the rest of the shared eval file (at least 44).
- AC4: Numbers in an answer (views this week, clips waiting, jobs running) are the owner's real numbers, read by the
  app with the owner's own sign-in; if a number cannot be read, the answer says so and offers the page that shows it.
- AC5: A question it cannot answer gets "I don't know that one yet. Try other words, or pick a question below." and
  three suggestions; it never invents a page, button, setting, price or number.
- AC6: Questions about passwords, keys, the cookie file's contents, other people's accounts or clips, or Clip
  Factory's own servers get "I can't help with that. I only know how to use Clip Factory."
- AC7: Answers work without the AI model: when the model is off, over its cap, slow or failing, the owner still gets
  a complete answer and never sees a model error. When the API cannot be reached, the app answers from its own copy
  of the knowledge.
- AC8: When the model is used, it gets every skill first, like every AI call ([BR-22](#br-22-every-ai-call-uses-every-skill)),
  followed by the rules that keep it to the facts, so its tone and clip advice follow the skills. If the skills cannot
  be read, the model is not asked and the plain answer is shown.
- AC9: Follow-ups work: "and the error sound?" after asking about the click sound answers about the error sound.
- AC10: The knowledge is built from the app's code on every build, so a renamed button or a new setting is in the
  answers after the next deploy; CI fails when the committed knowledge is out of date.
- AC11: Mac and Windows download steps appear only on desktops without the app installed, iPhone steps only on iOS,
  Android steps only on Android.

### BR-25 Content Rewards campaigns: paste the link, Clip Factory follows the rules
"Browse Content Rewards, join a campaign there, then paste the campaign URL into Clip Factory. Clip Factory should
then onboard onto that campaign and follow its rules and guardrails (required hashtags, logos/watermarks, captions,
tags, length, platforms, posting rules) so the videos qualify to earn money. It should connect just like we have
created for all the social media platforms. The whole flow should take 3 steps, 5 at most." … "make sure that
whatever steps i need to take for both the setup and creating and joining a campaign to checking if I am confirmed
as a member of the campaign and get paid for it, is all idiot proof, even an 8 year old should be able to understand
how to navigate it". ([the steps](SETUP_POSTING.md#content-rewards),
[CONTRACTS.md §38](CONTRACTS.md#38-content-rewards-campaigns-owner-request-2026-11-21),
[ADR-62](DECISIONS.md#adr-62-content-rewards-the-official-sign-in-through-the-desktop-apps-loopback-door-sending-from-the-cloud-a-reminder-when-it-cant))
- AC1: Settings › Posting › Set up posting shows a separate **Content Rewards** card under the five platforms ("Get
  paid by brands"), with a ring over 3 numbered steps and one state line. It never counts in "n of 5 ready" and is
  never in the floating setup list, which keeps exactly five rows.
- AC2: Setup is **3 steps**, in time order: make a Content Rewards account (or tap "I have an account"), add the same
  accounts inside Content Rewards (or tap "I added them"), then "Connect Content Rewards" in the Mac app and allow it
  (BR-26 AC4). Only if Content Rewards says the account can't connect
  apps, one more: "Open email" sends a ready email. If Content Rewards lets Clip Factory look but not send (read
  only), Clip Factory reads campaigns and money and reminds the owner after each post. If it refuses the sign-in,
  there is no connection: the owner checks each campaign himself ("It says Submit clip", paste the rules) and sends
  each clip by hand, and the Money part waits for Connect. Every 3 days (at most 5 times) Clip Factory asks him to try
  Connect again.
- AC3: Each campaign is **3 steps**, **5 at most**: join it on Content Rewards (**Join Campaign**, or **Apply** →
  **Submit application**), copy its link (share icon → **Copy campaign link**), then "Paste" and "Add campaign" in
  Clip Factory (on Home or the Campaigns page). The extras are "Add the logo" when the brief needs one, and either
  "Yes, I applied" (optional) or, only while Content Rewards doesn't let Clip Factory look, "I'm in. Read these rules".
- AC4: Clip Factory shows the campaign's pay as Content Rewards publishes it (per 1,000 views, per post, the money
  left), reads its rules from the brief ("Rules I'll follow", "Things you do", "I couldn't tell"), and finds out by
  itself whether the owner is in: every 15 minutes for 7 days, then every 6 hours to day 30, plus "Check now". "You're
  in!" comes with confetti and a notification, once.
- AC5: A campaign that can't earn says why and what to do in one sentence (paused, ended, the money almost gone, only
  TikTok, drafts first, its own sound, the brand's own picture on top of the video, a missing logo, too many clips
  waiting), and Make clips is refused; a warning (half the money used, a low rate, face on camera, a spoken
  disclosure, a viewer-country rule) is accepted with one "Make clips anyway".
- AC6: Each video is **3 steps** ("Make campaign clips" on the campaign's chip on Home, or "Make clips for this
  campaign" on its card; a "Videos from the campaign" chip or Paste; "Make campaign clips"). Every clip
  follows the rules: the campaign's length, no banned content, the logo on screen the whole clip (above the picture,
  away from faces and the game), "Paid partnership" on screen for the first 3 seconds, "#Ad" first and every required
  hashtag, tag and phrase in each caption (put back at upload if the owner deleted one). A video outside the brief's
  allowed channels gets a warning on the job.
- AC7: Each clip is **2 taps** ("Use my settings", "Upload to N"), also with a tag or #Ad missing (the upload puts them
  back), plus "Turn on Branded content" only if he turned TikTok's switch off; a clip that can't earn can't go up this
  way (BR-28). Upload to offers only the places the campaign pays
  for that are set up and linked inside Content Rewards; campaign clips are public, never made for kids, and marked
  as paid (YouTube Paid promotion, X Paid partnership, TikTok Branded content by the owner's own tap). TikTok is left
  out until TikTok's audit, because private posts can't earn.
- AC8: After each post, Clip Factory sends the clip to Content Rewards by itself within 30 minutes (0 steps), and its
  line shows Sending → Sent → Waiting for the brand → Approved or Not approved (with the brand's reason), the views
  and the money Content Rewards reports for it.
- AC9: When it can't send, the owner gets "Send this to Content Rewards now (N min left)"; the clip opens with one
  "Copy and open" and 4 numbered steps. A rejected clip has "Ask again" (copies true words, opens Content Rewards, 4
  steps); a brief that wants proof of views gets one reminder with 3 steps.
- AC10: Getting paid is **3 steps once** (answer "Do you see **Finance**?", link Whop, add the bank) and **2 each
  payout** (**Withdraw** on Content Rewards, **Withdraw** on Whop). The Money page shows only Content Rewards' own
  numbers (Still earning, On its way, Ready to move, paid so far), never a rate × views guess, and celebrates the first
  money once. Its paid money of the last 30 days is also in the total of "All your money" (BR-27), never in the MRR
  cards.
- AC11: [SETUP_POSTING.md](SETUP_POSTING.md#content-rewards) has the same step titles as the app, with the date they
  were checked (21 Nov 2026) and the sources; a test checks the titles.
- AC12: Nothing about the five platforms changes when no campaign is involved, and removing a campaign or
  disconnecting deletes nothing on Content Rewards or any platform.

### BR-26 Normal clips or campaign clips: two clear ways, the normal way unchanged
"please double check that the steps to conect to contentrewards is extremely easy and simple and set up in. a
chronological and structured manner so the UX is better and the user has a better and pleasant experience on the app
using eaither the content rewards way of videos or normal way we have done so far". ([CONTRACTS.md
§39.1](CONTRACTS.md#391-connect-in-time-order-and-the-two-ways),
[ADR-63](DECISIONS.md#adr-63-content-rewards-follow-ups-one-fit-check-in-the-api-a-new-copy-instead-of-turning-a-normal-clip-into-a-campaign-clip-one-30-day-total-that-includes-content-rewards),
[UX_DESIGN_SYSTEM.md](UX_DESIGN_SYSTEM.md#the-two-ways))
- AC1: **The normal way is frozen.** Home at `/` keeps exactly the form it had before Content Rewards (Paste a link or
  Pick a video, the link box with Paste and Clear, How many clips, Notes, "Make clips", "Nothing gets posted until you
  tap Upload."), with no campaign field, bar, chip, line or warning, whatever campaigns exist. From a link to an
  upload is **5 taps** (Paste, "Make clips", "Go to Review", "Use my settings", "Upload to N"). The Review card of a
  clip with no campaign keeps its controls; the only addition is the optional "could earn" line of BR-28 AC5, which
  never blocks and never adds a needed tap. A click-count test fails if the normal way gains a tap, a field or a
  warning.
- AC2: **The campaign way always starts from a campaign**: the chip "Make campaign clips" in Home's "Your campaigns"
  row (one tap to Home at `/?campaign=`), the campaign card's "Make clips for this campaign", a campaign video's "Make
  clips from this", or the fit's "Make new clips for this campaign". Home then shows "Campaign clips · {name}", "Clip
  Factory follows its N rules on every clip.", a quiet "Make normal clips instead", the campaign's own rule lines
  (which videos and which language it pays for), its videos, and the main button reads **"Make campaign clips"**, so
  he sees which way he is on as he taps. With two or more campaigns a pick-one bar "Which campaign" shows (no "None":
  leaving is "Make normal clips instead"). From the chip to an upload is **6 taps**.
- AC3: **One name for each thing**, on every screen, help guide and notification: "Make clips" and, only side by side
  with the other way, "normal clips"; "Make campaign clips" and "campaign clips"; "add" for putting a social account
  inside Content Rewards ("Add YouTube in Content Rewards first.", "I added it"); "Connect" only for Clip Factory and
  Content Rewards, and each platform's own setup; "Content Rewards", never "CR". Never on a screen: "mode", "the
  Content Rewards way", "compatible", "clip type", "upload type", "campaign type".
- AC4: **Connect in time order.** One page, three numbered steps, each something only the owner can do or knows: 1
  "Make a Content Rewards account" ("Open Content Rewards", with the green "I have an account" right under it), 2 "Add
  your accounts there" ("Open Content Rewards settings", with the green "I added them" right under it), 3 "Connect
  Content Rewards" on the Mac (allow it). While steps 1 and 2 are both open, a card on top asks "Already use Content
  Rewards, with YouTube added there?" with a green "Yes" that ticks both. Coming from a campaign, Money or the
  Campaigns page, the finished page's main button takes him back ("Back to FaZe Clips"). From a pasted campaign link
  with his account ready: **7 taps** on 5 screens; from zero: 10 Clip Factory taps (23 in all, with Content Rewards'
  and Google's own).

### BR-27 All your money in one place
"i also need to track how much i earn from all platforms including contentrewards". ([CONTRACTS.md
§39.2](CONTRACTS.md#392-all-your-money-in-one-place),
[ADR-63](DECISIONS.md#adr-63-content-rewards-follow-ups-one-fit-check-in-the-api-a-new-copy-instead-of-turning-a-normal-clip-into-a-campaign-clip-one-30-day-total-that-includes-content-rewards))
- AC1: The Money page opens with **All your money**: one row per place (YouTube, TikTok, Instagram, Facebook, X, then
  Content Rewards while it is switched on), one period for the whole card (the same 30 days as the Monthly card), and
  under the rows one **Total** per currency with the places in it and whose numbers they are ("YouTube's estimate +
  Content Rewards' numbers"). Different money, like dollars and euros, is never added together. The total is the
  biggest number on the page; with nothing to add it says "Nothing to add up yet." and shows no total, never $0.
- AC2: Only money a place reported: YouTube's estimate per day, Facebook's once it is checked (until then "Coming
  soon"), and Content Rewards' paid payouts dated in those days. TikTok, Instagram and X tell apps nothing about money,
  so their rows say "Not available from TikTok" and where to look in that app ("Look in TikTok: Profile, then
  Balance."), never a number and never $0. Nothing is calculated, guessed, converted or typed in; all arithmetic is on
  the server.
- AC3: The Content Rewards row also shows, in money's time order and only what Content Rewards reported: "Right now":
  Still earning, Ready to move to Whop, On its way to Whop; "Earned so far, since you started"; and "Paid out to your
  bank: not available from Content Rewards. Look on Whop: **Balances**."
- AC4: A place that isn't set up, needs his OK or must sign in again has one glass button to its own page; a setup
  page brings him back to Money when it's done.
- AC5: The Monthly, Weekly, Daily and Yearly cards keep their numbers and words, apps only. While the Content Rewards
  row is on All your money, the Monthly card says "Apps only. Content Rewards is in All your money." (its empty states
  too, when that row has a number). The Content Rewards part stays at the end of the page.

### BR-28 Does this clip fit the campaign? Know before uploading
"btw i would like to know if the content i upload is compati ble with the content rewards campaigns so i can get paid
instead of me selecting the content rewards way of uploading but arent compatible, so please make sure thats in place
as well". ([CONTRACTS.md §39.3](CONTRACTS.md#393-does-this-clip-fit-the-campaign-the-fit-check),
[ADR-63](DECISIONS.md#adr-63-content-rewards-follow-ups-one-fit-check-in-the-api-a-new-copy-instead-of-turning-a-normal-clip-into-a-campaign-clip-one-30-day-total-that-includes-content-rewards))
- AC1: Every campaign clip on Review, and on its own page while it waits, shows "Campaign clip · {name}" and one
  headline: "Can earn on {name}", "Almost ready for {name}", "{name} needs a copy of this clip", "One thing first for
  {name}", "Wait a little for {name}", "This clip can't earn on {name}" or "Check 2 things, then upload", then the
  reasons in one short sentence each, problems first, and one button for the next thing.
- AC2: The check covers, from what Clip Factory already stored (never a call to Content Rewards): the campaign's own
  state (ended, paused, held, the money gone, not joined), its deadline, the clip's length, the places it pays for and
  whether each is added inside Content Rewards, every required tag and #Ad, the paid switch per place, the logo,
  "Paid partnership" on the video, the source video and its channel, the language, banned content, rules Clip Factory
  can't check, an earlier normal post of the same clip, one campaign per clip, and how it will be sent.
- AC3: A campaign clip that can't earn can't go up the campaign way: Upload is off with the reason, and the server
  refuses it too (Upload, Try again, Post now). A held, paused or re-read campaign is "Wait a little" (Upload turns on
  by itself), never "can't earn". A campaign post waiting for a platform to come back waits for Post now, which checks
  again, instead of going up days later by itself.
- AC4: A missing tag or #Ad never blocks: the upload puts them back. "Fix it for me" (optional) puts them back on the
  card at once, with an 8-second Undo. TikTok's "Turn on Branded content" is the owner's own tap.
- AC5: A normal clip that could earn on a campaign he joined (same creator or an allowed video, and a copy can be made)
  gets one quiet line under Checks before posting: "This clip could earn money on {name}." with "Make a {name} copy"
  and "Not now". The copy (the campaign's logo, "Paid partnership" on the video and #Ad) arrives right below it on the
  same Review page in about 3 minutes and uploads in **3 taps**; the original stays as it is and keeps its own 2-tap
  upload. With no campaign nothing shows. The copy has its own switch: it shipped off and is on since PR #93, once
  the agent's part had shipped.
- AC6: Clip Factory never calls a rule it can't check a pass: it says "I couldn't check: …" and the owner can answer
  "I read them. They're OK" (kept on that device only, never needed to upload, never shown as a Clip Factory tick).
- AC7: Length, source video, language, banned content, the deadline and another campaign are never "fixed" on the
  clip: the button is "Make new clips for this campaign" (with the same link only when the video itself is fine) or
  "Find another campaign".

---

## Non-functional requirements

### NFR-01 Everything runs on AWS
- AC1: Web hosting, API, agent, storage, database, scheduling and sign-in are all AWS services in one account.
- AC2: The owner's computer is not needed for any step.

### NFR-02 Serverless architecture
- AC1: No EC2 instances, no always-on containers, no VPC, no servers to patch: CloudFront, S3 (web, media),
  S3 Vectors, Cognito, API Gateway (HTTP, WebSocket and REST APIs), Lambda (plain and durable functions), DynamoDB
  with Streams, SSM Parameter Store, one EventBridge rule (the stats tick, BR-20), AgentCore Runtime, Bedrock,
  Transcribe, CloudWatch and SNS.
- AC2: Idle cost is close to zero (pay per request and per stored byte). Services with a standing minimum charge are
  not deployed (OpenSearch Serverless, [ADR-25](DECISIONS.md#adr-25-s3-vectors-for-the-learning-memory-opensearch-not-deployed)).
- AC3: "The entire infrastructure should be serverless, meaning CloudFront, S3 buckets, DynamoDB, OpenSearch if we're
  using that, S3 vectors, API gateway, WebSockets, HTTP, REST API on those API gateways, and Lambda, and durable
  functions in Lambda." Each of these is used for a real job (OpenSearch is shown as an option, not deployed), see
  [ARCHITECTURE.md](ARCHITECTURE.md#services-and-why-each-one).
- AC4: All backend code is Python and all infrastructure is Terraform ([ADR-26](DECISIONS.md#adr-26-python-for-every-backend-terraform-for-every-resource-serverless-only)).

### NFR-03 Model: Claude Fable 5.1
- AC1: The agent and every Claude call use Claude Fable 5.1 through the global cross-region inference profile
  `global.anthropic.claude-fable-5-1`.
- AC2: The model id lives only in `config/models.json`.

### NFR-04 Infrastructure as code, set up completely
- AC1: Every AWS resource is defined in Terraform under `infra/`; nothing is created by hand except the OIDC deploy role.
- AC2: A first deploy into an empty account creates the whole system, including the owner's user.

### NFR-05 CI/CD
- AC1: Every push and pull request runs lint, type checks, tests and a Terraform validation (`ci.yml`).
- AC2: Every push to `main` deploys production (`deploy.yml`) through a GitHub OIDC role; no long-lived AWS keys.
- AC3: The owner supplies only `CF_DEPLOY_ROLE_ARN` (variable) and `CF_OWNER_EMAIL` (secret).

### NFR-06 Sign-in with Cognito, about once a month
"Make sure that the access token is refreshed every 15 minutes, but the refresh token should be refreshed every month."
- AC1: Access and ID tokens last 15 minutes and refresh silently.
- AC2: The refresh token lasts 30 days and is rotated on every refresh, so an owner who uses the app stays signed in.
- AC3: After 30 days without using the app, the owner signs in again.

### NFR-07 Robustness
- AC1: A failed step is shown with a plain reason and a Retry button.
- AC2: Stuck jobs are detected by the job flow's callback heartbeat timeout; publishing retries inside the clip flow
  and marks only the failing post `failed`; failed or timed-out durable executions raise an alarm.
- AC3: Data is protected by DynamoDB point-in-time recovery; clips are kept until declined.

### NFR-08 Git workflow
"Create features in separate feature branches ... merge them automatically ... delete the feature branches afterwards."
- AC1: Work lands through feature branches and pull requests into `main`.
- AC2: A pull request merges automatically once CI is green, without the owner's approval.
- AC3: The branch is deleted after the merge. See [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

### NFR-09 Documentation
- AC1: Business requirements, architecture, agent, design system, deployment, security, testing, decisions, roadmap and
  git workflow each have their own markdown file in `docs/`.
- AC2: A draw.io architecture diagram with native AWS icons lives at `docs/architecture/aws-architecture.drawio`,
  in the style of the owner's reference diagram.

### NFR-10 Keep the legal pages
- AC1: `index.html`, `privacy.html`, `terms.html`, `style.css` and `.nojekyll` stay at the repository root for GitHub Pages.

### NFR-11 Desktop app builds
The Mac and Windows downloads in BR-15 come from a thin desktop app ([CONTRACTS.md §12.3](CONTRACTS.md#123-desktop-wrapper-desktop-tauri-v2),
[ADR-18](DECISIONS.md#adr-18-a-thin-tauri-desktop-wrapper-not-electron)).
- AC1: The desktop app is a native window that opens the live web app (`app_url`); it bundles no copy of the screens,
  so every web deploy reaches it at once through the update bar (BR-17).
- AC2: Window title "Clip Factory", the app icon, minimum size 380 × 600, size and position remembered, outside links
  open in the normal browser.
- AC3: `deploy.yml` builds it on GitHub's macOS runner (one universal `.dmg` for Apple silicon and Intel) and Windows
  runner (an installer `.exe`), uploads both to `downloads/` in the web bucket and rewrites `downloads/manifest.json`.
- AC4: It is rebuilt only when `desktop/` or the app icon changes, or when a file is missing from the bucket.
- AC5: Builds are unsigned for now ([ADR-19](DECISIONS.md#adr-19-unsigned-desktop-builds-for-now)); the Get the app
  card tells the owner how to open them the first time. Signing is on the [roadmap](ROADMAP.md#later).
- AC6: A failed desktop build never breaks the web deploy; the previous files and manifest stay in place.

### NFR-12 Release labels without extra work
- AC1: The area labels in BR-17 are produced by `scripts/release-areas.sh` during the deploy, from commit `Area:`
  lines, then the folder map `web/areas.json`, with no manual release notes.
- AC2: `/version.json` and `/downloads/manifest.json` are never cached (by CloudFront or the service worker), so a new
  version is noticed within 5 minutes.

---

### NFR-13 Live updates
"API gateway, WebSockets."
- AC1: While the app is open and connected, a change to a job, clip, post, learning or week's picks appears on screen within about
  2 seconds of being written, without a refresh.
- AC2: Only the signed-in owner's own changes are sent, in the same shape as the HTTP API; internal fields never reach
  the browser.
- AC3: The connection is opened with the owner's access token, which is never written to any log.
- AC4: A dropped connection is invisible to the owner: the app reconnects by itself (1 s up to 30 s apart), refetches
  what is on screen, and polls while disconnected. No error message is shown for it.
- AC5: Without a live connection (mock mode, old config) the app works exactly as before with polling.

### NFR-14 Learning memory
"S3 vectors."
- AC1: Every clip the agent makes is stored as a vector of its text (moment type, hook, title, summary) with the
  owner's id, status, platforms and score band.
- AC2: Before choosing moments, the agent receives up to 8 of the owner's posted and measured clips most like the new
  source ("What worked before"), as advice, never as a rule.
- AC3: 48 hours after posting, the clip's memory is updated with its numbers.
- AC4: If the memory cannot be read or written, jobs and screens carry on without it.
- AC5: The memory has no standing cost (pay per request and per stored vector).
- AC6: Clips the owner starred as best of the week are marked `best` in the memory and are offered to the agent
  first (BR-21).

### NFR-15 Durable workflows
"Lambda, and durable functions in Lambda."
- AC1: The job workflow (start agent, wait, finish or fail) and the clip workflow (posts, publish, wait 48 hours,
  metrics, learning, memory) each run as one Lambda durable function, written in Python.
- AC2: Starting a workflow twice for the same job run or clip run never runs it twice.
- AC3: Waiting (for the agent, for 48 hours) uses no compute; no queue, schedule or scanning job is needed.
- AC4: A deploy never changes a workflow already in flight.

### NFR-16 Public webhook endpoint
- AC1: Platforms reach `{hooks_url}/hooks/{platform}` and `{hooks_url}/oauth/{platform}/callback` on a separate REST
  API, so the app's own API accepts only the owner's token.
- AC2: The endpoint is throttled (10 requests a second, burst 20), stores events for 14 days, and never logs query
  strings (OAuth codes).
- AC3: Meta and YouTube verification challenges are answered today; TikTok and X answer "not implemented" until phase 2.

### NFR-17 Stay inside every platform's limits and costs
"Whatever the lowest limit is for each API."
([CONTRACTS.md §16.4](CONTRACTS.md#164-configplatformsjson-read-by-terraform-and-by-the-code-copied-into-the-zip))
- AC1: The automatic refresh and the Refresh button share one budget per platform, kept in DynamoDB and reserved with
  one conditional write before every request, so two refreshes at once can never go over a limit together.
- AC2: YouTube: at most 7,000 of the 10,000 daily quota units are used for numbers (3,000 stay for uploads); a quota
  error pauses YouTube until the quota resets (08:00 UTC).
- AC3: TikTok: at most 300 requests a minute (the limit is 600); a "rate limit exceeded" answer pauses it for a minute.
- AC4: Instagram and Facebook: the `X-Business-Use-Case-Usage` header is read after every call; at 75 % of any
  counter, or on a throttle error (80002, 80001), the platform pauses for at least the time Meta gives, and a throttled
  call is never retried (retrying makes Meta's block longer).
- AC5: X: at most 1,000 requests per 15 minutes (the limit is 3,500), and an estimated spend cap of **$10 a month**;
  re-reading the same post on the same UTC day counts as free. At the cap, X pauses until the next month, and Settings ›
  Posting › Set up posting says so in one line.
- AC6: Batches use each platform's largest request size (YouTube 50 ids, TikTok 20, Instagram and Facebook 50, X 100).
- AC7: Only metrics the platforms still support are read: never Meta `impressions`, `plays`, `post_impressions_unique`
  or `total_video_impressions*`; X video views come from the video's own `view_count`, never from impressions.
- AC8: Platform tokens never reach DynamoDB, logs or responses; no request is made for a platform without a connected
  account (phase 1: no request at all).
- AC9: An expected failure (limits, a deleted post, an expired token) never stops the poller and never repeats in a
  tight loop: the post waits its normal interval and shows the reason in plain words.

---

### NFR-18 The help assistant is private, capped and easy to turn off
([CONTRACTS.md §19.6](CONTRACTS.md#196-api-in-cf-prod-api-file-apisrcclipfactory_apirouteshelppy-package-apisrcclipfactory_apihelp),
[ADR-38](DECISIONS.md#adr-38-bm25-over-vectors-for-help-and-the-model-is-optional),
[ADR-39](DECISIONS.md#adr-39-help-runs-in-cf-prod-api-with-claude-haiku-55-through-the-eu-profile))
- AC1: Questions and answers are never stored and never logged; each request logs one line with its request id and
  outcome only.
- AC2: The model is Claude Haiku 5.5 through the EU inference profile, so help questions are processed in EU Regions
  only. Its id lives only in `config/models.json`.
- AC3: At most 6 questions a minute and 60 an hour; at most 2,000 model answers per 30 days, after which answers come
  from search only. A rate-limited question is never retried automatically.
- AC4: A deploy flag (on in prod) and a kill switch that needs no deploy. When the switch is off, the launcher
  disappears and the app stops answering from its own copy too.
- AC5: Help runs inside `cf-prod-api` (two routes, same JWT); the HTTP API keeps its single proxy route; the only new
  permission is `bedrock:InvokeModel` on the EU profile and its six EU models.
- AC6: The model call has timeouts (3 s connect, 10 s read, no retry) and a deadline, so a slow model falls back to
  the plain answer instead of hanging; the browser gives up after 27 s and answers locally.
- AC7: The server reads the knowledge only from the app's own address (the meta tag in `index.html`, an `/assets/`
  path on the same origin), caches it 10 minutes and falls back to the copy bundled in the Lambda.
- AC8: The knowledge never contains keys, ids, emails or infrastructure words; a test fails if it does.
- AC9: A failing model raises an alarm (10 failures in an hour) to `cf-prod-alarms`.

### NFR-19 Content Rewards is safe, additive and switched on only when complete
([CONTRACTS.md §38.8–§38.16](CONTRACTS.md#38-content-rewards-campaigns-owner-request-2026-11-21),
[SECURITY.md](SECURITY.md#content-rewards-contracts-38), [DEPLOYMENT.md](DEPLOYMENT.md#content-rewards-contracts-38))
- AC1: Sign-in, membership, sending and money use only Content Rewards' official sign-in and tools (no browser
  automation). The public campaign data (its JSON, else the page's Open Graph line or a group page's campaign links)
  is read only when the owner acts, never on a schedule.
- AC2: The Content Rewards token lives only in Secrets Manager and is used only by the cloud; the browser never calls
  Content Rewards and the Mac app only passes a one-time code, once. The function that reads brand text has no
  secret access.
- AC3: Text from brands is data, never instructions: shown escaped, and every rule that reaches a caption, the video
  or a link is checked by code against the brief.
- AC4: A campaign post is tried right after it is live and never sent twice; the clip flow never fails because of
  Content Rewards.
- AC5: Only additive data (new sort keys, attributes, a media prefix, runtime secrets, one small Lambda); no table,
  pool, bucket or secret holding the owner's data is replaced, and the deploy's delete gate passes.
- AC6: Shipped switched off in prod (`content_rewards_enabled = false`) until every part had merged; the one-line
  switch PR #88 turned it on, so it is on now. Setting it back to `false` turns it off again.
- AC7: Money shows only what Content Rewards reports; a rate × views guess is never shown (a test checks).
- AC8: The fit check (BR-28) is one pure function on the server, worked out from stored items each time it is asked
  (never Content Rewards, the public campaign data or the network), and the same answer drives the Review card, the
  clip page, Upload, Try again, Post now and the copy. The web only re-checks the four things that change while he
  types or taps (tags, #Ad, the paid switch, the places).
- AC9: All your money (BR-27) is added up on the server; the web only formats. Content Rewards' paid money is kept by
  day; for an owner whose money was read before, a one-time scan fills it without ever changing the paid total.
- AC10: Additive only: new attributes on the job, clip and money items and one api setting (`CR_REMAKE`, from
  `cr_remake_enabled`; it shipped off and is on since PR #93); no new table, index, bucket, secret or Lambda, and
  nothing that holds the owner's data is replaced.

## Design and experience requirements

### UX-01 Colours
- AC1: Call-to-action buttons are vermilion `#E8392B`, every one of them (owner request 2026-11-18).
- AC2: The rest of the palette is bottle green `#0F372B` (the glass) and bone `#EFE7DA` (the words and the lines).

### UX-02 Liquid glass everywhere
"I want them to be liquid glassy so that you can almost see through the application."
- AC1: Every surface (cards, bars, sheets, dialogs, inputs) is translucent with backdrop blur and a light edge highlight;
  no solid panels.
- AC2: Text on glass meets WCAG AA contrast (4.5:1 for body text) on the default backdrop.
- AC3: Where `backdrop-filter` is not supported, surfaces fall back to a more opaque tint that stays readable.

### UX-03 Layout inspired by the reference site
"Take inspiration from that, how it's all placed and in a cohesive manner."
- AC1: Large serif italic headline on a green hero card, pill buttons, cards in a row, a stat block.
- AC2: The person in the reference image is not used; only the layout, colours and feel are.

### UX-04 Fonts: Inter and Times
- AC1: Display headlines use Times New Roman (fallback Tinos, then serif), often italic.
- AC2: Everything else uses Inter.

### UX-05 Nothing overflows its box
"The text is running out of the box ... Make sure to never let that happen."
- AC1: No text or image crosses the edge of its container at any width from 320 px up.
- AC2: Automated Playwright tests check every screen at phone, tablet and desktop widths.

### UX-06 Phone navigation: icons only
- AC1: Below 768 px wide, a bottom glass tab bar shows icons only (no words), each with an accessible label.
- AC2: Tap targets are at least 48×48 px (raised from 44 by UX-13); the bar respects the phone's safe area.

### UX-07 Desktop navigation: collapsible sidebar
- AC1: From 768 px up, a left glass sidebar with icons and names.
- AC2: A hamburger button (three stripes) collapses it to icons only; the choice is remembered.

### UX-08 Pleasant, "dopamine" feedback
- AC1: Key moments celebrate: Confirm, a job finishing, a skill added. Ordinary clicks do not.
- AC2: Motion is short (under 400 ms for feedback) and respects "reduce motion" (system or app setting).

### UX-09 Two click sounds, never on scroll
- AC1: Clicking an enabled control plays the owner's **click sound** (default 6 "Water drop").
- AC2: Clicking a disabled control, an error toast, or a failed action plays the owner's **error sound** (default
  5 "Nope nope nope"), which sounds clearly different.
- AC3: Scrolling, swiping or dragging on a phone never makes a sound (sounds are tied to the `click` event only).
- AC4: Sounds can be turned off in Settings › Look & feel › Sounds.
- AC5: Changing the pick in Settings changes the sound everywhere in the app at once, with no reload.

### UX-10 Phone, browser and desktop install
- AC1: The app works in any modern browser on phone and computer.
- AC2: It installs as a PWA on the phone home screen and on the desktop (Chrome, Edge, Safari).
- AC3: On Mac and Windows it can also be downloaded as a desktop app (BR-15, NFR-11).

### UX-11 Plain English
- AC1: Every label, message and error is a plain sentence a non-technical owner understands.

### UX-12 Reload that feels fast and fun
"Once you click reload, there should be a nice UI to where it goes fast to 80% or to 70%, and then it's almost like
it's slow in and slow out, but in the middle, it's really quick ... so that the user's dopamine is still being hit."
- AC1: Pressing Reload turns the bar into a progress bar that runs from 0 to 75 % in about 0.8 s on an ease-in-out
  curve: a soft start, a quick middle, a soft landing ([the curve](UX_DESIGN_SYSTEM.md#the-reload-curve)).
- AC2: While the new version installs (service worker update, fresh files), the bar keeps creeping forward slowly; it
  never stops dead and never goes backwards.
- AC3: When the new version is ready, it eases to 100 %, a small sparkle plays, and the page reloads by itself.
- AC4: After 10 seconds it reloads anyway, so the bar can never hang.
- AC5: With reduce motion on, the bar simply fills, with no sparkle.

### UX-13 Kid-proof: a 6–8-year-old can use it
"The entire application should be idiot proof. So even a 6-year-old should be able to use it, or an 8-year-old."
([CONTRACTS.md §12.4](CONTRACTS.md#124-kid-proof-ux-a-68-year-old-must-manage-it), [checklist](UX_DESIGN_SYSTEM.md#kid-proof-checklist))
- AC1: Every screen has one obvious next step: exactly one main vermilion button (the update bar's Reload is the only extra).
- AC2: Tap targets are at least 48 × 48 px on phones.
- AC3: Buttons show an icon **and** a word (the phone tab bar is the one icon-only place, UX-06).
- AC4: Words are short and everyday: "Make clips", "Upload", "Throw away", "Try again". No jargon on screen.
- AC5: Empty screens say exactly what to tap ("Nothing here yet. Tap **Make clips** to start.").
- AC6: No dead ends: every screen has a way forward or back, and every error says what to do next.
- AC7: Throwing something away shows a toast with **Undo** for 8 seconds instead of an "Are you sure?" dialog; the
  action is only carried out when the 8 seconds pass. One deliberate exception: deleting a skill first shows a small
  glass sheet, because a skill can hold a lot of typing (BR-06 AC4); the Undo toast still follows.
- AC8: Forms cannot be filled in wrong: a Paste button next to the link box, the link checked as it is typed, hints
  right under the field, and the main button only active when the input is valid (a click on it before then plays the
  deny sound and points at what is missing).
- AC9: Progress is always visible while something is happening, and success is celebrated (UX-08).

### UX-14 Settings organised like a field of apple trees
"There is a field which is the entire settings, then we have apple trees which has multiple trees, and each tree has
multiple branches, and each branch has multiple apples, but they also have leaves ... so that it is all organized."
([CONTRACTS.md §15.1](CONTRACTS.md#15-settings-as-a-tree-and-choosing-your-click-sounds-owner-request-2026-11-16),
[Settings tree](UX_DESIGN_SYSTEM.md#settings-tree))
- AC1: Settings (the **field**) opens on four **trees**: Clip making, Posting, Look & feel, App & account. Each tree
  holds **branches**; each branch holds **apples** (the things you change), each with a **leaf** (one short line of
  help) unless its name already says it all. No setting sits loose outside a branch.
- AC2: Every tree and branch has its own address (for example `/settings/look-and-feel/sounds`). Opening that address
  directly, reloading, the browser's Back button and bookmarks all land on the same place. The old addresses
  (`/settings#skills` style anchors, `/get-app`, `/settings?account=…&status=…`) keep working.
- AC3: Every tree and branch page shows a breadcrumb (`Settings › Look & feel › Sounds`), each part a link. On phones a
  big Back button goes one level up.
- AC4: Below 1024 px wide, Settings drills down one level at a time. From 1024 px, a folder panel on the left shows the
  whole tree: trees open and close like folders, the current branch is highlighted, and which folders are open is
  remembered on that device.
- AC5: A **Find a setting** box on the Settings page searches every apple, leaf, tree and branch name while you type.
  Picking a result opens its branch, scrolls to it and highlights it. No match says "No setting called that. Try
  another word."
- AC6: The tree, the folder panel and search are kid-proof (UX-13): at most one main vermilion button per screen, 48 px
  targets on phones, plain words, nothing overflows from 320 px, and everything works with a keyboard and a screen
  reader.

### UX-15 Pick your click and error sounds
"Include this entire page in the Clip Factory to allow the ... user of the application to select the normal click and
the error clicks. And I actually like the UI ... and the UX." The owner's picks: "Tap sound: 6 Water drop. Error
sound: 5 Nope nope nope." ([CONTRACTS.md §15.3](CONTRACTS.md#153-sounds), [the picker](UX_DESIGN_SYSTEM.md#the-sounds-branch-the-picker))
- AC1: Settings › Look & feel › Sounds shows the owner's sound picker: 30 numbered click sounds ("When it works") and
  30 numbered error sounds ("When it can't"), each card with its number, name and feel, the same names and sounds as
  the picker page the owner tried.
- AC2: Tapping a card plays its sound and makes it the pick (a "Pick" badge, `aria-pressed`). One pick per group.
- AC3: "Try it: Sign in" plays the click sound with a "Signed in" toast; with **Make it fail** on, it plays the error
  sound with a small shake and "Wrong password. Try again." Nothing is really signed in or out.
- AC4: A pick saves at once and follows the owner to every device; if the save fails, the pick goes back and the app
  says so in plain words.
- AC5: New accounts, and accounts that never picked, use click sound 6 "Water drop" and error sound 5 "Nope nope nope".
- AC6: With Sounds off, the cards say "Sounds are off" with a "Turn sounds on" button, and tapping a card picks it
  without playing anything.
- AC7: The sounds are defined as data (one catalog entry per sound) and played by one player; numbers never change
  meaning, so a saved pick always plays the same sound.

### UX-16 The performance page: the video on top, smooth lines to five stacks
"It should be quite a nice design actually. So we should have the video on top, like the preview of it, the thumbnail
of it, and then there's like ... lines that go, in a smooth manner, leading to each vertical stack of information ...
So maybe 5 lines ... for both the phone resolution and the normal laptop's resolution or PC ... monitors."
([anatomy per screen size](UX_DESIGN_SYSTEM.md#clip-performance-page))
- AC1: The clip's 9:16 video sits on top, centred in a rounded glass frame, with its cover as the poster; it never
  plays by itself.
- AC2: Five smooth curved lines grow out of the bottom of the video, one to the top of each platform stack. They draw
  in once, one after another (80 ms apart, 900 ms each), and the stacks rise in as their line arrives. The best
  platform's line is vermilion, the others green. With reduce motion (system or app setting) the lines are simply there.
- AC3: Laptops and monitors (≥ 1024 px): five equal columns side by side, the lines fanning out from the video and
  ending exactly at the top centre of each stack.
- AC4: Tablets and small laptops (600–1023 px): three stacks in the first row, two in the second, the second-row lines
  running straight down the gaps between the first-row cards, never over a card.
- AC5: Phones (< 600 px): one column of full-width cards; one trunk line runs from the video down the left edge, and a
  small curved branch leads into each card.
- AC6: Nothing overflows at any width from 320 px; numbers never get cut off; labels wrap.
- AC7: Kid-proof (UX-13): the only main vermilion button is **Refresh numbers**; the **Best this week** star is a big green
  toggle; every state has words; the page works with a keyboard and a screen reader (the lines are decoration and are
  hidden from screen readers; each stack is a labelled section).

### UX-17 Set up posting that a child can follow
The owner: "It should be really clear on what to do, the steps, essentially idiot proof. Even an 8-year-old should
be able to do it." ([UX design system](UX_DESIGN_SYSTEM.md#set-up-posting))
- AC1: A step card has a number, a picture-like icon, a title of 6 words or fewer, 1–4 sentences of 15 words or
  fewer with one action each, and the platform's button names in bold exactly as the platform shows them.
- AC2: One main vermilion button per screen: the current step's main action (Open, Save keys, Connect {Platform} or Connect
  again). **I did this**, Copy and Paste are vermilion and at least 48 px tall.
- AC3: Copy shows "Copied!" with a leaf-green tick and works without clipboard permission; a bad key shows what it should
  look like right under the box, and Save keys stays off until the keys look right.
- AC4: Connecting celebrates (confetti, the success sound, the account's picture and name); every other result plays
  the error sound and shows one calm sentence and the step to go back to.
- AC5: Nothing overflows from 320 to 1920 px; phone bottom bar and desktop sidebar as everywhere else.

---

### UX-18 Ask Clip Factory looks and behaves like the rest of the app
([UX_DESIGN_SYSTEM.md](UX_DESIGN_SYSTEM.md#ask-clip-factory))
- AC1: Desktop: a green glass pill **Ask** with a sparkle icon, bottom right, 12 px above the update bar when it shows.
  Phones: a 56 px icon-only glass circle that never covers the tab bar or the update bar and hides while you scroll
  down.
- AC2: The panel is glass, 400 px wide on desktop and a full-screen sheet on phones; it opens with "Hi! What do you
  want to do?" and three suggested questions that fit the page and the device.
- AC3: Only the first button of the newest answer is vermilion; the launcher is never vermilion (green glass).
- AC4: The click sound plays on taps only; a rate-limit or error notice plays the error sound; nothing plays when an
  answer simply arrives.
- AC5: Leaving a page with an unsaved caption edit or pasted link asks "You have a change that isn't saved yet. Leave
  anyway?" with **Stay** and **Leave**; never a scary dialog.
- AC6: The spotlight ring fades over 2.4 s and is a still ring with reduced motion; Escape closes the panel and returns
  focus; it works with a keyboard and a screen reader.
- AC7: Nothing overflows from 320 to 1920 px, with the panel open.

### UX-19 Content Rewards that an 8-year-old can follow
([UX_DESIGN_SYSTEM.md](UX_DESIGN_SYSTEM.md#content-rewards-campaigns), [CONTRACTS.md §38.1](CONTRACTS.md#381-words-and-rules-every-new-screen-follows))
- AC1: Plain short words on every Content Rewards screen ("Join", "Copy", "Paste", "Make clips", "sign in", "allow",
  "per 1,000 views", "clip", "sent"); never "MCP", "OAuth", "token", "scope", "CPM", "submission" or "API" on screen.
- AC2: **Bold** is always the other site's exact label; Clip Factory's own buttons are in quotes; Whop steps say
  "Whop may show this a little differently. Look for the same words."
- AC3: One vermilion button per screen, the next step; on phones it sits at the bottom right while its card is on
  screen. Everything else is glass or green; no edges, no `cursor` changes; pick-one choices slide (`Glide`).
- AC4: A step Clip Factory can see ticks itself; a step it can't see has its own green answer right under its Open
  button ("I have an account", "I added them") and still ticks itself later. Waiting is never a step: Clip Factory
  watches and tells the owner.
- AC5: Every error says what to do next and names the button; every Undo is an 8-second toast; celebrations (confetti
  and the success sound) happen once each and skip motion when reduced motion is on.
- AC6: Brand text is plain escaped text, at most 300 characters a line with **Show more**.
- AC7: Nothing overflows from 320 to 1920 px; targets are at least 44 px (48 on phones); WCAG AA contrast; Ask never
  covers the main button.
- AC8: The names of BR-26 AC3 are the only words for the two ways and for adding an account inside Content Rewards.
- AC9: The fit block keeps one vermilion button per screen: Upload when the clip can go (or can't yet, off, with the
  words why), "Make a {name} copy" or the item's own button when that is the next step; "Fix it for me" and "Read the
  rules" are glass, "Turn on Branded content" and "I read them. They're OK" green. The "could earn" line is glass and
  never takes the vermilion from Upload. A verdict is never colour alone (a mark and words).
- AC10: All your money is a glass card with no vermilion button; each row has at most one glass button, at its right
  end, so nothing tappable sits in a phone's top-left third.

## Interpretations and open questions

| Id | The brief said | What we built | Open? |
|---|---|---|---|
| I-01 | "I should also be able to, 2 days after we've uploaded to the social media on the clips" (sentence not finished) | A 48-hour performance check per post that reads its numbers and turns them into learnings for the next jobs (BR-11). | Confirm this is what was meant. |
| I-02 | "I should be able to see the background of my phone image instead of the actual solid color" | A web page cannot see the phone's wallpaper; browsers do not expose it. The glass shows the app's animated backdrop, or a background image the owner picks in Settings (BR-14). | No. |
| I-03 | "Run this whole thing on Claude Fable 5.1" | Bedrock model `anthropic.claude-fable-5-1` through the global cross-region profile (NFR-03, [ADR-02](DECISIONS.md)). | No. |
| I-04 | "X, Meta (Facebook and Instagram), and YouTube" | Those four plus TikTok, because the existing app and legal pages cover TikTok. The owner can turn any platform off in Settings. | No. |
| I-05 | "Clip it up into 5 videos or 10 videos ... anything between" | A range 5–10 by default, changeable in Settings (BR-04). | No. |
| I-06 | "A Twitch stream, or a Kick stream" | Past broadcasts (VODs) and clips. A live stream that is still running is processed up to the moment the job starts. | Is clipping a live stream as it happens wanted later? |
| I-07 | "I don't care about security at all" | Convenience first (long sessions, no MFA, auto-merge), but data stays private and the account stays protected ([SECURITY.md](SECURITY.md)). | No. |
| I-08 | "I'm going to give you the OIDC role later" | Deploys need `CF_DEPLOY_ROLE_ARN`; until it is set, the deploy workflow stops with a clear message ([DEPLOYMENT.md](DEPLOYMENT.md)). | Waiting for the role. |
| I-09 | "Download it to my desktop" | First build: installable PWA (UX-10, [ADR-11](DECISIONS.md#adr-11-installable-pwa-for-phone-and-desktop)). After the owner asked for a `.dmg` and an `.exe`: a thin desktop app as well (BR-15, NFR-11, [ADR-18](DECISIONS.md#adr-18-a-thin-tauri-desktop-wrapper-not-electron)). | No. |
| I-10 | YouTube downloads from the cloud | YouTube may block requests from AWS addresses. The owner can add a `cookies.txt` in Settings, or upload the file instead ([ARCHITECTURE.md](ARCHITECTURE.md#limits)). | Watch after the first deploys. |
| I-11 | Custom domain | Not mentioned; the app uses its CloudFront address for now ([ROADMAP.md](ROADMAP.md)). | Does the owner want a domain? |
| I-12 | "If it's on the iPhone, I'm not sure" | Apple allows no app download outside the App Store (and, in the EU, outside approved marketplaces), so iPhone and iPad get three picture steps to add the web app to the Home Screen (BR-15, [ADR-21](DECISIONS.md#adr-21-iphone-and-ipad-get-add-to-home-screen-steps-not-a-download)). | No. |
| I-13 | "A brief word of the area ... 'settings profile picture' or just 'profile picture'. That's it." | 1–3 word labels, at most three, written as `Area:` lines in commits, with a folder map as the fallback (BR-17, [ADR-20](DECISIONS.md#adr-20-update-labels-from-area-commit-lines-then-a-folder-map)). | No. |
| I-14 | "Even a 6-year-old should be able to use it" | Concrete, testable rules (UX-13) and everyday words on screen: Confirm reads "Keep", Decline reads "Throw away", New job reads "Make clips". The API and these documents keep their technical names. | No. |
| I-15 | "Once you click reload ... it goes fast to 80% or to 70%" | 75 % in about 0.8 s on an ease-in-out curve, then a slow creep until the new version is ready, then ease to 100 % (UX-12). | No. |
| I-16 | "OpenSearch if we're using that, S3 vectors" | S3 Vectors holds the learning memory (NFR-14). OpenSearch Serverless is not deployed because it bills a standing minimum even when idle; it is shown dashed in the diagram as an option ([ADR-25](DECISIONS.md#adr-25-s3-vectors-for-the-learning-memory-opensearch-not-deployed)). | Only if keyword search is wanted later. |
| I-17 | "WebSockets, HTTP, REST API on those API gateways" | Three APIs, each with one job: HTTP API for the app, WebSocket API for live updates, REST API for platform webhooks (NFR-13, NFR-16). | No. |
| I-18 | "Durable functions in Lambda" | Two durable functions replace the queue, the scheduler, the publisher, the perf-check and the watchdog (NFR-15, [ADR-22](DECISIONS.md#adr-22-lambda-durable-functions-for-the-job-and-clip-workflows)). | No. |
| I-19 | "Python for backend ... Terraform for the infrastructure as code" | Already the case; recorded as [ADR-26](DECISIONS.md#adr-26-python-for-every-backend-terraform-for-every-resource-serverless-only). The web app (TypeScript) and desktop wrapper (Rust) are front end. | No. |
| I-20 | "A field ... apple trees ... branches ... apples, but they also have leaves" | Field = all of Settings, trees = four big groups, branches = sections, apples = the settings you change, leaves = their one-line help (UX-14). The "multiple trees" are the four trees; the field is the Settings page itself. | Are four trees the right split? |
| I-21 | "Include this entire page ... select the normal click and the error clicks" | The whole sound picker (both groups of 30, Try it with Make it fail) becomes the Sounds branch, in the app's glass style (UX-15). "Tap sound" and "error sound" are called **Click sound** and **Error sound** on screen. | No. |
| I-22 | Get the app inside the tree | Get the app moves into App & account and, like the sidebar item, disappears once the app is installed (BR-16). | No. |
| I-23 | "There's like 4 lines ... So maybe 5 lines" | Five lines, one per platform the app posts to: YouTube, TikTok, Instagram, Facebook, X (UX-16). | No. |
| I-24 | "Every 15 minutes or 30 minutes. Or whatever the lowest limit is for each API" | The safe floor per platform, not the hard limit: 15 min for YouTube, TikTok and X, 30 min for Instagram and Facebook (whose numbers settle over 2 days anyway), slower as a post ages, for 30 days (BR-20, [ADR-29](DECISIONS.md#adr-29-stats-refresh-intervals-per-platform)). | Is 30 days of refreshing long enough? |
| I-25 | "What the status is from each social media platform" | The posting status per platform (Posted, Posted privately, Waiting for connection, Posting, Failed, Not posted) next to its numbers (BR-19 AC2). | No. |
| I-26 | "Select the ones that perform best during that week" | The owner stars them by hand (up to 10 a week); the app sorts by views to help, but never picks for the owner, because each app counts views differently and the owner's taste is the signal ([ADR-31](DECISIONS.md#adr-31-the-weekly-best-is-an-explicit-owner-signal)). | Should the app suggest picks later? |
| I-27 | "So that it knows how to edit better in the future" | The picks shape **which moments are chosen and how they are hooked and captioned** (a "Best of week" learning and "best" clips first in "What worked before"). Editing itself (cuts, layout) follows the skills; a clip editor is on the [roadmap](ROADMAP.md#later). | Does the owner want the picks to change editing style directly? |
| I-28 | Real numbers on TikTok | TikTok shows posts from unaudited apps only privately and gives them no numbers, so TikTok reads "Posted privately. TikTok shows numbers after the app is approved." until the app passes TikTok's audit ([ROADMAP.md](ROADMAP.md#phase-2-social-integrations)). | Waiting for TikTok's audit. |
| I-29 | X numbers cost money | X has no free tier for reading posts; reads are paid per post. The app caps its own spend at $10 a month and says so in Settings (NFR-17 AC5, [DEPLOYMENT.md](DEPLOYMENT.md#x-api-credits-for-clip-numbers)). | Is $10 a month the right cap? |
| I-30 | "Create, read, update, delete skills in Settings, following the trees, branches, apples, leaves" | Skills stay one branch (Clip making › Skills) with two apples, **Your skills** and **Add a skill**; each skill gets its own page, and writing and editing get their own pages under the branch, so the tree stays four trees deep at most. Writing a skill is three plain questions, so a child can do it without knowing the `SKILL.md` format (BR-06). | No. |
| I-31 | "The whole AI system should use all of these skills by default, no matter what ... Bedrock, AgentCore, whatever ... generating stuff or reading stuff" | Every Claude call, on AgentCore (Agent SDK) and on Bedrock directly, in the agent and in the API, gets every skill first in its instructions, and the per-skill on/off switch is removed. Titan embeddings are not "generating or reading" by Claude and get none. Very long skills are shortened to fit (BR-22, [ADR-32](DECISIONS.md#adr-32-every-ai-call-gets-every-skill-through-one-shared-skills-block)). | Are 40,000 characters per skill and 120,000 in total enough? |
| I-32 | "Each one … should all be a step to connect to" | One setup per platform in a setup list with a ready ring; the owner makes and owns each platform's developer app and pastes its keys, because no shared app can post for a private owner on all five today ([ADR-33](DECISIONS.md#adr-33-posting-setup-bring-your-own-keys-with-a-guided-list-per-platform)). | No. |
| I-33 | "Up to date to today" | The steps were checked against each platform's docs on 16 Nov 2026; the date is shown on every platform page, and the sources are in [SETUP_POSTING.md](SETUP_POSTING.md#research-sources-checked-on-16-nov-2026). | How often should they be re-checked? |
| I-34 | Posting on TikTok and Facebook "for everyone" | TikTok may keep posts "Only me" (it often refuses apps used by one person), and Facebook Reels may stay visible only to the owner until Meta lets the app go Live. The setup says so; it cannot be forced. | Accept private TikTok posts if TikTok says no? |
| I-35 | "Implement it into Clip Factory ... the entire system ... applied to this concept" | One assistant that knows every screen and setting of the app (BR-24), built from the app's code. The pattern's roles, plans, tenants and "ask the owner" are dropped (one owner); a `when` filter on device and install state takes their place. | No. |
| I-36 | "The whole AI system must use the skills" | The help model gets every skill first, like every AI call (BR-22, I-31), then the grounding rules: skills shape tone and clip advice, the corpus decides facts (BR-24 AC8). | No. |
| I-37 | The pattern's per-tenant and platform caps | One owner, so one cap: 2,000 model answers per 30 days, plus 6 a minute and 60 an hour (NFR-18). | Is 2,000 a month the right cap? |
| I-38 | "How do I connect Instagram?" | The answer sends the owner to Settings › Posting › Set up posting, lights up that platform's card and offers its own steps page (CONTRACTS §17). | No. |
| I-39 | "Creating and joining a campaign" | Brands create campaigns on Content Rewards; for a clipper "creating" means adding a joined campaign to Clip Factory by pasting its link. Joining and applying stay on Content Rewards: its tools have no way to browse, join or apply (BR-25 AC3). | No. |
| I-40 | "It should connect just like we have created for all the social media platforms" | A card like the platform cards on Set up posting, with the same step cards, Check it, Connect again and Disconnect, but apart from the five (not a place Clip Factory posts to). Content Rewards' sign-in only returns to an app on the computer, so its Connect step happens in the Mac app ([ADR-62](DECISIONS.md#adr-62-content-rewards-the-official-sign-in-through-the-desktop-apps-loopback-door-sending-from-the-cloud-a-reminder-when-it-cant)). | No. |
| I-41 | "Follow its rules and guardrails (required hashtags, logos/watermarks, captions, tags, length, platforms, posting rules)" | Claude reads the brief into a fixed set of rules and code checks each one against the brief; the agent and the publishers carry them out. The logo is in Content Rewards' reference files, which apps can't read, so the owner adds it once per campaign ("Add the logo"). Rules Clip Factory can't follow (drafts first, the brand's own sound) stop the campaign; things only the owner can do are listed as "Things you do". | Is adding the logo once per campaign acceptable? |
| I-42 | "3 steps, 5 at most" | 3 for each campaign as asked (join, copy the link, paste), at most 5 with the logo and "Yes, I applied" or "I'm in. Read these rules"; setup is 3 once; each video 3 and each clip 2 taps; checking a clip 0 (BR-25). | No. |
| I-43 | "Checking if I am confirmed as a member of the campaign" | Clip Factory checks by itself (every 15 minutes for 7 days, then every 6 hours to day 30) and says "You're in!" with a notification; "Check now" is there but never needed. Pending applications are not visible to apps, so an application shows "Waiting for the brand" after "Yes, I applied". | No. |
| I-44 | "Get paid for it" | The Money page shows Content Rewards' own numbers and the steps to move money to Whop and then the bank; Clip Factory never moves money itself. | No. |
| I-45 | Campaigns that pay for TikTok | TikTok keeps Clip Factory's posts private until TikTok's audit, and private posts can't earn, so TikTok is left out of campaign uploads until then (BR-25 AC7). | Waiting for TikTok's audit. |
| I-46 | "Set up in a chronological and structured manner" | The three Connect steps stay in the order they happen (account, accounts added inside Content Rewards, Connect), each with its answer button right under its Open button, a "Yes" shortcut for someone already set up, and a way back to where he came from (BR-26 AC4). Steps 1 and 2 are taps only he can make: Content Rewards' tools can't tell an app that he has an account or which accounts he added there. | No. |
| I-47 | "Using either the content rewards way of videos or normal way we have done so far" | Two ways with their own names: "Make clips" (normal clips, exactly as before) and "Make campaign clips" (always started from a campaign). The choice is never a field on the normal form, so the normal way gains nothing (BR-26). | No. |
| I-48 | "Track how much i earn from all platforms including contentrewards" | One "All your money" card: the money each place reports for the same 30 days and one total per currency. TikTok, Instagram and X report no money to apps, so they say "Not available" with where to look; Facebook waits until its numbers are checked; what left Content Rewards for Whop and the bank is not in its tools (BR-27). | Is 30 days the right period for the total? |
| I-49 | "Know if the content i upload is compatible with the content rewards campaigns … instead of me selecting the content rewards way of uploading but arent compatible" | A fit check on every campaign clip before Upload, refused on the server when it can't earn, and a quiet "could earn" line on normal clips that fit a joined campaign. A normal clip is not turned into a campaign clip in place: it lacks the logo and "Paid partnership" on the video that briefs ask for, so a copy is made with them ([ADR-63](DECISIONS.md#adr-63-content-rewards-follow-ups-one-fit-check-in-the-api-a-new-copy-instead-of-turning-a-normal-clip-into-a-campaign-clip-one-30-day-total-that-includes-content-rewards)) (BR-28). | Is a copy below the original acceptable? |

## Out of scope for this phase

- Posting automatically the clips that were kept before a platform was connected (they stay "Waiting for connection";
  [roadmap](ROADMAP.md#phase-2-social-integrations)).
- Webhook signature checks and acting on webhook events.
- OpenSearch Serverless (an option, not deployed).
- Browsing, joining or applying to Content Rewards campaigns inside Clip Factory (that stays on Content Rewards; its
  tools offer no way to do it). Reading and following joined campaigns is in scope (BR-25).
- Content Rewards campaigns that want drafts first or the brand's own sound, and sending proof of views for the owner
  (Clip Factory reminds him and says how).
- Money from TikTok, Instagram and X (their tools tell apps nothing about it), and what left Content Rewards for Whop
  and the bank (its tools list no withdrawals); they say "not available" with where to look (BR-27).
- Turning a normal clip into a campaign clip in place (a copy is made instead, BR-28 AC5), and campaigns that want
  their own picture on top of the video (a hard stop "Pick another campaign").
- More than one user.
- A custom domain.
- Signed and notarized desktop builds, and a store listing for phones (NFR-11 AC5, [ROADMAP.md](ROADMAP.md#later)).
