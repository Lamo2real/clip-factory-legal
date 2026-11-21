## 17. Posting setup: a setup list per platform, real Connect, real posting (owner request, 2026-11-16)

The owner's words: *"Facebook, Instagram, YouTube, TikTok and X should each be a step to connect to in order for this
automation to work, to be able to upload to every single one. The steps in each setup should be up to date to today:
whatever the platform requires. The user should not have to write code; only use the Clip Factory app and the
platforms. Really clear, idiot proof, an 8-year-old should be able to do it."*

Model: **bring your own keys.** Each platform needs a developer app that the owner creates once on the platform's
developer website (Clip Factory cannot hold one shared app for everyone). The app guides every click, gives Copy
buttons for every value and a paste box for every key, then connects with OAuth and posts by itself. Steps were
checked against the platforms' docs on **2026-11-16** (research sources in `docs/SETUP_POSTING.md`).
Where this section and an earlier one disagree, this one wins. It **supersedes**: §0 ("integrations arrive in a later
phase"), §5 rows `GET /v1/accounts` and `POST /v1/accounts/{platform}/connect` and type `Account`, §6 row "Account
(later)", §9 rows `cf-prod-hooks`, `cf-prod-clip-flow`, `cf-prod-stats` (env), §14.3 `GET /oauth/{platform}/callback`
(`coming_soon` is gone), §14.5 step 2 (`publish-{platform}` is now a step chain, §17.6), §15.1 Posting › **Accounts**
(merged into **Set up posting**), §16.4 (`graphApiVersion`, `scopes`, new `publish` blocks, §17.7), §16.5 "Phase 1"
(tokens are real now), §16.8 calm-state links (`/settings/posting/accounts` → `/settings/posting/setup/{platform}`).
Order everywhere: **YouTube, TikTok, Instagram, Facebook, X** (`SETUP_ORDER = STATS_ORDER`).

### 17.1 What the owner sees

* **Settings › Posting › Set up posting** `/settings/posting/setup` (first branch of Posting; `/settings/posting/accounts`
  and the old `?account=&status=` links redirect here). Header "Set up posting" + a big ring "**2 of 5 ready**", then five
  big glass cards (platform mark, name, progress ring, one state line: "Ready" / "Step 7 of 23" / "Needs you: connect
  again" / "Not started" / "Works now, posts stay private"). Tap → the platform page. Leaf: "Do each one once. After
  that Clip Factory posts by itself."
* **Platform page** `/settings/posting/setup/{platform}`: mark + name, ring, "About 20 minutes · Free" (X: "Costs a
  little"), "Steps checked on 16 Nov 2026". Then the parts as glass sections, each a checklist of **big numbered step
  cards** (numbers run 1…N across all parts):
  1. **Get ready**: account requirements.
  2. **Make your {Platform} key**: one-time developer-website steps.
  3. **Connect**: one big vermilion **Connect {Platform}** button.
  4. **Go public**: gates (review, audit, live mode, credits) with a plain status line and what to do.
  The first not-done step is open and scrolled into view ("resume where you left"); done steps collapse to a green
  tick row (tap to reopen). Below the parts, a **"When it's done"** panel: account avatar + name, **Check it**,
  **Connect again**, **Disconnect**, plus the platform's apples (YouTube "Who can see your clips"; X spend note).
* **A step card**: number in a circle, a picture-like icon (`Icon` names in the data file), a title (≤ 6 words), 1–4
  short lines (≤ 26 words each, short sentences), one action per sentence, platform button names in **bold** exactly
  as on the platform,
  then (only what the step needs): **Open {site}** (opens the exact page in a new tab, `rel="noopener noreferrer"`),
  **Copy** chips (label + value in mono, one tap copies, leaf-green tick "Copied!", works without clipboard permission via a
  select-all fallback), **paste boxes** (with a Paste button, format check as you type, friendly error under the box),
  an **upload box** (TikTok verification file), "**If you see** X, do Y" hints (for anything the research marks
  uncertain), and **I did this** (green, ≥ 48 px). Auto steps (keys saved, connected, checked) tick themselves.
* **One main vermilion button per screen**: the current step's main action (its **Open** button, else **Save keys**, else
  **Connect {Platform}**, else **Connect again** when `needs_reconnect`). Everything else is green/glass.
* **Connect** runs OAuth **in the same tab**: the page navigates to the platform, the owner approves, the hooks API
  sends them back to `/settings/posting/setup/{platform}?result=…`. `connected` → confetti (§12.4, skipped with reduced
  motion), success sound, a big card "Connected as **@name**" with the avatar, ring fills, toast. Any other result →
  error sound, a calm card with the plain sentence for that result and the step to go back to (§17.5 table), no
  vermilion colour except its one action. The `?result` query is removed with `history.replaceState` after reading.
  In the desktop app (§12.1) the platform opens in the system browser and this page stays, so the Connect spinner
  (`useConnecting.ts`) stops by itself once the platform page has opened: when the account changes (live `setup`
  event), when the owner comes back to the window, or when the page is shown again from the browser's cache (Back).
  While the platform address is still being fetched only an error or an account change stops it.
* **Choose** (Meta with several Pages / Instagram accounts): a picker of big avatar cards; tapping one connects it.
* **Disconnect**: tapping shows an 8 s toast "Disconnecting YouTube… Undo"; the `DELETE` is sent only when the toast
  ends (§12.4: undo instead of a scary dialog). **Connect again** keeps the keys.
* ~~**Home card** "Set up posting · 2 of 5 ready"~~: replaced by the floating setup to-do list (§17.13), which shows
  on every signed-in page, so the owner never sees two competing lists. `screens/home/SetupCard.tsx` is removed.
* **Review › Upload** with TikTok chosen: the **Post to TikTok** sheet (§17.8) must be filled before Upload is enabled.
* Kid-proof everywhere (§12.4): ≥ 48 px targets, nothing overflows from 320 to 1920 px, phone bottom bar / desktop
  sidebar unchanged, click sound on click only, success/error sounds, glass, Green/Bone/Vermilion, Inter + Times.

### 17.2 Step content: one data file per platform (`web/src/setup/{youtube,tiktok,instagram,facebook,x}.ts`)

```ts
// web/src/setup/types.ts
export interface SetupGuide { platform: Platform; name: string; checkedOn: string /* "YYYY-MM-DD"; TikTok "2026-11-21", the rest "2026-11-19" */; minutes: number;
  cost: string /* "Free" | "About 1.5 cents per clip" */; parts: GuidePart[] }
export interface GuidePart { id: "ready" | "key" | "connect" | "public"; title: string; steps: GuideStep[] }
export interface GuideStep {
  id: string;                 // ^[a-z0-9-]{1,40}$, unique per platform; stored server side when ticked
  icon: IconName; title: string; say: string[];            // **bold** = exact platform button/label
  open?: { label: string; url: string };                   // exact page, https only
  copy?: { label: string; value: string | ValueRef }[];    // ValueRef resolved from GET /v1/setup `values`
  paste?: KeyName[];                                       // the paste boxes of this step (§17.4 formats)
  upload?: "tiktok-verification";
  download?: { label: string; href: "/brand/clip-factory-1024.png" };
  ifYouSee?: { see: string; do: string }[];
  auto?: "keys" | "connected" | "checked" | "files";        // ticks itself from server state, no "I did this"
  optional?: boolean;                                       // not counted in the ring
  gate?: GateKey;                                           // this step shows that gate's status line
}
export type ValueRef = { ref: "appName" | "appDescription" | "websiteUrl" | "websitePrefix" | "privacyUrl" | "termsUrl"
  | "dataDeletionUrl" | "redirectUri" | "appDomain" | "hooksDomain" | "scopes" | "ownerEmail" | "xUseCase"
  | "tiktokReviewText" };
```
Rules: the steps below are the content contract (ids and titles exact; sentences may be shortened, never lose a
button name, value or warning). Shared values: `appName` "Clip Factory" (Facebook app: "Clip Factory Pages"),
`appDescription` "Clip Factory turns my gameplay recordings into short vertical clips and posts them to my own
accounts when I press Upload.", `xUseCase` "Post my own short video clips to my own X account and read their view and
like counts in my personal Clip Factory app." Every guide's Get ready part includes `ready-computer` "Use a
computer" ("The developer websites work best on a computer. Use the same browser for every step."; platform extras
below are added lines). `/brand/clip-factory-1024.png` is a 1024×1024 PNG < 5 MB of the app icon (web builds it; no
platform logos in it).

**YouTube** (about 20 min, Free). Get ready:
| id | title | essentials |
|---|---|---|
| `ready-channel` | Have a YouTube channel | Open youtube.com/account; no channel → profile picture › **Create a channel**. Shorts are vertical and ≤ 3 min. A Short over 1 min with copyrighted music gets blocked, so keep music clips under 60 s. |
| `ready-computer` | Use a computer | Sign in to Google with the account that owns the channel. |
Make your YouTube key:
| id | title | essentials |
|---|---|---|
| `key-console` | Open Google Cloud | Open console.cloud.google.com. First time: pick your country, tick the box, **Agree and continue**. No card needed: skip any free-trial offer. |
| `key-project` | Make a project | Open `/projectcreate`. Project name: copy `appName`. Location **No organization**. **Create**. Wait for the bell, then check "Clip Factory" is picked at the top. |
| `key-data-api` | Turn on YouTube Data API v3 | Open `/apis/library/youtube.googleapis.com`, **Enable**. If you see **Manage**, it is on. |
| `key-analytics-api` | Turn on YouTube Analytics API | Open `/apis/library/youtubeanalytics.googleapis.com`, **Enable**. |
| `key-get-started` | Start Google Auth Platform | Open `/auth/overview`, **Get started**. App name `appName`; support email: pick yours. **Next**. Audience **External**. **Next**. Contact email `ownerEmail`. **Next**. Tick the User Data Policy box, **Continue**, **Create**. |
| `key-branding` | Fill in Branding | Open `/auth/branding`. Copy `websiteUrl`, `privacyUrl`, `termsUrl` into the three App domain boxes. **Add domain** twice: `appDomain`, `hooksDomain`. Developer contact `ownerEmail`. Leave the logo empty. **Save**. If you see an error about a domain: "If Google will not take a domain, tell Clip Factory support; a custom domain fixes it." |
| `key-scopes` | Add the 3 permissions | Open `/auth/scopes`, **Add or remove scopes**, scroll to **Manually add scopes**, paste `scopes` (one per line), **Add to table**, **Update**, **Save**. "Your sensitive scopes" is normal. |
| `key-publish` | Publish the app | Open `/auth/audience`, **Publish app**, confirm. It must say **In production**: in **Testing** YouTube stops after 7 days. Do NOT press **Prepare for verification**. (`gate: published_app`) |
| `key-client` | Make the key | Open `/auth/clients`, **Create client**. Type **Web application**, name `appName`. Under **Authorized redirect URIs** press **Add URI**, paste `redirectUri`. **Create**. Copy BOTH values now (or **Download JSON**): Google shows the secret only once. |
| `key-paste` | Paste the key here | Paste boxes `clientId`, `clientSecret`. "Or drop the key file Google gave you here: both boxes fill in." (button "Use the key file from Google"). **Save keys** (`auto: keys`). Lost the secret: open the client, **Add secret**, use the new one, then **Disable** the old one. |
Connect: `connect` **Connect YouTube** (`auto: connected`): pick your account, then your channel. "Google hasn't
verified this app" → **Advanced** → **Go to … (unsafe)** (it may show a web address instead of the name; that is
normal for your own app). Tick every box (or **Select all**), **Continue**. If you see `redirect_uri_mismatch`: wait 5
minutes and press Connect again; still wrong → redo step `key-client` with the Copy button.
Go public: `public-privacy` "Pick who can see your clips" (apple `settings.youtubePrivacy`: Everyone / Only people
with the link / Only me, shown inside the card; default Everyone; YouTube policy requires the choice);
`public-keep-alive` (optional) "Post at least every 6 months" (Google deletes keys unused for 6 months and emails you
30 days before; pressing Connect again keeps them alive); `public-quota` (optional) "Only if you post over 100 a day"
(Open button "Open Google's ask-for-more form" → Google's Audit and Quota Extension Form; not needed to start). Status
line: "Works now. Your clips go up for everyone."

**TikTok** (about 40 min + TikTok's review time, Free; `checkedOn` 2026-11-21, from what the owner met on TikTok for
Developers: the app page has one **Save** that stays off until **App review** has its text and a video; Display API is
no longer a product, its scopes come with Login Kit's **Add scopes**; Platforms is Web only. Go public checked again on
21 Nov 2026 against TikTok's Content Sharing Guidelines and applicants' reports of the Direct Post audit form: App
review must say Live before **Apply** shows next to Direct Post). Get ready:
| id | title | essentials |
|---|---|---|
| `ready-account` | Have your TikTok account | The account your clips go on. |
| `ready-computer` | Use a computer | |
| `ready-private` | Make your TikTok private for now | TikTok app › **Profile** › menu (three lines) › **Settings and privacy** › **Privacy** › turn on **Private account**. Until TikTok checks the app, it only posts to private accounts. |
Make your TikTok key:
| id | title | essentials |
|---|---|---|
| `key-signup` | Make a TikTok developer account | Open developers.tiktok.com/signup, **Sign up** (or **Log in**). Accept the terms. |
| `key-org` | Make an organization | Open `/organizations`, **Add organization**, name `appName`, **Create**. |
| `key-app` | Create the app | Profile icon › **Manage apps** › **Connect an app**. Pick your organization, **Confirm**. |
| `key-details` | Fill in App details | Download the icon (`download`) and upload it. App name `appName`. Category: the closest one. Description: the literal `TIKTOK_APP_DESCRIPTION` in `tiktok.ts` (not the shared `appDescription`), the same facts as the audit answers: "My own clipping tool. It turns long videos and streams I pick (my own and other creators', including paid clipping campaigns) into short clips, and posts the ones I approve to my own accounts when I press Upload." Terms of Service URL `termsUrl`, Privacy Policy URL `privacyUrl`. "Don't press **Save** yet. It stays off until **App review** has its text and a video (step `key-review`)." |
| `key-web` | Choose Web | Under Platforms tick **Web** only (not Desktop, Android or iOS). Website URL `websiteUrl`. |
| `key-products` | Add 2 products | **Add products**: **Login Kit** and **Content Posting API**. Nothing else. There is no Display API to add now: its permissions come with Login Kit. |
| `key-redirect` | Paste the return address | Login Kit settings › Redirect URI for Web: paste `redirectUri`. |
| `key-direct-post` | Turn on Direct Post | Content Posting API settings: turn on Direct Post. If you see a switch with "Direct Post" in its name, turn it on. |
| `key-scopes` | Add 2 permissions | **Login Kit** › **Scopes** › **Add scopes**: tick video.list and user.info.stats (followers, for the money tile), **Add**. Then there: user.info.basic, video.publish, video.list, user.info.stats. video.upload may be there too: leave it. No **Add scopes** button: open Login Kit first. |
| `key-review` | Fill in App review, then Save | **App review**: paste `tiktokReviewText`; record a few seconds of the screen (the About page, then this setup page) and upload it; **Save** (the real demo replaces it in `public-demo`). Save still won't press: App review needs both the text and a video. |
| `key-verify` | Prove the website is yours | **URL properties** › **Verify properties** (Production picked) › **URL prefix** › paste `websitePrefix` › **Verify** › download TikTok's file › drop it in the upload box here (`upload`, `auto: files`) › back on TikTok press **Verify**. Pick URL prefix, not Domain. |
| `key-paste` | Paste Client key and secret | Credentials: copy icon next to **Client key** and **Client secret** → paste boxes, **Save keys** (`auto: keys`). |
Connect:
| id | title | essentials |
|---|---|---|
| `sandbox-make` | Make a Sandbox for testing | Toggle **Production** → **Sandbox**, **Create Sandbox**, a name, clone Production, **Confirm**, **Apply changes**. Connect in the Sandbox first; posts stay private until TikTok approves the app. |
| `sandbox-user` | Add yourself as a test user | **Sandbox settings** › **Target users** › **Add account**, log in, accept. Can take up to an hour: refresh the page. |
| `sandbox-verify` | Verify the website in Sandbox too | Same as `key-verify` with Sandbox picked; upload that file too. |
| `sandbox-keys` | Use the Sandbox keys | If you see a different Client key in the Sandbox, paste those keys here for now. |
| `connect` | Connect TikTok | Vermilion button (`auto: connected`). Log in, check it says Clip Factory, leave every switch on, **Authorize**. |
Go public (`gate: app_review`, `posting_audit`):
| id | title | essentials |
|---|---|---|
| `public-demo` | Record the real demo video | On a computer, connected in the Sandbox with the TikTok account still private, address bar in sight. Copy chip **Shot list** (`TIKTOK_DEMO_SHOTS` in `tiktok.ts`, 18 numbered shots in order): About page with Privacy and Terms › **Connect TikTok** › TikTok's **Authorize** screen with every scope › connected › the clip's source › Review card preview (no watermark) › the **TikTok** row: "Asking TikTok…", "Posting as" + picture › edit the TikTok caption › Upload held ("Pick who can see it on TikTok first.") and **Who can see it** with nothing picked › Comments, Duet, Stitch all off (grey "Turned off in your TikTok settings." when the creator turned one off) › **Commercial content** on ("Pick Your brand, Branded content, or both." under it; pick **Only me**, Upload still held: "Pick Your brand or Branded content on TikTok first.") › **Your brand** (its "Promotional content" tag) › **Branded content** ("Paid partnership", Branded Content Policy line above Upload, Who can see it now says "Branded content can't be Only me. Turn off Branded content.") › untick it, pick **Only me** by hand, Commercial content off › Music Usage Confirmation line above **Upload** › **Upload** and "TikTok can take a few minutes to process your clip." › **Library**: on its way, then Posted › the private post on TikTok as picked › **Money** (video.list, user.info.stats) › last, on another clip with nothing on, **Use my settings** (the owner's own tap) and the TikTok row with every option. About 1 min, MP4, under 50 MB (up to 5 videos). Hints: a shot-list line you can't find → tap the **TikTok** row (every line is in there or right above **Upload**); a secret or code on screen → cut it out. The same video goes to App review and the audit form. |
| `public-review` | Ask TikTok to check the app | Switch to **Production**. **App review**: check `tiktokReviewText` is there (one line per scope), swap in the real demo video, **Save**, **Submit for review**. Then pick the status here: Draft / In review / Live / Not approved (`PATCH gate app_review`). Not approved: read **Review comments**, fix, submit again. |
| `public-live-keys` | When it says Live | If the Production keys differ from the Sandbox ones, paste them and press **Connect again**. |
| `public-audit` | Ask to post publicly | Only after **App review** says **Live**: **Production** › **Content Posting API** › **Apply** next to **Direct Post** (Open button: developers.tiktok.com/application/content-posting-api). The form has 4 pages (General Information, API client information, Supporting documents, Review) and does not save: paste each answer into the box with the same name. Copy chips: Organization name `appName`, Organization website `websiteUrl`, Organization description `TIKTOK_AUDIT_DESCRIPTION`, How you use Direct Post `TIKTOK_AUDIT_DIRECT_POST`, How you got the number `TIKTOK_AUDIT_USAGE` (pick the smallest users choice), Data you store `TIKTOK_AUDIT_DATA` (all literal strings in `tiktok.ts`; every one literally true today: one creator's own clipping tool, invite-only, one user, other creators' streams and paid clipping campaigns said plainly, "There is no company. Clip Factory is the name of my tool, and I am one person.", no wide audience; Data you store lists only what the api keeps: follower count, and from recent videos only a views total and a count of long videos). Upload the demo video, read and tick the 3 boxes, **Next**. "TikTok's rules ask for apps that many people can use. Clip Factory is only for you. If it says no, posts stay private but still post." Hints: **Your full name** → type your own; app ID → the number after /app/ in the app page's address bar; no **Apply** → wait for Live; spinner after **Next** → the video is uploading (up to 2 min); **Under review** → done for now, often 1 to 3 weeks; a no with empty **Review comments** → ask TikTok support first. Until it passes, every post is "Only me". |
| `public-unprivate` | Make your account public again | Only after the audit: turn **Private account** off. Posts from before stay private: change each to **Everyone** in the TikTok app. TikTok still allows about 15 posts a day. |
Status lines: `posting_audit` limited → "Works now, but your TikTok posts stay private until TikTok says yes.";
`app_review` draft/not approved → "Finish the TikTok review steps to post outside the Sandbox."; in review → "TikTok
is checking your app. This can take days."

**Instagram** (about 25 min, Free; Instagram API with **Facebook Login for Business**, a **User access token**, Graph
v27.0; system-user tokens are for Tech Providers only). Get ready:
| id | title | essentials |
|---|---|---|
| `ready-pro` | Make Instagram a pro account | Instagram app › your picture › menu › **Account type and tools** › **Switch to professional account** › **Creator** or **Business**. Personal accounts cannot connect. |
| `ready-page` | Link Instagram to a Facebook Page | In the Instagram app, tap **Edit profile**, then **Page** (under Public business information). Pick your Facebook Page, or press **Create a Facebook Page**. No Page yet? Make one first in the Facebook setup, step 1. Facebook shows a banner asking you to confirm who runs the Page (Page Publishing Authorization)? Do it now. If you see **Manage connection** on Facebook: already linked; check the name, close it, **I did this**, never **Disconnect**. Wrong Instagram there: **Disconnect**, then **Connect account**. |
| `ready-computer` | Use a computer | Log in to facebook.com with the Facebook account that will own the app. Wrong account? Log out first. |
| `ready-portfolio` | Business portfolio, if Meta asks | (optional since 19 Nov 2026: only if Meta asks or the Instagram is already in one) Open business.facebook.com, **Create a business portfolio** (name, your name, email), **Create**. **Settings** › **Accounts** › **Instagram accounts** › **Add**, log in to Instagram. Already in a portfolio? Use that one. |
Make your Instagram key:
| id | title | essentials |
|---|---|---|
| `key-developer` | Become a Meta developer | Open developers.facebook.com/async/registration, **Next**, type the codes Meta sends, pick **Creator**. |
| `key-app` | Create the app | developers.facebook.com/apps › **Create app**. App name `appName`, your email, **Next**. Use case **Manage messaging & content on Instagram**, **Next**. Pick your portfolio, or skip it. **Next** / **Go to dashboard**. Never ask for a review. |
| `key-basic` | Fill in Basic settings | **App settings** › **Basic**: App domains `appDomain`, Privacy Policy URL `privacyUrl`, Terms of Service URL `termsUrl`, User data deletion › **Data deletion instructions URL** `dataDeletionUrl`, a Category, App icon (download), Contact email (already filled in). In the EU: Data Protection Officer = your name and email. **Save changes**. Meta needs all of this to make the app Live. |
| `key-config` | Make the Instagram login setup | **Use cases** › **Customize** (Instagram) › open the tab **API setup with Facebook login**. Press **Create new configuration** (under Facebook Login for Business › Configurations). Token type: **User access token**, the longest expiry. Assets: your Page and Instagram account. **Edit permissions**: tick instagram_basic, instagram_manage_insights, instagram_content_publish, pages_show_list, pages_read_engagement (instagram_manage_insights is not ticked by default). Page in a business portfolio? Also tick ads_management and ads_read (Meta needs them when the Page role comes through Business Manager). **Use this configuration**. Redirect URL `redirectUri`, **Save**. |
| `key-redirect-check` | Double-check the return address | If you see **Facebook Login for Business** › **Settings**: put `redirectUri` in **Valid OAuth Redirect URIs**, **Enforce HTTPS** on, **Save changes**. No such page: skip. (optional) |
| `key-paste` | Paste the 3 values | **App ID**, **App secret** (**Show**, Facebook may ask your password), **Configuration ID** (or paste the whole **Login URL**: Clip Factory finds the ID). **Save keys** (`auto: keys`). |
Connect: `connect` **Connect Instagram**: log in with the same Facebook account, tick your Page and your Instagram
account, leave every switch on, confirm. Several accounts → pick in Clip Factory. Not listed → it is still personal
(`ready-pro`), not linked to a Page (`ready-page`) or in another portfolio (`ready-portfolio`). Go public
(`gate: app_live`, like Facebook: Development-mode posts are seen only by the app's role users): `public-live` "Make
the app Live": "Until the app is Live, only you can see your Reels." Left menu **Publish**, check the list, **Go live**
at the bottom right (no **Publish**: the **App Mode** switch → **Live**); press **I did this** when the top bar says
**Live**. If you see **App Review** or **Advanced access**: "You do not need it for your own account. Skip it. Press
**Go live**. Meta still says no? It lists what is missing. Go back to Fill in Basic settings." Then `public-try` "Post
one test clip" (Instagram may take a few minutes; numbers can take 2 days). If you see your Reels missing for other
people: "Do the step before: make the app Live." If Facebook asks to confirm who runs the Page (Page Publishing
Authorization): "Do it. Instagram will not post until you do."

**Facebook** (about 25 min, Free; Page Reels, Facebook Login for Business, Graph v27.0). Get ready:
| id | title | essentials |
|---|---|---|
| `ready-page` | Have a Facebook Page | Open facebook.com/pages/?category=your_pages; none → **Create new Page**. Profiles cannot post Reels through apps. You need **Content** or **Full control** access on the Page. Tap your picture and switch back to your own profile; do not change Page settings. If you see **Manage connection** after **Edit profile**: Instagram is already linked, close it, never **Disconnect**. **People who help manage your Page**: leave as is. Page in a business portfolio: keep your own access too (Page **Settings** › **Page access**, **Full control**). |
| `ready-computer` | Use a computer | |
Make your Facebook key:
| id | title | essentials |
|---|---|---|
| `key-developer` | Turn on Meta for developers | developers.facebook.com › **Log in** / **Get Started**, accept, verify phone or email. Already done in the Instagram setup? Just press **I did this**. |
| `key-app` | Create the app | Open developers.facebook.com/apps/creation, App name copy "Clip Factory Pages" (never put Facebook, Meta or Instagram in the name), email, **Next**. |
| `key-use-case` | Pick one use case | Tick only **Manage everything on your Page**. Do not tick the Instagram one or **Authenticate and request data from users with Facebook Login**. Use cases cannot be removed later. **Next**. |
| `key-finish-app` | Finish the app | Business: your portfolio, or **I don't want to connect a business portfolio yet**. **Next**, **Next**, **Go to dashboard**. |
| `key-permissions` | Turn on Page permissions | **Dashboard** › **Customize the Manage everything on your Page use case**. **Add** next to pages_read_engagement, pages_manage_posts, read_insights, pages_manage_engagement (pages_show_list and business_management are already there). **Ready to test**. |
| `key-basic` | Fill in Basic settings | **App settings** › **Basic**: App domains `appDomain`, Privacy `privacyUrl`, Terms `termsUrl`, **Data deletion instructions URL** `dataDeletionUrl`, Category, App icon (download). In the EU: Data Protection Officer = your name and email. **+ Add platform** › **Website** › Site URL `websiteUrl`. **Save changes**. |
| `key-redirect` | Paste the return address | **Facebook Login for Business** › **Settings**: **Client OAuth login**, **Web OAuth login**, **Enforce HTTPS** = Yes, Strict Mode on. **Valid OAuth Redirect URIs** `redirectUri`; **Check URI**; **Save changes**. Not in the menu: look under **Use cases** › **Customize** or **Add product**. **Deauthorize Callback URL** / **Data Deletion Request URL**: leave empty. |
| `key-config` | Make a login configuration | **Facebook Login for Business** › **Configurations** › **+ Create configuration** (not a template). Name `appName`. If asked: **General**. Token **User access token**, longest expiry. Assets **Pages**. Permissions: pages_show_list, pages_read_engagement, pages_manage_posts, pages_manage_engagement, read_insights, business_management. **Create**. |
| `key-paste` | Paste the 3 values | **App ID**, **App secret**, **Configuration ID**. **Save keys**. |
Connect: `connect` **Connect Facebook**: **Continue**, tick your clip Page, leave every switch ON (one off and Facebook
gives nothing), **Save**, **Got it**. Several Pages → pick in Clip Factory.
Go public (`gate: app_live`): `public-live` "Make the app Live": left menu **Publish**, check the list, **Go live** at the bottom right (no
**Publish**: the **App Mode** switch → **Live**). Missing info → back to `key-basic`. Press **I did this** when the top bar says **Live**.
If you see **App Review** or **Advanced access**: "You do not need it for your own Page. Skip it. Press **Go live**. Meta still says
no? It lists what is missing. Go back to Fill in Basic settings." (A role-only app on Standard Access needs no App Review.) Status
before: "Works now, but only you can see your Facebook Reels until the app is Live."

**X** (about 15 min, **costs money**: $0.015 per clip, "about $1.50 for 100 clips"). Get ready:
| id | title | essentials |
|---|---|---|
| `ready-account` | Use the X account your clips go on | Email confirmed (X may ask for a phone number). Not protected, or only followers see clips. |
| `ready-computer` | Use a computer | |
| `ready-card` | Ask a grown-up for a card | X charges a little per post. A normal credit or debit card (prepaid cards get no bonus). |
Make your X key:
| id | title | essentials |
|---|---|---|
| `key-console` | Sign in to the X Developer Console | Open console.x.com with the same X account. Accept the **Developer Agreement and Policy**. Use-case box: copy `xUseCase`. |
| `key-credits` | Buy a few credits | **Billing** › **Credits**: save the card, buy the smallest amount, set a spending limit of $10, leave auto-recharge OFF. X may add $20 free after the first purchase. |
| `key-app` | Create the app | **Apps** › **Create App** (or **New App**). Name `appName` (taken? add your name). Description `xUseCase`. **Create**. Clip Factory does NOT need the API Key, API Secret, Bearer Token or Access Token. If the box shows a Client ID and Client Secret, paste them now (`key-paste`). **Close**. |
| `key-auth-settings` | Open the sign-in settings | Your app › **Keys & Tokens** › next to **User authentication settings** › **Set up** (or **Edit**). |
| `key-permissions` | Pick Read and write | App permissions **Read and write**. Type of App **Web App, Automated App or Bot**. |
| `key-addresses` | Paste the addresses | **Callback URI / Redirect URL** `redirectUri`, **Website URL** `websiteUrl`; if asked, Terms `termsUrl`, Privacy `privacyUrl`. **Save Changes**. |
| `key-paste` | Paste Client ID and Secret | Copy **Client ID** and **Client Secret** (shown once) → **Save keys** here, then **Close** on X. Lost it: **Keys & Tokens** › **Regenerate**. |
Connect: `connect` **Connect X**: check the account, press **Authorize** (it may say **Authorize app**). "Callback URL
not approved" → redo `key-addresses` with the Copy button. Go public (`gate: credits`): `public-credits` "Keep a few
credits" — status "Works now. Posts are public straight away." / empty → "Your X credits ran out. Buy more in
**Billing** › **Credits**." Leaf: "Clip Factory never puts links in X posts (a link costs $0.20)."

`tiktokReviewText` (copy chip, five lines, one per scope on the app; connect asks for user.info.basic, video.publish,
video.list, the money grant adds user.info.stats, and nothing asks for video.upload, so its line says so):
"user.info.basic (Login Kit): connect my TikTok and show my name and picture in Clip Factory.
video.publish: post clips I approved with Upload straight to my own TikTok (Direct Post).
video.upload: comes with Content Posting API. Clip Factory does not ask for it; it only uses Direct Post.
video.list: show the views and likes of my own posts on my Clip Factory dashboard.
user.info.stats: show my follower count on my Clip Factory Money page, only after I say OK."

### 17.3 Public pages for the platforms (web, static, no sign-in)

Platforms need a real website with privacy and terms **on the same domain** (TikTok verifies them by file; Google
lists every domain). The GitHub Pages legal site stays untouched (§1); the web app adds static files served by the
existing CloudFront default behaviour: `web/public/about.html` (what Clip Factory is, who runs it, contact email, links
to Privacy and Terms visible without a menu), `web/public/legal/privacy.html`, `web/public/legal/terms.html` (the
GitHub texts plus the platform clauses: uses YouTube API Services; links YouTube Terms
`https://www.youtube.com/t/terms` and Google Privacy Policy `http://www.google.com/policies/privacy`; revoke at
`https://security.google.com/settings/security/permissions`; users agree to the YouTube Terms; what is stored (tokens in
AWS Secrets Manager, post ids and numbers), deletion on Disconnect, section `#delete` "How to delete your data").
Values (served by `GET /v1/setup`, §17.4): `websiteUrl = {APP_URL}/about.html`, `websitePrefix = {APP_URL}/`,
`privacyUrl = {APP_URL}/legal/privacy.html`, `termsUrl = {APP_URL}/legal/terms.html`, `dataDeletionUrl =
{privacyUrl}#delete`, `appDomain`/`hooksDomain` = hosts of `APP_URL`/`HOOKS_URL`, `redirectUri =
{HOOKS_URL}/oauth/{platform}/callback` (exact, no trailing slash). TikTok's verification file is served at
`{APP_URL}/{filename}` (§17.4 upload route). `upload-web.sh` never deletes `tiktok*.txt`. Contact on the public pages:
the GitHub issues page `https://github.com/Lamo2real/clip-factory-legal/issues` (no contact email was given; an email
would be added to `web/public/about.html` and `web/public/legal/*.html`).
Look (`web/public/legal/site.css`): the header shows the logo as in the app, regular "Clip" and italic "Factory"
(`Clip <em>Factory</em>`, weight 400), with the two page links grouped so they wrap together; every header and footer
link is at least 44 px tall. These pages load no webfonts on purpose (no second copy of the app's fonts in the offline
cache): they use the app's own stacks, Inter or the system UI font for text and Times New Roman (Tinos's metric twin)
for headings and the logo.

### 17.4 API (all JWT, §5 errors; `routes/setup.py`, package `clipfactory_api/oauth/`)

| Method & path | Body | 2xx response |
|---|---|---|
| GET `/v1/setup` | – | `{ "platforms": PlatformSetup[] /* 5, SETUP_ORDER */, "ready": n, "values": SetupValues }` |
| GET `/v1/setup/{platform}` | – | `{ "setup": PlatformSetup }` |
| PATCH `/v1/setup/{platform}` | `{ "step": id, "done": bool }` or `{ "gate": "app_review", "state": "draft"\|"in_review"\|"live"\|"not_approved" }` (tiktok only) | `{ "setup" }` |
| PUT `/v1/setup/{platform}/keys` | `{ "clientId", "clientSecret", "configId"? }` (configId required for instagram/facebook; a Login URL is accepted and its `config_id` extracted) | `{ "setup" }` (masked hints only) |
| DELETE `/v1/setup/{platform}/keys` | – | `204` (also disconnects) |
| POST `/v1/setup/{platform}/check` | – | `{ "check": KeyCheck, "setup" }` |
| POST `/v1/setup/tiktok/verification-file` | `{ "filename", "content" }` (`^tiktok[A-Za-z0-9_-]{4,64}\.txt$`, content ≤ 4 KB printable ASCII) | `{ "setup" }` (PutObject web bucket key = filename, `Cache-Control: no-cache`, invalidate `/{filename}`) |
| DELETE `/v1/setup/tiktok/verification-file/{filename}` | – | `204` |
| POST `/v1/accounts/{platform}/connect` | – | `{ "authorizeUrl", "expiresAt" }` (409 `conflict` "Paste your {Platform} keys first." without keys) |
| POST `/v1/accounts/{platform}/choose` | `{ "accountId" }` (one of `account.choices`) | `{ "setup" }` |
| DELETE `/v1/accounts/{platform}` | – | `204` (revoke best effort, delete token secret, Account `not_connected`; YouTube also async `forget`, §17.6) |
| GET `/v1/accounts/tiktok/creator-info` | – | `{ "creator": { nickname, username, avatarUrl, privacyOptions: string[], commentDisabled, duetDisabled, stitchDisabled, maxDurationSec } }` (409 when not connected; TikTok spam errors → 409 with the friendly sentence; TikTok slow (429 / `rate_limit_exceeded`), down (5xx), unreachable or busy, including while the token is refreshed → 503 `platform_down` "TikTok did not answer. Try again in a minute.") |
| GET `/v1/accounts` | – | `{ "accounts": Account[] }` (unchanged path, new shape) |

All setup and accounts routes (every `/v1/setup*` and `/v1/accounts*` route above, reads such as GET
`/v1/setup/{platform}` and GET `/v1/accounts` included) answer 503 `unavailable` ("Posting setup is not switched on for
this app yet.") unless `OAUTH_STATE_SECRET`, `HOOKS_URL` and `APP_URL` are set; the TikTok verification-file routes also need `WEB_BUCKET` and
`DISTRIBUTION_ID`.

```ts
type GateKey = "published_app" | "app_review" | "posting_audit" | "app_live" | "credits";
interface Gate { key: GateKey; state: "ok" | "limited" | "waiting" | "action" | "unknown"; at?: string }
interface Account { platform: Platform; status: "not_connected" | "connected" | "needs_reconnect" | "choose_account";
  handle?: string /* "@name" or channel title */; name?: string; avatarUrl?: string; connectedAt?: string;
  missing?: string[] /* scopes not granted */; reason?: "token_dead" | "missing_permissions" | "keys_changed" | "expires_soon";
  reconnectBy?: string /* TikTok refresh_expires_in − 7 d */; choices?: { id: string; name: string; avatarUrl?: string }[] }
type KeyName = "clientId" | "clientSecret" | "configId";
type CheckCode = "ok" | "keys_wrong" | "redirect_wrong" | "not_connected" | "token_dead" | "missing_permissions"
  | "credits_empty" | "platform_down";
interface KeyCheck { at: string; ok: boolean; code: CheckCode; message: string; account?: "ok" | "dead" | "none" }
interface PlatformSetup { platform: Platform; stepsDone: string[]; ready: boolean /* connected && no gate "action"; the web
  fills the ring to 100% when ready, even with Go public steps unticked (TikTok review/audit can take weeks) */;
  keys: { saved: boolean; hints?: Partial<Record<KeyName, string>>; savedAt?: string; check?: KeyCheck };
  account: Account; gates: Gate[]; files?: string[] /* tiktok verification files online */; updatedAt?: string }
interface SetupValues { appName: string; websiteUrl: string; websitePrefix: string; privacyUrl: string; termsUrl: string;
  dataDeletionUrl: string; appDomain: string; hooksDomain: string; redirectUris: Record<Platform, string>;
  scopes: Record<Platform, string[]>; ownerEmail: string }
```
Gates per platform: youtube `published_app` (`ok` when step `key-publish` is ticked, else `action`); tiktok
`app_review` (owner-picked: draft / not_approved → `limited` (Sandbox only), in_review → `waiting`, live → `ok`) and
`posting_audit` (from `creator_info.privacy_level_options`: only
`SELF_ONLY` → `limited`, else `ok`; `unknown` before connect); instagram and facebook `app_live` (`ok` when
`public-live` is ticked, else `limited`; the gate line names "Instagram Reels" / "Facebook Reels"); x `credits` (`action` after a credits error, `ok` after the next success).

**Key formats** (trimmed; quotes and zero-width characters removed; same regexes in `oauth/formats.py` and
`web/src/lib/keyFormats.ts`; friendly 400 messages say what the value looks like):
| Platform | clientId | clientSecret | configId |
|---|---|---|---|
| youtube | `^[0-9]{6,20}-[a-z0-9]{20,40}\.apps\.googleusercontent\.com$` ("ends with .apps.googleusercontent.com") | `^GOCSPX-[A-Za-z0-9_-]{20,40}$` ("starts with GOCSPX-") | – |
| tiktok | `^[A-Za-z0-9]{10,64}$` (Client key) | `^[A-Za-z0-9_-]{20,128}$` | – |
| instagram, facebook | `^[0-9]{10,20}$` (App ID, only digits) | `^[a-f0-9]{32}$` (32 letters and numbers) | `^[0-9]{10,20}$` |
| x | `^[A-Za-z0-9_-]{20,64}$` | `^[A-Za-z0-9_-]{40,80}$` | – |
TikTok and X patterns are lenient on purpose: **Check it** is the real test. Hints: `clientId` first 6 + "…" + last 4;
secrets "••••" + last 4; `configId` last 4. Saving keys whose `clientId` differs from the connected one disconnects the
account (`reason: "keys_changed"`); the old token is revoked with the **old** app keys (read before the new ones are
saved), because a token can only be revoked by the app it was issued to.

**Check it** (`oauth/providers.py`, no user token needed for the keys part; HTTP through `HttpClient`, 10 s timeout):
youtube: POST `https://oauth2.googleapis.com/token` with `grant_type=authorization_code&code=cf-check` + keys +
redirect URI → `invalid_client` = `keys_wrong`, `redirect_uri_mismatch` = `redirect_wrong`, `invalid_grant` = keys
look right; tiktok: POST `/v2/oauth/token/` `grant_type=client_credentials` → 200 ok; meta: POST
`/v27.0/oauth/access_token` (form body `client_id`, `client_secret`, `grant_type=client_credentials`) → 200 ok, then
`GET /v27.0/{appId}?fields=name` (shown "Meta
calls your app '…'"); x: POST `https://api.x.com/2/oauth2/token` (Basic) with a dummy code → 401 = `keys_wrong`, other
4xx = keys look right (uncertain; the message says "Your keys look right"). Keys fine but nothing connected →
`ok: true` with `code: "not_connected"` ("Your keys work. Now press Connect {Platform}."). Then, when connected, the
profile call of
§17.5 (`token_dead` → Account `needs_reconnect`). Result stored on SETUP as `keys.check`.

**Connect start.** Needs saved keys. `nonce = 16 random bytes b64url`; `exp = now + 10 min`; `state =
"v1." + nonce + "." + exp + "." + b64url(HMAC_SHA256(stateKey, "v1|" + platform + "|" + nonce + "|" + exp))`; PutItem
`{pk: "OAUTH#" + nonce, sk: "STATE", type: "oauth", userId, platform, redirectUri, createdAt, ttl: exp + 300}`.
PKCE (youtube, x; never tiktok/meta): `verifier = b64url(HMAC_SHA256(stateKey, "pkce|" + nonce))` (43 chars, never
stored), `code_challenge = b64url(SHA256(verifier))`, `S256`. `stateKey` = secret `cf-prod/oauth/state-key` (cached 5
min). Authorize URLs:
* youtube `[hidden] scopes,
  space}&access_type=offline&prompt=consent&include_granted_scopes=true&state&code_challenge&code_challenge_method=S256`
  (if Google rejects PKCE for web clients, `oauth.PKCE["youtube"] = False` is the one switch; state still protects).
* tiktok `[hidden]
  video.list&redirect_uri&state&disable_auto_auth=1`.
* instagram `[hidden]
  override_default_response_type=true&state` (no `scope`).
* facebook same host/path with `client_id&config_id&redirect_uri&response_type=code&state` (+ `auth_type=rerequest`
  when the last result was `missing_permissions`).
* x `[hidden] tweet.write users.read
  media.write offline.access&state&code_challenge&code_challenge_method=S256`.
All parameters URL-encoded; the URL is returned to the browser (it carries no secret).

**Secrets Manager** (the only place for keys and tokens; never DynamoDB, logs, responses, URLs or the browser after
submit). Names: `cf-prod/platforms/{platform}/app` `{clientId, clientSecret, configId?, userId, savedAt}`;
`cf-prod/platforms/{platform}/token` (youtube `{accessToken, expiresAt, refreshToken, scope, channelId}`; tiktok
`{accessToken, expiresAt, refreshToken, refreshExpiresAt, openId, username, scope}`; instagram `{pageAccessToken,
pageId, igUserId, userId}` (the linked Page's token; the user token is dropped); facebook `{pageAccessToken,
pageId, userId}`; x `{accessToken, expiresAt, refreshToken, xUserId, username, scope}`);
`cf-prod/platforms/{platform}/pending` (Meta choices with their Page tokens, ≤ 30 min; deleted on choose, when an
expired choose is found, and at the start of each new Instagram/Facebook Connect); `cf-prod/oauth/state-key`
(Terraform). Created at runtime with
`CreateSecret` (tags `app=cf-prod`, `platform`), updated with `PutSecretValue`, deleted with `DeleteSecret
ForceDeleteWithoutRecovery=true` (disconnect, keys delete). Wrapper `oauth/secrets.py` (`read`, `write` create-or-put,
`delete`), per-container cache 5 min, `ResourceNotFoundException` = absent. Logs name the secret, never the value.

**DynamoDB items.** `ACCOUNT#{platform}` (replaces `ACCOUNT#{platform}#{id}`; one per platform): `type "account"`,
`platform`, `status`, `handle`, `name`, `avatarUrl`, `accountId` (channel/open_id/IG id/Page id/X user id),
`connectedAt`, `scopes`, `missing`, `reason`, `reconnectBy`, `refreshLeaseUntil` (internal), `updatedAt`.
`SETUP#{platform}`: `type "setup"`, `stepsDone` (string set, ≤ 60 ids), `keysSavedAt`, `keyHints`, `keysClientId`
(public id only, to detect changes), `check`, `gates` (map), `choices` (id, name, avatarUrl), `choicesExpireAt`,
`files`, `lastResult` (last callback result code; `missing_permissions` adds `auth_type=rerequest` on the next
Facebook Connect), `updatedAt`. The TikTok `app_review` gate stores the owner's pick at `gates.app_review.value`.
`OAUTH#{nonce}`/`STATE` as above. `posts.accounts()` reads `ACCOUNT#` and returns the new Account
shape (no `refreshLeaseUntil`, no `accountId`).

**Live.** The broadcast filter (§14.2) gains `ACCOUNT#` and `SETUP#`; both map to `{ type: "setup", op: "upsert", id:
platform, partial: true }` (the web refetches `GET /v1/setup`). `LiveEvent` gains that member.

### 17.5 The OAuth callback (`hooks.py` → `oauth/callback.py`, REST `GET /oauth/{platform}/callback`)

1. Platform must be one of the five (else 404). Read `state`; verify format, HMAC (constant time), `exp > now`, the
   platform in the signature = path platform. Consume once: `DeleteItem OAUTH#{nonce}/STATE` with
   `ConditionExpression attribute_exists(pk)`, `ReturnValues ALL_OLD`. Any failure → result `expired`.
2. `error` in the query (`access_denied`, `user_denied`, …) → `denied`; other error → `error`.
3. Exchange the code server side with the stored `redirectUri` (identical to the authorize one) and the app keys:
   * youtube: POST `https://oauth2.googleapis.com/token` (form: code, client_id, client_secret, redirect_uri,
     grant_type=authorization_code, code_verifier). Check `scope` holds all three (granular consent) else
     `missing_permissions`. `GET [hidden]` → none →
     `no_channel`; handle = `snippet.customUrl` or title, avatar `snippet.thumbnails.default.url`.
   * tiktok: POST `https://open.tiktokapis.com/v2/oauth/token/` (form: client_key, client_secret, code, grant_type,
     redirect_uri). `scope` must contain user.info.basic, video.publish, video.list else
     `missing_permissions`. `GET /v2/user/info/?fields=open_id,avatar_url,display_name`; `POST
     /v2/post/publish/creator_info/query/` → `username`, gate `posting_audit`.
   * instagram (Facebook Login for Business, user access token): `POST
     https://graph.facebook.com/v27.0/oauth/access_token` (form body: client_id, client_secret, code, redirect_uri) →
     long-lived user token (`POST` same path, form `grant_type=fb_exchange_token`, client_id, client_secret,
     fb_exchange_token) → `GET /me/accounts?fields=id,name,access_token,instagram_business_account{id,username,
     profile_picture_url}` (with `appsecret_proof`); keep Pages that have `instagram_business_account`. 0 →
     `no_accounts`; error #10 → `wrong_account_type`; 1 → connect; > 1 → `choose`. Stored: `igUserId`, `pageId` and
     that Page's `access_token` (Secrets Manager only); publish and stats use that Page token.
   * facebook: exchange as instagram (POST, form body) → long-lived `grant_type=fb_exchange_token` → `GET
     /me/permissions` (any declined → `missing_permissions`) → `GET /me/accounts?fields=id,name,access_token,tasks,
     picture{url}`; keep Pages whose `tasks` include `CREATE_CONTENT`; 0 → `no_pages`; 1 → connect; > 1 → `choose`.
     Only Page tokens are stored (never expire; the user token is dropped).
   * x: POST `https://api.x.com/2/oauth2/token` (Basic `client_id:client_secret`; form code, grant_type,
     redirect_uri, code_verifier); `GET [hidden]`.
4. Write the token secret (or `pending` + SETUP `choices` for `choose`), then UpdateItem `ACCOUNT#{platform}`
   (`connected` or `choose_account`) and SETUP. Token endpoint 401/`invalid_client` → `keys_wrong`;
   `redirect_uri_mismatch`/"redirect_uri is not matched" → `redirect_wrong`; 5xx/network → `platform_down`.
   On `connected`, release the owner's posts waiting for this place (§17.6 "Release"; `cf-prod-hooks` starts the clip
   flow on `CLIP_FLOW_ARN`). A release failure is logged (`oauth.release_failed`) and never changes the result: the
   owner still lands on `result=connected`. The Meta pick (`POST /v1/accounts/{platform}/choose`) and a Check it that
   turns `needs_reconnect` back into `connected` (§17.4) release the same way in `cf-prod-api`.
5. Always `302 Location: {APP_URL}/settings/posting/setup/{platform}?result={code}` (fixed path, code from the list
   below only; nothing else from the request is reflected; no open redirect), `Cache-Control: no-store`,
   `Referrer-Policy: no-referrer`. Never log `code`, `state`, tokens or the query.

Result codes and the owner's sentence (web data files hold the per-platform wording; "step N" is rendered from the
step id, e.g. `key-client`, so numbers never drift):
| code | sentence (YouTube example) |
|---|---|
| `connected` | "YouTube is connected!" |
| `choose` | "Pick the account your clips go to." |
| `denied` | "You pressed cancel. Press Connect YouTube to try again." |
| `expired` | "That took too long. Press Connect YouTube again." |
| `keys_wrong` | "The key does not work. Copy the Client ID and secret again (step 11)." |
| `redirect_wrong` | "The return address does not match. Copy it again in step 11." |
| `missing_permissions` | "A permission box was not ticked. Connect again and tick every box." |
| `no_channel` | "This Google account has no YouTube channel. Make one first (step 1)." |
| `no_accounts`, `wrong_account_type` | "Instagram did not show a pro account. Do steps 1 and 2, then connect again." |
| `no_pages` | "Facebook did not show a Page you control. Do step 1, then connect again." |
| `platform_down` | "YouTube did not answer. Try again in a few minutes." |
| `error` | "Something went wrong. Press Connect YouTube again." |

### 17.6 Tokens and real posting

**Token helper** `oauth/tokens.py`: `Credentials(platform, access_token, app: AppKeys, data: dict)`;
`SecretsTokenProvider(store, secrets, http, clock)` with `credentials(platform, account) -> Credentials` and
`__call__(platform, account) -> str` (the §16.5 `TokenProvider`, so `platforms.make_adapters(tokens=…)` in
`cf-prod-stats` and `cf-prod-clip-flow` gets real tokens; `posts.connected_account` returns real Accounts). Refresh when
`expiresAt ≤ now + 5 min`: youtube `grant_type=refresh_token` (keep the old refresh token if none returned); tiktok and x
refresh tokens **rotate**: take a lease first (`UpdateItem ACCOUNT# SET refreshLeaseUntil = now + 30 s` if absent or
past; losers sleep 1 s up to 5 times, then re-read the secret uncached), refresh, **write the new secret before using
the access token**, clear the lease. Instagram and Facebook (both use a Page token from a long-lived user token) never
refresh. A refresh answered with 408, 429, 5xx or a network error is retryable (`platform_down`; the step retries,
Account unchanged), never `token_dead`. `invalid_grant`, Google `invalid_token`, TikTok `access_token_invalid`, Meta
code 190, X 401 → Account
`needs_reconnect` (`reason: token_dead`) and raise `ReconnectNeededError(PublishError)`. TikTok
`refresh_expires_in` < 7 days → `reason: expires_soon`, `reconnectBy`. Meta calls send `appsecret_proof`; every Meta
`oauth/access_token` call (code exchange,
`fb_exchange_token`, Check it) is a POST with a form body, never a GET with the secret in the URL.

**Publisher interface** (`platforms/base.py`; replaces `publish()` raising "not connected"):
```python
@dataclass(frozen=True)
class Progress: state: Literal["processing", "ready_to_finish", "done"]; handle: dict; check_after: int = 30
                published: Published | None = None
class Publisher(Protocol):
    start_semantics: Literal["at_least_once", "at_most_once"]; finish_semantics: Literal[...]
    def start(self, job: PublishJob) -> Progress: ...     # resumes when job.post["publishHandle"] exists
    def check(self, job: PublishJob, handle: dict) -> Progress: ...
    def finish(self, job: PublishJob, handle: dict) -> Progress: ...
# PublishJob(post, clip, account, creds: Credentials, video: VideoSource, options: dict, settings: dict, http)
# VideoSource: size, read(start, end) -> bytes (S3 ranged GET of jobs/{jobId}/clips/{clipId}/clip.mp4, 8 MB reads),
#              presigned_url(seconds=3600) (only for the URL-pull fallbacks)
```
`publishHandle` (internal Post attribute, never returned) is written right after each platform call that creates
something (conditional on `status = queued`), so a replay resumes instead of creating a duplicate. YouTube keeps
`sessionUri` in it only until the upload finishes (then only `videoId`; the stored handle never carries `sessionUri` or
TikTok's `uploadUrl` once uploading is done).

**Clip-flow steps per queued post** (names are contract; replaces §14.5 step 2):
`publish-{platform}` (start; first the step reads the post and stops unless it is `queued` and its `flowRun` is this
run's or absent) → while `processing`: `ctx.wait(Duration.from_seconds(check_after),
name=f"wait-{platform}-{n}")` + step `check-{platform}-{n}` (n = 1…`maxChecks`) → `ready_to_finish`: step
`finish-{platform}` (then more checks if it returns `processing`) → `done`: `posts.mark_posted` in that step. Retries:
3 attempts on `RetryablePublishError`/`TransientError`. `NotConnectedError` (no account) → post `pending_integration`
(released once the place is connected, "Release" below); `ReconnectNeededError` → post `failed` "Connect {Platform} again in Settings › Posting › Set up posting, then
press Try again."; `PublishError` → `failed` with the mapped sentence. Platforms run one after another (waits cost
nothing). Over `maxChecks`: YouTube and TikTok are marked posted anyway (the platform finishes alone); the others
fail with "{Platform} could not finish this video. Press Try again." An at-most-once step interrupted mid-call fails
with "We are not sure it posted. Look on {Platform} before you press Try again." Further step names (also
contract): `posted-{platform}` marks YouTube/TikTok posted when checks run out; the TikTok id follow-up is
`ctx.wait(name=f"wait-tiktok-id-{n}")` + step `tiktok-id-{n}`. Try again (§5 retry of a failed post) removes the
internal `publishHandle` so a failed upload is started fresh, not resumed. Confirm on a failed clip (Try again)
accepts the same `tiktok` options as §17.8 and replaces the TikTok post's `postOptions` (needed after "Pick who can see
it on TikTok again, then press Try again.").

**Release (waiting posts, added 2026-11-20).** The Library promises "Posts once these accounts are connected", so
connecting keeps it. `release.release_waiting(store, flows, userId, platform, deadline=…)`
(`clipfactory_api/release.py`, imported by both `cf-prod-api` and `cf-prod-hooks`) runs right after an Account becomes
`connected`: the OAuth callback (§17.5), the Meta account pick and a Check it that reconnects (§17.4). Only when that
Account is `connected` (a strongly consistent read: the caller wrote it a moment ago), it reads the owner's posts
(`Query USER#`/`POST#`, strongly consistent) and, per clip whose status is `posted`, `confirmed` or `failed` (never
`review`, `publishing` or `declined`), does exactly what Try again does (`release.restart`, shared with
`routes/clips.py` `_try_again`): one transaction sets that place's `pending_integration` posts to `queued` with
`flowRun: run + 1` (REMOVE `error`, `publishHandle`; each conditional on `status = pending_integration`) and the clip to
`flowRun + 1`, `publishState: pending` (REMOVE `flowExecutionArn`; a `failed` clip becomes `confirmed`; conditional on
the status and `flowRun` read), then starts `clip-{clipId}-{flowRun}` (`release.start_flow`, the same code Confirm
uses; on success `publishState: started`). The new run sends only the posts tagged with its number, so a release or a
second Post now while an earlier run is still uploading another place never sends a video twice (§14.5 step 2). When
the clip's current run never started (`publishState: pending`), its `queued` posts move to the new run too (`flowRun`
only, upload handles kept; the clip update is then also conditional on `publishState = pending`). A TikTok post with no
`postOptions.privacyLevel` is never released on its own (TikTok's rules, §17.8): it waits for Post now, which opens the
TikTok sheet. Safe to repeat: a second release finds nothing waiting and changes nothing; a clip of that place with a
`queued` post and `publishState: pending` (an earlier start that failed) gets its start finished, so a failed Invoke
stays retryable, and the Library shows such a clip's big Try again (`startPending`, §11). Per-clip errors are logged
(`release.clip_failed`) and skipped, never raised; a read failure is `release.read_failed`. The owner waits for the
answer, so `deadline` is `ANSWER_SECONDS` (25) after the request began (the callback's start, `Request.started` in the
API; cf-prod-hooks stops at 28 s, API Gateway waits 29 s): a clip only starts while `CLIP_SECONDS` (18, one clip's
worst case: two Invoke attempts of 2 s connect + 6 s read, plus its DynamoDB calls) are left (`release.out_of_time`),
and the rest wait for Post now or the next release.

| Platform | start | check | finish | ids / URL |
|---|---|---|---|---|
| youtube (start at-least-once) | POST `[hidden]` (`X-Upload-Content-Length`, `X-Upload-Content-Type: video/mp4`) body `{snippet:{title: youtubeTitle ≤ 100 chars no "<>", description ≤ 5000 bytes no "<>", categoryId: "20"}, status:{privacyStatus: settings.youtubePrivacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: false}}` → save session URI; PUT bytes in 8 MB chunks (multiples of 256 KB, `Content-Range`); 308 continue; on resume `PUT Content-Range: bytes */{size}` | `GET /youtube/v3/videos?part=status,processingDetails&id=` until `uploadStatus` `processed` (`rejected`/`failed` → PublishError with reason); every 30 s, `maxChecks` 60 | – | `platformPostId = statsId = videoId`; `https://www.youtube.com/shorts/{id}` |
| tiktok (start at-most-once) | `creator_info/query` (spam errors → PublishError; clip longer than `max_video_post_duration_sec` → PublishError); `POST /v2/post/publish/video/init/` `post_info {title: tiktok caption ≤ 2200, privacy_level: post options (must be in `privacy_level_options`), disable_comment/duet/stitch, brand_content_toggle, brand_organic_toggle, is_aigc: false}`, `source_info {source: "FILE_UPLOAD", video_size, chunk_size, total_chunk_count}` (≤ 64 MB: one chunk = size; else 10 MB chunks, `floor(size/chunk)`, last carries the rest) → save `publish_id`; PUT chunks to `upload_url` (`Content-Range`) | `POST /v2/post/publish/status/fetch/` every 15 s, `maxChecks` 80: `PUBLISH_COMPLETE` → done; `FAILED` → PublishError by `fail_reason` (`internal` retryable) | – | `platformPostId = publish_id`; private (`SELF_ONLY`) → `privacy "private"`, no statsId, url `https://www.tiktok.com/@{username}`; public → `statsId = publicaly_available_post_id[0]` when present, else a follow-up loop `tiktok-id-{n}` (wait 10 min, ≤ 12) sets it via `posts.set_stats_id`; url `https://www.tiktok.com/@{username}/video/{id}` |
| instagram (start at-least-once) | `GET /{ig}/content_publishing_limit?fields=config,quota_usage` (full → PublishError "Instagram's daily limit is reached. Press Try again tomorrow."); `POST /{ig}/media media_type=REELS&upload_type=resumable&caption&share_to_feed=true` → save container id; `POST https://rupload.facebook.com/ig-api-upload/v27.0/{container}` (`Authorization: OAuth {token}`, `offset: 0`, `file_size`, binary body). Fallback `publish.source = "video_url"`: `video_url` = presigned GET | `GET /{container}?fields=status_code,status` every 60 s, `maxChecks` 15: `FINISHED` → ready_to_finish; `ERROR` → "Instagram did not like this video file." (`status`, Meta's reason, is logged); `EXPIRED` → "Instagram waited too long for this upload. Press Try again." (Try again starts a fresh container); `PUBLISHED` (a cut-off finish) → never `media_publish` again: look up the Reel (below) → done | at-most-once: save `publishing: true`, then `POST /{ig}/media_publish creation_id` → media id; `GET /{id}?fields=permalink`. A finish that finds `publishing` set and no `mediaId`, or whose `media_publish` fails (timeout, 5xx, any Meta error), first reads `GET /{container}?fields=status_code`: `PUBLISHED` → look up the Reel, never publish twice. Look-up: `GET /{ig}/media?fields=id,permalink,timestamp,caption&limit=5`, the one row whose caption is the caption sent and whose `timestamp` is after the container's `containerAt` (2 min slack); none or several → "Instagram may have posted this already. Look on Instagram before you press Try again." (never a guess) | `platformPostId = statsId = media id`; `permalink` |
| facebook (start at-least-once) | clip `durationSec` outside 3-90 s → "Facebook Reels must be 3 to 90 seconds long." before any call; `POST /{pageId}/video_reels upload_phase=start` → save `video_id`; `POST https://rupload.facebook.com/video-upload/v27.0/{video_id}` (`Authorization: OAuth {pageToken}`, `offset: 0`, `file_size`, binary; resume from `bytes_transfered`). Fallback `file_url` header with a presigned GET | `GET /{video_id}?fields=status` every 30 s, `maxChecks` 40: uploading done (`uploading_phase.status` `complete` or `completed`, or `video_status=upload_complete`) → ready_to_finish; after finish wait for `publishing_phase.status=completed` and `video_status=ready`; `error`/`upload_failed`/`expired` → PublishError (each phase's `error` object, or `errors` list, is logged) | at-least-once: `POST /{pageId}/video_reels upload_phase=finish&video_id&video_state=PUBLISHED&description` (one call; `video_state` takes only DRAFT, SCHEDULED or PUBLISHED) | `statsId = video_id`, `platformPostId = post_id` if returned else video_id; url `permalink_url` (absolute) else `https://www.facebook.com/reel/{video_id}` |
| x (start at-least-once) | `POST /2/media/upload/initialize {media_type: "video/mp4", total_bytes, media_category: "tweet_video"}`; `POST /2/media/upload/{id}/append` multipart (`segment_index`, `media`, 4 MB); `POST /2/media/upload/{id}/finalize` → save media id | `GET /2/media/upload?command=STATUS&media_id=` after `check_after_secs` (≤ 60), `maxChecks` 20: `succeeded` → ready_to_finish; `failed` → PublishError | at-most-once: `POST /2/tweets {text: x caption with every URL removed, ≤ 280 chars cut at a word + "…", media:{media_ids}}` | `platformPostId = statsId = tweet id`; `https://x.com/{username}/status/{id}` |

**Friendly errors** (`platforms/errors.py`, `friendly(platform, status, body) -> (retryable, sentence)`): quota/rate
(YouTube `quotaExceeded`/`uploadLimitExceeded`, TikTok `rate_limit_exceeded`/`spam_risk_too_many_posts`, Meta 4/17/32/
613/80001/80002, X 429) → "{Platform} says slow down. Clip Factory tries again later." (retryable except daily caps:
"…Press Try again tomorrow."); TikTok `spam_risk_user_banned_from_posting` → "TikTok is not letting this account post
right now."; `unaudited_client_can_only_post_to_private_accounts` → "Make your TikTok account private (Setup step 3),
then press Try again."; `reached_active_user_cap` → "TikTok's daily limit for your app is reached. Try tomorrow.";
YouTube `forbidden`/`uploadLimitExceeded` channel → "YouTube did not accept the upload. Check your channel in YouTube
Studio."; file checks (`file_format_check_failed`, `duration_check_failed`, Meta 2207026 …) → "{Platform} did not like
this video file."; X 402 or a `CreditsDepleted`/"credits" problem → gate `credits` `action`, "Your X credits ran out.
Buy more in console.x.com › Billing › Credits, then press Try again."; X 403 duplicate → "X already has this post.";
5xx/network → retryable "{Platform} did not answer.". Meta (`code/subcode` is `Problem.code`, e.g. `190/460`; subcode, `type`, `error_user_title` and `fbtrace_id`
are logged): 190/492 → "Your Facebook account is no longer an admin of the Page. Make it an admin, then connect
again.", other 190 → Connect again; 10 and 200-299 → "{Platform} is missing a permission. Connect {Platform} again in
Settings › Posting › Set up posting and tick every box." (both `needs_reconnect`); 4/2207051 (spam) → "{Platform} is
not letting this account post right now."; 25/2207050 → "Open the Instagram app and clear any warning. Then press Try
again."; 368 → "Meta paused posting for now. Wait a day, then press Try again."; -1, -2, 1, 2, 9007 and subcodes
2207001/2207003/2207008/2207027/2207032 → retryable "{Platform} did not answer."; 2207020/2207053 → "{Platform} lost
this upload. Press Try again."; Facebook Reels specs 1363040/1363127/1363129 → bad file, 1363128 → "Facebook Reels
must be 3 to 90 seconds long.". Unknown → "Posting to {Platform} did not work. Press Try again."
Raw platform messages go to logs (no tokens), never to the owner.

**Stats.** `cf-prod-stats` and the clip-flow `metrics` step use `SecretsTokenProvider`; `ReconnectNeededError` = skipped
like `not_connected`. A Meta stats read answered with code 190 sets the Account `needs_reconnect` (`reason: token_dead`)
and skips like `not_connected` (Meta never says a token died), so Settings shows Connect again before the next Upload. New handler event `{"action": "forget", "userId", "platform": "youtube"}` (sent async by
`DELETE /v1/accounts/youtube`): REMOVE `metrics` and gsi2 attributes from YouTube posts and delete their `STAT#` items
(YouTube Developer Policies: delete API data after revocation).

**Captions.** Adapters take `captions.youtubeTitle`/`youtubeDescription`, `tiktok`, `instagram` (≤ 2200 chars, ≤ 30
hashtags: extra ones dropped), `facebook`, `x` (rules above). `Settings` gains `youtubePrivacy: "public" | "unlisted" |
"private"` (default `"public"`, validated in PUT `/v1/settings`).

### 17.7 `config/platforms.json` changes (§16.4)

`"graphApiVersion": "v27.0"`. Scopes: youtube unchanged; tiktok `["user.info.basic", "video.publish", "video.list"]`
(Direct Post only); instagram `["instagram_basic", "instagram_manage_insights",
"instagram_content_publish", "pages_show_list", "pages_read_engagement"]` (Meta's Instagram docs, checked
2026-11-16, do not list `business_management` for this path, so it is not requested); facebook
`["pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_manage_engagement", "read_insights",
"business_management"]`; x unchanged. youtube `budget.reserveUnits` → `500` (uploads have their own bucket since
2026-06-01). x `budget.usdPerPost: 0.015` (counted into `monthUsd` before each post; over `monthlyUsd` → post `failed`
"Clip Factory stopped X at your $10 limit this month."). Each platform gains `"publish"`:
youtube `{ "checkSeconds": 30, "maxChecks": 60, "chunkMb": 8 }`; tiktok `{ "checkSeconds": 15, "maxChecks": 80,
"source": "FILE_UPLOAD", "idCheckMinutes": 10, "idMaxChecks": 12 }`; instagram `{ "checkSeconds": 60, "maxChecks": 15,
"source": "resumable" }`; facebook `{ "checkSeconds": 30, "maxChecks": 40, "source": "binary" }`; x `{ "maxChecks": 20,
"chunkMb": 4 }`. `stats.config.load()` validates them; the scopes lists feed `SetupValues.scopes`.

### 17.8 TikTok "Post to TikTok" sheet (Content Sharing Guidelines; web + api)

On Upload, when TikTok is one of the chosen places (§33; an older client: in `settings.platforms` and connected), a
sheet opens before the confirm request: the creator nickname (`GET /v1/accounts/tiktok/creator-info`, fetched each
time), a **Who can see it** dropdown (the app's own) with **no default** (below), switches Comments / Duet /
Stitch (off by default, greyed when disabled by the creator), a **Commercial content** switch (off) with **Your brand** / **Branded content** (one required when on;
label "Promotional content" / "Paid partnership"; branded is only Everyone or Friends), the sentence "By posting, you agree to
TikTok's Music Usage Confirmation." (branded: "By posting, you agree to TikTok's Branded Content Policy and Music Usage
Confirmation."), a video preview and the editable
caption. Upload stays disabled until a privacy is chosen. Confirm body gains `"tiktok": { "privacyLevel", "disableComment",
"disableDuet", "disableStitch", "brandContent", "brandOrganic" }` (validated; stored on the TikTok Post as internal
`postOptions`); a `queued` TikTok post without it → 400 "Pick who can see it on TikTok.". After Upload the toast says
"TikTok can take a few minutes to process your clip." **Try again** on a failed clip whose TikTok post failed with
"Pick who can see it on TikTok again, then press Try again." opens this sheet first, then sends `{ "tiktok": {...} }`
in the confirm body; the API replaces that post's `postOptions` (mock `_try_again` does the same).

**Who can see it: TikTok's rules and the owner's one tap (owner request, 2026-11-20; ADR-60, correcting ADR-57).**
TikTok's Content Sharing Guidelines (developers.tiktok.com/doc/content-sharing-guidelines, updated 4 Aug 2026) require
that the creator picks the privacy status himself **from a dropdown** with no default value, from exactly
`privacy_level_options` (while the app is not audited only `SELF_ONLY` is allowed), and that Comments, Duet and Stitch
are shown and none is on by default; Commercial content is off until the creator turns it on. So:

* **The app's own dropdown** (`components/Dropdown.tsx`, never the OS list) labelled "Who can see it": exactly
  `privacyOptions`, ordered Everyone, Followers, Friends, Only me, showing "Pick who can see it" until the owner picks.
  With Branded content ticked, Only me and Followers stay in the list greyed (`DropdownOption.disabled`: skipped by
  the keys, a tap does nothing, `aria-disabled`) with TikTok's line "Branded content visibility cannot be set to
  private." When `SELF_ONLY` is the only option it is the one choice, and the line "TikTok keeps posts private until it
  approves your app." shows under it. When Branded content leaves nothing: "Branded content can't be Only me. Turn off
  Branded content." The sheet's hint reads "Pick who can see it to turn on Upload."
* **Commercial content (TikTok's audit rules, 2026-11-21).** Shared by the sheet and the TikTok row
  (`screens/review/TikTokCommercial.tsx`). Under the two ticks one line says the label: nothing ticked "Pick Your
  brand, Branded content, or both."; Your brand only "Your video will be labeled as 'Promotional content'."; Branded
  content (alone or with Your brand) "Your video will be labeled as 'Paid partnership'.". Branded content (paid
  partnership) is only for Everyone or Friends (`BRANDED_PRIVACY`): while Only me or Followers is picked the Branded
  content tick is greyed with "Branded content can't be Only me. Pick Everyone or Friends first." (or "… can't be
  Followers. …"); the privacy he picked is never cleared (TikTok's option A; a tick already on can always be
  unticked). Commercial content on with nothing ticked keeps Upload off; TikTok's sentence "You need to indicate if
  your content promotes yourself, a third party, or both." is Upload's hover text (`title`) and starts the line under
  it, because phones have no hover: the sheet "… Pick Your brand or Branded content to turn on Upload.", the card
  "… Pick Your brand or Branded content on TikTok first.". The API refuses branded content that is not Everyone or
  Friends twice: the confirm body (400 "Branded content can only be seen by Everyone or Friends on TikTok. Pick who
  can see it.") and `TikTokPublisher.post_info` (PublishError "Pick who can see it on TikTok again, then press Try
  again.", before anything reaches TikTok).
* **Use my settings** on the Review card (§36) is the owner's own action: one tap puts his saved TikTok choices on
  (within what TikTok offers him right now). Nothing is ever on before he taps it or picks in the TikTok row.
* Commercial content (off) with Your brand / Branded content ("Paid partnership"), the Branded Content Policy line and
  the Music Usage Confirmation line are unchanged; on the Review card the Music Usage line sits right above Upload
  whenever TikTok is ticked.

The sheet (and the shared confirm `Sheet` in `components/Sheet.tsx`) is drawn with `createPortal` on `document.body`,
so its backdrop covers the whole screen (tab bar, sidebar and Ask included; toasts stay on top, so a failed Upload's
error shows) even though the card that opens it is
glass (`backdrop-filter`); a page keeps no transform of its own (pages have no entrance, §20.16). It
is a real modal: focus moves in once on open (typing in the caption never loses the caret), Tab and Shift+Tab wrap
inside it, Escape closes it, and on close the focus goes back to the Upload that opened it. A clip longer than the
creator's `maxDurationSec` (a limit of 0 means TikTok did not say: it does not block, the publisher checks again)
or a creator-info error never leaves a dead end: the callout says what to do next ("… To upload it to your other
places now, turn TikTok off above and tap Upload.", §33), and the error
callout also has **Ask TikTok again**, which fetches the creator info again.

### 17.9 Infra (Terraform + scripts)

* **hooks**: `aws_secretsmanager_secret` `cf-prod/oauth/state-key` + `aws_secretsmanager_secret_version` with
  `secret_string_wo` from `ephemeral "random_password"` (length 64, special false), `secret_string_wo_version = 1`
  (never in state). Lambda timeout 28 s; env + `SECRET_PREFIX = "cf-prod/platforms/"`, `OAUTH_STATE_SECRET =
  "cf-prod/oauth/state-key"`. IAM + `dynamodb:GetItem`, `UpdateItem`, `DeleteItem` on the table, only for the
  `OAUTH#*` and `USER#*` partitions, and `PutItem` only for `HOOK#*` and `USER#*` (`dynamodb:LeadingKeys`);
  `secretsmanager:GetSecretValue` on the state-key ARN; on `cf-prod/platforms/*/app*` only `GetSecretValue` and
  `DescribeSecret` (the public hooks Lambda can never change the owner's app keys); on `cf-prod/platforms/*/token*`
  `CreateSecret`, `PutSecretValue`, `GetSecretValue`, `DescribeSecret`, `TagResource`; on
  `cf-prod/platforms/*/pending*` the same plus `DeleteSecret`. These three patterns have no `-` before the `*`: for a
  secret that does not exist yet Secrets Manager checks the bare name, and the callback needs
  `ResourceNotFoundException` there to create it. Outputs `oauth_state_secret_arn`,
  `oauth_callback_base = "${invoke_url}/oauth"`, `oauth_state_secret_name`, `secret_prefix`, `platform_secrets_arn`,
  `platform_token_secrets_arn = "arn:aws:secretsmanager:${region}:${account_id}:secret:cf-prod/platforms/*/token-*"`
  (the `{platform}/token` secrets only; `-*` covers the random ARN suffix) (so the secret names are defined once). The
  hooks Lambda does not need `HOOKS_URL` (the callback uses the
  `redirectUri` saved at Connect). The REST resources are unchanged (callback route exists).
  Release of waiting posts (§17.6, additive): env `CLIP_FLOW_ARN` (= `module.flows.clip_flow_alias_arn`); IAM
  `ReleaseWaitingPosts` (`dynamodb:GetItem`, `Query`, `UpdateItem`, `TransactWriteItems` on the table, `USER#*` only)
  and `StartClipFlow` (`lambda:InvokeFunction` on `{clip_flow_arn_prefix}:*`, like the API's `StartFlows`). New inputs
  `clip_flow_alias_arn`, `clip_flow_arn_prefix` (from `module.flows`; flows reads only names from hooks: no cycle).
* **api**: env `HOOKS_URL` (= `module.hooks.hooks_url`), `SECRET_PREFIX`, `OAUTH_STATE_SECRET`, `WEB_BUCKET`,
  `DISTRIBUTION_ID`; IAM: the secrets set above on the prefix, `GetSecretValue` on the state key,
  `s3:PutObject`/`s3:DeleteObject` on `${web_bucket_arn}/tiktok*`, `cloudfront:CreateInvalidation` on the distribution
  ARN, `lambda:InvokeFunction` on stats (exists). New inputs `hooks_url`, `oauth_state_secret_arn`,
  `oauth_state_secret_name`,
  `secret_prefix`, `platform_secrets_arn` (from `module.hooks`), `web_bucket`, `web_bucket_arn`, `distribution_id`,
  `distribution_arn` (api ← hooks ← frontend: no cycle).
* **flows** (clip-flow) and **stats**: env `SECRET_PREFIX`; IAM `secretsmanager:GetSecretValue` on
  `cf-prod/platforms/*` (`platform_secrets_arn`: app keys and tokens) and `secretsmanager:PutSecretValue` only on
  `cf-prod/platforms/*/token-*` (`platform_token_secrets_arn`: refreshed tokens). They can read the `app` and `pending`
  secrets but never write them; only api and hooks write `app` and `pending`. `dynamodb:UpdateItem` (exists); stats +
  `dynamodb:DeleteItem` (forget). clip-flow memory 1024 MB. New inputs `secret_prefix`, `platform_secrets_arn`,
  `platform_token_secrets_arn` (from `module.hooks`). job-flow and learn get no Secrets Manager access.
* **realtime**: ESM filter prefixes + `ACCOUNT#`, `SETUP#` (seven).
* **envs/prod**: wiring above; output `oauth_callback_base`. `config/platforms.json` per §17.7.
* **scripts** (infra owns them for this change): `write-web-config.sh` adds required `oauthCallbackBase` (https, ends
  `/oauth`) from `oauth_callback_base`; `test-write-web-config.sh` covers it; `upload-web.sh` excludes `tiktok*.txt`
  from deletes. §4 config gains `"oauthCallbackBase"`; the web treats it as optional (mock mode) and uses it only
  until `GET /v1/setup` answers.
* **Cost**: ≤ 16 secrets × $0.40/month for this change (the state key and three per platform); about 22 in all today
  (ADR-34).

### 17.10 Web mock mode (offline, `VITE_MOCK=1`)

`web/src/api/mock/setup.ts`: the five `PlatformSetup`s start `not_started`; state kept in `sessionStorage`
(`cf-mock-setup`) so a reload resumes. `connectAccount` returns `authorizeUrl = "/mock-oauth/{platform}?state=…"`; the
route `/mock-oauth/{platform}` (registered only in mock mode) is a plain glass page "Pretend {Platform}" with
**Allow** and **Cancel**; Allow → `location.assign("/settings/posting/setup/{platform}?result=connected")` (facebook
and instagram → `choose` with two fake accounts), Cancel → `result=denied`. Mock keys accept the §17.4 formats,
`check` returns `ok` (a clientId containing `bad` → `keys_wrong`); keys that work with nothing connected → `ok: true`,
`code: "not_connected"`, "Your keys work. Now press Connect {Platform}." (same as the API). Mock scopes match §17.7.
TikTok connects with `posting_audit: limited`; X
fixture `credits: ok`. `window.__cfMock.setup.{expireToken(platform), reset(), finish(platform), setAudit(bool),
setCreditsEmpty(bool),
askToChoose(platform)}` for tests. Mock `creator-info` for the
TikTok sheet. Mock `values` use `https://dexample.cloudfront.net` and
`https://hexample.execute-api.eu-north-1.amazonaws.com/v1`.

### 17.11 Who builds what (four parallel builders; each stays inside its folder)

| Builder | Owns |
|---|---|
| infra | `infra/**` (§17.9, tftests), `config/platforms.json` (§17.7), `scripts/write-web-config.sh`, `scripts/upload-web.sh`, `scripts/test-write-web-config.sh` |
| api | `api/**`: `oauth/{__init__,state,secrets,formats,providers,callback,tokens,setup}.py`, `routes/setup.py`, `routes/system.py` (accounts routes), `routes/__init__.py`, `hooks.py` (callback), `posts.py` (Account shape, `set_stats_id`), `settings.py` (`youtubePrivacy`), `routes/clips.py` (TikTok options on confirm), `platforms/**` (publishers, `errors.py`), `flows/clip_flow.py` (§17.6 steps), `stats/**` (tokens, `forget`, config §17.7), `realtime/broadcast.py` (`setup`), `app.py` (secrets/http clients), tests |
| web | `web/**`: `src/setup/*.ts` (§17.2), `screens/settings/setup/{SetupList,SetupPlatform,StepCard,KeyForm,ChooseAccount}.tsx`, `components/ProgressRing.tsx`, `screens/home/SetupCard.tsx` (removed by §17.13), `screens/review/TikTokSheet.tsx`, `lib/{keyFormats,setupProgress}.ts`, `lib/settingsTree.ts` (Posting › Set up posting; redirects), `lib/router.ts`, `api/{index,types}.ts`, `api/mock/setup.ts`, `public/{about.html,legal/privacy.html,legal/terms.html,brand/clip-factory-1024.png}`, `lib/config.ts` (`oauthCallbackBase`), removal of `comingSoonPlatform`, tests |
| docs | `docs/**` except this file: `SETUP_POSTING.md` (new), `ROADMAP.md`, `SECURITY.md`, `ARCHITECTURE.md` (+ drawio: Secrets Manager, OAuth callback path, platform upload hosts), `DECISIONS.md`, `TESTING.md`, `DEPLOYMENT.md` (deploy role: `secretsmanager:CreateSecret`, `PutSecretValue`, `GetSecretValue` (Terraform refresh reads the version), `DescribeSecret`, `DeleteSecret`, `TagResource`, `GetResourcePolicy` on `secret:cf-prod/oauth/*`) |

Shared names: `oauth.state.sign(key, platform, nonce, exp)`, `oauth.state.verify(key, platform, state, now) -> nonce`,
`oauth.state.pkce(key, nonce) -> (verifier, challenge)`, `oauth.secrets.Secrets.read/write/delete(name)`,
`oauth.tokens.SecretsTokenProvider`, `oauth.setup.public_setup(item, account, values)`, `posts.public_account(item)`,
`posts.set_stats_id(store, post, stats_id, now)`, `platforms.publishers.publisher_for(platform)`,
`platforms.errors.friendly(platform, status, body)`.

### 17.12 Tests (offline, fakes only; no AWS, no network)

* **api** (`pytest`, fake Secrets Manager, recorded `HttpClient`): state sign/verify (tampered, wrong platform,
  expired, reused → `expired`), PKCE verifier deterministic and never stored; key formats (one good and one bad sample
  per row of §17.4, Login URL → configId), responses carry only masked hints and secrets never appear in any response,
  log line or DynamoDB item (scan the fakes); keys change → `keys_changed`; connect 409 without keys; exact authorize URLs
  per platform (PKCE only youtube/x; no `scope` for Meta; `auth_type=rerequest` after `missing_permissions`); callback per
  platform with recorded responses: success, `denied`, `missing_permissions` (granular Google, TikTok scope list, Meta
  declined), `no_channel`, `no_accounts`, `wrong_account_type`, `no_pages`, several Pages → `choose` + choose route,
  `keys_wrong`, `redirect_wrong`, `platform_down`; Location is always the fixed path with a listed code; query never
  logged; token refresh: Google refresh, TikTok/X rotation writes the new secret before use, lease serialises two
  refreshers, `invalid_grant` → `needs_reconnect`, `expires_soon`; check per platform; disconnect deletes the secret,
  revokes, YouTube `forget` invoke; publishers with recorded fixtures `tests/fixtures/publish/{platform}_*.json`: request
  shapes of §17.6 (YouTube resumable + resume after interruption, TikTok chunk math for 3 MB / 70 MB / 200 MB, IG
  resumable headers, FB `finish`→`complete` fallback, X 4 MB appends and URL stripping, caption limits); clip-flow with
  `FakeDurableContext`: step and wait names `publish-/wait-/check-/finish-{platform}-{n}`, replay with `publishHandle`
  makes no second create, `maxChecks` outcomes, at-most-once interruption message, `ReconnectNeededError` → failed,
  TikTok private → no gsi2, TikTok id follow-up sets `statsId`; friendly error mapping table; X monthly cap; TikTok
  confirm options required and validated; broadcast `ACCOUNT#`/`SETUP#` → `setup` partial; `config.load` §17.7 values;
  `test_release.py`: release (released, not connected, `review`/`publishing` untouched, repeat no-op, failed start
  retryable, one broken clip, time budget, TikTok waits for its choice), the callback, Meta pick and Check it release,
  the callback stays `connected` when the release fails, Post now through Confirm.
* **infra** (`terraform test`, mock providers): state-key secret uses `secret_string_wo` (no `secret_string`); IAM
  statements exactly §17.9 per role (no secrets access on api beyond the prefix and state key; none on job-flow,
  realtime, learn); hooks timeout 28; envs on api/hooks/flows/stats; ESM filter has seven prefixes; output
  `oauth_callback_base` ends `/oauth`; `test-write-web-config.sh` requires `oauthCallbackBase`.
* **web** (Vitest): every guide file has unique step ids matching `^[a-z0-9-]{1,40}$`, `checkedOn` "2026-11-16" (TikTok "2026-11-19"), each
  `open.url` https, every `ValueRef` known, each guide has the four parts in order and one `connect` step; `keyFormats`
  samples (same as api); `setupProgress` (ring excludes optional, auto steps, current step = first not done, ready
  rule); result-code copy exists for every code × platform; Google JSON paste fills both boxes.
  **Playwright (mock mode)** `e2e/setup.spec.ts`, each journey at **375×812 and 1440×900**, for **every platform**:
  the floating setup list "0/5" (§17.13) → Setup list → platform page; tick the Get ready steps; every Open button has the exact
  `href` and `target=_blank`; Copy puts the resolved value on the clipboard (granted permission) and shows "Copied!";
  a bad key shows the friendly error and Save stays disabled; good keys save and show only masked hints; **Check it** →
  ok; TikTok verification file upload lists the file; **Connect** → mock consent → **Allow** → back with confetti
  canvas, "Connected as", ring complete; Facebook/Instagram choose a page; **Cancel** → `denied` copy; reload resumes at
  the first not-done step; TikTok shows "Works now, but your TikTok posts stay private until TikTok says yes."; expired
  token → "Connect again" vermilion; Disconnect → Undo within 8 s keeps it, after 8 s it is gone; all five ready → the
  floating setup list gone and "5 of 5 ready". `e2e/tiktok-sheet.spec.ts`: Keep disabled until privacy chosen, branded greys "Only
  me" and "Followers", Only me first greys Branded content; **Try again** on a failed clip whose TikTok post needs new privacy choices opens the sheet first and sends
  `tiktok` in the confirm body (mock `_try_again` replaces `postOptions`). `overflow.spec.ts` +
  `/settings/posting/setup`, each platform page, `/mock-oauth/youtube`, `/about.html`, the
  TikTok sheet at 320–1920; `screenshots.spec.ts` adds the list and the YouTube page at 375/1440, light and dark;
  `settings-tree.spec.ts`: `/settings/posting/accounts` and `?account=x&status=coming_soon` redirect to the setup.
* **docs**: `docs/SETUP_POSTING.md` has, per platform, the same parts, step numbers and titles as §17.2 (a web Vitest
  `setup-docs.test.ts` reads `../docs/SETUP_POSTING.md` and checks every step title appears under its platform heading).

### 17.13 The floating setup to-do list (owner request, 2026-11-16)

The owner's words: *"make sure there's a to-do list that is always on the top right of my screen, only for the setup
of each social media platform, so I can connect to them and everything is set up. Once that's done, the to-do list
disappears. It's always going to be there unless I either clicked Skip on each of those and then confirmed that, or
completed them all. But it will always be in Settings, of course."* It replaces §17.1's Home card.

**Rows** (`web/src/lib/setupTodo.ts`, pure, `todoRows(setups, settings.setupSkipped)`): YouTube, TikTok, Instagram,
Facebook, X (`SETUP_ORDER`), each with its mark, name and one state, checked in this order:

| State | When | Line | Actions |
|---|---|---|---|
| `ready` | `computeReady(setup)` (§17.4); wins over a skip | "Ready" (leaf-green tick on the mark) | none |
| `skipped` | in `setupSkipped` and not ready, whatever else it is waiting for | "Skipped" | **Set up**, **Un-skip** |
| `needs_you` | an account exists but is not ready (`needs_reconnect`, `choose_account`, or connected with a gate in `action`) | "Needs you: connect again" / "Needs you: pick an account" / "Needs you: one more step" | **Set up**, **Skip** |
| `not_started` | `notStarted(setup)` (§17.1) | "Not started" | **Set up**, **Skip** |
| `in_progress` | anything else | "In progress: n of m" (`progressOf` counted steps) | **Set up**, **Skip** |

* **Every row that is not ready can be skipped**, so skipping each one (and confirming) always ends the list, as the
  owner asked. A skip that has become meaningless is dropped: when a skipped platform is ready, the client removes it
  from `setupSkipped` (`staleSkips`, one `PUT /v1/settings`). So a platform that was ready and stops being ready (a
  dead token, an account to pick, a gate) always comes back with its row; only a new, confirmed Skip hides it again.
* **Set up** opens `/settings/posting/setup/{platform}`. **Skip** opens a small glass confirm
  (`components/SkipConfirm.tsx` on `components/Sheet.tsx`): title "Skip {Platform}?", text "You won't post there until
  you set it up. You can do it later in Settings." (a connected platform, which is still posted to: "{Platform} is
  connected but needs one more step. Skip only takes it off this list. You can finish it later in Settings."), buttons
  **Keep it** (first, focused, the vermilion `primary`: the safe answer is the strong one; Escape and a tap outside also
  mean Keep it) and **Skip {Platform}** (glass, no `act`: opting out is quiet, §20.1). Only the confirmed answer saves
  `setupSkipped` (`withSkip`); asking changes nothing. **Un-skip** (`act="undo"`) saves `withoutSkip`, from the list
  while it shows and from Settings.
* **Saving**: every change to `setupSkipped` goes through `screens/settings/setup/useSkips.ts`, which calls
  `saveSettings(updater)` (`app/session.tsx`): the new list is built from the newest settings on screen, saves still on
  their way included, never from a copy a component read earlier, so a skip, an un-skip and a dropped stale skip sent
  close together cannot undo each other.
* **Visible** (`todoVisible`) while any row is not `ready` or `skipped`, i.e. it goes away when every platform is ready,
  every platform is skipped, or any mix. It is not decided before both `GET /v1/setup` and `/v1/me` have answered.
* **Celebration**: when the list goes from open to done (in this page, or on an earlier visit on this device:
  `localStorage["cf-setup-todo-open"]`), the card turns into a green "**All set!**" with a line that says how it ended
  (`doneLine`): all ready "Every place is ready.", all skipped "All skipped. Set them up any time in Settings.", a mix
  "Done for now. Skipped ones wait in Settings.". Confetti (§12.4 `burst`, skipped with reduced motion) and the
  `success` sound (§20.8, muted when Sounds is off); it stays 2.6 s (1.3 s with reduced motion), then slides off to the
  right (fades with reduced motion). It is a status (`role="status"`, no taps). Where the list was on screen, its room
  stays until the card has left, then the page takes it back (the page moves once, after the celebration). If the
  keyboard was on the list (the last Skip, the panel), focus moves to `<main>` instead of being lost. It comes back by
  itself when a platform needs the owner again.
* **Fresh**: the list lives for the whole visit, so it reads `GET /v1/setup` once at the start, again on every live
  `setup` event (§17.4, the fast path) and again on every page change, so what the owner just did on a setup page
  shows on the list even when no live update arrives.

**Where it sits** (`web/src/components/SetupTodo.tsx`, mounted once in the signed-in shell as a direct child of
`.app`, styles `web/src/styles/setup-todo.css`). It never covers a control, by reserving room rather than floating
over the page:

* **≥ 1440 px, open** (`data-mode="rail"`, `TODO_RAIL_MIN` / `TODO_RAIL_QUERY` in `lib/setupTodo.ts`): a glass column
  (`--todo-w` 304 px, `glass glass--refract` like the sidebar) fixed at the top right; `.shell` gets 24 + 304 + 24 px
  of right padding instead of its gutter, so the page is narrower, never covered. **Why 1440**: every page lays itself
  out wider from some window width (two columns from 1024 or 1100 px); with the column open the page must still have at
  least the room it has at those widths with nothing beside it (764 px at 1100; it has 786 px at 1440, and would have
  only 626 px at 1280, where Home's hero was squeezed). `test/setupTodo.test.ts` reads the widths from the CSS and
  fails if a wider layout or a wider column breaks this. Its height stops 14 px above the Ask pill and the update bar
  (`--help-bottom`). The head (ring, title, **–**) stays; the rows and the line under them scroll inside it, and when
  more is below than fits the bottom fades out (`.setup-todo__scroll.has-more`). Short windows pack it tighter so all
  five rows and their buttons show at once: under 900 px tall the head's second line is hidden and the rows sit
  closer; under 820 px the column's padding shrinks and the line under the rows is hidden (it then needs about 690 px:
  a 900 px laptop screen in a browser and a 1080p one at 125 % both fit). **–** folds it to the pill; the choice is per
  device (`localStorage["cf-setup-todo-collapsed"]`); the pill unfolds it.
* **< 1440 px, folded, and on a clip's page** (`data-mode="pill"`; `/clips/{id}` needs its whole width to fan out its
  five columns, so there the list is always the pill, `todoNoRailOn`): a 48 px glass pill at the top right, ring +
  "Set up posting" + "2/5" (the words show at every width, 320 px too; its name reads "Set up posting: 2 of 5 done").
  The page leaves a strip for it at the top: `--todo-top` (60 px on phones, 72 px from 768 px, measured from the top line, §11.1) on `html`, added to
  `.shell`'s top padding, so at the top of every page nothing is under it (phones: above the brand row and Live dot;
  the tab bar is at the bottom). Behind the pill is `.setup-todo-bar`, a band of the panels' liquid glass (the
  `.glass` tint and blur) over that strip (`--todo-bar-h`: 66 / 76 px; from 768 px it starts right of the sidebar)
  with **no edges**: no border, rim, hairline, highlight line or shadow; it runs off the top of the screen under the
  status bar, and its bottom melts into the page over `--todo-feather` (22 px, a `mask-image` fade of the tint and
  blur together; from 768 px its left side melts in over 24 px too), so no line shows where it ends. The strip
  itself (`.setup-todo-bar`, `--todo-bar-h` tall) takes the taps; its glass (`.setup-todo-bar__glass`) runs on
  below it into the fade, which takes no taps. Invisible at the
  top of the page, there (`is-scrolled`, and it takes the taps) as soon as the page scrolls, so the page slides under
  glass and the pill stays on screen at every scroll position; it never steps aside. `html` gets `scroll-padding-top`
  below the bar's fade (`--todo-bar-h` + `--todo-feather` + 8 px), so Tab, a `#part` link
  and `scrollIntoView` stop below it; sticky parts of pages add `--todo-top` (Settings' folder panel; Review's video is not sticky, §12);
  the clip page's video is shorter by `--todo-top` (`performance.css`), so the stacks (desktop) and the winner and five
  chips (phones) still start on the first screen. Tapping the pill opens the list as a glass panel dropping from the
  top (phones: full width, stopping above the tab bar; tablets and the clip page: 380 px at the right) over a light
  scrim, where it covers the pill. The panel is a real dialog, like Ask's sheet on a phone (§19.8): everything behind
  it is `inert` while it is open (messages, `.toasts`, stay tappable), Tab and Shift+Tab go round inside it (`trapTab`
  from `components/Sheet.tsx`), and × / Escape / a tap outside close it and give focus back to the pill. It is open
  only on the page it was opened on, so a page change (Set up) closes it in the same render and focus lands on the new
  page as after any page change.
* It never hides while rows remain: folding only makes it the pill.
* **The Ask pill** (§19.8) rests under the open column, 14 px below it. The list's buttons are controls like any
  other, so the launcher can never come to rest on one (only `.setup-todo-bar` and the open panel's
  `.setup-todo-scrim` are in its chrome list, `features/help/dodge.ts`). And because the launcher only keeps clear of
  what shows (§19.8 `shownBox`), a strip of the page that runs on under the column, or rows scrolled out of the column
  on a short window, never make it fade out: with the column open it stays in its corner, shown, at every scroll
  position.
* **No jump on load**: the list waits for the setups, so it arrives a moment after the page. Where the list was on
  screen the last time this device looked (`localStorage["cf-setup-todo-open"]`), an empty `.setup-todo--hold` with
  the same `data-mode` keeps its room from the first paint, so the page does not move when the list shows.
* **Glass only**: the column, the pill, the bar, the panel and the "All set!" card are `.glass` elements (the card
  `.glass--green`, the panel with the dense tint of `.sheet.glass`) and take their tint from `--glass-tint`; none sets a
  background or a `backdrop-filter` of its own. Rows are light tiles inside that glass, as in other panels. No rule
  sets `cursor` (§20.14): the pill, the rows and the round **–** / × buttons (`.icon-btn`) light up on hover.
* **Sizes**: every control is at least 44 px (48 px on phones, `--tap`); the pill is 48 px everywhere.
* **Not shown** on `/settings/posting/setup` and `/settings/posting/setup/{platform}`: those pages are the full list
  and the steps themselves, so the floating copy would repeat them. The celebration still plays there, as a card that
  floats over the page and takes no room (`data-mode="done"`), so the page does not move. Not on sign-in, the pretend
  consent page or the public pages (they are outside the signed-in shell).

**Server** (`api/src/clipfactory_api/settings.py`): `Settings.setupSkipped: Platform[]`, default `[]`, validated like
`platforms` (a list of known platform names; returned in canonical order without repeats; anything else → 400
`bad_request`; a bad stored value falls back to `[]`). It is the same on every device. **Posting is unchanged**:
`posts.create_posts_once` makes posts for `settings.platforms` only, `queued` only when that platform's account is
connected, else `pending_integration`, and the clip flow makes no publish step for `pending_integration`
(`flows/clip_flow.py`). So a skipped platform that is not connected is never tried, and a skipped one that is connected
is posted to as before; skipping does not remove it from **Where clips go** (connecting it later starts posting there
with no other change).

**Mock** (§17.10): `putSettings` validates `setupSkipped` the same way and keeps it in `sessionStorage`
(`cf-mock-setup-skipped`), so a reload keeps the skips like the server does.

**Settings › Posting › Set up posting** keeps the full list always: a new apple `setup-todo` ("The setup list on your
screen", leaf "It stays at the top right until each place is set up or skipped. Skipped ones wait here."; title "On
your screen: 2 of 5 done" or "All done: the list is gone"). Each platform is one glass card (`li.setup-card-wrap.glass`):
the link to its page (`a.setup-card`, as before) and, under a hairline inside the same card, its line
(`.setup-card__skip`): "Want to do it later?" with **Skip** (the same confirm) while it is not ready and not skipped;
once skipped, the card's state line says "Skipped" (the same word as the floating list) and the line reads "You won't
post to {Platform} until you set it up." (connected: "{Platform} is connected but needs one more step.") with
**Un-skip**. A ready card has no line. The link fills what is left of the card, so cards in one row are the same
height. Ask Clip Factory has the guide `setup-list-gone` ("Where did my setup list go?", §19.3) →
`/settings/posting/setup#setup-todo`.

**Tests**: Vitest `test/setupTodo.test.ts` (rows and states, all ready, all skipped, a mix, a skip finishes a row in
any state that is not ready, ready wins over a skip and makes it stale, a platform that was ready comes back,
unconfirmed skip changes nothing, skip/un-skip order, both skip questions, the skipped note, the three "All set!"
lines, hidden pages, no column on a clip's page, and the column's width rule read from the CSS: with it open at
`TODO_RAIL_MIN` the page keeps the room of every wider layout's starting width; `setup-todo.css` sets no cursor, no
`backdrop-filter` and no background on a surface), `test/setupTodoList.test.tsx` (the component: its room kept while the setups load and given back when they cannot
be read, the panel as a dialog with the page behind it `inert`, the skip question), `test/helpDodge.test.tsx`
(`shownBox`, `controlBoxes` with the
column's own scroller) and `test/session.test.tsx` (an updater builds on a save still on its way); pytest
`test_settings_and_system.py` (default, saved in order without repeats, un-skip, validation, bad stored value) and
`test_clips.py` (a skipped platform that is not connected gets `pending_integration`, a skipped connected one is still
`queued`); Playwright `e2e/setup-todo.spec.ts` (every main page and not the setup pages; a clip's page shows the pill
on its bar and keeps its fan; Set up per platform; Skip needs the confirm, Keep it is first, focused and the strong
button, Keep it / Escape / a tap outside change nothing; persists after reload; un-skip; a `needs_you` row (X out of
credits) can be skipped, skipping every row ends the list, and once X is ready its skip is dropped and it comes back
when it needs the owner; gone with "All set!" and the right line, confetti and the success sound; no confetti with
reduced motion; back on an expired token; it asks for the setups again on a page change; fold and unfold; Settings ›
Set up posting: Skip with the confirm, "Skipped" on the card, Un-skip; at 1440×860, 1440×790 and 1536×730 every row and
both its buttons show without scrolling and stay clear of the Ask pill, a 600 px tall window fades the bottom; the
column opens at 1440 px and not at 1439 or 1280, the page keeps at least its 1100 px room and Home's headline keeps its
full stop; "All set!" on a setup page does not move the page at 1440 and 375 px; phone pill + panel above the tab bar
and below nothing, the page behind the panel is `inert` and messages are not, Tab and Shift+Tab stay in the panel, Set
up from the panel lands focus on `<main>`; the pill stays on screen at every scroll position of the main pages on its
glass bar, and Tab brings a control out from under the bar; the last skip from the panel leaves focus on `<main>`; at
320 px the pill still says "Set up posting"; the Ask pill keeps its corner under the open column at every scroll
position (1920 px with the update bar, 1440×900, 1440×600 with rows scrolled out of the column): not moved, not
faded out, on none of the list's buttons; a reload keeps the list's room from the first paint at 1440 and 375 px;
never covers a control at 320/375/768/1024/1280/1440/1920 in light and dark at the top, middle and bottom of each page,
no overflow with the plain list and with one row of every kind, targets ≥ 44 px (48 px on phones), only the arrow
cursor); `e2e/contrast.spec.ts` reads every face of the list with the audit's three checks (axe, every text run against
every background, no text under 12 px), in light and dark: the open column and the phone sheet (320 and 375 px) with
one row of every kind (`mixedSetup` in `e2e/helpers.ts`), the folded pill, the pill under the pointer and on its glass
bar, the skip question over the column and over the sheet, "All set!" as the column's card and in the pill's strip, and
Settings › Set up posting with its Skip and Un-skip lines; `e2e/audit-setup.spec.ts` holds the list to the rule the
Home card had (no line starts with a lone mark, 320–414 px) and audits the Settings cards with their Skip lines at
every width (48 px targets on phones); `e2e/setup.spec.ts` uses the list instead of the Home card;
`performance.spec.ts` and `audit-performance.spec.ts` run with the list showing (no setup is skipped first);
`e2e/glide.spec.ts` (no cursor but the arrow) covers the list on every main page; `screenshots.spec.ts` adds
`setup-todo{,-open,-skip,-skipped,-all-set}` at 375, 1024 and 1440, light and dark, and `setup-todo-scrolled` (the pill
on its glass bar) at 375 and 1024.
