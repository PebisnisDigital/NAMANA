import type { CSSProperties } from "react";
import type { OriginalLogo } from "../domain/content";
import { originalFontFamilies, originalLogoDefaults } from "../static/originalStyle";
import { retryDropboxImage } from "../static/sites";
import { NaminaLogo } from "./NaminaLogo";
import "./ClientSiteLogo.css";

const fontLabels: Array<[OriginalLogo["fontFamily"], string]> = [
  ["montserrat", "Montserrat"],
  ["poppins", "Poppins"],
  ["space", "Space Grotesk"],
  ["cormorant", "Cormorant Garamond"],
  ["georgia", "Georgia"],
  ["system", "Font sistem"],
  ["bebas", "Bebas Neue"],
];

const logoFont = (font: OriginalLogo["fontFamily"]) =>
  font === "bebas" ? '"Bebas Neue", Impact, sans-serif' : originalFontFamilies[font];

export function ClientSiteLogo({ logo }: { logo?: OriginalLogo }) {
  if (!logo || logo.mode === "default") return <NaminaLogo variant="compact" />;

  if (logo.mode === "image") {
    if (!logo.imageUrl.trim()) return <NaminaLogo variant="compact" />;
    return <img
      key={logo.imageUrl}
      className="vini-cinema__client-logo-image"
      src={logo.imageUrl}
      alt={logo.text.trim() || "Logo website"}
      width={logo.imageWidth}
      decoding="async"
      onError={(event) => retryDropboxImage(event.currentTarget)}
      style={{ width: `min(${logo.imageWidth}px, 40vw)` }}
    />;
  }

  return <span className="vini-cinema__client-logo-text"
    title={logo.text}
    style={{
      color: logo.color,
      fontFamily: logoFont(logo.fontFamily),
      "--client-logo-size": `${logo.fontSize}px`,
    } as CSSProperties}>
    {logo.text.trim() || "NAMINA"}
  </span>;
}

export function ClientLogoSettings({
  value,
  fallbackColor,
  onChange,
}: {
  value?: OriginalLogo;
  fallbackColor: string;
  onChange: (next: OriginalLogo) => void;
}) {
  const logo: OriginalLogo = value ?? { ...originalLogoDefaults, color: fallbackColor };
  const change = <K extends keyof OriginalLogo>(key: K, nextValue: OriginalLogo[K]) =>
    onChange({ ...logo, [key]: nextValue });

  return <section className="studio-v2__client-logo-settings" aria-label="Pengaturan logo website">
    <strong>Logo website klien</strong>
    <p className="studio-v2__inspector-hint">Atur logo di kiri atas website. Perubahan hanya untuk klien yang sedang dipilih.</p>
    <label className="studio-v2__field">
      <span>Jenis logo</span>
      <select value={logo.mode} onChange={(e) => change("mode", e.target.value as OriginalLogo["mode"])}>
        <option value="default">Logo NAMINA bawaan</option>
        <option value="text">Logo berupa teks</option>
        <option value="image">Logo gambar dari link publik</option>
      </select>
    </label>
    {logo.mode === "text" && <>
      <label className="studio-v2__field">
        <span>Tulisan logo</span>
        <input type="text" maxLength={60} value={logo.text}
          placeholder="Nama brand klien" onChange={(e) => change("text", e.target.value)} />
      </label>
      <label className="studio-v2__field">
        <span>Jenis font logo</span>
        <select value={logo.fontFamily} onChange={(e) => change("fontFamily", e.target.value as OriginalLogo["fontFamily"])}>
          {fontLabels.map(([key, name]) => <option value={key} key={key}>{name}</option>)}
        </select>
      </label>
      <label className="studio-v2__field">
        <span>Warna tulisan logo</span>
        <div className="studio-v2__logo-color">
          <input type="color" aria-label="Pilih warna tulisan logo" value={logo.color}
            onChange={(e) => change("color", e.target.value)} />
          <code>{logo.color}</code>
        </div>
      </label>
      <label className="studio-v2__slider">
        <span>Ukuran huruf logo <b>{logo.fontSize}px</b></span>
        <input type="range" min="16" max="80" step="1" value={logo.fontSize}
          onChange={(e) => change("fontSize", Number(e.target.value))} />
      </label>
    </>}
    {logo.mode === "image" && <>
      <label className="studio-v2__field">
        <span>URL gambar logo publik (HTTPS)</span>
        <input type="url" value={logo.imageUrl} maxLength={1000}
          placeholder="https://contoh.com/logo.png"
          onChange={(e) => change("imageUrl", e.target.value.trim())} />
      </label>
      <p className="studio-v2__inspector-hint">Gunakan link yang langsung menampilkan gambar PNG, JPG, WebP, atau SVG. Link berbagi yang meminta login mungkin tidak tampil.</p>
      <label className="studio-v2__slider">
        <span>Lebar logo gambar <b>{logo.imageWidth}px</b></span>
        <input type="range" min="50" max="360" step="5" value={logo.imageWidth}
          onChange={(e) => change("imageWidth", Number(e.target.value))} />
      </label>
      <label className="studio-v2__field">
        <span>Nama logo (aksesibilitas)</span>
        <input type="text" value={logo.text} maxLength={60}
          onChange={(e) => change("text", e.target.value)} />
      </label>
    </>}
    <p className="studio-v2__inspector-hint">Lihat hasilnya langsung di preview PC/HP. Simpan atau publikasikan sesuai alur Studio.</p>
  </section>;
}
