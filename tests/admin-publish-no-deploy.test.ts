import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (file: string) =>
  readFile(new URL("../" + file, import.meta.url), "utf8");

test("Admin Visual Studio confirms Supabase revision and opens the same popup as Mitra", async () => {
  const admin = await source("src/pages/StudioV2.tsx");
  const mitra = await source("src/pages/BusinessVisualStudio.tsx");
  assert.ok(admin.includes('updated.mode !== "database"'));
  assert.ok(admin.includes("<PublishSuccessModal "));
  assert.ok(mitra.includes("<PublishSuccessModal "));
  assert.ok(mitra.includes('"namina_business_publish_site"'));
});

test("Legacy Generator publishes directly to Supabase and does not poll for deployment", async () => {
  const legacy = await source("src/pages/StaticStudio.tsx");
  assert.ok(legacy.includes('result.mode !== "database"'));
  assert.ok(legacy.includes("<PublishSuccessModal "));
  assert.ok(!legacy.includes('phase: "deploying"'));
  assert.ok(!legacy.includes('fetch("/clients/"'));
  assert.ok(!legacy.includes('setTimeout(() => { void verify(); }'));
});

test("Admin API never writes files to GitHub during publishing or media updates", async () => {
  const api = await source("api/studio.ts");
  const editor = await source("src/pages/OriginalStudioEditor.tsx");
  assert.ok(api.includes("publishAdminToDatabase("));
  assert.ok(api.includes('mode: "database"'));
  assert.ok(!api.includes('method: "PUT"'));
  assert.ok(!editor.includes('type="file"'));
  assert.ok(editor.includes("URL foto (opsional)"));
});
