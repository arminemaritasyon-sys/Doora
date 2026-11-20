"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, ArrowUpRight, Bookmark, BriefcaseBusiness, Check, ChevronDown,
  Clock3, Compass, Filter, Heart, MapPin, Menu, Plus, Search, ShieldCheck,
  ShoppingBag, Sparkles, Star, Truck, Wrench, X, Zap
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  location: string;
  time: string;
  owner: string;
  offers: number;
};

const categories = [
  { name: "Tümü", icon: Compass },
  { name: "Alışveriş", icon: ShoppingBag },
  { name: "Teslimat", icon: Truck },
  { name: "Ev işleri", icon: ShieldCheck },
  { name: "Taşıma", icon: BriefcaseBusiness },
  { name: "Tamir", icon: Wrench },
  { name: "Diğer", icon: Sparkles },
];

const money = (value: number) => new Intl.NumberFormat("tr-TR").format(value) + " ₺";

function Brand() {
  return <a className="brand" href="#top" aria-label="DOORA ana sayfa"><span className="brand-mark">d</span><span>doora<span className="brand-dot">.</span></span></a>;
}

function TaskCard({ task, saved, onSave, onOffer }: { task: Task; saved: boolean; onSave: () => void; onOffer: () => void }) {
  return (
    <article className="task-card">
      <div className="task-topline">
        <span className="category-label">{task.category}</span>
        <button className={`save-button ${saved ? "saved" : ""}`} onClick={onSave} aria-label="İlanı kaydet"><Bookmark size={18} fill={saved ? "currentColor" : "none"} /></button>
      </div>
      <h3>{task.title}</h3>
      <p className="task-description">{task.description}</p>
      <div className="task-details">
        <span><MapPin size={15} />{task.location}</span>
        <span><Clock3 size={15} />{task.time}</span>
      </div>
      <div className="task-separator" />
      <div className="task-bottom">
        <div className="person">
          <span className="avatar">{task.owner.split(" ").map((part) => part[0]).join("")}</span>
          <span><b>{task.owner || "DOORA üyesi"}</b><small>DOORA üyesi</small></span>
        </div>
        <div className="price"><strong>{money(Number(task.budget))}</strong><small>{task.offers} teklif</small></div>
      </div>
      <button className="offer-button" onClick={onOffer}>Teklif ver <ArrowUpRight size={16} /></button>
    </article>
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [category, setCategory] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("Tüm Antalya");
  const [saved, setSaved] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "Alışveriş", budget: "", location: "Muratpaşa, Antalya" });

  useEffect(() => {
    let active = true;
    fetch("/api/tasks").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (active) setTasks(data.tasks ?? []); }).catch(() => { if (active) setNotice("İlanlar şu anda yüklenemiyor."); }).finally(() => { if (active) setLoadingTasks(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    fetch("/api/saved").then((response) => response.ok ? response.json() : null).then((data) => { if (data?.taskIds) setSaved(data.taskIds); }).catch(() => undefined);
  }, []);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesCategory = category === "Tümü" || task.category === category;
    const matchesDistrict = district === "Tüm Antalya" || task.location.toLocaleLowerCase("tr").includes(district.toLocaleLowerCase("tr"));
    const text = (task.title + " " + task.description + " " + task.location).toLocaleLowerCase("tr");
    return matchesCategory && matchesDistrict && text.includes(query.toLocaleLowerCase("tr"));
  }), [tasks, category, district, query]);

  const submitTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, description: form.description, category: form.category, budget: form.budget, district: form.location.split(",")[0].trim() }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setNotice(data.error || "İlan oluşturulamadı. Giriş yaptığından emin ol."); if (response.status === 401) window.location.href = "/giris"; return; }
    setCategory("Tümü"); setQuery(""); setCreateOpen(false);
    setForm({ title: "", description: "", category: "Alışveriş", budget: "", location: "Muratpaşa, Antalya" });
    setTasks((current) => [data.task, ...current]); setNotice("İlanın yayınlandı.");
  };

  return (
    <main id="top">
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav">
            <a className="active" href="#kesfet">Keşfet</a>
            <a href="#nasil-calisir">Nasıl çalışır?</a>
            <a href="#guven">Güvenli alışveriş</a>
          </nav>
          <div className="header-actions">
            <button className="header-login" onClick={() => window.location.href = "/giris"}>Giriş yap</button>
            <button className="button button-dark header-cta" onClick={() => setCreateOpen(true)}><Plus size={17} /> İlan oluştur</button>
            <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menüyü aç">{mobileMenu ? <X /> : <Menu />}</button>
          </div>
        </div>
        {mobileMenu && <div className="mobile-menu"><a href="#kesfet" onClick={() => setMobileMenu(false)}>Keşfet</a><a href="#nasil-calisir" onClick={() => setMobileMenu(false)}>Nasıl çalışır?</a><a href="#guven" onClick={() => setMobileMenu(false)}>Güvenli alışveriş</a><button onClick={() => { setMobileMenu(false); window.location.href = "/giris"; }}>Giriş yap</button></div>}
      </header>

      {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Bildirimi kapat"><X size={16} /></button></div>}

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> GÜNLÜK İŞLER, KOLAY ÇÖZÜMLER</span>
            <h1>Sen iste.<br /><em>Birisi halleder.</em></h1>
            <p>Günlük işlerini kolayca paylaş. Yakınındaki insanlar yardımcı olsun, sen de zamanını kendine ayır.</p>
            <div className="hero-actions">
              <button className="button button-dark button-large" onClick={() => setCreateOpen(true)}>Bir iş paylaş <ArrowRight size={18} /></button>
              <a className="button button-outline button-large" href="#kesfet">İşleri keşfet</a>
            </div>
            <div className="hero-trust"><span className="trust-avatars"><i>E</i><i>M</i><i>A</i></span><span><b>Birlikte daha kolay.</b><small>İşini paylaş, çözümünü bul.</small></span></div>
          </div>
          <div className="hero-art" aria-label="DOORA iş paylaşımı görseli">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-card">
              <div className="art-card-head"><span className="art-icon"><ShoppingBag size={19} /></span><span className="art-status"><i /> Yardım aranıyor</span></div>
              <small className="art-kicker">YENİ İŞ</small>
              <h2>Market alışverişime<br />yardım eder misin?</h2>
              <div className="art-meta"><span><MapPin size={14} /> Yakınında</span><span><Clock3 size={14} /> Bugün</span></div>
              <div className="art-card-foot"><strong>250 ₺</strong><span>Teklifler bekleniyor <ArrowUpRight size={15} /></span></div>
            </div>
            <div className="floating-note note-top"><span className="note-check"><Check size={15} /></span><span><b>İşin tamam!</b><small>Birlikte çözüldü</small></span></div>
            <div className="floating-note note-bottom"><span className="note-spark"><Zap size={17} /></span><span><b>Yakınındaki insanlar</b><small>Yardım etmeye hazır</small></span></div>
            <div className="art-sparkle sparkle-one">✳</div><div className="art-sparkle sparkle-two">✳</div>
          </div>
        </div>
      </section>

      <section className="benefits">
        <div className="benefits-inner">
          <div><span className="benefit-icon"><Zap size={19} /></span><span><b>Hızlı çözüm</b><small>Beklemeden yardım bul</small></span></div>
          <div><span className="benefit-icon"><ShieldCheck size={19} /></span><span><b>Kontrol sende</b><small>Teklifleri sen değerlendir</small></span></div>
          <div><span className="benefit-icon"><Heart size={19} /></span><span><b>Birlikte kolay</b><small>Günlük işlerini paylaş</small></span></div>
        </div>
      </section>

      <section className="marketplace" id="kesfet">
        <div className="marketplace-inner">
          <div className="section-heading">
            <div><span className="eyebrow">DOORA’DA NELER OLUYOR?</span><h2>Yakınındaki işleri <em>keşfet.</em></h2><p>Birinin yardıma ihtiyacı olabilir. Belki de aradığı kişi sensin.</p></div>
            <button className="button button-dark create-desktop" onClick={() => setCreateOpen(true)}><Plus size={17} /> İşini paylaş</button>
          </div>
          <div className="search-panel">
            <div className="search-input"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ne arıyorsun?" aria-label="İş ara" /></div>
            <span className="search-divider" />
            <div className="location-select"><MapPin size={18} /><select value={district} onChange={(event) => setDistrict(event.target.value)} aria-label="Bölge seç"><option>Tüm Antalya</option><option>Muratpaşa</option><option>Konyaaltı</option><option>Kepez</option><option>Lara</option></select><ChevronDown size={15} /></div>
            <button className="filter-button" onClick={() => setNotice("Filtreleri kategori ve konum alanlarından kullanabilirsin.")}><Filter size={17} /><span>Filtrele</span></button>
          </div>
          <div className="category-list">
            {categories.map(({ name, icon: Icon }) => <button key={name} className={category === name ? "category-chip selected" : "category-chip"} onClick={() => setCategory(name)}><Icon size={16} />{name}</button>)}
          </div>
          <div className="results-heading"><div><h3>Öne çıkan işler</h3><span>{visibleTasks.length} ilan listeleniyor</span></div><span className="sample-caption">Güncel ilanlar</span></div>
          {loadingTasks ? <div className="empty-state"><p>İlanlar yükleniyor…</p></div> : visibleTasks.length ? <div className="task-grid">{visibleTasks.map((task) => <TaskCard key={task.id} task={task} saved={saved.includes(task.id)} onSave={() => { fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id }) }).then(async (response) => { const data = await response.json(); if (response.status === 401) { window.location.href = "/giris"; return; } if (response.ok) setSaved((current) => data.saved ? [...current, task.id] : current.filter((id) => id !== task.id)); else setNotice(data.error || "İlan kaydedilemedi."); }); }} onOffer={() => { const amount = window.prompt("Teklif tutarını TL olarak gir:"); if (!amount || Number(amount) <= 0) return; fetch("/api/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id, amount: Number(amount) }) }).then(async (response) => { const data = await response.json(); if (response.status === 401) { window.location.href = "/giris"; return; } setNotice(response.ok ? "Teklifin gönderildi." : data.error || "Teklif gönderilemedi."); }); }} />)}</div> : <div className="empty-state"><span><Search size={22} /></span><h3>Aradığın ilanı bulamadık</h3><p>Farklı bir kelime veya kategori deneyebilirsin.</p><button className="button button-outline" onClick={() => { setQuery(""); setCategory("Tümü"); setDistrict("Tüm Antalya"); }}>Filtreleri temizle</button></div>}
          <div className="marketplace-foot"><span>Aradığın işi bulamadın mı?</span><button onClick={() => setCreateOpen(true)}>Kendi ilanını oluştur <ArrowRight size={15} /></button></div>
        </div>
      </section>

      <section className="how" id="nasil-calisir">
        <div className="how-inner">
          <div className="center-heading"><span className="eyebrow">ÜÇ KÜÇÜK ADIM</span><h2>Bu kadar <em>kolay.</em></h2><p>İhtiyacını paylaş, teklifleri değerlendir, işini hallet.</p></div>
          <div className="steps">
            <article><span className="step-number">01</span><span className="step-icon"><Plus size={20} /></span><h3>İşini paylaş</h3><p>Yapılmasını istediğin işi ve bütçeni birkaç adımda anlat.</p></article>
            <article><span className="step-number">02</span><span className="step-icon"><MessageIcon /></span><h3>Teklifleri değerlendir</h3><p>Sana yardımcı olmak isteyen kişilerin tekliflerini incele.</p></article>
            <article><span className="step-number">03</span><span className="step-icon"><Check size={20} /></span><h3>Birlikte tamamlayın</h3><p>Sana uygun kişiyi seç ve günlük işini kolayca çöz.</p></article>
          </div>
        </div>
      </section>

      <section className="safety" id="guven">
        <div className="safety-inner"><span className="safety-icon"><ShieldCheck size={26} /></span><div><span className="eyebrow">İÇİN RAHAT OLSUN</span><h2>Kontrol her zaman sende.</h2><p>İşini kimin üstleneceğine sen karar ver. Teklifleri incele, sana en uygun çözümü seç.</p></div><button className="button button-outline" onClick={() => setNotice("DOORA’da teklifleri sen değerlendirir, seçimini sen yaparsın.")}>Daha fazla bilgi <ArrowUpRight size={16} /></button></div>
      </section>

      <footer className="footer"><div className="footer-inner"><div><Brand /><p>Günlük işler, kolay çözümler.</p></div><div className="footer-links"><a href="#kesfet">Keşfet</a><a href="#nasil-calisir">Nasıl çalışır?</a><a href="#guven">Güvenli alışveriş</a></div><small>© 2026 DOORA. Tüm hakları saklıdır.</small></div></footer>

      <nav className="mobile-bottom-nav"><a className="active" href="#kesfet"><Compass size={20} /><span>Keşfet</span></a><button onClick={() => setCreateOpen(true)}><span className="nav-plus"><Plus size={19} /></span><span>İlan ver</span></button><button onClick={() => window.location.href = "/giris"}><Bookmark size={20} /><span>Kaydedilen</span></button><button onClick={() => window.location.href = "/giris"}><span className="nav-user">D</span><span>Profil</span></button></nav>

      {createOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="modal-head"><div><span className="eyebrow">YENİ BİR BAŞLANGIÇ</span><h2 id="create-title">Nasıl bir yardıma ihtiyacın var?</h2><p>İşini kısaca anlat, sana yardımcı olabilecek kişiler görsün.</p></div><button className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Kapat"><X size={19} /></button></div><form onSubmit={submitTask}><label>İlan başlığı<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Örn. Market alışverişime yardım eder misin?" maxLength={90} required /></label><label>Kategori<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.filter((item) => item.name !== "Tümü").map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>İşin detayları<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Yapılmasını istediğin işi biraz anlat..." rows={4} required /></label><div className="form-row"><label>Belirlediğin bütçe (₺)<input type="number" min="1" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} placeholder="250" required /></label><label>Konum<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} required /></label></div><div className="modal-note"><ShieldCheck size={17} /><span>İlanın hesabınla birlikte kaydedilir. Teklif geldikçe bilgilendirilirsin.</span></div><button className="button button-dark modal-submit" type="submit">İlan önizlemesini oluştur <ArrowRight size={17} /></button></form></section></div>}
    </main>
  );
}

function MessageIcon() {
  return <span className="message-icon"><ArrowUpRight size={20} /></span>;
}
