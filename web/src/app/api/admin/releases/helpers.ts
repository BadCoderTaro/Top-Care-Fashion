import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensurePublicBucket(supabase: SupabaseClient, bucket: string) {
  const { error: createErr } = await supabase.storage.createBucket(bucket, { public: true });
  if (createErr && !String(createErr.message || "").toLowerCase().includes("already exists")) {
    const { error: updateErr } = await supabase.storage.updateBucket(bucket, { public: true });
    if (updateErr) {
      console.warn(`Could not ensure bucket ${bucket} is public:`, updateErr);
    }
  }
}

