import { SEED_RESTAURANTS } from '../data/seedRestaurants.ts';
import { ApiErrorResponse, Restaurant, RestaurantsPayload } from '../types.ts';
import { sanitizeRestaurants } from './restaurantSchema.ts';

const ADMIN_PW_STORAGE_KEY = 'michuhol_food_admin_pw_v1';

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as Partial<ApiErrorResponse>;
    if (data && typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error;
    }
  } catch {
    // Ignore non-JSON error body
  }
  return fallback;
}

/** Load stored admin password from browser localStorage for session persistence. */
export function getStoredAdminPassword(): string | null {
  try {
    const value = window.localStorage.getItem(ADMIN_PW_STORAGE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Persist or clear the admin password in browser localStorage. */
export function setStoredAdminPassword(password: string | null): void {
  try {
    if (password && password.length > 0) {
      window.localStorage.setItem(ADMIN_PW_STORAGE_KEY, password);
    } else {
      window.localStorage.removeItem(ADMIN_PW_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
}

/** Fetch the current shared restaurant list from Cloudflare KV. */
export async function fetchRestaurants(): Promise<RestaurantsPayload> {
  try {
    const response = await fetch('/api/restaurants', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new ApiRequestError(
        await parseErrorMessage(response, '식당 목록을 불러오지 못했습니다.'),
        response.status,
      );
    }

    const data = (await response.json()) as Partial<RestaurantsPayload>;
    const sanitized = sanitizeRestaurants(data.restaurants);
    if (!sanitized) {
      throw new Error('Invalid payload from /api/restaurants');
    }

    return {
      restaurants: sanitized,
      source: data.source === 'kv' ? 'kv' : 'seed',
    };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      throw err;
    }
    return { restaurants: SEED_RESTAURANTS, source: 'seed' };
  }
}

/** Verify the admin password against the Cloudflare Worker API endpoint. */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const response = await fetch('/api/verify-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (response.status === 401) {
    return false;
  }

  if (!response.ok) {
    throw new ApiRequestError(
      await parseErrorMessage(response, '관리자 인증 확인에 실패했습니다.'),
      response.status,
    );
  }

  const data = (await response.json()) as { ok?: boolean };
  return Boolean(data.ok);
}

/** Persist the updated full list of restaurants to Cloudflare KV. */
export async function saveRestaurants(
  restaurants: Restaurant[],
  adminPassword: string,
): Promise<RestaurantsPayload> {
  const response = await fetch('/api/restaurants', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': adminPassword,
    },
    body: JSON.stringify({ restaurants }),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response, '저장에 실패했습니다.');
    throw new ApiRequestError(message, response.status);
  }

  const data = (await response.json()) as Partial<RestaurantsPayload>;
  const sanitized = sanitizeRestaurants(data.restaurants) ?? restaurants;

  return {
    restaurants: sanitized,
    source: data.source === 'kv' ? 'kv' : 'seed',
  };
}
