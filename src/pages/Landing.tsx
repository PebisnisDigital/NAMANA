import { Shell } from "./shared";
export function Landing() {
  return (
    <Shell>
      <main className="landing">
        <div className="landing-intro">
          <p className="section-label">Website personal • Template ORIGINAL</p>
          <h1>
            Cerita Anda.
            <br />
            Dalam setiap kartu.
          </h1>
          <p>
            Perkenalkan diri lewat dompet dan kartu 3D interaktif. Ubah cerita,
            foto, video latar, dan tautan dari NAMINA Studio.
          </p>
          <div className="actions">
            <a className="primary" href="/vini">
              Buka demo interaktif
            </a>
            <a href="/studio">Studio tim admin</a>
          </div>
          <p className="fine">
            Template ORIGINAL tersedia di /vini. Pengeditan ditangani tim admin.
          </p>
        </div>
        <div className="landing-demo">
          <iframe
            src="/vini"
            title="Demo interaktif template ORIGINAL"
            loading="lazy"
            width="900"
            height="560"
            scrolling="no"
          />
          <p>ORIGINAL • Klik dompet, lalu geser kartu untuk menjelajah.</p>
        </div>
        <section className="landing-note">
          <h2>Isi baru, karakter tetap.</h2>
          <p>
            Studio menjaga bentuk dompet dan gerak kartu. Tim admin mengatur
            identitas, isi kartu, warna, serta tautan media. Website klien
            dipublikasikan dari satu repositori GitHub.
          </p>
        </section>
      </main>
      <footer className="app-footer">
        <span>NAMINA</span>
        <a href="/privacy">Privasi</a>
        <a href="/terms">Ketentuan</a>
      </footer>
    </Shell>
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
