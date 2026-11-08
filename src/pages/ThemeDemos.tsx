import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties, type PointerEvent } from "react";
import { EnterKeycap, IdentityFlip } from "../components/IdentityFlip";
import { normalizeSite, resolveMedia, siteDocumentSchema, viniSeed, type SiteDocument } from "../static/sites";
import { demoCategories, demoThemes, type DemoTheme } from "../themes/catalog";
import "../theme-demos.css";

type DemoData =
  | { state: "loading" }
  | { state: "ready"; site: SiteDocument }
  | { state: "error" };

function useViniProfile(): DemoData {
  const [data, setData] = useState<DemoData>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/clients/vini.json", { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) return viniSeed;
        if (!response.ok) throw new Error("Data profil tidak bisa dimuat.");
        return siteDocumentSchema.parse(await response.json());
      })
      .then((site) => {
        if (!controller.signal.aborted) setData({ state: "ready", site: normalizeSite(site) });
      })
      .catch(() => {
        if (!controller.signal.aborted) setData({ state: "error" });
      });
    return () => controller.abort();
  }, []);

  return data;
}

function DemoStatus({ state }: { state: "loading" | "error" }) {
  return (
    <main className="demo-status" aria-live="polite">
      <a href="/gaya" className="demo-status__back">Kembali ke galeri</a>
      <h1>{state === "loading" ? "Menyiapkan cerita Teh Vini…" : "Profil belum bisa dibuka"}</h1>
      {state === "error" && (
        <>
          <p>Data demo gagal dimuat. Coba segarkan halaman.</p>
          <button type="button" onClick={() => location.reload()}>Muat ulang</button>
        </>
      )}
    </main>
  );
}

function DemoOriginalNav() {
  return (
    <nav className="demo-original-nav" aria-label="Navigasi demo Original">
      <a href="/gaya">Semua gaya</a>
      <a href="/gaya2">Gaya 02 <span aria-hidden="true">›</span></a>
    </nav>
  );
}

function DemoExperience({ theme, site }: { theme: DemoTheme; site: SiteDocument }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropping, setDropping] = useState(false);
  const [dropSequence, setDropSequence] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointerX = useRef<number | null>(null);
  const cards = site.content.cards.filter((card) => card.visible);
  const current = cards[activeIndex % cards.length];
  const assetUrls = resolveMedia(site);
  const videoSrc = assetUrls[site.content.background.desktopVideoAssetId || ""] || "/videos/hero.mp4";
  const posterSrc = assetUrls[site.content.background.posterAssetId || ""] || "/videos/hero-poster.jpg";
  const customImage = current?.imageAssetId ? assetUrls[current.imageAssetId] : undefined;
  const nextCard = cards.length ? cards[(activeIndex + 1) % cards.length] : undefined;
  const enterImage = assetUrls[site.content.theme.enterKeyAssetId || ""] || "/images/enter-key-square-tight.webp";

  useEffect(() => {
    setActiveIndex(0);
    setDropping(false);
    setVideoFailed(false);
  }, [theme.id]);

  useEffect(() => {
    if (!dropping) return;
    const timeout = window.setTimeout(() => setDropping(false), 2700);
    return () => window.clearTimeout(timeout);
  }, [dropping, dropSequence]);

  useEffect(() => {
    if (videoFailed) return;
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    const resume = () => {
      if (document.visibilityState === "visible") void video.play().catch(() => {});
    };
    resume();
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [videoFailed, videoSrc]);

  const selectCard = (delta: number) => {
    if (!cards.length || dropping) return;
    setActiveIndex((currentIndex) => (currentIndex + delta + cards.length) % cards.length);
    setDropSequence((sequence) => sequence + 1);
    setDropping(true);
  };
  const finishDrop = (event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && event.animationName === "cinematic-enter-card-drop-bounce") {
      setDropping(false);
    }
  };
  const onPointerDown = (event: PointerEvent) => { pointerX.current = event.clientX; };
  const onPointerUp = (event: PointerEvent) => {
    if (pointerX.current === null) return;
    const distance = event.clientX - pointerX.current;
    pointerX.current = null;
    if (Math.abs(distance) >= 60) selectCard(distance < 0 ? 1 : -1);
  };

  const prevId = theme.id === 1 ? 16 : theme.id - 1;
  const nextId = theme.id === 16 ? 1 : theme.id + 1;
  const pageVars = {
    "--demo-card-accent": current?.color || site.content.theme.accent,
    "--demo-video-position": `${site.content.background.focalX}% ${site.content.background.focalY}%`,
    "--demo-heading-scale": site.content.theme.headingScale || 1,
  } as CSSProperties;

  return (
    <div className={`theme-demo theme-demo--${theme.id}${dropping ? " theme-demo--motion-opt-in" : ""}`} style={pageVars}>
      <header className="theme-demo__header">
        <a className="theme-demo__brand" href="/gaya" aria-label="NAMANA.PRO, buka galeri gaya">NAMANA.PRO</a>
        <nav className="theme-demo__switcher" aria-label="Pindah gaya demo">
          <a href={`/gaya${prevId}`} aria-label={`Gaya sebelumnya, ${demoThemes[prevId - 1].name}`}><span aria-hidden="true">‹</span><span className="theme-demo__switcher-text"> Sebelumnya</span></a>
          <a href="/gaya" className="theme-demo__switcher-all">{String(theme.id).padStart(2, "0")} / 16 <span className="theme-demo__switcher-text"> gaya</span></a>
          <a href={`/gaya${nextId}`} aria-label={`Gaya berikutnya, ${demoThemes[nextId - 1].name}`}><span className="theme-demo__switcher-text">Berikutnya </span><span aria-hidden="true">›</span></a>
        </nav>
      </header>

      <main className="theme-demo__stage">
        <section className="theme-demo__identity" aria-label="Identitas Teh Vini">
          <div className="theme-demo__identity-copy">
            <p className="theme-demo__salutation">{site.content.identity.introLabel || "Hello, kenalain saya"}</p>
            <h1 className="theme-demo__name">{site.content.identity.displayName}</h1>
            <p className="theme-demo__profession">{site.content.identity.profession}</p>
          </div>
          <EnterKeycap
            pressed={dropping}
            inactive={dropping || !nextCard}
            firstActivation={false}
            nextCard={nextCard?.title || "berikutnya"}
            onEnter={() => selectCard(1)}
            imageSrc={enterImage}
            editMode={false}
          />
        </section>

        <div className="theme-demo__visual" aria-label="Video Teh Vini berjalan">
          <div className="theme-demo__video-frame">
            <img className="theme-demo__poster" src={posterSrc} alt="Teh Vini berdiri di panggung berlatar gelap" width={960} height={540} fetchPriority="high" />
            {!videoFailed && (
              <video
                key={videoSrc}
                ref={videoRef}
                className="theme-demo__video"
                autoPlay muted loop playsInline preload="metadata"
                width={960} height={540} poster={posterSrc}
                onError={() => setVideoFailed(true)} aria-hidden="true"
              >
                <source src={videoSrc} type="video/mp4" />
              </video>
            )}
          </div>
          <span className="theme-demo__visual-mark" aria-hidden="true" />
          <span className="theme-demo__visual-caption" aria-hidden="true">{theme.name}</span>
        </div>

        <section className="theme-demo__story" aria-label="Kartu cerita Teh Vini">
          {current ? (
            <>
              <div className="theme-demo__story-topline">
                <span>{theme.id === 12 ? "SELECT FILE" : "CERITA / PROFIL"}</span>
                <span aria-label={`Kartu ${activeIndex + 1} dari ${cards.length}`}>{String(activeIndex + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}</span>
              </div>
              <div className="theme-demo__story-content" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { pointerX.current = null; }}>
                <article
                    className={`theme-demo__story-card${dropping ? " theme-demo__story-card--dropping" : ""}`}
                    key={`${current.id}-${dropSequence}`}
                    onAnimationEnd={finishDrop}
                  >
                    <div className="theme-demo__story-heading">
                      <div className="theme-demo__story-monogram" aria-hidden="true">
                        {customImage ? <img src={customImage} alt="" width={64} height={64} /> : current.title.slice(0, 2)}
                      </div>
                      <div>
                        <h2>{current.title}</h2>
                        <p className="theme-demo__story-subtitle">{current.subtitle}</p>
                      </div>
                    </div>
                    <p className="theme-demo__story-description">{current.description}</p>
                    {current.link && <a className="theme-demo__story-link" href={current.link} target="_blank" rel="noopener noreferrer">{current.linkLabel || `Buka ${current.title}`}</a>}
                  </article>
                {dropping && <span className="theme-demo__impact-shadow" aria-hidden="true" />}
              </div>
              <div className="theme-demo__story-actions">
                <button type="button" onClick={() => selectCard(-1)} disabled={dropping} aria-label="Kartu sebelumnya">‹ <span>Sebelumnya</span></button>
                <button type="button" onClick={() => selectCard(1)} disabled={dropping} aria-label="Kartu berikutnya"><span>Selanjutnya</span> ›</button>
              </div>
            </>
          ) : (
            <div className="theme-demo__empty">Kartu profil belum ditambahkan.</div>
          )}
        </section>
      </main>

      <footer className="theme-demo__footer">
        <span>Demo gaya {String(theme.id).padStart(2, "0")} / {theme.name}</span>
        <a href="/gaya">Lihat 16 gaya</a>
      </footer>
    </div>
  );
}

export function ThemeDemo({ theme }: { theme: DemoTheme }) {
  const demo = useViniProfile();

  useEffect(() => {
    document.title = `${theme.name} | Demo NAMANA.PRO`;
  }, [theme.name]);

  if (demo.state !== "ready") return <DemoStatus state={demo.state} />;

  if (theme.id === 1) {
    return (
      <div className="demo-original-wrap">
        <IdentityFlip key="original-demo" content={demo.site.content} assetUrls={resolveMedia(demo.site)} startOpen />
        <DemoOriginalNav />
      </div>
    );
  }

  return <DemoExperience theme={theme} site={demo.site} />;
}

export function ThemeGallery() {
  const [category, setCategory] = useState<(typeof demoCategories)[number]>("Semua");
  const themes = demoThemes.filter((theme) => category === "Semua" || theme.category === category);

  useEffect(() => { document.title = "16 gaya | Galeri NAMANA.PRO"; }, []);

  return (
    <div className="demo-gallery">
      <header className="demo-gallery__header">
        <a href="/" className="demo-gallery__brand">NAMANA.PRO</a>
        <a className="demo-gallery__home" href="/vini">Lihat Original</a>
      </header>
      <main className="demo-gallery__main">
        <div className="demo-gallery__intro">
          <p>GALERI GAYA NAMANA</p>
          <h1>Satu cerita. <em>Enam belas</em> panggung.</h1>
          <span>Semua contoh memakai data dan video Teh Vini. Pilih satu, lalu rasakan karakter desainnya.</span>
        </div>
        <div className="demo-gallery__filters" role="group" aria-label="Filter kategori gaya">
          {demoCategories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
        <p className="demo-gallery__count" role="status">{themes.length} gaya ditampilkan</p>
        <div className="demo-gallery__grid">
          {themes.map((theme) => (
            <a href={`/${theme.slug}`} key={theme.id} className={`demo-gallery__item demo-gallery__item--${theme.id}`} aria-label={`Buka demo ${theme.name}`}>
              <div className="demo-gallery__thumbnail" aria-hidden="true">
                <img src="/videos/hero-poster.jpg" alt="" width={960} height={540} loading="lazy" />
                <span className="demo-gallery__thumbnail-name">TEH VINI</span>
                <span className="demo-gallery__thumbnail-number">{String(theme.id).padStart(2, "0")}</span>
              </div>
              <div className="demo-gallery__item-info">
                <div><span>{String(theme.id).padStart(2, "0")} / {theme.category}</span><strong>{theme.name}</strong></div>
                <span className="demo-gallery__item-cta" aria-hidden="true">Buka demo ›</span>
              </div>
              <p>{theme.description}</p>
            </a>
          ))}
        </div>
      </main>
      <footer className="demo-gallery__footer">NAMANA.PRO | Galeri 16 gaya</footer>
    </div>
  );
}
