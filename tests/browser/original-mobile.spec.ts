import { expect, test } from "@playwright/test";

for (const width of [320, 390, 430]) {
  test(`NAMINA Original mobile layout keeps film and menus separate at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/www.dropbox.com/**", (route) => route.abort());
    await page.goto("/vini");

    const screen = page.locator(".vini-cinema");
    await expect(screen).toBeVisible({ timeout: 15000 });
    await expect(screen.locator(".vini-cinema__nav")).toBeVisible();
    await expect(screen.locator(".vini-cinema__menu-toggle")).toBeHidden();
    await expect(screen.getByRole("link", { name: "Japri Saya!" })).toBeVisible();

    const layout = await page.evaluate(() => {
      const header = document.querySelector(".vini-cinema__header")!.getBoundingClientRect();
      const stage = document.querySelector(".vini-cinema__stage")!.getBoundingClientRect();
      const main = document.querySelector(".vini-cinema__main")!.getBoundingClientRect();
      const navTargets = [...document.querySelectorAll<HTMLButtonElement>(".vini-cinema__nav button")];
      return {
        headerBottom: header.bottom,
        videoTop: stage.top,
        videoBottom: stage.bottom,
        contentTop: main.top,
        videoHeight: stage.height,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        navHeights: navTargets.map((button) => button.getBoundingClientRect().height),
      };
    });
    expect(layout.videoTop).toBeGreaterThanOrEqual(layout.headerBottom - 1);
    expect(layout.contentTop).toBeGreaterThanOrEqual(layout.videoBottom - 1);
    expect(layout.videoHeight).toBeGreaterThanOrEqual(280);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.navHeights).toHaveLength(5);
    expect(Math.min(...layout.navHeights)).toBeGreaterThanOrEqual(44);

    await screen.locator(".vini-cinema__nav").getByRole("button", { name: "Karya" }).click();
    await expect(screen.locator(".vini-cinema__section-title")).toContainText("Karya");
    const after = await page.evaluate(() => ({
      headerBottom: document.querySelector(".vini-cinema__header")!.getBoundingClientRect().bottom,
      videoTop: document.querySelector(".vini-cinema__stage")!.getBoundingClientRect().top,
      contentTop: document.querySelector(".vini-cinema__main")!.getBoundingClientRect().top,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(after.headerBottom).toBeCloseTo(layout.headerBottom, 0);
    expect(after.videoTop).toBeCloseTo(layout.videoTop, 0);
    expect(after.contentTop).toBeCloseTo(layout.contentTop, 0);
    expect(after.documentWidth).toBeLessThanOrEqual(width + 1);
  });
}
