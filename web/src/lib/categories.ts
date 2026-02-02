import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type CategoryEntry = {
  id: number;
  name: string;
  slug: string | null;
  tokens: string[];
};

type CategoryCache = {
  entries: CategoryEntry[];
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const CATEGORY_STOP_WORDS = new Set([
  "men",
  "mens",
  "man",
  "male",
  "women",
  "womens",
  "woman",
  "female",
  "ladies",
  "lady",
  "girl",
  "girls",
  "boy",
  "boys",
  "kid",
  "kids",
  "youth",
  "teen",
  "teens",
  "child",
  "children",
  "unisex",
  "uni",
  "all",
]);

const uniq = <T,>(values: T[]): T[] => {
  const set = new Set<T>();
  values.forEach((value) => {
    if (value !== undefined && value !== null) {
      set.add(value);
    }
  });
  return Array.from(set);
};

let cache: CategoryCache = { entries: [], expiresAt: 0 };

function normalizeToken(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseKeywords(value: Prisma.JsonValue | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

async function loadCategories(): Promise<CategoryEntry[]> {
  if (cache.entries.length > 0 && cache.expiresAt > Date.now()) {
    return cache.entries;
  }

  const categories = await prisma.listing_categories.findMany({
    where: { is_active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      ai_keywords: true,
    },
  });

  const entries: CategoryEntry[] = categories.map((category) => {
    const tokenSet = new Set<string>();

    const normalizedName = normalizeToken(category.name);
    if (normalizedName) tokenSet.add(normalizedName);

    if (category.slug) {
      const slugToken = normalizeToken(category.slug);
      if (slugToken) tokenSet.add(slugToken);
    }

    for (const keyword of parseKeywords(category.ai_keywords)) {
      const keywordToken = normalizeToken(keyword);
      if (keywordToken) {
        tokenSet.add(keywordToken);
        if (keywordToken.endsWith("s") && keywordToken.length > 3) {
          tokenSet.add(keywordToken.slice(0, -1));
        }
      }
    }

    for (const token of [...tokenSet]) {
      if (token.includes(" ")) {
        token.split(" ").forEach((part) => {
          const partToken = part.trim();
          if (partToken.length > 2) {
            tokenSet.add(partToken);
          }
        });
      }
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      tokens: Array.from(tokenSet),
    };
  });

  cache = {
    entries,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return entries;
}

function stripCategoryModifiers(value: string): string {
  if (!value) return "";
  const filtered = value
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !CATEGORY_STOP_WORDS.has(part));
  return filtered.join(" ");
}

function buildSearchInputs(value: string): string[] {
  const stripped = stripCategoryModifiers(value);
  const baseValues = uniq([stripped, value].filter((v): v is string => Boolean(v && v.length)));
  const wordTokens = stripped
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  return uniq([...baseValues, ...wordTokens]);
}

function scoreTokens(inputs: string[], tokens: string[]): number {
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    for (const input of inputs) {
      if (!input) continue;
      if (input === token) {
        return Number.POSITIVE_INFINITY;
      }
      if (input.includes(token)) {
        score += Math.min(token.length, 8);
      } else if (token.includes(input) && input.length >= 3) {
        score += input.length;
      }
    }
  }
  return score;
}

function isInvalidCategoryValue(value: string): boolean {
  return (
    !value ||
    value === "select" ||
    value === "none" ||
    value.startsWith("select ") ||
    value.includes("selecta") ||
    value.startsWith("choose")
  );
}

export async function resolveCategoryId(rawValue: string): Promise<number> {
  const normalizedInput = normalizeToken(rawValue || "");
  if (isInvalidCategoryValue(normalizedInput)) {
    throw new Error("Category name is empty");
  }

  const searchInputs = buildSearchInputs(normalizedInput);
  if (searchInputs.length === 0) {
    throw new Error("Category name is empty");
  }

  const searchInputSet = new Set(searchInputs);

  const entries = await loadCategories();

  for (const entry of entries) {
    if (entry.tokens.some((token) => searchInputSet.has(token))) {
      return entry.id;
    }
  }

  let bestMatch: CategoryEntry | null = null;
  let bestScore = 0;

  for (const entry of entries) {
    const score = scoreTokens(searchInputs, entry.tokens);
    if (score === Number.POSITIVE_INFINITY) {
      return entry.id;
    }
    if (score > bestScore) {
      bestMatch = entry;
      bestScore = score;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.id;
  }

  throw new Error(`Unknown category: ${rawValue}`);
}

export function invalidateCategoryCache() {
  cache = { entries: [], expiresAt: 0 };
}
