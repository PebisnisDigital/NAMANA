import assert from "node:assert/strict";
import test from "node:test";
import { videoSourceForViewport } from "../src/components/videoSource.ts";
import { mediaIds, prepareSite, resolveMedia, viniSeed } from "../src/static/sites.ts";

test("phone editor inherits desktop video when HP URL is empty", () => {
  const site = prepareSite(structuredClone(viniSeed));
  const assets = resolveMedia(site);
  assert.ok(site.media.desktopVideo.includes(".mp4"));
  assert.equal(site.media.mobileVideo, "");
  assert.equal(videoSourceForViewport(site.content.background, assets, true), site.media.desktopVideo);
  assert.equal(videoSourceForViewport(site.content.background, assets, false), site.media.desktopVideo);
});

test("phone editor plays the identical source used by PC when both URLs match", () => {
  const site = prepareSite(structuredClone(viniSeed));
  site.media.mobileVideo = site.media.desktopVideo;
  const doc = prepareSite(site);
  const assets = resolveMedia(doc);
  assert.equal(doc.content.background.mobileVideoAssetId, mediaIds.mobileVideo);
  assert.equal(videoSourceForViewport(doc.content.background, assets, true), doc.media.desktopVideo);
  assert.equal(videoSourceForViewport(doc.content.background, assets, false), doc.media.desktopVideo);
});

test("phone uses dedicated video only when configured", () => {
  const site = prepareSite(structuredClone(viniSeed));
  site.media.mobileVideo = "https://example.com/client-phone.mp4";
  const doc = prepareSite(site);
  const assets = resolveMedia(doc);
  assert.equal(videoSourceForViewport(doc.content.background, assets, true), site.media.mobileVideo);
  assert.equal(videoSourceForViewport(doc.content.background, assets, false), site.media.desktopVideo);
});

test("broken or absent mobile media mapping falls back to PC", () => {
  const background = { mobileVideoAssetId: mediaIds.mobileVideo, desktopVideoAssetId: mediaIds.desktopVideo };
  const urls = { [mediaIds.desktopVideo]: "https://example.com/pc.mp4" };
  assert.equal(videoSourceForViewport(background, urls, true), urls[mediaIds.desktopVideo]);
});
