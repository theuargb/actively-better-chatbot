import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";

test.use({ storageState: TEST_USERS.admin.authFile });

test("measure banner scroll area", async ({ page }) => {
  await page.goto("/");
  const modal = page.getByTestId("banner-announcement");
  await expect(modal).toBeVisible();

  const info = await page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>(
      "[data-testid='banner-announcement']",
    )!;
    const scroller = dialog.querySelector<HTMLElement>(".overflow-y-auto")!;
    const article = scroller.querySelector<HTMLElement>("article")!;
    const p = article.querySelector<HTMLElement>("p")!;
    const cs = (el: HTMLElement) => getComputedStyle(el);
    return {
      scroller: {
        clientHeight: scroller.clientHeight,
        scrollHeight: scroller.scrollHeight,
        maxHeight: cs(scroller).maxHeight,
        paddingTop: cs(scroller).paddingTop,
        paddingBottom: cs(scroller).paddingBottom,
      },
      article: {
        offsetHeight: article.offsetHeight,
        height: cs(article).height,
        cssHeight: article.className,
      },
      paragraph: {
        offsetHeight: p.offsetHeight,
        marginTop: cs(p).marginTop,
        marginBottom: cs(p).marginBottom,
      },
    };
  });
  console.log(JSON.stringify(info, null, 2));
});
