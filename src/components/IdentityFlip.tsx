import { useEffect, useRef, useState, type WheelEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import '../identity-flip.css';

type Phase = 'welcome' | 'hero';

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

// Only confirmed facts are populated in this prototype. The remaining cards
// deliberately show an honest empty state until the owner supplies their data.
const confirmedProfile: Record<string, string> = {
  Nama: 'Teh Vini',
  Pekerjaan: 'AI Enthusiast',
};

const totalCards = profileTabs.length;

function cardPosition(offset: number, compact: boolean) {
  const depth = Math.max(0, offset);
  if (depth === 0) {
    return {
      x: 0, y: 0, z: 88,
      rotateX: -1, rotateY: 0, rotateZ: 0,
      scale: 1, opacity: 1,
    };
  }

  return {
    // Leave a genuine, selectable edge on each physical card. The former
    // offset and scale cancelled each other out, hiding the entire stack.
    x: depth * (compact ? 43 : 66),
    y: depth * (compact ? 13 : 6),
    z: -depth * (compact ? 66 : 90),
    rotateX: depth * .7,
    rotateY: -depth * 3,
    rotateZ: depth * .4,
    scale: 1 - depth * (compact ? .015 : .028),
    opacity: 1 - depth * .12,
  };
}

const CARD_SPRING = {
  type: 'spring' as const,
  stiffness: 190,
  damping: 27,
  mass: 1.08,
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
      aria-label={`Kartu ${item.label}, ${index + 1} dari ${totalCards}`}
    >
      <motion.div
        className="cinematic-hero__card-swipe"
        drag={active && !reducedMotion ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={.95}
        dragMomentum={false}
        style={{ x: dragX, rotateZ: dragTilt, touchAction: 'pan-y' }}
        whileDrag={{ scale: 1.025, cursor: 'grabbing' }}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) < 100 && Math.abs(info.velocity.x) < 600) return;
          onSwipe(info.offset.x > 0 || (info.offset.x === 0 && info.velocity.x > 0) ? 1 : -1);
        }}
      >
        {active && (
          <>
            <motion.span className="cinematic-hero__swipe-stamp cinematic-hero__swipe-stamp--left" style={{ opacity: leftStamp }} aria-hidden="true">BERIKUTNYA</motion.span>
            <motion.span className="cinematic-hero__swipe-stamp cinematic-hero__swipe-stamp--right" style={{ opacity: rightStamp }} aria-hidden="true">SEBELUMNYA</motion.span>
          </>
        )}
        {active ? (
          <div className="cinematic-hero__card-trigger cinematic-hero__card-trigger--static">
            <span className="cinematic-hero__card-eyebrow">PESONAFLIX</span>
            <span className="cinematic-hero__card-chip" aria-hidden="true" />
            <strong>{item.label}</strong>
            <span className="cinematic-hero__card-open" aria-hidden="true">{String(index + 1).padStart(2, '0')} / {String(totalCards).padStart(2, '0')}</span>
          </div>
        ) : (
          <button type="button" className="cinematic-hero__card-trigger" aria-label={`Buka kartu ${item.label}`} onClick={() => onSelect(index)}>
            <span className="cinematic-hero__card-eyebrow">PESONAFLIX</span>
            <span className="cinematic-hero__card-chip" aria-hidden="true" />
            <strong>{item.label}</strong>
            <span className="cinematic-hero__card-open" aria-hidden="true">{String(index + 1).padStart(2, '0')} / {String(totalCards).padStart(2, '0')}</span>
          </button>
        )}
        {active && (
          <div className="cinematic-hero__card-body">
            {index === 0 ? (
              <>
                <dl className="cinematic-hero__fields">
                  {item.fields.filter((field) => confirmedProfile[field]).map((field) => (
                    <div className="cinematic-hero__field" key={field}>
                      <dt>{field}</dt>
                      <dd>{confirmedProfile[field]}</dd>
                    </div>
                  ))}
                </dl>
                <p className="cinematic-hero__empty-note">Detail identitas lainnya belum tersedia.</p>
              </>
            ) : (
              <div className="cinematic-hero__empty">
                <p>Data {item.label.toLowerCase()} belum diisi.</p>
                <span>{item.fields.slice(0, 3).join(' · ')} dan lainnya</span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.article>
  );
}

export function IdentityFlip() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(true);
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
    videoRef.current?.pause();
  }, []);

  useEffect(() => {
    if (phase !== 'hero') return;
    heroHeading.current?.focus({ preventScroll: true });
    if (reducedMotion) {
      videoRef.current?.pause();
      setVideoPlaying(false);
    }
  }, [phase, reducedMotion]);

  const enterExperience = () => {
    if (phase !== 'welcome') return;
    setPhase('hero');
  };

  const navigateCards = (direction: -1 | 1) => {
    setSwipeDirection(direction === 1 ? -1 : 1);
    setActiveTab((index) => (index + direction + totalCards) % totalCards);
  };

  const swipeCard = (direction: -1 | 1) => {
    setSwipeDirection(direction);
    setActiveTab((index) => (index + (direction === -1 ? 1 : -1) + totalCards) % totalCards);
  };

  const toggleVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); setVideoPlaying(true); }
      catch { setVideoPlaying(false); }
    } else {
      video.pause();
      setVideoPlaying(false);
    }
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
            <span className="cinematic-welcome__edition">PROFIL PERSONAL</span>
          </div>

          <div className="cinematic-welcome__content">
            <span className="cinematic-kicker"><i aria-hidden="true" /> SEBUAH CERITA DIMULAI</span>
            <h1 className="cinematic-welcome__title">
              <span>WELCOME</span>
              <small>TO</small>
              <strong>PESONAFLIX</strong>
            </h1>
            <p>Kenali Teh Vini lewat tujuh kartu profil yang bisa digeser.</p>
            <button
              type="button"
              className="cinematic-welcome__enter"
              onClick={enterExperience}
              disabled={phase === 'loading'}
            >
              <span>LIHAT PROFIL</span>
              <span className="cinematic-welcome__enter-arrow" aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="cinematic-welcome__footer"><span>TEH VINI</span><span>AI ENTHUSIAST</span></div>
        </section>
      )}

      {phase === 'hero' && (
        <section className="cinematic-hero" aria-label="Profil digital cinematic">
          <video ref={videoRef} className="cinematic-hero__video" autoPlay={!reducedMotion} muted loop playsInline preload="metadata" width={1280} height={720} aria-hidden="true">
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
                  <span>Geser kartu untuk mengenal lebih jauh</span>
                  <div className="cinematic-hero__card-arrows">
                    <span className="cinematic-hero__card-position">{String(activeTab + 1).padStart(2, '0')} / {String(totalCards).padStart(2, '0')}</span>
                    <button type="button" aria-label="Kartu sebelumnya" onClick={() => navigateCards(-1)}>←</button>
                    <button type="button" aria-label="Kartu berikutnya" onClick={() => navigateCards(1)}>→</button>
                  </div>
                </div>
                <div
                  className="cinematic-hero__card-viewport"
                  aria-label="Tumpukan kartu profil, geser ke kiri atau kanan"
                    role="group"
                    tabIndex={0}
                  onWheel={handleCardWheel}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') { event.preventDefault(); navigateCards(1); }
                    if (event.key === 'ArrowLeft') { event.preventDefault(); navigateCards(-1); }
                  }}
                >
                  <div className="cinematic-hero__card-track">
                    <AnimatePresence initial={false} mode="sync" custom={{ direction: swipeDirection, compact: compactDeck }}>
                      {Array.from({ length: compactDeck ? 2 : 4 }, (_, relativeIndex) => {
                        const index = (activeTab + relativeIndex) % totalCards;
                        const item = profileTabs[index];
                        return (
                          <SwipeProfileCard
                            key={item.label}
                            item={item}
                            index={index}
                            offset={relativeIndex}
                            compact={compactDeck}
                            reducedMotion={!!reducedMotion}
                            onSwipe={swipeCard}
                            onSelect={(selected) => { setSwipeDirection(-1); setActiveTab(selected); }}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
                <span className="cinematic-hero__sr-only" role="status" aria-live="polite">Kartu {profileTabs[activeTab].label}, {activeTab + 1} dari {totalCards}</span>
              </div>
            </div>
          </div>

          <footer className="cinematic-hero__footer" aria-label="Identitas pengalaman">
            <span>Profil Teh Vini</span>
            <button type="button" className="cinematic-hero__motion-toggle" onClick={toggleVideo}>{videoPlaying ? 'Jeda video latar' : 'Putar video latar'}</button>
          </footer>
        </section>
      )}
    </main>
  );
}
