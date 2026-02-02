// mobile/src/config/api.ts
// Global API configuration for Top Care Fashion

import Constants from "expo-constants";

const expoExtra = (Constants?.expoConfig?.extra ?? {}) as Record<string, unknown>;
const DEFAULT_PROD_API_BASE_URL = "https://top-care-fashion.vercel.app";

function readEnv(key: string): string | undefined {
  const envValue = process.env[key];
  if (typeof envValue === "string" && envValue.trim().length > 0) {
    return envValue;
  }
  const extraValue = expoExtra[key];
  return typeof extraValue === "string" && extraValue.trim().length > 0 ? extraValue : undefined;
}

const preferLocalInDev = (() => {
  const raw = readEnv("EXPO_PUBLIC_PREFER_LOCAL_API");
  if (raw === undefined) return false; // ✅ 默认禁用自动使用本地开发服务器
  const normalized = raw.trim().toLowerCase();
  return normalized !== "0" && normalized !== "false";
})();

function resolveDevBaseUrl(): string | undefined {
  if (!__DEV__ || !preferLocalInDev) return undefined;

  const expoAny = Constants as Record<string, any>;
  const hostCandidates: Array<string | undefined> = [
    typeof Constants?.expoConfig?.hostUri === "string" ? Constants.expoConfig.hostUri : undefined,
    typeof expoAny?.expoGoConfig?.hostUri === "string" ? expoAny.expoGoConfig.hostUri : undefined,
    typeof expoAny?.expoGoConfig?.debuggerHost === "string" ? expoAny.expoGoConfig.debuggerHost : undefined,
    typeof expoAny?.manifest?.debuggerHost === "string" ? expoAny.manifest.debuggerHost : undefined,
    typeof expoAny?.manifest2?.extra?.expoClient?.hostUri === "string"
      ? expoAny.manifest2.extra.expoClient.hostUri
      : undefined,
    typeof expoAny?.manifest2?.extra?.expoClient?.debuggerHost === "string"
      ? expoAny.manifest2.extra.expoClient.debuggerHost
      : undefined,
    readEnv("EXPO_DEV_SERVER_HOST"),
    readEnv("REACT_NATIVE_PACKAGER_HOSTNAME"),
  ];

  const hostUri = hostCandidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);
  if (!hostUri) return undefined;

  const host = hostUri.split(":")[0];
  if (!host) return undefined;

  const port = readEnv("EXPO_PUBLIC_DEV_API_PORT") ?? "3000";
  const localOverride = readEnv("EXPO_LOCAL_HOST_ADDRESS")?.trim();

  if (host === "127.0.0.1" || host === "localhost" || host.endsWith(".exp.direct")) {
    if (localOverride && localOverride.length > 0) return `http://${localOverride}:${port}`;
    if (host.endsWith(".exp.direct")) return undefined; // tunnel can't reach arbitrary local ports
    return `http://${host}:${port}`;
  }

  return `http://${host}:${port}`;
}

const configuredBaseUrl = readEnv("EXPO_PUBLIC_API_URL") ?? readEnv("EXPO_PUBLIC_API_BASE_URL");
const resolvedBaseUrl = resolveDevBaseUrl() ?? configuredBaseUrl ?? DEFAULT_PROD_API_BASE_URL;

export const API_BASE_URL = resolvedBaseUrl;

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.info(`[api] Using base URL: ${API_BASE_URL}`);
}

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    LISTINGS: "/api/listings",
    SEARCH: "/api/search",  // 新的搜索端点（支持feed算法）
    USERS: "/api/users",
    AUTH: {
      SIGNIN: "/api/auth/signin",
      SIGNUP: "/api/auth/register",
      ME: "/api/auth/me",
      SIGNOUT: "/api/auth/signout",
      FORGOT_PASSWORD: "/api/auth/forgot-password",
      RESET_PASSWORD: "/api/auth/reset-password",
      CHANGE_PASSWORD: "/api/auth/change-password",
    },
    PROFILE: "/api/profile",
    FEEDBACK: "/api/feedback",
    FAQ: "/api/faq",
    SITE_STATS: "/api/site-stats",
    LIKES: "/api/likes",
    ORDERS: "/api/orders",
    CART: "/api/cart",
    AI: {
      CLASSIFY: "/api/ai/classify",
      DESCRIBE: "/api/ai/describe",
      SAFE: "/api/ai/safe",
    },
    REPORTS: "/api/reports",

    FEED: {
      HOME: "/api/feed/home",
      // Friendly aliases (server may proxy these; client helpers below also work even if not)
      FORYOU: "/api/feed/foryou",
      TRENDING: "/api/feed/trending",
    },
  },
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,

  // 已废弃：统一通过 apiClient 注入 Authorization 头
  // 保留空实现以兼容旧代码，但请不要再使用
  getAuthHeaders: () => ({}),
} as const;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(public message: string, public status: number, public response?: any) {
    super(message);
    this.name = "ApiError";
  }
}

// Normalize slashes; prevent POST→GET via redirects or misformed URLs
export function buildUrl(path: string) {
  return `${API_BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export const DEBUG_API = process.env.EXPO_PUBLIC_DEBUG_API === "1";

// ===== Feed types =====
export type HomeFeedItem = {
  id: number;
  title: string | null;
  image_url: string | null;
  price_cents: number;
  brand: string | null;
  tags: string[];
  source: "trending" | "brand" | "tag" | "brand&tag" | "affinity" | "collab";
  fair_score: number; // 0..1
  final_score?: number | null;
  is_boosted?: boolean;
  boost_weight?: number | null;
};

export type HomeFeedResponse = {
  items: HomeFeedItem[];
  meta?: Record<string, any>;
};

// ===== Simple GET/POST helpers =====
function withQuery(url: string, params?: Record<string, any>) {
  if (!params || Object.keys(params).length === 0) return url;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  return `${url}?${usp.toString()}`;
}

export async function apiGet<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const url = withQuery(buildUrl(path), params);
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(`HTTP ${res.status}: ${text || res.statusText}`, res.status, text);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(to);
  }
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const url = buildUrl(path);
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(`HTTP ${res.status}: ${text || res.statusText}`, res.status, text);
    }
    return (await res.json().catch(() => ({}))) as T;
  } finally {
    clearTimeout(to);
  }
}

// ===== Feed helpers (use HOME with mode param; work even if aliases aren't deployed) =====
type FeedParams = { limit?: number; page?: number; seedId?: number; tag?: string };
const toOffset = (page = 1, limit = 20) => Math.max(0, (page - 1) * limit);

/** Personalized feed (requires JWT). */
export async function fetchForYouFeed(
  params: FeedParams,
  token: string
): Promise<HomeFeedResponse> {
  const { limit = 20, page = 1, seedId, tag } = params ?? {};
  const url = withQuery(buildUrl(API_CONFIG.ENDPOINTS.FEED.HOME), {
    mode: "foryou",
    limit,
    offset: toOffset(page, limit),
    seedId,
    tag,
  });

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(`HTTP ${res.status}: ${text || res.statusText}`, res.status, text);
    }
    return (await res.json()) as HomeFeedResponse;
  } finally {
    clearTimeout(to);
  }
}

/** Public trending feed (no JWT required). */
export async function fetchTrendingFeed(params: FeedParams): Promise<HomeFeedResponse> {
  const { limit = 20, page = 1, seedId, tag } = params ?? {};
  return apiGet<HomeFeedResponse>(API_CONFIG.ENDPOINTS.FEED.HOME, {
    mode: "trending",
    limit,
    offset: toOffset(page, limit),
    seedId,
    tag,
  });
}
