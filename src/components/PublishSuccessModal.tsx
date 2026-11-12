import { useEffect, useRef, useState } from "react";
import "./PublishSuccessModal.css";

type PublishSuccessModalProps = {
  url: string;
  onClose: () => void;
};

/** Shared by the admin and partner Studios. Render only after confirmed publish. */
export function PublishSuccessModal({ url, onClose }: PublishSuccessModalProps) {
  const copyButton = useRef<HTMLButtonElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  const whatsappText = "Halo, website Anda sudah jadi! Silakan lihat hasilnya di sini:\n\n" +
    url + "\n\nTerima kasih.";
  const whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(whatsappText);

  useEffect(() => {
    copyButton.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
    } catch {
      urlInput.current?.focus();
      urlInput.current?.select();
      setCopyStatus("manual");
    }
  }

  return <div className="namina-publish-success__backdrop">
    <section className="namina-publish-success" role="dialog" aria-modal="true"
      aria-labelledby="namina-publish-success-title" aria-describedby="namina-publish-success-description">
      <button type="button" className="namina-publish-success__close"
        onClick={onClose} aria-label="Tutup notifikasi">×</button>
      <div className="namina-publish-success__check" aria-hidden="true">✓</div>
      <div className="namina-publish-success__eyebrow">PUBLIKASI SUKSES</div>
      <h2 id="namina-publish-success-title">BERHASIL!</h2>
      <p id="namina-publish-success-description">Webnya sudah jadi.</p>
      <label className="namina-publish-success__url">
        <span>LINK WEBSITE KLIEN</span>
        <input ref={urlInput} value={url} readOnly onFocus={(event) => event.currentTarget.select()} />
      </label>
      <div className="namina-publish-success__actions">
        <button ref={copyButton} type="button" className="namina-publish-success__action namina-publish-success__action--primary"
          onClick={() => void copyLink()}>
          <span className="namina-publish-success__action-icon" aria-hidden="true">▣</span>
          {copyStatus === "copied" ? "Link Tersalin!" : "Salin Link Web"}
        </button>
        <a className="namina-publish-success__action" href={url} target="_blank" rel="noopener noreferrer">
          <span className="namina-publish-success__action-icon" aria-hidden="true">↗</span>
          Buka Web
        </a>
        <a className="namina-publish-success__action namina-publish-success__action--whatsapp"
          href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <span className="namina-publish-success__action-icon" aria-hidden="true">➤</span>
          Kirim Ke Klien
        </a>
      </div>
      {copyStatus === "manual" &&
        <p className="namina-publish-success__hint" role="status">Pilih dan salin tautan di kolom atas secara manual.</p>}
      <p className="namina-publish-success__hint">
        Kirim Ke Klien membuka WhatsApp. Pilih kontak penerima sebelum mengirim.
      </p>
      <button type="button" className="namina-publish-success__done" onClick={onClose}>
        Kembali Mengedit
      </button>
    </section>
  </div>;
}
