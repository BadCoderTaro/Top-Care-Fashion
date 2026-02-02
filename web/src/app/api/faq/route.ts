import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  // Get query parameters for search and filtering
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || ""; // "answered" or "pending"

  // Build WHERE clause dynamically
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push("(f.question LIKE ? OR f.answer LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    conditions.push("f.category = ?");
    params.push(category);
  }

  if (status === "answered") {
    conditions.push("f.answer IS NOT NULL");
  } else if (status === "pending") {
    conditions.push("f.answer IS NULL");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const conn = await getConnection();
  const [rows] = await conn.execute(
    `SELECT
      f.id,
      f.user_id AS userId,
      f.user_email AS userEmail,
      f.question,
      f.answer,
      f.category,
      f.created_at AS createdAt,
      f.answered_at AS answeredAt,
      u.username AS associatedUserName
    FROM faq f
    LEFT JOIN users u ON f.user_id = u.id
    ${whereClause}
    ORDER BY f.id DESC`,
    params
  );
  await conn.end();
  return NextResponse.json({ faqs: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { question, userEmail, category } = body || {};
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const conn = await getConnection();
  const [res]: any = await conn.execute(
    "INSERT INTO faq (user_id, user_email, question, category, created_at) VALUES (?, ?, ?, ?, NOW())",
    [user.id, userEmail || user.email, question, category || null]
  );
  const insertId = res.insertId;
  const [rows]: any = await conn.execute(
    `SELECT
      f.id,
      f.user_id AS userId,
      f.user_email AS userEmail,
      f.question,
      f.answer,
      f.category,
      f.created_at AS createdAt,
      f.answered_at AS answeredAt,
      u.username AS associatedUserName
    FROM faq f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.id = ?`,
    [insertId]
  );
  await conn.end();
  return NextResponse.json(rows[0]);
}
