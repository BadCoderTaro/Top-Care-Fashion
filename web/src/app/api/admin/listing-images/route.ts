import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db";

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
    const bucket = "listing-images";

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // List all files in the bucket
    async function listAllFiles() {
      const files: Array<{ name: string; path: string; size: number; lastModified: string | null }> = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list("", { limit, offset, sortBy: { column: "name", order: "asc" } });

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of data) {
          if (item && item.metadata && typeof (item as any).metadata.size === "number") {
            files.push({
              name: item.name,
              path: item.name,
              size: (item as any).metadata.size,
              lastModified: (item as any).updated_at || null,
            });
          }
        }

        if (data.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      return files;
    }

    // Get all image URLs from listings and reviews
    const [listings, reviews] = await Promise.all([
      prisma.listings.findMany({
        select: {
          image_url: true,
          image_urls: true,
        },
      }),
      prisma.reviews.findMany({
        select: {
          images: true,
        },
      }),
    ]);

    const usedImageFiles = new Set<string>();

    // Check listings.image_url
    for (const listing of listings) {
      if (listing.image_url) {
        const match = listing.image_url.match(/listing-images\/([^?]+)/);
        if (match) usedImageFiles.add(match[1]);
      }

      // Check listings.image_urls (stored as JSON string!)
      if (listing.image_urls) {
        try {
          let urlsArray;
          if (typeof listing.image_urls === 'string') {
            urlsArray = JSON.parse(listing.image_urls);
          } else if (Array.isArray(listing.image_urls)) {
            urlsArray = listing.image_urls;
          }

          if (Array.isArray(urlsArray)) {
            for (const url of urlsArray) {
              if (typeof url === "string" && url.includes('listing-images/')) {
                const match = url.match(/listing-images\/([^?]+)/);
                if (match) usedImageFiles.add(match[1]);
              }
            }
          }
        } catch (e) {
          console.error(`Failed to parse image_urls for listing ${(listing as any).id}:`, e);
        }
      }
    }

    // Check reviews.images (JSON array)
    for (const review of reviews) {
      if (review.images && Array.isArray(review.images)) {
        for (const url of review.images) {
          if (typeof url === "string") {
            const match = url.match(/listing-images\/([^?]+)/);
            if (match) usedImageFiles.add(match[1]);
          }
        }
      }
    }

    const files = await listAllFiles();
    const publicBase = `${supabaseUrl}/storage/v1/object/public/${bucket}`;

    // Calculate stats - orphan files are those NOT in any of the 3 columns
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const orphanFiles = files.filter((f) => !usedImageFiles.has(f.name));
    const orphanSize = orphanFiles.reduce((sum, f) => sum + f.size, 0);

    const filesWithUrls = files.map((f) => ({
      ...f,
      url: `${publicBase}/${f.path}`,
      isOrphan: !usedImageFiles.has(f.name),
    }));

    return NextResponse.json({
      bucket,
      stats: {
        totalFiles: files.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        orphanFiles: orphanFiles.length,
        orphanSize,
        orphanSizeMB: (orphanSize / (1024 * 1024)).toFixed(2),
        linkedFiles: files.length - orphanFiles.length,
      },
      files: filesWithUrls,
      orphanFiles: orphanFiles.map((f) => ({
        ...f,
        url: `${publicBase}/${f.path}`,
      })),
    });
  } catch (e: any) {
    console.error("Error in listing-images API:", e);
    return NextResponse.json({ error: e?.message || "Failed to load listing images" }, { status: 500 });
  }
}

// POST endpoint to trigger cleanup
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    // Call the cleanup edge function
    const cleanupUrl = `${supabaseUrl}/functions/v1/cleanup-orphan-images`;
    const response = await fetch(cleanupUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cleanup function failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (e: any) {
    console.error("Error triggering cleanup:", e);
    return NextResponse.json({ error: e?.message || "Failed to trigger cleanup" }, { status: 500 });
  }
}

// DELETE endpoint to manually delete specific files
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const bucket = "listing-images";

    const body = await req.json();
    const { filePaths } = body;

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json({ error: "filePaths array is required" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Delete files from storage
    const { data, error } = await supabase.storage.from(bucket).remove(filePaths);

    if (error) {
      throw new Error(`Failed to delete files: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      deletedCount: filePaths.length,
      deletedFiles: filePaths,
    });
  } catch (e: any) {
    console.error("Error deleting files:", e);
    return NextResponse.json({ error: e?.message || "Failed to delete files" }, { status: 500 });
  }
}
