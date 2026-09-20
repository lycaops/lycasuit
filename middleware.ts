import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - public PWA assets and all _next files
     * - /api routes (handle auth inside)
     */
    "/((?!_next|manifest\\.webmanifest|sw\\.js|offline(?:/|$)|icons(?:/|$)|apple-touch-icon\\.png|favicon[^/]*$).*)",
  ],
}
