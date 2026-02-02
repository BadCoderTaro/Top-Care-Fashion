import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/test-db - 测试数据库连接
export async function GET() {
  try {
    // 测试基本连接
    const userCount = await prisma.users.count();
    
    return NextResponse.json({ 
      success: true, 
      message: "Database connection successful",
      userCount 
    });

  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      details: error 
    }, { status: 500 });
  }
}
