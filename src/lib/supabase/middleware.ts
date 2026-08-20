import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

/** Public routes reachable without a session. */
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth", "/registry-public", "/_next", "/favicon"];

/**
 * Refreshes the Supabase session on every request and guards protected routes.
 * Called from src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // API routes authenticate themselves (device key, bearer token, or their own
  // session check) and must answer with a JSON status code. Redirecting them to
  // the HTML login page would break every non-browser client — field sensors
  // cannot follow a redirect.
  const isApi = path.startsWith("/api/");
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p)) || path === "/";

  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return response;
}
