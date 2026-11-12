import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const BASE_URL = "https://namina.biz.id";
const origins = new Set([BASE_URL, "https://www.namina.biz.id", "https://naminapro.vercel.app"]);
const headers = (origin: string) => ({
  "Access-Control-Allow-Origin": origins.has(origin) ? origin : BASE_URL,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Origin",
});
const reply = (origin: string, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: headers(origin) });

function normalPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const e164 = digits.startsWith("0") ? "62" + digits.slice(1) : digits.startsWith("8") ? "62" + digits : digits;
  return /^62[0-9]{8,14}$/.test(e164) ? e164 : null;
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createAccessKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32)); // 256-bit unguessable capability
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  if (!origins.has(origin)) return reply(origin, { error: "Asal permintaan tidak diizinkan." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== "POST") return reply(origin, { error: "Metode tidak diizinkan." }, 405);

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return reply(origin, { error: "Login superadmin diperlukan." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const roles = Deno.env.get("SUPABASE_SECRET_KEYS");
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (roles) { try { key = (JSON.parse(roles) as Record<string, string>).default || key; } catch { /* legacy key */ } }
  if (!url || !key) return reply(origin, { error: "Layanan admin belum dikonfigurasi." }, 503);

  const db = createClient(url, key, { auth: {
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
  } });
  const caller = await db.auth.getUser(bearer);
  if (caller.error || !caller.data.user) return reply(origin, { error: "Sesi admin tidak valid." }, 401);

  const [role, profile] = await Promise.all([
    db.from("namana_roles").select("role").eq("user_id", caller.data.user.id).maybeSingle(),
    db.from("namana_profiles").select("status").eq("user_id", caller.data.user.id).maybeSingle(),
  ]);
  if (role.error || profile.error || role.data?.role !== "superadmin" || profile.data?.status !== "active") {
    return reply(origin, { error: "Khusus pemilik NAMINA." }, 403);
  }

  let payload: { action?: unknown; name?: unknown; email?: unknown; whatsapp?: unknown; workspaceId?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 2000) return reply(origin, { error: "Permintaan terlalu besar." }, 413);
    payload = JSON.parse(raw);
  } catch { return reply(origin, { error: "Format permintaan tidak valid." }, 400); }

  const action = payload.action === "create" ? "create"
    : payload.action === "rotate" || payload.action === "renew" ? "rotate"
    : payload.action === "revoke" ? "revoke" : null;
  if (!action) return reply(origin, { error: "Aksi tidak dikenali." }, 400);

  try {
    let workspaceId = "";
    let userId = "";
    let name = "";
    let email = "";
    let whatsapp = "";

    if (action === "create") {
      if (typeof payload.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 254) {
        return reply(origin, { error: "Email mitra tidak valid." }, 400);
      }
      if (typeof payload.name !== "string" || payload.name.trim().length < 2 || payload.name.trim().length > 100) {
        return reply(origin, { error: "Nama mitra harus 2–100 karakter." }, 400);
      }
      if (typeof payload.whatsapp !== "string" || !normalPhone(payload.whatsapp)) {
        return reply(origin, { error: "Nomor WhatsApp mitra tidak valid." }, 400);
      }
      email = payload.email.trim().toLowerCase();
      name = payload.name.trim();
      whatsapp = normalPhone(payload.whatsapp)!;
      // generateLink provisions the Auth user without delivering an email;
      // the short-lived OTP it returns is intentionally never shared.
      const auth = await db.auth.admin.generateLink({
        type: "magiclink", email, options: { redirectTo: BASE_URL + "/studio" },
      });
      if (auth.error || !auth.data.user?.id) return reply(origin, { error: "Gagal membuat akun mitra." }, 502);
      userId = auth.data.user.id;
    } else {
      if (typeof payload.workspaceId !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.workspaceId)) {
        return reply(origin, { error: "ID mitra tidak valid." }, 400);
      }
      const lookup = await db.from("namina_business_workspaces")
        .select("id,owner_id,display_name,whatsapp_number").eq("id", payload.workspaceId).single();
      if (lookup.error || !lookup.data) return reply(origin, { error: "Mitra tidak ditemukan." }, 404);
      workspaceId = lookup.data.id;
      userId = lookup.data.owner_id;
      name = lookup.data.display_name;
      whatsapp = lookup.data.whatsapp_number || "";
      if (action !== "revoke") {
        const auth = await db.auth.admin.getUserById(userId);
        if (auth.error || !auth.data.user?.email) return reply(origin, { error: "Email mitra tidak tersedia." }, 502);
        email = auth.data.user.email;
      }
    }

    // Never issue partner access to a privileged superadmin identity.
    const targetRole = await db.from("namana_roles").select("role").eq("user_id", userId).maybeSingle();
    if (targetRole.error || targetRole.data?.role === "superadmin") {
      return reply(origin, { error: "Akun superadmin tidak boleh dibuatkan akses mitra." }, 403);
    }

    if (action === "create") {
      const lookup = await db.from("namina_business_workspaces").select("id").eq("owner_id", userId).maybeSingle();
      if (lookup.error) return reply(origin, { error: "Gagal memeriksa workspace." }, 502);
      if (lookup.data) {
        workspaceId = lookup.data.id;
        const update = await db.from("namina_business_workspaces")
          .update({ display_name: name, whatsapp_number: whatsapp }).eq("id", workspaceId);
        if (update.error) return reply(origin, { error: "Gagal memperbarui mitra." }, 502);
      } else {
        const result = await db.from("namina_business_workspaces")
          .insert({ owner_id: userId, display_name: name, whatsapp_number: whatsapp })
          .select("id").single();
        if (result.error) return reply(origin, { error: "Gagal membuat workspace." }, 502);
        workspaceId = result.data.id;
      }
    }

    if (action === "revoke") {
      const result = await db.from("namina_business_access_keys")
        .update({ revoked_at: new Date().toISOString() }).eq("workspace_id", workspaceId);
      if (result.error) return reply(origin, { error: "Gagal mencabut link." }, 502);
      return reply(origin, { revoked: true, workspaceId });
    }

    const secret = createAccessKey();
    const tokenHash = await sha256(secret);
    const upsert = await db.from("namina_business_access_keys")
      .upsert({ workspace_id: workspaceId, token_hash: tokenHash,
        revoked_at: null, rotated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
    if (upsert.error) return reply(origin, { error: "Gagal menyimpan kunci akses." }, 502);

    // URL fragment is never sent to web servers; the client erases it before validation.
    const link = BASE_URL + "/akses#access=" + encodeURIComponent(secret);
    return reply(origin, { link, email, name, whatsapp, workspaceId, permanent: true });
  } catch {
    return reply(origin, { error: "Proses pendaftaran gagal. Coba kembali." }, 500);
  }
});
