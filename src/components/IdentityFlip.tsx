import { useEffect, useRef, useState, type WheelEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
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

function cardPosition(offset: number, compact: boolean) {
  const depth = Math.max(0, offset);
  if (depth === 0) {
    return {
      x: 0, y: -12, z: 88,
      rotateX: -1.5, rotateY: -1.5, rotateZ: -.35,
      scale: 1.015, opacity: 1,
    };
  }

  return {
    x: compact ? 44 + (depth - 1) * 34 : 122 + (depth - 1) * 77,
    y: depth * (compact ? 14 : 18),
    z: -depth * (compact ? 85 : 110),
    rotateX: 1 + depth * 1.6,
    rotateY: -depth * 6.5,
    rotateZ: depth * 1.2,
    scale: 1 - depth * .055,
    opacity: depth > 3 ? 0 : 1 - depth * .13,
  };
}

const CARD_SPRING = {
  type: 'spring' as const,
  stiffness: 125,
  damping: 20,
  mass: 1.23,
  restSpeed: .02,
  restDelta: .02,
};

const CARD_EXIT = {
  exit: ({ direction, compact }: { direction: -1 | 1; compact: boolean }) => ({
    x: direction * (compact ? 570 : 930),
    y: -150,
    z: 240,
    rotateX: -9,
    rotateY: direction * 17,
    rotateZ: direction * 24,
    scale: 1.08,
    opacity: 0,
    zIndex: 70,
    transition: { duration: .55, ease: [.24, .76, .22, 1] as [number, number, number, number] },
  }),
};

type ProfileCard = (typeof profileTabs)[number];

function SwipeProfileCard({
  item, index, offset, compact, reducedMotion, onSwipe, onSelect,
}: {
  item: ProfileCard;
  index: number;
  offset: number;
  compact: boolean;
  reducedMotion: boolean;
  onSwipe: (direction: -1 | 1) => void;
  onSelect: (index: number) => void;
}) {
  const active = offset === 0;
  const dragX = useMotionValue(0);
  const dragTilt = useTransform(dragX, [-280, 0, 280], [-21, 0, 21]);
  const leftStamp = useTransform(dragX, [-150, -42, 0], [1, 0, 0]);
  const rightStamp = useTransform(dragX, [0, 42, 150], [0, 0, 1]);

  return (
    <motion.article
      className={`cinematic-hero__card${active ? ' cinematic-hero__card--active' : ' cinematic-hero__card--next'}`}
      initial={cardPosition(Math.max(offset, 1), compact)}
      animate={cardPosition(offset, compact)}
      exit="exit"
      variants={CARD_EXIT}
      transition={reducedMotion ? { duration: 0 } : CARD_SPRING}
      style={{ zIndex: 12 - offset, pointerEvents: active || offset < 3 ? 'auto' : 'none' }}
    >
      <motion.div
        className="cinematic-hero__card-swipe"
        drag={active && !reducedMotion ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={.95}
        dragMomentum={false}
        style={{ x: dragX, rotateZ: dragTilt, touchAction: 'pan-y' }}
        whileDrag={{ scale: 1.045, cursor: 'grabbing' }}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) < 100 && Math.abs(info.velocity.x) < 600) return;
          onSwipe(info.offset.x > 0 || (info.offset.x === 0 && info.velocity.x > 0) ? 1 : -1);
        }}
      >
        {active && (
          <>
            <motion.span className="cinematic-hero__swipe-stamp cinematic-hero__swipe-stamp--left" style={{ opacity: leftStamp }} aria-hidden="true">← NEXT</motion.span>
            <motion.span className="cinematic-hero__swipe-stamp cinematic-hero__swipe-stamp--right" style={{ opacity: rightStamp }} aria-hidden="true">NEXT →</motion.span>
          </>
        )}
        <button
          type="button"
          className="cinematic-hero__card-trigger"
          aria-expanded={active}
          aria-controls={`cinematic-card-data-${index}`}
          onClick={() => { if (!active) onSelect(index); }}
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
      </motion.div>
    </motion.article>
  );
}

export function IdentityFlip() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroHeading = useRef<HTMLHeadingElement>(null);
  const lastWheelAt = useRef(0);
  const [activeTab, setActiveTab] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<-1 | 1>(-1);
  const [compactDeck, setCompactDeck] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const onChange = () => setCompactDeck(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

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
    setSwipeDirection(direction === 1 ? -1 : 1);
    setActiveTab((index) => Math.max(0, Math.min(profileTabs.length - 1, index + direction)));
  };

  const swipeToNext = (direction: -1 | 1) => {
    if (activeTab >= profileTabs.length - 1) return;
    setSwipeDirection(direction);
    setActiveTab((index) => Math.min(profileTabs.length - 1, index + 1));
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
                  <span>KOLEKSI KARTU <span aria-hidden="true">·</span> SWIPE KIRI / KANAN</span>
                  <div className="cinematic-hero__card-arrows">
                    <span className="cinematic-hero__card-position">{String(activeTab + 1).padStart(2, '0')} / 07</span>
                    <button type="button" aria-label="Kartu sebelumnya" disabled={activeTab === 0} onClick={() => navigateCards(-1)}>←</button>
                    <button type="button" aria-label="Kartu berikutnya" disabled={activeTab === profileTabs.length - 1} onClick={() => navigateCards(1)}>→</button>
                  </div>
                </div>
                <div
                  className="cinematic-hero__card-viewport"
                  aria-label="Tumpukan kartu profil, geser ke kiri atau kanan"
                  onWheel={handleCardWheel}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') { event.preventDefault(); navigateCards(1); }
                    if (event.key === 'ArrowLeft') { event.preventDefault(); navigateCards(-1); }
                  }}
                >
                  <div className="cinematic-hero__card-track" aria-live="polite">
                    <AnimatePresence initial={false} mode="sync" custom={{ direction: swipeDirection, compact: compactDeck }}>
                      {profileTabs.slice(activeTab, activeTab + 4).map((item, relativeIndex) => {
                        const index = activeTab + relativeIndex;
                        return (
                          <SwipeProfileCard
                            key={item.label}
                            item={item}
                            index={index}
                            offset={relativeIndex}
                            compact={compactDeck}
                            reducedMotion={!!reducedMotion}
                            onSwipe={swipeToNext}
                            onSelect={(selected) => { setSwipeDirection(-1); setActiveTab(selected); }}
                          />
                        );
                      })}
                    </AnimatePresence>
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
