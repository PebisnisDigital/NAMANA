import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PublishSuccessModal } from "../components/PublishSuccessModal";
import { slugSchema, type OriginalStyle, type OriginalMenuIcon } from "../domain/content";
import { blankOriginal, viniOriginal } from "../static/originalSeed";
import { originalStyleDefaults } from "../static/originalStyle";
import { blankSite, loadViniTemplate, prepareSite, resolveMedia, siteDocumentSchema, viniSeed, type SiteDocument } from "../static/sites";
import "../studio-v2.css";
import "../studio-v2-fullscreen.css";
import "../studio-v2-immersive.css";

type Session = { authenticated: boolean; configured: boolean };
type SiteFile = { document: SiteDocument; sha: string };
type Menu = "Nama" | "Karir" | "Skill" | "Karya" | "Produk";
type MenuKey = "nama" | "karir" | "skill" | "karya" | "produk";
type FactKey = "nama" | "karir" | "skill";
type GalleryKey = "karya" | "produk";
type PublishStatus = "live" | null;

const menuList: Menu[] = ["Nama", "Karir", "Skill", "Karya", "Produk"];
const navigationIconOptions: Array<{ value: OriginalMenuIcon; label: string }> = [
  { value: "default", label: "Ikon bawaan menu" },
  { value: "person", label: "Profil / orang" },
  { value: "briefcase", label: "Tas kerja / karir" },
  { value: "sliders", label: "Pengaturan / keahlian" },
  { value: "image", label: "Galeri gambar" },
  { value: "shopping", label: "Tas belanja / produk" },
  { value: "star", label: "Bintang" },
  { value: "book", label: "Buku" },
  { value: "award", label: "Penghargaan" },
  { value: "sparkles", label: "Kilau kreatif" },
  { value: "globe", label: "Globe / website" },
  { value: "heart", label: "Hati" },
];
const icons = [
  [8121295, "Profil"], [8121312, "Kalender"], [8121270, "Lokasi"],
  [8121302, "Rumah"], [8121313, "Pendidikan"], [8121304, "Karir"],
  [8121299, "Profesi"], [8121309, "Website"], [8121272, "Kreatif"], [8121262, "Digital"],
] as const;

async function studioApi<T>(action: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api/studio?action=" + action, {
    credentials: "same-origin", ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json() as { error?: string };
  if (!response.ok) throw new Error(body.error || "Permintaan Studio gagal (" + response.status + ").");
  return body as T;
}

const draftKey = (slug: string) => "namina:studio-v2:draft:" + slug;
function whatsappNumber(url: string): string {
  try {
    const parsed = new URL(url);
    const digits = (parsed.hostname === "wa.me" ? parsed.pathname : parsed.searchParams.get("phone") || "").replace(/\D/g, "");
    return digits.startsWith("62") ? "0" + digits.slice(2) : digits;
  } catch { return ""; }
}
function whatsappLink(value: string): string {
  const digits = value.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? "62" + digits.slice(1) : digits.startsWith("8") ? "62" + digits : digits;
  return intl ? "https://wa.me/" + intl : "";
}
function defaultSite(site: SiteDocument) {
  if (!site.content.original) site.content.original = site.slug === "vini"
    ? structuredClone(viniOriginal)
    : blankOriginal(site.content.identity.displayName);
  return site;
}
function Field({ label, value, onChange, multiline, placeholder, maxLength, type = "text" }: {
  label: string; value: string; onChange: (value: string) => void;
  multiline?: boolean; placeholder?: string; maxLength?: number; type?: string;
}) {
  return <label className="studio-v2__field">
    <span>{label}</span>
    {multiline ? <textarea rows={3} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      : <input type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
  </label>;
}

export function StudioV2() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [slug, setSlug] = useState("vini");
  const [newSlug, setNewSlug] = useState("");
  const [site, setSite] = useState<SiteDocument | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu>("Nama");
  const [selected, setSelected] = useState("name");
  const [showDesign, setShowDesign] = useState(false);
  const [screen, setScreen] = useState<"desktop" | "mobile">("desktop");
  const [immersive, setImmersive] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [popupCoordinates, setPopupCoordinates] = useState({ left: 24, top: 120 });
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [approved, setApproved] = useState(false);
  const [published, setPublished] = useState<PublishStatus>(null);
  const [error, setError] = useState("");
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!immersive) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setImmersive(false); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [immersive]);

  const menuKey = menu.toLowerCase() as MenuKey;
  const original = site?.content.original;
  const currentSection = original?.[menuKey];
  const style = { ...originalStyleDefaults, ...original?.style };

  const refreshList = useCallback(async () => {
    const result = await studioApi<{ slugs: string[] }>("list");
    setSlugs(result.slugs.sort((a, b) => a.localeCompare(b)));
    return result.slugs;
  }, []);

  useEffect(() => {
    void studioApi<Session>("session").then(setSession).catch((cause: Error) => setError(cause.message));
  }, []);

  const openClient = useCallback(async (nextSlug: string) => {
    setWorking(true); setError("");
    setPublished(null);
    setSite(null);
    setSlug(nextSlug);
    setMenu("Nama");
    setSelected("name");
    setShowDesign(false);
    setPopupOpen(false);
    setApproved(false);
    try {
      let client: SiteDocument;
      let newSha: string | null = null;
      try {
        const response = await studioApi<SiteFile>("site&slug=" + encodeURIComponent(nextSlug));
        client = siteDocumentSchema.parse(response.document);
        newSha = response.sha;
      } catch (cause) {
        if (!(cause instanceof Error) || !cause.message.includes("Belum ada data")) throw cause;
        client = nextSlug === "vini" ? structuredClone(viniSeed) : blankSite(nextSlug);
      }
      try {
        const draft = localStorage.getItem(draftKey(nextSlug));
        if (draft) {
          const parsed = siteDocumentSchema.safeParse(JSON.parse(draft));
          if (parsed.success && parsed.data.slug === nextSlug) {
            client = parsed.data;
          }
        }
      } catch { /* Invalid local draft should not block editing. */ }
      setSite(defaultSite(client));
      setSha(newSha);
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  }, []);

  useEffect(() => {
    if (!session?.authenticated || loadedOnce) return;
    setLoadedOnce(true);
    void refreshList().then((items) => {
      void openClient(items.includes("vini") ? "vini" : (items[0] || "vini"));
    }).catch((cause: Error) => setError(cause.message));
  }, [session?.authenticated, loadedOnce, openClient, refreshList]);

  const change = useCallback((update: (next: SiteDocument) => void) => {
    setSite((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      update(next);
      try { localStorage.setItem(draftKey(next.slug), JSON.stringify(next)); }
      catch { /* The publish API is independent from local draft storage. */ }
      return next;
    });
    setApproved(false);
    setError("");
  }, []);

  const sendFrame = useCallback((command: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(command, window.location.origin);
  }, []);

  useEffect(() => {
    if (!site || !ready) return;
    const prepared = prepareSite(site);
    const assets = resolveMedia(prepared);
    sendFrame({ type: "NAMINA_V2_RENDER", site: prepared, assets });
  }, [site, ready, sendFrame]);
  useEffect(() => { if (ready) sendFrame({ type: "NAMINA_V2_MENU", menu }); }, [menu, ready, sendFrame]);
  useEffect(() => { if (ready) sendFrame({ type: "NAMINA_V2_SELECT", key: selected }); }, [selected, ready, sendFrame]);

  const addCard = (section: GalleryKey) => {
    if (!site) return;
    if (site.content.original![section].items.length >= 20) {
      setError("Maksimal 20 kartu per menu. Hapus kartu lama sebelum menambah.");
      return;
    }
    const id = crypto.randomUUID();
    change((next) => {
      next.content.original![section].items.push({
        id, title: section === "karya" ? "Karya baru" : "Produk baru",
        description: "", link: "", imageAssetId: null, color: "#ef4853", motif: "cinema",
      });
    });
    const nextMenu = section === "karya" ? "Karya" : "Produk";
    setMenu(nextMenu);
    setSelected("card:" + section + ":" + id);
    setShowDesign(false);
    setPopupOpen(true);
    setPopupCoordinates({ left: Math.max(12, window.innerWidth - 414), top: 116 });
    sendFrame({ type: "NAMINA_V2_CLOSE_EDITOR" });
    sendFrame({ type: "NAMINA_V2_MENU", menu: nextMenu });
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const value = event.data as Record<string, unknown> | null;
      if (!value || typeof value !== "object") return;
      if (value.type === "NAMINA_V2_READY") {
        setReady(true);
      }
      if (value.type === "NAMINA_V2_SELECT" && typeof value.key === "string") {
        const key = value.key;
        setSelected(key);
        setShowDesign(false);
        const isInlineText = ["name", "profession", "intro", "description", "subtitle", "menu-title"].includes(key);
        setPopupOpen(!isInlineText);
        if (!isInlineText && value.rect && typeof value.rect === "object") {
          const rect = value.rect as { left?: number; top?: number; width?: number; height?: number };
          const frame = frameRef.current?.getBoundingClientRect();
          if (frame) {
            const width = 370;
            const x = frame.left + (rect.left || 0) + (rect.width || 0) + 12;
            const roomRight = x + width + 18 < window.innerWidth;
            const left = roomRight ? x : Math.max(12, frame.left + (rect.left || 0) - width - 12);
            setPopupCoordinates({
              left: Math.min(Math.max(12, left), Math.max(12, window.innerWidth - width - 12)),
              top: Math.max(88, Math.min(frame.top + (rect.top || 0), window.innerHeight - 390)),
            });
          }
        }
      }
      if (value.type === "NAMINA_V2_MENU_CHANGED" && typeof value.menu === "string" && menuList.includes(value.menu as Menu)) {
        setMenu(value.menu as Menu);
      }
      if (value.type === "NAMINA_V2_ADD_CARD" && (value.section === "karya" || value.section === "produk")) {
        addCard(value.section);
      }
      if (value.type === "NAMINA_V2_ADD_FACT" && (value.section === "nama" || value.section === "karir" || value.section === "skill")) {
        addFact(value.section);
      }
      if (value.type === "NAMINA_V2_UPDATE" && typeof value.key === "string" && typeof value.value === "string") {
        const key = value.key;
        const text = value.value;
        change((next) => {
          const current = next.content.original!;
          const currentKey = (menu.toLowerCase() as MenuKey);
          if (key === "name") next.content.identity.displayName = text;
          else if (key === "profession") next.content.identity.profession = text;
          else if (key === "intro") current[currentKey].intro = text;
          else if (key === "description") current[currentKey].description = text;
          else if (key === "subtitle") current[currentKey].subtitle = text;
          else if (key === "menu-title") current.menuTitles = { ...current.menuTitles, [currentKey]: text };
          else if (key.startsWith("menu:")) {
            const target = key.slice(5) as MenuKey;
            if (["nama", "karir", "skill", "karya", "produk"].includes(target)) {
              current.menuTitles = { ...current.menuTitles, [target]: text };
            }
          }
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [menu, site, change]);

  const createClient = async () => {
    if (working) return;
    const normalized = newSlug.toLowerCase().trim();
    const checked = slugSchema.safeParse(normalized);
    if (!checked.success) { setError(checked.error.issues[0]?.message || "Alamat halaman tidak valid."); return; }
    if (slugs.includes(normalized)) { setError("Nama halaman sudah dipakai."); return; }
    setWorking(true);
    setError("");
    try {
      // A fresh, independent copy of the live /vini demo, including its
      // video, animated-icon data, Karya, and Produk collections.
      const template = await loadViniTemplate(normalized);
      setSite(template);
      setSlug(normalized);
      setSha(null);
      setMenu("Nama"); setSelected("name");
      setApproved(false); setShowDesign(false); setPopupOpen(false); setPublished(null);
      try { localStorage.setItem(draftKey(normalized), JSON.stringify(template)); }
      catch { /* Still editable in the active Studio session. */ }
      setNewSlug("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Template /vini belum bisa disalin.");
    } finally { setWorking(false); }
  };

  const useViniTemplate = async () => {
    if (!site || slug === "vini" || working) return;
    if (!window.confirm("Ganti seluruh isi draft /" + slug +
      " dengan contoh /vini? Nama, video, ikon, karya, produk, dan kontak sekarang akan tertimpa. Website publik tidak berubah sampai Publikasikan.")) return;
    setWorking(true); setError("");
    try {
      const template = await loadViniTemplate(slug);
      setSite(template);
      try { localStorage.setItem(draftKey(slug), JSON.stringify(template)); }
      catch { /* Keep editing in memory. */ }
      setApproved(false); setPublished(null); setMenu("Nama"); setSelected("name");
      setShowDesign(false); setPopupOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyalin template /vini.");
    } finally { setWorking(false); }
  };

  const publish = async () => {
    if (!site || !approved) return;
    const result = siteDocumentSchema.safeParse(prepareSite(site));
    if (!result.success) {
      setError("Periksa data: " + (result.error.issues[0]?.message || "ada kolom tidak valid."));
      return;
    }
    setWorking(true); setError("");
    try {
      const updated = await studioApi<{ ok: true; sha: string }>("publish", {
        method: "POST", body: JSON.stringify({ document: result.data, sha }),
      });
      setSha(updated.sha);
      setSite(result.data);
      localStorage.removeItem(draftKey(site.slug));
      setApproved(false);
      setPublished("live");
      await refreshList();
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  };

  const updateSection = (field: "intro" | "subtitle" | "description", value: string) =>
    change((next) => { next.content.original![menuKey][field] = value; });

  const updateStyle = <K extends keyof OriginalStyle>(field: K, value: OriginalStyle[K]) =>
    change((next) => {
      next.content.original!.style = { ...originalStyleDefaults, ...next.content.original!.style, [field]: value };
    });

  const parts = selected.split(":");
  const factSection: FactKey | null = parts[0] === "fact" &&
    ["nama", "karir", "skill"].includes(parts[1]) ? parts[1] as FactKey : null;
  const gallerySection: GalleryKey | null = parts[0] === "card" &&
    ["karya", "produk"].includes(parts[1]) ? parts[1] as GalleryKey : null;
  const factIndex = factSection && Number.isInteger(Number(parts[2])) ? Number(parts[2]) : -1;
  const fact = factSection && factIndex >= 0 ? original?.[factSection].items[factIndex] : null;
  const card = gallerySection ? original?.[gallerySection].items.find((item) => item.id === parts[2]) : null;
  const menuTitle = original?.menuTitles?.[menuKey] || menu;

  const updateFact = (field: "label" | "value" | "icon", value: string | number) => {
    if (!factSection || factIndex < 0) return;
    change((next) => {
      const target = next.content.original![factSection].items[factIndex];
      if (!target) return;
      if (field === "icon") target.icon = Number(value);
      else target[field] = String(value);
    });
  };
  const updateCard = (field: "title" | "description" | "link" | "color", value: string) => {
    if (!gallerySection || !card) return;
    change((next) => {
      const target = next.content.original![gallerySection].items.find((item) => item.id === card.id);
      if (target) target[field] = value;
    });
  };
  const removeCard = () => {
    if (!gallerySection || !card) return;
    change((next) => {
      next.content.original![gallerySection].items = next.content.original![gallerySection].items.filter((item) => item.id !== card.id);
      delete next.media.cards[card.id];
    });
    setSelected("menu-title");
    setPopupOpen(false);
  };
  const addFact = (sectionOverride?: FactKey) => {
    if (!site) return;
    const section = sectionOverride || (menu.toLowerCase() as FactKey);
    if (!["nama", "karir", "skill"].includes(section)) return;
    const items = site.content.original![section].items;
    if (items.length >= 30) {
      setError("Maksimal 30 kartu data per menu.");
      return;
    }
    const index = items.length;
    change((next) => {
      next.content.original![section].items.push({
        id: crypto.randomUUID(), label: "Data baru", value: "Klik untuk mengedit", icon: 8121295,
      });
    });
    setMenu((section.charAt(0).toUpperCase() + section.slice(1)) as Menu);
    setSelected("fact:" + section + ":" + index);
    setShowDesign(false);
    setPopupOpen(true);
    setPopupCoordinates({ left: Math.max(12, window.innerWidth - 404), top: 116 });
    sendFrame({ type: "NAMINA_V2_MENU", menu: section.charAt(0).toUpperCase() + section.slice(1) });
  };

  const moveSlide = (section: MenuKey, index: number, direction: -1 | 1) => {
    change((next) => {
      // Move the existing object, preserving its UUID, image mapping and links.
      const items: Array<{ id: string }> = next.content.original![section].items;
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= items.length) return;
      const [slide] = items.splice(index, 1);
      if (slide) items.splice(destination, 0, slide);
    });
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setWorking(true); setError("");
    try {
      await studioApi("login", { method: "POST", body: JSON.stringify({ password }) });
      setPassword("");
      setSession({ configured: true, authenticated: true });
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  };
  const logout = async () => {
    await studioApi("logout", { method: "POST", body: "{}" }).catch(() => {});
    setSession({ configured: true, authenticated: false }); setSite(null); setLoadedOnce(false); setPopupOpen(false);
  };

  if (!session) return <main className="studio-v2__gate"><p>{error || "Memeriksa akses NAMINA Studio…"}</p></main>;
  if (!session.configured || !session.authenticated) return <main className="studio-v2__gate">
    <section className="studio-v2__login">
      <a href="/">NAMINA</a><span>VISUAL STUDIO 02</span>
      <h1>Masuk NAMINA Studio</h1>
      <p>Login admin digunakan untuk pengelolaan NAMINA. Akun editor klien akan menggunakan akses pribadi setelah aktivasi.</p>
      {session.configured ? <form onSubmit={(event) => void login(event)}>
        <label htmlFor="v2-password">Kata sandi admin</label>
        <input id="v2-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <button type="submit" disabled={working}>Masuk Editor</button>
      </form> : <p>Studio menunggu konfigurasi admin.</p>}
      {error && <p role="alert" className="studio-v2__error">{error}</p>}
      <a className="studio-v2__back-link" href="/studio-v1">Buka Generator V1</a>
    </section>
  </main>;

  function labelForSelection() {
    if (showDesign) return "Warna, tipografi & layout";
    if (selected === "name") return "Nama di website";
    if (selected === "profession") return "Profesi / tagline";
    if (selected === "intro") return "Kalimat pembuka";
    if (selected === "description") return "Deskripsi bagian " + menuTitle;
    if (selected === "subtitle") return "Subjudul";
    if (selected.startsWith("menu:")) return "Menu " + (original?.menuTitles?.[selected.slice(5) as MenuKey] || selected.slice(5));
    if (selected === "menu-title") return "Judul menu";
    if (selected === "contact") return "Tombol WhatsApp";
    if (selected === "video") return "Video background";
    if (fact) return "Kartu data · " + fact.label;
    if (card) return "Kartu " + gallerySection + " · " + card.title;
    return "Pilih elemen pada layar HP";
  }

  function inspectorContent(): ReactNode {
    if (!site || !original) return <p>Pilih website terlebih dahulu.</p>;
    if (showDesign) {
      const colorFields = [
        ["backgroundColor", "Latar belakang"], ["textColor", "Warna teks"],
        ["accentColor", "Aksen merah"], ["buttonColor", "Warna tombol"],
        ["buttonTextColor", "Teks tombol"], ["borderColor", "Garis & border"],
      ] as const;
      return <>
        <p className="studio-v2__inspector-hint">Semua pengaturan langsung terlihat pada layar HP. Tidak mengubah template asli klien lain.</p>
        {slug !== "vini" && <div className="studio-v2__template-reset">
          <strong>Mulai dari contoh /vini</strong>
          <p>Salin ulang data, video, slide ikon, karya, dan produk jika draft klien masih kosong. Konten saat ini akan diganti, tetapi website yang sudah tayang tidak berubah sampai dipublikasikan.</p>
          <button className="studio-v2__ghost" type="button" disabled={working} onClick={() => void useViniTemplate()}>Isi Template /vini</button>
        </div>}
        <div className="studio-v2__colors">
          {colorFields.map(([field, label]) => <label key={field}>
            <span>{label}</span><input type="color" value={style[field]} onChange={(event) => updateStyle(field, event.target.value)} />
            <code>{style[field]}</code>
          </label>)}
        </div>
        <label className="studio-v2__field"><span>Jenis font</span><select value={style.fontFamily}
          onChange={(event) => updateStyle("fontFamily", event.target.value as OriginalStyle["fontFamily"])}>
          <option value="montserrat">Montserrat</option><option value="poppins">Poppins</option>
          <option value="space">Space Grotesk</option><option value="cormorant">Cormorant Garamond</option>
          <option value="georgia">Georgia</option><option value="system">Font sistem</option>
        </select></label>
        {([
          ["titleScale", "Ukuran judul", .65, 1.6],
          ["roleScale", "Ukuran profesi", .75, 1.5],
          ["bodyScale", "Ukuran isi", .75, 1.5],
          ["menuScale", "Ukuran menu", .75, 1.5],
        ] as const).map(([field, label, min, max]) =>
          <label className="studio-v2__slider" key={field}><span>{label} <b>{(style[field] ?? 1).toFixed(2)}×</b></span>
            <input type="range" min={min} max={max} step=".05" value={style[field] ?? 1}
              onChange={(event) => updateStyle(field, Number(event.target.value))} />
          </label>)}
        <label className="studio-v2__field"><span>Layout website</span><select value={style.layoutPreset || "original"}
          onChange={(event) => updateStyle("layoutPreset", event.target.value as OriginalStyle["layoutPreset"])}>
          <option value="original">Original sinematik</option>
          <option value="center">Teks di tengah</option>
          <option value="compact">Layout compact</option>
        </select></label>
        <label className="studio-v2__field"><span>Gaya tombol</span><select value={style.buttonVariant}
          onChange={(event) => updateStyle("buttonVariant", event.target.value as OriginalStyle["buttonVariant"])}>
          <option value="solid">Tombol penuh</option><option value="outline">Tombol outline</option>
        </select></label>
        <label className="studio-v2__slider"><span>Sudut tombol <b>{style.buttonRadius}px</b></span>
          <input type="range" min="0" max="32" step="1" value={style.buttonRadius}
            onChange={(event) => updateStyle("buttonRadius", Number(event.target.value))} /></label>
        <button type="button" className="studio-v2__ghost" onClick={() => change((next) => { delete next.content.original!.style; })}>Reset desain Original</button>
      </>;
    }
    if (selected === "name") return <Field label="Nama lengkap / nama tampil" value={site.content.identity.displayName}
      maxLength={60} onChange={(value) => change((next) => {
        const previous = next.content.identity.displayName;
        next.content.identity.displayName = value;
        const first = next.content.original!.nama.items.find((item) => item.label === "Nama" && item.value === previous);
        if (first) first.value = value;
      })} />;
    if (selected === "profession") return <Field label="Profesi / tagline" maxLength={70}
      value={site.content.identity.profession} onChange={(value) => change((next) => { next.content.identity.profession = value; })} />;
    if (selected === "intro") return <Field label="Kalimat pembuka" maxLength={120}
      value={currentSection?.intro || ""} onChange={(value) => updateSection("intro", value)} />;
    if (selected === "description") return <Field label={"Deskripsi " + menuTitle} maxLength={400} multiline
      value={currentSection?.description || ""} onChange={(value) => updateSection("description", value)} />;
    if (selected === "subtitle") return <Field label="Subjudul halaman" maxLength={100}
      value={currentSection?.subtitle || ""} onChange={(value) => updateSection("subtitle", value)} />;
    if (selected.startsWith("menu:") && ["nama", "karir", "skill", "karya", "produk"].includes(parts[1])) {
      const key = parts[1] as MenuKey;
      const isGallery = key === "karya" || key === "produk";
      const items = original[key].items;
      const speed = original.menuSettings?.[key]?.slideSpeed ?? (isGallery ? 64 : 68);
      return <>
        <p className="studio-v2__inspector-hint">
          Menu website asli. Ganti judul dan ikon, lalu atur kartu yang bergerak di bagian ini.
        </p>
        <Field label="Teks nama menu" maxLength={24}
          value={original.menuTitles?.[key] ?? key.charAt(0).toUpperCase() + key.slice(1)}
          onChange={(value) => change((next) => {
            next.content.original!.menuTitles = { ...next.content.original!.menuTitles, [key]: value };
          })} />
        <label className="studio-v2__field"><span>Ikon navigasi</span>
          <select value={original.menuSettings?.[key]?.icon ?? "default"}
            onChange={(event) => change((next) => {
              const current = next.content.original!;
              current.menuSettings = {
                ...current.menuSettings,
                [key]: { ...current.menuSettings?.[key], icon: event.target.value as OriginalMenuIcon },
              };
            })}>
            {navigationIconOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="studio-v2__slider">
          <span>Kecepatan slide <b>{speed === 0 ? "Diam" : speed + " px/detik"}</b></span>
          <input type="range" min="0" max="150" step="5" value={speed}
            onChange={(event) => change((next) => {
              const current = next.content.original!;
              current.menuSettings = {
                ...current.menuSettings,
                [key]: { ...current.menuSettings?.[key], slideSpeed: Number(event.target.value) },
              };
            })} />
        </label>
        <section className="studio-v2__menu-slides">
          <div className="studio-v2__menu-slides-heading">
            <strong>Urutan slide / kartu</strong>
            <span>{items.length} kartu</span>
          </div>
          {items.map((item, index) => {
            const title = "title" in item ? item.title : item.label;
            const target = isGallery ? "card:" + key + ":" + item.id : "fact:" + key + ":" + index;
            return <div className="studio-v2__slide-entry" key={item.id}>
              <span className="studio-v2__slide-index">{index + 1}</span>
              <span className="studio-v2__slide-name" title={title}>{title}</span>
              <button type="button" onClick={() => { setSelected(target); setPopupOpen(true); }} aria-label={"Edit " + title}>Edit</button>
              <button type="button" onClick={() => moveSlide(key, index, -1)} disabled={index === 0} aria-label={"Naikkan " + title}>↑</button>
              <button type="button" onClick={() => moveSlide(key, index, 1)} disabled={index >= items.length - 1} aria-label={"Turunkan " + title}>↓</button>
            </div>;
          })}
          <button className="studio-v2__add-slide" type="button"
            onClick={() => {
              if (isGallery) addCard(key as GalleryKey);
              else addFact(key as FactKey);
            }}>
            + Tambah {isGallery ? "kartu" : "data"} di menu ini
          </button>
        </section>
        <p className="studio-v2__inspector-hint">
          Klik judul besar atau kartu langsung di website untuk mengedit isinya. Panah ↑ ↓ mengubah urutan slide.
        </p>
      </>;
    }
    if (selected === "menu-title") return <Field label="Judul menu di halaman" maxLength={24}
      value={original.menuTitles?.[menuKey] ?? menu}
      onChange={(value) => change((next) => {
        next.content.original!.menuTitles = { ...next.content.original!.menuTitles, [menuKey]: value };
      })} />;
    if (selected === "contact") return <>
      <Field label="Nomor WhatsApp (tanpa link)" type="tel" placeholder="081234567890"
        value={whatsappNumber(original.contactUrl)} onChange={(value) => change((next) => {
          next.content.original!.contactUrl = whatsappLink(value);
        })} />
      <Field label="Tulisan tombol" maxLength={40} value={original.contactLabel ?? "Japri Saya!"}
        onChange={(value) => change((next) => { next.content.original!.contactLabel = value; })} />
      {original.contactUrl && <a className="studio-v2__test-link" href={original.contactUrl} target="_blank" rel="noopener noreferrer">Tes link WhatsApp ↗</a>}
    </>;
    if (selected === "video") return <>
      <Field label="URL video utama (MP4 / link Dropbox)" type="url"
        value={site.media.desktopVideo} placeholder="https://www.dropbox.com/scl/fi/..."
        onChange={(value) => change((next) => { next.media.desktopVideo = value; })} />
      <Field label="URL video HP (opsional)" type="url" value={site.media.mobileVideo}
        onChange={(value) => change((next) => { next.media.mobileVideo = value; })} />
      <a href="https://www.dropbox.com/home" className="studio-v2__test-link" target="_blank" rel="noopener noreferrer">Upload video ke Dropbox ↗</a>
      <p className="studio-v2__inspector-hint">Upload video dilakukan di Dropbox. Tempel tautan berbagi yang bisa dibuka publik, idealnya menggunakan parameter raw=1.</p>
    </>;
    if (fact && factSection) return <>
      <Field label="Nama data" value={fact.label} maxLength={40} onChange={(value) => updateFact("label", value)} />
      <Field label="Isi data" value={fact.value} maxLength={180} multiline onChange={(value) => updateFact("value", value)} />
      <label className="studio-v2__field"><span>Ikon animasi</span>
        <select value={fact.icon} onChange={(event) => updateFact("icon", Number(event.target.value))}>
          {icons.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <div className="studio-v2__inspector-actions">
        <button type="button" className="studio-v2__danger" onClick={() => {
          change((next) => {
            next.content.original![factSection].items.splice(factIndex, 1);
          });
          setSelected("description");
          setPopupOpen(false);
        }}>Hapus data ini</button>
        <button type="button" onClick={() => addFact(factSection || undefined)}>+ Tambah data</button>
      </div>
    </>;
    if (card && gallerySection) {
      const image = site.media.cards[card.id] || "";
      return <>
        <Field label="Judul kartu" value={card.title} maxLength={80} onChange={(value) => updateCard("title", value)} />
        <Field label="Deskripsi popup" value={card.description} maxLength={1200} multiline onChange={(value) => updateCard("description", value)} />
        <Field label="Link tombol kartu" value={card.link} type="url" placeholder="https://..." onChange={(value) => updateCard("link", value)} />
        <div className="studio-v2__image">
          {image ? <img src={image} alt={"Foto " + card.title} /> : <span>Foto belum dipasang</span>}
        </div>
        <p className="studio-v2__inspector-hint">Foto disimpan di hosting gambar; NAMINA cukup memakai URL publik agar tidak perlu deploy.</p>
        <Field label="URL gambar (HTTPS)" type="url" value={image} placeholder="https://.../foto.webp"
          onChange={(value) => change((next) => { next.media.cards[card.id] = value; })} />
        <label className="studio-v2__color-field"><span>Warna kartu</span><input type="color" value={card.color}
          onChange={(event) => updateCard("color", event.target.value)} /></label>
        <div className="studio-v2__inspector-actions">
          <button type="button" className="studio-v2__danger" onClick={removeCard}>Hapus kartu</button>
          <button type="button" onClick={() => addCard(gallerySection)}>+ Tambah kartu</button>
        </div>
      </>;
    }
    return <div className="studio-v2__empty">
      <strong>Ketuk elemen di HP</strong>
      <p>Ketuk judul, deskripsi, kartu, atau tombol. Panel ini langsung berubah menjadi editor untuk elemen yang dipilih.</p>
    </div>;
  }

  return <main className={"studio-v2 studio-v2--fullscreen" + (immersive ? " studio-v2--immersive" : "")}>
    <header className="studio-v2__workbar">
      <div className="studio-v2__workbar-left">
        <a href="/" className="studio-v2__logo" aria-label="NAMINA beranda">NAMINA<span>STUDIO</span></a>
        <span className="studio-v2__workbar-divider" aria-hidden="true" />
        <label className="studio-v2__client-switch">
          <span className="studio-v2__sr-only">Pilih website klien</span>
          <select aria-label="Pilih website klien" value={slugs.includes(slug) ? slug : ""}
            onChange={(event) => { if (event.target.value) void openClient(event.target.value); }}>
            {!slugs.includes(slug) && <option value="">/{slug} · draft</option>}
            {slugs.map((item) => <option key={item} value={item}>/{item}</option>)}
          </select>
        </label>
        <details className="studio-v2__new studio-v2__workbar-create">
          <summary title="Buat website baru">+ Klien</summary>
          <div><input aria-label="Nama link klien baru" placeholder="nama-klien"
            value={newSlug} onChange={(event) => setNewSlug(event.target.value)} />
            <button type="button" disabled={working} onClick={() => void createClient()}>{working ? "Menyiapkan…" : "Buat dari /vini"}</button>
          </div>
        </details>
      </div>
      <div className="studio-v2__device-switch" role="group" aria-label="Pilih tampilan website">
        <button type="button" aria-pressed={screen === "desktop"} className={screen === "desktop" ? "is-active" : ""}
          onClick={() => { setScreen("desktop"); setPopupOpen(false); sendFrame({ type: "NAMINA_V2_CLOSE_EDITOR" }); }}>▣ <span>PC</span></button>
        <button type="button" aria-pressed={screen === "mobile"} className={screen === "mobile" ? "is-active" : ""}
          onClick={() => { setScreen("mobile"); setPopupOpen(false); sendFrame({ type: "NAMINA_V2_CLOSE_EDITOR" }); }}>▯ <span>HP</span></button>
        <button type="button" className="studio-v2__immersive-trigger" title="Edit website dalam layar penuh" aria-label="Edit layar penuh"
          onClick={() => { setImmersive(true); setPopupOpen(false); sendFrame({ type: "NAMINA_V2_CLOSE_EDITOR" }); }}>⛶ <span>Layar Penuh</span></button>
      </div>
      <div className="studio-v2__workbar-right">
        <span className="studio-v2__autosave"><i /> Draft otomatis</span>
        <button type="button" className="studio-v2__design-trigger"
          onClick={() => { setShowDesign(true); setPopupOpen(true); setPopupCoordinates({ left: Math.max(12, window.innerWidth - 404), top: 82 }); sendFrame({ type: "NAMINA_V2_CLOSE_EDITOR" }); }}>✦ <span>Desain</span></button>
        <button type="button" className="studio-v2__publish-trigger" disabled={!site || working}
          onClick={() => { setPopupOpen(false); setPublishConfirmOpen(true); }}>Publikasikan</button>
        <a href="/studio-v1" className="studio-v2__v1-link" title="Buka Generator 8 Tahap">V1</a>
        <button type="button" className="studio-v2__exit" onClick={() => void logout()} title="Keluar dari Studio">Keluar</button>
      </div>
        <a href="/studio/admin" className="studio-v2__admin-link" title="Kelola mitra dan perpanjangan">Admin Mitra</a>
    </header>

    {error && <p className="studio-v2__floating-message studio-v2__floating-message--error" role="alert">{error}
      <button type="button" onClick={() => setError("")}>×</button>
    </p>}

    <div className={"studio-v2__site-workspace studio-v2__site-workspace--" + screen}>
      <div className={"studio-v2__site-frame" + (screen === "mobile" ? " studio-v2__site-frame--phone" : "")}>
        {screen === "mobile" && <div className="studio-v2__phone-notch" aria-hidden="true" />}
        <iframe ref={frameRef} title={screen === "desktop" ? "Website klien — live editor tampilan PC" : "Website klien — live editor tampilan HP"}
          src="/studio-v2-canvas" loading="eager" onLoad={() => setReady(true)} />
      </div>
      {!site && <div className="studio-v2__canvas-wait">{working ? "Membuka website klien…" : "Pilih atau buat website klien terlebih dahulu."}</div>}
      <div className="studio-v2__canvas-indicator">
        <span>{screen === "desktop" ? "PC • Layar penuh" : "HP • Mobile"} </span>
        <span>•</span>
        <span>{site ? "namina.biz.id/" + site.slug : "Pilih klien"}</span>
        {site && <a href={"/" + site.slug} target="_blank" rel="noopener noreferrer">Lihat versi terbit ↗</a>}
      </div>
    </div>

    {immersive && <button type="button" className="studio-v2__immersive-exit" onClick={() => setImmersive(false)}>↙ Kembali ke Studio</button>}
    {popupOpen && site && <div ref={inspectorRef} className="studio-v2__inline-popover"
      style={{ left: popupCoordinates.left, top: popupCoordinates.top }} role="dialog" aria-modal="false" aria-label={"Edit " + labelForSelection()}>
      <div className="studio-v2__inline-popover-header">
        <div><small>{showDesign ? "KUSTOMISASI" : "UBAH LANGSUNG"}</small><strong>{labelForSelection()}</strong></div>
        <button type="button" onClick={() => { setPopupOpen(false); setShowDesign(false); }} aria-label="Tutup editor">×</button>
      </div>
      <div className="studio-v2__inline-popover-content">
        {inspectorContent()}
      </div>
    </div>}

    {publishConfirmOpen && <div className="studio-v2__modal-backdrop">
      <section className="studio-v2__modal" role="dialog" aria-modal="true" aria-labelledby="v2-confirm-title">
        <div className="studio-v2__modal-mark">✓</div>
        <h2 id="v2-confirm-title">Siap terbitkan website?</h2>
        <p>Periksa semua teks, video, kartu, foto, link, dan warna. Draft tidak akan tampil publik sampai kamu menekan Publikasikan.</p>
        <strong>{"https://namina.biz.id/" + slug}</strong>
        <label className="studio-v2__approve"><input type="checkbox" checked={approved}
          onChange={(event) => setApproved(event.target.checked)} />
          <span>Semua perubahan sudah benar dan siap dipublikasikan.</span>
        </label>
        <button type="button" className="studio-v2__publish-button" disabled={!site || working || !approved}
          onClick={() => { setPublishConfirmOpen(false); void publish(); }}>{working ? "Memproses…" : "Publikasikan sekarang"}</button>
        <button type="button" className="studio-v2__modal-close" onClick={() => { setPublishConfirmOpen(false); setApproved(false); }}>Batal</button>
      </section>
    </div>}
    {published && <PublishSuccessModal url={"https://namina.biz.id/" + slug} onClose={() => setPublished(null)} />}
  </main>;
}
