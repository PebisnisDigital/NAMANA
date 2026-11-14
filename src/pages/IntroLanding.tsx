import { useRef, useState } from "react";
import { NaminaLogo } from "../components/NaminaLogo";
import "../intro-landing.css";

/**
 * The public homepage is a cinematic NAMINA logo intro, not the old
 * marketing landing page. Audio is enabled by the visitor's own gesture.
 */
const INTRO_VIDEO =
  "https://www.dropbox.com/scl/fi/r0pk04lqyqgxvlyq6r2wp/Namina_logo_reveal_animation_9149f6a7_1080p.mp4?rlkey=oegcrx65yg2fjmi4xfpt98xf0&raw=1";

type IntroState = "idle" | "loading" | "playing" | "failed";

export function IntroLanding() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<IntroState>("idle");

  function startIntro() {
    const video = videoRef.current;
    if (!video) return;

    // Run play() inside the click handler, while audio permission is active.
    // Do not use autoplay or a delayed effect, which can mute playback on mobile.
    if (state === "failed") video.load();
    video.muted = false;
    video.volume = 1;
    video.currentTime = 0;
    setState("loading");
    void video.play().catch(() => setState("failed"));
  }

  return (
    <main className="namina-entry" aria-label="Intro NAMINA">
      <video
        ref={videoRef}
        className={`namina-entry__video ${state === "playing" ? "namina-entry__video--visible" : ""}`}
        src={INTRO_VIDEO}
        preload="none"
        playsInline
        disablePictureInPicture
        aria-label="Video intro animasi logo NAMINA"
        onPlaying={() => setState("playing")}
        onError={() => setState((current) => current === "idle" ? current : "failed")}
      />

      {state === "idle" && (
        <button className="namina-entry__button" type="button" onClick={startIntro}>
          BUKA NAMINA
        </button>
      )}

      {state === "loading" && (
        <div className="namina-entry__loading" role="status" aria-live="polite">
          <span className="namina-entry__spinner" aria-hidden="true" />
          <span>MEMBUKA NAMINA</span>
        </div>
      )}

      {state === "failed" && (
        <div className="namina-entry__failure" role="alert">
          <NaminaLogo variant="hero" />
          <p>Video intro belum dapat diputar.</p>
          <button className="namina-entry__button" type="button" onClick={startIntro}>
            COBA LAGI
          </button>
        </div>
      )}
    </main>
  );
}
