import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Add connection health check with retry logic
export async function checkDatabaseConnection(maxRetries = 2): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (attempt > 0) {
        console.log(`✅ Database connection restored after ${attempt} retry(ies)`);
      }
      return true;
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`⚠️ Database connection attempt ${attempt + 1} failed, retrying...`);
        // Wait for 500ms before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.error("❌ Database connection check failed after all retries:", error);
        return false;
      }
    }
  }
  return false;
}

function buildSql(query: string, params: unknown[]): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  const chunks = query.split("?");
  chunks.forEach((chunk, index) => {
    if (chunk) {
      parts.push(Prisma.raw(chunk));
    }
    if (index < params.length) {
      parts.push(Prisma.sql`${params[index]}`);
    }
  });
  return parts.reduce((acc, part) => Prisma.sql`${acc}${part}`, Prisma.sql``);
}

async function queryRows<T = unknown>(query: string, params: unknown[]): Promise<T[]> {
  const sql = buildSql(query, params);
  return prisma.$queryRaw<T[]>(sql);
}

async function executeCommand(query: string, params: unknown[]): Promise<number> {
  const sql = buildSql(query, params);
  return prisma.$executeRaw(sql);
}

export async function getConnection() {
  return {
    execute: async (query: string, params: unknown[] = []) => {
      const trimmed = query.trim().toLowerCase();
      const isQuery = trimmed.startsWith("select") || trimmed.startsWith("with");
      const isInsert = trimmed.startsWith("insert");
      const hasReturning = /returning\s+/i.test(query);

      if (isQuery) {
        const rows = await queryRows(query, params);
        return [rows];
      }

      if (isInsert && !hasReturning) {
        const returningSql = `${query} RETURNING id`;
        const rows = await queryRows(returningSql, params);
        const insertId = rows.length > 0 ? (rows[0] as Record<string, unknown>).id ?? null : null;
        return [
          {
            insertId,
            rows,
          },
        ];
      }

      const rowCount = await executeCommand(query, params);
      return [
        {
          affectedRows: rowCount,
          rowCount,
        },
      ];
    },
    end: async () => Promise.resolve(),
  } as const;
}

export type DecimalLike = {
  toNumber(): number;
};

export function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = Number(val);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    try {
      return (val as DecimalLike).toNumber();
    } catch {
      return null;
    }
  }
  return null;
}

export function toBoolean(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    const normalized = val.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "t";
  }
  return Boolean(val);
}

export function parseJson<T>(val: unknown): T | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }
  return val as T;
}
