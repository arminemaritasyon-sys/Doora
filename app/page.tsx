"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, Bookmark, BriefcaseBusiness, Check,
  ChevronDown, Clock3, Compass, Filter, Heart, MapPin, Menu, Plus, Search,
  ShieldCheck, ShoppingBag, Truck, UserRound, Wrench, X, Zap
} from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string; title: string; description: string; category: string; budget: number;
  location: string; time: string; owner: string; offers: number; created_at?: string;
};
const categories = [
  { name: "Tümü", icon: Compass }, { name: "Alışveriş", icon: ShoppingBag },
  { name: "Teslimat", icon: Truck }, { name: "Ev işleri", icon: BriefcaseBusiness },
  { name: "Taşıma", icon: ArrowDownUp }, { name: "Tamir", icon: Wrench }, { name: "Diğer", icon: Zap },
];
const money = (value: number) => new Intl.NumberFormat("tr-TR").format(value) + " ₺";

function Brand() {
  return <a className="brand" href="/" aria-label="DOORA ana sayfa"><span className="brand-mark">d</span><span>doora<span className="brand-dot">.</span></span></a>;
}
function TaskCard({ task, saved, onSave, onOffer }: { task: Task; saved: boolean; onSave: () => void; onOffer: () => void }) {
  return <motion.article className="task-card" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}>
    <div className="task-card-top"><span className="task-category">{task.category}</span><button className={`icon-button save-button ${saved ? "is-saved" : ""}`} onClick={onSave} aria-label="Kaydet"><Bookmark size={18} fill={saved ? "currentColor" : "none"} /></button></div>
    <h3>{task.title}</h3><p className="task-description">{task.description}</p>
    <div className="task-meta"><span><MapPin size={15}/>{task.location}</span><span><Clock3 size={15}/>{task.time || "Yeni ilan"}</span></div>
    <div className="task-card-bottom"><div className="task-owner"><span className="avatar">{(task.owner || "D").slice(0,1).toLocaleUpperCase("tr")}</span><span><b>{task.owner || "DOORA üyesi"}</b><small>{task.offers} teklif</small></span></div><strong className="task-price">{money(Number(task.budget))}</strong></div>
    <button className="task-offer" onClick={onOffer}>Teklif ver <ArrowUpRight size={16}/></button>
  </motion.article>;
}
function TaskDialog({ onClose, onSubmit, busy }: { onClose: () => void; onSubmit: (data: {title:string;description:string;category:string;budget:string;district:string}) => void; busy: boolean }) {
  const [form, setForm] = useState({ title:"", description:"", category:"Alışveriş", budget:"", district:"Muratpaşa" });
  const set = (key: keyof typeof form, value: string) => setForm(current => ({...current,[key]:value}));
  useEffect(()=>{const handleKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};window.addEventListener("keydown",handleKeyDown);return()=>window.removeEventListener("keydown",handleKeyDown);},[onClose]);
  return <div className="dialog-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) onClose(); }}>
    <motion.section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title" initial={{opacity:0,y:20,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:.98}}>
      <div className="dialog-heading"><div><span className="eyebrow">YENİ İLAN</span><h2 id="task-dialog-title">Ne yapılmasını istersin?</h2></div><button className="icon-button" onClick={onClose} aria-label="Kapat"><X/></button></div>
      <form className="task-form" onSubmit={e => {e.preventDefault();onSubmit(form);}}>
        <label>İlan başlığı<input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Örn. Market alışverişi" minLength={5} maxLength={100} required /></label>
        <label>Kategori<select value={form.category} onChange={e=>set("category",e.target.value)}>{categories.filter(c=>c.name!=="Tümü").map(c=><option key={c.name}>{c.name}</option>)}</select></label>
        <label>İşin detayı<textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="İhtiyacını kısaca anlat..." minLength={10} rows={3} required /></label>
        <div className="form-two"><label>Bütçe (₺)<input type="number" min="1" value={form.budget} onChange={e=>set("budget",e.target.value)} placeholder="500" required /></label><label>İlçe<input value={form.district} onChange={e=>set("district",e.target.value)} placeholder="Muratpaşa" required /></label></div>
        <button className="button button-primary button-full" disabled={busy}>{busy ? "Yayınlanıyor…" : "İlanı yayınla"}<ArrowRight size={17}/></button>
      </form>
    </motion.section>
  </div>;
}
function OfferDialog({ task, onClose, onSubmit, busy }: { task: Task; onClose: () => void; onSubmit: (amount: string, message: string) => void; busy: boolean }) {
  const [amount,setAmount]=useState(""); const [message,setMessage]=useState("");
  useEffect(()=>{const handleKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};window.addEventListener("keydown",handleKeyDown);return()=>window.removeEventListener("keydown",handleKeyDown);},[onClose]);
  return <div className="dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><motion.section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="offer-dialog-title" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}>
    <div className="dialog-heading"><div><span className="eyebrow">TEKLİFİNİ GÖNDER</span><h2 id="offer-dialog-title">{task.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Kapat"><X/></button></div>
    <form className="task-form" onSubmit={e=>{e.preventDefault();onSubmit(amount,message);}}>
      <label>Teklif tutarı (₺)<input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Teklifin" required /></label>
      <label>Mesaj <span className="optional-label">İsteğe bağlı</span><textarea rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Kısaca kendinden ve çözümünden bahset..." maxLength={1000}/></label>
      <button className="button button-primary button-full" disabled={busy}>{busy?"Gönderiliyor…":"Teklifi gönder"}<ArrowRight size={17}/></button>
    </form>
  </motion.section></div>;
}
export default function Home() {
  const [tasks,setTasks]=useState<Task[]>([]); const [saved,setSaved]=useState<string[]>([]);
  const [loading,setLoading]=useState(true); const [loadError,setLoadError]=useState(false); const [refreshKey,setRefreshKey]=useState(0); const [query,setQuery]=useState("");
  const [category,setCategory]=useState("Tümü"); const [district,setDistrict]=useState("Tüm Antalya"); const [sort,setSort]=useState("newest");
  const [createOpen,setCreateOpen]=useState(false); const [offerTask,setOfferTask]=useState<Task|null>(null);
  const [busy,setBusy]=useState(false); const [menuOpen,setMenuOpen]=useState(false);
  const [signedIn,setSignedIn]=useState(false);
  useEffect(()=>{let active=true;setLoading(true);setLoadError(false);Promise.all([
    fetch("/api/tasks").then(r=>{if(!r.ok)throw new Error("İlanlar yüklenemedi");return r.json();}),
    fetch("/api/saved").then(r=>r.ok?r.json():null).catch(()=>null),
    fetch("/api/auth/get-session").then(r=>r.ok?r.json():null).catch(()=>null)
  ]).then(([taskData,savedData,session])=>{if(!active)return;setTasks(taskData.tasks??[]);setSaved(savedData?.taskIds??[]);setSignedIn(Boolean(session?.user));}).catch(()=>{if(active){setLoadError(true);toast.error("İlanlar şu anda yüklenemiyor.");}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[refreshKey]);
  const visible=useMemo(()=>tasks.filter(t=>{
    const text=(t.title+" "+t.description+" "+t.location).toLocaleLowerCase("tr");
    return (category==="Tümü"||t.category===category)&&(district==="Tüm Antalya"||t.location.toLocaleLowerCase("tr").includes(district.toLocaleLowerCase("tr")))&&text.includes(query.toLocaleLowerCase("tr"));
  }).sort((a,b)=>sort==="budget-low"?Number(a.budget)-Number(b.budget):sort==="budget-high"?Number(b.budget)-Number(a.budget):new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()),[tasks,category,district,query,sort]);
  async function saveTask(taskId:string){if(!signedIn){window.location.href="/giris";return;}try{const r=await fetch("/api/saved",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId})});const data=await r.json();if(r.status===401){window.location.href="/giris";return;}if(!r.ok)throw new Error(data.error);setSaved(s=>data.saved?[...s,taskId]:s.filter(id=>id!==taskId));toast.success(data.saved?"Kaydedilenlere eklendi":"Kaydedilenlerden çıkarıldı");}catch(e){toast.error(e instanceof Error?e.message:"İşlem tamamlanamadı");}}
  async function createTask(data:{title:string;description:string;category:string;budget:string;district:string}){setBusy(true);try{const r=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const result=await r.json();if(r.status===401){window.location.href="/giris";return;}if(!r.ok)throw new Error(result.error||"İlan oluşturulamadı");setTasks(current=>[result.task,...current]);setCreateOpen(false);toast.success("İlanın yayınlandı");}catch(e){toast.error(e instanceof Error?e.message:"İlan oluşturulamadı");}finally{setBusy(false);}}
  async function sendOffer(amount:string,message:string){if(!offerTask)return;setBusy(true);try{const r=await fetch("/api/offers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:offerTask.id,amount:Number(amount),message})});const data=await r.json();if(r.status===401){window.location.href="/giris";return;}if(!r.ok)throw new Error(data.error||"Teklif gönderilemedi");setOfferTask(null);toast.success("Teklifin gönderildi");}catch(e){toast.error(e instanceof Error?e.message:"Teklif gönderilemedi");}finally{setBusy(false);}}
  return <main className="app-shell">
    <header className="app-header"><div className="header-inner"><Brand/><nav className="main-nav"><a className="active" href="#kesfet">Keşfet</a><a href="#nasil-calisir">Nasıl çalışır?</a></nav><div className="header-actions"><a className="header-account" href={signedIn?"/hesabim":"/giris"}><span>{signedIn?"Hesabım":"Giriş yap"}</span></a><button className="button button-primary header-create" onClick={()=>setCreateOpen(true)}><Plus size={17}/>İlan oluştur</button><button className="icon-button mobile-menu-toggle" onClick={()=>setMenuOpen(v=>!v)} aria-label="Menü">{menuOpen?<X/>:<Menu/>}</button></div></div>
      <AnimatePresence>{menuOpen&&<motion.div className="mobile-menu" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><a href="#kesfet" onClick={()=>setMenuOpen(false)}>Keşfet</a><a href="#nasil-calisir" onClick={()=>setMenuOpen(false)}>Nasıl çalışır?</a><a href={signedIn?"/hesabim":"/giris"}>Hesabım</a></motion.div>}</AnimatePresence>
    </header>
    <section className="hero-section"><div className="hero-inner"><div className="hero-copy"><span className="eyebrow"><span className="status-dot"/> GÜNLÜK İŞLER İÇİN YENİ BİR YOL</span><h1>İşin mi var?<br/><span>DOORA var.</span></h1><p>İhtiyacını paylaş. Yakınındaki insanlar yardımcı olsun. Günlük işler, kolayca çözülsün.</p><div className="hero-buttons"><button className="button button-primary button-large" onClick={()=>setCreateOpen(true)}>İşini paylaş<ArrowRight size={18}/></button><a className="button button-secondary button-large" href="#kesfet">İşleri keşfet</a></div><div className="hero-proof"><span className="proof-icon"><ShieldCheck size={17}/></span><span>Teklifleri sen değerlendirirsin.</span></div></div>
      <div className="hero-visual" aria-hidden="true"><div className="visual-grid"/><div className="visual-ring ring-a"/><div className="visual-ring ring-b"/><div className="visual-card"><div className="visual-card-top"><span className="visual-tag">YENİ İLAN</span><span className="visual-live"><i/>Yayında</span></div><span className="visual-icon"><ShoppingBag size={23}/></span><h2>Market alışverişi</h2><p>Bugün · Muratpaşa</p><div className="visual-card-bottom"><strong>350 ₺</strong><span>Teklif bekliyor <ArrowUpRight size={15}/></span></div></div><div className="visual-floating float-one"><span><Check size={16}/></span><b>İşin tamamlandı</b></div><div className="visual-floating float-two"><span><Zap size={16}/></span><b>Yakınında çözüm var</b></div></div>
    </div></section>
    <section className="quick-points"><div><span><Zap size={18}/></span><b>Hızlı paylaşım</b></div><div><span><ShieldCheck size={18}/></span><b>Seçim sende</b></div><div><span><Heart size={18}/></span><b>Kolay iletişim</b></div></section>
    <section className="market-section" id="kesfet"><div className="section-wrap"><div className="section-title-row"><div><span className="eyebrow">DOORA PAZARYERİ</span><h2>Yakınındaki <span>işler.</span></h2></div><button className="button button-primary desktop-create" onClick={()=>setCreateOpen(true)}><Plus size={17}/>İlan oluştur</button></div>
      <div className="search-toolbar"><div className="search-field"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="İlanlarda ara..." aria-label="İlanlarda ara"/></div><span className="toolbar-divider"/><div className="district-field"><MapPin size={17}/><select value={district} onChange={e=>setDistrict(e.target.value)} aria-label="İlçe seç"><option>Tüm Antalya</option><option>Muratpaşa</option><option>Konyaaltı</option><option>Kepez</option><option>Aksu</option><option>Döşemealtı</option></select><ChevronDown size={15}/></div><button className="filter-control" onClick={()=>{setCategory("Tümü");setDistrict("Tüm Antalya");setQuery("");}}><Filter size={17}/><span>Temizle</span></button></div>
      <div className="category-row">{categories.map(({name,icon:Icon})=><button key={name} className={category===name?"category-pill selected":"category-pill"} onClick={()=>setCategory(name)}><Icon size={16}/>{name}</button>)}</div>
      <div className="listing-heading"><div><h3>Güncel ilanlar</h3><span>{visible.length} sonuç</span></div><label className="sort-control"><span>Sırala</span><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="İlanları sırala"><option value="newest">En yeni</option><option value="budget-low">En düşük bütçe</option><option value="budget-high">En yüksek bütçe</option></select><ChevronDown size={14}/></label></div>
      {loading?<div className="loading-grid">{[1,2,3].map(n=><div className="skeleton-card" key={n}/>)}</div>:loadError?<div className="empty-state load-error"><span><X size={23}/></span><h3>İlanlar yüklenemedi</h3><p>Bağlantını kontrol edip tekrar deneyebilirsin.</p><button className="button button-primary" onClick={()=>setRefreshKey(v=>v+1)}>Tekrar dene <ArrowRight size={16}/></button></div>:visible.length?<motion.div className="task-grid" layout>{visible.map(task=><TaskCard key={task.id} task={task} saved={saved.includes(task.id)} onSave={()=>saveTask(task.id)} onOffer={()=>setOfferTask(task)}/>)}</motion.div>:<div className="empty-state"><span><Search size={23}/></span><h3>Burada henüz ilan yok</h3><p>Aramanı değiştirebilir veya ilk ilanı sen oluşturabilirsin.</p><button className="button button-primary" onClick={()=>setCreateOpen(true)}>İlan oluştur<Plus size={16}/></button></div>}
    </div></section>
    <section className="how-section" id="nasil-calisir"><div className="section-wrap"><div className="how-heading"><span className="eyebrow">ÜÇ ADIMDA</span><h2>Bu kadar <span>kolay.</span></h2></div><div className="how-grid"><article><span className="how-number">01</span><span className="how-icon"><Plus/></span><h3>İşini paylaş</h3><p>İhtiyacını ve bütçeni yaz, ilanını yayınla.</p></article><article><span className="how-number">02</span><span className="how-icon"><ArrowUpRight/></span><h3>Teklifleri incele</h3><p>Sana yardımcı olmak isteyenleri değerlendir.</p></article><article><span className="how-number">03</span><span className="how-icon"><Check/></span><h3>İşini tamamla</h3><p>Sana uygun kişiyle anlaş, işini çöz.</p></article></div></div></section>
    <footer className="app-footer"><div className="footer-inner"><div><Brand/><span>Günlük işler, kolay çözümler.</span></div><div className="footer-links"><a href="#kesfet">Keşfet</a><a href="#nasil-calisir">Nasıl çalışır?</a><a href="/giris">Hesap</a></div><small>© 2026 DOORA</small></div></footer>
    <nav className="mobile-dock"><a className="dock-active" href="#kesfet"><Compass/><span>Keşfet</span></a><a href="/isler"><span className="dock-money-icon" aria-hidden="true">₺</span><span>İşler</span></a><a href={signedIn?"/kaydedilenler":"/giris"}><Bookmark/><span>Kaydedilen</span></a><a href={signedIn?"/hesabim":"/giris"}><UserRound/><span>Hesabım</span></a></nav>
    <AnimatePresence>{createOpen&&<TaskDialog onClose={()=>setCreateOpen(false)} onSubmit={createTask} busy={busy}/>}</AnimatePresence>
    <AnimatePresence>{offerTask&&<OfferDialog task={offerTask} onClose={()=>setOfferTask(null)} onSubmit={sendOffer} busy={busy}/>}</AnimatePresence>
  </main>;
}
