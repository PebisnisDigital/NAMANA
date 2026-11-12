import { useEffect, useState, type MouseEvent } from "react";
import { ViniCinematic } from "../components/ViniCinematic";
import { siteDocumentSchema, type SiteDocument } from "../static/sites";
import type { AssetUrls } from "../domain/content";
import "../studio-v2-canvas.css";

type VisualMenu = "Nama" | "Karir" | "Skill" | "Karya" | "Produk";
type CanvasState = { site: SiteDocument; assets: AssetUrls };
type InlineEdit = {
  key: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  multiline: boolean;
};
const menus: VisualMenu[] = ["Nama", "Karir", "Skill", "Karya", "Produk"];
const editableText = new Set(["name", "profession", "intro", "description", "subtitle", "menu-title"]);

function notify(message: Record<string, unknown>) {
  if (window.parent !== window) window.parent.postMessage(message, window.location.origin);
}

export function StudioV2Canvas() {
  const [data, setData] = useState<CanvasState | null>(null);
  const [activeMenu, setActiveMenu] = useState<VisualMenu>("Nama");
  const [selected, setSelected] = useState("");
  const [inline, setInline] = useState<InlineEdit | null>(null);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data as Record<string, unknown> | null;
      if (!message || typeof message !== "object") return;
      if (message.type === "NAMINA_V2_RENDER") {
        const parsed = siteDocumentSchema.safeParse(message.site);
        if (parsed.success && message.assets && typeof message.assets === "object") {
          setData({ site: parsed.data, assets: message.assets as AssetUrls });
        }
      }
      if (message.type === "NAMINA_V2_MENU" && typeof message.menu === "string" && menus.includes(message.menu as VisualMenu)) {
        setActiveMenu(message.menu as VisualMenu);
      }
      if (message.type === "NAMINA_V2_SELECT" && typeof message.key === "string") setSelected(message.key);
      if (message.type === "NAMINA_V2_CLOSE_EDITOR") setInline(null);
    };
    window.addEventListener("message", receive);
    notify({ type: "NAMINA_V2_READY" });
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-v2-edit]").forEach((element) =>
      element.classList.toggle("studio-v2-canvas__chosen", element.dataset.v2Edit === selected));
  }, [selected, data, activeMenu]);

  const sourceText = (key: string, fallback: string) => {
    const site = data?.site;
    const original = site?.content.original;
    if (!site || !original) return fallback;
    const sectionKey = activeMenu.toLowerCase() as "nama" | "karir" | "skill" | "karya" | "produk";
    const section = original[sectionKey];
    if (key === "name") return site.content.identity.displayName;
    if (key === "profession") return site.content.identity.profession;
    if (key === "intro") return section.intro;
    if (key === "description") return section.description;
    if (key === "subtitle") return section.subtitle;
    if (key === "menu-title") return original.menuTitles?.[sectionKey] ?? activeMenu;
    if (key.startsWith("menu:")) {
      const name = key.slice(5) as "nama" | "karir" | "skill" | "karya" | "produk";
      return original.menuTitles?.[name] ?? name.charAt(0).toUpperCase() + name.slice(1);
    }
    return fallback;
  };

  const selectElement = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-v2-edit]") : null;
    if (!target?.dataset.v2Edit) return;
    const key = target.dataset.v2Edit;
    const rect = target.getBoundingClientRect();
    const bounds = {
      left: rect.left, top: rect.top, width: rect.width, height: rect.height,
    };
    event.preventDefault();
    event.stopPropagation();
    setSelected(key);
    notify({ type: "NAMINA_V2_SELECT", key, rect: bounds });

    if (key.startsWith("menu:")) {
      const chosen = menus.find((name) => name.toLowerCase() === key.slice(5));
      if (chosen) {
        setActiveMenu(chosen);
        notify({ type: "NAMINA_V2_MENU_CHANGED", menu: chosen });
      }
    }
    const isText = editableText.has(key) || key.startsWith("menu:");
    if (!isText) {
      setInline(null);
      return;
    }
    const styles = getComputedStyle(target);
    const fontSize = Math.min(26, Math.max(13, Number.parseFloat(styles.fontSize) || 15));
    const value = sourceText(key, target.textContent?.trim() || "");
    const availableWidth = Math.max(180, window.innerWidth - 22);
    const width = Math.min(Math.max(rect.width, 240), Math.min(availableWidth, 580));
    setInline({
      key, value, width, height: rect.height,
      x: Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(rect.top, window.innerHeight - 190)),
      fontSize,
      multiline: key === "description",
    });
  };

  return <main className="studio-v2-canvas">
    {data ? <div className="studio-v2-canvas__interact" onClickCapture={selectElement}>
      <ViniCinematic
        content={data.site.content}
        assetUrls={data.assets}
        previewMode
        editorMode
        editorMenu={activeMenu}
        onEditorMenuChange={(menu) => {
          setActiveMenu(menu);
          notify({ type: "NAMINA_V2_MENU_CHANGED", menu });
        }}
        onEditorAddCard={(section) => notify({ type: "NAMINA_V2_ADD_CARD", section })}
      />
    </div> : <div className="studio-v2-canvas__loading">Memuat tampilan website asli…</div>}
    {inline && <div className="studio-v2-canvas__inline" style={{
      position: "fixed", top: inline.y, left: inline.x,
      width: inline.width, zIndex: 1000,
    }}>
      <div className="studio-v2-canvas__inline-heading">
        <span>EDIT LANGSUNG</span>
        <button type="button" aria-label="Selesai mengedit" onClick={() => setInline(null)}>✓</button>
      </div>
      <textarea
        aria-label="Edit teks langsung pada website"
        autoFocus
        rows={inline.multiline ? 4 : 2}
        maxLength={inline.key === "name" ? 60 : inline.key === "profession" ? 70 : inline.key === "description" ? 400 : inline.key === "subtitle" ? 100 : (inline.key === "menu-title" || inline.key.startsWith("menu:")) ? 24 : 120}
        value={inline.value}
        style={{ fontSize: inline.fontSize, minHeight: Math.max(52, Math.min(150, inline.height + 15)) }}
        onChange={(event) => {
          const value = event.target.value;
          setInline((previous) => previous ? { ...previous, value } : null);
          notify({ type: "NAMINA_V2_UPDATE", key: inline.key, value });
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" || (event.key === "Enter" && !inline.multiline)) {
            event.preventDefault();
            setInline(null);
          }
        }}
      />
      <small>Perubahan langsung terlihat. Tekan ✓ jika sudah.</small>
    </div>}
  </main>;
}
