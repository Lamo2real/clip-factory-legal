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
