## 38. New parts of a built-in skill, for the owner's own copy of it (owner request, 2026-11-20)

### 38.1 The problem and the rule

§37 gave the built-in `viral-clip-editing` a **Chat** block. If the owner uploaded or wrote his own copy of that skill
before, his copy does not have it. Clip Factory **never changes his words by itself**: it offers the new part, and only
his tap adds it. Until then every model call still gets the built-in's part as a small separate note (§38.4), so chat
hype works from the first job. Decision record: ADR-62.

### 38.2 Spotting his copy (`skill_sections.py`, the same file byte for byte in `api` and `agent`)

* `SECTIONS`: every part a built-in gained after it first shipped, with a version. Today one:
  `viral-clip-editing/chat@1` "Chat went wild" (starts at the line `**Chat** (`, ends before the next heading).
* **A copy**: at least 8 and at least 30% of the built-in's lines (25+ characters, frontmatter and later parts not
  counted, compared trimmed and lower case) are in his text. His own edits, a new name and extra rules are fine.
* **Lacks the part**: none of its marks (`chat spikes`) is in his text.
* `GET /v1/skills`: an owner skill that is such a copy gains `newSections: SectionOffer[]` (only the ones he did not
  say Not now to; other skills have no such field). `GET /v1/skills/{skillId}`: `newSections` on every owner skill,
  Not now ones included with `notNow: true`.
  ```ts
  interface SectionOffer { key: string /* "viral-clip-editing/chat@1" */; title: string /* "Chat went wild" */;
    builtinId: string; builtinTitle: string; text: string /* the part, as the built-in has it */;
    preview: { before: string[]; after: string[] } /* ≤ 3 of his non-blank lines around where it goes */;
    notNow: boolean }
  ```

### 38.3 Add, Undo, Not now (`POST /v1/skills/{skillId}/sections`)

* **Where it goes**: right before his line `### Skip these`; else at the end of his part under `### Reading the
  signals`; else at the very end. Exactly the part plus the blank lines around it are put in; none of his characters
  change or move (`insertion` → `(at, added)`).
* **add** (`version` as §18.4; stale → `409`; already there → `409` "Your skill already has this part."): a new
  revision of his file (a zip keeps every other member), `name`, `title`, `description` and `source` unchanged,
  `version + 1`, and the item remembers `sectionAdded = {key, at, text}`.
* **undo**: takes out exactly `sectionAdded.text` at `sectionAdded.at` when those characters are still there, else
  `409` "Your skill changed since, so this cannot be undone here. Open it and tap Edit to take the part out."; a new
  revision, `sectionAdded` removed.
* **not_now**: adds the key to the item's `sectionsNotNow` list; no file, no version change.
* Additive item fields only (`sectionAdded`, `sectionsNotNow`), no new item, index, route permission or Terraform.

### 38.4 The note every model call gets until he adds it

Both skills block builders (§18.6) put, right after his `</skill>` and only while his copy lacks the part:
```
<skill_note skill="{his name}" part="viral-clip-editing/chat@1">
The owner's skill "{his name}" is his own copy of the built-in skill "viral-clip-editing", made before the built-in
gained its "Chat went wild" part. Until he adds it to his copy, also follow that part of the built-in skill
"viral-clip-editing" above (the part that begins '**Chat** ('). Where his own words say something different, his words win.
</skill_note>
```
The note only points at the part (the built-in skill is in every call already, so its text is not sent twice), and it
counts against the 120,000-character budget. It is not a skill (`count` and `included` are unchanged); `counts.notes` counts it. With no such copy every block is
byte for byte what it was (the §18.6 golden file); the note has its own shared golden file
(`tests/fixtures/skills_block_note_golden.txt` in both packages). Not now does not remove the note.

Add also checks the skill is a copy (`409` if not), keeps a byte order mark at the start of his file, and follows his
line ends (a Windows file gets Windows line ends in the added part). Not now on a skill deleted meanwhile is a `404`.

### 38.5 Web

* **Settings › Clip making › Skills**, top of **Your skills**: a glass card per offer, "New in the built-in skill: Chat
  went wild" · "Add it to {his title}? All your own words stay." · "Until you add it, Clip Factory still uses the
  built-in's Chat went wild part." with vermilion **Add** (act `add`, tap sound and a small burst, then an
  Undo toast for 8 s, "Added Chat went wild to {title}.", with a plus picture), ghost **Not now** (toast "Okay. You can
  still add it from the skill's page.") and ghost **See what changes** (his lines before, the new part tagged "New",
  his lines after, all drawn as safe markdown).
* **The skill's page**: the same offer as a small note above "When it is used" (no Not now once he said it).
* Mock: `window.__cfMock.addSkillCopy()` adds "My clip rules" (kept in sessionStorage `cf-mock-skill-copy`).

### 38.6 Tests

`api/tests/test_skill_sections.py` (copy found, no offer for the built-in or other skills, insert keeps every word and
lands before Skip these, insert then undo gives his text back exactly, undo refused after his own change, add and undo
and not_now through the API incl. a zip, the note), `agent/tests/test_skill_sections.py` (a job's block has the note
after his copy and matches the API's golden, none once added), web `e2e/skill-section-offer.spec.ts` (375 and 1440 px).
