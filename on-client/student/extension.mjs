// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
// 15단계 renderEvents 필터 상태. 다시 불러와도 고른 필터는 유지하고, 새 자료에 없는 값이면 all 로 되돌립니다.
const eventFilterState = { kind: 'all', appId: 'all', access: 'all' };

export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = document.createElement('section');
      root.setAttribute('aria-label', '로그인 사용자·기기·세션');

      const text = (parent, tag, value) => {
        const node = document.createElement(tag);
        node.textContent = String(value);
        parent.appendChild(node);
        return node;
      };
      const valueText = (value) => typeof value === 'string' && value.length > 0 ? value : '확인 불가';
      const modeText = (mode) => ({
        connected: '연결됨 (connected)',
        demo: '예제 자료 (demo)',
        disconnected: '연결 없음 (disconnected)',
        unknown: '확인 불가 (unknown)',
      })[mode] || '확인 불가 (unknown)';
      const deviceStatusText = (status) => ({
        compliant: '보안 기준 충족 (compliant)',
        noncompliant: '보안 기준 미충족 (noncompliant)',
        unknown: '확인 불가 (unknown)',
      })[status] || `확인 불가 (${valueText(status)})`;
      const sessionStatusText = (status) => ({
        active: '활성 (active)',
        expired: '만료 (expired)',
        revoked: '철회됨 (revoked)',
        unknown: '확인 불가 (unknown)',
      })[status] || `확인 불가 (${valueText(status)})`;

      const resourceSection = (title, resource, renderOk) => {
        const section = document.createElement('section');
        text(section, 'h3', title);
        text(section, 'p', `자료 모드: ${modeText(resource?.mode)}`);

        if (resource?.status === 'loading') {
          text(section, 'p', '불러오는 중');
        } else if (resource?.status === 'error') {
          const code = resource.error?.code;
          const message = valueText(resource.error?.message);
          const prefix = code === 'CONTRACT_MISMATCH' || code === 'ENGINE_RESULT_UNVERIFIED'
            ? '확인 불가'
            : '연결 실패';
          text(section, 'p', `${prefix}: ${message}`);
        } else if (resource?.status === 'ok') {
          renderOk(section, resource.data);
        } else {
          text(section, 'p', '확인 불가: 자료 상태를 확인할 수 없습니다.');
        }

        root.appendChild(section);
      };

      resourceSection('로그인 사용자와 현재 기기·세션', me, (section, data) => {
        if (!data?.user || !data?.device || !data?.session) {
          text(section, 'p', '확인 불가: 사용자·기기·세션 자료 형식을 확인할 수 없습니다.');
          return;
        }
        text(section, 'p', `사용자: ${valueText(data.user.label)} (ID: ${valueText(data.user.id)})`);
        text(section, 'p', `현재 기기: ${valueText(data.device.label)} (ID: ${valueText(data.device.id)}) · ${deviceStatusText(data.device.status)}`);
        text(section, 'p', `현재 세션: ID ${valueText(data.session.id)} · ${sessionStatusText(data.session.status)}`);
      });

      resourceSection('기기 목록', devices, (section, data) => {
        if (!Array.isArray(data)) {
          text(section, 'p', '확인 불가: 기기 목록 형식을 확인할 수 없습니다.');
          return;
        }
        if (data.length === 0) {
          text(section, 'p', '표시할 기기 정보가 없습니다.');
          return;
        }
        for (const device of data) {
          if (!device || typeof device !== 'object') {
            text(section, 'p', '확인 불가: 기기 자료 형식을 확인할 수 없습니다.');
            continue;
          }
          text(section, 'p', `기기: ${valueText(device.label)} (ID: ${valueText(device.id)}) · ${deviceStatusText(device.status)}`);
        }
      });

      resourceSection('세션 목록', sessions, (section, data) => {
        if (!Array.isArray(data)) {
          text(section, 'p', '확인 불가: 세션 목록 형식을 확인할 수 없습니다.');
          return;
        }
        if (data.length === 0) {
          text(section, 'p', '표시할 세션 정보가 없습니다.');
          return;
        }
        for (const session of data) {
          if (!session || typeof session !== 'object') {
            text(section, 'p', '확인 불가: 세션 자료 형식을 확인할 수 없습니다.');
            continue;
          }
          text(section, 'p', `세션: ID ${valueText(session.id)} · ${sessionStatusText(session.status)}`);
        }
      });

      return root;
    },
    renderDecision({ status, mode, data, error, appId } = {}) {
      const root = document.createElement('section');
      root.setAttribute('aria-label', '업무 앱 접근 판정');

      const text = (tag, value) => {
        const node = document.createElement(tag);
        node.textContent = String(value);
        root.appendChild(node);
        return node;
      };
      const valueText = (value) => typeof value === 'string' && value.length > 0 ? value : '확인 불가';
      const modeText = ({
        connected: '연결됨 (connected)',
        demo: '예제 자료 (demo)',
        disconnected: '연결 없음 (disconnected)',
        unknown: '확인 불가 (unknown)',
      })[mode] || '확인 불가 (unknown)';
      const DECISION_TEXT = {
        allow: { label: '허용 (allow)', note: '정책상 접근이 허용되었습니다. 실제 앱 접속 성공을 보장하지는 않습니다.' },
        deny: { label: '거부 (deny)', note: '정책상 접근이 거부되었습니다.' },
        challenge: { label: '추가 확인 필요 (challenge)', note: '추가 인증 또는 확인이 필요합니다. 이 화면은 확인 절차를 대신 수행하지 않습니다.' },
        unknown: { label: '확인 불가 (unknown)', note: '판정을 확인할 수 없습니다. 접근이 허용되지 않은 것으로 다룹니다.' },
      };

      text('h3', '업무 앱 접근 판정');
      if (typeof mode === 'string' && mode.length > 0) text('p', `자료 모드: ${modeText}`);

      if (status === 'idle') {
        text('p', '앱을 골라 접속을 요청하세요.');
        return root;
      }
      if (status === 'loading') {
        text('p', `대상 앱: ${valueText(appId)}`);
        text('p', '판정 확인 중');
        return root;
      }
      if (status === 'error') {
        text('p', `대상 앱: ${valueText(appId)}`);
        text('p', `요청 실패: ${valueText(error?.message)}`);
        text('p', '서버의 판정을 받지 못했습니다. 접근 거부 판정이 아니며, 접근이 허용된 것도 아닙니다.');
        return root;
      }
      if (status === 'ok' && data && typeof data === 'object') {
        const known = Object.hasOwn(DECISION_TEXT, data.decision);
        const shown = known
          ? DECISION_TEXT[data.decision]
          : { label: `확인 불가 (unknown, 받은 값: ${valueText(data.decision)})`, note: DECISION_TEXT.unknown.note };
        text('p', `대상 앱: ${valueText(data.appId ?? appId)}`);
        text('p', `판정: ${shown.label}`);
        text('p', shown.note);
        text('p', `판정 이유: ${valueText(data.reason)}`);
        text('p', `판정 시각: ${valueText(data.checkedAt)}`);
        return root;
      }

      text('p', `대상 앱: ${valueText(appId)}`);
      text('p', '판정: 확인 불가 (unknown) — 판정 자료를 확인할 수 없습니다. 접근이 허용되지 않은 것으로 다룹니다.');
      return root;
    },
    renderEvents({ status, mode, data, error } = {}) {
      const root = document.createElement('section');
      root.setAttribute('aria-label', '접속 기록·XDR 경보');

      const add = (parent, tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        parent.appendChild(node);
        return node;
      };
      const valueText = (value) => typeof value === 'string' && value.length > 0 ? value : '확인 불가';
      const MODE_TEXT = {
        connected: '연결됨 (connected)',
        demo: '예제 자료 (demo)',
        disconnected: '연결 없음 (disconnected)',
        unknown: '확인 불가 (unknown)',
      };
      const KIND_TEXT = { access: '접속 기록 (access)', xdr: 'XDR 경보 (xdr)' };
      const ACCESS_TEXT = { allowed: '허용됨 (allowed)', denied: '거부됨 (denied)', unknown: '확인 불가 (unknown)' };
      const SESSION_TEXT = { active: '활성 (active)', expired: '만료 (expired)', revoked: '철회됨 (revoked)', unknown: '확인 불가 (unknown)' };
      const DEVICE_TEXT = { compliant: '보안 기준 충족 (compliant)', noncompliant: '보안 기준 미충족 (noncompliant)', unknown: '확인 불가 (unknown)' };
      const labelOf = (table, value) => table[value] || `확인 불가 (${valueText(value)})`;
      const appText = (appId) => typeof appId === 'string' && appId.length > 0 ? appId : '앱 확인 불가 (appId 없음)';
      const timeText = (at) => {
        const ms = Date.parse(at);
        if (!Number.isFinite(ms)) return `확인 불가 (${valueText(at)})`;
        const local = new Date(ms).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
        return `${local} KST (원래 값: ${at})`;
      };

      add(root, 'h3', '접속 기록·XDR 경보');
      if (typeof mode === 'string' && mode.length > 0) add(root, 'p', `자료 모드: ${MODE_TEXT[mode] || '확인 불가 (unknown)'}`);

      if (status === 'loading') {
        add(root, 'p', '기록을 불러오는 중');
        return root;
      }
      if (status === 'error') {
        const code = error?.code;
        if (code === 'CONTRACT_MISMATCH' || code === 'ENGINE_RESULT_UNVERIFIED') {
          add(root, 'p', `확인 불가: 기록 응답 형식을 확인할 수 없습니다 (${code}). ${valueText(error?.message)}`);
          add(root, 'p', '이전 목록은 현재 결과가 아니므로 표시하지 않습니다.');
        } else {
          add(root, 'p', `기록을 불러오지 못했습니다: ${valueText(error?.message)}`);
          add(root, 'p', '조회에 실패했습니다. 기록이 없다는 뜻이 아닙니다.');
        }
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        add(root, 'p', '확인 불가: 기록 자료 상태를 확인할 수 없습니다.');
        return root;
      }
      if (data.length === 0) {
        add(root, 'p', '표시할 기록이 없습니다.');
        add(root, 'p', '조회는 성공했으며, 본인의 최근 기록 범위에 해당하는 기록이 0건입니다.');
        return root;
      }

      // 받은 배열은 고치지 않고 복사해서 at 기준 최신순으로 정렬합니다.
      const events = [...data].sort((a, b) => (Date.parse(b?.at) || 0) - (Date.parse(a?.at) || 0));

      // 필터: 전체는 all, 나머지는 받은 원래 값. 앱 ID 가 없는 기록은 빈 값('')으로 고릅니다.
      const FILTERS = [
        { key: 'kind', label: '기록 종류', read: (e) => e?.kind, text: (v) => labelOf(KIND_TEXT, v) },
        { key: 'appId', label: '업무 앱', read: (e) => (typeof e?.appId === 'string' ? e.appId : ''), text: (v) => appText(v) },
        { key: 'access', label: '접속 상태', read: (e) => e?.state?.access, text: (v) => labelOf(ACCESS_TEXT, v) },
      ];
      let selectedId = null; // 새 자료가 오면 이전 상세 선택은 지웁니다.

      const filterBox = add(root, 'div');
      const countLine = add(root, 'p');
      const list = add(root, 'ul');
      const detail = add(root, 'section');
      detail.setAttribute('aria-live', 'polite');

      for (const filter of FILTERS) {
        const values = [...new Set(events.map(filter.read).filter((v) => typeof v === 'string'))];
        if (eventFilterState[filter.key] !== 'all' && !values.includes(eventFilterState[filter.key])) {
          eventFilterState[filter.key] = 'all';
        }
        const id = `student-event-filter-${filter.key}`;
        const label = add(filterBox, 'label', `${filter.label} `);
        label.htmlFor = id;
        const select = add(label, 'select');
        select.id = id;
        select.setAttribute('aria-label', filter.label);
        const all = add(select, 'option', '전체 (all)');
        all.value = 'all';
        for (const value of values) {
          const option = add(select, 'option', filter.text(value));
          option.value = value;
        }
        select.value = eventFilterState[filter.key];
        select.addEventListener('change', () => {
          eventFilterState[filter.key] = select.value;
          drawList();
        });
      }

      const drawDetail = () => {
        detail.replaceChildren();
        detail.removeAttribute('data-student-event-detail');
        const event = events.find((e) => e?.id === selectedId);
        if (!event) return;
        detail.setAttribute('data-student-event-detail', String(event.id));
        add(detail, 'h4', `${valueText(event.id)} 상세`);
        add(detail, 'p', `사건 ID: ${valueText(event.id)}`);
        add(detail, 'p', `앱: ${appText(event.appId)}`);

        add(detail, 'h5', '근거 (evidence)');
        const evidence = Array.isArray(event.evidence) ? event.evidence : [];
        if (evidence.length === 0) add(detail, 'p', '근거 없음');
        const evidenceList = add(detail, 'ul');
        for (const row of evidence) add(evidenceList, 'li', `${valueText(row?.id)}: ${valueText(row?.text)}`);

        add(detail, 'h5', '규칙 (rules)');
        const rules = Array.isArray(event.rules) ? event.rules : [];
        if (rules.length === 0) add(detail, 'p', '규칙 없음');
        const ruleList = add(detail, 'ul');
        for (const row of rules) add(ruleList, 'li', `${valueText(row?.id)}: ${valueText(row?.text)}`);

        add(detail, 'h5', '상태 (state)');
        const stateList = add(detail, 'ul');
        add(stateList, 'li', `접속 (state.access): ${labelOf(ACCESS_TEXT, event.state?.access)}`);
        add(stateList, 'li', `세션 (state.session): ${labelOf(SESSION_TEXT, event.state?.session)}`);
        add(stateList, 'li', `기기 (state.device): ${labelOf(DEVICE_TEXT, event.state?.device)}`);

        // 16단계: 원천이 넘긴 조치가 있을 때만, 요청을 보내지 않는 비활성 「<action> 미지원」 버튼을 둡니다.
        const actions = Array.isArray(event.supportedActions) ? event.supportedActions.filter((a) => typeof a === 'string' && a.length > 0) : [];
        if (actions.length > 0) {
          add(detail, 'h5', '조치 (supportedActions)');
          add(detail, 'p', '아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중이며, 아래 버튼은 누를 수 없고 어떤 요청도 보내지 않습니다.');
          for (const action of actions) {
            const button = add(detail, 'button', `${action} 미지원`);
            button.type = 'button';
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
          }
        }
      };

      const drawList = () => {
        const shown = events.filter((event) => FILTERS.every((filter) => (
          eventFilterState[filter.key] === 'all' || filter.read(event) === eventFilterState[filter.key]
        )));
        countLine.textContent = `표시 ${shown.length}건 / 받은 기록 ${events.length}건 (본인의 최근 기록, 최신순)`;
        list.replaceChildren();
        if (shown.length === 0) add(list, 'li', '필터에 맞는 기록이 없습니다.');
        for (const event of shown) {
          const row = add(list, 'li');
          row.setAttribute('data-student-event-id', String(event.id));
          add(row, 'p', `사건 ID: ${valueText(event.id)}`);
          add(row, 'p', `시각: ${timeText(event.at)}`);
          add(row, 'p', `종류: ${labelOf(KIND_TEXT, event.kind)}`);
          add(row, 'p', `앱: ${appText(event.appId)}`);
          add(row, 'p', `요약: ${valueText(event.summary)}`);
          const button = add(row, 'button', `${valueText(event.id)} 상세`);
          button.type = 'button';
          button.setAttribute('aria-label', `${valueText(event.id)} 상세`);
          button.addEventListener('click', () => {
            selectedId = event.id;
            drawDetail();
          });
        }
        if (!shown.some((event) => event.id === selectedId)) selectedId = null;
        drawDetail();
      };

      drawList();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = document.createElement('section');
      root.setAttribute('aria-label', '기기·세션·알림·도움정보 상태');

      const add = (parent, tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        parent.appendChild(node);
        return node;
      };
      // 화면과 복사본에 비밀처럼 보이는 값이 섞이지 않게 가립니다.
      const SECRET = /(?:Bearer\s+\S+|sk-[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|token|secret|비밀번호|토큰)\s*[:=]\s*\S+)/giu;
      const safe = (value) => (typeof value === 'string' && value.length > 0 ? value.replace(SECRET, '[가림]') : '확인 불가');
      const safeCode = (value) => (typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/u.test(value) ? value : '확인 불가');
      const MODE_TEXT = {
        connected: '연결됨 (connected)', demo: '예제 자료 (demo)',
        disconnected: '연결 없음 (disconnected)', unknown: '확인 불가 (unknown)',
      };
      const modeText = (value) => MODE_TEXT[value] || '확인 불가 (unknown)';
      const DEVICE_TEXT = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
      const SESSION_TEXT = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
      const RESOURCE_TEXT = {
        me: '로그인 정보', apps: '업무 앱', events: '보안 기록', devices: '기기', sessions: '세션',
        access: '접속 판정', diagnostics: '도움정보',
      };
      const withCode = (table, value) => `${table[value] || '확인 불가'} (${safeCode(value)})`;
      const TIMEOUT_CODES = new Set(['TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT']);
      const RETRY = '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.';

      // 실패 안내: 무엇을 불러오지 못했는지 + 시간 초과 여부 + message + 직접 다시 시도.
      const failure = (section, what, error, retryText = RETRY) => {
        const code = safeCode(error?.code);
        if (TIMEOUT_CODES.has(code)) {
          add(section, 'p', `${what}을(를) 불러오지 못했습니다: 시간 초과 (${code}). ${safe(error?.message)}`);
        } else if (code === 'CONTRACT_MISMATCH' || code === 'ENGINE_RESULT_UNVERIFIED') {
          add(section, 'p', `${what} 확인 불가: 응답 형식을 확인할 수 없습니다 (${code}). ${safe(error?.message)}`);
        } else {
          add(section, 'p', `${what}을(를) 불러오지 못했습니다 (${code}): ${safe(error?.message)}`);
        }
        add(section, 'p', retryText);
      };

      const resourceSection = (title, what, resource, renderList) => {
        const section = add(root, 'section');
        add(section, 'h3', title);
        if (resource?.mode) add(section, 'p', `자료 모드: ${modeText(resource.mode)}`);
        if (resource?.status === 'loading') add(section, 'p', `${what}을(를) 불러오는 중`);
        else if (resource?.status === 'error') failure(section, what, resource.error);
        else if (resource?.status === 'ok' && Array.isArray(resource.data)) renderList(section, resource.data);
        else if (resource?.status === 'ok') add(section, 'p', `${what} 확인 불가: 목록 형식을 확인할 수 없습니다.`);
        else add(section, 'p', `${what} 확인 불가: 아직 불러오지 않았거나 상태를 알 수 없습니다.`);
        return section;
      };

      add(root, 'h3', '케셰브 상태 점검');
      add(root, 'p', `전체 자료 모드: ${modeText(mode)}`);

      resourceSection('등록 기기', '기기 목록', devices, (section, list) => {
        if (list.length === 0) {
          add(section, 'p', '등록된 기기가 없습니다. (조회는 성공했으며 결과가 0건입니다)');
          return;
        }
        const ul = add(section, 'ul');
        for (const device of list) {
          add(ul, 'li', `${safe(device?.label)} · ${withCode(DEVICE_TEXT, device?.status)}`);
        }
      });

      const sessionSection = resourceSection('현재 세션', '세션', sessions, (section, list) => {
        if (list.length === 0) {
          add(section, 'p', '현재 연결 없음: 지금 검증된 세션이 없습니다. (조회는 성공했으며 결과가 0건입니다)');
          return;
        }
        const ul = add(section, 'ul');
        for (const session of list) {
          add(ul, 'li', `세션 ID ${safe(session?.id)} · ${withCode(SESSION_TEXT, session?.status)}`);
        }
      });
      add(sessionSection, 'p', '세션은 지금 검증된 연결 1건만 표시합니다. 지난 세션 목록이 아닙니다.');

      const alertSection = add(root, 'section');
      add(alertSection, 'h3', '알림');
      if (!Array.isArray(notifications)) {
        add(alertSection, 'p', '알림 확인 불가: 알림 목록 형식을 확인할 수 없습니다.');
      } else if (notifications.length === 0) {
        add(alertSection, 'p', '주의할 알림이 없습니다.');
      } else {
        add(alertSection, 'p', `주의할 알림 ${notifications.length}건`);
        const ul = add(alertSection, 'ul');
        for (const item of notifications) {
          const resource = typeof item?.resource === 'string' ? item.resource : '';
          add(ul, 'li', `자료: ${RESOURCE_TEXT[resource] || '확인 불가'} (${safeCode(resource)}) · 코드: ${safeCode(item?.code)} · ${safe(item?.message)}`);
        }
      }

      // 도움정보: 제공 화면이 조회해 넘긴 값만 씁니다. 학생 코드는 진단 주소를 직접 호출하지 않습니다.
      const diagSection = add(root, 'section');
      add(diagSection, 'h3', '도움정보');
      let helpText = '';
      if (diagnostics?.status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object') {
        const d = diagnostics.data;
        const fields = [
          ['requestId', d.requestId], ['component', d.component], ['version', d.version],
          ['checkedAt', d.checkedAt], ['engine.mode', d.engine?.mode], ['engine.code', d.engine?.code],
        ];
        const ul = add(diagSection, 'ul');
        for (const [name, value] of fields) add(ul, 'li', `${name}: ${safe(value)}`);
        helpText = fields.map(([name, value]) => `${name}: ${safe(value)}`).join('\n');
      } else if (diagnostics?.status === 'loading') {
        add(diagSection, 'p', '도움정보를 불러오는 중');
      } else if (diagnostics?.status === 'error') {
        failure(diagSection, '도움정보', diagnostics.error, '다시 시도는 위쪽 도움정보 카드의 「도움정보 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.');
      } else {
        add(diagSection, 'p', '도움정보를 아직 불러오지 않았습니다. 위쪽 도움정보 카드의 「도움정보 불러오기」 버튼을 누르면 이곳에 표시됩니다.');
      }
      add(diagSection, 'p', '「도움정보 복사」는 도움을 요청할 때 붙여 넣을 수 있도록 위 여섯 값(requestId·component·version·checkedAt·engine.mode·engine.code)만 복사합니다. 비밀번호·토큰·API 키는 포함하지 않으며, 누를 때만 복사하고 어디에도 전송하지 않습니다.');
      const copyButton = add(diagSection, 'button', '도움정보 복사');
      copyButton.type = 'button';
      copyButton.disabled = helpText.length === 0;
      const copyStatus = add(diagSection, 'p');
      copyStatus.setAttribute('role', 'status');
      copyStatus.setAttribute('aria-live', 'polite');
      if (!helpText) copyStatus.textContent = '복사할 도움정보가 없습니다. 먼저 도움정보를 불러오세요.';
      copyButton.addEventListener('click', async () => {
        if (!helpText) return;
        try {
          await navigator.clipboard.writeText(helpText);
          copyStatus.textContent = '도움정보 여섯 값을 클립보드에 복사했습니다.';
        } catch {
          copyStatus.textContent = '자동 복사를 사용할 수 없습니다. 위 목록을 직접 선택해 Ctrl+C로 복사하세요.';
        }
      });

      return root;
    },
    renderVulnerabilities({ status, mode, data, error } = {}) {
      // 20단계: 설치된 정확한 패키지 버전과 OSV 조회 결과·미조회·일부 실패를 구분해 보여 줍니다.
      // 호출마다 새 요소를 만들므로 조회 중·오류·취소 때 이전 표가 현재 결과처럼 남지 않습니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '설치 패키지와 알려진 취약점 조회 결과');
      const add = (parent, tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        parent.appendChild(node);
        return node;
      };
      const text = (value) => (typeof value === 'string' && value.length > 0 ? value : '확인 불가');
      const safeCode = (value) => (typeof value === 'string' && /^[A-Z0-9_]{1,64}$/u.test(value) ? value : 'CONTRACT_MISMATCH');
      // 정확한 버전(예: 1.2.3)만 설치 버전으로 씁니다. ^1.2.0 같은 범위 표기는 설치 버전으로 표시하지 않습니다.
      const EXACT = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
      const NOT_SAFE = '조회되지 않았거나 확인할 수 없는 패키지는 "취약점 없음"이 아닙니다.';
      const SCAN_TEXT = {
        complete: '모두 조회(complete): 조회 대상 패키지를 모두 OSV와 대조했습니다.',
        partial: '일부 조회 실패(partial): 일부 패키지만 조회됐습니다. 이미 받은 취약점 ID는 그대로 보여 줍니다.',
        not_checked: '아직 조회 안 함(not_checked): 담당자가 승인한 공개 조회 대상 패키지가 없어 조회하지 않았습니다.',
        not_configured: '조회 준비 미완료(not_configured): 조회 대상 프로젝트 설정이 필요합니다. 담당자가 준비하는 설정입니다.',
        unverifiable: 'lock 파일 확인 불가(unverifiable): package-lock.json 을 확인할 수 없어 조회하지 않았습니다.',
      };
      const PACKAGE_TEXT = {
        known_vulnerabilities: '알려진 항목 있음(known_vulnerabilities)',
        none_found: '알려진 항목 없음(none_found): 조회 시점의 OSV 조회 범위에서 알려진 항목이 없다는 뜻이며, 안전을 보장하지 않습니다.',
        unverifiable: '조회 확인 불가(unverifiable)',
      };

      add(root, 'h3', '설치 패키지와 알려진 취약점(OSV)');
      if (typeof mode === 'string' && mode.length > 0) add(root, 'p', `자료 모드: ${mode}`);

      if (status === 'idle' || status === undefined) {
        add(root, 'p', '조회 전: 아직 설치 패키지를 조회하지 않았습니다. 제공 화면의 「설치 패키지 조회」를 직접 누르세요.');
        return root;
      }
      if (status === 'loading') {
        add(root, 'p', '조회 중: 결과가 오기 전까지 이전 결과는 현재 결과가 아닙니다.');
        return root;
      }
      if (status === 'error') {
        const code = safeCode(error?.code);
        const cancelled = code === 'CANCELLED' || code === 'REQUEST_CANCELLED';
        add(root, 'p', `${cancelled ? '조회 취소' : '조회 실패'} (${code}): ${text(error?.message)}`);
        add(root, 'p', `이 결과는 취약점 없음·정상·안전이 아닙니다. 이전 결과도 현재 결과로 보지 않습니다. ${NOT_SAFE}`);
        add(root, 'p', '다시 조회하려면 제공 화면의 「설치 패키지 조회」를 직접 누르세요. 자동으로 다시 조회하지 않습니다.');
        return root;
      }
      if (status !== 'ok' || !data || typeof data !== 'object') {
        add(root, 'p', '조회 결과 확인 불가: 결과 형식을 확인할 수 없습니다. 취약점 없음으로 보지 않습니다.');
        return root;
      }

      // 전체 결과: package-lock.json 과 설치된 node_modules 메타데이터를 대조한 값
      add(root, 'p', `전체 조회 상태: ${SCAN_TEXT[data.status] || `확인 불가(${text(String(data.status ?? ''))})`}`);
      if (data.status !== 'complete' && data.status !== 'partial') add(root, 'p', NOT_SAFE);
      const summary = add(root, 'ul');
      add(summary, 'li', '기준: package-lock.json 과 설치된 node_modules 메타데이터를 대조한 정확한 설치 버전');
      if (data.lockfileVersion !== undefined) add(summary, 'li', `lockfileVersion: ${data.lockfileVersion}`);
      if (data.lockfileHash !== undefined) add(summary, 'li', `lockfileHash: ${text(data.lockfileHash)}`);
      if (data.checkedAt !== undefined) add(summary, 'li', `조회 시각(checkedAt): ${text(data.checkedAt)}`);
      if (typeof data.code === 'string') add(summary, 'li', `상태 코드: ${safeCode(data.code)}`);
      if (Number.isSafeInteger(data.excluded?.count)) add(summary, 'li', `조회 대상에서 제외된 패키지: ${data.excluded.count}개(승인되지 않았거나 공개 조회할 수 없는 패키지는 밖으로 보내지 않음)`);

      const packages = Array.isArray(data.packages) ? data.packages : [];
      if (packages.length === 0) {
        add(root, 'p', data.status === 'complete'
          ? '조회 대상 패키지가 0개입니다.'
          : '표시할 패키지 행이 없습니다(미조회·설정 필요·확인 불가 상태).');
        return root;
      }

      const table = add(root, 'table');
      const head = add(add(table, 'thead'), 'tr');
      for (const label of ['패키지(name)', '설치 버전(version)', '조회 상태(status)', '취약점 ID · 수정 시각(modified)', '출처(source)', '패키지 조회 시각(checkedAt)']) add(head, 'th', label);
      const body = add(table, 'tbody');
      for (const pkg of packages) {
        const exact = typeof pkg?.version === 'string' && EXACT.test(pkg.version);
        const row = add(body, 'tr');
        row.setAttribute('data-student-package-name', text(pkg?.name));
        row.setAttribute('data-student-package-version', exact ? pkg.version : '확인 불가');
        add(row, 'td', text(pkg?.name));
        add(row, 'td', exact ? `${pkg.version} (설치된 정확한 버전)` : `확인 불가(정확한 설치 버전 아님: ${text(pkg?.version)})`);
        const findings = Array.isArray(pkg?.vulnerabilities) ? pkg.vulnerabilities : [];
        const statusText = pkg?.status === 'unverifiable' && findings.length > 0
          ? '일부 확인·전체 조회 확인 불가(unverifiable): 받은 취약점 ID는 그대로 보여 주며, 나머지는 확인하지 못했습니다.'
          : PACKAGE_TEXT[pkg?.status] || `확인 불가(${text(String(pkg?.status ?? ''))})`;
        add(row, 'td', statusText);
        const cell = add(row, 'td');
        if (findings.length === 0) cell.textContent = pkg?.status === 'none_found' ? '없음(조회 범위 기준)' : '확인 불가';
        else {
          const list = add(cell, 'ul');
          for (const finding of findings) add(list, 'li', `${text(finding?.id)} · 수정 시각 ${text(finding?.modified)}`);
        }
        add(row, 'td', text(pkg?.source));
        add(row, 'td', text(pkg?.checkedAt));
      }
      add(root, 'p', 'OSV는 알려진 취약점 데이터베이스입니다. 조회 결과가 없다는 사실만으로 패키지나 앱 전체가 안전하다고 보장할 수 없습니다.');
      return root;
    },
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted } = {}) {
      // 호출마다 새 요소를 만듭니다. 다시 점검에 성공하거나 idle 로 돌아오면 이전 결과·오류는 남지 않습니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '앱 내부 AI 연결 점검');

      const add = (tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        root.appendChild(node);
        return node;
      };
      // 화면에 열쇠·토큰처럼 보이는 글자를 쓰지 않습니다.
      const SECRET = /(?:Bearer\s+\S+|sk-[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|token|secret|비밀번호|토큰)\s*[:=]\s*(?:Bearer\s+)?\S+)/giu;
      const safe = (value) => (typeof value === 'string' && value.length > 0 ? value.replace(SECRET, '[가림]') : '확인 불가');
      const safeCode = (value) => (typeof value === 'string' && /^[A-Z0-9_]{1,64}$/u.test(value) ? value : 'AI_REQUEST_UNVERIFIED');
      const MANUAL = '다시 점검은 위쪽 「현재 API 연결 점검」 버튼을 직접 누르세요. 자동으로 다시 점검하지 않습니다.';

      // error.code 로 원인을 나눕니다. 원문 오류나 열쇠는 쓰지 않습니다.
      const CAUSES = [
        { title: '권한 준비 중·확인 불가', codes: ['ON_AI_PROVISIONING_PENDING', 'AI_REQUEST_UNVERIFIED', 'SUBJECT_SCOPE_UNVERIFIED', 'ON_AI_AUTHORIZATION_CHANGED'],
          guide: '학생 앱 이용 권한이 아직 준비되지 않았거나 확인할 수 없습니다. 학생의 잘못이 아닙니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.' },
        { title: '인증 실패', codes: ['WB_CLCO_AUTH_REQUIRED'],
          guide: '보호 현황의 계정 연결 확인을 다시 진행하고, 해결되지 않으면 담당자에게 확인하세요. 열쇠를 복사해 붙이지 마세요.' },
        { title: '접근 제한', codes: ['WB_CLCO_ACCESS_BLOCKED'],
          guide: '계정 연결을 다시 확인하고, 담당자에게 학생 앱 이용 권한을 확인하세요.' },
        { title: '사용량·이용 한도', codes: ['WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_LIMIT_REACHED'],
          guide: '반 사용량 또는 이용 한도에 도달했습니다. 담당자에게 확인하세요.' },
        { title: '이용 시간 아님', codes: ['WB_CLCO_SESSION_CLOSED'],
          guide: '현재 AI 이용 시간이 아닙니다. 이용 시간을 확인한 뒤 직접 다시 점검하세요.' },
        { title: '요청 제한·시간 초과·네트워크', codes: ['WB_CLCO_RATE_LIMITED', 'WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT', 'NETWORK_ERROR', 'NETWORK'],
          guide: '요청이 제한됐거나 응답 시간이 초과됐거나 네트워크 문제가 있습니다. 잠시 뒤 직접 다시 점검하세요.' },
        { title: '취소됨', codes: ['WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED'],
          guide: '점검을 취소했습니다. 이전 점검 결과는 현재 결과가 아닙니다.' },
        { title: '쓸 수 있는 모델 없음', codes: ['ON_AI_MODEL_LIST_EMPTY', 'MODEL_NOT_CONFIGURED'],
          guide: '현재 앱 권한으로 쓸 수 있는 AI 모델이 없습니다. 담당자에게 모델 허용 설정 확인을 요청하세요.' },
      ];

      add('h3', 'AI 연결 점검');
      if (typeof mode === 'string' && mode.length > 0) add('p', `자료 모드: ${mode}`);

      if (status === 'idle' || status === undefined) {
        add('p', 'AI 연결 점검 전');
        add('p', '아직 점검 결과가 없습니다. 계정 연결과 AI 연결을 마친 뒤 「현재 API 연결 점검」을 직접 누르세요.');
        return root;
      }
      if (status === 'loading') {
        add('p', 'AI 연결 점검 중');
        add('p', '취소하면 늦게 도착한 응답은 현재 결과로 표시하지 않습니다.');
        return root;
      }
      if (status === 'ok' && data && typeof data === 'object') {
        const AUDIENCE = {
          test: '시험 연결 점검(test): 앱 서버를 거친 시험 연결과 모델 응답만 확인했습니다. 학생 앱 권한은 아직 준비 중입니다.',
          verified: '앱 권한 확인 후 점검(verified): 점검 시각 기준으로 앱 권한 확인과 모델 응답을 확인했습니다.',
        };
        add('p', `연결 점검 결과: ${AUDIENCE[data.audienceAuthorization] || `확인 불가(${safe(String(data.audienceAuthorization ?? ''))})`}`);
        add('p', `앱 서버 경유 연결 확인(transportChecked): ${data.transportChecked === true ? '확인됨' : '확인 불가'}`);
        add('p', `사용 가능 모델 수(modelCount): ${Number.isInteger(data.modelCount) ? data.modelCount : '확인 불가'}`);
        add('p', `점검 시각(checkedAt): ${safe(checkedAt)}`);
        add('p', explanationAccepted === true
          ? '사건 설명 결과는 보안 기록의 AI 설명에서 따로 확인하세요.'
          : '연결만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다. 모델 목록 응답은 사건 설명 결과가 아닙니다. 사건 설명은 보안 기록에서 따로 요청합니다.');
        add('p', MANUAL);
        return root;
      }
      if (status === 'error') {
        const code = safeCode(error?.code);
        const cause = CAUSES.find((c) => c.codes.includes(code));
        add('p', `AI 연결 점검 실패 — ${cause ? cause.title : '확인 불가'} (${code}): ${safe(error?.message)}`);
        add('p', cause ? cause.guide : 'AI 연결 또는 응답을 확인할 수 없습니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.');
        add('p', '연결 점검에 실패했으므로 사건 설명도 실행되지 않았습니다.');
        add('p', MANUAL);
        return root;
      }
      add('p', 'AI 연결 상태 확인 불가: 점검 결과 형식을 확인할 수 없습니다.');
      add('p', MANUAL);
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      // 18단계: AI 설명을 선택한 기록의 근거·규칙·현재 상태와 이어서 보여 줍니다.
      // 호출마다 새 요소를 만들므로 다른 기록 선택·다시 불러오기·실패 때 이전 설명과 성공 속성이 남지 않습니다.
      // 성공 속성(data-student-explanation-event)은 근거가 이 기록과 모두 맞는 성공 설명에만 붙입니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '선택한 사건의 AI 설명');
      const add = (parent, tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        parent.appendChild(node);
        return node;
      };
      const SECRET = /(?:Bearer\s+\S+|sk-[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|token|secret|비밀번호|토큰)\s*[:=]\s*(?:Bearer\s+)?\S+)/giu;
      const safe = (value) => (typeof value === 'string' && value.length > 0 ? value.replace(SECRET, '[가림]') : '확인 불가');
      const safeCode = (value) => (typeof value === 'string' && /^[A-Z0-9_]{1,64}$/u.test(value) ? value : 'AI_REQUEST_UNVERIFIED');
      const FAILURE_REASON = {
        ON_AI_INVALID_INPUT: '설명에 필요한 근거·규칙이 부족하거나 형식을 확인할 수 없습니다(근거 부족).',
        ON_AI_INVALID_OUTPUT: 'AI 설명의 근거 ID·조치·형식이 이 기록과 맞지 않습니다(근거 불일치).',
        ON_AI_PROVISIONING_PENDING: '학생 앱 이용 권한이 아직 준비되지 않았습니다.',
        CANCELLED: '설명 요청을 취소했습니다. 이전 설명은 현재 결과가 아닙니다.',
        REQUEST_CANCELLED: '설명 요청을 취소했습니다. 이전 설명은 현재 결과가 아닙니다.',
        WB_CLCO_CANCELLED: '설명 요청을 취소했습니다. 이전 설명은 현재 결과가 아닙니다.',
      };
      const eventId = typeof event?.id === 'string' && event.id.length > 0 ? event.id : null;

      add(root, 'h3', 'AI 사건 설명');

      // 1) 실패는 event 가 null 이어도 먼저 보여 줍니다(근거 부족 등으로 기록이 넘어오지 않을 수 있음).
      if (explanation?.status === 'error') {
        const code = safeCode(explanation.error?.code);
        if (eventId) add(root, 'p', `사건 ID: ${eventId}`);
        add(root, 'p', `AI 설명 실패 (${code}): ${safe(explanation.error?.message)}`);
        if (FAILURE_REASON[code]) add(root, 'p', `실패 이유: ${FAILURE_REASON[code]}`);
        add(root, 'p', '기록은 그대로입니다. 업무 앱 판정과 보안 기록은 계속 쓸 수 있으며, AI 설명 실패는 과제 실패가 아닙니다.');
        return root;
      }
      if (!eventId) {
        add(root, 'p', '보안 기록에서 기록을 먼저 고르세요. 기록의 「AI 설명 요청」을 누르면 이곳에 설명이 표시됩니다.');
        return root;
      }
      if (explanation?.status === 'loading') {
        add(root, 'p', `사건 ID: ${eventId}`);
        add(root, 'p', 'AI 설명 요청 중');
        return root;
      }
      if (explanation?.status !== 'ok') {
        add(root, 'p', `사건 ID: ${eventId}`);
        add(root, 'p', '아직 이 기록의 AI 설명을 요청하지 않았습니다. 「AI 설명 요청」을 직접 누르세요.');
        return root;
      }

      // 2) 성공 응답도 이 기록의 근거와 다시 대조합니다. 맞지 않으면 쓰지 않고 지어내지 않습니다.
      const data = explanation.data && typeof explanation.data === 'object' ? explanation.data : {};
      const evidence = Array.isArray(event.evidence) ? event.evidence : [];
      const evidenceText = new Map(evidence.filter((e) => typeof e?.id === 'string').map((e) => [e.id, e.text]));
      const supported = Array.isArray(event.supportedActions) ? event.supportedActions : [];
      const cited = Array.isArray(data.evidenceIds) ? data.evidenceIds : [];
      const proposals = Array.isArray(data.proposals) ? data.proposals : null;
      const problems = [];
      if (typeof data.summary !== 'string' || data.summary.length === 0) problems.push('AI 요약이 없습니다.');
      if (cited.length === 0) problems.push('설명이 인용한 근거 ID가 없습니다(근거 부족).');
      const missing = cited.filter((id) => !evidenceText.has(id));
      if (missing.length > 0) problems.push(`이 기록에 없는 근거 ID를 인용했습니다: ${missing.map((id) => safe(String(id))).join(', ')} (근거가 맞지 않음).`);
      const uncited = [...evidenceText.keys()].filter((id) => !cited.includes(id));
      if (missing.length === 0 && uncited.length > 0) problems.push(`이 기록의 근거를 모두 인용하지 않았습니다: ${uncited.join(', ')} (근거 부족).`);
      if (new Set(cited).size !== cited.length) problems.push('같은 근거 ID를 중복 인용했습니다.');
      if (data.executed !== false) problems.push('AI가 이미 실행했다고 답한 설명은 쓸 수 없습니다.');
      if (data.requiresHumanConfirmation !== true) problems.push('사람 확인이 필요하다는 표시가 없습니다.');
      if (!proposals) problems.push('제안 목록 형식을 확인할 수 없습니다.');
      else for (const p of proposals) {
        if (!supported.includes(p?.action)) problems.push(`연동 시스템이 지원하지 않는 조치를 제안했습니다: ${safe(String(p?.action ?? ''))}.`);
        const pIds = Array.isArray(p?.evidenceIds) ? p.evidenceIds : [];
        if (pIds.length === 0 || pIds.some((id) => !evidenceText.has(id))) problems.push(`제안의 근거 ID가 이 기록과 맞지 않습니다: ${safe(String(p?.action ?? ''))}.`);
      }
      if (problems.length > 0) {
        add(root, 'p', `사건 ID: ${eventId}`);
        add(root, 'p', `AI 설명을 쓸 수 없습니다 (ON_AI_INVALID_OUTPUT): 근거가 맞지 않거나 부족합니다.`);
        const ul = add(root, 'ul');
        for (const problem of problems) add(ul, 'li', problem);
        add(root, 'p', '설명 내용은 표시하지 않습니다. 기록은 그대로입니다.');
        return root;
      }

      root.setAttribute('data-student-explanation-event', eventId);
      add(root, 'p', `사건 ID: ${eventId}`);
      add(root, 'h4', 'AI 설명(참고용)');
      add(root, 'p', safe(data.summary));
      add(root, 'p', 'AI 설명은 해석입니다. 사실 판단은 아래 근거 글과 연동 시스템이 알려 준 상태로 합니다.');
      if (checkedAt) add(root, 'p', `설명 시각: ${safe(checkedAt)}`);

      // 3) 인용한 근거 ID 와 근거 글, 규칙 ID 와 규칙 글
      add(root, 'h4', '인용한 근거');
      const evidenceList = add(root, 'ul');
      for (const id of cited) add(evidenceList, 'li', `${id} — ${safe(evidenceText.get(id))}`);
      add(root, 'h4', '규칙');
      const rules = Array.isArray(event.rules) ? event.rules : [];
      if (rules.length === 0) add(root, 'p', '이 기록에 규칙이 없습니다.');
      const ruleList = add(root, 'ul');
      for (const rule of rules) add(ruleList, 'li', `${safe(rule?.id)} — ${safe(rule?.text)}`);

      // 4) 확인 불가(unknown) 상태: 정상·안전으로 바꾸지 않습니다.
      add(root, 'h4', '확인 불가 상태');
      const STATE_NAMES = [['access', '접속'], ['session', '세션'], ['device', '기기']];
      const unknowns = STATE_NAMES.filter(([key]) => event.state?.[key] === 'unknown');
      if (unknowns.length === 0) add(root, 'p', '없음');
      const unknownList = add(root, 'ul');
      for (const [, label] of unknowns) add(unknownList, 'li', `${label}: 확인 불가(unknown)`);

      // 5)·6) 제안: 실행 버튼은 만들지 않습니다.
      add(root, 'h4', 'AI 제안');
      if (proposals.length === 0) {
        add(root, 'p', supported.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
          : 'AI가 제안한 조치가 없습니다.');
      } else {
        const proposalList = add(root, 'ul');
        for (const p of proposals) {
          add(proposalList, 'li', `조치: ${safe(p.action)} · 이유: ${safe(p.reason)} · 근거: ${p.evidenceIds.join(', ')} · 사람 확인이 필요하며 실행되지 않았습니다.`);
        }
      }
      add(root, 'p', 'AI 설명과 제안만으로는 보안 조치가 실행되지 않습니다.');
      return root;
    },
    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = {}) {
      // 19단계: AI 제안·사람 확인·서버 접수(ACK)·실제 효과 관측을 구분해 보여 줍니다.
      // 학생 코드는 버튼·요청·확인 티켓을 만들지 않습니다. 조치는 제공 화면 버튼으로만 진행합니다.
      // 호출마다 새 요소를 만들므로 새 입력이 오면 이전 대상·요청·결과가 남지 않습니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '보안 조치 요청 상태');
      const add = (parent, tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        parent.appendChild(node);
        return node;
      };
      const SECRET = /(?:Bearer\s+\S+|sk-[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|token|secret|비밀번호|토큰)\s*[:=]\s*(?:Bearer\s+)?\S+)/giu;
      const safe = (value) => (typeof value === 'string' && value.length > 0 ? value.replace(SECRET, '[가림]') : '확인 불가');
      const safeCode = (value) => (typeof value === 'string' && /^[A-Z0-9_]{1,64}$/u.test(value) ? value : 'ACTION_RESULT_UNVERIFIED');
      const RECHECK = '결과는 제공 화면의 「원천 결과만 재조회」를 직접 눌러 확인하세요. 같은 요청 ID로 결과만 다시 조회하며, 조치를 다시 실행하지 않습니다.';
      const effectConfirmed = status === 'succeeded' && observation?.effectApplied === true;

      // status 마다 뜻이 다른 문장(원래 값 포함). succeeded 라도 효과 관측이 없으면 결과 불명으로 봅니다.
      const STATUS_TEXT = {
        idle: '아직 미실행(idle): 조치 제안을 준비하거나 실행하지 않았습니다.',
        loading: '조치 준비 또는 결과 조회 중(loading): 아직 결과가 없으며 완료가 아닙니다.',
        prepared: '준비됨·미실행(prepared): 서버가 조치를 준비만 했고 아직 실행하지 않았습니다.',
        executing: '서버에 전달 중(executing): 사람 확인 후 서버로 보내는 중이며, 결과는 아직 확인되지 않았습니다. 완료 아님.',
        pending: '서버 접수·처리 중(pending): 서버가 요청을 받았다는 응답(ACK)일 뿐 실제 효과가 아닙니다. 완료 아님.',
        succeeded: '효과 확인(succeeded): 연동 시스템이 실제 효과를 관측했습니다.',
        denied: '거절(denied): 연동 시스템이 이 조치를 거절했습니다.',
        failed: '실패(failed): 연동 시스템이 조치를 처리하지 못했습니다.',
        unknown: '결과 불명(unknown): 성공으로도 효과 없음으로도 판단하지 마세요.',
        expired: '확인 기한 지남(expired): 이번 준비로는 실행할 수 없습니다. 조치를 다시 준비하세요.',
        error: '요청 처리 안 됨(error): 조치 요청이 처리되지 않았습니다.',
      };
      const shownStatus = status === 'succeeded' && !effectConfirmed ? 'unknown' : status;

      add(root, 'h3', '보안 조치 요청 상태');
      add(root, 'p', `상태: ${STATUS_TEXT[shownStatus] || `확인 불가(${safe(String(status ?? ''))}): 조치 상태를 확인할 수 없습니다. 성공으로 판단하지 마세요.`}`);
      if (status === 'succeeded' && !effectConfirmed) {
        add(root, 'p', '서버가 succeeded 로 답했지만 연동 시스템의 효과 관측(effectApplied 가 true)이 없어 효과 확인으로 보지 않습니다.');
      }

      if (shownStatus === 'idle') {
        const supported = Array.isArray(event?.supportedActions) ? event.supportedActions : [];
        add(root, 'p', supported.length === 0
          ? '지금 기록에는 연동 시스템이 지원하는 조치가 없어(supportedActions 빈 배열) 조치 준비 버튼이 나오지 않는 것이 정상입니다.'
          : '조치는 AI 설명의 제안에서 제공 화면의 「조치 준비」로만 시작합니다.');
        add(root, 'p', 'AI 제안만으로는 아무 조치도 실행되지 않습니다.');
        if (typeof message === 'string' && message.length > 0) add(root, 'p', safe(message));
        return root;
      }

      // 현재 의도(사건·근거·조치·대상·요청)를 받은 범위에서만 표시합니다. 값을 만들지 않습니다.
      const eventId = typeof event?.id === 'string' && event.id.length > 0 ? event.id : null;
      const requestId = typeof receipt?.requestId === 'string' && receipt.requestId.length > 0 ? receipt.requestId : null;
      if (eventId) root.setAttribute('data-student-action-event', eventId);
      if (requestId) root.setAttribute('data-student-action-request', requestId);

      add(root, 'h4', '현재 조치 대상');
      const intent = add(root, 'ul');
      if (eventId) add(intent, 'li', `사건 ID: ${eventId}`);
      const evidenceIds = Array.isArray(event?.evidence) ? event.evidence.map((e) => e?.id).filter((id) => typeof id === 'string') : [];
      if (evidenceIds.length > 0) add(intent, 'li', `근거 ID: ${evidenceIds.join(', ')}`);
      if (typeof actionId === 'string' && actionId.length > 0) add(intent, 'li', `조치(actionId): ${safe(actionId)}`);
      if (target && typeof target === 'object') {
        add(intent, 'li', `실제 대상(target.id): ${safe(target.id)} · 대상 세대(target.generation): ${Number.isSafeInteger(target.generation) ? target.generation : '확인 불가'}`);
      }
      if (receipt && typeof receipt === 'object') {
        if (requestId) add(intent, 'li', `요청 ID(requestId): ${requestId}`);
        if (typeof receipt.receiptId === 'string') add(intent, 'li', `접수 번호(receiptId): ${receipt.receiptId}`);
        if (Number.isSafeInteger(receipt.version)) add(intent, 'li', `버전(version): ${receipt.version}`);
        if (receipt.replayed === true) add(intent, 'li', '같은 요청의 이전 결과를 돌려받았습니다(replayed: true). 조치가 두 번 실행된 것이 아닙니다.');
        if (receipt.superseded === true) add(intent, 'li', '이전 조회는 최신 결과를 대신하지 않습니다(superseded).');
      }

      if (shownStatus === 'prepared') {
        add(root, 'p', `사람 확인 기한: ${safe(confirmationExpiresAt)}`);
        add(root, 'p', '실제 대상과 조치를 읽고, 실행하려면 제공 화면의 「대상과 조치를 확인했으며 집행합니다」를 사람이 직접 누르세요. 누르기 전에는 아무것도 실행되지 않습니다.');
      } else if (shownStatus === 'executing' || shownStatus === 'pending' || shownStatus === 'loading') {
        add(root, 'p', '아직 실제 효과가 확인되지 않았습니다. 같은 조치를 다시 실행하지 마세요.');
        if (shownStatus === 'pending') add(root, 'p', RECHECK);
      } else if (effectConfirmed) {
        add(root, 'p', `관측 시각(observedAt): ${safe(observation.observedAt)}`);
        add(root, 'p', 'effectApplied: true');
        add(root, 'p', `접수 번호(receiptId): ${safe(receipt?.receiptId)}`);
      } else if (shownStatus === 'denied' || shownStatus === 'failed') {
        add(root, 'p', `연동 시스템 메시지: ${safe(message || error?.message)}`);
      } else if (shownStatus === 'unknown') {
        add(root, 'p', '이미 서버에 전달된 조치의 효과가 없다고 판단하지 마세요. 조치를 다시 실행하지 말고 결과만 재조회하세요.');
        add(root, 'p', RECHECK);
        if (error) add(root, 'p', `원인: ${safeCode(error.code)} — ${safe(error.message)}`);
      } else if (shownStatus === 'expired') {
        add(root, 'p', '확인 기한이 지나 이번 준비는 쓸 수 없습니다. 제공 화면에서 조치를 다시 준비하고 대상을 다시 확인하세요.');
      } else if (shownStatus === 'error') {
        add(root, 'p', `원인: ${safeCode(error?.code)} — ${safe(error?.message)}`);
      }
      add(root, 'p', '「조치 화면 취소」는 이 화면을 닫을 뿐, 이미 서버에 전달된 조치의 효과를 되돌리지 않습니다.');
      return root;
    },
  };
}
