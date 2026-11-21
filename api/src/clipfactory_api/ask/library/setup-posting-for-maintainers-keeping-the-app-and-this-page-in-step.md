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
