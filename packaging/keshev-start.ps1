<#
  케셰브 시작 (설치본 실행기)

  - 이 파일과 같은 폴더의 runtime\node 를 PATH 맨 앞에 두고 app\tools\start-alekov.ps1 -Background 를 부른다.
    그래서 PC 에 Node.js 를 따로 설치하지 않아도, 설치돼 있어도 포함된 Node 24.19.0 을 쓴다.
  - 127.0.0.1:5189 를 이미 이 설치 폴더의 node.exe 가 쓰고 있으면 새로 켜지 않고 브라우저만 연다.
    다른 프로그램이 쓰고 있으면 그 프로그램은 건드리지 않고 멈춘다.
  - 켜지면 http://127.0.0.1:5189/ 를 기본 브라우저로 연다.

  옵션: -Demo(예제 자료로 켜기), -NoBrowser(브라우저를 열지 않음), -NoPause(끝날 때 기다리지 않음)
#>
[CmdletBinding()]
param([switch]$Demo, [switch]$NoBrowser, [switch]$NoPause)
Set-StrictMode -Version 3
$ErrorActionPreference = 'Stop'

$Port = 5189
$url = "http://127.0.0.1:$Port/"
$base = $PSScriptRoot
$nodeDir = Join-Path $base 'runtime\node'
$node = [IO.Path]::GetFullPath((Join-Path $nodeDir 'node.exe'))
$starter = Join-Path $base 'app\tools\start-alekov.ps1'

function Done([string]$text, [int]$code) {
  if ($code -eq 0) { Write-Host $text } else { Write-Host $text -ForegroundColor Yellow }
  if (-not $NoPause) {
    if ($code -eq 0) { Start-Sleep -Seconds 3 } else { Read-Host '창을 닫으려면 Enter 를 누르세요' | Out-Null }
  }
  exit $code
}

function Open-App {
  if ($NoBrowser) { Write-Host "브라우저는 열지 않았습니다(-NoBrowser). 주소: $url"; return }
  Start-Process $url
}

# 포트를 듣고 있는 프로세스. 없으면 $null.
function Get-PortOwner {
  $listen = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $listen) { return $null }
  return Get-CimInstance Win32_Process -Filter "ProcessId=$($listen.OwningProcess)" -ErrorAction SilentlyContinue
}
function Test-OurNode($proc) {
  return $proc -and $proc.ExecutablePath -and ([IO.Path]::GetFullPath($proc.ExecutablePath) -ieq $node)
}

foreach ($path in @($node, $starter)) {
  if (-not (Test-Path -LiteralPath $path)) { Done "설치 파일이 빠졌습니다: $path`n케셰브를 다시 설치해 주세요." 1 }
}

$owner = Get-PortOwner
if ($owner) {
  if (Test-OurNode $owner) {
    Write-Host "케셰브가 이미 켜져 있습니다(프로세스 번호 $($owner.ProcessId)). 새로 켜지 않고 화면만 엽니다."
    if ($Demo) { Write-Host '이미 켜진 서버의 모드는 바꾸지 않습니다. 예제로 보려면 「케셰브 종료」 뒤 다시 켜세요.' }
    Open-App
    Done '' 0
  }
  Done "포트 $Port 를 다른 프로그램($($owner.Name), 프로세스 번호 $($owner.ProcessId))이 쓰고 있습니다.`n그 프로그램은 그대로 두었습니다. 그 프로그램을 끈 뒤 다시 실행해 주세요." 1
}

# 포함된 Node 를 PATH 맨 앞에 둔다. 이 창(과 여기서 부르는 스크립트)에만 적용되며 PC 설정은 바꾸지 않는다.
$env:PATH = "$nodeDir;$env:PATH"
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $starter, '-Port', [string]$Port, '-Background')
if ($Demo) { $argList += '-Demo' }
& $powershell @argList
$code = $LASTEXITCODE
if ($code -ne 0) { Done "케셰브를 켜지 못했습니다(종료 코드 $code). 위 메시지를 확인해 주세요." 1 }

# 실제로 포함된 Node 로 켜졌는지 확인한다.
$owner = Get-PortOwner
if (-not (Test-OurNode $owner)) {
  $who = if ($owner) { $owner.ExecutablePath } else { '없음' }
  Done "서버는 응답했지만 포트 $Port 의 프로세스가 설치 폴더의 node.exe 가 아닙니다($who). 확인이 필요합니다." 1
}
Write-Host "포함된 Node 로 실행 중입니다: $node"
Write-Host '끄려면 시작 메뉴의 「케셰브 종료」를 누르세요.'
Open-App
Done '' 0
