## Content Rewards campaigns

Contract: [CONTRACTS.md §38.1](CONTRACTS.md#381-words-and-rules-every-new-screen-follows) and the screens of §38.3–§38.7,
as changed by [§39](CONTRACTS.md#39-content-rewards-the-two-ways-all-your-money-and-does-this-clip-fit-owner-request-2026-11-21)
([UX-19](BUSINESS_REQUIREMENTS.md#ux-19-content-rewards-that-an-8-year-old-can-follow), the steps in
[SETUP_POSTING.md](SETUP_POSTING.md#content-rewards)). The owner's bar: "even an 8 year old should be able to
understand how to navigate it", from setup to joining, to "Am I in?", to getting paid.

- **Where it lives.** No new tab or sidebar item (the phone bar keeps its six tabs). Set up posting keeps its five
  platform cards and "2 of 5 ready"; under them, after a gap (no line), a part "Get paid by brands" with one glass card
  **Content Rewards** (coin icon, a ring over 3 steps, one state line) that opens its own page. The campaigns are on
  `/campaigns` (a paste box on top, then one card per campaign) and `/campaigns/{uuid}`, and Home gets a "Campaigns"
  row of chips like the streamers row. The money is a part at the end of the Money page (`#content-rewards`), and
  its 30 days are a row of [All your money](#all-your-money) at the top.
- **Words.** Short sentences, one action each, at most 26 words a line, words a child knows. **Bold** is always the
  other site's exact label, word for word (Content Rewards', Whop's, YouTube Studio's, Instagram's, Facebook's); a bold
  word is something to tap or type into only when the sentence says "tap" or "type in", and a heading there is
  introduced with "You'll see". Clip Factory's own buttons are in quotes ("tap Paste"), never bold. Where Content
  Rewards' help uses an older name, a hint names it (**Accounts**, help: Connected accounts). Whop's steps add "Whop
  may show this a little differently. Look for the same words." The one exception to plain words is the body of the
  pilot email, written for Content Rewards' team, under **Show more**.
- **One name for each thing** ([§39.1](CONTRACTS.md#391-connect-in-time-order-and-the-two-ways); screens, help
  guides, docs and notifications use only these):

  | Thing | Words |
  |---|---|
  | The normal way | "Make clips" (Home's main button at `/`, as before). Its clips carry no label; only where both ways are named side by side: "normal clips" ("Make normal clips instead") |
  | The campaign way | "Make campaign clips" wherever he starts it from Home (the row chip, and Home's main button at `/?campaign=` only); the campaign card keeps "Make clips for this campaign" |
  | Clips made the campaign way | "campaign clips", one "campaign clip" ("Campaign clips · FaZe Clips" on Home and the job page, "Campaign clip · FaZe Clips" on Review and the clip page, the Library chip "Campaign") |
  | A normal clip that could earn | "This clip could earn money on FaZe Clips." and "Make a FaZe Clips copy"; the new clip is "the FaZe Clips copy" |
  | Putting a social account inside Content Rewards | "add" ("Add YouTube in Content Rewards first.", "I added it", setup step 2's "I added them"); never "link" or "connect" for this |
  | Connect | only Clip Factory and Content Rewards (step 3 "Connect Content Rewards") and each platform's own setup |
  | The site | "Content Rewards", never "CR" on a screen |

  Never on a screen: "the Content Rewards way", "mode", "normal mode", "compatible", "clip type", "upload type",
  "campaign type". Content Rewards' own button names stay bold and word for word (**Connect account**, **Join
  Campaign**).
- **Step cards** are the Set up posting cards: number in a circle, an icon, a title of six words or fewer, 1–4 short
  lines, then only what the step needs: **Open** buttons (the exact https page, a new tab or the system browser),
  **Copy** chips ("Copied!", select-all fallback), "If you see X, do Y" hints, fold-outs (questions that open more
  lines, never numbered) and the step's answer (green, at least 48 px). A step Clip Factory can see ticks itself; a
  step it can't see has an answer button and still ticks itself later. Only the three setup steps are numbered. The
  first step not done is open and scrolled into view; done steps fold to a green tick row. Waiting is never a step: a
  waiting card says "Nothing to do. I'll tell you when you're in."
- **Connect Content Rewards, in time order** (`/settings/posting/setup/contentrewards`, the only place Connect
  happens, [§39.1](CONTRACTS.md#391-connect-in-time-order-and-the-two-ways)), top to bottom:
  0. while steps 1 and 2 are both open, a shortcut card "Already use Content Rewards, with YouTube added there?" (the
     places he connected in Clip Factory, never TikTok; "with your accounts added" when none) with a green "Yes" that
     ticks both and opens step 3. No "No": step 1 is right below.
  1. "Make a Content Rewards account": first line "Have one already? Tap I have an account.", then the vermilion
     "Open Content Rewards" with the green "I have an account" right under it, before the other lines, folds and hints.
  2. "Add your accounts there": first line "Already added YouTube there? Tap I added them.", the vermilion "Open
     Content Rewards settings" with the green "I added them" right under it; its last line "Then come back to Clip
     Factory. Tap I added them."
  3. "Connect Content Rewards" (on a phone "Do this step on your Mac." with no button).
  4. When it's done and the page was opened with `?back=` (a campaign card, Campaigns, Review, a clip page or Money),
     the vermilion is the way back ("Back to FaZe Clips", "Back to your campaigns", "Back to your clip", "Back to
     Money") instead of "Add a campaign", and the result card adds "Next: back to FaZe Clips.". While "Content Rewards
     said no?" waits for "I sent it", "Open email" is the vermilion and the way back is glass. Each platform's own
     setup page reads `?back=` the same way. Only exact same-origin shapes count (`web/src/lib/backLink.ts`).
- **One vermilion button per screen**, always the next step; everything else is glass or green:

  | Screen | The vermilion button |
  |---|---|
  | Content Rewards setup | the first open step's action ("Open Content Rewards", "Open Content Rewards settings", "Connect Content Rewards"; the answers "Yes", "I have an account" and "I added them" are green); while "Content Rewards said no?" is open, "Open email" (Connect turns glass), and after "I sent it" Connect again; when done, the way back when the page has `?back=`, "Connect again" only for a dead sign-in or in the sign-in-again week, "Add a campaign" when nothing else is left; in a desktop browser (or a Mac app that can't update itself) "Get the app" |
  | Campaigns, empty | while Content Rewards is not connected, "Set up Content Rewards" (the part "Then join a campaign" and its Open are glass); once connected, "Open Content Rewards" while the box is empty; "Add campaign" once a campaign link is in it |
  | A campaign card | its next step's one button: "Connect Content Rewards" (with the card's `?back=`; on a phone "Set up Content Rewards"), "Open campaign", "Yes, I applied", "I'm in. Read these rules", "Read these rules", "Add the logo", "Make clips anyway", "Make clips from this", "Make clips for this campaign" or "Find another campaign" (the brand said no); none while it waits or is paused ("Find another campaign" is glass on the other hard stops) |
  | Home at `/` | "Add campaign" when a campaign link is pasted, else "Make clips" (the normal way, as before) |
  | Home at `/?campaign=` | "Make campaign clips"; while the campaign has a hard stop, the button shows the stop's short text and can't be tapped |
  | Review, a campaign clip | by the fit's verdict ([the fit block](#the-fit-block)): Upload, or "Make a FaZe Clips copy", or the first `todo` item's button, or "Make new clips for this campaign" / "Find another campaign" |
  | Review, a normal clip | Upload, as before; the "could earn" line's buttons are glass |
  | All your money | none |
  | A clip's Content Rewards line | "Copy and open" while the clip must be sent by hand (the Mac banner's "Copy and open" is green) |
  | Money's Content Rewards part | none until "Do you see **Finance**?" is answered; then "Move your money to Whop" at $1.00 or more ready, and once after a move "Your money is on Whop. Move it to your bank." |

- **Phones and touch tablets.** The next step's vermilion button of a card is pinned at the bottom right while the
  card is on screen (the thumb zone, as in the [dock](#money-dashboard-and-the-bottom-right-dock)), and Ask's
  launcher keeps clear of it (`data-help-clear`). Steps that need the Mac say "Do this step on your Mac" with no
  button.
- **Glass, no edges.** Cards, chips, tiles, the post line and the Mac banner are glass or soft fills: no borders, rims
  or hairlines, no cursor change (the arrow cursor only). Pick-one bars slide with `Glide`: "Which campaign" on Home at
  `/?campaign=` (only with two or more campaigns that can make clips), "Yes" / "No" for the Finance question.
  Membership, rules and post states are chips with words, never colour alone.
- **The campaign card**, top to bottom: the head (brand picture or a round letter, name, brand, one state chip,
  "Checked 2 min ago" and a glass "Check now" at its right end); the next step as a calm callout with the one
  vermilion button; **Pay** (one row per platform with its mark, Content Rewards' rates, "Money left" over a soft bar
  with a "Plenty left" / "Half used" / "Almost gone" chip); **Rules I'll follow** with a tick each (only what Clip
  Factory carries out); **Things you do** with a hand icon each and no tick; **I couldn't tell** with a question mark
  each; the logo drop box; videos to clip; "Your clips for this campaign"; and a quiet "Remove from Clip Factory" at
  the bottom (8 s Undo). Quiet answers ("It says Submit clip", "It says Not eligible") are small green text buttons,
  each undoable for 8 seconds.
- **The post line** (`CrPostLine`) sits next to the post's own row on the clip page, in Library, on the job page and on
  the campaign card: one sentence per state ("Sent ✓ · Waiting for the brand to check it", "Approved ✓ · 12.3K views
  on YouTube"), buttons glass unless said. The Mac banner (`CrSendNow`, no Web Push in the Mac app) shows the
  send-now line on every other page while a clip waits, reserves its room like the update bar, never covers a
  control and plays no sound.
- **Brand text** (names, briefs, rejection notes) is plain escaped text, never HTML, never a link unless code allowed
  it, at most 300 characters a line with **Show more**.
- **Money.** The same money look as the rest of the Money page: three tiles ("Still earning", "On its way", "Ready to
  move") with a hint each, the tag "Content Rewards' numbers · checked 20 min ago", amounts only formatted, never a
  rate × views. "Checking…" until Content Rewards' whole list was read.
- **Delight and mistakes.** "Content Rewards is connected!", "You're in!" and each money moment get confetti and the
  success sound once (acknowledged on the server); reduced motion skips the
  confetti and the slides; no new sounds. Every Undo is an 8-second toast; every error says what to do next and names
  the button to tap.
- **Not there yet.** When the API has no Content Rewards (404) every card, row, part and link is hidden; when it is
  switched off (503 `unavailable`) the setup card says "Coming soon" with no button, and the Campaigns page and Money
  part say "Content Rewards is coming soon to Clip Factory." The fit block, the "could earn" line and All your money
  stay hidden while their routes answer 404 (the old campaign strip stays), and the copy has its own switch. Both
  switches are on in prod (PR #88 and PR #93); these states show only if one is turned off again.

### The two ways

Contract: [CONTRACTS.md §39.1](CONTRACTS.md#391-connect-in-time-order-and-the-two-ways),
[BR-26](BUSINESS_REQUIREMENTS.md#br-26-normal-clips-or-campaign-clips-two-clear-ways-the-normal-way-unchanged).

- **The normal way is frozen.** Home at `/` is the form it always was (Source bar "Paste a link" / "Pick a video", the
  link box with Paste and Clear, How many clips, Notes, "Make clips", "Nothing gets posted until you tap Upload."): no
  campaign field, bar, chip, line or warning inside it, whatever campaigns exist (the "Your campaigns" row stays
  under the form). The Review card of a clip with no campaign keeps its controls; the only addition is the optional
  "could earn" line when a joined campaign fits. Click-count tests hold it at 5 taps.
- **The campaign way starts from a campaign**, never from a field on the normal form: the row chip "Make campaign
  clips" (a chip whose next step is making clips; every other chip opens the card, and the row's line says "Tap a
  campaign to make clips for it." while any chip says Make campaign clips), the card's vermilion "Make clips for this
  campaign", a campaign video's "Make clips from this", or the fit's "Make new clips for this campaign".
- **Home at `/?campaign={uuid}`**, above the link box: the strip "Campaign clips · **FaZe Clips**" with the line "Clip
  Factory follows its 9 rules on every clip." and, at the strip's right end, a quiet "Make normal clips instead" (to
  `/`); the bar "Which campaign" only with two or more campaigns (no "None"); under the link box the campaign's own
  rule lines when it has them ("FaZe Clips pays only for clips of FaZe's YouTube and Twitch.", "FaZe Clips wants
  clips in English."), its videos and channel chips; the main button reads "Make campaign clips", so he sees which way
  he is on as he taps. The job page's strip says "Campaign clips · FaZe Clips · Following 9 rules".

### The fit block

Contract: [CONTRACTS.md §39.3](CONTRACTS.md#393-does-this-clip-fit-the-campaign-the-fit-check),
[BR-28](BUSINESS_REQUIREMENTS.md#br-28-does-this-clip-fit-the-campaign-know-before-uploading). The server decides the
fit; the card only shows it and re-checks the tags, #Ad, the paid switch and the places while he types or taps.

- **Where.** At the top of a campaign clip's Review card (it replaces the old campaign strip) and on its clip page
  while it waits in Review (`data-help="cr-review-strip cr-fit"`): "Campaign clip · **FaZe Clips**" (the name links to
  the campaign card), the verdict's headline and lines, then its buttons. After the clip posts, the post lines take
  over.
- **Lines.** Problems first (can't, a thing to do, a copy needed, a fix, a check, a note), then the passed ones folded
  under "See what's right (7)". One short sentence each; brand text is plain escaped text. A tick only for a check
  that passed; the verdict always has a mark and words, never colour alone.
- **One vermilion per screen**, by verdict:

  | Verdict | Headline | The vermilion |
  |---|---|---|
  | fits | "Can earn on FaZe Clips" (green, a check mark) | Upload; any tag or #Ad line has an optional glass "Fix it for me" |
  | fixable, the paid switch | "Almost ready for FaZe Clips" | Upload, off, "Turn on Branded content for TikTok first."; the green "Turn on Branded content" is its own button |
  | fixable, a copy | "FaZe Clips needs a copy of this clip" | "Make a FaZe Clips copy" (Upload off: "Tap Make a FaZe Clips copy first.") |
  | fixable, a thing to do | "One thing first for FaZe Clips" | that item's button (Upload off with its words) |
  | wait | "Wait a little for FaZe Clips" + "Keep it here. Upload turns on by itself when it can go." | none of its own: Upload, off, with the wait's words |
  | doesn't fit | "This clip can't earn on FaZe Clips" | "Make new clips for this campaign" (or "Find another campaign"); Upload off |
  | can't tell | "Check 2 things, then upload" | Upload; "I couldn't check these:", one glass "Read the rules" per page and the green "I read them. They're OK" |

  "Throw away" stays glass. "I read them. They're OK" folds the lines under "You checked this (2)" with the headline
  "You checked these for FaZe Clips" (kept on this device only; a new or changed line opens the block again); it never
  changes Upload and is never shown as a Clip Factory tick.
- **Fix it for me** puts #Ad and the campaign's tags back in the card's words at once, with an 8 s toast "Fixed: #Ad
  and #FaZe are back." and Undo; it is never needed (the upload puts them back). "Turn on Branded content" (TikTok's
  words, never folded into another button) is the owner's own tap, with the toast "Branded content is on for TikTok."
- **Normal clips: the "could earn" line** (`data-help="cr-review-strip cr-fit-suggest"`), only when a joined campaign
  fits and a copy can be made, only while the clip waits in Review: one quiet glass line under Checks before posting,
  "This clip could earn money on FaZe Clips." · "I'd make a copy with its logo, “Paid partnership” and #Ad. This one
  stays as it is." · a soft warning's text when there is one · glass "Make a FaZe Clips copy" · quiet "Not now" (hides
  it for that clip on this device). Upload stays the vermilion and the 2-tap upload is untouched. Then "Making a FaZe
  Clips copy… It shows here in about 3 minutes." and, when it is in Review, "The FaZe Clips copy is ready, right
  below. Upload the copy to earn money. You can throw this one away." The copy arrives right after its original on the
  same Review page. The clip page also has, closed by default, "Can it earn on your campaigns?" with one line per
  campaign. With no campaign, or an older api, nothing shows.

### All your money

Contract: [CONTRACTS.md §39.2](CONTRACTS.md#392-all-your-money-in-one-place),
[BR-27](BUSINESS_REQUIREMENTS.md#br-27-all-your-money-in-one-place).

- **Where.** The first card on `/money`, right under the page header and above the Apps chips and period band (the
  band changes only the cards below it), `data-help="money-everywhere"`. A glass card with **no vermilion** button.
- **Top.** "All your money", then "Every place · 30 days up to Sat 16 Nov" (+ "· YouTube is 2–3 days behind" when
  YouTube is in it).
- **Rows**, in the order YouTube, TikTok, Instagram, Facebook, X, then Content Rewards: the place's mark (Content
  Rewards: the coin), its name, its words by state ("YouTube says" · "$12.40" · "YouTube's estimate"; "Not available
  from TikTok" · "TikTok doesn't tell apps what you earn." · "Look in TikTok: Profile, then Balance."; "Coming soon";
  "Not set up yet"; "YouTube needs your OK"; "Waiting for the first numbers"; "Couldn't check today"; "Sign in
  again"), never a number or $0 for a place that doesn't report one, and at most one glass button at the row's right
  end (so on phones nothing tappable sits in the top-left third). Under Content Rewards, its small lines in money's
  time order: "Right now (Content Rewards says, 2:10 pm): Still earning … · Ready to move to Whop … · On its way to
  Whop …", "Earned so far, since you started: …", "Paid out to your bank: not available from Content Rewards. Look on
  Whop: **Balances**." and a glass "See it all" (to `#content-rewards`) only while the row has no button of its own.
- **The total**: "Total: $24.80" (the biggest number on the page; it never counts up), "YouTube + Content Rewards · 30
  days up to Sat 16 Nov", the tag line "YouTube's estimate + Content Rewards' numbers"; two currencies give one line
  each and "Different money, like dollars and euros, is never added together."; then "Not in the total: TikTok,
  Instagram and X (not available) · Facebook (coming soon)." With nothing to add: "Nothing to add up yet." and no total.
- **Numbers.** Amounts are only formatted (`tabular-nums`); all adding is on the server.
