import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ReportStatus, ReportTargetType } from "@prisma/client";

function mapTargetType(value: ReportTargetType): "listing" | "user" {
  return value === ReportTargetType.USER ? "user" : "listing";
}

function mapStatus(value: ReportStatus): "open" | "resolved" | "dismissed" {
  switch (value) {
    case ReportStatus.RESOLVED:
      return "resolved";
    case ReportStatus.DISMISSED:
      return "dismissed";
    default:
      return "open";
  }
}

function normalizeStatusIn(value: unknown): ReportStatus {
  const normalized = String(value ?? "").trim().toUpperCase();
  switch (normalized) {
    case "RESOLVED":
      return ReportStatus.RESOLVED;
    case "DISMISSED":
      return ReportStatus.DISMISSED;
    default:
      return ReportStatus.OPEN;
  }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const [reportList, totalCount] = await Promise.all([
    prisma.reports.findMany({
      skip,
      take: limit,
      orderBy: {
        id: "desc",
      },
    }),
    prisma.reports.count(),
  ]);

  // Get reporter user IDs by matching usernames
  const reporterUsernames = [...new Set(reportList.map((r) => r.reporter))];
  const users = await prisma.users.findMany({
    where: {
      username: {
        in: reporterUsernames,
      },
    },
    select: {
      id: true,
      username: true,
    },
  });

  const usernameToIdMap = new Map(users.map((u) => [u.username, u.id]));

  const reports = reportList.map((report) => ({
    id: String(report.id),
    targetType: mapTargetType(report.target_type),
    targetId: report.target_id,
    reporter: report.reporter,
    reporterId: usernameToIdMap.get(report.reporter),
    reason: report.reason,
    status: mapStatus(report.status),
    notes: report.notes,
    createdAt: report.created_at.toISOString(),
    resolvedAt: report.resolved_at?.toISOString() ?? null,
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    reports,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { id, status, notes } = body || {};
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updateData: {
      status?: ReportStatus;
      notes?: string;
      resolved_at?: Date | null;
    } = {};

    if (typeof status === "string") {
      const normalized = normalizeStatusIn(status);
      updateData.status = normalized;
      if (normalized === ReportStatus.RESOLVED) {
        updateData.resolved_at = new Date();
      } else if (normalized === ReportStatus.OPEN) {
        updateData.resolved_at = null;
      }
    }

    if (typeof notes === "string") {
      updateData.notes = notes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "no changes" }, { status: 400 });
    }

    const report = await prisma.reports.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({
      id: String(report.id),
      targetType: mapTargetType(report.target_type),
      targetId: report.target_id,
      reporter: report.reporter,
      reason: report.reason,
      status: mapStatus(report.status),
      notes: report.notes,
      createdAt: report.created_at.toISOString(),
      resolvedAt: report.resolved_at?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
