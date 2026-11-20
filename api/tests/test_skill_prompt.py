"""The skills block in every API model call (docs/CONTRACTS.md §18.6)."""

from __future__ import annotations

import io
import json
import zipfile
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

from clipfactory_api import db, learn, s3, skill_prompt, weekly
from clipfactory_api.ids import ulid
from clipfactory_api.skill_prompt import (
    CACHE_POINT_MIN_CHARS,
    MIN_TRUNCATED_CHARS,
    SHORTENED,
    SKILL_MAX_PROMPT_CHARS,
    SkillDoc,
    compose_system,
    compose_system_text,
    load_skills,
    skills_block,
)
from clipfactory_api.skills import load_builtins
from conftest import USER, Clock
from fakes import FakeBedrock, FakeS3, client_error
from test_skills import LOCKED

GOLDEN = Path(__file__).parent / "fixtures" / "skills_block_golden.txt"
OWNER_MD = "---\nname: funny-moments-first\ndescription: When it picks.\n---\n\nPick the loudest laughs.\n"
OLD_MD = "---\nname: old-rules\ndescription: Legacy.\n---\n\nNever swear.\n"


@pytest.fixture(autouse=True)
def _fresh_caches() -> Iterator[None]:
    skill_prompt.FILE_CACHE.clear()
    skill_prompt.reset_cache_points()
    yield
    skill_prompt.FILE_CACHE.clear()
    skill_prompt.reset_cache_points()


def golden_docs() -> list[SkillDoc]:
    """The same three fixture skills as agent/tests/test_skills.py (one built-in, two owner, one over 40,000)."""
    return [
        SkillDoc(
            "short-form-video-playbook",
            True,
            "---\nname: short-form-video-playbook\ndescription: How to pick and edit short clips.\n---\n\n"
            "# Playbook\n\nOpen on the payoff.\n",
        ),
        SkillDoc(
            "funny-moments-first",
            False,
            '---\nname: funny-moments-first\ndescription: "Every time it picks moments."\n---\n\n'
            "# Funny moments first\r\n\r\nPick the moments where I laugh the loudest.\r\n",
        ),
        SkillDoc(
            "long-rules",
            False,
            "---\nname: long-rules\ndescription: Very long.\n---\n\n" + "abcdefghij" * 4_100 + "\n",
        ),
    ]


def doc(name: str, size: int, builtin: bool = False, skill_id: str = "") -> SkillDoc:
    return SkillDoc(name, builtin, "x" * size, skill_id)


# --- the block ------------------------------------------------------------------------------------------------


def test_golden_file_byte_for_byte() -> None:
    assert len(golden_docs()[2].text) > SKILL_MAX_PROMPT_CHARS
    assert skills_block(golden_docs()).text.encode("utf-8") == GOLDEN.read_bytes()


def test_order_builtins_then_owner_by_name_then_id() -> None:
    block = skills_block([doc("b", 5), doc("a", 5, skill_id="2"), doc("z", 5, True), doc("a", 5, skill_id="1")])
    names = [line for line in block.text.split("\n") if line.startswith("<skill ")]
    assert names == [
        '<skill name="z" source="built-in">',
        '<skill name="a" source="owner">',
        '<skill name="a" source="owner">',
        '<skill name="b" source="owner">',
    ]
    ordered = skill_prompt._order([doc("a", 5, skill_id="2"), doc("a", 5, skill_id="1")])
    assert [d.skill_id for d in ordered] == ["1", "2"]


def test_each_skill_is_cut_to_40000() -> None:
    block = skills_block([doc("big", 50_000)])
    assert ("x" * SKILL_MAX_PROMPT_CHARS + SHORTENED + "\n</skill>") in block.text
    assert "x" * (SKILL_MAX_PROMPT_CHARS + 1) not in block.text
    assert block.counts["truncated"] == 1


def test_budget_cut_and_omission() -> None:
    # a, b and c leave under 2,000 characters: d does not fit and is left out, the tiny e still fits.
    docs = [doc("a", 50_000, True), doc("b", 50_000), doc("c", 39_000), doc("d", 3_000), doc("e", 10)]
    block = skills_block(docs)
    assert block.counts == {
        "builtin": 1,
        "owner": 4,
        "included": 4,
        "truncated": 2,
        "omitted": 1,
        "notes": 0,
        "chars": len(block.text),
    }
    assert '<skills_left_out names="d">These skills were too long to fit this time.</skills_left_out>' in block.text
    assert block.text.endswith("</skills_left_out>\n</owner_skills>")


def test_budget_cut_when_at_least_2000_left() -> None:
    left = 120_000 - 2 * (SKILL_MAX_PROMPT_CHARS + len(SHORTENED))
    assert left >= MIN_TRUNCATED_CHARS
    block = skills_block([doc("a", 50_000, True), doc("b", 50_000), doc("c", 39_990)])
    third = block.text.split('<skill name="c" source="owner">\n', 1)[1].split("\n</skill>", 1)[0]
    assert len(third) == left
    assert third.endswith(SHORTENED)
    assert block.counts["omitted"] == 0
    assert block.counts["truncated"] == 3


def test_empty_block() -> None:
    block = skills_block([])
    assert block.text == '<owner_skills count="0"></owner_skills>'
    assert block.counts["included"] == 0


def test_block_build_is_logged(capsys: pytest.CaptureFixture[str]) -> None:
    skills_block([doc("a", 10, True), doc("b", 10)], where="api.week")
    line = json.loads(capsys.readouterr().out.strip().splitlines()[-1])
    assert line["event"] == "skills.block"
    assert (line["where"], line["builtin"], line["owner"], line["included"]) == ("api.week", 1, 1, 2)
    assert line["chars"] > 0


def test_compose_system_and_cache_point() -> None:
    short = skills_block([doc("a", 100)])
    assert compose_system(short, "task") == [{"text": short.text}, {"text": "task"}]
    long = skills_block([doc("a", CACHE_POINT_MIN_CHARS)])
    assert len(long.text) >= CACHE_POINT_MIN_CHARS
    assert compose_system(long, "task") == [
        {"text": long.text},
        {"cachePoint": {"type": "default"}},
        {"text": "task"},
    ]
    skill_prompt.turn_cache_points_off()
    assert compose_system(long, "task") == [{"text": long.text}, {"text": "task"}]
    assert compose_system_text(short, "task") == short.text + "\n\ntask"


# --- loading the owner's skills -------------------------------------------------------------------------------


def _owner_item(store: db.Store, s3_client: FakeS3, name: str, data: bytes, **fields: Any) -> dict[str, Any]:
    skill_id = fields.pop("skillId", None) or ulid()
    fmt = fields.pop("format", "md")
    key = fields.pop("key", None) or s3.skill_key(USER, skill_id, ulid(), fmt)
    s3_client.objects[key] = data
    item = {
        "pk": db.user_pk(USER),
        "sk": db.skill_sk(skill_id),
        "type": "skill",
        "userId": USER,
        "skillId": skill_id,
        "name": name,
        "description": "d",
        "builtin": False,
        "format": fmt,
        "size": len(data),
        "createdAt": "2026-11-01T00:00:00.000Z",
        "version": 1,
        "key": key,
        **fields,
    }
    store.put(item)
    return item


def _media(s3_client: FakeS3) -> s3.Media:
    return s3.Media(s3_client, "cf-prod-media-123")


def test_load_skills_reads_every_skill_and_caches_by_key(store: db.Store, s3_client: FakeS3, builtin_dir: Path) -> None:
    _owner_item(store, s3_client, "funny-moments-first", OWNER_MD.encode())
    _owner_item(store, s3_client, "old-rules", OLD_MD.encode(), enabled=False, type=None, version=None)
    zipped = io.BytesIO()
    with zipfile.ZipFile(zipped, "w") as z:
        z.writestr("zipped/SKILL.md", "---\nname: zipped\ndescription: z\n---\nZ\n")
        z.writestr("zipped/extra.md", "not in the block")
    _owner_item(store, s3_client, "zipped", zipped.getvalue(), format="zip")
    store.put(
        {
            "pk": db.user_pk(USER),
            "sk": "SKILL#builtin-short-form-video-playbook",
            "type": "skill_choice",
            "builtin": True,
            "enabled": False,
        }
    )
    builtins = lambda: load_builtins(builtin_dir)  # noqa: E731
    docs = load_skills(store, _media(s3_client), USER, builtins=builtins)
    assert [(d.name, d.builtin) for d in docs] == [
        ("short-form-video-playbook", True),
        ("funny-moments-first", False),
        ("old-rules", False),
        ("zipped", False),
    ]
    assert docs[3].text.endswith("Z\n")
    assert len(s3_client.reads) == 3
    load_skills(store, _media(s3_client), USER, builtins=builtins)
    assert len(s3_client.reads) == 3  # the second call reads S3 zero times


def test_legacy_keys_are_cached_by_version(store: db.Store, s3_client: FakeS3) -> None:
    skill_id = ulid()
    key = s3.legacy_skill_key(USER, skill_id, "md")
    _owner_item(store, s3_client, "old-rules", OLD_MD.encode(), skillId=skill_id, key=key)
    load_skills(store, _media(s3_client), USER, builtins=list)
    load_skills(store, _media(s3_client), USER, builtins=list)
    assert s3_client.reads == [key]
    store.update(db.user_pk(USER), db.skill_sk(skill_id), {"version": 2})
    load_skills(store, _media(s3_client), USER, builtins=list)
    assert s3_client.reads == [key, key]


def test_load_skills_skips_oversize_missing_denied_and_broken(store: db.Store, s3_client: FakeS3) -> None:
    _owner_item(store, s3_client, "too-big-item", OWNER_MD.encode(), size=21 * 1024 * 1024)
    _owner_item(store, s3_client, "too-big-file", b"x" * (1024 * 1024 + 1))
    missing = _owner_item(store, s3_client, "missing", OWNER_MD.encode())
    del s3_client.objects[missing["key"]]
    denied = _owner_item(store, s3_client, "denied", OWNER_MD.encode())
    s3_client.read_errors[denied["key"]] = [client_error("AccessDenied", 403)]
    _owner_item(store, s3_client, "broken-zip", b"not a zip", format="zip")
    # an older zip with a password-locked member: the agent cannot unpack it, so the API leaves it out too
    _owner_item(store, s3_client, "locked-zip", LOCKED, format="zip")
    _owner_item(store, s3_client, "fine", OWNER_MD.encode())
    docs = load_skills(store, _media(s3_client), USER, builtins=list)
    assert [d.name for d in docs] == ["fine"]


def test_load_skills_retries_then_raises(store: db.Store, s3_client: FakeS3) -> None:
    item = _owner_item(store, s3_client, "flaky", OWNER_MD.encode())
    s3_client.read_errors[item["key"]] = [client_error("SlowDown", 503) for _ in range(3)]
    sleeps: list[float] = []
    docs = load_skills(store, _media(s3_client), USER, builtins=list, sleep=sleeps.append)
    assert [d.name for d in docs] == ["flaky"]
    assert len(sleeps) == 3
    skill_prompt.FILE_CACHE.clear()
    s3_client.read_errors[item["key"]] = [client_error("InternalError", 500) for _ in range(4)]
    with pytest.raises(Exception, match="InternalError"):
        load_skills(store, _media(s3_client), USER, builtins=list, sleep=sleeps.append)


def test_file_cache_bounds() -> None:
    cache = skill_prompt._FileCache(max_entries=2, max_bytes=10)
    cache.put(("a", 0), "aaaa")
    cache.put(("b", 0), "bbbb")
    assert cache.get(("a", 0)) == "aaaa"
    cache.put(("c", 0), "cccc")  # over 2 entries: the least recently used (b) goes
    assert cache.get(("b", 0)) is None
    cache.put(("d", 0), "dddddddd")  # over 10 bytes: a and c go
    assert cache.get(("a", 0)) is None
    assert cache.get(("d", 0)) == "dddddddd"
    cache.put(("huge", 0), "x" * 11)
    assert cache.get(("huge", 0)) is None


# --- every API model call gets the block ----------------------------------------------------------------------


def _assert_block_first(request: dict[str, Any], task: str) -> None:
    system = request["system"]
    assert system[0]["text"].startswith('<owner_skills count="3">')
    assert '<skill name="short-form-video-playbook" source="built-in">' in system[0]["text"]
    assert "Pick the loudest laughs." in system[0]["text"]
    assert "Never swear." in system[0]["text"]  # a legacy item turned "off" is used too
    assert system[-1] == {"text": task}
    assert sum(part.get("text", "").count("<owner_skills") for part in system) == 1


def test_ask_week_sends_the_block_first(store: db.Store, s3_client: FakeS3, builtin_dir: Path) -> None:
    from test_weeks import WEEK, kept, seed_week

    _owner_item(store, s3_client, "funny-moments-first", OWNER_MD.encode())
    _owner_item(store, s3_client, "old-rules", OLD_MD.encode(), enabled=False)
    a = kept(store, hook="He lost it")
    seed_week(store, [a["clipId"]])
    bedrock = FakeBedrock("Pick rage hooks.")
    deps = weekly.WeeklyDeps(
        store=store,
        bedrock=bedrock,
        model_id="m",
        vectors=None,
        media=_media(s3_client),
        clock=Clock(),
        sleep=lambda _s: None,
        builtins=lambda: load_builtins(builtin_dir),
    )
    assert weekly.learn_week(deps, USER, WEEK, 1)["outcome"] == "learning"
    (request,) = bedrock.calls
    _assert_block_first(request, learn.WEEK_SYSTEM_PROMPT)


def test_week_fails_rather_than_asking_without_skills(store: db.Store, s3_client: FakeS3) -> None:
    from test_weeks import WEEK, kept, seed_week

    item = _owner_item(store, s3_client, "flaky", OWNER_MD.encode())
    s3_client.read_errors[item["key"]] = [client_error("InternalError", 500) for _ in range(4)]
    a = kept(store)
    seed_week(store, [a["clipId"]])
    bedrock = FakeBedrock()
    deps = weekly.WeeklyDeps(
        store=store,
        bedrock=bedrock,
        model_id="m",
        vectors=None,
        media=_media(s3_client),
        sleep=lambda _s: None,
        builtins=list,
    )
    assert weekly.learn_week(deps, USER, WEEK, 1)["outcome"] == "failed"
    assert bedrock.calls == []


def test_long_block_gets_a_cache_point() -> None:
    bedrock = FakeBedrock()
    block = skills_block([doc("a", 9_000, True)])
    learn.converse_text(bedrock, "m", "task", "hi", max_chars=100, skills=block)
    assert bedrock.calls[0]["system"][1] == {"cachePoint": {"type": "default"}}


class _NoCacheBedrock(FakeBedrock):
    def converse(self, **kw: Any) -> dict[str, Any]:
        if any("cachePoint" in part for part in kw["system"]):
            self.calls.append(kw)
            err = client_error("ValidationException")
            err.response["Error"]["Message"] = "The model does not support cachePoint in system."
            raise err
        return super().converse(**kw)


def test_cache_point_refused_turns_them_off_and_retries() -> None:
    bedrock = _NoCacheBedrock()
    block = skills_block([doc("a", 9_000, True)])
    stop, text = learn.converse_text(bedrock, "m", "task", "hi", max_chars=100, skills=block)
    assert stop == "end_turn"
    assert text
    assert len(bedrock.calls) == 2
    assert not any("cachePoint" in part for part in bedrock.calls[1]["system"])
    assert not skill_prompt.cache_points_on()
    learn.converse_text(bedrock, "m", "task", "hi", max_chars=100, skills=block)
    assert len(bedrock.calls) == 3  # no second refusal: cache points stay off


def test_other_validation_errors_are_not_retried() -> None:
    class Broken(FakeBedrock):
        def converse(self, **kw: Any) -> dict[str, Any]:
            self.calls.append(kw)
            raise client_error("ValidationException")

    bedrock = Broken()
    with pytest.raises(Exception, match="ValidationException"):
        learn.converse_text(bedrock, "m", "task", "hi", max_chars=100, skills=skills_block([]))
    assert len(bedrock.calls) == 1
    assert skill_prompt.cache_points_on()


def test_left_out_names_are_listed_in_order() -> None:
    docs = [doc("a", 50_000, True), doc("b", 50_000), doc("c", 39_000), doc("d", 3_000), doc("f", 2_500)]
    block = skills_block(docs)
    assert '<skills_left_out names="d, f">' in block.text
    assert block.counts["omitted"] == 2
