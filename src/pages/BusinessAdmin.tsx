import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { businessClient, type BusinessWorkspace } from "../business/client";
import "../business.css";

type Partner = BusinessWorkspace & { sites?: number; whatsapp_number?: string };
type PrivateLink = { link: string; name: string; email: string; whatsapp: string; workspaceId: string };

function shareOnWhatsapp(data: PrivateLink) {
  const text = "Halo " + (data.name || "Mitra NAMINA") +
    ", ini link pribadi Studio NAMINA kamu:\n\n" + data.link +
    "\n\nSimpan link ini. Bisa dibuka kapan saja, jangan dibagikan ke orang lain. " +
    "Masa aktif Paket Bisnis hanya membatasi pembuatan website baru.";
  return "https://wa.me/" + data.whatsapp + "?text=" + encodeURIComponent(text);
}

export function BusinessAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [issued, setIssued] = useState<PrivateLink | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!businessClient) return;
    const workspaces = await businessClient.from("namina_business_workspaces")
      .select("id,owner_id,display_name,whatsapp_number,plan,subscription_status,max_sites,current_period_end")
      .order("created_at", { ascending: false });
    if (workspaces.error) throw workspaces.error;
    const sites = await businessClient.from("namina_business_sites").select("workspace_id");
    if (sites.error) throw sites.error;
    const counts = new Map<string, number>();
    for (const item of sites.data || []) counts.set(item.workspace_id, (counts.get(item.workspace_id) || 0) + 1);
    setPartners(((workspaces.data || []) as Partner[]).map((w) => ({ ...w, sites: counts.get(w.id) || 0 })));
  }

  async function checkAdmin(current: User) {
    if (!businessClient) return;
    const permission = await businessClient.rpc("namana_is_admin");
    if (permission.error) throw permission.error;
    setUser(current);
    setAllowed(permission.data === true);
    if (permission.data === true) await refresh();
  }

  useEffect(() => {
    let active = true;
    if (!businessClient) { setError("Supabase belum dikonfigurasi."); setLoading(false); return; }
    void businessClient.auth.getUser().then(async ({ data }) => {
      if (active && data.user) await checkAdmin(data.user);
    }).catch((cause: Error) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessClient) return;
    setError(""); setMessage(""); setWorking("login");
    try {
      const response = await businessClient.auth.signInWithPassword({
        email: adminEmail.trim(), password: adminPassword,
      });
      if (response.error) throw response.error;
      setAdminPassword("");
      await checkAdmin(response.data.user);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal masuk admin."); }
    finally { setWorking(""); }
  }

  async function emailAdminLink() {
    if (!businessClient || !adminEmail.trim()) { setError("Isi email superadmin dahulu."); return; }
    setWorking("login"); setError(""); setMessage("");
    try {
      const sent = await businessClient.auth.signInWithOtp({
        email: adminEmail.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: "https://namina.biz.id/studio/admin" },
      });
      if (sent.error) throw sent.error;
      setMessage("Tautan masuk admin dikirim ke email yang sudah terdaftar.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal mengirim email admin."); }
    finally { setWorking(""); }
  }

  async function logOut() {
    await businessClient?.auth.signOut({ scope: "local" });
    setUser(null); setAllowed(false); setIssued(null);
  }

  async function issueLink(action: "create" | "rotate" | "revoke", workspaceId?: string) {
    if (!businessClient || !allowed) return;
    const job = workspaceId || "new";
    setWorking(job); setError(""); setMessage(""); setIssued(null);
    try {
      const payload = action === "create"
        ? { action, name: newName.trim(), email: newEmail.trim(), whatsapp: newWhatsapp }
        : { action, workspaceId };
      const call = await businessClient.functions.invoke("namina-business-magic-link", { body: payload });
      if (call.error) {
        let problem = "Layanan link tidak dapat dihubungi. Periksa sesi superadmin.";
        const ctx = (call.error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          const detail = await ctx.json().catch(() => null) as { error?: string } | null;
          if (detail?.error) problem = detail.error;
        }
        throw new Error(problem);
      }
      if (action === "revoke") {
        if (!call.data?.revoked) throw new Error("Link belum berhasil dicabut.");
        setMessage("Link akses dicabut. Sesi lama tidak bisa membaca atau mengubah website. Buat link baru jika diperlukan.");
      } else {
        const data = call.data as Partial<PrivateLink> & { error?: string };
        if (data.error) throw new Error(data.error);
        if (!data.link || !data.workspaceId || !data.email) throw new Error("Link pribadi belum tersedia.");
        setIssued({ link: data.link, workspaceId: data.workspaceId, email: data.email,
          name: data.name || "", whatsapp: data.whatsapp || "" });
        setMessage("Link permanen berhasil dibuat. Hanya kirim kepada pemilik akun yang bersangkutan.");
        if (action === "create") { setNewName(""); setNewEmail(""); setNewWhatsapp(""); }
      }
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tidak bisa memproses link."); }
    finally { setWorking(""); }
  }

  async function extend(id: string) {
    if (!businessClient || !allowed) return;
    const days = Number(durations[id] || "30");
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      setError("Isi penambahan durasi antara 1 sampai 3650 hari."); return;
    }
    if (!window.confirm("Pembayaran melalui WA sudah diperiksa? Tambahkan " + days + " hari masa pembuatan website baru?")) return;
    setWorking(id); setMessage(""); setError("");
    try {
      const result = await businessClient.rpc("namina_business_admin_extend", {
        p_workspace_id: id, p_days: days,
      });
      if (result.error) throw result.error;
      setMessage("Masa pembuatan website diperpanjang " + days + " hari sampai " +
        new Date(result.data as string).toLocaleDateString("id-ID") +
        ". Website lama tetap bisa diedit kapan saja.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menambah durasi."); }
    finally { setWorking(""); }
  }

  return <main className="business">
    <header className="business__header">
      <a href="/studio" className="business__logo">NAMINA<span>ADMIN MITRA</span></a>
      <nav><a href="/studio">Studio Saya</a><a href="/studio-v1">Generator V1</a></nav>
    </header>
    <div className="business__shell">
      <div className="business__eyebrow">KHUSUS PEMILIK NAMINA</div>
      <h1>Kelola Mitra Bisnis.</h1>
      <p className="business__lead">
        Pembelian dan perpanjangan melalui WhatsApp. Dari sini Teh membuat link Studio
        pribadi dan menambah masa aktif Paket Bisnis secara manual.
      </p>
      {loading ? <p className="business__notice">Memeriksa izin superadmin…</p>
      : !user ? <section className="business__auth-card">
          <h2>Masuk Admin Mitra</h2>
          <p className="business__fineprint">Gunakan akun superadmin Supabase. Login ini khusus admin, bukan untuk mitra.</p>
          <form onSubmit={(event) => void login(event)}>
            <label>Email admin
              <input type="email" required autoComplete="username" value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)} />
            </label>
            <label>Password admin
              <input type="password" required autoComplete="current-password" value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)} />
            </label>
            <button type="submit" className="business__primary" disabled={!!working}>Masuk Admin</button>
          </form>
          <button className="business__secondary" type="button" onClick={() => void emailAdminLink()}
            disabled={!!working}>Kirim Link ke Email</button>
        </section>
      : !allowed ? <section className="business__section">
          <h2>Akses khusus admin</h2>
          <p>Akun ini bukan superadmin NAMINA. Gunakan akun pemilik yang benar.</p>
          <button type="button" className="business__primary" onClick={() => void logOut()}>Ganti Akun</button>
        </section>
      : <>
          <section className="business__section">
            <div className="business__section-head"><h2>+ Tambah Mitra Baru</h2><span>Pendaftaran lewat WA</span></div>
            <form className="business__invite-form" onSubmit={(e) => { e.preventDefault(); void issueLink("create"); }}>
              <label>Nama mitra
                <input required minLength={2} maxLength={100} value={newName}
                  onChange={(e) => setNewName(e.target.value)} placeholder="Nama lengkap mitra" />
              </label>
              <label>Email akun
                <input required type="email" maxLength={254} value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)} placeholder="nama@email.com" />
              </label>
              <label>Nomor WhatsApp
                <input required type="tel" value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)} placeholder="08xxxxxxxxxx" />
              </label>
              <button type="submit" className="business__primary" disabled={!!working}>
                {working === "new" ? "Memproses…" : "Buat Link Studio"}
              </button>
            </form>
            <p className="business__fineprint">
              Link berlaku terus selama belum dicabut atau diganti. Setelah pembayaran WA
              dikonfirmasi, aktifkan masa 30 hari melalui tombol perpanjangan di bawah.
            </p>
          </section>
          {issued && <section className="business__issued" role="status">
            <div className="business__section-head"><h2>Link untuk {issued.name || issued.email}</h2>
              <span>Berlaku terus</span></div>
            <p>Simpan dan bagikan hanya kepada mitra tersebut. Ini setara dengan kunci akun.
              Link lama tidak dapat dipakai setelah diganti atau dicabut.</p>
            <input readOnly aria-label="Link Studio pribadi mitra" value={issued.link}
              onFocus={(event) => event.target.select()} />
            <div className="business__issued-actions">
              <button type="button" className="business__primary" onClick={() => {
                void navigator.clipboard.writeText(issued.link)
                  .then(() => setMessage("Link tersalin."))
                  .catch(() => setMessage("Silakan salin link langsung dari kolom."));
              }}>Salin Link</button>
              {issued.whatsapp && <a className="business__primary" href={shareOnWhatsapp(issued)}
                target="_blank" rel="noopener noreferrer">Kirim WhatsApp</a>}
              <button type="button" className="business__secondary" onClick={() => setIssued(null)}>Sembunyikan</button>
            </div>
          </section>}
          <section className="business__section">
            <div className="business__section-head"><h2>Daftar Mitra</h2><span>{partners.length} akun</span></div>
            {partners.length === 0 ? <p className="business__empty">Belum ada mitra terdaftar.</p> :
              <div className="business__admin-list">
                {partners.map((partner) => {
                  const activeUntil = partner.current_period_end
                    ? new Date(partner.current_period_end) : null;
                  const canCreate = partner.subscription_status === "active" &&
                    !!activeUntil && activeUntil.getTime() > Date.now();
                  return <div className="business__admin-row business__admin-row--partner" key={partner.id}>
                    <div className="business__admin-summary">
                      <strong>{partner.display_name || "Mitra NAMINA"}</strong>
                      <small>WA: {partner.whatsapp_number || "Belum tercatat"} · {partner.sites || 0}/{partner.max_sites} website</small>
                      <small>{canCreate ? "Bisa tambah website" : "Hanya bisa edit website lama"} ·
                        Masa tambah hingga {activeUntil ? activeUntil.toLocaleDateString("id-ID") : "belum aktif"}</small>
                      <div className="business__partner-buttons">
                        <button className="business__secondary" type="button" disabled={!!working}
                          onClick={() => {
                            if (window.confirm("Buat link baru? Link sebelumnya langsung tidak berlaku.")) {
                              void issueLink("rotate", partner.id);
                            }
                          }}>Ganti Link</button>
                        <button className="business__secondary" type="button" disabled={!!working}
                          onClick={() => {
                            if (window.confirm("Cabut link mitra ini? Sesi Studio yang lama akan kehilangan izin edit.")) {
                              void issueLink("revoke", partner.id);
                            }
                          }}>Cabut Link</button>
                      </div>
                    </div>
                    <div className="business__renew-controls">
                      <label>Tambah durasi (hari)
                        <input type="number" min="1" max="3650" step="1" inputMode="numeric"
                          value={durations[partner.id] ?? "30"}
                          onChange={(e) => setDurations((prev) => ({ ...prev, [partner.id]: e.target.value }))} />
                      </label>
                      <button type="button" className="business__primary" disabled={!!working}
                        onClick={() => void extend(partner.id)}>
                        {working === partner.id ? "Memproses…" : "Perpanjang Akses"}
                      </button>
                    </div>
                  </div>;
                })}
              </div>}
          </section>
          <p className="business__fineprint">
            Memperpanjang akses tidak menerima pembayaran otomatis. Pastikan pembayaran Rp87.000/bulan
            sudah Teh cek di WhatsApp sebelum menambahkan 30 hari. Durasi bisa diubah secara manual.
          </p>
        </>}
      {user && <p className="business__fineprint">Akun admin: {user.email}</p>}
      {message && <p className="business__success" role="status">{message}</p>}
      {error && <p className="business__error" role="alert">{error}</p>}
    </div>
  </main>;
}
