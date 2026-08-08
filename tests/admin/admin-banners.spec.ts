import { test, expect, type Page } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";

const LIST_URL = "/admin/banners";

/** Rows are keyed by uuid, so each run identifies its banner by caption. */
const uniqueCaption = () =>
  `E2E banner ${Math.random().toString(36).slice(2, 8)}`;

const isVisibleSoon = (page: Page) =>
  page
    .getByTestId("banner-announcement")
    .waitFor({ state: "visible", timeout: 2000 })
    .then(() => true)
    .catch(() => false);

/**
 * Banners queue oldest-first and survive across runs, so a test asserting on
 * its own banner has to clear whatever is already pending for this user.
 */
async function drainBanners(page: Page) {
  await page.goto("/");
  const modal = page.getByTestId("banner-announcement");
  for (let i = 0; i < 25; i += 1) {
    if (!(await isVisibleSoon(page))) return;
    await page.getByTestId("banner-dismiss").click();
    await expect(modal).toBeHidden();
    await page.waitForLoadState("networkidle");
  }
  throw new Error("Banner queue never drained");
}

async function createBanner(
  page: Page,
  caption: string,
  options: { body?: string; disabled?: boolean } = {},
) {
  await page.goto(`${LIST_URL}/new`);
  await page.getByTestId("banner-caption-en").fill(caption);
  await page
    .getByTestId("banner-body-en")
    .fill(options.body ?? `Body for ${caption}`);
  if (options.disabled) await page.getByTestId("banner-enabled").click();
  await page.getByTestId("banner-save").click();
  await page.waitForURL(`**${LIST_URL}`);
}

test.describe("Admin Banners", () => {
  test.use({ storageState: TEST_USERS.admin.authFile });

  test.beforeEach(async ({ page }) => {
    await drainBanners(page);
  });

  test("creates a banner, shows it once, and never again", async ({ page }) => {
    const caption = uniqueCaption();
    const body = `Release notes for ${caption}`;

    await page.goto(LIST_URL);
    await page.waitForSelector("[data-testid='banners-table']");
    await page.getByTestId("banner-new-button").click();
    await page.waitForURL(`**${LIST_URL}/new`);

    await page.getByTestId("banner-caption-en").fill(caption);
    await page.getByTestId("banner-subtitle-en").fill("v9.9.9");
    await page.getByTestId("banner-body-en").fill(body);
    await page.getByTestId("banner-save").click();

    await page.waitForURL(`**${LIST_URL}`);
    await expect(
      page.getByTestId("banners-table").getByText(caption),
    ).toBeVisible();

    // A banner with no date window shows straight away - but not over the
    // admin console the author is still standing in.
    await expect(page.getByTestId("banner-announcement")).toBeHidden();

    await page.goto("/");
    const modal = page.getByTestId("banner-announcement");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(caption);
    await expect(modal).toContainText("v9.9.9");
    await expect(modal).toContainText(body);

    await page.getByTestId("banner-dismiss").click();
    await expect(modal).toBeHidden();

    // The dismissal is recorded server-side: a reload does not bring it back.
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(modal).toBeHidden();
  });

  test("a disabled banner is never shown", async ({ page }) => {
    await createBanner(page, uniqueCaption(), { disabled: true });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("banner-announcement")).toBeHidden();
  });

  test("rejects an end date before the start date", async ({ page }) => {
    await page.goto(`${LIST_URL}/new`);
    await page.getByTestId("banner-caption-en").fill(uniqueCaption());
    await page.getByTestId("banner-body-en").fill("Body");
    await page.getByTestId("banner-start-at").fill("2026-02-01T00:00");
    await page.getByTestId("banner-end-at").fill("2026-01-01T00:00");
    await page.getByTestId("banner-save").click();

    // Still on the form - the guard rejected it.
    await expect(page).toHaveURL(new RegExp(`${LIST_URL}/new$`));
  });

  test("deletes a banner", async ({ page }) => {
    const caption = uniqueCaption();
    await createBanner(page, caption);

    const row = page
      .getByTestId("banners-table")
      .locator("tr")
      .filter({ hasText: caption });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Delete banner" }).click();
    // This codebase's AlertDialog is an alias for Dialog, so role="dialog".
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete banner" })
      .click();

    await expect(row).toBeHidden();
  });
});

test.describe("Banners permissions", () => {
  test.use({ storageState: TEST_USERS.regular.authFile });

  test("a non-admin cannot reach the admin page", async ({ page }) => {
    await page.goto(LIST_URL);
    await expect(page.getByText("401")).toBeVisible();
    await expect(page.getByTestId("banners-table")).toBeHidden();
  });
});
