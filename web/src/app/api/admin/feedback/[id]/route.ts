import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.feedback.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updateData: any = {};

  if ("userId" in body) {
    const userId = body.userId;
    if (userId === null || userId === undefined || userId === "") {
      updateData.user_id = null;
    } else {
      const parsed = Number(userId);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
      updateData.user_id = parsed;
    }
  }

  if ("userEmail" in body) {
    const email = body.userEmail;
    updateData.user_email = email === null || email === undefined || email === "" ? null : String(email);
  }

  if ("userName" in body) {
    const name = body.userName;
    updateData.user_name = name === null || name === undefined || name === "" ? null : String(name);
  }

  if ("message" in body) {
    const message = body.message;
    updateData.message = message === null || message === undefined ? null : String(message);
  }

  if ("rating" in body) {
    const rating = body.rating;
    if (rating === null || rating === undefined || rating === "") {
      updateData.rating = null;
    } else {
      const parsed = Number(rating);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
      }
      updateData.rating = parsed;
    }
  }

  if ("tags" in body) {
    const tags = Array.isArray(body.tags) ? body.tags : null;
    updateData.tags = tags || undefined;
  }

  if ("featured" in body) {
    updateData.featured = Boolean(body.featured);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  try {
    await prisma.feedback.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}
