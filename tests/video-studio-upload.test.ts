import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { generateNaminaPrompts } from "../src/static/naminaPromptGenerator.ts";
import { blankSite } from "../src/static/sites.ts";
import handler from "../api/dropbox-video.ts";

test("video prompts use the actual new client's identity, title and animated-loop instruction", () => {
  const site = blankSite("contoh-mitra");
  site.content.identity.displayName = "Siti";
  site.content.identity.profession = "Guru Bahasa Inggris";
  const prompts = generateNaminaPrompts(site);
  assert.ok(prompts.image.includes("Siti"));
  assert.ok(prompts.image.includes("Guru Bahasa Inggris"));
  assert.ok(prompts.video.includes("Siti"));
  assert.ok(prompts.video.includes("floor"));
  assert.ok(prompts.video.includes("looping video"));
});

test("Ganti Video is shared across admin and mitra, and upload does not invoke deployment", async () => {
  const [admin, partner, uploader, settings] = await Promise.all([
    readFile(new URL("../src/pages/StudioV2.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/BusinessVisualStudio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/VideoStudioPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ]);
  assert.ok(admin.includes("<VideoStudioPanel"));
  assert.ok(partner.includes("<VideoStudioPanel"));
  assert.ok(uploader.includes('"/api/dropbox-video?action="'));
  assert.ok(uploader.includes('xhr.send(file)'));
  assert.ok(uploader.includes('onChangeVideo(completed.url)'));
  assert.ok(!uploader.includes('/api/studio?action=publish'));
  assert.ok(JSON.parse(settings).headers[0].headers.find(
    (h: {key:string;value:string}) => h.key === "Content-Security-Policy",
  ).value.includes("https://content.dropboxapi.com"));
});

test("video API never exposes Dropbox refresh token or access token in status response", async () => {
  const output: { status: number; body: string } = { status: 0, body: "" };
  const response = {
    statusCode: 200,
    setHeader: () => {},
    end: (s: string) => { output.body = s; output.status = response.statusCode; },
  };
  await handler({ method: "GET" } as never, response as never);
  assert.equal(output.status, 200);
  const status = JSON.parse(output.body) as Record<string, unknown>;
  assert.equal(typeof status.configured, "boolean");
  assert.equal(status.maxBytes, 80 * 1024 * 1024);
  assert.deepEqual(Object.keys(status).sort(), ["configured", "maxBytes"]);
});

test("Dropbox API refuses cross-site upload requests before issuing temporary links", async () => {
  const output: { status: number; body: string } = { status: 0, body: "" };
  const response = {
    statusCode: 200,
    setHeader: () => {},
    end: (s: string) => { output.body = s; output.status = response.statusCode; },
  };
  await handler({ method: "POST", headers: { origin: "https://other.example", host: "namina.biz.id" } } as never, response as never);
  assert.equal(output.status, 403);
  assert.ok(JSON.parse(output.body).error);
});
