import { useEffect, useState } from "react";
import { businessClient } from "../business/client";
import { BusinessPortal } from "./BusinessPortal";
import { BusinessVisualStudio } from "./BusinessVisualStudio";
import { StudioV2 } from "./StudioV2";

/**
 * Same official /studio for everyone:
 * - Admin: Visual Studio publishing directly into the Supabase public site store.
 * - Partner: their own Supabase-RLS workspace and visual editor.
 * Server-side RLS controls access; this is only a routing convenience.
 */
export function StudioGateway() {
  const [mode, setMode] = useState<"checking"|"admin"|"partner">("checking");
  useEffect(() => {
    let active = true;
    if (!businessClient) { setMode("admin"); return; }
    void (async () => {
      const result = await businessClient.auth.getUser();
      if (!active) return;
      if (!result.data.user) { setMode("admin"); return; }
      const admin = await businessClient.rpc("namana_is_admin");
      if (!active) return;
      if (!admin.error && admin.data === true) { setMode("admin"); return; }
      const owner = await businessClient.from("namina_business_workspaces")
        .select("id").eq("owner_id", result.data.user.id).maybeSingle();
      if (!active) return;
      setMode(owner.data?.id ? "partner" : "admin");
    })().catch(() => { if (active) setMode("admin"); });
    return () => { active = false; };
  }, []);

  if (mode === "checking") return <main className="studio-v2__gate">
    <p>Memeriksa ruang kerja NAMINA…</p>
  </main>;
  if (mode === "partner") {
    return new URLSearchParams(window.location.search).has("site")
      ? <BusinessVisualStudio /> : <BusinessPortal />;
  }
  return <StudioV2 />;
}
