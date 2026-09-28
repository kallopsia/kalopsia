import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const ADMIN_ROLE = "admin";

const LOGIN_PATH = "/admin/login";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginRoute = pathname === LOGIN_PATH;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (isLoginRoute) return NextResponse.next();
    return NextResponse.redirect(new URL(`${LOGIN_PATH}?error=not-configured`, request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() memvalidasi token ke Supabase, jangan pakai getSession() di middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.app_metadata as { role?: unknown } | undefined)?.role;
  const isAdmin = Boolean(user) && role === ADMIN_ROLE;

  if (isLoginRoute) {
    return isAdmin ? NextResponse.redirect(new URL("/admin", request.url)) : response;
  }

  if (!isAdmin) {
    const reason = user ? "forbidden" : "not-authenticated";
    const next = encodeURIComponent(pathname + search);
    return NextResponse.redirect(
      new URL(`${LOGIN_PATH}?error=${reason}&next=${next}`, request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
