"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Bookmark, Check, ChevronDown, Clock3, Compass, MapPin, Search, UserRound, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id:string; owner_id?:string; owner_verified?:boolean; title:string; description:string; category:string; budget:number;
  location:string; time:string; owner:string; owner_avatar?:string|null; offers:number; created_at?:string;
};
const categories=["Tümü","Alışveriş","Teslimat","Ev işleri","Taşıma","Tamir","Diğer"];
const money=(v:number)=>new Intl.NumberFormat("tr-TR").format(Number(v))+" ₺";

function OfferSheet({task,onClose,onSubmit,busy}:{task:Task;onClose:()=>void;onSubmit:(amount:string,message:string)=>void;busy:boolean}){
  const [amount,setAmount]=useState("");
  const [message,setMessage]=useState("");
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn)},[onClose]);
  return <div className="jobs-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <motion.section className="jobs-sheet" role="dialog" aria-modal="true" aria-labelledby="offer-title" initial={{y:35,opacity:0}} animate={{y:0,opacity:1}} exit={{y:25,opacity:0}}>
      <div className="jobs-sheet-grab"/>
      <div className="jobs-sheet-head"><div><span className="jobs-kicker">TEKLİF VER</span><h2 id="offer-title">{task.title}</h2></div><button className="jobs-close" onClick={onClose} aria-label="Kapat"><X/></button></div>
      <div className="jobs-sheet-budget"><span>İlan bütçesi</span><strong>{money(task.budget)}</strong></div>
      <form onSubmit={e=>{e.preventDefault();onSubmit(amount,message)}} className="jobs-offer-form">
        <label>Teklif tutarın (₺)<input type="number" min="1" max="10000000" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Örn. 450"/></label>
        <label>Mesajın <span>İsteğe bağlı</span><textarea rows={3} maxLength={1000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="İşi nasıl yapabileceğini kısaca anlat."/></label>
        <button className="jobs-submit" disabled={busy}>{busy?"Gönderiliyor…":"Teklifi gönder"} <ArrowUpRight size={18}/></button>
      </form>
    </motion.section>
  </div>
}

export default function JobsPage(){
  const [tasks,setTasks]=useState<Task[]>([]);
  const [nearbyTasks,setNearbyTasks]=useState<Task[]>([]);
  const [nearbyDistrict,setNearbyDistrict]=useState<string|null>(null);
  const [saved,setSaved]=useState<string[]>([]);
  const [signedIn,setSignedIn]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("Tümü");
  const [sort,setSort]=useState("newest");
  const [offerTask,setOfferTask]=useState<Task|null>(null);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{let live=true;fetch("/api/tasks/nearby",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(live&&d){setNearbyTasks(d.tasks||[]);setNearbyDistrict(d.district||null)}}).catch(()=>{});Promise.all([
    fetch("/api/tasks").then(r=>{if(!r.ok)throw new Error("İşler alınamadı");return r.json()}),
    fetch("/api/saved").then(r=>r.ok?r.json():null).catch(()=>null),
    fetch("/api/auth/get-session").then(r=>r.ok?r.json():null).catch(()=>null)
  ]).then(([t,s,session])=>{if(!live)return;setTasks(t.tasks??[]);setSaved(s?.taskIds??[]);setSignedIn(Boolean(session?.user))}).catch(()=>{if(live)setError(true)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);

  const visible=useMemo(()=>tasks.filter(t=>(category==="Tümü"||t.category===category)&&((t.title+" "+t.description+" "+t.location).toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")))).sort((a,b)=>sort==="low"?Number(a.budget)-Number(b.budget):sort==="high"?Number(b.budget)-Number(a.budget):new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()),[tasks,category,query,sort]);

  async function toggleSave(id:string){
    if(!signedIn){window.location.href="/giris?next="+encodeURIComponent("/isler");return}
    try{const r=await fetch("/api/saved",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:id})});const d=await r.json();if(r.status===401){window.location.href="/giris?next="+encodeURIComponent("/isler");return}if(!r.ok)throw new Error(d.error||"Kaydedilemedi");setSaved(v=>d.saved?[...v,id]:v.filter(x=>x!==id));toast.success(d.saved?"İş kaydedildi":"Kayıtlardan çıkarıldı")}catch(e){toast.error(e instanceof Error?e.message:"İşlem tamamlanamadı")}
  }
  async function submitOffer(amount:string,message:string){
    if(!offerTask)return;setBusy(true);
    try{const r=await fetch("/api/offers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:offerTask.id,amount:Number(amount),message})});const d=await r.json();if(r.status===401){window.location.href="/giris?next="+encodeURIComponent("/isler");return}if(!r.ok)throw new Error(d.error||"Teklif gönderilemedi");setOfferTask(null);toast.success("Teklifin ilan sahibine iletildi")}catch(e){toast.error(e instanceof Error?e.message:"Teklif gönderilemedi")}finally{setBusy(false)}
  }

  return <main className="jobs-page">
    <header className="jobs-topbar"><a className="brand" href="/" aria-label="DOORA ana sayfa"><span className="brand-mark">d</span><span>doora<span className="brand-dot">.</span></span></a><a className="jobs-top-account" href={signedIn?"/hesabim":"/giris?next=%2Fhesabim"}>{signedIn?"Hesabım":"Giriş yap"} <ArrowUpRight size={15}/></a></header>
    <section className="jobs-content">
      <div className="jobs-intro"><h1>İşler</h1><span className="jobs-total">{tasks.length} açık iş</span></div>
      {nearbyTasks.length>0?<section className="nearby-jobs"><div className="nearby-jobs-head"><div><small>ÇEVRENDEKİ FIRSATLAR</small><h2>Yakınındaki işler</h2><p><MapPin size={13}/>{nearbyDistrict}</p></div><span>{nearbyTasks.length} ilan</span></div><div className="nearby-jobs-scroll">{nearbyTasks.map(task=><article className="nearby-job-card" key={task.id}><span>{task.category}</span><b>{task.title}</b><small><MapPin size={13}/>{task.location}</small><strong>{money(task.budget)}</strong><button onClick={()=>setOfferTask(task)}>Ben yaparım <ArrowUpRight size={14}/></button></article>)}</div></section>:signedIn&&!nearbyDistrict?<div className="nearby-location-hint"><MapPin size={16}/> Yakınındaki işleri görmek için <a href="/hesabim">profil ayarlarından ilçeni ekle.</a></div>:null}
      <div className="jobs-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="İş veya konum ara..." aria-label="İş ara"/>{query&&<button onClick={()=>setQuery("")} aria-label="Aramayı temizle"><X size={17}/></button>}</div>
      <div className="jobs-filter-row"><div className="jobs-category-scroll">{categories.map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c}</button>)}</div></div>
      <div className="jobs-list-head"><label><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sıralama"><option value="newest">En yeni</option><option value="low">Bütçe: düşük</option><option value="high">Bütçe: yüksek</option></select><ChevronDown size={14}/></label></div>
      {loading?<div className="jobs-loading">{[1,2,3].map(n=><div key={n}/>)}</div>:error?<div className="jobs-empty"><span>İşler yüklenemedi</span><p>Bağlantını kontrol edip tekrar deneyebilirsin.</p><button onClick={()=>location.reload()}>Tekrar dene</button></div>:visible.length===0?<div className="jobs-empty"><span>Henüz uygun iş yok</span><p>Aramanı veya kategori seçimini değiştirebilirsin.</p></div>:
      <div className="jobs-list">{visible.map((task,i)=><motion.article className="job-row" key={task.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.025,.15)}}>
        <div className="job-row-top"><span className="job-category">{task.category}</span><button className={saved.includes(task.id)?"job-save saved":"job-save"} onClick={()=>toggleSave(task.id)} aria-label="İşi kaydet"><Bookmark size={18} fill={saved.includes(task.id)?"currentColor":"none"}/></button></div>
        <h3><a className="task-title-link" href={"/ilan/"+task.id}>{task.title}</a></h3><p className="job-description">{task.description}</p>
        <div className="job-details"><span><MapPin size={15}/>{task.location}</span><span><Clock3 size={15}/>{task.time||"Yeni ilan"}</span><span>{task.offers} teklif</span></div>
        <div className="job-owner"><span className="job-owner-avatar">{task.owner_avatar?<img src={task.owner_avatar} alt="" loading="lazy" decoding="async"/>:(task.owner||"D").slice(0,1).toLocaleUpperCase("tr")}</span><span><small>İLAN SAHİBİ</small><b>{task.owner||"DOORA üyesi"} {task.owner_verified?<span className="provider-verified-mini" title="Doğrulanmış kullanıcı"><ShieldCheck size={12}/></span>:null}</b><a className="job-provider-link" href={task.owner_id?"/hizmet-veren/"+task.owner_id:"#"}>Profili gör</a></span></div>
        <div className="job-row-bottom"><div><small>Bütçe</small><strong>{money(task.budget)}</strong></div><button onClick={()=>setOfferTask(task)}>Ben yaparım <ArrowUpRight size={16}/></button></div>
      </motion.article>)}</div>}
    </section>
    <nav className="mobile-dock jobs-dock"><a href="/#kesfet"><Compass/><span>Keşfet</span></a><a className="dock-active" href="/isler"><span className="dock-money-icon">₺</span><span>İşler</span></a><a href={signedIn?"/kaydedilenler":"/giris?next=%2Fkaydedilenler"}><Bookmark/><span>Kaydedilen</span></a><a href={signedIn?"/hesabim":"/giris?next=%2Fhesabim"}><UserRound/><span>Hesabım</span></a></nav>
    <AnimatePresence>{offerTask&&<OfferSheet task={offerTask} onClose={()=>setOfferTask(null)} onSubmit={submitOffer} busy={busy}/>}</AnimatePresence>
  </main>
}
