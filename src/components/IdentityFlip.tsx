import { useEffect, useRef, useState, type WheelEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import '../identity-flip.css';

type Phase = 'welcome' | 'hero';
type ShuffleStage = 'rest' | 'fan' | 'close' | 'tuck';

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

function cardPosition(offset: number, compact: boolean, fanned = false) {
  const depth = Math.max(0, offset);
  if (depth === 0) {
    return {
      x: 0, y: 0, z: fanned ? 110 : 88,
      rotateX: fanned ? -4 : -1, rotateY: fanned ? -7 : 0, rotateZ: fanned ? -2 : 0,
      scale: 1, opacity: 1,
    };
  }

  return {
    // Fan outward in actual 3D space, then return to a readable, physical stack.
    x: depth * (compact ? 7 : 120) + (fanned ? depth * (compact ? 8 : 20) : 0),
    y: depth * (compact ? 61 : 5) + (fanned ? depth * (compact ? 16 : -11) : 0),
    z: -depth * (compact ? 5 : 15) + (fanned ? depth * 18 : 0),
    rotateX: depth * (fanned ? 3.5 : .7),
    rotateY: -depth * (fanned ? 9 : 3),
    rotateZ: depth * (fanned ? (compact ? 2.4 : -2.8) : .4),
    scale: 1 - depth * (fanned ? .006 : .012),
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
  exit: ({ direction, compact, shuffle }: { direction: -1 | 1; compact: boolean; shuffle: boolean }) => shuffle
    ? {
        // The top card travels around the side and drops behind the deck.
        x: [0, compact ? 72 : 230, compact ? 7 : 100],
        y: [0, compact ? -25 : -64, compact ? 58 : 24],
        z: [88, 260, -130],
        rotateX: [-1, -10, 4],
        rotateY: [0, -25, -12],
        rotateZ: [0, 12, -4],
        scale: [1, 1.04, .91],
        opacity: [1, 1, 0],
        zIndex: 70,
        transition: { duration: 1.15, times: [0, .53, 1], ease: 'easeInOut' as const },
      }
    : {
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
      },
};

type ProfileCard = (typeof profileTabs)[number];

function SwipeProfileCard({
  item, index, offset, compact, shuffleStage, onSwipe, onSelect,
}: {
  item: ProfileCard;
  index: number;
  offset: number;
  compact: boolean;
  shuffleStage: ShuffleStage;
  onSwipe: (direction: -1 | 1) => void;
  onSelect: (index: number) => void;
}) {
  const active = offset === 0;
  const dragX = useMotionValue(0);
  const dragTilt = useTransform(dragX, [-280, 0, 280], [-21, 0, 21]);
  const leftStamp = useTransform(dragX, [-150, -42, 0], [1, 0, 0]);
  const rightStamp = useTransform(dragX, [0, 42, 150], [0, 0, 1]);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <motion.article
      className={`cinematic-hero__card${active ? ' cinematic-hero__card--active' : ' cinematic-hero__card--next'}`}
      initial={cardPosition(Math.max(offset, 1), compact)}
      animate={cardPosition(offset, compact, shuffleStage === 'fan')}
      exit="exit"
      variants={CARD_EXIT}
      transition={CARD_SPRING}
      style={{ zIndex: 12 - offset, pointerEvents: active || offset < 3 ? 'auto' : 'none' }}
      aria-label={`Kartu ${item.label}, ${index + 1} dari ${totalCards}`}
    >
      <motion.div
        className="cinematic-hero__card-swipe"
        drag={active ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={.95}
        dragMomentum={false}
        style={{ x: dragX, rotateZ: dragTilt, touchAction: 'pan-y' }}
        whileDrag={{ scale: 1.025, cursor: 'grabbing' }}
        onPointerDown={(event) => {
          if (active) pointerStart.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = pointerStart.current;
          pointerStart.current = null;
          if (!active || !start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) >= 90 && Math.abs(dx) > Math.abs(dy) * 1.15) onSwipe(dx > 0 ? 1 : -1);
        }}
        onPointerCancel={() => { pointerStart.current = null; }}
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
  const heroHeading = useRef<HTMLHeadingElement>(null);
  const lastWheelAt = useRef(0);
  const [activeTab, setActiveTab] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<-1 | 1>(-1);
  const [compactDeck, setCompactDeck] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches);
  const [shuffleStage, setShuffleStage] = useState<ShuffleStage>('rest');
  const [deckEngaged, setDeckEngaged] = useState(false);
  const [manualEpoch, setManualEpoch] = useState(0);

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
    const video = videoRef.current;
    if (!video) return;

    // Keep the background silent and inline so mobile browsers permit autoplay.
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;

    const resumeVideo = () => {
      if (document.visibilityState !== 'visible') return;
      void video.play().catch(() => {
        // Browser-level autoplay restrictions cannot be overridden by the page.
      });
    };

    resumeVideo();
    video.addEventListener('canplay', resumeVideo);
    window.addEventListener('pageshow', resumeVideo);
    document.addEventListener('visibilitychange', resumeVideo);
    return () => {
      video.removeEventListener('canplay', resumeVideo);
      window.removeEventListener('pageshow', resumeVideo);
      document.removeEventListener('visibilitychange', resumeVideo);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'hero' || deckEngaged) {
      setShuffleStage('rest');
      return;
    }

    const timers: number[] = [];
    const after = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay));
    };
    const shuffle = () => {
      setShuffleStage('fan');
      after(() => setShuffleStage('close'), 850);
      after(() => {
        setShuffleStage('tuck');
        setSwipeDirection(-1);
        setActiveTab((current) => (current + 1) % totalCards);
      }, 1650);
      after(() => {
        setShuffleStage('rest');
        after(shuffle, 4400);
      }, 2900);
    };

    // The idle loop gives each chapter reading time; interaction cancels every step.
    after(shuffle, manualEpoch === 0 ? 2300 : 6200);
    return () => timers.forEach(window.clearTimeout);
  }, [phase, deckEngaged, manualEpoch]);

  const enterExperience = () => {
    if (phase !== 'welcome') return;
    setPhase('hero');
  };

  const interruptShuffle = () => {
    setShuffleStage('rest');
    setManualEpoch((current) => current + 1);
  };

  const navigateCards = (direction: -1 | 1) => {
    interruptShuffle();
    setSwipeDirection(direction === 1 ? -1 : 1);
    setActiveTab((index) => (index + direction + totalCards) % totalCards);
  };

  const swipeCard = (direction: -1 | 1) => {
    interruptShuffle();
    setSwipeDirection(direction);
    setActiveTab((index) => (index + (direction === -1 ? 1 : -1) + totalCards) % totalCards);
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
          <video ref={videoRef} className="cinematic-hero__video" autoPlay muted loop playsInline preload="auto" width={1280} height={720} aria-hidden="true">
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
          <div className="cinematic-hero__shade" aria-hidden="true" />
          <div className="cinematic-hero__grain" aria-hidden="true" />

          <header className="cinematic-hero__nav">
            <span className="cinematic-brand">PESONA<span>FLIX</span></span>
          </header>

          <div className="cinematic-hero__content">
            <div className="cinematic-hero__identity">
              <span className="cinematic-kicker">Hello, kenalain saya</span>
              <h1 ref={heroHeading} tabIndex={-1}>
                <span className="cinematic-hero__stamp cinematic-hero__stamp--name">TEH VINI</span>
                <span className="cinematic-hero__stamp cinematic-hero__stamp--role">AI ENTHUSIAST</span>
              </h1>
            </div>

            <div className="cinematic-hero__details">
              <div className="cinematic-hero__panel" aria-label="Koleksi kartu profil 3D">
                <div
                  className="cinematic-hero__card-viewport"
                  aria-label="Tumpukan kartu profil, geser ke kiri atau kanan"
                    role="group"
                    tabIndex={0}
                  onWheel={handleCardWheel}
                  onPointerDownCapture={() => setDeckEngaged(true)}
                  onPointerUpCapture={() => setDeckEngaged(false)}
                  onPointerCancelCapture={() => setDeckEngaged(false)}
                  onFocusCapture={() => setDeckEngaged(true)}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setDeckEngaged(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') { event.preventDefault(); navigateCards(1); }
                    if (event.key === 'ArrowLeft') { event.preventDefault(); navigateCards(-1); }
                  }}
                >
                  <div className="cinematic-hero__card-track">
                    <AnimatePresence initial={false} mode="sync" custom={{ direction: swipeDirection, compact: compactDeck, shuffle: shuffleStage === 'tuck' }}>
                      {Array.from({ length: compactDeck ? 2 : 3 }, (_, relativeIndex) => {
                        const index = (activeTab + relativeIndex) % totalCards;
                        const item = profileTabs[index];
                        return (
                          <SwipeProfileCard
                            key={item.label}
                            item={item}
                            index={index}
                            offset={relativeIndex}
                            compact={compactDeck}
                            shuffleStage={shuffleStage}
                            onSwipe={swipeCard}
                            onSelect={(selected) => { interruptShuffle(); setSwipeDirection(-1); setActiveTab(selected); }}
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

        </section>
      )}
    </main>
  );
}
