import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import '../identity-flip.css';

type Phase = 'welcome' | 'loading' | 'hero';

const profileTabs = [
  {
    label: 'Identitas',
    kicker: 'IDENTITAS DIGITAL',
    title: 'KENAL',
    accent: 'LEBIH DEKAT.',
    description: 'Di balik setiap nama, ada perjalanan yang layak dikenal.',
    sectionTitle: 'PROFIL SINGKAT',
    fields: ['Nama', 'Tempat, Tanggal Lahir', 'Alamat', 'Agama', 'Status', 'Pekerjaan'],
  },
  {
    label: 'Pendidikan',
    kicker: 'RIWAYAT PENDIDIKAN',
    title: 'JEJAK',
    accent: 'PENDIDIKAN.',
    description: 'Setiap proses belajar membentuk perjalanan dan cara kita berpikir.',
    sectionTitle: 'LATAR PENDIDIKAN',
    fields: ['Jenjang', 'Sekolah / Kampus', 'Jurusan', 'Tahun Masuk', 'Tahun Lulus', 'Pendidikan Tambahan'],
  },
  {
    label: 'Hobi',
    kicker: 'HOBI & MINAT',
    title: 'CERITA',
    accent: 'DI LUAR KERJA.',
    description: 'Sisi personal yang membuat setiap orang punya warna tersendiri.',
    sectionTitle: 'MINAT PERSONAL',
    fields: ['Hobi Utama', 'Aktivitas Favorit', 'Minat Kreatif', 'Kegiatan Outdoor', 'Komunitas', 'Hobi Lainnya'],
  },
  {
    label: 'Skill',
    kicker: 'KEAHLIAN PERSONAL',
    title: 'KEAHLIAN',
    accent: '& POTENSI.',
    description: 'Kemampuan yang diasah lewat latihan, proses, dan pengalaman.',
    sectionTitle: 'DAFTAR KEAHLIAN',
    fields: ['Keahlian Utama', 'Keahlian Pendukung', 'Spesialisasi', 'Tools & Platform', 'Bahasa', 'Kompetensi Lain'],
  },
  {
    label: 'Pengalaman',
    kicker: 'PERJALANAN PROFESIONAL',
    title: 'JEJAK',
    accent: 'PENGALAMAN.',
    description: 'Cerita di balik pekerjaan, kolaborasi, dan pencapaian.',
    sectionTitle: 'RIWAYAT PENGALAMAN',
    fields: ['Posisi', 'Perusahaan / Organisasi', 'Bidang', 'Periode', 'Tanggung Jawab', 'Pencapaian'],
  },
  {
    label: 'Karya',
    kicker: 'PORTOFOLIO PERSONAL',
    title: 'CERITA',
    accent: 'DALAM KARYA.',
    description: 'Hasil pemikiran dan proses kreatif yang bisa dibagikan.',
    sectionTitle: 'KARYA PILIHAN',
    fields: ['Judul Karya', 'Kategori', 'Tahun', 'Deskripsi', 'Media', 'Tautan Karya'],
  },
  {
    label: 'Sertifikasi',
    kicker: 'BUKTI KOMPETENSI',
    title: 'REKAM',
    accent: 'SERTIFIKASI.',
    description: 'Pengakuan atas pembelajaran dan keahlian yang telah ditempuh.',
    sectionTitle: 'DAFTAR SERTIFIKASI',
    fields: ['Nama Sertifikasi', 'Lembaga Penerbit', 'Bidang Kompetensi', 'Tahun Terbit', 'Masa Berlaku', 'Tautan Verifikasi'],
  },
];

export function IdentityFlip() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomeButton = useRef<HTMLButtonElement>(null);
  const heroHeading = useRef<HTMLHeadingElement>(null);
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeTab, setActiveTab] = useState(0);
  const currentTab = profileTabs[activeTab];

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

  const returnToWelcome = () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    if (focusTimer.current) clearTimeout(focusTimer.current);
    setPhase('welcome');
    setActiveTab(0);
    focusTimer.current = setTimeout(() => welcomeButton.current?.focus(), 80);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % profileTabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + profileTabs.length) % profileTabs.length;
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
              ref={welcomeButton}
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
            <span className="cinematic-hero__nav-caption">CINEMATIC PROFILE <b>01 / 01</b></span>
            <button type="button" className="cinematic-hero__back" onClick={returnToWelcome}>
              <span aria-hidden="true">←</span> KEMBALI
            </button>
          </header>

          <div className="cinematic-hero__content">
            <div className="cinematic-hero__intro" key={`intro-${activeTab}`}>
              <span className="cinematic-kicker"><i aria-hidden="true" /> {currentTab.kicker}</span>
              <h2 ref={heroHeading} tabIndex={-1}>{currentTab.title} <span>{currentTab.accent}</span></h2>
              <p>{currentTab.description}</p>
            </div>
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
                  {item.label}
                </button>
              ))}
            </div>
            <div
              key={activeTab}
              id="cinematic-tab-panel"
              className="cinematic-hero__panel"
              role="tabpanel"
              aria-labelledby={`cinematic-tab-${activeTab}`}
              tabIndex={0}
            >
              <div className="cinematic-hero__profile">
                <h3>{currentTab.sectionTitle}</h3>
                <dl className="cinematic-hero__fields">
                  {currentTab.fields.map((field) => (
                    <div className="cinematic-hero__field" key={field}>
                      <dt>{field}</dt>
                      <dd>—</dd>
                    </div>
                  ))}
                </dl>
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
