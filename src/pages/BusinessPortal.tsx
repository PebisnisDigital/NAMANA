import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link } from "./BusinessUi";
import { businessClient, type BusinessSiteRow, type BusinessWorkspace } from "../business/client";
import { blankSite, siteDocumentSchema } from "../static/sites";
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
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState<BusinessWorkspace | null>(null);
  const [sites, setSites] = useState<BusinessSiteRow[]>([]);
  const [newSlug, setNewSlug] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const canManage = !!workspace && workspace.subscription_status === "active" && !!workspace.current_period_end && new Date(workspace.current_period_end).getTime() > Date.now();

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
        .select("id,workspace_id,slug,document,created_at,updated_at")
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
      if (registering) {
        if (name.trim().length < 2 || name.trim().length > 100) throw new Error("Nama harus 2–100 karakter.");
        const result = await businessClient.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + "/mitra" },
        });
        if (result.error) throw result.error;
        if (!result.data.session) {
          setFeedback("Pendaftaran diterima. Periksa email untuk verifikasi, lalu masuk ke Dashboard Mitra.");
        } else {
          setUser(result.data.user);
          if (result.data.user) await refresh(result.data.user);
        }
      } else {
        const result = await businessClient.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        setUser(result.data.user);
        await refresh(result.data.user);
      }
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
    if (!canManage) {
      setError("Paket Bisnis belum aktif atau masa langganan sudah berakhir."); return;
    }
    setBusy(true);
    try {
      const draft = siteDocumentSchema.parse(blankSite(slug));
      const response = await businessClient.from("namina_business_sites").insert({
        workspace_id: workspace.id, slug, document: draft,
      }).select("id").single();
      if (response.error) throw response.error;
      setNewSlug("");
      setFeedback("Draft website berhasil dibuat. Hanya akun mitra ini yang bisa membukanya.");
      if (user) await refresh(user);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal membuat website."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await businessClient?.auth.signOut();
    setUser(null); setSites([]); setWorkspace(null);
  }

  return <main className="business">
    <header className="business__header">
      <Link href="/" className="business__logo">NAMINA<span>BUSINESS</span></Link>
      <nav>
        <Link href="/studio">Studio Admin</Link>
        {user && <button type="button" onClick={() => void signOut()}>Keluar</button>}
      </nav>
    </header>
    <div className="business__shell">
      {loading ? <p className="business__notice">Memeriksa akun mitra…</p> : !user ? <>
        <div className="business__eyebrow">NAMINA BUSINESS · AKUN MITRA</div>
        <h1>Bangun jasa website milikmu.</h1>
        <p className="business__lead">Studio visual untuk mitra NAMINA. Daftar gratis untuk menyiapkan akun; akses komersial baru aktif setelah langganan diverifikasi.</p>
        <div className="business__auth-card">
          <div className="business__switch">
            <button className={!registering ? "is-active" : ""} type="button" onClick={() => { setRegistering(false); setError(""); }}>Masuk</button>
            <button className={registering ? "is-active" : ""} type="button" onClick={() => { setRegistering(true); setError(""); }}>Daftar Mitra</button>
          </div>
          <form onSubmit={(event) => void handleAuth(event)}>
            {registering && <label>Nama lengkap
              <input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama bisnis atau nama mitra" />
            </label>}
            <label>Email
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" />
            </label>
            <label>Password
              <input required type="password" minLength={8} autoComplete={registering ? "new-password" : "current-password"}
                value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" />
            </label>
            <button className="business__primary" type="submit" disabled={busy}>{busy ? "Memproses…" : registering ? "Daftar Akun" : "Masuk Dashboard"}</button>
          </form>
          <p className="business__fineprint">Paket Bisnis Rp87.000/bulan. Tahap ini belum menerima pembayaran dan belum mengaktifkan publikasi website.</p>
        </div>
      </> : <>
        <div className="business__eyebrow">DASHBOARD MITRA</div>
        <h1>Halo, {workspace?.display_name || user.email?.split("@")[0] || "Mitra"}.</h1>
        <p className="business__lead">Kelola draft website klien melalui Studio visual pribadi. Data mitra lain tidak dapat diakses dari akun ini.</p>
        {workspace && <>
          <div className="business__stats">
            <div><small>Status langganan</small><strong>{workspace.subscription_status === "active" && !canManage ? "Perlu diperpanjang" : statusText[workspace.subscription_status]}</strong><span>{workspace.subscription_status === "pending" ? "Menunggu aktivasi admin. Belum ada pembayaran." : "Paket Bisnis NAMINA"}</span></div>
            <div><small>Website draft</small><strong>{sites.length} / {workspace.max_sites}</strong><span>Kuota awal Paket Bisnis</span></div>
            <div><small>Biaya langganan</small><strong>Rp87.000</strong><span>Per bulan · checkout belum aktif</span></div>
          </div>
          <section className="business__section">
            <div className="business__section-head"><h2>Website klienku</h2><span>Draft privat</span></div>
            {sites.length ? <div className="business__sites">{sites.map((item) =>
              <div className="business__site" key={item.id}>
                <div><strong>/{item.slug}</strong><small>Draft · belum diterbitkan</small></div>
                <a href={"/mitra/studio?id=" + encodeURIComponent(item.id)}>Edit visual</a>
              </div>,
            )}</div> : <p className="business__empty">Belum ada website. Buat draft pertama untuk mencoba Studio mitra.</p>}
          </section>
          <section className="business__section">
            <h2>+ Buat website baru</h2>
            <form className="business__create" onSubmit={(event) => void createSite(event)}>
              <label>Nama link website klien
                <input required maxLength={48} value={newSlug} placeholder="contoh: klien-siti" onChange={(event) => setNewSlug(event.target.value)} />
              </label>
              <button className="business__primary" type="submit" disabled={busy || sites.length >= workspace.max_sites || !canManage}>Buat Draft</button>
            </form>
            <p className="business__fineprint">{canManage ? "Draft mitra tetap privat, belum dipublikasikan. " : "Untuk mulai membuat website, tunggu aktivasi Paket Bisnis oleh admin. "}Link publik dan pembayaran otomatis belum dibuka pada Sprint 1.</p>
          </section>
        </>}
      </>}
      {feedback && <p role="status" className="business__success">{feedback}</p>}
      {error && <p role="alert" className="business__error">{error}</p>}
    </div>
  </main>;
}
