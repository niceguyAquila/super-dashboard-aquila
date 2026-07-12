import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncDomains } from "@/lib/ahrefs/sync";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  return false;
}

async function revalidateSyncedPaths(options: {
  brandId?: string;
  domainId?: string;
}) {
  revalidatePath("/", "layout");

  try {
    const admin = createServiceClient();

    if (options.domainId) {
      const { data: domain } = await admin
        .from("domains")
        .select("id, brand_id, brands(slug)")
        .eq("id", options.domainId)
        .maybeSingle();

      const brandSlug = (domain as { brands?: { slug?: string } } | null)?.brands
        ?.slug;
      if (brandSlug && domain) {
        revalidatePath(`/${brandSlug}/domains`);
        revalidatePath(`/${brandSlug}/domains/${domain.id}`);
      }
      return;
    }

    if (options.brandId) {
      const { data: brand } = await admin
        .from("brands")
        .select("slug")
        .eq("id", options.brandId)
        .maybeSingle();
      if (brand?.slug) {
        revalidatePath(`/${brand.slug}/domains`);
        revalidatePath(`/${brand.slug}`, "layout");
      }
    }
  } catch (err) {
    console.error("[ahrefs] revalidate paths failed:", err);
  }
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

    await revalidateSyncedPaths({
      brandId: body.brandId,
      domainId: body.domainId,
    });

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncDomains();
    revalidatePath("/", "layout");
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
