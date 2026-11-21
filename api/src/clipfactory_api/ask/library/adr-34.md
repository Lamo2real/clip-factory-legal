## ADR-34 OAuth with a signed single-use state, tokens only in Secrets Manager

- **Context.** Connect sends the owner to the platform and back to the public REST API (`GET
  /oauth/{platform}/callback`). That endpoint cannot see the owner's Cognito token, must not be usable as an open
  redirect, and must not let a replayed or forged callback attach someone else's account. The owner's app keys and the
  account tokens are the most sensitive data the system has.
- **Decision.** `POST /v1/accounts/{platform}/connect` (JWT) builds the authorize URL with `state = v1.{nonce}.{exp}.{HMAC}`
  (HMAC-SHA256 with the key in `cf-prod/oauth/state-key`, 10 minutes, bound to the platform) and stores
  `OAUTH#{nonce}`; the callback checks the signature in constant time and consumes the item with a conditional delete,
  so a state works once. PKCE (S256) is added where the platform supports it for web clients (YouTube, X); its
  verifier is derived from the nonce with the same key, so it is never stored. The callback exchanges the code server
  side with the exact stored redirect URI and always answers `302` to one fixed app path with a code from a fixed list.
  App keys and tokens live **only** in AWS Secrets Manager (`cf-prod/platforms/{platform}/{app,token,pending}`),
  created at runtime by the API and the hooks Lambda; DynamoDB keeps masked hints, the public client id and the
  account's name and picture. TikTok and X refresh tokens rotate, so refreshes take a short DynamoDB lease and write
  the new secret before the access token is used.
- **Alternatives.** *Keys and tokens in DynamoDB with KMS* (encrypted, but one table read away from every Lambda that
  reads posts; harder to audit). *SSM Parameter Store SecureStrings* (cheaper, but no `CreateSecret`-style lifecycle,
  lower throughput limits, and 4 KB values). *State in a cookie* (the callback is on another domain than the app).
  *An unsigned random state only in DynamoDB* (works, but a signature lets the callback reject junk without a read).
- **Consequences.** At most about 22 secrets in all at $0.40 a month each, about $9 (about 16 when this was decided):
  two made by Terraform (the state key and the push key `cf-prod/notify/vapid`); 19 made at runtime by the app (an
  app and a token secret for each of the five platforms, the short-lived pending choice of Instagram and Facebook,
  Content Rewards' app and token, the four badge keys `cf-prod/platforms/{twitch/app, kick/app, youtube/readkey,
  twitch/eventsub}` and Ask's search key); and the optional YouTube proxy the owner may add by hand. Only
  `cf-prod-api`, `cf-prod-hooks`,
  `cf-prod-clip-flow` and `cf-prod-stats` may touch the `cf-prod/platforms/*` prefix, and the last two may write only
  the token secrets (`cf-prod/platforms/*/token-*`) ([SECURITY.md](SECURITY.md#platform-keys-and-tokens)). A lost race on a rotating refresh token cannot strand the
  account. Rotating the state key ends Connects that are in flight, nothing else.
