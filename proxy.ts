import { auth } from "@/lib/auth/server";

// Next.js 16 request proxy: let Neon Auth validate and hydrate the
// session cookie before protected Server Components and Route Handlers run.
export default auth.middleware({
  loginUrl: "/giris",
  publicRoutes: ["/", "/giris"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
