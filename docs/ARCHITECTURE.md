# Architecture

Clip Factory Cloud is a serverless application in one AWS account and one environment (`prod`, resource prefix
`cf-prod`, region `eu-north-1`). Backend code is Python 3.13 (`api/`, `agent/`); every AWS resource is Terraform
(`infra/`). There is no server, no container service to run and no VPC.

The diagram is [architecture/aws-architecture.drawio](architecture/aws-architecture.drawio) (a PNG copy is
[architecture/aws-architecture.png](architecture/aws-architecture.png)). Names, routes, shapes and keys are defined in
[CONTRACTS.md](CONTRACTS.md), especially [§14](CONTRACTS.md#14-serverless-expansion-websocket-api-rest-api-durable-functions-s3-vectors),
[§16](CONTRACTS.md#16-clip-performance-stats-refresh-and-weekly-best-owner-request-2026-11-16) (clip numbers and the weekly best),
[§17](CONTRACTS.md#17-posting-setup-a-setup-list-per-platform-real-connect-real-posting-owner-request-2026-11-16) (posting setup, Connect and real posting),
[§18](CONTRACTS.md#18-skills-full-create-read-update-delete-every-ai-call-uses-every-skill-owner-request-2026-11-16) (skills, and every AI call using every skill)
and [§19](CONTRACTS.md#19-ask-clip-factory-grounded-in-app-help-assistant-owner-request-2026-11-16) (Ask Clip Factory, the help assistant),
and [§38](CONTRACTS.md#38-content-rewards-campaigns-owner-request-2026-11-21) (Content Rewards campaigns)
with [§39](CONTRACTS.md#39-content-rewards-the-two-ways-all-your-money-and-does-this-clip-fit-owner-request-2026-11-21) (the two ways, all your money and the fit check);
this document explains how the pieces work together and why.

![Clip Factory Cloud on AWS](architecture/aws-architecture.png)

## Overview

The numbers match the numbered flows in the diagram.

```mermaid
flowchart LR
  owner(["Owner: browser, phone PWA or desktop app"])
  cf[CloudFront] --> web[("S3 cf-prod-web: app, config.json, version.json, downloads")]
  owner --> cf
  owner -- sign in, SRP --> cog[Cognito user pool]
  owner -- "1 HTTPS + JWT" --> http[API Gateway HTTP API]
  owner -- "1 presigned PUT and GET" --> media[(S3 cf-prod-media)]
  owner <-- "4 wss, token on connect" --> ws[API Gateway WebSocket API]
  http --> lapi[Lambda cf-prod-api]
  lapi --> ddb[(DynamoDB cf-prod-data)]
  lapi -- "2 async invoke, alias live" --> jf[["Durable Lambda cf-prod-job-flow"]]
  jf -- "3 InvokeAgentRuntime" --> rt[AgentCore Runtime cf_prod_clip_agent]
  rt -. "callback: heartbeat, success, failure" .-> jf
  rt --> bedrock[Bedrock: Claude Fable 5.1, Nova 2 Lite and Titan Embeddings V2]
  rt --> tr[Amazon Transcribe]
  rt --> ddb
  rt --> media
  rt -- "7 what worked before" --> vec[(S3 Vectors cf-prod-vectors, index clips)]
  ws --> wsa[Lambda cf-prod-ws-authorizer]
  ws --> lws[Lambda cf-prod-ws]
  lws --> ddb
  ddb -- "4 stream, filtered" --> bc[Lambda cf-prod-broadcast]
  bc -- PostToConnection --> ws
  lapi -- "5 Keep, then 6 async invoke" --> clf[["Durable Lambda cf-prod-clip-flow"]]
  clf -- "6 publish: start, wait, check, finish" --> social[Upload hosts: YouTube, TikTok, Instagram, Facebook, X]
  clf -- "tokens, refresh" --> sm[(Secrets Manager cf-prod/platforms/*)]
  clf -- "wait 48 h, metrics" --> ddb
  clf -- "6 upsert vector" --> vec
  owner -- "10 Connect: consent page, same tab" --> platforms[Platform consent pages and webhooks]
  platforms -- "10 302 back with code and state" --> rest[API Gateway REST API]
  rest --> hooks[Lambda cf-prod-hooks] --> ddb
  hooks --> ssm[SSM Parameter Store: verify token]
  hooks -- "10 state key, code exchange, write tokens" --> sm
  lapi -- "10 save keys, Check it, connect" --> sm
  lapi -- "TikTok verification file" --> web
  os[OpenSearch Serverless: not deployed]:::off -. option .- vec
  evr[EventBridge rule cf-prod-stats, rate 15 minutes] -- "8 tick" --> st[Lambda cf-prod-stats]
  lapi -- "8 Refresh numbers, async" --> st
  st -- "8 due posts (gsi2), metrics, STAT#, RATE#" --> ddb
  st -- "8 tokens" --> sm
  st -- "8 batched reads" --> stapi[Platform stats APIs: YouTube, TikTok, Instagram, Facebook, X]
  lapi -- "9 weekly best saved, async" --> lrn[Lambda cf-prod-learn]
  lrn -- "9 Best of week learning" --> bedrock
  lrn -- "9 best true or false" --> vec
  lrn --> ddb
  evl[EventBridge rule cf-prod-learn-daily, 05:00 UTC] -- "12 daily: day-7 numbers, winners, lessons" --> lrn
  lapi -- "11 help answer, optional" --> haiku[Bedrock: Claude Haiku 5.5, EU profile]
  lapi -- "11 help corpus, cached 10 min" --> cf
  owner -- "13 Connect Content Rewards: the Mac app opens a one-shot door" --> door[["Desktop door 127.0.0.1:47811-47815, 5 minutes"]]
  owner -- "13 sign in and allow, system browser" --> crid["id.contentrewards.com: sign-in"]
  crid -- "13 302 to 127.0.0.1 with code and state" --> door
  lapi -- "13 register, exchange the code, refresh, revoke" --> crid
  lapi -- "13 Connect, Check now, Try sending again" --> crmcp["mcp.contentrewards.com/mcp: MCP, never an Origin header"]
  lapi -- "13 public campaign JSON, only when the owner acts" --> crpub["contentrewards.com public campaign JSON"]
  lapi -- "13 read the rules, fetch the logo: async" --> camp["Lambda cf-prod-campaigns: no secrets, no CR call"]
  camp -- "13 rules from the brief" --> bedrock
  camp -- "13 CAMPAIGN# rules, logo state" --> ddb
  camp -- "13 campaigns/*" --> media
  lapi -- "13 the CR token" --> sm
  clf -- "13 cr-send: create_my_submission within 25 minutes" --> crmcp
  st -- "13 tick: membership, reviews, views, money" --> crmcp
  classDef off stroke-dasharray: 5 5
```

## Services and why each one

Only managed, pay-per-use services. Nothing runs while the app is idle except storage. Why each choice was made is in
[DECISIONS.md](DECISIONS.md).

| Service | Resource | Why |
|---|---|---|
| Amazon CloudFront | web distribution | HTTPS, caching for the PWA, `config.json`, `version.json` and `downloads/manifest.json` never cached. Origin Access Control keeps the bucket private. The CSP allows `wss://*.execute-api.eu-north-1.amazonaws.com` for live updates. |
| Amazon S3 | `cf-prod-web` | The built web app, `version.json` (what is new), `downloads/` (the desktop `.dmg` and `.exe` plus `manifest.json`), the public `about.html`, `legal/privacy.html` and `legal/terms.html`, and TikTok's `tiktok*.txt` verification files (written by `cf-prod-api`, never deleted by a deploy). Private; only CloudFront reads it. |
| Amazon S3 | `cf-prod-media-<accountId>` | Uploads, extracted audio, transcripts, rendered clips and covers, skills and the optional YouTube cookies. Private, SSE-S3, sources expire after 14 days. Browsers use presigned URLs only. |
| Amazon S3 Vectors | bucket `cf-prod-vectors-<accountId>`, index `clips` (1024 dimensions, cosine, float32) | The learning memory: one vector per clip, so the agent can find "what worked before" and the app can show "Like clips that did well". Paid per request and per stored vector, nothing standing. See [ADR-25](DECISIONS.md#adr-25-s3-vectors-for-the-learning-memory-opensearch-not-deployed). |
| Amazon Cognito | user pool `cf-prod-users`, client `cf-prod-web` | One owner, admin-created. Short access tokens and a rotating 30-day refresh token. |
| Amazon API Gateway, HTTP API | `/v1` routes | The app's API. Cheapest type, with a built-in JWT authorizer. CORS for the app and `localhost:5173`; a public `OPTIONS /v1/{proxy+}` route lets CORS answer the browser's preflight before the JWT authorizer. |
| Amazon API Gateway, WebSocket API | `cf-prod-ws`, stage `live` | Pushes job, clip, post and learning changes to open apps, so screens update without waiting for a poll. See [ADR-23](DECISIONS.md#adr-23-live-updates-over-a-websocket-api-polling-only-as-the-fallback). |
| Amazon API Gateway, REST API | `cf-prod-hooks`, stage `v1` | The one public, unauthenticated surface: platform webhooks and the OAuth callback that finishes Connect, with per-method throttling, a usage plan, request validation and X-Ray. See [ADR-24](DECISIONS.md#adr-24-a-separate-rest-api-for-public-platform-webhooks). |
| AWS Lambda | `cf-prod-api` | Every `/v1` route: validation, DynamoDB, presigned URLs, skills (write, upload, read, change, delete), starting the two durable flows, cancel, Keep and Throw away, similar clips, a clip's performance, Refresh numbers (claims the posts, then invokes `cf-prod-stats`), the weeks and their picks (invokes `cf-prod-learn`), the posting setup (keys to Secrets Manager, Check it, Connect start, choose, disconnect, TikTok's verification file to the web bucket), and Ask Clip Factory ([flow 17](#17-ask-clip-factory-the-help-assistant): search, compose, the optional Haiku rewrite; the help code loads only on its two routes), and Content Rewards under `/v1/contentrewards` ([flow 19](#19-content-rewards-campaigns-contracts-38-adr-62): register, Connect finish, Check it, campaigns and their Check now, the logo, Try sending again, money refresh; [flow 20](#20-content-rewards-the-fit-check-the-copy-and-all-your-money-contracts-39-adr-63): the fit check, its captions fix and the campaign copy), and All your money (`GET /v1/money/everywhere`). |
| AWS Lambda | `cf-prod-stats` | The numbers poller ([flow 13](#13-clip-numbers-the-poller-and-refresh-numbers)): every tick it reads the posts that are due from the sparse `gsi2`, reserves each platform's budget, reads the numbers in batches and writes them to the posts and `STAT#` snapshots. The Refresh button runs the same code at once. After the platform poll, the same tick checks Content Rewards when it is switched on (membership, reviews, views, proof reminders and money, [flow 19](#19-content-rewards-campaigns-contracts-38-adr-62)); `{"action": "contentrewards"}` runs that for one owner. Reads `cf-prod/platforms/*`, writes only a refreshed token (`cf-prod/platforms/*/token-*`). See [ADR-30](DECISIONS.md#adr-30-one-eventbridge-rule-and-a-due-queue-for-stats-polling). |
| AWS Lambda | `cf-prod-learn` | The weekly best ([flow 14](#14-best-of-the-week)): marks the starred clips' vectors `best`, asks Claude Fable 5.1 (with the skills block) for one "Best of week" learning. See [ADR-31](DECISIONS.md#adr-31-the-weekly-best-is-an-explicit-owner-signal). |
| AWS Lambda | `cf-prod-campaigns` | Content Rewards ([flow 19](#19-content-rewards-campaigns-contracts-38-adr-62), [CONTRACTS.md §38.10](CONTRACTS.md#3810-reading-a-campaign)): reads a campaign's rules from the brand's brief with Claude (one Bedrock Converse call per read, checked field by field in code), fetches the campaign logo from a Google Drive or Dropbox link and copies the brand's picture into the media bucket (`campaigns/*`). Started only by `cf-prod-api` and `cf-prod-stats` (async). It reads untrusted brand text and outside links, so it has **no Secrets Manager access at all** and never calls Content Rewards; the brief is already on the `CAMPAIGN#` item. See [ADR-62](DECISIONS.md#adr-62-content-rewards-the-official-sign-in-through-the-desktop-apps-loopback-door-sending-from-the-cloud-a-reminder-when-it-cant). |
| AWS Lambda | `cf-prod-money` | Real earnings ([CONTRACTS.md §25](CONTRACTS.md#25-real-earnings-paid-programme-progress-and-platform-reported-money-owner-request-2026-11-18)): once a day reads each connected platform's account numbers and the money the platform itself reports (YouTube Analytics `estimatedRevenue` with the monetary scope; Facebook only after its live check), through the shared token manager and rate budgets, and writes `ACCTSTAT#`, `REVENUE#` and `MONEYSTATE#` items. No DeleteItem. See [ADR-47](DECISIONS.md#adr-47-only-platform-reported-money-the-estimates-are-removed). |
| Amazon EventBridge | rule `cf-prod-stats`, `rate(15 minutes)` | The only schedule in the system: one tick for the stats poller, its rate taken from the smallest interval in `config/platforms.json`. A few thousand invocations a month. See [ADR-30](DECISIONS.md#adr-30-one-eventbridge-rule-and-a-due-queue-for-stats-polling). |
| AWS Lambda, durable function | `cf-prod-job-flow` (alias `live`) | Starts the agent for a job and waits (no compute) for its callback; fails the job if heartbeats stop. Replaces the watchdog. See [ADR-22](DECISIONS.md#adr-22-lambda-durable-functions-for-the-job-and-clip-workflows). |
| AWS Lambda, durable function | `cf-prod-clip-flow` (alias `live`) | After Keep: makes the posts, publishes each one (start, durable waits and checks, finish; tokens from Secrets Manager), sends each campaign post to Content Rewards right after it is live (`cr-send-{platform}`, retried every minute up to 25 minutes, never failing the flow), waits 48 hours (no compute), reads metrics, writes a learning, updates the clip's vector. Reads `cf-prod/platforms/*`, writes only a refreshed token (`cf-prod/platforms/*/token-*`). Replaces the publish queue, the publisher, the scheduler and perf-check. |
| AWS Lambda | `cf-prod-ws-authorizer` | Checks the Cognito access token on `$connect` (standard library RS256 check, no extra packages). |
| AWS Lambda | `cf-prod-ws` | `$connect` stores the connection, `$disconnect` removes it, `$default` answers `ping`. |
| AWS Lambda | `cf-prod-broadcast` | Reads the DynamoDB stream and sends each change to the owner's open connections. |
| AWS Lambda | `cf-prod-hooks` | Answers webhook verification challenges, stores webhook events, and finishes Connect: checks the signed state, exchanges the code, stores the token in Secrets Manager, redirects to the setup page with a result code ([flow 16](#16-set-up-posting-connect-and-real-posting)). |
| Amazon DynamoDB | `cf-prod-data` + stream | Single table for all entities including WebSocket connections, webhook events, stats snapshots (`STAT#`, 90-day TTL), the weekly picks (`WEEK#`), the per-platform rate budgets (`RATE#`) and the Content Rewards items (`CRCONN`, `CRSTATE#`, `CAMPAIGN#`, `CRSUB#`, `CRMONEY`, `CROWNERS`); a sparse `gsi2` holds only the posts due for a stats poll. On-demand, point-in-time recovery, TTL, stream `NEW_AND_OLD_IMAGES` feeding `cf-prod-broadcast`. See [ADR-05](DECISIONS.md#adr-05-one-dynamodb-table-single-table-design). |
| AWS Systems Manager Parameter Store | `/cf-prod/hooks/verify-token` (SecureString) | The Meta webhook verify token. Generated by Terraform as a write-only value, so it never enters the Terraform state. |
| AWS Secrets Manager | `cf-prod/oauth/state-key` (Terraform, write-only value), `cf-prod/platforms/{platform}/{app,token,pending}` and `cf-prod/platforms/contentrewards/{app,token}` (all created at runtime) | The only place for the owner's platform app keys and account tokens, and the key that signs the Connect `state` ([flow 16](#16-set-up-posting-connect-and-real-posting), [ADR-34](DECISIONS.md#adr-34-oauth-with-a-signed-single-use-state-tokens-only-in-secrets-manager)). `cf-prod-api` writes all of them; `cf-prod-hooks` reads the app keys and writes tokens and pending choices; `cf-prod-clip-flow`, `cf-prod-stats` and `cf-prod-money` read `cf-prod/platforms/*` and write only the token secrets `cf-prod/platforms/*/token-*` (Terraform output `platform_token_secrets_arn` of the hooks module). With the push key, the badge keys, Ask's search key and the optional YouTube proxy, at most about 22 secrets in all ([ADR-34](DECISIONS.md#adr-34-oauth-with-a-signed-single-use-state-tokens-only-in-secrets-manager)). |
| Amazon Bedrock AgentCore Runtime | `cf_prod_clip_agent` | Runs the agent container for as long as a job needs, one isolated session per job. See [ADR-03](DECISIONS.md#adr-03-amazon-bedrock-agentcore-runtime--claude-agent-sdk-for-the-agent). |
| Amazon Bedrock | Claude Fable 5.1 (global profile), Titan Text Embeddings V2 (in-Region) | Fable: watching the whole picture as frames and the second look at each picked moment ([ADR-40](DECISIONS.md#adr-40-watch-the-whole-video-before-picking)), moment selection, facecam detection, checklist judgement, captions, learnings. Every Fable call, through the Agent SDK or Converse, gets the owner's skills block first ([flow 15](#15-skills-every-ai-call-gets-every-skill)). Titan: 1024-number embeddings of clip text for S3 Vectors (no skills: not text generation). |
| Amazon Bedrock | Claude Haiku 5.5 (EU profile `eu.anthropic.claude-haiku-5-5`) | Ask Clip Factory only: rewrites a found answer in friendlier words. Optional, capped at 2,000 answers per 30 days, EU Regions only. See [ADR-39](DECISIONS.md#adr-39-help-runs-in-cf-prod-api-with-claude-haiku-55-through-the-eu-profile). |
| Amazon Bedrock | Amazon Nova 2 Lite (EU profile `eu.amazon.nova-2-lite-v1:0`) | The agent's second, independent watcher: each 300-second part of the picture as real video. Optional at run time; the video parts stay in the EU. Gets the skills block like every call. See [ADR-40](DECISIONS.md#adr-40-watch-the-whole-video-before-picking). |
| Amazon Transcribe | batch jobs | Word-level timestamps, language detection and speaker labels (who is talking). |
| Amazon ECR | agent repository | The ARM64 agent image, tagged by a hash of its sources. |
| Amazon CloudWatch | logs, alarms | JSON logs for every function and the agent; access logs for the WebSocket and REST APIs (never the query string); alarms on Lambda errors, failed or timed-out durable executions, stream lag, REST 5xx and help model failures (metric filter `cf-prod/HelpModelFailures`, alarm `cf-prod-help-model-failures`). |
| Amazon SNS | `cf-prod-alarms` | Emails `alarm_email` when an alarm fires (optional). |
| AWS IAM | GitHub OIDC deploy role, one role per function, the API Gateway logging role | No long-lived keys anywhere; each function can touch only what it needs. |
| Amazon OpenSearch Serverless | not deployed | Shown dashed in the diagram as an option for keyword or hybrid search later ([ADR-25](DECISIONS.md#adr-25-s3-vectors-for-the-learning-memory-opensearch-not-deployed)). |
| Content Rewards (not AWS) | `id.contentrewards.com` (sign-in), `mcp.contentrewards.com/mcp` (MCP, alpha, API version `2026-10-01`), the public campaign JSON on `contentrewards.com` | Paid clipping campaigns ([flow 19](#19-content-rewards-campaigns-contracts-38-adr-62)). Only `cf-prod-api`, `cf-prod-clip-flow` and `cf-prod-stats` call it; never the browser or the Mac. |
| GitHub Actions (not AWS) | CI, deploy, desktop runners | Tests and deploys through OIDC; builds the desktop app on `macos-latest` and `windows-latest` ([§12.3](CONTRACTS.md#123-desktop-wrapper-desktop-tauri-v2)). |

### Lambda functions

All of them, `cf-prod-campaigns` too, share one zip (`api/dist/lambda.zip`), Python 3.13, arm64, JSON logs, X-Ray active
([CONTRACTS.md §9](CONTRACTS.md#9-lambdas-one-zip-apidistlambdazip-python-313-arm64-package-clipfactory_api)).

| Function | Started by | Memory / timeout | Durable |
|---|---|---|---|
| `cf-prod-api` | HTTP API | 512 MB / 29 s (unchanged by help) | no |
| `cf-prod-job-flow` | `cf-prod-api`, async invoke of alias `live` | 256 MB / 120 s per invocation; whole execution up to 8 h 30 min | yes, retention 14 days |
| `cf-prod-clip-flow` | `cf-prod-api`, async invoke of alias `live` | 1024 MB / 900 s per invocation (chunked uploads); whole execution up to 3 days | yes, retention 14 days |
| `cf-prod-ws-authorizer` | WebSocket `$connect` | 128 MB / 10 s | no |
| `cf-prod-ws` | WebSocket routes | 128 MB / 10 s | no |
| `cf-prod-broadcast` | DynamoDB stream (filtered) | 256 MB / 60 s | no |
| `cf-prod-hooks` | REST API | 256 MB / 28 s (the code exchange calls the platform) | no |
| `cf-prod-stats` | EventBridge rule `cf-prod-stats` (every 15 min) and `cf-prod-api` (async: Refresh numbers; `{"action": "contentrewards"}` on Connect finish and money refresh) | 256 MB / 300 s; stops starting requests after 240 s; async retries 0, event age 15 min | no |
| `cf-prod-learn` | `cf-prod-api`, async invoke on `PUT /v1/weeks/{week}/best`; EventBridge `cf-prod-learn-daily` at 05:00 UTC | 512 MB / 900 s; async retries 1, event age 1 h | no |
| `cf-prod-money` | EventBridge `cf-prod-money-daily` at 06:00 UTC and `cf-prod-api` (async, Check now, once an hour) | 256 MB / 300 s; stops starting work after 240 s; async retries 0, event age 1 h | no |
| `cf-prod-campaigns` | `cf-prod-api` and `cf-prod-stats`, async only (`{"action": "read" \| "logo" \| "brand_picture", "userId", "campaignId"}`) | 512 MB / 120 s; async retries 0 | no |

### What was removed

The expansion removed these, with nothing left that refers to them ([CONTRACTS.md §14.1](CONTRACTS.md#141-what-is-removed-delete-it-from-terraform-code-tests-and-docs-nothing-may-still-reference-it)):

| Removed | Replaced by |
|---|---|
| Lambda `cf-prod-publisher` | `cf-prod-clip-flow` steps `ensure-posts` and `publish-{platform}` |
| Lambda `cf-prod-perf-check` | `cf-prod-clip-flow` steps `wait-48h`, `metrics`, `distil` |
| Lambda `cf-prod-watchdog` and its EventBridge rule (every 10 minutes) | the job-flow callback heartbeat timeout (15 minutes) |
| SQS `cf-prod-publish` and its dead-letter queue | durable execution: steps retry and checkpoint, no queue |
| EventBridge Scheduler group, role and one-time `perf-{postId}` schedules | `context.wait(48 h)` inside `cf-prod-clip-flow` |
| The DLQ alarm | alarms on `DurableExecutionFailed` and `DurableExecutionTimedOut` |
| Polling as the only way to see progress | WebSocket push; polling stays as the fallback |

The watchdog's EventBridge rule stays gone. [§16](CONTRACTS.md#16-clip-performance-stats-refresh-and-weekly-best-owner-request-2026-11-16)
adds exactly one new rule, `cf-prod-stats`, for a different job (reading numbers for many posts on a clock), see
[ADR-30](DECISIONS.md#adr-30-one-eventbridge-rule-and-a-due-queue-for-stats-polling).

## Data flows

### 1. Sign in and token lifetimes

```mermaid
sequenceDiagram
  autonumber
  participant W as Web app
  participant C as Cognito
  participant A as HTTP API
  W->>C: signIn (SRP: email + password proof)
  C-->>W: first time: NEW_PASSWORD_REQUIRED
  W->>C: confirmSignIn (new password)
  C-->>W: access + ID token (15 min), refresh token (30 days)
  W->>A: GET /v1/me, Authorization: Bearer access token
  A->>A: JWT authorizer checks issuer, audience, expiry
  Note over W,C: Before the access token expires, Amplify refreshes it.<br/>Rotation returns a new 30-day refresh token each time.
  W->>C: refresh (REFRESH_TOKEN_AUTH)
  C-->>W: new access + ID token, new refresh token
```

An owner who opens the app at least once every 30 days never signs in again. After 30 days without use the refresh
token expires and the sign-in screen appears. See [SECURITY.md](SECURITY.md).

### 2. Create a job and start `cf-prod-job-flow`

```mermaid
sequenceDiagram
  autonumber
  participant W as Web app
  participant A as cf-prod-api
  participant S as S3 media
  participant D as DynamoDB
  participant F as cf-prod-job-flow (durable)
  opt Upload instead of a link
    W->>A: POST /v1/uploads {filename, contentType, size}
    A-->>W: presigned PUT URL (1 h)
    W->>S: PUT the file (progress shown)
  end
  W->>A: POST /v1/jobs {source, clipTarget, notes}
  A->>A: validate link platform or upload key
  A->>D: put Job (queued, new sessionId, flowRun 1)
  A->>F: Invoke alias live, InvocationType Event,<br/>DurableExecutionName job-{jobId}-{flowRun}
  F-->>A: 202 + DurableExecutionArn
  A->>D: store flowExecutionArn
  A-->>W: 201 {job}
```

The start is idempotent: the payload has no timestamps, so starting the same name again either returns the running
execution or `DurableExecutionAlreadyStartedException`, which the API treats as "already started". **Retry** writes a
new `sessionId`, adds 1 to `flowRun` and starts `job-{jobId}-{flowRun}`. If the invoke itself fails, the job becomes
`failed` with "Could not start. Press Try again."

### 3. Job flow: the agent and its callback

`cf-prod-job-flow` replaces the watchdog. It costs nothing while it waits: the durable SDK checkpoints and the function
stops until the callback arrives.

```mermaid
flowchart TD
  start([job-flow starts]) --> cb["create_callback agent-done<br/>timeout 8 h, heartbeat timeout 6 min"]
  cb --> sa["step start-agent<br/>GetItem Job, InvokeAgentRuntime process_job + callbackId"]
  sa -- "job missing, another sessionId, or terminal" --> sup([outcome superseded])
  sa --> wait["cb.result(): no compute while waiting"]
  wait -- success --> fin["step finish: Job ready + clipCount if not already"] --> ready([outcome ready])
  wait -- "JobFailed" --> fail["step fail: Job failed with the agent's message"]
  wait -- "timeout, missed heartbeat or AgentStopped" --> resume["step resume-n: new sessionId, pickUp, note<br/>step stop-old-n; again on the new session (at most twice)"]
  resume --> cb
  resume -- "after 2 resumes" --> fail2["step fail: 'Making the clips stopped. Tap Try again to pick up where it left off.'"]
  wait -- "Canceled or Superseded" --> nowrite([outcome canceled or superseded, no write])
  fail --> stop["step stop-session: StopRuntimeSession"] --> failed([outcome failed])
  fail2 --> stop
```

```mermaid
sequenceDiagram
  autonumber
  participant F as cf-prod-job-flow
  participant D as DynamoDB
  participant R as Agent (AgentCore)
  participant L as Lambda durable callback API
  F->>F: create_callback agent-done
  F->>D: step start-agent: GetItem Job (queued, same sessionId?)
  F->>R: InvokeAgentRuntime {process_job, jobId, userId, callbackId}
  R-->>F: {accepted: true}
  Note over F: checkpoint, function stops, no compute
  loop while the job runs (at most every 5 min)
    R->>L: SendDurableExecutionCallbackHeartbeat
  end
  alt finished
    R->>D: Job ready, clipCount (finalize)
    R->>L: SendDurableExecutionCallbackSuccess {jobId, clipCount}
    L->>F: resume
    F->>D: step finish (no-op when already ready)
  else agent failed
    R->>D: Job failed with a plain reason
    R->>L: SendDurableExecutionCallbackFailure JobFailed
    L->>F: resume with CallbackError
    F->>R: step stop-session
  else container died (no heartbeat for 6 min) or got SIGTERM (AgentStopped)
    L->>F: resume with CallbackError (heartbeat timeout)
    F->>D: step resume-n: new sessionId, pickUp, "Picking up where it stopped…" (at most twice, §30)
    F->>D: after the last resume, step fail: "Making the clips stopped. Tap Try again to pick up where it left off."
    F->>R: step stop-session (errors ignored)
  end
```

Every write by the flow is conditional on the Job's `sessionId`, so an old run can never overwrite a newer retry.
**Cancel** is handled by the API (Job `canceled`, `cancel` to the agent, `StopRuntimeSession`); the agent sends
`Canceled` and the flow writes nothing.

### 4. The agent pipeline

The agent owns the job record from the moment it accepts. Each step updates `steps[i]`, `progress` and `heartbeatAt`;
each write reaches the app through the live updates of flow 5. Details are in [AGENT.md](AGENT.md).

```mermaid
sequenceDiagram
  autonumber
  participant R as Agent (AgentCore)
  participant D as DynamoDB
  participant S as S3 media
  participant Y as Source site
  participant T as Transcribe
  participant B as Bedrock (Fable 5.1, Titan V2)
  participant N as Bedrock (Nova 2 Lite, EU)
  participant V as S3 Vectors
  R->>D: job running, load settings, every skill (no switch), latest 10 learnings
  R->>S: read each skill's file, build the skills block once for the job
  R->>Y: resolve: metadata (title, channel, duration) or S3 head for uploads
  R->>Y: download: audio only, capped at maxSourceHours
  R->>S: audio.m4a
  par in the background, while the words are written down
    R->>Y: the small picture rendition (up to 480p, no sound)
    R->>R: one ffmpeg pass: 2 fps parts of 300 s + picture change per second
    R->>S: picture/part-NNNN.mp4, picture.json
  and
    R->>T: StartTranscriptionJob (word timestamps, auto language, speaker labels)
    T->>S: transcript.json
    R->>S: words.json, speakers.json, loudness.json
  end
  par watch: both models see the whole picture
    R->>B: every 150 s: frames + that part's words (skills block first)
    B-->>R: what is seen: events with kind, strength, face, on-screen text
  and
    R->>N: every 300 s part as video (skills block first)
    N-->>R: what is seen, a second opinion
  end
  R->>S: watch/chunk-NNNN.json, watch/nova-NNNN.json, visual_log.json, signals.json
  R->>B: Titan: embed title, channel, notes, transcript start
  R->>V: QueryVectors top 8, this owner, status performed
  V-->>R: similar past clips with performance ("What worked before")
  R->>B: select: skills block + transcript windows with picture notes + loudness + hot spots + learnings + what worked before
  B-->>R: ranked moments (+ spares) with hooks and moment types
  R->>B: second look: every frame of each picked moment and spare + its words
  B-->>R: keep or not, small timing moves, an honest hook
  R->>S: moments.json
  loop each moment
    R->>Y: download only that section of video
    R->>B: one frame: where is the facecam?
    R->>R: ffmpeg: 1080x1920, hook, captions, cover
    R->>B: checklist judgement (with measured values)
    R->>S: clip.mp4, cover.jpg
    R->>D: Clip (status review)
  end
  R->>B: captions per platform
  R->>B: Titan: embed each new clip
  R->>V: PutVectors (status review)
  R->>D: job ready, clipCount
```

If the vector query fails, the agent logs `vectors.query_failed` and carries on without the section; fewer than three
`performed` hits are topped up with the owner's other clips.

**The picture is optional at every point.** The watch step never fails a job: when the small rendition cannot be
downloaded, ffmpeg fails, or a model is throttled, refuses or is not allowed, the agent logs it and picks from the
signals it has, down to exactly the words-and-loudness pipeline it was before
([AGENT.md](AGENT.md#watching-the-video), [ADR-40](DECISIONS.md#adr-40-watch-the-whole-video-before-picking)). The
fan-out (8 Fable chunks, 4 Nova parts at a time) is plain asyncio inside the one container, so cancel, the session
fence and the heartbeats work as for every other step.

### 5. Live updates over the WebSocket API

```mermaid
sequenceDiagram
  autonumber
  participant W as Web app (live.ts)
  participant G as WebSocket API (stage live)
  participant Z as cf-prod-ws-authorizer
  participant H as cf-prod-ws
  participant D as DynamoDB
  participant B as cf-prod-broadcast
  W->>W: fetchAuthSession(): fresh access token
  W->>G: connect wss://.../live?token=...
  G->>Z: $connect REQUEST authorizer
  Z->>Z: RS256 against the Cognito JWKS, iss, token_use access, client_id, exp
  Z-->>G: Allow, context.sub
  G->>H: $connect
  H->>D: put Connection CONN#{connectionId}, ttl 2 h
  G-->>W: connected (polling slows to every 30 s)
  Note over D,B: the agent, the API or a flow writes a Job, Clip, Post or Learning
  D->>B: stream batch (filter: JOB#, CLIP#, POST#, LEARNING#, WEEK# only)
  B->>B: keep the last change per item, build the public shape
  B->>D: query the owner's connections
  B->>G: PostToConnection {type, op, id, item}
  G-->>W: event, screen cache updated in place
  opt connection gone (410)
    B->>D: delete that Connection
  end
  loop every 5 min
    W->>G: {"action":"ping"}
    G->>H: $default
    H-->>W: {"type":"pong"}
  end
  Note over W,G: after 110 min the app reconnects itself (2-hour cap).<br/>On any close: back off 1, 2, 4, 8, 16, 30 s, then refetch what is on screen.
```

- Events carry the same public shapes as the HTTP API, so internal fields (`sessionId`, `videoKey`, `publishState`,
  `flowExecutionArn` and so on) never leave AWS. An event over 24 KB is sent as `partial: true` and the app refetches.
- The token is in the query string of the connect request, so the WebSocket access log has a fixed list of fields with
  no query and no headers, data tracing is off, and the Lambdas never log the token.
- Without a connection (mock mode, an old `config.json`, or a dropped socket) the app polls as before. Nothing on
  screen complains about a dropped socket.

### 6. Review, Keep and Throw away

```mermaid
sequenceDiagram
  autonumber
  participant W as Web app
  participant A as cf-prod-api
  participant D as DynamoDB
  participant V as S3 Vectors
  participant C as cf-prod-clip-flow (durable)
  W->>A: GET /v1/clips?status=review
  A-->>W: clips with presigned video and cover URLs (1 h)
  W->>A: GET /v1/clips/{clipId}/similar
  A->>V: GetVectors(clipId), QueryVectors top 6, this owner, performed
  A-->>W: up to 5 "Like clips that did well"
  opt edit captions
    W->>A: PATCH /v1/clips/{clipId} {captions}
  end
  alt Keep (confirm)
    W->>A: POST /v1/clips/{clipId}/confirm
    A->>D: one transaction: clip confirmed, publishState pending, flowRun 1,<br/>one Post per enabled platform
    A->>C: Invoke alias live, Event, DurableExecutionName clip-{clipId}-{flowRun}
    A->>D: publishState started, flowExecutionArn
    A-->>W: {clip, posts} (celebration)
  else Throw away (after the 8-second Undo)
    W->>A: POST /v1/clips/{clipId}/decline
    A->>D: clip declined
    A->>A: delete clip.mp4 and cover.jpg
    A->>V: DeleteVectors(clipId), errors logged only
  end
```

Keep is safe to press twice: a clip whose flow is `pending` is started again with the same name and payload (a no-op if
it is already running), and a `started` or `posted` clip just returns its current state. A clip that ended `failed`
shows **Try again**, which starts `clip-{clipId}-{flowRun + 1}`.

### 7. Clip flow: publish, wait 48 hours, learn

```mermaid
flowchart TD
  s([clip-flow starts]) --> ep["step ensure-posts<br/>create posts if missing, clip publishing if any is queued"]
  ep --> pub{"any post queued?<br/>(account connected)"}
  pub -- "yes, one platform after another" --> pp["step publish-{platform}: start<br/>(saves publishHandle, 3 attempts)"]
  pp --> chk{"processing?"}
  chk -- yes --> wt["wait-{platform}-{n}: no compute"] --> ck["step check-{platform}-{n}"] --> chk
  chk -- "ready_to_finish" --> fin["step finish-{platform}"] --> chk
  chk -- done --> mp["post posted (in that step)"] --> settle
  pp -- "error, reconnect needed, over maxChecks" --> pf["post failed with a plain sentence"]
  pf --> settle
  pub -- "no (no account: pending_integration)" --> settle["step settle-clip<br/>posted, failed or confirmed"]
  settle -- "nothing posted" --> uv1["step upsert-vector (status confirmed)"] --> np([outcome not_posted])
  settle -- "at least one posted" --> w48["wait-48h: Duration 48 h, no compute"]
  w48 --> met["step metrics: views, likes, comments, shares per post"]
  met --> dis["step distil: retired, no model call (daily lessons instead)"]
  dis --> uv2["step upsert-vector (status performed + performance)"] --> done([outcome done])
```

```mermaid
sequenceDiagram
  autonumber
  participant C as cf-prod-clip-flow
  participant D as DynamoDB
  participant X as Platform API
  participant B as Bedrock (Fable 5.1, Titan V2)
  participant V as S3 Vectors
  C->>D: step ensure-posts
  loop each queued post, one platform after another
    C->>X: step publish-{platform}: start (create, upload the file in chunks)
    C->>D: publishHandle (so a replay resumes, never posts twice)
    loop while processing
      Note over C: wait-{platform}-{n}: no compute
      C->>X: step check-{platform}-{n}: status
    end
    C->>X: step finish-{platform} (Instagram, Facebook, X)
    X-->>C: post id and URL
    C->>D: post posted, postedAt, statsId, perfCheckAt = postedAt + 48 h
  end
  C->>D: step settle-clip: clip posted
  Note over C: wait-48h: checkpoint, no compute, no schedule
  C->>X: step metrics: read views, likes, comments, shares
  C->>D: metrics on each post
  Note over C: step distil: retired, no model call (the daily run learns from day-7 numbers)
  C->>V: step upsert-vector: GetVectors, merge metadata, PutVectors (performed)
```

The `metrics` step reads the numbers through the same stats refresh as the poller ([flow 13](#13-clip-numbers-the-poller-and-refresh-numbers)),
so it shares the platforms' budgets. Every step is at-least-once, so each is written to be safe to repeat: posts are created only once (`postsCreated`),
a post is updated only while it is `queued`, and every platform call that creates something first saves a
`publishHandle`, so a replayed step resumes the upload instead of starting a second one. The few calls that cannot be
repeated safely on the platform side (TikTok init, Instagram `media_publish`, X post) are at-most-once: if one is
interrupted, the post fails with "We are not sure it posted. Look on {Platform} before you press Try again."
Publishing in detail is in [flow 16](#16-set-up-posting-connect-and-real-posting). A
durable execution stays pinned to the Lambda version it started on, so a deploy during the 48-hour wait never changes
a running flow.

### 8. The learning memory (S3 Vectors)

Each clip gets one vector (`key = clipId`) built from its moment type, hook, YouTube title and summary, embedded by
Titan Text Embeddings V2 (1024 numbers, normalised). Filterable metadata: `userId`, `momentType`, `platforms`,
`status` (`review`, `confirmed`, `performed`) and `scoreBucket`; stored but not filterable: `hook`, `title`, `summary`
and `performance`.

| When | Who | What happens to the vector |
|---|---|---|
| Job finishes | agent | created, status `review` |
| Before moment selection | agent | the top 8 `performed` clips of this owner like this source become "What worked before" in the prompt |
| Owner opens a clip | API | `/similar` returns up to 5 of the owner's measured clips most like it |
| Keep, nothing posted | clip-flow | status `confirmed` |
| 48 hours after posting | clip-flow | status `performed` with the summed numbers |
| Owner stars it as best of the week | `cf-prod-learn` | metadata `best = true` (unstarred: `best = false`); `best` clips come first in "What worked before" |
| Throw away | API | deleted |

Two kinds of memory work together: **learnings** are short sentences about what works in general; **vectors** find
specific past clips that resemble the one at hand, with their real numbers.

### 9. Platform webhooks (REST API)

Webhooks: nothing runs inline except storing the event. The OAuth callback on the same API is [flow 16](#16-set-up-posting-connect-and-real-posting).

```mermaid
sequenceDiagram
  autonumber
  participant P as Platform (Meta, YouTube)
  participant G as REST API cf-prod-hooks (stage v1)
  participant H as cf-prod-hooks
  participant S as SSM Parameter Store
  participant D as DynamoDB
  P->>G: GET /hooks/instagram?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
  G->>H: AWS_PROXY (platform path parameter required)
  H->>S: GetParameter /cf-prod/hooks/verify-token (cached 5 min)
  H-->>P: 200 challenge (or 403)
  P->>G: POST /hooks/instagram (event)
  G->>H: AWS_PROXY
  H->>H: size limit 256 KB, signature check (phase 1: unverified)
  H->>D: put HOOK#instagram event, ttl 14 days
  H-->>P: 200 {"ok": true}
  P->>G: GET /oauth/youtube/callback?code=...&state=...
  H-->>P: 302 to the app: /settings/posting/setup/youtube?result=connected (flow 16)
```

The REST access log has no query string (OAuth callbacks carry `code` and `state`). Each method is throttled to 10
requests a second (burst 20), and the `tiktok` and `x` webhooks answer `501` (not built yet); their OAuth callbacks work.

### 10. Deploy

```mermaid
sequenceDiagram
  autonumber
  participant G as GitHub Actions (deploy.yml)
  participant I as IAM (OIDC role)
  participant TF as Terraform
  participant E as ECR
  participant AWS as AWS resources
  G->>G: tests, build web, build the Lambda zip (boto3 + durable SDK vendored)
  G->>I: AssumeRoleWithWebIdentity (repo, refs/heads/main)
  G->>TF: init (S3 state, lockfile), plan
  G->>E: build and push agent image (tag = hash of agent sources)
  G->>TF: apply the plan
  TF->>AWS: Cognito, three APIs, nine Lambdas (two durable, new version + alias live),<br/>EventBridge rule cf-prod-stats, table + stream + gsi2, buckets, vector bucket + index, SSM, runtime, alarms
  G->>AWS: write config.json (apiUrl, wsUrl, oauthCallbackBase) from outputs, sync web to S3 (keeps tiktok*.txt), invalidate CloudFront
  G->>AWS: write version.json with the release areas (flow 11)
  opt desktop/ or the icon changed, or a download is missing
    G->>AWS: desktop job: build .dmg and .exe, upload to downloads/ (flow 12)
  end
```

Step-by-step setup, including the one-time account settings, is in [DEPLOYMENT.md](DEPLOYMENT.md).

### 11. Updates: `version.json`, release areas and the update bar

Every deploy tells running apps that something is new, and in a word or three what it is
([CONTRACTS.md §12.2](CONTRACTS.md#122-update-banner-whats-new--reload)).

- **Build.** The web build embeds its own version (`VITE_APP_VERSION`, the short git sha).
- **Areas.** `scripts/release-areas.sh <prev-sha> <new-sha>` collects the labels. `prev-sha` is the `version` in the
  live `/version.json` in the web bucket. Rule, in order: the `Area:` lines in the commit messages between the two
  ([GIT_WORKFLOW.md](GIT_WORKFLOW.md#area-lines-what-the-update-bar-says)); otherwise the changed files mapped through
  `web/areas.json` (longest folder prefix wins, for example `web/src/routes/settings` → "Settings"); otherwise
  `["Improvements"]`. At most three labels, duplicates removed. With no live `version.json` (first deploy) the label
  is `["First release"]`.
- **Publish.** After the web files are synced, the deploy writes
  `{"version":"<short sha>","builtAt":"<ISO time>","areas":[...]}` to `/version.json` with `Cache-Control: no-store`.
  It is written **last**, so an app never sees a new version before its files are in place.
- **Detect.** The app fetches `/version.json` (bypassing every cache) on start, every 5 minutes, when the tab or window
  becomes visible, and when its service worker reports a waiting worker. A different `version` shows the update bar.
- **Reload.** The progress bar runs the [reload curve](UX_DESIGN_SYSTEM.md#the-reload-curve) while the app tells the
  waiting service worker to `skipWaiting`, waits for `controllerchange`, then reloads (at most 10 s).

```mermaid
sequenceDiagram
  autonumber
  participant G as deploy.yml
  participant R as release-areas.sh
  participant S as S3 cf-prod-web
  participant C as CloudFront
  participant W as Web app (browser, PWA or desktop app)
  participant SW as Service worker
  G->>S: get the live version.json
  S-->>G: {version: prev-sha} (none on the first deploy)
  G->>R: prev-sha, new-sha
  R->>R: Area lines in commits prev..new<br/>else changed paths via web/areas.json<br/>else Improvements (first deploy: First release)
  R-->>G: areas: Settings, Profile picture
  G->>S: sync new build (hashed assets, index.html, sw.js)
  G->>C: invalidate the cached app files
  G->>S: put version.json (no-store), last
  loop on start, every 5 min, on visible, on waiting worker
    W->>C: GET /version.json (cache: no-store)
    C-->>W: {version: new-sha, areas}
  end
  W->>W: new-sha differs from VITE_APP_VERSION: show the bar
  Note over W: New! · Settings · Profile picture · Later · Reload
  W->>SW: owner presses Reload: registration.update(), then postMessage SKIP_WAITING
  W->>W: progress 0 → 75 % in 0.8 s, then creep
  SW-->>W: controllerchange (new worker active, fresh files cached)
  W->>W: ease to 100 %, sparkle, location.reload()
```

Installed apps (phone PWA, desktop PWA and the desktop app) run the same code, so they show the same bar. The desktop
app never needs its own update: it loads the site, and the site updates itself.

### 12. Get the app and the desktop wrapper

The app offers the right install for each device ([CONTRACTS.md §12.1](CONTRACTS.md#121-get-the-app-sidebar-item-on-phones-a-card-in-settings-plus-a-one-time-banner-on-home))
and the Mac and Windows downloads come from a thin Tauri v2 window ([§12.3](CONTRACTS.md#123-desktop-wrapper-desktop-tauri-v2),
[ADR-18](DECISIONS.md#adr-18-a-thin-tauri-desktop-wrapper-not-electron)).

**The wrapper** (`desktop/`) bundles no screens. It opens `app_url` in the system web view (WebKit on macOS, WebView2 on
Windows), sets the title "Clip Factory" and the app icon, keeps a 380 × 600 minimum size, remembers size and position,
opens outside links in the normal browser, appends `ClipFactoryDesktop` to the user agent and sets
`window.__CF_DESKTOP__ = true`, so the web app hides Get the app inside it. Sign-in, tokens, the service worker and the
live connection work as in a browser; tokens live in the wrapper's own web storage.

**The build** is the `desktop` job in `deploy.yml`. It runs after the web deploy, only when `desktop/**` or the app
icon changed or a download is missing from the bucket:

```mermaid
sequenceDiagram
  autonumber
  participant G as deploy.yml (web job done)
  participant M as macos-latest runner
  participant Wn as windows-latest runner
  participant S as S3 cf-prod-web
  participant C as CloudFront
  participant W as Web app
  participant U as Owner's computer
  G->>G: desktop/** or icon changed, or downloads/ file missing?
  par matrix
    G->>M: app_url from Terraform output
    M->>M: tauri build, universal-apple-darwin → Clip-Factory.dmg (unsigned)
    M->>S: put downloads/Clip-Factory.dmg
  and
    G->>Wn: app_url from Terraform output
    Wn->>Wn: tauri build, NSIS → Clip-Factory-Setup.exe (unsigned)
    Wn->>S: put downloads/Clip-Factory-Setup.exe
  end
  G->>S: rewrite downloads/manifest.json {version, files:{mac, windows}} (no-cache)
  G->>C: invalidate /downloads/*
  W->>C: GET /downloads/manifest.json
  C-->>W: files for mac and windows (path, size)
  W->>W: detect device, pick the matching file or fall back to browser install
  U->>C: Download for Mac → /downloads/Clip-Factory.dmg
  U->>U: first open: right-click → Open (unsigned)
  U->>C: the desktop app loads app_url
```

**Phones** never get a file. Android installs the PWA through the browser's own prompt. iPhone and iPad get three
picture steps to Add to Home Screen, because Apple allows no app download outside its store
([ADR-21](DECISIONS.md#adr-21-iphone-and-ipad-get-add-to-home-screen-steps-not-a-download)).

**Hiding it once installed.** The web app checks `display-mode: standalone` / `window-controls-overlay`,
`navigator.standalone` (iOS), the desktop wrapper markers, and `cf.installed=1` in local storage (set on the
`appinstalled` event).

### 13. Clip numbers: the poller and Refresh numbers

The owner sees every clip's numbers per platform on `/clips/{clipId}`
([CONTRACTS.md §16.5](CONTRACTS.md#165-poller-and-refresh-lambda-cf-prod-stats)). One code path,
`stats.refresh.refresh_posts`, reads them for three callers: the EventBridge tick (`reason "poll"`), the Refresh button
(`"manual"`) and the clip flow's `metrics` step after 48 hours (`"flow"`). All three go through the same per-platform
budget, so together they can never pass a platform's limit.

**What makes a post due.** When a post is published, its `statsDueAt` is set and it gets `gsi2pk = "STATS"`,
`gsi2sk = "{statsDueAt}#{postId}"`. That sparse index is the due-queue: only posts inside their 30-day window carry
it. After each reading the next `statsDueAt` is `readAt + interval`, where the interval depends on the platform and
the post's age ([ADR-29](DECISIONS.md#adr-29-stats-refresh-intervals-per-platform)):

| Post age | YouTube, TikTok, X | Instagram, Facebook |
|---|---|---|
| up to 48 hours | every 15 min | every 30 min |
| up to 7 days | every 30 min | every 60 min |
| up to 30 days | every 2 h | every 6 h |
| 30 days | one final reading, then the post leaves `gsi2` | same |

YouTube's slow insights (YouTube Analytics: watch time, engaged views, shares, new subscribers) are read at most every
6 hours (`insightsDueAt`), because Google needs 48–72 hours to process them. Private TikTok posts (unaudited app) have
no stats id and never enter the queue.

**The tick.**

```mermaid
sequenceDiagram
  autonumber
  participant E as EventBridge rule cf-prod-stats
  participant S as cf-prod-stats
  participant D as DynamoDB (gsi2, RATE#, POST#, STAT#)
  participant P as Platform API
  participant B as cf-prod-broadcast
  participant W as Web app
  E->>S: scheduled event, every 15 min
  S->>D: Query gsi2: gsi2pk = STATS and gsi2sk <= "{now}#~" (up to 2,000 posts)
  S->>S: group by platform in STATS_ORDER, chunk by idsPerRequest (50, 20, 50, 50, 100)
  loop each platform not blocked, each chunk, until 240 s
    S->>D: reserve: one conditional UpdateItem on RATE#{platform}
    alt budget left
      S->>P: one batched read (tokens from Secrets Manager)
      P-->>S: numbers + headers (quota, BUC usage, x-rate-limit-reset)
      S->>D: record: headers, blockedUntil when a limit is near or hit
      S->>D: per post: metrics, statsDueAt, gsi2sk (or REMOVE gsi2 when final)
      S->>D: STAT# snapshot (first, every 60 min, 1 % change, or final, TTL 90 days)
    else blocked
      S->>S: skip the platform, its posts stay due for the next tick
    end
  end
  S->>S: log stats.tick {posts, requests, updated, blocked, errors}
  D->>B: stream: POST# changed
  B->>W: post upsert: the stack updates, the sparkline gains a point
```

**Refresh numbers.**

```mermaid
sequenceDiagram
  autonumber
  participant W as Web app (clip page)
  participant A as cf-prod-api
  participant D as DynamoDB
  participant S as cf-prod-stats
  participant P as Platform API
  participant B as cf-prod-broadcast
  W->>A: POST /v1/clips/{clipId}/stats/refresh {platforms?}
  A->>D: Clip, Posts (gsi1 CLIP#), Accounts, RATE# budgets
  loop each platform in STATS_ORDER
    alt no post / private / no account / blocked
      A->>A: not_posted, private, not_connected or blocked (with nextAllowedAt)
    else
      A->>D: claim: SET refreshStartedAt, nextRefreshAt = now + cooldown<br/>if nextRefreshAt <= now and no refresh in the last 5 min
      A->>A: started, or too_soon when the claim fails
    end
  end
  A->>S: one Invoke (Event) {action refresh, userId, clipId, postIds of started}
  A-->>W: 202 {platforms: RefreshResult[]} (spinner, "Next check in 5 min")
  S->>D: reserve budget (same as the tick)
  S->>P: batched read
  S->>D: metrics, STAT#, then always REMOVE refreshStartedAt
  D->>B: stream: POST# changed
  B->>W: post upsert: new numbers, spinner stops
```

The cooldown is 5 minutes for YouTube, TikTok and X and 30 minutes for Instagram and Facebook, so pressing Refresh
again and again never spends more than the poller would. If the invoke itself fails, the API rolls the claims back and
answers `blocked` with "Could not check right now. Try again in a minute."

**Budgets** ([CONTRACTS.md §16.3](CONTRACTS.md#163-dynamodb-items)) are one item per platform (`RATE#{platform}`),
reserved with one conditional `UpdateItem` before every request, so two Lambdas at once can never both take the last
units:

| Platform | Counted as | Stop at | When a limit hits |
|---|---|---|---|
| YouTube | quota units per Pacific day (1 per `videos.list` call of up to 50 ids, 1 per Analytics report) | 7,000 of 10,000 (3,000 kept for uploads) | `quotaExceeded` / `rateLimitExceeded`: paused until 08:00 UTC |
| TikTok | requests per UTC minute | 300 of 600 | `429` / `rate_limit_exceeded`: paused 1 minute |
| Instagram, Facebook | Meta's `X-Business-Use-Case-Usage` header (call count, CPU time, total time, in %) | 75 % of any counter | throttle `80002` / `80001`: paused for Meta's `estimated_time_to_regain_access` (at least 60 min), **no retry** |
| X | requests per 15 minutes, plus an estimated spend | 1,000 of 3,500; $10 a month | `429`: paused until `x-rate-limit-reset`; monthly cap: paused until the 1st |

In phase 1 no account is connected, so every adapter answers `not_connected` and nothing reaches the network; the
poller, the queue and the budgets are already in place.

### 14. Best of the week

The owner stars the week's best clips in **Library › This week**; the picks teach the agent
([CONTRACTS.md §16.6](CONTRACTS.md#166-weekly-best-learning-lambda-cf-prod-learn),
[ADR-31](DECISIONS.md#adr-31-the-weekly-best-is-an-explicit-owner-signal), [AGENT.md](AGENT.md#best-of-the-week)).

A week is an ISO week (Monday start) in the **owner's own time zone**: the web computes `from` and `to` (local Monday
00:00 to the next Monday 00:00, as UTC instants, 167–169 hours across a clock change) and sends them with the week id.
A clip belongs to the week of its **anchor**: its earliest `postedAt`, or `decidedAt` while it is kept but not posted.

```mermaid
sequenceDiagram
  autonumber
  participant W as Web app (This week)
  participant A as cf-prod-api
  participant D as DynamoDB
  participant L as cf-prod-learn
  participant V as S3 Vectors
  participant B as Bedrock (Fable 5.1, Titan V2)
  participant BC as cf-prod-broadcast
  W->>A: GET /v1/weeks/2026-W46?from=...&to=...
  A->>D: Query POST# and CLIP# of the owner, WEEK#2026-W46
  A-->>W: WeekView: clips sorted by views, picks, learnState
  W->>W: owner stars clips (optimistic), waits 800 ms after the last tap
  W->>A: PUT /v1/weeks/2026-W46/best {from, to, clipIds}
  alt same picks as stored
    A-->>W: 200 {week}, nothing else happens
  else changed
    A->>D: TransactWriteItems: WEEK (revision + 1, learnState learning),<br/>picked clips best = true, unpicked best = false
    A->>L: Invoke (Event) {userId, week, revision}
    A-->>W: 202 {week}: "Learning from your picks..."
    L->>D: GetItem WEEK: revision still the same? (else superseded, no write)
    L->>V: picked: metadata best = true, unpicked: best = false (errors logged only)
    L->>D: rows for every clip of the week (picked, hook, moment type, length, captions, numbers)
    L->>D: Query SKILL# items; files from S3 skills/ (cached by key): the skills block
    L->>B: Converse, skills block first, maxTokens 4000, effort low: one 1-3 sentence learning
    B-->>L: end_turn + text
    L->>D: same revision? Put Learning (kind week, "Best of week 2026-W46"), WEEK learnState done
  end
  D->>BC: stream: WEEK#, LEARNING#, CLIP# changed
  BC->>W: week and learning events: the learning appears in a glass quote
```

An empty set of picks deletes that week's learning and ends `skipped`. A model answer that is cut off, refused or
filtered ends `failed` ("Could not learn this time. Change a pick to try again."), and Bedrock errors are retried
twice. Because every write checks `revision`, a quick second save always wins over a slower first one.

### 15. Skills: every AI call gets every skill

The owner's rule: *"The whole AI system should use all of these skills by default, no matter what, as long as I add
them."* ([CONTRACTS.md §18](CONTRACTS.md#18-skills-full-create-read-update-delete-every-ai-call-uses-every-skill-owner-request-2026-11-16),
[ADR-32](DECISIONS.md#adr-32-every-ai-call-gets-every-skill-through-one-shared-skills-block)).

**Create, read, update, delete.** Skills live in Settings › Clip making › Skills. The owner writes one by answering
three questions (`POST /v1/skills`, the API builds the `SKILL.md`), uploads a `.md` or `.zip` (presigned PUT, then
`POST /v1/skills`), reads any skill (`GET /v1/skills`, `GET /v1/skills/{skillId}`), changes their own
(`PUT /v1/skills/{skillId}`, with a `version` check so two screens cannot overwrite each other silently) and deletes
their own (`DELETE /v1/skills/{skillId}`, sent when the 8-second Undo ends). Built-in skills ship with the code and can
only be read. There is no on/off switch: `PATCH /v1/skills/{skillId}` only answers "Skills are always used now".

Every save writes a **new object** `skills/{userId}/{skillId}/{revisionId}/SKILL.md` (or `skill.zip`) and then moves
the DynamoDB item's `key` to it, so an object never changes after it is written: a running job keeps reading the file
it started with, and readers can cache files by key.

```mermaid
flowchart LR
  subgraph Settings["Settings › Clip making › Skills (web)"]
    W[Write / Upload] --> API
    R[Read] --> API
    E[Change] --> API
    X[Delete + Undo] --> API
  end
  API[cf-prod-api] --> D[("DynamoDB SKILL# items")]
  API --> S[("S3 skills/ revision files")]
  D --> L1[skills loader]
  S --> L1
  B0[built-in skills in the code] --> L1
  L1 --> BLK["one skills block<br/>built-ins, then the owner's by name"]
  BLK --> A1[Agent: Agent SDK moment picking]
  BLK --> A2[Agent: Converse fallback, facecam, checklist and hooks, captions]
  BLK --> A3[API: cf-prod-learn, daily lessons from day-7 numbers]
  BLK --> A4[API: cf-prod-learn, weekly best]
  BLK --> A5[API: Ask Clip Factory, Haiku rewrite]
  T[Titan embeddings] -.no skills, not text generation.-> V[(S3 Vectors)]
```

**One rule, two builders.** The agent (`agent/`) and the Lambdas (`api/`) each have the same small builder,
`skills_block(docs)`, checked against one shared reference file byte for byte. It puts every skill's `SKILL.md` text
inside `<owner_skills>`, built-ins first, then the owner's by name, at most 40,000 characters per skill and 120,000 in
total (built-ins are never the ones left out). `compose_system(block, task_system)` makes the block the **first**
part of every system prompt, followed by a Bedrock prompt-cache point when the block is 8,000 characters or more, so
the many calls of one job pay for the long, stable part once. If Bedrock refuses the cache point, it is turned off for
that process and the call is retried without it.

| Where | Model calls | How the skills are loaded |
|---|---|---|
| Agent (AgentCore Runtime) | Agent SDK moment picking; Converse: moment fallback, facecam, checklist (with the hook rewrite), captions | once per job at `analyze`; also written to `.claude/skills/` for the SDK |
| `cf-prod-learn` (weekly best, daily lessons) | `learn.converse_text` | `skill_prompt.load_skills` just before the call |
| `cf-prod-api`, Ask Clip Factory ([flow 17](#17-ask-clip-factory-the-help-assistant)) | `learn.converse_text` (Haiku 5.5, JSON schema) | `skill_prompt.load_block` per answer that reaches the model |

The Lambda loader reads the owner's `SKILL#` items with one Query and each file through a small in-memory cache keyed
by the S3 key (at most 64 files and 16 MB per container), so a warm Lambda reads S3 only after a skill changes. Both
`cf-prod-clip-flow` and `cf-prod-learn` may only `GetObject` under `skills/*` (no list); `cf-prod-learn` gets
`MEDIA_BUCKET`. A skill file that cannot be read is retried, then skipped and logged (`skills.skipped`); a failure to
read the skill items fails the step, whose normal retry runs, so no call quietly goes without skills.

**No way around it.** Each package has a test that reads its own source code and fails if a Converse, Agent SDK or
streaming model call is made anywhere except through these helpers, or without the `skills` argument. The only model
calls without skills are the Titan embeddings in `vectors.py`.

### 16. Set up posting, Connect and real posting

The owner sets up each platform once in **Settings › Posting › Set up posting**
([CONTRACTS.md §17](CONTRACTS.md#17-posting-setup-a-setup-list-per-platform-real-connect-real-posting-owner-request-2026-11-16),
the steps in [SETUP_POSTING.md](SETUP_POSTING.md)): make a developer app on the platform's website by following the
step cards, paste its keys, press **Check it**, then **Connect**. Numbered **10** in the diagram.

```mermaid
sequenceDiagram
  autonumber
  participant O as Owner (web app)
  participant A as cf-prod-api
  participant SM as Secrets Manager
  participant D as DynamoDB
  participant P as Platform (consent page, token endpoint)
  participant H as cf-prod-hooks (REST GET /oauth/{platform}/callback)
  O->>A: GET /v1/setup (steps done, gates, values to copy: redirect URI, privacy URL, ...)
  O->>A: PUT /v1/setup/{platform}/keys {clientId, clientSecret, configId?}
  A->>SM: create or put cf-prod/platforms/{platform}/app
  A->>D: SETUP#{platform}: keysSavedAt, masked hints only
  O->>A: POST /v1/setup/{platform}/check
  A->>P: key test (dummy code or client credentials)
  O->>A: POST /v1/accounts/{platform}/connect
  A->>SM: GetSecretValue cf-prod/oauth/state-key (cached 5 min)
  A->>D: OAUTH#{nonce} (TTL exp + 5 min)
  A-->>O: authorizeUrl (state = v1.nonce.exp.HMAC; PKCE challenge for YouTube and X)
  O->>P: same tab: sign in, approve
  P->>H: 302 ?code&state
  H->>H: verify HMAC, expiry, platform
  H->>D: consume OAUTH#{nonce} once (conditional delete)
  H->>SM: read app keys
  H->>P: exchange code (exact redirect URI, PKCE verifier), read profile
  H->>SM: write cf-prod/platforms/{platform}/token (or pending choices for Meta)
  H->>D: ACCOUNT#{platform} connected (name, avatar), SETUP#{platform}
  H-->>O: 302 {app_url}/settings/posting/setup/{platform}?result=connected
  D-->>O: live event "setup" (stream → cf-prod-broadcast → WebSocket)
```

**Values the owner copies.** `GET /v1/setup` serves every value a platform asks for, built from `APP_URL` and
`HOOKS_URL`: the website (`/about.html`), privacy and terms (`/legal/…`, on the app's own domain because TikTok
verifies by URL prefix and Google lists every domain, [ADR-37](DECISIONS.md#adr-37-about-privacy-and-terms-on-the-apps-own-domain)),
the data-deletion URL and one exact redirect URI per platform. TikTok's verification file is uploaded through the API
into the web bucket root and invalidated in CloudFront.

**The callback** is the only public step. It trusts nothing in the request except a state that it signed, that has not
expired and that has not been used; it always redirects to one fixed page with a code from a fixed list, never logs
the query, and stores tokens only in Secrets Manager ([ADR-34](DECISIONS.md#adr-34-oauth-with-a-signed-single-use-state-tokens-only-in-secrets-manager),
[SECURITY.md](SECURITY.md#platform-keys-and-tokens)). Meta can return several Pages or Instagram accounts: the choices
wait in a short-lived `pending` secret and the owner picks one in the app (`POST /v1/accounts/{platform}/choose`).
Instagram uses Facebook Login for Business with a **user** access token: the callback exchanges it for the
long-lived one (`fb_exchange_token`), reads `me/accounts` with each Page's `instagram_business_account`, and keeps
only the Pages that have one. One → connected at once; several → `choose`; none → `no_accounts`. The token secret then
holds the Instagram account id, the Page id and that Page's access token, which posting and numbers use.

**Gates.** What each platform still has to allow is a gate on the setup: YouTube `published_app` (the Google app must
be **In production**, or tokens die after 7 days), TikTok `app_review` and `posting_audit` (until both pass, posts are
"Only me"), Instagram and Facebook `app_live` (Reels stay visible to the owner until each Meta app is Live), X
`credits`. A platform is
**ready** when it is connected and no gate needs the owner.

**Posting.** The clip flow ([flow 7](#7-clip-flow-publish-wait-48-hours-learn)) asks `SecretsTokenProvider` for the
token (refreshed 5 minutes before expiry; TikTok and X rotate refresh tokens, so a 30-second lease serialises
refreshes and the new secret is written before use), then runs the platform's publisher
([ADR-35](DECISIONS.md#adr-35-every-upload-is-sent-as-a-file-and-posting-waits-inside-the-clip-flow)). Every upload is
sent as a file read from S3 in 8 MB ranges:

| Platform | Start | Check (durable wait between) | Finish |
|---|---|---|---|
| YouTube | resumable session on `www.googleapis.com/upload/youtube/v3/videos`, 8 MB chunks, privacy from Settings | `videos.list` processing status, every 30 s, up to 60 | – |
| TikTok | `creator_info`, then Direct Post `init` with the Post to TikTok sheet's choices, `FILE_UPLOAD` chunks | `status/fetch`, every 15 s, up to 80; the public id may come later (follow-up loop) | – |
| Instagram | publishing limit check, `REELS` container, upload to `rupload.facebook.com/ig-api-upload` | container `status_code`, every 60 s, up to 15 | `media_publish`, permalink |
| Facebook | `video_reels` start, upload to `rupload.facebook.com/video-upload` | video `status`, every 30 s, up to 40 | `video_reels` finish `PUBLISHED` |
| X | `media/upload` initialize, 4 MB appends, finalize | media status after `check_after_secs`, up to 20 | `POST /2/tweets` with links removed |

Disconnect (after an 8-second Undo in the app) revokes the token where possible, deletes the token secret and, for
YouTube, asks `cf-prod-stats` to `forget` stored YouTube numbers.

### 17. Ask Clip Factory: the help assistant

The owner asks "how do I…" or "where is…" and gets short steps plus a button that opens the page and lights up the
control ([CONTRACTS.md §19](CONTRACTS.md#19-ask-clip-factory-grounded-in-app-help-assistant-owner-request-2026-11-16),
[HELP_ASSISTANT.md](HELP_ASSISTANT.md), [ADR-38](DECISIONS.md#adr-38-bm25-over-vectors-for-help-and-the-model-is-optional),
[ADR-39](DECISIONS.md#adr-39-help-runs-in-cf-prod-api-with-claude-haiku-55-through-the-eu-profile)).

**Build time.** `web/scripts/help-corpus.mjs` turns the router, the navigation, the Settings tree, the screens and the
curated guides (`helpKb.json`) into `help-corpus.json` (committed). The Vite build also emits a content-hashed copy,
`/assets/help-corpus.<hash>.json` (cached forever), and names it in a `cf-help-corpus` meta tag in `index.html` (never
cached), so the API always finds the corpus that matches the deployed screens. `build_lambda.py` bundles the same file
into the Lambda zip as the fallback.

```mermaid
sequenceDiagram
  autonumber
  participant W as Web app (Ask panel)
  participant A as cf-prod-api (help)
  participant D as DynamoDB
  participant C as CloudFront (app)
  participant B as Bedrock (Haiku 5.5, EU profile)
  W->>A: POST /v1/help/answers {question, history ≤ 4, context}
  A->>D: HELP / SWITCH (at most every 60 s)
  A->>D: USER# / HELP#RATE: conditional update (6 a minute, 60 an hour)
  opt corpus older than 10 minutes
    A->>C: GET /index.html, read the cf-help-corpus meta
    A->>C: GET /assets/help-corpus.{hash}.json (same origin only)
  end
  A->>A: when filter (device, os, installed), refusal check, BM25 top 6, compose
  alt known, model allowed, cap reserved (HELP / CAP#window)
    A->>B: Converse: the owner's skills block, then the rules, JSON schema, maxTokens 700
    B-->>A: {known, text, steps, actionIds, sourceIds}
    A->>A: ground check (buttons, paths, numbers), else the composed answer
  end
  A-->>W: answer, mode, requestId (one help.answer log line, no text)
  opt answer has a live number
    W->>A: GET /v1/weeks/{week} or /v1/me (the owner's token, as the pages do)
  end
  W->>W: button: route check, unsaved guard, navigate, spotlight data-help
```

- **Without the model** the composed answer is complete; the model only rewords it. Unknown and refused questions
  never reach Bedrock. Any model problem (timeout, bad JSON, a stop reason, an invented button or number) returns the
  composed answer with `mode: "kb"`.
- **Skills**: like every model call ([flow 15](#15-skills-every-ai-call-gets-every-skill)), the help call goes through
  `learn.converse_text`, so the owner's skills block (`skill_prompt.load_block`) comes first and the help rules after
  it; the rules keep facts to the knowledge, the skills set the tone and the clip advice. If the skills cannot be read,
  the model is not called and the composed answer is used (outcome `kb_skills`).
- **In the browser**: help calls use their own quiet `fetch` (27 s timeout), so no page refetches. On a network
  error, a timeout or a 5xx the panel answers from its own copy of the corpus with the same rules; on 429 it shows a
  countdown and never retries by itself; on `help_off` the launcher disappears and the local copy is not used.

### 18. Ask as a full assistant (CONTRACTS §28, ADR-51)

```
browser ── whoami ──▶ cf-prod-ws ──▶ {connectionId}
browser ── POST /v1/help/files ──▶ cf-prod-api ──▶ presigned PUTs ──▶ cf-prod-media ask/{sub}/{fileId}
browser ── POST /v1/help/asks ──▶ cf-prod-api ── async Invoke ──▶ cf-prod-ask
cf-prod-ask ── skills, knowledge pack, APP STATE (DynamoDB reads) ──▶ Claude Opus 5.5 (Bedrock Mantle, eu-north-1)
            ◀── tool calls: web_search (Brave) · web_fetch (SSRF-guarded) · read_app_doc · read_my_clip_factory · show_app_buttons
cf-prod-ask ── PostToConnection ask.* ──▶ the owner's socket ──▶ the panel streams the answer
cf-prod-ask ── finally: delete ask/{sub}/{fileId}
```

The HTTP API keeps its 29 s limit: the answer runs in `cf-prod-ask` (150 s, async, never retried) and comes back as
events on the WebSocket the app already holds. The search key is the owner's own, in Secrets Manager
(`cf-prod/ask/search-key`). Everything Ask knows about the app is a generated pack shipped in the zip
(`api/src/clipfactory_api/ask/knowledge.json`, `ask/library/`), behind the owner's skills and cached for an hour.
When the socket, the model or the assistant switch is not there, the panel answers with §17 (above) instead.

### 19. Content Rewards campaigns (CONTRACTS §38, ADR-62)

The owner joins a paid clipping campaign on Content Rewards (CR), pastes its link into Clip Factory, and every clip
made for it follows its rules and is sent to CR inside CR's 30-minute window
([CONTRACTS.md §38](CONTRACTS.md#38-content-rewards-campaigns-owner-request-2026-11-21),
[ADR-62](DECISIONS.md#adr-62-content-rewards-the-official-sign-in-through-the-desktop-apps-loopback-door-sending-from-the-cloud-a-reminder-when-it-cant),
the owner's steps in [SETUP_POSTING.md](SETUP_POSTING.md#content-rewards)). Numbered **13** in the diagram.

CR is **not** a sixth `Platform`: it is its own connection (`CRCONN`), its own card on Set up posting, its own routes
under `/v1/contentrewards` and its own items. The five platforms, `GET /v1/setup`, the setup to-do list and the
publish chain behave exactly as before when no campaign is involved. The feature is **on** in prod
(`content_rewards_enabled = true` → `CONTENT_REWARDS=on`). It shipped switched off while its parts were built
(`false` → `CONTENT_REWARDS=off`: every `/v1/contentrewards*` route answers 503 `unavailable` and the clip flow sends
nothing); once every part of §38.19 had merged, the one-line switch PR #88 (21 Nov 2026) turned it on. Setting the
default back to `false` turns it off the same way ([DEPLOYMENT.md](DEPLOYMENT.md#content-rewards-contracts-38)).

**Who talks to Content Rewards.** Only `cf-prod-api`, `cf-prod-clip-flow` and `cf-prod-stats`, server to server.
Never the browser (CR answers 403 to any MCP request that carries an `Origin` header, and the token lives only in
Secrets Manager), never the Mac (it only carries a one-time code) and never `cf-prod-campaigns` (it reads untrusted
brand text and outside links, and has no secret access).

| Host | Used for | By |
|---|---|---|
| `id.contentrewards.com` | OAuth: `/oauth2/register` (RFC 7591, once per install, `client_name` "Clip Factory", five loopback redirects, no secret), `/oauth2/authorize` (in the owner's system browser), `/oauth2/token`, `/oauth2/revoke` | `cf-prod-api` (register, code exchange, revoke); the three Lambdas (refresh, under the lease) |
| `mcp.contentrewards.com/mcp` | MCP JSON-RPC: `get_me`, `list_my_campaigns`, `create_my_submission`, `list_my_submissions`, `get_my_submission`, `get_my_balance`, `list_my_payouts`, `send_feedback`; headers `Api-Version: 2026-10-01`, `MCP-Protocol-Version: 2025-11-25`, `Mcp-Name`, never `Origin`; at most 2 calls a second per container | `cf-prod-api`, `cf-prod-clip-flow`, `cf-prod-stats` |
| `contentrewards.com/api/campaign/campaigns/{uuid}` | the public campaign JSON (undocumented): a preview for the card, read only when the owner acts (add, Check now, a card older than 10 minutes, a job's start), at most 6 a minute, cached on the item, never on a schedule and never to submit | `cf-prod-api` |
| `crusercontent.com`, `docs.google.com`, Google Drive, Dropbox | the brand's picture (copied once, only `https://crusercontent.com/…`, ≤ 1 MB), the Google Docs a brief links to, logo links; the Google Docs and logo links go through the `ask/fetch.py` SSRF guard on every hop | `cf-prod-campaigns` |

**Sign-in: the desktop app's one-shot door.** CR's sign-in only returns to `http://127.0.0.1` (no https), so the
Mac app listens once on the computer, and the cloud keeps everything else.

```mermaid
sequenceDiagram
  autonumber
  participant O as Owner (Mac app window)
  participant D as Desktop door (127.0.0.1, ports 47811-47815)
  participant A as cf-prod-api
  participant DB as DynamoDB
  participant SM as Secrets Manager
  participant B as System browser
  participant ID as id.contentrewards.com
  participant M as mcp.contentrewards.com
  participant S as cf-prod-stats
  O->>D: cr_connect_listen: first free port of five, closes after 5 minutes
  O->>A: POST /v1/contentrewards/connect {port}
  A->>ID: POST /oauth2/register (first time only)
  A->>SM: cf-prod/platforms/contentrewards/app (clientId)
  A->>DB: a CRSTATE item per nonce (port, redirectUri, exp, TTL)
  A-->>O: authorizeUrl (signed state, PKCE S256, one resource)
  O->>D: cr_connect_open {url} (host, S256, resource and this port checked)
  D->>B: open the URL
  B->>ID: sign in, allow
  ID-->>B: 302 to the door on 127.0.0.1 with code, state and iss
  B->>D: GET / (Host and state checked in constant time)
  D-->>B: "Done! Go back to Clip Factory. You can close this tab."
  O->>D: cr_connect_result every 500 ms: {status: done, code, state, iss}
  O->>A: POST /v1/contentrewards/connect/finish {state, code, iss} (the code lives 60 s)
  A->>DB: consume that CRSTATE item once (conditional delete)
  A->>ID: POST /oauth2/token (code, verifier derived from the state, resource)
  A->>M: get_me, tools/list: can it send?
  A->>SM: under the CRCONN lease: put cf-prod/platforms/contentrewards/token, keep the VersionId
  A->>DB: CRCONN connected or read_only, tokenVersionId, signInBy, then CROWNERS
  A-)S: async {"action": "contentrewards", "what": "campaigns"}
  A-->>O: {result, connection}: confetti or one sentence
  DB-->>O: live event "contentrewards"
```

The door is macOS only (on Windows `listen` answers `unsupported` and the page shows the "browser on a computer"
words); it binds `127.0.0.1` only, answers one good request, never sees a token and never logs or stores the code.
The PKCE verifier is derived from the signed state, never stored. A phone or a plain browser gets "Do this step on
your Mac"; after this one sign-in everything runs in the cloud, so a phone upload is sent too.

**Tokens.** CR's access token lives 10 minutes; its refresh token is single use and rotates (a reuse more than a few
seconds later ends the connection), dies after 30 days unused and lasts 90 days at most. So exactly one process ever
refreshes: the `CRCONN` lease (as in §17.6), taken only with at least 20 s of Lambda time left; the secret is always
read by the `VersionId` recorded on `CRCONN`, never a cached or "current" copy; a lost answer is retried at once with
the same refresh token; the new secret is written put-only (a refresh can never re-create a disconnected secret)
before the token is used. Connect and Disconnect take the same lease. The stats tick refreshes once a day to keep
the sign-in alive, warns 7 days before `signInBy` (card and notification) and marks `needs_reconnect` after it.

**Adding a campaign.** `POST /v1/contentrewards/campaigns {url}` parses the link (campaign, Discover, the Whop copy, a
group; invite, checkout and other CR pages are refused with a sentence), reads the public preview, writes
`CAMPAIGN#{uuid}` and starts the rules read. Membership comes from `list_my_campaigns` (pending applications are not
listed): the page's UUID is matched to CR's `cmp_` id by its TypeID encoding, else by name, organization, access and
rates; two same-name siblings are `ambiguous` and never sent automatically. Joining stays in the CR app (there is no
tool to browse, join or apply). Pure code (`contentrewards/gates.py`, ported from the local app's `ruleCheck.js`)
makes the stops, the one next step and the `uploadPlaces` every time a campaign is served.

**Reading the rules** (`cf-prod-campaigns` `read`, async). The api and the stats tick store CR's listed
`description` on the item as `brief` before they start a read, so the reader needs nothing from CR. One Bedrock
Converse call with the clip agent's model and the local app's `RULES_SCHEMA` (ported) as a forced tool; the brief,
the owner's pasted rules and up to 3 public Google Docs the brief links to go in as JSON-encoded untrusted blocks
(`<` and `>` escaped). Code then checks every field: anything that can reach a caption, the screen or a link must
appear word for word in the input; fixed disclosure words (`#Ad`, "Paid partnership"); at most 8 hashtags and 5 tags;
CR's own toggles (drafts first, a sound, the logo) can only add stops; pay, budget, status, access and platforms
come only from CR's own fields. A read that fails or runs past 3 minutes is `rules_failed` ("I couldn't read the
rules. Tap Check now, or paste them below.").

**A campaign job.** `POST /v1/jobs {campaignId, campaignAnyway}` checks the campaign again (`list_my_campaigns` and
the public JSON, at most 8 s together; CR down → the stored rules and status), copies the rules onto the job
(`Job.campaign`, internal `JobCampaign`) and the ready logo to `jobs/{jobId}/source/campaign-logo.{ext}`, so a later
change never breaks a queued job. The agent follows `job.campaign` ([AGENT.md](AGENT.md#campaign-clips)): the length,
banned content, the logo in a taller band above the picture, "Paid partnership" on screen for the first 3 seconds,
"#Ad" first and every required tag in each caption. Without a campaign every prompt and file is byte for byte as
before.

**Posting a campaign clip.** Confirm (and Try again) accept only the campaign's `uploadPlaces` (paid for, ready in
Clip Factory, not refused by CR as unlinked, TikTok only after its audit), public, never made for kids, TikTok with
Branded content (the owner's own tap). Each post gets `campaignId` (fixed forever) and the internal
`postOptions.campaign`. The publishers turn on paid partnership where the API has it (YouTube
`paidProductPlacementDetails`, X `paid_partnership`, TikTok `brand_content_toggle`; Meta has no field for this kind
of app, so the caption's `#Ad` and the words on the video carry it), and `campaign_caption` puts the disclosure and
every required item back into a caption the owner edited. No publisher has a delete or unpublish call.

**Sending** (new steps in `cf-prod-clip-flow`, [CONTRACTS.md §38.12](CONTRACTS.md#3812-submitting-a-new-step-chain-in-cf-prod-clip-flow-and-checking-folded-into-cf-prod-stats)).
CR takes a post only while it is less than 30 minutes live, so the cloud sends it the moment it is live and public:

```
ensure-posts → publish-{platform} … finish-{platform} → cr-send-{platform}      (a post with campaignId)
             → (each later post's chain) → cr-catchup-{platform}                  (while earlier ones still wait)
settle-clip  → [cr-wait-{n} (60 s, no compute) → cr-retry-{n}] n = 1…26           (while any still wait)
             → wait-48h → metrics → distil                                        (as before)
```

`submit.send` writes `CRSUB#{postId}` once (`sending`, with the `idempotency_key`, URL and CR campaign id frozen,
`deadline` = posted + 25 min, `sendBy` = posted + 30 min) and calls `create_my_submission`. Retryable answers
(the post not visible yet, CR busy, 5xx, a timeout that may still have gone through) are tried again with the same key
every minute until `deadline`; then the post goes `send_by_hand` (time is left until `sendBy`) or `missed`. A CR step
never fails the flow: any exception sets `send_by_hand` / `missed`, and `settle-clip`, the 48-hour metrics and the
vector step always run. A clip with no campaign post has exactly the old step names.

**When Clip Factory can't send** (not connected, the pilot has not granted the write scope, a campaign the owner said
he is in by hand, an error that isn't his, or the 25 minutes ran out): the owner gets a notification "Send this to
Content Rewards now (N min left)" that opens the clip with one "Copy and open" button. In the Mac app, which has no
Web Push, a green banner (`CrSendNow`) shows the same line on every page.

**Checking** (`contentrewards.poll.run_tick`, called by the `cf-prod-stats` tick after the platform poll, with at most
45 s; it never raises and one owner's failure never stops another). For each `CROWNERS` owner, in this order:
1. time only, no CR call: `send_by_hand` past `sendBy` → `missed`; a stuck `sending` → `send_by_hand`; proofs due →
   one notification each; the pilot reminder every 3 days (at most 5); a rules read older than 3 minutes → failed;
2. the daily keep-alive refresh and the 90-day warning;
3. membership (`list_my_campaigns` to the end): waiting campaigns every tick for 7 days, then every 6 hours to day
   30; joined ones every 6 hours. Newly in → "You're in!" (confetti once, a notification) and a rules read;
4. money: `get_my_balance`, then `list_my_payouts` paid rows newest first down to a watermark (the first read pages
   to the end across ticks and shows "Checking…" until done, with no celebration for old money), then the pending
   rows; `reversed` rows never count;
5. submissions due: `list_my_submissions` newest first, then `get_my_submission` for the rest; a post the owner sent
   by hand is found by its normalized link; status, flags, removal, views, the brand's note.
At most 25 CR calls per owner per tick. Check now on a campaign runs step 3 for it at once; the clip page's Check now
runs step 5 for that clip; money refresh invokes step 4 through `cf-prod-stats`.

**Live and notifications.** The broadcast filter gains `CAMPAIGN#`, `CRCONN`, `CRSUB#` and `CRMONEY`, each sent as one
`contentrewards` event (`partial: true`) after which the web refetches `GET /v1/contentrewards`; `CRSTATE#` and
`CROWNERS` never travel and internal attributes are stripped. `cf-prod-notify` takes `MODIFY` records of the same
four, under the owner's choice "Content Rewards news" (`notify.contentRewards`, on by default): you're in, send now
(high urgency, its TTL the seconds left), approved, not approved, proof, money, sign in again, the pilot reminder;
each once (`NOTIFIED#cr#{key}`).

**Money.** Only CR's own numbers (§25 extended): `get_my_balance` and `list_my_payouts`, in USD cents, formatted
only. "Paid" may stand only next to CR's paid payouts. A campaign's rate × views is a guess and is never shown or
added anywhere; CR money is never added into the MRR cards. Its paid payouts of the last 30 days are added in one
place only: the total of All your money ([flow 20](#20-content-rewards-the-fit-check-the-copy-and-all-your-money-contracts-39-adr-63)).

**Data** (additive only, [CONTRACTS.md §38.11](CONTRACTS.md#3811-data-additive-only-new-sort-keys-new-attributes-a-new-s3-prefix-new-runtime-secrets)):

| Item or place | Holds |
|---|---|
| `USER#{id}` / `CRCONN` | the connection: status, can send, linked accounts learned from CR's answers, ticked steps, the Finance answer, pilot reminders, the lease and the token's `VersionId` (internal) |
| `USER#{id}` / `CRSTATE#{nonce}` | one Connect in progress (TTL) |
| `USER#{id}` / `CAMPAIGN#{uuid}` | one campaign: CR's id and match, the public copy, the brief, pasted rules, the checked rules, membership, the logo state |
| `USER#{id}` / `CRSUB#{postId}` | one campaign post's send: the frozen key, URL and campaign, state, deadlines, CR's review, views, earned money, appeal and proof |
| `USER#{id}` / `CRMONEY` | balance, paid total and its watermark, pending, celebrations |
| `CROWNERS` / `USER#{id}` | the poller's list of owners |
| `JOB#`, `CLIP#`, `POST#`, `SETTINGS` | + `campaignId`, `campaignNote`, the internal `campaign` snapshot, `paidLabel`, `postOptions.campaign`, `notify.contentRewards` |
| media bucket `campaigns/{userId}/{uuid}/` | the logo (`logo-{rev}.{ext}`) and the brand's picture; the job's copy goes to `jobs/{jobId}/source/` |
| Secrets Manager `cf-prod/platforms/contentrewards/{app,token}` | the registration and the token, made at runtime, never in Terraform |

No table, index, Cognito pool, bucket or secret is replaced; removing a campaign or disconnecting deletes nothing on
CR or any platform.

### 20. Content Rewards: the fit check, the copy and all your money (CONTRACTS §39, ADR-63)

The owner's follow-up the same day: Connect in time order, a pleasant choice between campaign clips and normal clips,
all his money in one place, and knowing before an upload whether a clip can earn on a campaign
([CONTRACTS.md §39](CONTRACTS.md#39-content-rewards-the-two-ways-all-your-money-and-does-this-clip-fit-owner-request-2026-11-21),
[ADR-63](DECISIONS.md#adr-63-content-rewards-follow-ups-one-fit-check-in-the-api-a-new-copy-instead-of-turning-a-normal-clip-into-a-campaign-clip-one-30-day-total-that-includes-content-rewards)).
No new Lambda, table, index, bucket or secret: three routes under `/v1/contentrewards`, one under `/v1/money`, new
attributes and one api setting. It is part of **13** in the diagram.

**The two ways** live in the web. Home at `/` is frozen (no campaign field on the normal form, 5 taps to an upload,
held by click-count tests); the campaign way is Home at `/?campaign={uuid}`, reached only from a campaign (the
"Your campaigns" row chip, the card, a campaign video, the fit). The API helps with three public fields made in
`contentrewards/campaigns.py`: `CampaignSummary.nextStepKind` (the row chip says "Make campaign clips" when it is
`make_clips`), and `sourceRuleText` and `languageRuleText` (the rule lines under the link box). Every link to a setup
page carries the `?back=` of the page it came from (`gates.next_step`'s Connect button and the `not_connected` stop's
`fixHref` use `?back=/campaigns/{uuid}`); the web accepts only six exact same-origin shapes.

**The fit check** (`contentrewards/fit.py`). One pure function, computed every time it is asked from stored items only
(never Content Rewards, the public campaign JSON or the network), so it can never go stale and Confirm can trust it:

```mermaid
flowchart LR
  items[("stored items: CLIP#, JOB#, CAMPAIGN#, CRCONN, POST#, CRSUB#<br/>+ gates.stops and gates.upload_places")] --> fit["contentrewards/fit.py<br/>fit(clip, job, campaign, ...) → CampaignFit"]
  fit --> get["GET /v1/contentrewards/fit<br/>Review card, clip page (no-store)"]
  fit --> caps["POST /v1/contentrewards/fit/captions<br/>campaign_caption per platform"]
  fit --> gate["Confirm, Try again, Post now<br/>409 on a no, remake or todo item"]
  fit --> copy["POST /v1/contentrewards/campaigns/{id}/remake<br/>409 unless canRemake"]
  get --> web["web lib/crFit.ts<br/>re-checks tags, #Ad, the paid switch and the places while he types"]
```

A campaign clip (`clip.campaignId ?? job.campaignId`) is checked against its own campaign only; a normal clip against
every campaign he is in (`in` or `manual`), newest first, at most 10, and `ClipFit.suggestion` is the first one a copy
could fix with a `source` item that passed. Each rule is one item (`campaign`, `soft`, `deadline`, `length`,
`places`, `place_link`, `tags`, `ad`, `paid_switch`, `logo`, `on_screen`, `source`, `language`, `banned`, `spoken`,
`uncertain`, `brief_only`, `posted`, `one_campaign`, `send`) with a state (`ok`, `fix`, `remake`, `todo`, `no`,
`check`, `note`) and the server's own words. The verdict, in this order: any `no` → `doesnt_fit`; a wait item (a held,
paused or re-read campaign) → `wait`; a `remake`, `todo` or paid-switch `fix` → `fixable`; a `check` → `cant_tell`;
else `fits`. Tag and #Ad fixes never change it, since the publisher puts them back at upload. Only exact facts can say
no: a channel that doesn't match by name, an unknown language or a rule the reader couldn't pin down is "I couldn't
check", never a pass and never a block. The source and language checks read `job.source.channelKeys` and
`job.sourceLanguage`, which the agent writes; without them they say "I couldn't check". The web refetches the fit
(debounced 1 s) on a `contentrewards` event, a `clip` event of the clip or its copy, a `post` event of the clip and a
`setup` event; there is no new live type.

**The gate on posting.** For a clip with a campaign (and `CONTENT_REWARDS=on`), Confirm runs the fit with the merged
captions, the chosen places and the TikTok choices; any `no`, `remake` or `todo` item answers 409 `conflict` "This
clip can't earn on FaZe Clips: {its words}" (a wait item: "Not yet for FaZe Clips: {its words}"), and `_try_again`
(Try again and Post now) does the same. A clip without a campaign never calls the fit and posts byte for byte as
before. `release.release_waiting` (§33.6) no longer restarts a waiting campaign post when its account comes back: it
waits for Post now, which goes through the fit, so a campaign post never goes up days later after the campaign ended
or was held.

**The copy (remake).** A normal clip that could earn is never turned into a campaign clip in place (it has no logo and
no "Paid partnership" on the video); a new one-clip campaign job is made from the same moment:

```mermaid
sequenceDiagram
  autonumber
  participant O as Owner (Review)
  participant A as cf-prod-api
  participant DB as DynamoDB
  participant S3 as S3 cf-prod-media
  participant JF as cf-prod-job-flow
  participant AG as Agent
  O->>A: POST /v1/contentrewards/campaigns/{id}/remake {clipId, macFetch?, campaignAnyway?}
  A->>DB: fit.for_clip: canRemake, and every soft stop accepted
  A->>DB: reserve first: SET remakes.{campaignId} = {jobId, at} on the original CLIP# (conditional)
  A->>S3: HEAD the original's kept video (jobs/{jobId}/source/video.mp4, else the Mac upload)
  A->>DB: new JOB# like POST /v1/jobs (start_job): source, notes, one clip, campaignId, rules snapshot, logo copy, remakeOf, internal remake
  A-)JF: async invoke, alias live
  A-->>O: 202 {job} ("Making a FaZe Clips copy… It shows here in about 3 minutes.")
  JF->>AG: process_job: the one moment of job.remake, no analyze, watch or select
  AG->>DB: one CLIP# with campaignId and remakeOf {clipId, jobId}
  DB-->>O: live clip event: the copy shows right after its original on the same Review page
```

A second call answers 200 with the job already named, so a double tap makes one copy; a failed, canceled or deleted
job, or a declined copy, frees the reservation. A link job whose kept video is gone fetches the link again; a video file
answers 409 "This video is gone from Clip Factory. Make new clips for this campaign." The agent's side is in
[AGENT.md](AGENT.md#a-campaign-copy). The copy has its own switch, `CR_REMAKE` (Terraform `cr_remake_enabled`).
It shipped off and is **on** in prod since its switch PR #93 (21 Nov 2026). Turned off, the route answers 503 "Coming
soon." and `canRemake` is false, so no "could earn" line shows.

**All your money** (`GET /v1/money/everywhere`, `money/everywhere.py`, pure). One period for the whole card, the 30
days up to the Monthly card's `through` (today when no platform money is stored). It reads `MONEYSTATE#`,
`REVENUE#{platform}#` (YouTube, and Facebook once `moneyVerified`), the Accounts, `config/monetization.json` and, while
`CONTENT_REWARDS=on`, `CRCONN` and `CRMONEY`; it never calls a platform or Content Rewards. Platform rows sum their
reported days in the period; Content Rewards sums `CRMONEY.paidByDay` over the same days (CR's `usd` written `USD`,
cents to micros × 10,000: units, never a conversion). The total adds only reported rows, one per currency, biggest
first. TikTok, Instagram and X are `not_available` with the "Look in …" line made from the config's `paidWhere`.
`paidByDay` is filled by the money read of `cf-prod-stats` (§38.12 step 4) from the paid rows' `paid_at` day; for an
owner whose first read finished before §39, a one-time `dayScan` (at most 8 pages a tick, only rows at or older than
the watermark) fills it and never touches the paid total.

**Data** (additive only, [CONTRACTS.md §39.3](CONTRACTS.md#393-does-this-clip-fit-the-campaign-the-fit-check)):

| Item or place | New attributes |
|---|---|
| `JOB#{jobId}` | `remakeOf` (public), `remake` (internal), `sourceLanguage` (public, from Transcribe), `source.channelKeys` (public) |
| `CLIP#{clipId}` | `remakes` (public, campaign → {jobId, at}), `remakeOf` (public) |
| `CRMONEY` | `paidByDay`, `paidByDayDone`, `dayScan` (internal) |
| api env | `CR_REMAKE` from `cr_remake_enabled` (shipped `false`; default `true` since PR #93), an in-place change |

No sort key, index, table, bucket, secret or Lambda is added, and nothing that holds the owner's data is replaced.

## Failure handling

| What can fail | What happens |
|---|---|
| A pipeline step (download blocked, Transcribe error, render error) | The step is marked `failed` with a plain message, the job becomes `failed`, the agent sends `JobFailed` to the job-flow callback, the app shows **Try again**. |
| The picture cannot be fetched or prepared (no rendition that fits the disk, the download blocked or timed out, ffmpeg failed), or `CF_DEEP=off` | Logged (`picture.prep_failed`); the Watch step is `skipped` with "Could not watch the video this time. Picking from the words and the sound."; the job goes on as before the picture was watched. |
| Fable is throttled or refuses a request for its images | A throttled chunk is tried again after growing pauses and the calls in flight are halved, so a busy account slows the watching down instead of losing chunks (`deep.slow_down`); a request refused for its images or size is split into smaller ones and the accepted size is kept for the rest of the job (`bedrock.image_limit`). |
| Some or all Fable chunks still fail while watching (busy past six tries, a refusal, a bad answer, the deadline, the runaway guard) | Listed in `visual_log.failed`; Nova's events and the picture-change score still cover them. The step says "Watched most of the video (N of M parts)." only for parts neither model watched. |
| Nova 2 Lite is denied, missing or failing | That track stops at the first such answer; nothing else changes and the owner sees nothing. |
| Both watchers fail | The picture-change score still reaches the picker: "Saw where the picture moves fast. Picking with that, the words and the sound." |
| Transcribe refuses speaker labels | The job is started once more exactly as before; no `speakers.json`. |
| The second look fails for a moment, or `pickedFor` cannot be built | The moment is kept as picked; the clip card shows no "Why:" line. |
| One clip fails the checklist | One fix pass; if it still fails, a spare moment replaces it. The job finishes with the clips that pass. |
| The agent container dies, runs out of memory, freezes or the session ends | Heartbeats to the callback stop (or SIGTERM sends `AgentStopped`); after 6 minutes the job flow resumes the job on a new session from its saved moments and clips, as long as each attempt moves it forward (up to 6; two in a row without progress is "stuck"); then it marks it failed ("Making the clips stopped. Tap Try again to pick up where it left off."), and Try again picks up. Deploys wait for running jobs when the agent changes. No scan, no watchdog (CONTRACTS §30). |
| The job flow cannot start the agent | Step `start-agent` retries 3 times with backoff on throttling, 5xx and connection errors; then the execution fails and the `cf-prod-job-flow-durable-failed` alarm fires. |
| The API cannot start a flow | Job: `failed` with "Could not start. Press Try again." Clip: stays `publishState: pending`; the next Keep starts it again (same name, so never twice). |
| A job runs longer than 8 hours | The callback times out and the job fails with the same plain message; long sources are capped by `maxSourceHours`. |
| Bedrock throttling | The SDK retries with exponential backoff; the global profile spreads load across regions. |
| The owner cancels | The API sends `{action: cancel}` to the session and stops it; the agent marks the job `canceled` and sends `Canceled`, so the flow writes nothing. |
| Publishing a post fails | `publish-`, `check-` and `finish-{platform}` retry 3 times on retryable errors; then only that post is `failed` with the platform's friendly sentence ("YouTube says slow down…", "Your X credits ran out…"). If every queued post failed, the clip shows **Try again**. Raw platform messages go to the logs only. |
| A platform token is dead (revoked, expired, password changed) | The post fails with "Connect {Platform} again in Settings › Posting › Set up posting, then press Try again."; the account becomes `needs_reconnect`, the setup page shows a vermilion **Connect again**, and the stats poller skips that platform. |
| A platform takes too long to process a video | After `maxChecks` YouTube and TikTok posts are marked posted (the platform finishes alone); Instagram, Facebook and X fail with "{Platform} could not finish this video. Press Try again." |
| A step that cannot be repeated is interrupted (TikTok init, Instagram publish, X post) | The post fails with "We are not sure it posted. Look on {Platform} before you press Try again." instead of risking a double post. |
| Two refreshes of a rotating token at once (TikTok, X) | A 30-second lease on the account item lets one refresh; the other waits and re-reads the new secret. The new token is written before it is used. |
| The Connect callback fails | The owner lands on the platform's setup page with one plain sentence and the step to redo (`denied`, `expired`, `keys_wrong`, `redirect_wrong`, `missing_permissions`, `no_channel`, `no_accounts`, `no_pages`, `platform_down`, `error`). |
| X credits run out | The X gate turns to "Your X credits ran out. Buy more in console.x.com › Billing › Credits, then press Try again."; the app's own $10 monthly cap stops X earlier. |
| Reading metrics fails for a platform | That platform is skipped after 3 attempts; the others still count. The clip flow's `metrics` step uses the shared stats refresh and falls back to the stored numbers when a platform is blocked. |
| A platform limit is near or hit (stats) | The platform's `RATE#` budget gets `blockedUntil` (YouTube: 08:00 UTC; TikTok: 1 min; Meta: Meta's own wait, at least 60 min after a throttle; X: `x-rate-limit-reset` or the 1st of next month at the $10 cap). The poller skips it, its posts stay due, Refresh answers "Next check in …". A Meta throttle is never retried. |
| A stats read fails (5xx, network) | Retried twice (1 s, 4 s), except Meta throttles; then `statsError` holds a plain sentence on the post and it waits its normal interval. No tight loop, no raise. |
| The tick has more due posts than fit in 240 s | It stops starting requests at 240 s; the rest stay due and go first on the next tick. |
| Two ticks or a tick and a Refresh run at once | Budgets are conditional writes, so they cannot overspend together; a post read twice simply gets the newer numbers. |
| `cf-prod-learn` fails or is superseded | A newer save wins (the `revision` check); a failed invoke or model answer leaves "Could not learn this time. Change a pick to try again."; vector errors are logged and never stop the learning. |
| A skill file cannot be read (agent or Lambda) | Retried 3 times, then skipped and logged `skills.skipped`; the agent's `analyze` step says "1 skill could not be read". Reading the skill items themselves failing fails the step, and its normal retry runs. |
| The skills are too long for one call | Each is cut to 40,000 characters, all together to 120,000; a skill that does not fit is shortened or left out and named (`skills.block` log). Built-ins are never left out. |
| Bedrock refuses the prompt-cache point | Cache points are turned off for that process (`bedrock.cache_point_off`) and the call is retried without one. |
| Two screens save the same skill | The second save gets `409` ("This skill was changed somewhere else"); the app offers Use the newest or Save mine anyway. |
| Distil gets no usable answer (`max_tokens`, `refusal`, `content_filtered`) | Logged; no Learning is written; the vector is still updated. |
| S3 Vectors or Titan errors | Agent: the "What worked before" section is skipped. `/similar`: returns `[]`. Throw away: logged, the route still succeeds. |
| A durable execution fails or times out | Alarms `{fn}-durable-failed` and `{fn}-durable-timed-out` email the owner. A failed execution means a bug, because expected outcomes never raise. |
| A deploy happens during a 48-hour wait | The running execution stays on the version it started on; new executions use the new version. |
| The WebSocket drops (phone sleeps, network change, 2-hour cap) | The app reconnects with backoff 1–30 s, refetches what is on screen and polls while disconnected. No error is shown. |
| A WebSocket message cannot be delivered | `GoneException` deletes the stale connection; other errors are logged and skipped (the app refetches on reconnect). Connections also expire by TTL after 2 hours. |
| The broadcaster falls behind | Records older than 10 minutes are dropped (the app catches up on its next refetch); `cf-prod-broadcast-iterator-age` alarms when lag passes 5 minutes. |
| A webhook flood | REST per-method throttling (10/s, burst 20) answers `429`; the usage plan caps a month at 100 000 requests. |
| A presigned URL expires | URLs last 1 hour; the app refetches the clip or job and gets fresh ones. |
| Bad deploy | Revert the commit on `main`; the next deploy restores the previous state ([DEPLOYMENT.md](DEPLOYMENT.md#rollback)). |
| Data deleted by mistake | DynamoDB point-in-time recovery (35 days). |
| `version.json` cannot be read | The app shows no update bar and checks again in 5 minutes. It never blocks the app. |
| The new service worker is slow to activate | The reload bar creeps, and after 10 s the page reloads anyway. |
| `release-areas.sh` finds nothing usable | The label is "Improvements". The deploy never fails because of labels. |
| A desktop build fails | The `desktop` job fails on its own; the web deploy has already finished. The old files and `manifest.json` stay. |
| The help model is slow, failing or not yet subscribed | Timeouts (3 s connect, 10 s read, no retry) and a 24 s deadline end the call; the owner gets the composed answer. Ten failures in an hour raise `cf-prod-help-model-failures`. |
| The help model's answer is not grounded | Unknown action ids are dropped; an unknown bold button name, path or number sends back the composed answer (outcome `kb_ungrounded`). |
| The deployed help corpus cannot be fetched or is invalid | The last good copy stays in use, else the copy bundled in the zip. |
| The help API is unreachable or answers 5xx | The panel answers locally from the same corpus and shows "Copy the help code". |
| Too many help questions | `429` with `Retry-After`; the panel counts down and never retries by itself. |
| The help assistant must stop now | Kill switch `HELP` / `SWITCH` (60 s), no deploy ([DEPLOYMENT.md](DEPLOYMENT.md#ask-clip-factory-kill-switch)). |
| A download file is missing | `manifest.json` does not list it; Get the app falls back to the browser install. The next deploy rebuilds it. |
| Content Rewards is switched off, or the api is older than §38 | Every `/v1/contentrewards*` route answers 503 `unavailable` (an old api: 404). The web hides every Content Rewards card on 404 and says "Coming soon" on 503 `unavailable` only; the clip flow sends nothing. |
| Content Rewards is slow or down during a send (5xx, `service_unavailable`, a 504 that may still have gone through, the post not visible yet) | The same `idempotency_key` is sent again every minute (inside the step while there is time) until 25 minutes after posting, so a submit never runs twice; then the post goes `send_by_hand` with the minutes left, or `missed`. The flow itself never fails. |
| A Content Rewards step raises (a client bug, a Secrets error) | `submit.send` catches it: the post goes `send_by_hand` (`not_sent_by_app`) while there is time, else `missed`, logged at error. Each CR step is also wrapped like `distil`, so `settle-clip`, the 48-hour metrics and the vector step still run. |
| CR's pilot has not granted the write scope | `CRCONN read_only`: campaigns and money are read, every campaign post goes `send_by_hand` with a reminder, and the setup card offers the ready email; every 3 days (at most 5) a notification asks him to try Connect again. |
| The CR refresh token is dead (`invalid_grant`, 401), or 90 days have passed | `CRCONN needs_reconnect`: a card and a notification "Sign in to Content Rewards again on your Mac, so your clips keep getting sent."; sends go `send_by_hand` meanwhile. A daily keep-alive refresh keeps the 30-day unused limit from ending it. |
| Two Lambdas want to refresh the CR token at once | The `CRCONN` lease lets one refresh; the others wait up to 5 s and re-read the secret by its `VersionId`. A lost answer is retried once at once with the same refresh token; a Disconnect during a refresh throws the result away. |
| CR answers `permission_denied` to the connection itself | `CRCONN.blocked`, Check it says "Content Rewards stopped Clip Factory for now. You send clips yourself until it's fixed."; cleared by the next good call. |
| CR answers an unknown or "bug on our side" error | Logged at error; `send_feedback` to CR at most once per code per day (no personal data, URLs or tokens); the post goes `send_by_hand`. |
| Too many of the owner's clips wait for the brand | The campaign gets the hard stop `held` (Make clips and Upload refused with the sentence); the poller clears it when fewer are pending, or after 24 hours. |
| The rules read fails, or takes over 3 minutes | `rulesState: failed`, the hard stop "I couldn't read the rules. Tap Check now, or paste them below." |
| The public campaign JSON fails | The page's Open Graph line fills the name and pay; when both fail the add answers `platform_down`. A 404 means the campaign ended. |
| The CR campaign can't be matched for sure (two siblings with the same name) | `idMatch: ambiguous`: never sent automatically, the owner sends by hand with the reminder. |
| The desktop door can't open (every port of 47811–47815 busy) | The `no_port` card: "Clip Factory couldn't start the sign-in. Quit Clip Factory, open it again, then tap Connect Content Rewards." |
| The fit, its captions route or All your money answer 404 (an api before §39) or 503 (switched off) | The web hides the fit block, the "could earn" line and All your money; the old campaign strip stays and the normal way is untouched. |
| A campaign clip has a `no`, `remake` or `todo` fit item at Confirm, Try again or Post now | 409 `conflict` with the first such item's words (a wait item: "Not yet for FaZe Clips: …"); nothing is posted, and the card shows the same words with Upload off. |
| A campaign post waits for a platform to come back | It is not released by itself; it waits for Post now, which checks the fit again. |
| The copy is tapped twice, or two copies start at once | The conditional reservation on the original clip makes one job; the other call answers 200 with it. A failed, canceled or deleted copy job (or a declined copy) frees it for a new try; a job that can't be made removes its reservation at once. |
| The original's video is gone (past 14 days) | A link job fetches the link again; a video file answers 409 "This video is gone from Clip Factory. Make new clips for this campaign." |
| Content Rewards' paid money by day isn't read yet (an owner from before §39) | Its row of All your money says "Checking Content Rewards…" until the day scan ends; the paid total and the campaign money never change. |

## Cost notes

Rough, for one owner running about 10 jobs a month on 2-hour sources. Everything else is close to free tier.

| Item | Driver | Rough monthly |
|---|---|---|
| Bedrock, Claude Fable 5.1 | Moment selection reads the transcript; checklist, captions, vision and distil are small. Every call also carries the skills block (up to 120,000 characters); its prompt-cache point makes the repeats within a job much cheaper | the largest line; a few dollars per job, depending on source length and skills |
| Bedrock, Titan Text Embeddings V2 | A few thousand tokens per job | cents |
| Bedrock, the deep analysis ("Watch the video") | Fable watching the whole picture and the second look, Nova 2 Lite as second watcher; scales with source length. No cap (the owner's decision); see the per-job table in [ADR-40](DECISIONS.md#adr-40-watch-the-whole-video-before-picking) | about $41 per 2-hour source ($28–56; $45–72 if Bedrock holds Fable to 20 images a request): 10 × $41 ≈ $410 (an estimate until the first jobs' `bedrock.usage` logs) |
| Amazon Transcribe | $0.006 per audio minute ($0.0001 per second, AWS price list for eu-north-1; speaker labels cost nothing extra) | 10 × 120 min ≈ $7 |
| AgentCore Runtime | CPU and memory per second while a job runs (30–60 min) | a few dollars |
| Lambda durable functions | A handful of durable operations per job and per clip, small checkpoints, 14 days retention; no charge while waiting | cents |
| S3 Vectors | A few hundred vectors, a few queries per job | cents |
| API Gateway (HTTP, WebSocket, REST) | Requests, WebSocket messages and connection minutes while the app is open | under $1 |
| DynamoDB (incl. stream reads by Lambda), other Lambdas, SSM standard parameter | Requests | under $1 |
| EventBridge rule + `cf-prod-stats` | about 2,900 ticks a month (every 15 min), each a few seconds; post writes and 90-day `STAT#` snapshots | cents |
| YouTube, TikTok, Instagram, Facebook APIs | Free within their quotas; the budgets stay well under them | $0 |
| X API | Pay per use: $0.015 per post; about $0.005 per post read, a post read again on the same UTC day free, so about $0.15 per post over its 30 days | posts and reads together capped at $10 by the app ([DEPLOYMENT.md](DEPLOYMENT.md#x-api-credits-for-clip-numbers)) |
| AWS Secrets Manager | At most about 22 secrets ([ADR-34](DECISIONS.md#adr-34-oauth-with-a-signed-single-use-state-tokens-only-in-secrets-manager): the state key, the push key, an app and a token secret per platform, Instagram's and Facebook's short-lived pending choice, Content Rewards' app and token, the four badge keys, Ask's search key and the optional YouTube proxy) at $0.40 each, plus API calls (cached 5 minutes) | about $9 at most |
| `cf-prod-learn` | One small Fable 5.1 call per changed set of weekly picks | cents |
| Bedrock, Claude Haiku 5.5 (help) | Only questions that found a match: about 1 to 2.5k input and 150 to 400 output tokens each; capped at 2,000 answers per 30 days | cents at normal use; a few dollars at the cap |
| S3 | Clips kept; sources expire after 14 days | under $1 |
| CloudFront | Web app, config, `version.json` checks, desktop downloads (about 10 MB each) | under $1 |
| OpenSearch Serverless | not deployed (would have a standing minimum of OCUs) | $0 |
| GitHub Actions | macOS and Windows runners for the desktop app | free (public repository) |
| Content Rewards | `cf-prod-campaigns` (one small Lambda), one Bedrock call per campaign rules read (about $0.02), a few CR calls a tick (free), two more secrets | about $1 a month plus $0.02 a campaign read |

`maxSourceHours` (default 6) is the main cost lever: it limits how much audio is transcribed and read by Claude, and
how much picture the two models watch. There is no cost ceiling on a job (the owner's decision of 2026-11-17); the
only switch is `CF_DEEP=off` (Terraform `deep_analysis_enabled = false`), which turns the watching off entirely.

## Limits

- **YouTube may block cloud IP addresses.** Requests from AWS addresses are sometimes asked to "sign in to confirm
  you're not a bot". The agent sends a PO token from its bgutil sidecar and uses `default,mweb` clients; the Cut step
  makes one extraction for all clips and falls back to one full download cut locally (CONTRACTS §29, ADR-52). Ways
  out for the owner: fresh `cookies.txt` from a private window (Settings › YouTube help; stored privately at
  `private/<userId>/youtube-cookies.txt`, used only by yt-dlp), **Use a video file** on the failed job, or the
  optional proxy secret. The job error says which one to try.
- **Twitch and Kick** VODs can be subscriber-only or deleted after a while; those fail at the resolve step with a
  plain reason.
- **Very long streams** are processed up to `maxSourceHours` (1–12). A job must finish within the 8-hour callback
  timeout (the job flow's execution limit is 8 h 30 min).
- **Uploads** are limited to 5 GB per file.
- **The agent container** is 2 vCPU and 8 GB (AgentCore's default; the Terraform resource cannot change it), so the
  picture for watching is small (768×432, 2 fps), its download must leave 3 GB of disk free, and a tall, long upload
  is decoded at its keyframes only when a timed probe shows the full decode would not finish in time. The second, larger download per link (the small picture) raises the chance of
  YouTube's bot check; when it is blocked only the watching is skipped.
- **AgentCore sessions** have a maximum lifetime; a job that would exceed it should lower `maxSourceHours`.
- **Durable functions**: the clip flow can run for up to 3 days; execution history is kept for 14 days. Durable
  settings can only be set when a function is created, so changing them means a new function.
- **WebSocket**: connections close after 10 minutes idle (the app pings every 5) and after 2 hours (the app reconnects
  at 110 minutes); one message is at most 128 KB, and the broadcaster keeps events under 24 KB.
- **S3 Vectors**: the index settings (1024 dimensions, cosine, the four non-filterable keys) are fixed at creation; a
  change needs a new index. Filterable metadata stays under 2 KB per vector.
- **Model location**: Claude Fable 5.1 is reached only through the global profile from `eu-north-1`, so prompts may be
  processed outside the EU, and the account must be opted in to `aws_review` data retention
  ([DEPLOYMENT.md](DEPLOYMENT.md#4-bedrock-model-access-and-data-retention)).
- **Presigned URLs** last 1 hour.
- **One owner**: the data model supports more users, but sign-up is off.
- **Desktop builds are unsigned** ([ADR-19](DECISIONS.md#adr-19-unsigned-desktop-builds-for-now)): macOS and Windows
  warn on the first open; the Get the app card explains the one extra click.
- **The desktop app has the app address built in.** If `app_url` changes (for example a custom domain), the desktop
  files must be rebuilt: delete them from `downloads/` and the next deploy rebuilds them
  ([DEPLOYMENT.md](DEPLOYMENT.md#desktop-downloads)). Already installed copies keep opening the old address.
- **No iPhone download.** Apple allows no app files outside its store; iPhone and iPad use Add to Home Screen.
- **Numbers are not live to the second.** YouTube's `viewCount` is cached and can trail YouTube Studio by minutes;
  since 31 March 2025 Shorts views count every play and replay. YouTube Analytics lags 48–72 hours, Meta says its
  numbers can be up to 48 hours late, and Meta's `reach` and skip rate are estimates. Each app counts views its own
  way, which the page says next to the total.
- **TikTok numbers need TikTok's audit.** An unaudited app can post only privately, and private posts have no public
  id and no numbers.
- **X's private numbers last 30 days.** Impressions, link clicks and watch-through percentages (`non_public_metrics`)
  are only given for posts younger than 30 days; after that only public numbers are read.
- **Facebook metrics are changing.** Graph API v25.0 retires `post_impressions_unique`, `total_video_impressions*` and
  `total_video_views_unique` when v26.0 ships, so they are never read; reach comes from
  `post_total_media_view_unique`, guarded (absent if it errors). The Graph version lives in `config/platforms.json`.
- **Help knows the app, not the world.** Ask Clip Factory answers only from the corpus built from the app; anything
  else gets "I don't know that one yet." It never reads the owner's clips itself; numbers come from the browser.
- **Help model first use.** Haiku 5.5 is billed through AWS Marketplace; on an account that has never used it the
  first calls may fail, and a new output schema can take Bedrock about 90 s to compile once. Both fall back to the
  plain answer ([DEPLOYMENT.md](DEPLOYMENT.md#4-bedrock-model-access-and-data-retention)).
- **Snapshots last 90 days** (TTL); the latest totals stay on the post for as long as the clip exists.
- **Each platform's app belongs to the owner** ([ADR-33](DECISIONS.md#adr-33-posting-setup-bring-your-own-keys-with-a-guided-list-per-platform)),
  so the platforms' limits for new apps apply: TikTok posts stay "Only me" until TikTok approves the app and its
  posting audit (it may refuse a tool used by one person); Facebook Reels may stay visible only to the owner until the
  Meta app is Live (Meta may ask for App Review first; unconfirmed); YouTube's Google app must stay **In production**,
  and Google deletes OAuth clients unused for 6 months; X charges per post.
- **Clips kept before a platform was connected** are not posted automatically after Connect
  ([roadmap](ROADMAP.md#phase-2-social-integrations)).
- **Content Rewards' sign-in is an alpha and a pilot.** Until CR lets the owner's account in, there are two cases. If
  the sign-in works without `my_submissions:write` (`read_only`), Clip Factory reads campaigns and money and reminds
  him to send each clip himself. If CR refuses the sign-in (`not_allowed`), there is no `CRCONN` connection: nothing
  is read, membership is "Check it yourself" (he looks for **Submit clip** and pastes the rules), every clip is sent
  by hand, and Money says "Connect Content Rewards to see your campaign money." The API version is pinned
  (`2026-10-01`) and unknown fields are tolerated; what is still unverified until the first real Connect is in
  [CONTRACTS.md §38.21](CONTRACTS.md#3821-not-verified-live-each-is-checked-at-the-owners-first-connect-or-first-campaign-post).
- **Content Rewards Connect needs the Mac app** (CR only returns to `127.0.0.1`; the door is macOS only), and a sign-in
  again at least every 90 days. Joining or applying stays in the CR app (no tool for it), and the campaigns' reference
  files (logos, footage) are not in the API, so the owner adds the logo.
- **30 minutes to send.** CR takes a post only in its first 30 minutes live; Clip Factory stops trying at 25 and the
  reminder covers the rest. TikTok campaign clips wait for TikTok's audit (private posts can't earn); Instagram and
  Facebook carry the disclosure only in the caption and on the video; campaigns that want drafts first or the brand's
  own sound are refused.
- **A new app address breaks Connect.** The redirect URIs and website addresses pasted on the platforms contain the
  CloudFront and REST API hosts; after a custom domain or a rebuilt REST API, redo the "return address" steps (Check it
  reports `redirect_wrong`).
