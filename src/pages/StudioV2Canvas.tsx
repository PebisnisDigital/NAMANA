import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ViniCinematic } from "../components/ViniCinematic";
import { siteDocumentSchema, type SiteDocument } from "../static/sites";
import type { AssetUrls } from "../domain/content";
import "../studio-v2-canvas.css";

type VisualMenu = "Nama" | "Karir" | "Skill" | "Karya" | "Produk";
type CanvasState = { site: SiteDocument; assets: AssetUrls };

function notifyParent(message: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(message, window.location.origin);
}

export function StudioV2Canvas() {
  const [data, setData] = useState<CanvasState | null>(null);
  const [activeMenu, setActiveMenu] = useState<VisualMenu>("Nama");
  const [selected, setSelected] = useState("");
  const [editingInline, setEditingInline] = useState<{ key: string; value: string; rect: DOMRect } | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data as Record<string, unknown> | null;
      if (!message || typeof message !== "object") return;
      if (message.type === "NAMINA_V2_RENDER") {
        const parsed = siteDocumentSchema.safeParse(message.site);
        if (!parsed.success || !message.assets || typeof message.assets !== "object") return;
        setData({ site: parsed.data, assets: message.assets as AssetUrls });
      }
      if (message.type === "NAMINA_V2_MENU" && typeof message.menu === "string") {
        const options: VisualMenu[] = ["Nama", "Karir", "Skill", "Karya", "Produk"];
        if (options.includes(message.menu as VisualMenu)) setActiveMenu(message.menu as VisualMenu);
      }
      if (message.type === "NAMINA_V2_SELECT" && typeof message.key === "string") setSelected(message.key);
    };
    window.addEventListener("message", onMessage);
    notifyParent({ type: "NAMINA_V2_READY" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-v2-edit]").forEach((element) => {
      element.classList.toggle("studio-v2-canvas__chosen", element.dataset.v2Edit === selected);
    });
  }, [selected, data, activeMenu]);

  const onCanvasClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-v2-edit]") : null;
    if (!target || !target.dataset.v2Edit) return;
    const key = target.dataset.v2Edit;
    setSelected(key);
    setEditingInline(null);
    notifyParent({ type: "NAMINA_V2_SELECT", key });
    if (!key.startsWith("menu:")) {
      // Keep website buttons and gallery cards in editing mode; never follow live links.
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const onCanvasDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-v2-edit]") : null;
    const key = target?.dataset.v2Edit;
    if (!key || !target || key.startsWith("menu:") || key.startsWith("card:") || key.startsWith("fact:") || key === "contact") return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected(key);
    setEditingInline({ key, rect, value: target.textContent?.trim() || "" });
    notifyParent({ type: "NAMINA_V2_SELECT", key });
  };

  return <main className="studio-v2-canvas">
    {data ? <div className="studio-v2-canvas__interact" onClickCapture={onCanvasClick} onDoubleClickCapture={onCanvasDoubleClick}>
      <ViniCinematic
        content={data.site.content}
        assetUrls={data.assets}
        previewMode
        editorMode
        editorMenu={activeMenu}
        onEditorMenuChange={(menu) => {
          setActiveMenu(menu);
          notifyParent({ type: "NAMINA_V2_MENU_CHANGED", menu });
        }}
        onEditorAddCard={(section) => notifyParent({ type: "NAMINA_V2_ADD_CARD", section })}
      />
    </div> : <div className="studio-v2-canvas__loading">Menyiapkan tampilan website…</div>}
    {editingInline && <div className="studio-v2-canvas__inline" style={{
      position: "fixed",
      top: Math.max(8, Math.min(editingInline.rect.top, window.innerHeight - 130)),
      left: Math.max(8, Math.min(editingInline.rect.left, window.innerWidth - 260)),
      width: Math.min(340, Math.max(240, window.innerWidth - 16)),
      zIndex: 1000,
    }}>
      <label htmlFor="studio-v2-inline">Edit langsung di canvas</label>
      <textarea id="studio-v2-inline" autoFocus rows={3} value={editingInline.value}
        onChange={(event) => {
          const value = event.target.value;
          setEditingInline((previous) => previous ? { ...previous, value } : previous);
          notifyParent({ type: "NAMINA_V2_UPDATE", key: editingInline.key, value });
        }}
        onKeyDown={(event) => { if (event.key === "Escape") setEditingInline(null); }}
      />
      <button type="button" onClick={() => setEditingInline(null)}>Selesai ✓</button>
    </div>}
  </main>;
}
