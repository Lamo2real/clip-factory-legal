"""The skills block: every skill, built-in and the owner's, goes first in the system prompt of every model call
the API makes (docs/CONTRACTS.md §18.6).

``skills_block`` is the same builder as the agent's (``agent/src/clipfactory_agent/skills.py``); both packages check
their output against ``tests/fixtures/skills_block_golden.txt`` byte for byte. ``load_skills`` reads the owner's
skills from the table and the media bucket, caching each file by its key (revision keys never change content).
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from html import escape
from typing import Any

from . import db, s3, skill_sections, skills
from .log import log

SKILL_MAX_PROMPT_CHARS = 40_000
SKILLS_BUDGET_CHARS = 120_000
MIN_TRUNCATED_CHARS = 2_000
CACHE_POINT_MIN_CHARS = 8_000
SHORTENED = "\n…(shortened)"
INTRO = (
    "These are the owner's skills. Follow every one of them in everything you write, pick, judge or describe, as long "
    "as that does not break this task's rules or answer format."
)
LEFT_OUT = "These skills were too long to fit this time."

FILE_CACHE_ENTRIES = 64
FILE_CACHE_BYTES = 16 * 1024 * 1024
READ_DELAYS = (0.5, 1.0, 2.0)  # three retries for a passing S3 problem
SKIP_CODES = frozenset({"NoSuchKey", "NotFound", "404", "AccessDenied", "403"})


@dataclass(frozen=True)
class SkillDoc:
    name: str
    builtin: bool
    text: str  # the SKILL.md text
    skill_id: str = ""


@dataclass(frozen=True)
class SkillsBlock:
    text: str
    counts: dict[str, int]


def _order(docs: Iterable[SkillDoc]) -> list[SkillDoc]:
    return sorted(docs, key=lambda d: (not d.builtin, d.name, d.skill_id))


def skills_block(docs: Iterable[SkillDoc], *, where: str = "") -> SkillsBlock:
    """The block of §18.6: built-ins first, then the owner's by name; each skill cut to 40,000 characters and the
    whole kept within 120,000 (a skill that does not fit is cut when at least 2,000 are left, else left out)."""
    ordered = _order(docs)
    left = SKILLS_BUDGET_CHARS
    parts: list[str] = []
    omitted: list[str] = []
    truncated = 0
    notes = 0
    builtins = [(x.name, x.text) for x in ordered if x.builtin]
    for doc in ordered:
        text = doc.text.replace("\r\n", "\n").rstrip()
        cut = False
        if len(text) > SKILL_MAX_PROMPT_CHARS:
            text, cut = text[:SKILL_MAX_PROMPT_CHARS] + SHORTENED, True
        if len(text) > left:
            if left < MIN_TRUNCATED_CHARS:
                omitted.append(doc.name)
                continue
            text, cut = text[: left - len(SHORTENED)] + SHORTENED, True
        left -= len(text)
        truncated += cut
        source = "built-in" if doc.builtin else "owner"
        parts.append(f'<skill name="{escape(doc.name)}" source="{source}">\n{text}\n</skill>')
        if not doc.builtin:  # his copy of a built-in that gained a part since: a small separate note (§38.4)
            for gap in skill_sections.missing_sections(builtins, doc.text):
                note = skill_sections.skill_note(doc.name, gap)
                left = max(0, left - len(note))  # a note counts against the same budget (§38.4)
                parts.append(note)
                notes += 1
    if not parts and not omitted:
        body = '<owner_skills count="0"></owner_skills>'
    else:
        lines = [f'<owner_skills count="{len(parts) - notes}">', INTRO, *parts]
        if omitted:
            lines.append(f'<skills_left_out names="{escape(", ".join(omitted))}">{LEFT_OUT}</skills_left_out>')
        lines.append("</owner_skills>")
        body = "\n".join(lines)
    counts = {
        "builtin": sum(1 for d in ordered if d.builtin),
        "owner": sum(1 for d in ordered if not d.builtin),
        "included": len(parts) - notes,
        "truncated": truncated,
        "omitted": len(omitted),
        "notes": notes,
        "chars": len(body),
    }
    log("info", "skills.block", where=where, **counts)
    return SkillsBlock(body, counts)


# --- system prompts -------------------------------------------------------------------------------------------

_cache_points = {"on": True}


def cache_points_on() -> bool:
    return _cache_points["on"]


def turn_cache_points_off() -> None:
    """Bedrock refused a cache point: leave them out for the rest of this process."""
    if _cache_points["on"]:
        _cache_points["on"] = False
        log("warning", "bedrock.cache_point_off")


def reset_cache_points() -> None:
    _cache_points["on"] = True


def compose_system(block: SkillsBlock, task_system: str) -> list[dict[str, Any]]:
    """The Converse ``system``: the skills block first, a cache point after it when it is long enough to be worth
    caching (and Bedrock accepts them), then the task's own prompt."""
    system: list[dict[str, Any]] = [{"text": block.text}]
    if cache_points_on() and len(block.text) >= CACHE_POINT_MIN_CHARS:
        system.append({"cachePoint": {"type": "default"}})
    system.append({"text": task_system})
    return system


def compose_system_text(block: SkillsBlock, task_system: str) -> str:
    return block.text + "\n\n" + task_system


def is_cache_point_error(e: BaseException) -> bool:
    response = getattr(e, "response", None) or {}
    error = response.get("Error", {}) if isinstance(response, dict) else {}
    code = error.get("Code") or type(e).__name__
    message = str(error.get("Message") or e).lower()
    return "ValidationException" in str(code) and ("cachepoint" in message or "cache point" in message)


# --- loading the owner's skills -------------------------------------------------------------------------------


class _FileCache:
    """SKILL.md texts by S3 key, least recently used out first, bounded in entries and bytes."""

    def __init__(self, max_entries: int = FILE_CACHE_ENTRIES, max_bytes: int = FILE_CACHE_BYTES) -> None:
        self.max_entries = max_entries
        self.max_bytes = max_bytes
        self._items: OrderedDict[tuple[str, int], tuple[str, int]] = OrderedDict()
        self._bytes = 0
        self._lock = threading.Lock()

    def get(self, key: tuple[str, int]) -> str | None:
        with self._lock:
            found = self._items.get(key)
            if found is None:
                return None
            self._items.move_to_end(key)
            return found[0]

    def put(self, key: tuple[str, int], text: str) -> None:
        size = len(text.encode())
        if size > self.max_bytes:
            return
        with self._lock:
            old = self._items.pop(key, None)
            if old is not None:
                self._bytes -= old[1]
            self._items[key] = (text, size)
            self._bytes += size
            while len(self._items) > self.max_entries or self._bytes > self.max_bytes:
                _, (_, dropped) = self._items.popitem(last=False)
                self._bytes -= dropped

    def clear(self) -> None:
        with self._lock:
            self._items.clear()
            self._bytes = 0


FILE_CACHE = _FileCache()


def _skippable(e: Exception) -> bool:
    return s3._code(e) in SKIP_CODES or s3._status(e) in {403, 404}


def owner_items(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """The owner's skill items: ``type == "skill"``, or rows written before §18 that have a key and no
    ``builtin``. On/off choice items (``type="skill_choice"``) are not skills."""
    out = []
    for r in rows:
        kind = r.get("type")
        is_skill = kind == "skill" or (kind is None and r.get("key") and not r.get("builtin"))
        if is_skill and r.get("name") and isinstance(r.get("key"), str):
            out.append(r)
    return out


def _read_text(media: s3.Media, item: dict[str, Any], sleep: Callable[[float], None]) -> str | None:
    key = str(item["key"])
    fmt = "zip" if item.get("format") == "zip" else "md"
    cache_key = (key, 0) if s3.is_revision_key(key) else (key, int(item.get("version") or 1))
    cached = FILE_CACHE.get(cache_key)
    if cached is not None:
        return cached
    skill_id = str(item.get("skillId") or "")
    size = item.get("size")
    if isinstance(size, int | float) and size > skills.ZIP_MAX_BYTES:
        log("warning", "skills.skipped", skillId=skill_id, reason="too_large")
        return None
    limit = skills.ZIP_MAX_BYTES if fmt == "zip" else skills.MD_MAX_BYTES
    for attempt in range(len(READ_DELAYS) + 1):
        try:
            data = media.read(key, limit)
            break
        except ValueError:
            log("warning", "skills.skipped", skillId=skill_id, reason="too_large")
            return None
        except Exception as e:
            if _skippable(e):
                log("warning", "skills.skipped", skillId=skill_id, reason="missing")
                return None
            if attempt == len(READ_DELAYS):
                raise
            log("warning", "skills.read_retry", skillId=skill_id, attempt=attempt + 1, error=type(e).__name__)
            sleep(READ_DELAYS[attempt])
    try:
        text = skills.decode_text(data) if fmt == "md" else skills.skill_md_from_zip(data)
    except skills.SkillError:
        log("warning", "skills.skipped", skillId=skill_id, reason="unreadable")
        return None
    if len(text.encode()) > skills.MD_MAX_BYTES:
        log("warning", "skills.skipped", skillId=skill_id, reason="too_large")
        return None
    FILE_CACHE.put(cache_key, text)
    return text


def read_skill_text(media: s3.Media, item: dict[str, Any]) -> str | None:
    """One owner skill's SKILL.md text through the same cache as the skills block (``None`` when it cannot be
    read); used to spot a copy of a built-in that lacks a newer part (§38)."""
    return _read_text(media, item, time.sleep)


def load_skills(
    store: db.Store,
    media: s3.Media,
    user_id: str,
    *,
    builtins: Callable[[], Sequence[skills.BuiltinSkill]] = skills.load_builtins,
    sleep: Callable[[float], None] = time.sleep,
) -> list[SkillDoc]:
    """Every built-in and every skill the owner added, in block order. A file that is missing, denied, too large or
    unreadable is skipped and logged; any other S3 error is retried three times, then raised."""
    docs = [SkillDoc(b.name, True, skills.decode_text(b.path.read_bytes()), b.skill_id) for b in builtins()]
    for item in owner_items(store.query_all(db.user_pk(user_id), "SKILL#")):
        text = _read_text(media, item, sleep)
        if text is not None:
            docs.append(SkillDoc(str(item["name"]), False, text, str(item.get("skillId") or "")))
    return _order(docs)


def load_block(
    store: db.Store,
    media: s3.Media,
    user_id: str,
    *,
    where: str,
    builtins: Callable[[], Sequence[skills.BuiltinSkill]] = skills.load_builtins,
    sleep: Callable[[float], None] = time.sleep,
) -> SkillsBlock:
    """``skills_block(load_skills(...))`` for one owner, logged with ``where``."""
    return skills_block(load_skills(store, media, user_id, builtins=builtins, sleep=sleep), where=where)
