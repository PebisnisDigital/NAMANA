import { useCallback, useEffect, useRef, useState } from "react";
import { ViniCinematic } from "../components/ViniCinematic";
import { slugSchema } from "../domain/content";
import { blankOriginal, viniOriginal } from "../static/originalSeed";
import { blankSite, prepareSite, resolveMedia, siteDocumentSchema, viniSeed, type SiteDocument } from "../static/sites";
import { BriefInbox } from "./BriefInbox";
import type { BriefRecord } from "../domain/brief";
import { OriginalStudioEditor } from "./OriginalStudioEditor";
import { OriginalStyleEditor } from "./OriginalStyleEditor";
import { originalStyleDefaults } from "../static/originalStyle";
import { StudioMediaEditor, type MediaPrompts } from "./StudioMediaEditor";
import "../studio-static.css";

type Session = { authenticated: boolean; configured: boolean };
type StudioResponse = { slugs: string[] };
type FileResponse = { document: SiteDocument; sha: string };

async function callApi<T>(action: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/studio?action=${action}`, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error((result as { error?: string }).error || `Permintaan gagal (${response.status}).`);
  return result as T;
}

const draftKey = (slug: string) => `namana:studio:draft:${slug}`;
const menuFields = [
  { key: "nama", label: "Nama", description: "Identitas dan biodata" },
  { key: "karir", label: "Karir", description: "Pengalaman dan perjalanan" },
  { key: "skill", label: "Skill", description: "Keahlian dan kemampuan" },
  { key: "karya", label: "Karya", description: "Portofolio dan pencapaian" },
  { key: "produk", label: "Produk", description: "Produk dan bisnis" },
] as const;
type StudioStep = "input" | "media" | "result";
const promptKey = (slug: string) => `namina:studio:media-prompts:${slug}`;
const emptyPrompts: MediaPrompts = { image: "", video: "" };
function savedPrompts(slug: string): MediaPrompts {
  try {
    const raw = localStorage.getItem(promptKey(slug));
    if (!raw) return { ...emptyPrompts };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return { ...emptyPrompts };
    const prompts = value as Record<string, unknown>;
    return {
      image: typeof prompts.image === "string" ? prompts.image.slice(0, 7000) : "",
      video: typeof prompts.video === "string" ? prompts.video.slice(0, 7000) : "",
    };
  } catch {
    return { ...emptyPrompts };
  }
}

function ensureOriginal(site: SiteDocument): SiteDocument {
  if (!site.content.original) {
    site.content.original = site.slug === "vini"
      ? structuredClone(viniOriginal)
      : blankOriginal(site.content.identity.displayName);
  }
  return site;
}

async function imageBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gambar gagal dibaca."));
    reader.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

function textList(value: string) {
  return value.split(/[\n,;]+/).map((text) => text.trim()).filter(Boolean).slice(0, 30);
}

function whatsappLink(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}

export function StaticStudio() {
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [activeSlug, setActiveSlug] = useState("vini");
  const [newSlug, setNewSlug] = useState("");
  const [document, setDocument] = useState<SiteDocument | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localMediaPreviews, setLocalMediaPreviews] = useState<Record<string, string>>({});
  const [isPreview, setIsPreview] = useState(false);
  const [step, setStep] = useState<StudioStep>("input");
  const [mediaPrompts, setMediaPrompts] = useState<MediaPrompts>({ ...emptyPrompts });
  const [approved, setApproved] = useState(false);
  const [showBriefs, setShowBriefs] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const initialLoadStarted = useRef(false);
  const uploadedPreviewUrls = useRef<string[]>([]);

  const loadSlugs = useCallback(async () => {
    const result = await callApi<StudioResponse>("list");
    setSlugs(result.slugs.sort((a, b) => a.localeCompare(b)));
  }, []);

  useEffect(() => {
    callApi<Session>("session").then(setSession).catch((cause: Error) => setError(cause.message));
  }, []);

  useEffect(() => {
    if (session?.authenticated) loadSlugs().catch((cause: Error) => setError(cause.message));
  }, [session?.authenticated, loadSlugs]);

  const openSite = useCallback(async (slug: string) => {
    setWorking(true);
    setError("");
    setMessage("");
    setActiveSlug(slug);
    try {
      let site: SiteDocument;
      let remoteSha: string | null = null;
      try {
        const response = await callApi<FileResponse>(`site&slug=${encodeURIComponent(slug)}`);
        site = siteDocumentSchema.parse(response.document);
        remoteSha = response.sha;
      } catch (cause) {
        if (!(cause instanceof Error) || !cause.message.includes("Belum ada data")) throw cause;
        site = slug === "vini" ? structuredClone(viniSeed) : blankSite(slug);
      }
      const draft = localStorage.getItem(draftKey(slug));
      if (draft) {
        const parsed = siteDocumentSchema.safeParse(JSON.parse(draft));
        if (parsed.success && parsed.data.slug === slug) {
          site = parsed.data;
          setMessage("Draft lokal dipulihkan. Perubahan belum dipublikasikan.");
        }
      }
      setDocument(ensureOriginal(site));
      setMediaPrompts(savedPrompts(slug));
      setSha(remoteSha);
      setIsPreview(false);
      setStep("input");
      setApproved(false);
    } catch (cause) {
      setDocument(null);
      setError((cause as Error).message);
    } finally {
      setWorking(false);
    }
  }, []);

  useEffect(() => {
    if (session?.authenticated && slugs.length && !initialLoadStarted.current) {
      initialLoadStarted.current = true;
      void openSite(slugs.includes("vini") ? "vini" : slugs[0]);
    }
  }, [session?.authenticated, slugs, openSite]);

  const change = (update: (next: SiteDocument) => void) => {
    setDocument((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      update(next);
      localStorage.setItem(draftKey(next.slug), JSON.stringify(next));
      return next;
    });
    setError("");
    setApproved(false);
    setMessage("Draft tersimpan di browser ini. Belum dipublikasikan.");
  };

  const publish = async () => {
    if (!document || step !== "result" || !approved) return;
    const checked = siteDocumentSchema.safeParse(prepareSite(document));
    if (!checked.success) {
      setError(checked.error.issues[0]?.message || "Periksa data sebelum terbit.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const result = await callApi<{ ok: true; sha: string }>("publish", {
        method: "POST", body: JSON.stringify({ document: checked.data, sha }),
      });
      setSha(result.sha);
      setDocument(checked.data);
      localStorage.removeItem(draftKey(document.slug));
      setMessage("Publikasi dikirim ke GitHub. Vercel akan memperbarui website setelah deployment selesai.");
      setApproved(false);
      await loadSlugs();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const goToFinal = () => {
    if (!document) return;
    const names = menuFields.map(({ key, label }) => (document.content.original?.menuTitles?.[key] ?? label).trim());
    if (names.some((name) => !name || name.length > 24)) {
      setError("Nama menu harus diisi dan maksimal 24 karakter.");
      return;
    }
    if (new Set(names.map((name) => name.toLocaleLowerCase("id"))).size !== names.length) {
      setError("Nama tiap menu harus berbeda agar pengunjung tidak bingung.");
      return;
    }
    const checked = siteDocumentSchema.safeParse(prepareSite(document));
    if (!checked.success) {
      setError(checked.error.issues[0]?.message || "Periksa data sebelum lanjut.");
      return;
    }
    setError("");
    setApproved(false);
    setStep("result");
  };

  const changePrompt = (field: keyof MediaPrompts, value: string) => {
    setMediaPrompts((current) => {
      const next = { ...current, [field]: value.slice(0, 7000) };
      try { localStorage.setItem(promptKey(activeSlug), JSON.stringify(next)); } catch { /* Browser storage may be disabled. */ }
      return next;
    });
  };

  const createSite = () => {
    const slug = newSlug.toLowerCase().trim();
    const parsed = slugSchema.safeParse(slug);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message || "Slug belum valid.");
    if (slugs.includes(slug)) return setError("Nama halaman sudah terpakai.");
    setDocument(blankSite(slug));
    setMediaPrompts(savedPrompts(slug));
    setActiveSlug(slug);
    setSha(null);
    setNewSlug("");
    setIsPreview(false);
    setStep("input");
    setApproved(false);
    setError("");
    setMessage("Draft baru siap. Isi data, tambahkan media, lalu lihat hasil web.");
  };

  const prepareFromBrief = (brief: BriefRecord, chosenSlug: string) => {
    const suggested = chosenSlug || brief.website_slug || brief.requested_slug || brief.details.fullName
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
    const parsed = slugSchema.safeParse(suggested);
    if (!parsed.success) {
      setError("Nama halaman belum valid. Perbaiki slug sebelum menyiapkan draft.");
      return false;
    }
    if (slugs.includes(suggested)) {
      setError(`Halaman /${suggested} sudah ada. Buka melalui pilihan klien.`);
      return false;
    }
    const next = blankSite(suggested);
    const name = brief.details.displayName || brief.details.fullName;
    next.content.identity.displayName = name;
    next.content.identity.profession = brief.details.profession;
    next.content.identity.bio = brief.details.bio;
    next.content.original!.nama.items[0].value = name;
    next.content.original!.nama.description = brief.details.bio;
    next.content.original!.contactUrl = whatsappLink(brief.details.whatsapp);
    next.content.original!.karir.items = textList(brief.details.experience).map((value) => ({ id: crypto.randomUUID(), label: "Karir", value, icon: 8121304 }));
    next.content.original!.skill.items = textList(brief.details.skills).map((value) => ({ id: crypto.randomUUID(), label: "Skill", value, icon: 8121272 }));
    setDocument(next);
    setMediaPrompts(savedPrompts(suggested));
    setShowBriefs(false);
    setActiveSlug(suggested);
    setSha(null);
    setIsPreview(false);
    setStep("input");
    setApproved(false);
    setMessage(`Draft /${suggested} siap. Lengkapi konten dan media sebelum publikasi.`);
    setError("");
    return true;
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      await callApi("login", { method: "POST", body: JSON.stringify({ password }) });
      setSession({ configured: true, authenticated: true });
      setPassword("");
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  };

  const logout = async () => {
    await callApi("logout", { method: "POST", body: "{}" }).catch(() => {});
    setSession({ configured: true, authenticated: false });
    setDocument(null);
    setSlugs([]);
    initialLoadStarted.current = false;
  };

  useEffect(() => () => { uploadedPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const uploadGallery = async (id: string, file: File) => {
    if (!document) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1300000) {
      setError("Gunakan foto JPG, PNG, atau WebP maksimal 1,3 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const result = await callApi<{ url: string }>("upload", {
        method: "POST", body: JSON.stringify({ slug: document.slug, mime: file.type, base64: await imageBase64(file) }),
      });
      const previewUrl = URL.createObjectURL(file);
      uploadedPreviewUrls.current.push(previewUrl);
      setLocalMediaPreviews((previews) => ({ ...previews, [result.url]: previewUrl }));
      change((next) => { next.media.cards[id] = result.url; });
      setMessage("Gambar terunggah ke media. Data tetap draft sampai tahap publikasi final.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setUploading(false); }
  };

  if (!session) return <main className="studio-gate">
    {error ? <div className="studio-gate__card" role="alert"><h1>Studio tidak dapat dihubungi</h1><p>{error}</p><button type="button" onClick={() => location.reload()}>Coba lagi</button></div>
      : <p role="status">Memeriksa akses Studio…</p>}
  </main>;

  if (!session.configured || !session.authenticated) return <main className="studio-gate"><div className="studio-gate__card">
    <a className="studio-wordmark" href="/">NAMINA</a>
    <h1>{session.configured ? "Masuk Studio" : "Studio menunggu konfigurasi"}</h1>
    {session.configured ? <form onSubmit={login}>
      <label htmlFor="studio-password">Kata sandi tim admin</label>
      <input id="studio-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <button type="submit" disabled={working}>{working ? "Memeriksa…" : "Masuk Studio"}</button>
    </form> : <p>Konfigurasi Studio belum lengkap. Hubungi pengelola NAMINA.</p>}
    {error && <p className="studio-alert studio-alert--error" role="alert">{error}</p>}
    <a href="/vini">Lihat template Original</a>
  </div></main>;

  const prepared = document ? prepareSite(document) : null;
  const assetUrls = prepared ? Object.fromEntries(
    Object.entries(resolveMedia(prepared)).map(([id, url]) => [id, localMediaPreviews[url] || url]),
  ) : {};


  return <main className="studio-root studio-app">
    <header className="studio-app__topbar">
      <div className="studio-app__topbar-inner">
        <a className="studio-app__brand" href="/" aria-label="NAMINA, kembali ke beranda">NAMINA<span>STUDIO</span></a>
        <div className="studio-app__top-actions">
          <button type="button" onClick={() => setShowBriefs((value) => !value)}>{showBriefs ? "Kembali ke editor" : "Data masuk"}</button>
          <button type="button" className="studio-app__logout" onClick={() => void logout()}>Keluar</button>
        </div>
      </div>
    </header>
    <div className="studio-app__shell">
      {showBriefs ? <section className="studio-app__briefs"><BriefInbox onPrepare={prepareFromBrief} /></section> : <>
        <section className="studio-app__welcome">
          <p>HALO, SELAMAT DATANG!</p>
          <h1>Bangun cerita digitalmu.</h1>
          <span>Isi profil, siapkan media, lihat hasilnya. Semua dari satu tempat.</span>
        </section>
        <nav className="studio-app__stepper" aria-label="Tahapan pembuatan website">
          <button type="button" className={step === "input" ? "is-active" : "is-complete"} onClick={() => { setStep("input"); setApproved(false); }} disabled={!document} aria-current={step === "input" ? "step" : undefined}>
            <span className="studio-app__step-number">1</span><span>INPUT</span>
          </button>
          <span className="studio-app__step-line" aria-hidden="true" />
          <button type="button" className={step === "media" ? "is-active" : step === "result" ? "is-complete" : ""} onClick={() => { setStep("media"); setApproved(false); }} disabled={!document} aria-current={step === "media" ? "step" : undefined}>
            <span className="studio-app__step-number">2</span><span>MEDIA</span>
          </button>
          <span className="studio-app__step-line" aria-hidden="true" />
          <button type="button" className={step === "result" ? "is-active" : ""} disabled={step !== "result"} aria-current={step === "result" ? "step" : undefined}>
            <span className="studio-app__step-number">3</span><span>HASIL WEB</span>
          </button>
        </nav>
        <section className="studio-app__card studio-app__client">
          <div className="studio-app__card-heading">
            <span className="studio-app__card-icon" aria-hidden="true">⌂</span>
            <div><h2>Website yang diedit</h2><p>Pilih profil klien atau buat yang baru.</p></div>
          </div>
          <label className="studio-app__field" htmlFor="site-picker">
            <span>Nama website</span>
            <select id="site-picker" value={slugs.includes(activeSlug) ? activeSlug : ""} onChange={(event) => { if (event.target.value) void openSite(event.target.value); }}>
              {!slugs.includes(activeSlug) && <option value="">Klien baru (draft)</option>}
              {slugs.map((slug) => <option key={slug} value={slug}>/{slug}</option>)}
            </select>
          </label>
          <details className="studio-app__disclosure">
            <summary>+ Buat website baru</summary>
            <div className="studio-app__disclosure-body">
              <label className="studio-app__field" htmlFor="new-client-slug"><span>Nama link klien</span>
                <input id="new-client-slug" placeholder="contoh: namaklien" value={newSlug} onChange={(event) => setNewSlug(event.target.value)} />
                <small>Huruf kecil, angka dan tanda hubung. Panjang 3–48 karakter.</small>
              </label>
              <button className="studio-app__secondary" type="button" onClick={createSite}>Buat draft</button>
            </div>
          </details>
        </section>
        {error && <p className="studio-app__notice studio-app__notice--error" role="alert">{error}</p>}
        {message && <p className="studio-app__notice" role="status">{message}</p>}
        {!document ? <section className="studio-app__card"><p className="studio-app__empty">{working ? "Sedang memuat data klien..." : "Pilih klien atau buat website baru untuk mulai mengedit."}</p></section> : <>
          {step === "input" && <>
            <section className="studio-app__card studio-app__editor-card">
              <div className="studio-app__card-heading">
                <span className="studio-app__card-icon" aria-hidden="true">✎</span>
                <div><h2>INPUT · Data profil</h2><p>Pilih menu yang mau diisi. Nama menunya juga bisa diganti.</p></div>
              </div>
              <OriginalStudioEditor key={document.slug} site={document} change={change} />
            </section>
            <details className="studio-app__card studio-app__advanced">
              <summary><span aria-hidden="true">◈</span><span><strong>Kustomisasi desain</strong><small>Warna, font, ukuran teks, layout dan tombol</small></span><span aria-hidden="true">⌄</span></summary>
              <OriginalStyleEditor
                value={{ ...originalStyleDefaults, ...document.content.original?.style }}
                update={(field, value) => change((next) => { next.content.original!.style = { ...originalStyleDefaults, ...next.content.original!.style, [field]: value }; })}
                reset={() => change((next) => { delete next.content.original!.style; })}
              />
            </details>
          </>}
          {step === "media" && <StudioMediaEditor site={document} change={change} prompts={mediaPrompts} onPromptChange={changePrompt} uploading={uploading} previews={localMediaPreviews} onUpload={(id, file) => void uploadGallery(id, file)} />}
          {step === "result" && <>
            <section className="studio-app__card studio-app__result">
              <div className="studio-app__card-heading">
                <span className="studio-app__card-icon" aria-hidden="true">▣</span>
                <div><h2>HASIL WEB · Pratinjau</h2><p>Cek hasil sebelum website diterbitkan.</p></div>
              </div>
              <div className="studio-app__result-meta">
                <span>{"/" + document.slug}</span>
                <button type="button" onClick={() => setIsPreview((value) => !value)}>{isPreview ? "Perkecil preview" : "Perbesar preview"}</button>
              </div>
              <div className={"studio-app__preview" + (isPreview ? " studio-app__preview--large" : "")}>
                {prepared && <ViniCinematic key={prepared.slug} content={prepared.content} assetUrls={assetUrls} previewMode />}
              </div>
              <p className="studio-app__preview-hint">Ini pratinjau dari draft. <a href={"/" + document.slug} target="_blank" rel="noreferrer">Buka versi yang sudah terbit</a>.</p>
            </section>
            <details className="studio-app__card studio-app__advanced">
              <summary><span aria-hidden="true">◈</span><span><strong>Masih mau ubah desain?</strong><small>Warna, font dan tata letak bisa diedit di sini</small></span><span aria-hidden="true">⌄</span></summary>
              <OriginalStyleEditor
                value={{ ...originalStyleDefaults, ...document.content.original?.style }}
                update={(field, value) => change((next) => { next.content.original!.style = { ...originalStyleDefaults, ...next.content.original!.style, [field]: value }; })}
                reset={() => change((next) => { delete next.content.original!.style; })}
              />
            </details>
            <section className="studio-app__card studio-app__publish">
              <div className="studio-app__card-heading">
                <span className="studio-app__card-icon" aria-hidden="true">✓</span>
                <div><h2>Siap dipublikasikan?</h2><p>Pastikan data dan medianya sudah sesuai.</p></div>
              </div>
              <div className="studio-app__publish-link"><small>Alamat website</small><strong>{"namina.biz.id/" + document.slug}</strong></div>
              <ul className="studio-app__publish-list">
                {menuFields.map(({ key, label }) => <li key={key}><span>{document.content.original?.menuTitles?.[key]?.trim() || label}</span><span>{document.content.original?.[key].items.length ?? 0} isi</span></li>)}
              </ul>
              <label className="studio-app__approval">
                <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
                <span>Data, media, nama menu, dan tampilan sudah final. Saya setuju website ini dipublikasikan.</span>
              </label>
            </section>
          </>}
        </>}
        <footer className="studio-app__bottom">
          {step !== "input" && <button type="button" className="studio-app__back" onClick={() => { setStep(step === "result" ? "media" : "input"); setApproved(false); }}>Kembali</button>}
          {step === "input" && <button type="button" className="studio-app__primary" disabled={!document || working || uploading} onClick={() => { setStep("media"); setError(""); }}>Lanjut ke MEDIA <span aria-hidden="true">›</span></button>}
          {step === "media" && <button type="button" className="studio-app__primary" disabled={!document || working || uploading} onClick={goToFinal}>Lihat Hasil Web <span aria-hidden="true">›</span></button>}
          {step === "result" && <button type="button" className="studio-app__primary" disabled={!document || working || uploading || !approved} onClick={() => void publish()}>{working ? "Menerbitkan..." : "Publish Website"}</button>}
        </footer>
      </>}
    </div>
  </main>;
}
