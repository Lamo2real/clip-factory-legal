## ADR-62 New built-in skill parts are offered to the owner's copy, never written into it

- **Context.** §37 added a Chat block to the built-in `viral-clip-editing`. An owner who had made his own copy of that
  skill does not get it, and his rule is that his own edited text never changes without his say.
- **Options.** (1) Do nothing: his copy never learns chat. (2) Rewrite his copy on deploy: changes his words. (3) A
  three-way merge of his copy with the new built-in: heavy, and still edits text he did not see. (4) Version each
  later part of a built-in, spot a copy that lacks one, offer it with a preview, add only that part on his tap, with
  an exact Undo, and meanwhile give every model call the built-in's part as a separate note.
- **Decision.** (CONTRACTS §38) Option 4. One pure module, the same file in the API and the agent, finds copies by
  shared lines and places the part before "Skip these"; the item remembers what was added (for Undo) and Not now.
- **Consequences.** Chat hype works before he taps Add. A heavily rewritten copy (under 30% of the built-in's lines)
  is not seen as a copy and gets no offer or note; the built-in itself is always in the block anyway (§18.1). Each
  future built-in part needs a `SECTIONS` entry. Additive item fields only; no infrastructure change.
