# Roadmap

## Phase 1: the cloud platform (this phase)

Infrastructure, CI/CD, sign-in, the clip agent on AgentCore with Claude Fable 5.1, the glass web app (phone, browser,
desktop PWA), skills in Settings, review with Confirm and Decline, and the learnings loop. Confirmed clips wait as "pending integration". Added after the first build: Get the app per device,
the unsigned Mac and Windows desktop app, the update bar with area labels and the eased Reload, and the kid-proof
rules ([CONTRACTS.md §12](CONTRACTS.md#12-get-the-app-updates-and-kid-proof-ux-added-by-the-owner-after-the-first-build)).
Added by the serverless expansion ([CONTRACTS.md §14](CONTRACTS.md#14-serverless-expansion-websocket-api-rest-api-durable-functions-s3-vectors)):
two Lambda durable functions (the job flow with the agent callback, and the clip flow with publishing, the 48-hour wait
and learning) in place of the queue, scheduler and watchdog; live updates over a WebSocket API; a REST API for platform
webhooks; and the S3 Vectors learning memory ("What worked before", "Like clips that did well").
Added by the owner's clip performance request ([CONTRACTS.md §16](CONTRACTS.md#16-clip-performance-stats-refresh-and-weekly-best-owner-request-2026-11-16)):
the clip performance page (the video, five smooth lines, five platform stacks) for phones, laptops and monitors; the
numbers poller (one EventBridge rule, `cf-prod-stats`, per-platform intervals and budgets from
`config/platforms.json`) and the Refresh numbers button; Library › This week with the owner's weekly best picks and
the "Best of week" learning (`cf-prod-learn`). It all works today with no account connected and shows real numbers as
soon as phase 2 connects the platforms.
Added by the owner's skills request ([CONTRACTS.md §18](CONTRACTS.md#18-skills-full-create-read-update-delete-every-ai-call-uses-every-skill-owner-request-2026-11-16)):
skills can be written, read, changed and deleted in Settings › Clip making › Skills; the on/off switch is gone, and
every AI call (agent and API, Agent SDK and Bedrock Converse) gets every skill.
Added by the owner's help request ([CONTRACTS.md §19](CONTRACTS.md#19-ask-clip-factory-grounded-in-app-help-assistant-owner-request-2026-11-16)):
**Ask Clip Factory**, an in-app helper that answers from knowledge built from the app's code, takes the owner to the
right page and lights up the control, with Claude Haiku 5.5 (EU profile) as an optional rewriter
([HELP_ASSISTANT.md](HELP_ASSISTANT.md)).
See the [README](../README.md#status) for status.

## Phase 2: social integrations

Goal: confirmed clips are posted to the owner's accounts, and their numbers flow back to the clip page every 15–30
minutes for 30 days (and into the 48-hour learning).

**Built by the posting setup request** ([CONTRACTS.md §17](CONTRACTS.md#17-posting-setup-a-setup-list-per-platform-real-connect-real-posting-owner-request-2026-11-16),
the owner's words: one setup per platform, no code, "an 8-year-old should be able to do it"):

- **Set up posting** (Settings › Posting, replaces Accounts): a setup list of the five platforms with a "2 of 5 ready"
  ring and, per platform, big numbered step cards in four parts (Get ready, Make your key, Connect, Go public), with
  Open and Copy buttons, paste boxes that check the key, "If you see…" hints and the date the steps were checked. The
  same steps are written out in [SETUP_POSTING.md](SETUP_POSTING.md). A floating setup to-do list shows on every page until every platform is ready or skipped (§17.13).
- **Bring your own keys** ([ADR-33](DECISIONS.md#adr-33-posting-setup-bring-your-own-keys-with-a-guided-list-per-platform)):
  the owner makes one developer app per platform (two Meta apps, [ADR-36](DECISIONS.md#adr-36-instagram-and-facebook-get-two-separate-meta-apps)),
  pastes the keys, presses **Check it**, then **Connect**.
- **Real Connect**: OAuth in the same tab with a signed single-use state and PKCE where supported; the REST callback
  exchanges the code, keeps tokens only in Secrets Manager and comes back with confetti or one plain sentence
  ([ADR-34](DECISIONS.md#adr-34-oauth-with-a-signed-single-use-state-tokens-only-in-secrets-manager)). Choose an
  account when Meta returns several; Disconnect with an 8-second Undo; Connect again.
- **Real posting**: one `start → check → finish` publisher per platform, every upload sent as a file, durable waits
  between checks, no double posts on a retry, friendly error sentences
  ([ADR-35](DECISIONS.md#adr-35-every-upload-is-sent-as-a-file-and-posting-waits-inside-the-clip-flow)). Token refresh
  (rotating for TikTok and X), "Connect again" when a token dies.
- **Real numbers**: the stats adapters get their tokens from the same secrets.
- **Public pages on the app's domain** (About, Privacy with "How to delete your data", Terms) and TikTok's
  verification file ([ADR-37](DECISIONS.md#adr-37-about-privacy-and-terms-on-the-apps-own-domain)).
- **TikTok's Post to TikTok sheet** before Keep (privacy with no default, Comments, Duet, Stitch, commercial content),
  and **Who can see your clips** for YouTube (Everyone, link only, only me).
- **X spend guard**: $0.015 per post counted against the $10 monthly cap; no links in X posts.

| Platform | Connect with | Post with | Numbers ([ADR-29](DECISIONS.md#adr-29-stats-refresh-intervals-per-platform)) | What may stay limited |
|---|---|---|---|---|
| YouTube (Shorts) | Google OAuth 2.0 with PKCE (`youtube.upload`, `youtube.readonly`, `yt-analytics.readonly`) | Data API v3 `videos.insert`, resumable upload in 8 MB chunks | `videos.list` every 15 min; Analytics every 6 h | Nothing: published unverified app; quota extension only past about 100 uploads a day. |
| TikTok | Login Kit (`user.info.basic`, `video.publish`, `video.list`) | Content Posting API Direct Post, `FILE_UPLOAD` in chunks | `/v2/video/query/` every 15 min (public posts only) | Posts are "Only me" until TikTok approves the app and its posting audit, which it may refuse for a one-person tool. |
| Instagram (Reels) | Instagram API with Facebook Login (Facebook Login for Business configuration, user access token, the linked Page's token, Graph v27.0) | `REELS` container, resumable upload to `rupload.facebook.com`, then `media_publish` | Media insights every 30 min | Nothing expected; if Reels do not show for others, Meta may want the app Live. |
| Facebook (Page Reels) | Facebook Login for Business (Page token, Graph v27.0) | `video_reels` start, binary upload, finish `PUBLISHED` | Reels insights every 30 min | Reels visible only to the owner until the app is Live; Meta may ask for App Review first (unconfirmed). |
| X | OAuth 2.0 with PKCE (`tweet.read`, `tweet.write`, `users.read`, `media.write`, `offline.access`) | Chunked media upload (4 MB), then `POST /2/tweets` | `GET /2/tweets?ids=` every 15 min | Pay per use: about $0.015 per post plus number reads, capped at $10 a month by the app. |

**Built by the Content Rewards request** ([CONTRACTS.md §38](CONTRACTS.md#38-content-rewards-campaigns-owner-request-2026-11-21),
[ADR-62](DECISIONS.md#adr-62-content-rewards-the-official-sign-in-through-the-desktop-apps-loopback-door-sending-from-the-cloud-a-reminder-when-it-cant);
"Campaigns" moved here from Later; the owner's words: "browse Content Rewards, join a campaign there, then paste the
campaign URL into Clip Factory … The whole flow should take 3 steps, 5 at most" and "even an 8 year old should be
able to understand how to navigate it"):

- **Connect once**: a Content Rewards card under the five on Set up posting ("Get paid by brands"), 3 numbered steps,
  the last one in the Mac app through a one-shot loopback sign-in door; the token is kept in the cloud, so phone
  uploads are sent too. A ready email when CR's sign-in pilot says the account can't connect apps.
- **Each campaign in 3 steps** (5 at most): join on CR, copy its link, paste it. Clip Factory reads the pay and the
  rules (Claude in `cf-prod-campaigns`, checked by code), finds out by itself when the owner is in, and shows one
  next step with one vermilion button.
- **The rules on every clip**: the length, banned content, the campaign logo, "Paid partnership" on screen, "#Ad" and
  the required tags in every caption, only the places the campaign pays for, public and never made for kids, paid
  partnership on where the API has it (YouTube, X, TikTok's Branded content).
- **Sent by itself**: the clip flow sends each campaign post within CR's 30 minutes; else a "Send this to Content
  Rewards now" reminder with one "Copy and open". Then Sent → Waiting → Approved or Not approved, views, Ask again,
  proof-of-views reminders.
- **Getting paid**: Content Rewards' own numbers on the Money page (Still earning, On its way, Ready to move, paid so
  far) and the Whop steps to the bank.
- Switched off in prod until all six parts (api, posting, agent, web, desktop, docs) had merged; the one-line switch
  PR #88 turned it on (21 Nov 2026), and PR #93 turned on "Make a campaign copy" (§39).

Still open for Content Rewards: CR's sign-in pilot must grant `my_submissions:write` before Clip Factory can send by
itself (until then: read only and reminders, or, if the sign-in is refused, checking and sending by hand); campaigns
that need drafts first or the brand's own sound; TikTok campaign clips (after TikTok's audit); uploading proof of
views for the owner; and everything CR's live API may still change (CONTRACTS §38.21).

Still open in phase 2:
1. **Clips kept before a platform was connected** stay "Waiting for connection" and are **not posted automatically**
   after Connect. Next step: offer "Post the waiting clips" on the platform's "Connected as" card (one tap, the clip
   flow's normal publish steps, newest first), or post them on **Try again** per clip.
2. **Webhooks**: verify signatures per platform with the app secrets (`verify_signature` today returns `unverified`),
   and act on stored `HOOK#` events (for example a post removed by the platform).
3. **A daily token keep-alive** for platforms whose refresh tokens expire when unused (TikTok's refresh token lasts
   365 days; Google deletes unused keys after 6 months): today a refresh happens when a post or a number read needs
   the token, and the app shows "Connect again" when it is too late.
4. **Facebook Disconnect cannot revoke the app**: only the Page token is kept, and a Page token cannot remove the
   app's access. Removing the app in Facebook's **Business integrations** settings is the owner's own step
   ([After setup](SETUP_POSTING.md#after-setup)). Next step: keep the user token long enough to call
   `DELETE /me/permissions` on Disconnect, if Meta's rules allow it.
5. **Per-clip platform choice** at Keep (today: every platform enabled in Settings).
6. **Undo window**: a short delay after Keep during which the owner can take it back.
7. **Re-check the setup steps** against the platforms every few months and update `checkedOn`
   ([how](SETUP_POSTING.md#for-maintainers-keeping-the-app-and-this-page-in-step)).

## Later

- **Scheduled posting**: choose when each clip goes out (best time per platform from the learnings).
- **Custom domain** for the app (Route 53 or another DNS, an ACM certificate in `us-east-1`, CloudFront alias).
- **Push notifications** when a job is ready (Web Push for the PWA), for when the app is closed; while it is open,
  the WebSocket already updates the screen.
- **OpenSearch Serverless** next to S3 Vectors, only if keyword or hybrid search over clips is wanted
  ([ADR-25](DECISIONS.md#adr-25-s3-vectors-for-the-learning-memory-opensearch-not-deployed)); S3 Vectors can be exported to it
  through OpenSearch Ingestion once that integration leaves preview.
- **AWS WAF** on the REST API stage if webhook traffic is ever abused.
- **Live clipping**: follow a live Twitch or Kick stream and cut clips as it happens.
- **Clip editor**: adjust start and end, swap the hook, re-render one clip. The weekly best picks could then also
  steer editing choices (layout, pacing), not only which moments are picked and how they are hooked.
- **Clip numbers, more**: suggest the week's best picks (the owner still decides), compare two clips side by side,
  a per-platform "best time to post" from the snapshots, and YouTube Analytics `engagedViews` as the Shorts headline
  number if the owner prefers it to every-play `viewCount`.
- **Longer history**: keep weekly totals beyond the 90-day snapshot TTL for a long-term chart.
- **More sources**: X videos, Instagram and TikTok links, podcasts.
- **Cost guard**: a monthly AWS Budget with an email alert, and a per-job estimate before starting.
- **Multiple users** (sign-up, per-user quotas), if the tool is ever shared.
- **Code signing and notarization for the desktop app** ([ADR-19](DECISIONS.md#adr-19-unsigned-desktop-builds-for-now)),
  so the first open needs no extra click:
  - Mac: an Apple Developer Program membership, a "Developer ID Application" certificate, signing in the `desktop` job,
    notarization with `xcrun notarytool`, and stapling the ticket to the `.dmg`. Certificate, password and team id
    become GitHub secrets.
  - Windows: an Authenticode certificate (or Azure Trusted Signing) used by the `desktop` job to sign the installer
    and the app, which also quiets SmartScreen once the file builds reputation.
  - Then drop the first-open hint from the Get the app card.
- **Linux download**: an `.AppImage` from an `ubuntu-latest` runner, listed in `downloads/manifest.json` (the card
  already supports it).

### Not planned

- **Auto-update inside the desktop app.** Not needed: the desktop app is a window around the live website, so every
  deploy reaches it at once through the update bar. The wrapper itself changes rarely; when it does, the new `.dmg` or
  `.exe` replaces the old one in Get the app. (If it ever bundles its own screens, add the Tauri updater with signed
  update files then.)
- **A downloadable iPhone app.** Apple allows none outside its store ([ADR-21](DECISIONS.md#adr-21-iphone-and-ipad-get-add-to-home-screen-steps-not-a-download));
  Add to Home Screen gives the same full-screen app.
