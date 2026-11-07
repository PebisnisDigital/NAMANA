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
            foto, dan tautan dari NAMANA Studio.
          </p>
          <div className="actions">
            <a className="primary" href="/demo">
              Buka demo interaktif
            </a>
            <a href="/login">Login klien</a>
          </div>
          <p className="fine">
            Akses klien melalui undangan pengelola. Penjualan dan pembayaran
            belum dibuka.
          </p>
        </div>
        <div className="landing-demo">
          <iframe
            src="/demo"
            title="Demo interaktif template ORIGINAL"
            loading="lazy"
          />
          <p>ORIGINAL • Klik dompet, lalu geser kartu untuk menjelajah.</p>
        </div>
        <section className="landing-note">
          <h2>Isi baru, karakter tetap.</h2>
          <p>
            Studio menjaga bentuk dompet dan gerak kartu. Anda mengatur
            identitas, isi kartu, warna, serta media latar. Perubahan draft
            terpisah dari website yang sudah terbit.
          </p>
        </section>
      </main>
      <footer className="app-footer">
        <span>NAMANA.PRO</span>
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
        <h1>{terms ? "Ketentuan akses uji" : "Privasi akses uji"}</h1>
        <p>
          NAMANA.PRO sedang dalam tahap persiapan MVP. Akses diberikan melalui
          undangan pengelola, dan pembayaran belum dibuka.
        </p>
        {terms ? (
          <>
            <p>
              Gunakan hanya konten yang Anda miliki atau berhak publikasikan.
              Anda bertanggung jawab atas isi website dan tautan yang Anda
              terbitkan.
            </p>
            <p>
              Draft tidak menjadi publik sebelum Anda memilih Publish. Tautan
              preview sementara dapat dibuka oleh penerimanya; bagikan hanya
              kepada orang yang Anda percaya.
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
              Data akun, draft profil, riwayat versi, dan media disimpan di
              Supabase proyek NAMANA. Halaman yang Anda publikasikan dapat
              diakses tanpa login.
            </p>
            <p>
              Sesi login disimpan di browser. Keluar dari akun setelah
              menggunakan perangkat bersama. Pengelola dapat membantu mengedit
              website, dan operasi penting dicatat dalam log.
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
