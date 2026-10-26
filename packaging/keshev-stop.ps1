<#
  케셰브 종료 (설치본)

  실행 파일 경로가 정확히 <이 폴더>\runtime\node\node.exe 인 프로세스만 끈다.
  PC 에 따로 설치된 Node.js 나 다른 프로그램의 node 는 건드리지 않는다.
  옵션: -Quiet(제거 프로그램용, 기다리지 않음)
#>
[CmdletBinding()]
param([switch]$Quiet)
Set-StrictMode -Version 3
$ErrorActionPreference = 'Stop'

$node = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'runtime\node\node.exe'))

function Done([string]$text, [int]$code) {
  if (-not $Quiet) {
    if ($code -eq 0) { Write-Host $text } else { Write-Host $text -ForegroundColor Yellow }
    Start-Sleep -Seconds 3
  }
  exit $code
}

$targets = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ExecutablePath -and ([IO.Path]::GetFullPath($_.ExecutablePath) -ieq $node) })
if ($targets.Count -eq 0) { Done '켜져 있는 케셰브가 없습니다.' 0 }

$failed = @()
foreach ($t in $targets) {
  try {
    Stop-Process -Id $t.ProcessId -Force
    Wait-Process -Id $t.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
  } catch { $failed += $t.ProcessId }
}
$left = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ExecutablePath -and ([IO.Path]::GetFullPath($_.ExecutablePath) -ieq $node) })
if ($left.Count -gt 0) { Done "케셰브 일부를 끄지 못했습니다(프로세스 번호 $(($left.ProcessId) -join ', ')). 작업 관리자에서 확인해 주세요." 1 }
Done "케셰브를 껐습니다(프로세스 $($targets.Count)개: $(($targets.ProcessId) -join ', '))." 0
