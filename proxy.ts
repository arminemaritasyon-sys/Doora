import { auth } from "@/lib/auth/server";

// Refresh and validate Neon Auth only on pages that require a signed-in user.
// Public pages (including the home page and sign-in page) stay accessible.
export default auth.middleware({
  loginUrl: "/giris",
});

export const config = {
  matcher: ["/kaydedilenler/:path*", "/hesabim/:path*"],
};
