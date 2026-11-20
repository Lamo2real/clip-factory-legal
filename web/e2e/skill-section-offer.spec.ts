import { expect, test, type Page } from "@playwright/test";
import { findOverflow, settle } from "./helpers.ts";

// The owner's own copy of a built-in skill that gained a part since (docs/CONTRACTS.md §38): Settings › Skills asks
// "New in the built-in skill: Chat went wild. Add it to your skill?" with Add (Undo), Not now (remembered) and
// See what changes; the skill's own page keeps a small note. Mock mode: __cfMock.addSkillCopy() adds his copy.
const LIST = "/settings/clip-making/skills";
const COPY = "01JZ8S00000000000000000009"; // "My clip rules", his copy of viral-clip-editing from before the Chat part
const HEADING = "New in the built-in skill: Chat went wild";

async function withCopy(page: Page, path = LIST) {
  await page.goto(path);
  await settle(page);
  await page.evaluate(() => (window as unknown as { __cfMock: { addSkillCopy(): void } }).__cfMock.addSkillCopy());
  await page.reload();
  await settle(page);
}

async function fits(page: Page, label: string) {
  const result = await findOverflow(page);
  const failures = result.items.map((o) => `${label}: ${o.selector} "${o.text}" ${o.scrollWidth} > ${o.clientWidth}`);
  if (result.page > result.viewport) failures.push(`${label}: page scrolls sideways (${result.page}px > ${result.viewport}px)`);
  expect(failures, failures.join("\n")).toEqual([]);
}

const card = (page: Page) => page.locator(".skill-offer", { has: page.getByRole("heading", { name: HEADING }) });

for (const size of [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test.describe(`new built-in part on a ${size.name} ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("the card offers it, shows what changes, adds it keeping his words, and Undo takes it out", async ({ page }) => {
      await withCopy(page);
      const offer = card(page);
      await expect(offer).toBeVisible();
      await expect(offer).toContainText("Add it to My clip rules? All your own words stay.");
      await expect(offer).toContainText("Until you add it, Clip Factory still uses the built-in's Chat went wild part.");
      // only his copy gets a card
      await expect(page.locator(".skill-offer")).toHaveCount(1);

      await offer.getByRole("button", { name: "See what changes" }).click();
      const see = offer.getByRole("region", { name: "What changes" });
      await expect(see).toBeVisible();
      await expect(see).toContainText("Your words stay as they are.");
      await expect(see.getByLabel("Your words before it")).toContainText("Sound: a loud shout or a laugh.");
      await expect(see.getByLabel("The new part")).toContainText("Chat lags");
      await expect(see.getByLabel("Your words after it")).toContainText("Skip these");
      await expect(see.locator("script, img")).toHaveCount(0);
      await fits(page, "offer open");
      await offer.getByRole("button", { name: "Hide changes" }).click();
      await expect(see).toHaveCount(0);

      await offer.getByRole("button", { name: "Add" }).click();
      await expect(page.getByText("Added Chat went wild to My clip rules.")).toBeVisible();
      await expect(card(page)).toHaveCount(0);

      // Undo takes exactly the added part out, and the card comes back.
      await page.getByRole("button", { name: "Undo" }).click();
      await expect(card(page)).toBeVisible();

      // Add again and look at his skill: the new part and every one of his own lines are there.
      await card(page).getByRole("button", { name: "Add" }).click();
      await expect(card(page)).toHaveCount(0);
      await page.goto(`${LIST}/${COPY}`);
      await settle(page);
      const md = page.locator(".md");
      await expect(md).toContainText("Chat lags");
      await expect(md).toContainText("Keep police chases short.");
      await expect(md).toContainText("trust a shocked face most.");
      await expect(page.locator(".skill-offer")).toHaveCount(0);
    });

    test("Not now is remembered, and the skill's page keeps a small note with Add", async ({ page }) => {
      await withCopy(page);
      await card(page).getByRole("button", { name: "Not now" }).click();
      await expect(page.getByText("Okay. You can still add it from the skill's page.")).toBeVisible();
      await expect(card(page)).toHaveCount(0);
      await page.reload();
      await settle(page);
      await expect(page.locator(".skill-row", { hasText: "My clip rules" })).toBeVisible();
      await expect(card(page)).toHaveCount(0);

      await page.locator(".skill-row", { hasText: "My clip rules" }).click();
      await settle(page);
      const note = page.locator(".skill-offer.is-small");
      await expect(note).toBeVisible();
      await expect(note.getByRole("heading", { name: HEADING })).toBeVisible();
      await expect(note.getByRole("button", { name: "Not now" })).toHaveCount(0);
      await fits(page, "skill page note");
      await note.getByRole("button", { name: "Add" }).click();
      await expect(page.locator(".md")).toContainText("Chat lags");
      await expect(page.locator(".skill-offer")).toHaveCount(0);
      await expect(page.locator(".md")).toContainText("Keep police chases short.");
    });
  });
}
