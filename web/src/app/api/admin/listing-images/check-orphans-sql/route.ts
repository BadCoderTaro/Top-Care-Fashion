import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function env(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is required`);
  return v;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });

    // The SQL query to check orphan files
    // Note: URLs in database are like "https://.../storage/v1/object/public/listing-images/filename.jpg"
    // storage.objects.name is just "filename.jpg"
    const sql = `
WITH orphan AS (
  SELECT o.bucket_id, o.name
  FROM storage.objects o
  LEFT JOIN public.listings l
    ON l.image_url LIKE '%listing-images/' || o.name || '%'
  LEFT JOIN LATERAL (
    SELECT 1
    FROM public.listings ll
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(ll.image_urls::jsonb, '[]'::jsonb)) AS img
      WHERE img LIKE '%listing-images/' || o.name || '%'
    )
  ) t1 ON true
  LEFT JOIN LATERAL (
    SELECT 1
    FROM public.reviews r
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(r.images, '[]'::jsonb)) AS img
      WHERE img LIKE '%listing-images/' || o.name || '%'
    )
  ) t2 ON true
  WHERE o.bucket_id = 'listing-images'
    AND l.id IS NULL
    AND t1 IS NULL
    AND t2 IS NULL
)
SELECT bucket_id, name AS object_path
FROM orphan
LIMIT 100;
`;

    // Execute raw SQL query using Supabase's PostgreSQL connection
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error('RPC error:', error);

      // Try alternative method using REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to execute SQL: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return NextResponse.json({
        success: true,
        orphanCount: result?.length || 0,
        orphans: result,
        note: 'Retrieved via REST API'
      });
    }

    return NextResponse.json({
      success: true,
      orphanCount: data?.length || 0,
      orphans: data,
      note: 'Retrieved via RPC'
    });

  } catch (e: any) {
    console.error("Error executing orphan check SQL:", e);

    // Return the SQL for manual execution
    return NextResponse.json({
      error: e?.message || "Failed to execute SQL query",
      sql: `Please run this SQL in Supabase SQL Editor to check orphans manually`,
      hint: "The SQL checks for files in storage.objects that are not referenced in listings.image_url, listings.image_urls, or reviews.images"
    }, { status: 500 });
  }
}
