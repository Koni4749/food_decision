# 미추홀캠 오늘 뭐 먹지?

인천대학교 **미추홀캠퍼스(테크노파크역)** 인근 식당들을 5개 구역별로 필터링하고, 슬롯머신 롤링으로 빠르게 결정해 주는 웹앱입니다.  
**Cloudflare Workers (Static Assets) + KV** 기반으로 동작하여, 관리자 모드로 식당을 추가·수정·삭제하면 링크로 접속한 친구들 화면에도 즉시 반영됩니다.

## 5개 구역 구성
1. **미추홀캠 내부·인근**: 사범대 학식, 갯벌타워 구내식당, IT/AT센터, 오네스타 등
2. **송현아**: 현대프리미엄아울렛 송도점(B1·1F·3F) 식사 매장
3. **트리플 ABC동(지하)**: 트리플스트리트 A·B·C동 지하 식당가
4. **트리플 ABC동(지상)**: 트리플스트리트 A·B·C동 지상 식당가
5. **트리플 D동**: 트리플스트리트 D동 (지하·지상 통합)

## Cloudflare Workers + KV 배포 방법 (GitHub 연동)

1. **GitHub 저장소에 코드 푸시**
   - `wrangler.toml`, `src/worker.ts`, `package.json`, `package-lock.json` 등이 모두 포함되도록 푸시합니다.
2. **Cloudflare Workers 프로젝트 생성 (Workers Builds)**
   - Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Import a repository** → GitHub 저장소 연결
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy`
   - 첫 배포 시 `wrangler.toml`의 `[[kv_namespaces]]` (`binding = "FOOD_KV"`) 설정에 따라 KV 네임스페이스가 자동으로 생성·연결됩니다.
3. **관리자 비밀번호(Secret) 설정**
   - 생성된 Worker → **Settings** → **Variables and Secrets** → **Add**
   - Type: **Secret** / Variable name: `ADMIN_PASSWORD` / Value: 원하는 비밀번호 (미설정 시 기본값 `1234`)
