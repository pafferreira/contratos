import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

const AUTH_PATHS = ["/signin", "/auth/callback"];



export async function middleware(req: NextRequest) {
  // Retorna 503 Service Unavailable para tudo
  // return new NextResponse("Site em manutenção", { status: 503 });

  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  if (!user && !AUTH_PATHS.some((path) => pathname.startsWith(path))) {
    const redirectUrl = new URL("/signin", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/signin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

