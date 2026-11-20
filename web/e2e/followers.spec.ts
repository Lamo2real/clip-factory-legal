import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CLIPS, findOverflow, openClip, settle } from "./helpers.ts";

// Followers and subscribers (docs/CONTRACTS.md §38): Home's "Your followers" tile in each mock scenario, and the clip
// page's "New followers from this clip" with a number only where the app reports one per video.

async function scenario(page: Page, name: string, to = "/") {
  await page.goto("/");
  await page.evaluate((n) => sessionStorage.setItem("cf-mock-followers", n), name);
  await page.goto(to);
  await settle(page);
}

const tile = (page: Page) => page.locator(".followers-tile");
const row = (page: Page, platform: string) => tile(page).locator(`.followers-tile__row[data-platform='${platform}']`);

test("Home: connected apps show their number now, the rest share one line", async ({ page }) => {
  await scenario(page, "owner");
  await expect(tile(page)).toContainText("Your followers.");
  await expect(tile(page)).toContainText("How many follow you on each app right now.");
  await expect(row(page, "youtube")).toContainText("1.2K subscribers");
  await expect(row(page, "youtube")).toContainText("+34 this week");
  await expect(row(page, "youtube")).toContainText("YouTube rounds this number.");
  await expect(row(page, "instagram")).toContainText("512 followers");
  await expect(tile(page).locator(".followers-tile__row")).toHaveCount(2);
  await expect(tile(page).locator(".followers-tile__off")).toHaveText("Not connected: TikTok, Facebook and X.");
});

test("Home: every app counted, and a reason instead of a number when an app won't say", async ({ page }) => {
  await scenario(page, "all");
  await expect(tile(page).locator(".followers-tile__row")).toHaveCount(5);
  await expect(row(page, "tiktok")).toContainText("48.2K followers");
  await expect(row(page, "tiktok")).toContainText("−120 this week");
  await expect(row(page, "instagram")).toContainText("Same as a week ago");
  await expect(row(page, "x")).toContainText("1 follower");
  await expect(tile(page).locator(".followers-tile__off")).toHaveCount(0);

  await scenario(page, "first_check");
  await expect(row(page, "youtube")).toContainText("Clip Factory checks once a day.");
  await expect(row(page, "tiktok")).toContainText("Press Allow follower reading once TikTok approves it.");
  await expect(row(page, "youtube")).not.toContainText(/\d/);
});

test("Home: nothing connected points to Set up posting, and a failed load hides the tile", async ({ page }) => {
  await scenario(page, "start");
  await expect(tile(page)).toContainText("Connect an app to see your followers here.");
  await tile(page).getByRole("link", { name: "Set up posting" }).click();
  await expect(page).toHaveURL(/\/settings\/posting\/setup$/);

  await scenario(page, "error");
  await expect(page.locator(".money-tile, .home-row").first()).toBeVisible();
  await expect(tile(page)).toHaveCount(0);
});

test("the clip page says what each app reported, and plainly where it never does", async ({ page }) => {
  await openClip(page, CLIPS.all);
  const section = page.locator(".perf-followers");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading", { name: "New followers from this clip" })).toBeVisible();
  const kind = (platform: string) => section.locator(`[data-platform='${platform}']`);
  await expect(kind("youtube")).toHaveAttribute("data-kind", "count");
  await expect(kind("youtube")).toContainText(/new subscribers?|No new subscribers yet/);
  await expect(kind("facebook")).toHaveAttribute("data-kind", "count");
  await expect(kind("facebook")).toContainText(/new followers?|No new followers yet/);
  await expect(kind("instagram")).toContainText("Doesn't share this for reels.");
  await expect(kind("instagram").locator(".sr-only")).toHaveText("Instagram doesn't share new followers for reels.");
  await expect(kind("tiktok")).toContainText("Doesn't share this for each video.");
  await expect(kind("x")).toContainText("Doesn't share this for each post.");
});

for (const scheme of ["light", "dark"] as const) {
  test(`375 px ${scheme}: no sideways scroll and no contrast problems in the tile`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ colorScheme: scheme });
    await scenario(page, "all");
    await tile(page).scrollIntoViewIfNeeded();
    const over = await findOverflow(page);
    expect(over.items).toEqual([]);
    const axe = await new AxeBuilder({ page }).include(".followers-tile").withRules(["color-contrast"]).analyze();
    expect(axe.violations).toEqual([]);
  });
}
