import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import '../identity-flip.css';

type Phase = 'welcome' | 'loading' | 'hero';

const profileTabs = [
  {
    label: 'Identitas',
    fields: ['Nama', 'Tempat, Tanggal Lahir', 'Alamat', 'Agama', 'Status', 'Pekerjaan'],
  },
  {
    label: 'Pendidikan',
    fields: ['Jenjang', 'Sekolah / Kampus', 'Jurusan', 'Tahun Masuk', 'Tahun Lulus', 'Pendidikan Tambahan'],
  },
  {
    label: 'Hobi',
    fields: ['Hobi Utama', 'Aktivitas Favorit', 'Minat Kreatif', 'Kegiatan Outdoor', 'Komunitas', 'Hobi Lainnya'],
  },
  {
    label: 'Skill',
    fields: ['Keahlian Utama', 'Keahlian Pendukung', 'Spesialisasi', 'Tools & Platform', 'Bahasa', 'Kompetensi Lain'],
  },
  {
    label: 'Pengalaman',
    fields: ['Posisi', 'Perusahaan / Organisasi', 'Bidang', 'Periode', 'Tanggung Jawab', 'Pencapaian'],
  },
  {
    label: 'Karya',
    fields: ['Judul Karya', 'Kategori', 'Tahun', 'Deskripsi', 'Media', 'Tautan Karya'],
  },
  {
    label: 'Sertifikasi',
    fields: ['Nama Sertifikasi', 'Lembaga Penerbit', 'Bidang Kompetensi', 'Tahun Terbit', 'Masa Berlaku', 'Tautan Verifikasi'],
  },
];

export function IdentityFlip() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroHeading = useRef<HTMLHeadingElement>(null);
  const pointerStart = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const lastWheelAt = useRef(0);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    if (focusTimer.current) clearTimeout(focusTimer.current);
  }, []);

  const enterExperience = () => {
    if (phase !== 'welcome') return;
    setPhase('loading');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    loadingTimer.current = setTimeout(() => {
      setPhase('hero');
      focusTimer.current = setTimeout(() => heroHeading.current?.focus(), reduceMotion ? 0 : 450);
    }, reduceMotion ? 350 : 1550);
  };

  const navigateCards = (direction: -1 | 1) => {
    setActiveTab((index) => Math.max(0, Math.min(profileTabs.length - 1, index + direction)));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStart.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current === null) return;
    const movement = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(movement) < 45) return;
    suppressClick.current = true;
    navigateCards(movement < 0 ? 1 : -1);
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  };

  const handleCardWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) < 18 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    if (Date.now() - lastWheelAt.current < 550) return;
    lastWheelAt.current = Date.now();
    navigateCards(event.deltaX > 0 ? 1 : -1);
  };

  return (
    <main className={`cinematic-page cinematic-page--${phase}`}>
      {phase !== 'hero' && (
        <section className="cinematic-welcome" aria-label="Selamat datang di PESONAFLIX">
          <div className="cinematic-welcome__beam cinematic-welcome__beam--left" aria-hidden="true" />
          <div className="cinematic-welcome__beam cinematic-welcome__beam--right" aria-hidden="true" />

          <div className="cinematic-welcome__nav">
            <span className="cinematic-brand">PESONA<span>FLIX</span></span>
            <span className="cinematic-welcome__edition">A CINEMATIC IDENTITY EXPERIENCE</span>
          </div>

          <div className="cinematic-welcome__content">
            <span className="cinematic-kicker"><i aria-hidden="true" /> SEBUAH CERITA DIMULAI</span>
            <h1 className="cinematic-welcome__title">
              <span>WELCOME</span>
              <small>TO</small>
              <strong>PESONAFLIX</strong>
            </h1>
            <p>Setiap orang punya cerita. Sekarang, biarkan dunia mengenal siapa Anda.</p>
            <button
              type="button"
              className="cinematic-welcome__enter"
              onClick={enterExperience}
              disabled={phase === 'loading'}
            >
              <span>MASUK</span>
              <span className="cinematic-welcome__enter-arrow" aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="cinematic-welcome__footer">
            <span>PERSONAL BRANDING, REIMAGINED.</span>
            <span>EST. 2026 / INDONESIA</span>
          </div>
        </section>
      )}

      {phase === 'hero' && (
        <section className="cinematic-hero" aria-label="Profil digital cinematic">
          <video className="cinematic-hero__video" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
          <div className="cinematic-hero__shade" aria-hidden="true" />
          <div className="cinematic-hero__grain" aria-hidden="true" />

          <header className="cinematic-hero__nav">
            <span className="cinematic-brand">PESONA<span>FLIX</span></span>
          </header>

          <div className="cinematic-hero__content">
            <div className="cinematic-hero__identity">
              <span className="cinematic-kicker"><i aria-hidden="true" /> Hello, kenalain saya</span>
              <h1 ref={heroHeading} tabIndex={-1}>
                <span className="cinematic-hero__stamp cinematic-hero__stamp--name">TEH VINI</span>
                <span className="cinematic-hero__stamp cinematic-hero__stamp--role">AI ENTHUSIAST</span>
              </h1>
            </div>

            <div className="cinematic-hero__details">
              <div className="cinematic-hero__panel" aria-label="Koleksi kartu profil 3D">
                <div className="cinematic-hero__card-toolbar">
                  <span>KOLEKSI KARTU <span aria-hidden="true">·</span> GESER UNTUK MEMILIH</span>
                  <div className="cinematic-hero__card-arrows">
                    <span className="cinematic-hero__card-position">{String(activeTab + 1).padStart(2, '0')} / 07</span>
                    <button type="button" aria-label="Kartu sebelumnya" disabled={activeTab === 0} onClick={() => navigateCards(-1)}>←</button>
                    <button type="button" aria-label="Kartu berikutnya" disabled={activeTab === profileTabs.length - 1} onClick={() => navigateCards(1)}>→</button>
                  </div>
                </div>
                <div
                  className="cinematic-hero__card-viewport"
                  aria-label="Tumpukan kartu profil, geser ke kiri atau kanan"
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={() => { pointerStart.current = null; }}
                  onWheel={handleCardWheel}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') { event.preventDefault(); navigateCards(1); }
                    if (event.key === 'ArrowLeft') { event.preventDefault(); navigateCards(-1); }
                  }}
                >
                  <div className="cinematic-hero__card-track" aria-live="polite">
                    {profileTabs.map((item, index) => {
                      const active = activeTab === index;
                      const offset = index - activeTab;
                      const depth = Math.abs(offset);
                      return (
                        <article
                          key={item.label}
                          className={`cinematic-hero__card${active ? ' cinematic-hero__card--active' : offset < 0 ? ' cinematic-hero__card--previous' : ' cinematic-hero__card--next'}`}
                          onPointerUp={(event) => {
                            if (pointerStart.current !== null && Math.abs(event.clientX - pointerStart.current) < 45 && !active) {
                              setActiveTab(index);
                            }
                          }}
                          style={{
                            '--card-offset': offset,
                            '--card-depth': depth,
                            '--card-side': Math.sign(offset),
                            zIndex: profileTabs.length - depth,
                            opacity: depth > 3 ? 0 : 1 - depth * .14,
                            pointerEvents: depth > 3 ? 'none' : 'auto',
                          } as React.CSSProperties}
                        >
                          <button
                            type="button"
                            className="cinematic-hero__card-trigger"
                            aria-expanded={active}
                            aria-controls={`cinematic-card-data-${index}`}
                            onClick={() => { if (!suppressClick.current) setActiveTab(index); }}
                          >
                            <span className="cinematic-hero__card-eyebrow">PESONAFLIX <span> / ORIGINALS</span></span>
                            <span className="cinematic-hero__card-chip" aria-hidden="true" />
                            <strong>{item.label}</strong>
                            <span className="cinematic-hero__card-open" aria-hidden="true">{String(index + 1).padStart(2, '0')} / 07</span>
                          </button>
                          <div id={`cinematic-card-data-${index}`} className="cinematic-hero__card-body" hidden={!active}>
                            <dl className="cinematic-hero__fields">
                              {item.fields.map((field, fieldIndex) => (
                                <div className="cinematic-hero__field" key={field} style={{ animationDelay: `${70 + fieldIndex * 65}ms` }}>
                                  <dt>{field}</dt>
                                  <dd>—</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="cinematic-hero__footer" aria-label="Identitas pengalaman">
            <span>THE STORY BEHIND THE PERSON</span>
            <span>PESONAFLIX ORIGINALS</span>
          </footer>
        </section>
      )}

      {phase === 'loading' && (
        <div className="cinematic-loader" role="status" aria-live="polite" aria-label="Menyiapkan profil cinematic">
          <div className="cinematic-loader__content">
            <span className="cinematic-loader__badge">PF / ORIGINAL EXPERIENCE</span>
            <div className="cinematic-loader__name">PESONA<span>FLIX</span></div>
            <p>MEMBUKA CERITA ANDA</p>
            <div className="cinematic-loader__bar"><span /></div>
            <span className="cinematic-loader__caption">PLEASE WAIT · YOUR STORY IS LOADING</span>
          </div>
        </div>
      )}
    </main>
  );
}
