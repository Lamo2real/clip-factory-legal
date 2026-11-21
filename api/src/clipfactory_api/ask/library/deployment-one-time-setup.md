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
