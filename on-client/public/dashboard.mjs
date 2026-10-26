// 관제 대시보드 — 다른 화면이 이미 불러온 값만 모아 그린다.
// 요청·타이머를 만들지 않는다. 받은 snapshot 은 읽기만 한다.
// DOM 은 createElement 와 textContent 로만 만든다(innerHTML 사용 금지).

// 출처 배지. 색과 함께 글자·테두리 모양으로도 구분한다.
const SOURCES = Object.freeze({
  measured: { label: '실측', note: '이 PC의 브라우저가 로컬 서버에 직접 요청해서 잰 값입니다.' },
  demo: { label: '예시 값', note: '-Demo 예제 엔진이 만든 설명용 자료입니다. 실제 조회 결과가 아닙니다.' },
  server: { label: '서버 조회값', note: '서버가 연결된 엔진(connected)에서 조회했다고 알려 준 값입니다. 브라우저가 잰 값은 아닙니다.' },
  disconnected: { label: '연결 없음', note: '엔진이 연결되지 않았거나 로컬 서버에 닿지 못했습니다. 0건·정상이 아닙니다.' },
  unverified: { label: '확인 불가', note: '응답 형식이 계약과 다르거나, 실패했거나, 상태를 알 수 없습니다. 정상으로 보지 마세요.' },
  pending: { label: '확인 전', note: '아직 요청하지 않았습니다. 해당 버튼을 눌러야 값이 생깁니다.' },
  loading: { label: '불러오는 중', note: '응답을 기다리는 중입니다.' },
  mixed: { label: '줄마다 다름', note: '이 카드의 줄마다 출처가 다릅니다. 각 줄의 배지를 확인하세요.' },
});
const LEGEND_ORDER = ['measured', 'demo', 'server', 'disconnected', 'unverified', 'pending', 'loading'];

const UNVERIFIED_CODES = new Set(['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED', 'INVALID_RESPONSE']);
const DISCONNECTED_CODES = new Set(['ENGINE_NOT_CONNECTED', 'NETWORK_ERROR']);

const MODE_TEXT = { connected: '연결됨(connected)', demo: '예제(demo) · 실제 연결 아님', disconnected: '연결 없음(disconnected)', unknown: '확인 불가(unknown)' };
const KIND_TEXT = { access: '접속 기록', xdr: 'XDR 사건' };
const ACCESS_TEXT = { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' };
const DEVICE_TEXT = { compliant: '기준 충족', noncompliant: '기준 미충족', unknown: '확인 불가' };
const SESSION_TEXT = { active: '활성', expired: '만료', revoked: '회수됨', unknown: '확인 불가' };
const DECISION_TEXT = { allow: '허용', deny: '차단', challenge: '추가 확인 필요', unknown: '판정 불명' };
const PATH_LABELS = { me: '로그인 정보', apps: '업무 앱', events: '보안 기록', devices: '기기', sessions: '세션', diagnostics: '도움정보' };
const MEASURE_ORDER = ['me', 'devices', 'sessions', 'apps', 'events', 'diagnostics'];
const AI_PHASE_TEXT = {
  idle: '시작 전', cancelled: '취소됨', starting: '시작하는 중', awaiting_approval: '승인 대기', finishing: '연결 확인 중',
  checking: '확인 중', cancelling: '취소하는 중', connected: '연결됨(17단계 절차 결과)', error: '실패', unknown: '확인 불가',
};

// ---------- 출처 판정 ----------

// 자원 하나의 출처. 실패·확인 불가를 0건이나 정상으로 바꾸지 않는다.
export function sourceOf(resource) {
  if (!resource || resource.status === 'idle') return 'pending';
  if (resource.status === 'loading') return 'loading';
  const mode = resource.meta && typeof resource.meta.mode === 'string' ? resource.meta.mode : 'unknown';
  if (resource.status === 'error') {
    const code = resource.error && resource.error.code;
    if (UNVERIFIED_CODES.has(code)) return 'unverified';
    if (DISCONNECTED_CODES.has(code) || mode === 'disconnected') return 'disconnected';
    return 'unverified';
  }
  if (resource.status !== 'ok') return 'unverified';
  if (mode === 'demo') return 'demo';
  if (mode === 'connected') return 'server';
  if (mode === 'disconnected') return 'disconnected';
  return 'unverified';
}

// 여러 줄을 묶은 카드의 출처. 하나라도 불러오는 중이면 불러오는 중, 모두 같으면 그 값, 다르면 줄마다 다름.
function combine(sources) {
  if (sources.includes('loading')) return 'loading';
  const set = new Set(sources);
  return set.size === 1 ? sources[0] : 'mixed';
}

// ---------- DOM 도우미 ----------

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'text') node.textContent = String(value);
    else if (key === 'className') node.className = value;
    else if (key === 'testid') node.dataset.testid = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

function badge(source, testid) {
  const info = SOURCES[source] || SOURCES.unverified;
  return el('span', { className: 'src-badge', 'data-source': source, testid, title: info.note, text: `출처: ${info.label}` });
}

function formatTime(value) {
  if (typeof value !== 'string' || !value) return '시각 정보 없음';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '시각 형식 확인 불가' : date.toLocaleString('ko-KR');
}

function errorText(resource) {
  const code = resource.error && typeof resource.error.code === 'string' ? resource.error.code : 'UNKNOWN_ERROR';
  return `${SOURCES[sourceOf(resource)].label} (${code})`;
}

// 자원 상태를 줄 글로 바꾼다. ok 일 때만 describe 를 부른다.
function resourceText(resource, describe, pendingText = '아직 요청하지 않았습니다.') {
  if (!resource || resource.status === 'idle') return pendingText;
  if (resource.status === 'loading') return '불러오는 중…';
  if (resource.status === 'error') return errorText(resource);
  if (resource.status !== 'ok') return '확인 불가';
  return describe(resource.data, resource);
}

// 카드 안의 한 줄: 이름 · 값 · 출처 배지
function row(name, value, source, testid) {
  return el('div', { className: 'dash-row' }, [
    el('dt', { text: name }),
    el('dd', {}, [el('span', { className: 'dash-value', testid, text: value }), badge(source)]),
  ]);
}

function card(title, testid, rows, notes = []) {
  const source = combine(rows.map((r) => r.source));
  const anyDemo = rows.some((r) => r.source === 'demo');
  return el('section', { className: 'dash-card', testid, 'data-source': source, 'aria-label': title }, [
    el('div', { className: 'dash-card-head' }, [el('h2', { text: title }), badge(source, `${testid}-source`)]),
    el('dl', { className: 'dash-rows' }, rows.map((r) => row(r.name, r.value, r.source, r.testid))),
    anyDemo ? el('p', { className: 'dash-note', text: `예시 값: ${SOURCES.demo.note}` }) : null,
    ...notes.map((text) => el('p', { className: 'dash-note', text })),
  ]);
}

// ---------- 카드 4개 ----------

const LOCAL_FAILURES = new Set(['NETWORK_ERROR', 'TIMEOUT', 'CANCELLED']);
const RESOURCE_KEYS = ['me', 'devices', 'sessions', 'apps', 'events'];

function engineCard(snap) {
  const done = RESOURCE_KEYS.map((key) => snap.measurements[key]).filter((m) => m && m.status === 'done');
  const loading = RESOURCE_KEYS.some((key) => !snap.measurements[key] || snap.measurements[key].status !== 'done');
  const responded = done.filter((m) => m.responded);

  let serverValue, serverSource;
  if (loading && done.length === 0) { serverValue = '불러오는 중…'; serverSource = 'loading'; }
  else if (responded.length === 0) {
    const codes = [...new Set(done.map((m) => m.code).filter(Boolean))].join(', ') || '응답 없음';
    serverValue = `응답 없음 (${codes})`;
    serverSource = done.some((m) => m.code === 'NETWORK_ERROR') ? 'disconnected' : 'unverified';
  } else {
    serverValue = `응답함 ${responded.length}/${RESOURCE_KEYS.length}건 · ${snap.origin}`;
    serverSource = loading ? 'loading' : 'measured';
  }

  // 엔진 모드: 서버가 실제로 보낸 meta.mode 만 쓴다. 섞이거나 없으면 확인 불가.
  const modes = new Set(responded.map((m) => m.serverMode).filter(Boolean));
  let engineValue, engineSource;
  if (loading) { engineValue = '불러오는 중…'; engineSource = 'loading'; }
  else if (modes.size === 0) { engineValue = '서버가 모드를 알려 주지 않았습니다(확인 불가)'; engineSource = 'unverified'; }
  else if (modes.size > 1) { engineValue = `응답마다 다름(${[...modes].join(', ')}) · 확인 불가`; engineSource = 'unverified'; }
  else {
    const mode = [...modes][0];
    engineValue = MODE_TEXT[mode] || MODE_TEXT.unknown;
    engineSource = { connected: 'server', demo: 'demo', disconnected: 'disconnected' }[mode] || 'unverified';
  }

  const diag = snap.diagnostics;
  const diagValue = resourceText(diag, (d) => `${d && d.engine && typeof d.engine.code === 'string' ? d.engine.code : '코드 없음'}`,
    '「보호 현황 › 도움정보」에서 「도움정보 불러오기」를 누르면 표시됩니다.');
  const diagSource = diag && diag.status === 'ok' ? 'measured' : sourceOf(diag);

  return card('① 앱·엔진 연결 상태', 'dash-card-engine', [
    { name: '로컬 서버', value: serverValue, source: serverSource, testid: 'dash-local-server' },
    { name: '엔진 모드', value: engineValue, source: engineSource, testid: 'dash-engine-mode' },
    { name: '도움정보 코드', value: diagValue, source: diagSource, testid: 'dash-engine-code' },
  ], ['엔진 모드는 서버가 응답 meta.mode 로 알려 준 값입니다.']);
}

function identityCard(snap) {
  const { me, devices, sessions } = snap;
  const meSource = sourceOf(me);
  return card('② 로그인 사용자·기기·세션', 'dash-card-identity', [
    { name: '사용자', value: resourceText(me, (d) => d.user.label || d.user.id), source: meSource, testid: 'dash-user' },
    { name: '현재 기기', value: resourceText(me, (d) => `${d.device.label || d.device.id} · ${DEVICE_TEXT[d.device.status] || '확인 불가'}`), source: meSource },
    { name: '현재 세션', value: resourceText(me, (d) => `${d.session.id} · ${SESSION_TEXT[d.session.status] || '확인 불가'}`), source: meSource },
    { name: '등록 기기', value: resourceText(devices, (d) => {
      const bad = d.filter((x) => x.status !== 'compliant').length;
      return `${d.length}개${bad ? ` · 기준 충족 아님·확인 불가 ${bad}개` : ''}`;
    }), source: sourceOf(devices) },
    { name: '세션 목록', value: resourceText(sessions, (d) => `${d.length}건`), source: sourceOf(sessions) },
  ]);
}

function appsCard(snap) {
  const { apps, access } = snap;
  let accessValue;
  if (!access || access.status === 'idle') accessValue = '요청 전 · 「업무 앱」 화면에서 앱을 고르면 한 건 판정합니다.';
  else if (access.status === 'loading') accessValue = `${access.appName || access.appId || '앱'} 판정 요청 중…`;
  else if (access.status === 'error') accessValue = `${access.appName || access.appId || '앱'} · 판정 아님: ${errorText(access)}`;
  else accessValue = `${access.appName || access.data.appId} · ${DECISION_TEXT[access.data.decision] || '판정 불명'} · ${formatTime(access.data.checkedAt)}`;
  return card('③ 업무 앱 판정 요약', 'dash-card-apps', [
    { name: '보이는 업무 앱', value: resourceText(apps, (d) => `${d.length}개`), source: sourceOf(apps), testid: 'dash-apps-count' },
    { name: '최근 판정', value: accessValue, source: sourceOf(access), testid: 'dash-last-decision' },
  ], ['모든 앱을 자동으로 판정하지 않습니다. 최근 판정은 사용자가 직접 요청한 1건입니다.']);
}

function aiCard(snap) {
  const phase = typeof snap.aiConnectPhase === 'string' ? snap.aiConnectPhase : 'unknown';
  const phaseSource = ['idle', 'cancelled'].includes(phase) ? 'pending'
    : phase === 'connected' ? 'server' : ['error', 'unknown'].includes(phase) ? 'unverified' : 'loading';
  const check = snap.aiConnection;
  const checkValue = resourceText(check, (d) => (d.audienceAuthorization === 'test'
    ? `시험 transport 응답(test) · 모델 ${d.modelCount}개 · 실제 게이트 수용 아님`
    : `앱 권한 확인 후 응답(verified) · 모델 ${d.modelCount}개`), '「보호 현황 › AI 연결 점검」을 누르면 표시됩니다.');
  const diag = snap.diagnostics;
  const configValue = resourceText(diag, (d) => (d && d.ai && d.ai.configured === true
    ? '설정값 있음 · 이용 권한 확인은 아님' : '설정값 없음'), '도움정보를 불러오면 표시됩니다.');
  return card('④ AI 연결 상태', 'dash-card-ai', [
    { name: '연결 절차', value: AI_PHASE_TEXT[phase] || '확인 불가', source: phaseSource, testid: 'dash-ai-phase' },
    { name: '연결 점검', value: checkValue, source: sourceOf(check), testid: 'dash-ai-check' },
    { name: '서버 설정값', value: configValue, source: diag && diag.status === 'ok' ? 'measured' : sourceOf(diag), testid: 'dash-ai-config' },
  ], ['AI 연결은 버튼을 눌렀을 때만 확인합니다. 「확인 전」은 연결 실패도 성공도 아닙니다.']);
}

// ---------- 추이·최근 기록 ----------

function trendPanel(snap) {
  const events = snap.events;
  const source = sourceOf(events);
  const zone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || '이 PC 시간대'; } catch { return '이 PC 시간대'; } })();
  const body = [];
  if (events && events.status === 'ok') {
    const counts = new Array(24).fill(0);
    let skipped = 0;
    for (const event of events.data) {
      const date = new Date(event.at);
      if (Number.isNaN(date.getTime())) { skipped++; continue; }
      counts[date.getHours()]++;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    const max = Math.max(1, ...counts);
    const bars = el('ol', { className: 'trend', testid: 'dash-trend', 'aria-label': `시간대별 보안 기록 건수, 합계 ${total}건` },
      counts.map((count, hour) => {
        const label = `${String(hour).padStart(2, '0')}시 ${count}건`;
        const fill = el('span', { className: 'trend-fill' });
        fill.style.height = `${(count / max) * 100}%`;
        return el('li', { className: 'trend-col', title: label }, [
          el('span', { className: 'trend-count', 'aria-hidden': 'true', text: count > 0 ? String(count) : '' }),
          el('span', { className: 'trend-track', 'aria-hidden': 'true' }, fill),
          el('span', { className: 'trend-hour', 'aria-hidden': 'true', text: hour % 3 === 0 ? String(hour).padStart(2, '0') : '' }),
          el('span', { className: 'sr-only', text: label }),
        ]);
      }));
    const peak = counts.indexOf(Math.max(...counts));
    body.push(bars,
      el('p', { className: 'dash-note', text: total === 0
        ? '받은 기록이 0건입니다(응답은 정상이며 연결 없음과 다릅니다).'
        : `합계 ${total}건 · 가장 많은 시간대 ${String(peak).padStart(2, '0')}시(${counts[peak]}건) · 기준 시간대 ${zone}` }),
      skipped ? el('p', { className: 'dash-note', text: `시각을 읽을 수 없는 기록 ${skipped}건은 막대에서 뺐습니다.` }) : null,
      events.coverage && events.coverage.truncated
        ? el('p', { className: 'dash-note', text: `원천 기록 ${events.coverage.total}건 중 ${events.coverage.returned}건만 받았습니다. 막대는 받은 기록만 셉니다.` }) : null,
      el('details', { className: 'dash-table' }, [
        el('summary', { text: '표로 보기' }),
        el('table', {}, [
          el('thead', {}, el('tr', {}, [el('th', { scope: 'col', text: '시간대' }), el('th', { scope: 'col', text: '건수' })])),
          el('tbody', {}, counts.map((count, hour) => el('tr', {}, [el('td', { text: `${String(hour).padStart(2, '0')}시` }), el('td', { text: String(count) })]))),
        ]),
      ]));
  } else {
    // 연결 없음·확인 불가·불러오는 중에는 막대를 그리지 않는다(0건으로 보이지 않게).
    body.push(el('p', { className: 'dash-empty', 'data-source': source, testid: 'dash-trend-state',
      text: events && events.status === 'error' ? `막대를 그리지 않습니다 · ${errorText(events)}` : events && events.status === 'loading' ? '불러오는 중…' : '아직 불러오지 않았습니다.' }));
  }
  return panel('보안 기록 추이 (at 기준 시간대별 건수)', 'dash-trend-panel', source, body, source === 'demo');
}

function recentPanel(snap) {
  const events = snap.events;
  const source = sourceOf(events);
  let body;
  if (events && events.status === 'ok') {
    const recent = [...events.data].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 5);
    body = recent.length === 0
      ? [el('p', { className: 'dash-empty', text: '받은 기록이 0건입니다.' })]
      : [el('ul', { className: 'dash-recent', testid: 'dash-recent' }, recent.map((e) => el('li', {}, [
        el('span', { className: 'dash-recent-summary', text: e.summary || '요약 없음' }),
        el('span', { className: 'dash-note', text: `${formatTime(e.at)} · ${KIND_TEXT[e.kind] || e.kind} · 접속 ${ACCESS_TEXT[e.state && e.state.access] || '확인 불가'} · 기록 ${e.id}` }),
      ]))), el('p', { className: 'dash-note', text: '자세한 근거·규칙과 AI 설명은 「보안 기록」 화면에서 확인합니다.' })];
  } else {
    body = [el('p', { className: 'dash-empty', 'data-source': source,
      text: events && events.status === 'error' ? `목록 없음 · ${errorText(events)}` : events && events.status === 'loading' ? '불러오는 중…' : '아직 불러오지 않았습니다.' })];
  }
  return panel('최근 기록 (최대 5건)', 'dash-recent-panel', source, body, source === 'demo');
}

function panel(title, testid, source, body, demo) {
  return el('section', { className: 'dash-panel', testid, 'data-source': source, 'aria-label': title }, [
    el('div', { className: 'dash-card-head' }, [el('h2', { text: title }), badge(source, `${testid}-source`)]),
    demo ? el('p', { className: 'dash-note', text: `예시 값: ${SOURCES.demo.note}` }) : null,
    ...body,
  ]);
}

// ---------- 실측 패널 ----------

function measuredPanel(snap) {
  const loopback = /^127\.0\.0\.1:\d+$/.test(snap.origin);
  const done = MEASURE_ORDER.map((key) => [key, snap.measurements[key]]).filter(([, m]) => m && m.status === 'done');
  const latest = done.map(([, m]) => m.receivedAt).sort().at(-1) || null;
  const anyResponse = done.some(([, m]) => m.responded);
  const source = done.length === 0 ? 'loading' : anyResponse ? 'measured' : 'disconnected';

  const rows = MEASURE_ORDER.map((key) => {
    const m = snap.measurements[key];
    const path = key === 'diagnostics' ? '/api/diagnostics' : `/api/${key}`;
    if (!m) return el('tr', {}, [el('th', { scope: 'row', text: `${PATH_LABELS[key]} (GET ${path})` }),
      el('td', { colspan: '4', text: key === 'diagnostics' ? '확인 전 · 「도움정보 불러오기」를 눌러야 잽니다.' : '확인 전' })]);
    if (m.status !== 'done') return el('tr', {}, [el('th', { scope: 'row', text: `${PATH_LABELS[key]} (GET ${path})` }), el('td', { colspan: '4', text: '재는 중…' })]);
    return el('tr', { 'data-responded': String(m.responded) }, [
      el('th', { scope: 'row', text: `${PATH_LABELS[key]} (GET ${path})` }),
      el('td', { testid: `dash-ms-${key}`, text: m.responded ? `${m.ms.toFixed(1)} ms` : `응답 없음 (${m.ms.toFixed(1)} ms 뒤 ${m.code})` }),
      el('td', { text: formatTime(m.receivedAt) }),
      el('td', { text: m.serverMode ? MODE_TEXT[m.serverMode] || MODE_TEXT.unknown : '서버가 알려 주지 않음' }),
      el('td', { text: m.ok ? '성공 응답(ok)' : `실패 응답 · ${m.code}` }),
    ]);
  });

  const diag = snap.diagnostics;
  let diagSummary;
  if (diag && diag.status === 'ok' && diag.data && typeof diag.data === 'object') {
    const d = diag.data;
    diagSummary = el('dl', { className: 'kv', testid: 'dash-diag-summary' }, [
      el('dt', { text: '구성 요소' }), el('dd', { text: `${d.component ?? '확인 불가'} ${d.version ?? ''}`.trim() }),
      el('dt', { text: '엔진' }), el('dd', { text: `${d.engine && d.engine.mode ? MODE_TEXT[d.engine.mode] || MODE_TEXT.unknown : '확인 불가'} · ${d.engine && d.engine.code ? d.engine.code : '코드 없음'}` }),
      el('dt', { text: 'AI 설정값' }), el('dd', { text: d.ai && d.ai.configured === true ? '있음' : '없음' }),
      el('dt', { text: 'AI 이용 권한' }), el('dd', { text: d.ai && d.ai.authorized === true ? '서버가 확인함' : '확인 안 됨(서버가 확인하지 않음)' }),
      el('dt', { text: '서버 확인 시각' }), el('dd', { text: formatTime(d.checkedAt) }),
    ]);
  } else if (diag && diag.status === 'error') {
    diagSummary = el('p', { className: 'dash-empty', 'data-source': sourceOf(diag), text: `도움정보 · ${errorText(diag)}` });
  } else if (diag && diag.status === 'loading') {
    diagSummary = el('p', { className: 'dash-empty', text: '도움정보 불러오는 중…' });
  } else {
    diagSummary = el('p', { className: 'dash-empty', 'data-source': 'pending', text: '확인 전 · 도움정보는 자동으로 부르지 않습니다. 「보호 현황 › 도움정보」에서 「도움정보 불러오기」를 누르세요.' });
  }

  return el('section', { className: 'dash-panel dash-measured', testid: 'dash-measured-panel', 'data-source': source, 'aria-label': '이 PC에서 잰 값' }, [
    el('div', { className: 'dash-card-head' }, [el('h2', { text: '이 PC에서 잰 값' }), badge(source, 'dash-measured-panel-source')]),
    el('dl', { className: 'kv' }, [
      el('dt', { text: '어디서' }), el('dd', { testid: 'dash-origin', text: `이 브라우저 → http://${snap.origin}${loopback ? '' : ' (127.0.0.1 주소가 아닙니다. 주소를 확인하세요)'}` }),
      el('dt', { text: '마지막 확인' }), el('dd', { testid: 'dash-last-checked', text: latest ? `${formatTime(latest)} (브라우저가 응답을 받은 시각)` : '아직 없음' }),
    ]),
    el('div', { className: 'dash-table-wrap' }, el('table', { className: 'dash-measure-table' }, [
      el('thead', {}, el('tr', {}, ['요청', '응답 시간', '응답 받은 시각', '서버가 알려 준 연결 모드', '결과'].map((t) => el('th', { scope: 'col', text: t })))),
      el('tbody', {}, rows),
    ])),
    el('p', { className: 'dash-note', text: '응답 시간은 performance.now() 로 요청 시작부터 응답 본문(JSON)을 다 읽을 때까지 잰 값입니다. 「다시 불러오기」는 5개 요청을 동시에 보내므로 서로 영향을 줄 수 있습니다.' }),
    el('h3', { text: '도움정보 요약' }),
    diagSummary,
  ]);
}

// ---------- 전체 ----------

function legend() {
  return el('details', { className: 'dash-legend', testid: 'dash-legend' }, [
    el('summary', { text: '출처 배지 읽는 법' }),
    el('dl', {}, LEGEND_ORDER.flatMap((key) => [el('dt', {}, badge(key)), el('dd', { text: SOURCES[key].note })])),
  ]);
}

export function renderDashboard(target, snap) {
  target.replaceChildren(
    el('p', { className: 'dash-refresh', testid: 'dash-refresh-state', text: snap.refreshing
      ? '다시 불러오는 중… 값이 하나씩 바뀝니다.'
      : '값은 「다시 불러오기」를 누를 때만 갱신됩니다. 자동 새로고침은 없습니다.' }),
    legend(),
    el('div', { className: 'dash-cards' }, [engineCard(snap), identityCard(snap), appsCard(snap), aiCard(snap)]),
    el('div', { className: 'dash-lower' }, [trendPanel(snap), recentPanel(snap)]),
    measuredPanel(snap),
  );
}
