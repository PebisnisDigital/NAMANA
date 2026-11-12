import { createClient } from "@supabase/supabase-js";
import { siteDocumentSchema, type SiteDocument } from "../src/static/sites.js";

/**
 * Server-only NAMINA publication store. Never import this file in client UI.
 * SUPABASE_SERVICE_ROLE_KEY is a Vercel server secret, not a VITE_ variable.
 */
function store() {
  const url = process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    throw new Error("Database publikasi belum dikonfigurasi di server.");
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export class PublicationConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationConflict";
  }
}

export async function listAdminPublications(): Promise<string[]> {
  const db = store();
  const { data, error } = await db.from("namina_published_sites")
    .select("slug").eq("source", "admin").order("slug");
  if (error) throw error;
  return (data || []).map((entry) => entry.slug as string);
}

export async function findAdminPublication(slug: string):
  Promise<{ document: SiteDocument; sha: string } | null> {
  const db = store();
  const { data, error } = await db.from("namina_published_sites")
    .select("document,revision,source").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data || data.source !== "admin") return null;
  return { document: siteDocumentSchema.parse(data.document), sha: "db:" + String(data.revision) };
}

export async function hasAnyPublication(slug: string): Promise<boolean> {
  const db = store();
  const { data, error } = await db.from("namina_published_sites")
    .select("slug").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Returns the incremented DB revision. Existing client snapshots live in GitHub
 * until first intentional admin publish; no legacy file is rewritten. */
export async function publishAdminToDatabase(
  document: SiteDocument, expectedSha: string | null,
  getLegacySha: () => Promise<string | null>,
): Promise<string> {
  const db = store();
  const parsed = siteDocumentSchema.parse(document);
  const { data: current, error: readError } = await db.from("namina_published_sites")
    .select("slug,source,revision").eq("slug", parsed.slug).maybeSingle();
  if (readError) throw readError;
  if (current) {
    if (current.source !== "admin") {
      throw new PublicationConflict("Alamat website sudah dimiliki mitra lain.");
    }
    const expected = "db:" + current.revision;
    if (expectedSha !== expected) {
      throw new PublicationConflict("Website sudah diubah di Studio lain. Muat ulang sebelum menerbitkan.");
    }
    const update = await db.from("namina_published_sites")
      .update({
        document: parsed,
        revision: Number(current.revision) + 1,
        published_at: new Date().toISOString(),
      })
      .eq("slug", parsed.slug)
      .eq("source", "admin")
      .eq("revision", current.revision)
      .select("revision").maybeSingle();
    if (update.error) throw update.error;
    if (!update.data) {
      throw new PublicationConflict("Ada publikasi lain yang lebih baru. Muat ulang dahulu.");
    }
    return "db:" + update.data.revision;
  }

  const existingLegacySha = await getLegacySha();
  if ((existingLegacySha || null) !== (expectedSha || null)) {
    throw new PublicationConflict("Ada perubahan website lama. Muat ulang sebelum migrasi.");
  }
  const partnerSite = await db.from("namina_business_sites")
    .select("id").eq("slug", parsed.slug).maybeSingle();
  if (partnerSite.error) throw partnerSite.error;
  if (partnerSite.data) {
    throw new PublicationConflict("Alamat ini sudah dipakai website milik mitra.");
  }

  const insert = await db.from("namina_published_sites")
    .insert({ slug: parsed.slug, document: parsed, source: "admin", workspace_id: null })
    .select("revision").single();
  if (insert.error) {
    if (insert.error.code === "23505") {
      throw new PublicationConflict("Alamat sudah terbit dari Studio lain. Muat ulang.");
    }
    throw insert.error;
  }
  return "db:" + insert.data.revision;
}
