import { Restaurant, ZoneId } from '../types.ts';

interface SeedItem {
  name: string;
  zone: ZoneId;
}

const RAW_SEEDS: readonly SeedItem[] = [
  // 1. 미추홀캠 내부·인근 (인천대 미추홀캠퍼스 및 테크노파크역 인접 빌딩)
  { name: '사범대식당 (학식)', zone: 'michuhol' },
  { name: '갯벌타워 구내식당', zone: 'michuhol' },
  { name: '차이앤 (IT센터)', zone: 'michuhol' },
  { name: '까몬 (AT센터)', zone: 'michuhol' },
  { name: '제주은희네해장국', zone: 'michuhol' },
  { name: '강뼈탕&찜 (트리플타워)', zone: 'michuhol' },
  { name: '마루젠우동 (오네스타)', zone: 'michuhol' },
  { name: '스시도쿠 (오네스타)', zone: 'michuhol' },

  // 2. 송현아 (현대프리미엄아울렛 송도점 공식 층별안내 B1·1F·3F)
  { name: '온센', zone: 'songhyuna' },
  { name: '광화문미진', zone: 'songhyuna' },
  { name: '남산돈까스', zone: 'songhyuna' },
  { name: '남포수제비', zone: 'songhyuna' },
  { name: '더 라멘워', zone: 'songhyuna' },
  { name: '데판본가', zone: 'songhyuna' },
  { name: '딤타오', zone: 'songhyuna' },
  { name: '롤치니', zone: 'songhyuna' },
  { name: '뭄알로이', zone: 'songhyuna' },
  { name: '버거킹', zone: 'songhyuna' },
  { name: '본가스시', zone: 'songhyuna' },
  { name: '에키노마에', zone: 'songhyuna' },
  { name: '온드린', zone: 'songhyuna' },
  { name: '왕푸징마라탕', zone: 'songhyuna' },
  { name: '이솥우화', zone: 'songhyuna' },
  { name: '중화가정', zone: 'songhyuna' },
  { name: '편장군족발', zone: 'songhyuna' },
  { name: '한강로칼국수', zone: 'songhyuna' },
  { name: '한솔냉면', zone: 'songhyuna' },
  { name: '이터스', zone: 'songhyuna' },
  { name: '청밀당', zone: 'songhyuna' },
  { name: '매드포갈릭', zone: 'songhyuna' },

  // 3. 트리플 ABC동(지하) (트리플스트리트 공식 매장안내 B·C동 B1~B3)
  { name: '담솥', zone: 'triple_abc_b' },
  { name: '더플레이스', zone: 'triple_abc_b' },
  { name: '미도인', zone: 'triple_abc_b' },
  { name: '바네스타코', zone: 'triple_abc_b' },
  { name: '반궁', zone: 'triple_abc_b' },
  { name: '북촌손만두', zone: 'triple_abc_b' },
  { name: '소소헌', zone: 'triple_abc_b' },
  { name: '스시로', zone: 'triple_abc_b' },
  { name: '유가네닭갈비', zone: 'triple_abc_b' },
  { name: '장혁민의 부대찌개', zone: 'triple_abc_b' },
  { name: '정씨함박', zone: 'triple_abc_b' },
  { name: '차이797', zone: 'triple_abc_b' },
  { name: '코코로벤또', zone: 'triple_abc_b' },
  { name: '규카츠정', zone: 'triple_abc_b' },
  { name: '명동칼국수', zone: 'triple_abc_b' },
  { name: '뽁식당', zone: 'triple_abc_b' },
  { name: '샤오바오 우육면', zone: 'triple_abc_b' },
  { name: '용호낙지', zone: 'triple_abc_b' },
  { name: '포플러스쌀국수', zone: 'triple_abc_b' },
  { name: '홍대돈부리', zone: 'triple_abc_b' },
  { name: '홍수계찜닭', zone: 'triple_abc_b' },
  { name: '한끼맛있다', zone: 'triple_abc_b' },

  // 4. 트리플 ABC동(지상) (트리플스트리트 공식 매장안내 A·B·C동 1F~2F)
  { name: '후라토식당', zone: 'triple_abc_g' },
  { name: '저스트텐동', zone: 'triple_abc_g' },
  { name: '삼청동샤브', zone: 'triple_abc_g' },
  { name: '마라공방', zone: 'triple_abc_g' },
  { name: '애슐리퀸즈', zone: 'triple_abc_g' },
  { name: '쉐이크쉑', zone: 'triple_abc_g' },
  { name: '에이직피자', zone: 'triple_abc_g' },
  { name: '올드타운', zone: 'triple_abc_g' },
  { name: '참피온삼겹살', zone: 'triple_abc_g' },
  { name: '마카오훠궈', zone: 'triple_abc_g' },
  { name: '깨비옥', zone: 'triple_abc_g' },
  { name: '돈블랑', zone: 'triple_abc_g' },
  { name: '마초스테이크', zone: 'triple_abc_g' },
  { name: '배부장찌개', zone: 'triple_abc_g' },
  { name: '부안순대국', zone: 'triple_abc_g' },
  { name: '써브웨이', zone: 'triple_abc_g' },
  { name: '오봉집', zone: 'triple_abc_g' },
  { name: '죠죠', zone: 'triple_abc_g' },
  { name: '캡틴루이', zone: 'triple_abc_g' },
  { name: '화화쿵주마라탕', zone: 'triple_abc_g' },

  // 5. 트리플 D동 (트리플스트리트 공식 매장안내 D동 지하·지상 통합)
  { name: '99왕돈까스', zone: 'triple_d' },
  { name: '니뽕내뽕', zone: 'triple_d' },
  { name: '맘스터치', zone: 'triple_d' },
  { name: '상카츠', zone: 'triple_d' },
  { name: '샤브보트', zone: 'triple_d' },
  { name: '단막', zone: 'triple_d' },
  { name: '문가네 정육식당', zone: 'triple_d' },
  { name: '버커스프롬오스틴', zone: 'triple_d' },
  { name: '상상첨', zone: 'triple_d' },
  { name: '손정보쌈', zone: 'triple_d' },
  { name: '솥고집', zone: 'triple_d' },
  { name: '시월십일', zone: 'triple_d' },
];

export const SEED_RESTAURANTS: Restaurant[] = RAW_SEEDS.map((item, index) => ({
  id: `seed-${item.zone}-${String(index + 1).padStart(3, '0')}`,
  name: item.name,
  zone: item.zone,
}));
