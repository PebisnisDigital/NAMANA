import type { SiteDocument } from "../static/sites";

type SectionKey = "nama" | "karir" | "skill";
type GalleryKey = "karya" | "produk";
type EditProps = {
  site: SiteDocument;
  change: (update: (next: SiteDocument) => void) => void;
  onUpload: (id: string, file: File) => void;
  uploading: boolean;
  previews: Record<string, string>;
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

export function OriginalStudioEditor({ site, change, onUpload, uploading, previews }: EditProps) {
  const original = site.content.original!;
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
  const addGallery = (section: GalleryKey) => change((next) => {
    next.content.original![section].items.push({
      id: crypto.randomUUID(), title: section === "karya" ? "Karya baru" : "Produk baru",
      description: "", link: "", imageAssetId: null, color: "#ee4851", motif: "cinema",
    });
  });
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
    <section className="studio-group">
      <h2>Gaya website</h2>
      <div className="studio-original__preset"><strong>Original</strong><span>Template standar NAMINA</span></div>
      <p className="studio-hint">Komposisi, posisi judul, animasi loop, dan rasio kartu 19:6 mengikuti contoh /vini.</p>
    </section>
    <section className="studio-group">
      <h2>Identitas klien</h2>
      <TextField label="Nama di judul" maxLength={60} value={site.content.identity.displayName} onChange={(value) => change((next) => {
        const previous = next.content.identity.displayName;
        next.content.identity.displayName = value;
        const first = next.content.original!.nama.items.find((item) => item.label === "Nama" && item.value === previous);
        if (first) first.value = value;
      })} />
      <TextField label="Profesi atau tagline" maxLength={70} value={site.content.identity.profession} onChange={(value) => change((next) => { next.content.identity.profession = value; })} />
      <TextField label="Link tombol Japri Saya !" value={original.contactUrl} placeholder="https://wa.me/62..." onChange={(value) => change((next) => { next.content.original!.contactUrl = value; })} />
    </section>
    <section className="studio-group">
      <h2>Video latar</h2>
      <TextField label="Video desktop (URL HTTPS)" value={site.media.desktopVideo} placeholder="https://.../video.mp4" onChange={(value) => change((next) => { next.media.desktopVideo = value; })} />
      <TextField label="Video mobile (opsional)" value={site.media.mobileVideo} placeholder="Kosong = video desktop" onChange={(value) => change((next) => { next.media.mobileVideo = value; })} />
      <label className="studio-original__field"><span>Posisi video kiri-kanan: {site.content.background.focalX}%</span>
        <input type="range" min={0} max={100} value={site.content.background.focalX} onChange={(event) => change((next) => { next.content.background.focalX = Number(event.target.value); })} />
      </label>
    </section>

    {(["nama", "karir", "skill"] as const).map((section) => <details className="studio-group studio-original__chapter" key={section} open={undefined}>
      <summary>Menu {section === "nama" ? "Nama" : section === "karir" ? "Karir" : "Skill"} <span>{original[section].items.length} data</span></summary>
      <TextField label="Kalimat pembuka" maxLength={120} value={original[section].intro} onChange={(value) => updateSection(section, "intro", value)} />
      {section !== "nama" && <TextField label="Subjudul merah" maxLength={100} value={original[section].subtitle} onChange={(value) => updateSection(section, "subtitle", value)} />}
      <TextField label="Deskripsi di bawah judul" multiline maxLength={400} value={original[section].description} onChange={(value) => updateSection(section, "description", value)} />
      <p className="studio-hint">Data bergeser otomatis, tiga kolom. Urutan di bawah mengikuti urutan animasi.</p>
      {original[section].items.map((item, index) => <div className="studio-original__item" key={item.id}>
        <div className="studio-original__item-head"><strong>Data {index + 1}</strong><button type="button" onClick={() => change((next) => { next.content.original![section].items = next.content.original![section].items.filter((fact) => fact.id !== item.id); })}>Hapus</button></div>
        <TextField label="Label" maxLength={40} value={item.label} onChange={(value) => updateFact(section, item.id, "label", value)} />
        <TextField label="Isi" maxLength={180} value={item.value} onChange={(value) => updateFact(section, item.id, "value", value)} />
        <label className="studio-original__field"><span>Ikon</span><select value={item.icon} onChange={(event) => updateFact(section, item.id, "icon", Number(event.target.value))}>
          {icons.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
        </select></label>
      </div>)}
      <button type="button" className="studio-original__add" disabled={original[section].items.length >= 30} onClick={() => addFact(section)}>Tambah data</button>
    </details>)}

    {(["karya", "produk"] as const).map((section) => <details className="studio-group studio-original__chapter" key={section}>
      <summary>Menu {section === "karya" ? "Karya" : "Produk"} <span>{original[section].items.length} gambar</span></summary>
      <TextField label="Kalimat pembuka" maxLength={120} value={original[section].intro} onChange={(value) => updateSection(section, "intro", value)} />
      <TextField label="Subjudul merah" maxLength={100} value={original[section].subtitle} onChange={(value) => updateSection(section, "subtitle", value)} />
      <TextField label="Deskripsi" multiline maxLength={400} value={original[section].description} onChange={(value) => updateSection(section, "description", value)} />
      <p className="studio-hint">Foto 19:6 bergerak otomatis. Saat diklik muncul detail, dengan tombol menuju URL yang diisi.</p>
      {original[section].items.map((item, index) => {
        const url = site.media.cards[item.id] || "";
        return <div className="studio-original__item" key={item.id}>
          <div className="studio-original__item-head"><strong>{section === "karya" ? "Karya" : "Produk"} {index + 1}</strong><button type="button" onClick={() => removeGallery(section, item.id)}>Hapus</button></div>
          <TextField label="Judul" maxLength={80} value={item.title} onChange={(value) => updateGallery(section, item.id, "title", value)} />
          <TextField label="Detail popup" multiline maxLength={1200} value={item.description} onChange={(value) => updateGallery(section, item.id, "description", value)} />
          <TextField label="URL tombol pada popup" value={item.link} placeholder="https://contoh.com" onChange={(value) => updateGallery(section, item.id, "link", value)} />
          <TextField label="URL gambar 19:6" value={url} placeholder="https://.../gambar.webp" onChange={(value) => change((next) => { next.media.cards[item.id] = value; })} />
          {url ? <img className="studio-original__image" src={previews[url] || url} alt={`Pratinjau ${item.title}`} width={570} height={180} />
            : <p className="studio-original__no-image">Belum ada foto. Ilustrasi bawaan tampil sementara.</p>}
          <label className="studio-original__upload">Unggah foto JPG, PNG atau WebP (maksimal 1,3 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onUpload(item.id, file);
              event.currentTarget.value = "";
            }} />
          </label>
        </div>;
      })}
      <button type="button" className="studio-original__add" disabled={original[section].items.length >= 20} onClick={() => addGallery(section)}>Tambah {section}</button>
    </details>)}
  </div>;
}
