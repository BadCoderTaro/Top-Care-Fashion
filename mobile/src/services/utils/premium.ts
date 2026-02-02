const TRUTHY_STRINGS = new Set([
  "true",
  "1",
  "yes",
  "y",
  "t",
  "on",
  "active",
  "enabled",
  "paid",
]);

const PREMIUM_KEYWORDS = ["premium", "vip", "pro", "gold", "elite", "plus"];

const parseDateCandidate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const coerceBoolean = (value: unknown): boolean => {
  if (!value) {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (value instanceof Date) {
    return value.getTime() > Date.now();
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    if (TRUTHY_STRINGS.has(normalized)) {
      return true;
    }

    return PREMIUM_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }

  return false;
};

export const resolvePremiumFlag = (...sources: unknown[]): boolean => {
  const stack: unknown[] = [...sources];
  const seen = new WeakSet<object>();

  while (stack.length) {
    const current = stack.pop();
    if (current === undefined || current === null) {
      continue;
    }

    if (coerceBoolean(current)) {
      return true;
    }

    if (typeof current === "object") {
      if (Array.isArray(current)) {
        stack.push(...current);
        continue;
      }

      if (seen.has(current)) {
        continue;
      }
      seen.add(current);

      const candidateDate =
        parseDateCandidate((current as any).premiumUntil ?? (current as any).premium_until ?? (current as any).premiumExpiry ?? (current as any).premium_expiry ?? (current as any).subscriptionExpiresAt ?? (current as any).subscription_expires_at ?? (current as any).expiresAt ?? (current as any).expires_at);
      if (candidateDate && candidateDate.getTime() > Date.now()) {
        return true;
      }

      stack.push(
        (current as any).isPremium,
        (current as any).is_premium,
        (current as any).isPremiumUser,
        (current as any).is_premium_user,
        (current as any).premium,
        (current as any).premium_user,
        (current as any).premiumMember,
        (current as any).premium_member,
        (current as any).hasPremium,
        (current as any).has_premium,
        (current as any).membershipTier,
        (current as any).membership_tier,
        (current as any).plan,
        (current as any).tier,
        (current as any).level,
        (current as any).status,
        (current as any).type,
        (current as any).role,
        (current as any).subscription,
        (current as any).membership,
        (current as any).profile,
        (current as any).user,
        (current as any).account,
        (current as any).flags
      );
    }
  }

  return false;
};

export const booleanFromUnknown = (value: unknown): boolean => coerceBoolean(value);