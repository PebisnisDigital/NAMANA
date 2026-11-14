import { useCallback, useEffect, useRef, useState } from "react";
import { businessClient } from "../business/client";
import { PublishSuccessModal } from "../components/PublishSuccessModal";
import { VideoStudioPanel } from "../components/VideoStudioPanel";
import { loadViniTemplate, prepareSite, resolveMedia, siteDocumentSchema, type SiteDocument } from "../static/sites";
import { originalStyleDefaults } from "../static/originalStyle";
import type { OriginalMenuIcon, OriginalStyle } from "../domain/content";
import "../business.css";
import "../studio-v2.css";
import "../studio-v2-fullscreen.css";
import "../studio-v2-immersive.css";

type MenuKey = "nama" | "karir" | "skill" | "karya" | "produk";
type GalleryKey = "karya" | "produk";
type FactKey = "nama" | "karir" | "skill";
type Menu = "Nama" | "Karir" | "Skill" | "Karya" | "Produk";
const allMenus: Menu[] = ["Nama", "Karir", "Skill", "Karya", "Produk"];
const iconOptions: OriginalMenuIcon[] = ["default","person","briefcase","sliders","image","shopping","star","book","award","sparkles","globe","heart"];
const placeholders: Record<MenuKey,string> = {
  nama:"Nama",karir:"Karir",skill:"Skill",karya:"Karya",produk:"Produk",
};

export function BusinessVisualStudio() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loading,setLoading] = useState(true);
  const [working,setWorking] = useState(false);
  const [ready,setReady] = useState(false);
  const [site,setSite] = useState<SiteDocument | null>(null);
  const [rowId,setRowId] = useState("");
  const [publishedSha,setPublishedSha] = useState<string | null>(null);
  const [publishedLink,setPublishedLink] = useState<string | null>(null);
  const [menu,setMenu] = useState<Menu>("Nama");
  const [selected,setSelected] = useState("name");
  const [popup,setPopup] = useState(false);
  const [design,setDesign] = useState(false);
  const [mobile,setMobile] = useState(false);
  const [immersive,setImmersive] = useState(false);
  const [popupPosition,setPopupPosition] = useState({left:80,top:96});
  const [dirty,setDirty] = useState(false);
  const [error,setError] = useState("");
  const [feedback,setFeedback] = useState("");
  // Completion tips should not sit on top of the website navigation forever.
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(""), 5200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  const original = site?.content.original;
  const style = { ...originalStyleDefaults,...original?.style };
  const parts = selected.split(":");
  const factSection = parts[0] === "fact" && ["nama","karir","skill"].includes(parts[1]) ? parts[1] as FactKey : null;
  const gallerySection = parts[0] === "card" && ["karya","produk"].includes(parts[1]) ? parts[1] as GalleryKey : null;
  const factIndex = Number(parts[2]);
  const fact = factSection && Number.isInteger(factIndex) && factIndex>=0 ? original?.[factSection].items[factIndex] : null;
  const card = gallerySection ? original?.[gallerySection].items.find((x)=>x.id===parts[2]) : null;
  const send = useCallback((message:Record<string,unknown>) =>
    frame.current?.contentWindow?.postMessage(message,window.location.origin),[]);
  useEffect(() => {
    if (!immersive) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setImmersive(false); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [immersive]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const id=params.get("site") || params.get("id");
    if(!id || !/^[0-9a-f-]{36}$/i.test(id)){setError("Website draft tidak ditemukan.");setLoading(false);return;}
    if(!businessClient){setError("Koneksi akun belum dikonfigurasi.");setLoading(false);return;}
    let active=true;
    void (async()=>{
      const auth=await businessClient.auth.getUser();
      if(!auth.data.user){window.location.assign("/studio");return;}
      const result=await businessClient.from("namina_business_sites")
        .select("id,document,published_sha").eq("id",id).single();
      if(!active)return;
      if(result.error)throw result.error;
      const parsed=siteDocumentSchema.parse(result.data.document);
      setRowId(result.data.id);
      setPublishedSha(result.data.published_sha || null);
      setSite(parsed);
    })().catch((e:Error)=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);

  const change=useCallback((update:(next:SiteDocument)=>void)=>{
    setSite(current=>{
      if(!current)return null;
      const next=structuredClone(current);
      update(next);
      return next;
    });
    setDirty(true);
    setFeedback("");
  },[]);

  useEffect(()=>{
    if(!site||!ready)return;
    const doc=prepareSite(site);
    send({type:"NAMINA_V2_RENDER",site:doc,assets:resolveMedia(doc)});
  },[site,ready,send]);
  useEffect(()=>{if(ready)send({type:"NAMINA_V2_MENU",menu})},[menu,ready,send]);
  useEffect(()=>{if(ready)send({type:"NAMINA_V2_SELECT",key:selected})},[selected,ready,send]);

  function setSectionText(key:string,value:string,which:MenuKey){
    change(next=>{
      const original=next.content.original!;
      if(key==="name")next.content.identity.displayName=value;
      else if(key==="profession")next.content.identity.profession=value;
      else if(key==="intro")original[which].intro=value;
      else if(key==="description")original[which].description=value;
      else if(key==="subtitle")original[which].subtitle=value;
      else if(key==="menu-title")original.menuTitles={...original.menuTitles,[which]:value};
      else if(key.startsWith("menu:")){
        const menuKey=key.slice(5) as MenuKey;
        if(menuKey in placeholders)original.menuTitles={...original.menuTitles,[menuKey]:value};
      }
    });
  }
  const addCard=(which:GalleryKey)=>{
    if(!site || !original || original[which].items.length>=20){setError("Maksimal 20 kartu dalam satu menu.");return;}
    const uuid=crypto.randomUUID();
    change(next=>next.content.original![which].items.push({
      id:uuid,title:which==="karya"?"Karya baru":"Produk baru",
      description:"",link:"",imageAssetId:null,color:"#ef4853",motif:"cinema",
    }));
    setMenu(which==="karya"?"Karya":"Produk");
    setSelected("card:"+which+":"+uuid);
    setPopup(true);setDesign(false);
  };
  const addFact=(which:FactKey)=>{
    if(!site || !original || original[which].items.length>=30){setError("Maksimal 30 data.");return;}
    const index=original[which].items.length;
    change(next=>next.content.original![which].items.push({
      id:crypto.randomUUID(),label:"Data baru",value:"Klik untuk mengedit",icon:8121295,
    }));
    setMenu((which[0].toUpperCase()+which.slice(1)) as Menu);
    setSelected("fact:"+which+":"+index);
    setPopup(true);setDesign(false);
  };
  useEffect(()=>{
    const listener=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin || event.source!==frame.current?.contentWindow)return;
      const value=event.data as Record<string,unknown>|null;
      if(!value||typeof value!=="object")return;
      if(value.type==="NAMINA_V2_READY")setReady(true);
      if(value.type==="NAMINA_V2_MENU_CHANGED" && typeof value.menu==="string" && allMenus.includes(value.menu as Menu))setMenu(value.menu as Menu);
      if(value.type==="NAMINA_V2_SELECT" && typeof value.key==="string"){
        setSelected(value.key);setDesign(false);
        const isText=["name","profession","intro","description","subtitle","menu-title"].includes(value.key);
        setPopup(!isText);
        if(!isText && value.rect && typeof value.rect==="object"){
          const bounds=value.rect as {left?:number;top?:number;width?:number};
          const rect=frame.current?.getBoundingClientRect();
          const desiredLeft=(rect?.left||0)+(bounds.left||0)+(bounds.width||0)+10;
          setPopupPosition({
            left:Math.max(10,Math.min(window.innerWidth-380,desiredLeft+360>window.innerWidth ? (rect?.left||0)+(bounds.left||0)-375 : desiredLeft)),
            top:Math.max(72,Math.min(window.innerHeight-380,(rect?.top||0)+(bounds.top||0))),
          });
        }
      }
      if(value.type==="NAMINA_V2_ADD_CARD" && (value.section==="karya"||value.section==="produk"))addCard(value.section);
      if(value.type==="NAMINA_V2_ADD_FACT" && (value.section==="nama"||value.section==="karir"||value.section==="skill"))addFact(value.section);
      if(value.type==="NAMINA_V2_UPDATE" && typeof value.key==="string" && typeof value.value==="string"){
        setSectionText(value.key,value.value,menu.toLowerCase() as MenuKey);
      }
    };
    window.addEventListener("message",listener);
    return()=>window.removeEventListener("message",listener);
  },[menu,site,change]);

  async function save(publish = false) {
    if(!businessClient || !site || !rowId)return;
    const parsed=siteDocumentSchema.safeParse(prepareSite(site));
    if(!parsed.success){setError("Konten tidak valid: "+parsed.error.issues[0]?.message);return;}
    if(publish && !window.confirm("Website akan tampil publik. Sudah periksa foto, video, teks, dan link?"))return;
    setWorking(true);setError("");setFeedback("");
    try{
      // First save the latest verified draft, then publish that exact database row.
      // These requests are authorized by the workspace owner and RLS.
      const result=await businessClient.from("namina_business_sites")
        .update({document:parsed.data,updated_at:new Date().toISOString()})
        .eq("id",rowId).select("id").single();
      if(result.error)throw result.error;
      setDirty(false);
      if(publish){
        const live=await businessClient.rpc("namina_business_publish_site",{p_site_id:rowId});
        if(live.error)throw live.error;
        const revision=Number(live.data);
        if(!Number.isInteger(revision)||revision<1)throw new Error("Publikasi belum terkonfirmasi.");
        setPublishedSha("db:"+revision);
        setPopup(false);
        setDesign(false);
        setPublishedLink("https://namina.biz.id/" + site.slug);
      }else{
        setFeedback("Draft berhasil disimpan. Versi publik belum berubah.");
      }
    }catch(cause){setError(cause instanceof Error?cause.message:"Tidak bisa menyimpan.");}
    finally{setWorking(false)}
  }
  async function applyViniTemplate() {
    if (!site || working) return;
    if (!window.confirm("Isi seluruh draft /" + site.slug +
      " dari contoh /vini? Nama, profesi, video, slide ikon, karya, produk, dan kontak akan diganti. Website yang sudah tayang tidak berubah sebelum dipublikasikan.")) return;
    setWorking(true); setError(""); setFeedback("");
    try {
      const template = await loadViniTemplate(site.slug);
      setSite(template);
      setDirty(true);
      setMenu("Nama"); setSelected("name");
      setPopup(false); setDesign(false);
      setFeedback("Template /vini sudah dimuat. Ganti data contoh dengan data klien, lalu tekan Simpan Draft.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak bisa memuat template /vini.");
    } finally { setWorking(false); }
  }

  const field=(label:string,value:string,update:(v:string)=>void,multiline=false)=>
    <label className="studio-v2__field"><span>{label}</span>
      {multiline?<textarea rows={4} value={value} onChange={e=>update(e.target.value)}/>:
        <input value={value} onChange={e=>update(e.target.value)}/>}
    </label>;
  const updateStyle=<K extends keyof OriginalStyle>(key:K,value:OriginalStyle[K])=>
    change(next=>{next.content.original!.style={...originalStyleDefaults,...next.content.original!.style,[key]:value}});

  function controls(){
    if(!site||!original)return null;
    if(design)return <>
      <div className="studio-v2__template-reset">
        <strong>Isi dari Template /vini</strong>
        <p>Draft klien terlanjur kosong? Salin contoh lengkap /vini: video, ikon slide, Nama, Karir, Skill, Karya, dan Produk. Perubahan hanya untuk website ini.</p>
        <button className="studio-v2__ghost" type="button" disabled={working} onClick={() => void applyViniTemplate()}>Gunakan Template /vini</button>
      </div>
      <p className="studio-v2__inspector-hint">Atur tampilan visual dari website klien ini saja.</p>
      <div className="studio-v2__template-reset">
        <strong>Pilih template warna</strong>
        <p>Ubah warna website ini tanpa mengganti konten klien.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="studio-v2__ghost" aria-pressed={style.backgroundColor.toLowerCase() === "#08080c"} onClick={() => change(next => { next.content.original!.style = { ...style, backgroundColor: "#08080c", textColor: "#fff5ed", accentColor: "#f34b53", buttonColor: "#b5232b", buttonTextColor: "#ffffff", borderColor: "#b67b78" }; })}>◐ Template Gelap</button>
          <button type="button" className="studio-v2__ghost" aria-pressed={style.backgroundColor.toLowerCase() === "#ffffff"} onClick={() => change(next => { next.content.original!.style = { ...style, backgroundColor: "#ffffff", textColor: "#191919", accentColor: "#d52e3c", buttonColor: "#c62836", buttonTextColor: "#ffffff", borderColor: "#d8d8de" }; })}>☀ Template Putih</button>
        </div>
      </div>
      <div className="studio-v2__colors">
        {(["backgroundColor","textColor","accentColor","buttonColor","buttonTextColor","borderColor"] as const).map(k=>
          <label key={k}><span>{k}</span><input type="color" value={style[k]} onChange={e=>updateStyle(k,e.target.value)}/><code>{style[k]}</code></label>)}
      </div>
      <label className="studio-v2__field"><span>Jenis font</span><select value={style.fontFamily} onChange={e=>updateStyle("fontFamily",e.target.value as OriginalStyle["fontFamily"])}>
        {["montserrat","poppins","space","cormorant","georgia","system"].map(f=><option key={f} value={f}>{f}</option>)}
      </select></label>
      {(["titleScale","bodyScale","roleScale","menuScale"] as const).map(k=>
        <label className="studio-v2__slider" key={k}><span>{k} · {(style[k]??1).toFixed(2)}</span>
          <input type="range" min=".75" max="1.5" step=".05" value={style[k]??1} onChange={e=>updateStyle(k,Number(e.target.value))}/></label>)}
      <label className="studio-v2__field"><span>Layout</span><select value={style.layoutPreset||"original"} onChange={e=>updateStyle("layoutPreset",e.target.value as OriginalStyle["layoutPreset"])}>
        <option value="original">Original</option><option value="center">Tengah</option><option value="compact">Compact</option>
      </select></label>
    </>;
    if(selected.startsWith("menu:")){
      const k=selected.slice(5) as MenuKey;
      if(!(k in placeholders))return null;
      return <>
        {field("Nama menu",original.menuTitles?.[k]||placeholders[k],v=>change(next=>{
          next.content.original!.menuTitles={...next.content.original!.menuTitles,[k]:v};
        }))}
        <label className="studio-v2__field"><span>Ikon menu</span>
          <select value={original.menuSettings?.[k]?.icon||"default"} onChange={e=>change(next=>{
            const profile=next.content.original!;
            profile.menuSettings={...profile.menuSettings,[k]:{...profile.menuSettings?.[k],icon:e.target.value as OriginalMenuIcon}};
          })}>
            {iconOptions.map(icon=><option key={icon} value={icon}>{icon}</option>)}
          </select>
        </label>
        <label className="studio-v2__slider"><span>Kecepatan slide: {original.menuSettings?.[k]?.slideSpeed??68}</span>
          <input type="range" min="0" max="150" step="5" value={original.menuSettings?.[k]?.slideSpeed??68}
            onChange={e=>change(next=>{
              const profile=next.content.original!;
              profile.menuSettings={...profile.menuSettings,[k]:{...profile.menuSettings?.[k],slideSpeed:Number(e.target.value)}};
            })}/></label>
      </>;
    }
    if(selected==="contact")return <>
      {field("Nomor WhatsApp",original.contactUrl.replace(/\D/g,"").replace(/^62/,"0"),v=>change(next=>{
        const digits=v.replace(/\D/g,"");
        next.content.original!.contactUrl=digits?"https://wa.me/"+(digits.startsWith("0")?"62"+digits.slice(1):digits):"";
      }))}
      {field("Tulisan tombol",original.contactLabel||"Japri Saya!",v=>change(next=>{next.content.original!.contactLabel=v}))}
    </>;
    if(selected==="video")return <VideoStudioPanel key={site.slug} site={site} siteId={rowId}
      onChangeVideo={url=>change(next=>{
        const previous=next.media.desktopVideo;
        next.media.desktopVideo=url;
        if(!next.media.mobileVideo || next.media.mobileVideo===previous) next.media.mobileVideo=url;
      })}
      onChangeManual={(field,url)=>change(next=>{next.media[field]=url})}
    />;
    if(fact&&factSection)return <>
      {field("Judul data",fact.label,v=>change(next=>{next.content.original![factSection].items[factIndex].label=v}))}
      {field("Isi data",fact.value,v=>change(next=>{next.content.original![factSection].items[factIndex].value=v}),true)}
      <button type="button" className="business__danger" onClick={()=>{
        change(next=>{next.content.original![factSection].items.splice(factIndex,1)});
        setPopup(false);
      }}>Hapus data</button>
    </>;
    if(card&&gallerySection)return <>
      {field("Judul kartu",card.title,v=>change(next=>{
        const item=next.content.original![gallerySection].items.find(x=>x.id===card.id);if(item)item.title=v;
      }))}
      {field("Deskripsi kartu",card.description,v=>change(next=>{
        const item=next.content.original![gallerySection].items.find(x=>x.id===card.id);if(item)item.description=v;
      }),true)}
      {field("Link tombol",card.link,v=>change(next=>{
        const item=next.content.original![gallerySection].items.find(x=>x.id===card.id);if(item)item.link=v;
      }))}
      {field("Link URL foto HTTPS",site.media.cards[card.id]||"",v=>change(next=>{next.media.cards[card.id]=v}))}
      <label className="studio-v2__slider"><span>Warna kartu</span><input type="color" value={card.color}
        onChange={e=>change(next=>{
          const item=next.content.original![gallerySection].items.find(x=>x.id===card.id);if(item)item.color=e.target.value;
        })}/></label>
      <button type="button" className="business__danger" onClick={()=>{
        change(next=>{
          next.content.original![gallerySection].items=next.content.original![gallerySection].items.filter(x=>x.id!==card.id);
          delete next.media.cards[card.id];
        });setPopup(false);
      }}>Hapus kartu</button>
    </>;
    return <p className="studio-v2__inspector-hint">Ketuk teks atau kartu langsung pada website untuk mengedit.</p>;
  }

  if(loading)return <main className="business business__loading">Memuat Studio Mitra…</main>;
  if(error&&!site)return <main className="business business__loading"><p>{error}</p><a href="/studio">Kembali ke dashboard</a></main>;

  return <main className={"studio-v2 studio-v2--fullscreen business__visual-editor" + (immersive ? " studio-v2--immersive" : "")}>
    <header className="studio-v2__workbar">
      <div className="studio-v2__workbar-left">
        <a className="studio-v2__logo" href="/studio">NAMINA<span>MITRA STUDIO</span></a>
        <span className="business__private">DRAFT PRIVAT</span>
        <strong className="business__current-slug">/{site?.slug||"…"}</strong>
      </div>
      <div className="studio-v2__device-switch" role="group" aria-label="Tampilan">
        <button className={!mobile?"is-active":""} onClick={()=>setMobile(false)} type="button">PC</button>
        <button className={mobile?"is-active":""} onClick={()=>setMobile(true)} type="button">HP</button>
        <button className="studio-v2__immersive-trigger" type="button" onClick={()=>{setImmersive(true);setPopup(false)}} title="Edit website langsung dalam layar penuh" aria-label="Edit layar penuh">⛶ <span>Layar Penuh</span></button>
      </div>
      <div className="studio-v2__workbar-right">
        <button type="button" className="studio-v2__design-trigger" onClick={()=>{setPopup(true);setDesign(true);send({type:"NAMINA_V2_CLOSE_EDITOR"})}}>Desain</button>
        <button type="button" className="studio-v2__publish-trigger" disabled={!site||!dirty||working} onClick={()=>void save(false)}>
          {working?"Memproses…":"Simpan Draft"}
        </button>
        <button type="button" className="studio-v2__publish-trigger" disabled={!site||working} onClick={()=>void save(true)}>
          Publikasikan
        </button>
        <a href="/studio" className="studio-v2__v1-link">Daftar Klien</a>
      </div>
    </header>
    {error&&<div className="business__editor-alert" role="alert">{error}</div>}
    {feedback&&<div className="business__editor-alert" role="status">{feedback}</div>}
    <div className={"studio-v2__site-workspace studio-v2__site-workspace--"+(mobile?"mobile":"desktop")}>
      <div className={"studio-v2__site-frame"+(mobile?" studio-v2__site-frame--phone":"")}>
        {mobile&&<div className="studio-v2__phone-notch" aria-hidden="true"/>}
        <iframe ref={frame} src="/studio-v2-canvas" title="Editor website pribadi" allow="autoplay; fullscreen" onLoad={()=>setReady(true)}/>
      </div>
      <div className="studio-v2__canvas-indicator"><span>{dirty?"Ada perubahan belum disimpan":"Draft tersimpan"}</span><span>·</span><span>{publishedSha?"Website telah terbit":"Belum dipublikasikan"}</span></div>
    </div>
    {immersive&&<button type="button" className="studio-v2__immersive-exit" onClick={()=>setImmersive(false)}>↙ Kembali ke Studio</button>}
    {publishedLink && <PublishSuccessModal url={publishedLink} onClose={() => setPublishedLink(null)} />}
    {popup&&site&&<div className="studio-v2__inline-popover" style={{left:popupPosition.left,top:popupPosition.top}}>
      <div className="studio-v2__inline-popover-header"><div><small>STUDIO MITRA</small><strong>{design?"Desain":selected.startsWith("menu:")?"Pengaturan menu":"Edit elemen"}</strong></div>
        <button type="button" onClick={()=>{setPopup(false);setDesign(false)}} aria-label="Tutup">×</button>
      </div>
      <div className="studio-v2__inline-popover-content">{controls()}</div>
    </div>}
  </main>;
}
