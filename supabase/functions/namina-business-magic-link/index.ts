import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const APP_ORIGIN = "https://namina.biz.id";
const ALLOWED_ORIGINS = new Set([
  APP_ORIGIN,
  "https://www.namina.biz.id",
  "https://naminapro.vercel.app",
]);
const headersFor = (origin: string) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : APP_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "Pragma": "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Origin",
});
function response(origin: string, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headersFor(origin) });
}
function normalPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? "62" + digits.slice(1)
    : digits.startsWith("8") ? "62" + digits
    : digits;
  return /^62[0-9]{8,14}$/.test(intl) ? intl : "";
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  if (!ALLOWED_ORIGINS.has(origin)) return response(origin, { error: "Asal permintaan ditolak." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(origin) });
  if (request.method !== "POST") return response(origin, { error: "Metode tidak tersedia." }, 405);

  // Every request is restricted to an authenticated active NAMANA superadmin,
  // even if gateway JWT verification is disabled at some point.
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return response(origin, { error: "Sesi admin diperlukan." }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const newSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  let secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (newSecretKeys) {
    try {
      const keys = JSON.parse(newSecretKeys) as Record<string, string>;
      secretKey = keys.default || secretKey;
    } catch { /* Legacy service role only. */ }
  }
  if (!supabaseUrl || !secretKey) return response(origin, { error: "Server otorisasi belum siap." }, 503);

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const caller = await admin.auth.getUser(bearer);
  if (caller.error || !caller.data.user) return response(origin, { error: "Sesi admin tidak valid." }, 401);

  const [role, profile] = await Promise.all([
    admin.from("namana_roles").select("role").eq("user_id", caller.data.user.id).maybeSingle(),
    admin.from("namana_profiles").select("status").eq("user_id", caller.data.user.id).maybeSingle(),
  ]);
  if (role.error || profile.error || role.data?.role !== "superadmin" || profile.data?.status !== "active") {
    return response(origin, { error: "Hanya superadmin NAMINA yang dapat membuat Magic Link." }, 403);
  }

  let body: { action?: unknown; email?: unknown; name?: unknown; whatsapp?: unknown; workspaceId?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 2000) return response(origin, { error: "Data terlalu panjang." }, 413);
    body = JSON.parse(raw);
  } catch { return response(origin, { error: "Format permintaan tidak valid." }, 400); }

  const action = body.action === "renew" ? "renew" : body.action === "create" ? "create" : null;
  if (!action) return response(origin, { error: "Aksi tidak dikenal." }, 400);
  try {
    let email = "";
    let name = "";
    let whatsapp = "";
    let workspaceId = "";
    if (action === "renew") {
      if (typeof body.workspaceId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.workspaceId)) {
        return response(origin, { error: "ID mitra tidak valid." }, 400);
      }
      const lookup = await admin.from("namina_business_workspaces")
        .select("id,owner_id,display_name,whatsapp_number")
        .eq("id", body.workspaceId).single();
      if (lookup.error || !lookup.data) return response(origin, { error: "Mitra tidak ditemukan." }, 404);
      const authUser = await admin.auth.admin.getUserById(lookup.data.owner_id);
      if (authUser.error || !authUser.data.user?.email) return response(origin, { error: "Email mitra tidak tersedia." }, 400);
      email = authUser.data.user.email;
      name = lookup.data.display_name;
      whatsapp = lookup.data.whatsapp_number || "";
      workspaceId = lookup.data.id;
    } else {
      if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254) {
        return response(origin, { error: "Isi email mitra yang valid." }, 400);
      }
      if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 100) {
        return response(origin, { error: "Nama mitra harus 2–100 karakter." }, 400);
      }
      if (typeof body.whatsapp !== "string" || !normalPhone(body.whatsapp)) {
        return response(origin, { error: "Nomor WhatsApp harus valid." }, 400);
      }
      email = body.email.trim().toLowerCase();
      name = body.name.trim();
      whatsapp = normalPhone(body.whatsapp);
    }

    // Native one-use, short-lived Supabase Auth token. No fixed reusable password,
    // no plaintext access token stored in our database.
    const generated = await admin.auth.admin.generateLink({
      type: "magiclink", email, options: { redirectTo: APP_ORIGIN + "/mitra" },
    });
    if (generated.error) {
      return response(origin, { error: "Magic Link gagal dibuat. Coba kembali." }, 502);
    }
    const userId = generated.data.user?.id;
    const hashedToken = generated.data.properties?.hashed_token;
    if (!userId || !hashedToken) {
      return response(origin, { error: "Data akses mitra tidak lengkap." }, 502);
    }
    // Never hand a partner a token that would sign into a privileged admin account.
    const recipientRole = await admin.from("namana_roles").select("role")
      .eq("user_id", userId).maybeSingle();
    if (recipientRole.error || recipientRole.data?.role === "superadmin") {
      return response(origin, { error: "Akun admin tidak boleh menerima link mitra. Gunakan email khusus mitra." }, 403);
    }

    if (action === "create") {
      const existing = await admin.from("namina_business_workspaces")
        .select("id").eq("owner_id", userId).maybeSingle();
      if (existing.error) return response(origin, { error: "Tidak dapat memeriksa workspace." }, 502);
      if (existing.data) {
        workspaceId = existing.data.id;
        const update = await admin.from("namina_business_workspaces")
          .update({ display_name: name, whatsapp_number: whatsapp })
          .eq("id", existing.data.id);
        if (update.error) return response(origin, { error: "Tidak dapat memperbarui data mitra." }, 502);
      } else {
        const inserted = await admin.from("namina_business_workspaces")
          .insert({ owner_id: userId, display_name: name, whatsapp_number: whatsapp })
          .select("id").single();
        if (inserted.error) return response(origin, { error: "Workspace gagal disiapkan." }, 502);
        workspaceId = inserted.data.id;
      }
    }

    // Hash fragment is not sent to our web server in HTTP requests or referrers.
    // /akses removes the fragment before exchanging the OTP to a local Supabase session.
    const link = APP_ORIGIN + "/akses#token_hash=" + encodeURIComponent(hashedToken) + "&type=magiclink";
    return response(origin, { link, email, name, whatsapp, workspaceId, oneTime: true });
  } catch {
    return response(origin, { error: "Gagal menyiapkan akses. Coba kembali." }, 500);
  }
});
