# 케셰브 — 내 PC에서 쓰는 보안 Agent (0.1.0, 검증 중)

케셰브는 **이 PC에서만** 열리는 보안 Agent 화면입니다. 앱 서버가 `127.0.0.1`(이 PC 자신)에서만 열려, 다른 PC에서는 접속할 수 없습니다. 브라우저로 다음을 봅니다.

- **관제 대시보드**(첫 화면): 앱·엔진 연결 상태, 로그인 사용자·기기, 업무 앱 판정, AI 연결 상태
- **내 PC 상태(실측)**: CPU·메모리·디스크
- **이 PC 보안 구성(읽기 전용·실측)**: 네트워크, 방화벽 현재 적용 값, 최근 24시간 Windows 기록의 경고·오류 건수
- 보호 현황·업무 앱·보안 기록 화면

> **검증 중인 버전입니다.** 실제 회사 시스템(SDP), 계정 연결, 앱 안 AI, 조치 실행, 취약점 조회(OSV) 연결은 확인하지 않았습니다(미확인). 그래서 기본 실행 화면에 「연결 없음」이 보이는 것이 정상입니다. 「연결 없음」은 0건이나 안전하다는 뜻이 아닙니다.

실행 방법은 둘입니다. 둘 중 하나만 고르면 됩니다.

| | 경로 A: 소스로 실행 | 경로 B: 설치 프로그램 |
|---|---|---|
| 이런 분께 | Git·Node.js를 쓸 줄 아는 분 | 프로그램처럼 설치해 쓰려는 분 |
| Node.js | **필요**(22~24, 기준 24.19.0) | 필요 없음(설치 프로그램에 들어 있음) |
| Git | 필요(받을 때) | 필요 없음 |
| 관리자 권한 | 필요 없음 | 필요 없음(이 사용자에게만 설치) |

## 필요한 것

- Windows x64, Windows PowerShell 5.1(Windows에 기본으로 있음), 최신 Edge 또는 Chrome
  - 작성자 PC: Windows 11 Pro, PowerShell 5.1.26100. Windows 10은 확인하지 않았습니다.
- 경로 A만:
  - [Node.js](https://nodejs.org) 22~24(기준 **24.19.0** LTS)
  - Git
  - 외부 npm 패키지가 없어서 `npm install`은 필요 없습니다.
- 경로 B에서 설치 프로그램을 직접 만들 때만: [Inno Setup 6](https://jrsoftware.org/isdl.php)(`winget install JRSoftware.InnoSetup`)

Node.js가 있는지는 새 PowerShell 창에서 `node --version`으로 확인합니다. `v24.19.0`처럼 v22~v24가 나오면 됩니다.

## 경로 A: 소스로 실행

### 받기

```powershell
git clone https://github.com/y49959946-debug/keshev-dashboard.git
cd keshev-dashboard\on-client
```

### 실행

`on-client` 폴더에서:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
```

`-ExecutionPolicy Bypass`는 이번 한 번의 실행에만 적용되며, PC 설정을 바꾸지 않습니다.

**정상 시작 신호**: 아래 줄들이 보이면 켜진 것입니다.

```
케셰브가 켜졌습니다. 브라우저에서 http://127.0.0.1:5189/ 을 여세요.
서버가 응답한 것만 확인했습니다. AI 연결 상태는 화면에서 따로 확인해 주세요.
끄려면 이 창에서 Ctrl+C 를 누르세요.
```

브라우저에서 **http://127.0.0.1:5189/** 를 엽니다.

- 예제 자료로 화면을 보려면 같은 명령 끝에 ` -Demo`를 붙입니다. 예제 자료는 「예시 값」으로 표시되며 실제 조회 결과가 아닙니다.

### 끄기

- **기본(권장)**: 실행한 PowerShell 창에서 **Ctrl+C**를 누릅니다. 브라우저 주소가 더 이상 열리지 않으면 꺼진 것입니다.
- **창 없이 켰을 때**(명령 끝에 ` -Background`): 켤 때 "뒤에서 실행 중입니다(프로세스 번호 1234)"처럼 번호가 나옵니다. 그 번호로 끕니다.

  ```powershell
  # 1) 5189 포트의 프로세스가 이 앱(on-client\src\server.mjs)인지 확인
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$((Get-NetTCPConnection -LocalPort 5189 -State Listen).OwningProcess)"
  $p.ProcessId; $p.CommandLine
  # 2) 이 앱이 맞으면 끄기(켤 때 나온 번호와 같아야 합니다)
  Stop-Process -Id $p.ProcessId
  ```

### 다시 실행

같은 `on-client` 폴더에서 실행 명령을 다시 입력합니다. 켜고 끄는 것만으로는 파일이 바뀌지 않습니다.

## 경로 B: 설치 프로그램

### 받기

[Releases](https://github.com/y49959946-debug/keshev-dashboard/releases) 페이지에서 `Keshev-Setup-0.1.0.exe`를 받습니다.

받은 파일이 올린 파일과 같은지 확인합니다. Release 페이지에 적힌 SHA256과 아래 명령의 결과가 같아야 합니다.

```powershell
Get-FileHash .\Keshev-Setup-0.1.0.exe -Algorithm SHA256
```

Releases에 파일이 없으면 아래 「설치 프로그램 직접 만들기」로 만듭니다.

### 설치

1. `Keshev-Setup-0.1.0.exe`를 실행합니다.
   - 코드 서명이 없어서 Windows SmartScreen("Windows의 PC 보호")이 뜰 수 있습니다. 위에서 SHA256을 확인한 파일일 때만 「추가 정보」→「실행」을 누릅니다.
   - 관리자 권한(UAC) 창은 뜨지 않습니다.
2. 안내 화면을 읽고 설치합니다. 설치 위치는 `%LOCALAPPDATA%\Programs\Keshev`(이 사용자 전용)로 고정입니다. 바탕화면 바로가기는 선택 항목입니다.

### 실행

시작 메뉴 → **케셰브 → 케셰브 시작**

**정상 시작 신호**: 잠깐 뜨는 창에 아래 줄들이 보이고, 기본 브라우저에 http://127.0.0.1:5189/ 가 열립니다.

```
케셰브가 켜졌습니다. 브라우저에서 http://127.0.0.1:5189/ 을 여세요.
포함된 Node 로 실행 중입니다: …\Programs\Keshev\runtime\node\node.exe
끄려면 시작 메뉴의 「케셰브 종료」를 누르세요.
```

이미 켜져 있을 때 다시 누르면 "케셰브가 이미 켜져 있습니다"가 나오고, 새로 켜지 않고 화면만 엽니다.

### 끄기·다시 실행·제거

- **끄기**: 시작 메뉴 → **케셰브 → 케셰브 종료**. "케셰브를 껐습니다"가 나옵니다. 설치 폴더의 케셰브만 끄고, 다른 Node.js 프로그램은 건드리지 않습니다.
- **다시 실행**: 「케셰브 시작」을 다시 누릅니다.
- **제거**: Windows 설정 → 앱 → 설치된 앱 → 「케셰브 0.1.0」 → 제거
  - 제거하기 전에 실행 중인 케셰브를 자동으로 끕니다.
  - 설치 폴더(`%LOCALAPPDATA%\Programs\Keshev`)와 시작 메뉴의 「케셰브」 폴더가 없어집니다. 설치 폴더 밖의 파일은 지우지 않습니다.

### 설치 프로그램 직접 만들기

Inno Setup 6이 필요합니다. 저장소 맨 위 폴더(`keshev-dashboard`)에서:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\packaging\build-package.ps1 -Installer
```

- Node.js 24.19.0 공식 zip을 받아 공식 SHA256과 대조하고, 다르면 멈춥니다.
- 끝나면 `packaging\output\Keshev-Setup-0.1.0.exe`와 그 크기·SHA256이 화면에 나옵니다.
- 자세한 내용은 [packaging/README.md](packaging/README.md)에 있습니다.

## 화면에서 보이는 것

첫 화면은 **「관제 대시보드」**입니다. 모든 값에는 「출처: …」 배지가 **글자로** 붙어 있습니다.

| 배지 | 뜻 |
|---|---|
| 실측 | 이 PC에서 실제로 잰 값(응답 시간, CPU·메모리·디스크, 보안 구성 등). 잰 시각과 단위가 함께 나옵니다 |
| 예시 값 | `-Demo` 예제 자료. 설명용이며 실제 조회 결과가 아닙니다 |
| 연결 없음 | 엔진(SDP)이 연결되지 않았거나 서버에 닿지 못함. **기본 실행에서 정상**이며, 0건이나 안전하다는 뜻이 아닙니다 |
| 확인 불가 | 실패했거나 형식이 맞지 않아 알 수 없음. 정상으로 보지 마세요. 이유와 「다음에 할 일」이 함께 나옵니다 |
| 확인 전 | 아직 요청하지 않음(버튼을 눌러야 읽는 값) |
| 서버 조회값 | SDP가 연결된 경우(connected) 서버가 조회한 값 |

- 상태 카드 ①의 "SDP 엔진 연결"은 기본 실행에서 **「SDP 미연결(disconnected)」**입니다.
- 「내 PC 상태」와 「이 PC 보안 구성」은 SDP와 상관없는 이 PC 조회라, `-Demo`에서도 「실측」입니다.
- 「이 PC 보안 구성」은 「이 PC 보안 구성 읽기」를 누를 때만 읽습니다(몇 초 걸림). 설정은 바꾸지 않습니다.
- Windows 기록의 경고·오류 건수는 개수일 뿐이며, 침해나 공격 탐지 결과가 아닙니다.
- 값은 「다시 불러오기」·「다시 조회」를 누를 때만 바뀝니다. 자동 새로고침은 없습니다.

## 자주 막히는 곳

| 증상 | 해결 |
|---|---|
| `Node.js 가 없습니다` (경로 A) | Node.js 24.19.0을 설치하고, **PowerShell 창을 새로 연 뒤** 다시 실행합니다. 설치가 어려우면 경로 B를 씁니다 |
| `지금 Node.js 는 vXX 입니다` | Node.js 22~24를 설치합니다 |
| `포트 5189 를 다른 프로그램이 쓰고 있습니다` | 경로 A: 명령 끝에 ` -Port 5190`을 붙이고 http://127.0.0.1:5190/ 을 엽니다. 경로 B는 5189 고정이라, 5189를 쓰는 프로그램(다른 경로로 켠 케셰브 포함)을 먼저 끕니다 |
| `앱 폴더가 아닙니다` / `시작 틀 폴더가 아닙니다` | `keshev-dashboard\on-client` 폴더 안에서 실행했는지 확인합니다 |
| "이 시스템에서 스크립트를 실행할 수 없으므로…" | 명령에 `-ExecutionPolicy Bypass`가 들어 있는지 확인합니다. 회사 정책으로 막힌 PC에서는 실행되지 않을 수 있습니다 |
| SmartScreen "Windows의 PC 보호" | 코드 서명이 없어서 나옵니다. SHA256을 확인한 파일이면 「추가 정보」→「실행」 |
| 브라우저에 주소가 안 열림 | 실행 창의 시작 신호를 확인합니다. 주소는 `http://127.0.0.1:5189/`(https 아님)입니다 |
| `…초 안에 뜨지 않았습니다` | 창의 메시지를 확인합니다. 화면의 「보호 현황 › 도움정보」에서 비밀 없는 점검 정보를 볼 수 있습니다 |
| `Inno Setup 6 의 ISCC.exe 를 찾지 못했습니다` | `winget install JRSoftware.InnoSetup`으로 설치하거나, 경로 A를 씁니다 |

## 그 밖의 문서

- 기능·출처 배지 기준·측정 방법: [on-client/docs/PRODUCT_DASHBOARD.md](on-client/docs/PRODUCT_DASHBOARD.md)
- 설치 프로그램 만들기: [packaging/README.md](packaging/README.md)
- 수업 기록(시작 틀 0.2.11, 13~22단계): [on-client/README.md](on-client/README.md), [on-client/docs/STUDENT_LAUNCH_GUIDE.md](on-client/docs/STUDENT_LAUNCH_GUIDE.md). 이 두 문서는 수업용이라, 받는 곳·제출·첫 화면 설명이 이 README와 다를 수 있습니다.
