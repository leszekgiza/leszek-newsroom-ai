/**
 * Feature flags for OSS/Premium boundary.
 * OSS: PREMIUM_ENABLED=false (default)
 * Premium: PREMIUM_ENABLED=true
 */
export const isPremiumEnabled = (): boolean =>
  process.env.PREMIUM_ENABLED === 'true';
