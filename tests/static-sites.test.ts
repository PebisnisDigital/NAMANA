import { test } from "node:test";
import assert from "node:assert/strict";
import { blankSite, normalizeSite, prepareSite, resolveMedia, siteDocumentSchema, viniSeed } from "../src/static/sites.ts";

test("demo ORIGINAL is /vini and preserves the existing card collection", () => {
  const site = normalizeSite(viniSeed);
  assert.equal(site.slug, "vini");
  assert.equal(site.content.template, "ORIGINAL");
  assert.equal(site.content.cards.length, 18);
  assert.equal(site.content.identity.displayName, "TEH VINI");
  assert.equal(resolveMedia(site)[site.content.background.desktopVideoAssetId!], "/videos/hero.mp4");
});

test("new clients have independent editable content and no inherited video", () => {
  const client = blankSite("klien-baru");
  assert.equal(siteDocumentSchema.safeParse(prepareSite(client)).success, true);
  assert.equal(client.content.cards.length, 1);
  assert.equal(client.media.desktopVideo, "");
  client.content.identity.displayName = "Profil baru";
  assert.equal(viniSeed.content.identity.displayName, "TEH VINI");
});

test("media validation allows HTTPS Dropbox URLs but blocks scripts and insecure URLs", () => {
  const site = blankSite("klien-tes");
  site.media.desktopVideo = "https://www.dropbox.com/scl/fi/contoh/video.mp4?raw=1";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, true);
  site.media.desktopVideo = "http://example.com/hero.mp4";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
  site.media.desktopVideo = "javascript:alert(1)";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
});

test("publishing requires a valid visible card and safe links", () => {
  const site = blankSite("valid-klien");
  site.content.cards[0].visible = false;
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
  site.content.cards[0].visible = true;
  site.content.cards[0].link = "javascript:alert(1)";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
});

test("visual Studio settings, custom button graphics and per-card labels survive publication", () => {
  const client = blankSite("pemilik-karya");
  client.content.identity.brandLabel = "KARYA.ID";
  client.content.identity.introLabel = "Selamat datang";
  client.content.theme.titleColor = "#ffffff";
  client.content.theme.roleColor = "#e6b65a";
  client.content.theme.headingScale = 1.2;
  client.content.theme.cardTitleScale = 1.15;
  client.content.theme.cardValueScale = 1.1;
  client.content.theme.cardBodyScale = 0.9;
  client.media.enterKey = "/media/pemilik-karya/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp";
  client.content.cards[0].link = "https://wa.me/6281212345678";
  client.content.cards[0].linkLabel = "Chat saya";
  const published = normalizeSite(client);
  assert.equal(published.content.theme.enterKeyAssetId !== null, true);
  assert.equal(resolveMedia(published)[published.content.theme.enterKeyAssetId!], client.media.enterKey);
  assert.equal(published.content.cards[0].linkLabel, "Chat saya");
  assert.equal(published.content.identity.brandLabel, "KARYA.ID");
  client.media.enterKey = "/media/pemilik-karya/../../error.webp";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(client)).success, false);
});
