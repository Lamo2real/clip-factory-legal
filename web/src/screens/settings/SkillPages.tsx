// The pages under Settings › Clip making › Skills (docs/CONTRACTS.md §18.7): write a skill, read one, change one.
// Every skill is always used. Built-ins can be read, never changed or deleted.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { api, ApiError, friendlyMessage, type Skill, type SkillDetail, type SkillForm } from "../../api/index.ts";
import { putFile } from "../../api/upload.ts";
import { Icon } from "../../components/Icon.tsx";
import { Sheet } from "../../components/Sheet.tsx";
import { useToast } from "../../components/Toasts.tsx";
import { ActGlyph, Button, Empty, ErrorPanel, LinkButton, Progress, Skeleton } from "../../components/ui.tsx";
import { burst, centerOf } from "../../lib/confetti.ts";
import { useLoad } from "../../lib/hooks.ts";
import { useAction } from "../../lib/motion.ts";
import { drawBlocks, inlineText, parseMarkdown } from "../../lib/markdown.ts";
import { navigate, setLeaveGuard, skillPath, SKILLS_PATH } from "../../lib/router.ts";
import type { Branch, Tree } from "../../lib/settingsTree.ts";
import { checkForm, cleanForm, DESCRIPTION_MAX, INSTRUCTIONS_MAX, nameTaken, slug, TITLE_MAX, type FormProblems, type SkillField } from "../../lib/skillName.ts";
import { sounds } from "../../lib/sounds.ts";
import { Trail, usePickAction, type Crumb } from "./parts.tsx";
import { deleteWithUndo, markNewSkill, useHiddenSkills, useUndoableDeletes } from "./skillDeletes.ts";
import { SkillBadges, skillFileProblem, skillOrigin, uploadProblem } from "./SkillsSection.tsx";
import { SkillSectionOffer } from "./SkillSectionOffer.tsx";

interface Place {
  tree: Tree;
  branch: Branch;
}

export function SkillScreen({ tree, branch, mode, skillId }: Place & { mode: "new" | "read" | "edit"; skillId: string | null }) {
  if (mode === "new") return <WritePage tree={tree} branch={branch} />;
  if (!skillId) return <Missing tree={tree} branch={branch} />;
  return mode === "edit" ? (
    <EditPage key={skillId} tree={tree} branch={branch} skillId={skillId} />
  ) : (
    <ReadPage key={skillId} tree={tree} branch={branch} skillId={skillId} />
  );
}

// ---------- Shared bits ----------

function Head({ title, lede, actions }: { title: string; lede: string; actions?: ReactNode }) {
  return (
    <header className="page-head settings-head skill-head">
      <div className="page-head__text">
        <h1 className="page-head__title user-text">{title}</h1>
        <p className="page-head__lede">{lede}</p>
      </div>
      {actions ? <div className="page-head__actions skill-head__actions">{actions}</div> : null}
    </header>
  );
}

function Missing({ tree, branch }: Place) {
  return (
    <>
      <Trail tree={tree} branch={branch} extra={[{ name: "Not found" }]} />
      <h1 className="sr-only">We could not find that skill</h1>
      <Empty
        icon="info"
        title="We could not find that skill"
        action={
          <LinkButton href={SKILLS_PATH} variant="primary" icon="chevronLeft">
            Back to Skills
          </LinkButton>
        }
      >
        It may have been deleted, or the link has a typo. Tap Back to Skills to see all your skills.
      </Empty>
    </>
  );
}

/** A skill deleted a moment ago, while its Undo is still on screen: not a typo, and it can still come back. */
function JustDeleted({ tree, branch }: Place) {
  return (
    <>
      <Trail tree={tree} branch={branch} extra={[{ name: "Deleted" }]} />
      <h1 className="sr-only">You just deleted this skill</h1>
      <Empty
        icon="trash"
        title="You just deleted this skill"
        action={
          <LinkButton href={SKILLS_PATH} variant="primary" icon="chevronLeft">
            Back to Skills
          </LinkButton>
        }
      >
        Tap Undo at the bottom to bring it back.
      </Empty>
    </>
  );
}

/** Missing, just deleted (Undo still on screen), or null when the skill can be shown. */
function Gone({ tree, branch, skillId, missing }: Place & { skillId: string; missing: boolean }) {
  const hidden = useHiddenSkills();
  const undoable = useUndoableDeletes();
  if (!missing && undoable.has(skillId)) return <JustDeleted tree={tree} branch={branch} />;
  if (missing || hidden.has(skillId)) return <Missing tree={tree} branch={branch} />;
  return null;
}

function Loading({ tree, branch, extra }: Place & { extra: Crumb[] }) {
  return (
    <>
      <Trail tree={tree} branch={branch} extra={extra} />
      <Skeleton className="skill-skel" />
    </>
  );
}

interface TakenNames {
  /** Every skill (built-ins and the owner's), for the words of an upload clash. */
  all: Skill[] | null;
  /** Names already used, except the one being changed. */
  names: string[];
  /** The built-ins' names: their clash says "Clip Factory already has", not "You already have". */
  builtins: string[];
}

function useTakenNames(except?: string): TakenNames {
  const { data } = useLoad(() => api().listSkills());
  return useMemo(() => {
    const others = (data ?? []).filter((s) => s.skillId !== except);
    return { all: data ?? null, names: others.map((s) => s.name), builtins: others.filter((s) => s.builtin).map((s) => s.name) };
  }, [data, except]);
}

const isNameTaken = (e: unknown) => e instanceof ApiError && (e.field === "title" || /already ha(?:ve|s) a skill called/i.test(e.message));

// ---------- Read ----------

const OWNER_LEAF = "Always used. Changes count from your next clips.";
const BUILTIN_LEAF = "This skill comes with Clip Factory. It is always used. You can read it, but not change or delete it.";

function ReadPage({ tree, branch, skillId }: Place & { skillId: string }) {
  const { data, error, missing, reload } = useLoad(() => api().getSkill(skillId), skillId);
  const hidden = useHiddenSkills();
  // §38: after Add, Undo or Not now the page reads the skill again (its words changed), keeping what is on screen.
  const toast = useToast();
  const [asking, setAsking] = useState(false);

  if (missing || hidden.has(skillId)) return <Gone tree={tree} branch={branch} skillId={skillId} missing={missing} />;
  if (!data)
    return error ? (
      <>
        <Trail tree={tree} branch={branch} extra={[{ name: "Skill" }]} />
        <ErrorPanel message={error} onRetry={reload} />
      </>
    ) : (
      <Loading tree={tree} branch={branch} extra={[{ name: "Skill" }]} />
    );

  const { skill } = data;
  const remove = () => {
    setAsking(false);
    deleteWithUndo(skill, toast);
    navigate(SKILLS_PATH);
  };

  return (
    <>
      <Trail tree={tree} branch={branch} extra={[{ name: skill.title }]} />
      <Head
        title={skill.title}
        lede={skill.builtin ? BUILTIN_LEAF : OWNER_LEAF}
        actions={
          skill.builtin ? null : (
            <>
              <LinkButton href={skillPath(skill.skillId, "edit")} variant="primary" size="lg" icon="edit" data-help="skill-edit">
                Edit
              </LinkButton>
              <Button variant="ghost" size="lg" icon="trash" onClick={() => setAsking(true)} data-help="skill-delete">
                Delete
              </Button>
            </>
          )
        }
      />
      <p className="skill-meta">
        <SkillBadges skill={skill} />
        <span>{skillOrigin(skill, data.files.length)}</span>
      </p>
      {(data.newSections ?? []).map((o) => (
        <SkillSectionOffer key={o.key} skill={skill} offer={o} small onChange={() => void reload()} />
      ))}
      <section className="skill-when glass" aria-labelledby="skill-when">
        <h2 className="skill-when__title" id="skill-when">
          When it is used
        </h2>
        <p className="user-text">{skill.description}</p>
      </section>
      <SkillText content={data.content} title={skill.title} />
      {data.files.length ? (
        <section className="skill-files glass" aria-labelledby="skill-files">
          <h2 className="skill-when__title" id="skill-files">
            Other files in this skill
          </h2>
          <ul className="skill-files__list">
            {data.files.map((f) => (
              <li key={f} className="user-text">
                <Icon name="file" size={18} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {asking ? (
        <Sheet
          title={`Delete ${skill.title}?`}
          onClose={() => setAsking(false)}
          actions={
            <>
              <Button icon="x" onClick={() => setAsking(false)}>
                Keep it
              </Button>
              <Button variant="danger" icon="trash" act="delete" onClick={remove}>
                Delete
              </Button>
            </>
          }
        >
          <p>Clip Factory will stop using it.</p>
        </Sheet>
      ) : null}
    </>
  );
}

/**
 * The skill's words, drawn safely (§18.3): never as HTML, links only for http, https and mailto. The file's header
 * (its name and description) is not shown: the page title and "When it is used" already say both, so the
 * instructions come first. A first heading that only repeats the title is left out too.
 */
export function SkillText({ content, title }: { content: string; title?: string }) {
  const doc = useMemo(() => parseMarkdown(content), [content]);
  const first = doc.blocks[0];
  const blocks =
    title && first?.t === "h" && inlineText(first.c).trim().toLowerCase() === title.trim().toLowerCase() ? doc.blocks.slice(1) : doc.blocks;
  return (
    <article className="md glass" aria-label="The skill">
      {drawBlocks(blocks)}
      {doc.truncated ? <p className="md__more">This skill is very long; only the start is shown here.</p> : null}
    </article>
  );
}

// ---------- Write ----------

const EMPTY: SkillForm = { title: "", description: "", instructions: "" };

function WritePage({ tree, branch }: Place) {
  const toast = useToast();
  const taken = useTakenNames();

  async function save(form: SkillForm, button: HTMLElement | null) {
    const skill = await api().writeSkill(form);
    sounds.play("tap", button);
    burst(centerOf(button), 110);
    toast.success("Your skill is ready. Clip Factory will use it every time.");
    markNewSkill(skill.skillId);
    navigate(skillPath(skill.skillId), { replace: true, force: true });
  }

  return (
    <>
      <Trail tree={tree} branch={branch} extra={[{ name: "Write a skill" }]} />
      <Head title="Write a skill" lede="Clip Factory reads your skill every time it makes clips." />
      <FormView initial={EMPTY} taken={taken} saveLabel="Save skill" cancelHref={SKILLS_PATH} examples onSave={save} />
    </>
  );
}

// ---------- Edit ----------

type Conflict = { kind: "form"; form: SkillForm } | { kind: "file"; key: string };

function EditPage({ tree, branch, skillId }: Place & { skillId: string }) {
  const { data, error, missing, reload, setData } = useLoad(() => api().getSkill(skillId), skillId);
  const hidden = useHiddenSkills();
  const toast = useToast();
  const taken = useTakenNames(skillId);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [busy, setBusy] = useState(false);
  // Bumped to start the form again from the newest words.
  const [round, setRound] = useState(0);
  const builtin = data?.skill.builtin === true;

  // A built-in cannot be changed: go to its page and say so.
  useEffect(() => {
    if (!builtin) return;
    toast.info("Built-in skills can be read, but not changed.");
    navigate(skillPath(skillId), { replace: true, force: true });
  }, [builtin, skillId, toast]);

  if (missing || hidden.has(skillId)) return <Gone tree={tree} branch={branch} skillId={skillId} missing={missing} />;
  const crumbs = (skill?: Skill): Crumb[] => [{ name: skill?.title ?? "Skill", href: skillPath(skillId) }, { name: "Edit" }];
  if (!data || builtin)
    return error ? (
      <>
        <Trail tree={tree} branch={branch} extra={crumbs()} />
        <ErrorPanel message={error} onRetry={reload} />
      </>
    ) : (
      <Loading tree={tree} branch={branch} extra={crumbs()} />
    );

  const detail: SkillDetail = data;

  function saved(skill: Skill, button: HTMLElement | null) {
    // Celebrations are for a new skill; a change just says it is saved.
    sounds.play("tap", button);
    toast.success(`Saved ${skill.title}. Clip Factory uses it from your next clips.`);
    navigate(skillPath(skill.skillId), { replace: true, force: true });
  }

  /** A 409 that is not about the name: someone changed the skill on another screen. */
  const stale = (e: unknown) => e instanceof ApiError && e.code === "conflict" && !isNameTaken(e);

  /** Saves the words; false when it was changed somewhere else (the sheet then asks what to do). */
  async function saveForm(form: SkillForm, button: HTMLElement | null) {
    try {
      saved(await api().updateSkill(skillId, { version: detail.skill.version, ...form }), button);
      return true;
    } catch (e) {
      if (!stale(e)) throw e;
      sounds.play("deny", button);
      setConflict({ kind: "form", form });
      return false;
    }
  }

  async function saveFile(key: string, button: HTMLElement | null) {
    try {
      saved(await api().updateSkill(skillId, { version: detail.skill.version, key }), button);
      return true;
    } catch (e) {
      if (!stale(e)) throw e;
      sounds.play("deny", button);
      setConflict({ kind: "file", key });
      return false;
    }
  }

  async function takeNewest() {
    setConflict(null);
    await reload();
    setRound((r) => r + 1);
  }

  /** Saves over the other change; false when that fails too (the error toast says why). */
  async function saveMineAnyway() {
    if (!conflict) return false;
    setBusy(true);
    try {
      const fresh = await api().getSkill(skillId);
      setData(() => fresh);
      const body = conflict.kind === "form" ? { version: fresh.skill.version, ...conflict.form } : { version: fresh.skill.version, key: conflict.key };
      const skill = await api().updateSkill(skillId, body);
      setConflict(null);
      saved(skill, null);
      return true;
    } catch (e) {
      setConflict(null);
      toast.error(friendlyMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const replaceable = detail.skill.format === "zip" || detail.form === null;

  return (
    <>
      <Trail tree={tree} branch={branch} extra={crumbs(detail.skill)} />
      <Head title="Change this skill" lede="Change the words, then tap Save changes." />
      {detail.form ? (
        <FormView
          key={`${detail.skill.version}-${round}`}
          initial={detail.form}
          taken={taken}
          saveLabel="Save changes"
          cancelHref={skillPath(skillId)}
          onSave={saveForm}
        />
      ) : (
        <div className="skill-blocked glass" role="note">
          <Icon name="info" />
          <p>This skill is too long to change here. Upload a new file to replace it.</p>
        </div>
      )}
      {replaceable ? <ReplaceFile skillId={skillId} skills={taken.all} primary={detail.form === null} onUploaded={saveFile} /> : null}
      {conflict ? (
        <Sheet
          title="This skill was changed somewhere else"
          onClose={() => setConflict(null)}
          actions={
            <>
              <Button variant="primary" icon="retry" act="refresh" onClick={() => void takeNewest()}>
                Use the newest
              </Button>
              <Button icon="check" act="save" loading={busy} onClick={() => saveMineAnyway()}>
                Save mine anyway
              </Button>
            </>
          }
        >
          <p>It was changed on another screen. Use the newest one, or save yours over it.</p>
        </Sheet>
      ) : null}
    </>
  );
}

/** "Replace the whole file": a new .md or .zip for this skill (§18.4). */
function ReplaceFile({
  skillId,
  skills,
  primary,
  onUploaded,
}: {
  skillId: string;
  skills: Skill[] | null;
  primary: boolean;
  /** Saves the uploaded file; false when it could not be saved (and the screen has said why). */
  onUploaded: (key: string, button: HTMLElement | null) => Promise<boolean>;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const pick = usePickAction("upload");

  async function upload(file: File) {
    pick.play();
    const check = skillFileProblem(file);
    if ("problem" in check) {
      pick.fail({ sound: false });
      return toast.error(check.problem);
    }
    setProgress(0);
    try {
      const up = await api().createSkillUpload(file.name, skillId);
      await putFile(up, file, setProgress);
      if (!(await onUploaded(up.key, button.current))) pick.fail({ sound: false });
    } catch (e) {
      pick.fail({ sound: false });
      toast.error(uploadProblem(e, skills));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="skill-replace glass" aria-labelledby="skill-replace">
      <h2 className="skill-when__title" id="skill-replace">
        Replace the whole file
      </h2>
      <p className="field__hint">Pick a skill file from your computer. It takes the place of this skill.</p>
      <input
        ref={input}
        type="file"
        accept=".md,.zip,text/markdown,application/zip"
        className="sr-only"
        tabIndex={-1}
        aria-label="New skill file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <div>
        <Button
          ref={button}
          variant={primary ? "primary" : "ghost"}
          size="lg"
          icon="upload"
          act={pick}
          playOnClick={false}
          loading={progress !== null}
          onClick={() => input.current?.click()}
        >
          Replace the whole file
        </Button>
      </div>
      {progress !== null ? <Progress value={progress} label="Skill upload progress" /> : null}
    </section>
  );
}

// ---------- The form (write and edit) ----------

/** Sets a textarea's height to fit its words; its `rows` stays the least. */
function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [ref, value]);
}

const QUESTIONS: { field: SkillField; label: string; example: string; max: number }[] = [
  { field: "title", label: "What is the skill called?", example: "Funny moments first", max: TITLE_MAX },
  {
    field: "description",
    label: "When should Clip Factory use it?",
    example: "Every time it picks moments from my Minecraft videos.",
    max: DESCRIPTION_MAX,
  },
  {
    field: "instructions",
    label: "What should it do?",
    example:
      "Pick the moments where I laugh the loudest. Put the funniest part in the first 2 seconds. Never use bad words in captions.",
    max: INSTRUCTIONS_MAX,
  },
];

function FormView({
  initial,
  taken,
  saveLabel,
  cancelHref,
  examples = false,
  onSave,
}: {
  initial: SkillForm;
  taken: TakenNames;
  saveLabel: string;
  cancelHref: string;
  /** Show "Use the example" for empty fields. */
  examples?: boolean;
  /** Saves and moves on; throws to show the problem, or resolves to false when it has shown it itself. */
  onSave: (form: SkillForm, button: HTMLElement | null) => Promise<boolean | void>;
}) {
  const id = useId();
  const toast = useToast();
  const [values, setValues] = useState<SkillForm>(initial);
  const [touched, setTouched] = useState<Partial<Record<SkillField, boolean>>>({});
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<FormProblems>({});
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  // Save is a submit button: the tick pops at the tap, and the form's own checks call fail() (§20.5).
  const saveAct = useAction("save");
  const instructions = useRef<HTMLTextAreaElement>(null);
  const description = useRef<HTMLTextAreaElement>(null);

  const dirty = JSON.stringify(cleanForm(values)) !== JSON.stringify(cleanForm(initial));
  const problems = checkForm(values, taken.names, taken.builtins);
  const shown = (f: SkillField): string | undefined =>
    serverErrors[f] ??
    // The name hint shows as soon as it is typed; the rest after the field was left or Save was tapped.
    (f === "title" && problems.title && taken.names.includes(slug(cleanForm(values).title)) && values.title.trim()
      ? problems.title
      : tried || touched[f]
        ? problems[f]
        : undefined);

  // Unsaved typing: ask before leaving (in-app links, Back), and let the browser ask on reload or close.
  useEffect(() => {
    if (!dirty || saving) return;
    const off = setLeaveGuard((_to, proceed) => {
      setLeaving(() => proceed);
      return true;
    });
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      off();
      window.removeEventListener("beforeunload", unload);
    };
  }, [dirty, saving]);

  // The two long boxes grow with their words (never shorter than their rows), so saved words are never cut off.
  useAutoGrow(instructions, values.instructions);
  useAutoGrow(description, values.description);

  const set = (f: SkillField, v: string) => {
    setValues((old) => ({ ...old, [f]: v }));
    if (serverErrors[f]) setServerErrors(({ [f]: _gone, ...rest }) => rest);
  };

  const focusField = (f: SkillField) => document.getElementById(`${id}-${f}`)?.focus();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setTried(true);
    const first = QUESTIONS.find((q) => problems[q.field])?.field;
    if (first) {
      sounds.play("deny", saveButton.current);
      saveAct.fail({ sound: false });
      focusField(first);
      return;
    }
    setSaving(true);
    try {
      if ((await onSave(cleanForm(values), saveButton.current)) === false) saveAct.fail({ sound: false });
    } catch (err) {
      // The deny sound comes from the field's message or the error toast.
      saveAct.fail({ sound: false });
      const field = isNameTaken(err) ? "title" : err instanceof ApiError && QUESTIONS.some((q) => q.field === err.field) ? (err.field as SkillField) : null;
      if (field) {
        sounds.play("deny", saveButton.current);
        setServerErrors({
          [field]: isNameTaken(err) ? nameTaken(cleanForm(values).title, taken.builtins.includes(slug(cleanForm(values).title))) : friendlyMessage(err),
        });
        focusField(field);
      } else toast.error(friendlyMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="skill-form glass" onSubmit={submit} noValidate data-help="skill-form">
      {QUESTIONS.map((q, n) => {
        const value = values[q.field];
        const error = shown(q.field);
        const fieldId = `${id}-${q.field}`;
        const long = q.field === "instructions";
        const common = {
          id: fieldId,
          className: `input${long ? " textarea skill-form__long" : q.field === "description" ? " textarea skill-form__grow" : ""}`,
          value,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": `${fieldId}-ex ${fieldId}-st`,
          onChange: (e: { target: { value: string } }) => set(q.field, e.target.value),
          onBlur: () => setTouched((t) => ({ ...t, [q.field]: true })),
        } as const;
        return (
          <div className="field skill-form__q" key={q.field}>
            <div className="field__row">
              <label className="field__label skill-form__label" htmlFor={fieldId}>
                <span className="skill-form__num" aria-hidden="true">
                  {n + 1}
                </span>
                {q.label}
              </label>
              <span className={`counter${value.length > q.max ? " is-over" : ""}`} aria-hidden="true">
                {value.length.toLocaleString("en")} / {q.max.toLocaleString("en")}
              </span>
            </div>
            {long ? (
              <textarea {...common} ref={instructions} rows={10} spellCheck />
            ) : q.field === "description" ? (
              <textarea {...common} ref={description} rows={2} spellCheck />
            ) : (
              <input {...common} type="text" autoComplete="off" enterKeyHint="next" />
            )}
            <p className="field__hint skill-form__example" id={`${fieldId}-ex`}>
              <span className="user-text">For example: “{q.example}”</span>
              {examples && !value.trim() ? <UseExample onUse={() => set(q.field, q.example)} /> : null}
            </p>
            <p className={`field__status${error ? " is-bad" : ""}`} id={`${fieldId}-st`} aria-live="polite">
              {error ? (
                <>
                  <Icon name="alert" size={18} />
                  <span className="user-text">{error}</span>
                </>
              ) : null}
            </p>
          </div>
        );
      })}
      <div className="skill-form__actions">
        <Button ref={saveButton} type="submit" variant="primary" size="lg" icon="check" act={saveAct} loading={saving} data-sound="off">
          {saveLabel}
        </Button>
        <LinkButton href={cancelHref} variant="ghost" size="lg" icon="x">
          Cancel
        </LinkButton>
      </div>
      {leaving ? (
        <Sheet
          title="Leave without saving?"
          onClose={() => setLeaving(null)}
          actions={
            <>
              <Button variant="primary" icon="edit" onClick={() => setLeaving(null)}>
                Keep editing
              </Button>
              <Button
                icon="chevronLeft"
                onClick={() => {
                  const go = leaving;
                  setLeaving(null);
                  go();
                }}
              >
                Leave
              </Button>
            </>
          }
        >
          <p>Your changes are not saved yet. If you leave, they are gone.</p>
        </Sheet>
      ) : null}
    </form>
  );
}

/** "Use the example": drops the example into the empty box (`paste`, §20.11). The button goes once the box has words. */
function UseExample({ onUse }: { onUse: () => void }) {
  const act = useAction("paste");
  return (
    <button
      type="button"
      className="skill-form__use"
      data-act="paste"
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      onClick={() => {
        onUse();
        act.play();
      }}
    >
      <ActGlyph act={act}>
        <Icon name="paste" size={16} />
      </ActGlyph>
      Use the example
    </button>
  );
}
