import { useEffect, useMemo, useRef, useState } from "react";
import { businessClient } from "../business/client";
import { generateNaminaPrompts } from "../static/naminaPromptGenerator";
import type { SiteDocument } from "../static/sites";
import "./VideoStudioPanel.css";

type Props = {
  site: SiteDocument;
  siteId?: string;
  onChangeVideo: (url: string) => void;
  onChangeManual: (field: "desktopVideo" | "mobileVideo", url: string) => void;
};

const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
type UploadPhase = "idle" | "preparing" | "uploading" | "verifying" | "complete";

export function VideoStudioPanel({ site, siteId, onChangeVideo, onChangeManual }: Props) {
  const generated = useMemo(() => generateNaminaPrompts(site), [site]);
  const [imagePrompt, setImagePrompt] = useState(generated.image);
  const [videoPrompt, setVideoPrompt] = useState(generated.video);
  const [copied, setCopied] = useState<"image" | "video" | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/dropbox-video", { credentials: "same-origin" }).then(
      async (res) => res.json() as Promise<{ configured?: boolean }>,
    ).then((status) => { if (mounted) setConfigured(Boolean(status.configured)); })
      .catch(() => { if (mounted) setConfigured(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => () => { xhrRef.current?.abort(); }, []);

  async function copyPrompt(which: "image" | "video") {
    const value = which === "image" ? imagePrompt : videoPrompt;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
    } catch {
      setError("Browser tidak mengizinkan penyalinan. Blok teks prompt di atas lalu salin manual.");
    }
  }

  async function request(action: string, payload: Record<string, unknown>) {
    let bearer = "";
    if (siteId) {
      const { data } = await businessClient!.auth.getSession();
      bearer = data.session?.access_token || "";
      if (!bearer) throw new Error("Sesi mitra sudah berakhir. Buka ulang Studio dari magic link.");
    }
    const response = await fetch("/api/dropbox-video?action=" + action, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: "Bearer " + bearer } : {}),
      },
      body: JSON.stringify({ ...payload, slug: site.slug, ...(siteId ? { siteId } : {}) }),
    });
    const result = await response.json().catch(() => ({})) as {
      error?: string; uploadUrl?: string; ticket?: string; ok?: boolean; url?: string;
    };
    if (!response.ok || result.error) throw new Error(result.error || "Server gagal menyiapkan unggahan.");
    return result;
  }

  function sendDirect(file: File, uploadUrl: string) {
    return new Promise<void>((resolve, reject) => {
      let host = "";
      try { host = new URL(uploadUrl).hostname; } catch { /* Invalid URL handled below. */ }
      if (host !== "content.dropboxapi.com") {
        reject(new Error("Alamat unggah Dropbox tidak valid.")); return;
      }
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", uploadUrl);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.min(99, Math.round(100 * event.loaded / event.total)));
      };
      xhr.onload = () => {
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100); resolve();
        } else reject(new Error("Dropbox menolak video (" + xhr.status + "). Coba file MP4 lebih kecil."));
      };
      xhr.onerror = () => {
        xhrRef.current = null;
        reject(new Error("Koneksi ke Dropbox terputus. Periksa internet dan coba lagi."));
      };
      xhr.onabort = () => { xhrRef.current = null; reject(new Error("Upload dibatalkan.")); };
      xhr.send(file);
    });
  }

  async function uploadFile(file: File) {
    if (phase === "preparing" || phase === "uploading" || phase === "verifying") return;
    setError(""); setUploadedUrl(""); setProgress(0);
    if (!/\.mp4$/i.test(file.name) || (file.type && file.type !== "video/mp4")) {
      setError("Gunakan video MP4. Format lain tidak didukung."); return;
    }
    if (file.size < 1 || file.size > MAX_VIDEO_BYTES) {
      setError("Ukuran video maksimal 80 MB. Kompres ke H.264 terlebih dahulu."); return;
    }
    // MP4 contains an 'ftyp' box at bytes 4–7; check before using Dropbox quota.
    if (await file.slice(4, 8).text() !== "ftyp") {
      setError("File tidak terlihat seperti MP4 yang valid. Ekspor sebagai MP4 H.264."); return;
    }
    try {
      setPhase("preparing");
      const init = await request("init", { name: file.name, size: file.size });
      if (!init.uploadUrl || !init.ticket) throw new Error("Dropbox tidak mengembalikan izin upload.");
      setPhase("uploading");
      await sendDirect(file, init.uploadUrl);
      setPhase("verifying");
      const completed = await request("complete", { ticket: init.ticket });
      if (!completed.ok || !completed.url) throw new Error("Dropbox belum mengonfirmasi link video.");
      // Automatically replace only the private Studio draft. Live site is
      // updated solely after the user presses Publikasikan.
      onChangeVideo(completed.url);
      setUploadedUrl(completed.url);
      setPhase("complete");
    } catch (cause) {
      setPhase("idle");
      setError(cause instanceof Error ? cause.message : "Upload video gagal.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = phase === "preparing" || phase === "uploading" || phase === "verifying";

  return <div className="namina-video-tools">
    <section className="namina-video-tools__section">
      <h3>1. Prompt Gambar</h3>
      <p>Otomatis sesuai profil klien. Gunakan foto asli klien sebagai referensi wajah saat membuat gambar AI.</p>
      <textarea aria-label="Prompt gambar NAMINA" rows={5} maxLength={9000}
        value={imagePrompt} onChange={(event) => { setImagePrompt(event.target.value); setCopied(null); }} />
      <button type="button" className="namina-video-tools__copy" onClick={() => void copyPrompt("image")}>
        {copied === "image" ? "✓ Prompt Tersalin" : "Salin Prompt Gambar"}
      </button>
    </section>
    <section className="namina-video-tools__section">
      <h3>2. Prompt Video</h3>
      <p>Gerak berjalan sinematik, kamera tetap, lantai bergerak, dan loop tanpa berhenti.</p>
      <textarea aria-label="Prompt video NAMINA" rows={5} maxLength={9000}
        value={videoPrompt} onChange={(event) => { setVideoPrompt(event.target.value); setCopied(null); }} />
      <button type="button" className="namina-video-tools__copy" onClick={() => void copyPrompt("video")}>
        {copied === "video" ? "✓ Prompt Tersalin" : "Salin Prompt Video"}
      </button>
      <button type="button" className="namina-video-tools__reset" onClick={() => {
        const next = generateNaminaPrompts(site);
        setImagePrompt(next.image);
        setVideoPrompt(next.video);
        setCopied(null);
      }}>↻ Perbarui prompt dari data klien</button>
    </section>
    <section className="namina-video-tools__section">
      <h3>3. Upload Video ke Dropbox</h3>
      <p>Sudah punya hasil video AI? Pilih MP4. Studio mengunggahnya langsung ke Dropbox, kemudian memasang link video otomatis.</p>
      <label className={"namina-video-tools__upload" + (busy ? " namina-video-tools__upload--busy" : "")}>
        <span className="namina-video-tools__upload-icon" aria-hidden="true">↑</span>
        <strong>{busy ? "Mengunggah video…" : "Pilih Video MP4"}</strong>
        <small>Maks. 80 MB · MP4 H.264 · Video tetap disimpan di Dropbox</small>
        <input ref={inputRef} type="file" accept="video/mp4,.mp4" disabled={busy || configured === false}
          aria-label="Upload video MP4 langsung ke Dropbox"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); }} />
      </label>
      {busy && <div className="namina-video-tools__progress" role="status" aria-live="polite">
        <div className="namina-video-tools__progress-track"><div style={{ width: progress + "%" }} /></div>
        <span>{phase === "preparing" ? "Menyiapkan Dropbox…" :
          phase === "verifying" ? "100% · Memverifikasi link video…" :
          progress + "% · Mengunggah langsung ke Dropbox"}</span>
        {phase === "uploading" && <button type="button" onClick={() => xhrRef.current?.abort()}>Batalkan</button>}
      </div>}
      {configured === false && <p className="namina-video-tools__notice" role="status">
        Upload otomatis belum aktif. Admin NAMINA perlu menghubungkan Dropbox App sekali saja.
        Prompt dan input link manual tetap bisa digunakan.
      </p>}
      {error && <p className="namina-video-tools__error" role="alert">{error}</p>}
      {phase === "complete" && uploadedUrl && <p className="namina-video-tools__success" role="status">
        ✓ Video sudah masuk Dropbox dan terpasang pada draft. Periksa preview lalu tekan Simpan Draft atau Publikasikan.
      </p>}
    </section>
    <details className="namina-video-tools__manual">
      <summary>Input link manual (opsional)</summary>
      <label className="studio-v2__field"><span>Link video utama</span>
        <input type="url" placeholder="https://www.dropbox.com/scl/fi/..."
          value={site.media.desktopVideo} onChange={(event) => onChangeManual("desktopVideo", event.target.value)} />
      </label>
      <label className="studio-v2__field"><span>Link video HP (kosong = ikut video utama)</span>
        <input type="url" value={site.media.mobileVideo}
          onChange={(event) => onChangeManual("mobileVideo", event.target.value)} />
      </label>
      {(site.media.mobileVideo || site.media.desktopVideo).startsWith("https://") &&
        <a className="studio-v2__test-link" href={site.media.mobileVideo || site.media.desktopVideo}
          target="_blank" rel="noopener noreferrer">Tes Link Video ↗</a>}
    </details>
    <p className="namina-video-tools__hint">Prompt menghasilkan teks untuk dipakai di aplikasi AI. Pembuatan video AI dilakukan di aplikasi pilihan pengguna; upload tidak membuat video otomatis.</p>
  </div>;
}
