import { useState } from "react";
import type { SiteDocument } from "../static/sites";

type SectionKey = "nama" | "karir" | "skill";
type GalleryKey = "karya" | "produk";
type EditProps = {
  site: SiteDocument;
  change: (update: (next: SiteDocument) => void) => void;
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

export function OriginalStudioEditor({ site, change }: EditProps) {
  const [activeTab, setActiveTab] = useState<"dasar" | SectionKey | GalleryKey>("dasar");
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
    <nav className="studio-original__tabs" aria-label="Pilih menu untuk diedit">
      {([ ["dasar", "Dasar"], ["nama", menuLabels.nama], ["karir", menuLabels.karir], ["skill", menuLabels.skill], ["karya", menuLabels.karya], ["produk", menuLabels.produk] ] as const).map(([key, label]) =>
        <button type="button" key={key} className={activeTab === key ? "is-active" : ""}
          aria-pressed={activeTab === key}
          onClick={() => { setActiveTab(key); setSelectedGallery(null); }}>{label}</button>)}
    </nav>
    {activeTab === "dasar" && <>
    <div className="studio-original__heading"><h2>Identitas profil</h2><span>Informasi utama</span></div>
    <section className="studio-group">
      <div className="studio-original__fields-2"><TextField label="Nama di judul" maxLength={60} value={site.content.identity.displayName} onChange={(value) => change((next) => {
        const previous = next.content.identity.displayName;
        next.content.identity.displayName = value;
        const first = next.content.original!.nama.items.find((item) => item.label === "Nama" && item.value === previous);
        if (first) first.value = value;
      })} />
      <TextField label="Profesi atau tagline" maxLength={70} value={site.content.identity.profession} onChange={(value) => change((next) => { next.content.identity.profession = value; })} /></div>
      <TextField label="Link tombol Japri Saya !" value={original.contactUrl} placeholder="https://wa.me/62..." onChange={(value) => change((next) => { next.content.original!.contactUrl = value; })} />
    </section>
    </>}

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
      {original[section].items.map((item, index) => <div className="studio-original__item studio-original__fact" key={item.id}>
        <span className="studio-original__row-index">{index + 1}</span>
        <TextField label="Label" maxLength={40} value={item.label} onChange={(value) => updateFact(section, item.id, "label", value)} />
        <TextField label="Isi" maxLength={180} value={item.value} onChange={(value) => updateFact(section, item.id, "value", value)} />
        <label className="studio-original__field"><span>Ikon</span><select value={item.icon} onChange={(event) => updateFact(section, item.id, "icon", Number(event.target.value))}>
          {icons.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
        </select></label>
        <button type="button" className="studio-original__remove" aria-label={`Hapus data ${index + 1}`} title={`Hapus data ${index + 1}`} onClick={() => change((next) => { next.content.original![section].items = next.content.original![section].items.filter((fact) => fact.id !== item.id); })}>×</button>
      </div>)}
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
        const url = site.media.cards[item.id] || "";
        return <div className="studio-original__item studio-original__gallery-edit" key={item.id}>
          <div className="studio-original__item-head"><strong>Edit {section}: {item.title}</strong><button type="button" onClick={() => { removeGallery(section, item.id); setSelectedGallery(null); }}>Hapus kartu</button></div>
          <TextField label="Judul" maxLength={80} value={item.title} onChange={(value) => updateGallery(section, item.id, "title", value)} />
          <TextField label="Detail popup" multiline maxLength={1200} value={item.description} onChange={(value) => updateGallery(section, item.id, "description", value)} />
          <TextField label="URL tombol pada popup" value={item.link} placeholder="https://contoh.com" onChange={(value) => updateGallery(section, item.id, "link", value)} />
        </div>;
      })}
      <button type="button" className="studio-original__add" disabled={original[section].items.length >= 20} onClick={() => addGallery(section)}>+ Tambah {section}</button>
    </section>)}
  </div>;
}
