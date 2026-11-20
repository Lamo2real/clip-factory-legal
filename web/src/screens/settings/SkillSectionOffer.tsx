// A part a built-in skill gained after the owner made his own copy of it (docs/CONTRACTS.md §38): "New in the built-in
// skill: Chat went wild. Add it to your skill?" with Add (his words all stay; Undo for 8 s), Not now (remembered) and
// See what changes. Shown as a card on Settings › Skills and as a small note on the skill's own page.
import { useId, useMemo, useRef, useState } from "react";
import { api } from "../../api/index.ts";
import { friendlyMessage } from "../../api/errors.ts";
import type { SectionOffer, Skill } from "../../api/types.ts";
import { Icon } from "../../components/Icon.tsx";
import { useToast } from "../../components/Toasts.tsx";
import { Button } from "../../components/ui.tsx";
import { burst, centerOf } from "../../lib/confetti.ts";
import { drawBlocks, parseMarkdown } from "../../lib/markdown.ts";
import { sounds } from "../../lib/sounds.ts";

export interface SectionResult {
  skill: Skill;
  newSections: SectionOffer[];
}

/** The words of the offer, kept in one place so the card, the note and the tests agree. */
export const OFFER_WORDS = {
  heading: (o: SectionOffer) => `New in the built-in skill: ${o.title}`,
  ask: (skill: Skill) => `Add it to ${skill.title}? All your own words stay.`,
  meanwhile: (o: SectionOffer) => `Until you add it, Clip Factory still uses the built-in's ${o.title} part.`,
  added: (o: SectionOffer, skill: Skill) => `Added ${o.title} to ${skill.title}.`,
  notNow: "Okay. You can still add it from the skill's page.",
} as const;

export function SkillSectionOffer({
  skill,
  offer,
  small = false,
  onChange,
}: {
  skill: Skill;
  offer: SectionOffer;
  /** The skill's own page: a small note instead of a card. */
  small?: boolean;
  onChange: (next: SectionResult) => void;
}) {
  const toast = useToast();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"add" | "not_now" | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  // The part's words, drawn as safely as any skill (§18.3): never as HTML.
  const part = useMemo(() => drawBlocks(parseMarkdown(offer.text).blocks, 3), [offer.text]);
  const before = useMemo(() => drawBlocks(parseMarkdown(offer.preview.before.join("\n\n")).blocks, 3), [offer.preview.before]);
  const after = useMemo(() => drawBlocks(parseMarkdown(offer.preview.after.join("\n\n")).blocks, 3), [offer.preview.after]);

  async function add() {
    setBusy("add");
    try {
      const done = await api().skillSection(skill.skillId, { key: offer.key, action: "add", version: skill.version });
      onChange(done);
      sounds.play("tap", addButton.current);
      burst(centerOf(addButton.current), 60);
      toast.undo(OFFER_WORDS.added(offer, skill), {
        icon: "plus",
        onCommit: () => undefined, // already saved; Undo takes exactly the added part out again
        onUndo: () => {
          void api()
            .skillSection(skill.skillId, { key: offer.key, action: "undo", version: done.skill.version })
            .then(onChange, (e: unknown) => toast.error(friendlyMessage(e)));
        },
      });
    } catch (e) {
      toast.error(friendlyMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
    return true;
  }

  async function notNow() {
    setBusy("not_now");
    try {
      onChange(await api().skillSection(skill.skillId, { key: offer.key, action: "not_now" }));
      toast.info(OFFER_WORDS.notNow);
    } catch (e) {
      toast.error(friendlyMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
    return true;
  }

  return (
    <section className={`skill-offer glass${small ? " is-small" : ""}`} aria-labelledby={`${id}-h`} data-offer={offer.key}>
      <div className="skill-offer__head">
        <span className="skill-offer__icon" aria-hidden="true">
          <Icon name="sparkle" size={small ? 18 : 22} />
        </span>
        <div className="skill-offer__words">
          <h2 className="skill-offer__title" id={`${id}-h`}>
            {OFFER_WORDS.heading(offer)}
          </h2>
          <p className="user-text">{OFFER_WORDS.ask(skill)}</p>
          <p className="skill-offer__meanwhile">{OFFER_WORDS.meanwhile(offer)}</p>
        </div>
      </div>
      <div className="skill-offer__actions">
        <Button ref={addButton} variant="primary" act="add" loading={busy === "add"} onClick={add}>
          Add
        </Button>
        {small && offer.notNow ? null : (
          <Button variant="ghost" icon="clock" loading={busy === "not_now"} onClick={notNow}>
            Not now
          </Button>
        )}
        <Button variant="ghost" icon={open ? "chevronDown" : "eye"} aria-expanded={open} aria-controls={`${id}-see`} onClick={() => setOpen((v) => !v)}>
          {open ? "Hide changes" : "See what changes"}
        </Button>
      </div>
      {open ? (
        <div className="skill-offer__see" id={`${id}-see`} role="region" aria-label="What changes">
          <p className="skill-offer__label">Your words stay as they are. Only the new part goes in here:</p>
          {offer.preview.before.length ? (
            <div className="skill-offer__his skill-offer__md user-text" role="group" aria-label="Your words before it">
              {before}
            </div>
          ) : null}
          <div className="skill-offer__new" aria-label="The new part">
            <span className="skill-offer__tag">New</span>
            <div className="skill-offer__md">{part}</div>
          </div>
          {offer.preview.after.length ? (
            <div className="skill-offer__his skill-offer__md user-text" role="group" aria-label="Your words after it">
              {after}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
