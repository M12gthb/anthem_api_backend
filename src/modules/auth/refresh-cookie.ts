import type { CookieOptions } from 'express';

export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/auth';

export const refreshTtlMs = (): number =>
  Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7) * 24 * 60 * 60 * 1000;

export function refreshCookieOptions(): CookieOptions {
  const sameSite = (process.env.COOKIE_SAMESITE ?? 'lax') as
    | 'lax'
    | 'strict'
    | 'none';

  return {
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: REFRESH_COOKIE_PATH, 
    maxAge: refreshTtlMs(),
  };
}

export function clearCookieOptions(): CookieOptions {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  return options;
}