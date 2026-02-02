import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

export async function GET() {
  const conn = await getConnection();
  const [rows]: any = await conn.execute(
    "SELECT hero_title AS \"heroTitle\", hero_subtitle AS \"heroSubtitle\", updated_at AS \"updatedAt\" FROM landing_content WHERE id = 1"
  );
  await conn.end();
  return NextResponse.json(
    rows[0] || { heroTitle: "Top Care Fashion", heroSubtitle: "", updatedAt: new Date().toISOString() }
  );
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO landing_content (id, hero_title, hero_subtitle)
     VALUES (1, COALESCE(?, ''), COALESCE(?, ''))
     ON CONFLICT (id) DO UPDATE SET
       hero_title = EXCLUDED.hero_title,
       hero_subtitle = EXCLUDED.hero_subtitle,
       updated_at = NOW()`,
    [body.heroTitle ?? null, body.heroSubtitle ?? null]
  );
  const [rows]: any = await conn.execute(
    "SELECT hero_title AS \"heroTitle\", hero_subtitle AS \"heroSubtitle\", updated_at AS \"updatedAt\" FROM landing_content WHERE id = 1"
  );
  await conn.end();
  return NextResponse.json(rows[0]);
}
