import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { slugSchema } from "../src/domain/content";
import { normalizeSite, resolveMedia, siteDocumentSchema } from "../src/static/sites";
import { demoCategories, demoThemes, getDemoTheme } from "../src/themes/catalog";

test("16 demo themes have stable unique routes and independent identities", () => {
  assert.equal(demoThemes.length, 16);
  assert.deepEqual(demoThemes.map((theme) => theme.id), Array.from({ length: 16 }, (_, index) => index + 1));
  assert.deepEqual(demoThemes.map((theme) => theme.slug), Array.from({ length: 16 }, (_, index) => `gaya${index + 1}`));
  assert.equal(new Set(demoThemes.map((theme) => theme.name)).size, 16);
  assert.equal(new Set(demoThemes.map((theme) => theme.motif)).size, 16);
  for (const theme of demoThemes) {
    assert.equal(getDemoTheme(theme.slug), theme);
    assert.ok(theme.description.length > 10);
    assert.ok(demoCategories.includes(theme.category));
    assert.ok(!slugSchema.safeParse(theme.slug).success, `${theme.slug} must stay a protected demo route`);
    assert.ok([1, 2, 3].includes(theme.energy));
    assert.ok([1, 2, 3].includes(theme.rhythm));
    assert.ok([1, 2, 3].includes(theme.motion));
  }
  assert.equal(getDemoTheme("gaya17"), undefined);
});

test("the demo source is the published Vini profile with shared cinematic media", () => {
  const parsed: unknown = JSON.parse(readFileSync(new URL("../public/clients/vini.json", import.meta.url), "utf8"));
  const site = normalizeSite(siteDocumentSchema.parse(parsed));
  const assets = resolveMedia(site);
  assert.equal(site.slug, "vini");
  assert.ok(site.content.identity.displayName.toLowerCase().includes("vin"));
  assert.equal(assets[site.content.background.desktopVideoAssetId!], "/videos/hero.mp4");
  assert.ok(site.content.cards.some((card) => card.visible));
});

test("every demo reuses the Original Enter key and physical card drop", () => {
  const demo = readFileSync(new URL("../src/pages/ThemeDemos.tsx", import.meta.url), "utf8");
  const original = readFileSync(new URL("../src/components/IdentityFlip.tsx", import.meta.url), "utf8");
  const originalStyles = readFileSync(new URL("../src/identity-flip.css", import.meta.url), "utf8");
  const demoStyles = readFileSync(new URL("../src/theme-demos.css", import.meta.url), "utf8");

  assert.match(demo, /<EnterKeycap\s/);
  assert.match(demo, /theme-demo__story-card--dropping/);
  assert.match(original, /export function EnterKeycap/);
  assert.match(originalStyles, /@keyframes cinematic-enter-card-drop-bounce/);
  assert.match(demoStyles, /animation:cinematic-enter-card-drop-bounce 2\.35s linear both/);
  assert.match(demo, /onAnimationEnd=\{finishDrop\}/);
});
