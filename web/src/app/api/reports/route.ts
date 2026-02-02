import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ReportStatus, ReportTargetType } from "@prisma/client";

type IncomingTargetType = "listing" | "user" | "general" | string;

function normalizeTargetType(value: IncomingTargetType): "LISTING" | "USER" {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "LISTING") return "LISTING";
  if (normalized === "USER") return "USER";
  return "USER";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildReason(category?: string, details?: string): string {
  const parts = [];
  if (isNonEmptyString(category)) {
    parts.push(category.trim());
  }
  if (isNonEmptyString(details)) {
    parts.push(details.trim());
  }
  return parts.join(" - ");
}

function mapTargetTypeOut(value: ReportTargetType): "listing" | "user" {
  return value === "LISTING" ? "listing" : "user";
}

function mapStatusOut(value: ReportStatus): "open" | "resolved" | "dismissed" {
  switch (value) {
    case "RESOLVED":
      return "resolved";
    case "DISMISSED":
      return "dismissed";
    default:
      return "open";
  }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identifiers = [user.username, user.email]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  if (identifiers.length === 0) {
    return NextResponse.json({ reports: [] }, { status: 200 });
  }

  try {
    const reports = await prisma.reports.findMany({
      where: {
        reporter: {
          in: identifiers,
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const payload = reports.map((report) => ({
      id: String(report.id),
      targetType: mapTargetTypeOut(report.target_type),
      targetId: report.target_id,
      reason: report.reason,
      status: mapStatusOut(report.status),
      createdAt: report.created_at.toISOString(),
      resolvedAt: report.resolved_at ? report.resolved_at.toISOString() : null,
      notes: report.notes ?? null,
    }));

    return NextResponse.json({ reports: payload }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json({ error: "Failed to load flags" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    targetType,
    targetId,
    category,
    details,
    reportedUsername,
    reportedListingId,
  } = payload ?? {};

  const normalizedTargetType = normalizeTargetType(targetType);

  const providedTargetId = isNonEmptyString(targetId)
    ? targetId.trim()
    : normalizedTargetType === "LISTING" && reportedListingId
    ? String(reportedListingId).trim()
    : isNonEmptyString(reportedUsername)
    ? reportedUsername.trim()
    : normalizedTargetType === "USER" && typeof user.id !== "undefined"
    ? String(user.id)
    : null;

  if (!providedTargetId) {
    return NextResponse.json({ error: "Target identifier is required" }, { status: 400 });
  }

  const reason = buildReason(category, details);
  if (!reason) {
    return NextResponse.json(
      { error: "Please include a category or provide flag details" },
      { status: 400 },
    );
  }

  try {
    const reporterIdentifier = isNonEmptyString(user.username) ? user.username : user.email;
    const report = await prisma.reports.create({
      data: {
        target_type: normalizedTargetType,
        target_id: providedTargetId,
        reporter: reporterIdentifier ?? "anonymous",
        reason,
        status: "OPEN",
      },
      select: {
        id: true,
        target_type: true,
        target_id: true,
        reporter: true,
        reason: true,
        status: true,
        created_at: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        report: {
          id: String(report.id),
          targetType: report.target_type === "USER" ? "user" : "listing",
          targetId: String(report.target_id),
          reporter: report.reporter,
          reason: report.reason,
          status: "open",
          createdAt:
            report.created_at instanceof Date
              ? report.created_at.toISOString()
              : String(report.created_at),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json({ error: "Failed to submit flag" }, { status: 500 });
  }
}

