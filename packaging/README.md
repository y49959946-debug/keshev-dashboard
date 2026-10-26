# 케셰브 포장과 설치 프로그램 (0.1.0, 검증 중)

`on-client` 앱과 Node.js 24.19.0(Windows x64)을 하나로 묶어 사용자 단위 설치 프로그램(`Keshev-Setup-0.1.0.exe`)을 만듭니다. 이 폴더의 파일은 저장소용이며, 설치본에는 실행기 두 개와 `INSTALL-NOTICE.txt`만 들어갑니다.

> 검증 범위: 실제 회사 시스템(SDP), 계정 연결, 앱 안 AI, 조치 실행, 취약점 조회(OSV) 연결은 이 설치본으로 확인하지 않았습니다(미확인). 기본 실행은 「연결 없음」입니다.

## 파일

| 파일 | 역할 |
|---|---|
| `build-package.ps1` | Node zip 내려받기·SHA256 대조 → `dist\Keshev\` 만들기 → 넣은 파일·뺀 파일 목록 출력 → (`-Installer`) setup.exe 만들기 |
| `keshev-start.ps1` | 포함된 Node를 PATH 맨 앞에 두고 `app\tools\start-alekov.ps1 -Background` 실행. 이미 켜져 있으면 브라우저만 엶. 옵션 `-Demo`, `-NoBrowser`, `-NoPause` |
| `keshev-stop.ps1` | 실행 파일 경로가 `<설치 폴더>\runtime\node\node.exe`인 프로세스만 끔. 옵션 `-Quiet` |
| `keshev.iss` | Inno Setup 6 스크립트 |
| `INSTALL-NOTICE.txt` | 설치 화면에 보이고 설치 폴더에도 들어가는 안내 |

만들어지는 것(모두 Git 제외): `packaging\cache\`(Node zip, SHASUMS256), `dist\Keshev\`, `packaging\output\Keshev-Setup-0.1.0.exe`

## 설치본 구조

```
%LOCALAPPDATA%\Programs\Keshev\
  keshev-start.ps1, keshev-stop.ps1, INSTALL-NOTICE.txt, PACKAGE-FILES.txt
  app\           package.json, src\, public\, student\, vendor\, tools\, docs\PRODUCT_DASHBOARD.md
  runtime\node\  node.exe, LICENSE
```

`PACKAGE-FILES.txt`에는 들어간 파일마다 SHA256과 크기가 적혀 있습니다.

**넣는 앱 파일**은 `src/server.mjs`에서 import를 끝까지 따라가 확인한 파일과, 서버가 읽는 파일(public, 그림, student, 실행 스크립트와 helper, package.json)입니다.
**빼는 파일**은 다음과 같습니다.
- `.env.example`, `.on-starter-manifest.json`
- `README.md`(수업 안내)
- 수업·담당자용 `docs\` 15개
- `src\*\README.md`
- `tools\prepare-native-host.ps1`(계정 연결 설정 준비 도구)
- Node zip의 npm·npx·corepack·node_modules

이름이 `.env`·`token`·`secret`·인증서 확장자 등과 맞는 파일이 포함 목록에 섞이면 빌드를 멈춥니다.

## 만들기 (D:\keshev-dashboard 에서)

```powershell
# 포장 + setup.exe (Inno Setup 6 필요)
powershell -NoProfile -ExecutionPolicy Bypass -File .\packaging\build-package.ps1 -Installer
# 포장만
powershell -NoProfile -ExecutionPolicy Bypass -File .\packaging\build-package.ps1
```

- Node zip은 `https://nodejs.org/dist/v24.19.0/`에서 받습니다. 같은 폴더의 `SHASUMS256.txt` 값과 다르면 멈춥니다. 기대값은 `57f71ab3652e797d84acddc79c81cc9ff1c6ddb2a1974cdb83f00fee9bff4c73`입니다. `SHASUMS256.txt.asc`의 GPG 서명 검증은 하지 않습니다.
- ISCC.exe는 `C:\Program Files (x86)\Inno Setup 6\`, `C:\Program Files\Inno Setup 6\`, `%LOCALAPPDATA%\Programs\Inno Setup 6\` 순서로 찾습니다. 없으면 https://jrsoftware.org/isdl.php 또는 `winget install JRSoftware.InnoSetup`으로 설치합니다.
- 같은 입력이라도 다시 만들면 setup.exe의 SHA256이 바뀔 수 있습니다(만든 시각 등이 들어감).

## 설치 형태

- `PrivilegesRequired=lowest`: 관리자 권한을 묻지 않고, 지금 사용자에게만 설치합니다.
- 설치 위치는 `{localappdata}\Programs\Keshev`로 고정입니다(폴더 선택 화면 없음).
- 시작 메뉴: `케셰브\케셰브 시작`, `케셰브\케셰브 종료`. 바탕화면 「케셰브 시작」은 선택 항목입니다(기본 꺼짐).
- AppId: `{5691E4D8-1E0E-45BA-8D3B-1EB94D5744F6}`. 이후 버전에서도 바꾸지 않습니다.
- 덮어쓰기 설치와 제거 전에 `keshev-stop.ps1 -Quiet`로 이 설치 폴더의 케셰브만 끕니다.
- 제거는 설치한 파일과 바로가기만 지웁니다. 폴더는 비었을 때만 지우고, 설치 폴더 밖은 건드리지 않습니다.

## 알려진 제약

- **코드 서명을 하지 않았습니다.** setup.exe를 열 때 Windows SmartScreen 경고("Windows의 PC 보호")가 나올 수 있습니다.
- 바로가기는 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File …`로 실행합니다. 그룹 정책으로 실행 정책이 고정된 PC에서는 막힐 수 있습니다.
- 포트는 5189로 고정입니다. 다른 프로그램이 쓰고 있으면 그 프로그램은 그대로 두고 안내만 합니다.
- 뒤에서 켜진 node는 실행기의 표준 출력 핸들을 물려받습니다. 그래서 `keshev-start.ps1`의 출력을 파이프(`| …`)로 받으면, 서버가 꺼질 때까지 그 명령이 끝나지 않습니다. 바로가기 실행에는 영향이 없습니다.

## 확인 순서 (설치본)

1. `packaging\output\Keshev-Setup-0.1.0.exe` 실행. UAC(관리자 권한) 창이 뜨지 않아야 합니다. SmartScreen 경고가 나오면 「추가 정보」→「실행」을 누릅니다.
2. 안내 화면에 `INSTALL-NOTICE.txt` 내용이 보이는지 봅니다. 설치가 끝나면 `%LOCALAPPDATA%\Programs\Keshev\`가 생깁니다.
3. 시작 메뉴 「케셰브 시작」 → 창에 "포함된 Node 로 실행 중입니다: …\Keshev\runtime\node\node.exe"가 나오고, 브라우저에 `http://127.0.0.1:5189/`가 열립니다.
4. 관제 대시보드에 「출처: 연결 없음 (ENGINE_NOT_CONNECTED)」이 보이고, 「이 PC에서 잰 값」에 「출처: 실측」·ms·시각·`http://127.0.0.1:5189`가 보입니다.
5. 「케셰브 시작」을 다시 누르면 "이미 켜져 있습니다"가 나오고 브라우저만 열립니다.
6. 「케셰브 종료」 → "케셰브를 껐습니다"가 나오고, 브라우저를 새로고침하면 연결되지 않습니다.
7. 설정 > 앱 > 설치된 앱 > 「케셰브 0.1.0」 제거. `%LOCALAPPDATA%\Programs\Keshev\`와 시작 메뉴 `케셰브` 폴더(만들었다면 바탕화면 바로가기도)가 없어져야 합니다.
