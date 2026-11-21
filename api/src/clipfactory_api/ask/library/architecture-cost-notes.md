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
