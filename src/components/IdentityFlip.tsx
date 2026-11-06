import { useEffect, useRef, useState } from 'react';
import '../identity-flip.css';

type Phase = 'welcome' | 'loading' | 'hero';

const profileFields = [
  'Nama',
  'Tempat, Tanggal Lahir',
  'Alamat',
  'Agama',
  'Status',
  'Pekerjaan',
];

export function IdentityFlip() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomeButton = useRef<HTMLButtonElement>(null);
  const heroHeading = useRef<HTMLHeadingElement>(null);

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
    focusTimer.current = setTimeout(() => welcomeButton.current?.focus(), 80);
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
            <div className="cinematic-hero__intro">
              <span className="cinematic-kicker"><i aria-hidden="true" /> IDENTITAS DIGITAL</span>
              <h2 ref={heroHeading} tabIndex={-1}>KENAL <span>LEBIH DEKAT.</span></h2>
              <p>Di balik setiap nama, ada perjalanan yang layak dikenal.</p>
            </div>

            <div className="cinematic-hero__profile">
              <h3>PROFIL SINGKAT</h3>
              <dl className="cinematic-hero__fields">
                {profileFields.map((field) => (
                  <div className="cinematic-hero__field" key={field}>
                    <dt>{field}</dt>
                    <dd>—</dd>
                  </div>
                ))}
              </dl>
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
