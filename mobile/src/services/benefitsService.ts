import { apiClient } from "./api";
import { ApiError } from "../config/api";

export interface PromotionPricing {
  price: number;
  regularPrice: number;
  discount: number;
  isPremium: boolean;
}

export interface UserBenefitsPayload {
  user: {
    id: number;
    username: string;
    isPremium: boolean;
    premiumUntil: string | null;
  };
  benefits: {
    isPremium: boolean;
    listingLimit: number | null;
    commissionRate: number;
    promotionPrice: number;
    promotionPricing?: PromotionPricing;
    freePromotionLimit: number | null;
    mixMatchLimit: number | null;
    badge: string | null;
    activeListingsCount: number;
    canCreateListing: boolean;
    mixMatchUsedCount: number;
    mixMatchRemaining: number | null;
    canUseMixMatch: boolean;
    freePromotionsUsed: number;
    freePromotionsRemaining: number;
    canUseFreePromotion: boolean;
    freePromotionResetAt: string | null;
  };
}

export type MixMatchUsageResult =
  | { status: "ok"; used: number }
  | { status: "limit"; used: number; message: string; reason?: string };

export class BenefitsService {
  async getUserBenefits(): Promise<UserBenefitsPayload> {
    const res = await apiClient.get<{ success?: boolean; data?: UserBenefitsPayload }>(
      "/api/user/benefits"
    );

    if (res.data?.data) {
      return res.data.data;
    }

    throw new Error("Failed to fetch user benefits");
  }

  async useMixMatch(): Promise<MixMatchUsageResult> {
    try {
      const res = await apiClient.post<{ ok?: boolean; used?: number }>(
        "/api/user/benefits/use-mixmatch"
      );
      const body = res.data ?? {};
      return {
        status: "ok",
        used: typeof body.used === "number" ? body.used : 0,
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        const payload = (error.response ?? {}) as {
          used?: number;
          message?: string;
          reason?: string;
        };
        return {
          status: "limit",
          used: typeof payload.used === "number" ? payload.used : 0,
          message:
            typeof payload.message === "string"
              ? payload.message
              : "Mix & Match usage limit reached.",
          reason: typeof payload.reason === "string" ? payload.reason : undefined,
        };
      }
      throw error;
    }
  }
}

export const benefitsService = new BenefitsService();
export type BenefitsServiceType = BenefitsService;
