import { NextResponse } from "next/server";
import { getConnection, toNumber } from "@/lib/db";

export async function GET() {
  try {
    const connection = await getConnection();

    // Read stats from site_stats table (automatically updated by database triggers)
    const [rows]: any = await connection.execute(
      `SELECT total_users, total_listings, total_sold, avg_rating
       FROM site_stats
       WHERE id = 1`
    );

    await connection.end();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({
        stats: {
          users: 0,
          listings: 0,
          sold: 0,
          rating: 4.8,
        },
      });
    }

    const siteStats = rows[0];
    return NextResponse.json({
      stats: {
        users: toNumber(siteStats.total_users) ?? 0,
        listings: toNumber(siteStats.total_listings) ?? 0,
        sold: toNumber(siteStats.total_sold) ?? 0,
        rating: toNumber(siteStats.avg_rating) ?? 4.8,
      },
    });
  } catch (error) {
    console.error("Error fetching site stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch site stats" },
      { status: 500 }
    );
  }
}
