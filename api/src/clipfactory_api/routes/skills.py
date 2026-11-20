"""/v1/skills: create, read, update and delete skills (docs/CONTRACTS.md §5, §18).

Every skill (built-in and the owner's) is always used: there is no on/off switch (§18.1). Built-ins ship with the
package and can be read, never changed or deleted. The owner's skills are written in the app (three questions) or
uploaded as a SKILL.md or a zip. Every saved file gets its own revision key, so a key never changes content.
"""

from __future__ import annotations

import codecs
import zipfile
from typing import Any

from .. import db, s3, skill_sections, skills, validate
from ..app import App
from ..clock import iso
from ..errors import ApiError, bad_request, conflict, not_found, too_large
from ..http import Request, Response, no_content, ok
from ..ids import is_ulid, ulid
from ..log import log
from ..skill_prompt import owner_items, read_skill_text

CONTENT_TYPES = {"md": "text/markdown", "zip": "application/zip"}
LIMITS = {"md": skills.MD_MAX_BYTES, "zip": skills.ZIP_MAX_BYTES}
SKILL_FIELDS = (
    "skillId",
    "name",
    "title",
    "description",
    "builtin",
    "source",
    "format",
    "size",
    "createdAt",
    "updatedAt",
    "version",
)
FORM_KEYS = frozenset({"title", "description", "instructions"})
NO_SWITCH = "Skills are always used now, so there is no switch."
BUILTIN_LOCKED = "Built-in skills are part of Clip Factory. You can read them, but not change or delete them."
NOT_FOUND = "We could not find that skill."
NOT_YOURS = "That upload does not belong to you."
STALE = "This skill was changed somewhere else. Load the newest one, then save again."
MAX_FILES_LISTED = 500


def _public(item: dict[str, Any]) -> dict[str, Any]:
    """The Skill shape of §5 for an owner item; fields missing on items written before §18 get their defaults."""
    name = str(item.get("name") or "")
    created = str(item.get("createdAt") or "")
    view = {
        "skillId": item.get("skillId"),
        "name": name,
        "title": item.get("title") or skills.humanize(name),
        "description": item.get("description", ""),
        "builtin": False,
        "source": item.get("source") or "upload",
        "format": item.get("format") or "md",
        "size": int(item.get("size") or 0),
        "createdAt": created,
        "updatedAt": item.get("updatedAt") or created,
        "version": int(item.get("version") or 1),
    }
    return {k: view[k] for k in SKILL_FIELDS}


def _builtin_public(b: skills.BuiltinSkill) -> dict[str, Any]:
    return {
        "skillId": b.skill_id,
        "name": b.name,
        "title": skills.humanize(b.name),
        "description": b.description,
        "builtin": True,
        "source": "builtin",
        "format": "md",
        "size": b.size,
        "createdAt": skills.BUILTIN_CREATED_AT,
        "updatedAt": skills.BUILTIN_CREATED_AT,
        "version": 1,
    }


def _owner_items(app: App, user_id: str) -> list[dict[str, Any]]:
    return owner_items(app.store.query_all(db.user_pk(user_id), "SKILL#"))


def _builtin(app: App, skill_id: str) -> skills.BuiltinSkill | None:
    return next((b for b in app.builtin_skills() if b.skill_id == skill_id), None)


def _owner_or_404(app: App, user_id: str, skill_id: str) -> dict[str, Any]:
    item = app.store.get(db.user_pk(user_id), db.skill_sk(skill_id)) if is_ulid(skill_id) else None
    if item is None or not owner_items([item]):
        raise not_found(NOT_FOUND)
    return item


def _editable(app: App, req: Request) -> dict[str, Any]:
    """The caller's own skill for a change; a built-in is a 409, anything else unknown a 404."""
    skill_id = req.params["skillId"]
    if _builtin(app, skill_id) is not None:
        raise conflict(BUILTIN_LOCKED)
    return _owner_or_404(app, req.user_id, skill_id)


def _format_of(filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".md"):
        return "md"
    if lower.endswith(".zip"):
        return "zip"
    raise bad_request("Upload a SKILL.md (.md) or a zip (.zip) file.")


def _check_unique(app: App, user_id: str, name: str, shown: str, *, source: str, exclude: str | None = None) -> None:
    """A name already used answers 409 in the web's words (§18.2): built-in names are Clip Factory's, and an upload
    has no name box, so it says what to do instead. ``source`` is ``"form"`` or ``"upload"``."""
    if name in {b.name for b in app.builtin_skills()}:
        if source == "upload":
            msg = f"Clip Factory already has a skill called {shown}. Change the name inside your file, then upload it again."
        else:
            msg = f"Clip Factory already has a skill called {shown}. Pick another name."
        raise conflict(msg, "title")
    if name in {str(i["name"]) for i in _owner_items(app, user_id) if i.get("skillId") != exclude}:
        if source == "upload":
            msg = f"You already have a skill called {shown}. To change it, open it and tap Replace the whole file."
        else:
            msg = f"You already have a skill called {shown}. Pick another name."
        raise conflict(msg, "title")


def _form(body: dict[str, Any]) -> skills.SkillForm:
    try:
        return skills.normalize_form(body)
    except skills.FormError as e:
        raise bad_request(e.message, e.field) from e


def _discard(app: App, key: str) -> None:
    try:
        app.media.delete(key)
    except Exception as e:
        log("warning", "skill.discard_failed", error=type(e).__name__)


def _read_file(app: App, item: dict[str, Any]) -> tuple[bytes, str]:
    """The stored file of an owner skill and its SKILL.md text."""
    fmt = "zip" if item.get("format") == "zip" else "md"
    try:
        data = app.media.read(str(item["key"]), LIMITS[fmt])
        text = skills.decode_text(data) if fmt == "md" else skills.skill_md_from_zip(data, strict=False)
    except (skills.SkillError, ValueError, zipfile.BadZipFile, KeyError) as e:
        raise not_found("We could not read that skill's file.") from e
    except Exception as e:
        if s3._code(e) in {"NoSuchKey", "NotFound", "404", "AccessDenied"}:
            raise not_found("We could not read that skill's file.") from e
        raise
    return data, text


# --- read -----------------------------------------------------------------------------------------------------


def _remove_choice_items(app: App, rows: list[dict[str, Any]]) -> None:
    """The on/off choices stored before §18 mean nothing now; each one seen is deleted (best effort)."""
    for row in rows:
        if row.get("type") != "skill_choice":
            continue
        try:
            app.store.delete(row["pk"], row["sk"])
            log("info", "skill.choice_removed", skillId=row.get("skillId"))
        except Exception as e:
            log("warning", "skill.choice_remove_failed", error=type(e).__name__)


def list_skills(app: App, req: Request) -> Response:
    rows = app.store.query_all(db.user_pk(req.user_id), "SKILL#")
    _remove_choice_items(app, rows)
    builtins = [_builtin_public(b) for b in sorted(app.builtin_skills(), key=lambda b: b.name)]
    owner = []
    for item in owner_items(rows):
        view = _public(item)
        offers = _listed_offers(app, item)
        if offers:  # only on his copy of a built-in that gained a part since (§38.2)
            view["newSections"] = offers
        owner.append(view)
    owner.sort(key=lambda s: (s["name"], s["skillId"]))
    return ok({"skills": builtins + owner})


# --- new parts of a built-in, for his copy of it (§38) ---------------------------------------------------------

SECTION_ACTIONS = ("add", "undo", "not_now")
ALREADY_HAS = "Your skill already has this part."
NOT_A_COPY = "Your skill is not a copy of that built-in skill, so this part cannot be added to it."
CANNOT_UNDO = "Your skill changed since, so this cannot be undone here. Open it and tap Edit to take the part out."


def _builtin_texts(app: App) -> list[tuple[str, str]]:
    out = []
    for b in app.builtin_skills():
        try:
            out.append((b.name, skills.decode_text(b.path.read_bytes())))
        except (OSError, skills.SkillError):
            continue
    return out


def _offers(app: App, item: dict[str, Any], text: str, *, listed: bool = False) -> list[dict[str, Any]]:
    """The parts his copy lacks, each with the text and where it would go. ``notNow`` says he tapped Not now: the
    Skills list leaves those out (``listed``), the skill's own page still offers them in a small note."""
    not_now = set(item.get("sectionsNotNow") or [])
    out = []
    for gap in skill_sections.missing_sections(_builtin_texts(app), text):
        s = gap.section
        if listed and s.key in not_now:
            continue
        out.append(
            {
                "key": s.key,
                "title": s.title,
                "builtinId": skills.BUILTIN_PREFIX + s.skill,
                "builtinTitle": skills.humanize(s.skill),
                "text": gap.text,
                "preview": skill_sections.preview(text, s),
                "notNow": s.key in not_now,
            }
        )
    return out


def _listed_offers(app: App, item: dict[str, Any]) -> list[dict[str, Any]]:
    """Offers for the list (not the ones he said Not now to); a file that cannot be read just means no offer."""
    try:
        text = read_skill_text(app.media, item)
    except Exception as e:
        log("warning", "skill.sections_unread", skillId=item.get("skillId"), error=type(e).__name__)
        return []
    return _offers(app, item, text, listed=True) if text is not None else []


def _section(key: str) -> skill_sections.BuiltinSection:
    found = next((s for s in skill_sections.SECTIONS if s.key == key), None)
    if found is None:
        raise bad_request("We do not know that part.")
    return found


def _builtin_part(app: App, section: skill_sections.BuiltinSection) -> str:
    text = dict(_builtin_texts(app)).get(section.skill)
    part = skill_sections.section_text(text, section) if text is not None else None
    if part is None:
        raise bad_request("We do not know that part.")
    return part


def skill_section(app: App, req: Request) -> Response:
    """POST /v1/skills/{skillId}/sections: add a new built-in part to his copy, undo that, or say Not now (§38.3).
    Add and undo save a new revision of his file with only the part added or taken out; Not now is remembered on
    the skill (``sectionsNotNow``) and changes nothing else."""
    item = _editable(app, req)
    body = req.json()
    validate.only_keys(body, {"key", "action", "version"})
    action = body.get("action")
    if action not in SECTION_ACTIONS:
        raise bad_request("action must be add, undo or not_now.", "action")
    section = _section(validate.required_string(body, "key", max_len=128))
    if action == "not_now":
        return _not_now(app, item, section)
    version = validate.integer(body.get("version"), "version", lo=1, hi=2**31)
    _check_version(item, version)
    part = _builtin_part(app, section)
    old_data, old_text = _read_file(app, item)
    if action == "add" and section.key not in {o["key"] for o in _offers(app, item, old_text)}:
        if skill_sections.has_section(old_text, section):
            raise conflict(ALREADY_HAS)
        raise conflict(NOT_A_COPY)
    text, added = _changed_text(item, old_text, part, section, action)
    fmt = "zip" if item.get("format") == "zip" else "md"
    data = _packed(old_data, text, fmt)
    key = s3.skill_key(req.user_id, str(item["skillId"]), ulid(), fmt)
    app.media.put(key, data, CONTENT_TYPES[fmt])
    fields: dict[str, Any] = {"key": key, "format": fmt, "size": len(data)}
    if added is not None:  # exactly what was put in and where, so Undo takes out only that (§38.3)
        fields["sectionAdded"] = added
    saved = _save(app, item, version, fields, shape="section_" + action, remove=() if added else ("sectionAdded",))
    updated = {**item, **fields, "version": version + 1}
    log("info", "skill.section_" + action, skillId=item.get("skillId"), part=section.key)
    skill = saved.body["skill"] if isinstance(saved.body, dict) else _public(updated)
    return ok({"skill": skill, "newSections": _offers(app, updated, text)})


def _not_now(app: App, item: dict[str, Any], section: skill_sections.BuiltinSection) -> Response:
    not_now = [k for k in (item.get("sectionsNotNow") or []) if isinstance(k, str)]
    if section.key not in not_now:
        try:
            item = app.store.update(item["pk"], item["sk"], {"sectionsNotNow": [*not_now, section.key]})
        except db.ConditionFailed as e:  # he deleted the skill meanwhile
            raise not_found(NOT_FOUND) from e
    log("info", "skill.section_not_now", skillId=item.get("skillId"), part=section.key)
    _, text = _read_file(app, item)
    return ok({"skill": _public(item), "newSections": _offers(app, item, text)})


def _changed_text(
    item: dict[str, Any], old_text: str, part: str, section: skill_sections.BuiltinSection, action: str
) -> tuple[str, dict[str, Any] | None]:
    """His text with the part added (and what was added, for Undo), or with the last addition taken out again."""
    if action == "add":
        if skill_sections.has_section(old_text, section):
            raise conflict(ALREADY_HAS)
        at, chars = skill_sections.insertion(old_text, part, section)
        text = old_text[:at] + chars + old_text[at:]
        if len(text.encode()) > skills.MD_MAX_BYTES:
            raise too_large("This skill would be too long with the new part.")
        return text, {"key": section.key, "at": at, "text": chars}
    last = item.get("sectionAdded")
    undone = None
    if isinstance(last, dict) and last.get("key") == section.key:
        undone = skill_sections.remove_section(old_text, int(last.get("at", -1)), str(last.get("text") or ""))
    if undone is None:
        raise conflict(CANNOT_UNDO)
    return undone, None


def _packed(old_data: bytes, text: str, fmt: str) -> bytes:
    if fmt != "zip":
        bom = (
            codecs.BOM_UTF8 if old_data.startswith(codecs.BOM_UTF8) else b""
        )  # his file's first bytes stay as they were
        return bom + text.encode()
    try:
        data = skills.replace_skill_md_in_zip(old_data, text)
    except skills.SkillTooLarge as e:
        raise too_large(str(e)) from e
    except skills.SkillError as e:
        raise bad_request(str(e)) from e
    if len(data) > skills.ZIP_MAX_BYTES:
        raise too_large("This .zip would be larger than 20 MB with the new part.")
    return data


def get_skill(app: App, req: Request) -> Response:
    skill_id = req.params["skillId"]
    builtin = _builtin(app, skill_id)
    if builtin is not None:
        text = skills.decode_text(builtin.path.read_bytes())
        return ok(
            {"skill": _builtin_public(builtin), "content": text, "form": None, "formBlocked": "builtin", "files": []}
        )
    item = _owner_or_404(app, req.user_id, skill_id)
    data, text = _read_file(app, item)
    files: list[str] = []
    if item.get("format") == "zip":
        files = skills.zip_other_files(data)[:MAX_FILES_LISTED]
    detail: dict[str, Any] = {
        "skill": _public(item),
        "content": text,
        "form": None,
        "files": files,
        "newSections": _offers(app, item, text),
    }
    try:
        form = skills.parse_form(_public(item), text)
    except skills.SkillError:
        form = None
    if form is None or len(form.instructions) > skills.INSTRUCTIONS_MAX:
        detail["formBlocked"] = "too_long"
    else:
        detail["form"] = form.as_json()
    return ok(detail)


def content(app: App, req: Request) -> Response:
    """Kept for old clients; the web uses ``GET /v1/skills/{skillId}``."""
    builtin = _builtin(app, req.params["skillId"])
    if builtin is not None:
        return ok({"content": skills.decode_text(builtin.path.read_bytes())})
    _, text = _read_file(app, _owner_or_404(app, req.user_id, req.params["skillId"]))
    return ok({"content": text})


# --- create ---------------------------------------------------------------------------------------------------


def create_upload(app: App, req: Request) -> Response:
    body = req.json()
    validate.only_keys(body, {"filename", "skillId"})
    fmt = _format_of(validate.required_string(body, "filename", max_len=255))
    skill_id = body.get("skillId")
    if skill_id is None:
        skill_id = ulid()
    elif not isinstance(skill_id, str):
        raise bad_request("skillId is not valid.")
    else:  # a new file for an existing skill (§18.4)
        if _builtin(app, skill_id) is not None:
            raise conflict(BUILTIN_LOCKED)
        _owner_or_404(app, req.user_id, skill_id)
    key = s3.skill_key(req.user_id, skill_id, ulid(), fmt)
    content_type = CONTENT_TYPES[fmt]
    return ok(
        {
            "skillId": skill_id,
            "key": key,
            "uploadUrl": app.media.presign_put(key, content_type),
            "headers": {"Content-Type": content_type},
        }
    )


def register(app: App, req: Request) -> Response:
    body = req.json(max_bytes=skills.FORM_BODY_MAX_BYTES)
    if FORM_KEYS & set(body):
        validate.only_keys(body, FORM_KEYS)
        return _write(app, req, _form(body))
    validate.only_keys(body, {"skillId", "key"})
    skill_id = validate.required_string(body, "skillId", max_len=64)
    key = validate.required_string(body, "key", max_len=512)
    if not is_ulid(skill_id):
        raise bad_request("skillId is not valid.")
    fmt = s3.skill_key_format(key, req.user_id, skill_id, legacy=True)
    if fmt is None:
        raise bad_request(NOT_YOURS)
    pk, sk = db.user_pk(req.user_id), db.skill_sk(skill_id)
    if app.store.get(pk, sk) is not None:
        raise conflict("That skill is already added.")
    data, meta = _validated_upload(app, key, fmt)
    try:
        _check_unique(app, req.user_id, meta.name, skills.humanize(meta.name), source="upload")
    except ApiError:
        _discard(app, key)
        raise
    now = iso(app.clock())
    item = {
        "pk": pk,
        "sk": sk,
        "type": "skill",
        "userId": req.user_id,
        "skillId": skill_id,
        "name": meta.name,
        "title": skills.humanize(meta.name),
        "description": meta.description,
        "builtin": False,
        "source": "upload",
        "format": fmt,
        "size": len(data),
        "createdAt": now,
        "updatedAt": now,
        "version": 1,
        "key": key,
    }
    try:
        app.store.put(item, if_absent=True)
    except db.ConditionFailed as e:
        raise conflict("That skill is already added.") from e
    log("info", "skill.added", skillId=skill_id, format=fmt, source="upload")
    return ok({"skill": _public(item)}, 201)


def _write(app: App, req: Request, form: skills.SkillForm) -> Response:
    """A skill written in the app (§18.2a)."""
    name = skills.slug(form.title)
    _check_unique(app, req.user_id, name, form.title, source="form")
    data = skills.build_skill_md(name, form.description, form.title, form.instructions).encode()
    if len(data) > skills.MD_MAX_BYTES:
        raise too_large("This skill is too long. Make the answers shorter.")
    skill_id = ulid()
    key = s3.skill_key(req.user_id, skill_id, ulid(), "md")
    app.media.put(key, data, CONTENT_TYPES["md"])
    now = iso(app.clock())
    item = {
        "pk": db.user_pk(req.user_id),
        "sk": db.skill_sk(skill_id),
        "type": "skill",
        "userId": req.user_id,
        "skillId": skill_id,
        "name": name,
        "title": form.title,
        "description": form.description,
        "builtin": False,
        "source": "written",
        "format": "md",
        "size": len(data),
        "createdAt": now,
        "updatedAt": now,
        "version": 1,
        "key": key,
    }
    try:
        app.store.put(item, if_absent=True)
    except Exception:
        _discard(app, key)
        raise
    log("info", "skill.added", skillId=skill_id, format="md", source="written")
    return ok({"skill": _public(item)}, 201)


def _validated_upload(app: App, key: str, fmt: str) -> tuple[bytes, skills.Frontmatter]:
    head = app.media.head(key)
    if head is None:
        raise bad_request("We could not find the uploaded file. Upload it again.")
    try:
        return _read_upload(app, key, fmt, int(head.get("ContentLength", 0)))
    except skills.SkillError as e:
        _discard(app, key)
        raise bad_request(str(e)) from e


def _read_upload(app: App, key: str, fmt: str, size: int) -> tuple[bytes, skills.Frontmatter]:
    too_big = skills.SkillTooLarge(
        "This file is larger than " + ("1 MB." if fmt == "md" else "20 MB.") + " Make it smaller and try again."
    )
    if size > LIMITS[fmt]:
        raise too_big
    try:
        data = app.media.read(key, LIMITS[fmt])
    except ValueError as e:
        raise too_big from e
    text = skills.decode_text(data) if fmt == "md" else skills.skill_md_from_zip(data)
    return data, skills.read_frontmatter(text)


# --- update ---------------------------------------------------------------------------------------------------


def put_skill(app: App, req: Request) -> Response:
    item = _editable(app, req)
    body = req.json(max_bytes=skills.FORM_BODY_MAX_BYTES)
    version = validate.integer(body.get("version"), "version", lo=1, hi=2**31)
    if "key" in body:
        validate.only_keys(body, {"version", "key"})
        _check_version(item, version)
        return _replace_file(app, req, item, version, validate.required_string(body, "key", max_len=512))
    validate.only_keys(body, {"version"} | FORM_KEYS)
    form = _form(body)
    _check_version(item, version)
    return _edit_form(app, req, item, version, form)


def _check_version(item: dict[str, Any], version: int) -> None:
    if int(item.get("version") or 1) != version:
        raise conflict(STALE)


def _edit_form(app: App, req: Request, item: dict[str, Any], version: int, form: skills.SkillForm) -> Response:
    name = skills.slug(form.title)
    _check_unique(app, req.user_id, name, form.title, source="form", exclude=str(item["skillId"]))
    old_data, old_text = _read_file(app, item)
    try:
        extra = skills.frontmatter_extra(old_text)
    except skills.SkillError:
        extra = ""
    text = skills.build_skill_md(name, form.description, form.title, form.instructions, extra)
    if len(text.encode()) > skills.MD_MAX_BYTES:
        raise too_large("This skill is too long. Make the answers shorter.")
    fmt = "zip" if item.get("format") == "zip" else "md"
    if fmt == "zip":
        try:
            data = skills.replace_skill_md_in_zip(old_data, text)
        except skills.SkillTooLarge as e:
            raise too_large(str(e)) from e
        except skills.SkillError as e:
            raise bad_request(str(e)) from e
        if len(data) > skills.ZIP_MAX_BYTES:
            raise too_large("This .zip is larger than 20 MB. Make the answers shorter.")
    else:
        data = text.encode()
    key = s3.skill_key(req.user_id, str(item["skillId"]), ulid(), fmt)
    app.media.put(key, data, CONTENT_TYPES[fmt])
    fields = {
        "key": key,
        "name": name,
        "title": form.title,
        "description": form.description,
        "format": fmt,
        "size": len(data),
        "source": item.get("source") or "upload",
    }
    return _save(app, item, version, fields, shape="form")


def _replace_file(app: App, req: Request, item: dict[str, Any], version: int, key: str) -> Response:
    skill_id = str(item["skillId"])
    fmt = s3.skill_key_format(key, req.user_id, skill_id)
    if fmt is None or key == item.get("key"):
        raise bad_request(NOT_YOURS)
    data, meta = _validated_upload(app, key, fmt)
    try:
        _check_unique(app, req.user_id, meta.name, skills.humanize(meta.name), source="upload", exclude=skill_id)
    except ApiError:
        _discard(app, key)
        raise
    fields = {
        "key": key,
        "name": meta.name,
        "title": skills.humanize(meta.name),
        "description": meta.description,
        "format": fmt,
        "size": len(data),
        "source": "upload",
    }
    return _save(app, item, version, fields, shape="file")


def _save(
    app: App, item: dict[str, Any], version: int, fields: dict[str, Any], *, shape: str, remove: tuple[str, ...] = ()
) -> Response:
    """The conditional write of a new revision; on a stale version the just-written file is deleted (§18.4)."""
    new_key = str(fields["key"])
    condition: dict[str, Any] = {}
    if "version" in item:
        condition["expect_in"] = {"version": [version]}
    else:
        condition["expect_absent"] = ["version"]
    try:
        updated = app.store.update(
            item["pk"],
            item["sk"],
            {**fields, "updatedAt": iso(app.clock()), "version": version + 1},
            remove=["enabled", *remove],
            **condition,
        )
    except db.ConditionFailed as e:
        _discard(app, new_key)
        if app.store.get(item["pk"], item["sk"]) is None:
            raise not_found(NOT_FOUND) from e
        raise conflict(STALE) from e
    old_key = item.get("key")
    if isinstance(old_key, str) and old_key != new_key:
        try:
            app.media.delete(old_key)
        except Exception as e:
            log("warning", "skill.old_revision_left", skillId=item.get("skillId"), error=type(e).__name__)
    log("info", "skill.updated", skillId=item.get("skillId"), shape=shape, version=version + 1)
    return ok({"skill": _public(updated)})


def patch_skill(app: App, req: Request) -> Response:
    """The on/off switch is gone (§18.1); an old cached app gets a plain message."""
    raise bad_request(NO_SWITCH)


# --- delete ---------------------------------------------------------------------------------------------------


def delete_skill(app: App, req: Request) -> Response:
    item = _editable(app, req)
    app.store.delete(item["pk"], item["sk"])
    prefix = s3.skill_prefix(req.user_id, str(item["skillId"]))
    try:
        app.media.delete_prefix(prefix)
    except Exception as e:
        log("warning", "skill.files_left", skillId=item["skillId"], error=type(e).__name__)
    log("info", "skill.deleted", skillId=item["skillId"])
    return no_content()
