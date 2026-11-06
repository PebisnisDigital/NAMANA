import { useEffect, useRef, useState } from 'react';
import { HeroSection } from './HeroSection';
import '../identity-flip.css';

type Phase = 'front' | 'loading' | 'back';

export function IdentityFlip() {
  const [phase, setPhase] = useState<Phase>('front');
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      if (focusTimer.current) clearTimeout(focusTimer.current);
    };
  }, []);

  const openIdentity = () => {
    if (phase !== 'front') return;

    setPhase('loading');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    loadingTimer.current = setTimeout(() => {
      setPhase('back');
      focusTimer.current = setTimeout(() => returnButton.current?.focus(), reduceMotion ? 0 : 1450);
    }, reduceMotion ? 350 : 1450);
  };

  const returnToCard = () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    if (focusTimer.current) clearTimeout(focusTimer.current);
    setPhase('front');
  };

  return (
    <main className={`identity-experience identity-experience--${phase}`}>
      <div className="identity-flip-stage">
        <div className="identity-flip-pages">
          <div className="identity-face identity-face--front" inert={phase === 'back'}>
            <div className="identity-front-glow" aria-hidden="true" />
            <div className="identity-front-content">
              <p className="identity-eyebrow">PESONAFLIX ORIGINAL EXPERIENCE <span>·</span> 001 / DIGITAL ID</p>

              <button type="button" className="identity-card" onClick={openIdentity} aria-label="Balik kartu identitas digital dan masuk ke halaman Cinematic Portfolio">
                <span className="identity-card__heading">
                  <span className="identity-card__eyebrow">KARTU IDENTITAS DIGITAL</span>
                  <strong>PESONAFLIX</strong>
                  <span className="identity-card__subhead">REPUBLIK KREATIF INDONESIA</span>
                </span>
                <span className="identity-card__rule" aria-hidden="true" />
                <span className="identity-card__edition">CREATIVE ID <b>PF — 2026</b></span>
                <span className="identity-card__bottom">
                  <span>BUKAN DOKUMEN RESMI</span>
                  <span>KLIK UNTUK BALIK ↗</span>
                </span>
                <span className="identity-card__glint" aria-hidden="true" />
              </button>

              <div className="identity-front-actions">
                <div className="identity-front-copy">
                  <span className="identity-front-copy__dash" aria-hidden="true" />
                  <p>Satu kartu. Dua sisi. Satu cerita digital.</p>
                  <span>Sentuh kartu untuk membuka dunia di baliknya.</span>
                </div>
                <button type="button" className="identity-enter" onClick={openIdentity}>
                  <span>MASUK</span>
                  <span className="identity-enter__arrow" aria-hidden="true">↗</span>
                </button>
              </div>
              <p className="identity-demo-note">KONSEP IDENTITAS DIGITAL — BUKAN KTP ATAU DOKUMEN PEMERINTAH</p>
            </div>
            <div className="identity-front-corner identity-front-corner--left" aria-hidden="true" />
            <div className="identity-front-corner identity-front-corner--right" aria-hidden="true" />
          </div>

          <div className="identity-face identity-face--back" inert={phase !== 'back'}>
            <HeroSection />
            <button ref={returnButton} className="identity-return" type="button" onClick={returnToCard}>
              <span aria-hidden="true">↶</span> BALIK KE KARTU
            </button>
          </div>
        </div>
      </div>

      {phase === 'loading' && (
        <div className="identity-loader" role="status" aria-live="polite" aria-label="Menyiapkan tampilan cinematic">
          <div className="identity-loader__content">
            <span className="identity-loader__badge">PF / DIGITAL EXPERIENCE</span>
            <div className="identity-loader__name">PESONA<span>FLIX</span></div>
            <p>MEMBUKA CERITA DI BALIK KARTU</p>
            <div className="identity-loader__bar"><span /></div>
            <span className="identity-loader__caption">PLEASE WAIT · THE STORY IS LOADING</span>
          </div>
        </div>
      )}
    </main>
  );
}
