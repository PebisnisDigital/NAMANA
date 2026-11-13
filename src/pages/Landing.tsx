import { useEffect, useRef, useState } from "react";
import { Shell } from "./shared";
import "../intro-landing.css";

const INTRO_VIDEO =
  "https://www.dropbox.com/scl/fi/5b7pls0qxzo4f6f0k6mqv/Cinematic_logo_reveal_animation_b424378f_1080p-1.mp4?rlkey=crahsp9nv9q28lbee71e958z8&raw=1";

export function Landing() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = "NAMINA | Cinematic Intro";
    const video = videoRef.current;
    if (!video) return;

    // Attempt sound-on autoplay. Browser autoplay policies may require a user gesture.
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    void video.play()
      .then(() => setNeedsInteraction(false))
      .catch(() => setNeedsInteraction(true));
  }, []);

  function startWithSound() {
    const video = videoRef.current;
    if (!video) return;

    // Called directly from a visitor gesture so mobile browsers can unlock audio.
    video.muted = false;
    video.volume = 1;
    void video.play()
      .then(() => setNeedsInteraction(false))
      .catch(() => setNeedsInteraction(true));
  }

  return (
    <main className="namina-video-intro" aria-label="Video intro sinematik NAMINA">
      {error ? (
        <a className="namina-video-intro__fallback" href={INTRO_VIDEO} target="_blank" rel="noopener noreferrer">
          Video tidak dapat dimuat. Buka video intro NAMINA.
        </a>
      ) : (
        <>
          <video
            ref={videoRef}
            className="namina-video-intro__video"
            src={INTRO_VIDEO}
            autoPlay
            playsInline
            loop
            preload="auto"
            aria-label="Animasi pembuka logo NAMINA dengan suara"
            onError={() => setError(true)}
          />
          {needsInteraction && (
            <button
              className="namina-video-intro__start"
              type="button"
              onClick={startWithSound}
              aria-label="Putar intro NAMINA dengan suara"
            >
              <span>Ketuk untuk putar dengan suara</span>
            </button>
          )}
        </>
      )}
    </main>
  );
}

export function Legal({ terms }: { terms: boolean }) {
  return (
    <Shell>
      <main className="page prose">
        <h1>{terms ? "Ketentuan penggunaan" : "Privasi website"}</h1>
        <p>
          NAMINA.PRO sedang mempersiapkan layanan website personal.
          Pengelolaan halaman dilakukan tim admin.
        </p>
        {terms ? (
          <>
            <p>
              Gunakan hanya konten yang Anda miliki atau berhak publikasikan.
              Anda bertanggung jawab atas isi website dan tautan yang Anda
              terbitkan.
            </p>
            <p>
              Perubahan website dilakukan oleh tim admin melalui Studio.
              Publikasi memperbarui berkas konten di GitHub, lalu Vercel
              memperbarui website setelah deployment selesai.
            </p>
            <p>
              Ketentuan komersial, masa layanan, dan pengembalian dana belum
              ditetapkan. Hubungi pengelola melalui jalur undangan Anda sebelum
              penggunaan komersial.
            </p>
          </>
        ) : (
          <>
            <p>
              Biodata yang dikirim melalui /formulir, termasuk kontak dan data
              pribadi opsional, disimpan di database privat Supabase untuk
              diproses tim admin. Data formulir tidak langsung tampil di
              website publik.
            </p>
            <p>
              Data halaman yang dipublikasikan tersimpan sebagai berkas di
              repositori GitHub NAMINA. Tautan media dapat merujuk ke layanan
              pihak ketiga, misalnya Dropbox. Halaman klien dapat diakses umum.
            </p>
            <p>
              Studio admin memakai sesi login terbatas. Draft yang belum
              dipublikasikan dapat tersimpan pada browser yang sedang dipakai.
              Jangan gunakan komputer umum untuk mengelola data klien.
            </p>
            <p>
              Permintaan akses, koreksi, atau penghapusan data disampaikan ke
              pengelola melalui jalur undangan Anda. Kebijakan retensi dan
              kontak dukungan publik harus difinalkan sebelum peluncuran
              komersial.
            </p>
          </>
        )}
      </main>
    </Shell>
  );
}
