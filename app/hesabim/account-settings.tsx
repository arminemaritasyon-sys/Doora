"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Settings, X, Camera, Bell, UserRound, MapPin, Check } from "lucide-react";
import { toast } from "sonner";

type Profile = { name:string; avatarUrl:string; district:string; bio:string; notifications:{taskUpdates:boolean;offerUpdates:boolean;walletUpdates:boolean;productUpdates:boolean} };
const defaults:Profile={name:"",avatarUrl:"",district:"",bio:"",notifications:{taskUpdates:true,offerUpdates:true,walletUpdates:true,productUpdates:false}};

export default function AccountSettings({name,email}:{name:string;email:string}) {
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[profile,setProfile]=useState<Profile>({...defaults,name});
  const fileRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(!open)return;let alive=true;(async()=>{setLoading(true);try{const r=await fetch("/api/profile",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);if(alive)setProfile({...defaults,...d.profile,notifications:{...defaults.notifications,...d.profile?.notifications}})}catch(e){toast.error(e instanceof Error?e.message:"Profil bilgileri alınamadı")}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[open]);
  useEffect(()=>{if(!open)return;const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=old}},[open]);
  function photoChanged(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast.error("PNG, JPG veya WEBP fotoğraf seç.");e.target.value="";return}if(file.size>20*1024*1024){toast.error("Daha küçük bir fotoğraf seç (20 MB altında).");e.target.value="";return}const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{const scale=Math.min(1,1600/Math.max(image.width,image.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const context=canvas.getContext("2d");if(!context){toast.error("Fotoğraf işlenemedi.");return}context.drawImage(image,0,0,canvas.width,canvas.height);setProfile(p=>({...p,avatarUrl:canvas.toDataURL("image/jpeg",0.84)}))};image.onerror=()=>toast.error("Fotoğraf okunamadı.");image.src=String(reader.result||"")};reader.readAsDataURL(file)}
  async function save(){setLoading(true);try{const r=await fetch("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)});const d=await r.json();if(!r.ok)throw new Error(d.error);toast.success("Profil ve ayarların kaydedildi.");setOpen(false)}catch(e){toast.error(e instanceof Error?e.message:"Kaydedilemedi")}finally{setLoading(false)}}
  const toggle=(key:keyof Profile["notifications"],label:string,description:string)=><label className="settings-toggle"><span><b>{label}</b><small>{description}</small></span><input type="checkbox" checked={profile.notifications[key]} onChange={e=>setProfile(p=>({...p,notifications:{...p.notifications,[key]:e.target.checked}}))}/><i/></label>;
  return <>
    <button className="account-settings-trigger" onClick={()=>setOpen(true)} aria-label="Hesap ayarları"><Settings size={19}/></button>
    {open&&<div className="account-settings-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!loading)setOpen(false)}}>
      <section className="account-settings-panel" role="dialog" aria-modal="true" aria-label="Hesap ayarları">
        <header><div><small>DOORA HESABI</small><h2>Profil ve ayarlar</h2></div><button onClick={()=>setOpen(false)} aria-label="Kapat"><X/></button></header>
        {loading?<div className="settings-loading">Yükleniyor…</div>:<>
          <div className="settings-profile-photo"><button type="button" onClick={()=>fileRef.current?.click()}>{profile.avatarUrl?<img src={profile.avatarUrl} alt="Profil fotoğrafı"/>:<UserRound size={30}/>}<span><Camera size={15}/></span></button><div><b>Profil fotoğrafı</b><small>JPG, PNG veya WEBP · Otomatik optimize edilir</small><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={photoChanged} hidden/></div></div>
          <div className="settings-fields"><label>Ad soyad<input value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} maxLength={100} placeholder="Adın ve soyadın"/></label><label>E-posta<input value={email} readOnly/></label><label><MapPin size={15}/> İlçe<input value={profile.district} onChange={e=>setProfile(p=>({...p,district:e.target.value}))} maxLength={100} placeholder="Örn. Muratpaşa"/></label><label>Hakkımda<textarea value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} maxLength={500} rows={3} placeholder="Kendinden kısaca bahset…"/></label></div>
          <div className="settings-notifications"><div className="settings-section-title"><Bell size={17}/><div><b>Bildirim tercihleri</b><small>Hangi konularda haber almak istediğini seç.</small></div></div>
            {toggle("taskUpdates","İş ve ilan güncellemeleri","İlan durumundaki değişiklikler")}
            {toggle("offerUpdates","Teklif bildirimleri","Yeni teklif ve teklif yanıtları")}
            {toggle("walletUpdates","Cüzdan hareketleri","Bakiye ve ödeme hareketleri")}
            {toggle("productUpdates","Duyuru ve yenilikler","DOORA haberleri ve kampanyalar")}
          </div>
          <button className="settings-save" onClick={save} disabled={loading||profile.name.trim().length<2}>{loading?"Kaydediliyor…":<><Check size={17}/> Değişiklikleri kaydet</>}</button>
        </>}
      </section>
    </div>}
  </>;
}
