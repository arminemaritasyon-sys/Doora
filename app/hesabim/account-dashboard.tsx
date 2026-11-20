"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowLeft, ChevronRight, Ban, Check, Clock3, Flag, Pause, Play, Plus, ShieldCheck, Star, X, Pencil } from "lucide-react";
import { toast } from "sonner";
type TaskRow={id:string;title:string;description?:string|null;category?:string|null;district?:string|null;budget:string|number;status:string;created_at:string;assigned_user_id?:string|null;assigned_user_name?:string|null;assigned_user_avatar?:string|null;reviewed?:boolean;work_started_at?:string|null;completion_requested_at?:string|null};
type AssignedRow={id:string;title:string;description?:string|null;budget:string|number;status:string;owner_id:string;owner_name:string;avatar_url?:string|null;reviewed?:boolean;work_started_at?:string|null;completion_requested_at?:string|null};
type OfferRow={id:string;task_id:string;amount:string|number;status:string;created_at:string;title:string;bidder:string;bidder_id:string;avatar_url?:string|null;district?:string|null;rating?:number|string|null;review_count?:number|string|null;rejection_reason?:string|null;message?:string|null};
type Props={name:string;email:string;tasks:TaskRow[];assigned:AssignedRow[];received:OfferRow[];sentOffers:OfferRow[];taskCount:number;receivedCount:number;pendingOfferCount:number};
type Tx={id:string;type:string;amount:string|number;status:string;description:string;created_at:string};
type WalletData={account:{available_balance:string|number;held_balance:string|number;mode:string};transactions:Tx[]};
type TaskForm={title:string;description:string;category:string;budget:string;district:string};
const money=(v:number|string)=>new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2}).format(Number(v||0))+" ₺";
const dates=(v:string)=>new Intl.DateTimeFormat("tr-TR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
const taskLabel:Record<string,string>={open:"Yayında",paused:"Pasif",assigned:"Devam ediyor",completed:"Tamamlandı",disputed:"İncelemede",cancelled:"İptal"};
const txIcon:Record<string,any>={test_topup:ArrowDownLeft,escrow_lock:ShieldCheck,escrow_release:ArrowUpRight,escrow_refund:ArrowDownLeft,withdrawal_request:ArrowUpRight,withdrawal_rejected:X};
const categories=["Alışveriş","Teslimat","Ev işleri","Taşıma","Tamir","Diğer"];

function WorkProgress({started,requested,completed,disputed}:{started:boolean;requested:boolean;completed:boolean;disputed:boolean}){
 const current=completed?3:requested?2:started?1:0;
 const steps=["Kabul","Başladı","Bitti","Onay"];
 return <div className={"work-progress"+(disputed?" is-disputed":"")} aria-label={"İş aşaması: "+(disputed?"İncelemede":steps[current])}>
  <div className="work-progress-track">{steps.map((label,i)=><div className={"work-progress-step"+(i<current?" is-done":i===current&&!disputed?" is-current":"")} key={label}>
   <span className="work-progress-node">{i<current?<Check size={13}/>:i+1}</span><small>{label}</small>
  </div>)}</div>{disputed?<span className="work-progress-note">İncelemede</span>:null}
 </div>
}

export default function AccountDashboard({name,tasks,assigned,received,sentOffers,taskCount,pendingOfferCount}:Props){
 const [wallet,setWallet]=useState<WalletData|null>(null),[walletLoading,setWalletLoading]=useState(true),[walletError,setWalletError]=useState(""),[amount,setAmount]=useState(""),[iban,setIban]=useState(""),[busy,setBusy]=useState(false),[tab,setTab]=useState<"offers"|"sent">("offers"),[accountView,setAccountView]=useState<"home"|"offers"|"assigned"|"listings"|"activity">("home"),[modal,setModal]=useState<"topup"|"withdraw"|"task"|"edit"|null>(null),[editingTaskId,setEditingTaskId]=useState<string|null>(null);
 const [reviewRating,setReviewRating]=useState<Record<string,string>>({}),[reviewText,setReviewText]=useState<Record<string,string>>({}),[rejectReason,setRejectReason]=useState<Record<string,string>>({});
 const [taskForm,setTaskForm]=useState<TaskForm>({title:"",description:"",category:"Alışveriş",budget:"",district:"Muratpaşa"});
 async function loadWallet(){
  setWalletLoading(true);
  const controller=new AbortController();
  let abortTimer=0,deadlineTimer=0;
  try{
   const request=(async()=>{
    const r=await fetch("/api/wallet",{cache:"no-store",signal:controller.signal});
    const raw=await r.text();let d:any={};try{d=raw?JSON.parse(raw):{}}catch{}
    if(!r.ok)throw new Error(d.error||"Cüzdan bilgileri alınamadı.");
    if(!d?.account)throw new Error("Cüzdan verileri beklenen biçimde gelmedi.");
    return d as WalletData;
   })();
   const deadline=new Promise<never>((_,reject)=>{
    deadlineTimer=window.setTimeout(()=>{controller.abort();reject(new Error("Cüzdan yanıtı zaman aşımına uğradı. Hesap bölümlerini kullanmaya devam edebilirsin."));},7000);
   });
   abortTimer=window.setTimeout(()=>controller.abort(),7500);
   const data=await Promise.race([request,deadline]);
   setWallet(data);setWalletError("");
  }catch(e){
   setWalletError(e instanceof Error?e.message:"Cüzdan bilgileri alınamadı.");
  }finally{
   window.clearTimeout(abortTimer);
   window.clearTimeout(deadlineTimer);
   setWalletLoading(false);
  }
 }
 useEffect(()=>{loadWallet()},[]);
 useEffect(()=>{if(!modal)return;const oldOverflow=document.body.style.overflow;const oldOverscroll=document.body.style.overscrollBehavior;document.body.style.overflow="hidden";document.body.style.overscrollBehavior="none";return()=>{document.body.style.overflow=oldOverflow;document.body.style.overscrollBehavior=oldOverscroll}},[modal]);
 async function walletAction(action:"test_topup"|"withdraw"){
  const value=Number(amount);
  if(!Number.isFinite(value)||value<=0||value>50000){toast.error("1 ₺ ile 50.000 ₺ arasında geçerli bir tutar gir.");return}
  const normalizedIban=iban.replace(/\s/g,"").toUpperCase();
  if(action==="withdraw"&&!/^TR[0-9]{24}$/.test(normalizedIban)){toast.error("Geçerli bir TR IBAN gir. IBAN 26 karakter olmalı.");return}
  if(action==="withdraw"&&value>available){toast.error("Çekmek istediğin tutar kullanılabilir bakiyenden fazla.");return}
  setBusy(true);try{
   const payload=action==="test_topup"?{action,amount:value,idempotencyKey:crypto.randomUUID()}:{action,amount:value,iban:normalizedIban};
   const r=await fetch("/api/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json();
   if(!r.ok)throw new Error(d.error||"İşlem başarısız");
   toast.success(action==="test_topup"?"Test bakiyesi eklendi":"Para çekme talebin alındı");setModal(null);setAmount("");setIban("");await loadWallet();
  }catch(e){toast.error(e instanceof Error?e.message:"İşlem başarısız")}finally{setBusy(false)}
 }
 async function createTask(e:FormEvent){
  e.preventDefault();setBusy(true);try{
   const editing=modal==="edit";
   const r=await fetch(editing?"/api/tasks/"+editingTaskId:"/api/tasks",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...taskForm,budget:Number(taskForm.budget)})}),d=await r.json();
   if(!r.ok)throw new Error(d.error||(editing?"İlan güncellenemedi":"İlan oluşturulamadı"));
   toast.success(editing?"İlanın güncellendi":"İlanın yayınlandı");setModal(null);setEditingTaskId(null);location.reload();
  }catch(e){toast.error(e instanceof Error?e.message:"İşlem başarısız")}finally{setBusy(false)}
 }
 function openEditTask(task:TaskRow){setTaskForm({title:task.title,description:task.description||"",category:task.category||"Diğer",budget:String(task.budget),district:task.district||"Muratpaşa"});setEditingTaskId(task.id);setModal("edit")}
 async function taskAction(id:string,action:"pause"|"publish"|"complete"){try{const r=await fetch("/api/tasks/"+id+"/manage",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})}),d=await r.json();if(!r.ok)throw new Error(d.error);toast.success(action==="complete"?"İş tamamlandı, emanet ödeme serbest bırakıldı":"İlan durumu güncellendi");location.reload()}catch(e){toast.error(e instanceof Error?e.message:"İşlem başarısız")}}
 async function submitReview(taskId:string){try{const r=await fetch("/api/reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId,rating:Number(reviewRating[taskId]||5),comment:reviewText[taskId]||""})}),d=await r.json();if(!r.ok)throw new Error(d.error);toast.success("Değerlendirmen kaydedildi");location.reload()}catch(e){toast.error(e instanceof Error?e.message:"Değerlendirme kaydedilemedi")}}
 async function acceptOffer(id:string){try{const r=await fetch("/api/offers/"+id+"/accept",{method:"POST"}),d=await r.json();if(!r.ok)throw new Error(d.error);toast.success("Teklif kabul edildi. Tutar emanet bakiyeye alındı.");await loadWallet();location.reload()}catch(e){toast.error(e instanceof Error?e.message:"Teklif kabul edilemedi")}}
 const [rejectingOfferId,setRejectingOfferId]=useState<string|null>(null);
 async function rejectOffer(id:string){
  if(rejectingOfferId)return;
  setRejectingOfferId(id);
  try{
   const r=await fetch(`/api/offers/${encodeURIComponent(id)}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:rejectReason[id]||""})});
   const raw=await r.text();let d:any={};try{d=raw?JSON.parse(raw):{}}catch{}
   if(!r.ok)throw new Error(d.error||"Teklif reddedilemedi.");
   toast.success("Teklif reddedildi.");
   location.reload();
  }catch(e){toast.error(e instanceof Error?e.message:"Teklif reddedilemedi.");}
  finally{setRejectingOfferId(null);}
 }
 async function workflowAction(taskId:string,action:"start"|"mark_done"|"confirm_complete"|"not_done"){let reason="";if(action==="not_done"){reason=window.prompt("İşin neden tamamlanmadığını açıkla:")||"";if(reason.trim().length<5){toast.error("Lütfen en az 5 karakterlik bir açıklama yaz.");return}}try{const r=await fetch("/api/tasks/"+taskId+"/workflow",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,reason})}),d=await r.json();if(!r.ok)throw new Error(d.error);toast.success(action==="start"?"İşe başladığını bildirdin.":action==="mark_done"?"Tamamlanma bildirimi ilan sahibine gönderildi.":action==="confirm_complete"?"İş onaylandı, emanet ödeme hizmet verene aktarıldı.":"Sorun bildirimin kaydedildi.");await loadWallet();location.reload()}catch(e){toast.error(e instanceof Error?e.message:"İşlem tamamlanamadı")}}
 async function safetyAction(action:"block"|"report",userId:string,taskId?:string){if(action==="block"&&!window.confirm("Bu kullanıcıyı engellemek istiyor musun?"))return;let category="";let details="";if(action==="report"){category=window.prompt("Şikâyet nedeni (ör. uygunsuz davranış, sahte ilan, taciz):")||"";if(category.trim().length<2)return;details=window.prompt("Açıklama (isteğe bağlı):")||""}try{const r=await fetch("/api/safety",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="block"?{action,userId}:{action,userId,taskId,category,details})}),d=await r.json();if(!r.ok)throw new Error(d.error);toast.success(action==="block"?"Kullanıcı engellendi.":"Bildirimin DOORA ekibine iletildi.");}catch(e){toast.error(e instanceof Error?e.message:"İşlem tamamlanamadı")}}

 const available=Number(wallet?.account?.available_balance||0),held=Number(wallet?.account?.held_balance||0);
 return <div className="account-hub">
  <section className="account-wallet-card"><div className="account-wallet-top"><span><i>d</i> DOORA WALLET</span><span className="account-test-pill">TEST MODU</span></div><small>KULLANILABİLİR BAKİYE</small><strong>{walletLoading?"Yükleniyor…":walletError?"—":money(available)}</strong><div className="account-wallet-foot"><span><ShieldCheck size={15}/> Emanette: {walletLoading?"—":walletError?"—":money(held)}</span><span>{name||"DOORA üyesi"}</span></div>{walletError?<div className="account-wallet-error" role="alert"><span>{walletError}</span><button type="button" onClick={loadWallet} disabled={walletLoading}>Tekrar dene</button></div>:null}</section>
  <section className="account-wallet-actions account-wallet-actions-clean">
   <button disabled={busy} onClick={()=>{setAmount("");setModal("topup")}}><Plus/> Bakiye yükle</button>
   <button className="secondary" disabled={busy} onClick={()=>{setAmount("");setModal("withdraw")}}><ArrowUpRight/> Para çek</button>
   <button className="create-listing-action" disabled={busy} onClick={()=>{setTaskForm({title:"",description:"",category:"Alışveriş",budget:"",district:"Muratpaşa"});setEditingTaskId(null);setModal("task")}}><Plus/> İlan oluştur</button>
  </section>
  {accountView==="home"?<section className="account-overview" aria-label="Hesap özeti">
   <div className="account-overview-heading"><div><span>HESAP MERKEZİ</span><h2>Nasıl yardımcı olalım?</h2></div><p>İşlerini ve hesabını buradan yönet.</p></div>
   <div className="account-overview-list">
    <button type="button" onClick={()=>setAccountView("offers")}><span className="account-overview-icon offers"><Star size={19}/></span><span className="account-overview-copy"><b>Teklifler</b><small>Gelen ve gönderdiğin teklifler</small></span><span className="account-overview-count">{pendingOfferCount}</span><ChevronRight size={18}/></button>
    <button type="button" onClick={()=>setAccountView("assigned")}><span className="account-overview-icon assigned"><Check size={19}/></span><span className="account-overview-copy"><b>Üstlendiğim işler</b><small>Devam eden ve tamamlanan işler</small></span><span className="account-overview-count">{assigned.length}</span><ChevronRight size={18}/></button>
    <button type="button" onClick={()=>setAccountView("listings")}><span className="account-overview-icon listings"><Plus size={19}/></span><span className="account-overview-copy"><b>İlanlarım</b><small>Yayınladığın ve yönettiğin ilanlar</small></span><span className="account-overview-count">{taskCount}</span><ChevronRight size={18}/></button>
    <button type="button" onClick={()=>setAccountView("activity")}><span className="account-overview-icon activity"><Clock3 size={19}/></span><span className="account-overview-copy"><b>Hesap hareketleri</b><small>Cüzdan giriş ve çıkışların</small></span><ChevronRight size={18}/></button>
   </div>
   <div className="account-overview-note"><ShieldCheck size={16}/> İşlemlerini ve tüm süreçlerini tek yerden takip et.</div>
  </section>:<div className="account-detail-heading"><button type="button" onClick={()=>setAccountView("home")} aria-label="Hesap özetine dön"><ArrowLeft size={18}/></button><div><small>HESABIM</small><h2>{accountView==="offers"?"Teklifler":accountView==="assigned"?"Üstlendiğim işler":accountView==="listings"?"İlanlarım":"Hesap hareketleri"}</h2></div></div>}
  <section className={"account-section account-section-offers"+(accountView!=="offers"?" is-hidden":"")}>
   <div className="account-section-head"><div><h2>Teklifler</h2><p>İlanlarına gelen ve senin gönderdiğin teklifler.</p></div><span>{pendingOfferCount} bekleyen</span></div>
   <div className="account-tabs"><button className={tab==="offers"?"active":""} onClick={()=>setTab("offers")}>İlanlarıma gelen</button><button className={tab==="sent"?"active":""} onClick={()=>setTab("sent")}>Gönderdiğim teklifler <span>{sentOffers.length}</span></button></div>
   {tab==="offers"?<div className="account-offers">{received.length?received.map(o=><article className="account-offer-card" key={o.id}>
    <div className="account-person">{o.avatar_url?<img src={o.avatar_url} alt=""/>:<span className="account-person-avatar">{(o.bidder||"D").slice(0,1).toLocaleUpperCase("tr")}</span>}<div><b>{o.bidder||"DOORA üyesi"}</b><small>{o.district||"Konum belirtilmemiş"}</small><span className="account-rating"><Star size={14} fill="currentColor"/> {Number(o.rating||0).toFixed(1)} <em>({Number(o.review_count||0)} değerlendirme)</em></span></div></div>
    <div className="account-offer-meta"><span>{o.title}</span><strong>{money(o.amount)}</strong><small>{o.status==="accepted"?"Kabul edildi":o.status==="rejected"?"Reddedildi":"Yanıt bekliyor"}</small>{o.message?<p>{o.message}</p>:null}{o.status==="rejected"&&o.rejection_reason?<p className="offer-rejection-reason">Red nedeni: {o.rejection_reason}</p>:null}</div>
    {o.status==="pending"?<><button className="account-accept" onClick={()=>acceptOffer(o.id)}><Check size={16}/> Kabul et · Emanete al</button><label className="offer-reject-reason">Red nedeni (isteğe bağlı)<input value={rejectReason[o.id]||""} onChange={e=>setRejectReason(v=>({...v,[o.id]:e.target.value}))} maxLength={500} placeholder="Kısa bir açıklama yazabilirsin"/></label><button className="account-reject" disabled={rejectingOfferId===o.id} onClick={()=>rejectOffer(o.id)}><X size={15}/> {rejectingOfferId===o.id?"Reddediliyor…":"Teklifi reddet"}</button></>:null}
    <div className="offer-safety-actions"><button onClick={()=>safetyAction("block",o.bidder_id)}><Ban size={14}/> Engelle</button><button onClick={()=>safetyAction("report",o.bidder_id,o.task_id)}><Flag size={14}/> Şikâyet et</button></div>
   </article>):<p className="account-muted">Henüz teklif gelmedi.</p>}</div>:tab==="sent"?<div className="account-offers">{sentOffers.length?sentOffers.map(o=><article className="account-offer-card" key={o.id}><div className="account-person">{o.avatar_url?<img src={o.avatar_url} alt=""/>:<span className="account-person-avatar">{(o.bidder||"D").slice(0,1).toLocaleUpperCase("tr")}</span>}<div><b>{o.bidder||"DOORA üyesi"}</b><small>İlan sahibi</small></div></div><div className="account-offer-meta"><span>{o.title}</span><strong>{money(o.amount)}</strong><small className={o.status==="rejected"?"offer-status-rejected":o.status==="accepted"?"offer-status-accepted":"offer-status-pending"}>{o.status==="rejected"?"Teklifiniz reddedildi":o.status==="accepted"?"Teklifiniz kabul edildi":"Yanıt bekliyor"}</small>{o.message?<p>{o.message}</p>:null}{o.status==="rejected"&&o.rejection_reason?<p className="offer-rejection-reason">Red açıklaması: {o.rejection_reason}</p>:null}</div><div className="account-task-controls"><a href={"/ilan/"+o.task_id}>İlanı gör <ArrowUpRight size={14}/></a></div></article>):<p className="account-muted">Henüz bir ilana teklif göndermedin.</p>}</div>:<div className="account-muted">Teklif bulunamadı.</div>}
  </section>
  <section className={"account-section account-section-activity"+(accountView!=="activity"?" is-hidden":"")}>
   <div className="account-section-head"><div><h2>Hesap hareketleri</h2><p>Cüzdanına ait para giriş ve çıkışları.</p></div></div>
   <div className="account-transactions">{wallet?.transactions?.length?wallet.transactions.map(tx=>{const Icon=txIcon[tx.type]||Clock3;return <article key={tx.id}><span><Icon size={18}/></span><div><b>{tx.description}</b><small>{dates(tx.created_at)} · {tx.status==="pending"?"Bekliyor":"Tamamlandı"}</small></div><strong className={tx.type==="escrow_lock"||tx.type==="withdrawal_request"?"minus":"plus"}>{tx.type==="escrow_lock"||tx.type==="withdrawal_request"?"−":"+"}{money(tx.amount)}</strong></article>}):<p className="account-muted">Henüz hesap hareketi yok.</p>}</div>
  </section>
  <section className={"account-section account-section-assigned"+(accountView!=="assigned"?" is-hidden":"")}>
   <div className="account-section-head"><h2>Üstlendiğim işler</h2><span>{assigned.length} iş</span></div>
   <div className="account-card-deck">{assigned.length?assigned.map(t=><article className="account-task-card provider-task-card" key={t.id}>
    <div className="account-task-main"><span className={"account-state "+t.status}>{t.status==="completed"?"Tamamlandı":t.status==="disputed"?"İncelemede":t.completion_requested_at?"Onay bekliyor":t.work_started_at?"Devam ediyor":"Yeni iş"}</span><b>{t.title}</b><strong>{money(t.budget)}</strong><div className="account-person compact-person">{t.avatar_url?<img src={t.avatar_url} alt=""/>:<span className="account-person-avatar">{(t.owner_name||"D").slice(0,1).toLocaleUpperCase("tr")}</span>}<div><b>{t.owner_name||"DOORA üyesi"}</b><small>İşveren</small></div></div></div>
    <WorkProgress started={!!t.work_started_at} requested={!!t.completion_requested_at} completed={t.status==="completed"} disputed={t.status==="disputed"}/>
    <div className="account-task-controls work-progress-actions">
     {t.status==="assigned"&&!t.work_started_at?<button className="publish-action" onClick={()=>workflowAction(t.id,"start")}><Play size={15}/> İşe başla</button>:null}
     {t.status==="assigned"&&t.work_started_at&&!t.completion_requested_at?<button className="complete" onClick={()=>workflowAction(t.id,"mark_done")}><Check size={15}/> Tamamlandı olarak işaretle</button>:null}
     {t.status==="assigned"&&t.completion_requested_at?<span className="account-muted"><Clock3 size={14}/> İşveren onayı bekleniyor</span>:null}
     {t.status==="disputed"?<span className="account-muted">İnceleme sürecinde</span>:null}
     <a href={"/ilan/"+t.id}>Detay <ArrowUpRight size={14}/></a>
    </div>
    {t.status==="completed"&&!t.reviewed?<form className="account-review-form" onSubmit={e=>{e.preventDefault();submitReview(t.id)}}><b>Değerlendir</b><select aria-label="Puan" value={reviewRating[t.id]||"5"} onChange={e=>setReviewRating(v=>({...v,[t.id]:e.target.value}))}><option value="5">★★★★★ · 5</option><option value="4">★★★★ · 4</option><option value="3">★★★ · 3</option><option value="2">★★ · 2</option><option value="1">★ · 1</option></select><input value={reviewText[t.id]||""} onChange={e=>setReviewText(v=>({...v,[t.id]:e.target.value}))} maxLength={1000} placeholder="Yorum (isteğe bağlı)"/><button>Gönder</button></form>:null}
    <div className="offer-safety-actions"><button onClick={()=>safetyAction("block",t.owner_id)}><Ban size={14}/> Engelle</button><button onClick={()=>safetyAction("report",t.owner_id,t.id)}><Flag size={14}/> Şikâyet</button></div>
   </article>):<p className="account-muted">Henüz üstlendiğin iş yok.</p>}</div>
  </section>
  <section className={"account-section account-section-listings"+(accountView!=="listings"?" is-hidden":"")}>
   <div className="account-section-head"><h2>İlanlarım</h2><span>{taskCount} ilan</span><button className="account-inline-create" onClick={()=>{setTaskForm({title:"",description:"",category:"Alışveriş",budget:"",district:"Muratpaşa"});setModal("task")}}><Plus size={15}/> İlan oluştur</button></div>
   <div className="account-card-deck">{tasks.length?tasks.map(t=><article className="account-task-card" key={t.id}>
    <div className="account-task-main"><span className={"account-state "+t.status}>{t.status==="assigned"&&t.completion_requested_at?"Onay bekliyor":t.status==="assigned"&&t.work_started_at?"Devam ediyor":taskLabel[t.status]||t.status}</span><b>{t.title}</b><strong>{money(t.budget)}</strong></div>
    {t.assigned_user_id?<div className="account-person compact-person assigned-person">{t.assigned_user_avatar?<img src={t.assigned_user_avatar} alt=""/>:<span className="account-person-avatar">{(t.assigned_user_name||"D").slice(0,1).toLocaleUpperCase("tr")}</span>}<div><b>{t.assigned_user_name||"DOORA üyesi"}</b><small>İşi üstlenen</small></div></div>:null}
    {t.status==="assigned"||t.status==="completed"||t.status==="disputed"?<WorkProgress started={!!t.work_started_at} requested={!!t.completion_requested_at} completed={t.status==="completed"} disputed={t.status==="disputed"}/>:null}
    <div className="account-task-controls">
     {t.status==="open"?<button className="pause-action" onClick={()=>taskAction(t.id,"pause")}><Pause size={15}/> Pasife al</button>:null}
     {t.status==="paused"?<button className="publish-action" onClick={()=>taskAction(t.id,"publish")}><Play size={15}/> Aktife al</button>:null}
     {t.status==="assigned"&&!t.completion_requested_at?<span className="account-muted">{t.work_started_at?"Hizmet veren iş üzerinde çalışıyor.":"Hizmet verenin işe başlaması bekleniyor."}</span>:null}{t.status==="assigned"&&t.completion_requested_at?<><button className="complete" onClick={()=>workflowAction(t.id,"confirm_complete")}><Check size={15}/> İşi onayla · Ödemeyi aktar</button><button className="account-reject" onClick={()=>workflowAction(t.id,"not_done")}><Flag size={15}/> İş tamamlanmadı</button></>:null}{t.status==="disputed"?<span className="account-muted">İş için inceleme bildirimi açıldı.</span>:null}
     {(t.status==="open"||t.status==="paused")?<button className="edit-action" onClick={()=>openEditTask(t)}><Pencil size={14}/> Düzenle</button>:null}
     <a href={"/ilan/"+t.id}>İlanı gör <ArrowUpRight size={14}/></a>
    </div>
    {t.status==="completed"&&t.assigned_user_id&&!t.reviewed?<form className="account-review-form" onSubmit={e=>{e.preventDefault();submitReview(t.id)}}><b>İşi yapan kişiyi değerlendir</b><select aria-label="Puan" value={reviewRating[t.id]||"5"} onChange={e=>setReviewRating(v=>({...v,[t.id]:e.target.value}))}><option value="5">★★★★★ · 5</option><option value="4">★★★★ · 4</option><option value="3">★★★ · 3</option><option value="2">★★ · 2</option><option value="1">★ · 1</option></select><input value={reviewText[t.id]||""} onChange={e=>setReviewText(v=>({...v,[t.id]:e.target.value}))} maxLength={1000} placeholder="Kısa bir değerlendirme yaz (isteğe bağlı)"/><button>Değerlendirmeyi gönder</button></form>:null}
   </article>):<p className="account-muted">Henüz ilan oluşturmadın.</p>}</div>
  </section>
  <div className="account-footnote"><ShieldCheck size={15}/> TEST cüzdanıdır. Gerçek para tahsilatı ve banka ödemesi yapılmaz.</div>
  {modal&&<div className="account-modal-backdrop" onTouchMove={e=>{if(e.target===e.currentTarget)e.preventDefault()}} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setModal(null)}}>
   <section className="account-modal" role="dialog" aria-modal="true" onTouchMove={e=>e.stopPropagation()}>
    <div className="account-modal-head"><div><small>{modal==="topup"?"CÜZDAN":"DOORA"}</small><h2>{modal==="topup"?"Bakiye yükle":modal==="withdraw"?"Para çek":modal==="edit"?"İlanı düzenle":"İlan oluştur"}</h2></div><button type="button" onClick={()=>!busy&&setModal(null)} aria-label="Kapat"><X/></button></div>
    {modal==="topup"?<form className="account-modal-form" onSubmit={e=>{e.preventDefault();walletAction("test_topup")}}><label>Yüklenecek tutar (₺)<input type="number" min="1" max="50000" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Örn. 1.000" required/></label><button disabled={busy}>{busy?"İşleniyor…":"Devam et"}</button><p>Bu işlem şu anda test bakiyesi olarak kaydedilir.</p></form>:null}
    {modal==="withdraw"?<form className="account-modal-form" onSubmit={e=>{e.preventDefault();walletAction("withdraw")}}><label>IBAN<input value={iban} onChange={e=>setIban(e.target.value.toUpperCase())} placeholder="TR00 0000 0000 0000 0000 0000 00" maxLength={32} autoComplete="off" required/></label><label>Ad soyad<input value={name} readOnly aria-readonly="true"/></label><label>Çekilecek tutar (₺)<input type="number" min="1" max="50000" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Örn. 500" required/></label><button disabled={busy}>{busy?"Talep oluşturuluyor…":"Para çekme talebi oluştur"}</button><p>Ad soyad bilgisi kayıtlı profilinden alınır. İşlem test modundadır.</p></form>:null}
    {(modal==="task"||modal==="edit")?<form className="account-modal-form" onSubmit={createTask}><label>İlan başlığı<input minLength={5} maxLength={100} value={taskForm.title} onChange={e=>setTaskForm(v=>({...v,title:e.target.value}))} placeholder="Örn. Market alışverişi" required/></label><label>Kategori<select value={taskForm.category} onChange={e=>setTaskForm(v=>({...v,category:e.target.value}))}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>İşin detayı<textarea rows={3} minLength={10} value={taskForm.description} onChange={e=>setTaskForm(v=>({...v,description:e.target.value}))} placeholder="İhtiyacını kısaca anlat..." required/></label><div className="account-modal-two"><label>Bütçe (₺)<input type="number" min="1" value={taskForm.budget} onChange={e=>setTaskForm(v=>({...v,budget:e.target.value}))} placeholder="500" required/></label><label>İlçe<input value={taskForm.district} onChange={e=>setTaskForm(v=>({...v,district:e.target.value}))} required/></label></div><button disabled={busy}>{busy?(modal==="edit"?"Kaydediliyor…":"Yayınlanıyor…"):(modal==="edit"?"Değişiklikleri kaydet":"İlanı yayınla")}</button></form>:null}
   </section>
  </div>}
 </div>
}
