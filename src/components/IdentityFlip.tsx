import { useEffect, useRef, useState } from 'react';
import '../identity-flip.css';

type Phase = 'front' | 'loading' | 'back';

export function IdentityFlip() {
  const [phase, setPhase] = useState<Phase>('front');
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnButton = useRef<HTMLButtonElement>(null);

  useEffect(() => () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    if (focusTimer.current) clearTimeout(focusTimer.current);
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
      <div className="identity-front-glow" aria-hidden="true" />
      <div className="identity-front-corner identity-front-corner--left" aria-hidden="true" />
      <div className="identity-front-corner identity-front-corner--right" aria-hidden="true" />

      <div className="identity-front-content">
        <div className="identity-flip-stage">
          <div className="identity-flip-pages">
            <button
              type="button"
              className="identity-face identity-card identity-face--front"
              onClick={openIdentity}
              inert={phase === 'back'}
              tabIndex={phase === 'back' ? -1 : 0}
              aria-label="Balik kartu identitas digital untuk melihat sisi cinematic"
            >
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

            <button
              type="button"
              ref={returnButton}
              className="identity-face identity-face--back identity-cinematic-card"
              onClick={returnToCard}
              inert={phase !== 'back'}
              tabIndex={phase !== 'back' ? -1 : 0}
              aria-label="Balik kembali ke sisi depan kartu identitas digital"
            >
              <video className="identity-cinematic-card__video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
                <source src="/videos/hero.mp4" type="video/mp4" />
              </video>
              <span className="identity-cinematic-card__shade" aria-hidden="true" />
              <span className="identity-cinematic-card__details">
                <strong className="identity-cinematic-card__details-title">DATA PEMILIK KARTU</strong>
                <span className="identity-cinematic-card__fields">
                  {['Nama', 'Tempat, Tanggal Lahir', 'Alamat', 'Agama', 'Status', 'Pekerjaan'].map((field) => (
                    <span className="identity-cinematic-card__field" key={field}>
                      <span className="identity-cinematic-card__field-label">{field}</span>
                      <span className="identity-cinematic-card__field-value">—</span>
                    </span>
                  ))}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="identity-front-actions">
          <div className="identity-front-copy">
            <span className="identity-front-copy__dash" aria-hidden="true" />
            <p>{phase === 'back' ? 'Satu kartu. Dua karakter.' : 'Satu kartu. Dua sisi. Satu cerita digital.'}</p>
            <span>{phase === 'back' ? 'Hero cinematic ada di belakang, tetap seukuran kartu.' : 'Sentuh kartu untuk membuka dunia di baliknya.'}</span>
          </div>
          <button type="button" className="identity-enter" onClick={phase === 'back' ? returnToCard : openIdentity} disabled={phase === 'loading'}>
            <span>{phase === 'back' ? 'BALIK KARTU' : 'MASUK'}</span>
            <span className="identity-enter__arrow" aria-hidden="true">{phase === 'back' ? '↶' : '↗'}</span>
          </button>
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
