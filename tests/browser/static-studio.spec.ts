import { expect, test } from "@playwright/test";
import { viniSeed, type SiteDocument } from "../../src/static/sites";

test("Studio Original edits five menus, uploads a gallery image, links it, and publishes", async ({ page }) => {
  const profile = structuredClone(viniSeed);
  const published: SiteDocument[] = [];
  await page.route("**/api/studio?**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const body = route.request().method() === "POST" ? route.request().postDataJSON() : null;
    if (action === "session") return route.fulfill({ json: { authenticated: true, configured: true } });
    if (action === "list") return route.fulfill({ json: { slugs: ["vini"] } });
    if (action === "site") return route.fulfill({ json: { document: profile, sha: "test-sha" } });
    if (action === "upload") return route.fulfill({ json: { url: `/media/${body.slug}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png` } });
    if (action === "publish") {
      published.push(body.document);
      return route.fulfill({ json: { ok: true, sha: "published-sha" } });
    }
    return route.fulfill({ status: 404, json: { error: "Not found" } });
  });

  await page.goto("/studio");
  await expect(page.getByText("Template standar NAMINA")).toBeVisible();
  await expect(page.locator(".vini-cinema__intro h1")).toContainText("TEH VINI");
  await page.getByLabel("Nama di judul").fill("KLIEN ORIGINAL");
  await expect(page.locator(".vini-cinema__intro h1")).toContainText("KLIEN ORIGINAL");

  const karya = page.locator("details").filter({ has: page.locator("summary", { hasText: "Menu Karya" }) });
  await karya.locator("summary").click();
  await karya.getByRole("button", { name: "Tambah karya" }).click();
  const newCard = karya.locator(".studio-original__item").last();
  await newCard.getByLabel("Judul").fill("Karya Klien Baru");
  await newCard.getByLabel("Detail popup").fill("Landing page karya spesial klien.");
  await newCard.getByLabel("URL tombol pada popup").fill("https://contoh.com/karya");
  await newCard.locator('input[type="file"]').setInputFiles({
    name: "contoh.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/BWwAAAAASUVORK5CYII=", "base64"),
  });
  await expect(newCard.locator("img.studio-original__image")).toBeVisible();

  await page.locator(".studio-preview").getByRole("button", { name: "Karya", exact: true }).click();
  await page.locator(".studio-preview").getByRole("button", { name: "Lihat detail Karya Klien Baru" }).first().click();
  await expect(page.getByRole("dialog", { name: "Detail Karya Klien Baru" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Kunjungi website" })).toHaveAttribute("href", "https://contoh.com/karya");
  await page.getByRole("button", { name: "Tutup detail" }).click();

  await page.getByRole("button", { name: "Publikasikan" }).click();
  await expect.poll(() => published.length).toBe(1);
  const result = published[0];
  expect(result.content.identity.displayName).toBe("KLIEN ORIGINAL");
  const galleryItem = result.content.original!.karya.items.find((card) => card.title === "Karya Klien Baru");
  expect(galleryItem?.link).toBe("https://contoh.com/karya");
  expect(galleryItem?.imageAssetId).toBe(galleryItem?.id);
  expect(result.media.cards[galleryItem!.id]).toMatch(/\.png$/);
});

test("a new client receives the Original layout without Vini's personal data", async ({ page }) => {
  await page.route("**/api/studio?**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    if (action === "session") return route.fulfill({ json: { authenticated: true, configured: true } });
    if (action === "list") return route.fulfill({ json: { slugs: ["vini"] } });
    if (action === "site") return route.fulfill({ json: { document: viniSeed, sha: "test-sha" } });
    return route.fulfill({ status: 404, json: { error: "Not found" } });
  });
  await page.goto("/studio");
  await expect(page.getByText("Template standar NAMINA")).toBeVisible();
  await page.getByLabel("Slug baru").fill("klien-baru");
  await page.getByRole("button", { name: "Buat", exact: true }).click();
  await expect(page.locator(".studio-preview .vini-cinema__intro h1")).toContainText("Nama klien");
  await expect(page.locator(".studio-preview .vini-cinema__intro h1")).not.toContainText("TEH VINI");
  await page.locator(".studio-preview").getByRole("button", { name: "Karir", exact: true }).click();
  await expect(page.locator(".studio-preview .vini-cinema__empty")).toContainText("Belum ada data karir");
});
