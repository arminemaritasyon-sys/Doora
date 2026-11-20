"use client";
import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";

export default function TaskSafetyActions({taskId,ownerId}:{taskId:string;ownerId:string}) {
  const [busy,setBusy]=useState(false);
  async function report() {
    const category=window.prompt("Şikâyet nedeni (uygunsuz ilan, sahte içerik, yasaklı hizmet vb.):")||"";
    if(category.trim().length<2)return;
    const details=window.prompt("Açıklama (isteğe bağlı):")||"";
    setBusy(true);
    try {
      const response=await fetch("/api/safety",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"report",userId:ownerId,taskId,category,details})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Bildirim gönderilemedi.");
      toast.success("İlan bildirimin DOORA ekibine iletildi.");
    } catch(error) { toast.error(error instanceof Error?error.message:"Bildirim gönderilemedi."); }
    finally { setBusy(false); }
  }
  return <button className="task-report-action" onClick={report} disabled={busy}><Flag size={15}/>{busy?"Gönderiliyor…":"Uygunsuz ilanı bildir"}</button>;
}
