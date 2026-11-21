# Set up posting

Clip Factory can post your clips by itself to **YouTube, TikTok, Instagram, Facebook and X**. For that, each of the
five needs to be set up **once**. This page is the same list of steps the app shows you in **Settings › Posting ›
Set up posting**, word for word in meaning and in the same order, so you can read ahead or print it.

**Steps checked on 19 Nov 2026** against each platform's own help pages (the list is at the
[end of this page](#research-sources-checked-on-16-nov-2026), with what changed on 19 Nov 2026 below it). Platforms sometimes rename a button. When that happens, the app
shows an "If you see…" hint, and the [maintainer notes](#for-maintainers-keeping-the-app-and-this-page-in-step) say how to
update both.

You never write code. You only use the Clip Factory app and the platforms' own websites.

## The setup list

Do each one once. After that Clip Factory posts by itself. You can do them in any order and stop at any time: the app
remembers where you were and opens the next step for you.

| # | Platform | Time | Cost | What you need first | Good to know |
|---|---|---|---|---|---|
| 1 | [YouTube](#youtube) | about 20 minutes | Free | A Google account with a YouTube channel | Posts are public straight away. |
| 2 | [TikTok](#tiktok) | about 40 minutes, then TikTok checks your app (days) | Free | A TikTok account | Posts may stay **"Only me"** for a long time. TikTok often says no to apps that only one person uses. |
| 3 | [Instagram](#instagram) | about 25 minutes | Free | An Instagram **Creator** or **Business** account linked to a Facebook **Page**, and a Facebook account | Reels may be seen only by you until the app is **Live**. |
| 4 | [Facebook](#facebook) | about 25 minutes | Free | A Facebook **Page** you fully control | Reels may be seen only by you until the app is **Live**. |
| 5 | [X](#x) | about 15 minutes | **Costs a little**: about $1.50 for 100 clips | An X account and a grown-up's card | X charges for every post. Clip Factory stops at $10 a month. |

The ring at the top of Set up posting says how many are ready, for example **2 of 5 ready**. A **Set up posting**
list also stays at the top right of every page (a small pill on phones) with **Set up** and **Skip** for each
platform. It goes away when each one is ready or skipped, and you can always skip one or bring it back here in
Settings.

**Get paid by brands.** Under the five cards sits one more card, **Content Rewards**, for paid clipping campaigns. It
is set up once too (3 steps), but it is not a place Clip Factory posts to, so it never counts in **2 of 5 ready** and
is never in the floating list. Its steps are in [Content Rewards](#content-rewards) below.

## How every setup works

Every platform page has the same four parts:

1. **Get ready**: what your account needs before you start.
2. **Make your {Platform} key**: a few clicks on the platform's developer website. You do this once.
3. **Connect**: one big button. You say yes on the platform and come back to Clip Factory.
4. **Go public**: what the platform still has to allow, and how it is going.

Each step is a big numbered card. The numbers run on from one part to the next. A card has only what that step needs:

| On the card | What it does |
|---|---|
| **Open {site}** | Opens the right page of the platform in a new tab. Come back to the Clip Factory tab after. |
| **Copy** | Copies a value (a name, a web address). You see **Copied!**. Then paste it on the platform. |
| A paste box with **Paste** | Where you put a key from the platform. The box checks it while you type and says what is wrong. |
| An upload box | Only on TikTok: where you drop the file TikTok gives you. |
| **If you see…** | What to do when the platform looks a little different. |
| **I did this** | Press it when you finished the step. The next step opens. |

Some steps tick themselves (for example when your keys are saved or when you are connected). Steps marked **(only if
you need it)** are extra and do not count in the ring.

There is always **one** vermilion-red button on the screen: it is the next thing to press.

**Use a computer.** The developer websites work best on a computer. Use the same browser for every step, and keep
Clip Factory open in one tab and the platform in another.

### The values Clip Factory gives you

You never type these. Every step that needs one has a **Copy** button. They are listed here so a grown-up can check
them. `{app}` is your Clip Factory address and `{hooks}` is its sign-in return address; the app fills in the real ones.

| Name on the card | What it is |
|---|---|
| App name | `Clip Factory` (Facebook: `Clip Factory Pages`) |
| Description | "Clip Factory turns my gameplay recordings into short vertical clips and posts them to my own accounts when I press Upload." |
| Website | `{app}/about.html` |
| Website prefix (TikTok) | `{app}/` |
| Privacy Policy | `{app}/legal/privacy.html` |
| Terms of Service | `{app}/legal/terms.html` |
| Data deletion instructions | `{app}/legal/privacy.html#delete` |
| App domain | the host of `{app}`, for example `dxxxx.cloudfront.net` |
| Return address domain | the host of `{hooks}`, for example `xxxx.execute-api.eu-north-1.amazonaws.com` |
| Redirect URI (return address) | `{hooks}/oauth/{platform}/callback`, for example `…/oauth/youtube/callback`. Exact, no slash at the end. |
| Permissions (scopes) | the list for that platform (YouTube: 3 lines) |
| Your email | the email you sign in to Clip Factory with |
| X use case | "Post my own short video clips to my own X account and read their view and like counts in my personal Clip Factory app." |
| TikTok description | "My own clipping tool. It turns long videos and streams I pick (my own and other creators', including paid clipping campaigns) into short clips, and posts the ones I approve to my own accounts when I press Upload." (TikTok only, so it says the same as the form in step 24) |
| TikTok review text | See [step 13 of TikTok](#13-fill-in-app-review-then-save). |

The About, Privacy and Terms pages live on your Clip Factory address on purpose: TikTok checks that the website is
yours, and Google lists every web address your app uses.

---

## YouTube

About 20 minutes · Free · Steps checked on 19 Nov 2026.

| # | Step | Part |
|---|---|---|
| 1 | Have a YouTube channel | Get ready |
| 2 | Use a computer | Get ready |
| 3 | Open Google Cloud | Make your YouTube key |
| 4 | Make a project | Make your YouTube key |
| 5 | Turn on YouTube Data API v3 | Make your YouTube key |
| 6 | Turn on YouTube Analytics API | Make your YouTube key |
| 7 | Start Google Auth Platform | Make your YouTube key |
| 8 | Fill in Branding | Make your YouTube key |
| 9 | Add the 3 permissions | Make your YouTube key |
| 10 | Publish the app | Make your YouTube key |
| 11 | Make the key | Make your YouTube key |
| 12 | Paste the key here | Make your YouTube key |
| 13 | Connect YouTube | Connect |
| 14 | Pick who can see your clips | Go public |
| 15 | Post at least every 6 months (only if you need it) | Go public |
| 16 | Only if you post over 100 a day (only if you need it) | Go public |

### Part 1: Get ready

#### 1. Have a YouTube channel
- Open **youtube.com/account**.
- No channel yet? Press your profile picture, then **Create a channel**.
- Shorts are tall videos up to 3 minutes long.
- A Short over 1 minute with copyrighted music gets blocked. Keep music clips under 60 seconds.

#### 2. Use a computer
- The developer websites work best on a computer. Use the same browser for every step.
- Sign in to Google with the account that owns the channel.

### Part 2: Make your YouTube key

#### 3. Open Google Cloud
- Press **Open Google Cloud** (console.cloud.google.com).
- First time? Pick your country, tick the box, press **Agree and continue**.
- You do not need a card. Skip any free-trial offer.

#### 4. Make a project
- Press **Open** (console.cloud.google.com/projectcreate).
- Project name: press **Copy** next to App name and paste it.
- Location: **No organization**. Press **Create**.
- Wait for the bell. Check that "Clip Factory" is picked at the top.

#### 5. Turn on YouTube Data API v3
- Press **Open** (…/apis/library/youtube.googleapis.com). Press **Enable**.
- If you see **Manage**, it is already on. Press **I did this**.

#### 6. Turn on YouTube Analytics API
- Press **Open** (…/apis/library/youtubeanalytics.googleapis.com). Press **Enable**.
- If you see **Manage**, it is already on.

#### 7. Start Google Auth Platform
- Press **Open** (…/auth/overview). Press **Get started**.
- App name: copy it. User support email: pick yours. Press **Next**.
- Audience: **External**. Press **Next**.
- Contact email: copy yours. Press **Next**.
- Tick the User Data Policy box. Press **Continue**, then **Create**.

#### 8. Fill in Branding
- Press **Open** (…/auth/branding).
- Under **App domain**, copy the Website, Privacy Policy and Terms of Service addresses into the three boxes
  (home page, privacy policy link, terms of service link).
- Press **Add domain** two times. Copy in the App domain, then the Return address domain.
- Developer contact: copy your email. Leave the logo empty. Press **Save**.
- If you see an error about a domain: tell Clip Factory support. A custom domain fixes it.

#### 9. Add the 3 permissions
- Press **Open** (…/auth/scopes). Press **Add or remove scopes**.
- Scroll down to **Manually add scopes**. Copy the 3 permissions and paste them, one per line.
- Press **Add to table**, then **Update**, then **Save**.
- "Your sensitive scopes" is normal. Do not worry.

#### 10. Publish the app
- Press **Open** (…/auth/audience). Press **Publish app** and confirm.
- It must say **In production**. In **Testing**, YouTube stops working after 7 days.
- Do NOT press **Prepare for verification**. You do not need it.
- Clip Factory shows a warning on YouTube until you tick this step.

#### 11. Make the key
- Press **Open** (…/auth/clients). Press **Create client**.
- Application type: **Web application**. Name: copy the App name.
- Under **Authorized redirect URIs**, press **Add URI**. Copy the Redirect URI and paste it.
- Press **Create**.
- Copy BOTH values now, or press **Download JSON**. Google shows the secret only once.

#### 12. Paste the key here
- Paste the **Client ID** and the **Client secret** in the two boxes.
- Or drop the key file Google gave you here: both boxes fill in. (Or press **Use the key file from Google**.)
- Press **Save keys**. This step ticks itself.
- Lost the secret? Open the client, press **Add secret**, use the new one. Then **Disable** the old one.

### Part 3: Connect

#### 13. Connect YouTube
- Press the big **Connect YouTube** button.
- Pick your Google account, then your channel.
- If you see "Google hasn't verified this app": press **Advanced**, then **Go to … (unsafe)**. It is your own app, so this is normal. It may show a web address instead of the name.
- Tick every box (or **Select all**). Press **Continue**.
- You come back to Clip Factory with confetti and "Connected as …". This step ticks itself.
- If you see `redirect_uri_mismatch`: wait 5 minutes and press Connect again. Still wrong? Do step 11 again with the **Copy** button.

### Part 4: Go public

#### 14. Pick who can see your clips
- Pick one inside the card: **Everyone**, **Only people with the link** or **Only me**.
- It starts on **Everyone**. YouTube asks every app to let you choose.
- Status: "Works now. Your clips go up for everyone."

#### 15. Post at least every 6 months
- Only if you need it. Google deletes keys that are not used for 6 months.
- Google emails you 30 days before. Pressing **Connect again** keeps them alive.

#### 16. Only if you post over 100 a day
- Only if you need it. Most people never post that many.
- For more, press **Open Google's ask-for-more form** (YouTube's **Audit and Quota Extension Form**). You do not need it to start.

### If YouTube says something went wrong

| You see | Do this |
|---|---|
| "You pressed cancel. Press Connect YouTube to try again." | Press **Connect YouTube**. |
| "That took too long. Press Connect YouTube again." | Press **Connect YouTube** again. You have 10 minutes each time. |
| "The key does not work. Copy the Client ID and secret again (step 11)." | Do step 11 and step 12 again. |
| "The return address does not match. Copy it again in step 11." | Do step 11 again with the **Copy** button. |
| "A permission box was not ticked. Connect again and tick every box." | Press **Connect YouTube** and tick every box. |
| "This Google account has no YouTube channel. Make one first (step 1)." | Do step 1, then connect again. |
| "YouTube did not answer. Try again in a few minutes." | Wait, then press **Connect YouTube**. |

---

## TikTok

About 40 minutes, plus the time TikTok takes to check your app · Free · Steps checked on 21 Nov 2026.

**Please read first.** Until TikTok checks and approves the app, it can only post to a **private** account, and every
post is **"Only me"**. TikTok often says no to apps that only one person uses. If it says no, Clip Factory still posts
to TikTok, but only you can see those posts, and TikTok gives no numbers for them.

| # | Step | Part |
|---|---|---|
| 1 | Have your TikTok account | Get ready |
| 2 | Use a computer | Get ready |
| 3 | Make your TikTok private for now | Get ready |
| 4 | Make a TikTok developer account | Make your TikTok key |
| 5 | Make an organization | Make your TikTok key |
| 6 | Create the app | Make your TikTok key |
| 7 | Fill in App details | Make your TikTok key |
| 8 | Choose Web | Make your TikTok key |
| 9 | Add 2 products | Make your TikTok key |
| 10 | Paste the return address | Make your TikTok key |
| 11 | Turn on Direct Post | Make your TikTok key |
| 12 | Add 2 permissions | Make your TikTok key |
| 13 | Fill in App review, then Save | Make your TikTok key |
| 14 | Prove the website is yours | Make your TikTok key |
| 15 | Paste Client key and secret | Make your TikTok key |
| 16 | Make a Sandbox for testing | Connect |
| 17 | Add yourself as a test user | Connect |
| 18 | Verify the website in Sandbox too | Connect |
| 19 | Use the Sandbox keys | Connect |
| 20 | Connect TikTok | Connect |
| 21 | Record the real demo video | Go public |
| 22 | Ask TikTok to check the app | Go public |
| 23 | When it says Live | Go public |
| 24 | Ask to post publicly | Go public |
| 25 | Make your account public again | Go public |

### Part 1: Get ready

#### 1. Have your TikTok account
- Use the TikTok account your clips should go on.

#### 2. Use a computer
- The developer websites work best on a computer. Use the same browser for every step.

#### 3. Make your TikTok private for now
- In the TikTok app, press **Profile**, then the menu (three lines).
- Press **Settings and privacy**, then **Privacy**. Turn on **Private account**.
- Until TikTok checks the app, it only posts to private accounts.

### Part 2: Make your TikTok key

TikTok's app page is one long page with one **Save** button. **Save stays off until App review has its text and a
video.** So fill in steps 7 to 13 first, and press Save only in step 13.

#### 4. Make a TikTok developer account
- Press **Open** (developers.tiktok.com/signup). Press **Sign up**, or **Log in** if you have one.
- Accept the terms.

#### 5. Make an organization
- Press **Open** (the Organizations page). Press **Add organization**.
- Name: copy the App name. Press **Create**.

#### 6. Create the app
- Press your profile icon, then **Manage apps**, then **Connect an app**.
- Pick your organization. Press **Confirm**.

#### 7. Fill in App details
- Press **Download the icon** in Clip Factory. Upload that picture as the app icon.
- App name: copy it. Category: pick the closest one.
- Description: copy it. TikTok gets its own one: it names the other creators' videos and paid campaigns too.
- **Terms of Service URL**: copy it. **Privacy Policy URL**: copy it.
- Don't press **Save** yet. It stays off until **App review** has its text and a video (step 13).

#### 8. Choose Web
- Under **Platforms**, tick **Web** only. Not **Desktop**, not Android or iOS.
- **Website URL**: copy the Website.

#### 9. Add 2 products
- Press **Add products**. Add **Login Kit** and **Content Posting API**.
- Nothing else. There is no **Display API** to add now: its permissions come with Login Kit.

#### 10. Paste the return address
- Open the **Login Kit** settings.
- Copy the return address and paste it into **Redirect URI** for **Web**.

#### 11. Turn on Direct Post
- Open the **Content Posting API** settings. Turn on **Direct Post**.
- If you see a switch with "Direct Post" in its name, turn it on.

#### 12. Add 2 permissions
- In **Login Kit**, open **Scopes** (TikTok's word for permissions). Press **Add scopes**.
- Tick **video.list** (your views) and **user.info.stats** (your followers, for the money tile). Press **Add**.
- Now these must be there: user.info.basic, video.publish, video.list, user.info.stats.
- video.upload may be there too. Leave it.

#### 13. Fill in App review, then Save
- Open **App review**. Copy the TikTok review text from Clip Factory and paste it. It says, one line per permission:
  "user.info.basic (Login Kit): connect my TikTok and show my name and picture in Clip Factory.
  video.publish: post clips I approved with Upload straight to my own TikTok (Direct Post).
  video.upload: comes with Content Posting API. Clip Factory does not ask for it; it only uses Direct Post.
  video.list: show the views and likes of my own posts on my Clip Factory dashboard.
  user.info.stats: show my follower count on my Clip Factory Money page, only after I say OK."
- Record your screen for a few seconds: the About page, then the setup page. Upload that video.
- Now press **Save**. You swap in the real demo video later (step 21).
- Save still won't press? App review needs both: the text and a video.

#### 14. Prove the website is yours
- Open **URL properties**, press **Verify properties**. Check **Production** is picked.
- Pick **URL prefix**, not Domain.
- Copy the Website prefix and paste it. Press **Verify**.
- Download TikTok's file. Drop it in the upload box in Clip Factory. This step ticks itself.
- Back on TikTok, press **Verify**.

#### 15. Paste Client key and secret
- Open **Credentials**. Press the copy icon next to **Client key**. Paste it in Clip Factory.
- Do the same for **Client secret**.
- Press **Save keys**. This step ticks itself.

### Part 3: Connect

TikTok only lets you test in a **Sandbox** until it approves the app. So you connect in a Sandbox first. Your posts
stay private until TikTok approves the app.

#### 16. Make a Sandbox for testing
- At the top, switch **Production** to **Sandbox**. Press **Create Sandbox**.
- Give it a name. Pick "clone Production". Press **Confirm**, then **Apply changes**.

#### 17. Add yourself as a test user
- Open **Sandbox settings**, then **Target users**. Press **Add account**.
- Log in with your TikTok account and accept.
- It can take up to an hour. Refresh the page to check.

#### 18. Verify the website in Sandbox too
- Do step 14 again, with **Sandbox** picked.
- Drop that file in Clip Factory too.

#### 19. Use the Sandbox keys
- If you see a different **Client key** in the Sandbox, paste those keys in Clip Factory for now.

#### 20. Connect TikTok
- Press the big **Connect TikTok** button.
- Log in. Check that it says Clip Factory. Leave every switch on.
- Press **Authorize**. You come back with confetti. This step ticks itself.
- Status: "Works now, but your TikTok posts stay private until TikTok says yes."

### Part 4: Go public

#### 21. Record the real demo video
- Use a computer. Connect in the Sandbox, with your TikTok still private. Record your screen with the address bar in
  sight.
- Follow the shot list below, in order. It starts on the About page, then **Connect TikTok** and TikTok's
  **Authorize** screen.
- Then **Upload** one clip, choosing everything by hand in the **TikTok** row. Show each line TikTok wants to see.
- End with the post arriving on your TikTok. Keep it short, about 1 minute. Save it as MP4, under 50 MB. You can send
  up to 5 videos.
- The same video goes to App review (step 22) and to the form (step 24).
- A line from the shot list you can't find? Tap the **TikTok** row to open it. Every line is in there or right above
  **Upload**. TikTok checks every one.
- Your Client secret, a key or a long code on screen? Cut that part out before you upload the video.

The shot list (Clip Factory has a **Copy** button for it):

> 1. Start on the About page. Show the Privacy and Terms links, and keep the address bar in sight.
> 2. Sign in. Open Settings › Posting › Set up posting › TikTok. Press Connect TikTok. Show TikTok's screen with every permission, press Authorize, then show TikTok connected.
> 3. Show where the clip comes from: the long video or stream you picked (or the campaign brief).
> 4. Open Review. Play the clip. Show it has no watermark or logo on it.
> 5. Show nothing is set for TikTok yet. Tap the TikTok row (caption and settings). Show "Asking TikTok…", then "Posting as" with your name and picture.
> 6. Change the TikTok caption: the words and the hashtags.
> 7. Show Upload is held: "Pick who can see it on TikTok first." Open Who can see it: nothing is picked, and only TikTok's choices are there. Don't pick yet.
> 8. Show Comments, Duet and Stitch: all off. Turn one on by hand. A switch you turned off in TikTok is grey: "Turned off in your TikTok settings."
> 9. Turn on Commercial content. Show the line under it: "Pick Your brand, Branded content, or both." Pick Only me in Who can see it. Show Upload is still held: "Pick Your brand or Branded content on TikTok first."
> 10. Tick Your brand. Show its "Promotional content" tag.
> 11. Tick Branded content. Show "Paid partnership" and the Branded Content Policy line above Upload. Who can see it now says: "Branded content can't be Only me. Turn off Branded content."
> 12. Untick Branded content. Pick Only me by hand. Turn Commercial content off.
> 13. Show the Music Usage Confirmation line right above Upload.
> 14. Press Upload. Show the note: "TikTok can take a few minutes to process your clip."
> 15. Open Library. Show the clip on its way, then Posted.
> 16. Open TikTok. Show the post: private (only you can see it), your caption as you changed it, your Comments, Duet and Stitch picks, and no watermark.
> 17. Open Money. Show the TikTok part (it uses video.list and user.info.stats). If it asks for your OK, give it, so TikTok's screen shows user.info.stats.
> 18. Last, on another clip: show nothing is on. Tap Use my settings: your saved TikTok choices go on with that one tap. Tap the TikTok row to show every option.

#### 22. Ask TikTok to check the app
- Switch back to **Production**. Open **App review**.
- Check the review text from step 13 is there. Swap in the real demo video.
- Press **Save**, then **Submit for review**.
- In Clip Factory, pick what TikTok says: **Draft**, **In review**, **Live** or **Not approved**.
- Not approved? Read **Review comments**, fix what they say, and submit again.
- While it is in review: "TikTok is checking your app. This can take days."

#### 23. When it says Live
- If the Production keys are different from the Sandbox ones, paste them in Clip Factory.
- Then press **Connect again**.

#### 24. Ask to post publicly
- Only after **App review** says **Live** (step 22). In **Production**, open **Content Posting API**. Press **Apply**
  next to **Direct Post**. (Or press **Open TikTok's form**: developers.tiktok.com/application/content-posting-api.)
- The form has 4 pages and does not save. Paste each answer below into the box with the same name. Clip Factory has a
  **Copy** button for each.
- Page 1, **General Information**: your full name (type your own), the organization name, website and description.
- Page 2, **API client information**: the app ID (the long number after /app/ in the address bar of your TikTok app
  page), how you use Direct Post, and how many users. Pick the smallest choice, then paste how you got the number.
- Page 3, **Supporting documents**: upload your demo video from step 21. Paste the data you store.
- Page 4, **Review**: read the 3 boxes and tick them. Press **Next**. A spinner means your video is uploading: it can
  take 2 minutes. Keep the page open.
- Then it says **Under review**. TikTok often takes 1 to 3 weeks.
- **TikTok may say no, because Clip Factory is a tool for one creator.** TikTok's rules ask for apps that many people
  can use. Clip Factory is only for you. If it says no, your posts stay private, but they still post.
- A no with empty **Review comments**? Ask TikTok support (developers.tiktok.com/support) for the reason before you
  try again.

The answers, word for word. They are all true today: do not change them to sound bigger.

- **Organization name**: Clip Factory
- **Organization website**: your About page (the Website URL from step 8)
- **Organization description**:

> Clip Factory is my own clipping tool, for me as one creator. Today I am its only user. Sign-up is invite-only, so it is not open to the public.
>
> There is no company. Clip Factory is the name of my tool, and I am one person.
>
> It turns long videos and streams I pick into short vertical clips. The sources are my own gameplay recordings and other creators' streams and videos, including paid clipping campaigns (such as Content Rewards), where a creator pays clippers to post clips of their content. I treat campaign clips as paid partnerships and mark them as Branded content.
>
> I watch every clip and post only the ones I approve, to my own TikTok account, which I connected myself with Login Kit.

- **How you use Direct Post**:

> Clip Factory uses Direct Post to post one clip to my own TikTok account when I press Upload. Nothing posts by itself.
>
> Before each post it asks TikTok for my creator info and shows my nickname and picture. I pick who can see it from TikTok's own options; nothing is picked for me. Comments, Duet and Stitch start off, and a setting I turned off in TikTok stays off and grey. I can turn on Commercial content and pick Your brand, Branded content or both; Branded content can't be Only me. I can edit the caption. TikTok's Music Usage Confirmation (and the Branded Content Policy for branded content) shows above Upload. A clip longer than TikTok allows for me can't be posted.
>
> After Upload, Clip Factory sends the video file, tells me TikTok can take a few minutes, and checks the post status until it is posted.
>
> A Use my settings button puts my saved TikTok choices on with one tap of mine, per clip. Opening the TikTok row shows every option.
>
> Other scopes: user.info.basic shows my name and picture. video.list shows the views and likes of my own posts. user.info.stats shows my follower count on my Money page, only after I say OK.

- **How you got the number**:

> Clip Factory has one user: me. Sign-up is invite-only, so at most 1 creator posts with it on any day, up to about 15 clips, which is TikTok's own daily limit for one creator. So I picked the smallest choice.

- **Data you store**:

> Clip Factory stores this TikTok data, for my one account only:
> - open_id
> - access token and refresh token (in AWS Secrets Manager, encrypted at rest), and when they expire
> - the scopes I granted
> - username, display name and avatar URL
> - for each post: publish_id, the privacy level I picked, the post status, TikTok's post id, and the error if a post fails
> - the caption I wrote
> - views, likes, comments and shares of my own posts (video.list)
> - a total of views and a count of long videos from my recent videos (video.list)
> - my follower count (user.info.stats, only after I say OK)
> Disconnect revokes the token and deletes it.

#### 25. Make your account public again
- Only after the form in step 24 passes: turn **Private account** off again.
- Posts from before stay private. To show one, change it to **Everyone** in the TikTok app.
- TikTok still allows about 15 posts a day.

### If TikTok says something went wrong

| You see | Do this |
|---|---|
| "You pressed cancel. Press Connect TikTok to try again." | Press **Connect TikTok**. |
| "That took too long. Press Connect TikTok again." | Press **Connect TikTok** again. |
| "The key does not work. Copy the Client key and secret again (step 15)." | Do step 15 again (in the Sandbox: step 19). |
| "The return address does not match. Copy it again in step 10." | Do step 10 again with the **Copy** button. |
| "A permission box was not ticked. Connect again and tick every box." | Do step 12, then connect again and leave every switch on. |
| "Make your TikTok account private (Setup step 3), then press Try again." | Do step 3, then press **Try again** on the clip. |
| "TikTok did not answer. Try again in a few minutes." | Wait, then press **Connect TikTok**. |
| "Finish the TikTok review steps to post outside the Sandbox." | Do steps 21 to 23. |

**Every clip with TikTok ticked** waits for your tap: press **Use my settings** (it puts your saved TikTok choices on),
or open the **TikTok** row and pick who can see it there (there is no default, TikTok's rule). The row also has the
Comments, Duet and Stitch switches and Commercial content (tick **Branded content** for a paid partnership). Then press
**Upload**. TikTok can take a few minutes to process your clip. Your saved choices live in Settings › Posting › My
settings.

If a clip says "Pick who can see it on TikTok again, then press Try again.", press **Try again** on the clip. The
**Post to TikTok** sheet opens first. Pick again, then press the vermilion-red button on the sheet.

---

## Instagram

About 25 minutes · Free · Steps checked on 19 Nov 2026. Uses Meta's Instagram API with Facebook Login.

Instagram and Facebook each get **their own** Meta app. Some steps look the same twice. That is on purpose: it keeps
the two from getting in each other's way.

| # | Step | Part |
|---|---|---|
| 1 | Make Instagram a pro account | Get ready |
| 2 | Link Instagram to a Facebook Page | Get ready |
| 3 | Use a computer | Get ready |
| 4 | Business portfolio, if Meta asks (only if you need it) | Get ready |
| 5 | Become a Meta developer | Make your Instagram key |
| 6 | Create the app | Make your Instagram key |
| 7 | Fill in Basic settings | Make your Instagram key |
| 8 | Make the Instagram login setup | Make your Instagram key |
| 9 | Double-check the return address (only if you need it) | Make your Instagram key |
| 10 | Paste the 3 values | Make your Instagram key |
| 11 | Connect Instagram | Connect |
| 12 | Make the app Live | Go public |
| 13 | Post one test clip | Go public |

### Part 1: Get ready

#### 1. Make Instagram a pro account
- In the Instagram app, press your picture, then the menu.
- Press **Account type and tools**, then **Switch to professional account**.
- Pick **Creator** or **Business**. Personal accounts cannot connect.

#### 2. Link Instagram to a Facebook Page
- In the Instagram app, press **Edit profile**, then **Page** (under Public business information).
- Pick your Facebook Page, or press **Create a Facebook Page**.
- No Page yet? Make one first in the [Facebook setup, step 1](#1-have-a-facebook-page).
- Facebook shows a banner asking you to confirm who runs the Page? Do it now. Instagram will not post until you do.
- If you see no **Page** line in Edit profile: on Facebook, open your Page, then **Settings**, then **Linked
  accounts**, then **Instagram**. Press **Connect account**.
- If you see **Manage connection** on Facebook (on your Page, after **Edit profile**): your Instagram is already
  linked. Check the Instagram name, close it, and press **I did this**. Never press **Disconnect**.
- If **Manage connection** shows the wrong Instagram: press **Disconnect**, then **Connect account** and log in to
  your clip Instagram.
- "People who help manage your Page" on that sheet: leave those choices as they are. They only matter if other
  people help run the Page.

#### 3. Use a computer
- The developer websites work best on a computer. Use the same browser for every step.
- Log in to facebook.com with the Facebook account that will own the app.
- Wrong account? Log out first.

#### 4. Business portfolio, if Meta asks
- Only if you need it: Meta asks for a portfolio, or your Instagram is already in one. Otherwise skip this step.
- Press **Open** (business.facebook.com). Press **Create a business portfolio**.
- Type a name, your name and your email. Press **Create**.
- Press **Settings**, then **Accounts**, then **Instagram accounts**. Press **Add** and log in to Instagram.
- Already in a portfolio? Use that one.

### Part 2: Make your Instagram key

#### 5. Become a Meta developer
- Press **Open** (developers.facebook.com/async/registration). Press **Next**.
- Type the codes Meta sends you. Pick **Creator**.

#### 6. Create the app
- Press **Open** (developers.facebook.com/apps). Press **Create app**.
- App name: copy it. Type your email. Press **Next**.
- Use case: **Manage messaging & content on Instagram**. Press **Next**.
- Pick your portfolio, or skip it. Press **Next**, then **Go to dashboard**.
- Never ask Meta for a review. You do not need one.

#### 7. Fill in Basic settings
- Press **App settings**, then **Basic**.
- **App domains**: copy the App domain. **Privacy Policy URL**: copy it. **Terms of Service URL**: copy it.
- Under **User data deletion**, **Data deletion instructions URL**: copy it.
- Pick a **Category**. **App icon**: press **Download the icon** in Clip Factory and upload it.
- Contact email: your email (already filled in).
- In the EU: **Data Protection Officer** is your name and email.
- Press **Save changes**. Meta needs all of this to make the app Live (step 12).

#### 8. Make the Instagram login setup
- Press **Use cases**, then **Customize** next to Instagram. Open the tab **API setup with Facebook login**.
- Press **Create new configuration** (under Facebook Login for Business › Configurations). Token type: **User access
  token**, the longest expiry. Assets: your Page and Instagram account.
- Press **Edit permissions**. Tick instagram_basic, instagram_content_publish, **instagram_manage_insights** (it is not
  ticked by itself), pages_show_list and pages_read_engagement.
- If you see instagram_manage_messages: leave it ticked.
- Your Page is in a business portfolio? Also tick ads_management and ads_read. Meta needs them to post for a
  portfolio Page.
- Press **Use this configuration**.
- **Redirect URL**: copy the Redirect URI (the return address). Press **Save**.

#### 9. Double-check the return address
- Only if you need it.
- If you see **Facebook Login for Business**, then **Settings**: put the Redirect URI in **Valid OAuth Redirect URIs**.
- Turn **Enforce HTTPS** on. Press **Save changes**.
- No such page? Skip this step.

#### 10. Paste the 3 values
- **App ID**: copy and paste it.
- **App secret**: press **Show** (Facebook may ask your password), copy and paste it.
- **Configuration ID**: copy and paste it. Or paste the whole **Login URL**: Clip Factory finds the ID.
- Press **Save keys**. This step ticks itself.

### Part 3: Connect

#### 11. Connect Instagram
- Press the big **Connect Instagram** button.
- Log in with the same Facebook account. Pick your portfolio if asked, then your Instagram. Confirm.
- Several accounts? Pick the right one in Clip Factory.
- Your Instagram is not in the list? It is still personal (step 1), not linked to a Page (step 2), or in another
  portfolio (step 4).

### Part 4: Go public

#### 12. Make the app Live
- Until the app is Live, only you can see your Reels.
- In the left menu, press **Publish**. Check the list. Press **Go live** at the bottom right.
- No **Publish** in the menu? Turn the **App Mode** switch to **Live**.
- Press **I did this** when the top bar says **Live**.
- If you see **App Review** or **Advanced access**: you do not need it for your own account. Skip it. Press **Go
  live**. Meta still says no? It lists what is missing. Go back to step 7.
- Status before this step: "Works now, but only you can see your Instagram Reels until the app is Live."

#### 13. Post one test clip
- Upload one clip. Instagram may take a few minutes to show it.
- Numbers can take 2 days.
- If you see your Reels missing for other people: do step 12 first.
- If Facebook asks you to confirm who runs the Page (Page Publishing Authorization): do it. Instagram will not post
  until you do.

### If Instagram says something went wrong

| You see | Do this |
|---|---|
| "You pressed cancel. Press Connect Instagram to try again." | Press **Connect Instagram**. |
| "That took too long. Press Connect Instagram again." | Press **Connect Instagram** again. |
| "The key does not work. Copy the App ID, App secret and Configuration ID again (step 10)." | Do step 10 again. |
| "The return address does not match. Copy it again in step 8." | Do step 8 again with the **Copy** button. |
| "A permission box was not ticked. Connect again and tick every box." | Do step 8, then connect again. |
| "Instagram did not show a pro account. Do steps 1 and 2, then connect again." | Do steps 1 and 2, then connect again. |
| "Instagram did not answer. Try again in a few minutes." | Wait, then press **Connect Instagram**. |

---

## Facebook

About 25 minutes · Free · Steps checked on 19 Nov 2026. Posts Reels to your Facebook **Page**, with Facebook Login
for Business.

| # | Step | Part |
|---|---|---|
| 1 | Have a Facebook Page | Get ready |
| 2 | Use a computer | Get ready |
| 3 | Turn on Meta for developers | Make your Facebook key |
| 4 | Create the app | Make your Facebook key |
| 5 | Pick one use case | Make your Facebook key |
| 6 | Finish the app | Make your Facebook key |
| 7 | Turn on Page permissions | Make your Facebook key |
| 8 | Fill in Basic settings | Make your Facebook key |
| 9 | Paste the return address | Make your Facebook key |
| 10 | Make a login configuration | Make your Facebook key |
| 11 | Paste the 3 values | Make your Facebook key |
| 12 | Connect Facebook | Connect |
| 13 | Make the app Live | Go public |

### Part 1: Get ready

#### 1. Have a Facebook Page
- Press **Open** (facebook.com/pages/?category=your_pages).
- No Page? Press **Create new Page**.
- A normal profile cannot post Reels through apps. You need a Page.
- You need **Content** or **Full control** access on the Page.
- Then tap your picture and switch back to your own profile. Do not change Page settings.
- If you see **Manage connection** after **Edit profile** on your Page: your Instagram is already linked to this
  Page. Close it. Never press **Disconnect**. Press **I did this**.
- If you see **People who help manage your Page**: leave those choices as they are.
- Your Page is in a business portfolio? Keep your own access too: Page **Settings**, then **Page access**. Your
  account needs **Full control**.

#### 2. Use a computer
- The developer websites work best on a computer. Use the same browser for every step.

### Part 2: Make your Facebook key

#### 3. Turn on Meta for developers
- Open developers.facebook.com. Press **Log in** or **Get Started**.
- Accept, then check your phone number or email.
- Already did this for Instagram? Just press **I did this**.

#### 4. Create the app
- Press **Open** (developers.facebook.com/apps/creation).
- App name: copy "Clip Factory Pages". Never put Facebook, Meta or Instagram in the name.
- Type your email. Press **Next**.

#### 5. Pick one use case
- Tick only **Manage everything on your Page**.
- Do not tick the Instagram one. Do not tick **Authenticate and request data from users with Facebook Login**.
- Use cases cannot be removed later. Press **Next**.

#### 6. Finish the app
- Business: pick your portfolio, or **I don't want to connect a business portfolio yet**.
- Press **Next**, **Next**, then **Go to dashboard**.

#### 7. Turn on Page permissions
- On the **Dashboard**, press **Customize the Manage everything on your Page use case**.
- Press **Add** next to pages_read_engagement, pages_manage_posts, read_insights and pages_manage_engagement.
- pages_show_list and business_management are already there. Press **Ready to test**.

#### 8. Fill in Basic settings
- Press **App settings**, then **Basic**.
- **App domains**: copy the App domain. **Privacy Policy URL** and **Terms of Service URL**: copy them.
- **Data deletion instructions URL**: copy it. Pick a **Category**.
- **App icon**: press **Download the icon** in Clip Factory and upload it.
- In the EU: **Data Protection Officer** is your name and email.
- Press **+ Add platform**, then **Website**. **Site URL**: copy the Website.
- Press **Save changes**.

#### 9. Paste the return address
- Open **Facebook Login for Business**, then **Settings**.
- Set **Client OAuth login**, **Web OAuth login** and **Enforce HTTPS** to Yes. Turn Strict Mode on.
- **Valid OAuth Redirect URIs**: copy the Redirect URI. Press **Check URI**, then **Save changes**.
- Not in the menu? Look under **Use cases**, then **Customize**, or **Add product**.
- If you see **Deauthorize Callback URL** or **Data Deletion Request URL** boxes: leave them empty.

#### 10. Make a login configuration
- Open **Facebook Login for Business**, then **Configurations**. Press **+ Create configuration** (not a template).
- Name: copy the App name. If asked, pick **General**.
- Token: **User access token**, the longest expiry. Assets: **Pages**.
- Permissions: pages_show_list, pages_read_engagement, pages_manage_posts, pages_manage_engagement, read_insights, business_management.
- Press **Create**.

#### 11. Paste the 3 values
- Paste the **App ID**, the **App secret** and the **Configuration ID**.
- Press **Save keys**. This step ticks itself.

### Part 3: Connect

#### 12. Connect Facebook
- Press the big **Connect Facebook** button. Press **Continue**.
- Tick the Page your clips go on.
- Leave every switch ON. If one is off, Facebook gives Clip Factory nothing.
- Press **Save**, then **Got it**.
- Several Pages? Pick the right one in Clip Factory.

### Part 4: Go public

#### 13. Make the app Live
- In the left menu, press **Publish**. Check the list. Press **Go live** at the bottom right.
- No **Publish** in the menu? Turn the **App Mode** switch to **Live**.
- Press **I did this** when the top bar says **Live**.
- Facebook Reels from apps must be 3 to 90 seconds long, 9:16, at least 540x960. Meta allows 30 app posts a day per
  Page.
- Something missing? Go back to step 8.
- If you see **App Review** or **Advanced access**: you do not need it for your own Page. Skip it. Press **Go live**.
  Meta still says no? It lists what is missing. Go back to step 8.
- Status before this step: "Works now, but only you can see your Facebook Reels until the app is Live."

### If Facebook says something went wrong

| You see | Do this |
|---|---|
| "You pressed cancel. Press Connect Facebook to try again." | Press **Connect Facebook**. |
| "That took too long. Press Connect Facebook again." | Press **Connect Facebook** again. |
| "The key does not work. Copy the App ID, App secret and Configuration ID again (step 11)." | Do step 11 again. |
| "The return address does not match. Copy it again in step 9." | Do step 9 again with the **Copy** button. |
| "A permission box was not ticked. Connect again and tick every box." | Press **Connect Facebook** and leave every switch on. |
| "Facebook did not show a Page you control. Do step 1, then connect again." | Do step 1, then connect again. |
| "Facebook did not answer. Try again in a few minutes." | Wait, then press **Connect Facebook**. |

---

## X

About 15 minutes · **Costs a little**: X charges $0.015 per clip, about $1.50 for 100 clips · Steps checked on 19 Nov
2026.

Clip Factory stops posting to X at **$10 a month**, and never puts links in X posts (a link costs $0.20).

| # | Step | Part |
|---|---|---|
| 1 | Use the X account your clips go on | Get ready |
| 2 | Use a computer | Get ready |
| 3 | Ask a grown-up for a card | Get ready |
| 4 | Sign in to the X Developer Console | Make your X key |
| 5 | Buy a few credits | Make your X key |
| 6 | Create the app | Make your X key |
| 7 | Open the sign-in settings | Make your X key |
| 8 | Pick Read and write | Make your X key |
| 9 | Paste the addresses | Make your X key |
| 10 | Paste Client ID and Secret | Make your X key |
| 11 | Connect X | Connect |
| 12 | Keep a few credits | Go public |

### Part 1: Get ready

#### 1. Use the X account your clips go on
- Your email must be confirmed. X may ask for a phone number.
- The account must not be protected, or only your followers see the clips.

#### 2. Use a computer
- The developer websites work best on a computer. Use the same browser for every step.

#### 3. Ask a grown-up for a card
- X charges a little for every post.
- You need a normal credit or debit card. Prepaid cards get no bonus.

### Part 2: Make your X key

#### 4. Sign in to the X Developer Console
- Press **Open** (console.x.com). Sign in with the same X account.
- Accept the **Developer Agreement and Policy**.
- In the use-case box, copy the X use case.

#### 5. Buy a few credits
- Open **Billing**, then **Credits**. Save the card.
- Buy the smallest amount. Set a spending limit of $10.
- Leave auto-recharge OFF. (X matches your first auto-recharge up to $50. Clip Factory still says leave it off,
  so a busy month can never spend more than you planned.)
- X may add $20 for free after the first purchase.

#### 6. Create the app
- Open **Apps**. Press **Create App** (or **New App**).
- Name: copy the App name. Taken? Add your name.
- Description: copy the X use case. Press **Create**.
- Clip Factory does NOT need the API Key, API Secret, Bearer Token or Access Token.
- If the box shows a **Client ID** and **Client Secret**, paste them now (step 10). Then press **Close**.

#### 7. Open the sign-in settings
- Open your app, then **Keys & Tokens**.
- Next to **User authentication settings**, press **Set up** (or **Edit**).

#### 8. Pick Read and write
- **App permissions**: **Read and write**.
- **Type of App**: **Web App, Automated App or Bot**.

#### 9. Paste the addresses
- **Callback URI / Redirect URL**: copy the Redirect URI.
- **Website URL**: copy the Website.
- If asked: **Terms of service** and **Privacy policy**: copy them.
- Press **Save Changes**.

#### 10. Paste Client ID and Secret
- Copy the **Client ID** and the **Client Secret**. X shows the secret only once.
- Paste them here and press **Save keys**. Then press **Close** on X.
- Lost it? Open **Keys & Tokens** and press **Regenerate**.

### Part 3: Connect

#### 11. Connect X
- Press the big **Connect X** button.
- Check it is the right account. Press **Authorize** (it may say **Authorize app**).
- If you see "Callback URL not approved": do step 9 again with the **Copy** button.

### Part 4: Go public

#### 12. Keep a few credits
- Status: "Works now. Posts are public straight away."
- If the credits run out: "Your X credits ran out. Buy more in **Billing** › **Credits**."

### If X says something went wrong

| You see | Do this |
|---|---|
| "You pressed cancel. Press Connect X to try again." | Press **Connect X**. |
| "That took too long. Press Connect X again." | Press **Connect X** again. |
| "The key does not work. Copy the Client ID and Client Secret again (step 10)." | Do step 10 again. |
| "The return address does not match. Copy it again in step 9." | Do step 9 again with the **Copy** button. |
| "A permission box was not ticked. Connect again and tick every box." | Do step 8, then connect again. |
| "X did not answer. Try again in a few minutes." | Wait, then press **Connect X**. |
| "Clip Factory stopped X at your $10 limit this month." | Wait for next month, or ask a grown-up to raise the limit. |

---

## After setup

**When it's done**, the bottom of each platform page shows your account picture and name, and three buttons:

- **Check it** asks the platform if your keys and connection still work, and says so in one sentence.
- **Connect again** signs in again with the same keys. Use it when the app says "Needs you: connect again".
- **Disconnect** removes the connection. A toast says "Disconnecting… Undo" for 8 seconds; press **Undo** to keep it.
  Your keys stay saved, so **Connect again** works later.
  On **Facebook**, Disconnect makes Clip Factory forget your Page, but Facebook still lists the app. To remove it
  there too: open Facebook, go to **Settings & privacy** › **Settings** › **Business integrations**, find your app
  and press **Remove**.

**Clips you kept before a platform was connected** stay "Waiting for connection" for that platform. They are not
posted by themselves after you connect. New clips you keep are posted.

**If a clip did not post**, its page says why in one sentence and what to press, for example "Connect YouTube again
in Settings › Posting › Set up posting, then press Try again."

---

## Content Rewards

Get paid by brands for your clips. About 10 minutes · Free · Steps checked on 21 Nov 2026.

Content Rewards (contentrewards.com) is where brands pay clippers for views. You pick a campaign there and join it.
Then you paste its link into Clip Factory. Clip Factory reads the campaign's rules and follows them on every clip:
the length, the hashtags and tags, "#Ad" first in the caption, "Paid partnership" on the video, the logo, which
videos you may clip, and the places the campaign pays for. After each post, Clip Factory sends the clip to Content
Rewards for you. Whop is the website where Content Rewards sends your money. From there it goes to your bank.

Content Rewards is **not** one of the five places above. In Settings › Posting › Set up posting it has its own
card under the five, in a part called "Get paid by brands". It never counts in "2 of 5 ready" and is never in the
floating Set up posting list. Your campaigns live on the "Campaigns" page (`/campaigns`, also a row on Home), and
the campaign money on the "Money" page (`/money#content-rewards`). It is switched on. If it is ever switched off
for your app, the card says "Coming soon".

How many steps each thing takes. Waiting is never a step: Clip Factory watches and tells you.

| When | Your steps | What Clip Factory does by itself |
|---|---|---|
| Set up, once | **3**: make a Content Rewards account (or tap "I have an account"), add the same accounts there (or tap "I added them"), then "Connect Content Rewards" in the Mac app. Already set up on Content Rewards? Tap "Yes" at the top and only "Connect Content Rewards" is left. (+1 only if Content Rewards says your account can't connect apps: send the email.) | Keeps you signed in. Warns you a week before you must sign in again (every 90 days). Reminds you every 3 days to try Connect again while the email waits. |
| Each campaign | **3**: join it on Content Rewards, copy its link, then "Paste" and "Add campaign" in Clip Factory. **5 at most**: +1 when it needs a logo ("Add the logo"), and +1 "Yes, I applied" (optional) or, only while Content Rewards doesn't let Clip Factory look, "I'm in. Read these rules". | Reads the pay and the rules. Checks by itself whether you are in. Says "You're in!" |
| Each video | **3**: "Make clips for this campaign", paste or pick the video, "Make clips". | Follows the rules on every clip. |
| Each clip | **2**: "Use my settings", then "Upload to 2". | Paid partnership on. Only the places the campaign pays for. |
| Checking each clip | **0**: just look. If Clip Factory can't send it: **4** ("Copy and open", **Submit clip**, paste in **Clip link**, tick the box and **Submit clip**). Only when the brief asks for proof: **3** (open the views, record the screen, send it). | Sends the clip within 30 minutes. Shows Sent, Waiting, Approved or Not approved, the views and the money. |
| Ask again (a clip not approved) | **4**: "Ask again", **Rejected** and tap the clip, **Start appeal**, paste in **Appeal explanation** and **Start appeal**. | Shows the brand's answer when it comes. |
| Am I in? | **0** (you can tap "Check now"). | Checks every 15 minutes for 7 days, then every 6 hours until day 30. |
| Getting paid | Once **3**, then **2** each time. | Shows only Content Rewards' own numbers. Celebrates when money arrives. |

**Words on the other sites.** A button, tab or menu name in **bold** is the exact label on Content Rewards' own
screen (or Whop's, YouTube Studio's, TikTok's, Instagram's or Facebook's). Clip Factory's own buttons, pages and parts
are in quotes. Content Rewards' help pages sometimes use older names:

| The app shows | Its help pages say |
|---|---|
| **Accounts** | Connected accounts |
| **Clip link** | Submit video link |
| **Submit application** | Apply |
| **Pending review** | Application pending |

Whop's screens were not seen; those steps say "Whop may show this a little differently. Look for the same words."

The step and part names below are the app's own, word for word.

| # | Step | Part | When |
|---|---|---|---|
| 1 | Make a Content Rewards account | Set it up once | Once |
| 2 | Add your accounts there | Set it up once | Once |
| 3 | Connect Content Rewards | Set it up once | Once |
| – | Content Rewards said no? | Set it up once | Only if Content Rewards says your account can't connect apps |
| – | Pick a campaign | Join a campaign | Each campaign |
| – | Join it | Join a campaign | Each campaign |
| – | Copy its link | Join a campaign | Each campaign |
| – | Link your Whop account | Move your money to Whop | Once, if you said No to **Finance** |
| – | Set up payouts | Move your money to Whop | Once, if you said Yes to **Finance** |
| – | Move money to Whop | Move your money to Whop | Each time |
| – | Add your bank on Whop | Get it to your bank | Once, if you said No to **Finance** |
| – | Get it to your bank | Get it to your bank | Each time, on Whop, if you said No to **Finance** |
| – | Get it to your bank | Get it to your bank | Each time, with **Finance**, if you said Yes |

Only the three setup steps have numbers, and the ring counts only them. The other cards are helpers: they show on
the Campaigns page and in the Money page's Content Rewards part.

### Part 1: Set it up once

Already use Content Rewards, with your accounts added there? The page asks it first: tap "Yes" and steps 1 and 2
tick, so only step 3 is left. With a way back (for example from a campaign), the page's last button takes you back
there once you are connected ("Back to FaZe Clips").

#### 1. Make a Content Rewards account
- Have one already? Tap "I have an account".
- Tap "Open Content Rewards" (contentrewards.com, the sign-up page). "I have an account" sits right under it.
- Tap **Continue with Google**. Pick your Google account.
- Or type your email in **Email**. Tap **Send code**. Type the 6 numbers from the email. Tap **Verify**.
- You must be 18 or older. One account per person.
- Then come back to Clip Factory. Tap "I have an account". The step also ticks itself when you connect (step 3).

| If you see | Do this |
|---|---|
| "That code is incorrect or has expired" | Tap **Resend code** and use the newest email. |
| "We already sent a code" | Look in Spam or Promotions. |
| The wrong email | Tap **Change it**. |
| A few questions after signing in | Answer them. Any answer is fine. |
| A cookie bar | Tap **Accept** or **Decline**. Both are fine. |

#### 2. Add your accounts there
- Already added YouTube there? Tap "I added them".
- Tap "Open Content Rewards settings" (contentrewards.com/c/settings). "I added them" sits right under it.
- Tap **Accounts**.
- Tap **Connect account**. Tap YouTube.
- On the next screen, leave every box ticked and tap Allow or Continue.
- Add Instagram, X and Facebook the same way, if you post there.
- Each one should say **Connected**.
- The card lists the accounts Clip Factory posts to, for example "Clip Factory posts to: YouTube @faze · Instagram
  @faze · X @faze · Facebook FaZe Page." Add those same accounts.
- TikTok can wait. TikTok posts from Clip Factory stay private until TikTok checks the app, and private posts can't
  earn.
- Then come back to Clip Factory. Tap "I added them". The step also ticks itself once Content Rewards takes a clip
  from one of your accounts.
- If Content Rewards ever says it doesn't know an account, this step opens again with the line "Content Rewards
  doesn't know your YouTube account. Add it in Content Rewards, then tap I added them."

| If you see | Do this |
|---|---|
| No **Accounts** tab | Look for **Connected accounts**. |
| **Verify** in red | Tap it and allow again. |
| **Sign in again** | Tap it. |
| **In review** | Nothing to do. Content Rewards adds it for you. |
| "already connected to another creator" | That account is on another Content Rewards account. Take it off there, or ask Content Rewards support. |
| "access wasn't granted" | Tap **Connect account** again and leave every box ticked. |
| "No YouTube channel found" | Pick the Google account that owns your channel. |

Two questions open more lines on the card when they apply:

*Content Rewards says **Not a professional account**?*
- Already Creator or Business? Skip this.
- Tap "Open Instagram". Tap **More**, then **Settings**.
- Tap **Account type and tools**.
- Tap **Switch to professional account**. Tap **Business**, then **Next**.
- Pick any category. Then add Instagram again on Content Rewards.

*Content Rewards asks for a Facebook code?*
- Tap **Connect account**, then Facebook. Type your Page name and tap **Continue**.
- Tap **Copy code**. Tap "Open Facebook".
- Tap Reel. Pick any short video from your phone.
- Paste the code as the caption.
- Set who sees it to **Public**. Tap Share.
- On the Reel tap Share, then Copy link.
- Go back to Content Rewards. Paste it in **Your Facebook post link**. Tap **Verify account**.
- The code works for 24 hours.
- If you see "That's a link to a Facebook post, not a Reel": post a Reel, then copy the Reel's link. "We couldn't read
  that Facebook post": set the Reel to **Public**, then tap **Check again**. "Not there yet": wait 30 seconds and tap
  **Check again**.

#### 3. Connect Content Rewards
Content Rewards only lets an app on your computer sign you in, so this one step happens in the Clip Factory app on
your Mac. After it, everything runs in the cloud, so clips you upload from your phone are sent too.

- **In the Mac app**: tap "Connect Content Rewards". Your web browser opens Content Rewards. Sign in with the same
  account. Tap the button that allows Clip Factory. When the page says Done, come back here. While you are in the
  browser the card says "Waiting for you in the browser…" with "Cancel", for up to 5 minutes.
- **On a phone or tablet**: there is no button. Do this step on your Mac. Open Clip Factory there, then Settings, Set
  up posting, Content Rewards.
- **In a web browser on a computer**: Connect works in the Clip Factory app on your Mac. Tap "Get the app". Already
  have it? Open it, then come back to this page in the app.
- **An older Mac app**: Update the Clip Factory app first. Quit it (press Command and Q), then open it again. When it
  asks, tap Restart now. (A copy that can't update itself says: "This copy can't update itself. Tap Get the app,
  install the new one, then open it.")
- The step ticks itself when you are connected, also when Content Rewards lets Clip Factory look but not send yet.
- It worked: confetti and "Content Rewards is connected!"

| If you see | Do this |
|---|---|
| **Sign-in failed** | Close that tab and tap Connect Content Rewards again. |
| "your account can't connect apps" (or anything about connecting apps) | Look at the card Content Rewards said no? below. It has an email for you. |
| Nothing happens | Look for a new browser tab. Still nothing? Tap Connect Content Rewards again. |

#### Content Rewards said no?
Only if you need it. This card opens when Content Rewards says your account can't connect apps yet, or when it lets
Clip Factory look but not send clips.

- Content Rewards turns this on by email.
- Send it from the email you use to sign in to Content Rewards. Check the From line.
- Tap "Open email". Your mail app opens with the email ready, to Content Rewards support
  (support@contentrewards.com). Send it.
- No mail app? Tap the "Email to Content Rewards" chip to copy the email. Tap Show more to read all of it.
- Tap "I sent it".
- Content Rewards will email you back. When they say yes, come back and tap Connect Content Rewards.
- Until then, you send each clip yourself. Clip Factory reminds you after each post (Part 4).
- Sign in to Content Rewards on your phone now ("Open Content Rewards"). Then sending by hand is quick.
- Every 3 days (at most 5 times) Clip Factory asks: "Did Content Rewards say yes? Tap Connect Content Rewards on your
  Mac to check."

The email, written for Content Rewards' support team (Clip Factory fills it in):

> Subject: Please let my account connect apps (MCP sign-in pilot)
>
> Hi! Please let my Content Rewards account connect apps, so Clip Factory can send my own clips for me. My login is
> this email address. Thank you! (For your team: MCP sign-in pilot, scope my_submissions:write.)

#### When it's done
- The card says "Signed in to Content Rewards since 21 Nov." and either "Clip Factory sends your campaign clips for
  you." or, while it may only look, "Clip Factory can see your campaigns and money. It can't send clips yet, so I
  remind you after each post."
- "Check it" asks Content Rewards if the sign-in still works and says so in one sentence.
- "Connect again" signs in again (on your Mac).
- "Disconnect" shows "Disconnecting Content Rewards… Undo" for 8 seconds. Your campaigns, clips and money stay in
  Clip Factory, and your campaigns and clips on Content Rewards stay too. To remove Clip Factory on Content Rewards
  too: Settings, **Connected apps**, **Disconnect**.
- **Sign in again every 90 days.** From a week before, a card says "Sign in to Content Rewards again by Fri 19 Feb. It
  takes one minute." Tap "Connect again" on your Mac. Your phone gets a reminder too.
- No campaign yet? Tap "Add a campaign".

### Part 2: Join a campaign

Do this for each campaign. The Campaigns page shows these three cards until you add your first campaign. While the box at the top is empty, the
red button is "Open Content Rewards". Once a campaign link is in the box, "Add campaign" is the red one.

#### Pick a campaign
- Tap "Open Content Rewards" (contentrewards.com/c/discover).
- Tap **Sort**, then **Highest CPM**. That shows the most money for every 1,000 views first.
- Pick one that pays for YouTube. Skip ones that need your face, a sound, or only TikTok.
- Not sure? Paste its link here first. I'll check it before you join.

#### Join it
- Open the campaign. Tap **Join Campaign**.
- Some campaigns say **Apply**. Tap it.
- Tick your YouTube and Instagram accounts. Answer the questions.
- Tap **Submit application**.
- A question wants a link to your account? Tap a Copy chip on the card: "Your YouTube link", "Your Instagram link"
  or "Your X link". Then paste it.

| If you see | Do this |
|---|---|
| **Hold to confirm** | Press and hold it. |
| "Select at least one account" | Tick at least one account. |
| "Must be at least … characters" | Write a little more. |
| "Enter a full link, e.g. https://…" | Tap a Copy chip above and paste it. |
| A box about Discord | Tap **Done**. You don't need Discord. |
| "This brand has gone quiet" | Pick another campaign. |
| A sign-in page | Sign in with your email code, then tap the button again. |
| "Campaign is not accepting applications" | Pick another campaign. |

#### Copy its link
- Tap the share icon at the top right, then **Copy campaign link**. It says Link copied.
- Or copy the address at the top of the browser.
- Come back to Clip Factory. Tap Paste in the box at the top.

#### Paste it in Clip Factory
- Tap "Paste" in the box on the Campaigns page, or in the link box on Home. The line under it says "That's a Content
  Rewards campaign!"
- Tap "Add campaign". The campaign's card opens.
- You can paste the link right after joining or applying. Clip Factory finds out by itself when you are in.

| You pasted | What happens |
|---|---|
| A campaign's own link (contentrewards.com/c/campaigns/…, a Discover link to one campaign, or its Whop copy) | It is added. |
| A link to a group of campaigns | "This link is a group of campaigns. Tap the one you want." Tap one; that one is added. |
| An invite link | "That's an invite link. Open it, join, then copy the campaign's own link (share icon, **Copy campaign link**)." |
| A Whop sign-up link | "That's a Whop sign-up link. Open the campaign on contentrewards.com and copy its link there." |
| Another Content Rewards page (Discover, Home, a brand's page) | "That's a Content Rewards page, not one campaign. Open the campaign, then copy its link." |
| Anything else | Home treats it as a video link. |

#### The campaign card
From top to bottom:
- At the top: the brand's picture, the campaign name, one chip that says where you are ("You're in", "Not joined
  yet", "Waiting for the brand"…), "Checked 2 min ago" and "Check now".
- "Next step": the one thing to do, with the screen's only red button (on a phone it sits at the bottom right).
- "Pay": Content Rewards' own rates, for example "$1.00 per 1,000 views · up to $200.00 a clip · a clip starts
  paying once it has earned $2.00", the money left ("Money left: $7,890 of $8,500"), and "Pays for: YouTube,
  Instagram". These are the rates Content Rewards publishes, never a guess of what a clip will earn.
- "Rules I'll follow": what Clip Factory does on every clip, each with a tick (for example "Clips are 15 to 60
  seconds long.", "#Ad goes at the start of each caption.", "'Paid partnership' shows on the video for the first 3
  seconds.").
- "Things you do": what only you can do, with a hand icon (for example "Keep each clip up for 30 days. Don't delete
  it.").
- "I couldn't tell": "I'm not sure about these. Read them on the campaign page."
- "Rules missing?" On the campaign page, copy everything under **Brief** and **Content requirements**. Paste it in
  the box, then tap "Read these rules". Reading takes about 30 seconds. Open campaigns hide their rules until you
  join: "You'll see the rules once you join." Clip Factory reads them by itself when you're in.
- "Logo" (only when the campaign needs one), see below.
- "Videos to clip" (when the brief gives videos or channels): "Make clips from this" on a YouTube, Twitch or Kick
  link; "Open FaZe's YouTube" chips with "Pick a video there. Copy its link. Come back and tap Paste."
- "Your clips for this campaign": "3 approved · 2 waiting · 1 not approved", then one line per clip (Part 4).
- At the bottom: "Remove from Clip Factory" (8 seconds to Undo). It never touches Content Rewards, your posts or what
  was sent.

#### Add the logo (only if the campaign needs one)
- Before you are in, the card says "You can get the logo once you're in."
- On the campaign page, open **Reference materials**. Tap the file with “logo” in its name. Download it.
- Tap "Add the logo" (or "Choose a file") and pick it from Downloads. A Google Drive or Dropbox link works too: tap
  "Paste".
- Ready: "Logo added ✓" with "Change". Clip Factory puts the logo above the picture on every clip, away from faces and
  the game.

| If you see | Do this |
|---|---|
| "Clip Factory needs a PNG, JPG or WebP picture. Save the logo as PNG and try again." | Save it as PNG, then add it again. |
| "That picture is too big. Use one under 10 MB." | Use a smaller picture. |
| "That's a folder. Open the logo file in it, then copy that link." | Open the file, then copy its own link. |
| "That file isn't shared. In Google Drive tap Share, then Anyone with the link, then paste it again." | Do that, then tap "Paste" again. (Dropbox: tap Share, then Copy link.) |
| "Paste a Google Drive or Dropbox link, or drop the file." | Use one of those, or download the file and pick it. |

#### Am I in?
Clip Factory checks by itself and tells you, with confetti and a notification: "You're in!" You can always tap
"Check now".

| The chip says | What it means | What to do |
|---|---|---|
| Connect first | Clip Factory isn't connected to Content Rewards yet. | Tap "Connect Content Rewards" (on your Mac). Can't now? Open the campaign. Does it say **Submit clip**? Then tap "It says Submit clip". |
| Check it yourself | Content Rewards hasn't let Clip Factory look yet. | Open the campaign. Does it say **Submit clip**? Copy everything under **Brief** and **Content requirements**, paste it, then tap "I'm in. Read these rules". **Pending review**? Wait for the brand, then look again. |
| Not joined yet | Content Rewards doesn't list it for you. | Tap **Join Campaign** on Content Rewards. Clip Factory sees it by itself. Still not seen after a while? Tap "I joined, but it still says not joined". |
| Applied? | It is a campaign you apply to. | Did you tap **Submit application**? Then tap "Yes, I applied". Not yet? Tap "Open campaign", then **Apply**, answer the questions and tap **Submit application**. |
| Waiting for the brand | You applied. | Nothing to do. Content Rewards shows **Pending review** while the brand decides. |
| You're in | You can make clips. | Tap "Make clips for this campaign". |
| Paused | The brand paused it. | Nothing to do. Clip Factory tells you when it opens again. |
| Not in your list | Content Rewards doesn't show it for you any more. | Open it to check: you may have left, or the brand removed you. |
| Not accepted | You tapped "It says Not eligible". | Pick another campaign. |

See it yourself: open the campaign on Content Rewards. **Submit clip** means you're in. **Pending review** means you
wait. **Not eligible** means the brand said no. **Limit reached**, **Post limit reached** or **Clip limit reached** also
means you're in: the brand must check your clips first. Your list is under **Campaigns** in Content Rewards'
menu.

Every answer you give ("Yes, I applied", "It says Submit clip", "It says Not eligible") can be undone for 8 seconds
and changes only Clip Factory.

#### When Clip Factory can't make clips for a campaign
The next step box says why and what to do. Some stops mean "pick another campaign". Others are only a warning: then
the red button is "Make clips anyway".

| It says | What to do |
|---|---|
| "Reading the rules… (about 30 seconds)" | Wait. |
| "I couldn't read the rules. Tap Check now, or paste them below." | Tap "Check now", or paste the rules. |
| "This campaign needs its logo on every clip. Add it below." | Tap "Add the logo". |
| "The brand paused this campaign. I'll tell you when it opens again." | Wait, or pick another campaign. |
| "This campaign has ended. Pick another one." / "This campaign stopped taking clips on 23 Nov. Pick another one." | Pick another campaign. |
| "The money is almost gone, so new clips won't get paid. Pick another one." | Pick another campaign. |
| "This campaign only pays for TikTok. …" | Pick a campaign that pays for YouTube, Instagram, X or Facebook. |
| "Set up YouTube first. This campaign pays for YouTube and Instagram." | Set up one of the places it pays for. |
| "Content Rewards wants the brand to check your other clips first. I'll tell you when you can post again." | Wait. |
| "You reached the most you can earn on this campaign. Pick another one." | Pick another campaign. |
| "This campaign wants to see each clip before you post it. Clip Factory can't do that yet. …" | Pick another campaign. |
| "This campaign needs one of its own sounds. Clip Factory can't add it yet. …" | Pick another campaign. |
| "Half the money is used. … Post soon, before it runs out." (a warning) | "Make clips anyway", or pick another. |
| "It pays only $0.50 per 1,000 views. Most campaigns pay $1 or more. …" (a warning) | "Make clips anyway", or pick another. |
| "This brand wants your face on camera. …" (a warning) | "Make clips anyway", or pick another. |
| "This brand wants you to say “paid partnership” out loud. Clip Factory can't, so clips may be turned down." (a warning) | "Make clips anyway", or pick another. |
| "This brand wants 40% of viewers from the US. In YouTube Studio tap **Analytics**, then **Audience**, then look at **Top geographies**." (a warning) | Check it in YouTube Studio, then decide. |
| "Clip Factory isn't connected to Content Rewards, so you send each clip yourself. …" (a note) | Connect Content Rewards to make it automatic. |

### Part 3: Make clips and post (each video)

- On the campaign card tap "Make clips for this campaign". Home opens with the campaign picked in "For a campaign".
- Paste the video's link, or tap one of "Videos from the campaign". A video file always works.
- Tap "Make clips". The job page says "For FaZe Clips on Content Rewards" and how many rules it follows.
- If the brief allows only the brand's own videos and you pasted another one: "This campaign only pays for clips from
  its own videos. Pick one on the campaign page."
- If the brand changed the rules: "The brand changed the rules. I'm reading them again. This takes about 30 seconds."
  Clip Factory tries again by itself.

**On the Review card** of a campaign clip:
- A strip at the top: "For **FaZe Clips** · Content Rewards" with ticks for "Paid partnership", "#Ad at the start"
  and "Logo on".
- "Upload to" shows only the places this campaign pays for: "Only places this campaign pays for."
- TikTok is left out for now: "Until TikTok checks Clip Factory, TikTok posts are private, and private posts can't
  earn."
- A place Content Rewards doesn't know yet: "Add YouTube in Content Rewards first." Tap "Open Content Rewards
  settings", add it, then tap "I added it". "Then tap I added it. The next clip will go."
- Tap "Use my settings". Campaign clips are public, never made for kids, and marked as paid. On YouTube that is Who can
  see it **Everyone**, Made for kids **No** and Paid promotion on, shown locked. X gets "Paid partnership: on".
  Instagram and Facebook don't let apps turn on Paid partnership, so "#Ad" and the words on the video tell viewers.
- TikTok, once TikTok has checked Clip Factory: "Use my settings" picks **Everyone** (the list has no default, and any
  other pick says "Campaign clips must be public. Pick Everyone.") and turns on Commercial content with **Branded
  content** ticked. That tap is yours.
- Deleted "#Ad" or a tag? "I put #Ad and the campaign's tags back when it uploads."
- Above the button: "After it posts, Clip Factory sends it to Content Rewards by itself." (or, when you send by hand:
  "After it posts, send its link to Content Rewards within 30 minutes. I'll remind you.")
- Tap "Upload to 2". Clip Factory never deletes, hides or changes a campaign post afterwards.

### Part 4: Check each clip

Each campaign clip gets one line next to its post, on the clip page, in Library, on the job page and on the campaign
card. Content Rewards only takes a clip in its first 30 minutes, so Clip Factory sends it the moment it is live.

| The line says | What it means |
|---|---|
| "Goes to Content Rewards after it posts." | It isn't posted yet. |
| "Sending to Content Rewards…" | Clip Factory is sending it. |
| "Sent ✓ · Waiting for the brand to check it" | It is in. The brand checks it. |
| "On hold: Content Rewards is checking the views." | Content Rewards checks the views first. |
| "Approved ✓ · 12.3K views on YouTube" | The brand said yes. "Earned on Content Rewards: $3.10 so far." shows once it has earned money. |
| "Not approved: “…”" | The brand said no, with its reason (or "The brand gave no reason."). A "Next time: …" hint may follow. Tap "Ask again". |
| "Asked again ✓ · The answer takes 2 to 7 days." | You asked again. Wait. |
| "Back in review after you asked again." | The brand looks again. |
| "Send this to Content Rewards now (12 min left)" | Clip Factory couldn't send it. Send it yourself (below). |
| "You sent it ✓ · Looking for it on Content Rewards…" | Clip Factory looks for it by its link. |
| "Too late to send this one. …" | More than 30 minutes went by. Next time, send it as soon as Clip Factory reminds you. |
| "Content Rewards didn't take it: …" | The reason and the button to fix it are on the line. |
| "Content Rewards took this clip off the campaign. It earns nothing more." | Nothing to do. |
| "The post is gone from YouTube, so it stops earning." | Nothing to do. |

If the line says "YouTube didn't take the Paid promotion switch. #Ad and the words on the video still tell viewers.",
nothing to do.

Views on the line are Content Rewards' count of the post's views. They are not the views a campaign pays for. Money
on the line is only what Content Rewards itself reports, never a rate times views.

#### Send a clip yourself
Only when Clip Factory can't send it (not connected, the "can only look" sign-in, a campaign you said you're in by
hand, an error that isn't yours, or Content Rewards still couldn't see the post after 25 minutes of trying). Your
phone gets "Send this to Content Rewards now (25 min left)". Tap it: the clip opens with the steps.

1. Tap "Copy and open". It copies the link and opens the campaign. ("Link copied. Paste it on Content Rewards.")
2. Tap **Submit clip**.
3. Tap **Clip link** and paste.
4. Tick the box that starts “I've read”. Tap **Submit clip**.

Then tap "I sent it" if you like (Clip Factory finds the clip by its link anyway). Two clips waiting for one
campaign show as one line, "Send these 2 to Content Rewards now (12 min left)", and the copy has both links. In the
Mac app a green banner shows the same line on every page.

| If you see | Do this |
|---|---|
| **Hold to confirm** | Press and hold it. |
| A sign-in page | Type the email code, then tap **Submit clip**. |
| "Posts have to be submitted within 30 minutes" | Too late for this one. Next time, send it as soon as I remind you. |
| "You don't have a linked YouTube account" | Open Content Rewards settings, tap **Accounts**, and add it. The next clip will go. |
| "This post's account isn't on your application" | On the campaign page tap **Add accounts** and add it. |
| "already submitted" | Nothing to do. It's in. |

#### Ask again (when a clip was not approved)
Tap "Ask again". It copies the words and opens your clips on Content Rewards ("Words copied."). The words say only
what is true about the clip, for example "This clip follows the brief: #Ad is at the start of the caption, …".

1. Tap **Rejected**.
2. Find the clip by its title and date. Tap it.
3. Under “Think this rejection is wrong?”, tap **Start appeal**.
4. Paste in **Appeal explanation**. Tap **Start appeal**.

Then tap "I asked" if you like. The answer takes 2 to 7 days.

| If you see | Do this |
|---|---|
| "You can appeal one clip per day" | Try again tomorrow. |
| "The time to appeal this decision has passed" | This one can't be asked again. |
| "This clip failed the campaign's requirements check, so it can't be appealed" | This one can't be asked again. Check the rules for the next clip. |
| "This agency isn't taking appeals yet" | This brand doesn't take appeals. |
| "This clip already has an open appeal" | Nothing to do. Wait for the answer. |

#### The brand wants proof of views
Only when the brief asks for it. When it is due, your phone gets "FaZe Clips wants proof of views now. Tap to see
how." and the line says "To do: send the brand a screen recording of this clip's views."

1. Open this clip's views ("Open YouTube Studio", "Open Instagram", "Open X" or "Open Facebook").
2. Record your screen while they show.
3. Send it where the brief says. If it doesn't say: open the campaign, tap **Support**, and send it to the brand there.

Then tap "I sent it". How to record your screen: on an iPhone, swipe down from the top right corner, tap the round
record button, and tap it again to stop. On a Mac, press Shift, Command and 5, then click **Record Entire Screen**.

### Part 5: Move your money to Whop

The Money page has a Content Rewards part. Whop is the website where Content Rewards sends your money. From there it
goes to your bank.

It shows three tiles, all Content Rewards' own numbers, never a guess:
- "Still earning": clips still earning. The amount can still change. (On Content Rewards: **Queued** and
  **Arriving**.)
- "On its way": moving to your Whop balance.
- "Ready to move": you can move this to Whop now. (On Content Rewards: **Balance**.)

Then "Content Rewards paid you $62.40 so far · last money Tue 18 Nov", a line per campaign, and "Content Rewards'
numbers · checked 20 min ago". While it reads everything for the first time the total says "Checking…". Clips the
brand hasn't checked yet show $0 until the brand says yes.

First, one question, asked once: "Do you see **Finance** in the Content Rewards menu?" Tap "Yes" or "No". "Change my
answer" asks again. When "Ready to move" is $1.00 or more, "Move your money to Whop" is the red step.

**If you said No**, link Whop once:

#### Link your Whop account
Once.
- No Whop account? Tap **Open Whop** and make one with the same email.
- Tap "Open Content Rewards settings". Find Connect your Whop account and tap **Open Whop**.
- Sign in to Whop and allow it. Then come back. Tap "I did this".
- Can't find it? Tap **Profile** and look again. "Could not open Whop. Try again.": tap **Open Whop** again. "already
  connected to another creator": use your own Whop account, or ask Content Rewards support.

**If you said Yes**, set up payouts once:

#### Set up payouts
Once.
- Tap "Open Content Rewards". Tap **Finance** in the menu. You'll see **Set up payouts**.
- Do each one: **Verify your identity**, **Set your tax handling**, **Turn on two-factor auth**, **Add a bank
  account**.
- Some open on Whop. Tap **Continue on Whop**, finish there, then come back. Tap "I did this".
- "Your details are in review with Whop": nothing to do, wait a day or two. "Setup session expired": tap **Continue on
  Whop** again. "Payouts are turned off": ask Content Rewards support.

**Then, each time** (No or Yes):

#### Move money to Whop
Each time.
- Tap the "Amount" chip to copy it (for example 18.25). Tap "Open Earnings".
- Tap **Withdraw**. Paste the amount in **Amount**. It must be $1.00 or more.
- Tap **Withdraw** again.
- It says the money is on its way to your Whop balance. It usually takes minutes. The step ticks itself.

| If you see | Do this |
|---|---|
| "Minimum withdrawal is $1.00." | Wait until you have $1 or more. |
| "Connect payout account in Settings" | Do the step above: link Whop. |
| "You don't have any available balance to withdraw yet." | Money under **Queued** or **Arriving** isn't ready yet. |
| **Add your phone number** | Type your number and tap **Save number**, or tap **Skip**. |
| "Your withdrawal is processing" | Tap **Try again** with the same amount. |

Celebrations come once each: "Your first money from Content Rewards!", "Money from Content Rewards! $4.21 is in your
balance." and "You can move $18.25 to Whop now."

### Part 6: Get it to your bank

**If you said No:**

#### Add your bank on Whop
Once.
- Tap "Open Whop". Tap **Dashboard**, then **Balances**, then **Payout methods**.
- Tap **Add payout method**. Type your bank details.
- Whop checks your ID once. It wants a photo of your ID and a selfie. It can take a day or two.
- Whop may ask you to turn on a phone code. Tap **Security & Privacy**, then **Two-factor authentication**, then
  **Text message**.
- Whop may show this a little differently. Look for the same words. Tap "I did this".

#### Get it to your bank
Each time, on Whop.
- Tap the "Amount" chip. Tap "Open Whop".
- Tap **Balances** (or **Profile**, then **Balance**). Tap **Withdraw**.
- Paste the amount in **Amount**. Tap **Continue**. Tap **Payout**.
- Pick the normal payout. It costs less. It takes up to 5 business days.
- Whop may need $10 or more before it sends to your bank.
- Right after money reached Whop, this is the red step once: "Your money is on Whop. Move it to your bank."

**If you said Yes:**

#### Get it to your bank
Each time, with **Finance**.
- Tap **Finance**. Look under Recent withdrawals.
- Processing to bank means it's on its way.
- "Bank send didn't go through": tap **Manage** and check your bank details.

### If Content Rewards says something went wrong

| You see | Do this |
|---|---|
| "You didn't allow it. Tap Connect Content Rewards to try again." | Tap "Connect Content Rewards" and allow it. |
| "That took too long. Tap Connect Content Rewards again." | Tap "Connect Content Rewards" again. |
| "Connected, but Content Rewards hasn't let Clip Factory send clips yet." | Send the email on the card Content Rewards said no? |
| "Content Rewards says your account can't connect apps yet. Send the email below." | Send the email on the card Content Rewards said no? |
| "Clip Factory couldn't start the sign-in. Quit Clip Factory, open it again, then tap Connect Content Rewards." | Quit the Mac app (Command and Q), open it, try again. |
| "Content Rewards didn't answer. Try again in a few minutes." | Wait, then try again. |
| "Clip Factory is busy with Content Rewards. Try again in a few seconds." | Wait a few seconds, then try again. |
| "Something went wrong. Tap Connect Content Rewards again." | Tap "Connect Content Rewards" again. |
| "Content Rewards signed you out. Tap Connect again." | Tap "Connect again" on your Mac. |
| "A permission was not allowed. Tap Connect again and allow every box." | Tap "Connect again" and allow every box. |
| "Content Rewards stopped Clip Factory for now. You send clips yourself until it's fixed." | Send clips yourself (Part 4) until it says it works again. |

### Sources (checked on 21 Nov 2026)

Each step above was written from Content Rewards' own app (its screens and site code of 21 Nov 2026), its help
pages and its API docs, and Whop's docs. Uncertain details are worded as "If you see…" on the cards. What could not
be checked before the first real Connect is listed in CONTRACTS §38.21.

**Content Rewards, the app**
- [Sign in and sign up](https://contentrewards.com/login), [Discover](https://contentrewards.com/c/discover),
  a campaign page (`https://contentrewards.com/c/campaigns/{id}`), [Settings](https://contentrewards.com/c/settings)
  (**Accounts**, **Connected apps**), [Earnings](https://contentrewards.com/c/earnings),
  [Submissions](https://contentrewards.com/c/submissions), and the terms ([contentrewards.com/terms](https://contentrewards.com/terms))
- [FTC compliance](https://contentrewards.com/ftc-compliance) ("#Ad" near the start, words on the video, a spoken
  disclosure, the platform's paid-partnership switch)

**Content Rewards help pages**
- [Connect your social accounts](https://help.contentrewards.com/en/articles/16746780-connect-your-social-accounts) and
  [Your account shows as not linked](https://help.contentrewards.com/en/articles/16817242-your-account-shows-as-not-linked)
- [Find and apply to a campaign](https://help.contentrewards.com/en/articles/16817237-find-and-apply-to-a-campaign)
- [Submit a video](https://help.contentrewards.com/en/articles/15319814-submit-a-video)
- [Approval and review](https://help.contentrewards.com/en/articles/15319801-approval-and-review) and
  [When a clip is rejected for fake views](https://help.contentrewards.com/en/articles/15319803-when-a-clip-is-rejected-for-fake-views)
- [Payouts](https://help.contentrewards.com/en/articles/15319815-payouts),
  [Withdraw your earnings](https://help.contentrewards.com/en/articles/16817239-withdraw-your-earnings) and
  [Reading your payout statement](https://help.contentrewards.com/en/articles/16829643-reading-your-payout-statement)
- [The campaign ended, paused or ran out of budget](https://help.contentrewards.com/en/articles/16829640-the-campaign-ended-paused-or-ran-out-of-budget)
- [What happened to your previous version submissions and payouts](https://help.contentrewards.com/en/articles/16829642-what-happened-to-your-previous-version-submissions-and-payouts)
  (Content Rewards has been its own app since August 2026; Whop still pays out)

**Content Rewards API docs** (alpha, API version 2026-10-01)
- [MCP server](https://docs.contentrewards.com/api-reference/mcp) (the sign-in pilot: "if sign-in says your account
  can't connect apps, email support"; sign in again after 90 days, or after 30 days unused),
  [Scopes](https://docs.contentrewards.com/api-reference/scopes),
  [Errors](https://docs.contentrewards.com/api-reference/errors), [Rate limits](https://docs.contentrewards.com/api-reference/rate-limits),
  [Versioning](https://docs.contentrewards.com/api-reference/versioning) and the tool list
  ([mcp-tools.json](https://docs.contentrewards.com/mcp-tools.json): `list_my_campaigns`, `create_my_submission`,
  `list_my_submissions`, `get_my_balance`, `list_my_payouts`)
- The sign-in server's own description, [id.contentrewards.com/.well-known/oauth-authorization-server](https://id.contentrewards.com/.well-known/oauth-authorization-server)
  (the scopes, PKCE S256 only, apps that register themselves, computer-only return addresses)

**Whop** (its screens were not seen)
- [Payout methods](https://docs.whop.com/manage-your-business/manage-payouts/payout-methods),
  [Set up payouts](https://docs.whop.com/manage-your-business/manage-payouts/set-up-payouts),
  [Pay your team](https://docs.whop.com/manage-your-business/manage-payouts/pay-your-team) (**Profile** › **Balance**),
  [Troubleshoot payouts](https://docs.whop.com/manage-your-business/manage-payouts/troubleshoot-payouts),
  [Fees](https://docs.whop.com/payments-and-billing/fees/fees),
  [Enable 2FA](https://docs.whop.com/account-settings/account-security/enable-2fa) and
  [Identity verification](https://docs.whop.com/developer/verification/overview)

**Paid partnership on each platform**
- YouTube: [Add paid product placements](https://support.google.com/youtube/answer/154235) and
  [Videos: insert](https://developers.google.com/youtube/v3/docs/videos/insert) (`paidProductPlacementDetails`)
- X: [Create a post](https://docs.x.com/x-api/posts/create-post) (`paid_partnership`)
- TikTok: [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) (Branded content,
  the owner's own tap) and [Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- Instagram and Facebook: [Content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing)
  (no paid-partnership field for this kind of app)

## For maintainers: keeping the app and this page in step

- The in-app steps are data files, one per platform: `web/src/setup/{youtube,tiktok,instagram,facebook,x}.ts`. The
  contract for their ids, titles, parts and wording rules is
  [CONTRACTS.md §17.2](CONTRACTS.md#172-step-content-one-data-file-per-platform-websrcsetupyoutubetiktokinstagramfacebookxts).
- This page must match them: under each `## {Platform}` heading, every step title appears with the same number, in
  the same part. The web test `setup-docs.test.ts` checks it ([TESTING.md](TESTING.md#posting-setup)).
- When a platform changes a button name: change the step in the data file **and** here, keep the step id, set
  `checkedOn` and the "Steps checked on" date on both, and add the source to the list below. If you are not sure, add
  an "If you see…" hint instead of changing the main sentence.
- Why it is built this way (bring your own keys, two Meta apps, same-tab Connect):
  [ADR-33](DECISIONS.md#adr-33-posting-setup-bring-your-own-keys-with-a-guided-list-per-platform) to
  [ADR-37](DECISIONS.md#adr-37-about-privacy-and-terms-on-the-apps-own-domain). How keys and
  tokens are kept: [SECURITY.md](SECURITY.md#platform-keys-and-tokens). How Connect and posting run:
  [ARCHITECTURE.md flow 16](ARCHITECTURE.md#16-set-up-posting-connect-and-real-posting).
- **Content Rewards** is one more data file, `web/src/setup/contentrewards.ts` (`CR_GUIDE`, with its own types in
  `web/src/setup/types.ts`; it is not in the five-guide list). The contract for its step ids, titles, parts and words
  is [CONTRACTS.md §38.3](CONTRACTS.md#383-one-time-setup-journey-a) (setup), [§38.4](CONTRACTS.md#384-adding-and-joining-a-campaign-journey-b)
  (part `join`) and [§38.7](CONTRACTS.md#387-getting-paid-journey-e) (parts `move` and `bank`). Under `## Content Rewards`
  each `CR_GUIDE` part title is a `### Part N:` heading and each step title (and "Content Rewards said no?") a `####`
  heading, word for word and in the app's order (the setup steps keep their number: `#### 1. …`); the "once" and
  "each time" go on the line under the heading, never in it. `setup-docs.test.ts` checks it. Its "Steps checked on"
  date is its own (21 Nov 2026), with its sources at the end of that section. **Bold** there means Content Rewards'
  (or Whop's) exact label, word for word; when Content Rewards renames one, change `CR_GUIDE` and this page together
  and keep the step id. Why it is built this way: [ADR-62](DECISIONS.md#adr-62-content-rewards-the-official-sign-in-through-the-desktop-apps-loopback-door-sending-from-the-cloud-a-reminder-when-it-cant).
  How the sign-in and the token are kept: [SECURITY.md](SECURITY.md#content-rewards-contracts-38). How sending and
  checking run: [ARCHITECTURE.md flow 19](ARCHITECTURE.md#19-content-rewards-campaigns-contracts-38-adr-62).

## Research sources (checked on 16 Nov 2026)

Each step above was written from these official pages. Uncertain details are worded as "If you see…" in the app.

**YouTube and Google**
- [YouTube Data API: Videos: insert](https://developers.google.com/youtube/v3/docs/videos/insert)
- [Resumable uploads](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
- [Using OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)
  and [refresh token expiry](https://developers.google.com/identity/protocols/oauth2) (7 days in Testing, 6 months unused)
- [Get started with the Google Auth Platform](https://support.google.com/cloud/answer/15544987),
  [Manage OAuth app branding](https://support.google.com/cloud/answer/10311615),
  [Manage app audience](https://support.google.com/cloud/answer/15549945),
  [Manage OAuth clients](https://support.google.com/cloud/answer/15549257),
  [Unverified apps](https://support.google.com/cloud/answer/7454865)
- [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies) and
  [Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service) (privacy choice, policy
  wording, deleting data after revocation)
- [Quota and compliance audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
- [Three-minute YouTube Shorts](https://support.google.com/youtube/answer/15424877)

**TikTok**
- [Register your app](https://developers.tiktok.com/doc/getting-started-create-an-app)
- [Add a Sandbox](https://developers.tiktok.com/doc/add-a-sandbox)
- [Login Kit for Web](https://developers.tiktok.com/doc/login-kit-web) and
  [token management](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [Content Posting API: Get started (Direct Post)](https://developers.tiktok.com/doc/content-posting-api-get-started),
  [Direct Post reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post),
  [Query creator info](https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info),
  [Media transfer guide](https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide)
- [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) (the Post to TikTok sheet)
- [App review guidelines](https://developers.tiktok.com/doc/app-review-guidelines)

**Meta (Instagram and Facebook)**
- [Register as a Meta developer](https://developers.facebook.com/docs/development/register) and
  [Create an app](https://developers.facebook.com/docs/development/create-an-app)
- [App modes](https://developers.facebook.com/docs/development/build-and-test/app-modes) (Development and Live)
- [Instagram API with Facebook Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login),
  [Content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing),
  [Resumable uploads](https://developers.facebook.com/docs/instagram-platform/content-publishing/resumable-uploads)
- [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business)
- [Reels publishing for Pages](https://developers.facebook.com/docs/video-api/guides/reels-publishing)
- [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog) (v27.0)

**X**
- [Getting access](https://docs.x.com/x-api/getting-started/getting-access) and
  [Developer Console](https://docs.x.com/resources/fundamentals/developer-portal)
- [Pricing and credits](https://docs.x.com/x-api/getting-started/pricing)
- [OAuth 2.0 authorization code with PKCE](https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code)
- [Chunked media upload](https://docs.x.com/x-api/media/quickstart/media-upload-chunked) and
  [Create a post](https://docs.x.com/x-api/posts/create-post)

### What changed on 19 Nov 2026

Checked again for Instagram, Facebook, YouTube and X (TikTok has its own check above). Ask, the in-app helper,
reads these same official pages when a step may be out of date (docs/CONTRACTS.md §28.3).

- **Instagram step 2**: new "If you see **Manage connection**" hints. On Facebook's phone app, a Page whose
  Instagram is already linked shows **Manage connection** after **Edit profile**; a Page that is not linked shows
  **Connect**. The Instagram app route (Edit profile › Page) is still right. Source: the owner's own screenshot of
  that sheet (19 Nov 2026), not a Meta help page, so the hint is worded "If it shows your Instagram name…". The same
  sheet also shows **People who help manage your Page** (Page access); the hint says to leave it as it is. When the sheet
  looks different, Ask reads Meta's own help pages (facebook.com/help) before it answers.
- **Instagram step 4** (business portfolio) is now only if Meta asks. Neither the Instagram Platform overview nor
  Content publishing requires a portfolio for a User access token on accounts you own
  ([overview](https://developers.facebook.com/documentation/instagram-platform/overview)). Content publishing also
  says a Page with a Business Manager role may need the ads permissions, so not using a portfolio is the simpler path
  ([content publishing](https://developers.facebook.com/documentation/instagram-platform/content-publishing)).
- **Instagram step 12**: a Page that needs Page Publishing Authorization cannot be posted to until it is done
  (same content publishing page).
- **Facebook step 1**: posting Reels needs the Page's **Content** task, not full control; full control is only needed
  to link Instagram ([Reels publishing](https://developers.facebook.com/documentation/video-api/guides/reels-publishing)).
- **Facebook step 7**: pages_show_list and business_management are added by default; **step 9**: leave the
  Deauthorize and Data Deletion Request boxes empty; **step 13**: Meta now says **Publish**, then **Publish** at the
  bottom right ([Create an app for Pages](https://developers.facebook.com/documentation/pages-api/create-an-app)).
  Reels from apps are 3 to 90 seconds, 9:16, at least 540x960, 30 app posts a day per Page (Reels publishing).
- **YouTube**: no step changed ([Videos: insert](https://developers.google.com/youtube/v3/docs/videos/insert)).
- **X**: no step changed; the first auto-recharge is matched up to $50
  ([Pricing](https://docs.x.com/x-api/getting-started/pricing)).
