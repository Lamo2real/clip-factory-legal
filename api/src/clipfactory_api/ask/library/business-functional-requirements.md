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
