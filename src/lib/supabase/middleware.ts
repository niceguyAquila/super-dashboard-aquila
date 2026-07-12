import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  const isPublicApi =
    pathname.startsWith("/api/ahrefs/sync") &&
    request.headers.get("authorization") ===
      `Bearer ${process.env.CRON_SECRET}`;

  if (!user && !isAuthRoute && !isPublicApi && !pathname.startsWith("/api/ahrefs/sync")) {
    // Allow cron route through separately below; redirect others to login
    if (!pathname.startsWith("/api/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (!user && pathname.startsWith("/api/") && !pathname.startsWith("/api/ahrefs/sync")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Cron sync uses CRON_SECRET; middleware still passes through for the route handler to verify
  void isPublicApi;

  return supabaseResponse;
}
