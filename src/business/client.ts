import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const businessClient = url && publishableKey
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export type BusinessWorkspace = {
  id: string;
  owner_id: string;
  display_name: string;
  plan: "business";
  subscription_status: "pending" | "active" | "past_due" | "suspended";
  max_sites: number;
  current_period_end: string | null;
};

export type BusinessSiteRow = {
  id: string;
  workspace_id: string;
  slug: string;
  document: unknown;
  created_at: string;
  updated_at: string;
  published_sha: string | null;
};
