import { expect, test } from "@playwright/test";
import { viniSeed } from "../../src/static/sites";

test("admin edits copy on canvas, changes theme, adds cards and publishes a client draft", async ({ page }) => {
  const profile = structuredClone(viniSeed);
  const published: unknown[] = [];
  await page.route("**/api/studio?**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const body = route.request().method() === "POST" ? route.request().postDataJSON() : null;
    if (action === "session") return route.fulfill({ json: { authenticated: true, configured: true } });
    if (action === "list") return route.fulfill({ json: { slugs: ["vini"] } });
    if (action === "site") return route.fulfill({ json: { document: profile, sha: "test-sha" } });
    if (action === "upload") return route.fulfill({ json: { url: `/media/${body.slug}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp` } });
    if (action === "publish") {
      published.push(body.document);
      return route.fulfill({ json: { ok: true, sha: "published-sha" } });
    }
    return route.fulfill({ status: 404, json: { error: "Not found" } });
  });

  await page.goto("/studio");
  const name = page.locator(".cinematic-hero__stamp--name");
  await expect(name).toHaveText("TEH VINI");
  await name.click();
  await expect(page.getByRole("complementary", { name: "Edit langsung: Teks & foto" })).toBeVisible();
  await name.fill("CLIENT CANVAS");
  await name.blur();
  await expect(page.locator(".cinematic-hero__stamp--name")).toHaveText("CLIENT CANVAS");

  await page.getByRole("button", { name: "Tema & ukuran font" }).click();
  await expect(page.getByRole("complementary", { name: /Tema & tombol ENTER/ })).toBeVisible();
  const titleScale = page.getByLabel("Ukuran judul kartu").last();
  await titleScale.press("ArrowRight");
  await expect(titleScale).toHaveValue("105");
  await page.getByRole("button", { name: "Tambah kartu" }).last().click();
  await expect(page.getByRole("complementary", { name: /Kartu: Kartu baru/ })).toBeVisible();
  await page.getByRole("complementary", { name: /Kartu:/ }).getByLabel("Judul", { exact: true }).fill("Kartu interaktif");
  await page.getByRole("complementary", { name: /Kartu:/ }).getByLabel("Tulisan tombol tautan").fill("Coba sekarang");
  await page.getByRole("button", { name: "Publikasikan" }).click();
  await expect.poll(() => published.length).toBe(1);
  const result = published[0] as typeof profile;
  expect(result.content.identity.displayName).toBe("CLIENT CANVAS");
  expect(result.content.cards.some((card) => card.title === "Kartu interaktif")).toBe(true);
  expect(result.content.cards.at(-1)?.linkLabel).toBe("Coba sekarang");
});
