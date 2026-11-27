import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { createNotification } from "@/lib/notifications";
const schema = z.object({ idempotencyKey: z.string().uuid() });
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
 const {id}=await context.params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"İlan bulunamadı."},{status:404});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"İşlem anahtarı geçersiz."},{status:400});
 try{
  const [result]=await db`SELECT * FROM public.doora_feature_task(${user.id},${id}::uuid,25,${parsed.data.idempotencyKey})`;
  if(!result)throw new Error("Öne çıkarma işlemi tamamlanamadı.");
  if(!result.already_processed)await createNotification({userId:user.id,preference:"task_updates",type:"task_promoted",title:"İlanın öne çıkarıldı",body:"İlanın 24 saat boyunca DOORA'da öncelikli gösterilecek.",href:"/hesabim"});
  return NextResponse.json({success:true,featuredUntil:result.featured_until,availableBalance:result.available_balance});
 }catch(error){
  const message=error instanceof Error?error.message:"Öne çıkarma işlemi başarısız.";
  const status=message.includes("yetersiz")?402:message.includes("öne çıkarılamıyor")?409:400;
  return NextResponse.json({error:message},{status});
 }
}