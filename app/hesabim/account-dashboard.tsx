"use client";
import { ArrowDownLeft, ArrowUpRight, Bookmark, BriefcaseBusiness, Plus, Search, Wallet } from "lucide-react";
import Link from "next/link";
type TaskRow={id:string;title:string;budget:string|number;status:string;created_at:string};
type OfferRow={id:string;amount:string|number;status:string;created_at:string;title:string;bidder?:string|null};
type Props={name:string;email:string;tasks:TaskRow[];received:OfferRow[];sent:OfferRow[];taskCount:number;receivedCount:number;sentCount:number;savedCount:number};
const date=(v:string)=>{const d=new Date(v);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("tr-TR",{day:"numeric",month:"short"}).format(d)};
const status:Record<string,string>={open:"Yayında",assigned:"Eşleşti",completed:"Tamamlandı",cancelled:"İptal",pending:"Bekliyor",accepted:"Kabul edildi",rejected:"Reddedildi",withdrawn:"Geri çekildi"};
export default function AccountDashboard({name,tasks,received,taskCount,receivedCount,savedCount}:Props){
 const activity=[...tasks.slice(0,3).map(x=>({id:"task-"+x.id,title:x.title,detail:"İlanın · "+(status[x.status]||"Güncellendi"),date:x.created_at,icon:"task" as const,href:"/isler"})),...received.slice(0,3).map(x=>({id:"offer-"+x.id,title:x.bidder||"Yeni teklif",detail:x.title,date:x.created_at,icon:"offer" as const,href:"/isler"}))].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,3);
 return <div className="wallet-lite">
  <section className="wallet-lite-card" aria-label="DOORA cüzdan bakiyesi">
   <div className="wallet-lite-top"><span className="wallet-lite-brand"><span className="wallet-lite-mark">d</span> DOORA</span><span className="wallet-lite-card-icon"><Wallet size={19}/></span></div>
   <span className="wallet-lite-caption">TOPLAM BAKİYE</span><div className="wallet-lite-balance">— — <small>₺</small></div>
   <div className="wallet-lite-foot"><span><i/> Cüzdan yakında</span><span>{name||"DOORA üyesi"}</span></div><div className="wallet-lite-orb"/>
  </section>
  <nav className="wallet-lite-actions" aria-label="Hızlı işlemler">
   <Link href="/#kesfet"><span className="wallet-lite-action-icon create"><Plus size={22}/></span><b>İlan oluştur</b></Link>
   <Link href="/isler"><span className="wallet-lite-action-icon"><Search size={21}/></span><b>İş keşfet</b></Link>
   <Link href="/kaydedilenler"><span className="wallet-lite-action-icon"><Bookmark size={20}/></span><b>Kaydedilenler</b><small>{savedCount}</small></Link>
  </nav>
  <section className="wallet-lite-activity"><div className="wallet-lite-section-head"><h2>Son aktiviteler</h2><Link href="/isler">Tümü <ArrowUpRight size={14}/></Link></div>
   {activity.length?<div className="wallet-lite-list">{activity.map(item=><Link href={item.href} key={item.id} className="wallet-lite-row"><span className={`wallet-lite-row-icon ${item.icon}`}>{item.icon==="task"?<BriefcaseBusiness size={18}/>:<ArrowDownLeft size={19}/>}</span><span className="wallet-lite-row-copy"><b>{item.title}</b><small>{item.detail}</small></span><time>{date(item.date)}</time><ArrowUpRight className="wallet-lite-row-arrow" size={15}/></Link>)}</div>:<div className="wallet-lite-empty">Henüz aktivite yok.</div>}
  </section>
  <div className="wallet-lite-counts"><span>{taskCount} ilan</span><i/><span>{receivedCount} gelen teklif</span></div>
 </div>;
}