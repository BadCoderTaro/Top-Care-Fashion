import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase";

const DEFAULT_BUCKET = process.env.SUPABASE_LISTING_IMAGES_BUCKET || "listing-images";
const FALLBACK_BUCKETS = ["avatars"]; // reuse bucket that already exists for avatars

type UploadRequestBody = {
  imageData?: unknown;
  fileName?: unknown;
};

export async function POST(req: NextRequest) {
  console.log("🔍 Starting listing image upload...");
  console.log("🔍 Request headers:", Object.fromEntries(req.headers.entries()));
  
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    console.log("🔍 No session user found, using Service Role Key for upload");
    // 如果没有认证用户，使用 Service Role Key 进行上传
  } else {
    console.log("🔍 Session user found:", sessionUser.id, sessionUser.email);
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer;
    let fileName: string | undefined;
    let extension: string;
    let resolvedContentType: string;

    // 优先尝试 FormData 二进制上传
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      
      if (!file) {
        return NextResponse.json({ error: "No file provided in FormData" }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name;
      extension = deriveExtension(fileName);
      resolvedContentType = file.type || resolveContentType(extension);
      
      console.log("🔍 FormData upload:", {
        fileName,
        fileSize: buffer.length,
        fileType: file.type,
        extension,
      });
    } else {
      // Fallback: base64 JSON 格式（向后兼容）
      const body: UploadRequestBody = await req.json();
      const { imageData, fileName: fileNameInput } = body;

      if (typeof imageData !== "string" || !imageData.trim()) {
        return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
      }

      fileName = typeof fileNameInput === "string" ? fileNameInput : undefined;
      extension = deriveExtension(fileName);
      resolvedContentType = resolveContentType(extension);
      buffer = Buffer.from(imageData, "base64");
      
      console.log("🔍 Base64 upload (legacy):", {
        fileName,
        bufferSize: buffer.length,
        extension,
      });
    }

    const primaryBucket = DEFAULT_BUCKET.trim();
    if (!primaryBucket) {
      return NextResponse.json({ error: "Storage bucket is not configured" }, { status: 500 });
    }

    const userId = sessionUser?.id || 'anonymous';
    const fileKey = `listing-${userId}-${Date.now()}-${randomUUID()}.${extension}`;

    console.log("🔍 File details:", {
      fileName: fileName || "unknown",
      extension,
      contentType: resolvedContentType,
      fileKey,
      bufferSize: buffer.length
    });

    // 根据是否有认证用户决定使用哪种 Supabase 客户端
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let supabase;
    if (!sessionUser && serviceRoleKey) {
      console.log("🔍 Using Service Role Key for anonymous upload");
      const { createClient } = await import("@supabase/supabase-js");
      supabase = createClient(supabaseUrl!, serviceRoleKey, { auth: { persistSession: false } });
    } else {
      console.log("🔍 Using regular Supabase client");
      supabase = await createSupabaseServer();
    }
    
    // 统一的上传逻辑
    const bucketsToTry = dedupeBuckets([primaryBucket, ...FALLBACK_BUCKETS]);
    console.log("🔍 Trying buckets:", bucketsToTry);

    let lastError: unknown = null;
    for (const bucket of bucketsToTry) {
      console.log(`🔍 Attempting upload to bucket: ${bucket}`);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileKey, buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: resolvedContentType,
        });

      if (!uploadError) {
        console.log(`🔍 Upload successful to bucket: ${bucket}`);
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileKey);
        const imageUrl = publicUrlData.publicUrl;
        console.log("🔍 Generated public URL:", imageUrl);
        return NextResponse.json({ imageUrl, bucket });
      }

      console.error(`🔍 Upload failed for bucket '${bucket}':`, uploadError);
      lastError = uploadError;
    }

    const message = lastError instanceof Error ? lastError.message : "Failed to upload image";
    return NextResponse.json({ error: message }, { status: 500 });
  } catch (error) {
    console.error("Unexpected error uploading listing image:", error);
    return NextResponse.json({ error: "Unable to upload image" }, { status: 500 });
  }
}

function deriveExtension(fileName?: string): string {
  if (!fileName) return "jpg";
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === trimmed.length - 1) return sanitizeExtension(trimmed);
  return sanitizeExtension(trimmed.slice(dotIndex + 1));
}

function dedupeBuckets(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function sanitizeExtension(ext: string): string {
  const value = ext.toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(value)) {
    return value === "jpeg" ? "jpg" : value;
  }
  return "jpg";
}

function resolveContentType(extension: string): string {
  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}
