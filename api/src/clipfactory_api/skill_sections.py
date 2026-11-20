"""New parts of a built-in skill, for the owner's own copy of it (docs/CONTRACTS.md §38).

The owner can upload or write his own version of a built-in skill (for example his copy of viral-clip-editing). When
a built-in later gains a part (§37 added the Chat block), his copy does not have it. This module, pure and with no
imports from the package, finds that and adds the part without touching any of his words:

* ``SECTIONS`` names each part added to a built-in after it first shipped, with a version.
* ``section_text`` cuts that part out of the built-in's SKILL.md.
* ``is_copy_of`` says whether an owner skill is a copy of a built-in (most of the built-in's lines are in it).
* ``missing_sections`` lists the parts a copy lacks; ``insertion`` says where one goes and exactly what is added
  (his text stays byte for byte); ``remove_section`` takes exactly that addition out again (Undo).
* ``skill_note`` is the small separate note every model call gets while his copy lacks a part (§38.4).

This file is the same, byte for byte, in ``api/src/clipfactory_api/skill_sections.py`` and
``agent/src/clipfactory_agent/skill_sections.py`` (a test checks it).
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from html import escape


@dataclass(frozen=True)
class BuiltinSection:
    skill: str  # the built-in's name
    section: str  # a short id, stable across versions
    version: int
    title: str  # shown to the owner: "New in the built-in skill: {title}"
    start: str  # the part begins at the first line that starts with this
    marks: tuple[str, ...]  # any of these (lower case) in his text means he already has the part
    before: tuple[str, ...]  # put it right before the first line that is one of these
    within: str  # else at the end of the part under this heading; else at the very end

    @property
    def key(self) -> str:
        return f"{self.skill}/{self.section}@{self.version}"


SECTIONS: tuple[BuiltinSection, ...] = (
    BuiltinSection(
        skill="viral-clip-editing",
        section="chat",
        version=1,
        title="Chat went wild",
        start="**Chat** (",
        marks=("chat spikes",),
        before=("### Skip these",),
        within="### Reading the signals",
    ),
)

COPY_MIN_SHARE = 0.3  # at least this share of the built-in's lines (outside its later parts) are in his text
COPY_MIN_LINES = 8  # and at least this many
LINE_MIN_CHARS = 25  # shorter lines ("## 5. The ending") say too little about where a text came from
PREVIEW_LINES = 3
_HEADING = re.compile(r"^(#{1,6})\s")
_SPACES = re.compile(r"\s+")


@dataclass(frozen=True)
class Missing:
    """A part of a built-in that an owner's copy does not have yet."""

    section: BuiltinSection
    text: str  # the part, as the built-in has it


def _body(text: str) -> str:
    """The text after a ``---`` frontmatter (the whole text when there is none)."""
    text = text.replace("\r\n", "\n")
    if not text.startswith("---"):
        return text
    end = text.find("\n---", 3)
    return text if end < 0 else text[end + 4 :]


def _norm(line: str) -> str:
    return _SPACES.sub(" ", line.strip().lower())


def section_text(builtin_text: str, section: BuiltinSection) -> str | None:
    """The part as the built-in has it: from its first line to the line before the next heading, without the blank
    lines at its end. ``None`` when the built-in does not have it (a build bug; tests catch it)."""
    lines = builtin_text.replace("\r\n", "\n").split("\n")
    first = next((i for i, line in enumerate(lines) if line.startswith(section.start)), None)
    if first is None:
        return None
    last = next((i for i in range(first + 1, len(lines)) if _HEADING.match(lines[i])), len(lines))
    out = "\n".join(lines[first:last]).rstrip()
    return out or None


def _lines(text: str) -> set[str]:
    return {n for n in (_norm(line) for line in _body(text).split("\n")) if len(n) >= LINE_MIN_CHARS}


def is_copy_of(builtin_text: str, owner_text: str, skill: str) -> bool:
    """Whether ``owner_text`` is the owner's copy of the built-in ``skill`` (his edits allowed): enough of the
    built-in's own lines, not counting the parts added later, are in it."""
    later: set[str] = set()
    for s in SECTIONS:
        if s.skill == skill:
            later |= _lines(section_text(builtin_text, s) or "")
    base = _lines(builtin_text) - later
    if not base:
        return False
    shared = len(base & _lines(owner_text))
    return shared >= COPY_MIN_LINES and shared >= COPY_MIN_SHARE * len(base)


def has_section(owner_text: str, section: BuiltinSection) -> bool:
    low = owner_text.lower()
    return any(m in low for m in section.marks)


def missing_sections(builtins: Iterable[tuple[str, str]], owner_text: str) -> list[Missing]:
    """The later parts of every built-in (``(name, SKILL.md text)``) that this owner text is a copy of and lacks."""
    out: list[Missing] = []
    for name, text in builtins:
        wanted = [s for s in SECTIONS if s.skill == name]
        if not wanted or not is_copy_of(text, owner_text, name):
            continue
        for s in wanted:
            part = section_text(text, s)
            if part and not has_section(owner_text, s):
                out.append(Missing(s, part))
    return out


def _offsets(lines: Sequence[str]) -> list[int]:
    out, at = [], 0
    for line in lines:
        out.append(at)
        at += len(line) + 1
    return out


def _body_start(lines: Sequence[str]) -> int:
    """The first line after a ``---`` frontmatter."""
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                return i + 1
    return 0


def _place(text: str, section: BuiltinSection) -> int | None:
    """Where the part goes: the start of a line (``None`` = at the very end)."""
    lines = text.split("\n")
    offsets = _offsets(lines)
    start = _body_start(lines)
    for i in range(start, len(lines)):
        if lines[i].strip() in section.before:
            return offsets[i]
    for i in range(start, len(lines)):
        if lines[i].strip() == section.within:
            level = len(_HEADING.match(lines[i]).group(1))  # type: ignore[union-attr]
            for k in range(i + 1, len(lines)):
                m = _HEADING.match(lines[k])
                if m and len(m.group(1)) <= level:
                    return offsets[k]
            return None
    return None


def insertion(owner_text: str, part: str, section: BuiltinSection) -> tuple[int, str]:
    """Where the part goes in his text and exactly what is added there (the part with the blank lines around it).
    Nothing of his is changed or moved: only these characters are put in at that place."""
    at = _place(owner_text, section)
    eol = "\r\n" if "\r\n" in owner_text else "\n"  # a Windows file gets Windows line ends, his own stay as they are
    part = part.replace("\n", eol)
    if at is None:
        if owner_text == "" or owner_text.endswith(eol * 2):
            sep = ""
        elif owner_text.endswith("\n"):
            sep = eol
        else:
            sep = eol * 2
        return len(owner_text), sep + part + eol
    sep = "" if at == 0 or owner_text[:at].endswith(eol * 2) else eol
    return at, sep + part + eol * 2


def insert_section(owner_text: str, part: str, section: BuiltinSection) -> str:
    """His text with the part added in its place (``insertion``)."""
    at, added = insertion(owner_text, part, section)
    return owner_text[:at] + added + owner_text[at:]


def remove_section(current: str, at: int, added: str) -> str | None:
    """Undo: ``current`` without exactly what ``insertion`` added at ``at``, or ``None`` when those characters are
    no longer there (he changed the text around it since)."""
    if at < 0 or not added or current[at : at + len(added)] != added:
        return None
    return current[:at] + current[at + len(added) :]


def preview(owner_text: str, section: BuiltinSection) -> dict[str, list[str]]:
    """A few of his lines just before and just after where the part goes (blank lines left out)."""
    at = _place(owner_text, section)
    head = owner_text if at is None else owner_text[:at]
    tail = "" if at is None else owner_text[at:]
    before = [line for line in head.split("\n") if line.strip()][-PREVIEW_LINES:]
    after = [line for line in tail.split("\n") if line.strip()][:PREVIEW_LINES]
    return {"before": before, "after": after}


NOTE = (
    'The owner\'s skill "{owner}" is his own copy of the built-in skill "{skill}", made before the built-in gained '
    'its "{title}" part. Until he adds it to his copy, also follow that part of the built-in skill "{skill}" above '
    "(the part that begins {start!r}). Where his own words say something different, his words win."
)


def skill_note(owner: str, missing: Missing) -> str:
    """The small separate note that goes right after his skill in the skills block (§38.4). It only points at the
    part: the built-in skill is in every model call already, so the part's text is not sent a second time."""
    s = missing.section
    words = NOTE.format(owner=owner, skill=s.skill, title=s.title, start=s.start)
    return f'<skill_note skill="{escape(owner)}" part="{escape(s.key)}">\n{words}\n</skill_note>'
