import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allSteps, GUIDES, SETUP_ORDER } from "../src/setup/index.ts";
import { CR_GUIDE, CR_PILOT, crAllSteps } from "../src/setup/contentrewards.ts";

// docs/SETUP_POSTING.md says the same steps as the app (docs/CONTRACTS.md §17.12): under each platform's heading,
// every step title appears. The docs builder writes that file; until it lands this check waits for it.
const file = join(import.meta.dirname, "..", "..", "docs", "SETUP_POSTING.md");
const present = existsSync(file);

describe.skipIf(!present)("docs/SETUP_POSTING.md matches the in-app steps", () => {
  const text = present ? readFileSync(file, "utf8") : "";
  const lines = text.split("\n");
  // The text under each platform's own heading (a heading line that names the platform), up to the next one.
  const sectionOf = (name: string): string => {
    const heads = lines.map((l, i) => ({ l, i })).filter(({ l }) => /^#{1,3}\s/.test(l));
    const start = heads.find(({ l }) => new RegExp(`^#{1,3}\\s.*\\b${name}\\b`).test(l) && !/Instagram and Facebook/.test(l));
    if (!start) return "";
    const level = /^(#+)/.exec(start.l)![1]!.length;
    const end = heads.find(({ l, i }) => i > start.i && /^(#+)/.exec(l)![1]!.length <= level);
    return lines.slice(start.i, end ? end.i : lines.length).join("\n");
  };

  for (const p of SETUP_ORDER) {
    it(`has every ${GUIDES[p].name} step title under its heading`, () => {
      const section = sectionOf(GUIDES[p].name);
      expect(section, `no heading for ${GUIDES[p].name}`).not.toBe("");
      for (const s of allSteps(GUIDES[p])) expect(section, s.title).toContain(s.title);
    });
  }

  // §38.19 (F writes it): the Content Rewards titles sit under "## Content Rewards", checked once that heading exists.
  const crHeading = lines.some((l) => /^##\s+Content Rewards\b/.test(l));
  it.skipIf(!crHeading)("has every Content Rewards step title under ## Content Rewards", () => {
    const at = lines.findIndex((l) => /^##\s+Content Rewards\b/.test(l));
    const end = lines.findIndex((l, i) => i > at && /^##\s/.test(l));
    const section = lines.slice(at, end < 0 ? lines.length : end).join("\n");
    for (const s of crAllSteps()) expect(section, s.title).toContain(s.title);
  });

  // Word for word (the docs follow the app): each CR_GUIDE part is a "### Part N: {title}" heading, and under it each
  // of its steps is a "#### {title}" heading in the app's order, the numbered setup steps as "#### 1. {title}". The
  // "once" and "each time" go on the line under a heading, never in it.
  it.skipIf(!crHeading)("uses the Content Rewards part and step titles as its headings, word for word", () => {
    const at = lines.findIndex((l) => /^##\s+Content Rewards\b/.test(l));
    const end = lines.findIndex((l, i) => i > at && /^##\s/.test(l));
    const section = lines.slice(at, end < 0 ? lines.length : end);
    const heads = section.flatMap((l) => {
      const m = /^(#{3,4})\s+(.*?)\s*$/.exec(l);
      return m ? [{ level: m[1]!.length, text: m[2]! }] : [];
    });
    const PART = /^Part \d+: /;
    const partAt = (title: string) =>
      heads.findIndex((h) => h.level === 3 && PART.test(h.text) && h.text.replace(PART, "") === title);
    // The #### headings under the ### heading at `start`, up to the next ### one.
    const under = (start: number) => {
      const next = heads.findIndex((h, i) => i > start && h.level === 3);
      return heads.slice(start + 1, next < 0 ? heads.length : next).map((h) => h.text);
    };
    let last = -1;
    for (const part of CR_GUIDE.parts) {
      const start = partAt(part.title);
      expect(start, `### Part N: ${part.title}`).toBeGreaterThan(last);
      last = start;
      const steps = under(start);
      const numbered = part.id === "setup";
      let from = 0;
      part.steps.forEach((s, i) => {
        const want = numbered ? `${i + 1}. ${s.title}` : s.title;
        const found = steps.indexOf(want, from);
        expect(found, `#### ${want} under ### Part N: ${part.title}`).toBeGreaterThanOrEqual(from);
        from = found + 1;
      });
    }
    expect(under(partAt(CR_GUIDE.parts[0]!.title)), `#### ${CR_PILOT.title}`).toContain(CR_PILOT.title);
  });
});
