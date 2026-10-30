export const loginRateLimit = (): number =>
  Number(process.env.LOGIN_RATE_LIMIT ?? 5);
 
export const loginRateTtlMs = (): number =>
  Number(process.env.LOGIN_RATE_TTL_MS ?? 60_000);
 