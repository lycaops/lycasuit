import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith("/auth")
  // The retailer signing page is reached from an emailed link, so it stays public.
  const isSignRoute = pathname === "/sign" || pathname.startsWith("/sign/")
  const isPublic = isAuthRoute || isSignRoute

  // Never bounce these, or the browser can end up in a redirect loop.
  const alwaysAllowedAuthRoutes = ["/auth/no-access", "/auth/logout", "/auth/reset-password"]
  const isAlwaysAllowed = alwaysAllowedAuthRoutes.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    // Return the user to whatever tool they were trying to open.
    if (pathname !== "/") url.searchParams.set("returnTo", pathname)
    return NextResponse.redirect(url)
  }

  // Signed in and sitting on an auth screen (or the bare root) -> Home hub.
  if (user && ((isAuthRoute && !isAlwaysAllowed) || pathname === "/")) {
    const url = request.nextUrl.clone()
    url.pathname = "/home"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
