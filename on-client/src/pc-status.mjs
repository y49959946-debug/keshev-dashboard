// 내 PC 상태(CPU·메모리·디스크) 측정 — 학생 구현(제품화 단계에서 새로 만든 기능).
// Node 내장 node:os·node:fs 만 쓴다. 외부 프로그램 실행·관리자 권한·파일 저장·외부 전송 없음.
// 표본은 이 서버 프로세스의 메모리에만 두며, 서버를 끄면 사라진다.
import os from 'node:os';
import fs from 'node:fs';

const GIB = 1024 ** 3; // GB 는 1024³ 바이트(Windows 탐색기와 같은 기준)
const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;

const ok = (value, unit, measuredAt, extra = {}) => ({ status: 'ok', value, unit, measuredAt, ...extra });
const unavailable = (unit, measuredAt, reason) => ({ status: 'unavailable', value: null, unit, measuredAt, reason });
const now = (clock) => clock().toISOString();

// 모든 CPU 의 누적 시간(ms) 합. 읽지 못하면 null.
function cpuTotals() {
  let cpus;
  try { cpus = os.cpus(); } catch { return null; }
  if (!Array.isArray(cpus) || cpus.length === 0) return null;
  let total = 0, idle = 0;
  for (const cpu of cpus) {
    const times = cpu && cpu.times;
    if (!times || !Number.isFinite(times.idle)) return null;
    for (const value of Object.values(times)) {
      if (!Number.isFinite(value)) return null;
      total += value;
    }
    idle += times.idle;
  }
  return { total, idle, count: cpus.length, wall: Date.now() };
}

// 두 번 읽은 CPU 시간으로 사용률 = (전체 − idle) 차이 ÷ 전체 차이
function cpuBetween(before, after, measuredAt) {
  if (!before || !after) return unavailable('%', measuredAt, 'os.cpus() 에서 CPU 시간을 읽지 못했습니다.');
  if (before.count !== after.count) return unavailable('%', measuredAt, 'CPU 개수가 측정 사이에 바뀌었습니다.');
  const total = after.total - before.total, idle = after.idle - before.idle;
  if (!(total > 0) || idle < 0 || idle > total) return unavailable('%', measuredAt, 'CPU 시간 차이가 0이거나 올바르지 않습니다.');
  return ok(round(((total - idle) / total) * 100, 1), '%', measuredAt, { windowMs: Math.max(0, after.wall - before.wall), cpuCount: after.count });
}

function readMemory(clock) {
  let total, free;
  try { total = os.totalmem(); free = os.freemem(); } catch { return unavailable('GB', now(clock), 'os.totalmem()·os.freemem() 를 읽지 못했습니다.'); }
  const measuredAt = now(clock);
  if (!(total > 0) || !(free >= 0) || free > total) return unavailable('GB', measuredAt, '메모리 값의 형식을 확인할 수 없습니다.');
  const used = total - free;
  return ok(round(used / GIB, 2), 'GB', measuredAt, { totalGB: round(total / GIB, 2), percent: round((used / total) * 100, 1) });
}

function systemDrive() {
  const value = process.env.SystemDrive;
  return typeof value === 'string' && /^[A-Za-z]:$/.test(value) ? `${value}\\` : 'C:\\';
}

function diskReason(error) {
  const code = typeof error?.code === 'string' && /^[A-Z_]{1,40}$/.test(error.code) ? error.code : null;
  if (code === 'EPERM' || code === 'EACCES') return '드라이브를 읽을 권한이 없습니다.';
  if (code === 'ENOENT') return '드라이브를 찾을 수 없습니다.';
  return `드라이브를 읽지 못했습니다(${code ?? '원인 불명'}).`;
}

async function readDisk(clock, drive) {
  if (typeof fs.promises.statfs !== 'function') return unavailable('GB', now(clock), 'fs.statfs 를 지원하지 않는 Node 버전입니다.');
  let info;
  try { info = await fs.promises.statfs(drive); } catch (error) { return unavailable('GB', now(clock), diskReason(error)); }
  const measuredAt = now(clock);
  const { bsize, blocks, bavail } = info ?? {};
  if (![bsize, blocks, bavail].every((v) => Number.isFinite(v) && v >= 0) || !(bsize > 0) || !(blocks > 0) || bavail > blocks) {
    return unavailable('GB', measuredAt, '드라이브 정보의 형식을 확인할 수 없습니다.');
  }
  // 남은 공간 = 이 사용자가 쓸 수 있는 공간(bavail)
  return ok(round((bavail * bsize) / GIB, 2), 'GB', measuredAt, {
    totalGB: round((blocks * bsize) / GIB, 2), freePercent: round((bavail / blocks) * 100, 1), drive,
  });
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('REQUEST_CANCELLED'), { code: 'REQUEST_CANCELLED' }));
    const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
    const stop = () => { clearTimeout(timer); reject(Object.assign(new Error('REQUEST_CANCELLED'), { code: 'REQUEST_CANCELLED' })); };
    signal?.addEventListener('abort', stop, { once: true });
  });
}

export function createPcStatusSampler({ intervalMs = 15000, maxSamples = 40, instantWindowMs = 500, clock = () => new Date() } = {}) {
  let timer = null;
  let baseline = null;      // 직전 표본의 CPU 시간
  let samples = [];         // { at, cpu, memory, disk } 최대 maxSamples 개
  let startedAt = null;
  let busy = false;
  const drive = systemDrive();

  // 추이 표본: CPU 는 직전 표본 이후(약 15초) 평균 사용률
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      const totals = cpuTotals();
      const at = now(clock);
      const cpu = cpuBetween(baseline, totals, at);
      baseline = totals;
      const memory = readMemory(clock);
      const disk = await readDisk(clock, drive);
      if (timer === null) return; // 멈춘 뒤 끝난 측정은 버린다
      samples.push({ at, cpu, memory, disk });
      if (samples.length > maxSamples) samples = samples.slice(samples.length - maxSamples);
    } catch {
      // 측정 하나가 실패해도 서버는 계속 동작한다. 그 표본만 남기지 않는다.
    } finally { busy = false; }
  }

  return Object.freeze({
    start() {
      if (timer !== null) return;
      startedAt = now(clock);
      baseline = cpuTotals();
      timer = setInterval(tick, intervalMs);
      timer.unref?.();
    },
    stop() {
      if (timer !== null) clearInterval(timer);
      timer = null; baseline = null; samples = []; startedAt = null;
    },
    // 지금 값: CPU 는 instantWindowMs(0.5초) 동안 두 번 읽은 순간값. 추이 표본에는 넣지 않는다.
    async read({ signal } = {}) {
      const before = cpuTotals();
      await wait(instantWindowMs, signal);
      const after = cpuTotals();
      const cpu = cpuBetween(before, after, now(clock));
      const memory = readMemory(clock);
      const disk = await readDisk(clock, drive);
      return {
        current: { cpu, memory, disk },
        history: structuredClone(samples),
        sampling: {
          running: timer !== null, startedAt, intervalMs, maxSamples, instantWindowMs,
          cpuHistory: 'interval-average', storage: 'memory-only',
        },
      };
    },
  });
}
