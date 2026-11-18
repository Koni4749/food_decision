import { Restaurant, ZONES, ZoneId } from '../types.ts';

export const KV_RESTAURANTS_KEY = 'restaurants_v1';
export const DEFAULT_ADMIN_PASSWORD = '1234';

const VALID_ZONE_IDS = new Set<string>(ZONES.map((z) => z.id));

/** Check whether a value is one of the 5 supported campus food zones. */
export function isValidZoneId(value: unknown): value is ZoneId {
  return typeof value === 'string' && VALID_ZONE_IDS.has(value);
}

/** Resolve the configured admin password with a safe local fallback. */
export function resolveAdminPassword(configured?: string): string {
  const trimmed = configured?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ADMIN_PASSWORD;
}

/** Generate a compact unique ID for a newly created restaurant entry. */
export function createRestaurantId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate and normalize an incoming list of restaurants before persisting
 * to Cloudflare KV or local storage.
 */
export function sanitizeRestaurants(input: unknown): Restaurant[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const normalized: Restaurant[] = [];
  const seenIds = new Set<string>();

  for (const item of input) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const record = item as Record<string, unknown>;
    const rawName = typeof record.name === 'string' ? record.name.trim() : '';
    const rawZone = record.zone;

    if (!rawName || rawName.length > 80 || !isValidZoneId(rawZone)) {
      return null;
    }

    let id =
      typeof record.id === 'string' && record.id.trim().length > 0
        ? record.id.trim().slice(0, 64)
        : createRestaurantId();

    while (seenIds.has(id)) {
      id = createRestaurantId();
    }
    seenIds.add(id);

    normalized.push({
      id,
      name: rawName,
      zone: rawZone,
    });
  }

  return normalized;
}

/** Create a consistent JSON Response with no-store caching headers. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
