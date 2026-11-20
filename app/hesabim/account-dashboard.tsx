"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import {
  ArrowUpRight, Bookmark, BriefcaseBusiness, CheckCircle2, Clock3,
  MessageCircle, Send, Sparkles, Wallet
} from "lucide-react";
import Link from "next/link";

type TaskRow = { id:string; title:string; budget:string|number; status:string; created_at:string };
type OfferRow = { id:string; amount:string|number; status:string; created_at:string; title:string; bidder?:string|null };
type Props = {
  name:string; email:string;
  tasks:TaskRow[]; received:OfferRow[]; sent:OfferRow[];
  taskCount:number; receivedCount:number; sentCount:number; savedCount:number;
};
const money=(v:string|number)=>new Intl.NumberFormat("tr-TR").format(Number(v))+" ₺";
const date=(v:string)=>{const d=new Date(v);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("tr-TR",{day:"numeric",month:"short",year:"numeric"}).format(d)};
const status:Record<string,string>={open:"Yayında",assigned:"Eşleşti",completed:"Tamamlandı",cancelled:"İptal edildi",pending:"Bekliyor",accepted:"Kabul edildi",rejected:"Reddedildi",withdrawn:"Geri çekildi"};
const badge=(s:string)=>s==="completed"||s==="accepted"?"positive":s==="cancelled"||s==="rejected"?"negative":s==="open"?"live":"neutral";

function Empty({title,description,href,label}:{title:string;description:string;href:string;label:string}){
  return <div className="account-zero"><span><Sparkles size={19}/></span><strong>{title}</strong><p>{description}</p><Link href={href}>{label} <ArrowUpRight size={15}/></Link></div>;
}
function TaskList({items}:{items:TaskRow[]}){
  return items.length ? <div className="account-activity-list">{items.map(item=><article key={item.id}>
    <span className="activity-icon"><BriefcaseBusiness size={18}/></span><div className="activity-main"><strong>{item.title}</strong><small>{date(item.created_at)} <i/> <em className={`status-pill ${badge(item.status)}`}>{status[item.status]||item.status}</em></small></div><b>{money(item.budget)}</b>
  </article>)}</div> : <Empty title="Henüz ilan oluşturmadın" description="İhtiyacını paylaş, sana uygun kişilerden teklifler al." href="/#kesfet" label="İlk ilanını oluştur"/> ;
}
function OfferList({items,received}:{items:OfferRow[];received?:boolean}){
  return items.length ? <div className="account-activity-list">{items.map(item=><article key={item.id}>
    <span className="activity-icon offer"><MessageCircle size={18}/></span><div className="activity-main"><strong>{received ? (item.bidder||"DOORA üyesi")+" · " : ""}{item.title}</strong><small>{date(item.created_at)} <i/> <em className={`status-pill ${badge(item.status)}`}>{status[item.status]||item.status}</em></small></div><b>{money(item.amount)}</b>
  </article>)}</div> : <Empty title={received?"Henüz teklif almadın":"Henüz teklif vermedin"} description={received?"İlanların yayınlandığında gelen teklifler burada listelenir.":"Sana uygun bir işe teklif vererek başlayabilirsin."} href="/isler" label="İşleri keşfet"/> ;
}

export default function AccountDashboard({name,email,tasks,received,sent,taskCount,receivedCount,sentCount,savedCount}:Props){
  const initial=(name||"D").trim().slice(0,1).toLocaleUpperCase("tr");
  return <div className="account-dashboard">
    <motion.section className="account-profile-hero" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
      <div className="profile-hero-orb orb-one"/><div className="profile-hero-orb orb-two"/>
      <div className="profile-hero-content"><div className="profile-avatar-large">{initial}</div><div className="profile-hero-copy"><span className="account-eyebrow">DOORA HESABIN</span><h1>Merhaba, {name||"DOORA üyesi"}</h1><p>{email}</p></div></div>
      <div className="profile-hero-foot"><span><CheckCircle2 size={15}/> Hesabın aktif</span><span>DOORA topluluğunun bir parçasısın</span></div>
    </motion.section>

    <section className="account-metrics" aria-label="Hesap özeti">
      <article><span className="metric-icon"><BriefcaseBusiness size={18}/></span><div><small>Oluşturduğun ilan</small><strong>{taskCount}</strong></div><span className="metric-caption">Toplam</span></article>
      <article><span className="metric-icon green"><MessageCircle size={18}/></span><div><small>Gelen teklifler</small><strong>{receivedCount}</strong></div><span className="metric-caption">Toplam</span></article>
      <article><span className="metric-icon lilac"><Send size={18}/></span><div><small>Verdiğin teklifler</small><strong>{sentCount}</strong></div><span className="metric-caption">Toplam</span></article>
      <Link href="/kaydedilenler" className="metric-saved"><span className="metric-icon yellow"><Bookmark size={18}/></span><div><small>Kaydedilen işler</small><strong>{savedCount}</strong></div><ArrowUpRight className="metric-arrow" size={16}/></Link>
    </section>

    <section className="account-workspace">
      <div className="account-workspace-heading"><div><span className="account-eyebrow">ÇALIŞMA ALANIN</span><h2>Hesap hareketlerin</h2><p>İlanlarını ve tekliflerini tek yerden takip et.</p></div><Link href="/isler" className="workspace-link">Yeni işler bul <ArrowUpRight size={16}/></Link></div>
      <Tabs.Root defaultValue="overview" className="account-tabs">
        <Tabs.List className="account-tabs-list" aria-label="Hesap hareketleri">
          <Tabs.Trigger value="overview">Genel bakış</Tabs.Trigger>
          <Tabs.Trigger value="tasks">İlanlarım <span>{taskCount}</span></Tabs.Trigger>
          <Tabs.Trigger value="received">Gelen teklifler <span>{receivedCount}</span></Tabs.Trigger>
          <Tabs.Trigger value="sent">Verdiklerim <span>{sentCount}</span></Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview" className="account-tab-panel">
          <div className="overview-grid">
            <section className="overview-card"><div className="overview-card-head"><div><span className="account-eyebrow">SON İLANLAR</span><h3>İlanların</h3></div><BriefcaseBusiness size={19}/></div><TaskList items={tasks.slice(0,3)}/><button className="text-action" onClick={()=>document.querySelector<HTMLButtonElement>('[data-state][value="tasks"]')?.click()}>Tüm ilanları gör <ArrowUpRight size={15}/></button></section>
            <section className="overview-card"><div className="overview-card-head"><div><span className="account-eyebrow">SON TEKLİFLER</span><h3>Teklif trafiğin</h3></div><MessageCircle size={19}/></div><OfferList items={received.slice(0,3)} received/><Link className="text-action" href="/isler">Yeni işlere göz at <ArrowUpRight size={15}/></Link></section>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tasks" className="account-tab-panel"><div className="account-list-panel"><div className="list-panel-heading"><div><h3>Oluşturduğun ilanlar</h3><p>{taskCount} ilan kaydı</p></div><Wallet size={20}/></div><TaskList items={tasks}/></div></Tabs.Content>
        <Tabs.Content value="received" className="account-tab-panel"><div className="account-list-panel"><div className="list-panel-heading"><div><h3>İlanlarına gelen teklifler</h3><p>{receivedCount} teklif kaydı</p></div><MessageCircle size={20}/></div><OfferList items={received} received/></div></Tabs.Content>
        <Tabs.Content value="sent" className="account-tab-panel"><div className="account-list-panel"><div className="list-panel-heading"><div><h3>Gönderdiğin teklifler</h3><p>{sentCount} teklif kaydı</p></div><Send size={20}/></div><OfferList items={sent}/></div></Tabs.Content>
      </Tabs.Root>
    </section>
    <div className="account-bottom-note"><Clock3 size={15}/> Hesap hareketlerin güncel veritabanı kayıtlarından gösterilir.</div>
  </div>;
}
