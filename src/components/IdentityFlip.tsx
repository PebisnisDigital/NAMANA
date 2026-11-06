import { useEffect, useRef, useState, type WheelEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import '../identity-flip.css';

type Phase = 'welcome' | 'hero';
type ShuffleStage = 'rest' | 'fan' | 'close' | 'tuck';
type ProfileIcon = 'person' | 'pin' | 'home' | 'book' | 'image' | 'palette' | 'compass' | 'chat' | 'screens' | 'building' | 'flag' | 'mentor' | 'website' | 'pencil' | 'class' | 'certificate';
type ProfileField = { label: string; value: string; icon: ProfileIcon };
type ProfileCard = { label: string; fields: ProfileField[]; note?: string };

type SocialAccount = {
  label: string;
  icon: string;
  url?: string;
};

// Add verified profile URLs here. Unconfigured accounts stay non-interactive.
const socialAccounts: SocialAccount[] = [
  { label: 'WhatsApp', icon: 'whatsapp' },
  { label: 'Telegram', icon: 'telegram' },
  { label: 'Threads', icon: 'threads' },
  { label: 'Instagram', icon: 'instagram' },
  { label: 'YouTube', icon: 'youtube' },
  { label: 'TikTok', icon: 'tiktok' },
];

const profileTabs: ProfileCard[] = [
  {
    label: 'Identitas',
    fields: [
      { label: 'Nama', value: 'Teh Vini', icon: 'person' },
      { label: 'Domisili', value: 'Bandung', icon: 'pin' },
      { label: 'Aktivitas', value: 'Ibu rumah tangga', icon: 'home' },
    ],
  },
  {
    label: 'Pendidikan',
    fields: [
      { label: 'Jalur belajar', value: 'Eksplorasi mandiri', icon: 'book' },
      { label: 'Fokus', value: 'Prompt gambar AI', icon: 'image' },
    ],
    note: 'Riwayat pendidikan formal belum dibagikan.',
  },
  {
    label: 'Hobi',
    fields: [
      { label: 'Kreasi', value: 'Gambar AI', icon: 'palette' },
      { label: 'Eksplorasi', value: 'Prompt visual', icon: 'image' },
      { label: 'Inspirasi', value: 'Threads', icon: 'compass' },
    ],
  },
  {
    label: 'Skill',
    fields: [
      { label: 'Marketing', value: 'WhatsApp marketing', icon: 'chat' },
      { label: 'Digital', value: 'Konten & produk digital', icon: 'screens' },
      { label: 'AI', value: 'Prompt gambar', icon: 'image' },
    ],
  },
  {
    label: 'Pengalaman',
    fields: [
      { label: 'CEO', value: 'Cuanify ID', icon: 'building' },
      { label: 'Founder', value: 'Pebisnis.Digital', icon: 'flag' },
      { label: 'Mentor', value: 'WhatsApp marketing', icon: 'mentor' },
    ],
  },
  {
    label: 'Karya',
    fields: [
      { label: 'Website', value: 'PESONAFLIX', icon: 'website' },
      { label: 'Proyek prompt', value: 'Promptional (prototipe)', icon: 'pencil' },
      { label: 'Kelas', value: 'KULWA', icon: 'class' },
    ],
  },
  {
    label: 'Sertifikasi',
    fields: [],
    note: 'Belum ada informasi sertifikasi yang dibagikan.',
  },
  {
    label: 'Sosial Media',
    fields: [],
  },
];

const totalCards = profileTabs.length;

function ProfileGlyph({ name }: { name: ProfileIcon }) {
  const symbols = {
    person: <><circle cx="16" cy="10" r="4.5" /><path d="M6.5 26v-2.5c0-5 4-8 9.5-8s9.5 3 9.5 8V26" /></>,
    pin: <><path d="M25 13c0 7-9 14-9 14S7 20 7 13a9 9 0 1 1 18 0Z" /><circle cx="16" cy="13" r="3" /></>,
    home: <><path d="m4 14 12-9 12 9M7 13v14h18V13" /><path d="M13 27v-9h6v9" /></>,
    book: <><path d="M16 27c-3-2-7-2.5-12-2V6c5-.5 9 0 12 2 3-2 7-2.5 12-2v18.5c-5-.5-9 0-12 2.5Z" /><path d="M16 8v19M8 12h4M20 12h4" /></>,
    image: <><rect x="4" y="6" width="24" height="20" rx="2" /><circle cx="11" cy="12" r="2" /><path d="m5 23 7-7 5 5 4-4 6 6" /></>,
    palette: <><path d="M16 4C9 4 4 9 4 16s5 12 12 12c2.5 0 4-2 3-4-.5-1.5 0-3 2-3h2c3 0 5-2.5 5-5C28 9 22 4 16 4Z" /><circle cx="10" cy="14" r="1.4" /><circle cx="15" cy="9" r="1.4" /><circle cx="21" cy="12" r="1.4" /><circle cx="10.5" cy="20" r="1.4" /></>,
    compass: <><circle cx="16" cy="16" r="11" /><path d="m20 12-3 7-5 1 3-7 5-1Z" /><path d="M16 3v2M16 27v2M3 16h2M27 16h2" /></>,
    chat: <><path d="M6 7h20v15H13l-7 5V7Z" /><path d="M10 13h12M10 17h8" /></>,
    screens: <><rect x="3" y="6" width="19" height="16" rx="2" /><path d="M7 26h13M12.5 22v4" /><rect x="23" y="13" width="6" height="14" rx="1.5" /></>,
    building: <><path d="M7 27V5h15v22M22 13h4v14M4 27h24" /><path d="M11 10h2M17 10h2M11 15h2M17 15h2M11 20h2M17 20h2" /></>,
    flag: <><path d="M7 28V5M7 6c4-3 7 3 11 0s6 0 8 1v13c-4-2-6-4-10-1s-6-2-9 0" /></>,
    mentor: <><circle cx="12" cy="10" r="4" /><path d="M4 26v-3c0-4 3-7 8-7s8 3 8 7v3" /><path d="M22 6h6v9h-6l-3 3V9c0-2 1-3 3-3Z" /></>,
    website: <><rect x="3" y="6" width="26" height="20" rx="2" /><path d="M3 12h26M7 9h.5M11 9h.5M8 18h8M8 22h13" /></>,
    pencil: <><path d="M7 4h14l4 4v18H7V4Z" /><path d="M20 4v5h5M11 14h9M11 18h7M11 22h4" /><path d="m18 25 8-8 2 2-8 8-4 1 2-3Z" /></>,
    class: <><rect x="4" y="5" width="24" height="18" rx="2" /><path d="m14 10 7 4-7 4v-8ZM10 27h12M16 23v4" /></>,
    certificate: <><rect x="6" y="4" width="20" height="19" rx="2" /><path d="M10 9h12M10 13h9M10 17h6" /><circle cx="22" cy="22" r="5" /><path d="m19 26-1 4 4-2 4 2-1-4" /></>,
  };

  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{symbols[name]}</svg>;
}

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
      className={`cinematic-hero__card${active ? ' cinematic-hero__card--active' : ' cinematic-hero__card--next'}${item.label === 'Sosial Media' ? ' cinematic-hero__card--social' : ''}`}
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
          </div>
        ) : (
          <button type="button" className="cinematic-hero__card-trigger" aria-label={`Buka kartu ${item.label}`} onClick={() => onSelect(index)}>
            <span className="cinematic-hero__card-eyebrow">PESONAFLIX</span>
            <span className="cinematic-hero__card-chip" aria-hidden="true" />
            <strong>{item.label}</strong>
          </button>
        )}
        {active && (
          <div className="cinematic-hero__card-body">
            {item.label === 'Sosial Media' ? (
              <div className="cinematic-hero__social">
                <ul className="cinematic-hero__social-grid" aria-label="Daftar platform sosial media">
                  {socialAccounts.map(({ label, icon, url }) => (
                    <li key={label}>
                      {url ? (
                        <a
                          className="cinematic-hero__social-platform cinematic-hero__social-platform--linked"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Buka akun ${label} Teh Vini`}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <span className={`cinematic-hero__social-icon cinematic-hero__social-icon--${icon}`} aria-hidden="true" />
                          <span>{label}</span>
                        </a>
                      ) : (
                        <span className="cinematic-hero__social-platform cinematic-hero__social-platform--pending" title="Tautan akun belum tersedia">
                          <span className={`cinematic-hero__social-icon cinematic-hero__social-icon--${icon}`} aria-hidden="true" />
                          <span>{label}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {socialAccounts.some(({ url }) => !url) && <p className="cinematic-hero__social-note">Tautan akun belum ditambahkan.</p>}
              </div>
            ) : (
              <div className={`cinematic-hero__profile${item.fields.length === 0 ? ' cinematic-hero__profile--empty' : ''}`}>
                {item.fields.length > 0 && (
                  <dl className={`cinematic-hero__icon-grid${item.fields.length === 2 ? ' cinematic-hero__icon-grid--two' : ''}`}>
                    {item.fields.map((field, fieldIndex) => (
                      <div className="cinematic-hero__icon-tile" key={field.label} style={{ animationDelay: `${fieldIndex * 90}ms` }}>
                        <span className="cinematic-hero__icon-medallion" aria-hidden="true"><ProfileGlyph name={field.icon} /></span>
                        <dt>{field.label}</dt>
                        <dd>{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {item.fields.length === 0 && item.note ? (
                  <div className="cinematic-hero__icon-grid cinematic-hero__icon-grid--empty">
                    <div className="cinematic-hero__icon-tile">
                      <span className="cinematic-hero__icon-medallion" aria-hidden="true"><ProfileGlyph name="certificate" /></span>
                      <p className="cinematic-hero__profile-note">{item.note}</p>
                    </div>
                  </div>
                ) : item.note ? <p className="cinematic-hero__profile-note">{item.note}</p> : null}
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
            <p>Kenali Teh Vini lewat delapan kartu profil yang bisa digeser.</p>
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
