import { useCallback, useEffect, useRef, useState } from "react";
import { IdentityFlip } from "../components/IdentityFlip";
import { newCard, slugSchema, type Selection } from "../domain/content";
import { blankSite, prepareSite, resolveMedia, siteDocumentSchema, viniSeed, type SiteDocument } from "../static/sites";
import { CanvasTools, type CanvasMediaTarget, type CardCommand } from "./CanvasTools";
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
  if (!response.ok) {
    const message = (result as { error?: string }).error;
    throw new Error(message || `Permintaan gagal (${response.status}).`);
  }
  return result as T;
}

const draftKey = (slug: string) => `namana:studio:draft:${slug}`;

async function imageBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gambar gagal dibaca."));
    reader.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

export function StaticStudio() {
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [activeSlug, setActiveSlug] = useState("vini");
  const [newSlug, setNewSlug] = useState("");
  const [document, setDocument] = useState<SiteDocument | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState("");
  const [canvasSelection, setCanvasSelection] = useState<Selection | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localMediaPreviews, setLocalMediaPreviews] = useState<Record<string, string>>({});
  const [isPreview, setIsPreview] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const initialLoadStarted = useRef(false);
  const uploadedPreviewUrls = useRef<string[]>([]);

  const loadSlugs = useCallback(async () => {
    const response = await callApi<StudioResponse>("list");
    setSlugs(response.slugs.sort((a, b) => a.localeCompare(b)));
  }, []);

  useEffect(() => {
    callApi<Session>("session")
      .then((value) => setSession(value))
      .catch((cause: Error) => setError(cause.message));
  }, []);

  useEffect(() => {
    if (!session?.authenticated) return;
    loadSlugs().catch((cause: Error) => setError(cause.message));
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
      const local = localStorage.getItem(draftKey(slug));
      if (local) {
        const parsed = siteDocumentSchema.safeParse(JSON.parse(local));
        if (parsed.success && parsed.data.slug === slug) {
          site = parsed.data;
          setMessage("Draft dari browser ini dipulihkan. Belum dipublikasikan.");
        }
      }
      setDocument(site);
      setSha(remoteSha);
      setSelectedCard(site.content.cards[0]?.id || "");
      setCanvasSelection(null);
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

  const change = (updater: (next: SiteDocument) => void) => {
    setDocument((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      updater(next);
      localStorage.setItem(draftKey(next.slug), JSON.stringify(next));
      return next;
    });
    setMessage("Draft tersimpan di browser ini.");
    setError("");
  };

  const publish = async () => {
    if (!document) return;
    const checked = siteDocumentSchema.safeParse(prepareSite(document));
    if (!checked.success) {
      setError(checked.error.issues[0]?.message || "Periksa data sebelum terbit.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const result = await callApi<{ ok: true; sha: string }>("publish", {
        method: "POST",
        body: JSON.stringify({ document: checked.data, sha }),
      });
      setSha(result.sha);
      setDocument(checked.data);
      localStorage.removeItem(draftKey(document.slug));
      setMessage("Data berhasil dikirim ke GitHub. Vercel akan membangun ulang dari branch produksi.");
      await loadSlugs();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const createSite = async () => {
    const slug = newSlug.toLowerCase().trim();
    const result = slugSchema.safeParse(slug);
    if (!result.success) {
      setError(result.error.issues[0]?.message || "Slug belum valid.");
      return;
    }
    if (slugs.includes(slug)) {
      setError("Nama halaman sudah terpakai.");
      return;
    }
    setDocument(blankSite(slug));
    setActiveSlug(slug);
    setSha(null);
    setSelectedCard("");
    setCanvasSelection(null);
    setNewSlug("");
    setError("");
    setMessage("Klien baru siap diedit. Klik Publikasikan setelah datanya lengkap.");
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      await callApi("login", { method: "POST", body: JSON.stringify({ password }) });
      setSession({ configured: true, authenticated: true });
      setPassword("");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const logout = async () => {
    await callApi("logout", { method: "POST", body: "{}" }).catch(() => {});
    setSession({ configured: true, authenticated: false });
    setDocument(null);
    setSlugs([]);
    setCanvasSelection(null);
    initialLoadStarted.current = false;
  };

  useEffect(() => () => {
    uploadedPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const canvasTextChange = (field: string, value: string) => {
    change((site) => {
      if (field.startsWith("identity.")) {
        const key = field.slice(9);
        if (key === "displayName" || key === "profession" || key === "bio" || key === "brandLabel" || key === "introLabel")
          site.content.identity[key] = value;
      } else {
        const parts = /^card:([a-f0-9-]{36}):(title|subtitle|description|linkLabel)$/.exec(field);
        if (!parts) return;
        const card = site.content.cards.find((item) => item.id === parts[1]);
        if (card) card[parts[2] as "title" | "subtitle" | "description" | "linkLabel"] = value;
      }
    });
  };

  const canvasCardAction = (command: CardCommand) => {
    if (!document) return;
    const selected = document.content.cards.find((item) => item.id === selectedCard);
    if (command === "add" || command === "duplicate") {
      if (document.content.cards.length >= 24) return;
      const card = command === "duplicate" && selected
        ? { ...selected, id: crypto.randomUUID(), title: `${selected.title.slice(0, 37)} (salin)` }
        : newCard();
      change((site) => { site.content.cards.push(card); });
      setSelectedCard(card.id);
      setCanvasSelection(`card:${card.id}`);
      return;
    }
    if (!selected) return;
    if (command === "delete") {
      if (document.content.cards.length === 1 ||
        selected.visible && document.content.cards.filter((item) => item.visible).length === 1) {
        setError("Minimal satu kartu harus terlihat.");
        return;
      }
      change((site) => {
        site.content.cards = site.content.cards.filter((item) => item.id !== selected.id);
        delete site.media.cards[selected.id];
      });
      const next = document.content.cards.find((item) => item.id !== selected.id && item.visible)?.id || "";
      setSelectedCard(next);
      setCanvasSelection(next ? `card:${next}` : null);
      return;
    }
    if (command === "hide") {
      if (selected.visible && document.content.cards.filter((item) => item.visible).length === 1) {
        setError("Minimal satu kartu harus terlihat.");
        return;
      }
      change((site) => { site.content.cards.find((item) => item.id === selected.id)!.visible = !selected.visible; });
      return;
    }
    change((site) => {
      const index = site.content.cards.findIndex((item) => item.id === selected.id);
      const target = index + (command === "up" ? -1 : 1);
      if (target >= 0 && target < site.content.cards.length)
        [site.content.cards[index], site.content.cards[target]] = [site.content.cards[target], site.content.cards[index]];
    });
  };

  const canvasUpload = async (target: CanvasMediaTarget, file: File) => {
    if (!document) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1300000) {
      setError("Gunakan foto JPG, PNG, atau WebP maksimal 1,3 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const result = await callApi<{ url: string }>("upload", {
        method: "POST",
        body: JSON.stringify({ slug: document.slug, mime: file.type, base64: await imageBase64(file) }),
      });
      const previewUrl = URL.createObjectURL(file);
      uploadedPreviewUrls.current.push(previewUrl);
      setLocalMediaPreviews((previews) => ({ ...previews, [result.url]: previewUrl }));
      change((site) => {
        if (target === "portrait") site.media.portrait = result.url;
        else if (target === "poster") site.media.poster = result.url;
        else if (target === "enterKey") site.media.enterKey = result.url;
        else if (target.startsWith("card:")) site.media.cards[target.slice(5)] = result.url;
      });
      setMessage("Gambar berhasil diunggah. Publikasikan agar semua pengunjung melihat perubahan.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (!session) return (
    <main className="studio-gate">
      {error ? (
        <div className="studio-gate__card" role="alert">
          <h1>Studio tidak dapat dihubungi</h1>
          <p>{error}</p>
          <button type="button" onClick={() => location.reload()}>Coba lagi</button>
        </div>
      ) : <p role="status">Memeriksa akses Studio…</p>}
    </main>
  );

  if (!session.configured || !session.authenticated) {
    return (
      <main className="studio-gate">
        <div className="studio-gate__card">
          <a className="studio-wordmark" href="/">NAMANA.PRO</a>
          <h1>{session.configured ? "Masuk Studio" : "Studio menunggu konfigurasi"}</h1>
          {session.configured ? (
            <form onSubmit={login}>
              <label htmlFor="studio-password">Kata sandi tim admin</label>
              <input id="studio-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="submit" disabled={working}>{working ? "Memeriksa…" : "Masuk Studio"}</button>
            </form>
          ) : (
            <p>Tambahkan NAMANA_ADMIN_PASSWORD, NAMANA_SESSION_SECRET, NAMANA_GITHUB_TOKEN, dan NAMANA_GITHUB_BRANCH di pengaturan Environment Variables Vercel. Editor aktif setelah semuanya tersedia.</p>
          )}
          {error && <p className="studio-alert studio-alert--error" role="alert">{error}</p>}
          <a href="/vini">Lihat demo ORIGINAL</a>
        </div>
      </main>
    );
  }

  const selected = document?.content.cards.find((card) => card.id === selectedCard);
  const prepared = document ? prepareSite(document) : null;
  const assetUrls = prepared ? Object.fromEntries(
    Object.entries(resolveMedia(prepared)).map(([id, url]) => [id, localMediaPreviews[url] || url]),
  ) : {};

  return (
    <main className="studio-root">
      <header className="studio-header">
        <a className="studio-wordmark" href="/">NAMANA.PRO</a>
        <strong>Studio / Tim admin</strong>
        <div className="studio-header__actions">
          {document && <a href={`/${document.slug}`} target="_blank" rel="noreferrer">Buka website</a>}
          <button type="button" onClick={logout}>Keluar</button>
        </div>
      </header>
      <div className="studio-workspace">
        <aside className="studio-sidebar" aria-label="Editor klien">
          <section className="studio-group">
            <h1>Kelola website</h1>
            <label htmlFor="site-picker">Pilih klien</label>
            <select id="site-picker" value={slugs.includes(activeSlug) ? activeSlug : ""} onChange={(event) => void openSite(event.target.value)}>
              {!slugs.includes(activeSlug) && <option value="">Klien baru (draft)</option>}
              {slugs.map((slug) => <option key={slug} value={slug}>/{slug}</option>)}
            </select>
            <div className="studio-inline">
              <label htmlFor="new-client-slug">Slug baru</label>
              <input id="new-client-slug" placeholder="nama-klien" value={newSlug} onChange={(event) => setNewSlug(event.target.value)} />
              <button type="button" onClick={() => void createSite()}>Buat</button>
            </div>
          </section>

          {document && (
            <>
              <section className="studio-group">
                <h2>Identitas</h2>
                <Field label="Sapaan di atas judul" value={document.content.identity.introLabel ?? "Hello, kenalain saya"} onChange={(value) => change((site) => { site.content.identity.introLabel = value; })} />
                <Field label="Tulisan merek" value={document.content.identity.brandLabel ?? "NAMANA.PRO"} onChange={(value) => change((site) => { site.content.identity.brandLabel = value; })} />
                <Field label="Nama lengkap" value={document.content.identity.displayName} onChange={(value) => change((site) => { site.content.identity.displayName = value; })} />
                <Field label="Profesi" value={document.content.identity.profession} onChange={(value) => change((site) => { site.content.identity.profession = value; })} />
                <Field label="Perkenalan" multiline value={document.content.identity.bio} onChange={(value) => change((site) => { site.content.identity.bio = value; })} />
                <Field label="URL foto (HTTPS)" value={document.media.portrait} placeholder="https://…" onChange={(value) => change((site) => { site.media.portrait = value; })} />
              </section>
              <section className="studio-group">
                <h2>Tampilan</h2>
                <ColorField label="Warna dompet" value={document.content.wallet.color} onChange={(value) => change((site) => { site.content.wallet.color = value; })} />
                <ColorField label="Warna aksen" value={document.content.theme.accent} onChange={(value) => change((site) => { site.content.theme.accent = value; })} />
                <ColorField label="Warna nama" value={document.content.theme.titleColor || "#f8f3e8"} onChange={(value) => change((site) => { site.content.theme.titleColor = value; })} />
                <ColorField label="Warna profesi" value={document.content.theme.roleColor || "#d8ad67"} onChange={(value) => change((site) => { site.content.theme.roleColor = value; })} />
                <label htmlFor="heading-size">Ukuran judul ({Math.round((document.content.theme.headingScale || 1) * 100)}%)</label>
                <input id="heading-size" type="range" min="80" max="130" step="5" value={Math.round((document.content.theme.headingScale || 1) * 100)} onChange={(event) => change((site) => { site.content.theme.headingScale = Number(event.target.value) / 100; })} />
                <label htmlFor="card-title-size">Ukuran judul kartu ({Math.round((document.content.theme.cardTitleScale || 1) * 100)}%)</label>
                <input id="card-title-size" type="range" min="75" max="140" step="5" value={Math.round((document.content.theme.cardTitleScale || 1) * 100)} onChange={(event) => change((site) => { site.content.theme.cardTitleScale = Number(event.target.value) / 100; })} />
                <label htmlFor="card-value-size">Ukuran subjudul ({Math.round((document.content.theme.cardValueScale || 1) * 100)}%)</label>
                <input id="card-value-size" type="range" min="75" max="140" step="5" value={Math.round((document.content.theme.cardValueScale || 1) * 100)} onChange={(event) => change((site) => { site.content.theme.cardValueScale = Number(event.target.value) / 100; })} />
                <label htmlFor="card-body-size">Ukuran isi kartu ({Math.round((document.content.theme.cardBodyScale || 1) * 100)}%)</label>
                <input id="card-body-size" type="range" min="75" max="140" step="5" value={Math.round((document.content.theme.cardBodyScale || 1) * 100)} onChange={(event) => change((site) => { site.content.theme.cardBodyScale = Number(event.target.value) / 100; })} />
                <Field label="Gambar tombol ENTER (URL HTTPS)" value={document.media.enterKey || ""} onChange={(value) => change((site) => { site.media.enterKey = value; })} />
                <label htmlFor="font-preset">Jenis font</label>
                <select id="font-preset" value={document.content.theme.fontPreset} onChange={(event) => change((site) => { site.content.theme.fontPreset = event.target.value as "original" | "system"; })}>
                  <option value="original">ORIGINAL</option>
                  <option value="system">Font sistem</option>
                </select>
              </section>
              <section className="studio-group">
                <h2>Video &amp; latar</h2>
                <p className="studio-hint">Simpan video di Dropbox, lalu masukkan tautan berbagi berakhiran <code>raw=1</code>.</p>
                <Field label="URL video desktop" value={document.media.desktopVideo} placeholder="https://www.dropbox.com/…?raw=1" onChange={(value) => change((site) => { site.media.desktopVideo = value; })} />
                <Field label="URL video mobile" value={document.media.mobileVideo} placeholder="Kosong = gunakan video desktop" onChange={(value) => change((site) => { site.media.mobileVideo = value; })} />
                <Field label="URL gambar cadangan" value={document.media.poster} onChange={(value) => change((site) => { site.media.poster = value; })} />
                <label htmlFor="overlay-opacity">Gelap latar ({Math.round(document.content.background.overlayOpacity * 100)}%)</label>
                <input id="overlay-opacity" type="range" min="25" max="85" value={Math.round(document.content.background.overlayOpacity * 100)} onChange={(event) => change((site) => { site.content.background.overlayOpacity = Number(event.target.value) / 100; })} />
                <label htmlFor="video-focal-x">Posisi video kiri-kanan ({document.content.background.focalX}%)</label>
                <input id="video-focal-x" type="range" min="0" max="100" value={document.content.background.focalX} onChange={(event) => change((site) => { site.content.background.focalX = Number(event.target.value); })} />
                <label htmlFor="video-focal-y">Posisi video atas-bawah ({document.content.background.focalY}%)</label>
                <input id="video-focal-y" type="range" min="0" max="100" value={document.content.background.focalY} onChange={(event) => change((site) => { site.content.background.focalY = Number(event.target.value); })} />
              </section>
              <section className="studio-group">
                <h2>Kartu profil</h2>
                <label htmlFor="card-picker">Pilih kartu</label>
                <select id="card-picker" value={selectedCard} onChange={(event) => setSelectedCard(event.target.value)}>
                  {!selectedCard && <option value="">Pilih kartu</option>}
                  {document.content.cards.map((card) => <option key={card.id} value={card.id}>{card.title}</option>)}
                </select>
                {selected && (
                  <div className="studio-card-editor">
                    <Field label="Judul kartu" value={selected.title} onChange={(value) => change((site) => { site.content.cards.find((card) => card.id === selected.id)!.title = value; })} />
                    <Field label="Subjudul" value={selected.subtitle} onChange={(value) => change((site) => { site.content.cards.find((card) => card.id === selected.id)!.subtitle = value; })} />
                    <Field label="Cerita" multiline value={selected.description} onChange={(value) => change((site) => { site.content.cards.find((card) => card.id === selected.id)!.description = value; })} />
                    <Field label="Tautan kartu" value={selected.link} onChange={(value) => change((site) => { site.content.cards.find((card) => card.id === selected.id)!.link = value; })} />
                    <Field label="Tulisan tombol tautan" value={selected.linkLabel || ""} onChange={(value) => change((site) => { site.content.cards.find((card) => card.id === selected.id)!.linkLabel = value; })} />
                    <Field label="URL gambar kartu" value={document.media.cards[selected.id] || ""} onChange={(value) => change((site) => { site.media.cards[selected.id] = value; })} />
                    <ColorField label="Warna kartu" value={selected.color} onChange={(value) => change((site) => { site.content.cards.find((card) => card.id === selected.id)!.color = value; })} />
                    <label className="studio-check"><input type="checkbox" checked={selected.visible} disabled={selected.visible && document.content.cards.filter((card) => card.visible).length === 1} onChange={(event) => change((site) => { site.content.cards.find((card) => card.id === selected.id)!.visible = event.target.checked; })} />Tampilkan kartu</label>
                    <div className="studio-inline">
                      <button type="button" onClick={() => canvasCardAction("up")}>Naik</button>
                      <button type="button" onClick={() => canvasCardAction("down")}>Turun</button>
                      <button type="button" disabled={document.content.cards.length === 1} onClick={() => canvasCardAction("delete")}>Hapus</button>
                    </div>
                  </div>
                )}
                <button type="button" className="studio-outline" disabled={document.content.cards.length >= 24} onClick={() => canvasCardAction("add")}>Tambah kartu</button>
              </section>
            </>
          )}
        </aside>

        <section className="studio-main" aria-label="Pratinjau website">
          <div className="studio-main__toolbar">
            <div>
              <strong>{document ? `/${document.slug}` : "Belum ada website"}</strong>
              <span>{isPreview ? "Pratinjau pengunjung" : "Editor kanvas: klik elemen untuk mengubahnya"}</span>
            </div>
            <button type="button" aria-pressed={isPreview} onClick={() => { setIsPreview(!isPreview); setCanvasSelection(null); }}>{isPreview ? "Kembali edit" : "Coba preview"}</button>
            <button type="button" className="studio-publish" disabled={!document || working} onClick={() => void publish()}>
              {working ? "Memproses…" : "Publikasikan"}
            </button>
          </div>
          {error && <p role="alert" className="studio-alert studio-alert--error">{error}</p>}
          {message && <p role="status" className="studio-alert">{message}</p>}
          <div className="studio-preview">
            {working && !document ? <p role="status">Memuat data website…</p> : document ? (
              <IdentityFlip
                key={`${document.slug}:${isPreview ? "preview" : "edit"}`}
                content={prepared!.content}
                assetUrls={assetUrls}
                textMode={document.slug === "vini"}
                editMode={!isPreview}
                startOpen
                selectedCardId={selectedCard}
                onEditText={canvasTextChange}
                onSelect={(selection) => {
                  if (isPreview) return;
                  if (selection.startsWith("card:")) setSelectedCard(selection.slice(5));
                  setCanvasSelection(selection);
                }}
              />
            ) : <p>Pilih klien untuk mengedit website.</p>}
            {document && !isPreview && <div className="studio-canvas-commands" aria-label="Alat kanvas">
              <button type="button" onClick={() => setCanvasSelection("theme")}>Tema & ukuran font</button>
              <button type="button" disabled={document.content.cards.length >= 24} onClick={() => canvasCardAction("add")}>Tambah kartu</button>
            </div>}
            {document && !isPreview && canvasSelection && <CanvasTools
              document={document}
              selection={canvasSelection}
              selectedCardId={selectedCard}
              uploading={uploading}
              onChange={change}
              onUpload={(target, file) => void canvasUpload(target, file)}
              onCardCommand={canvasCardAction}
              onClose={() => setCanvasSelection(null)}
            />}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, multiline = false, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean; placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="studio-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea id={id} rows={4} value={value} onChange={(event) => onChange(event.target.value)} /> :
        <input id={id} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="studio-color"><label>{label}<input aria-label={label} type="color" value={value} onChange={(event) => onChange(event.target.value)} /></label><span>{value}</span></div>;
}
