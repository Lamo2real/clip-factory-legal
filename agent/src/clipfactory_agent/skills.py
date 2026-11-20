"""Skills: the built-in ones from the image plus every one the owner added (docs/CONTRACTS.md §18), written to
``<workdir>/.claude/skills/<name>/`` so the Claude Agent SDK loads them, and turned into the one shared "skills block"
that goes first in the system prompt of every model call (§18.6)."""

from __future__ import annotations

import functools
import io
import re
import shutil
import stat
import zipfile
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from html import escape
from pathlib import Path, PurePosixPath
from typing import Any

from . import skill_sections
from .retry import retry
from .util import log

# Zip limits: the same numbers as the API's ZIP_MAX_BYTES / ZIP_MAX_ENTRIES / ZIP_MAX_UNCOMPRESSED / MD_MAX_BYTES.
MAX_ZIP = 20 * 1024 * 1024
MAX_FILES = 500
MAX_UNZIPPED = 50 * 1024 * 1024
MD_MAX_BYTES = 1 * 1024 * 1024
MAX_FILE = 20 * 1024 * 1024  # a plain SKILL.md object is cut to this (the API allows 1 MB)
SKILL_MAX_PROMPT_CHARS = 40_000  # per skill, in the skills block
SKILLS_BUDGET_CHARS = 120_000  # every skill together
MIN_TRUNCATED_CHARS = 2_000  # a skill cut shorter than this is left out instead
CACHE_POINT_MIN_CHARS = 8_000  # a block this long gets a Converse cache point after it
SHORTENED = "\n…(shortened)"
FETCH_ATTEMPTS = 3
BOM = b"\xef\xbb\xbf"
ZIP_METHODS = (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)  # as the API's ZIP_METHODS
_NAME = re.compile(r"[^a-z0-9-]+")


@dataclass(frozen=True)
class SkillDoc:
    name: str
    description: str
    text: str
    builtin: bool
    skill_id: str = ""  # breaks name ties in the block order, as in the API (§18.6)


@dataclass(frozen=True)
class SkillSet:
    """The skills a job uses, and the labels of owner skills whose file could not be read."""

    docs: list[SkillDoc]
    skipped: list[str] = field(default_factory=list)

    @property
    def full_text(self) -> str:
        """Every skill's whole text (never cut), for the caption rules that read required tags."""
        return "\n\n".join(d.text for d in self.docs)


class SkillError(ValueError):
    pass


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """``---``-fenced ``key: value`` lines (quotes stripped) and the body after them."""
    if not text.startswith("---"):
        return {}, text
    lines = text.splitlines()
    meta: dict[str, str] = {}
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            return meta, "\n".join(lines[i + 1 :]).lstrip("\n")
        key, sep, value = line.partition(":")
        if sep and key.strip() and not key.startswith((" ", "\t")):
            meta[key.strip()] = value.strip().strip("'\"")
    return {}, text


def safe_name(raw: str) -> str:
    name = _NAME.sub("-", raw.lower()).strip("-")[:64].strip("-")
    return name or "skill"


def _safe_member(name: str) -> bool:
    """The API's ``_safe_member``: relative, no ``..`` or empty parts, no backslashes, NULs or drive letters."""
    if not name or name.startswith(("/", "\\")) or "\\" in name or "\x00" in name:
        return False
    path = PurePosixPath(name)
    return not any(part in {"..", ""} for part in path.parts) and not re.match(r"^[A-Za-z]:", name)


def extract_zip(data: bytes, dest: Path) -> Path:
    """Extracts a skill zip safely and returns the folder that holds its one SKILL.md.

    Checks every member with exactly the API's rules (``skill_md_from_zip``, strict), so both accept the same zips:
    at most MAX_ZIP bytes and MAX_FILES entries, safe names, no symlinks, no password-locked members, stored/deflate
    only, at most MAX_UNZIPPED unzipped, exactly one SKILL.md at the root or in one top folder and at most
    MD_MAX_BYTES. ``__MACOSX`` entries are checked but not extracted."""
    if len(data) > MAX_ZIP:
        raise SkillError("the zip is too large")
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as e:
        raise SkillError("not a zip file") from e
    with zf:
        everything = zf.infolist()
        if len(everything) > MAX_FILES:
            raise SkillError("too many files")
        total = 0
        found: list[zipfile.ZipInfo] = []
        for m in everything:
            if not _safe_member(m.filename):
                raise SkillError(f"unsafe path in zip: {m.filename[:100]}")
            if stat.S_ISLNK(m.external_attr >> 16):
                raise SkillError("the zip contains a symbolic link")
            if m.flag_bits & 0x1:
                raise SkillError("the zip has a password-locked file")
            if m.compress_type not in ZIP_METHODS:
                raise SkillError("the zip uses an unsupported packing method")
            total += m.file_size
            if total > MAX_UNZIPPED:
                raise SkillError("too large when unzipped")
            if not m.is_dir() and PurePosixPath(m.filename).name == "SKILL.md":
                found.append(m)
        if len(found) != 1:
            raise SkillError("the zip must contain exactly one SKILL.md")
        if len(PurePosixPath(found[0].filename).parts) > 2:
            raise SkillError("the SKILL.md is too deep in folders")
        if found[0].file_size > MD_MAX_BYTES:
            raise SkillError("the SKILL.md is larger than 1 MB")
        root = PurePosixPath(found[0].filename).parent
        members = [m for m in everything if not m.is_dir() and not m.filename.startswith("__MACOSX/")]
        dest.mkdir(parents=True, exist_ok=True)
        base = dest.resolve()
        for m in members:
            p = PurePosixPath(m.filename)
            if root.parts and p.parts[: len(root.parts)] != root.parts:
                continue  # files outside the skill's folder are not part of the skill
            rel = PurePosixPath(*p.parts[len(root.parts) :])
            target = (dest / rel).resolve()
            if not target.is_relative_to(base):
                raise SkillError(f"unsafe path in zip: {m.filename[:100]}")
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                with zf.open(m) as src, target.open("wb") as out:
                    copied = 0
                    while chunk := src.read(1 << 16):
                        copied += len(chunk)
                        if copied > m.file_size + 1024:
                            raise SkillError("a file in the zip is larger than it claims")
                        out.write(chunk)
            except (RuntimeError, NotImplementedError, zipfile.BadZipFile, EOFError) as e:
                raise SkillError(f"a file in the zip could not be opened: {m.filename[:100]}") from e
    return dest


def _unique(name: str, taken: set[str]) -> str:
    candidate, n = name, 2
    while candidate in taken:
        candidate = f"{name[:60]}-{n}"
        n += 1
    taken.add(candidate)
    return candidate


def _strip_bom(path: Path) -> None:
    """Drops a leading UTF-8 BOM from an owner's SKILL.md (the API accepts one), so the Agent SDK's Skill tool reads
    its frontmatter too."""
    raw = path.read_bytes()
    if raw.startswith(BOM):
        path.write_bytes(raw.removeprefix(BOM))


def _doc(folder: Path, fallback: str, builtin: bool) -> tuple[str, str, str]:
    # utf-8-sig drops a leading BOM, as the API's decode_text does, so the frontmatter is read and the block matches.
    text = (folder / "SKILL.md").read_text("utf-8-sig", "replace")
    meta, _ = parse_frontmatter(text)
    return meta.get("name") or fallback, meta.get("description", ""), text


def is_owner_skill(row: dict[str, Any]) -> bool:
    """An owner skill row: ``type == "skill"``, or (written before §18) a row with a file ``key``. Built-in choice
    items (``SKILL#builtin-<name>``, ``type="skill_choice"``) are not skills and are ignored. ``enabled`` is ignored:
    every skill is always used."""
    sid = str(row.get("skillId") or str(row.get("sk", "")).removeprefix("SKILL#"))
    if sid.startswith("builtin-") or row.get("builtin"):
        return False
    kind = row.get("type")
    if kind is not None:
        return kind == "skill" and bool(row.get("key"))
    return bool(row.get("key"))


def owner_order(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    """Owner skill rows by ``name``, ties by ``skillId``."""
    return sorted(
        (r for r in rows if is_owner_skill(r)), key=lambda r: (str(r.get("name") or ""), str(r.get("skillId") or ""))
    )


async def prepare_skills(
    workdir: Path,
    builtin_dir: Path,
    rows: list[dict[str, Any]],
    fetch: Callable[[str], Awaitable[bytes]],
) -> SkillSet:
    """Writes every skill under ``<workdir>/.claude/skills``: built-ins by name, then the owner's by name. An owner
    skill whose file cannot be read (after FETCH_ATTEMPTS tries) or is broken is skipped and logged, never fatal."""
    target = workdir / ".claude" / "skills"
    shutil.rmtree(target, ignore_errors=True)
    target.mkdir(parents=True)
    taken: set[str] = set()
    docs: list[SkillDoc] = []
    skipped: list[str] = []

    if builtin_dir.is_dir():
        for folder in sorted(p for p in builtin_dir.iterdir() if (p / "SKILL.md").is_file()):
            name, desc, text = _doc(folder, folder.name, True)
            final = _unique(safe_name(name), taken)
            shutil.copytree(folder, target / final, symlinks=False)
            docs.append(SkillDoc(final, desc, text, True, "builtin-" + folder.name))

    for r in owner_order(rows):
        label = str(r.get("name") or r.get("skillId"))
        key = str(r["key"])
        try:
            data = await retry(functools.partial(fetch, key), what="skills.fetch", attempts=FETCH_ATTEMPTS, base=0.5)
            staging = workdir / ".skill-staging" / safe_name(str(r.get("skillId", label)))
            shutil.rmtree(staging, ignore_errors=True)
            if r.get("format") == "zip" or key.endswith(".zip"):
                folder = extract_zip(data, staging)
            else:
                staging.mkdir(parents=True)
                (staging / "SKILL.md").write_bytes(data[:MAX_FILE])
                folder = staging
            _strip_bom(folder / "SKILL.md")
            name, desc, text = _doc(folder, label, False)
            final = _unique(safe_name(name), taken)
            shutil.move(str(folder), str(target / final))
            docs.append(
                SkillDoc(final, desc or str(r.get("description", "")), text, False, str(r.get("skillId") or ""))
            )
        except Exception as e:
            skipped.append(label)
            log("warn", "skills.skipped", skill=label, error=type(e).__name__, detail=str(e)[:200])
    shutil.rmtree(workdir / ".skill-staging", ignore_errors=True)
    return SkillSet(docs, skipped)


# --- the skills block (§18.6; the API's skill_prompt.py builds the same text, checked by a shared golden file) ---

BLOCK_INTRO = (
    "These are the owner's skills. Follow every one of them in everything you write, pick, judge or describe, "
    "as long as that does not break this task's rules or answer format."
)
BLOCK_LEFT_OUT = "These skills were too long to fit this time."


@dataclass(frozen=True)
class SkillsBlock:
    text: str
    counts: dict[str, int]


def _clean(text: str) -> str:
    return text.replace("\r\n", "\n").rstrip()


def skills_block(docs: Sequence[SkillDoc], *, where: str = "") -> SkillsBlock:
    """The one skills block for every model call: built-ins first, then the owner's, each by name. Each skill is cut
    to SKILL_MAX_PROMPT_CHARS (plus the "shortened" mark); a skill longer than what is left of SKILLS_BUDGET_CHARS
    is cut to fit, mark included, when at least MIN_TRUNCATED_CHARS are left, else left out and named. Every build
    is logged as ``skills.block`` with its counts. Same algorithm and text as the API's ``skill_prompt.py``."""
    ordered = sorted(docs, key=lambda d: (not d.builtin, d.name, d.skill_id))
    left = SKILLS_BUDGET_CHARS
    parts: list[str] = []
    omitted: list[str] = []
    truncated = 0
    notes = 0
    builtins = [(x.name, x.text) for x in ordered if x.builtin]
    for d in ordered:
        text = _clean(d.text)
        cut = False
        if len(text) > SKILL_MAX_PROMPT_CHARS:
            text, cut = text[:SKILL_MAX_PROMPT_CHARS] + SHORTENED, True
        if len(text) > left:
            if left < MIN_TRUNCATED_CHARS:
                omitted.append(d.name)
                continue
            text, cut = text[: left - len(SHORTENED)] + SHORTENED, True
        left -= len(text)
        truncated += cut
        source = "built-in" if d.builtin else "owner"
        parts.append(f'<skill name="{escape(d.name)}" source="{source}">\n{text}\n</skill>')
        if not d.builtin:  # his copy of a built-in that gained a part since: a small separate note (§38.4)
            for gap in skill_sections.missing_sections(builtins, d.text):
                note = skill_sections.skill_note(d.name, gap)
                left = max(0, left - len(note))  # a note counts against the same budget (§38.4)
                parts.append(note)
                notes += 1
    if not parts and not omitted:
        out = '<owner_skills count="0"></owner_skills>'
    else:
        lines = [f'<owner_skills count="{len(parts) - notes}">', BLOCK_INTRO, *parts]
        if omitted:
            lines.append(f'<skills_left_out names="{escape(", ".join(omitted))}">{BLOCK_LEFT_OUT}</skills_left_out>')
        lines.append("</owner_skills>")
        out = "\n".join(lines)
    counts = {
        "builtin": sum(1 for d in ordered if d.builtin),
        "owner": sum(1 for d in ordered if not d.builtin),
        "included": len(parts) - notes,
        "truncated": truncated,
        "omitted": len(omitted),
        "notes": notes,
        "chars": len(out),
    }
    log("info", "skills.block", where=where, **counts)
    return SkillsBlock(out, counts)


def compose_system(block: SkillsBlock, task_system: str, *, cache_point: bool = True) -> list[dict[str, Any]]:
    """A Converse ``system``: the skills block first, a cache point after it when it is long enough (and cache
    points are on), then the task's own system prompt."""
    out: list[dict[str, Any]] = [{"text": block.text}]
    if cache_point and len(block.text) >= CACHE_POINT_MIN_CHARS:
        out.append({"cachePoint": {"type": "default"}})
    out.append({"text": task_system})
    return out


def compose_system_text(block: SkillsBlock, task_system: str) -> str:
    """The Agent SDK system prompt file: the skills block, a blank line, the task's system prompt."""
    return block.text + "\n\n" + task_system
