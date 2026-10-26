<#
  케셰브 포장 도구 (0.1.0)

  하는 일
   1) Node.js 24.19.0 Windows x64 공식 zip 을 packaging\cache 에 받는다(이미 있으면 다시 쓴다).
      같은 폴더의 SHASUMS256.txt 와 SHA256 을 대조하고, 다르면 멈춘다.
   2) dist\Keshev\ 를 새로 만들고, on-client 에서 실행에 필요한 파일만 app\ 에 복사한다.
      runtime\node\ 에는 node.exe 와 LICENSE 만 넣는다. 실행기·안내문을 맨 위에 둔다.
   3) 넣은 파일·뺀 파일 목록을 출력하고 dist\Keshev\PACKAGE-FILES.txt 로 남긴다.
   4) -Installer 를 주면 Inno Setup 6 의 ISCC.exe 로 packaging\output\ 에 setup.exe 를 만든다.

  하지 않는 일
   - on-client 원본 파일을 바꾸지 않는다(읽기만 한다).
   - .env·토큰·계정 연결·SDP 설정 파일을 넣지 않는다. 그런 이름이 목록에 섞이면 멈춘다.
   - Inno Setup 을 설치하지 않는다. 코드 서명을 하지 않는다.

  사용 (저장소 최상위 D:\keshev-dashboard 에서)
    powershell -NoProfile -ExecutionPolicy Bypass -File .\packaging\build-package.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File .\packaging\build-package.ps1 -Installer
#>
[CmdletBinding()]
param([switch]$Installer)
Set-StrictMode -Version 3
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # PowerShell 5.1 진행 표시줄은 내려받기를 크게 느리게 한다
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Say([string]$text) { Write-Host $text }
function Stop-With([string]$text) { Write-Host $text -ForegroundColor Yellow; exit 1 }

$NodeVersion = '24.19.0'
$NodeName = "node-v$NodeVersion-win-x64"
$NodeBase = "https://nodejs.org/dist/v$NodeVersion"

$packaging = $PSScriptRoot
$repo = Split-Path -Parent $packaging
$source = Join-Path $repo 'on-client'
$cache = Join-Path $packaging 'cache'
$dist = Join-Path $repo 'dist\Keshev'
$output = Join-Path $packaging 'output'

if (-not (Test-Path -LiteralPath (Join-Path $source 'src\server.mjs'))) { Stop-With "on-client 폴더를 찾지 못했습니다: $source" }

# ---------- 1) Node.js 내려받기와 SHA256 대조 ----------
New-Item -ItemType Directory -Force -Path $cache | Out-Null
$zip = Join-Path $cache "$NodeName.zip"
$sums = Join-Path $cache "SHASUMS256-v$NodeVersion.txt"
if (-not (Test-Path -LiteralPath $sums)) {
  Say "SHASUMS256.txt 내려받는 중: $NodeBase/SHASUMS256.txt"
  Invoke-WebRequest -UseBasicParsing -Uri "$NodeBase/SHASUMS256.txt" -OutFile $sums
}
$line = Get-Content -LiteralPath $sums | Where-Object { $_ -match "^([0-9a-f]{64})\s+$([regex]::Escape("$NodeName.zip"))$" } | Select-Object -First 1
if (-not $line) { Stop-With "SHASUMS256.txt 에서 $NodeName.zip 줄을 찾지 못했습니다. $sums 를 지우고 다시 실행해 주세요." }
$expected = ($line -split '\s+')[0].ToLowerInvariant()
if (Test-Path -LiteralPath $zip) { Say "이미 받은 zip 을 다시 씁니다: $zip" }
else {
  Say "Node.js 내려받는 중: $NodeBase/$NodeName.zip"
  Invoke-WebRequest -UseBasicParsing -Uri "$NodeBase/$NodeName.zip" -OutFile $zip
}
$actual = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { Stop-With "SHA256 이 다릅니다. 멈춥니다.`n  기대값 $expected`n  실제값 $actual`n  $zip 을 확인한 뒤 지우고 다시 실행해 주세요." }
Say "SHA256 일치: $actual"

# ---------- 2) 넣을 파일 고르기 ----------
# 서버가 import 하거나 읽는 파일만 넣는다(src/server.mjs 에서 import 를 끝까지 따라가 확인한 목록).
$fixed = @(
  'package.json',
  'vendor\clco-http.mjs', 'vendor\NOTICE.md',
  'public\index.html', 'public\app.js', 'public\style.css', 'public\dashboard.mjs', 'public\ai-connect.mjs', 'public\vulnerabilities-view.mjs',
  'student\extension.mjs', 'student\engine-adapter.mjs',
  'tools\start-alekov.ps1', 'tools\app-credentials.ps1', 'tools\native-host-registry.ps1',
  'docs\PRODUCT_DASHBOARD.md'
)
$sourceFull = (Resolve-Path -LiteralPath $source).Path.TrimEnd('\')
function Rel([string]$full) { $full.Substring($sourceFull.Length + 1) }
$include = [Collections.Generic.List[string]]::new()
foreach ($f in $fixed) {
  if (-not (Test-Path -LiteralPath (Join-Path $source $f) -PathType Leaf)) { Stop-With "필요한 파일이 없습니다: on-client\$f" }
  $include.Add($f)
}
Get-ChildItem -LiteralPath (Join-Path $source 'src') -Recurse -File -Filter '*.mjs' | ForEach-Object { $include.Add((Rel $_.FullName)) }
Get-ChildItem -LiteralPath (Join-Path $source 'public\assets\alekov') -File -Filter '*.webp' | ForEach-Object { $include.Add((Rel $_.FullName)) }
$include = @($include | Sort-Object -Unique)

# 비밀·설정 파일로 보이는 이름이 섞이면 멈춘다.
$suspicious = $include | Where-Object { (Split-Path -Leaf $_) -match '(?i)^\.env|\.(pem|key|pfx|p12|crt|cer)$|token|secret|password|sdp-host.*\.json$|native-host.*\.json$' }
if ($suspicious) { Stop-With "비밀·설정 파일로 보이는 이름이 포함 목록에 있습니다. 멈춥니다: $($suspicious -join ', ')" }

$all = Get-ChildItem -LiteralPath $source -Recurse -File -Force | ForEach-Object { Rel $_.FullName }
$exclude = @($all | Where-Object { $include -notcontains $_ } | Sort-Object)

# ---------- 3) dist\Keshev 만들기 ----------
if ((Split-Path -Leaf $dist) -ne 'Keshev' -or (Split-Path -Leaf (Split-Path -Parent $dist)) -ne 'dist') { Stop-With "출력 경로가 예상과 다릅니다: $dist" }
if (Test-Path -LiteralPath $dist) { Remove-Item -LiteralPath $dist -Recurse -Force }
$appDir = Join-Path $dist 'app'
$nodeDir = Join-Path $dist 'runtime\node'
New-Item -ItemType Directory -Force -Path $appDir, $nodeDir | Out-Null

foreach ($f in $include) {
  $target = Join-Path $appDir $f
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  Copy-Item -LiteralPath (Join-Path $source $f) -Destination $target
}

# zip 에서 node.exe 와 LICENSE 만 꺼낸다.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
  foreach ($name in @('node.exe', 'LICENSE')) {
    $entry = $archive.GetEntry("$NodeName/$name")
    if (-not $entry) { Stop-With "zip 안에 $NodeName/$name 이 없습니다." }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $nodeDir $name), $true)
  }
} finally { $archive.Dispose() }
$nodeExe = Join-Path $nodeDir 'node.exe'
$reported = (& $nodeExe --version | Out-String).Trim()
if ($reported -ne "v$NodeVersion") { Stop-With "꺼낸 node.exe 버전이 다릅니다: $reported" }

foreach ($f in @('keshev-start.ps1', 'keshev-stop.ps1', 'INSTALL-NOTICE.txt')) {
  Copy-Item -LiteralPath (Join-Path $packaging $f) -Destination (Join-Path $dist $f)
}

# ---------- 4) 목록 ----------
$distFull = (Resolve-Path -LiteralPath $dist).Path.TrimEnd('\')
$listing = Get-ChildItem -LiteralPath $dist -Recurse -File | Sort-Object FullName | ForEach-Object {
  '{0}  {1,10}  {2}' -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(), $_.Length, $_.FullName.Substring($distFull.Length + 1)
}
$header = @(
  "케셰브 0.1.0 포장 목록 (SHA256  크기(바이트)  경로)",
  "Node.js v$NodeVersion win-x64 zip SHA256: $actual (공식 SHASUMS256.txt 와 일치)",
  "만든 시각: $((Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz'))",
  ''
)
$listFile = Join-Path $dist 'PACKAGE-FILES.txt'
[IO.File]::WriteAllLines($listFile, [string[]]($header + $listing), [Text.UTF8Encoding]::new($true))

Say ''
Say "== 넣은 앱 파일 ($($include.Count)개, on-client 기준)"
$include | ForEach-Object { Say "  + $_" }
Say "== 뺀 파일 ($($exclude.Count)개, on-client 기준)"
$exclude | ForEach-Object { Say "  - $_" }
Say '== 런타임: runtime\node\node.exe, runtime\node\LICENSE (zip 의 나머지 npm·npx·corepack·node_modules 는 뺌)'
$size = (Get-ChildItem -LiteralPath $dist -Recurse -File | Measure-Object Length -Sum).Sum
Say ("== dist\Keshev 완성: 파일 {0}개, {1:N1} MB · 목록 {2}" -f (Get-ChildItem -LiteralPath $dist -Recurse -File).Count, ($size / 1MB), $listFile)

# ---------- 5) 설치 프로그램 ----------
if (-not $Installer) { Say '설치 프로그램은 만들지 않았습니다(-Installer 를 주면 만듭니다).'; exit 0 }
$candidates = @(
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
  "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)
$iscc = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $iscc) {
  Stop-With "Inno Setup 6 의 ISCC.exe 를 찾지 못했습니다. https://jrsoftware.org/isdl.php 에서 받거나 'winget install JRSoftware.InnoSetup' 으로 설치한 뒤 다시 실행해 주세요."
}
Say "ISCC: $iscc"
& $iscc (Join-Path $packaging 'keshev.iss')
if ($LASTEXITCODE -ne 0) { Stop-With "ISCC 가 실패했습니다(종료 코드 $LASTEXITCODE)." }
$setup = Join-Path $output 'Keshev-Setup-0.1.0.exe'
if (-not (Test-Path -LiteralPath $setup)) { Stop-With "setup.exe 를 찾지 못했습니다: $setup" }
$item = Get-Item -LiteralPath $setup
Say ("== 설치 프로그램: {0}`n   크기 {1:N0} 바이트 ({2:N1} MB)`n   SHA256 {3}" -f $setup, $item.Length, ($item.Length / 1MB), (Get-FileHash -LiteralPath $setup -Algorithm SHA256).Hash.ToLowerInvariant())
Say '   코드 서명은 하지 않았습니다. 실행할 때 Windows SmartScreen 경고가 나올 수 있습니다.'
