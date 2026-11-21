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
