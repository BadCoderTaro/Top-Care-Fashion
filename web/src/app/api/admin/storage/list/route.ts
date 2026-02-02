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
    // Enforce bucket=assets only; allow sub-prefix via query param
    const defaultBucket = "assets";
    const { searchParams } = new URL(req.url);
    const bucket = (searchParams.get("bucket") || defaultBucket).trim();
    if (bucket !== defaultBucket) {
      return NextResponse.json({ error: "Only 'assets' bucket is allowed" }, { status: 400 });
    }
    const reqPrefix = (searchParams.get("prefix") || "").replace(/^\/+/, "");
  const rootPrefix = reqPrefix.startsWith("assets/") ? (reqPrefix.endsWith("/") ? reqPrefix : reqPrefix + "/") : "assets/";

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    async function listRecursive(startPrefix: string) {
      const queue: string[] = [startPrefix];
      const files: Array<{ name: string; path: string; size: number | null; lastModified: string | null }> = [];
      const folders = new Set<string>();
      const visited = new Set<string>();
      let guard = 0;
      while (queue.length && guard < 5000) {
        guard++;
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        const { data, error } = await supabase.storage.from(bucket).list(current, { limit: 1000, sortBy: { column: "name", order: "asc" } });
        if (error) throw new Error(error.message);
        for (const i of data || []) {
          const isFile = i && i.metadata && typeof (i as any).metadata.size === "number";
          if (isFile) {
            files.push({
              name: i.name,
              path: `${current}${i.name}`,
              size: (i as any).metadata?.size ?? null,
              lastModified: (i as any).updated_at || null,
            });
          } else {
            // folder
            const folderPath = `${current}${i.name}/`;
            queue.push(folderPath);
            folders.add(folderPath);
          }
        }
      }
      return { files, folders: Array.from(folders).sort() };
    }

    const { files, folders } = await listRecursive(rootPrefix);
    const publicBase = `${supabaseUrl}/storage/v1/object/public/${bucket}`;
    const withUrls = files.map((f) => ({ ...f, url: `${publicBase}/${f.path}` }));

    return NextResponse.json({ bucket, prefix: rootPrefix, files: withUrls, folders });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to list" }, { status: 500 });
  }
}
