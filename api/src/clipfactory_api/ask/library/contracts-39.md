## 39. Content Rewards: the two ways, all your money, and does this clip fit (owner request, 2026-11-21)

The owner's words, the day §38 was approved: *"please double check that the steps to conect to contentrewards is
extremely easy and simple and set up in. a chronological and structured manner so the UX is better and the user has a
better and pleasant experience on the app using eaither the content rewards way of videos or normal way we have done so
far, i also need to track how much i earn from all platforms including contentrewards. btw i would like to know if the
content i upload is compati ble with the content rewards campaigns so i can get paid instead of me selecting the content
rewards way of uploading but arent compatible, so please make sure thats in place as well"*. Still binding from §38:
paste a campaign link and Clip Factory follows its rules, connected like the platforms, 3 steps per campaign (5 at
most), every step idiot-proof for an 8-year-old (§38.1). Decision record: ADR-63.

What this section changes, and what it leaves alone. It builds on §38 as builders A (`feature/cr-api`, merged as #85,
`a8a3a77`) and D (`feature/cr-web`) built it; where the two disagree, this one wins, and every change to §38's words or
order is listed as "§38.x: old → new" (§39.1, **Changes to §38**). **The normal way is frozen**: Home's form at `/`, the
Review card of a clip with no campaign and their taps stay exactly as on origin/main's web (unchanged since `4fca538`;
#85 changed no web file); the one addition anywhere on the normal way is the optional "could earn" line of §39.3 when a
joined campaign fits, which never blocks, never adds a needed tap and is not there when he has no campaign. §25's rule
stays: only money a platform or Content Rewards reported, never calculated, guessed, converted or typed in. The §27 MRR
cards keep their numbers and never include Content Rewards. Data is additive only (§39.3, **Data**). The §38.1 screen
rules apply to every new screen: kid-proof words, one vermilion button per screen, no `cursor:` rule, no edges,
`<Glide>` for pick-one bars, reduced motion, WCAG AA, phone controls at the bottom right, never made for kids, paid
partnership on campaign clips, TikTok's own rules (§17.8).

### 39.1 Connect in time order, and the two ways

**One name for each thing** (screens, help guides, docs, notifications; tests read this list):

| Thing | Words | Where |
|---|---|---|
| The normal way | "Make clips" (Home's main button at `/`, as today). Its clips carry no label. Only where both ways are named side by side: "normal clips" ("Make normal clips instead") | Home `/`, Review, Library |
| The campaign way | "Make campaign clips" wherever he starts it from Home: the campaigns row chip, and Home's main button at `/?campaign=` (only there). The campaign card keeps §38.4's vermilion "Make clips for this campaign" | Home row, Home at `/?campaign=`, campaign card, campaign video rows |
| Clips made the campaign way | "campaign clips", one "campaign clip" | Home strip "Campaign clips · FaZe Clips", job page strip, Review and clip page "Campaign clip · FaZe Clips", Library chip "Campaign" |
| A normal clip that could earn | "This clip could earn money on FaZe Clips." and the button "Make a FaZe Clips copy"; the new clip is "the FaZe Clips copy" | Review, clip page |
| The fit headlines | "Can earn on FaZe Clips" · "Almost ready for FaZe Clips" · "FaZe Clips needs a copy of this clip" · "One thing first for FaZe Clips" · "Wait a little for FaZe Clips" · "This clip can't earn on FaZe Clips" · "Check 2 things, then upload" | §39.3 |
| Adding a social account inside Content Rewards | "add": "Add YouTube in Content Rewards first."; its answer button "I added it" (setup step 2: "I added them"). Never "link" or "connect" for this act | setup step 2, Review, post lines, refusals, the fit |
| Connect | only Clip Factory ↔ Content Rewards (step 3 "Connect Content Rewards") and each platform's own setup | setup pages |
| The site | "Content Rewards" (never "CR" on a screen) | everywhere |

Never on a screen: "the Content Rewards way", "mode", "normal mode", "compatible", "clip type", "upload type",
"campaign type". Content Rewards' own button names stay bold and word for word (**Connect account**, **Join Campaign**).

**Connect Content Rewards: the steps in time order.** Setup stays three numbered steps on one page,
`/settings/posting/setup/contentrewards` (§38.3), the only place Connect happens, like each platform's setup page. Each
step is something only the owner can do or knows: CR's API has no tool that tells Clip Factory he has an account or
which accounts he added inside Content Rewards (`get_me` returns only his `cre_` id and brand memberships,
`mcp-tools.json` 2026-10-01), so steps 1 and 2 are one green tap each; step 3 ticks steps 1 and 3 by itself. The page,
top to bottom (H; `CrSetup.tsx`, D's `CrStepCard` in `screens/campaigns/bits.tsx`):

0. **The shortcut**, only while steps 1 and 2 are both not done: "Already use Content Rewards, with YouTube added
   there?" ({places}: the places he connected in Clip Factory, from `GET /v1/setup`, never TikTok, joined "YouTube and
   Instagram"; "with your accounts added" when none) and the green "Yes" (sends `PATCH /v1/contentrewards/connection
   {step: "ready-account", done: true}`, then the same for `ready-socials`; steps 1 and 2 tick, step 3 opens). No "No"
   button: step 1 stays open right below for anyone who has no account.
1. **Step 1 `ready-account` "Make a Content Rewards account".** First line (`lead`): "Have one already? Tap I have an
   account." Then the vermilion "Open Content Rewards" and, right under it, the green "I have an account" (before
   the other lines, the folds and If you see). Then: "Tap **Continue with Google**. Pick your Google account." · "Or
   type your email in **Email**. Tap **Send code**. Type the 6 numbers from the email. Tap **Verify**." · "You must be
   18 or older. One account per person." · "Then come back to Clip Factory. Tap I have an account."
2. **Step 2 `ready-socials` "Add your accounts there".** `lead`: "Already added YouTube there? Tap I added them."
   ({places} as in 0). The vermilion "Open Content Rewards settings", right under it the green "I added them". Then
   "Tap **Accounts**." · "Tap **Connect account**. Tap YouTube." · "On the next screen, leave every box ticked and tap
   Allow or Continue." · "Add Instagram, X and Facebook the same way, if you post there." · "Each one should say
   **Connected**." · the "Clip Factory posts to: …" line and the TikTok line (§38.3, unchanged) · "Then come back to
   Clip Factory. Tap I added them." A `crLinked: false` reopens it with "Content Rewards doesn't know your YouTube
   account. Add it in Content Rewards, then tap I added them."
3. **Step 3 `connect` "Connect Content Rewards"**, §38.3's words (on a phone: "Do this step on your Mac." with no
   button).
4. **When it's done**, with a `?back=`: after a `connected` or `read_only` result the panel's vermilion is the back
   button ("Back to FaZe Clips") instead of "Add a campaign", and the result card (`CrResultCard`) adds "Next: back to
   FaZe Clips.". While the "Content Rewards said no?" card waits for "I sent it", the back button is glass and "Open
   email" is the vermilion; after "I sent it" the back button is the vermilion again.

**`?back=`** (H, `web/src/lib/backLink.ts`, one pure function used by every setup page): only these exact same-origin
shapes count, anything else (another origin, `//`, a scheme, other paths, extra query keys) is ignored: `/campaigns/{uuid}`
→ "Back to {campaign name}" ("Back to your campaign" until the name loads), `/campaigns` → "Back to your campaigns",
`/review`, `/review?job={uuid}` and `/clips/{uuid}` → "Back to your clip", `/money` → "Back to Money". A platform's setup
page (`SetupPlatform.tsx`) reads it the same way: once that platform is connected, its "When it's done" vermilion is
the back button. Every link of §39 to a setup page adds the `?back=` of the page it is on (the server's hrefs never
carry one, except the campaign card's, below).

| Way in | Taps to reach the page |
|---|---|
| A pasted campaign link (the owner's own way, §38.4): Home's box, Paste, "Add campaign", then the card's next step "Connect Content Rewards" (`?back=/campaigns/{uuid}`) | 3 |
| Money: the Content Rewards row of All your money (§39.2), "Set up Content Rewards" (`?back=/money`) | 2 (Money tab, the button) |
| Campaigns page while not signed in: "Set up Content Rewards" (`?back=/campaigns`) | 2 |
| Ask: "connect content rewards" opens `setup-step:contentrewards:ready-account` (§38.17) | 2 |
| Settings, Posting, Set up posting, the Content Rewards card | 4 |

**From zero** (no Content Rewards account; the Mac app; YouTube only; a campaign link from a friend), in time order:

| # | Screen | What he does | Taps |
|---|---|---|---|
| – | Clip Factory: Home | tap Paste, tap "Add campaign" | 2 |
| – | Clip Factory: the campaign card ("Connect Content Rewards so I can see if you're in.") | tap "Connect Content Rewards" | 1 |
| 1 | Clip Factory: setup page, step 1 open | tap "Open Content Rewards" | 1 |
| 1 | Content Rewards: **Create your account** | tap **Continue with Google** | 1 |
| 1 | Google | pick the account, tap Continue | 2 |
| 1 | Content Rewards: its first questions, only when it asks | answer, continue | 0–3 |
| 1 | back to Clip Factory (its window or its Dock icon) | one tap | 1 |
| 1 | Clip Factory: setup page | tap "I have an account" (step 1 ticks, step 2 opens) | 1 |
| 2 | Clip Factory: step 2 | tap "Open Content Rewards settings" | 1 |
| 2 | Content Rewards: Settings | tap **Accounts**, **Connect account**, YouTube | 3 |
| 2 | Google | pick the account, tap Allow | 2 |
| 2 | back to Clip Factory | one tap | 1 |
| 2 | Clip Factory: setup page | tap "I added them" (step 2 ticks, step 3 opens) | 1 |
| 3 | Clip Factory: step 3 | tap "Connect Content Rewards" | 1 |
| 3 | Content Rewards: the allow page (signed in from step 1; asked to sign in again: +3, Google) | tap the allow button | 1 |
| 3 | the door's page "Done! Go back to Clip Factory." | nothing: the app comes to the front | 0 |
| 3 | Clip Factory: setup page, confetti, "Content Rewards is connected!" | tap "Back to FaZe Clips" | 1 |
| – | Clip Factory: the campaign card, "Not joined yet" | tap "Open campaign" | 1 |
| – | Content Rewards: the campaign | tap **Join Campaign** (and **Hold to confirm** when it asks) | 1–2 |
| – | back to Clip Factory | one tap; the card checks by itself when its window comes back (§38.4) and says "You're in!" | 1 |

**23 taps** (24 with **Hold to confirm**, up to 27 with Content Rewards' questions) on 10 screens: Clip Factory 3 (Home,
campaign card, setup page), the browser 7 (Content Rewards' sign-up, settings, allow and campaign pages, Google twice,
the door's Done page). Of these, 10 are Clip Factory taps (Paste, Add campaign, Connect Content Rewards on the card,
Open Content Rewards, I have an account, Open Content Rewards settings, I added them, Connect Content Rewards, Back to
FaZe Clips, Open campaign). By email instead of Google: one tap fewer, but he types his email and the 6 numbers and
opens his mail. Each more place inside Content Rewards is optional: Instagram +4, X +3, Facebook +10 (the Reel code,
§38.3).

**The owner's own case** (he has an account with YouTube added, joined the campaign there and copied its link): Paste,
"Add campaign", "Connect Content Rewards" (card), "Yes" (the shortcut: steps 1 and 2), "Connect Content Rewards" (step
3), allow, "Back to FaZe Clips": **7 taps on 5 screens** (Home, campaign card, setup page, the allow page, the Done
page), and the card says "You're in!" (checked at once, §38.12). That is the fewest: each tap is the move to the next
screen, a fact only he knows, or Content Rewards' own allow. (Starting the sign-in straight from the card would save
one more but skip the "accounts added" answer the fit's `place_link` needs, so it is not done.) Extras, only when they
apply: an older Mac app +1 ("Restart now", §38.15); Content Rewards says no to apps +2 ("Open email", Send) and +1
optional "I sent it". On a phone the campaign card's vermilion is "Set up Content Rewards" (→ the setup page with
`?back=`); steps 1 and 2 work the same and step 3 says "Do this step on your Mac." (on the Mac, once steps 1 and 2 are
done, the card's "Connect Content Rewards" opens the page at step 3: 1 tap). Then each later campaign (§38.4,
unchanged): on Content Rewards open it, **Join Campaign** (**Hold to confirm** when asked), share icon, **Copy campaign
link**; in Clip Factory Paste, "Add campaign": 6–7 taps, "You're in!" by itself.

**The two ways: how he picks.** Home at `/` is the normal way; for a video link or file it stays exactly origin/main's
form (Source bar "Paste a link" / "Pick a video", the link box with Paste and Clear, How many clips, Notes, "Make
clips", "Nothing gets posted until you tap Upload."). The campaign way always starts **from a campaign**, never from a
field on the normal form: Home's "Your campaigns" row, whose chip for a campaign ready for clips (`nextStepKind:
"make_clips"`) says "Make campaign clips" and opens `/?campaign={uuid}` in one tap; the campaign card's vermilion "Make
clips for this campaign"; a campaign video row's "Make clips from this" (§38.4 item 6); the fit's "Make new clips for
this campaign"; or, for a clip already made, the "could earn" line's "Make a FaZe Clips copy" (§39.3). Home opened at
`/?campaign={uuid}` shows, above the link box, the strip "Campaign clips · **FaZe Clips**" (`data-help="cr-make-clips"`,
moved here from D's bar on `/`), the line "Clip Factory follows its 9 rules on every clip." and at the strip's right
end a quiet "Make normal clips instead" (→ `/`); the pick-one `<Glide>` bar "Which campaign" only when two or more
campaigns can make clips (no "None": leaving is "Make normal clips instead"); under the link box the campaign's own
rule lines when it has them, server-made (`sourceRuleText`: "FaZe Clips pays only for clips of FaZe's YouTube and
Twitch." / "FaZe Clips pays only for clips of its own videos. Pick one below."; `languageRuleText`: "FaZe Clips wants
clips in English."); the "Videos from the campaign" and channel chips (§38.5); a `&link=` fills the link box. There
the main button reads **"Make campaign clips"**, so he sees which way he is on as he taps. A pasted Content Rewards
link on `/` still turns the button into "Add campaign" (§38.4): that is a campaign link, not a video.

| Way | Screen | Taps |
|---|---|---|
| **Normal** (origin/main today = after §39) | Home: Paste (or Command+V in the box) · "Make clips" · (the job runs) · "Go to Review" (or the notification) · Review: "Use my settings" · "Upload to N" | **5** |
| **Campaign** | Home row chip "FaZe Clips · Make campaign clips" (or the card's "Make clips for this campaign") · a "Videos from the campaign" chip or Paste · "Make campaign clips" · "Go to Review" · Review (the fit says "Can earn on FaZe Clips"): "Use my settings" · "Upload to 2" · (Clip Factory sends it to Content Rewards) | **6**; still 6 with a tag or #Ad missing (the upload puts them back; "Fix it for me" is optional); +1 "Turn on Branded content" only if he turned TikTok's Branded content off after "Use my settings" |
| **A normal clip that could earn** | Review: "Make a FaZe Clips copy" · (about 3 minutes; the copy appears right below it on the same Review page) · "Use my settings" · "Upload to 2" | **3** from the card; the original keeps its own 2 taps |

The normal way gains 0 taps, 0 fields and 0 warnings: the tests of §39.5 fail if it gains one.

**Changes to §38** (each is a change of words or order; G, H and J carry them out, §39.4):

1. §38.1 (new rule): no names list → the names list above is the only wording for the two ways and for adding an
   account inside Content Rewards.
2. §38.2 journey A: "1 make a CR account · 2 connect the same accounts inside CR · 3 in the Mac app, tap "Connect
   Content Rewards", sign in, allow" → "1 make a Content Rewards account (or tap "I have an account") · 2 add the same
   accounts inside Content Rewards (or "I added them") · 3 in the Mac app, tap "Connect Content Rewards" and allow (7
   taps from a pasted link when 1 and 2 are already done: the "Yes" shortcut, §39.1)".
3. §38.2 journey C, each clip: "**2**: "Use my settings" · "Upload to N"" → "**2**, also with a tag or #Ad missing
   (the upload puts them back); +1 "Turn on Branded content" only if he turned it off (§39.3)".
4. §38.3 the page: header, then the three steps → header, then the shortcut card "Already use Content Rewards, with
   YouTube added there?" + green "Yes" (only while steps 1 and 2 are both not done), then the three steps.
5. §38.3 step 1 `ready-account`: lines "You'll see **Create your account**. Type your email … **Send code**." · "Type
   the 6 numbers … **Verify**." · "Or tap **Continue with Google**." · "You must be 18 …", then "I did this" at the
   card's end → `lead` "Have one already? Tap I have an account."; "Open Content Rewards" with the green "I have an
   account" right under it; then "Tap **Continue with Google**. Pick your Google account." · "Or type your email in
   **Email**. Tap **Send code**. Type the 6 numbers from the email. Tap **Verify**." · "You must be 18 or older. One
   account per person." · "Then come back to Clip Factory. Tap I have an account." (the same `PATCH {step, done:
   true}`; If you see unchanged).
6. §38.3 step 2 `ready-socials`: title "Connect your accounts there" → "Add your accounts there" (one "Connect" on the
   page: step 3's); "I did this" at the card's end → `lead` "Already added YouTube there? Tap I added them." and the
   green "I added them" right under "Open Content Rewards settings"; "Do the same for Instagram, X and Facebook." →
   "Add Instagram, X and Facebook the same way, if you post there."; new last line "Then come back to Clip Factory.
   Tap I added them."; the `crLinked: false` line "… Connect it here, then tap I did this." → "… Add it in Content
   Rewards, then tap I added them.".
7. §38.3 the page: no return → the page reads `?back=` (the six shapes of §39.1); after a `connected` or `read_only`
   result the "When it's done" vermilion is the back button instead of "Add a campaign" (glass while "Content
   Rewards said no?" waits for "I sent it"), and the result card adds "Next: back to FaZe Clips.".
8. §38.4 membership `unknown`: vermilion "Connect Content Rewards" → `/settings/posting/setup/contentrewards` (none on
   a phone) → the same with `?back=/campaigns/{uuid}` (made by `gates.next_step`; the `not_connected` stop's
   `fixHref` too); on a phone the vermilion "Set up Content Rewards" with the same href.
9. §38.4 Home's "Campaigns" row: "one chip per campaign with its state, tapping opens it" → "… a chip whose
   `nextStepKind` is `make_clips` shows "Make campaign clips" and opens `/?campaign={uuid}`; every other chip opens
   the card. The row's line says "Tap a campaign to make clips for it." while any chip says Make campaign clips".
10. §38.4 empty state: "While the box is empty, the screen's vermilion is `join-find`'s "Open Content Rewards"" → while
    Content Rewards is not connected (no `CRCONN` `connected`/`read_only`) and the box is empty, the vermilion is "Set
    up Content Rewards" (→ setup `?back=/campaigns`), the part `join` is titled "Then join a campaign" and its Open is
    glass; once connected, as §38.4 (Open vermilion); a Content Rewards link in the box still makes "Add campaign" the
    vermilion.
11. §38.4 stops: + a hard stop `overlay_needed` (when `rules.overlayRequired`; in `ELSEWHERE`, chip "Can't do this
    one", "This campaign wants its own picture on top of the video. Clip Factory can't add it yet. Pick another
    campaign."), like `sound_needed`.
12. §38.5 New job: "The form shows a pick-one `<Glide>` bar "For a campaign" (None + every campaign the owner is `in` or
    `manual`)" → "Only the campaign way (`/?campaign={uuid}`) shows campaign things: the strip, "Make normal clips
    instead", the bar "Which campaign" only with two or more campaigns (no None), the rule lines under the link box,
    the video and channel chips, and the main button "Make campaign clips". Home at `/` shows no campaign field, bar,
    chip or line, whatever campaigns exist" (D's "For a campaign" bar on `/` goes; its `cr-make-clips` anchor moves to
    the strip).
13. §38.5 Job page: "A strip "For FaZe Clips on Content Rewards" with the rules count ("Following 9 rules")" →
    ""Campaign clips · FaZe Clips · Following 9 rules"".
14. §38.5 Review: "A strip … "For **FaZe Clips** · Content Rewards" with three ticks "Paid partnership", "#Ad at the
    start", "Logo on"" → "the fit block of §39.3 titled "Campaign clip · **FaZe Clips**": a tick only for a check that
    passed" (until `GET /v1/contentrewards/fit` answers, an API before G, D's strip stays as built).
15. §38.5 places, §38.6 `not_sent` and §38.9's reason texts: "Link YouTube inside Content Rewards first." / green "I
    linked it" / "Then tap I linked it. The next clip will go." / "… tap **Accounts**, and connect it. Then tap I
    linked it." / "… Open Content Rewards settings, then tap I linked it." → "Add YouTube in Content Rewards first." /
    "I added it" / "Then tap I added it. The next clip will go." / "… tap **Accounts**, and add it. Then tap I added
    it." / "… Open Content Rewards settings, then tap I added it." (the same `relinked` PATCH).
16. §38.5 captions: "the row shows "I put #Ad and the campaign's tags back when it uploads." (no block)" → the same, and
    the fit block's optional glass "Fix it for me" puts them back on the card at once.
17. §38.5 and §38.14 refusals: "The API refuses what the card cannot send (…)" → "… and a campaign clip whose fit has a
    `no`, `remake` or `todo` item (§39.3)".
18. §33.6 release, for §38.14's campaign posts: a connection coming back restarts every waiting `pending_integration`
    post → … except a campaign clip's (`campaignId`): those wait for Post now, which runs the fit (§39.3).
19. §38.7: "CR money is never added into the Money dashboard's MRR totals (§27) …; it has its own part." → "CR money is
    never added into the MRR cards (§27). It is added in one place: the total of "All your money" (§39.2), the same 30
    days, with its own tag."
20. §38.7 Money page: "a part `#content-rewards` after the cards" → "a part `#content-rewards` at the end of the page,
    after the clip list (as D built it); the page's first card is "All your money", whose Content Rewards row links to
    the part".

### 39.2 All your money in one place

**The screen.** `/money` (§27.4), top to bottom: the page header, then **All your money** (new,
`screens/money/AllMoney.tsx`, `data-help="money-everywhere"`, a glass card with no vermilion button), then the Apps
chips and period picker band, then the Monthly card and everything after it, as today. Nothing is removed. The band
sits under All your money because it changes only the cards below it. All your money's total is the biggest number on
the page; the Monthly number is one size smaller, keeps its card and words, and its sub line gains "Apps only.
Content Rewards is in All your money." while the Content Rewards row is on the card (the empty Monthly states,
`NoMoneyYet` and `OnlyNotShared`, gain the same line when that row is `number`). The Notes card (§27.3) keeps every
line.

All your money: title "All your money", then "Every place · 30 days up to Sat 16 Nov" (+ "· YouTube is 2–3 days
behind" when YouTube is in it). One row per place, in STATS_ORDER (YouTube, TikTok, Instagram, Facebook, X), then
Content Rewards, exactly the places `MoneyEverywhere.places` lists (the server adds Content Rewards only while
`CONTENT_REWARDS=on`; the web makes no other call to decide). A row: the place's mark (Content Rewards: the coin mark),
its name, its words by state (below), and at most one glass button at the row's right end (so on phones nothing
tappable sits in the top-left third, §27.4). Under the rows the **total**: "Total: $24.80" (it never counts up),
"YouTube + Content Rewards · 30 days up to Sat 16 Nov", the tag line "YouTube's estimate + Content Rewards' numbers";
two currencies give one line each and "Different money, like dollars and euros, is never added together."; then "Not
in the total: TikTok, Instagram and X (not available) · Facebook (coming soon)." With nothing to add: "Nothing to add up
yet." and no total (never $0).

| State | When | The row says |
|---|---|---|
| `number` | the place has a reported row in the period (YouTube; Facebook once `moneyVerified`; a reported $0 day counts as reported, §27.2), or Content Rewards' paid payouts by day were read to the end | "YouTube says" · "$12.40" · "YouTube's estimate" (Facebook: "Meta says" · "Meta's estimate"; Content Rewards: "Content Rewards says" · "$8.00" · "reached your balance in these 30 days · Content Rewards' numbers"). With `lastError`: + "Couldn't check today. Showing money up to Thu 14 Nov." |
| `not_available` | Instagram, TikTok and X, always (connected or not) | "Not available from TikTok" · "TikTok doesn't tell apps what you earn." · the where line (below). Never a number, never $0 |
| `coming_soon` | Facebook while `moneyVerified` is `false` | "Coming soon" · "Clip Factory can't show Facebook money yet." · the where line |
| `not_set_up` | YouTube (or a verified Facebook) not connected; Content Rewards `not_connected` | "Not set up yet" · "Connect YouTube to see its money." + glass "Set up YouTube" (→ `/settings/posting/setup/youtube?back=/money`); Content Rewards: "Connect Content Rewards to see its money." + glass "Set up Content Rewards" (→ `/settings/posting/setup/contentrewards?back=/money`) |
| `needs_ok` | YouTube connected without the money scope | "YouTube needs your OK" · "Tap Allow money reading so YouTube shares your money with Clip Factory." + glass "Allow money reading" (→ `/settings/posting/money#money-youtube`) |
| `waiting` | connected and allowed, nothing reported in the period yet; a place `behind` (§27.3); Content Rewards `checking` or `none_yet`, or its paid-by-day not read yet | "Waiting for the first numbers" · YouTube `not_yet`: "YouTube says you're not in its Partner Program yet." + glass "How close am I?" (→ `/settings/posting/money`); `in_program`/`earning`: "YouTube shows money 2–3 days after it's made."; `behind`: §27.3's sentence ("Facebook hasn't sent money since Tue 27 Oct."); Content Rewards `checking`: "Checking Content Rewards…"; `none_yet`: "No campaign money yet. It shows here when the brand approves your clips." |
| `error` | nothing stored for the period and the last check failed; Content Rewards `error` | "Couldn't check today" · "Clip Factory tries again tomorrow." (Content Rewards: "Content Rewards didn't answer. Try again in a few minutes.") |
| `sign_in` | Content Rewards `needs_reconnect` | "Sign in again" · "Sign in to Content Rewards again to see your money." + glass "Sign in again" (→ the setup page `?back=/money`) |

**The where line** (server-made from `config/monetization.json` `paidWhere`, §25.2, never typed into code twice; the
config is unchanged): the label's " › " is said as ", then "; a label whose place has a `url` names its own product
first and reads "Look in {label}." with a glass "Open {its first part}" (→ the `url`), otherwise "Look in {name}:
{label}." with no button. So, word for word: Instagram "Look in Instagram: Professional dashboard, then Payouts.";
TikTok "Look in TikTok: Profile, then Balance."; X "Look in X, then Monetization (paid through Stripe)." + "Open X";
Facebook "Look in Meta Business Suite, then Payouts." + "Open Meta Business Suite".

**The Content Rewards row's small lines**, under the row in any state but `not_set_up`, in money's time order, each
number only when CR reported it, none of them in the total:
* "Right now (Content Rewards says, 2:10 pm): Still earning $4.20 · Ready to move to Whop $18.25 · On its way to Whop
  $0.00" (time = `asOf`; a number CR didn't report is left out of the line).
* "Earned so far, since you started: $62.40" ("Checking…" until the paid list was read to its end).
* "Paid out to your bank: not available from Content Rewards. Look on Whop: **Balances**."
* the glass "See it all" (→ `#content-rewards`), only while the row has no button of its own.

The owner's four words map to CR's: "earned so far" = the `paid` payouts ("The amount reached your balance", net of
all fees: §38.7's "paid you … so far"), "on its way" = `withdrawal_pending`, "ready to move" = `available`; "paid out"
(money that left the balance for Whop and the bank) is not in CR's API (no tool lists withdrawals), so it is "not
available", never worked out as paid minus balance. "Still earning" = the `pending` payouts.

**The period and the total.** One period for the whole card: the 30 days `[to − 29, to]` where `to` is the Monthly
card's `through` (§27.2) over every money place with no filter (YouTube, and Facebook once verified), so the YouTube row
equals the Monthly number when YouTube is the only money place; with no platform money stored, `to` is today (UTC) and
the line says "the last 30 days". Platform rows sum their `REVENUE#{platform}#{day}` rows in the period (as §27.2 does),
Content Rewards sums `paidByDay` over the days of the period. The total adds only `number` rows, **per currency**,
biggest first, and names the places in it. CR money is currency `USD` (CR's `usd`, upper-cased: a code spelling,
never a conversion) and its cents become micros on the server (× 10,000, a unit change). All arithmetic is on the
server; the web only formats (`noGuesses`, §27.9).

**Where each number comes from** (what each place's API gives an app about the owner's own money; checked 21 Nov 2026):

| Place | What its API gives | Shown as | Official source |
|---|---|---|---|
| YouTube | Analytics `estimatedRevenue` per day (USD by default; adjusted at month end), with the scope `yt-analytics-monetary.readonly` (§25.4) | `number`, "YouTube says", "YouTube's estimate" | https://developers.google.com/youtube/analytics/metrics (Revenue metrics); §25.3 |
| Facebook | Page insights `content_monetization_earnings` (§25.3), shown only once `config/monetization.json` `facebook.moneyVerified` is `true` (it is `false`) | `coming_soon`, later `number` "Meta says", "Meta's estimate" | https://developers.facebook.com/docs/graph-api/reference/insights; ADR-47 |
| Instagram | no money metric: user insights are reach, views, likes, comments, shares, saves, follows and audience only | `not_available`; "Look in Instagram: Professional dashboard, then Payouts." | https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights |
| TikTok | `GET /v2/user/info/` has follower, following, like and video counts (`user.info.stats`) and profile fields; no earnings, balance or Creator Rewards field | `not_available`; "Look in TikTok: Profile, then Balance." | https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info |
| X | `GET /2/users/me` has no money field (`subscription_type`, `verified_followers_count`, … only). X's reference also lists a `MediaRevenue` object on media for the uploader (scope `media.library.read`) that Clip Factory doesn't read (§39.6) | `not_available`; "Look in X, then Monetization (paid through Stripe)." + "Open X" | https://docs.x.com/x-api/users/get-my-user |
| Content Rewards | `get_my_balance` (`available`, `withdrawal_pending`, `as_of`) and `list_my_payouts` (`paid` net of all fees, `pending`, `reversed`; `paid_at`; integer cents, `usd`) through the owner's sign-in (§38.9); no tool lists withdrawals | `number` "Content Rewards says", "Content Rewards' numbers" | https://docs.contentrewards.com (`mcp-tools.json`, API version 2026-10-01) |

**API** (additive; `GET /v1/money` and `GET /v1/contentrewards/money` don't give per-place sums over one period, so one
small route): `GET /v1/money/everywhere` → `MoneyEverywhere`. Registers the owner like `GET /v1/money`; reads
`MONEYSTATE#`, `REVENUE#{p}#` (YouTube, Facebook), the Accounts, the config and, when `CONTENT_REWARDS=on`, `CRCONN` and
`CRMONEY`; never calls a platform or CR. `money/everywhere.py` `everywhere(cfg, accounts, states, rows, crconn, crmoney,
cr_on, today) -> MoneyEverywhere` is pure. Registered before `GET /v1/money/{platform}/days`.

```ts
type MoneyPlaceId = Platform | "contentrewards";
interface MoneyEverywhere {
  from: string; to: string; periodText: string /* "30 days up to Sat 16 Nov" */; lagNote?: string;
  places: MoneyPlace[];                                    // STATS_ORDER, then contentrewards when switched on
  totals: { currency: string; amountMicros: number; places: MoneyPlaceId[]; tag: string }[];  // biggest first
  notCounted: { place: MoneyPlaceId; state: MoneyPlace["state"] }[]; notCountedText?: string;
  asOf: string;
}
interface MoneyPlace {
  place: MoneyPlaceId; name: string;
  state: "number" | "not_available" | "coming_soon" | "not_set_up" | "needs_ok" | "waiting" | "error" | "sign_in";
  headline: string /* "YouTube says", "Not available from TikTok", … */; amounts: { currency: string; amountMicros: number }[];
  tag?: string; why?: string; note?: string;
  where?: { text: string /* "Look in TikTok: Profile, then Balance." */; button?: { label: string; url: string } };
  button?: { label: string; href: string; external: boolean }; checkedAt?: string;
  cr?: { stillEarningCents: number | null; onItsWayCents: number | null; readyToMoveCents: number | null;
         paidSoFarCents: number | null; lastPaidAt?: string; asOf?: string; movedOut: "not_available" };
}
```

`amounts` is `[]` in every state but `number`. Currencies are upper-case ISO codes. No response carries a token, a raw
body or an internal field. The `button.href` of a setup page is made with its `?back=/money`.

**Content Rewards paid by day** (G, in `contentrewards/money.py`, additive attributes on `CRMONEY`; `_add_paid` and
`_paid` are §38.12 step 4's first read and watermark read):
* `_add_paid` adds each new paid row's amount to `paidByDay["YYYY-MM-DD"]` (its `paid_at` UTC date; `created_at` when
  absent) during the first read, and during watermark reads while `paidByDayDone` is true or a `dayScan` exists.
* The first read's end sets `paidByDayDone: true` with the rest; its stale-scan restart (which resets `paidTotalCents`,
  `paidByCampaign` and `payoutsSeen`) also resets `paidByDay = {}`.
* Owners whose first read finished before this (`firstReadDone` and no `paidByDayDone`): with an empty `paidMark` (the
  first read found nothing) the tick sets `paidByDay = {}` and `paidByDayDone: true` at once, no scan. Otherwise the
  tick creates `dayScan {status: "running", cursor: null, mark: paidMark, days: {}, at}` **before** `_paid` runs in
  that tick, so every row the watermark read adds from then on is newer than `mark` and goes to `paidByDay`, and rows
  at or older than `mark` come only from the scan. The scan: `list_my_payouts {status: ["paid"]}` newest first, at
  most 8 pages a tick, skipping rows newer than `mark`, adding the rest to `dayScan.days`; at the end one write adds
  `days` into `paidByDay` (day by day), sets `paidByDayDone: true` and removes `dayScan`.
* It never touches `paidTotalCents`, `paidByCampaign` or `payoutsSeen`. Until `paidByDayDone` the Content Rewards row
  is `waiting` "Checking Content Rewards…". One entry per day with money (a year of weekly rounds is about 52).
* Golden cases (G, `money_everywhere_cases.json` and `test_cr_poll.py`): the first read alone; a watermark read during
  a day scan (no double count); a watermark read before the scan starts in the same tick; an empty `paidMark`; the
  stale-scan restart; the scan ending across two ticks; YouTube plus Content Rewards giving one USD total.

### 39.3 Does this clip fit the campaign? (the fit check)

**Where it runs** (ADR-63). One pure function in the API, `contentrewards/fit.py` (G), computed every time it is
asked, from stored items only (never CR, the public JSON or the network): `fit(clip, job, campaign, *, stops, places,
conn, posts, crsubs, others, source_kept, remake_on, now, captions=None, chosen=None, tiktok=None) -> CampaignFit`.
Inputs: the `CLIP#` item (duration, captions, checklist, `campaignId`, `remakes`, `remakeOf`), its `JOB#` (`source` with
`url`, `platform`, `channel`, `channelId`, `channelKeys`; `campaignId`; `campaign`; `sourceLanguage`; `createdAt`), the
`CAMPAIGN#` item (`rules`, `uncertain` read as `rules.uncertain` else the item's `uncertain`, as `public_campaign`
does; `logo`, `platformsPaid`, state, membership), `stops` and `places` from A's `gates.stops` and
`gates.upload_places` (and `tiktok_waits`), `CRCONN` (`crLinked`, `stepsDone`, `canSubmit`, status), the clip's `POST#`
items and their `CRSUB#`, `others` (the campaigns of the clip's original and its other copies, for one campaign per
moment), `source_kept` (a copy can get the video), `remake_on` (`CR_REMAKE`), the time, and, at Confirm and in the
captions route, the request's captions (Confirm: `clips.merged_captions(item.captions, patch)`, since Confirm's
captions are a partial update), `chosen` (the places he picked; `None` = every allowed place) and TikTok choices.
`fit.for_clip(deps, user_id, clip_id, now, *, captions=None, chosen=None, tiktok=None) -> ClipFit` loads them. The same
function answers the Review card and clip page, refuses Confirm and Try again, and guards the copy route. The web never
decides a fit; it re-checks only the four items that change on the card while he types or taps (`tags`, `ad`,
`paid_switch`, `places`), with `lib/crFit.ts`, a port checked against G's golden cases.

**Which campaigns.** A campaign clip (`clip.campaignId ?? job.campaignId`, B's `campaign_clip`) is checked against its
own campaign only (one clip, one campaign). A normal clip is checked against every campaign he is in (`in` or
`manual`), newest `inSince` first, at most 10.

**The rules checked** (items in this order; `rule` keys and states are contract; the words are the server's; every
`check` item's fix is `open` "Read the rules" → `/campaigns/{uuid}#rules` unless the row names another):

| `rule` | How | States and words |
|---|---|---|
| `campaign` | the hard stops of `stops` (§38.4, with `overlay_needed`) except `deadline`, `logo_missing`, `no_place`, `tiktok_only` (own rows below) | `no` with the stop's text and fix `open` "Find another campaign" for the stops that send him elsewhere (`ended`, `budget_gone`, `drafts_first`, `sound_needed`, `overlay_needed`, `cap_reached`, `not_accepted`). **Wait** items, `todo` with `fix: null` and the stop's text: `waiting`, `held`, `paused`, and `rules_reading` ("Reading the rules… Look again in a minute."); they pass by themselves and the fit refreshes live. `todo` with a button: `not_checked` ("Connect Content Rewards" → the setup page), `not_joined`, `left` ("Open campaign"), `apply_first` ("Yes, I applied" on the card), `rules_failed` (→ the card's paste box) |
| `soft` | soft stops: `budget_half`, `low_rate`, `not_connected`; `face_needed`, `spoken_needed`, `audience` | `note` with the stop's text for the first three; `check` with the stop's text for the last three (Clip Factory can't see a face, a voice or the viewers). Never asks for "Make clips anyway" here; unaccepted codes are listed in `softCodes` |
| `deadline` | `rules.clipUntil` against today (UTC, like A's gates) | `ok` "Takes clips until 23 Nov." · `note` "Today is the last day FaZe Clips takes clips." · `no` "FaZe Clips stopped taking clips on 23 Nov." fix `open` "Find another campaign" |
| `length` | `clip.durationSec` against `lengthMinSec`/`lengthMaxSec` (a minimum learned from a `too_short` answer counts, §38.9) | `ok` "42 seconds. FaZe Clips takes 15 to 60." · `no` "This clip is 72 seconds. FaZe Clips takes 15 to 60 seconds." fix `new_clips`. No length rule: not listed |
| `places` | `places` (paid ∩ ready ∩ not `crLinked: false`, TikTok after its audit) ∩ `chosen` | `ok` "Goes to YouTube and Instagram. FaZe Clips pays for both." · `todo` (no place yet, one can be set up) "Set up YouTube first. FaZe Clips pays for YouTube." fix `open` "Set up YouTube" · `todo` A's `no_place` with no `platformsPaid` "I can't tell where FaZe Clips pays yet. Tap Check now." fix `open` "Open campaign" (→ the card) · `no` for `tiktok_only` (its stop text) · `note` per paid place left out: "Instagram pays too. Set it up to earn there as well." (fix `open`), TikTok before its audit: §38.5's TikTok line |
| `place_link` | per place in `places`: `crLinked` absent and `ready-socials` not in `stepsDone`; per paid place left out as `crLinked: false` | `check` "I couldn't check that Content Rewards knows your YouTube account. Look under **Accounts** there." fix `open` "Open Content Rewards settings" (new tab) · `note` "Content Rewards doesn't know your Instagram account. Add it there, then tap I added it." (the "I added it" of §38.5). Absent and the step done, or `true`: not listed |
| `tags` | every caption of every place in `places` (GET: `clip.captions`; the card: its text; Confirm: the merged captions) has each item of B's `campaign_caption.required_items(rules)` by B's own match (a whole `#`/`@` token, case-insensitive; a phrase with spaces folded; `_has`, made public as `has_item`) | `ok` "Every caption has #FaZe and @FaZeClan." · `fix` "The X words are missing #FaZe. I'll put it back when it uploads." fix `captions` "Fix it for me" |
| `ad` | every caption passes B's disclosure-first rule (`_ad_first`, made public as `ad_first`: an `#ad`-like tag, or the brand's own one, in the first `DISCLOSURE_WINDOW` characters; YouTube: the description) | `ok` "#Ad is at the start of every caption." · `fix` "#Ad isn't at the start of the Instagram words. I'll put it there when it uploads." fix `captions` "Fix it for me" |
| `paid_switch` | per place: YouTube and X are turned on by the publisher (§38.14); TikTok needs Branded content in the card's TikTok choices (Confirm: `tiktok.brandContent`) | `ok` "Paid promotion goes on for YouTube and X." · `fix` "Branded content is off on TikTok." fix `tiktok_branded` "Turn on Branded content" · `note` Instagram and Facebook: "Instagram doesn't let apps turn on Paid partnership. #Ad and the words on the video tell viewers." |
| `logo` | `campaign.logo.needed` | the clip's checklist item `logo` passes → `ok` "The FaZe logo is on the whole clip." (whatever the campaign's logo is now). Else: the campaign has a ready logo → `remake` "The FaZe logo isn't on this clip." fix `remake`; no ready logo → `todo` "Add the FaZe logo on the campaign page first." fix `open` "Open campaign" (→ the card) |
| `on_screen` | a campaign clip: the checklist item `disclosure` passes; a normal clip: never has it | `ok` "“Paid partnership” shows for the first 3 seconds." · `remake` "“Paid partnership” isn't on the video." fix `remake` (a normal clip always gets this one) |
| `source` | `job.source` against `rules.sourceVideos` and `allowedSources`. Exact facts only can say no: a link not in `sourceVideos` (by `links.normalize_post_url`) while `campaignProvidedOnly` is on (A's `prepare` rule), or `source.platform` ruled out by the `youtube`/`twitch`/`kick` flags when any is set. Channels by the agent's own rule (`sources.from_allowed_channel`, ported to `fit.channel_matches`) over `source.channelKeys` when present (written by I: `sources.channel_keys(info)`), else `channel`/`channelId` | `ok` "From FaZe's YouTube." / "From a FaZe Clips video." · `no` "FaZe Clips only pays for clips of its own videos." / "FaZe Clips doesn't pay for clips of Kick videos." fix `new_clips` · `check` for a channel that doesn't match: "This video may not be from FaZe's channels. FaZe Clips only pays for those. Look yourself." (it never blocks: §38.13 lets the job go on and the owner decides) · `check` (a video file, no channel known, or `allowedSources.notes`) "I couldn't check where this video is from. FaZe Clips wants clips from FaZe's channels. Look yourself." No source rule: `ok` "Any video is fine for FaZe Clips." |
| `language` | `rules.language` (free text) against `job.sourceLanguage` (BCP 47 from Transcribe, written by I) through one fixed table: English en, Spanish es, Portuguese pt, French fr, German de, Italian it, Japanese ja, Korean ko, Hindi hi, Arabic ar, Turkish tr, Russian ru. The rule text is matched case-insensitively, as whole words, against every name and code; any language it lists passes | `ok` "In English." · `no` "This clip is in Spanish. FaZe Clips wants English." fix `new_clips` · `check` (no `sourceLanguage`, a language not in the table, or a rule text that names none of them) "I couldn't check the language. FaZe Clips wants English." |
| `banned` | `rules.bannedContent` not empty: a campaign clip's checklist item `campaign_rules` (the agent judged it against the campaign's rules, §38.13); a normal clip was never judged | `ok` "No swearing or gambling. Checked." · `no` the item's own note ("Shows gambling at 0:12.") fix `new_clips` · `check` (a normal clip, or the review never came back) "I couldn't check: no swearing or gambling. Look yourself." |
| `spoken` | `disclosure.spoken` | `check` §38.13's sentence |
| `uncertain` | each `uncertain` line, and for a normal clip each `rules.otherRules` line (a campaign clip's are judged in `campaign_rules`); at most 5 together, then "and 3 more on the campaign page" | `check` "I couldn't check: {line}. Look yourself." Never shown as a pass |
| `brief_only` | `coverImageRequired`, `layoutNotes`: rules Clip Factory doesn't carry out (`overlayRequired` is the hard stop `overlay_needed`) | `check` "I couldn't check: the brand's cover picture." / "I couldn't check: {layoutNotes}." |
| `posted` | a `posted` or `posting` Post of this clip with no `campaignId` (a normal clip already up) | `remake` "This clip is already up on YouTube. Content Rewards only takes a post sent in its first 30 minutes." fix `remake` (the copy is a new post) |
| `one_campaign` | another campaign owns this clip or its moment: `clip.campaignId`/`job.campaignId`, a Post or `CRSUB#` of the clip, `clip.remakes`, or (for a copy) its original's other copies name another campaign. Entries whose job failed, was canceled or deleted, or whose clip was declined don't count | `no` "This clip is for Valorant Clips. One clip can earn on one campaign only." fix `new_clips` |
| `send` | `CRCONN` connected with `canSubmit`, membership `in`, `idMatch` not `ambiguous` | `note` "After it posts, Clip Factory sends it to Content Rewards by itself." · else "After it posts, send its link to Content Rewards within 30 minutes. I'll remind you." |

A `remake` item becomes `no` with fix `new_clips` when the source can't be had again ("This video is gone from Clip
Factory. Make new clips for this campaign.": `source_kept` false, below) and, while `CR_REMAKE` is off, "Clip Factory
can't make a FaZe Clips copy yet. Make new clips for this campaign.".

**Verdict, upload and copy.** In this order: any `no` → `doesnt_fit`; else any wait item (`todo` with `fix: null`) →
`wait`; else any `remake`, `todo` or `paid_switch` `fix` → `fixable`; else any `check` → `cant_tell`; else `fits`.
`tags` and `ad` `fix` items, `note` and `ok` never change it (the publisher puts tags and #Ad back, §38.14).
`canUpload` (the campaign way may go up now): no `no`, `remake` or `todo`, and no `paid_switch` `fix` (TikTok must have
Branded content; B refuses it otherwise). `canRemake`: `CR_REMAKE` on, `source_kept`, no wait item, and no `no` or
`todo` among the items a copy can't change (`campaign`, `deadline`, `length`, `places`, `source`, `language`,
`one_campaign`, and `logo` while the campaign has no ready logo); a copy re-does `tags`, `ad`, `logo`, `on_screen`,
`banned` and `posted`. `softCodes`: the soft stops shown that he hasn't accepted (`anyway`), sent with the copy.

| Verdict | Headline | Then | The screen's one vermilion |
|---|---|---|---|
| `fits` | "Can earn on FaZe Clips" (green, a check mark, never colour alone) | the `send` note; any `tags`/`ad` line with an optional glass "Fix it for me"; the `ok` items folded under "See what's right (7)" | Upload |
| `fixable` with a `paid_switch` fix | "Almost ready for FaZe Clips" | "Branded content is off on TikTok." and its own green "Turn on Branded content" | Upload, off, with "Turn on Branded content for TikTok first." |
| `fixable` with `remake` | "FaZe Clips needs a copy of this clip" | the items | "Make a FaZe Clips copy" (Upload is off: "Tap Make a FaZe Clips copy first.") |
| `fixable` with `todo` | "One thing first for FaZe Clips" | the first `todo` item | its button (Upload is off, with the item's words) |
| `wait` | "Wait a little for FaZe Clips" | the wait item's text, then "Keep it here. Upload turns on by itself when it can go." | none of its own: Upload stays the vermilion, off, with the wait item's words; "Throw away" stays glass |
| `doesnt_fit` | "This clip can't earn on FaZe Clips" | the `no` items | "Make new clips for this campaign" (or the item's own "Find another campaign"); Upload is off: "This clip can't earn on FaZe Clips."; "Throw away" stays glass |
| `cant_tell` | "Check 2 things, then upload" ("Check 1 thing, then upload") | "I couldn't check these:" and the `check` items, one glass "Read the rules" per different page (not one per line), and the green "I read them. They're OK" | Upload |

"I read them. They're OK" is his own answer, kept on this device only (`localStorage["cf-cr-checked"]`: key
`{clipId}:{campaignId}`, value the `check` items' texts; at most 200 keys; every read and write in try/catch). After it
the headline is "You checked these for FaZe Clips" and the lines fold under "You checked this (2)", never as a Clip
Factory tick; new or changed `check` lines open the block again. It changes nothing on the server, `canUpload` or the
verdict, and is never needed to upload.

Items show problems first (`no`, `todo`, `remake`, `fix`, `check`, `note`), then the `ok` ones folded. Each line is at
most one short sentence (§38.1); brand text in an item is plain escaped text (§38.1).

**The fixes** (each fix has its own button; none of them is needed for a tag or #Ad, which the upload puts back):

| `fix.kind` | Button | What happens |
|---|---|---|
| `captions` | glass "Fix it for me" (optional) | the web sends the card's current captions to `POST /v1/contentrewards/fit/captions`; the API runs B's `campaign_caption(platform, text, campaign_options(rules))` per platform (the disclosure first, every required item, inside each limit) and returns them; the card's caption text becomes that; an 8 s toast "Fixed: #Ad and #FaZe are back." with Undo restores the card as it was. The publisher does the same again at upload (§38.14) |
| `tiktok_branded` | green "Turn on Branded content" (TikTok's words; never folded into another button) | the card applies D's `campaignTikTokChoices` (Everyone, Commercial content on, Branded content ticked); this tap is the owner's own action (§17.8); toast "Branded content is on for TikTok." |
| places | none | the Upload to chips of a campaign clip only offer `uploadPlaces` (§38.5): a place the campaign doesn't pay for is never ticked |
| `remake` | "Make a FaZe Clips copy" (vermilion on a campaign clip's block, glass on the "could earn" line) | `POST /v1/contentrewards/campaigns/{campaignId}/remake {clipId, macFetch?, campaignAnyway?}` (below); the card says "Making a FaZe Clips copy… It shows here in about 3 minutes." and the copy arrives right below the clip it came from, which stays as it is |
| `new_clips` | "Make new clips for this campaign" | opens the campaign way: `/?campaign={uuid}&link={job.source.url}` only when the failing item is `length`, `banned`, `posted` or `one_campaign` and the job is a link job; otherwise (`source`, `language`, a video file) `/?campaign={uuid}` with the link box empty, where the campaign's rule lines (§39.1: `sourceRuleText`, `languageRuleText`) say what to pick |
| `open` | the item's label | the item's page: the campaign card (`#rules` for "Read the rules"), a setup page (the web adds `?back=`), Content Rewards settings or campaign (new tab, `rel="noopener noreferrer"`) |

Length, source, language, banned content, the deadline and another campaign are never fixed on this clip: their fix is
`new_clips` (or "Find another campaign").

**Review card and clip page, campaign clips** (H, `screens/review/CampaignFit.tsx`, `data-help="cr-review-strip"`, also
`cr-fit`): the block replaces D's strip at the top of the card: "Campaign clip · **FaZe Clips**" (the name links to the
card), the verdict headline and its lines, the buttons of the table above. Upload follows `canUpload` after the web's
four live items; the screen keeps one vermilion. The clip page (`ClipPerformance.tsx`, `ClipFit.tsx`) shows the same
block while the clip waits in Review; after it posts, the §38.6 post lines take over.

**Normal clips: the "could earn" line** (H, `screens/review/FitSuggestion.tsx`, `data-help="cr-review-strip"`, also
`cr-fit-suggest`). `ClipFit.suggestion` is the first campaign whose fit has `canRemake` true and a `source` item `ok`
(the same creator or an allowed source, not just "can't tell"); null otherwise. Only then, and only while the clip
waits in Review, one quiet glass line sits under Checks before posting: "This clip could earn money on FaZe Clips." ·
"I'd make a copy with its logo, “Paid partnership” and #Ad. This one stays as it is." · when the fit has `softCodes`,
the first one's text ("Half the money is used. Post soon.") · glass "Make a FaZe Clips copy" (sends `campaignAnyway:
softCodes`: that tap is his acceptance, like "Make clips anyway") · quiet "Not now" (hides it for that clip on this
device: `localStorage["cf-cr-not-now"]`, at most 200 clip ids, every read and write in try/catch). Upload stays the
vermilion and the 2-tap upload is untouched. After the tap: "Making a FaZe Clips copy… It shows here in about 3
minutes."; when the copy is in Review: "The FaZe Clips copy is ready, right below. Upload the copy to earn money. You
can throw this one away." The clip page also has, closed by default and only when he is in a campaign, "Can it earn on
your campaigns?" with one line per campaign (its headline and first reason). With no campaign, CR switched off (503) or
an API before G (404), nothing shows: the card is origin/main's.

**The copy on Review** (H, `Review.tsx`). The normal way reaches Review at `/review?job={jobId}` ("Go to Review",
`JobDetail.tsx`), which keeps only clips of that job; the copy is a clip of a new job. So on `/review?job=X` Review also
keeps a clip whose `remakeOf.jobId === X` and places it right after its original: the `waiting` filter becomes
`c.status === "review" && (!jobId || c.jobId === jobId || c.remakeOf?.jobId === jobId)`, the load (and the reload after
a live gap) also lists the Review clips of every job named in the job's clips' `remakes` (at most 10 jobs), and a live
`clip` event of a copy not in the list is fetched with `getClip` as today and kept when its `remakeOf.jobId` is X.
`/review` (no job) shows it anyway. Nothing changes for a job with no copies.

**Server side.**
1. **Confirm** (`POST /v1/clips/{clipId}/confirm`, B's `routes/clips.py`) for a campaign clip, after B's §38.14 checks
   and only when `CONTENT_REWARDS=on`: `fit.for_clip(…, captions=merged, chosen=body.platforms, tiktok=body.tiktok)`;
   any `no`, `remake` or `todo` → 409 `conflict` "This clip can't earn on FaZe Clips: {the first such item's words}" (a
   wait item: "Not yet for FaZe Clips: {its words}"); the same in `_try_again` (Try again, Post now). A clip without a
   campaign never calls the fit (Confirm unchanged).
2. **Release** (`release.release_waiting`, §33.6, called by the OAuth callback and `cf-prod-hooks`): a
   `pending_integration` post with a `campaignId` is not restarted when its account comes back; it waits for Post now
   (the Library's, §33.6), which goes through `_try_again` and the fit gate, so a campaign post never goes up days
   later after the campaign ended or was held. Finishing a start that did not go through (a `queued` post,
   `publishState: pending`) is unchanged: Confirm checked the fit moments before.
3. The **copy route** refuses with 409 and the first blocking item's words when `canRemake` is false, so the campaign
   way can't be chosen for a clip that would not get paid.
4. `POST /v1/jobs` keeps A's §38.5 checks.

**The copy (remake).** `POST /v1/contentrewards/campaigns/{campaignId}/remake {clipId, macFetch?, campaignAnyway?}` (G):
503 `unavailable` "Coming soon." while `CR_REMAKE` is off; 404 for an unknown clip or campaign; 409 when `canRemake` is
false; 409 with the soft stop's text when a code of `softCodes` is not in `campaignAnyway` (A's `prepare` rule, the same
as `POST /v1/jobs`); otherwise:
1. **Reserve first.** Read the original clip; `SET remakes.#c = {jobId: <new id>, at}` with the condition
   `attribute_not_exists(remakes.#c)`, or that the stored entry is the one just read and names a job that failed, was
   canceled or deleted, or a declined clip (the map made first with a conditional `SET remakes = :m` when missing). A
   failed condition answers `200 { job }` with the job already named (a double tap makes one copy).
2. **Make the job** the way `POST /v1/jobs` makes one (`routes/jobs.py` `start_job`, a pure refactor shared with
   `create`): the original job's `source`; for a link job a new `macFetch = macfetch.new_map(up=body.macFetch)` (never
   the original's map, which names its own `mac-{jobId}` file and state); its `notes`; `clipTarget {min: 1, max: 1}`;
   `campaignId` (A's `contentrewards.jobs.prepare` runs: stops, the rules snapshot, the logo copy, `campaignAnyway`);
   the original's `sourceLanguage`; public `remakeOf {clipId, jobId}` and internal `remake {clipId, jobId, sourceStart,
   sourceEnd, layout, momentType, hook, pickedFor, sourceKey}`. `sourceKey` is the original's kept video, found by a
   HEAD: `jobs/{remake.jobId}/source/video.mp4`, else `uploads/{u}/mac-{remake.jobId}/video.mp4`; when both are gone a
   link job fetches the link again (`sourceKey` absent) and a video file answers 409 "This video is gone from Clip
   Factory. Make new clips for this campaign." If making the job fails, the reservation is removed (a conditional
   REMOVE on that `jobId`) and the error is answered. `202 { job }`.
3. Nothing else on the original changes.

`source_kept` (for `canRemake`, without a HEAD): a link job, or a video file or Mac-fetched job whose `createdAt` is
less than 13 days ago (the 14-day rule of §7, with a day to spare). The agent (I), for a job with `remake`: resolve as
today (the channel check, the campaign logo); with `sourceKey`, the moment is cut from that file and nothing is fetched;
the words from `jobs/{remake.jobId}/source/words.json` while they are kept (then no full-audio download and no picture
prep; else transcribe as today); no analyze, watch or select: one moment from `remake`, then cut, render with the
campaign band, logo and disclosure (§38.13), captions with the campaign's tags and #Ad, the full checklist
(`campaign_rules` judged), and one Clip with `campaignId` and `remakeOf {clipId, jobId}` (from `remake`). A job
without `remake` is byte for byte today's. Every job also gets `sourceLanguage` (the Transcribe `LanguageCode`, written
once at transcribe; from `meta.json`'s `language` when transcribe is skipped, "Used the words from last time"; public)
and `source.channelKeys` (`sources.channel_keys(info)`, written in `_resolve_link` with the other source fields).

**API** (G; under `/v1/contentrewards`, so §38.8's 404/503 rule hides everything on an older or switched-off API):

| Method & path | Body | 2xx response |
|---|---|---|
| GET `/v1/contentrewards/fit` | query `clipId`, or `clipIds` (≤ 20, comma-separated) | `ClipFit`, or `{ "clips": ClipFit[] }` (items only; `Cache-Control: no-store`) |
| POST `/v1/contentrewards/fit/captions` | `{ "clipId", "campaignId", "captions": Captions }` | `{ "captions": Captions }` (400 for a clip that isn't a campaign clip of that campaign or isn't in Review) |
| POST `/v1/contentrewards/campaigns/{campaignId}/remake` | `{ "clipId", "macFetch"?: boolean, "campaignAnyway"?: string[] }` | `202 { "job": Job }` new, `200 { "job" }` already made (above) |

```ts
type FitVerdict = "fits" | "fixable" | "wait" | "doesnt_fit" | "cant_tell";
type FitState = "ok" | "fix" | "remake" | "todo" | "no" | "check" | "note";
type FitRule = "campaign" | "soft" | "deadline" | "length" | "places" | "place_link" | "tags" | "ad" | "paid_switch"
  | "logo" | "on_screen" | "source" | "language" | "banned" | "spoken" | "uncertain" | "brief_only" | "posted"
  | "one_campaign" | "send";
interface FitFix { kind: "captions" | "tiktok_branded" | "remake" | "new_clips" | "open"; label: string;
  href?: string; external?: boolean }
interface FitItem { rule: FitRule; state: FitState; text: string; fix: FitFix | null; platform?: Platform }
interface CampaignFit {
  campaignId: string; campaignName: string; verdict: FitVerdict; headline: string;
  canUpload: boolean; canRemake: boolean; items: FitItem[];            // problems first, then ok
  softCodes: string[];                                                   // unaccepted soft stops, for the copy
  required: { disclosure: string; tokens: string[]; phrase: string | null };   // for the card's live check
  uploadPlaces: Platform[]; checkedAt: string;
}
interface ClipFit {
  clipId: string; mode: "campaign" | "normal"; fits: CampaignFit[];   // campaign: exactly one
  suggestion: { campaignId: string; name: string } | null;
  remakes: Record<string, { jobId: string; at: string }>;
}
```

`Job` gains public `remakeOf?: { clipId: string; jobId: string }`, `sourceLanguage?: string` and `source.channelKeys?:
string[]` (no screen shows it); `Clip` gains public `remakes?` (as above) and `remakeOf?: { clipId: string; jobId:
string }` (the same shape as the job's). `remake` on the job is internal (added to `jobs.INTERNAL_FIELDS`). The public
Campaign gains `sourceRuleText: string | null` and `languageRuleText: string | null`, and `CampaignSummary` gains
`nextStepKind` (the `kind` of `nextStep`), all made in `contentrewards/campaigns.py` (G).

**Live refresh.** No new live type. The web fetches the fit again (debounced 1 s) on any `contentrewards` event, a
`clip` event of this clip or of a clip whose `remakeOf.clipId` is it, a `post` event of this clip, and a `setup` event;
caption edits and TikTok taps re-run only the four live items locally. A wait item clears by itself this way.

**Data** (additive only: no new sort key, index, table, bucket, secret or Lambda; every write an UpdateItem of new
attributes):

| Item | New attributes |
|---|---|
| `JOB#{jobId}` | `remakeOf` (public, G), `remake` (internal, G), `sourceLanguage` (public, I; G copies it onto a copy), `source.channelKeys` (public, I) |
| `CLIP#{clipId}` | `remakes` (public map `campaignId → {jobId, at}`, G), `remakeOf` (public `{clipId, jobId}`, I) |
| `CRMONEY` | `paidByDay` (map day → cents), `paidByDayDone`, `dayScan` (internal) (G) |
| api env | `CR_REMAKE` from Terraform `cr_remake_enabled` (bool; shipped **default `false`**, `true` in `envs/prod` since PR #93), an in-place env change; the plan replaces and deletes nothing that holds the owner's data |

### 39.4 Who builds what (after A `feature/cr-api` and D `feature/cr-web` have merged)

| Builder | Owns |
|---|---|
| G api | `api/src/clipfactory_api/contentrewards/fit.py` and `remake.py` (new), `contentrewards/money.py` (`paidByDay`, the day scan), `contentrewards/gates.py` (`?back=` on the `connect` button and the `not_connected` `fixHref`; the hard stop `overlay_needed`), `contentrewards/campaigns.py` (`nextStepKind`, `sourceRuleText`, `languageRuleText`), `contentrewards/submissions.py` (the "add" words of §39.1 change 15), `platforms/campaign_caption.py` (`has_item` and `ad_first`: public names for `_has` and `_ad_first`, behaviour unchanged), `routes/contentrewards.py` (the three §39.3 routes), `routes/__init__.py` (their rows and `GET /v1/money/everywhere`), `routes/clips.py` (the fit gate in `confirm` and `_try_again`), `release.py` (campaign posts wait for Post now), `routes/jobs.py` (`start_job`, a pure refactor), `jobs.py` (`remake` internal, `remakeOf` public), `clips.py` (`remakes` public), `money/everywhere.py` (new, with the where line), `routes/money.py` (the route), `infra/modules/api/{main.tf, variables.tf, tests/api.tftest.hcl}` and `infra/envs/prod/{main.tf, variables.tf, tests/wiring.tftest.hcl}` (`cr_remake_enabled` only); tests `api/tests/test_cr_fit.py`, `test_cr_remake.py`, `test_money_everywhere.py` (new), `api/tests/cr_fit_cases.py` writing `api/tests/fixtures/{cr_fit_cases.json, cr_fit_live_cases.json, money_everywhere_cases.json, channel_match_cases.json}`, its updates to `test_cr_poll.py`, `test_cr_gates.py`, `test_campaign_posting.py`, `test_release.py`, `test_jobs.py`; and, last, the one-line PR `cr_remake_enabled = true` once G, H and I have merged |
| H web | `web/src/screens/home/{NewJobForm.tsx, CampaignsRow.tsx}`, `screens/review/{Review.tsx, CampaignStrip.tsx, UploadTo.tsx, CampaignFit.tsx (new), FitSuggestion.tsx (new)}`, `screens/clip/{ClipPerformance.tsx, ClipFit.tsx (new)}`, `screens/money/{AllMoney.tsx (new), MoneyDashboard.tsx}`, `screens/settings/setup/{CrSetup.tsx, CrConnect.tsx, SetupPlatform.tsx (only `?back=`)}`, `screens/campaigns/{NextStep.tsx, bits.tsx, CampaignsPage.tsx, CampaignPage.tsx (only `id="rules"` and scrolling to it)}`, `components/CrPostLine.tsx`, `setup/{contentrewards.ts, types.ts}` (the §39.1 words; `CrStep.lead?`, `CrStep.doneLabel?`), `lib/{crFit.ts (new), backLink.ts (new), contentRewards.ts}`, `api/{index.ts, types.ts}`, `api/mock/{fit.ts (new), moneyEverywhere.ts (new), contentrewards.ts, index.ts}`, `styles/contentrewards.css`, `docs/SETUP_POSTING.md` (only the words of its "## Content Rewards" section that name `CR_GUIDE` steps and buttons, so `setup-docs.test.ts` passes alone); tests `web/test/{crFit.test.ts, allMoney.test.tsx, twoWays.test.ts, backLink.test.ts}` (new), `web/e2e/flows.ts` (new: `NORMAL_HOME_CONTROLS`, `NORMAL_REVIEW_CONTROLS`, `tap()`), `web/e2e/{two-ways.spec.ts, cr-fit.spec.ts, all-money.spec.ts}` (new), updates to `content-rewards.spec.ts`, `money-dashboard.spec.ts`, `review-card.spec.ts`, `screenshots.spec.ts` (`review-fit`, `money-all` at 375 and 1440), `noGuesses.test.ts`; the generated files (its `CR_GUIDE` words reach Ask's knowledge) |
| I agent | `agent/src/clipfactory_agent/pipeline.py` (the `remake` path with `sourceKey` and the kept words, `sourceLanguage` from Transcribe or `meta.json`, `source.channelKeys` in `_resolve_link`), `store.py` (`remakeOf {clipId, jobId}` on the clip, `sourceLanguage` and `source.channelKeys` on the job), `remake.py` (new: the one moment from `job.remake`); tests `agent/tests/test_remake.py` (new), the byte-identical cases in `test_agent.py`, and its channel cases reading `api/tests/fixtures/channel_match_cases.json` when present |
| J docs and help | `web/src/features/help/{helpKb.json, helpEvals.json}`: new guides `cr-two-ways` "Normal clips or campaign clips?", `cr-fit` "Can this clip earn on my campaign?", `cr-fix-it` "What does Fix it for me do?", `cr-make-it-for` "Make a campaign copy of a clip", `money-everywhere` "How much did I earn everywhere?", `money-not-available` "Why does it say Not available from TikTok?", and the §39.1 words in `cr-setup` and `cr-make-clips`, one eval question each, highlighting only anchors already on main (`cr-review-strip`, `money-dash`, `cr-money`, `cr-setup-card`, `cr-connect`, `cr-make-clips`, `make-clips`, `use-my-settings`); `docs/{UX_DESIGN_SYSTEM.md, TESTING.md, AGENT.md, ARCHITECTURE.md, BUSINESS_REQUIREMENTS.md}`; the generated files. Merge it after H (its words describe H's buttons); its CI passes alone |

* **Shared contracts nobody changes alone**: the names list (§39.1); the three routes, `GET /v1/money/everywhere` and
  every type of §39.2–§39.3; the `rule` keys, states, verdicts and `fix.kind` values; the server-made words (H's mock
  copies them); `job.remake`, `remakeOf`, `remakes`, `sourceLanguage`, `source.channelKeys`, `paidByDay`,
  `nextStepKind`, `sourceRuleText`, `languageRuleText`; `CR_REMAKE`; the anchors `money-everywhere`, `cr-fit`,
  `cr-fit-suggest` (H adds them; the fit block and the line also keep `cr-review-strip`; `cr-make-clips` moves to the
  strip at `/?campaign=`); the `?back=` rule; the golden case files (G writes them; H's Vitest and I's tests read them
  when present).
* **Any order**: H hides the fit block (D's strip stays), the line and All your money while their routes answer 404
  (before G) and keeps every §38.8 404/503 rule; before G, H's Campaigns row falls back to `membership in/manual &&
  hardStops === 0` (D's `clippable`) when `nextStepKind` is absent, and hides the rule lines when their texts are
  absent. G's copy route answers 503 and `canRemake` is false until the switch, which waits for I. Before I,
  `sourceLanguage` is absent and `language` says "I couldn't check"; `fit.channel_matches` uses `channel`/`channelId`
  without `channelKeys`; before G, I's `remake` path is never used. Generated files: a PR that changes their sources
  runs `node web/scripts/help-corpus.mjs --write-docs` and `node web/scripts/ask-knowledge.mjs`; on a conflict take
  main's copy and run both again.
* No builder imports another's new code: H reads the API by its shapes, I reads `job.remake` from the job item, G reads
  `sourceLanguage` and `channelKeys` from the job item. A's and B's code (merged) may be imported by G.
* Commits end with the paragraph "Area: Content Rewards".

### 39.5 Tests (offline, fakes only; no AWS, no CR, no network)

* **Click counts (H, Playwright, mock mode, `web/e2e/two-ways.spec.ts`)**, at 375×812 and 1440×900, through one
  counting helper `tap()` in `web/e2e/flows.ts` (every click and key press that acts goes through it; a test fails as
  soon as the count is over):
  * **Normal way, frozen.** With the CR API absent (404), switched off (503) and on with two joined campaigns: Home at
    `/` has exactly the labelled controls of origin/main (`NORMAL_HOME_CONTROLS`: the Source bar's two options, the
    link box, Paste, Clear when it holds text, How many clips' two options, Number of clips only for an exact count,
    Notes, Make clips) and, inside the form, no element with a `cr-` anchor or class and no word "campaign" outside
    Notes' placeholder (D's campaigns row under the form is not part of it); Paste → "Make clips" → "Go to Review" →
    "Use my settings" → "Upload to N" uploads in exactly **5** taps, "Make clips" is enabled right after Paste and
    Upload right after Use my settings. The Review card of a normal clip with no fitting campaign has exactly
    origin/main's controls (`NORMAL_REVIEW_CONTROLS`); with a fitting campaign it has exactly two more optional
    controls ("Make a FaZe Clips copy", "Not now") and the same 5 taps still upload without touching them.
  * **Campaign way**: 6 taps from the row chip, the main button reading "Make campaign clips"; a clip with a missing
    tag still uploads in 6; 7 only after he turned TikTok's Branded content off ("Turn on Branded content").
  * **The copy**: on `/review?job=X`, "Make a FaZe Clips copy", then the mock's live `clip` event brings the copy right
    after its original on the same page; "Use my settings", "Upload to 2": 3 taps.
  * **Connect**: from a pasted link with steps 1 and 2 already true for him, 7 taps with the "Yes" shortcut and 8
    without it (`asMacWindow({ crConnect: true })`, the pretend allow page counts 1); from zero, the 9 Clip Factory
    taps of §39.1 up to "Back to FaZe Clips" plus the pretend allow (1) = 10, then the card's next step is "Open
    campaign" (the 10th Clip Factory tap) and the mock's check on the window's return says "You're in!".
  * `web/test/twoWays.test.ts`: `NORMAL_WAY_TAPS = 5`, `CAMPAIGN_WAY_TAPS = 6`, `COPY_TAPS = 3`, `CONNECT_TAPS_DONE =
    7`, `CONNECT_CF_TAPS_FROM_ZERO = 10`, and the names list (no text in the help corpus's screen strings says
    "Content Rewards way", "normal mode", "compatible", "clip type", "upload type", "campaign type", or "I linked it").
* **web (H)**, Vitest: `lib/crFit.ts` against `cr_fit_live_cases.json` when present; every verdict's headline, lines and
  single vermilion (the `wait` one: none of its own, Upload off with the words; `fits` with a missing tag: "Can earn",
  optional "Fix it for me"); Upload on and off by `canUpload`; "Fix it for me" (the captions POST, the Undo toast) and
  "Turn on Branded content" (its own toast); "Read the rules" once per page; "I read them. They're OK" (folds, reopens
  on a changed line, throwing storage, never changes Upload); the line only for `suggestion`, with the soft text and
  `campaignAnyway`, "Not now" with throwing storage; `new_clips` hrefs (with `&link=` only for `length`, `banned`,
  `posted`, `one_campaign`); `backLink.ts` (the six shapes pass, `//evil`, `https:`, other paths and extra keys are
  ignored); `AllMoney` for every state of every place, one total per currency, no amount on a `not_available` row,
  "Nothing to add up yet." with no total, the Total bigger than Monthly's number, Monthly's "Apps only." line, the
  Notes card unchanged, no "See it all" on a `sign_in` row; `noGuesses` over the new files (amounts only formatted).
  Playwright: the campaign way (strip, rule lines, bar only with two campaigns, "Make normal clips instead" → `/`), the
  row chip, the setup page (the shortcut, "I have an account" and "I added them" right under their Open, "Add your
  accounts there", `?back=` → "Back to FaZe Clips", the back button glass while "Content Rewards said no?" waits), the
  Campaigns page not signed in ("Set up Content Rewards" vermilion, join steps glass), the phone campaign card's "Set up
  Content Rewards", the fit block for each verdict, the copy arriving by a live event, the clip page fold, All your
  money (its order on the page); every new screen: no sideways scroll at 320–1920, no edges, targets ≥ 44 px (48 on
  phones), the arrow cursor only, axe contrast light and dark, reduced motion, phone controls bottom right, Ask never
  over the main button.
* **api (G)**, pytest: `cr_fit_cases.json` (each rule × state, the verdict incl. `wait`, `canUpload`, `canRemake`,
  `softCodes`): `held`/`paused`/`waiting`/`rules_reading` are wait items and `canRemake` false; `overlay_needed` is a
  hard stop (`test_cr_gates.py`); a channel mismatch is `check` and never blocks, while a link outside `sourceVideos`
  with `campaignProvidedOnly` and a ruled-out platform are `no`; `channelKeys` used when present
  (`channel_match_cases.json`, shared with I); `language` free text ("English or Spanish", "EN only", none named);
  `logo` `ok` from the checklist even after the campaign's logo was deleted; `no_place` without `platformsPaid` →
  `todo`; `otherRules` as `check` for a normal clip only; `uncertain` read from `rules.uncertain` first; the
  normal-clip campaign list (in/manual, newest first, 10) and the suggestion (needs `source` `ok`); `GET fit` makes no
  CR, public or network call (its fakes have none); the captions route uses `campaign_caption`; Confirm and
  `_try_again`: each blocking state → 409 with its words, the merged captions and `chosen` places used, `tags`/`ad`
  `fix` allowed, a clip without a campaign never calls the fit and gets byte-identical posts; `release_waiting` leaves
  a campaign post waiting and still releases a normal one (`test_release.py`); copy: 503 off, refusals (incl. an
  unaccepted soft stop and the gone video file), the reservation before the job (two calls at once make one job; a
  failed job frees it), the job body (source, a new `macFetch` map from the body, `sourceKey` by HEAD, notes, one
  clip, the snapshot and logo copy, `sourceLanguage` copied, `remake` never in `public_job`), the second call 200;
  `gates.next_step`'s `connect` href with `?back=`; `nextStepKind`, `sourceRuleText`, `languageRuleText`;
  `money_everywhere_cases.json` (each state per place, the where lines word for word, the period equal to the Monthly
  card's, totals per currency, `usd` → `USD`, CR cents → micros, never a $0 for not available) and the `paidByDay`
  cases of §39.2; `terraform test`: `cr_remake_enabled` `false` → `CR_REMAKE = "off"`, `true` → `"on"` (the api module
  defaults `false`; `envs/prod` defaults `true` since PR #93 and still plans with `false`), nothing replaced.
* **agent (I)**: a `remake` job calls no analyze, watch or select, cuts its one moment from `sourceKey` without
  fetching (and fetches the link when it is absent), reuses the kept words without the full-audio download (and
  transcribes when they are gone), renders with the campaign marks, writes captions, the checklist and `remakeOf
  {clipId, jobId}`; a job without `remake` keeps today's prompts and files byte for byte; `sourceLanguage` from
  Transcribe's `LanguageCode` and from `meta.json` when transcribe is skipped; `source.channelKeys` equal to
  `sources.channel_keys(info)`.
* **docs (J)**: `help-corpus.mjs --check` (every highlight is a real anchor) and `ask-knowledge.mjs --check`.

### 39.6 Not verified live

That CR's API has no way to list the accounts added inside Content Rewards or to tell that an account exists (from
`mcp-tools.json` 2026-10-01; if a later version adds one, steps 1 and 2 tick themselves); whether signing in at
`id.contentrewards.com` with a new email makes an account (then step 1 could fold into step 3); that Content Rewards'
sign-up page still offers **Continue with Google** and how many taps Google's own screens take; how many questions
Content Rewards asks after sign-up; that `paid_at` is on every paid payout and is UTC; X's `MediaRevenue` on media (if
it answers for the owner, X could move from "not available" to a number in a later section); that Meta's earnings
metrics still answer (§25.8); whether a brand treats a copy of a moment as a reused edit (Clip Factory allows a moment
on one campaign only, so this can only happen with a clip first posted normally), and whether YouTube treats the copy
and an earlier normal post of the same moment on one channel as reused content (so the line says "Upload the copy …
You can throw this one away."); that a channel mismatch is only "I couldn't check" (a clip from a wrong channel can
still be uploaded the campaign way and be turned down; the rule line under the link box and the `check` line say it);
the language table's coverage; that the agent's `campaign_rules` judgment of banned content is right (a `no` blocks the
campaign upload); that the rules reader sets `overlayRequired` only when a brief really asks for its own overlay
(otherwise `overlay_needed` stops a campaign Clip Factory could serve); the 3-minute copy time.
