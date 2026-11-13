import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "./shared";
import "../intro-landing.css";

/** Original cinematic impact synthesized locally, not a copied studio ident. */
function playCinematicImpact(context: AudioContext) {
  const impact = context.currentTime + 4.05;

  const whoosh = context.createOscillator();
  whoosh.type = "sawtooth";
  const whooshFilter = context.createBiquadFilter();
  whooshFilter.type = "lowpass";
  whooshFilter.frequency.setValueAtTime(220, impact - 1.25);
  whooshFilter.frequency.exponentialRampToValueAtTime(1800, impact - 0.08);
  const whooshVolume = context.createGain();
  whooshVolume.gain.setValueAtTime(0.0001, impact - 1.25);
  whooshVolume.gain.exponentialRampToValueAtTime(0.055, impact - 0.16);
  whooshVolume.gain.exponentialRampToValueAtTime(0.0001, impact + 0.12);
  whoosh.frequency.setValueAtTime(70, impact - 1.25);
  whoosh.frequency.exponentialRampToValueAtTime(220, impact);
  whoosh.connect(whooshFilter).connect(whooshVolume).connect(context.destination);
  whoosh.start(impact - 1.25);
  whoosh.stop(impact + 0.14);

  const bass = context.createOscillator();
  bass.type = "sine";
  bass.frequency.setValueAtTime(106, impact);
  bass.frequency.exponentialRampToValueAtTime(38, impact + 0.55);
  const bassGain = context.createGain();
  bassGain.gain.setValueAtTime(0.0001, impact);
  bassGain.gain.exponentialRampToValueAtTime(0.36, impact + 0.022);
  bassGain.gain.exponentialRampToValueAtTime(0.0001, impact + 0.88);
  bass.connect(bassGain).connect(context.destination);
  bass.start(impact);
  bass.stop(impact + 0.9);

  const samples = Math.floor(context.sampleRate * 0.85);
  const buffer = context.createBuffer(1, samples, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < samples; index += 1) {
    const envelope = Math.pow(1 - index / samples, 4);
    data[index] = (Math.random() * 2 - 1) * envelope;
  }
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(1700, impact);
  noiseFilter.frequency.exponentialRampToValueAtTime(180, impact + 0.7);
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(0.13, impact);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, impact + 0.8);
  noise.connect(noiseFilter).connect(noiseGain).connect(context.destination);
  noise.start(impact);
  noise.stop(impact + 0.83);
}

export function Landing() {
  const [take, setTake] = useState(0);
  const [forceMotion, setForceMotion] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    document.title = "NAMINA | Cinematic Intro";
    return () => { if (audioRef.current) void audioRef.current.close(); };
  }, []);

  const replayWithSound = useCallback(() => {
    // On reduced-motion devices, explicit clicking opts into the full sequence.
    setForceMotion(true);
    setTake((previous) => previous + 1);
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      void context.resume().then(() => playCinematicImpact(context)).catch(() => {
        // Browsers can block audio until the visitor grants interaction.
      });
    } catch {
      // The animation still works when Web Audio is unavailable.
    }
  }, []);

  return (
    <main className={"namina-cinematic-intro" + (forceMotion ? " namina-cinematic-intro--opt-in" : "")} aria-label="Intro sinematik NAMINA">
      <button className="namina-cinematic-intro__trigger" type="button"
        onClick={replayWithSound} aria-label="Putar ulang animasi NAMINA dengan suara"
        title="Klik logo untuk memutar intro dengan suara">
        <span className="namina-cinematic-intro__scene" key={take}>
          <span className="namina-cinematic-intro__halo" aria-hidden="true" />
          <span className="namina-cinematic-intro__mark" role="img" aria-label="Logo NAMINA">
            <svg viewBox="0 0 212 212" className="namina-cinematic-intro__symbol" aria-hidden="true" focusable="false">
              <defs>
                <mask id="namina-intro-trace" maskUnits="userSpaceOnUse">
                  <path className="namina-cinematic-intro__stroke namina-cinematic-intro__stroke--left"
                    d="M62 208L62 46" fill="none" stroke="white" strokeWidth="58" />
                  <path className="namina-cinematic-intro__stroke namina-cinematic-intro__stroke--diagonal"
                    d="M78 56L144 163" fill="none" stroke="white" strokeWidth="59" />
                  <path className="namina-cinematic-intro__stroke namina-cinematic-intro__stroke--right"
                    d="M151 163L151 0" fill="none" stroke="white" strokeWidth="58" />
                </mask>
              </defs>
              <rect className="namina-cinematic-intro__red" width="212" height="212" rx="23" fill="#AD151A" />
              <path mask="url(#namina-intro-trace)" fill="#FFFFFF"
                d="M48 212V57c0-24 27-30 41-10l47 70V0h27v159c0 25-24 33-38 13L75 91v121Z" />
            </svg>
            <span className="namina-cinematic-intro__wordmark">NAMINA</span>
          </span>
          <span className="namina-cinematic-intro__flare" aria-hidden="true" />
        </span>
      </button>
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
