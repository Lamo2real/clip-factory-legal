from __future__ import annotations

import io
import stat
import zipfile
from pathlib import Path

import pytest

from clipfactory_agent.skills import (
    SKILL_MAX_PROMPT_CHARS,
    SkillDoc,
    SkillError,
    compose_system,
    compose_system_text,
    extract_zip,
    parse_frontmatter,
    prepare_skills,
    safe_name,
    skills_block,
)

MD = b'---\nname: "My Rules"\ndescription: Owner rules\n---\n\n# Rules\nAlways tag @me\n'


def zip_bytes(files: dict[str, bytes], symlink: str | None = None) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, data in files.items():
            zf.writestr(name, data)
        if symlink:
            info = zipfile.ZipInfo(symlink)
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            zf.writestr(info, "/etc/passwd")
    return buf.getvalue()


def test_parse_frontmatter() -> None:
    meta, body = parse_frontmatter(MD.decode())
    assert meta == {"name": "My Rules", "description": "Owner rules"}
    assert body.startswith("# Rules")
    assert parse_frontmatter("no front matter") == ({}, "no front matter")
    assert parse_frontmatter("---\nname: x\nnever closed") == ({}, "---\nname: x\nnever closed")


def test_safe_name() -> None:
    assert safe_name("My Rules!") == "my-rules"
    assert safe_name("../../etc") == "etc"
    assert safe_name("???") == "skill"


def test_extract_zip_finds_skill_folder(tmp_path: Path) -> None:
    data = zip_bytes(
        {"pack/SKILL.md": MD, "pack/ref/notes.md": b"x", "other.txt": b"y", "__MACOSX/pack/._SKILL.md": b"z"}
    )
    out = extract_zip(data, tmp_path / "s")
    assert (out / "SKILL.md").read_bytes() == MD
    assert (out / "ref" / "notes.md").is_file()
    assert not (out / "other.txt").exists()


@pytest.mark.parametrize(
    ("files", "symlink", "why"),
    [
        ({"SKILL.md": MD, "../evil.md": b"x"}, None, "unsafe path"),
        ({"SKILL.md": MD, "/abs.md": b"x"}, None, "unsafe path"),
        ({"SKILL.md": MD}, "link", "symbolic link"),
        ({"a/SKILL.md": MD, "b/SKILL.md": MD}, None, "exactly one"),
        ({"README.md": b"x"}, None, "exactly one"),
        # the API's rules, checked on every member (so both packages accept the same zips)
        ({"SKILL.md": MD, "ref\\notes.md": b"x"}, None, "unsafe path"),
        ({"SKILL.md": MD, "__MACOSX/../x": b"x"}, None, "unsafe path"),
        ({"SKILL.md": MD, "C:/x.md": b"x"}, None, "unsafe path"),
        ({"SKILL.md": MD, "__MACOSX/SKILL.md": b"x"}, None, "exactly one"),
        ({"a/b/SKILL.md": MD}, None, "too deep"),
        ({"SKILL.md": MD + b"x" * (1024 * 1024)}, None, "larger than 1 MB"),
    ],
)
def test_extract_zip_refuses_unsafe(tmp_path: Path, files: dict[str, bytes], symlink: str | None, why: str) -> None:
    with pytest.raises(SkillError, match=why):
        extract_zip(zip_bytes(files, symlink), tmp_path / "s")
    assert not (tmp_path / "evil.md").exists()


def test_extract_zip_refuses_bombs_and_garbage(tmp_path: Path) -> None:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("SKILL.md", MD)
        zf.writestr("big.bin", b"\0" * (51 * 1024 * 1024))
    with pytest.raises(SkillError, match="too large"):
        extract_zip(buf.getvalue(), tmp_path / "s")
    with pytest.raises(SkillError, match="not a zip"):
        extract_zip(b"nope", tmp_path / "t")
    with pytest.raises(SkillError, match="too large"):
        extract_zip(b"PK" + b"\0" * (20 * 1024 * 1024), tmp_path / "u")
    many = zip_bytes({"SKILL.md": MD, **{f"d{i}/": b"" for i in range(500)}})
    with pytest.raises(SkillError, match="too many files"):  # folders count, as in the API
        extract_zip(many, tmp_path / "v")


def test_extract_zip_takes_one_big_file_the_api_takes(tmp_path: Path) -> None:
    """The API allows any member size while the zip is under 20 MB and unzips to under 50 MB; so does the agent."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("SKILL.md", MD)
        zf.writestr("ref/big.txt", b"a" * (30 * 1024 * 1024))
    out = extract_zip(buf.getvalue(), tmp_path / "s")
    assert (out / "ref" / "big.txt").stat().st_size == 30 * 1024 * 1024


def lock_member(data: bytes, name: str) -> bytes:
    """``data`` with the "password-locked" flag set on ``name`` in its local and central headers (as the API's test)."""
    buf = bytearray(data)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        offset = z.getinfo(name).header_offset
    buf[offset + 6] |= 0x1
    raw = name.encode()
    at = buf.find(b"PK\x01\x02")
    while at != -1:
        name_len = int.from_bytes(buf[at + 28 : at + 30], "little")
        if bytes(buf[at + 46 : at + 46 + name_len]) == raw:
            buf[at + 8] |= 0x1
        at = buf.find(b"PK\x01\x02", at + 4)
    return bytes(buf)


def test_extract_zip_refuses_password_locked_files(tmp_path: Path) -> None:
    data = lock_member(zip_bytes({"SKILL.md": MD, "ref/notes.md": b"x"}), "ref/notes.md")
    with pytest.raises(SkillError, match="password-locked"):
        extract_zip(data, tmp_path / "s")


def test_extract_zip_refuses_other_packing_methods(tmp_path: Path) -> None:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("SKILL.md", MD)
        zf.writestr("ref/notes.md", b"x" * 100, compress_type=zipfile.ZIP_BZIP2)
    with pytest.raises(SkillError, match="unsupported packing method"):
        extract_zip(buf.getvalue(), tmp_path / "s")


async def test_prepare_skills_uses_every_skill_whatever_enabled_says(tmp_path: Path) -> None:
    builtin = tmp_path / "app-skills"
    (builtin / "playbook").mkdir(parents=True)
    (builtin / "playbook" / "SKILL.md").write_text("---\nname: playbook\ndescription: core\n---\nBody")
    (builtin / "basics").mkdir()
    (builtin / "basics" / "SKILL.md").write_text("---\nname: basics\n---\nBasics")
    store = {
        "skills/u/1/r/SKILL.md": MD,
        "skills/u/2/r/skill.zip": zip_bytes({"z/SKILL.md": b"---\nname: zipped\n---\nZ", "z/a.txt": b"a"}),
        "skills/u/3/r/skill.zip": b"broken",
        "skills/u/4/SKILL.md": b"---\nname: legacy\n---\nOld row, switched off",
    }
    fetched: list[str] = []

    async def fetch(key: str) -> bytes:
        fetched.append(key)
        return store[key]

    def row(sid: str, name: str, key: str, **extra: object) -> dict[str, object]:
        fmt = "zip" if key.endswith(".zip") else "md"
        return {"skillId": sid, "name": name, "type": "skill", "format": fmt, "key": key, **extra}

    rows = [
        # the old built-in on/off choices are ignored: built-ins are always used
        {"sk": "SKILL#builtin-basics", "skillId": "builtin-basics", "type": "skill_choice", "enabled": False},
        row("2", "zipped", "skills/u/2/r/skill.zip", enabled=True, createdAt="1"),
        row("1", "my-rules", "skills/u/1/r/SKILL.md", enabled=False, createdAt="2"),
        row("3", "broken", "skills/u/3/r/skill.zip"),
        # written before §18: no type, enabled false, still used
        {"skillId": "4", "name": "legacy", "enabled": False, "builtin": False, "key": "skills/u/4/SKILL.md"},
        {"skillId": "5", "name": "no-file", "type": "skill"},  # no key: nothing to load
    ]
    work = tmp_path / "work"
    got = await prepare_skills(work, builtin, rows, fetch)
    # built-ins by name, then the owner's by name (not by createdAt)
    assert [d.name for d in got.docs] == ["basics", "playbook", "legacy", "my-rules", "zipped"]
    assert [d.builtin for d in got.docs] == [True, True, False, False, False]
    assert got.skipped == ["broken"]
    root = work / ".claude" / "skills"
    assert sorted(p.name for p in root.iterdir()) == ["basics", "legacy", "my-rules", "playbook", "zipped"]
    assert (root / "zipped" / "a.txt").read_text() == "a"
    assert not (work / ".skill-staging").exists()
    assert "Always tag @me" in got.full_text and "Old row, switched off" in got.full_text
    block = skills_block(got.docs)
    assert block.text.startswith('<owner_skills count="5">')
    assert '<skill name="my-rules" source="owner">' in block.text
    assert '<skill name="basics" source="built-in">' in block.text


async def test_prepare_skills_retries_a_fetch_three_times_then_skips(tmp_path: Path) -> None:
    from clipfactory_agent.util import TransientError

    calls = 0

    async def fetch(key: str) -> bytes:
        nonlocal calls
        calls += 1
        raise TransientError("S3 busy")

    import clipfactory_agent.retry as retry_mod

    async def no_sleep(_: float) -> None:
        return None

    real_sleep = retry_mod.asyncio.sleep
    retry_mod.asyncio.sleep = no_sleep  # type: ignore[assignment]
    try:
        got = await prepare_skills(
            tmp_path / "w", tmp_path / "none", [{"skillId": "1", "name": "a", "type": "skill", "key": "k"}], fetch
        )
    finally:
        retry_mod.asyncio.sleep = real_sleep  # type: ignore[assignment]
    assert calls == 3 and got.docs == [] and got.skipped == ["a"]


async def test_prepare_skills_drops_a_utf8_bom_like_the_api(tmp_path: Path) -> None:
    """The API reads skill text with utf-8-sig; the agent must too, or the frontmatter is lost and the blocks differ."""
    body = b"---\nname: b-skill\ndescription: From the file\n---\n\nUse my words.\n"
    store = {
        "skills/u/1/r/SKILL.md": b"\xef\xbb\xbf" + body,
        "skills/u/2/r/skill.zip": zip_bytes({"z/SKILL.md": b"\xef\xbb\xbf---\nname: c-zip\n---\nZ"}),
    }

    async def fetch(key: str) -> bytes:
        return store[key]

    rows = [
        {"skillId": "1", "name": "row-name", "description": "row", "type": "skill", "key": "skills/u/1/r/SKILL.md"},
        {"skillId": "2", "name": "zip-row", "type": "skill", "format": "zip", "key": "skills/u/2/r/skill.zip"},
    ]
    work = tmp_path / "work"
    got = await prepare_skills(work, tmp_path / "none", rows, fetch)
    assert [(d.name, d.description) for d in got.docs] == [("b-skill", "From the file"), ("c-zip", "")]
    assert all(not d.text.startswith("\ufeff") for d in got.docs)
    root = work / ".claude" / "skills"
    assert (root / "b-skill" / "SKILL.md").read_bytes() == body
    assert (root / "c-zip" / "SKILL.md").read_bytes().startswith(b"---")
    block = skills_block(got.docs)
    assert "\ufeff" not in block.text
    assert block.text == skills_block([SkillDoc("b-skill", "", body.decode(), False, "1"), got.docs[1]]).text


def test_skills_block_breaks_name_ties_by_skill_id() -> None:
    a = SkillDoc("same", "", "from z", False, "z")
    b = SkillDoc("same", "", "from a", False, "a")
    text = skills_block([a, b]).text
    assert text.index("from a") < text.index("from z")
    assert skills_block([b, a]).text == text


def doc(name: str, size: int, builtin: bool = False) -> SkillDoc:
    return SkillDoc(name, "", "y" * size, builtin)


def test_skills_block_empty() -> None:
    b = skills_block([])
    assert b.text == '<owner_skills count="0"></owner_skills>'
    assert b.counts == {
        "builtin": 0,
        "owner": 0,
        "included": 0,
        "truncated": 0,
        "omitted": 0,
        "notes": 0,
        "chars": len(b.text),
    }


def test_skills_block_cuts_each_skill_and_keeps_to_the_budget() -> None:
    docs = [
        doc("a-builtin", 50_000, True),  # cut to 40,000
        doc("b-owner", 39_000),  # fits: 79,000 used
        doc("c-owner", 39_000),  # fits: 118,000 used
        doc("d-owner", 1_500),  # 2,000 left: fits whole
        doc("e-owner", 3_000),  # 500 left: under 2,000, left out
        doc("f-owner", 3_000),  # left out
    ]
    b = skills_block(docs)
    assert b.text.count("…(shortened)") == 1
    assert '<skill name="d-owner"' in b.text and '<skill name="e-owner"' not in b.text
    assert (
        '<skills_left_out names="e-owner, f-owner">These skills were too long to fit this time.</skills_left_out>'
        in (b.text)
    )
    assert b.text.startswith('<owner_skills count="4">\nThese are the owner')
    assert b.text.endswith("</skills_left_out>\n</owner_skills>")
    assert b.counts == {
        "builtin": 1,
        "owner": 5,
        "included": 4,
        "truncated": 1,
        "omitted": 2,
        "notes": 0,
        "chars": len(b.text),
    }


def test_skills_block_cuts_to_what_is_left_when_at_least_2000() -> None:
    b = skills_block([doc("a", 40_000, True), doc("b", 40_000), doc("c", 37_000), doc("d", 9_000)])
    # 3,000 left for d: cut so that it, with its "shortened" mark, is exactly 3,000 characters
    kept = 3_000 - len("\n…(shortened)")
    assert '<skill name="d" source="owner">\n' + "y" * kept + "\n…(shortened)\n</skill>\n</owner_skills>" in b.text
    assert b.counts["truncated"] == 1 and b.counts["omitted"] == 0


def test_skills_block_puts_built_ins_first_then_owner_skills_by_name() -> None:
    b = skills_block([doc("zeta", 5), doc("alpha", 5), doc("x-builtin", 5, True), doc("b-builtin", 5, True)])
    order = [b.text.index(f'name="{n}"') for n in ("b-builtin", "x-builtin", "alpha", "zeta")]
    assert order == sorted(order)


def test_skills_block_logs_counts(capsys: pytest.CaptureFixture[str]) -> None:
    skills_block([doc("a", 10, True)], where="agent.job")
    line = capsys.readouterr().out
    assert '"event": "skills.block"' in line and '"where": "agent.job"' in line and '"included": 1' in line


def golden_docs() -> list[SkillDoc]:
    """The three fixture skills behind tests/fixtures/skills_block_golden.txt (the API package uses the same)."""
    return [
        SkillDoc(
            "short-form-video-playbook",
            "How to pick and edit short clips.",
            "---\nname: short-form-video-playbook\ndescription: How to pick and edit short clips.\n---\n\n"
            "# Playbook\n\nOpen on the payoff.\n",
            True,
        ),
        SkillDoc(
            "funny-moments-first",
            "Every time it picks moments.",
            '---\nname: funny-moments-first\ndescription: "Every time it picks moments."\n---\n\n'
            "# Funny moments first\r\n\r\nPick the moments where I laugh the loudest.\r\n",
            False,
        ),
        SkillDoc(
            "long-rules",
            "Very long.",
            "---\nname: long-rules\ndescription: Very long.\n---\n\n" + "abcdefghij" * 4_100 + "\n",
            False,
        ),
    ]


def test_skills_block_matches_the_shared_golden_file() -> None:
    golden = (Path(__file__).parent / "fixtures" / "skills_block_golden.txt").read_bytes()
    assert skills_block(golden_docs()).text.encode("utf-8") == golden
    assert len(golden_docs()[2].text) > SKILL_MAX_PROMPT_CHARS


def test_compose_system_puts_the_block_first_and_caches_long_ones() -> None:
    short = skills_block([doc("a", 100, True)])
    assert compose_system(short, "task") == [{"text": short.text}, {"text": "task"}]
    long = skills_block([doc("a", 9_000, True)])
    assert compose_system(long, "task") == [{"text": long.text}, {"cachePoint": {"type": "default"}}, {"text": "task"}]
    assert compose_system(long, "task", cache_point=False) == [{"text": long.text}, {"text": "task"}]
    assert compose_system_text(short, "task") == short.text + "\n\ntask"
