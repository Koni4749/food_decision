export type ZoneId =
  | 'michuhol'
  | 'songhyuna'
  | 'triple_abc_b'
  | 'triple_abc_g'
  | 'triple_d';

export interface ZoneMeta {
  id: ZoneId;
  label: string;
  shortLabel: string;
  description: string;
}

export const ZONES: readonly ZoneMeta[] = [
  {
    id: 'michuhol',
    label: '미추홀캠 내부·인근',
    shortLabel: '미추홀캠·인근',
    description: '학식, 갯벌타워, IT/AT센터, 오네스타',
  },
  {
    id: 'songhyuna',
    label: '송현아',
    shortLabel: '송현아',
    description: '현대프리미엄아울렛 송도점 B1·1F·3F',
  },
  {
    id: 'triple_abc_b',
    label: '트리플 ABC동(지하)',
    shortLabel: '트리플 ABC 지하',
    description: 'A·B·C동 지하 식당가',
  },
  {
    id: 'triple_abc_g',
    label: '트리플 ABC동(지상)',
    shortLabel: '트리플 ABC 지상',
    description: 'A·B·C동 지상 1~4층',
  },
  {
    id: 'triple_d',
    label: '트리플 D동',
    shortLabel: '트리플 D동',
    description: '메가박스 라인 (지하·지상 통합)',
  },
] as const;

export const ZONE_MAP: Record<ZoneId, ZoneMeta> = {
  michuhol: ZONES[0],
  songhyuna: ZONES[1],
  triple_abc_b: ZONES[2],
  triple_abc_g: ZONES[3],
  triple_d: ZONES[4],
};

export interface Restaurant {
  id: string;
  name: string;
  zone: ZoneId;
}

export interface RestaurantsPayload {
  restaurants: Restaurant[];
  source: 'kv' | 'seed';
}

export interface ApiErrorResponse {
  error: string;
}
