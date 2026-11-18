# 미추홀캠 오늘 뭐 먹지?

인천대학교 **미추홀캠퍼스(테크노파크역)** 인근 식당들을 5개 구역별로 필터링하고, 슬롯머신 롤링으로 빠르게 결정해 주는 웹앱입니다.  
**Cloudflare Workers (Static Assets) + KV** 기반으로 동작합니다.

## 5개 구역 구성
1. **미추홀캠 내부·인근**: 사범대 학식, 갯벌타워 구내식당, IT/AT센터, 오네스타 등
2. **송현아**: 현대프리미엄아울렛 송도점(B1·1F·3F) 식사 매장
3. **트리플 ABC동(지하)**: 트리플스트리트 A·B·C동 지하 식당가
4. **트리플 ABC동(지상)**: 트리플스트리트 A·B·C동 지상 식당가
5. **트리플 D동**: 트리플스트리트 D동 (지하·지상 통합)

## Cloudflare Workers + KV 배포 가이드

### 1. KV 네임스페이스 먼저 생성 & ID 등록 (가장 중요)
1. Cloudflare 대시보드 → **Storage & Databases** → **KV** → **Create a namespace** (이름 예: `michuhol-food-kv`)
2. 생성된 KV 네임스페이스 옆의 **ID**를 복사
3. 이 프로젝트의 `wrangler.toml`에서 `id = "여기에_KV_네임스페이스_ID_붙여넣기"` 부분을 복사한 ID로 교체

### 2. GitHub 푸시 후 Workers 배포
1. 수정한 `wrangler.toml`을 포함해 GitHub 저장소에 푸시
2. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Import a repository** → GitHub 저장소 연결
3. 빌드/배포 명령 확인:
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy`
4. **Deploy** 실행

### 3. 관리자 비밀번호(`ADMIN_PASSWORD`) 설정 및 사용
1. 배포된 Worker → **Settings** → **Variables and Secrets** → **+ Add**
2. **Type**: `Secret` / **Variable name**: `ADMIN_PASSWORD` / **Value**: 원하는 비밀번호 입력 후 저장/배포
   *(미설정 상태에서는 서버 내부 기본값 `1234`로 작동하므로 배포 후 반드시 변경하세요.)*
3. 웹사이트 화면에서 **`Ctrl + Shift + M`** 을 누르면 관리자 비밀번호 입력창이 열립니다. (로그인 상태는 해당 브라우저에 유지됩니다.)
