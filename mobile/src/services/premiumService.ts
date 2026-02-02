import { apiClient } from './api';

export type PremiumPlan = '1m' | '3m' | '1y';

export interface PremiumStatus {
  isPremium: boolean;
  premiumUntil: string | null;
}

export interface PremiumUpgradeResponse {
  ok: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    role: 'User' | 'Admin';
    status: 'active' | 'suspended';
    isPremium: boolean;
    premiumUntil: string | null;
  }
}

class PremiumService {
  async getStatus(): Promise<PremiumStatus> {
    const res = await apiClient.get('/api/profile/premium');
    return {
      isPremium: Boolean((res.data as any)?.isPremium),
      premiumUntil: (res.data as any)?.premiumUntil ?? null,
    };
  }

  async upgrade(plan: PremiumPlan, payment?: { brand?: string; last4?: string; expiry?: string; cvv?: string }): Promise<PremiumUpgradeResponse> {
    const res = await apiClient.post('/api/profile/premium', {
      plan,
      payment_method: payment?.brand,
      payment_details: payment ?? undefined,
    });
    return res.data as PremiumUpgradeResponse;
  }

  async cancel(): Promise<PremiumStatus> {
    const res = await apiClient.delete('/api/profile/premium');
    return {
      isPremium: Boolean((res.data as any)?.isPremium),
      premiumUntil: (res.data as any)?.premiumUntil ?? null,
    };
  }
}

export const premiumService = new PremiumService();
export type PremiumServiceType = PremiumService;
