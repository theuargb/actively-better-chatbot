import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";

const LIST_URL = "/admin/prompt-ads";

/** Captions are how a row is found, so each run needs its own. */
const uniqueCaption = () =>
  `E2E example ${Math.random().toString(36).slice(2, 8)}`;

test.describe("Admin Prompt Ads", () => {
  test.use({ storageState: TEST_USERS.admin.authFile });

  test("creates an example with two locales", async ({ page }) => {
    const caption = uniqueCaption();

    await page.goto(LIST_URL);
    await page.waitForSelector("[data-testid='prompt-ads-table']");

    await page.getByTestId("prompt-ad-new-button").click();
    await page.waitForURL(`**${LIST_URL}/new`);

    await page.getByTestId("prompt-ad-caption-en").fill(caption);
    await page.getByTestId("prompt-ad-prompt-en").fill(`${caption} prompt`);

    // A second locale is added on top of the seeded English fallback.
    await page.getByTestId("prompt-ad-add-locale").click();
    const added = page.locator("[data-testid^='prompt-ad-variant-']").nth(1);
    await expect(added).toBeVisible();
    await added.getByRole("textbox").first().fill(`${caption} ko`);
    await added.getByRole("textbox").nth(1).fill(`${caption} ko prompt`);

    await page.getByTestId("prompt-ad-save").click();
    await page.waitForURL(`**${LIST_URL}`);

    const row = page.getByRole("row").filter({ hasText: caption });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Enabled");
  });

  test("edits an example", async ({ page }) => {
    const caption = uniqueCaption();
    const renamed = `${caption} edited`;

    await page.goto(`${LIST_URL}/new`);
    await page.getByTestId("prompt-ad-caption-en").fill(caption);
    await page.getByTestId("prompt-ad-prompt-en").fill(`${caption} prompt`);
    await page.getByTestId("prompt-ad-save").click();
    await page.waitForURL(`**${LIST_URL}`);

    await page.getByRole("row").filter({ hasText: caption }).click();
    await page.waitForURL(new RegExp(`${LIST_URL}/[0-9a-f-]{36}$`));

    await page.getByTestId("prompt-ad-caption-en").fill(renamed);
    await page.getByTestId("prompt-ad-enabled").click(); // disable
    await page.getByTestId("prompt-ad-save").click();
    await page.waitForURL(`**${LIST_URL}`);

    const row = page.getByRole("row").filter({ hasText: renamed });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Disabled");
  });

  test("deletes an example", async ({ page }) => {
    const caption = uniqueCaption();

    await page.goto(`${LIST_URL}/new`);
    await page.getByTestId("prompt-ad-caption-en").fill(caption);
    await page.getByTestId("prompt-ad-prompt-en").fill(`${caption} prompt`);
    await page.getByTestId("prompt-ad-save").click();
    await page.waitForURL(`**${LIST_URL}`);

    const row = page.getByRole("row").filter({ hasText: caption });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Delete example" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete example" })
      .click();

    await expect(row).toBeHidden();
  });
});

test.describe("Prompt Ads permissions", () => {
  test.use({ storageState: TEST_USERS.regular.authFile });

  test("a non-admin cannot reach the admin page", async ({ page }) => {
    await page.goto(LIST_URL);
    await expect(page.getByText("401")).toBeVisible();
    await expect(page.getByTestId("prompt-ads-table")).toBeHidden();
  });
});
