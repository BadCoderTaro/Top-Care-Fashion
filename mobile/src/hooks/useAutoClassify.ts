// mobile/src/hooks/useAutoClassify.ts
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { classifyImage, describeProduct, type ClassifyResponse } from "../services/aiService";

type DescribeResponse = {
  category: string;
  labels?: string[];
  blurb?: string;
  meta?: any;
};

export type AutoClassifyItem = {
  uri: string;
  status: "pending" | "classifying" | "describing" | "done" | "error";
  classification?: ClassifyResponse | null;
  description?: DescribeResponse | null;
  error?: string | null;
};

type Options = {
  autoDescribe?: boolean;     // default: true
  concurrency?: number;       // default: 2
  onUpdate?: (items: AutoClassifyItem[]) => void;
};

export function useAutoClassify(uris: string[], opts: Options = {}) {
  const { autoDescribe = true, concurrency = 2, onUpdate } = opts;

  // Live state rendered to UI
  const [items, setItems] = useState<AutoClassifyItem[]>(
    () => uris.map(uri => ({ uri, status: "pending" }))
  );
  const [running, setRunning] = useState(false);

  // Refs for internal control flow (don't trigger rerenders)
  const cancelRef = useRef(false);
  const itemsRef = useRef<AutoClassifyItem[]>([]); // snapshot used by runner

  // Reset queue whenever the URI list changes (and stop any run in progress)
  useEffect(() => {
    cancelRef.current = true;           // stop current run if any
    setRunning(false);
    setItems(uris.map(uri => ({ uri, status: "pending" })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris.join("|")]); // fine for small arrays

  // Keep onUpdate informed of UI-visible changes
  useEffect(() => {
    onUpdate?.(items);
  }, [items, onUpdate]);

  // Public controls
  const start = useCallback(() => {
    // snapshot current queue for the runner so it won't depend on `items` state
    itemsRef.current = items;
    cancelRef.current = false;
    setRunning(true);
  }, [items]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setRunning(false);
  }, []);

  // Re-queue helpers (do not auto-start)
  const requeueAll = useCallback(() => {
    setItems(prev => prev.map(x => ({ ...x, status: "pending", error: null })));
  }, []);

  const requeueOne = useCallback((uri: string) => {
    setItems(prev =>
      prev.map(x => (x.uri === uri ? { ...x, status: "pending", error: null } : x))
    );
  }, []);

  // Runner: processes the snapshot in itemsRef.current
  useEffect(() => {
    if (!running) return;

    const localItems = itemsRef.current; // immutable snapshot for this run
    if (!localItems || localItems.length === 0) {
      setRunning(false);
      return;
    }

    cancelRef.current = false;
    let active = 0;
    let idx = 0;

    const runNext = async () => {
      if (cancelRef.current) return;

      // When all started tasks finish and nothing left to start -> stop
      if (idx >= localItems.length && active === 0) {
        setRunning(false);
        return;
      }

      while (!cancelRef.current && active < concurrency && idx < localItems.length) {
        const cur = idx++;
        active++;
        processItem(cur).finally(() => {
          active--;
          // Schedule next picks
          runNext();
        });
      }
    };

    const processItem = async (i: number) => {
      try {
        // mark classifying
        setItems(prev => {
          const c = [...prev];
          const existing = c[i];
          if (existing) c[i] = { ...existing, status: "classifying", error: null };
          return c;
        });

        const cls = await classifyImage(localItems[i].uri);
        if (cancelRef.current) return;

        let desc: DescribeResponse | undefined;
        if (autoDescribe) {
          // mark describing
          setItems(prev => {
            const c = [...prev];
            const existing = c[i];
            if (existing) c[i] = { ...existing, status: "describing", classification: cls };
            return c;
          });

          desc = await describeProduct(cls.category, cls.labels ?? []);
          if (cancelRef.current) return;
        }

        // mark done
        setItems(prev => {
          const c = [...prev];
          const existing = c[i];
          if (existing) {
            c[i] = {
              ...existing,
              status: "done",
              classification: cls,
              description: desc ?? existing.description,
              error: null,
            };
          }
          return c;
        });
      } catch (e: any) {
        if (cancelRef.current) return;
        setItems(prev => {
          const c = [...prev];
          const existing = c[i];
          if (existing) c[i] = { ...existing, status: "error", error: e?.message || "Failed" };
          return c;
        });
      }
    };

    // kick off
    runNext();

    // cleanup cancels further scheduling
    return () => {
      cancelRef.current = true;
    };
  }, [running, concurrency, autoDescribe]); // ⬅️ no `items` here

  const progress = useMemo(() => {
    const total = items.length || 1;
    const done = items.filter(x => x.status === "done").length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [items]);

  return { items, running, start, cancel, progress, requeueAll, requeueOne };
}
