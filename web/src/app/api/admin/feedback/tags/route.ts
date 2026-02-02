import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConnection, parseJson } from "@/lib/db";

// Default tags that should always be available
const DEFAULT_TAGS = ["mixmatch", "ailisting", "premium", "buyer", "seller"];

// Get all available tags (from feedback records + system tags + defaults)
async function getAllTagsFromFeedback(): Promise<Set<string>> {
  const conn = await getConnection();
  try {
    // Get tags from all feedback records
    const [rows]: any = await conn.execute(
      "SELECT tags FROM feedback WHERE tags IS NOT NULL AND json_typeof(tags::json) = 'array' AND json_array_length(tags::json) > 0"
    );

    const set = new Set<string>();
    if (rows && Array.isArray(rows)) {
      for (const r of rows) {
        const arr = Array.isArray(r.tags) ? r.tags : parseJson<string[]>(r.tags);
        if (Array.isArray(arr)) {
          arr.forEach((t) => {
            if (typeof t === "string" && t.trim()) set.add(t.trim());
          });
        }
      }
    }

    // Add default tags
    DEFAULT_TAGS.forEach((t) => set.add(t));
    return set;
  } finally {
    await conn.end();
  }
}

// Get or create system feedback for tag management
async function getSystemFeedbackId(conn: any): Promise<number | null> {
  const [existing]: any = await conn.execute(
    "SELECT id FROM feedback WHERE user_id IS NULL AND user_email = 'system@tag-management' LIMIT 1"
  );
  
  if (existing && existing.length > 0) {
    const row = existing[0];
    return row?.id ? Number(row.id) : null;
  }
  
  // Create system feedback if it doesn't exist
  // Note: getConnection automatically adds RETURNING id for INSERT statements
  const [result]: any = await conn.execute(
    "INSERT INTO feedback (user_id, user_email, user_name, message, tags, featured, is_public) VALUES (NULL, 'system@tag-management', 'System', 'Tag management entry', '[]'::jsonb, FALSE, FALSE)"
  );
  
  // The result structure for INSERT is: [{ insertId, rows }]
  if (result?.insertId) {
    return Number(result.insertId);
  }
  
  // Fallback: query the ID we just inserted
  const [newRow]: any = await conn.execute(
    "SELECT id FROM feedback WHERE user_id IS NULL AND user_email = 'system@tag-management' ORDER BY id DESC LIMIT 1"
  );
  
  if (newRow && newRow.length > 0) {
    const row = newRow[0];
    return row?.id ? Number(row.id) : null;
  }
  
  return null;
}

// GET: Retrieve all available tags
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const tags = await getAllTagsFromFeedback();
    return NextResponse.json({ tags: Array.from(tags).sort() });
  } catch (error) {
    console.error("Error fetching feedback tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

// POST: Add a new tag
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { tag } = body ?? {};

    if (!tag || typeof tag !== "string") {
      return NextResponse.json({ error: "tag is required and must be a string" }, { status: 400 });
    }

    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) {
      return NextResponse.json({ error: "tag cannot be empty" }, { status: 400 });
    }

    // Get or create system feedback to store managed tags
    const conn = await getConnection();
    try {
      const systemFeedbackId = await getSystemFeedbackId(conn);
      if (!systemFeedbackId) {
        return NextResponse.json({ error: "Failed to create system feedback" }, { status: 500 });
      }

      // Get current system tags
      const [systemRows]: any = await conn.execute(
        "SELECT tags FROM feedback WHERE id = ?",
        [systemFeedbackId]
      );

      const currentSystemTags = systemRows && systemRows.length > 0
        ? (parseJson<string[]>(systemRows[0].tags) || [])
        : [];

      // Add new tag if it doesn't exist
      if (!currentSystemTags.includes(trimmedTag)) {
        const updatedTags = [...currentSystemTags, trimmedTag];
        await conn.execute(
          "UPDATE feedback SET tags = ?::jsonb WHERE id = ?",
          [JSON.stringify(updatedTags), systemFeedbackId]
        );
      }
    } finally {
      await conn.end();
    }

    return NextResponse.json({ success: true, tag: trimmedTag });
  } catch (error) {
    console.error("Error adding tag:", error);
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}

// DELETE: Remove a tag
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");

    if (!tag) {
      return NextResponse.json({ error: "tag parameter is required" }, { status: 400 });
    }

    const trimmedTag = tag.trim().toLowerCase();

    // Don't allow deletion of default tags
    if (DEFAULT_TAGS.includes(trimmedTag)) {
      return NextResponse.json({ error: "Cannot delete default tags" }, { status: 400 });
    }

    // Check if tag is used in any feedback (excluding system feedback)
    const conn = await getConnection();
    try {
      const [rows]: any = await conn.execute(
        "SELECT tags FROM feedback WHERE tags IS NOT NULL AND json_typeof(tags::json) = 'array' AND json_array_length(tags::json) > 0 AND (user_email IS NULL OR user_email != 'system@tag-management')"
      );

      let tagInUse = false;
      if (rows && Array.isArray(rows)) {
        for (const r of rows) {
          const arr = Array.isArray(r.tags) ? r.tags : parseJson<string[]>(r.tags);
          if (Array.isArray(arr) && arr.includes(trimmedTag)) {
            tagInUse = true;
            break;
          }
        }
      }

      if (tagInUse) {
        return NextResponse.json({ error: "Tag is in use and cannot be deleted" }, { status: 400 });
      }

      // Remove from system feedback if it exists
      const systemFeedbackId = await getSystemFeedbackId(conn);
      if (systemFeedbackId) {
        const [systemRows]: any = await conn.execute(
          "SELECT tags FROM feedback WHERE id = ?",
          [systemFeedbackId]
        );

        if (systemRows && systemRows.length > 0) {
          const systemTags = parseJson<string[]>(systemRows[0].tags) || [];
          const updatedTags = systemTags.filter((t: string) => t !== trimmedTag);
          await conn.execute(
            "UPDATE feedback SET tags = ?::jsonb WHERE id = ?",
            [JSON.stringify(updatedTags), systemFeedbackId]
          );
        }
      }
    } finally {
      await conn.end();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

