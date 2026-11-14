import { useState } from "react";
import { playableDropboxMediaUrl, retryDropboxImage, type SiteDocument } from "../static/sites";

type SectionKey = "nama" | "karir" | "skill";
type GalleryKey = "karya" | "produk";
type EditProps = {
  site: SiteDocument;
  change: (update: (next: SiteDocument) => void) => void;
  section: SectionKey | GalleryKey;
};

const icons = [
  [8121295, "Profil"], [8121312, "Kalender"], [8121270, "Lokasi"],
  [8121302, "Rumah"], [8121279, "Aktivitas"], [8121297, "Olahraga"],
  [8121313, "Pendidikan"], [8121304, "Karir"], [8121299, "Profesi"], [8121309, "Website"],
  [8121272, "Kreatif"], [8121262, "Digital"], [8121290, "Teknologi"],
] as const;

function TextField({ label, value, onChange, placeholder, multiline = false, maxLength }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  return <label className="studio-original__field">
    <span>{label}</span>
    {multiline ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />
      : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />}
  </label>;
}


function whatsappInput(value: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    const digits = parsed.hostname === "wa.me"
      ? parsed.pathname.replace(/\D/g, "")
      : parsed.hostname === "api.whatsapp.com" ? parsed.searchParams.get("phone")?.replace(/\D/g, "") || "" : "";
    return digits.startsWith("62") ? "0" + digits.slice(2) : digits;
  } catch { return ""; }
}

function whatsappLink(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const international = digits.startsWith("0") ? "62" + digits.slice(1) : digits.startsWith("8") ? "62" + digits : digits;
  return "https://wa.me/" + international;
}
export function OriginalStudioEditor({ site, change, section }: EditProps) {
  const activeTab = section;
  const [waNumber, setWaNumber] = useState(() => whatsappInput(site.content.original?.contactUrl || ""));
  const [selectedGallery, setSelectedGallery] = useState<string | null>(null);
  const original = site.content.original!;
  const menuLabels = {
    nama: original.menuTitles?.nama?.trim() || "Nama",
    karir: original.menuTitles?.karir?.trim() || "Karir",
    skill: original.menuTitles?.skill?.trim() || "Skill",
    karya: original.menuTitles?.karya?.trim() || "Karya",
    produk: original.menuTitles?.produk?.trim() || "Produk",
  };
  const updateSection = (section: SectionKey | GalleryKey, field: "intro" | "subtitle" | "description", value: string) => {
    change((next) => { next.content.original![section][field] = value; });
  };
  const updateFact = (section: SectionKey, id: string, field: "label" | "value" | "icon", value: string | number) => {
    change((next) => {
      const fact = next.content.original![section].items.find((item) => item.id === id);
      if (!fact) return;
      if (field === "icon") fact.icon = Number(value);
      else fact[field] = String(value);
    });
  };
  const addFact = (section: SectionKey) => {
    change((next) => {
      next.content.original![section].items.push({
        id: crypto.randomUUID(),
        label: section === "nama" ? "Data" : section === "karir" ? "Karir" : "Skill",
        value: "",
        icon: section === "nama" ? 8121295 : section === "karir" ? 8121304 : 8121272,
      });
    });
  };
  const addGallery = (section: GalleryKey) => {
    const id = crypto.randomUUID();
    change((next) => {
      next.content.original![section].items.push({
        id, title: section === "karya" ? "Karya baru" : "Produk baru",
        description: "", link: "", imageAssetId: null, color: "#ee4851", motif: "cinema",
      });
    });
    setSelectedGallery(id);
  };
  const updateGallery = (section: GalleryKey, id: string, field: "title" | "description" | "link" | "color", value: string) => {
    change((next) => {
      const item = next.content.original![section].items.find((entry) => entry.id === id);
      if (item) item[field] = value;
    });
  };
  const removeGallery = (section: GalleryKey, id: string) => change((next) => {
    next.content.original![section].items = next.content.original![section].items.filter((item) => item.id !== id);
    delete next.media.cards[id];
  });

  return <div className="studio-original">

    {section === "nama" && <section className="studio-group studio-original__basics">
      <div className="studio-original__heading"><h2>Profil utama</h2><span>Ditampilkan pada halaman depan</span></div>
      <div className="studio-original__fields-2">
        <TextField label="Nama yang ditampilkan" maxLength={60} value={site.content.identity.displayName} onChange={(value) => change((next) => {
          const previous = next.content.identity.displayName;
          next.content.identity.displayName = value;
          const same = next.content.original!.nama.items.find((item) => item.label === "Nama" && item.value === previous);
          if (same) same.value = value;
        })} />
        <TextField label="Profesi atau tagline" maxLength={70} value={site.content.identity.profession} onChange={(value) => change((next) => { next.content.identity.profession = value; })} />
      </div>
      <label className="studio-original__field">
        <span>Nomor WhatsApp tombol "Japri Saya!"</span>
        <input inputMode="tel" type="tel" placeholder="Contoh: 081234567890" value={waNumber} onChange={(event) => {
          const raw = event.target.value.replace(/[^+0-9]/g, "").slice(0, 18);
          setWaNumber(raw);
          change((next) => { next.content.original!.contactUrl = whatsappLink(raw); });
        }} />
        <small>Masukkan nomor saja. Link chat WhatsApp dibuat otomatis tanpa perlu mengetik https://wa.me/.</small>
      </label>
      {original.contactUrl.startsWith("https://wa.me/") && <a className="studio-original__wa-preview" href={original.contactUrl} target="_blank" rel="noopener noreferrer">Tes tombol WhatsApp ↗</a>}
    </section>}
    {(["nama", "karir", "skill"] as const).filter((section) => section === activeTab).map((section) => <section className="studio-group studio-original__chapter" key={section}>
      <div className="studio-original__heading"><h2>Menu {menuLabels[section]}</h2><span>{original[section].items.length} data</span></div>
      <div className="studio-original__copy">
      <TextField label="Nama menu di website" maxLength={24} value={original.menuTitles?.[section] ?? menuLabels[section]} onChange={(value) => change((next) => { next.content.original!.menuTitles = { ...next.content.original!.menuTitles, [section]: value }; })} />
      <TextField label="Kalimat pembuka" maxLength={120} value={original[section].intro} onChange={(value) => updateSection(section, "intro", value)} />
      {section !== "nama" && <TextField label="Subjudul merah" maxLength={100} value={original[section].subtitle} onChange={(value) => updateSection(section, "subtitle", value)} />}
      <TextField label="Deskripsi di bawah judul" multiline maxLength={400} value={original[section].description} onChange={(value) => updateSection(section, "description", value)} />
      </div>
      <div className="studio-original__heading studio-original__subheading"><h3>Data slide</h3><span>Urutan animasi</span></div>
      {original[section].items.length === 0 && <p className="studio-hint">Belum ada data. Tambahkan baris pertama.</p>}
      <div className="studio-original__facts">
        {original[section].items.map((item, index) => (
          <details className="studio-original__fact-card" key={item.id}>
            <summary>
              <span className="studio-original__fact-number">{index + 1}</span>
              <span className="studio-original__fact-summary">
                <strong>{item.label || "Data tanpa label"}</strong>
                <small>{item.value || "Ketuk untuk mengisi data"}</small>
              </span>
              <span className="studio-original__fact-chevron" aria-hidden="true">⌄</span>
            </summary>
            <div className="studio-original__fact-fields">
              <TextField label="Nama data" maxLength={40} value={item.label} onChange={(value) => updateFact(section, item.id, "label", value)} />
              <TextField label="Isinya" maxLength={180} value={item.value} onChange={(value) => updateFact(section, item.id, "value", value)} />
              <label className="studio-original__field"><span>Ikon</span><select value={item.icon} onChange={(event) => updateFact(section, item.id, "icon", Number(event.target.value))}>
                {icons.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
              </select></label>
              <button type="button" className="studio-original__remove" onClick={() => change((next) => { next.content.original![section].items = next.content.original![section].items.filter((fact) => fact.id !== item.id); })}>Hapus data</button>
            </div>
          </details>
        ))}
      </div>
      <button type="button" className="studio-original__add" disabled={original[section].items.length >= 30} onClick={() => addFact(section)}>+ Tambah data</button>
    </section>)}

    {(["karya", "produk"] as const).filter((section) => section === activeTab).map((section) => <section className="studio-group studio-original__chapter" key={section}>
      <div className="studio-original__heading"><h2>Menu {menuLabels[section]}</h2><span>{original[section].items.length} kartu</span></div>
      <div className="studio-original__copy">
      <TextField label="Nama menu di website" maxLength={24} value={original.menuTitles?.[section] ?? menuLabels[section]} onChange={(value) => change((next) => { next.content.original!.menuTitles = { ...next.content.original!.menuTitles, [section]: value }; })} />
      <TextField label="Kalimat pembuka" maxLength={120} value={original[section].intro} onChange={(value) => updateSection(section, "intro", value)} />
      <TextField label="Subjudul merah" maxLength={100} value={original[section].subtitle} onChange={(value) => updateSection(section, "subtitle", value)} />
      <TextField label="Deskripsi" multiline maxLength={400} value={original[section].description} onChange={(value) => updateSection(section, "description", value)} />
      </div>
      <div className="studio-original__heading studio-original__subheading"><h3>Galeri {section}</h3><span>Slide otomatis 19:6</span></div>
      {original[section].items.length === 0 && <p className="studio-hint">Belum ada kartu. Tambahkan kartu pertama.</p>}
      <div className="studio-original__gallery-list" aria-label={`Daftar ${section}`}>
        {original[section].items.map((item, index) => <button key={item.id} type="button" aria-pressed={(selectedGallery || original[section].items[0]?.id) === item.id}
          className={`studio-original__gallery-choice${(selectedGallery || original[section].items[0]?.id) === item.id ? " is-active" : ""}`}
          onClick={() => setSelectedGallery(item.id)}>{index + 1}. {item.title}</button>)}
      </div>
      {original[section].items.filter((item) => item.id === (selectedGallery && original[section].items.some((entry) => entry.id === selectedGallery) ? selectedGallery : original[section].items[0]?.id)).map((item) => {
        return <div className="studio-original__item studio-original__gallery-edit" key={item.id}>
          <div className="studio-original__item-head"><strong>Edit {section}: {item.title}</strong><button type="button" onClick={() => { removeGallery(section, item.id); setSelectedGallery(null); }}>Hapus kartu</button></div>
          <TextField label="Judul" maxLength={80} value={item.title} onChange={(value) => updateGallery(section, item.id, "title", value)} />
          <TextField label="Detail popup" multiline maxLength={1200} value={item.description} onChange={(value) => updateGallery(section, item.id, "description", value)} />
          <TextField label="URL tombol pada popup" value={item.link} placeholder="https://contoh.com" onChange={(value) => updateGallery(section, item.id, "link", value)} />
          <div className="studio-media__asset">
            <strong>Foto untuk kartu ini (rasio 19:6)</strong>
            {site.media.cards[item.id]
              ? <img className="studio-media__image" src={playableDropboxMediaUrl(site.media.cards[item.id])} alt={"Preview foto " + item.title} width={570} height={180} onError={(event) => retryDropboxImage(event.currentTarget)} />
              : <div className="studio-media__placeholder">Belum ada foto</div>}
            <label className="studio-original__field">
              <span>URL foto (opsional)</span>
              <input type="url" placeholder="https://.../foto.webp" value={site.media.cards[item.id] || ""} onChange={(event) => change((next) => { next.media.cards[item.id] = event.target.value; })} />
            </label>
            <small>Tempel URL HTTPS gambar yang sudah tersedia. Gambar tidak diunggah ke GitHub sehingga tidak memicu deploy.</small>
          </div>
        </div>;
      })}
      <button type="button" className="studio-original__add" disabled={original[section].items.length >= 20} onClick={() => addGallery(section)}>+ Tambah {section}</button>
    </section>)}
  </div>;
}
