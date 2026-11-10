import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AssetUrls, SiteContent } from "../domain/content";
import { buildViniSlides, type StorySection } from "../domain/viniSlides";
import { NaminaIntroStage, NaminaLogo } from "./NaminaLogo";
import "./ViniCinematic.css";

const WHATSAPP_URL =
  "https://wa.me/62881022445869?text=" +
  encodeURIComponent("Halo Teh Vini, saya melihat profil NAMINA dan ingin menghubungi Teteh.");

function getPageSize() {
  if (typeof window === "undefined") return 2;
  if (window.matchMedia("(max-width: 700px)").matches) return 1;
  return 2;
}

const highlights = [
  { icon: 8121267, label: "WhatsApp", detail: "Marketing" },
  { icon: 8121304, label: "Kreator", detail: "Digital" },
  { icon: 8121313, label: "Founder", detail: "Cuanify ID" },
];

export function ViniCinematic({
  content,
  assetUrls,
  introStartedAt,
}: {
  content: SiteContent;
  assetUrls: AssetUrls;
  introStartedAt?: number;
}) {
  const [pageSize, setPageSize] = useState(getPageSize);
  const [slideIndex, setSlideIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [pageVisible, setPageVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [usingFallbackVideo, setUsingFallbackVideo] = useState(false);
  const [introElapsed, setIntroElapsed] = useState(false);
  const [introTimedOut, setIntroTimedOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const slides = useMemo(() => buildViniSlides(content.cards, pageSize), [content.cards, pageSize]);
  const currentIndex = Math.min(slideIndex, Math.max(0, slides.length - 1));
  const current = slides[currentIndex];
  const mobileVideoId = content.background.mobileVideoAssetId;
  const desktopVideoId = content.background.desktopVideoAssetId;
  const videoSrc = assetUrls[
    (pageSize === 1 && mobileVideoId) || desktopVideoId || ""
  ];
  const activeVideoSrc = usingFallbackVideo ? "/videos/hero.mp4" : (videoSrc || "/videos/hero.mp4");
  const showLoader = !introElapsed || (!videoReady && !videoFailed && !introTimedOut);

  useEffect(() => {
    const updatePageSize = () => setPageSize(getPageSize());
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      setReducedMotion(preference.matches);
    };
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const started = introStartedAt || Date.now();
    const elapsed = Date.now() - started;
    const minimum = window.setTimeout(() => setIntroElapsed(true), Math.max(0, 1200 - elapsed));
    const fallback = window.setTimeout(() => setIntroTimedOut(true), Math.max(0, 8000 - elapsed));
    return () => {
      window.clearTimeout(minimum);
      window.clearTimeout(fallback);
    };
  }, [introStartedAt]);

  useEffect(() => {
    if (!pageVisible || slides.length < 2 || showLoader) return;
    const timeout = window.setTimeout(() => {
      setSlideIndex((index) => (index + 1) % slides.length);
    }, 4200);
    return () => window.clearTimeout(timeout);
  }, [pageVisible, slides.length, currentIndex, showLoader]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    if (!pageVisible) {
      video.pause();
    } else {
      void video.play().catch(() => {
        // Some browsers block playback even for muted inline video.
      });
    }
  }, [pageVisible, videoFailed, activeVideoSrc]);

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
    setUsingFallbackVideo(false);
  }, [videoSrc]);

  useEffect(() => {
    if (videoReady || videoFailed || usingFallbackVideo || !videoSrc) return;
    const timeout = window.setTimeout(() => setUsingFallbackVideo(true), 5500);
    return () => window.clearTimeout(timeout);
  }, [videoReady, videoFailed, usingFallbackVideo, videoSrc]);

  const goTo = useCallback((index: number) => {
    setSlideIndex((index + slides.length) % Math.max(1, slides.length));
    setMenuOpen(false);
  }, [slides.length]);

  const goToSection = useCallback((section: StorySection) => {
    const index = slides.findIndex((slide) => slide.section === section);
    if (index >= 0) goTo(index);
  }, [slides, goTo]);

  const retryVideo = () => {
    setVideoFailed(false);
    setVideoReady(false);
    const video = videoRef.current;
    if (!video) return;
    video.load();
    void video.play().catch(() => setVideoFailed(true));
  };

  const handleVideoError = () => {
    if (!usingFallbackVideo) {
      setUsingFallbackVideo(true);
      setVideoReady(false);
    } else {
      setVideoFailed(true);
    }
  };

  return (
    <main className={`vini-cinema${showLoader ? " vini-cinema--loading" : ""}${reducedMotion ? " vini-cinema--reduce-motion" : ""}`}>
      <div className="vini-cinema__stage" aria-hidden="true">
        {videoSrc && (
          <video
            ref={videoRef}
            className="vini-cinema__video"
            src={activeVideoSrc}
            width={1280}
            height={720}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setVideoReady(true)}
            onError={handleVideoError}
            style={{ objectPosition: `${content.background.focalX}% ${content.background.focalY}%` }}
          />
        )}
        <div className="vini-cinema__scrim" />
      </div>

      <div className="vini-cinema__layout" aria-hidden={showLoader} inert={showLoader}>
        <header className="vini-cinema__header">
          <button className="vini-cinema__brand" type="button" onClick={() => goTo(0)} aria-label="NAMINA, kembali ke cerita awal">
            <NaminaLogo variant="compact" />
            <span className="vini-cinema__brand-pro">.PRO</span>
          </button>
          <button
            className="vini-cinema__menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="vini-navigation"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? "Tutup" : "Menu"}
          </button>
          <nav id="vini-navigation" className={`vini-cinema__nav${menuOpen ? " vini-cinema__nav--open" : ""}`} aria-label="Navigasi cerita">
            <button type="button" className={currentIndex === 0 ? "is-active" : ""} onClick={() => goTo(0)}>Beranda</button>
            {(["profil", "keahlian", "karya", "kontak"] as const).map((section) => (
              slides.some((slide) => slide.section === section) && (
                <button
                  key={section}
                  type="button"
                  className={current?.section === section && currentIndex !== 0 ? "is-active" : ""}
                  onClick={() => goToSection(section)}
                >
                  {section === "profil" ? "Profil" : section === "keahlian" ? "Keahlian" : section === "karya" ? "Karya" : "Kontak"}
                </button>
              )
            ))}
          </nav>
          <a className="vini-cinema__contact-top" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Hubungi Saya</a>
        </header>

        <div className="vini-cinema__main">
          <div className="vini-cinema__intro">
            <span className="vini-cinema__hello">Halo, aku</span>
            <h1>{content.identity.displayName}<span>{content.identity.profession}</span></h1>
            <p>Ibu rumah tangga yang jatuh cinta pada AI, digital marketing, dan karya-karya kreatif.</p>
            <span className="vini-cinema__bio">{content.identity.bio}</span>
          </div>

          <section className="vini-cinema__story" aria-label="Slide cerita identitas Teh Vini" aria-roledescription="carousel">
            <div className="vini-cinema__story-heading">
              <span>{current?.label || "Cerita profil"}</span>
              <span className="vini-cinema__counter">{slides.length ? String(currentIndex + 1).padStart(2, "0") : "00"} / {String(slides.length).padStart(2, "0")}</span>
            </div>
            <div className="vini-cinema__story-stage" aria-live="off">
              <AnimatePresence mode="wait" initial={false}>
                {current ? (
                  <motion.div
                    key={`${current.section}-${currentIndex}-${pageSize}`}
                    className="vini-cinema__story-entries"
                    initial={reducedMotion ? false : { opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -28 }}
                    transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.22, 0.8, 0.2, 1] }}
                  >
                    {current.items.map((card) => (
                      <article className="vini-cinema__entry" key={card.id}>
                        <img
                          className="vini-cinema__entry-icon"
                          src={card.imageAssetId && assetUrls[card.imageAssetId] || `/animated-icons/${card.animatedIcon || 8121295}.webp`}
                          width={40}
                          height={40}
                          alt=""
                          decoding="async"
                        />
                        <div>
                          <h2>{card.subtitle || card.title}</h2>
                          {card.description && <p>{card.description}</p>}
                          {card.link && <a href={card.link} target="_blank" rel="noopener noreferrer">Buka {card.title}</a>}
                        </div>
                      </article>
                    ))}
                  </motion.div>
                ) : (
                  <div className="vini-cinema__story-empty" key="empty">Belum ada cerita yang dipublikasikan.</div>
                )}
              </AnimatePresence>
            </div>
            {slides.length > 0 && (
              <div className="vini-cinema__story-controls">
                <div className="vini-cinema__progress" aria-label="Pilih slide cerita">
                  {slides.map((slide, index) => (
                    <span
                      key={`${slide.section}-${index}`}
                      className={index === currentIndex ? "is-active" : ""}
                      aria-label={`Cerita ${index + 1}: ${slide.label}`}
                    ><span /></span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="vini-cinema__actions">
            <button type="button" onClick={() => goToSection("karya")}>Lihat Karyaku</button>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Hubungi Vini</a>
          </div>

          <div className="vini-cinema__highlights" aria-label="Bidang yang ditekuni">
            {highlights.map((item) => (
              <div key={item.label} className="vini-cinema__highlight">
                <img src={`/animated-icons/${item.icon}.webp`} width={34} height={34} alt="" decoding="async" />
                <span>{item.label}<strong>{item.detail}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {videoFailed && !showLoader && (
        <div className="vini-cinema__video-status" role="status">
          <span>Video belum bisa diputar.</span>
          <button type="button" onClick={retryVideo}>Coba lagi</button>
        </div>
      )}

      {showLoader && (
        <section className="vini-cinema__loading" aria-label="Menyiapkan profil NAMINA" role="status">
          <NaminaIntroStage startedAt={introStartedAt} />
          <span className="vini-cinema__loading-caption">Menyiapkan video profil.</span>
        </section>
      )}
    </main>
  );
}
