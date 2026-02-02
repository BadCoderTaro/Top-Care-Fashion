    // web/src/app/api/ai/safe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Vision client (same pattern as /api/ai/classify) ---
const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").includes("\\n")
  ? (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
  : (process.env.GOOGLE_PRIVATE_KEY || "");

const vision = new ImageAnnotatorClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || "topcarefashion-ai",
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey,
  },
});

// --- Policy thresholds ---
type Likelihood =
  | "VERY_UNLIKELY"
  | "UNLIKELY"
  | "POSSIBLE"
  | "LIKELY"
  | "VERY_LIKELY";

const rank: Record<Likelihood, number> = {
  VERY_UNLIKELY: 0,
  UNLIKELY: 1,
  POSSIBLE: 2,
  LIKELY: 3,
  VERY_LIKELY: 4,
};

// Reject if adult >= POSSIBLE, racy >= LIKELY, violence >= POSSIBLE.
// (Medical/spoof are informational here; tweak if you want stricter rules.)
function applyPolicy(s: {
  adult?: Likelihood;
  racy?: Likelihood;
  violence?: Likelihood;
  medical?: Likelihood;
  spoof?: Likelihood;
}) {
  const reasons: string[] = [];

  if (s.adult && rank[s.adult] >= rank.POSSIBLE) reasons.push(`adult:${s.adult}`);
  if (s.racy && rank[s.racy] >= rank.LIKELY) reasons.push(`racy:${s.racy}`);
  if (s.violence && rank[s.violence] >= rank.POSSIBLE) reasons.push(`violence:${s.violence}`);

  const allow = reasons.length === 0;
  const verdict = allow ? "SFW" : "NSFW";
  return { allow, verdict, reasons };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("images");

    if (!files.length) {
      return NextResponse.json(
        { error: "No images provided. Append one or more 'images' fields." },
        { status: 400 }
      );
    }

    // Prepare buffers for Vision
    const buffers = await Promise.all(
      files.map(async (f: any) => {
        if (!f || typeof f.arrayBuffer !== "function") throw new Error("Invalid file");
        const ab = await f.arrayBuffer();
        return Buffer.from(ab);
      })
    );

    // Run SafeSearch in parallel
    const results = await Promise.all(
      buffers.map(async (buf, index) => {
        const [resp] = await vision.safeSearchDetection({ image: { content: buf } });
        const s = resp.safeSearchAnnotation || {};
        const { allow, verdict, reasons } = applyPolicy({
          adult: s.adult as Likelihood,
          racy: s.racy as Likelihood,
          violence: s.violence as Likelihood,
          medical: s.medical as Likelihood,
          spoof: s.spoof as Likelihood,
        });

        return {
          index,
          filename: (files[index] as any)?.name || `image_${index + 1}.jpg`,
          verdict,
          allow,
          reasons,
          safesearch: {
            adult: s.adult || "UNKNOWN",
            racy: s.racy || "UNKNOWN",
            violence: s.violence || "UNKNOWN",
            medical: s.medical || "UNKNOWN",
            spoof: s.spoof || "UNKNOWN",
          },
        };
      })
    );

    // Aggregate allowAll for convenience
    const allowAll = results.every(r => r.allow);
    return NextResponse.json({ allowAll, results }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "SafeSearch failed" },
      { status: 500 }
    );
  }
}
