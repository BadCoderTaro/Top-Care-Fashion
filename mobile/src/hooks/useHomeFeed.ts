// mobile/src/hooks/useHomeFeed.ts
// Home feed hook: pull-to-refresh, load more, optional client-side prefs,
// aware of mode=foryou|trending and JWT handling.

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  API_BASE_URL,
  API_CONFIG,
  type HomeFeedItem,
  type HomeFeedResponse,
  fetchForYouFeed,
  fetchTrendingFeed,
} from "../config/api";

export type FeedMode = "foryou" | "trending";

export type FeedOptions = {
  mode?: FeedMode;          // default 'foryou'
  limit?: number;           // default 20
  seedId?: number;          // reproducibility
  tag?: string;             // optional server filter
  authToken?: string | null;// required for 'foryou'
  preferImagesFirst?: boolean;
  hideUnknownBrand?: boolean;
};

export function useHomeFeed(initial: FeedOptions = {}) {
  const [items, setItems] = useState<HomeFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const optsRef = useRef<FeedOptions>({
    mode: "foryou",
    limit: 20,
    ...initial,
  });

  // Ensure we start with a seed if none was provided
  useEffect(() => {
    if (optsRef.current.seedId === undefined) {
      const INT32_MAX = 2_147_483_647;
      const s = (Date.now() % INT32_MAX) | 0;
      optsRef.current.seedId = s;
      if (__DEV__) console.info("[feed] init seedId", s);
    }
  }, []);

  const buildParams = useCallback(
    (
      overrides?: Partial<FeedOptions> & {
        page?: number;
        cacheBust?: number;
        noStore?: 0 | 1;
      }
    ) => {
      const o = { ...optsRef.current, ...(overrides ?? {}) };
      const params: Record<string, any> = {
        limit: o.limit ?? 20,
        seedId: o.seedId,
        tag: o.tag,
      };
      // These are just passthroughs to your Next.js route (you already read them there)
      if (overrides?.page) params.page = overrides.page;
      if (overrides?.cacheBust) params.cacheBust = overrides.cacheBust;
      if (overrides?.noStore) params.noStore = overrides.noStore;
      return { o, params };
    },
    []
  );

  const applyClientPrefs = useCallback((list: HomeFeedItem[]) => {
    const { preferImagesFirst, hideUnknownBrand } = optsRef.current;
    let result = list;

    if (preferImagesFirst) {
      result = [...result].sort((a, b) => {
        const ai = a.image_url ? 1 : 0;
        const bi = b.image_url ? 1 : 0;
        if (bi !== ai) return bi - ai; // images first
        return (b.fair_score ?? 0) - (a.fair_score ?? 0); // then score
      });
    }

    if (hideUnknownBrand) {
      result = result.filter(
        (x) => x.brand && x.brand.trim() !== "" && x.brand.toLowerCase() !== "n/a"
      );
    }

    // Deduplicate by id
    const seen = new Set<number>();
    const deduped: HomeFeedItem[] = [];
    for (const it of result) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        deduped.push(it);
      }
    }

    return deduped;
  }, []);

  const fetchPage = useCallback(
    async (pageNum: number, extra?: { cacheBust?: number; noStore?: 0 | 1 }) => {
      const { o, params } = buildParams({ page: pageNum, ...extra });
      const { mode = "foryou", limit = 20, seedId, tag, authToken } = o;

      // Log the fully-resolved URL for visibility (nice in dev)
      const qs = new URLSearchParams({
        ...(mode ? { mode } : {}),
        ...(limit ? { limit: String(limit) } : {}),
        ...(seedId !== undefined ? { seedId: String(seedId) } : {}),
        ...(tag ? { tag } : {}),
        ...(extra?.cacheBust ? { cacheBust: String(extra.cacheBust) } : {}),
        ...(extra?.noStore ? { noStore: String(extra.noStore) } : {}),
        // NOTE: we keep "page" for logs; backend uses offset internally
        ...(pageNum ? { page: String(pageNum) } : {}),
      });
      const fullUrl =
        `${API_BASE_URL.replace(/\/+$/, "")}` +
        `${API_CONFIG.ENDPOINTS.FEED.HOME}` +
        `?${qs.toString()}`;
      if (__DEV__) console.info("[feed] GET", fullUrl);

      // Call proper helper (adds Authorization header for foryou)
      let data: HomeFeedResponse;
      if (mode === "trending") {
        data = await fetchTrendingFeed({ limit, page: pageNum, seedId, tag });
      } else {
        if (!authToken) {
          throw new Error("Authentication required for personalized feed.");
        }
        data = await fetchForYouFeed({ limit, page: pageNum, seedId, tag }, authToken);
      }

      if (__DEV__) {
        const ids = (data.items ?? []).map((x: HomeFeedItem) => x.id);
        console.info(
          `[feed] mode=${mode} page=${pageNum} seed=${seedId} ids:`,
          ids
        );
      }

      return data;
    },
    [buildParams]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Bypass server cache for faster iteration at startup
      const data = await fetchPage(1, { cacheBust: Date.now(), noStore: 1 });
      const next = applyClientPrefs(data.items ?? []);
      setItems(next);
      setPage(1);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [applyClientPrefs, fetchPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Randomize seed to reshuffle on refresh
      const nowMs = Date.now();
      const INT32_MAX = 2_147_483_647;
      optsRef.current.seedId = (nowMs % INT32_MAX) | 0; // clamp to signed 32-bit

      // Bypass 20s server cache and force new seed to take effect
      const data = await fetchPage(1, { cacheBust: nowMs, noStore: 1 });
      const next = applyClientPrefs(data.items ?? []);
      setItems(next);
      setPage(1);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRefreshing(false);
    }
  }, [applyClientPrefs, fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || refreshing) return;
    setLoading(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const data = await fetchPage(nextPage); // keep normal caching for pagination
      const merged = applyClientPrefs([...items, ...(data.items ?? [])]);
      setItems(merged);
      setPage(nextPage);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [applyClientPrefs, fetchPage, items, loading, page, refreshing]);

  const setOptions = useCallback((next: Partial<FeedOptions>) => {
    optsRef.current = { ...optsRef.current, ...next };
  }, []);

  const state = useMemo(
    () => ({ items, loading, refreshing, error, page }),
    [items, loading, refreshing, error, page]
  );

  return { ...state, loadInitial, refresh, loadMore, setOptions };
}
