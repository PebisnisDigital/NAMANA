import { useEffect } from "react";
import { NaminaLogo } from "../components/NaminaLogo";
import { Shell } from "./shared";
import "../intro-landing.css";

/**
 * NAMINA main domain is now a single-purpose animated brand stage.
 * Client sites, Studio, and legal pages remain unchanged.
 */
export function Landing() {
  useEffect(() => {
    document.title = "NAMINA | Cinematic Identity";
  }, []);

  return (
    <main className="namina-brand-intro" aria-label="Animasi logo NAMINA">
      <h1 className="namina-brand-intro__mark">
        <NaminaLogo variant="hero" />
      </h1>
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
