import { identifyNaminaStyle, type NaminaStylePreset } from "../static/originalStyle";
import type { OriginalStyle } from "../domain/content";

type Props = { style?: OriginalStyle; onSelect: (preset: NaminaStylePreset) => void };

export function TemplateStylePicker({ style, onSelect }: Props) {
  const current = identifyNaminaStyle(style);
  return (
    <fieldset className="namina-style-picker" style={{ border: "1px solid #c6a3a6", borderRadius: 14, padding: 12, margin: "0 0 18px" }}>
      <legend style={{ padding: "0 7px", fontWeight: 800 }}>Pilih Gaya Template</legend>
      <p style={{ fontSize: 12, margin: "2px 0 12px", lineHeight: 1.5 }}>Ganti tampilan saja. Data, video, menu, dan link klien tetap aman. Cek preview sebelum publikasi.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 9 }}>
        {([
          { id: "original", title: "Original Gelap", bg: "#08080c", ink: "#ffc799", detail: "Hitam · Emas · Merah" },
          { id: "putih", title: "Putih Elegan", bg: "#ffffff", ink: "#141414", detail: "Putih · Hitam · Merah" },
        ] as const).map((item) => (
          <button key={item.id} type="button" aria-pressed={current === item.id}
            onClick={() => onSelect(item.id)}
            style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 7,
              padding: 8, minWidth: 0, borderRadius: 12,
              border: current === item.id ? "2px solid #df1b32" : "1px solid #c6a3a6",
              background: current === item.id ? "#fff0f2" : "#ffffff", color: "#161616" }}>
            <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between",
              width: "100%", height: 70, borderRadius: 8, padding: 9, textAlign: "left",
              background: item.bg, color: item.ink, overflow: "hidden" }}>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>NAMINA</span>
              <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>TEH VINI <span style={{ color: "#df1b32" }}>●</span></span>
            </span>
            <strong style={{ fontSize: 12, lineHeight: 1.35 }}>{item.title}{current === item.id ? " ✓" : ""}</strong>
            <small style={{ fontSize: 10, lineHeight: 1.3, color: "#6a5860" }}>{item.detail}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
