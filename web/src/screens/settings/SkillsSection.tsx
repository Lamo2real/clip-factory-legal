// Settings › Clip making › Skills (docs/CONTRACTS.md §18.7): "Your skills", every one always used, each row opening
// its own page; and "Add a skill", to write one in the app or upload a file. There is no on/off switch.
import { useId, useRef, useState } from "react";
import { api } from "../../api/index.ts";
import { ApiError, friendlyMessage } from "../../api/errors.ts";
import { putFile } from "../../api/upload.ts";
import type { Skill } from "../../api/types.ts";
import { Icon } from "../../components/Icon.tsx";
import { useToast } from "../../components/Toasts.tsx";
import { A, Button, ErrorPanel, LinkButton, Pill, Progress, Skeleton } from "../../components/ui.tsx";
import { burst, centerOf } from "../../lib/confetti.ts";
import { shortDate } from "../../lib/format.ts";
import { useLoad } from "../../lib/hooks.ts";
import { skillPath } from "../../lib/router.ts";
import { slug, uploadNameTaken } from "../../lib/skillName.ts";
import { Apple, Panel, usePickAction } from "./parts.tsx";
import { isNewSkill, isReturningSkill, markNewSkill, useHiddenSkills } from "./skillDeletes.ts";
import { SkillSectionOffer, type SectionResult } from "./SkillSectionOffer.tsx";
import { sounds } from "../../lib/sounds.ts";

export const SKILL_FILE_LIMITS = { md: 1024 ** 2, zip: 20 * 1024 ** 2 } as const;

/** Built-ins first, then the owner's, each by name (as the API sorts them). */
export function sortSkills(list: Skill[]): Skill[] {
  return [...list].sort((a, b) => Number(b.builtin) - Number(a.builtin) || a.name.localeCompare(b.name) || a.skillId.localeCompare(b.skillId));
}

/** The file's kind, or a sentence saying why it cannot be a skill. */
export function skillFileProblem(file: File): { ext: "md" | "zip" } | { problem: string } {
  const name = file.name.toLowerCase();
  const ext = name.endsWith(".zip") ? "zip" : name.endsWith(".md") ? "md" : null;
  if (!ext) return { problem: "That is not a skill. Pick a SKILL.md file or a .zip with one inside." };
  if (file.size > SKILL_FILE_LIMITS[ext])
    return { problem: ext === "md" ? "That skill file is too big. Pick one under 1 MB." : "That .zip is too big. Pick one under 20 MB." };
  return { ext };
}

/**
 * Where the skill came from and when it last changed, in words (no ".md" or "KB"): "Written by you · Changed 13 Nov",
 * "From a file with 2 extra files · Changed 13 Nov", "Comes with Clip Factory".
 */
export function skillOrigin(skill: Skill, extraFiles?: number): string {
  if (skill.builtin) return "Comes with Clip Factory";
  const from =
    skill.source === "written"
      ? "Written by you"
      : skill.format !== "zip"
        ? "From a file"
        : extraFiles
          ? `From a file with ${extraFiles} extra ${extraFiles === 1 ? "file" : "files"}`
          : "From a file with extra files";
  return `${from} · Changed ${shortDate(skill.updatedAt)}`;
}

/**
 * The toast for a failed skill upload. A name clash gets words that fit an upload (there is no name box to change):
 * open that skill and replace its file, or, for a built-in's name, rename the skill inside the file.
 */
export function uploadProblem(e: unknown, skills: readonly Skill[] | null | undefined): string {
  if (e instanceof ApiError && e.code === "conflict" && e.field === "title") {
    const shown = /called (.+)\. (?:Pick another name|To change it|Change the name)/.exec(e.message)?.[1];
    if (shown) {
      const hit = skills?.find((s) => s.name === slug(shown) || s.title === shown);
      return uploadNameTaken(hit?.title ?? shown, hit?.builtin ?? /^Clip Factory already has/.test(e.message));
    }
  }
  return friendlyMessage(e);
}

export function SkillsSection() {
  const { data, error, reload, setData } = useLoad(() => api().listSkills());
  const hidden = useHiddenSkills();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const pick = usePickAction("upload");
  const id = useId();
  const shown = data?.filter((s) => !hidden.has(s.skillId)) ?? null;
  // §38: his own copy of a built-in that gained a part since gets a card above the list.
  const offers = (shown ?? []).flatMap((s) => (s.newSections ?? []).filter((o) => !o.notNow).map((o) => ({ skill: s, offer: o })));
  const changed = ({ skill, newSections }: SectionResult) =>
    setData((d) =>
      (d ?? []).map((s) => {
        if (s.skillId !== skill.skillId) return s;
        const listed = newSections.filter((o) => !o.notNow);
        const { newSections: _old, ...rest } = skill;
        return listed.length ? { ...rest, newSections: listed } : rest;
      }),
    );

  async function upload(file: File) {
    pick.play();
    const check = skillFileProblem(file);
    if ("problem" in check) {
      pick.fail({ sound: false });
      return toast.error(check.problem);
    }
    setProgress(0);
    try {
      const up = await api().createSkillUpload(file.name);
      await putFile(up, file, setProgress);
      const skill = await api().createSkill({ skillId: up.skillId, key: up.key });
      setData((d) => sortSkills([...(d ?? []).filter((s) => s.skillId !== skill.skillId), skill]));
      // A new skill is a win: success sound, confetti, and the row pops in.
      sounds.play("tap", uploadButton.current);
      burst(centerOf(uploadButton.current), 90);
      toast.success("Your skill is ready. Clip Factory will use it every time.");
      markNewSkill(skill.skillId);
    } catch (e) {
      pick.fail({ sound: false });
      toast.error(uploadProblem(e, data));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <Panel>
        <Apple id="your-skills" wide>
          {error && !data ? <ErrorPanel message={error} onRetry={reload} /> : null}
          {!data && !error ? <Skeleton className="line-skel" /> : null}
          {shown && shown.length === 0 ? (
            <p className="muted">No skills yet. Tap Write a skill to teach Clip Factory how you like your clips.</p>
          ) : null}
          {offers.map(({ skill, offer }) => (
            <SkillSectionOffer key={`${skill.skillId} ${offer.key}`} skill={skill} offer={offer} onChange={changed} />
          ))}
          {shown && shown.length > 0 ? (
            <ul className="skill-list" aria-label="Your skills">
              {shown.map((s) => (
                <li key={s.skillId}>
                  <SkillRow skill={s} />
                </li>
              ))}
            </ul>
          ) : null}
        </Apple>
      </Panel>
      <Panel>
        <Apple id="add-skill" wide>
          <input
            ref={input}
            type="file"
            accept=".md,.zip,text/markdown,application/zip"
            className="sr-only"
            id={`${id}-file`}
            tabIndex={-1}
            aria-label="Skill file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <div className="skill-add">
            <LinkButton href={skillPath(null)} variant="primary" size="lg" act="add">
              Write a skill
            </LinkButton>
            <Button ref={uploadButton} size="lg" icon="upload" act={pick} playOnClick={false} loading={progress !== null} onClick={() => input.current?.click()}>
              Upload a file
            </Button>
          </div>
          {progress !== null ? <Progress value={progress} label="Skill upload progress" /> : null}
        </Apple>
      </Panel>
    </>
  );
}

/** One skill as a glass row; the whole row opens its page. */
function SkillRow({ skill }: { skill: Skill }) {
  const [pop] = useState(() => isNewSkill(skill.skillId));
  // Back from Undo (§20.7): the mirror of its leaving.
  const [back] = useState(() => isReturningSkill(skill.skillId));
  return (
    <A href={skillPath(skill.skillId)} className={`skill-row${pop ? " is-new" : ""}${back ? " is-returning" : ""}`}>
      <span className="skill-row__icon" aria-hidden="true">
        <Icon name={skill.format === "zip" ? "layers" : "file"} />
      </span>
      <span className="skill-row__text">
        <span className="skill-row__title user-text">{skill.title}</span>
        <span className="skill-row__desc clamp-2 user-text">{skill.description}</span>
        <span className="skill-row__meta">
          <SkillBadges skill={skill} />
          <span>{skillOrigin(skill)}</span>
        </span>
      </span>
      <Icon name="chevronRight" size={20} className="icon skill-row__go" />
    </A>
  );
}

/** "Always used" on every skill, and "Built in" on the ones that come with Clip Factory. */
export function SkillBadges({ skill }: { skill: Skill }) {
  return (
    <>
      <Pill tone="success" icon="check">
        Always used
      </Pill>
      {skill.builtin ? <Pill tone="neutral">Built in</Pill> : null}
    </>
  );
}
