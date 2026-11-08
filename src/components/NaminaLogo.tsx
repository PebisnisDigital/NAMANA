import "./NaminaLogo.css";

type NaminaLogoProps = {
  variant: "compact" | "hero";
};

/** The owner's red N mark, rebuilt as a scalable shape for the welcome screen. */
export function NaminaLogo({ variant }: NaminaLogoProps) {
  return (
    <span className={`namina-logo namina-logo--${variant}`} role="img" aria-label="NAMINA">
      <svg
        className="namina-logo__symbol"
        viewBox="0 0 212 212"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="212" height="212" rx="23" fill="#AD151A" />
        <path
          d="M48 212V57c0-24 27-30 41-10l47 70V0h27v159c0 25-24 33-38 13L75 91v121Z"
          fill="#FFFFFF"
        />
      </svg>
      <span className="namina-logo__name" aria-hidden="true">
        NAMINA
      </span>
    </span>
  );
}

export function NaminaLiquidLoader({ startedAt, onSoundRequest }: { startedAt?: number; onSoundRequest?: () => void }) {
  const elapsedMs = startedAt ? Math.min(Math.max(Date.now() - startedAt, 0), 5000) : 0;

  const mark = (
    <span className={`namina-liquid-loader ${startedAt ? "namina-liquid-loader--active" : "namina-liquid-loader--waiting"}`} aria-hidden="true">
      <span className="namina-liquid-loader__base">
        <NaminaLogo variant="hero" />
      </span>
      <span key={startedAt} className="namina-liquid-loader__fill" style={{ animationDelay: `-${elapsedMs}ms` }}>
        <NaminaLogo variant="hero" />
      </span>
    </span>
  );

  return onSoundRequest ? (
    <button
      className="namina-liquid-loader__sound-trigger"
      type="button"
      onClick={onSoundRequest}
      aria-label="Putar intro NAMINA dengan suara"
      title="Ketuk logo untuk mengaktifkan suara"
    >
      {mark}
    </button>
  ) : mark;
}

export function NaminaIntroStage({ startedAt, onSoundRequest }: { startedAt?: number; onSoundRequest?: () => void }) {
  return (
    <div className="namina-intro-stage">
      <h1 className="namina-intro-stage__heading">
        <NaminaLiquidLoader startedAt={startedAt} onSoundRequest={onSoundRequest} />
        <span className="cinematic-welcome__sr-only">NAMINA</span>
      </h1>
      {!startedAt && onSoundRequest && <p className="namina-intro-stage__invite">KETUK LOGO UNTUK MULAI</p>}
    </div>
  );
}
