import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { businessClient, type BusinessWorkspace } from "../business/client";
import "../business.css";

type WorkspaceWithSites = BusinessWorkspace & { sites?: number; whatsapp_number?: string };
const allowed: BusinessWorkspace["subscription_status"][] = ["pending","active","past_due","suspended"];

export function BusinessAdmin() {
  const [user,setUser] = useState<User|null>(null);
  const [workspaces,setWorkspaces] = useState<WorkspaceWithSites[]>([]);
  const [allowedAdmin,setAllowedAdmin] = useState(false);
  const [loading,setLoading] = useState(true);
  const [working,setWorking] = useState<string|null>(null);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [newName,setNewName] = useState("");
  const [newEmail,setNewEmail] = useState("");
  const [newWhatsapp,setNewWhatsapp] = useState("");
  const [issued,setIssued] = useState<{ link:string; name:string; email:string; whatsapp:string; workspaceId:string }|null>(null);

  const refresh=async()=>{
    if(!businessClient)return;
    const response=await businessClient.from("namina_business_workspaces")
      .select("id,owner_id,display_name,whatsapp_number,plan,subscription_status,max_sites,current_period_end")
      .order("created_at",{ascending:false});
    if(response.error)throw response.error;
    const list=(response.data||[]) as WorkspaceWithSites[];
    const rows=await businessClient.from("namina_business_sites").select("workspace_id");
    if(rows.error)throw rows.error;
    const counts=new Map<string,number>();
    for(const item of rows.data||[])counts.set(item.workspace_id,(counts.get(item.workspace_id)||0)+1);
    setWorkspaces(list.map(w=>({...w,sites:counts.get(w.id)||0})));
  };
  useEffect(()=>{
    let active=true;
    if(!businessClient){setError("Supabase belum dikonfigurasi.");setLoading(false);return;}
    void (async()=>{
      const auth=await businessClient.auth.getUser();
      if(!auth.data.user){window.location.assign("/mitra");return;}
      if(!active)return;
      setUser(auth.data.user);
      const admin=await businessClient.rpc("namana_is_admin");
      if(admin.error)throw admin.error;
      if(admin.data!==true){setAllowedAdmin(false);return;}
      setAllowedAdmin(true);
      await refresh();
    })().catch((cause:Error)=>{if(active)setError(cause.message)})
      .finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);

  const setStatus=async(id:string,status:BusinessWorkspace["subscription_status"])=>{
    if(!businessClient||!allowedAdmin)return;
    setWorking(id);setError("");setMessage("");
    try{
      const result=await businessClient.rpc("namina_business_admin_set_status",{
        p_workspace_id:id,p_status:status,
      });
      if(result.error)throw result.error;
      setMessage("Status simulasi diperbarui. Ini bukan bukti pembayaran.");
      await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:"Tidak dapat mengubah status.");}
    finally{setWorking(null);}
  };

  async function issueLink(input: { action:"create"; name:string; email:string; whatsapp:string } | { action:"renew"; workspaceId:string }) {
    if(!businessClient || !allowedAdmin)return;
    const marker=input.action==="create"?"new-link":input.workspaceId;
    setWorking(marker);setError("");setMessage("");setIssued(null);
    try{
      const result=await businessClient.functions.invoke("namina-business-magic-link",{body:input});
      if(result.error)throw new Error("Layanan link belum dapat dihubungi. Periksa sesi superadmin.");
      const data=result.data as {link?:string;name?:string;email?:string;whatsapp?:string;workspaceId?:string;error?:string};
      if(data.error)throw new Error(data.error);
      if(!data.link || !data.workspaceId || !data.email)throw new Error("Link gagal dibuat.");
      setIssued({link:data.link,workspaceId:data.workspaceId,email:data.email,name:data.name||"",whatsapp:data.whatsapp||""});
      setMessage("Link pribadi berhasil dibuat. Kirim hanya kepada mitra yang bersangkutan.");
      if(input.action==="create"){setNewName("");setNewEmail("");setNewWhatsapp("");}
      await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:"Magic Link tidak dapat dibuat.");}
    finally{setWorking(null);}
  }
  function whatsappShare(link:{link:string;name:string;whatsapp:string}){
    const intro="Halo "+(link.name||"Mitra NAMINA")+", ini akses pribadi Studio NAMINA:\n\n"+
      link.link+"\n\nLink hanya sekali pakai dan memiliki masa berlaku terbatas. Jangan dibagikan ke orang lain.";
    return "https://wa.me/"+link.whatsapp+"?text="+encodeURIComponent(intro);
  }

  return <main className="business">
    <header className="business__header"><a href="/" className="business__logo">NAMINA<span>SUPERADMIN</span></a>
      <nav><a href="/mitra">Dashboard Mitra</a><a href="/studio">Studio Admin</a></nav>
    </header>
    <div className="business__shell">
      <div className="business__eyebrow">PANEL KHUSUS PEMILIK NAMINA</div>
      <h1>Kelola mitra bisnis.</h1>
      <p className="business__lead">Aktivasi pada tahap ini hanya simulasi internal. Pembayaran Rp87.000/bulan belum diintegrasikan dan tidak boleh dianggap sudah diterima.</p>
      {loading?<p className="business__notice">Memeriksa izin superadmin…</p>:
        !allowedAdmin?<div className="business__section"><h2>Akses terbatas</h2><p>Panel ini hanya tersedia untuk superadmin NAMINA yang login melalui Supabase Auth.</p></div>:
        <>
          <section className="business__section">
            <div className="business__section-head"><h2>+ Daftarkan Mitra Baru</h2><span>Tanpa password</span></div>
            <form className="business__invite-form" onSubmit={e=>{
              e.preventDefault();
              void issueLink({action:"create",name:newName.trim(),email:newEmail.trim(),whatsapp:newWhatsapp});
            }}>
              <label>Nama mitra
                <input required minLength={2} maxLength={100} value={newName}
                  onChange={e=>setNewName(e.target.value)} placeholder="Nama mitra atau bisnis" />
              </label>
              <label>Email mitra
                <input required type="email" maxLength={254} value={newEmail}
                  onChange={e=>setNewEmail(e.target.value)} placeholder="nama@email.com" />
              </label>
              <label>Nomor WhatsApp
                <input required type="tel" value={newWhatsapp}
                  onChange={e=>setNewWhatsapp(e.target.value)} placeholder="08xxxxxxxxxx" />
              </label>
              <button className="business__primary" disabled={!!working} type="submit">
                {working==="new-link"?"Membuat Link…":"Buat Magic Link"}
              </button>
            </form>
            <p className="business__fineprint">Mitra baru tetap Menunggu Aktivasi sampai paketnya diaktifkan. Tidak ada biaya yang ditagihkan otomatis.</p>
          </section>
          {issued&&<section className="business__issued" role="status">
            <div className="business__section-head"><h2>Link untuk {issued.name||issued.email}</h2><span>Sekali pakai</span></div>
            <p>Link bersifat rahasia dan hanya dapat digunakan satu kali. Jangan dikirim ke grup.</p>
            <input aria-label="Magic Link pribadi" readOnly value={issued.link} onFocus={e=>e.target.select()}/>
            <div className="business__issued-actions">
              <button className="business__primary" type="button" onClick={()=>{
                void navigator.clipboard.writeText(issued.link)
                  .then(()=>setMessage("Link tersalin."))
                  .catch(()=>setMessage("Salin link dari kolom secara manual."));
              }}>Salin Link</button>
              {issued.whatsapp&&<a className="business__primary" target="_blank" rel="noopener noreferrer"
                href={whatsappShare(issued)}>Kirim WhatsApp</a>}
              <button className="business__secondary" type="button" onClick={()=>setIssued(null)}>Sembunyikan</button>
            </div>
          </section>}
          <section className="business__section">
            <div className="business__section-head"><h2>Daftar workspace mitra</h2><span>{workspaces.length} akun</span></div>
            {workspaces.length===0?<p className="business__empty">Belum ada akun mitra terdaftar.</p>:
              <div className="business__admin-list">
                {workspaces.map(w=><div key={w.id} className="business__admin-row">
                  <div><strong>{w.display_name||"Mitra belum mengisi nama"}</strong>
                    <small>WhatsApp: {w.whatsapp_number||"Belum tercatat"} · Website: {w.sites||0}/{w.max_sites}</small>
                    <button type="button" className="business__secondary" disabled={!!working}
                      onClick={()=>void issueLink({action:"renew",workspaceId:w.id})}>
                      {working===w.id?"Memproses…":"Kirim Link Baru"}
                    </button>
                    <small>Status: {w.subscription_status} · Berakhir: {w.current_period_end?new Date(w.current_period_end).toLocaleDateString("id-ID"):"—"}</small>
                  </div>
                  <label>Simulasi status
                    <select disabled={working===w.id} value={w.subscription_status}
                      onChange={e=>void setStatus(w.id,e.target.value as BusinessWorkspace["subscription_status"])}>
                      {allowed.map(status=><option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                </div>)}
              </div>}
          </section>
          <p className="business__fineprint">Hak akses ditentukan di server oleh role superadmin, bukan dari menu yang terlihat di browser. Status active simulasi berlaku 30 hari dan belum memotong pembayaran.</p>
        </>}
      {user&&<p className="business__fineprint">Login: {user.email}</p>}
      {message&&<p className="business__success" role="status">{message}</p>}
      {error&&<p className="business__error" role="alert">{error}</p>}
    </div>
  </main>;
}
