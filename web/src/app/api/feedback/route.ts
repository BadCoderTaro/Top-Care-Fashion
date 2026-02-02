import { NextRequest, NextResponse } from "next/server";
import { getConnection, parseJson, toBoolean, toNumber } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type FeedbackType = "bug" | "feature" | "general";
type FeedbackPriority = "low" | "medium" | "high";
type FeedbackStatus = "open" | "in_progress" | "resolved" | "closed";

type FeedbackRow = {
  id: unknown;
  userId?: unknown;
  userName?: unknown;
  userEmail?: unknown;
  message?: unknown;
  rating?: unknown;
  tags?: unknown;
  featured?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  type?: unknown;
  title?: unknown;
  priority?: unknown;
  status?: unknown;
};

type SerializedFeedback = {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  title: string;
  description: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  tags: string[];
  rating: number | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

function normalizeType(value: unknown): FeedbackType {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "bug" || normalized === "feature") return normalized;
  return "general";
}

function normalizePriority(value: unknown): FeedbackPriority {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "low" || normalized === "high") return normalized;
  return "medium";
}

function normalizeStatus(value: unknown): FeedbackStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "in_progress" || normalized === "resolved" || normalized === "closed") {
    return normalized;
  }
  return "open";
}

function toIsoDate(value: unknown, fallback: Date = new Date()): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return fallback.toISOString();
}

function parseTags(value: unknown): string[] {
  const parsed = parseJson<string[]>(value);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter((tag) => tag.length > 0);
}

function serializeFeedback(row: FeedbackRow): SerializedFeedback {
  const createdAt = toIsoDate(row.createdAt);
  const updatedAt = toIsoDate(row.updatedAt ?? row.createdAt, new Date(createdAt));
  const rating = toNumber(row.rating);

  return {
    id: String(row.id),
    userId: row.userId !== undefined && row.userId !== null ? String(row.userId) : null,
    userName: typeof row.userName === "string" ? row.userName : null,
    userEmail: typeof row.userEmail === "string" ? row.userEmail : null,
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.message === "string" ? row.message : "",
    type: normalizeType(row.type),
    priority: normalizePriority(row.priority),
    status: normalizeStatus(row.status),
    tags: parseTags(row.tags),
    rating: rating ?? null,
    featured: toBoolean(row.featured),
    createdAt,
    updatedAt,
  };
}

export async function GET() {
  try {
    const connection = await getConnection();
    const [rows]: any = await connection.execute(
      `SELECT
        f.id,
        f.user_id AS "userId",
        f.user_name AS "userName",
        f.user_email AS "userEmail",
        f.message,
        f.rating,
        f.tags,
        f.featured,
        f.created_at AS "createdAt",
        f.updated_at AS "updatedAt",
        f.type,
        f.title,
        f.priority,
        f.status
      FROM feedback f
      ORDER BY f.created_at DESC`
    );
    await connection.end();

    const feedbackRows = Array.isArray(rows) ? (rows as FeedbackRow[]) : [];
    const feedbacks = feedbackRows.map(serializeFeedback);
    const testimonials = feedbacks
      .filter((feedback) => feedback.featured && feedback.rating !== null)
      .map((feedback) => ({
        id: Number(feedback.id),
        user: feedback.userName || 'Anonymous',
        text: feedback.description,
        rating: feedback.rating ?? 0,
        tags: Array.isArray(feedback.tags) ? feedback.tags : [],
        ts: new Date(feedback.createdAt).getTime(),
      }));

    return NextResponse.json({ testimonials, feedbacks });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const sessionUser = await getSessionUser(req);
  const normalizedType = normalizeType(body?.type);
  const normalizedPriority = normalizePriority(body?.priority);
  const normalizedStatus = normalizeStatus(body?.status);
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  const rawTags = Array.isArray(body?.tags) ? body.tags : [];
  const tags = rawTags
    .map((tag: unknown) => (typeof tag === "string" ? tag.trim() : ""))
    .filter((tag: string) => tag.length > 0);
  const serializedTags = tags.length > 0 ? JSON.stringify(tags) : null;

  const ratingValue = Number(body?.rating);
  const rating =
    Number.isFinite(ratingValue) && ratingValue > 0
      ? Math.max(1, Math.min(5, Math.round(ratingValue)))
      : null;

  const connection = await getConnection();

  try {
    const [result]: any = await connection.execute(
      `INSERT INTO feedback (
        user_id,
        user_email,
        user_name,
        message,
        rating,
        tags,
        featured,
        type,
        title,
        priority,
        status,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?::jsonb, FALSE, ?, ?, ?, ?, NOW(), NOW()
      )`,
      [
        sessionUser?.id ?? null,
        sessionUser?.email ?? null,
        sessionUser?.username ?? null,
        description,
        rating,
        serializedTags,
        normalizedType,
        title || null,
        normalizedPriority,
        normalizedStatus,
      ]
    );

    const insertId = result?.insertId ?? null;
    if (!insertId) {
      console.error("Failed to retrieve inserted feedback ID");
      return NextResponse.json({ error: "Failed to create feedback" }, { status: 500 });
    }

    const [rows]: any = await connection.execute(
      `SELECT
        f.id,
        f.user_id AS "userId",
        f.user_name AS "userName",
        f.user_email AS "userEmail",
        f.message,
        f.rating,
        f.tags,
        f.featured,
        f.created_at AS "createdAt",
        f.updated_at AS "updatedAt",
        f.type,
        f.title,
        f.priority,
        f.status
      FROM feedback f
      WHERE f.id = ?`,
      [insertId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      console.error("Inserted feedback not found:", insertId);
      return NextResponse.json({ error: "Failed to create feedback" }, { status: 500 });
    }

    const feedback = serializeFeedback(rows[0] as FeedbackRow);
    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json({ error: "Failed to create feedback" }, { status: 500 });
  } finally {
    await connection.end();
  }
}
