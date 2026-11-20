"use client";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Bookmark, BriefcaseBusiness, Check, Clock3, Pause, Play, Plus, Search, ShieldCheck, Star, Wallet, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type TaskRow={id:string;title:string;budget:string|number;status:string;created_at:string;assigned_user_id?:string|null;reviewed?:boolean};
type OfferRow={id:string;task_id:string;amount:string|number;status:string;created_at:string;title:string;bidder:string;bidder_id:string;avatar_url?:string|null;district?:string|null;rating?:number|string|null;review_count?:number|string|null};
type Props={name:string;email:string;tasks:TaskRow[];received:OfferRow[];sent:OfferRow[];taskCount:number;receivedCount:number;sentCount:number;savedCount:number};
type Tx={id:string;type:string;amount:string|number;status:string;description:string;created_at:string};
type WalletData={account:{available_balance:string|number;held_balance:string|number;mode:string};transactions:Tx[]};
const money=(v:number|string)=>new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2}).format(Number(v||0))+" ₺";
const dates=(v:string)=>new Intl.DateTimeFormat("tr-TR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
const taskLabel:Record<string,string>={open:"Yayında",paused:"Pasif",assigned:"Devam ediyor",completed:"Tamamlandı",cancelled:"İptal"};
const txIcon:Record<string,any>={test_topup:ArrowDownLeft,escrow_lock:ShieldCheck,escrow_release:ArrowUpRight,escrow_refund:ArrowDownLeft,withdrawal_request:ArrowUpRight,withdrawal_rejected:X};
export default function AccountDashboard({name,tasks,received,taskCount,receivedCount,savedCount}:Props){
 const [wallet,setWallet]=useState<WalletData|null>(null); const [amount,setAmount]=useState("1000"); const [busy,setBusy]=useState(false); const [tab,setTab]=useState("offers"); const [reviewRating,setReviewRating]=useState<Record<string,string>>({}); const [reviewText,setReviewText]=useState<Record<string,string>>({});
 async function loadWallet(){const r=await fetch("/api/wallet",{cache:"no-store"});if(r.ok)setWallet(await r.json())}
 useEffect(()=>{loadWallet()},[]);
 async function walletAction(action:"test_topup"|"withdraw"){setBusy(true);try{const r=await fetch("/api/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="test_topup"?{action,amount:Number(amount),idempotencyKey:crypto.randomUUID()}:{action,amount:Number(amount)})});const d=await r.json();if(!r.ok)throw new Error(d.error||"İşlem başarısız");toast.success(action==="test_topup"?"Test bakiyesi eklendi":"Test çekim talebi oluşturuldu");await loadWallet()}catch(e){toast.error(e instanceof Error?e.message:"İşlem başarısız")}finally{setBusy(false)}}
 async function taskAction(id:string,action:"pause"|"publish"|"complete"){try{const r=await fetch("/api/tasks/"+id+"/manage",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});const d=await r.json();if(!r.ok)throw new Error(d.error);toast.success(action==="complete"?"İş tamamlandı, emanet ödeme serbest bırakıldı":"İlan durumu güncellendi");location.reload()}catch(e){toast.error(e instanceof Error?e.message:"İşlem başarısız")}}
 async function submitReview(taskId:string){try{const r=await fetch("/api/reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId,rating:Number(reviewRating[taskId]||5),comment:reviewText[taskId]||""})});const d=await r.json();if(!r.ok)throw new Error(d.error);toast.success("Değerlendirmen kaydedildi");location.reload()}catch(e){toast.error(e instanceof Error?e.message:"Değerlendirme kaydedilemedi")}}
 async function acceptOffer(id:string){try{const r=await fetch("/api/offers/"+id+"/accept",{method:"POST"});const d=await r.json();if(!r.ok)throw new Error(d.error);toast.success("Teklif kabul edildi. Tutar emanet bakiyeye alındı.");await loadWallet();location.reload()}catch(e){toast.error(e instanceof Error?e.message:"Teklif kabul edilemedi")}}
 const available=Number(wallet?.account?.available_balance||0),held=Number(wallet?.account?.held_balance||0);
 return <div className="account-hub">
  <section className="account-wallet-card">
   <div className="account-wallet-top"><span><i>d</i> DOORA WALLET</span><span className="account-test-pill">TEST MODU</span></div>
   <small>KULLANILABİLİR BAKİYE</small><strong>{money(available)}</strong>
   <div className="account-wallet-foot"><span><ShieldCheck size={15}/> Emanette: {money(held)}</span><span>{name||"DOORA üyesi"}</span></div>
  </section>
  <section className="account-wallet-actions">
   <label><span>Test tutarı (₺)</span><input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="1" max="50000" inputMode="decimal"/></label>
   <button disabled={busy} onClick={()=>walletAction("test_topup")}><Plus/> Para yükle</button>
   <button className="secondary" disabled={busy} onClick={()=>walletAction("withdraw")}><ArrowUpRight/> Çekim talebi</button>
  </section>
  <section className="account-section">
   <div className="account-section-head"><h2>İlanlarım</h2><span>{taskCount} ilan</span><Link href="/#kesfet">Yeni ilan <ArrowUpRight size={15}/></Link></div>
   {tasks.length?tasks.map(t=><article className="account-task-card" key={t.id}>
    <div className="account-task-main"><span className={"account-state "+t.status}>{taskLabel[t.status]||t.status}</span><b>{t.title}</b><strong>{money(t.budget)}</strong></div>
    <div className="account-task-controls">
     {t.status==="open"?<button onClick={()=>taskAction(t.id,"pause")}><Pause size={15}/> Pasife al</button>:null}
     {t.status==="paused"?<button onClick={()=>taskAction(t.id,"publish")}><Play size={15}/> Yayına al</button>:null}
     {t.status==="assigned"?<button className="complete" onClick={()=>taskAction(t.id,"complete")}><Check size={15}/> İşi tamamlandı</button>:null}
     <Link href={"/ilan/"+t.id}>İlanı gör <ArrowUpRight size={14}/></Link>
    </div>
    {t.status==="completed"&&t.assigned_user_id&&!t.reviewed?<form className="account-review-form" onSubmit={e=>{e.preventDefault();submitReview(t.id)}}><b>İşi yapan kişiyi değerlendir</b><select aria-label="Puan" value={reviewRating[t.id]||"5"} onChange={e=>setReviewRating(v=>({...v,[t.id]:e.target.value}))}><option value="5">★★★★★ · 5</option><option value="4">★★★★ · 4</option><option value="3">★★★ · 3</option><option value="2">★★ · 2</option><option value="1">★ · 1</option></select><input value={reviewText[t.id]||""} onChange={e=>setReviewText(v=>({...v,[t.id]:e.target.value}))} maxLength={1000} placeholder="Kısa bir değerlendirme yaz (isteğe bağlı)"/><button>Değerlendirmeyi gönder</button></form>:null}
   </article>):<p className="account-muted">Henüz ilan oluşturmadın.</p>}
  </section>
  <section className="account-section">
   <div className="account-section-head"><h2>Teklifler</h2><span>{receivedCount} gelen</span></div>
   <div className="account-tabs"><button className={tab==="offers"?"active":""} onClick={()=>setTab("offers")}>İlanlarıma gelen</button><button className={tab==="activity"?"active":""} onClick={()=>setTab("activity")}>Hesap hareketleri</button></div>
   {tab==="offers"?<div className="account-offers">
    {received.length?received.map(o=><article className="account-offer-card" key={o.id}>
      <div className="account-person">
       {o.avatar_url?<img src={o.avatar_url} alt=""/>:<span className="account-person-avatar">{(o.bidder||"D").slice(0,1).toLocaleUpperCase("tr")}</span>}
       <div><b>{o.bidder||"DOORA üyesi"}</b><small>{o.district||"Konum belirtilmemiş"}</small><span className="account-rating"><Star size={14} fill="currentColor"/> {Number(o.rating||0).toFixed(1)} <em>({Number(o.review_count||0)} değerlendirme)</em></span></div>
      </div>
      <div className="account-offer-meta"><span>{o.title}</span><strong>{money(o.amount)}</strong><small>{o.status==="accepted"?"Kabul edildi":o.status==="rejected"?"Reddedildi":"Yanıt bekliyor"}</small></div>
      {o.status==="pending"?<button className="account-accept" onClick={()=>acceptOffer(o.id)}><Check size={16}/> Kabul et · Emanete al</button>:null}
    </article>):<p className="account-muted">Henüz teklif gelmedi.</p>}
   </div>:<div className="account-transactions">
    {wallet?.transactions?.length?wallet.transactions.map(tx=>{const Icon=txIcon[tx.type]||Clock3;return <article key={tx.id}><span><Icon size={18}/></span><div><b>{tx.description}</b><small>{dates(tx.created_at)} · {tx.status==="pending"?"Bekliyor":"Tamamlandı"}</small></div><strong className={tx.type==="escrow_lock"||tx.type==="withdrawal_request"?"minus":"plus"}>{tx.type==="escrow_lock"||tx.type==="withdrawal_request"?"−":"+"}{money(tx.amount)}</strong></article>}):<p className="account-muted">Henüz hesap hareketi yok.</p>}
   </div>}
  </section>
  <div className="account-footnote"><ShieldCheck size={15}/> TEST cüzdanıdır. Gerçek para tahsilatı ve banka ödemesi yapılmaz.</div>
 </div>
}
