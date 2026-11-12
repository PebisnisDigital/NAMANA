import { useEffect, useRef, useState } from "react";
import { businessClient } from "../business/client";
import "../business.css";

const supportUrl = "https://wa.me/62881022445869?text=" + encodeURIComponent(
  "Halo Teh Vini, saya mitra NAMINA. Tolong cek link akses Studio saya."
);

/**
 * Permanent bearer secret exists only in the URL fragment, never as a query
 * string or request-path parameter. Erase it from visible history immediately.
 * The server exchanges it for a new one-use Supabase OTP, not a reusable JWT.
 */
export function BusinessMagicAccess() {
  const started = useRef(false);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const permanentKey = fragment.get("access");
    const tokenHash = fragment.get("token_hash"); // Support older one-use invitations.
    const kind = fragment.get("type");
    window.history.replaceState(window.history.state, "", "/akses");
    void (async () => {
      if (!businessClient) throw new Error("Layanan akun NAMINA belum tersedia.");
      if (permanentKey) {
        if (!/^[A-Za-z0-9_-]{43}$/.test(permanentKey)) {
          throw new Error("Link akses tidak valid. Minta tautan baru kepada admin NAMINA.");
        }
        const { data, error } = await businessClient.functions.invoke("namina-business-access", {
          body: { token: permanentKey },
        });
        if (error || !data || typeof data.token_hash !== "string") {
          throw new Error((data as { error?: string } | null)?.error ||
            "Link tidak berlaku atau sudah diganti. Hubungi admin NAMINA.");
        }
        const verified = await businessClient.auth.verifyOtp({
          token_hash: data.token_hash,
          type: "magiclink",
        });
        if (verified.error) throw new Error("Akses tidak berhasil diverifikasi. Buka ulang link pribadi.");
        window.location.replace("/studio");
        return;
      }
      if (tokenHash && kind === "magiclink" && /^[A-Za-z0-9_-]{20,256}$/.test(tokenHash)) {
        const { error } = await businessClient.auth.verifyOtp({
          token_hash: tokenHash, type: "magiclink",
        });
        if (error) throw new Error("Link lama telah kedaluwarsa. Mintakan link permanen kepada admin.");
        window.location.replace("/studio");
        return;
      }
      const current = await businessClient.auth.getUser();
      if (current.data.user) { window.location.replace("/studio"); return; }
      throw new Error("Tautan akses tidak ditemukan. Minta link Studio NAMINA dari admin.");
    })().catch((cause: Error) => {
      setStatus("error");
      setMessage(cause.message);
    });
  }, []);

  return <main className="business business__access">
    <div className="business__access-card">
      <div className="business__logo business__access-logo">NAMINA <span>AKSES MITRA</span></div>
      <div className="business__access-icon" aria-hidden="true">{status === "loading" ? "↻" : "!"}</div>
      <h1>{status === "loading" ? "Membuka Studio kamu…" : "Akses perlu diperbarui"}</h1>
      <p className="business__lead">{status === "loading"
        ? "Sedang membuka Studio pribadi. Tidak perlu mengisi email atau password."
        : message}</p>
      {status === "error" && <a className="business__primary" href={supportUrl}
        target="_blank" rel="noopener noreferrer">Hubungi Admin</a>}
      <p className="business__fineprint">
        Simpan link ini secara pribadi. Link dapat digunakan kembali kapan saja sampai admin mencabut atau menggantinya.
      </p>
    </div>
  </main>;
}
