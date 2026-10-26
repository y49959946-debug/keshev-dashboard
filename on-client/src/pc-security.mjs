// 이 PC 보안 구성(읽기 전용) — 학생 구현(제품화 단계에서 새로 만든 기능).
// 네트워크 구성, 방화벽 현재 적용 값, 최근 24시간 Windows 기록(System·Application)의 위험·오류·경고 건수.
//
// 지키는 것
//  - 읽기만 한다. 설정을 바꾸는 명령(Set-·New-·Remove-·Enable-·Disable-, netsh, reg, 서비스 제어)을 쓰지 않는다.
//  - 관리자 권한을 요청하지 않는다. 일반 권한으로 못 읽으면 그 값만 「확인 불가」와 이유로 돌려준다.
//  - Security 로그는 읽지 않는다. 이벤트 메시지 본문은 넘기지 않는다(건수·원본 이름만).
//  - 읽은 값을 파일로 저장하거나 외부로 보내지 않는다. 응답으로만 보낸다.
//  - PowerShell 은 shell 없이 execFile 로 직접 실행하고, 코드에 고정된 ASCII 스크립트를 표준 입력으로 넘긴다.
//    요청 값은 스크립트에 넣지 않는다. 스크립트에 허용 목록 밖의 cmdlet 이 있으면 이 모듈을 불러오지 않는다.
import os from 'node:os';
import dns from 'node:dns';
import { execFile } from 'node:child_process';

const SOURCE = '이 PC';
const TIMEOUT_MS = 10000;
const MAX_OUTPUT_BYTES = 256 * 1024;
const MAX_EVENTS = 10000;

// 읽기 전용 cmdlet 허용 목록
export const ALLOWED_CMDLETS = Object.freeze([
  'Get-NetAdapter', 'Get-NetRoute', 'Get-NetFirewallProfile', 'Get-WinEvent', 'Get-Date',
  'ConvertTo-Json', 'Select-Object', 'Where-Object', 'ForEach-Object', 'Group-Object', 'Sort-Object', 'Measure-Object',
]);
const ALLOWED_STATIC = new Set(['Console', 'System.Text.UTF8Encoding', 'Math']);

const PRELUDE = String.raw`$ProgressPreference='SilentlyContinue'; $ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)`;
const FAIL = String.raw`$_.Exception.GetType().Name + '|' + [string]$_.FullyQualifiedErrorId`;

// 각 줄은 그 자체로 끝나는 문장이어야 한다(-Command - 는 줄 단위로 읽는다).
const SCRIPTS = Object.freeze({
  network: [
    PRELUDE,
    String.raw`$out=@{adapters=$null; adaptersError=$null; gateways=$null; gatewaysError=$null}; $names=@{}`,
    // MAC 은 여기서 뒤 두 묶음만 남기고 가린다. 원래 값은 Node 로 넘어오지 않는다.
    String.raw`try { $out.adapters=@(Get-NetAdapter | ForEach-Object { $names[[int]$_.InterfaceIndex]=[string]$_.Name; $p=([string]$_.MacAddress) -split '-'; @{name=[string]$_.Name; description=[string]$_.InterfaceDescription; status=[string]$_.Status; linkSpeed=[string]$_.LinkSpeed; mac=$(if ($p.Count -ge 6) { 'XX-XX-XX-XX-' + $p[-2] + '-' + $p[-1] } else { '' })} }) } catch { $out.adaptersError=` + FAIL + ' }',
    String.raw`try { $out.gateways=@(Get-NetRoute -AddressFamily IPv4,IPv6 | Where-Object { $_.DestinationPrefix -eq '0.0.0.0/0' -or $_.DestinationPrefix -eq '::/0' } | ForEach-Object { @{family=$(if ($_.DestinationPrefix -eq '::/0') { 'IPv6' } else { 'IPv4' }); nextHop=[string]$_.NextHop; adapter=$(if ($names.ContainsKey([int]$_.InterfaceIndex)) { $names[[int]$_.InterfaceIndex] } else { [string]$_.InterfaceAlias }); metric=[int]$_.RouteMetric} }) } catch { $out.gatewaysError=` + FAIL + ' }',
    String.raw`$out | ConvertTo-Json -Depth 5 -Compress`,
  ],
  firewall: [
    PRELUDE,
    String.raw`$out=@{profiles=$null; error=$null}`,
    // 현재 적용 값(ActiveStore). 기본 저장소는 NotConfigured 로만 보일 수 있다.
    String.raw`try { $out.profiles=@(Get-NetFirewallProfile -PolicyStore ActiveStore | ForEach-Object { @{name=[string]$_.Name; enabled=[string]$_.Enabled; inbound=[string]$_.DefaultInboundAction; outbound=[string]$_.DefaultOutboundAction} }) } catch { $out.error=` + FAIL + ' }',
    String.raw`$out | ConvertTo-Json -Depth 4 -Compress`,
  ],
  events: [
    PRELUDE,
    String.raw`$now=Get-Date; $start=$now.AddHours(-24); $out=@{start=$start.ToUniversalTime().ToString('o'); end=$now.ToUniversalTime().ToString('o'); logs=@()}`,
    // System·Application 만. 위험(1)·오류(2)·경고(3)를 따로 센다. 메시지 본문은 쓰지 않는다.
    String.raw`foreach ($log in @('System','Application')) { $r=@{log=$log; ok=$true; error=$null; total=0; critical=0; errors=0; warnings=0; truncated=$false; hourly=@(); providers=@()}; $ev=@(); try { $ev=@(Get-WinEvent -FilterHashtable @{LogName=$log; Level=1,2,3; StartTime=$start} -MaxEvents ` + MAX_EVENTS + String.raw` -ErrorAction Stop) } catch { if ([string]$_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { $ev=@() } else { $r.ok=$false; $r.error=` + FAIL + String.raw` } }; if ($r.ok) { $c=@(0)*24; $e2=@(0)*24; $w=@(0)*24; foreach ($e in $ev) { $i=[int][Math]::Floor(($e.TimeCreated - $start).TotalHours); if ($i -lt 0) { $i=0 }; if ($i -gt 23) { $i=23 }; if ($e.Level -eq 1) { $c[$i]++ } elseif ($e.Level -eq 2) { $e2[$i]++ } elseif ($e.Level -eq 3) { $w[$i]++ } }; $r.total=$ev.Count; $r.critical=[int]($c | Measure-Object -Sum).Sum; $r.errors=[int]($e2 | Measure-Object -Sum).Sum; $r.warnings=[int]($w | Measure-Object -Sum).Sum; $r.truncated=($ev.Count -ge ` + MAX_EVENTS + String.raw`); $r.hourly=@(0..23 | ForEach-Object { @{critical=$c[$_]; error=$e2[$_]; warning=$w[$_]} }); $r.providers=@($ev | Group-Object ProviderName | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object { @{name=[string]$_.Name; count=[int]$_.Count} }) }; $out.logs += $r }`,
    String.raw`$out | ConvertTo-Json -Depth 6 -Compress`,
  ],
});

// 불러올 때 스크립트를 검사한다. 하나라도 어긋나면 모듈 자체가 실패한다(서버가 뜨지 않는다).
export function assertReadOnlyScript(lines) {
  const text = lines.join('\n');
  if (!/^[\x09\x0a\x0d\x20-\x7e]*$/.test(text)) throw Error('PC_SECURITY_SCRIPT_NOT_ASCII');
  for (const [cmdlet] of text.matchAll(/\b[A-Z][a-z]+-[A-Z][A-Za-z]+\b/g)) {
    if (!ALLOWED_CMDLETS.includes(cmdlet)) throw Error(`PC_SECURITY_CMDLET_NOT_ALLOWED:${cmdlet}`);
  }
  for (const [, type] of text.matchAll(/\[([A-Za-z.]+)\]::/g)) {
    if (!ALLOWED_STATIC.has(type)) throw Error(`PC_SECURITY_STATIC_NOT_ALLOWED:${type}`);
  }
  if (/\b(iex|icm|saps|Invoke|Start|Stop|Set|New|Remove|Enable|Disable|Add|Restart|Clear|Out|Export)-|\biex\b|Add-Type|DownloadString|netsh|\breg\b|Security'/i.test(text)) {
    throw Error('PC_SECURITY_FORBIDDEN_TOKEN');
  }
}
for (const lines of Object.values(SCRIPTS)) assertReadOnlyScript(lines);

// ---------- 실행 ----------

function powershellPath() {
  const root = process.env.SystemRoot;
  const base = typeof root === 'string' && /^[A-Za-z]:\\[A-Za-z0-9 ._()\\-]{1,200}$/.test(root) ? root : 'C:\\Windows';
  return `${base}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
}

// 비밀로 보이는 환경변수는 하위 프로세스에 넘기지 않는다(start-alekov.ps1 과 같은 기준).
function childEnv() {
  const secret = /(TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|API_?KEY|PRIVATE_?KEY|ACCESS_?KEY|^ON_AI_|^OPENAI|^ANTHROPIC|^SUPABASE)/i;
  return Object.fromEntries(Object.entries(process.env).filter(([name]) => !secret.test(name)));
}

const clean = (value, max = 120) => String(value ?? '').replace(/[^A-Za-z0-9_.,:|\- ]/g, '').slice(0, max);

function failureReason(raw) {
  const text = clean(raw);
  const type = text.split('|')[0] || '원인 불명';
  if (/Unauthorized|AccessDenied|Access (is )?denied|PermissionDenied|0x80070005/i.test(text)) return `권한 부족(${type})`;
  return `읽기 실패(${type})`;
}

// 고정 스크립트를 실행하고 JSON 을 돌려준다. 실패는 { ok:false, reason } 로 바꾼다(stderr 원문은 싣지 않는다).
function runScript(lines, runner = execFile) {
  if (process.platform !== 'win32') return Promise.resolve({ ok: false, reason: 'Windows 가 아니라 읽을 수 없습니다.' });
  return new Promise((resolve) => {
    let child;
    try {
      child = runner(powershellPath(), ['-NoProfile', '-NonInteractive', '-Command', '-'], {
        timeout: TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES, windowsHide: true, encoding: 'utf8', env: childEnv(),
      }, (error, stdout, stderr) => {
        if (error) {
          if (error.code === 'ENOENT') return resolve({ ok: false, reason: 'PowerShell 을 찾을 수 없습니다.' });
          if (error.killed || error.signal) return resolve({ ok: false, reason: `시간 초과(${TIMEOUT_MS / 1000}초)` });
          if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') return resolve({ ok: false, reason: '출력이 너무 큽니다.' });
        }
        let data;
        try { data = JSON.parse(String(stdout).trim()); } catch {
          const summary = clean(String(stderr).split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#<')) ?? '', 80);
          return resolve({ ok: false, reason: error ? `PowerShell 종료 코드 ${clean(error.code, 12)}${summary ? `: ${summary}` : ''}` : '출력 형식을 확인할 수 없습니다.' });
        }
        resolve({ ok: true, data });
      });
    } catch { return resolve({ ok: false, reason: 'PowerShell 을 실행하지 못했습니다.' }); }
    child.stdin?.on('error', () => {});
    child.stdin?.end(`${lines.join('\n')}\n`);
  });
}

// ---------- 값 모양 ----------

const metric = (value, unit, measuredAt) => ({ status: 'ok', value, unit, measuredAt, source: SOURCE });
const missing = (unit, measuredAt, reason) => ({ status: 'unavailable', value: null, unit, measuredAt, source: SOURCE, reason });
const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const arr = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? [v] : []);
const count = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);

function readInterfaces(at) {
  try {
    const rows = Object.entries(os.networkInterfaces()).map(([name, list]) => ({
      name: str(name, 120),
      internal: (list ?? []).every((a) => a.internal === true),
      // MAC 은 node:os 에서 쓰지 않는다(가린 값은 Get-NetAdapter 에서 온다).
      addresses: (list ?? []).map((a) => ({ family: a.family === 'IPv6' || a.family === 6 ? 'IPv6' : 'IPv4', address: str(a.address, 64), cidr: str(a.cidr ?? '', 70), internal: a.internal === true })),
    }));
    return metric(rows, '개', at);
  } catch { return missing('개', at, 'os.networkInterfaces() 를 읽지 못했습니다.'); }
}

function readDns(at) {
  try { return metric(dns.getServers().map((s) => str(s, 64)), '개', at); }
  catch { return missing('개', at, 'dns.getServers() 를 읽지 못했습니다.'); }
}

function shapeNetwork(result, at) {
  if (!result.ok) return { adapters: missing('개', at, result.reason), gateways: missing('개', at, result.reason) };
  const d = result.data ?? {};
  return {
    adapters: d.adaptersError ? missing('개', at, failureReason(d.adaptersError))
      : metric(arr(d.adapters).map((a) => ({ name: str(a.name, 120), description: str(a.description), status: str(a.status, 40), linkSpeed: str(a.linkSpeed, 40), mac: /^XX-XX-XX-XX-[0-9A-F]{2}-[0-9A-F]{2}$/.test(a.mac) ? a.mac : '' })), '개', at),
    gateways: d.gatewaysError ? missing('개', at, failureReason(d.gatewaysError))
      : metric(arr(d.gateways).map((g) => ({ family: g.family === 'IPv6' ? 'IPv6' : 'IPv4', nextHop: str(g.nextHop, 64), adapter: str(g.adapter, 120), metric: count(g.metric) })), '개', at),
  };
}

function shapeFirewall(result, at) {
  if (!result.ok) return { profiles: missing('개', at, result.reason), store: 'ActiveStore' };
  const d = result.data ?? {};
  if (d.error) return { profiles: missing('개', at, failureReason(d.error)), store: 'ActiveStore' };
  return { store: 'ActiveStore', profiles: metric(arr(d.profiles).map((p) => ({ name: str(p.name, 40), enabled: str(p.enabled, 20), inbound: str(p.inbound, 20), outbound: str(p.outbound, 20) })), '개', at) };
}

function shapeEvents(result, at) {
  const range = (d) => ({ start: typeof d?.start === 'string' && Number.isFinite(Date.parse(d.start)) ? d.start : null, end: typeof d?.end === 'string' && Number.isFinite(Date.parse(d.end)) ? d.end : null, hours: 24 });
  if (!result.ok) return { range: range(null), system: missing('건', at, result.reason), application: missing('건', at, result.reason) };
  const d = result.data ?? {};
  const pick = (name) => {
    const row = arr(d.logs).find((l) => l && l.log === name);
    if (!row) return missing('건', at, '결과에 이 기록이 없습니다.');
    if (row.ok !== true) return missing('건', at, failureReason(row.error));
    const hourly = arr(row.hourly).map((h) => ({ critical: count(h.critical), error: count(h.error), warning: count(h.warning) }));
    const totals = [count(row.critical), count(row.errors), count(row.warnings), count(row.total)];
    if (hourly.length !== 24 || totals.includes(null) || hourly.some((h) => h.critical === null || h.error === null || h.warning === null)) {
      return missing('건', at, '건수 형식을 확인할 수 없습니다.');
    }
    return metric({
      critical: totals[0], error: totals[1], warning: totals[2], total: totals[3], truncated: row.truncated === true, maxEvents: MAX_EVENTS,
      hourly, providers: arr(row.providers).slice(0, 5).map((p) => ({ name: str(p.name, 120), count: count(p.count) ?? 0 })),
    }, '건', at);
  };
  return { range: range(d), system: pick('System'), application: pick('Application') };
}

// ---------- 공개 ----------

export function createPcSecurityReader({ clock = () => new Date(), runner = execFile } = {}) {
  let inflight = null; // 읽는 중에 다시 요청이 오면 같은 결과를 나눠 받는다(PowerShell 을 더 띄우지 않음)
  async function readAll() {
    const startedAt = clock().toISOString();
    const [network, firewall, events] = await Promise.all([
      runScript(SCRIPTS.network, runner), runScript(SCRIPTS.firewall, runner), runScript(SCRIPTS.events, runner),
    ]);
    const at = clock().toISOString();
    return {
      readOnly: true,
      storage: 'none',
      source: SOURCE,
      startedAt,
      measuredAt: at,
      commands: [...ALLOWED_CMDLETS],
      network: { interfaces: readInterfaces(at), dns: readDns(at), ...shapeNetwork(network, at) },
      firewall: shapeFirewall(firewall, at),
      events: shapeEvents(events, at),
    };
  }
  return Object.freeze({
    read() {
      if (!inflight) inflight = readAll().finally(() => { inflight = null; });
      return inflight;
    },
  });
}
