import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { blankSite, loadViniTemplate, normalizeSite, siteDocumentSchema, viniSeed } from "../src/static/sites.ts";

test("new client uses a complete independent /vini template, not empty slides", () => {
  const first = blankSite("contoh-siti");
  const second = blankSite("contoh-budi");

  assert.equal(first.slug, "contoh-siti");
  assert.equal(second.slug, "contoh-budi");
  assert.equal(first.content.identity.displayName, viniSeed.content.identity.displayName);
  assert.equal(first.content.identity.profession, viniSeed.content.identity.profession);
  assert.match(first.media.desktopVideo, /\.mp4/);
  assert.equal(first.content.original?.nama.items.length, 12);
  assert.equal(first.content.original?.karir.items.length, 11);
  assert.equal(first.content.original?.skill.items.length, 8);
  assert.equal(first.content.original?.karya.items.length, 4);
  assert.equal(first.content.original?.produk.items.length, 6);
  assert.ok(first.content.original?.nama.items.every((item) => item.icon > 0));

  // Each client receives fresh slide/card IDs and its own editable document.
  assert.notEqual(first.content.original?.nama.items[0].id, second.content.original?.nama.items[0].id);
  assert.notEqual(first.content.original?.karya.items[0].id, second.content.original?.karya.items[0].id);
  assert.notEqual(first.content.cards[0].id, second.content.cards[0].id);
  first.content.identity.displayName = "Siti";
  assert.equal(second.content.identity.displayName, "TEH VINI");
  siteDocumentSchema.parse(first);
  siteDocumentSchema.parse(second);
});

test("new client copies published /vini JSON including current video and icon slides", async () => {
  const json = JSON.parse(await readFile(new URL("../public/clients/vini.json", import.meta.url), "utf8"));
  const source = siteDocumentSchema.parse(json);
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      assert.equal(String(input), "/clients/vini.json");
      return new Response(JSON.stringify(source), { status: 200, headers: { "content-type": "application/json" } });
    };
    const cloned = await loadViniTemplate("klien-doni");
    assert.equal(cloned.slug, "klien-doni");
    assert.equal(cloned.media.desktopVideo, source.media.desktopVideo);
    assert.deepEqual(cloned.content.original?.nama.items.map((x) => x.value),
      source.content.original?.nama.items.map((x) => x.value));
    assert.deepEqual(cloned.content.original?.karir.items.map((x) => x.icon),
      source.content.original?.karir.items.map((x) => x.icon));
    assert.equal(cloned.content.original?.karya.items.length, source.content.original?.karya.items.length);
    assert.equal(cloned.content.original?.produk.items.length, source.content.original?.produk.items.length);
    assert.equal(cloned.content.original?.style?.backgroundColor, source.content.original?.style?.backgroundColor);
    assert.equal(source.slug, "vini", "cloning must never change the original source");
    siteDocumentSchema.parse(cloned);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Vini contact template has the approved button and sales inquiry", async () => {
  const source = JSON.parse(await readFile(new URL("../public/clients/vini.json", import.meta.url), "utf8"));
  const published = siteDocumentSchema.parse(source);
  assert.equal(published.content.original?.contactLabel, "Hubungi Saya");
  assert.match(published.content.original?.contactMessage || "", /Boleh dibantu buatkan website NAMINA/);
  assert.equal(viniSeed.content.original?.contactMessage, published.content.original?.contactMessage);
});

test("legacy /vini published greeting upgrades without touching customized client messages", () => {
  const legacy = structuredClone(viniSeed);
  legacy.content.original!.contactUrl = "https://wa.me/62881022445869?text=Halo%20Teh%20Vini%2C%20saya%20melihat%20profil%20NAMINA%20dan%20ingin%20menghubungi%20Teteh.";
  delete legacy.content.original!.contactLabel;
  delete legacy.content.original!.contactMessage;
  const upgraded = normalizeSite(legacy);
  assert.equal(upgraded.content.original?.contactLabel, "Hubungi Saya");
  assert.equal(upgraded.content.original?.contactMessage, viniSeed.content.original?.contactMessage);

  const customized = structuredClone(legacy);
  customized.content.original!.contactMessage = "Pesan saya sendiri.";
  assert.equal(normalizeSite(customized).content.original?.contactMessage, "Pesan saya sendiri.");

  const anotherClient = structuredClone(legacy);
  anotherClient.slug = "klien-lain";
  assert.equal(normalizeSite(anotherClient).content.original?.contactMessage, undefined);
});
