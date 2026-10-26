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

---

# 내 PC 상태(실측) — 학생 구현

관제 대시보드의 추이·최근 기록 아래, 「이 PC에서 잰 값」 위에 있는 패널입니다. 이 PC의 CPU 사용률, 메모리 사용량, 시스템 드라이브의 남은 공간을 보여 줍니다.

## 제공 기능이 아니라 새로 만든 기능입니다

시작 틀 0.2.11과 이 저장소(커밋 32dc7d1 시점)에는 「내 PC 상태」(CPU·메모리·디스크) 제공 기능이 없습니다.
`on-client`의 src·public·student·tools와 `packaging` 전체에서 다음 검색어로 확인했고, 코드에서 걸린 곳은 0건이었습니다.

- 검색어: `node:os`, `cpus(`, `freemem`, `totalmem`, `statfs`, `loadavg`, `process.memoryUsage`, `pc-status`, "CPU", "디스크", "메모리 사용"
- 문서에서는 `docs/STARTER_UPDATE.md` 1건이 걸렸지만, "디스크에 쓰지 않는 dry-run"이라는 다른 뜻이었습니다.

| 구분 | 내용 |
|---|---|
| 제공 기능(시작 틀) | 서버 틀(`createOnServer`, Host 검사, `{ ok, data, meta }` 응답, `bounded()` 시간 제한), `request()`, 기존 세 화면 |
| 학생 구현(이번에 새로 만듦) | `src/pc-status.mjs` 전체, `src/server.mjs`의 `/api/pc-status` 경로와 측정기 시작·정리(4곳), `public/app.js`의 `loadPcStatus`·`validPcStatus`, `public/dashboard.mjs`의 「내 PC 상태(실측)」 패널, `public/style.css`의 해당 스타일 |

## 측정 방법 (모두 실측, 일반 사용자 권한, Node 내장 모듈만)

| 값 | 방법 | 단위 |
|---|---|---|
| CPU 사용률 | `os.cpus()`의 times를 두 번 읽어 (전체 − idle) 차이 ÷ 전체 차이 | %(소수 1자리) |
| 메모리 사용량 | `os.totalmem() − os.freemem()`, 전체 대비 비율 | GB(소수 2자리), % |
| 디스크 남은 공간 | `fs.promises.statfs(시스템 드라이브)`의 `bavail × bsize`(이 사용자가 쓸 수 있는 공간), 전체 `blocks × bsize`, 남은 비율 | GB(소수 2자리), % |

- GB는 1024³ 바이트입니다(Windows 탐색기와 같은 기준).
- 시스템 드라이브는 `process.env.SystemDrive`이고, 없거나 형식이 다르면 `C:\`입니다.
- 외부 프로그램(wmic, typeperf, PowerShell 하위 프로세스)을 실행하지 않고, npm 패키지도 쓰지 않습니다.
- 값마다 `{ status: 'ok' | 'unavailable', value, unit, measuredAt, reason? }`로 따로 담습니다. 하나가 실패해도 나머지는 보여 줍니다.
- 못 읽은 값은 `value: null`, `status: 'unavailable'`과 이유로 보냅니다. 이유의 예는 "fs.statfs 를 지원하지 않는 Node 버전입니다.", "드라이브를 읽을 권한이 없습니다.", "드라이브를 찾을 수 없습니다."입니다. 화면에는 「확인 불가」와 이유를 표시하고, 0이나 예시 값으로 채우지 않습니다.
- `-Demo`에서도 이 값은 실측입니다. 응답 `meta.mode`가 `demo`여도 대시보드는 이 패널을 「예시 값」으로 바꾸지 않습니다.

## 지금 값과 추이 표본

- **지금 값:** `/api/pc-status`를 부를 때 잽니다. CPU는 0.5초 간격으로 두 번 읽은 순간값입니다. 지금 값은 추이 표본에 넣지 않습니다.
- **추이 표본:** 서버가 listen을 시작하면 15초마다 잽니다. CPU는 직전 표본 이후 약 15초 동안의 평균 사용률입니다. 첫 표본은 시작하고 15초 뒤에 생깁니다.
- 표본은 서버 프로세스 메모리에만 최대 40개(약 10분) 쌓입니다. 파일 저장과 외부 전송은 없고, 서버를 끄면 사라집니다. 타이머는 `unref()`로 걸려 있고 서버 `close` 때 멈춥니다.
- **비교:** 값마다 지금 값, 표본 평균, 최고·최저, 「지금이 평균보다 높음/낮음/같음」(화면 자릿수 기준)을 보여 줍니다. 디스크는 남은 공간을 비교합니다. 쓸 수 있는 표본이 2개 미만이면 "추이 비교 불가(표본 부족)"를 표시합니다. 확인 불가 표본은 평균·최고·최저에서 빼고, 몇 개를 뺐는지 적습니다.
- **작은 막대:** 0~100% 기준입니다(CPU 사용률, 메모리 사용 비율, 디스크 남은 비율). 못 읽은 표본은 점선 빈 칸으로 그리고, 마우스를 올리거나 화면 낭독기로 읽으면 "확인 불가(이유)"가 나옵니다. 「표로 보기」도 있습니다.

## 부르는 시점 (자동 재요청 없음)

브라우저는 다음 세 경우에만 `/api/pc-status`를 부릅니다.
- 앱을 처음 열 때(대시보드가 첫 화면)
- 「다시 불러오기」를 누를 때
- 패널의 「내 PC 상태 새로 재기」를 누를 때

다른 메뉴에서 대시보드 탭으로 돌아올 때는 다시 부르지 않습니다. 응답 시간은 「이 PC에서 잰 값」 표의 `GET /api/pc-status` 줄에 기록됩니다. 응답 형식이 맞지 않으면 「확인 불가(CONTRACT_MISMATCH)」로 표시합니다. 이 오류는 대시보드 안에서만 보여 주므로, 상단 오류 줄과 학생 `renderStatus`의 입력은 바뀌지 않습니다.

## 한계

- CPU는 Windows가 집계하는 CPU 시간 기준이라, 아주 짧은 간격(0.1초 이하)에서는 0%로 보일 수 있습니다. 그래서 지금 값은 0.5초로 잽니다.
- `os.freemem()`은 OS가 알려 주는 "사용 가능" 메모리입니다. 작업 관리자의 "사용 중"과 조금 다를 수 있습니다.
- 시스템 드라이브 하나만 봅니다.
- 포장된 설치본(`dist\Keshev`, setup.exe)에는 다시 빌드해야 들어갑니다. 포장 스크립트는 `src\**\*.mjs`를 자동으로 포함합니다.

## 확인 순서

1. `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1` → 대시보드의 「내 PC 상태(실측)」에서 CPU·메모리·디스크마다 「출처: 실측」, 값과 단위, 잰 시각을 확인합니다. 처음에는 표본이 0개여서 "추이 비교 불가(표본 부족)"가 보입니다.
2. 「내 PC 상태 새로 재기」 → 잰 시각이 바뀌고, 「이 PC에서 잰 값」의 `/api/pc-status` 응답 시간(약 500ms 이상)도 바뀝니다.
3. 1분 이상 기다린 뒤 다시 재기 → 표본 4개 안팎으로 평균·최고·최저·비교 문구와 막대가 보입니다.
4. `-Demo`로 다시 실행 → 다른 카드는 「예시 값」이지만, 이 패널은 계속 「실측」입니다.
5. 기존 「보호 현황」「업무 앱」「보안 기록」 화면과 학생 함수 표시가 그대로인지 확인합니다.

---

# 이 PC 보안 구성(읽기 전용·실측) — 학생 구현

관제 대시보드의 「내 PC 상태(실측)」 아래에 있는 패널입니다. 네트워크 구성, 방화벽 현재 적용 값, 최근 24시간 Windows 기록(System·Application)의 위험·오류·경고 건수를 보여 줍니다.

> 이 건수는 Windows 기록의 경고·오류 개수일 뿐이며, 침해나 공격 탐지 결과가 아닙니다.

## 제공 기능과 학생 구현

시작 틀 0.2.11과 이 저장소(커밋 ccb1dc4 시점)에는 네트워크·방화벽·Windows 기록을 읽는 제공 기능이 없습니다.

| 구분 | 내용 |
|---|---|
| 제공 기능(시작 틀) | 서버 틀(`createOnServer`, Host 검사, `{ ok, data, meta }`, `bounded()`), `request()`, 기존 세 화면 |
| 학생 구현(이번에 새로 만듦) | `src/pc-security.mjs` 전체, `src/server.mjs`의 `/api/pc-security` 경로(3곳), `public/app.js`의 `loadPcSecurity`·`validPcSecurity`, `public/dashboard.mjs`의 패널과 카드 ① 문구, `public/style.css`의 해당 스타일 |

## 읽는 방법 (모두 읽기 전용, 일반 사용자 권한)

| 묶음 | 값 | 방법 |
|---|---|---|
| 네트워크 | 어댑터 이름, IPv4/IPv6 주소, 내부(loopback) 여부 | `node:os` `networkInterfaces()`(MAC 은 여기서 쓰지 않음) |
| 네트워크 | 어댑터 연결 상태, MAC(가림) | `Get-NetAdapter`. MAC 은 PowerShell 안에서 뒤 두 묶음만 남기고 가린 뒤 넘김(예: `XX-XX-XX-XX-2E-FD`) |
| 네트워크 | 기본 게이트웨이 | `Get-NetRoute -AddressFamily IPv4,IPv6 \| Where-Object` 기본 경로(0.0.0.0/0, ::/0) |
| 네트워크 | DNS 서버 | `node:dns` `getServers()` |
| 방화벽 | 프로필(도메인·개인·공용)별 사용 여부, 들어오는/나가는 기본 동작 | `Get-NetFirewallProfile -PolicyStore ActiveStore` |
| Windows 기록 | System·Application 최근 24시간 위험(1)·오류(2)·경고(3) 건수, 1시간 단위 24칸, 많이 나온 원본(ProviderName) 상위 5개 | `Get-WinEvent -FilterHashtable @{LogName; Level=1,2,3; StartTime} -MaxEvents 10000`. 메시지 본문은 넘기지 않음 |

- **방화벽은 현재 적용 값(ActiveStore)입니다.** 기본 저장소(PersistentStore)에서는 들어오는/나가는 동작이 `NotConfigured`로만 보였습니다. 이 값은 그룹 정책, 회사 관리 도구, 다른 보안 프로그램이 바꿀 수 있으므로 읽은 시점의 값일 뿐입니다.
- 위험(1)·오류(2)·경고(3)는 각각 따로 셉니다. 0건이면 Windows가 `NoMatchingEventsFound`를 내는데, 이것만 0건으로 처리합니다. 로그마다 10000건이 상한이고, 닿으면 "잘림"이라고 표시합니다.
- Security 기록은 읽지 않습니다(관리자 권한이 필요하고 이번 범위가 아님).

## PowerShell 실행 규칙

- `child_process.execFile`로 `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`를 직접 실행합니다(shell 없음). 인자는 `-NoProfile -NonInteractive -Command -`입니다.
- 코드에 고정된 스크립트를 **표준 입력**으로 넘깁니다. `-EncodedCommand`(base64)는 백신이 의심 행위로 볼 수 있어 쓰지 않습니다. 요청 값은 스크립트에 넣지 않습니다.
- 스크립트는 ASCII 문자만 씁니다(입력 코드 페이지 문제를 피함). 맨 앞에서 `$ProgressPreference='SilentlyContinue'`와 출력 UTF-8을 설정해, 한글 어댑터 이름이 깨지지 않습니다.
- **허용 cmdlet**: `Get-NetAdapter`, `Get-NetRoute`, `Get-NetFirewallProfile`, `Get-WinEvent`, `Get-Date`, `ConvertTo-Json`, `Select-Object`, `Where-Object`, `ForEach-Object`, `Group-Object`, `Sort-Object`, `Measure-Object`.
  - 모듈을 불러올 때 스크립트의 cmdlet, .NET 정적 호출(`Console`·`UTF8Encoding`·`Math`만 허용), 금지 단어(`Set-`·`New-`·`Remove-`·`Enable-`·`Disable-`·`Invoke-`·`netsh`·`reg`·Security 기록 등)를 검사합니다. 어긋나면 모듈이 실패해서 서버가 뜨지 않습니다.
- PowerShell 3개(네트워크·방화벽·기록)를 동시에 실행합니다. 각각 시간 제한 10초, 출력 256KB 제한, 창 숨김입니다. 하나가 실패해도 나머지는 보여 줍니다.
- 비밀로 보이는 환경변수는 하위 프로세스에 넘기지 않습니다(`start-alekov.ps1`과 같은 기준).
- 읽는 중에 또 요청이 오면 같은 작업의 결과를 나눠 받습니다(PowerShell을 더 띄우지 않음).
- 읽은 값은 서버에 저장하지 않고 응답으로만 보냅니다. 파일 저장·외부 전송은 없고, 브라우저 화면에만 남습니다.

## 「확인 불가」 조건

값마다 `{ status: 'ok' | 'unavailable', value, unit, measuredAt, source: '이 PC', reason? }`입니다. 못 읽은 값은 0이나 "꺼짐"으로 바꾸지 않습니다.

| 상황 | 이유 표시 |
|---|---|
| 권한 거부(`UnauthorizedAccess`, `Access denied`, `0x80070005` 등) | 권한 부족(예외 이름) |
| 10초 안에 끝나지 않음 | 시간 초과(10초) |
| PowerShell 없음 | PowerShell 을 찾을 수 없습니다. |
| 출력이 256KB를 넘음 | 출력이 너무 큽니다. |
| JSON이 아니거나 형식이 다름 | 출력 형식을 확인할 수 없습니다. / 건수 형식을 확인할 수 없습니다. |
| 그 밖의 실패 | 읽기 실패(예외 이름) 또는 PowerShell 종료 코드와 stderr 요약(80자 이하, 원문 전체는 싣지 않음) |
| Windows가 아님 | Windows 가 아니라 읽을 수 없습니다. |

브라우저 쪽에서는 `validPcSecurity()`가 응답 형식을 검사합니다. 맞지 않으면 패널 전체가 「확인 불가(CONTRACT_MISMATCH)」입니다. 오류는 대시보드 안에서만 보여 주고, 학생 `renderStatus` 입력에는 넣지 않습니다.

## 읽는 시점과 표시

- 「이 PC 보안 구성 읽기」 버튼을 누를 때만 읽습니다. 처음에는 "아직 읽지 않음"을 표시합니다. 처음 열 때, 「다시 불러오기」, 자동·주기 조회로는 읽지 않습니다.
- 「다시 불러오기」를 눌러도 이전 결과는 읽은 시각과 함께 그대로 남습니다.
- 다시 읽다가 실패하면 "이번 읽기 결과 없음"과 이유를 먼저 보여 줍니다. 이전 결과는 "이전 결과입니다(읽은 시각 …). 지금 값이 아닙니다."라는 문구와 함께 따로 표시합니다.
- 값마다 출처 배지(「실측」 또는 「확인 불가」), 잰 시각, 단위(개·건), 읽은 방법을 글자로 붙입니다.
- Windows 기록 막대는 24칸입니다. 위험·오류·경고를 쌓아 그리고, 위험은 빗금을 넣고 범례를 글자로 붙여 색만으로 구분하지 않습니다. 툴팁과 「표로 보기」도 있습니다. 확인 불가인 기록은 막대에서 빼고, 뺐다고 적습니다.
- **「SDP 미연결」과 「이 PC 조회」를 섞지 않습니다.** 카드 ①의 "SDP 엔진 연결" 줄은 SDP 연결 상태만 보여 줍니다(기본 실행: "SDP 미연결(disconnected)", 「연결 없음」). 이 패널은 SDP와 상관없는 실측이고, `-Demo`에서도 실측입니다.

## 시험 결과 (2026-10-26, 이 PC)

이 세션의 계정은 **Administrators 그룹 계정이지만, 관리자 권한이 상승되지 않은 제한 토큰**(UAC 켜짐)이었습니다.

| 명령 | 결과 |
|---|---|
| `os.networkInterfaces()`, `dns.getServers()` | 성공 |
| `Get-NetAdapter`, `Get-NetRoute`(기본 경로) | 성공(각 0.1초 안쪽) |
| `Get-NetRoute -DestinationPrefix ::/0` | IPv6 기본 경로가 없으면 "개체 없음" 오류 → `Where-Object`로 거르는 방식으로 바꿈 |
| `Get-NetIPConfiguration` | 성공하지만 4초 걸려서 쓰지 않음 |
| `Get-NetFirewallProfile -PolicyStore ActiveStore` | 성공(세 프로필 사용, 들어오는 차단·나가는 허용) |
| `Get-WinEvent` System·Application 24시간 | 성공 |
| 서버 `/api/pc-security`(기본·`-Demo`) | 200, 약 1.8초, 값 모두 `ok`, 출처 「이 PC」 |

권한 거부가 난 항목은 없었습니다. 「권한 부족」 표시는 가짜 실행기로 오류를 흉내 낸 단위 시험으로만 확인했습니다.

## 미확인

- **표준 사용자 계정에서의 결과.** 이 시험은 관리자 그룹 계정의 제한 토큰으로 했습니다. 처음부터 표준 사용자인 계정, 회사 정책이 걸린 PC에서는 일부 값(특히 방화벽·기록)이 「확인 불가」로 나올 수 있습니다.
- 실제 권한 거부 상황에서의 화면
- 기록이 10000건을 넘는 PC에서의 시간과 잘림 표시
- 브라우저에서 보이는 모습(막대·표·툴팁)

## 확인 순서

1. `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1` → 대시보드 카드 ①의 "SDP 엔진 연결"이 "SDP 미연결(disconnected)"·「연결 없음」인지 봅니다.
2. 「이 PC 보안 구성(읽기 전용·실측)」 패널에 "아직 읽지 않음"이 보이는지 봅니다.
3. 「이 PC 보안 구성 읽기」 → 몇 초 뒤 네트워크·방화벽·Windows 기록에 「출처: 실측」, 잰 시각, 단위가 보입니다. 기록 묶음 위에는 "탐지 결과가 아닙니다" 문구가, 아래에는 24칸 막대와 「표로 보기」가 보입니다.
4. 「다시 불러오기」 → 이 패널의 결과와 읽은 시각은 그대로입니다. 「이 PC에서 잰 값」 표의 `/api/pc-security` 줄도 바뀌지 않습니다.
5. `-Demo`로 다시 실행 → 카드 ①은 「예시 값」(SDP 아님·예제 엔진)이고, 이 패널을 읽으면 계속 「실측」입니다.
6. 기존 「보호 현황」「업무 앱」「보안 기록」 화면과 학생 함수 표시가 그대로인지 봅니다.

---

# 화면 다듬기 (핵심 기능 순서, 다시 조회, 실패 목록, 키보드)

## 학생 영역(student/extension.mjs)에서 하지 않은 이유

이번 변경은 모두 제공 화면(`public/dashboard.mjs`·`app.js`·`style.css`)에서 했습니다. 학생 함수 8개(`renderIdentity`·`renderDecision`·`renderEvents`·`renderStatus`·`renderVulnerabilities`·`renderAiConnection`·`renderExplanation`·`renderAction`)와 13~20단계 표시는 바꾸지 않았습니다. 학생 영역에서 할 수 없는 이유는 셋입니다.

1. **관제 대시보드에는 학생 칸이 없습니다.** 제공 화면이 학생 결과를 넣는 칸(STUDENT_SLOTS)은 보호 현황·업무 앱·보안 기록 화면의 8칸뿐입니다. 학생 함수에 넘기는 값에도 내 PC 상태·보안 구성·측정값이 없습니다.
2. **`createStudentView`가 `api`를 받지 않습니다.** 제공 화면은 `createStudentView({ api, onChange })`로 부르지만, 학생 코드는 `createStudentView()`로 정의돼 있어 조회 기능을 쓰지 않습니다.
3. **STUDENT_GET_PATHS 제한이 있습니다.** 학생이 쓸 수 있는 조회는 `/api/me`·`/api/apps`·`/api/events`·`/api/devices`·`/api/sessions`·`/api/vulnerabilities`뿐입니다. `/api/pc-status`·`/api/pc-security`는 없습니다. 이 목록을 넓히면 학생 코드가 PowerShell 읽기(`/api/pc-security`)를 부를 수 있게 되므로 넓히지 않았습니다.

`student/appearance.json`은 없고, 서버 files 목록과 app.js에도 읽는 코드가 없습니다. **현재 시작 틀은 appearance.json을 지원하지 않습니다.**

## 배치 (위→아래, Tab 순서도 같음)

1. 바로 가기 링크: 「상태 카드 4개로 가기」「내 PC 상태로 가기」「이 PC 보안 구성으로 가기」
2. 갱신 안내, 출처 배지 읽는 법
3. 상태 카드 4개(카드 ① "SDP 엔진 연결"에 SDP 미연결 구분)
4. 내 PC 상태(실측)
5. 이 PC 보안 구성(읽기 전용·실측)
6. 기록 추이 · 최근 기록
7. 이 PC에서 잰 값

패널 틀(제목·버튼·상태 문장)은 한 번만 만들고, 이후에는 내용만 바꿉니다. 그래서 다시 그려도 버튼 포커스와 「출처 배지 읽는 법」의 펼침 상태가 그대로 남습니다. 오류 안내 등이 틀을 덮으면 다음 그리기 때 틀을 다시 만듭니다.

## 「다시 조회」와 대기 표시

| 패널 | 버튼 | 보내는 요청 |
|---|---|---|
| 내 PC 상태 | 다시 조회 | `/api/pc-status` 1건 |
| 이 PC 보안 구성 | 처음 「이 PC 보안 구성 읽기」, 한 번 읽은 뒤 「다시 조회」 | `/api/pc-security` 1건 |
| 이 PC에서 잰 값 | 다시 조회 | 「다시 불러오기」와 같은 요청(GET 5개 + 내 PC 상태). 보안 구성·도움정보는 다시 부르지 않음 |

- 「이 PC에서 잰 값」 버튼 옆에는 "「다시 불러오기」와 같습니다. 업무 앱 판정 결과와 진행 중인 AI 설명·조치 화면이 초기화됩니다(AI 연결 점검·설치 패키지 조회 결과도 함께 지워집니다)."가 글자로 적혀 있습니다. 이유는 `loadAll()`이 `cancelInteractive()`(판정·AI 연결 점검·AI 설명·조치)와 `clearVulnerabilities()`를 부르기 때문입니다.
- **조회 중**에는 다음과 같이 바뀝니다.
  - 버튼 글자가 "조회 중…"이 되고 `aria-disabled="true"`, 점선 테두리로 흐리게 보입니다.
  - `disabled`를 쓰지 않으므로 포커스는 버튼에 그대로 남습니다. 대신 코드가 클릭·Enter·Space를 무시합니다.
  - 패널에 `aria-busy="true"`가 붙습니다.
  - 패널마다 있는 상태 문장(`role="status"`, `aria-live="polite"`)이 "…를 조회하는 중입니다." → "…를 조회했습니다(시각)."로 바뀝니다. 같은 문장은 다시 넣지 않아 반복해서 읽히지 않습니다.
- 끝나면 `aria-disabled`·`aria-busy`를 지우고 버튼 글자를 되돌립니다.
- 같은 이름의 버튼이 여럿이라, 화면 낭독기용 이름은 "내 PC 상태 다시 조회"·"이 PC에서 잰 값 다시 조회"처럼 붙어 있습니다.
- 자동·주기 조회는 없습니다.

## 실패 화면

- 실패하면 패널 안에 「실패한 항목 / 이유 / 다음에 할 일」 목록이 나옵니다. 요청 전체가 실패한 경우와, 값 일부가 「확인 불가」인 경우 둘 다 해당합니다.
- 다음에 할 일의 예:

| 상황 | 다음에 할 일 |
|---|---|
| 서버에 닿지 못함 | 앱 실행 창(케셰브 서버)이 켜져 있는지 확인한 뒤 「다시 조회」 |
| 시간 초과 | 잠시 뒤 「다시 조회」, 계속되면 PC가 바쁜지 확인 |
| 형식 불일치 | 화면과 서버가 같은 버전인지 확인(설치본이면 다시 설치) |
| 권한 부족 | 관리자 권한 없이는 읽을 수 없는 항목이며, 이 앱은 권한을 올리지 않음 |
| SDP 미연결(`ENGINE_NOT_CONNECTED`) | 받을 자료가 없으며, SDP 연결 설정은 이 화면에서 하지 않음 |

- 내 PC 상태는 실패하면 이전 값을 보여 주지 않습니다.
- 이 PC 보안 구성은 이전 결과를 "이전 결과(읽은 시각 …) · 지금 값 아님" 표시와 함께 따로 둡니다.
- 예시 값을 지금 값처럼 보여 주지 않습니다. 실측·예시 값 구분(배지·잰 시각·단위)은 그대로입니다.

## 키보드만으로 쓰기

- Tab 순서는 화면 순서와 같습니다(CSS로 순서를 바꾸지 않음).
- 바로 가기 링크를 누르면 해당 영역(`tabindex="-1"`)으로 포커스가 옮겨 갑니다.
- 버튼·링크·「표로 보기」(`summary`)·메뉴 탭에는 `:focus-visible` 노란 외곽선(3px)이 보입니다.
- 막대에 마우스를 올려야만 보이던 값은 「표로 보기」에 글자로 모두 있고, 막대 옆에 "막대 값은 「표로 보기」에서 글자로 볼 수 있습니다."라고 적었습니다. 출처 배지의 설명은 「출처 배지 읽는 법」에 글자로 있습니다.

## 설치본 반영 확인

저장소 파일을 고쳐도 설치본에는 저절로 들어가지 않습니다. 다시 빌드하고 다시 설치해야 합니다. `build-package.ps1`은 이번에 고친 `public\app.js`·`dashboard.mjs`·`style.css`와 `docs\PRODUCT_DASHBOARD.md`를 고정 목록으로 담습니다.

```powershell
# 1) 빌드 결과 목록과 저장소 대조 (D:\keshev-dashboard)
$list = Get-Content .\dist\Keshev\PACKAGE-FILES.txt | Where-Object { $_ -match '^([0-9a-f]{64})\s+\d+\s+app\(.+)$' } | ForEach-Object { [pscustomobject]@{ Hash = $Matches[1]; Path = $Matches[2] } }
$list | ForEach-Object { $r = (Get-FileHash ".\on-client\$($_.Path)" -Algorithm SHA256).Hash.ToLower(); '{0,-6} {1}' -f $(if ($r -eq $_.Hash) { 'same' } else { 'DIFF' }), $_.Path }

# 2) 설치 폴더와 저장소 대조
$inst = Join-Path $env:LOCALAPPDATA 'Programs\Keshev\app'
'public\app.js','public\dashboard.mjs','public\style.css','public\index.html','src\server.mjs','src\pc-status.mjs','src\pc-security.mjs','student\extension.mjs','docs\PRODUCT_DASHBOARD.md' | ForEach-Object {
  $a = (Get-FileHash ".\on-client\$_" -Algorithm SHA256).Hash; $b = if (Test-Path "$inst\$_") { (Get-FileHash "$inst\$_" -Algorithm SHA256).Hash } else { 'missing' }
  '{0,-8} {1}' -f $(if ($a -eq $b) { 'same' } elseif ($b -eq 'missing') { 'missing' } else { 'DIFF' }), $_ }
```
