"""New parts of a built-in skill for the owner's own copy of it (docs/CONTRACTS.md §38): finding a copy that lacks
the Chat part, adding it without changing a word of his, Undo, Not now, and the note every model call gets."""

from __future__ import annotations

import io
import shutil
import zipfile
from pathlib import Path

import pytest

from clipfactory_api import skill_prompt, skill_sections
from clipfactory_api.skill_prompt import SkillDoc, skills_block
from clipfactory_api.skill_sections import (
    SECTIONS,
    insert_section,
    insertion,
    missing_sections,
    remove_section,
    section_text,
)
from conftest import BUILTIN_MD, Call
from fakes import FakeS3
from test_skills import _upload, make_zip

REPO = Path(__file__).resolve().parents[2]
BUILTIN_PATH = REPO / "skills" / "viral-clip-editing" / "SKILL.md"
BUILTIN = BUILTIN_PATH.read_text("utf-8")
CHAT = SECTIONS[0]
PART = section_text(BUILTIN, CHAT)
NOTE_GOLDEN = Path(__file__).parent / "fixtures" / "skills_block_note_golden.txt"


def his_copy(*, rename: str = "my-clip-rules") -> str:
    """The built-in as it was before the Chat part, renamed (a built-in's name is Clip Factory's) and with a few of
    his own changes: a new rule, a changed limit and a line taken out."""
    assert PART is not None
    text = BUILTIN.replace(PART + "\n\n", "")
    text = text.replace("name: viral-clip-editing", f"name: {rename}", 1)
    text = text.replace("- **6 to 8 words.**", "- **5 to 7 words.** (my rule)")
    text = text.replace('**Viewers:** the "most replayed" peaks show what people already went back to watch.\n', "")
    return text + "\n## 9. My own rule\n\nAlways keep the GTA police chases short.\n"


@pytest.fixture(autouse=True)
def _fresh_cache() -> None:
    skill_prompt.FILE_CACHE.clear()


@pytest.fixture
def builtin_dir(tmp_path: Path) -> Path:
    """The usual test built-in plus the real viral-clip-editing skill."""
    root = tmp_path / "builtin"
    (root / "short-form-video-playbook").mkdir(parents=True)
    (root / "short-form-video-playbook" / "SKILL.md").write_text(BUILTIN_MD)
    (root / "viral-clip-editing").mkdir()
    shutil.copy(BUILTIN_PATH, root / "viral-clip-editing" / "SKILL.md")
    return root


# --- the pure part --------------------------------------------------------------------------------------------


def test_the_builtin_has_every_listed_part() -> None:
    for s in SECTIONS:
        part = section_text(BUILTIN, s) if s.skill == "viral-clip-editing" else None
        assert part, s.key
        assert skill_sections.has_section(part, s)
        assert part.startswith("**Chat**")
        assert part.endswith("unless it is one clean word.")


def test_both_packages_have_the_same_module() -> None:
    api = (REPO / "api" / "src" / "clipfactory_api" / "skill_sections.py").read_bytes()
    agent = (REPO / "agent" / "src" / "clipfactory_agent" / "skill_sections.py").read_bytes()
    assert api == agent


def test_a_copy_without_the_chat_part_is_found() -> None:
    (gap,) = missing_sections([("viral-clip-editing", BUILTIN)], his_copy())
    assert gap.section is CHAT
    assert gap.text == PART


def test_no_offer_when_he_has_it_or_it_is_not_a_copy() -> None:
    builtins = [("viral-clip-editing", BUILTIN)]
    assert missing_sections(builtins, BUILTIN) == []  # the built-in itself has it
    assert missing_sections(builtins, his_copy() + "\nWatch the Chat spikes line too.\n") == []  # his own words
    assert missing_sections(builtins, "---\nname: a\ndescription: d\n---\n\nPick the loud parts.\n") == []
    assert missing_sections([("other-skill", BUILTIN)], his_copy()) == []  # no later parts listed for it


def test_insert_keeps_every_word_of_his_and_lands_before_skip_these() -> None:
    mine = his_copy()
    new = insert_section(mine, PART, CHAT)  # type: ignore[arg-type]
    assert new != mine
    at = new.index(PART)  # type: ignore[arg-type]
    assert new[:at] + new[at + len(PART) :].removeprefix("\n\n") == mine  # type: ignore[arg-type]
    assert new.index("### Reading the signals") < at < new.index("### Skip these")
    assert "- **5 to 7 words.** (my rule)" in new
    assert "Always keep the GTA police chases short." in new
    assert missing_sections([("viral-clip-editing", BUILTIN)], new) == []


@pytest.mark.parametrize(
    "mine",
    [
        "# Mine\n\n### Reading the signals\n\nLoud is good.\n### Skip these\n- menus\n",  # no blank line before
        "# Mine\n\n### Reading the signals\n\nLoud is good.\n\n## 2. Next\n\nMore.\n",  # under the heading
        "# Mine\n\n### Reading the signals\n\nLoud is good.",  # at the end, no newline at the end
        "# Mine\n\nNothing like it here.\n",  # no place: at the very end
        "# Mine\n\nEnds with blank lines.\n\n",
        "",
    ],
)
def test_insert_then_remove_gives_his_text_back_exactly(mine: str) -> None:
    at, added = insertion(mine, PART, CHAT)  # type: ignore[arg-type]
    new = insert_section(mine, PART, CHAT)  # type: ignore[arg-type]
    assert new == mine[:at] + added + mine[at:]
    assert PART in added
    assert remove_section(new, at, added) == mine
    if "## 2. Next" in mine:
        assert new.index(PART) < new.index("## 2. Next")  # type: ignore[arg-type]


def test_remove_refuses_when_he_changed_the_text_around_it() -> None:
    mine = "# Mine\n\n### Skip these\n- menus\n"
    at, added = insertion(mine, PART, CHAT)  # type: ignore[arg-type]
    new = insert_section(mine, PART, CHAT)  # type: ignore[arg-type]
    assert remove_section(new.replace(PART, PART + " Mine too."), at, added) is None  # type: ignore[arg-type]
    assert remove_section("Typed above. " + new, at, added) is None
    assert remove_section("# Mine\n", at, added) is None


def test_the_note_goes_after_his_skill_only_while_he_lacks_the_part() -> None:
    docs = [
        SkillDoc("viral-clip-editing", True, BUILTIN, "builtin-viral-clip-editing"),
        SkillDoc("my-clip-rules", False, his_copy(), "01"),
    ]
    block = skills_block(docs)
    assert block.counts["notes"] == 1
    assert block.counts["included"] == 2
    assert block.text.startswith('<owner_skills count="2">')
    mine = block.text.index('<skill name="my-clip-rules" source="owner">')
    note = block.text.index('<skill_note skill="my-clip-rules" part="viral-clip-editing/chat@1">')
    assert mine < note
    assert PART not in block.text[note:]  # a pointer: the built-in's own Chat part is in the block already
    assert "his words win" in block.text[note:]
    assert NOTE_GOLDEN.read_text("utf-8") == block.text[note : block.text.index("</skill_note>") + len("</skill_note>")]
    added = insert_section(his_copy(), PART, CHAT)  # type: ignore[arg-type]
    again = skills_block([docs[0], SkillDoc("my-clip-rules", False, added, "01")])
    assert "<skill_note" not in again.text
    assert again.counts["notes"] == 0


# --- the API --------------------------------------------------------------------------------------------------


def _his(call: Call, s3_client: FakeS3, *, zipped: bool = False) -> str:
    text = his_copy()
    if zipped:
        data = make_zip({"my-clip-rules/SKILL.md": text, "my-clip-rules/notes.txt": "keep me"})
        status, body = _upload(call, s3_client, "skill.zip", data)
    else:
        status, body = _upload(call, s3_client, "SKILL.md", text.encode())
    assert status == 201, body
    return str(body["skill"]["skillId"])  # type: ignore[index]


def _stored(s3_client: FakeS3, skill_id: str) -> bytes:
    (key,) = [k for k in s3_client.objects if skill_id in k]
    return s3_client.objects[key]


def test_list_and_detail_offer_the_chat_part(call: Call, s3_client: FakeS3) -> None:
    skill_id = _his(call, s3_client)
    _, body = call("GET", "/v1/skills")
    mine = next(s for s in body["skills"] if s["skillId"] == skill_id)
    (offer,) = mine["newSections"]
    assert offer["key"] == "viral-clip-editing/chat@1"
    assert (offer["title"], offer["builtinTitle"], offer["builtinId"]) == (
        "Chat went wild",
        "Viral clip editing",
        "builtin-viral-clip-editing",
    )
    assert offer["text"] == PART
    assert offer["notNow"] is False
    assert offer["preview"]["after"][0] == "### Skip these"
    assert all("newSections" not in s for s in body["skills"] if s["skillId"] != skill_id)
    _, detail = call("GET", f"/v1/skills/{skill_id}")
    assert detail["newSections"] == [offer]


def test_add_keeps_his_text_and_undo_puts_it_back(call: Call, s3_client: FakeS3) -> None:
    skill_id = _his(call, s3_client)
    before = _stored(s3_client, skill_id).decode()
    path = f"/v1/skills/{skill_id}/sections"
    status, out = call("POST", path, {"key": CHAT.key, "action": "add", "version": 1})
    assert status == 200, out
    assert (out["skill"]["version"], out["newSections"]) == (2, [])
    after = _stored(s3_client, skill_id).decode()
    assert after == insert_section(before, PART, CHAT)  # type: ignore[arg-type]
    assert out["skill"]["size"] == len(after.encode())
    assert out["skill"]["name"] == "my-clip-rules"  # his name, title and description stay
    _, detail = call("GET", f"/v1/skills/{skill_id}")
    assert detail["newSections"] == []
    assert PART in detail["content"]
    # adding twice is refused, and an old version is refused
    assert call("POST", path, {"key": CHAT.key, "action": "add", "version": 2})[0] == 409
    assert call("POST", path, {"key": CHAT.key, "action": "undo", "version": 1})[0] == 409
    status, out = call("POST", path, {"key": CHAT.key, "action": "undo", "version": 2})
    assert status == 200, out
    assert _stored(s3_client, skill_id).decode() == before
    assert out["skill"]["version"] == 3
    assert len(out["newSections"]) == 1


def test_add_in_a_zip_keeps_the_other_files(call: Call, s3_client: FakeS3) -> None:
    skill_id = _his(call, s3_client, zipped=True)
    status, out = call("POST", f"/v1/skills/{skill_id}/sections", {"key": CHAT.key, "action": "add", "version": 1})
    assert status == 200, out
    with zipfile.ZipFile(io.BytesIO(_stored(s3_client, skill_id))) as z:
        assert z.read("my-clip-rules/notes.txt") == b"keep me"
        assert PART in z.read("my-clip-rules/SKILL.md").decode()  # type: ignore[operator]


def test_not_now_is_remembered_and_changes_nothing_else(call: Call, s3_client: FakeS3) -> None:
    skill_id = _his(call, s3_client)
    before = _stored(s3_client, skill_id)
    status, out = call("POST", f"/v1/skills/{skill_id}/sections", {"key": CHAT.key, "action": "not_now"})
    assert status == 200, out
    assert [o["notNow"] for o in out["newSections"]] == [True]
    assert out["skill"]["version"] == 1
    assert _stored(s3_client, skill_id) == before
    _, body = call("GET", "/v1/skills")  # the Skills list stops asking
    assert all("newSections" not in s for s in body["skills"])
    _, detail = call("GET", f"/v1/skills/{skill_id}")  # the skill's own page still offers it, in a small note
    assert [(o["key"], o["notNow"]) for o in detail["newSections"]] == [(CHAT.key, True)]
    # Not now twice is fine; Add still works afterwards (from the skill's own page)
    assert call("POST", f"/v1/skills/{skill_id}/sections", {"key": CHAT.key, "action": "not_now"})[0] == 200
    assert call("POST", f"/v1/skills/{skill_id}/sections", {"key": CHAT.key, "action": "add", "version": 1})[0] == 200


def test_section_rules(call: Call, s3_client: FakeS3) -> None:
    skill_id = _his(call, s3_client)
    path = f"/v1/skills/{skill_id}/sections"
    assert call("POST", path, {"key": CHAT.key, "action": "delete", "version": 1})[0] == 400
    assert call("POST", path, {"key": "viral-clip-editing/nope@1", "action": "add", "version": 1})[0] == 400
    assert call("POST", path, {"key": CHAT.key, "action": "add"})[0] == 400  # no version
    assert call("POST", path, {"key": CHAT.key, "action": "add", "version": 1, "extra": 1})[0] == 400
    assert (
        call(
            "POST", "/v1/skills/builtin-viral-clip-editing/sections", {"key": CHAT.key, "action": "add", "version": 1}
        )[0]
        == 409
    )
    assert call("POST", f"/v1/skills/{'0' * 26}/sections", {"key": CHAT.key, "action": "add", "version": 1})[0] == 404


def test_a_note_counts_against_the_budget_and_each_copy_gets_one() -> None:
    docs = [
        SkillDoc("viral-clip-editing", True, BUILTIN, "builtin-viral-clip-editing"),
        SkillDoc("my-clip-rules", False, his_copy(), "01"),
        SkillDoc("my-other-rules", False, his_copy(rename="my-other-rules"), "02"),
    ]
    block = skills_block(docs)
    assert block.counts["notes"] == 2
    assert block.text.count("<skill_note ") == 2
    assert len(block.text) < 2 * len(his_copy()) + len(BUILTIN) + 2_000  # pointers only, not the part twice more
    # the notes use up budget: a big owner skill after the built-in is cut a little shorter for each one
    big = SkillDoc("zz-big", False, "x" * 39_000, "03")
    plain = skills_block([docs[0], big])
    with_note = skills_block([docs[0], docs[1], big])
    assert with_note.counts["chars"] - plain.counts["chars"] < len(his_copy()) + 1_000


def test_a_file_with_a_bom_and_windows_lines_keeps_every_byte_he_wrote() -> None:
    mine = his_copy().replace("\n", "\r\n")
    at, added = insertion(mine, PART, CHAT)  # type: ignore[arg-type]
    new = mine[:at] + added + mine[at:]
    assert "\r\n" in added and "\n" not in added.replace("\r\n", "")  # the part follows his line ends
    assert new.replace("\r\n", "\n") == insert_section(his_copy(), PART, CHAT)  # type: ignore[arg-type]
    assert remove_section(new, at, added) == mine


def test_add_and_undo_keep_a_byte_order_mark_and_crlf(call: Call, s3_client: FakeS3) -> None:
    raw = b"\xef\xbb\xbf" + his_copy().replace("\n", "\r\n").encode()
    status, body = _upload(call, s3_client, "SKILL.md", raw)
    assert status == 201, body
    skill_id = str(body["skill"]["skillId"])  # type: ignore[index]
    path = f"/v1/skills/{skill_id}/sections"
    assert call("POST", path, {"key": CHAT.key, "action": "add", "version": 1})[0] == 200
    added = _stored(s3_client, skill_id)
    assert added.startswith(b"\xef\xbb\xbf") and b"\n" not in added.replace(b"\r\n", b"")
    assert call("POST", path, {"key": CHAT.key, "action": "undo", "version": 2})[0] == 200
    assert _stored(s3_client, skill_id) == raw


def test_add_is_refused_for_a_skill_that_is_not_a_copy(call: Call, s3_client: FakeS3) -> None:
    other = "---\nname: my-notes\ndescription: Mine.\n---\n\nPick the loud parts.\n"
    status, body = _upload(call, s3_client, "SKILL.md", other.encode())
    skill_id = str(body["skill"]["skillId"])  # type: ignore[index]
    before = _stored(s3_client, skill_id)
    status, out = call("POST", f"/v1/skills/{skill_id}/sections", {"key": CHAT.key, "action": "add", "version": 1})
    assert status == 409, out
    assert _stored(s3_client, skill_id) == before


def test_undo_is_refused_after_he_edited_the_skill(call: Call, s3_client: FakeS3) -> None:
    skill_id = _his(call, s3_client)
    path = f"/v1/skills/{skill_id}/sections"
    assert call("POST", path, {"key": CHAT.key, "action": "add", "version": 1})[0] == 200
    _, detail = call("GET", f"/v1/skills/{skill_id}")
    edited = (detail["content"] + "\nOne more rule of mine inside.\n").replace(PART, PART + " Mine too.")  # type: ignore[operator]
    _, presign = _upload(call, s3_client, "SKILL.md", edited.encode(), skill_id=skill_id)
    status, body = call("PUT", f"/v1/skills/{skill_id}", {"version": 2, "key": presign["key"]})
    assert status == 200, body
    status, out = call("POST", path, {"key": CHAT.key, "action": "undo", "version": 3})
    assert status == 409, out
    assert "cannot be undone" in out["error"]["message"]


def test_add_is_refused_when_the_part_would_make_it_too_long(call: Call, s3_client: FakeS3) -> None:
    from clipfactory_api import skills

    mine = his_copy()
    big = mine + "\n" + "x" * (skills.MD_MAX_BYTES - len(mine.encode()) - 100)
    status, body = _upload(call, s3_client, "SKILL.md", big.encode())
    assert status == 201, body
    skill_id = str(body["skill"]["skillId"])  # type: ignore[index]
    before = _stored(s3_client, skill_id)
    status, out = call("POST", f"/v1/skills/{skill_id}/sections", {"key": CHAT.key, "action": "add", "version": 1})
    assert status == 413, out
    assert _stored(s3_client, skill_id) == before


def test_not_now_for_a_skill_deleted_meanwhile_is_a_plain_404(call: Call, s3_client: FakeS3) -> None:
    assert call("POST", f"/v1/skills/{'0' * 26}/sections", {"key": CHAT.key, "action": "not_now"})[0] == 404
