import { useEffect, useRef, useState } from "react";
import { businessClient } from "../business/client";
import "../business.css";

const supportUrl = "https://wa.me/62881022445869?text=" + encodeURIComponent(
  "Halo Teh Vini, saya mitra NAMINA. Tolong kirim ulang link akses Studio saya."
);

/**
 * One-time /akses URL uses a URL fragment so tokens never hit the Vercel
 * request path, analytics query strings, server logs, or Referer headers.
 * Remove it from history BEFORE contacting Supabase Auth.
 */
export function BusinessMagicAccess() {
  const started = useRef(false);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const tokenHash = fragment.get("token_hash");
    const kind = fragment.get("type");
    window.history.replaceState(window.history.state, "", "/akses");
    void (async () => {
      if (!businessClient) throw new Error("Layanan akun NAMINA belum tersedia.");
      if (!tokenHash || kind !== "magiclink" || !/^[A-Za-z0-9_-]{20,256}$/.test(tokenHash)) {
        const current = await businessClient.auth.getUser();
        if (current.data.user) { window.location.replace("/mitra"); return; }
        throw new Error("Link tidak ditemukan atau tidak valid. Minta link baru kepada admin NAMINA.");
      }
      const { error } = await businessClient.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw new Error("Link ini sudah digunakan atau kedaluwarsa. Minta tautan baru dari admin NAMINA.");
      window.location.replace("/mitra");
    })().catch((cause: Error) => {
      setStatus("error");
      setMessage(cause.message);
    });
  }, []);

  return <main className="business business__access">
    <div className="business__access-card">
      <div className="business__logo business__access-logo">NAMINA <span>AKSES MITRA</span></div>
      <div className="business__access-icon" aria-hidden="true">{status === "loading" ? "↻" : "!"}</div>
      <h1>{status === "loading" ? "Membuka Studio kamu…" : "Link perlu diperbarui"}</h1>
      <p className="business__lead">{status === "loading"
        ? "Sedang memverifikasi tautan pribadi. Tidak perlu mengisi email atau password."
        : message}</p>
      {status === "error" && <a className="business__primary" href={supportUrl} target="_blank" rel="noopener noreferrer">Minta Link Baru</a>}
      <p className="business__fineprint">Demi keamanan, link hanya sekali pakai. Setelah berhasil masuk, perangkat ini akan menyimpan sesi akun kamu.</p>
    </div>
  </main>;
}
