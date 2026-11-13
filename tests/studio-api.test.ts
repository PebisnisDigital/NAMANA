import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import handler from "../api/studio.ts";

async function invoke(method: string, action: string, headers: Record<string, string> = {}) {
  const state = { statusCode: 200, body: "", headers: {} as Record<string, string> };
  const response = {
    setHeader(name: string, value: string) { state.headers[name] = value; return response; },
    end(body: string) { state.body = body; return response; },
    get statusCode() { return state.statusCode; },
    set statusCode(value: number) { state.statusCode = value; },
  } as unknown as ServerResponse;
  const request = { method, url: `/api/studio?action=${action}`, headers, body: {} } as IncomingMessage;
  await handler(request, response);
  return { status: state.statusCode, body: JSON.parse(state.body) as { authenticated?: boolean; error?: string; configured?: boolean } };
}

test("Studio requires database credentials instead of a GitHub token", async () => {
  const names = ["NAMANA_ADMIN_PASSWORD", "NAMANA_SESSION_SECRET", "VITE_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY", "NAMANA_GITHUB_TOKEN"];
  const before = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.NAMANA_ADMIN_PASSWORD = "test-password-at-least-12";
    process.env.NAMANA_SESSION_SECRET = "this-is-a-test-secret-with-more-than-32-characters";
    process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-test-key";
    delete process.env.NAMANA_GITHUB_TOKEN;
    const withoutGitHub = await invoke("GET", "session");
    assert.equal(withoutGitHub.status, 200);
    assert.equal(withoutGitHub.body.configured, true);
    assert.equal(withoutGitHub.body.authenticated, false);

    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const withoutDatabase = await invoke("GET", "session");
    assert.equal(withoutDatabase.body.configured, false);
  } finally {
    for (const name of names) {
      if (before[name] === undefined) delete process.env[name];
      else process.env[name] = before[name];
    }
  }
});

test("Studio rejects cross-origin mutations before reading credentials", async () => {
  const result = await invoke("POST", "publish", {
    origin: "https://attacker.example",
    host: "namanapro.vercel.app",
  });
  assert.equal(result.status, 403);
  assert.match(result.body.error || "", /ditolak/);
});
