"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, Bookmark, BriefcaseBusiness,
  CheckCircle2, Clock3, CreditCard, LockKeyhole, MessageCircle, Plus,
  Send, ShieldCheck, Sparkles
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
  return <div className="wallet-empty"><span><Sparkles size={22}/></span><strong>{title}</strong><p>{description}</p><Link href={href}>{label}<ArrowUpRight size={16}/></Link></div>;
}
function TaskList({items}:{items:TaskRow[]}){
  return items.length ? <div className="wallet-activity-list">{items.map(item=><article key={item.id}>
    <span className="wallet-activity-icon task"><BriefcaseBusiness size={20}/></span>
    <div className="wallet-activity-main"><strong>{item.title}</strong><small>{date(item.created_at)} <i/> <em className={`wallet-status ${badge(item.status)}`}>{status[item.status]||item.status}</em></small></div>
    <b>{money(item.budget)}</b>
  </article>)}</div> : <Empty title="Henüz ilan oluşturmadın" description="İhtiyacını paylaş, sana uygun kişilerden teklifler al." href="/#kesfet" label="İlan oluştur"/>;
}
function OfferList({items,received}:{items:OfferRow[];received?:boolean}){
  return items.length ? <div className="wallet-activity-list">{items.map(item=><article key={item.id}>
    <span className="wallet-activity-icon offer"><MessageCircle size={20}/></span>
    <div className="wallet-activity-main"><strong>{received ? (item.bidder||"DOORA üyesi")+" · " : ""}{item.title}</strong><small>{date(item.created_at)} <i/> <em className={`wallet-status ${badge(item.status)}`}>{status[item.status]||item.status}</em></small></div>
    <b>{money(item.amount)}</b>
  </article>)}</div> : <Empty title={received?"Henüz teklif almadın":"Henüz teklif vermedin"} description={received?"İlanların yayınlandığında gelen teklifler burada listelenir.":"Sana uygun bir işe teklif vererek başlayabilirsin."} href="/isler" label="İşleri keşfet"/>;
}

export default function AccountDashboard({name,email,tasks,received,sent,taskCount,receivedCount,sentCount,savedCount}:Props){
  const initial=(name||"D").trim().slice(0,1).toLocaleUpperCase("tr");
  return <div className="wallet-page">
    <motion.section className="wallet-card" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.45}}>
      <div className="wallet-card-pattern"/><div className="wallet-card-glow"/>
      <div className="wallet-card-top"><div className="wallet-brand"><span className="wallet-brand-mark">d</span><span>DOORA <small>WALLET</small></span></div><span className="wallet-secure"><ShieldCheck size={15}/> Güvenli alan</span></div>
      <div className="wallet-balance-block"><span className="wallet-label">CÜZDAN BAKİYESİ</span><div className="wallet-balance">— — <small>₺</small></div><div className="wallet-state"><span/> Cüzdan özelliği henüz aktif değil</div></div>
      <div className="wallet-card-bottom"><div><span>HESAP SAHİBİ</span><strong>{name||"DOORA üyesi"}</strong></div><div className="wallet-chip"><CreditCard size={25}/></div></div>
      <div className="wallet-card-watermark">DOORA</div>
    </motion.section>

    <section className="wallet-shortcuts" aria-label="Hızlı işlemler">
      <Link href="/#kesfet" className="wallet-shortcut primary"><span><Plus size={22}/></span><strong>İlan oluştur</strong><small>Yeni talep paylaş</small></Link>
      <Link href="/isler" className="wallet-shortcut"><span><ArrowDownLeft size={22}/></span><strong>İşleri keşfet</strong><small>Yeni fırsatları gör</small></Link>
      <Link href="/kaydedilenler" className="wallet-shortcut"><span><Bookmark size={22}/></span><strong>Kaydedilenler</strong><small>{savedCount} kayıtlı iş</small></Link>
      <a href="#wallet-activity" className="wallet-shortcut"><span><ArrowUpRight size={22}/></span><strong>Hareketlerim</strong><small>Hesap geçmişin</small></a>
    </section>

    <section className="wallet-overview">
      <div className="wallet-section-title"><div><span>GENEL BAKIŞ</span><h2>Hesap özeti</h2></div><span className="wallet-live-label"><i/> Güncel</span></div>
      <div className="wallet-stats">
        <article><span className="wallet-stat-icon"><BriefcaseBusiness size={21}/></span><div><small>İlanlarım</small><strong>{taskCount}</strong><em>oluşturduğun ilan</em></div></article>
        <article><span className="wallet-stat-icon green"><ArrowDownLeft size={21}/></span><div><small>Gelen teklifler</small><strong>{receivedCount}</strong><em>aldığın teklif</em></div></article>
        <article><span className="wallet-stat-icon violet"><Send size={21}/></span><div><small>Verdiğim teklifler</small><strong>{sentCount}</strong><em>gönderdiğin teklif</em></div></article>
      </div>
    </section>

    <section className="wallet-activity" id="wallet-activity">
      <div className="wallet-section-title"><div><span>HESAP GEÇMİŞİ</span><h2>Son hareketlerin</h2></div><span className="wallet-history-note"><Clock3 size={15}/> Son kayıtlar</span></div>
      <Tabs.Root defaultValue="overview" className="wallet-tabs">
        <Tabs.List className="wallet-tabs-list" aria-label="Hesap hareketleri">
          <Tabs.Trigger value="overview">Genel</Tabs.Trigger>
          <Tabs.Trigger value="tasks">İlanlar <span>{taskCount}</span></Tabs.Trigger>
          <Tabs.Trigger value="received">Gelen teklifler <span>{receivedCount}</span></Tabs.Trigger>
          <Tabs.Trigger value="sent">Gönderilen <span>{sentCount}</span></Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview" className="wallet-tab-panel">
          <div className="wallet-recent-grid">
            <section className="wallet-list-card"><div className="wallet-list-heading"><div><h3>Son ilanların</h3><p>Yayınladığın işler</p></div><BriefcaseBusiness size={20}/></div><TaskList items={tasks.slice(0,3)}/><Link className="wallet-text-link" href="/isler">İşlerini gör <ArrowRight size={16}/></Link></section>
            <section className="wallet-list-card"><div className="wallet-list-heading"><div><h3>Gelen teklifler</h3><p>İşlerin için gelen teklifler</p></div><MessageCircle size={20}/></div><OfferList items={received.slice(0,3)} received/><Link className="wallet-text-link" href="/isler">Tüm tekliflerini gör <ArrowRight size={16}/></Link></section>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tasks" className="wallet-tab-panel"><div className="wallet-list-card"><div className="wallet-list-heading"><div><h3>Oluşturduğun ilanlar</h3><p>{taskCount} ilan kaydı</p></div><BriefcaseBusiness size={20}/></div><TaskList items={tasks}/></div></Tabs.Content>
        <Tabs.Content value="received" className="wallet-tab-panel"><div className="wallet-list-card"><div className="wallet-list-heading"><div><h3>İlanlarına gelen teklifler</h3><p>{receivedCount} teklif kaydı</p></div><MessageCircle size={20}/></div><OfferList items={received} received/></div></Tabs.Content>
        <Tabs.Content value="sent" className="wallet-tab-panel"><div className="wallet-list-card"><div className="wallet-list-heading"><div><h3>Gönderdiğin teklifler</h3><p>{sentCount} teklif kaydı</p></div><Send size={20}/></div><OfferList items={sent}/></div></Tabs.Content>
      </Tabs.Root>
    </section>

    <section className="wallet-profile-strip"><div className="wallet-profile-avatar">{initial}</div><div className="wallet-profile-info"><strong>{name||"DOORA üyesi"}</strong><span>{email}</span></div><div className="wallet-profile-verified"><CheckCircle2 size={17}/> Aktif hesap</div><LockKeyhole size={18} className="wallet-profile-lock"/></section>
    <p className="wallet-disclaimer">Cüzdan bakiyesi ve para transferi özellikleri kullanıma açıldığında burada görüntülenecektir.</p>
  </div>;
}
