# 관제 대시보드 (1단계)

왼쪽 메뉴 맨 위의 「관제 대시보드」는 앱을 열면 처음 보이는 화면입니다. 다른 화면(보호 현황·업무 앱·보안 기록)이 이미 불러온 값을 한곳에 모아 보여 줍니다. 이 화면 때문에 요청을 새로 보내거나, 타이머를 돌리거나, 주기적으로 새로고침하지 않습니다. 값은 「다시 불러오기」를 누를 때와, 사용자가 다른 화면에서 버튼(도움정보 불러오기·AI 연결 점검·앱 접속 요청)을 눌렀을 때만 바뀝니다.

## 구성

| 영역 | 내용 | 읽는 값 |
|---|---|---|
| ① 앱·엔진 연결 상태 | 로컬 서버 응답 여부(5건 중 몇 건), 서버가 알려 준 엔진 모드, 도움정보의 엔진 코드 | 측정값, 응답 `meta.mode`, `/api/diagnostics` |
| ② 로그인 사용자·기기·세션 | 사용자, 현재 기기·상태, 현재 세션·상태, 등록 기기 수, 세션 수 | `/api/me`, `/api/devices`, `/api/sessions` |
| ③ 업무 앱 판정 요약 | 보이는 업무 앱 수, 사용자가 마지막으로 직접 요청한 판정 1건 | `/api/apps`, `state.access` |
| ④ AI 연결 상태 | 17단계 연결 절차 단계, AI 연결 점검 결과, 서버 설정값 존재 여부 | 연결 절차 상태, `state.aiConnection`, `/api/diagnostics` |
| 보안 기록 추이 | 기록의 `at`을 이 PC 시간대 0~23시로 나눈 건수 막대 + 「표로 보기」 | `/api/events` |
| 최근 기록 | `at`이 늦은 순서로 최대 5건 | `/api/events` |
| 이 PC에서 잰 값 | 요청별 응답 시간(ms), 응답 받은 시각, 서버가 알려 준 연결 모드, 결과, 도움정보 요약 | 브라우저 측정값 |

판정은 앱마다 사용자가 직접 요청해야 하므로, ③은 모든 앱의 허용·차단 수를 세지 않습니다. 자동으로 판정을 요청하지 않습니다.

## 출처 배지 기준

모든 카드·줄·패널에는 「출처: …」 배지가 글자로 붙습니다. 색과 테두리 모양은 보조 수단입니다.

| 배지 | 언제 | 비고 |
|---|---|---|
| 실측 | 이 브라우저가 로컬 서버에 실제로 요청해서 얻은 값: `performance.now()`로 잰 응답 시간, 응답 받은 시각, 응답 `meta.mode`, `/api/diagnostics` 결과 | 어디서(`http://127.0.0.1:포트`) 언제 쟀는지 함께 표시. 주소가 127.0.0.1이 아니면 경고 문구를 붙임 |
| 예시 값 | 응답 `meta.mode`가 `demo`인 자료(`-Demo` 예제 엔진) | "설명용 자료이며 실제 조회 결과가 아닙니다" 문구를 함께 표시 |
| 서버 조회값 | 응답 `meta.mode`가 `connected`인 자료 | 서버가 연결된 엔진에서 조회했다고 알려 준 값. 브라우저가 잰 값과 구분 |
| 연결 없음 | 응답 `meta.mode`가 `disconnected`, 오류 코드 `ENGINE_NOT_CONNECTED`, 또는 서버에 닿지 못함(`NETWORK_ERROR`) | 0건이나 정상으로 바꾸지 않음. 추이 막대도 그리지 않음 |
| 확인 불가 | `CONTRACT_MISMATCH`, `ENGINE_RESULT_UNVERIFIED`, `INVALID_RESPONSE`, `mode: unknown`, 그 밖의 실패(시간 초과·취소 등) | 오류 코드를 함께 표시 |
| 확인 전 | 아직 요청하지 않은 값(도움정보, AI 점검, 앱 판정) | 실패도 성공도 아님 |
| 불러오는 중 | 응답을 기다리는 중 | |
| 줄마다 다름 | 카드 머리에만 쓰며, 카드 안의 줄마다 출처가 다를 때 | 각 줄의 배지를 확인 |

"서버가 알려 준 연결 모드"에는 서버 응답에 실제로 들어 있던 `meta.mode`만 씁니다. 브라우저가 스스로 만든 실패(`NETWORK_ERROR`·`TIMEOUT`·`CANCELLED`·`INVALID_RESPONSE`)의 mode는 "서버가 알려 주지 않음"으로 표시합니다.

## 응답 시간을 재는 방법

- `public/app.js`의 `timedRequest()`가 기존 `request()`를 그대로 부르고, 호출 앞뒤의 `performance.now()` 차이를 기록합니다. 응답 본문(JSON)을 다 읽는 시간까지 들어갑니다.
- 재는 요청은 「다시 불러오기」의 GET 5개(`/api/me`·`devices`·`sessions`·`apps`·`events`)와 「도움정보 불러오기」의 `/api/diagnostics`뿐입니다. AI·조치·패키지 조회 요청은 재지 않습니다.
- GET 5개는 동시에 보내므로 서로 영향을 줄 수 있습니다.
- 「다시 불러오기」를 다시 누르면 이전 측정값은 "재는 중"으로 바뀌고, 늦게 도착한 이전 응답은 기록하지 않습니다(기존 세대 검사와 같음).

## 파일

| 파일 | 역할 |
|---|---|
| `public/dashboard.mjs` | `renderDashboard(target, snapshot)`. `createElement`·`textContent`로만 그림 |
| `public/app.js` | 측정 기록(`timedRequest`), 대시보드 모듈 불러오기, 값이 바뀔 때 다시 그리기. 모듈을 읽지 못해도 다른 화면은 동작 |
| `public/index.html` | `tab-dashboard` 탭과 `section#view-dashboard` |
| `public/style.css` | 카드 격자(대시보드 폭 900px 이상 4칸, 520px 이상 2칸, 그보다 좁으면 1칸), 배지, 막대 |
| `src/server.mjs` | 내보내는 파일 목록에 `/dashboard.mjs` 추가 |

대시보드에는 복사본(`structuredClone`)이 넘어가므로, 대시보드는 `state`를 고칠 수 없습니다.

## 실행과 확인 (on-client 폴더에서)

```powershell
# 기본 실행(엔진 연결 없음)
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
# 예제 실행
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1 -Demo
# 문법 확인
node --check public/dashboard.mjs
node --check public/app.js
npm run check
```

화면에서 확인할 순서:

1. 기본 실행 → `http://127.0.0.1:5189` 열기 → 첫 화면이 「관제 대시보드」인지 확인. ②·추이·최근 기록에 「출처: 연결 없음」과 `ENGINE_NOT_CONNECTED`가 보이고, 막대가 그려지지 않아야 합니다.
2. 같은 화면의 「이 PC에서 잰 값」에서 요청마다 ms 값과 응답 받은 시각, `http://127.0.0.1:5189`가 보이는지 확인.
3. 서버를 끄고 `-Demo`로 다시 실행 → ②·③·추이·최근 기록에 「출처: 예시 값」과 예시 안내 문구가 보이는지 확인.
4. 「다시 불러오기」를 누름 → 응답 받은 시각과 ms 값이 바뀌는지 확인.
5. 「보호 현황」에서 「도움정보 불러오기」를 누름 → 대시보드의 도움정보 요약과 ① 도움정보 코드가 「실측」으로 바뀌는지 확인.
6. 메뉴에 포커스를 두고 ↑·↓·Home·End로 네 화면 사이를 이동할 수 있는지 확인.
