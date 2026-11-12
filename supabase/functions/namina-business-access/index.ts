import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const ORIGIN = "https://namina.biz.id";
const allowedOrigins = new Set([ORIGIN, "https://www.namina.biz.id", "https://naminapro.vercel.app"]);
function response(origin: string, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : ORIGIN,
      "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Vary": "Origin",
    },
  });
}
async function digest(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  if (!allowedOrigins.has(origin)) return response(origin, { error: "Permintaan tidak diizinkan." }, 403);
  if (request.method === "OPTIONS") {
    const res = response(origin, {}, 200);
    return new Response(null, { status: 204, headers: res.headers });
  }
  if (request.method !== "POST") return response(origin, { error: "Metode tidak tersedia." }, 405);

  let raw: string;
  try { raw = await request.text(); } catch { return response(origin, { error: "Permintaan tidak valid." }, 400); }
  if (raw.length > 300) return response(origin, { error: "Link akses tidak valid." }, 400);
  let token: unknown;
  try { token = (JSON.parse(raw) as { token?: unknown })?.token; }
  catch { return response(origin, { error: "Link akses tidak valid." }, 400); }
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return response(origin, { error: "Link akses tidak valid." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) { try { secret = (JSON.parse(keys) as Record<string,string>).default || secret; } catch { /* legacy */ } }
  if (!supabaseUrl || !secret) return response(origin, { error: "Layanan akses belum siap." }, 503);

  const db = createClient(supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const hash = await digest(token);
    const lookup = await db.from("namina_business_access_keys")
      .select("workspace_id,rotated_at,revoked_at").eq("token_hash", hash).maybeSingle();
    if (lookup.error || !lookup.data || lookup.data.revoked_at) {
      return response(origin, { error: "Link telah diganti atau dicabut. Minta tautan terbaru kepada admin." }, 403);
    }
    const workspace = await db.from("namina_business_workspaces")
      .select("id,owner_id").eq("id", lookup.data.workspace_id).single();
    if (workspace.error || !workspace.data) return response(origin, { error: "Akses workspace tidak ditemukan." }, 403);
    const recipient = await db.auth.admin.getUserById(workspace.data.owner_id);
    if (recipient.error || !recipient.data.user?.email) return response(origin, { error: "Akun mitra tidak ditemukan." }, 403);

    // No permanent credential is ever a Supabase Auth JWT. Mint a fresh
    // one-time Supabase OTP on EVERY visit, exchanging it in the browser.
    const generated = await db.auth.admin.generateLink({
      type: "magiclink", email: recipient.data.user.email,
      options: { redirectTo: ORIGIN + "/studio" },
    });
    const otpHash = generated.data?.properties?.hashed_token;
    if (generated.error || !otpHash) return response(origin, { error: "Belum bisa membuka Studio. Coba lagi." }, 503);
    // Never return, echo or log the permanent secret.
    return response(origin, { token_hash: otpHash, type: "magiclink" });
  } catch {
    return response(origin, { error: "Gagal membuka Studio. Coba kembali." }, 503);
  }
});
