import { useState } from "react";
import type { SiteDocument } from "../static/sites";

export type MediaPrompts = { image: string; video: string };

type MediaProps = {
  site: SiteDocument;
  change: (update: (next: SiteDocument) => void) => void;
  prompts: MediaPrompts;
  onPromptChange: (field: keyof MediaPrompts, value: string) => void;
  onUpload: (id: string, file: File) => void;
  uploading: boolean;
  previews: Record<string, string>;
};

export function StudioMediaEditor({ site, change, prompts, onPromptChange, onUpload, uploading, previews }: MediaProps) {
  const [copied, setCopied] = useState<keyof MediaPrompts | null>(null);
  const original = site.content.original!;
  const galleries = [
    { key: "karya", label: original.menuTitles?.karya?.trim() || "Karya", items: original.karya.items },
    { key: "produk", label: original.menuTitles?.produk?.trim() || "Produk", items: original.produk.items },
  ] as const;

  const copyPrompt = async (field: keyof MediaPrompts) => {
    if (!prompts[field]) return;
    try {
      await navigator.clipboard.writeText(prompts[field]);
      setCopied(field);
    } catch {
      setCopied(null);
    }
  };

  return <div className="studio-media">
    <section className="studio-app__card">
      <div className="studio-app__card-heading">
        <span className="studio-app__card-icon" aria-hidden="true">▶</span>
        <div><h2>Video latar website</h2><p>Tempel tautan video yang ingin diputar otomatis.</p></div>
      </div>
      <label className="studio-app__field" htmlFor="studio-video-desktop">
        <span>Link video utama</span>
        <input id="studio-video-desktop" type="url" value={site.media.desktopVideo} placeholder="https://.../video.mp4" onChange={(event) => change((next) => { next.media.desktopVideo = event.target.value; })} />
        <small>Gunakan tautan video HTTPS langsung, misalnya file MP4 atau Dropbox dengan raw=1.</small>
      </label>
      <label className="studio-app__field" htmlFor="studio-video-mobile">
        <span>Link video khusus HP <em>Opsional</em></span>
        <input id="studio-video-mobile" type="url" value={site.media.mobileVideo} placeholder="Kosong = pakai video utama" onChange={(event) => change((next) => { next.media.mobileVideo = event.target.value; })} />
      </label>
      <details className="studio-app__disclosure">
        <summary>Atur posisi dan tampilan video</summary>
        <div className="studio-app__disclosure-body">
          <label className="studio-app__field" htmlFor="studio-video-poster">
            <span>Gambar sampul video <em>Opsional</em></span>
            <input id="studio-video-poster" type="url" value={site.media.poster} placeholder="https://.../poster.webp" onChange={(event) => change((next) => { next.media.poster = event.target.value; })} />
          </label>
          <label className="studio-app__slider">Posisi orang pada desktop <output>{site.content.background.focalX}%</output>
            <input type="range" min="0" max="100" value={site.content.background.focalX} onChange={(event) => change((next) => { next.content.background.focalX = Number(event.target.value); })} />
          </label>
          <label className="studio-app__slider">Posisi orang pada HP <output>{site.content.background.mobileFocalX ?? site.content.background.focalX}%</output>
            <input type="range" min="0" max="100" value={site.content.background.mobileFocalX ?? site.content.background.focalX} onChange={(event) => change((next) => { next.content.background.mobileFocalX = Number(event.target.value); })} />
          </label>
        </div>
      </details>
    </section>

    <section className="studio-app__card">
      <div className="studio-app__card-heading">
        <span className="studio-app__card-icon" aria-hidden="true">✦</span>
        <div><h2>Prompt untuk AI</h2><p>Simpan instruksi visual sebelum membuat gambar atau video di aplikasi AI pilihanmu.</p></div>
      </div>
      {([
        ["image", "Prompt gambar", "Deskripsikan karakter, pose, outfit, komposisi, pencahayaan, dan latar gambar."],
        ["video", "Prompt video", "Deskripsikan gerakan karakter, arah kamera, gerakan lantai, dan animasi loop."],
      ] as const).map(([field, title, placeholder]) => (
        <div className="studio-media__prompt" key={field}>
          <label className="studio-app__field" htmlFor={"studio-prompt-" + field}>
            <span>{title}</span>
            <textarea id={"studio-prompt-" + field} rows={6} maxLength={7000} placeholder={placeholder} value={prompts[field]} onChange={(event) => onPromptChange(field, event.target.value)} />
          </label>
          <div className="studio-media__prompt-footer">
            <small>{prompts[field].length.toLocaleString("id-ID")} / 7.000 karakter</small>
            <button type="button" disabled={!prompts[field]} onClick={() => void copyPrompt(field)}>{copied === field ? "Tersalin" : "Salin prompt"}</button>
          </div>
        </div>
      ))}
      <p className="studio-media__note">Prompt tersimpan sebagai draft di browser ini, tidak ikut tampil di website publik. Kolom ini belum mengirim prompt ke layanan AI.</p>
    </section>

    <section className="studio-app__card">
      <div className="studio-app__card-heading">
        <span className="studio-app__card-icon" aria-hidden="true">▧</span>
        <div><h2>Gambar kartu</h2><p>Atur gambar untuk slider Karya dan Produk.</p></div>
      </div>
      {galleries.map((gallery) => (
        <div className="studio-media__gallery" key={gallery.key}>
          <h3>{gallery.label} <span>{gallery.items.length} kartu</span></h3>
          {gallery.items.length === 0 && <p className="studio-media__empty">Belum ada kartu. Tambahkan dulu di tahap INPUT.</p>}
          {gallery.items.map((item, index) => {
            const url = site.media.cards[item.id] || "";
            return <div className="studio-media__asset" key={item.id}>
              <strong>{String(index + 1).padStart(2, "0")}. {item.title}</strong>
              {url ? <img className="studio-media__image" src={previews[url] || url} alt={"Pratinjau " + item.title} width={480} height={160} />
                : <div className="studio-media__placeholder">Belum ada gambar</div>}
              <label className="studio-app__field" htmlFor={"studio-image-" + item.id}>
                <span>URL gambar <em>Opsional</em></span>
                <input type="url" id={"studio-image-" + item.id} placeholder="https://.../gambar.webp" value={url} onChange={(event) => change((next) => { next.media.cards[item.id] = event.target.value; })} />
              </label>
              <label className="studio-media__upload">
                <span>+ Unggah gambar</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) onUpload(item.id, file);
                  event.currentTarget.value = "";
                }} />
              </label>
              <small>JPG, PNG, atau WebP · maksimal 1,3 MB</small>
            </div>;
          })}
        </div>
      ))}
    </section>
  </div>;
}
