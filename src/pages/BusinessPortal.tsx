import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link } from "./BusinessUi";
import { businessClient, type BusinessSiteRow, type BusinessWorkspace } from "../business/client";
import { loadViniTemplate, siteDocumentSchema } from "../static/sites";
import { slugSchema } from "../domain/content";
import "../business.css";

const statusText: Record<BusinessWorkspace["subscription_status"], string> = {
  pending: "Menunggu aktivasi",
  active: "Aktif",
  past_due: "Perlu diperpanjang",
  suspended: "Dijeda",
};

export function BusinessPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState<BusinessWorkspace | null>(null);
  const [sites, setSites] = useState<BusinessSiteRow[]>([]);
  const [newSlug, setNewSlug] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const canCreate = !!workspace && workspace.subscription_status === "active" && !!workspace.current_period_end && new Date(workspace.current_period_end).getTime() > Date.now();

  async function refresh(current: User) {
    if (!businessClient) return;
    setError("");
    try {
      let { data, error: lookupError } = await businessClient
        .from("namina_business_workspaces")
        .select("id,owner_id,display_name,plan,subscription_status,max_sites,current_period_end")
        .eq("owner_id", current.id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!data) {
        const { error: registerError } = await businessClient.rpc("namina_business_register", {
          p_display_name: (current.user_metadata?.full_name as string | undefined) || "",
        });
        if (registerError) throw registerError;
        const response = await businessClient.from("namina_business_workspaces")
          .select("id,owner_id,display_name,plan,subscription_status,max_sites,current_period_end")
          .eq("owner_id", current.id).single();
        if (response.error) throw response.error;
        data = response.data;
      }
      const currentWorkspace = data as BusinessWorkspace;
      setWorkspace(currentWorkspace);
      const response = await businessClient
        .from("namina_business_sites")
        .select("id,workspace_id,slug,document,created_at,updated_at,published_sha")
        .eq("workspace_id", currentWorkspace.id).order("created_at", { ascending: false });
      if (response.error) throw response.error;
      setSites((response.data || []) as BusinessSiteRow[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak bisa memuat workspace.");
    }
  }

  useEffect(() => {
    if (!businessClient) {
      setError("Layanan akun belum dikonfigurasi.");
      setLoading(false);
      return;
    }
    let active = true;
    void businessClient.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user);
      if (data.user) await refresh(data.user);
      if (active) setLoading(false);
    }).catch((cause: Error) => { if (active) { setError(cause.message); setLoading(false); } });
    const { data: listener } = businessClient.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (!session) { setWorkspace(null); setSites([]); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessClient) return;
    setBusy(true); setError(""); setFeedback("");
    try {
      const result = await businessClient.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setUser(result.data.user);
      await refresh(result.data.user);
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat masuk.");
    } finally { setBusy(false); }
  }

  async function createSite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessClient || !workspace) return;
    setError(""); setFeedback("");
    const slug = newSlug.trim().toLowerCase();
    const checked = slugSchema.safeParse(slug);
    if (!checked.success) { setError("Nama link harus terdiri dari 3–48 karakter, huruf kecil, angka, atau tanda hubung."); return; }
    if (sites.some((site) => site.slug === slug)) { setError("Nama link sudah ada di workspace."); return; }
    if (sites.length >= workspace.max_sites) { setError("Kuota website penuh."); return; }
    if (!canCreate) {
      setError("Paket Bisnis belum aktif atau masa langganan sudah berakhir."); return;
    }
    setBusy(true);
    try {
      const draft = siteDocumentSchema.parse(await loadViniTemplate(slug));
      const response = await businessClient.from("namina_business_sites").insert({
        workspace_id: workspace.id, slug, document: draft,
      }).select("id").single();
      if (response.error) throw response.error;
      setNewSlug("");
      // Open the fully populated preview immediately after creating the private site.
      window.location.assign("/studio?site=" + encodeURIComponent(response.data.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal membuat website."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await businessClient?.auth.signOut();
    setUser(null); setSites([]); setWorkspace(null);
  }

  return <main className="business">
    <header className="business__header">
      <Link href="/studio" className="business__logo">NAMINA<span>STUDIO MITRA</span></Link>
      <nav>
        {user && <button type="button" onClick={() => void signOut()}>Keluar</button>}
      </nav>
    </header>
    <div className="business__shell">
      {loading ? <p className="business__notice">Memeriksa akses Studio…</p> : !user ? <>
        <div className="business__eyebrow">NAMINA BUSINESS · AKSES MITRA</div>
        <h1>Studio pribadi, tanpa password.</h1>
        <p className="business__lead">Sudah menjadi mitra NAMINA? Buka tautan pribadi yang dikirim admin melalui WhatsApp. Kamu langsung masuk ke workspace dan daftar klien milikmu sendiri.</p>
        <div className="business__magic-info">
          <span className="business__magic-symbol" aria-hidden="true">✦</span>
          <h2>Masuk lewat Magic Link</h2>
          <p>Link hanya sekali pakai demi keamanan. Setelah masuk, sesi tersimpan di perangkat ini sehingga tidak perlu mengisi email dan password setiap kali bekerja.</p>
          <a className="business__primary" target="_blank" rel="noopener noreferrer"
            href={"https://wa.me/62881022445869?text="+encodeURIComponent("Halo Teh Vini, saya mau daftar atau minta ulang Magic Link Paket Bisnis NAMINA.")}>Minta Link via WA</a>
        </div>
        <details className="business__staff-login">
          <summary>Masuk manual (admin / akun lama)</summary>
          <div className="business__auth-card">
            <form onSubmit={(event) => void handleAuth(event)}>
              <label>Email
                <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@contoh.com" />
              </label>
              <label>Password
                <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password akun lama" />
              </label>
              <button className="business__primary" type="submit" disabled={busy}>{busy ? "Memproses…" : "Masuk Manual"}</button>
            </form>
          </div>
        </details>
      </> : <>
        <div className="business__eyebrow">DASHBOARD MITRA</div>
        <h1>Halo, {workspace?.display_name || user.email?.split("@")[0] || "Mitra"}.</h1>
        <p className="business__lead">Kelola draft website klien melalui Studio visual pribadi. Data mitra lain tidak dapat diakses dari akun ini.</p>
        {workspace && <>
          <div className="business__stats">
            <div><small>Status langganan</small><strong>{workspace.subscription_status === "active" && !canCreate ? "Perlu diperpanjang" : statusText[workspace.subscription_status]}</strong><span>{workspace.subscription_status === "pending" ? "Menunggu aktivasi admin. Belum ada pembayaran." : "Paket Bisnis NAMINA"}</span></div>
          </div>
          <section className="business__section">
            <div className="business__section-head"><h2>Website klienku</h2><span>Website dan draft pribadi</span></div>
            {sites.length ? <div className="business__sites">{sites.map((item) =>
              <div className="business__site" key={item.id}>
                <div><strong>/{item.slug}</strong><small>{item.published_sha?"Sudah terbit":"Draft · belum diterbitkan"}</small></div>
                <a href={"/studio?site=" + encodeURIComponent(item.id)}>Edit Website</a>
                {item.published_sha&&<a href={"/"+item.slug} target="_blank" rel="noopener noreferrer">Lihat Web ↗</a>}
              </div>,
            )}</div> : <p className="business__empty">Belum ada website. Buat draft pertama untuk mencoba Studio mitra.</p>}
          </section>
          {!canCreate && <section className="business__section">
            <h2>Perpanjang Paket Bisnis</h2>
            <p className="business__fineprint">Website yang sudah ada tetap dapat diedit. Untuk membuat website baru lagi, hubungi admin NAMINA melalui WhatsApp.</p>
            <a className="business__primary" href={"https://wa.me/62881022445869?text=" +
              encodeURIComponent("Halo Teh Vini, saya " + (workspace.display_name || user.email || "mitra NAMINA") +
              ". Mau memperpanjang Paket Bisnis NAMINA. Mohon informasi proses perpanjangannya.")} target="_blank" rel="noopener noreferrer">
              Perpanjang via WA
            </a>
          </section>}
          <section className="business__section">
            <h2>+ Buat website baru</h2>
            <p className="business__fineprint">Setiap website baru otomatis terisi contoh /vini: video, slide ikon Nama/Karir/Skill, Karya, dan Produk. Tinggal ganti dengan data klien.</p>
            <form className="business__create" onSubmit={(event) => void createSite(event)}>
              <label>Nama link website klien
                <input required maxLength={48} value={newSlug} placeholder="contoh: klien-siti" onChange={(event) => setNewSlug(event.target.value)} />
              </label>
              <button className="business__primary" type="submit" disabled={busy || sites.length >= workspace.max_sites || !canCreate}>Buat dari Template Vini</button>
            </form>
            <p className="business__fineprint">Perpanjangan langganan dilakukan melalui WhatsApp, bukan pembayaran di website.</p>
          </section>
        </>}
      </>}
      {feedback && <p role="status" className="business__success">{feedback}</p>}
      {error && <p role="alert" className="business__error">{error}</p>}
    </div>
  </main>;
}
