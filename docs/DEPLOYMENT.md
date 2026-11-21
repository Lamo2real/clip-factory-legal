# Deployment

Production deploys from GitHub Actions on every push to `main`, through an IAM role that GitHub assumes with OIDC.
There are no AWS access keys anywhere. This page covers the one-time setup (including two account-level settings),
what a deploy does, the first sign-in, rolling back and tearing everything down.

**What is left for the owner.** Everything is in Terraform except four one-time steps: the OIDC deploy role
(section 2, or `infra/bootstrap`), the two GitHub settings (section 3), the Bedrock data-retention opt-in for Claude
Fable 5.1 (section 4) and, only if the account's API Gateway logging role is managed elsewhere, one Terraform
variable (section 5).

| Setting | Where | Required | Value |
|---|---|---|---|
| `CF_DEPLOY_ROLE_ARN` | GitHub → Settings → Secrets and variables → Actions → **Variables** | yes | ARN of the deploy role below |
| `CF_OWNER_EMAIL` | same page → **Secrets** | yes | The owner's email: the only login. A secret so it is masked in the logs of this public repository. |
| `CF_REGION` | Variables | no | Default `eu-north-1` |
| `CF_STATE_BUCKET` | Variables | no | Default `lamo-labs-state-bucket` (state key `clip-factory/prod/terraform.tfstate`). It must be in this AWS account: a bucket of that name in another account stops the deploy. |
| `CF_ROLE_BOUNDARY_ARN` | Variables | recommended | The `role_boundary_arn` output of `infra/bootstrap` (`arn:aws:iam::<ACCOUNT_ID>:policy/cf-prod-role-boundary`). Every `cf-prod-*` role then carries it, so the deploy role cannot give itself more access (section 2). |
| `CF_ALARM_EMAIL` | Secrets | no | Where alarm emails go. Default: `CF_OWNER_EMAIL`. Confirm the email AWS sends after the first deploy (see [Alarm emails](#alarm-emails)). |
| `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Secrets | no | The desktop updater signing key and its password ([desktop/README.md](../desktop/README.md#the-signing-key)). Without them the installers are built but installed apps are not updated. |

## One-time setup

### 1. GitHub OIDC identity provider (once per AWS account)

Skip this if the account already has `token.actions.githubusercontent.com` under IAM → Identity providers.

IAM console → Identity providers → Add provider → OpenID Connect:
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

Or with the AWS CLI, signed in to the target account:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

### 2. The deploy role

The quickest way is the Terraform in [`infra/bootstrap`](../infra/bootstrap/README.md), run once with your own
administrator credentials: it creates the OIDC provider (if missing) and the role, with the trust and permissions
below, and prints the ARN. To do it by hand instead, create a role named, for example, `cf-github-deploy` with this trust policy. Replace `<ACCOUNT_ID>`. Only workflows
running on `main` of `Lamo2real/clip-factory-legal` can assume it; pull requests and other branches cannot.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GitHubClipFactoryMainOnly",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Lamo2real/clip-factory-legal:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

If the deploy job uses a GitHub environment, GitHub sends `repo:Lamo2real/clip-factory-legal:environment:<name>`
as the subject instead; add that string to the `sub` list as well. If the organisation has customised its OIDC subject
format, the failing step's error ("Not authorized to perform sts:AssumeRoleWithWebIdentity") means the `sub` above
does not match; compare it with the format in the organisation's settings.

Set the role's **maximum session duration to 2 hours** (the first deploy builds the agent image inside the run).

**Permissions.** The role creates and updates everything in [ARCHITECTURE.md](ARCHITECTURE.md). Three choices, from
broadest to narrowest:

- `AdministratorAccess`, in line with the owner's convenience-first stance, since only `main` of this repository can
  assume the role.
- What `infra/bootstrap` sets up: `PowerUserAccess` (every service, no IAM) plus IAM limited to roles named
  `cf-prod-*`, and a permissions boundary `cf-prod-role-boundary` (everything except IAM, Organizations and account
  settings). The deploy role can create a `cf-prod-*` role, or give one more permissions (`CreateRole`,
  `PutRolePolicy`, `AttachRolePolicy`), only when that role carries the boundary, and it can never remove the
  boundary or change the boundary policy. Without that rule, IAM on `cf-prod-*` would be as good as administrator:
  create `cf-prod-x`, attach `AdministratorAccess`, assume it. Its `iam:PassRole` condition must list
  `lambda.amazonaws.com`, `bedrock-agentcore.amazonaws.com` and `apigateway.amazonaws.com` (the last one for the API
  Gateway logging role, section 5). `PowerUserAccess` already covers Secrets Manager, so the Connect state key
  (`cf-prod/oauth/state-key`) needs no change to `infra/bootstrap`. Put its `role_boundary_arn` output in the
  repository variable `CF_ROLE_BOUNDARY_ARN`: the deploy passes it to Terraform, which sets it on every `cf-prod-*`
  role.
- The policy below, which lists only what the stack uses. Create the boundary policy first (IAM → Policies → Create
  policy, name `cf-prod-role-boundary`), with this document:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "NoIamOrAccount", "Effect": "Allow", "NotAction": ["iam:*", "organizations:*", "account:*"], "Resource": "*" }
  ]
}
```

  Then the deploy role's policy. Replace `<ACCOUNT_ID>` and set `CF_ROLE_BOUNDARY_ARN` to
  `arn:aws:iam::<ACCOUNT_ID>:policy/cf-prod-role-boundary`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ServicesClipFactoryUses",
      "Effect": "Allow",
      "Action": [
        "s3:*", "cloudfront:*", "cognito-idp:*", "lambda:*", "dynamodb:*",
        "bedrock-agentcore:*", "bedrock:Get*", "bedrock:List*",
        "ecr:*", "logs:*", "cloudwatch:*", "sns:*", "xray:*", "acm:Describe*", "acm:List*",
        "ssm:DescribeParameters", "sts:GetCallerIdentity", "tag:GetResources"
      ],
      "Resource": "*"
    },
    {
      "Sid": "VectorBucketAndIndex",
      "Effect": "Allow",
      "Action": "s3vectors:*",
      "Resource": "arn:aws:s3vectors:*:<ACCOUNT_ID>:bucket/cf-prod-vectors-*"
    },
    {
      "Sid": "ApiGatewayHttpWebSocketRestAndAccount",
      "Effect": "Allow",
      "Action": "apigateway:*",
      "Resource": [
        "arn:aws:apigateway:*::/apis*", "arn:aws:apigateway:*::/restapis*",
        "arn:aws:apigateway:*::/usageplans*", "arn:aws:apigateway:*::/account",
        "arn:aws:apigateway:*::/tags*"
      ]
    },
    {
      "Sid": "StatsScheduleRule",
      "Effect": "Allow",
      "Action": [
        "events:PutRule", "events:DeleteRule", "events:DescribeRule", "events:EnableRule", "events:DisableRule",
        "events:PutTargets", "events:RemoveTargets", "events:ListTargetsByRule",
        "events:TagResource", "events:UntagResource", "events:ListTagsForResource"
      ],
      "Resource": "arn:aws:events:*:<ACCOUNT_ID>:rule/cf-prod-*"
    },
    {
      "Sid": "HooksVerifyTokenParameter",
      "Effect": "Allow",
      "Action": [
        "ssm:PutParameter", "ssm:GetParameter", "ssm:GetParameters", "ssm:DeleteParameter",
        "ssm:AddTagsToResource", "ssm:ListTagsForResource"
      ],
      "Resource": "arn:aws:ssm:*:<ACCOUNT_ID>:parameter/cf-prod/*"
    },
    {
      "Sid": "OAuthStateKeySecret",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:CreateSecret", "secretsmanager:PutSecretValue", "secretsmanager:DescribeSecret",
        "secretsmanager:GetSecretValue", "secretsmanager:DeleteSecret", "secretsmanager:TagResource",
        "secretsmanager:GetResourcePolicy"
      ],
      "Resource": "arn:aws:secretsmanager:*:<ACCOUNT_ID>:secret:cf-prod/oauth/*"
    },
    {
      "Sid": "OwnRolesOnly",
      "Effect": "Allow",
      "Action": [
        "iam:DeleteRole", "iam:GetRole", "iam:UpdateRole", "iam:TagRole", "iam:UntagRole",
        "iam:UpdateAssumeRolePolicy", "iam:GetRolePolicy", "iam:DeleteRolePolicy",
        "iam:ListRolePolicies", "iam:ListAttachedRolePolicies", "iam:DetachRolePolicy",
        "iam:ListInstanceProfilesForRole"
      ],
      "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/cf-prod-*"
    },
    {
      "Sid": "GrantOnlyWithinBoundary",
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:PutRolePolicy", "iam:AttachRolePolicy", "iam:PutRolePermissionsBoundary"],
      "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/cf-prod-*",
      "Condition": {
        "StringEquals": { "iam:PermissionsBoundary": "arn:aws:iam::<ACCOUNT_ID>:policy/cf-prod-role-boundary" }
      }
    },
    {
      "Sid": "KeepTheBoundary",
      "Effect": "Deny",
      "Action": "iam:DeleteRolePermissionsBoundary",
      "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/cf-prod-*"
    },
    {
      "Sid": "PassStackRoles",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/cf-prod-*",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": ["lambda.amazonaws.com", "bedrock-agentcore.amazonaws.com", "apigateway.amazonaws.com"]
        }
      }
    },
    {
      "Sid": "ServiceLinkedRoles",
      "Effect": "Allow",
      "Action": "iam:CreateServiceLinkedRole",
      "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/aws-service-role/*"
    }
  ]
}
```

What each group is for: S3 (web, media and state buckets), CloudFront (distribution, Origin Access Control,
invalidations), Cognito (user pool, client, the owner), Lambda (every function, including `cf-prod-campaigns` for Content Rewards; for the two durable ones also
`PublishVersion`, the `live` aliases, the event source mapping, and `ListDurableExecutionsByFunction` and
`StopDurableExecution`, which a destroy uses to stop running executions), DynamoDB (table, its stream:
`DescribeStream`, `ListStreams`), S3 Vectors (bucket `cf-prod-vectors-*` and its index), API Gateway (the HTTP,
WebSocket and REST APIs, the usage plan and the account-level logging setting), SSM (the webhook verify token under
`/cf-prod/`), Secrets Manager (only the Connect state key under `cf-prod/oauth/`; the platform keys and tokens under
`cf-prod/platforms/` are created by the app at runtime, never by the deploy role), AgentCore (runtime), Bedrock (read model and profile details), ECR (repository, image push), CloudWatch
Logs and alarms, X-Ray, SNS (alarm topic), IAM (the `cf-prod-*` roles, including `cf-prod-apigw-cloudwatch`, which is
passed to API Gateway), EventBridge (one rule, `cf-prod-stats`, the stats tick, with its Lambda target). SQS and
EventBridge Scheduler are no longer used.

Copy the role's ARN.

**Adding the boundary to a stack that is already deployed.** Roles created before the boundary existed do not carry
it yet, and the enforced rule would refuse to change them. Switch over once, in this order:

1. `cd infra/bootstrap && terraform apply -var enforce_role_boundary=false` (creates `cf-prod-role-boundary` and lets
   the deploy role set it, keeping the old rule for now).
2. Set the repository variable `CF_ROLE_BOUNDARY_ARN` to the `role_boundary_arn` output, then run the deploy
   (Actions → deploy → Run workflow). Terraform adds the boundary to every `cf-prod-*` role.
3. `terraform apply` in `infra/bootstrap` again (without the `-var`): from now on a role without the boundary cannot be
   given any permissions.

A fresh account needs none of this: run `infra/bootstrap` once and set `CF_ROLE_BOUNDARY_ARN` before the first deploy.
If the variable is missing, the deploy shows a notice; with the enforced rule, creating a role then fails with
"not authorized to perform: iam:CreateRole", and setting the variable fixes it.

### 3. GitHub settings

In `Lamo2real/clip-factory-legal` → Settings → Secrets and variables → Actions:
1. Variables → New repository variable: `CF_DEPLOY_ROLE_ARN` = the role ARN.
2. Secrets → New repository secret: `CF_OWNER_EMAIL` = your email.
3. Variables → New repository variable: `CF_ROLE_BOUNDARY_ARN` = the `role_boundary_arn` output of `infra/bootstrap`
   (recommended, section 2).
4. Optional: `CF_REGION`, `CF_STATE_BUCKET`, and the secret `CF_ALARM_EMAIL` if alarm emails should go somewhere
   other than `CF_OWNER_EMAIL`.

Until `CF_DEPLOY_ROLE_ARN` and `CF_OWNER_EMAIL` are set, the deploy workflow stops at its first step and says which
one is missing. CI keeps running on every push.

### 4. Bedrock model access and data retention

Two one-time steps per AWS account, both in `eu-north-1`:

1. **Anthropic use-case form.** Open the Bedrock console in `eu-north-1` → Model catalog, find Claude Fable 5.1 and
   submit the form if asked. Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`, used for the learning memory)
   needs no form; if the account still shows a Model access page, enable it there too.
2. **Data retention mode `aws_review`.** Claude Fable 5.1 is available only to accounts that allow AWS to keep prompts
   and answers for up to 30 days for human review by AWS (the content is not shared with Anthropic). It is a
   per-Region account setting with no console page yet. Signed in to the account (for example as an administrator):

   ```bash
   aws bedrock put-account-data-retention --mode aws_review --region eu-north-1
   aws bedrock get-account-data-retention --region eu-north-1     # shows "mode": "aws_review"
   ```

   If your AWS CLI does not know the command or the value yet, update the CLI first. An account already set to the
   older `provider_data_share` mode needs no change. Because Fable 5.1 is reached through the global cross-Region
   profile, retained data may be stored in the Region that served the request.

Without these, the agent's first model call (and the clip flow's `distil` step) fails with an access or
`ValidationException` error, and the job shows a plain failure.

**Amazon Nova 2 Lite** (`eu.amazon.nova-2-lite-v1:0`, the second watcher of the deep analysis,
[ADR-40](DECISIONS.md#adr-40-watch-the-whole-video-before-picking)) is an Amazon model and needs no form. If the
account still shows a Model access page, enable it there. It is optional at run time: when it is denied or missing,
the agent logs `nova.stopped`, the Watch step carries on with Claude alone and the job is not affected. Because the
deep analysis sends frames of the whole source to Claude Fable 5.1, the `aws_review` retention above now covers far
more picture data than the one facecam frame per clip it covered before.

**Switching the deep analysis off.** Set the Terraform variable `deep_analysis_enabled = false` on the agent module
(environment `CF_DEEP=off`) and deploy: no picture is downloaded and the Watch step is skipped, which is the pipeline
before ADR-40. There is no cost cap to configure; what a job is expected to cost is in ADR-40.

3. **Claude Haiku 5.5 for Ask Clip Factory (optional).** The help assistant calls Haiku 5.5 through the EU inference
   profile `eu.anthropic.claude-haiku-5-5` ([HELP_ASSISTANT.md](HELP_ASSISTANT.md)). Like Fable, it is billed through
   AWS Marketplace, and on an account that has never used it the first call can fail until the subscription exists.
   Open the Bedrock console in `eu-north-1` → Model catalog → Claude Haiku 5.5, submit the use-case form if asked, and
   send one message in the playground. Nothing breaks before you do this: Ask Clip Factory answers from search only
   (log outcome `kb_model_error`) until the model works. The first answer after a deploy that changed the answer
   schema can also fall back once while Bedrock compiles the schema (about 90 s, then cached for 24 hours).

### 5. API Gateway logging role (one per account and Region)

The REST API's execution and access logs and the WebSocket API's logs need API Gateway's account-level CloudWatch
role. Terraform creates `cf-prod-apigw-cloudwatch` (trusted by `apigateway.amazonaws.com`, policy
`AmazonAPIGatewayPushToCloudWatchLogs`) and sets it as the account's role in `eu-north-1`
(`aws_api_gateway_account`). There is only one such setting per account and Region:

- **Nothing else in the account uses it** (the usual case): leave `manage_api_gateway_account = true` (the default).
- **Another stack already manages it**: set `manage_api_gateway_account = false` (for example as `TF_VAR_` in the
  deploy workflow or in `prod.tfvars`). That account's existing role is then used and must already be set
  (API Gateway console → Settings → CloudWatch log role ARN).

Destroying this stack does not unset the account setting; it simply stops managing it.

### 6. After the first deploy: set up posting in the app

Nothing to do here. Each platform is set up by the owner inside the app, in **Settings › Posting › Set up posting**,
following the steps in [SETUP_POSTING.md](SETUP_POSTING.md). Every value a platform asks for (website, privacy and
terms pages, the exact redirect URI `{hooks_url}/oauth/{platform}/callback`) has a Copy button there, and the keys are
pasted into the app, which keeps them in Secrets Manager. Nothing goes into GitHub, Terraform or `config.json` except
the public `oauthCallbackBase`.

**Content Rewards** (paid campaigns) is set up the same way, inside the app: Settings › Posting › Set up posting ›
Content Rewards, with the last step in the Mac app ([SETUP_POSTING.md](SETUP_POSTING.md#content-rewards)). It is
switched on: it shipped off and the switch PR #88 turned it on once all its parts had merged
([Content Rewards](#content-rewards-contracts-38)).

What this deploy changes for posting: `cf-prod-hooks` runs up to **28 s** (the code exchange calls the platform),
`cf-prod-clip-flow` has **1024 MB** (chunked uploads), and Secrets Manager holds at most about **22 secrets** in all
(the state key, the push key, an app and a token secret per platform, Instagram's and Facebook's short-lived pending
choice, Content Rewards' app and token, the four badge keys, Ask's search key and the optional YouTube proxy) at
$0.40 each, so about $9 a month at most
([ARCHITECTURE.md](ARCHITECTURE.md#lambda-functions), [ADR-34](DECISIONS.md#adr-34-oauth-with-a-signed-single-use-state-tokens-only-in-secrets-manager)).

For webhooks (not built yet), a platform console would need:

| Setting | Value |
|---|---|
| Webhook URL | `{hooks_url}/hooks/{platform}` (Terraform output `hooks_url`) |
| Meta verify token | the SecureString `/cf-prod/hooks/verify-token` in Systems Manager → Parameter Store (eu-north-1) → Show decrypted value. Terraform generates it and never stores it in its state. |

## What a deploy does

Triggered by a push to `main` ([deploy.yml](../.github/workflows/deploy.yml)) or by hand (Actions → deploy → Run workflow).

1. **Test and build** in parallel: web tests and the production build; Python lint, types and tests; the Lambda
   package `api/dist/lambda.zip`.
2. **Assume the role** through OIDC.
3. **State bucket**: [scripts/ensure-state-bucket.sh](../scripts/ensure-state-bucket.sh) creates the Terraform state
   bucket if it does not exist (versioned, encrypted, private). Every call checks that the bucket belongs to this
   AWS account (`--expected-bucket-owner`): if a bucket of that name belongs to someone else, the deploy stops and
   says to pick another `CF_STATE_BUCKET`, so the state (which holds secrets) is never written to someone else's
   bucket.
4. **Agent image**: [scripts/push-image.sh](../scripts/push-image.sh) builds the ARM64 image and pushes it to ECR,
   tagged with a hash of the agent's sources, so unchanged code is not rebuilt.
5. **Terraform** `init` (S3 backend with lockfile), `plan`, then `apply` of exactly that plan. No manual approval
   (the owner's choice).
   Between the delete gate and the apply, `scripts/wait-for-jobs.sh` (the drain, CONTRACTS §30.7) waits for jobs
   being made when the plan changes anything under `module.agent`: up to 25 minutes (a failed Scan is tried three times, then it goes on), counting `queued`/`running` jobs
   with a fresh heartbeat (counts only in the log, read only). A job still running after that resumes on the new
   agent version by itself.
   The apply creates or updates every resource, including the three API Gateway APIs (REST first, then WebSocket,
   because API Gateway allows one deployment every 5 seconds per account), every Lambda (with `cf-prod-campaigns`, [Content Rewards](#content-rewards-contracts-38)); the two durable ones
   publish a new version and move their `live` alias, and running executions stay on their old version), the stream
   trigger, the EventBridge rule `cf-prod-stats` (every 15 minutes, read from `config/platforms.json`), the vector
   bucket and index, the SSM parameter, the Connect state-key secret and the alarms (including `cf-prod-help-model-failures` and its log metric
   filter), and the AgentCore runtime's log group `/aws/bedrock-agentcore/runtimes/<runtime id>-DEFAULT` with 30-day
   retention like every other log group (created if the service has not made it yet). `cf-prod-api` gets the `HELP_*` settings (`HELP_ENABLED = "true"`, the EU Haiku profile from
   `config/models.json`, the cap and rate limits) and permission to call only that model. No extra deploy job is needed for them:
   they all come from the same Lambda zip and the same `terraform apply`.
6. **Web**: [scripts/write-web-config.sh](../scripts/write-web-config.sh) writes `config.json` from the Terraform
   outputs, including `wsUrl` from `ws_url` and `oauthCallbackBase` from `oauth_callback_base` (both required; the
   script stops if one is missing); the build is synced to the web bucket (the sync never deletes TikTok's
   `tiktok*.txt` verification files, which the app uploads) and CloudFront is invalidated. The build includes the help
   corpus as `/assets/help-corpus.<hash>.json` and names it in `index.html`; `cf-prod-api` picks up the new corpus
   within 10 minutes (the Lambda zip carries the same file as its fallback).
7. **What's new**: `scripts/release-areas.sh <prev-sha> <new-sha>` turns the commits since the live version into up to
   three area labels ([how to write them](GIT_WORKFLOW.md#area-lines-what-the-update-bar-says)), and the deploy writes
   `/version.json` last, never cached. Open apps show the update bar within 5 minutes
   ([ARCHITECTURE.md flow 11](ARCHITECTURE.md#11-updates-versionjson-release-areas-and-the-update-bar)).
8. **Smoke test**: `GET /v1/health` must answer `{ "ok": true }`.
9. **Desktop app** (jobs `desktop` and `desktop-upload`, only when needed): see [Desktop downloads](#desktop-downloads).

The run summary shows `app_url`. The first deploy into an empty account takes about 15–20 minutes (CloudFront and
the AgentCore runtime are the slow parts); later deploys take a few minutes. A deploy that rebuilds the desktop app
adds about 10–15 minutes on the macOS and Windows runners, in parallel, after the web is already live.

## Desktop downloads

The Mac `.dmg` and Windows `.exe` offered by **Get the app** are built by the `desktop` job in
[deploy.yml](../.github/workflows/deploy.yml) ([CONTRACTS.md §12.3](CONTRACTS.md#123-desktop-wrapper-desktop-tauri-v2),
[ARCHITECTURE.md flow 12](ARCHITECTURE.md#12-get-the-app-and-the-desktop-wrapper)).

| | Mac | Windows |
|---|---|---|
| Runner | `macos-latest` | `windows-latest` |
| Build | Tauri v2, target `universal-apple-darwin` (Apple silicon and Intel in one file) | Tauri v2, NSIS installer (installs for the current user, no admin prompt; fetches WebView2 if the PC lacks it) |
| File in the web bucket | `downloads/Clip-Factory.dmg` | `downloads/Clip-Factory-Setup.exe` |
| Signed | No (see below) | No (see below) |

**When it runs.** After the web deploy, only if one of these is true; otherwise the job is skipped in seconds:
- something under `desktop/` changed,
- the app icon changed,
- a download is missing from `downloads/` in the web bucket (for example the first deploy),
- the signing key is set and an update bundle is missing, and the installer there was built without the key (the
  first deploy with the updater, or the first after the secrets were set).

Then both apps are built, as version `1.<run number>.0`. Each installer records `updater=true|false` (whether the
key was used) next to its `source-hash`. When an installer was built with the key but its signed bundle is missing,
the build and `desktop-plan` show an error annotation instead of rebuilding on every deploy (which would give every
installed app a new version with nothing changed); the next change under `desktop/` tries again. A missing key is
an error annotation on every deploy too; neither fails the run.

The app address is read from the Terraform output `app_url` and built into the app. The build job has no OIDC token
(npm, cargo and the Tauri CLI run there, and none of them may be able to assume the deploy role); it hands the
installer to the small `desktop-upload` job, which assumes the role and copies it to the bucket. Then
`desktop-manifest` rewrites `downloads/manifest.json`
(`{ "version", "files": { "mac": { "path", "size" }, "windows": { "path", "size" } } }`) with no caching and
invalidates `/downloads/*` in CloudFront, so nobody gets an old file under the same name.

**Updates for installed apps** ([CONTRACTS.md §12.6](CONTRACTS.md), [ADR-46](DECISIONS.md)). The build also makes a
bundle signed with the `TAURI_SIGNING_PRIVATE_KEY` secret (given to the build step only). `desktop-upload` stores it
under `downloads/updates/<version>/` and writes `downloads/updates/<mac|windows>.json`; `desktop-manifest` then writes
`downloads/latest.json`, which every installed app reads at start and every 6 hours. The run summary says which
version installed apps update to.

**Forcing a rebuild** (for example after a custom domain changes `app_url`): delete the two files from `downloads/` in the
web bucket, then run the deploy by hand (Actions → deploy → Run workflow). Until it finishes, Get the app offers the
browser install, never a broken link.

**If the desktop job fails**, the web app is already live; the previous downloads and manifest stay. Fix and push again.

### Unsigned builds and the first open

There are no Apple or Microsoft code-signing certificates yet ([ADR-19](DECISIONS.md#adr-19-unsigned-desktop-builds-for-now)),
so both systems warn once. The Get the app card shows the hint; these are the full steps:

| System | What you see | What to do (only the first time) |
|---|---|---|
| macOS 14 and earlier | "Clip Factory can't be opened because Apple cannot check it for malicious software." | Drag the app to Applications, then right-click (or Control-click) it → **Open** → **Open**. |
| macOS 15 and later | "Apple could not verify Clip Factory is free of malware." | Press **Done**. Open **System Settings → Privacy & Security**, scroll down, press **Open Anyway** next to Clip Factory, confirm with your password. |
| Windows 10 and 11 | "Windows protected your PC" (SmartScreen) | Press **More info** → **Run anyway**. Some browsers also ask to **Keep** the download first. |

After the first open the app starts normally. Signing and notarization are on the [roadmap](ROADMAP.md#later).

### Release labels ("Area:" lines)

The update bar says in a word or three what changed, for example `Settings · Profile picture`. Those words come from
lines like this at the end of a commit message:

```
feat: let the owner pick a profile picture

Area: Settings
Area: Profile picture
```

Rules, examples and the squash-merge detail are in [GIT_WORKFLOW.md](GIT_WORKFLOW.md#area-lines-what-the-update-bar-says).
Without `Area:` lines the labels come from the changed folders (`web/areas.json`), and failing that the bar says
"Improvements".

## Clip numbers and their limits

The stats poller ([ARCHITECTURE.md flow 13](ARCHITECTURE.md#13-clip-numbers-the-poller-and-refresh-numbers)) is
deployed by the same `terraform apply`: the Lambda `cf-prod-stats`, the Lambda `cf-prod-learn` and the EventBridge rule
`cf-prod-stats`. Its rate comes from [`config/platforms.json`](../config/platforms.json): the smallest
`minIntervalMinutes` (15) becomes `rate(15 minutes)`. To change an interval, a batch size or a budget, edit that one
file and push; Terraform and the code both read it ([ADR-29](DECISIONS.md#adr-29-stats-refresh-intervals-per-platform)).
With no account connected, no platform is called. A platform's numbers start once it is connected in Set up posting;
the scopes the setup asks for (listed in `config/platforms.json`, for example YouTube `youtube.readonly` and
`yt-analytics.readonly`, Instagram `instagram_manage_insights`, Facebook `read_insights`, X `tweet.read`) cover both
posting and numbers.

To pause automatic refreshing (for example while testing a platform app), disable the rule in the EventBridge console
(eu-north-1 → Rules → `cf-prod-stats` → Disable). The next deploy turns it back on. The Refresh button keeps working.

### X API credits for clip numbers

X has no free tier: posts and reads are **pay per use** ($0.015 per post, about $0.005 per post read;
the same post read again on the same UTC day is not charged again, which X calls a soft guarantee). What X needs is
part of the X setup ([SETUP_POSTING.md](SETUP_POSTING.md#x)):

1. An app in the X Developer Console (console.x.com) with OAuth 2.0 (PKCE), **Read and write**, the exact redirect URI,
   and the scopes `tweet.read`, `users.read`, `tweet.write`, `media.write`, `offline.access`.
2. **Credits** on that account (the setup says to buy the smallest amount, set a $10 spending limit and leave
   auto-recharge off). A clip posted and refreshed for its 30 days costs about $0.17 on X; ten clips a week stays near
   $7 a month.
3. The app's own guard: it counts the spend before every post and every read and stops X at **$10 a month**
   (`x.budget.monthlyUsd` in `config/platforms.json`); a post over the cap fails with "Clip Factory stopped X at your
   $10 limit this month." To change the cap, change that value (and the matching shared constant in the web app) and
   push. The X console's spending limit stays as a second fence.

## Ask Clip Factory kill switch

The help assistant is on in prod (`HELP_ENABLED = "true"`). To change it without a deploy, write the switch item
(signed in to the account, `eu-north-1`); `cf-prod-api` reads it at most every 60 seconds:

```bash
# Off: the launcher disappears and nothing answers (open apps notice within 5 minutes)
aws dynamodb put-item --table-name cf-prod-data --region eu-north-1 \
  --item '{"pk":{"S":"HELP"},"sk":{"S":"SWITCH"},"enabled":{"BOOL":false},"model":{"BOOL":true}}'

# On, but without the model (answers from search only)
aws dynamodb put-item --table-name cf-prod-data --region eu-north-1 \
  --item '{"pk":{"S":"HELP"},"sk":{"S":"SWITCH"},"enabled":{"BOOL":true},"model":{"BOOL":false}}'

# Back to normal
aws dynamodb delete-item --table-name cf-prod-data --region eu-north-1 \
  --key '{"pk":{"S":"HELP"},"sk":{"S":"SWITCH"}}'
```

Terraform does not manage this item. To turn help off for good, set the Terraform variable `help_enabled = false`
(for example `TF_VAR_help_enabled: "false"` in the `terraform plan` step of the deploy workflow) and deploy. The model
answers are capped at 2,000 per 30 days (`HELP_MONTHLY_CAP`, Terraform variable `help_monthly_cap`, a whole number);
past the cap help keeps answering from search.

## Ask as a full assistant (CONTRACTS §28)

`cf-prod-ask` deploys with everything else (`ask_enabled = true` in prod). Two owner steps, both only once:

1. **Bedrock model access (only if Bedrock asks for it).** Open the Bedrock console in **Stockholm (eu-north-1)** →
   **Model catalog** → **Claude Opus 5.5** → submit the Anthropic use-case form if asked → send one message in the
   playground (that first call also makes the Marketplace subscription, §4). Do the same for **Claude Opus 4.8**, the
   fallback. If the account still shows a **Model access** page, enable both there too. Until then
   answers fail with an access error (`ask_model_error`, alarm `cf-prod-ask-model-failures`) and Ask gives the plain
   §19 answers.
2. **Web search.** In the app: **Settings › App & account › Ask** → **Get a search key** (Brave Search API) → make a
   free account and pick the **Search** plan ($5 of free credit a month, about 1,000 searches) → copy the key →
   paste it → **Save key**. The app stores it in Secrets Manager as `cf-prod/ask/search-key`; Terraform never does.
   Until then Ask says "I can't search the web yet." and answers from what it knows.

The kill switch item gains three attributes (absent = on):

```bash
# The assistant off: the panel answers with the §19 path again
aws dynamodb put-item --table-name cf-prod-data --region eu-north-1 \
  --item '{"pk":{"S":"HELP"},"sk":{"S":"SWITCH"},"assistant":{"BOOL":false}}'

# The assistant on, but no web search and no files
aws dynamodb put-item --table-name cf-prod-data --region eu-north-1 \
  --item '{"pk":{"S":"HELP"},"sk":{"S":"SWITCH"},"web":{"BOOL":false},"files":{"BOOL":false}}'
```

**Alarm `cf-prod-ask-model-failures`**: 10 or more model errors or timeouts in an hour (step 1 above is the usual
cause). **Alarm `cf-prod-ask-tokens-day`**: more than 20M new input tokens in a day (`ask_tokens_alarm_threshold`); it
blocks nothing. If either keeps firing, turn the assistant off with the first command.

After the first deploy, check once (CI's deploy role, never a local deploy): one question in the app with a picture, a
PDF and "#search"-style words, and see the `help.ask` line in `/aws/lambda/cf-prod-ask` say `ask_ok`. If it says
`ask_model_error` with status 400 on every answer, set `ASK_EAGER_TOOLS=false` (Terraform variable `ask_eager_tools = false`,
for example `TF_VAR_ask_eager_tools: "false"` in the deploy workflow's plan step) and deploy.

**Every deploy checks Ask with the real model** (ADR-53): the smoke job invokes `cf-prod-ask` with `{"smoke":"ask"}`,
and the deployed model must say "red" for a tiny red picture. If the job warns **Ask model access**, do step 1 above
(Model catalog → Claude Opus 5.5 → use-case form if asked → one message in the playground); the next deploy checks
again. **Ask model id not found** means `ASK_MODEL_ID` names a model or inference profile Bedrock does not have in
eu-north-1. Those two only warn, so an unrelated merge never goes red for them; any other failure (the model did not
see the picture) fails the deploy. The reason is in `/aws/lambda/cf-prod-ask`, event `ask.smoke`.

### Alarm emails

Every alarm (Lambda errors, failed or timed-out durable executions, live-update lag, webhook 5xx, help model
failures; [CONTRACTS.md §14.9](CONTRACTS.md)) goes to the SNS topic `cf-prod-alarms`, which emails `CF_ALARM_EMAIL`,
or `CF_OWNER_EMAIL` when that secret is not set. After the first deploy (and after changing the address) AWS sends
an email titled "AWS Notification - Subscription Confirmation" from `no-reply@sns.amazonaws.com`: press
**Confirm subscription** in it (check spam). Until then no alarm email arrives. To check, open SNS in the console
(eu-north-1) → Topics → `cf-prod-alarms`: the subscription must say Confirmed, not Pending confirmation.

**Alarm `cf-prod-help-model-failures`** (10 or more `kb_model_error` or `kb_model_timeout` answers in an hour) means
the Haiku calls are failing. The owner still gets plain answers. The usual cause on a new account is the Marketplace
first-call step: open Claude Haiku 5.5 once in the Bedrock console playground in `eu-north-1`
([step 4](#4-bedrock-model-access-and-data-retention)). If it keeps firing, turn the model off with the second command
above until it is fixed.

## Content Rewards (CONTRACTS §38)

Paid clipping campaigns on Content Rewards ([CONTRACTS.md §38](CONTRACTS.md#38-content-rewards-campaigns-owner-request-2026-11-21),
[ADR-62](DECISIONS.md#adr-62-content-rewards-the-official-sign-in-through-the-desktop-apps-loopback-door-sending-from-the-cloud-a-reminder-when-it-cant),
the owner's steps in [SETUP_POSTING.md](SETUP_POSTING.md#content-rewards)). Nothing to set up in AWS or GitHub by
hand: the owner connects inside the Mac app, and the app makes its own secrets.

**Switched on (PR #88).** `infra/envs/prod` has `variable "content_rewards_enabled"` (bool, **default `true`**). It
sets `CONTENT_REWARDS` on `cf-prod-api`, `cf-prod-stats`, `cf-prod-clip-flow` and `cf-prod-campaigns`. It shipped
with default `false` while the parts were built in parallel (CONTRACTS §38.19: api, posting, agent, web, desktop,
docs), each merging in any order and passing CI alone. Off (`CONTENT_REWARDS = "off"`), every `/v1/contentrewards*`
route answers 503 `unavailable` ("Content Rewards is not switched on for this app yet."), the clip flow sends nothing,
the stats tick skips Content Rewards and the web app shows "Coming soon" on the Set up posting card.

**The switch PR.** After all six parts had merged, one last pull request (#88, builder A's line, 21 Nov 2026)
changed the default to `true`; its deploy set `CONTENT_REWARDS = "on"` everywhere, and that was the only change it
made. So no campaign clip could go out before the paid-partnership and caption code and the logo and on-screen
disclosure were in. To turn it off again, set the default back to `false` (revert that one line); no owner data is
touched either way.

**Make a campaign copy (CONTRACTS §39.3).** Its own switch, `variable "cr_remake_enabled"` (bool, **default
`true`**), sets `CR_REMAKE` on `cf-prod-api`, an in-place env change. It shipped `false` (the copy route answered 503
"Coming soon." and no fit offered a copy); its switch PR #93 set it to `true` once G, H and I of §39.4 had merged.
Turn it off the same way.

**What the first deploy with §38 adds** (additive only, the plan in the deploy log shows it):
- one new Lambda `cf-prod-campaigns` (the one zip, 512 MB, 120 s, async only, retries 0), its log group (same
  retention), its `cf-prod-*` role and policy (DynamoDB `GetItem`, `PutItem`, `UpdateItem`, `Query`; `s3:GetObject`,
  `PutObject`, `DeleteObject` on `campaigns/*` only; the clip agent's model; X-Ray; **no Secrets Manager action**), and
  its place in the error and failed-invocation alarms;
- in place: new env vars (`CONTENT_REWARDS`, `CAMPAIGNS_FUNCTION_ARN`) and IAM on `cf-prod-api` and `cf-prod-stats`
  (invoke `cf-prod-campaigns`; the api also `campaigns/*` in the media bucket), `CONTENT_REWARDS` on the clip flow,
  and two widened stream filters (live updates and notifications gain `CAMPAIGN#`, `CRCONN`, `CRSUB#`, `CRMONEY`;
  notifications stay `MODIFY` only);
- no new schedule (Content Rewards checking rides the `cf-prod-stats` tick), no new output, nothing on the agent.

**The deploy role needs nothing new.** `cf-prod-campaigns` is one more Lambda, log group and `cf-prod-*` role with
the permissions boundary, all covered by the role's existing `lambda:*`, `logs:*`, `cloudwatch:*`, `xray:*`, the
`cf-prod-*` IAM statements and `iam:PassRole` to `lambda.amazonaws.com` (or `PowerUserAccess` in `infra/bootstrap`).
No change to `infra/bootstrap`. The Content Rewards secrets are **never** made by Terraform or the deploy role.

**Owner data.** Nothing that holds the owner's data is replaced or destroyed: no table, index, Cognito pool, bucket
or secret. The new items are new sort keys (`CRCONN`, `CRSTATE#`, `CAMPAIGN#`, `CRSUB#`, `CRMONEY`, `CROWNERS`) and new
attributes on jobs, clips, posts and settings; the media bucket gains the prefix `campaigns/`; the two secrets
`cf-prod/platforms/contentrewards/app` and `…/token` are created by `cf-prod-api` at runtime under the existing
prefix. The deploy's delete gate still prints "Delete gate: the plan deletes or replaces nothing that holds the
owner's data." If it ever says otherwise for this change, stop and fix the plan. Never deploy from a local AWS CLI:
only `deploy.yml` deploys.

**The desktop app.** The sign-in door ships in the next signed desktop release; the owner taps "Restart now" once.
An older app shows "Update the Clip Factory app first" on the Connect step.

**Cost.** One more small Lambda, a few Content Rewards calls a tick, one model call per campaign rules read (about
$0.02), and two more secrets ($0.80 a month).

## First sign-in

1. On the first deploy, Cognito emails `CF_OWNER_EMAIL` a temporary password (from `no-reply@verificationemail.com`;
   check spam).
2. Open `app_url` (the `https://dxxxx.cloudfront.net` address from the run summary).
3. Sign in with your email and the temporary password, then choose your own password.
4. Install the app: press **Get the app** in the sidebar (on a phone: Settings › App & account › Get the app, or the banner on Home). It offers the
   `.dmg` on a Mac, the `.exe` on Windows, the install button on Android and the Add to Home Screen steps on iPhone.

The temporary password is valid for 7 days. If it expires, an AWS admin can reset it: Cognito console → user pool
`cf-prod-users` → Users → your email → Reset password.

You stay signed in as long as you open the app at least once every 30 days ([SECURITY.md](SECURITY.md)).

## Rollback

- **Code**: revert the bad commit on `main` (`git revert <sha>` in a branch, pull request, automatic merge). The next
  deploy rebuilds and applies the previous state. The agent image tag is a hash of its sources, so the old image is
  reused if it is still in ECR.
- **Infrastructure state**: the state bucket is versioned; an older state version can be restored if a run is
  interrupted. Prefer fixing forward with a new commit.
- **Data**: DynamoDB point-in-time recovery restores the table to any second in the last 35 days (into a new table).
  Clips in S3 are not versioned; declined clips are deleted on purpose. The learning memory can be rebuilt from the
  Clip items (the clip flow embeds a clip again when its vector is missing).
- **Durable flows**: a rollback moves the `live` alias back; executions already running finish on the version they
  started on.

## Destroying everything

Run from a machine with credentials for the account (for example by assuming the deploy role), in `infra/envs/prod`:

```bash
terraform init -backend-config="bucket=<state bucket>" -backend-config="key=clip-factory/prod/terraform.tfstate" \
  -backend-config="region=eu-north-1" -backend-config="use_lockfile=true"
terraform destroy -var "owner_email=<email>" -var "agent_image_tag=<any>"
```

Empty the media and web buckets first if the destroy stops on "bucket not empty", and delete the ECR images if the
repository refuses to go. The vector bucket has `force_destroy = false`: Terraform deletes the `clips` index first,
then the bucket. Deleting the two durable functions stops their running executions first and can take up to an hour
(Terraform waits up to 60 minutes). The API Gateway account logging setting stays as it was. The Terraform state bucket, the OIDC provider, the deploy role and its `cf-prod-role-boundary`
policy are not managed by this Terraform; delete them by hand (or `terraform destroy` in `infra/bootstrap`) if you no
longer need them. The agent's log group `/aws/bedrock-agentcore/runtimes/...-DEFAULT` stays too (it expires its
logs after 30 days); delete it in the CloudWatch console if you want it gone. GitHub Pages and the legal pages are not affected.
The platform secrets under `cf-prod/platforms/` are created by the app, not by Terraform: press **Disconnect** on each
platform first (which also revokes the tokens; Content Rewards too: its Disconnect deletes only the token secret, so
also delete `cf-prod/platforms/contentrewards/app` in the Secrets Manager console, then remove Clip Factory under
**Connected apps** on Content Rewards), or delete them in the Secrets Manager console (eu-north-1). Remove the
developer apps on the platforms' websites too if you no longer need them.
