import type { IncomingMessage, ServerResponse } from "node:http";
import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";
import { contentSchema, slugSchema } from "../src/domain/content.js";

type ApiRequest = IncomingMessage & { body?: unknown };
const SESSION_TTL = 12 * 60 * 60 * 1000;
const mediaUrl = z.string().max(2000).refine((value) => {
  if (!value) return true;
  if (/^\/videos\/[a-zA-Z0-9._-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
});
const documentSchema = z.object({
  slug: slugSchema,
  content: contentSchema,
  media: z.object({
    desktopVideo: mediaUrl,
    mobileVideo: mediaUrl,
    poster: mediaUrl,
    portrait: mediaUrl,
    cards: z.record(z.string(), mediaUrl),
  }).strict(),
}).strict();

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

async function readBody(req: ApiRequest) {
  if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 262144) throw new Error("Data terlalu besar.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function configured() {
  return !!(
    process.env.NAMANA_ADMIN_PASSWORD && process.env.NAMANA_ADMIN_PASSWORD.length >= 12 &&
    process.env.NAMANA_SESSION_SECRET && process.env.NAMANA_SESSION_SECRET.length >= 32 &&
    process.env.NAMANA_GITHUB_TOKEN &&
    process.env.NAMANA_GITHUB_BRANCH
  );
}

function sign(value: string) {
  return createHmac("sha256", process.env.NAMANA_SESSION_SECRET!).update(value).digest("base64url");
}

function sessionCookie(req: ApiRequest) {
  return req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("namana_session="))?.slice(15);
}

function authenticated(req: ApiRequest) {
  if (!configured()) return false;
  const cookie = sessionCookie(req);
  if (!cookie) return false;
  const parts = cookie.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0])) return false;
  const issuedAt = Number(parts[0]);
  if (issuedAt > Date.now() || Date.now() - issuedAt > SESSION_TTL) return false;
  const expected = sign(`${parts[0]}.${parts[1]}`);
  return expected.length === parts[2].length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]));
}

function matchesPassword(value: string) {
  const expected = createHash("sha256").update(process.env.NAMANA_ADMIN_PASSWORD!).digest();
  const incoming = createHash("sha256").update(value).digest();
  return timingSafeEqual(expected, incoming);
}

function githubConfig() {
  const repo = process.env.NAMANA_GITHUB_REPO || "PebisnisDigital/NAMANA";
  const branch = process.env.NAMANA_GITHUB_BRANCH || "main";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[\w./-]+$/.test(branch)) throw new Error("Repositori tidak valid.");
  return { repo, branch };
}

async function github(path: string, options: RequestInit = {}) {
  const { repo } = githubConfig();
  return fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.NAMANA_GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });
}

function checkedOrigin(req: ApiRequest) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    const source = new URL(origin);
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
    return source.host === host && (source.protocol === "https:" || (local && source.protocol === "http:"));
  } catch {
    return false;
  }
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const parsedUrl = new URL(req.url || "/", "http://localhost");
    const action = parsedUrl.searchParams.get("action") || "session";
    if (action === "session" && req.method === "GET") {
      send(res, 200, { authenticated: authenticated(req), configured: configured() });
      return;
    }
    if (req.method === "POST" && !checkedOrigin(req)) {
      send(res, 403, { error: "Permintaan dari sumber lain ditolak." });
      return;
    }
    if (action === "logout" && req.method === "POST") {
      res.setHeader("Set-Cookie", "namana_session=; Path=/api/studio; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
      send(res, 200, { ok: true });
      return;
    }
    if (!configured()) {
      send(res, 503, { error: "Studio belum dikonfigurasi. Tambahkan kredensial admin dan GitHub di Vercel." });
      return;
    }
    if (action === "login" && req.method === "POST") {
      const body = z.object({ password: z.string().min(1).max(256) }).strict().parse(await readBody(req));
      if (!matchesPassword(body.password)) {
        send(res, 401, { error: "Kata sandi tidak cocok." });
        return;
      }
      const token = `${Date.now()}.${randomBytes(24).toString("base64url")}`;
      res.setHeader("Set-Cookie", `namana_session=${token}.${sign(token)}; Path=/api/studio; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`);
      send(res, 200, { authenticated: true });
      return;
    }
    if (!authenticated(req)) {
      send(res, 401, { error: "Sesi admin tidak aktif. Silakan masuk kembali." });
      return;
    }

    const { branch } = githubConfig();
    if (action === "list" && req.method === "GET") {
      const response = await github(`public/clients?ref=${encodeURIComponent(branch)}`);
      if (response.status === 404) {
        send(res, 200, { slugs: ["vini"] });
        return;
      }
      if (!response.ok) throw new Error(`GitHub menolak permintaan (${response.status}).`);
      const files = (await response.json()) as Array<{ name: string }>;
      send(res, 200, { slugs: [...new Set(["vini", ...files.filter((file) => file.name.endsWith(".json")).map((file) => file.name.slice(0, -5))])] });
      return;
    }

    if (action === "site" && req.method === "GET") {
      const slug = slugSchema.parse(parsedUrl.searchParams.get("slug"));
      const response = await github(`public/clients/${slug}.json?ref=${encodeURIComponent(branch)}`);
      if (response.status === 404) {
        send(res, 404, { error: "Belum ada data yang dipublikasikan." });
        return;
      }
      if (!response.ok) throw new Error(`GitHub menolak permintaan (${response.status}).`);
      const file = (await response.json()) as { content: string; sha: string };
      const document = documentSchema.parse(JSON.parse(Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8")));
      send(res, 200, { document, sha: file.sha });
      return;
    }

    if (action === "publish" && req.method === "POST") {
      const payload = z.object({ document: documentSchema, sha: z.string().max(100).nullable() }).strict().parse(await readBody(req));
      const path = `public/clients/${payload.document.slug}.json`;
      const current = await github(`${path}?ref=${encodeURIComponent(branch)}`);
      if (current.status !== 404 && !current.ok) throw new Error(`GitHub tidak bisa memeriksa revisi (${current.status}).`);
      const existing = current.ok ? (await current.json()) as { sha: string } : null;
      if ((existing?.sha || null) !== payload.sha) {
        send(res, 409, { error: "Ada revisi baru di GitHub. Muat ulang sebelum menerbitkan." });
        return;
      }
      const response = await github(path, {
        method: "PUT",
        body: JSON.stringify({
          message: `Update NAMANA ${payload.document.slug} via Studio`,
          branch,
          content: Buffer.from(`${JSON.stringify(payload.document, null, 2)}\n`).toString("base64"),
          ...(existing ? { sha: existing.sha } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Publikasi GitHub gagal (${response.status}).`);
      const result = (await response.json()) as { content: { sha: string } };
      send(res, 200, { ok: true, sha: result.content.sha });
      return;
    }
    send(res, 405, { error: "Aksi tidak didukung." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      send(res, 400, { error: error.issues[0]?.message || "Data tidak valid." });
      return;
    }
    send(res, 502, { error: error instanceof Error ? error.message : "Terjadi kendala pada Studio." });
  }
}
