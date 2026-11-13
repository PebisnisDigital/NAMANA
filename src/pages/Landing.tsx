import { useEffect, useRef, useState } from "react";
import { Shell } from "./shared";
import "../intro-landing.css";

const INTRO_VIDEO =
  "https://www.dropbox.com/scl/fi/r0pk04lqyqgxvlyq6r2wp/Namina_logo_reveal_animation_9149f6a7_1080p.mp4?rlkey=oegcrx65yg2fjmi4xfpt98xf0&raw=1";

export function Landing() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [opened, setOpened] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  useEffect(() => {
    document.title = "NAMINA | Cinematic Intro";
  }, []);

  function openNamina() {
    const video = videoRef.current;
    if (!video) return;

    // play() MUST be called directly in the click handler, before an async effect,
    // so desktop and mobile browsers can authorize playback with audio.
    setPlaybackFailed(false);
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    video.currentTime = 0;
    void video.play()
      .then(() => setOpened(true))
      .catch(() => {
        // Do not start a silent video or hide the CTA when sound-on play is denied.
        setPlaybackFailed(true);
      });
  }

  return (
    <main className="namina-video-intro" aria-label="Intro sinematik NAMINA">
      <video
        ref={videoRef}
        className={`namina-video-intro__video${opened ? " namina-video-intro__video--visible" : ""}`}
        src={INTRO_VIDEO}
        playsInline
        loop
        preload="auto"
        aria-label="Animasi video logo NAMINA dengan suara"
      />
      {!opened && (
        <div className="namina-video-intro__entry">
          <button
            className="namina-video-intro__open"
            type="button"
            onClick={openNamina}
          >
            BUKA NAMINA
          </button>
          {playbackFailed && (
            <p role="status" className="namina-video-intro__error">
              Video belum dapat diputar. Coba lagi.
            </p>
          )}
        </div>
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
