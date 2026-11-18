import { SEED_RESTAURANTS } from './data/seedRestaurants.ts';
import {
  KV_RESTAURANTS_KEY,
  jsonResponse,
  resolveAdminPassword,
  sanitizeRestaurants,
} from './lib/restaurantSchema.ts';

export interface Env {
  ASSETS: Fetcher;
  FOOD_KV?: KVNamespace;
  ADMIN_PASSWORD?: string;
}

async function handleRestaurants(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    try {
      if (!env.FOOD_KV) {
        return jsonResponse({ restaurants: SEED_RESTAURANTS, source: 'seed' });
      }

      const stored = await env.FOOD_KV.get(KV_RESTAURANTS_KEY, 'json');
      const validated = sanitizeRestaurants(stored);

      if (!validated) {
        return jsonResponse({ restaurants: SEED_RESTAURANTS, source: 'seed' });
      }

      return jsonResponse({ restaurants: validated, source: 'kv' });
    } catch (err) {
      console.error('Failed to load restaurants from KV:', err);
      return jsonResponse({ error: '식당 목록을 불러오지 못했습니다.' }, 500);
    }
  }

  if (request.method === 'PUT') {
    const passwordHeader = request.headers.get('x-admin-password') ?? '';
    const expectedPassword = resolveAdminPassword(env.ADMIN_PASSWORD);

    if (passwordHeader !== expectedPassword) {
      return jsonResponse({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
    }

    if (!env.FOOD_KV) {
      return jsonResponse(
        { error: 'Cloudflare KV(FOOD_KV) 바인딩이 설정되지 않았습니다.' },
        500,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: '잘못된 JSON 요청입니다.' }, 400);
    }

    const candidate =
      body && typeof body === 'object' && 'restaurants' in body
        ? (body as { restaurants: unknown }).restaurants
        : body;

    const validated = sanitizeRestaurants(candidate);
    if (!validated) {
      return jsonResponse(
        { error: '식당 데이터 형식이 올바르지 않습니다. 이름과 구역을 확인해 주세요.' },
        400,
      );
    }

    try {
      await env.FOOD_KV.put(KV_RESTAURANTS_KEY, JSON.stringify(validated));
      return jsonResponse({ restaurants: validated, source: 'kv' });
    } catch (err) {
      console.error('Failed to persist restaurants to KV:', err);
      return jsonResponse({ error: '식당 목록 저장에 실패했습니다.' }, 500);
    }
  }

  return jsonResponse({ error: '지원하지 않는 HTTP 메서드입니다.' }, 405);
}

async function handleVerifyAdmin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: '지원하지 않는 HTTP 메서드입니다.' }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: '잘못된 JSON 요청입니다.' }, 400);
  }

  const submitted =
    body && typeof body === 'object' && typeof (body as { password?: unknown }).password === 'string'
      ? (body as { password: string }).password
      : '';

  const expected = resolveAdminPassword(env.ADMIN_PASSWORD);

  if (submitted !== expected) {
    return jsonResponse({ ok: false, error: '비밀번호가 일치하지 않습니다.' }, 401);
  }

  return jsonResponse({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/restaurants') {
      return handleRestaurants(request, env);
    }

    if (url.pathname === '/api/verify-admin') {
      return handleVerifyAdmin(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
