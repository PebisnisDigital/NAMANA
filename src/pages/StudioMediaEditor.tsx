import { useState } from "react";
import type { SiteDocument } from "../static/sites";
import { generateNaminaPrompts } from "../static/naminaPromptGenerator";

export type MediaPrompts = { image: string; video: string };

type MediaProps = {
  site: SiteDocument;
  change: (update: (next: SiteDocument) => void) => void;
  prompts: MediaPrompts;
  onPromptChange: (field: keyof MediaPrompts, value: string) => void;
};

function dropboxDirectUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !(
      hostname === "dropbox.com" || hostname === "www.dropbox.com"
    )) return value.trim();
    if (!/^\/(s|scl\/fi)\//.test(url.pathname)) return value.trim();
    url.searchParams.delete("dl");
    url.searchParams.set("raw", "1");
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function StudioMediaEditor({ site, change, prompts, onPromptChange }: MediaProps) {
  const [copied, setCopied] = useState<keyof MediaPrompts | null>(null);
  const generated = generateNaminaPrompts(site);
  const promptValue = (field: keyof MediaPrompts) => prompts[field] || generated[field];

  const copyPrompt = async (field: keyof MediaPrompts) => {
    try {
      await navigator.clipboard.writeText(promptValue(field));
      setCopied(field);
    } catch {
      setCopied(null);
    }
  };
  const updateVideo = (field: "desktopVideo" | "mobileVideo", value: string) =>
    change((next) => { next.media[field] = value; });

  return <div className="studio-media">
    <section className="studio-app__card">
      <div className="studio-app__card-heading">
        <span className="studio-app__card-icon" aria-hidden="true">✦</span>
        <div><h2>Prompt gambar & video</h2><p>Dibuat otomatis dari profil, karir, skill, karya dan produk yang sudah diisi.</p></div>
      </div>
      {([
        ["image", "Prompt gambar", "Untuk membuat foto sinematik sesuai identitas klien."],
        ["video", "Prompt video", "Untuk gerakan berjalan, lantai bergerak, dan loop tanpa henti."],
      ] as const).map(([field, title, description]) => (
        <section className="studio-media__prompt" key={field}>
          <label className="studio-app__field" htmlFor={"studio-prompt-" + field}>
            <span>{title}</span>
            <small>{description}</small>
            <textarea id={"studio-prompt-" + field} rows={9} maxLength={7000}
              value={promptValue(field)} onChange={(event) => onPromptChange(field, event.target.value)} />
          </label>
          <div className="studio-media__prompt-footer">
            <small>{promptValue(field).length.toLocaleString("id-ID")} karakter</small>
            <button type="button" onClick={() => void copyPrompt(field)}>{copied === field ? "Tersalin" : "Salin Prompt"}</button>
          </div>
        </section>
      ))}
      <button type="button" className="studio-media__regenerate" onClick={() => {
        onPromptChange("image", generated.image);
        onPromptChange("video", generated.video);
        setCopied(null);
      }}>↻ Buat ulang dari data terbaru</button>
      <p className="studio-media__note">
        Prompt menggunakan data yang dimasukkan pada tahap sebelumnya. Tambahkan foto referensi klien pada aplikasi AI pilihanmu.
        Prompt hanya tersimpan di browser admin dan tidak ditampilkan di website klien.
      </p>
    </section>

    <section className="studio-app__card">
      <div className="studio-app__card-heading">
        <span className="studio-app__card-icon" aria-hidden="true">▶</span>
        <div><h2>Video Dropbox</h2><p>Upload video hasil AI ke Dropbox, lalu masukkan tautannya di sini.</p></div>
      </div>
      <div className="studio-media__dropbox-steps">
        <div><strong>1.</strong><span>Buka Dropbox, lalu unggah video MP4 ke akunmu.</span></div>
        <div><strong>2.</strong><span>Pilih <b>Copy link</b> atau <b>Salin tautan</b> pada video.</span></div>
        <div><strong>3.</strong><span>Tempel tautan di kolom NAMINA. Link berbagi Dropbox dikonversi ke <code>raw=1</code>.</span></div>
      </div>
      <a className="studio-media__dropbox-button" href="https://www.dropbox.com/home" target="_blank" rel="noopener noreferrer">
        Unggah ke Dropbox ↗
      </a>
      <p className="studio-media__note">Tombol ini membuka Dropbox untuk upload manual. Belum ada akses unggah langsung dari Studio ke akun Dropbox.</p>
      <label className="studio-app__field" htmlFor="studio-video-desktop">
        <span>Link video Dropbox utama</span>
        <input id="studio-video-desktop" type="url" placeholder="https://www.dropbox.com/scl/fi/..."
          value={site.media.desktopVideo} onChange={(event) => updateVideo("desktopVideo", event.target.value)}
          onBlur={(event) => {
            const normalized = dropboxDirectUrl(event.target.value);
            if (normalized !== event.target.value) updateVideo("desktopVideo", normalized);
          }} />
        <small>Link harus dapat diakses oleh pengunjung. Video diputar otomatis tanpa suara dan berulang.</small>
      </label>
      <label className="studio-app__field" htmlFor="studio-video-mobile">
        <span>Link video khusus HP <em>Opsional</em></span>
        <input id="studio-video-mobile" type="url" placeholder="Kosong = gunakan video utama"
          value={site.media.mobileVideo} onChange={(event) => updateVideo("mobileVideo", event.target.value)}
          onBlur={(event) => {
            const normalized = dropboxDirectUrl(event.target.value);
            if (normalized !== event.target.value) updateVideo("mobileVideo", normalized);
          }} />
      </label>
      <details className="studio-app__disclosure">
        <summary>Atur posisi video</summary>
        <div className="studio-app__disclosure-body">
          <label className="studio-app__slider">Posisi video desktop <output>{site.content.background.focalX}%</output>
            <input type="range" min={0} max={100} value={site.content.background.focalX}
              onChange={(event) => change((next) => { next.content.background.focalX = Number(event.target.value); })} />
          </label>
          <label className="studio-app__slider">Posisi video HP <output>{site.content.background.mobileFocalX ?? site.content.background.focalX}%</output>
            <input type="range" min={0} max={100} value={site.content.background.mobileFocalX ?? site.content.background.focalX}
              onChange={(event) => change((next) => { next.content.background.mobileFocalX = Number(event.target.value); })} />
          </label>
        </div>
      </details>
    </section>
  </div>;
}
