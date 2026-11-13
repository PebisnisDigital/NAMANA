import { useEffect, useRef } from "react";
import { Shell } from "./shared";
import "../intro-landing.css";

const INTRO_VIDEO =
  "https://www.dropbox.com/scl/fi/5b7pls0qxzo4f6f0k6mqv/Cinematic_logo_reveal_animation_b424378f_1080p-1.mp4?rlkey=crahsp9nv9q28lbee71e958z8&raw=1";

export function Landing() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.title = "NAMINA | Cinematic Intro";
    const video = videoRef.current;
    if (!video) return;

    // Try sound-on playback first. Browser permissions ultimately decide.
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;

    const resumeWithAudio = () => {
      if (!video.muted && !video.paused) return;
      video.muted = false;
      video.volume = 1;
      void video.play().catch(() => {
        // Keep the cinematic intro moving if audio playback is blocked.
        video.muted = true;
        void video.play().catch(() => {});
      });
    };

    void video.play().catch(() => {
      // Muted autoplay is usually permitted; do not show a blocking overlay.
      video.muted = true;
      void video.play().catch(() => {});
    });

    // The first natural page interaction can unlock audio. No visible controls.
    document.addEventListener("pointerdown", resumeWithAudio);
    document.addEventListener("keydown", resumeWithAudio);
    return () => {
      document.removeEventListener("pointerdown", resumeWithAudio);
      document.removeEventListener("keydown", resumeWithAudio);
    };
  }, []);

  return (
    <main className="namina-video-intro" aria-label="Video intro sinematik NAMINA">
      <video
        ref={videoRef}
        className="namina-video-intro__video"
        src={INTRO_VIDEO}
        autoPlay
        playsInline
        loop
        preload="auto"
        aria-label="Animasi pembuka logo NAMINA"
      />
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
