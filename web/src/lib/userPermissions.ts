/**
 * 用户权限工具函数
 * 用于检查用户是否为付费用户，以及根据用户类型返回不同的限制和价格
 */

/**
 * 检查用户是否为有效的付费用户
 * @param user - 用户对象（需包含 is_premium 和 premium_until 字段）
 * @returns boolean - 是否为有效付费用户
 */
export function isPremiumUser(user: {
  is_premium?: boolean | null;
  premium_until?: Date | string | null;
}): boolean {
  if (!user.is_premium) {
    return false;
  }

  // 如果没有过期时间，说明是永久会员
  if (!user.premium_until) {
    return true;
  }

  // 检查是否过期
  const expiryDate = typeof user.premium_until === 'string' 
    ? new Date(user.premium_until) 
    : user.premium_until;
  
  return expiryDate > new Date();
}

/**
 * 获取用户的 listing 数量限制
 * @param isPremium - 是否为付费用户
 * @returns number | null - 限制数量（null 表示无限制）
 */
export function getListingLimit(isPremium: boolean): number | null {
  return isPremium ? null : 2; // Premium: 无限制, Free: 2个
}

/**
 * 获取用户的佣金率
 * @param isPremium - 是否为付费用户
 * @returns number - 佣金率（0-1之间的小数）
 */
export function getCommissionRate(isPremium: boolean): number {
  return isPremium ? 0.05 : 0.10; // Premium: 5%, Free: 10%
}

/**
 * 获取用户的 Promotion 价格（3天）
 * @param isPremium - 是否为付费用户
 * @returns number - 价格（美元）
 */
export function getPromotionPrice(isPremium: boolean): number {
  return isPremium ? 2.00 : 2.90; // Premium: $2.00, Free: $2.90
}

/**
 * 获取用户的免费 Promotion 限制（每月）
 * @param isPremium - 是否为付费用户
 * @returns number | null - 每月免费次数（null 表示无免费额度）
 */
export function getFreePromotionLimit(isPremium: boolean): number | null {
  return isPremium ? 3 : null; // Premium: 每月3次, Free: 无
}

/**
 * 检查是否需要重置免费 Promotion 计数器
 * @param lastResetDate - 上次重置时间
 * @returns boolean - 是否需要重置
 */
export function shouldResetFreePromotions(lastResetDate: Date | string | null): boolean {
  if (!lastResetDate) return true;
  
  const resetDate = typeof lastResetDate === 'string' ? new Date(lastResetDate) : lastResetDate;
  const now = new Date();
  
  // 检查是否是不同的月份
  return resetDate.getMonth() !== now.getMonth() || 
         resetDate.getFullYear() !== now.getFullYear();
}

/**
 * 检查用户是否可以使用免费 Promotion
 * @param isPremium - 是否为付费用户
 * @param usedCount - 本月已使用次数
 * @param lastResetDate - 上次重置时间
 * @returns object - 包含是否可用和相关信息
 */
export function canUseFreePromotion(
  isPremium: boolean,
  usedCount: number,
  lastResetDate: Date | string | null
): { canUse: boolean; remaining: number; needsReset: boolean } {
  const limit = getFreePromotionLimit(isPremium);
  
  if (limit === null) {
    // Free 用户没有免费额度
    return { canUse: false, remaining: 0, needsReset: false };
  }
  
  const needsReset = shouldResetFreePromotions(lastResetDate);
  const currentUsed = needsReset ? 0 : usedCount;
  const remaining = Math.max(0, limit - currentUsed);
  
  return {
    canUse: remaining > 0,
    remaining,
    needsReset,
  };
}

/**
 * 获取用户的 Promotion 折扣信息
 * @param isPremium - 是否为付费用户
 * @returns object - 包含原价、折扣价和折扣百分比
 */
export function getPromotionPricing(isPremium: boolean) {
  const regularPrice = 2.90;
  const premiumPrice = 2.00;
  const discount = ((regularPrice - premiumPrice) / regularPrice) * 100;

  return {
    price: isPremium ? premiumPrice : regularPrice,
    regularPrice,
    discount: isPremium ? Math.round(discount) : 0, // 30% off
    isPremium,
  };
}

/**
 * 获取用户的 Mix & Match AI 限制
 * @param isPremium - 是否为付费用户
 * @returns number | null - 限制次数（null 表示无限制）
 */
export function getMixMatchLimit(isPremium: boolean): number | null {
  return isPremium ? null : 3; // Premium: 无限制, Free: 3次总次数
}

/**
 * 检查用户是否达到 Mix & Match 使用限制
 * @param isPremium - 是否为付费用户
 * @param usedCount - 已使用次数
 * @returns boolean - 是否已达到限制
 */
export function hasReachedMixMatchLimit(isPremium: boolean, usedCount: number): boolean {
  const limit = getMixMatchLimit(isPremium);
  if (limit === null) return false; // 无限制
  return usedCount >= limit;
}

/**
 * 获取用户权益摘要
 * @param isPremium - 是否为付费用户
 * @returns object - 用户权益摘要
 */
export function getUserBenefits(isPremium: boolean) {
  return {
    isPremium,
    listingLimit: getListingLimit(isPremium),
    commissionRate: getCommissionRate(isPremium),
    promotionPrice: getPromotionPrice(isPremium),
    promotionPricing: getPromotionPricing(isPremium),
    freePromotionLimit: getFreePromotionLimit(isPremium),
    mixMatchLimit: getMixMatchLimit(isPremium),
    badge: isPremium ? 'Premium' : null,
  };
}

/**
 * 格式化佣金率为百分比字符串
 * @param rate - 佣金率（0-1之间的小数）
 * @returns string - 格式化的百分比字符串（如 "5%"）
 */
export function formatCommissionRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * 计算订单的佣金金额
 * @param orderAmount - 订单金额
 * @param isPremium - 是否为付费用户
 * @returns number - 佣金金额
 */
export function calculateCommission(orderAmount: number, isPremium: boolean): number {
  const rate = getCommissionRate(isPremium);
  return orderAmount * rate;
}
