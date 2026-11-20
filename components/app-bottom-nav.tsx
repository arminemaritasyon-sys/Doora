import Link from "next/link";
import { Bookmark, Compass, UserRound } from "lucide-react";

export default function AppBottomNav({active,pendingOffers=0}:{active:"saved"|"account";pendingOffers?:number}) {
  return <nav className="mobile-dock doora-bottom-nav" aria-label="Ana gezinme">
    <Link href="/#kesfet"><Compass/><span>Keşfet</span></Link>
    <Link href="/isler"><span className="dock-money-icon" aria-hidden="true">₺</span><span>İşler</span></Link>
    <Link href="/kaydedilenler" className={active==="saved"?"dock-active":""} aria-current={active==="saved"?"page":undefined}><Bookmark/><span>Kaydedilen</span></Link>
    <Link href="/hesabim" className={active==="account"?"dock-active":""} aria-current={active==="account"?"page":undefined}><span className="dock-account-icon"><UserRound/>{pendingOffers>0&&<i>{pendingOffers>99?"99+":pendingOffers}</i>}</span><span>Hesabım</span></Link>
  </nav>;
}
