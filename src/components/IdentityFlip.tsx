import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const cardViewport = useRef<HTMLDivElement>(null);
  const cardNodes = useRef<Array<HTMLElement | null>>([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    if (focusTimer.current) clearTimeout(focusTimer.current);
  }, []);

  useEffect(() => {
    if (phase !== 'hero') return;
    const viewport = cardViewport.current;
    const card = cardNodes.current[activeTab];
    if (!viewport || !card) return;
    const viewportBox = viewport.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const cardCenter = cardBox.left - viewportBox.left + viewport.scrollLeft + cardBox.width / 2;
    viewport.scrollTo({
      left: Math.max(0, cardCenter - viewport.clientWidth / 2),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, [activeTab, phase]);

  const enterExperience = () => {
    if (phase !== 'welcome') return;
    setPhase('loading');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    loadingTimer.current = setTimeout(() => {
      setPhase('hero');
      focusTimer.current = setTimeout(() => heroHeading.current?.focus(), reduceMotion ? 0 : 450);
    }, reduceMotion ? 350 : 1550);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % profileTabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + profileTabs.length) % profileTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = profileTabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(next);
    tabButtons.current[next]?.focus();
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
            <aside className="cinematic-hero__rail" aria-label="Pilih kategori profil">
              <div className="cinematic-hero__tabs" role="tablist" aria-label="Kategori profil">
                {profileTabs.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    id={`cinematic-tab-${index}`}
                    ref={(node) => { tabButtons.current[index] = node; }}
                    role="tab"
                    aria-selected={activeTab === index}
                    aria-controls="cinematic-tab-panel"
                    tabIndex={activeTab === index ? 0 : -1}
                    onClick={() => setActiveTab(index)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                  >
                    <span className="cinematic-hero__tab-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </aside>

              <div
                id="cinematic-tab-panel"
                className="cinematic-hero__panel"
                role="tabpanel"
                aria-labelledby={`cinematic-tab-${activeTab}`}
                tabIndex={0}
              >
                <div className="cinematic-hero__card-toolbar">
                  <span>GESER KARTU <span aria-hidden="true">↔</span></span>
                  <div className="cinematic-hero__card-arrows">
                    <button type="button" aria-label="Kartu sebelumnya" disabled={activeTab === 0} onClick={() => setActiveTab((index) => Math.max(0, index - 1))}>←</button>
                    <button type="button" aria-label="Kartu berikutnya" disabled={activeTab === profileTabs.length - 1} onClick={() => setActiveTab((index) => Math.min(profileTabs.length - 1, index + 1))}>→</button>
                  </div>
                </div>
                <div className="cinematic-hero__card-viewport" ref={cardViewport} aria-label="Slider kartu profil">
                  <div className="cinematic-hero__card-track">
                    {profileTabs.map((item, index) => {
                      const active = activeTab === index;
                      return (
                        <article
                          key={item.label}
                          ref={(node) => { cardNodes.current[index] = node; }}
                          className={`cinematic-hero__card${active ? ' cinematic-hero__card--active' : ''}`}
                        >
                          <button
                            type="button"
                            className="cinematic-hero__card-trigger"
                            aria-expanded={active}
                            aria-controls={`cinematic-card-data-${index}`}
                            onClick={() => setActiveTab(index)}
                          >
                            <span className="cinematic-hero__card-eyebrow">BAB {String(index + 1).padStart(2, '0')} <span> / 07</span></span>
                            <strong>{item.label}</strong>
                            <span className="cinematic-hero__card-open" aria-hidden="true">{active ? '−' : '+'}</span>
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
