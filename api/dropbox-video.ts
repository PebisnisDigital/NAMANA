import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { slugSchema } from "../src/domain/content.js";
import { authenticated as isAdminStudioSession } from "./studio.js";

type Request = IncomingMessage & { body?: unknown };
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // Small H.264 loops, not source movies.
const TTL_SECONDS = 1800; // One-use Dropbox link, expires after 30 min.
const SOFT_DAILY_UPLOADS_PER_SITE = 3; // Further server-side quota controls recommended as NAMINA scales.
const authSchema = z.object({
  slug: slugSchema,
  siteId: z.uuid().optional(),
}).strict();
const initSchema = authSchema.extend({
  name: z.string().min(5).max(160),
  size: z.number().int().min(1).max(MAX_VIDEO_BYTES),
});
const completeSchema = authSchema.extend({ ticket: z.string().min(40).max(2400) });
type Scope = z.infer<typeof authSchema>;
type Ticket = Scope & { path: string; size: number; expires: number };

function send(res: ServerResponse, code: number, value: unknown) {
  res.statusCode = code;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(value));
}

function checkedOrigin(req: Request) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host &&
      (parsed.protocol === "https:" ||
        (parsed.protocol === "http:" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)));
  } catch { return false; }
}

async function readPayload(req: Request) {
  if (req.body !== undefined) {
    const parsed = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (JSON.stringify(parsed).length > 4096) throw new Error("Data unggahan terlalu panjang.");
    return parsed;
  }
  let value = "";
  for await (const chunk of req) {
    value += Buffer.from(chunk).toString("utf8");
    if (value.length > 4096) throw new Error("Data unggahan terlalu panjang.");
  }
  return JSON.parse(value || "{}") as unknown;
}

function configured() {
  return Boolean(process.env.DROPBOX_APP_KEY &&
    process.env.DROPBOX_APP_SECRET &&
    process.env.DROPBOX_REFRESH_TOKEN &&
    process.env.NAMANA_SESSION_SECRET);
}

function signingSecret() {
  if (!process.env.NAMANA_SESSION_SECRET) throw new Error("Secret Studio belum dikonfigurasi.");
  return process.env.NAMANA_SESSION_SECRET;
}

function makeTicket(data: Ticket) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", signingSecret()).update(body).digest("base64url");
  return body + "." + sig;
}

function readTicket(value: string): Ticket {
  const [body, sig, extra] = value.split(".");
  if (!body || !sig || extra) throw new Error("Tiket unggah tidak valid.");
  const expected = createHmac("sha256", signingSecret()).update(body).digest("base64url");
  if (expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    throw new Error("Tiket unggah tidak cocok.");
  }
  const ticket = z.object({
    slug: slugSchema,
    siteId: z.uuid().optional(),
    path: z.string().regex(/^\/NAMINA\/(admin|mitra)\/[a-z0-9-]+\/\d{4}-\d{2}-\d{2}-[0-9a-f-]+\.mp4$/),
    size: z.number().int().min(1).max(MAX_VIDEO_BYTES),
    expires: z.number().int(),
  }).strict().parse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
  if (ticket.expires < Date.now()) throw new Error("Sesi unggah kedaluwarsa. Pilih video lagi.");
  return ticket;
}

async function checkScope(req: Request, scope: Scope) {
  if (!scope.siteId) {
    if (!isAdminStudioSession(req)) throw new Error("Masuk sebagai Admin Studio sebelum mengunggah video.");
    return;
  }
  const bearer = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_.-]+)$/i)?.[1];
  if (!bearer) throw new Error("Sesi mitra tidak tersedia. Buka ulang Studio Mitra.");
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Koneksi mitra belum dikonfigurasi.");
  // This client carries only a publishable key and the requesting user's JWT;
  // the namina_business_sites SELECT is restricted by Supabase RLS.
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + bearer } },
  });
  const { data: identity, error: userError } = await db.auth.getUser(bearer);
  if (userError || !identity.user) throw new Error("Sesi mitra kedaluwarsa.");
  const { data, error } = await db.from("namina_business_sites")
    .select("slug").eq("id", scope.siteId).eq("slug", scope.slug).maybeSingle();
  if (error || !data) throw new Error("Website ini bukan milik akun mitra yang sedang masuk.");
}

async function accessToken() {
  const key = process.env.DROPBOX_APP_KEY!;
  const secret = process.env.DROPBOX_APP_SECRET!;
  const refresh = process.env.DROPBOX_REFRESH_TOKEN!;
  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token", refresh_token: refresh,
      client_id: key, client_secret: secret,
    }),
  });
  if (!response.ok) throw new Error("Otorisasi Dropbox gagal. Admin NAMINA perlu menghubungkan ulang Dropbox.");
  const result = await response.json() as { access_token?: string };
  if (!result.access_token) throw new Error("Dropbox tidak memberikan akses unggah.");
  return result.access_token;
}

type DropboxResponse = Record<string, unknown>;
async function dropbox(path: string, token: string, body: Record<string, unknown>): Promise<DropboxResponse> {
  const response = await fetch("https://api.dropboxapi.com/2/" + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as DropboxResponse;
  if (!response.ok) {
    const summary = String(data.error_summary || "");
    throw new Error(response.status === 429
      ? "Dropbox membatasi unggahan. Coba beberapa saat lagi."
      : response.status === 403
      ? "Dropbox belum mengizinkan akses atau berbagi video. Periksa izin aplikasi."
      : "Dropbox gagal memproses file" + (summary ? ": " + summary.slice(0, 130) : "."));
  }
  return data;
}

async function ensureFolder(path: string, token: string) {
  const response = await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ path, autorename: false }),
  });
  if (response.ok) return;
  const data = await response.json().catch(() => ({})) as { error_summary?: string };
  if (response.status === 409 && data.error_summary?.startsWith("path/conflict/folder")) return;
  throw new Error("Folder Dropbox tidak bisa disiapkan. Periksa kuota dan izin Dropbox.");
}

function publicVideoUrl(sharedLink: string) {
  const url = new URL(sharedLink);
  if (!["www.dropbox.com", "dropbox.com"].includes(url.hostname) ||
      url.protocol !== "https:") throw new Error("Dropbox tidak memberikan tautan publik yang valid.");
  url.searchParams.delete("dl");
  url.searchParams.set("raw", "1");
  return url.toString();
}

async function shareVideo(path: string, token: string) {
  const response = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      settings: { requested_visibility: { ".tag": "public" } },
    }),
  });
  const result = await response.json().catch(() => ({})) as {
    url?: string; error_summary?: string;
  };
  if (response.ok && result.url) return publicVideoUrl(result.url);
  if (response.status === 409 && result.error_summary?.includes("shared_link_already_exists")) {
    const existing = await dropbox("sharing/list_shared_links", token,
      { path, direct_only: true }) as { links?: Array<{ url: string }> };
    if (existing.links?.[0]?.url) return publicVideoUrl(existing.links[0].url);
  }
  throw new Error("Video sudah diunggah, tetapi link publik tidak berhasil dibuat. Periksa izin berbagi Dropbox.");
}

export default async function handler(req: Request, res: ServerResponse) {
  if (req.method === "GET") {
    send(res, 200, { configured: configured(), maxBytes: MAX_VIDEO_BYTES });
    return;
  }
  if (req.method !== "POST" || !checkedOrigin(req)) {
    send(res, 403, { error: "Permintaan hanya diterima dari Studio NAMINA." }); return;
  }
  if (!configured()) {
    send(res, 503, { error: "Dropbox otomatis belum dihubungkan oleh Admin NAMINA. Prompt tetap bisa disalin dan link video bisa ditempel manual." });
    return;
  }
  try {
    const action = new URL(req.url || "/", "http://localhost").searchParams.get("action");
    const raw = await readPayload(req);
    if (action === "init") {
      const payload = initSchema.parse(raw);
      if (!/\.mp4$/i.test(payload.name)) throw new Error("Pilih video dengan format .mp4.");
      await checkScope(req, payload);
      const token = await accessToken();
      const basePath = "/NAMINA/" + (payload.siteId ? "mitra/" + payload.siteId : "admin/" + payload.slug);
      await ensureFolder("/NAMINA", token);
      await ensureFolder("/NAMINA/" + (payload.siteId ? "mitra" : "admin"), token);
      await ensureFolder(basePath, token);
      // Limit accidental or abusive use of the shared owner Dropbox quota.
      // A user can still prepare parallel links; enable durable per-workspace
      // rate limits before opening this feature to a large number of partners.
      const today = new Date().toISOString().slice(0, 10);
      const folder = await dropbox("files/list_folder", token, { path: basePath, limit: 1000 }) as
        { entries?: Array<{ name?: string }> };
      const currentUploads = (folder.entries || []).filter((file) =>
        file.name?.startsWith(today + "-")).length;
      if (currentUploads >= SOFT_DAILY_UPLOADS_PER_SITE) {
        throw new Error("Batas 3 video per website per hari tercapai. Coba besok atau hubungi Admin NAMINA.");
      }
      const path = basePath + "/" + today + "-" + randomUUID() + ".mp4";
      const temporary = await dropbox("files/get_temporary_upload_link", token, {
        commit_info: { path, mode: { ".tag": "add" }, autorename: false, mute: true },
        duration: TTL_SECONDS,
      }) as { link?: string };
      if (!temporary.link || new URL(temporary.link).hostname !== "content.dropboxapi.com") {
        throw new Error("Dropbox tidak mengirim tautan unggah yang aman.");
      }
      send(res, 200, {
        uploadUrl: temporary.link,
        ticket: makeTicket({ slug: payload.slug, siteId: payload.siteId, path,
          size: payload.size, expires: Date.now() + TTL_SECONDS * 1000 }),
      });
      return;
    }
    if (action === "complete") {
      const payload = completeSchema.parse(raw);
      await checkScope(req, payload);
      const ticket = readTicket(payload.ticket);
      if (ticket.slug !== payload.slug || ticket.siteId !== payload.siteId) {
        throw new Error("Tiket tidak cocok dengan website klien.");
      }
      const token = await accessToken();
      const metadata = await dropbox("files/get_metadata", token, { path: ticket.path }) as
        { ".tag"?: string; size?: number };
      if (metadata[".tag"] !== "file" || metadata.size !== ticket.size) {
        throw new Error("Ukuran video yang diterima Dropbox tidak cocok. Upload belum selesai.");
      }
      const url = await shareVideo(ticket.path, token);
      send(res, 200, { ok: true, url });
      return;
    }
    send(res, 404, { error: "Langkah upload tidak tersedia." });
  } catch (cause) {
    if (cause instanceof z.ZodError) { send(res, 400, { error: "Data upload tidak valid." }); return; }
    const message = cause instanceof Error ? cause.message : "Upload video gagal.";
    send(res, message.includes("Sesi") || message.includes("Masuk sebagai") ? 401 : 400,
      { error: message });
  }
}
