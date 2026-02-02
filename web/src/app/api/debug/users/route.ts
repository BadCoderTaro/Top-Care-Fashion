import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

function mapRole(value: unknown): "User" | "Admin" {
  return String(value ?? "").toUpperCase() === "ADMIN" ? "Admin" : "User";
}

function mapStatus(value: unknown): "active" | "suspended" {
  return String(value ?? "").toUpperCase() === "SUSPENDED" ? "suspended" : "active";
}

export async function GET() {
  try {
    const conn = await getConnection();
    const [rows]: any = await conn.execute("SELECT id, username, email, role, status FROM users");
    await conn.end();

    const users = (rows as any[]).map((row) => ({
      id: Number(row.id),
      username: row.username,
      email: row.email,
      role: mapRole(row.role),
      status: mapStatus(row.status),
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Users query error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
