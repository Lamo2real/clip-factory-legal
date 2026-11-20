"""The owner's copy of a built-in skill that lacks a newer part (docs/CONTRACTS.md §38): every model call of a job
still gets the built-in's Chat guidance, as a small separate note right after his skill, until he adds it."""

from __future__ import annotations

import shutil
from pathlib import Path

from clipfactory_agent.skill_sections import SECTIONS, insert_section, missing_sections, section_text
from clipfactory_agent.skills import prepare_skills, skills_block

REPO = Path(__file__).resolve().parents[2]
BUILTIN_PATH = REPO / "skills" / "viral-clip-editing" / "SKILL.md"
BUILTIN = BUILTIN_PATH.read_text("utf-8")
CHAT = SECTIONS[0]
PART = section_text(BUILTIN, CHAT) or ""
NOTE_GOLDEN = Path(__file__).parent / "fixtures" / "skills_block_note_golden.txt"


def his_copy() -> str:
    """The built-in from before the Chat part, renamed, with a few of his own changes (as the API's test)."""
    text = BUILTIN.replace(PART + "\n\n", "")
    text = text.replace("name: viral-clip-editing", "name: my-clip-rules", 1)
    text = text.replace("- **6 to 8 words.**", "- **5 to 7 words.** (my rule)")
    text = text.replace('**Viewers:** the "most replayed" peaks show what people already went back to watch.\n', "")
    return text + "\n## 9. My own rule\n\nAlways keep the GTA police chases short.\n"


def test_the_builtin_still_has_the_chat_part() -> None:
    assert PART.startswith('**Chat** (the "Chat spikes" line)')
    assert "### Skip these" not in PART


async def _job_block(tmp_path: Path, owner_text: str) -> str:
    builtin = tmp_path / "app-skills"
    (builtin / "viral-clip-editing").mkdir(parents=True)
    shutil.copy(BUILTIN_PATH, builtin / "viral-clip-editing" / "SKILL.md")
    files = {"skills/u/1/r/SKILL.md": owner_text.encode()}

    async def fetch(key: str) -> bytes:
        return files[key]

    rows = [{"skillId": "1", "name": "my-clip-rules", "type": "skill", "format": "md", "key": "skills/u/1/r/SKILL.md"}]
    got = await prepare_skills(tmp_path / "work", builtin, rows, fetch)
    return skills_block(got.docs, where="agent.job").text


async def test_a_job_gets_the_chat_note_after_his_copy(tmp_path: Path) -> None:
    text = await _job_block(tmp_path, his_copy())
    assert text.startswith('<owner_skills count="2">')
    mine = text.index('<skill name="my-clip-rules" source="owner">')
    note = text.index('<skill_note skill="my-clip-rules" part="viral-clip-editing/chat@1">')
    assert mine < note < text.index("</owner_skills>")
    note_text = text[note : text.index("</skill_note>") + len("</skill_note>")]
    assert PART not in note_text and "his words win" in note_text  # a pointer: the built-in is in the call already
    # the same note, byte for byte, as the API's builder (shared golden file)
    assert note_text == NOTE_GOLDEN.read_text("utf-8")
    # his own words are all still there, untouched
    assert "(my rule)" in text and "Always keep the GTA police chases short." in text


async def test_no_note_once_he_added_it_or_for_other_skills(tmp_path: Path) -> None:
    added = insert_section(his_copy(), PART, CHAT)
    assert missing_sections([("viral-clip-editing", BUILTIN)], added) == []
    assert "<skill_note" not in await _job_block(tmp_path / "a", added)
    other = "---\nname: my-clip-rules\ndescription: Mine.\n---\n\nPick the loud parts.\n"
    assert "<skill_note" not in await _job_block(tmp_path / "b", other)


def test_the_note_is_counted_but_not_as_a_skill() -> None:
    from clipfactory_agent.skills import SkillDoc

    block = skills_block(
        [SkillDoc("viral-clip-editing", "", BUILTIN, True), SkillDoc("my-clip-rules", "", his_copy(), False)]
    )
    assert block.counts["included"] == 2 and block.counts["notes"] == 1
