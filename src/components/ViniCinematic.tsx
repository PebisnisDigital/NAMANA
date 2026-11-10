import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AssetUrls, SiteContent } from "../domain/content";
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

type MenuKey = "Nama" | "Karir" | "Skill" | "Karya" | "Produk";
type TickerFact = { label: string; value: string; icon: number };
type VisualCard = {
  id: string;
  title: string;
  eyebrow: string;
  detail: string;
  accent: string;
  glow: string;
  motif: "storm" | "cinema" | "monogram" | "road" | "music" | "community" | "bot" | "animation";
};

const menus: MenuKey[] = ["Nama", "Karir", "Skill", "Karya", "Produk"];
const menuIntroductions: Record<MenuKey, string> = {
  Nama: "Halo, perkenalkan nama saya adalah...",
  Karir: "Pengalaman mengenai...",
  Skill: "Aku selalu belajar mengembangkan...",
  Karya: "Dan inilah...",
  Produk: "Ambil berkah dan manfaat dari...",
};

const nameFacts: TickerFact[] = [
  { label: "Nama", value: "Vini Junia N", icon: 8121295 },
  { label: "Tanggal Lahir", value: "8 Juni 1996", icon: 8121312 },
  { label: "Domisili", value: "Garut", icon: 8121270 },
  { label: "Jenis Kelamin", value: "Perempuan", icon: 8121295 },
  { label: "Agama", value: "Islam", icon: 8121302 },
  { label: "Status", value: "Kawin", icon: 8121302 },
  { label: "Hobi", value: "Jalan & Jajan", icon: 8121279 },
  { label: "Olahraga", value: "Badminton", icon: 8121297 },
  { label: "Pendidikan", value: "TK Kartika", icon: 8121313 },
  { label: "Pendidikan", value: "SDN Kartika", icon: 8121313 },
  { label: "Pendidikan", value: "Pondok Pesantren Darul Arqam Muhammadiyah Garut", icon: 8121313 },
  { label: "Pendidikan", value: "Unpad — Jurusan Keperawatan", icon: 8121313 },
];

const careerFacts: TickerFact[] = [
  "Founder Cuanify.id", "Founder Pebisnis.digital", "Founder Komunitas BADAI",
  "Founder PESONAFLIX", "Founder NAMINA.PRO", "Internet Marketing",
  "Affiliate Marketer", "Reseller", "Mentor", "Digital Creator", "AI Enthusiast",
].map((value, index) => ({ label: "Karir", value, icon: [8121304, 8121309, 8121299, 8121272][index % 4] }));

const skillFacts: TickerFact[] = [
  "Digital Marketing", "Sales", "Lead", "Copywriting", "Digital Creation",
  "AI Enthusiast", "WhatsApp Marketing", "AI Automation",
].map((value, index) => ({ label: "Skill", value, icon: [8121272, 8121262, 8121290, 8121279][index % 4] }));

const galleries: Record<"Karya" | "Produk", VisualCard[]> = {
  Karya: [
    { id: "badai-site", title: "Website BADAI", eyebrow: "Karya Website", detail: "Website BADAI, bagian dari karya digital Teh Vini untuk komunitas BADAI.", accent: "#ec4151", glow: "#592241", motif: "storm" },
    { id: "pesonaflix-site", title: "Website PESONAFLIX", eyebrow: "Karya Website", detail: "Website PESONAFLIX, platform portofolio personal bergaya sinematik Netflix.", accent: "#ff4a4a", glow: "#6d141e", motif: "cinema" },
    { id: "namina-site", title: "Website NAMINA.PRO", eyebrow: "Karya Website", detail: "Website NAMINA.PRO, proyek web profil personal dengan video dan interaksi sinematik.", accent: "#ed3441", glow: "#671f2a", motif: "monogram" },
    { id: "asa-site", title: "Web Asanirwanaselaras.com", eyebrow: "Karya Website", detail: "Website Asa Nirwana Selaras untuk layanan transportasi dan rental kendaraan.", accent: "#ffb354", glow: "#60401d", motif: "road" },
  ],
  Produk: [
    { id: "musicuan", title: "MUSICUAN", eyebrow: "Produk", detail: "MUSICUAN merupakan salah satu produk dalam portofolio Teh Vini.", accent: "#bb73ff", glow: "#44235f", motif: "music" },
    { id: "badai", title: "BADAI", eyebrow: "Produk", detail: "BADAI merupakan komunitas dan produk yang dibangun Teh Vini.", accent: "#f65766", glow: "#722945", motif: "community" },
    { id: "pesonaflix", title: "PESONAFLIX", eyebrow: "Produk", detail: "PESONAFLIX menyediakan jasa pembuatan website personal dengan nuansa Netflix.", accent: "#ff5454", glow: "#711e25", motif: "cinema" },
    { id: "namina", title: "NAMINA.PRO", eyebrow: "Produk", detail: "NAMINA.PRO menawarkan website profil personal bergaya sinematik yang interaktif.", accent: "#ff5665", glow: "#5f1926", motif: "monogram" },
    { id: "karyawan-ai", title: "Karyawan AI", eyebrow: "Produk", detail: "Karyawan AI merupakan salah satu produk berbasis AI dalam portofolio Teh Vini.", accent: "#77ccff", glow: "#214363", motif: "bot" },
    { id: "cuanimasi", title: "CUANIMASI", eyebrow: "Produk", detail: "CUANIMASI merupakan salah satu produk kreatif Teh Vini.", accent: "#ffb96b", glow: "#63412d", motif: "animation" },
  ],
};

function IntroDescription({ text }: { text: string }) {
  return (
    <p>
      {text.split(/(?<=\.)\s+/).map((sentence, index) => (
        <span className="vini-cinema__description-sentence" key={index}>{sentence}</span>
      ))}
    </p>
  );
}

function CardArtwork({ card }: { card: VisualCard }) {
  const gradientId = `visual-gradient-${card.id}`;
  return (
    <svg className="vini-cinema__artwork" viewBox="0 0 950 300" role="img" aria-label={`Ilustrasi ${card.title}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#101017" /><stop offset=".52" stopColor={card.glow} /><stop offset="1" stopColor="#101018" />
        </linearGradient>
      </defs>
      <rect width="950" height="300" fill={`url(#${gradientId})`} />
      <path d="M480 -80 L960 300 M610 -120 L1050 240 M740 -150 L1100 130" stroke={card.accent} strokeWidth="2" opacity=".22" />
      <circle cx="765" cy="145" r="165" fill={card.accent} opacity=".11" />
      <circle cx="765" cy="145" r="119" stroke={card.accent} strokeWidth="2" opacity=".54" fill="none" />
      {card.motif === "music" ? <path d="M660 125V83L820 50v159m-160-84v92m160-8c-15-18-62-13-66 14-5 31 57 33 66 2m-160-8c-16-20-64-13-67 13-3 29 57 34 67 3" fill="none" stroke={card.accent} strokeWidth="15" strokeLinecap="round" /> : null}
      {card.motif === "storm" || card.motif === "community" ? <path d="M778 32L672 161h76l-39 116 137-156h-81l46-89Z" stroke={card.accent} strokeWidth="6" fill={card.accent} fillOpacity=".4" strokeLinejoin="round" /> : null}
      {card.motif === "cinema" || card.motif === "animation" ? <g transform="translate(672 65) rotate(-9 90 70)"><rect width="195" height="142" rx="14" fill="#0b0c17" stroke={card.accent} strokeWidth="6" /><path d="M0 44h195" stroke={card.accent} strokeWidth="5" /><path d="M35 0L72 44M97 0l37 44M157 0l37 44" stroke={card.accent} strokeWidth="7" /><path d="m76 70 66 29-66 28Z" fill={card.accent} /></g> : null}
      {card.motif === "monogram" ? <g transform="translate(692 67)"><rect width="150" height="150" rx="29" fill={card.accent} /><path d="M34 121V30h25l55 73V30" fill="none" stroke="white" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" /></g> : null}
      {card.motif === "road" ? <g transform="translate(635 55)"><path d="M100 215L163 0h40l63 215Z" fill={card.accent} fillOpacity=".30" stroke={card.accent} strokeWidth="5" /><path d="M185 20v35m0 28v35m0 28v35" stroke="#fff8e7" strokeWidth="8" strokeLinecap="round" /></g> : null}
      {card.motif === "bot" ? <g transform="translate(695 52)" stroke={card.accent} strokeWidth="7"><rect width="150" height="162" rx="29" fill="#111c2a" /><path d="M75-28v28M0 95h-25m175 0h25" /><circle cx="45" cy="67" r="11" fill={card.accent}/><circle cx="105" cy="67" r="11" fill={card.accent}/><path d="M42 111q33 25 66 0" fill="none" strokeLinecap="round" /></g> : null}
      <text x="48" y="57" fill={card.accent} fontFamily="Montserrat, sans-serif" fontWeight="700" fontSize="22" letterSpacing="4">{card.eyebrow.toUpperCase()}</text>
      <text x="48" y="177" fill="#fff6f3" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize={card.title.length > 22 ? "39" : card.title.length > 15 ? "48" : "61"} letterSpacing="-2">{card.title}</text>
      <path d="M48 205h248" stroke={card.accent} strokeWidth="5" strokeLinecap="round" />
      <text x="48" y="255" fill="#fff1ea" fontFamily="Montserrat, sans-serif" fontSize="20" letterSpacing="3" opacity=".76">TEH VINI · NAMINA.PRO</text>
    </svg>
  );
}

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
  const [activeMenu, setActiveMenu] = useState<MenuKey>("Nama");
  const [selectedCard, setSelectedCard] = useState<VisualCard | null>(null);
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

  const activeFacts = activeMenu === "Nama" ? nameFacts : activeMenu === "Karir" ? careerFacts : activeMenu === "Skill" ? skillFacts : [];
  const activeGallery = activeMenu === "Karya" || activeMenu === "Produk" ? galleries[activeMenu] : null;
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

  const selectMenu = (menu: MenuKey) => {
    setActiveMenu(menu);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!selectedCard) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedCard(null); };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [selectedCard]);

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
    <main className={`vini-cinema${showLoader ? " vini-cinema--loading" : ""}${reducedMotion ? " vini-cinema--reduce-motion" : ""}${activeGallery ? " vini-cinema--gallery" : ""}`}>
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
          <button className="vini-cinema__brand" type="button" onClick={() => selectMenu("Nama")} aria-label="NAMINA, kembali ke Nama">
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
            {menus.map((menu) => (
              <button key={menu} type="button" className={activeMenu === menu ? "is-active" : ""} aria-current={activeMenu === menu ? "page" : undefined} onClick={() => selectMenu(menu)}>
                {menu}
              </button>
            ))}
          </nav>
          <a className="vini-cinema__contact-top" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Hubungi Saya</a>
        </header>

        <div className="vini-cinema__main">
          <div className="vini-cinema__intro">
            <span className="vini-cinema__hello">{menuIntroductions[activeMenu]}</span>
            {activeMenu === "Nama" ? (
              <>
                <h1>{content.identity.displayName}<span>{content.identity.profession}</span></h1>
                <IntroDescription text="Ibu rumah tangga yang jatuh cinta pada AI, digital marketing, dan karya-karya kreatif." />
              </>
            ) : (
              <>
                <h1 className="vini-cinema__section-title">{activeMenu}<span>{activeMenu === "Karir" ? "PERJALANAN & PENGALAMAN" : activeMenu === "Skill" ? "KEAHLIAN & KEMAMPUAN" : activeMenu === "Karya" ? "YANG SUDAH DIBAGIKAN" : "KREASI & BISNIS"}</span></h1>
                <IntroDescription text={activeMenu === "Karir" ? "Peran dan perjalanan karir yang aku tekuni." : activeMenu === "Skill" ? "Bidang yang aku pelajari dan kembangkan." : activeMenu === "Karya" ? "Kumpulan website yang aku kerjakan. Sentuh kartu untuk melihat detailnya." : "Produk dan proyek yang aku bangun. Sentuh kartu untuk melihat detailnya."} />
              </>
            )}
          </div>

          {activeGallery ? (
            <section className="vini-cinema__gallery-viewport" aria-label={`Slider gambar ${activeMenu}, bergerak otomatis`} aria-roledescription="carousel" key={activeMenu}>
              <div
                className="vini-cinema__gallery-track"
                style={{ width: `${activeGallery.length * 200 / pageSize}%`, "--gallery-slots": activeGallery.length * 2, "--gallery-duration": `${activeGallery.length * 4.5}s` } as CSSProperties}
              >
                {[...activeGallery, ...activeGallery].map((card, index) => (
                  <div className="vini-cinema__gallery-slide" key={`${card.id}-${index}`} aria-hidden={index >= activeGallery.length}>
                    <button type="button" className="vini-cinema__visual-card" onClick={() => setSelectedCard(card)} tabIndex={index >= activeGallery.length ? -1 : 0} aria-label={`Lihat detail ${card.title}`}>
                      <CardArtwork card={card} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="vini-cinema__highlights" aria-label={`Data ${activeMenu}, bergeser otomatis ke kanan tanpa jeda`} aria-roledescription="carousel">
              <div key={activeMenu} className="vini-cinema__highlight-track" style={{ width: `${activeFacts.length * 200 / 3}%`, "--slot-count": activeFacts.length * 2, "--marquee-duration": `${activeFacts.length * 1.6}s` } as CSSProperties}>
                {[...activeFacts, ...activeFacts].map((item, index) => (
                  <div key={`${item.value}-${index}`} className="vini-cinema__highlight" aria-hidden={index >= activeFacts.length}>
                    <img src={`/animated-icons/${item.icon}.webp`} width={40} height={40} alt="" decoding="async" />
                    <span>{item.label}<strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {selectedCard && !showLoader && (
        <div className="vini-cinema__modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCard(null); }}>
          <section className="vini-cinema__modal" role="dialog" aria-modal="true" aria-label={`Detail ${selectedCard.title}`}>
            <button type="button" className="vini-cinema__modal-close" onClick={() => setSelectedCard(null)} aria-label="Tutup detail">×</button>
            <CardArtwork card={selectedCard} />
            <div className="vini-cinema__modal-copy">
              <span>{selectedCard.eyebrow}</span>
              <h2>{selectedCard.title}</h2>
              <p>{selectedCard.detail}</p>
            </div>
          </section>
        </div>
      )}

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
