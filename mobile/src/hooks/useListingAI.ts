import { useCallback, useRef, useState } from "react";
import {
  classifyImage,
  describeProduct,
  ClassifyResponse,
  DescribeResponse,
} from "../services/aiService";

/** Optional lifecycle callbacks */
type Callbacks = {
  onStatus?: (s: "idle" | "classify" | "describe" | "done" | "error") => void;
  onClassified?: (c: ClassifyResponse) => void;
  onDescribed?: (d: DescribeResponse) => void;
};

type Options = {
  /** Automatically call describe after classify (default: true) */
  autoDescribe?: boolean;
  /** Lifecycle callbacks */
  callbacks?: Callbacks;
};

type LoadingStage = null | "classify" | "describe";

export function useListingAI(opts: Options = {}) {
  const { autoDescribe = true, callbacks } = opts;

  // ---- state
  const [loading, setLoading] = useState<LoadingStage>(null);
  const [error, setError] = useState<string | null>(null);
  const [classification, setClassification] = useState<ClassifyResponse | null>(null);
  const [description, setDescription] = useState<DescribeResponse | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // operation guard: ignore late responses from an older run
  const opIdRef = useRef(0);

  const setStage = (s: LoadingStage, statusForCb: Callbacks["onStatus"] extends (...a: any) => any ? Parameters<NonNullable<Callbacks["onStatus"]>>[0] : any) => {
    setLoading(s);
    callbacks?.onStatus?.(statusForCb);
  };

  const reset = useCallback(() => {
    setError(null);
    setClassification(null);
    setDescription(null);
    // keep imageUri so user doesn’t have to re-pick
  }, []);

  /** Start the pipeline: classify → (optional) describe */
  const run = useCallback(async (uri: string) => {
    const op = ++opIdRef.current;
    setImageUri(uri);
    setError(null);
    setClassification(null);
    setDescription(null);

    try {
      setStage("classify", "classify");
      const cls = await classifyImage(uri);
      if (op !== opIdRef.current) return; // cancelled/overwritten
      setClassification(cls);
      callbacks?.onClassified?.(cls);

      if (!autoDescribe) {
        setStage(null, "done");
        return;
      }

      setStage("describe", "describe");
      const labels = cls.labels ?? [];
      const desc = await describeProduct(cls.category, labels);
      if (op !== opIdRef.current) return;
      setDescription(desc);
      setStage(null, "done");
      callbacks?.onDescribed?.(desc);
    } catch (e: any) {
      if (op !== opIdRef.current) return;
      setError(e?.message || "Something went wrong");
      setStage(null, "error");
    }
  }, [autoDescribe, callbacks]);

  /** Re-run describe using the latest classification (e.g., “Regenerate”) */
  const regenerate = useCallback(async () => {
    if (!classification) return;
    const op = ++opIdRef.current;
    setError(null);
    setStage("describe", "describe");
    try {
      const desc = await describeProduct(classification.category, classification.labels ?? []);
      if (op !== opIdRef.current) return;
      setDescription(desc);
      setStage(null, "done");
      callbacks?.onDescribed?.(desc);
    } catch (e: any) {
      if (op !== opIdRef.current) return;
      setError(e?.message || "Failed to regenerate description");
      setStage(null, "error");
    }
  }, [classification, callbacks]);

  /** Allow manual tweak of category/labels before describing (advanced UX) */
  const describeWith = useCallback(async (category: string, labels: string[]) => {
    const op = ++opIdRef.current;
    setError(null);
    setStage("describe", "describe");
    try {
      const desc = await describeProduct(category, labels);
      if (op !== opIdRef.current) return;
      setDescription(desc);
      setStage(null, "done");
      callbacks?.onDescribed?.(desc);
    } catch (e: any) {
      if (op !== opIdRef.current) return;
      setError(e?.message || "Describe failed");
      setStage(null, "error");
    }
  }, [callbacks]);

  /** Cancel in-flight work (e.g., navigate away) */
  const cancel = useCallback(() => {
    opIdRef.current++;
    setLoading(null);
  }, []);

  return {
    // state
    loading,
    error,
    classification,
    description,
    imageUri,

    // actions
    run,            // start classify → (auto) describe
    regenerate,     // re-run describe using last classification
    describeWith,   // run describe with custom category/labels
    reset,          // clear results
    cancel,         // cancel in-flight operation

    // convenience flags
    isClassifying: loading === "classify",
    isDescribing: loading === "describe",
    isBusy: loading !== null,
  };
}
