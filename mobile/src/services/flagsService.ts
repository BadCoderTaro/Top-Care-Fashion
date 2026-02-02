import { apiClient } from "./api";
import { API_CONFIG, ApiError } from "../config/api";

export type FlagTargetType = "listing" | "user";

export interface SubmitFlagParams {
  targetType: FlagTargetType;
  targetId: string;
  category?: string;
  details?: string;
  flaggedUsername?: string;
  flaggedListingId?: string | number;
}

export interface SubmitFlagResponse {
  success: boolean;
  flag: {
    id: string;
    targetType: FlagTargetType;
    targetId: string;
    flagger: string;
    reason: string;
    status: "open" | "resolved" | "dismissed";
    createdAt: string;
  };
}

export interface UserFlagSummary {
  id: string;
  targetType: FlagTargetType;
  targetId: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  notes?: string | null;
  resolvedAt?: string | null;
}

class FlagsService {
  private normalizeFlag(raw: any): UserFlagSummary | null {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const idValue = (raw as { id?: unknown }).id;
    const id =
      typeof idValue === "number"
        ? String(idValue)
        : typeof idValue === "string" && idValue.trim().length > 0
        ? idValue.trim()
        : undefined;

    if (!id) {
      return null;
    }

    const targetTypeRaw =
      (raw as { targetType?: unknown }).targetType ??
      (raw as { target_type?: unknown }).target_type;

    const normalizedTargetType: FlagTargetType =
      typeof targetTypeRaw === "string" && targetTypeRaw.trim().toLowerCase() === "listing"
        ? "listing"
        : "user";

    const targetIdRaw =
      (raw as { targetId?: unknown }).targetId ??
      (raw as { target_id?: unknown }).target_id;

    const targetId =
      typeof targetIdRaw === "number"
        ? String(targetIdRaw)
        : typeof targetIdRaw === "string" && targetIdRaw.trim().length > 0
        ? targetIdRaw.trim()
        : "";

    const reasonRaw =
      (raw as { reason?: unknown }).reason ?? (raw as { description?: unknown }).description;
    const reason =
      typeof reasonRaw === "string" && reasonRaw.trim().length > 0 ? reasonRaw.trim() : "";

    const statusRaw = (raw as { status?: unknown }).status;
    const statusNormalized =
      typeof statusRaw === "string" ? statusRaw.trim().toLowerCase() : "";

    const status: UserFlagSummary["status"] =
      statusNormalized === "resolved"
        ? "resolved"
        : statusNormalized === "dismissed"
        ? "dismissed"
        : "open";

    const createdAtRaw =
      (raw as { createdAt?: unknown }).createdAt ??
      (raw as { created_at?: unknown }).created_at;
    const createdAt =
      typeof createdAtRaw === "string" && createdAtRaw.trim().length > 0
        ? createdAtRaw
        : createdAtRaw instanceof Date
        ? createdAtRaw.toISOString()
        : new Date().toISOString();

    const resolvedAtRaw =
      (raw as { resolvedAt?: unknown }).resolvedAt ??
      (raw as { resolved_at?: unknown }).resolved_at;
    const resolvedAt =
      typeof resolvedAtRaw === "string" && resolvedAtRaw.trim().length > 0
        ? resolvedAtRaw
        : resolvedAtRaw instanceof Date
        ? resolvedAtRaw.toISOString()
        : null;

    const notesRaw = (raw as { notes?: unknown }).notes;
    const notes =
      typeof notesRaw === "string"
        ? notesRaw
        : typeof notesRaw === "number"
        ? String(notesRaw)
        : null;

    return {
      id,
      targetType: normalizedTargetType,
      targetId,
      reason,
      status,
      createdAt,
      resolvedAt,
      notes,
    } satisfies UserFlagSummary;
  }

  async getMyFlags(): Promise<UserFlagSummary[]> {
    try {
      const response = await apiClient.get<{ reports?: unknown }>(
        API_CONFIG.ENDPOINTS.REPORTS,
      );

      const payload = response.data;
      let rawFlags: unknown[] = [];

      if (Array.isArray(payload)) {
        rawFlags = payload as unknown[];
      } else if (payload && typeof payload === "object") {
        const maybeArray = [
          (payload as { reports?: unknown }).reports,
          (payload as { data?: unknown }).data,
          (payload as { items?: unknown }).items,
        ].find((value): value is unknown[] => Array.isArray(value));

        if (maybeArray) {
          rawFlags = maybeArray;
        } else {
          const single = (payload as { report?: unknown }).report;
          if (single && typeof single === "object") {
            rawFlags = [single];
          }
        }
      }

      return rawFlags
        .map((flag) => this.normalizeFlag(flag))
        .filter((flag): flag is UserFlagSummary => flag !== null);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || "Failed to load flags");
      }
      throw error;
    }
  }

  async submitFlag(params: SubmitFlagParams): Promise<SubmitFlagResponse> {
    const { targetType, targetId, category, details, flaggedUsername, flaggedListingId } = params;

    if (!targetType) {
      throw new Error("targetType is required");
    }
    if (!targetId) {
      throw new Error("targetId is required");
    }
    if ((!category || !category.trim()) && (!details || !details.trim())) {
      throw new Error("Please provide a flag category or details");
    }

    const payload = {
      targetType,
      targetId,
      category: category?.trim() || undefined,
      details: details?.trim() || undefined,
      reportedUsername: flaggedUsername?.trim() || undefined,
      reportedListingId: flaggedListingId ?? undefined,
    };

    try {
      const response = await apiClient.post<SubmitFlagResponse>(
        API_CONFIG.ENDPOINTS.REPORTS,
        payload,
      );

      if (!response.data?.success) {
        const maybeMessage = (response.data as any)?.message;
        throw new Error(
          typeof maybeMessage === "string" ? maybeMessage : "Flag submission failed",
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        const serverMessage =
          (typeof error.response?.error === "string" && error.response.error) ||
          (typeof error.response?.message === "string" && error.response.message);
        throw new Error(serverMessage || error.message || "Flag submission failed");
      }
      throw error;
    }
  }
}

export const flagsService = new FlagsService();

