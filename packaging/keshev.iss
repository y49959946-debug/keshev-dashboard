; 케셰브 0.1.0 설치 프로그램 (Inno Setup 6)
; 먼저 build-package.ps1 로 ..\dist\Keshev 를 만든 뒤 컴파일한다.
; 사용자 단위 설치: 관리자 권한을 요청하지 않는다. 코드 서명은 하지 않는다.

#define AppVer "0.1.0"
#define Src "..\dist\Keshev"
#define PS "{sys}\WindowsPowerShell\v1.0\powershell.exe"

[Setup]
; AppId 는 바꾸지 않는다(업데이트·제거가 같은 제품으로 인식하는 기준).
AppId={{5691E4D8-1E0E-45BA-8D3B-1EB94D5744F6}
AppName=케셰브
AppVersion={#AppVer}
AppVerName=케셰브 {#AppVer} (검증 중)
AppPublisher=케셰브
VersionInfoVersion={#AppVer}
PrivilegesRequired=lowest
DefaultDirName={localappdata}\Programs\Keshev
DisableDirPage=yes
DefaultGroupName=케셰브
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
InfoBeforeFile=INSTALL-NOTICE.txt
OutputDir=output
OutputBaseFilename=Keshev-Setup-{#AppVer}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=케셰브 {#AppVer}
UninstallDisplayIcon={app}\runtime\node\node.exe
SetupLogging=yes

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"

[Tasks]
Name: "desktopicon"; Description: "바탕화면에 「케셰브 시작」 바로가기 만들기"; Flags: unchecked

[Files]
Source: "{#Src}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\케셰브\케셰브 시작"; Filename: "{#PS}"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\keshev-start.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\runtime\node\node.exe"; Comment: "케셰브를 켜고 브라우저로 화면을 엽니다"
Name: "{autoprograms}\케셰브\케셰브 종료"; Filename: "{#PS}"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\keshev-stop.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\runtime\node\node.exe"; Comment: "이 설치 폴더의 케셰브 서버만 끕니다"
Name: "{autodesktop}\케셰브 시작"; Filename: "{#PS}"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\keshev-start.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\runtime\node\node.exe"; Tasks: desktopicon

[Run]
Filename: "{#PS}"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\keshev-start.ps1"""; WorkingDir: "{app}"; Description: "지금 케셰브 시작"; Flags: postinstall nowait skipifsilent unchecked

[UninstallRun]
; 파일을 지우기 전에 이 설치 폴더의 node.exe 로 실행된 케셰브만 끈다.
Filename: "{#PS}"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\keshev-stop.ps1"" -Quiet"; Flags: runhidden waituntilterminated; RunOnceId: "StopKeshev"

[UninstallDelete]
; 설치 폴더가 비었을 때만 지운다. 사용자가 넣은 파일이 있으면 남긴다.
Type: dirifempty; Name: "{app}\app"
Type: dirifempty; Name: "{app}\runtime"
Type: dirifempty; Name: "{app}"

[Code]
// 덮어쓰기 설치 전에, 이미 설치된 케셰브가 켜져 있으면 끈다(파일이 잠기지 않게).
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  StopScript: String;
  ResultCode: Integer;
begin
  Result := '';
  StopScript := ExpandConstant('{app}\keshev-stop.ps1');
  if FileExists(StopScript) then
    Exec(ExpandConstant('{#PS}'), '-NoProfile -ExecutionPolicy Bypass -File "' + StopScript + '" -Quiet', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;
