"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await authClient.signOut();
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return <button className="account-logout" onClick={logout} disabled={busy}>{busy ? "Çıkış yapılıyor…" : "Çıkış yap"}</button>;
}
