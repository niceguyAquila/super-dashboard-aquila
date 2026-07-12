import { NextResponse } from "next/server";
import { syncDomains } from "@/lib/ahrefs/sync";
import { createClient } from "@/lib/supabase/server";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { brandId?: string; domainId?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const results = await syncDomains({
      brandId: body.brandId,
      domainId: body.domainId,
    });
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      console.error(
        "[ahrefs] sync completed with failures:",
        failed.map((f) => ({ hostname: f.hostname, error: f.error })),
      );
    }
    return NextResponse.json({
      synced: results.length,
      failed: failed.length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[ahrefs] sync route error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Vercel Cron uses GET by default
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncDomains();
    return NextResponse.json({
      synced: results.length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
