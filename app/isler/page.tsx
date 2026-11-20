"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Bookmark, BriefcaseBusiness, Check, ChevronDown, Clock3, Compass, MapPin, Search, SlidersHorizontal, UserRound, X } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id:string; title:string; description:string; category:string; budget:number;
  location:string; time:string; owner:string; offers:number; created_at?:string;
};
const categories=["Tümü","Alışveriş","Teslimat","Ev işleri","Taşıma","Tamir","Diğer"];
const money=(v:number)=>new Intl.NumberFormat("tr-TR").format(Number(v))+" ₺";

function OfferSheet({task,onClose,onSubmit,busy}:{task:Task;onClose:()=>void;onSubmit:(amount:string,message:string)=>void;busy:boolean}){
  const [amount,setAmount]=useState(""); const [message,setMessage]=useState("");
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn)},[onClose]);
  return <div className="jobs-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <motion.section className="jobs-sheet" role="dialog" aria-modal="true" aria-labelledby="offer-title" initial={{y:35,opacity:0}} animate={{y:0,opacity:1}} exit={{y:25,opacity:0}}>
      <div className="jobs-sheet-grab"/><div className="jobs-sheet-head"><div><span className="jobs-kicker">TEKLİFİNİ GÖNDER</span><h2 id="offer-title">{task.title}</h2></div><button className="jobs-close" onClick={onClose} aria-label="Kapat"><X/></button></div>
      <div className="jobs-sheet-budget"><span>İlan bütçesi</span><strong>{money(task.budget)}</strong></div>
      <form onSubmit={e=>{e.preventDefault();onSubmit(amount,message)}} className="jobs-offer-form">
        <label>Teklif tutarın (₺)<input type="number" min="1" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Örn. 450"/></label>
        <label>İlan sahibine mesaj <span>İsteğe bağlı</span><textarea rows={3} maxLength={1000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Bu işi nasıl yapabileceğini kısaca anlat."/></label>
        <button className="jobs-submit" disabled={busy}>{busy?"Gönderiliyor…":"Teklifi gönder"} <ArrowUpRight size={18}/></button>
      </form>
    </motion.section>
  </div>
}

export default function JobsPage(){
  const [tasks,setTasks]=useState<Task[]>([]); const [saved,setSaved]=useState<string[]>([]);
  const [signedIn,setSignedIn]=useState(false); const [loading,setLoading]=useState(true); const [error,setError]=useState(false);
  const [query,setQuery]=useState(""); const [category,setCategory]=useState("Tümü"); const [sort,setSort]=useState("newest");
  const [offerTask,setOfferTask]=useState<Task|null>(null); const [busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;Promise.all([
    fetch("/api/tasks").then(r=>{if(!r.ok)throw new Error("İşler alınamadı");return r.json()}),
    fetch("/api/saved").then(r=>r.ok?r.json():null).catch(()=>null),
    fetch("/api/auth/get-session").then(r=>r.ok?r.json():null).catch(()=>null)
  ]).then(([t,s,session])=>{if(!live)return;setTasks(t.tasks??[]);setSaved(s?.taskIds??[]);setSignedIn(Boolean(session?.user))}).catch(()=>{if(live)setError(true)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
  const visible=useMemo(()=>tasks.filter(t=>(category==="Tümü"||t.category===category)&&((t.title+" "+t.description+" "+t.location).toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")))).sort((a,b)=>sort==="low"?Number(a.budget)-Number(b.budget):sort==="high"?Number(b.budget)-Number(a.budget):new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()),[tasks,category,query,sort]);
  async function toggleSave(id:string){if(!signedIn){window.location.href="/giris";return}try{const r=await fetch("/api/saved",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:id})});const d=await r.json();if(r.status===401){window.location.href="/giris";return}if(!r.ok)throw new Error(d.error||"Kaydedilemedi");setSaved(v=>d.saved?[...v,id]:v.filter(x=>x!==id));toast.success(d.saved?"İş kaydedildi":"Kayıtlardan çıkarıldı")}catch(e){toast.error(e instanceof Error?e.message:"İşlem tamamlanamadı")}}
  async function submitOffer(amount:string,message:string){if(!offerTask)return;setBusy(true);try{const r=await fetch("/api/offers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:offerTask.id,amount:Number(amount),message})});const d=await r.json();if(r.status===401){window.location.href="/giris";return}if(!r.ok)throw new Error(d.error||"Teklif gönderilemedi");setOfferTask(null);toast.success("Teklifin ilan sahibine iletildi")}catch(e){toast.error(e instanceof Error?e.message:"Teklif gönderilemedi")}finally{setBusy(false)}}
  return <main className="jobs-page">
    <header className="jobs-topbar"><a className="brand" href="/" aria-label="DOORA ana sayfa"><span className="brand-mark">d</span><span>doora<span className="brand-dot">.</span></span></a><a className="jobs-top-account" href={signedIn?"/hesabim":"/giris"}>{signedIn?"Hesabım":"Giriş yap"} <ArrowUpRight size={15}/></a></header>
    <section className="jobs-content">
      <div className="jobs-intro"><div><span className="jobs-kicker"><i/> DOORA İŞ PANOSU</span><h1>Yakınındaki <em>işler.</em></h1><p>Yayındaki işleri incele, sana uygun olana teklif ver.</p></div><div className="jobs-count"><BriefcaseBusiness size={18}/><span>{tasks.length} açık iş</span></div></div>
      <div className="jobs-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="İş veya konum ara..." aria-label="İş ara"/>{query&&<button onClick={()=>setQuery("")} aria-label="Aramayı temizle"><X size={17}/></button>}</div>
      <div className="jobs-category-scroll">{categories.map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c}</button>)}</div>
      <div className="jobs-list-head"><div><h2>Yayındaki işler</h2><span>{visible.length} iş listeleniyor</span></div><label><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sıralama"><option value="newest">En yeni</option><option value="low">Bütçe: düşük</option><option value="high">Bütçe: yüksek</option></select><ChevronDown size={14}/></label></div>
      {loading?<div className="jobs-loading">{[1,2,3,4].map(n=><div key={n}/>)}</div>:error?<div className="jobs-empty"><span>Bağlantı kurulamadı</span><p>İşler şu anda yüklenemiyor.</p><button onClick={()=>location.reload()}>Tekrar dene</button></div>:visible.length===0?<div className="jobs-empty"><span>Şu an uygun iş bulunamadı.</span><p>Aramanı veya kategori seçimini değiştirebilirsin.</p></div>:
      <div className="jobs-list">{visible.map((task,i)=><motion.article className="job-row" key={task.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.035,.2)}}>
        <div className="job-row-top"><span className="job-category">{task.category}</span><button className={saved.includes(task.id)?"job-save saved":"job-save"} onClick={()=>toggleSave(task.id)} aria-label="İşi kaydet"><Bookmark size={18} fill={saved.includes(task.id)?"currentColor":"none"}/></button></div>
        <h3>{task.title}</h3><p className="job-description">{task.description}</p>
        <div className="job-details"><span><MapPin size={15}/>{task.location}</span><span><Clock3 size={15}/>{task.time||"Yeni ilan"}</span><span><BriefcaseBusiness size={15}/>{task.offers} teklif</span></div>
        <div className="job-row-bottom"><div><small>İş için ayrılan bütçe</small><strong>{money(task.budget)}</strong></div><button onClick={()=>setOfferTask(task)}>Teklif ver <ArrowUpRight size={17}/></button></div>
      </motion.article>)}</div>}
      <div className="jobs-note"><span><Check size={16}/></span><p>Teklifleri ilan sahibi değerlendirir. Sana uygun işleri seçip teklifini gönderebilirsin.</p></div>
    </section>
    <nav className="mobile-dock jobs-dock"><a href="/#kesfet"><Compass/><span>Keşfet</span></a><a className="dock-active" href="/isler"><BriefcaseBusiness/><span>İşler</span></a><a href={signedIn?"/kaydedilenler":"/giris"}><Bookmark/><span>Kaydedilen</span></a><a href={signedIn?"/hesabim":"/giris"}><UserRound/><span>Hesabım</span></a></nav>
    <AnimatePresence>{offerTask&&<OfferSheet task={offerTask} onClose={()=>setOfferTask(null)} onSubmit={submitOffer} busy={busy}/>}</AnimatePresence>
  </main>
}
