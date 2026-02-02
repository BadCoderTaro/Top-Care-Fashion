import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, email } = body as { username?: string; email?: string };

    const results: { usernameAvailable?: boolean; emailAvailable?: boolean } = {};

    // Check username availability
    if (username) {
      const normalizedUsername = username.trim();
      if (normalizedUsername.length > 0) {
        const existingUser = await prisma.users.findFirst({
          where: {
            username: {
              equals: normalizedUsername,
              mode: "insensitive", // Case-insensitive comparison
            },
          },
          select: { id: true },
        });
        results.usernameAvailable = !existingUser;
      }
    }

    // Check email availability
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail.length > 0) {
        const existingUser = await prisma.users.findFirst({
          where: {
            email: normalizedEmail,
          },
          select: { id: true },
        });
        results.emailAvailable = !existingUser;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error checking availability:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}

