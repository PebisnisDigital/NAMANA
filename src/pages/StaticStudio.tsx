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
import "../studio-app.css";
import "../studio-namina.css";

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
type StudioStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type PublishStatus =
  | { phase: "deploying" | "live" | "pending"; slug: string; expected: SiteDocument };
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
  const [step, setStep] = useState<StudioStep>(1);
  const [publishStatus, setPublishStatus] = useState<PublishStatus | null>(null);
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
      setStep(1);
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
    if (!document || step !== 8 || !approved) return;
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
      setMessage("Data sudah dikirim ke GitHub. NAMINA sedang memeriksa hasil deployment Vercel.");
      setPublishStatus({ phase: "deploying", slug: checked.data.slug, expected: checked.data });
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
    setStep(8);
  };

  const changePrompt = (field: keyof MediaPrompts, value: string) => {
    setMediaPrompts((current) => {
      const next = { ...current, [field]: value.slice(0, 7000) };
      try { localStorage.setItem(promptKey(activeSlug), JSON.stringify(next)); } catch { /* Browser storage may be disabled. */ }
      return next;
    });
  };

  const nextStep = () => {
    setError("");
    setApproved(false);
    setIsPreview(false);
    if (step === 7) { goToFinal(); return; }
    if (step < 8) setStep((step + 1) as StudioStep);
  };

  const goToStep = (next: StudioStep) => {
    if (next === 8) { if (step >= 7) goToFinal(); return; }
    setStep(next);
    setError("");
    setApproved(false);
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
    setStep(1);
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
    setStep(1);
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


  // Confirm that the exact published client JSON has reached the production domain,
  // rather than declaring success when only the GitHub commit has completed.
  useEffect(() => {
    if (!publishStatus || publishStatus.phase !== "deploying") return;
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const verify = async () => {
      attempts += 1;
      try {
        const response = await fetch("/clients/" + publishStatus.slug + ".json?check=" + Date.now(), { cache: "no-store" });
        if (response.ok) {
          const data: unknown = await response.json();
          if (JSON.stringify(data) === JSON.stringify(publishStatus.expected)) {
            if (active) setPublishStatus((previous) => previous && previous.slug === publishStatus.slug
              ? { ...previous, phase: "live" } : previous);
            return;
          }
        }
      } catch { /* The production deployment may still be in progress. */ }
      if (!active) return;
      if (attempts >= 45) {
        setPublishStatus((previous) => previous && previous.slug === publishStatus.slug
          ? { ...previous, phase: "pending" } : previous);
        return;
      }
      timer = setTimeout(() => { void verify(); }, 4000);
    };
    void verify();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [publishStatus]);

  if (!session) return <main className="studio-gate studio-gate--app">
    {error ? <div className="studio-gate__card" role="alert"><h1>Studio tidak dapat dihubungi</h1><p>{error}</p><button type="button" onClick={() => location.reload()}>Coba lagi</button></div>
      : <p role="status">Memeriksa akses Studio…</p>}
  </main>;

  if (!session.configured || !session.authenticated) return <main className="studio-gate studio-gate--app"><div className="studio-gate__card">
    <a className="studio-wordmark" href="/">NAMINA</a>
    <h1>{session.configured ? "Masuk Generator V1" : "Generator menunggu konfigurasi"}</h1>
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



  const menuLabels = {
    nama: document?.content.original?.menuTitles?.nama?.trim() || "Nama",
    karir: document?.content.original?.menuTitles?.karir?.trim() || "Karir",
    skill: document?.content.original?.menuTitles?.skill?.trim() || "Skill",
    karya: document?.content.original?.menuTitles?.karya?.trim() || "Karya",
    produk: document?.content.original?.menuTitles?.produk?.trim() || "Produk",
  };
  const stages = [
    { number: 1, label: menuLabels.nama, hint: "Profil & WhatsApp" },
    { number: 2, label: menuLabels.karir, hint: "Pengalaman" },
    { number: 3, label: menuLabels.skill, hint: "Keahlian" },
    { number: 4, label: menuLabels.karya, hint: "Karya & foto" },
    { number: 5, label: menuLabels.produk, hint: "Produk & foto" },
    { number: 6, label: "Media AI", hint: "Prompt & Dropbox" },
    { number: 7, label: "Hasil Web", hint: "Preview & desain" },
    { number: 8, label: "Publish", hint: "Terbitkan" },
  ] as const;
  const activeStage = stages[step - 1];
  const currentMenu = step === 1 ? "nama" : step === 2 ? "karir" : step === 3 ? "skill" : step === 4 ? "karya" : step === 5 ? "produk" : null;

  return <main className="studio-root studio-app studio-app--namina">
    <header className="studio-app__topbar">
      <div className="studio-app__topbar-inner">
        <a className="studio-app__brand" href="/" aria-label="NAMINA, kembali ke beranda">NAMINA<span>STUDIO</span></a>
        <div className="studio-app__top-actions">
          <a className="studio-app__v2-link" href="/studio">Visual Studio Resmi ✦</a>
          <button type="button" onClick={() => setShowBriefs((value) => !value)}>{showBriefs ? "Kembali edit" : "Brief klien"}</button>
          <button type="button" className="studio-app__logout" onClick={() => void logout()}>Keluar</button>
        </div>
      </div>
    </header>
    <div className="studio-app__shell">
      {showBriefs ? <section className="studio-app__briefs"><BriefInbox onPrepare={prepareFromBrief} /></section> : <>
        <section className="studio-app__welcome">
          <p>NAMINA / CINEMATIC PORTFOLIO</p>
          <h1>Generator V1.</h1>
          <span>Satu menu, satu langkah. Isi data, susun visual, lalu terbitkan.</span>
        </section>
        <section className="studio-app__card studio-app__client">
          <div className="studio-app__card-heading">
            <span className="studio-app__card-icon" aria-hidden="true">▣</span>
            <div><h2>Pilih profil klien</h2><p>Ubah website lama atau siapkan klien baru.</p></div>
          </div>
          <label className="studio-app__field" htmlFor="site-picker">
            <span>Nama website</span>
            <select id="site-picker" value={slugs.includes(activeSlug) ? activeSlug : ""} onChange={(event) => { if (event.target.value) void openSite(event.target.value); }}>
              {!slugs.includes(activeSlug) && <option value="">Klien baru (draft)</option>}
              {slugs.map((slug) => <option key={slug} value={slug}>/{slug}</option>)}
            </select>
          </label>
          <details className="studio-app__disclosure">
            <summary>+ Buat website klien baru</summary>
            <div className="studio-app__disclosure-body">
              <label className="studio-app__field" htmlFor="new-client-slug"><span>Alamat link klien</span>
                <input id="new-client-slug" placeholder="contoh: namaklien" value={newSlug} onChange={(event) => setNewSlug(event.target.value)} />
                <small>Huruf kecil, angka dan tanda hubung. Panjang 3–48 karakter.</small>
              </label>
              <button className="studio-app__secondary" type="button" onClick={createSite}>Buat draft</button>
            </div>
          </details>
        </section>

        <nav className="studio-eight__steps" aria-label="Delapan tahap pembuatan website">
          {stages.map((stage) => <button type="button" key={stage.number}
            className={"studio-eight__step" + (step === stage.number ? " is-active" : "") + (step > stage.number ? " is-complete" : "")}
            aria-current={step === stage.number ? "step" : undefined}
            disabled={!document || (stage.number === 8 && step < 7)}
            onClick={() => goToStep(stage.number)}>
            <span>{stage.number < step ? "✓" : stage.number}</span>
            <strong>{stage.label}</strong>
          </button>)}
        </nav>
        {error && <p className="studio-app__notice studio-app__notice--error" role="alert">{error}</p>}
        {message && <p className="studio-app__notice" role="status">{message}</p>}
        {!document ? <section className="studio-app__card"><p className="studio-app__empty">{working ? "Memuat profil..." : "Pilih klien atau buat draft baru."}</p></section> : <>
          <div className="studio-eight__step-heading">
            <span>TAHAP {String(step).padStart(2, "0")} / 08</span>
            <h2>{activeStage.label}</h2>
            <p>{activeStage.hint}</p>
          </div>
          {currentMenu && <section className="studio-app__card studio-app__editor-card">
            <div className="studio-app__card-heading">
              <span className="studio-app__card-icon" aria-hidden="true">{String(step).padStart(2, "0")}</span>
              <div><h2>Isi menu {activeStage.label}</h2><p>Semua bisa diedit. Perubahan tersimpan sebagai draft, belum tampil di website publik.</p></div>
            </div>
            <OriginalStudioEditor key={document.slug + "-" + currentMenu} section={currentMenu}
              site={document} change={change} uploading={uploading} previews={localMediaPreviews}
              onUpload={(id, file) => void uploadGallery(id, file)} />
          </section>}
          {step === 6 && <StudioMediaEditor site={document} change={change} prompts={mediaPrompts} onPromptChange={changePrompt} />}
          {step === 7 && <>
            <section className="studio-app__card studio-app__result">
              <div className="studio-app__card-heading">
                <span className="studio-app__card-icon" aria-hidden="true">▣</span>
                <div><h2>Preview website</h2><p>Lihat hasilnya dan sesuaikan desainnya di bawah.</p></div>
              </div>
              <div className="studio-app__result-meta">
                <span>{"/" + document.slug}</span>
                <button type="button" onClick={() => setIsPreview((value) => !value)}>{isPreview ? "Perkecil" : "Perbesar"}</button>
              </div>
              <div className={"studio-app__preview" + (isPreview ? " studio-app__preview--large" : "")}>
                {prepared && <ViniCinematic key={prepared.slug} content={prepared.content} assetUrls={assetUrls} previewMode />}
              </div>
              <p className="studio-app__preview-hint">Preview ini belum dipublikasikan. <a href={"/" + document.slug} target="_blank" rel="noreferrer">Lihat website yang saat ini terbit ↗</a></p>
            </section>
            <section className="studio-app__card studio-eight__design">
              <label className="studio-app__field"><span>Nama tombol kontak</span>
                <input type="text" maxLength={40} value={document.content.original?.contactLabel ?? "Japri Saya!"}
                  onChange={(event) => change((next) => { next.content.original!.contactLabel = event.target.value; })} />
                <small>Teks tombol WhatsApp di website klien. Nomornya tetap diatur pada tahap 1.</small>
              </label>
              <div className="studio-app__card-heading">
                <span className="studio-app__card-icon" aria-hidden="true">✧</span>
                <div><h2>Ubah desain</h2><p>Warna, jenis font, ukuran huruf, layout, tombol dan efek.</p></div>
              </div>
              <OriginalStyleEditor
                value={{ ...originalStyleDefaults, ...document.content.original?.style }}
                update={(field, value) => change((next) => {
                  next.content.original!.style = { ...originalStyleDefaults, ...next.content.original!.style, [field]: value };
                })}
                reset={() => change((next) => { delete next.content.original!.style; })}
              />
            </section>
          </>}
          {step === 8 && <section className="studio-app__card studio-app__publish">
            <div className="studio-app__card-heading">
              <span className="studio-app__card-icon" aria-hidden="true">✓</span>
              <div><h2>Periksa lalu publish</h2><p>Ini tahap terakhir. Cek semua data sebelum website klien diluncurkan.</p></div>
            </div>
            <div className="studio-app__publish-link"><small>Alamat website klien</small><strong>{"namina.biz.id/" + document.slug}</strong></div>
            <ul className="studio-app__publish-list">
              {menuFields.map(({ key, label }, index) => <li key={key}>
                <span>{index + 1}. {document.content.original?.menuTitles?.[key]?.trim() || label}</span>
                <span>{document.content.original?.[key].items.length ?? 0} isi</span>
              </li>)}
              <li><span>6. Media sinematik</span><span>{document.media.desktopVideo ? "Link siap" : "Belum ada video"}</span></li>
              <li><span>7. Preview & desain</span><span>Sudah ditinjau</span></li>
            </ul>
            <label className="studio-app__approval">
              <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
              <span>Saya telah memeriksa nama, data, karya, produk, media, tombol WhatsApp, dan desain. Siap dipublikasikan.</span>
            </label>
          </section>}
        </>}
        <footer className="studio-app__bottom">
          {step > 1 && <button type="button" className="studio-app__back" onClick={() => goToStep((step - 1) as StudioStep)}>Kembali</button>}
          {step < 8 && <button type="button" className="studio-app__primary" disabled={!document || working || uploading} onClick={nextStep}>
            {step === 7 ? "Lanjut ke Publish" : "Lanjut"} <span aria-hidden="true">›</span>
          </button>}
          {step === 8 && <button type="button" className="studio-app__primary" disabled={!document || working || uploading || !approved} onClick={() => void publish()}>
            {working ? "Mengirim..." : "Publish Website"}
          </button>}
        </footer>
      </>}
    </div>
    {publishStatus && <div className="studio-eight__modal-backdrop" role="presentation">
      <section className="studio-eight__modal" role="dialog" aria-modal="true" aria-labelledby="studio-publish-title">
        <div className="studio-eight__modal-icon" aria-hidden="true">{publishStatus.phase === "live" ? "✓" : "↗"}</div>
        <h2 id="studio-publish-title">{publishStatus.phase === "live" ? "Website berhasil dipublikasikan!" : publishStatus.phase === "deploying" ? "Publikasi sedang diproses" : "Menunggu konfirmasi Vercel"}</h2>
        <p>{publishStatus.phase === "live"
          ? "Selamat! Halaman NAMINA klien sudah terbit dan siap dibagikan."
          : publishStatus.phase === "deploying"
          ? "Data berhasil tersimpan ke GitHub. Vercel sedang menayangkan versi terbarunya. Link akan muncul setelah terverifikasi."
          : "Perubahan sudah dikirim ke GitHub, tetapi Vercel belum terkonfirmasi. Cek status deployment sebelum membagikan link."}</p>
        <div className="studio-eight__modal-link">
          <small>Alamat website klien</small>
          <strong>{"https://namina.biz.id/" + publishStatus.slug}</strong>
        </div>
        {publishStatus.phase === "live" && <>
          <a className="studio-eight__modal-go" href={"/" + publishStatus.slug} target="_blank" rel="noopener noreferrer">Buka website klien ↗</a>
          <button type="button" onClick={() => void navigator.clipboard.writeText("https://namina.biz.id/" + publishStatus.slug)}>Salin Link</button>
        </>}
        {publishStatus.phase === "pending" && <button type="button" onClick={() => setPublishStatus((prev) => prev ? { ...prev, phase: "deploying" } : prev)}>Cek lagi</button>}
        <button type="button" className="studio-eight__modal-close" onClick={() => setPublishStatus(null)}>Tutup</button>
      </section>
    </div>}
  </main>;
}
