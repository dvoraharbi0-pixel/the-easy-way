(function () {
  const STATION = window.STATION || 'kitchen';
  let items = [];
  let calls = [];
  let tables = [];
  let socket = null;
  let soundOn = false;
  let audioCtx = null;
  let knownReadyIds = new Set();
  let knownCallIds = new Set();

  const board = document.getElementById('board');
  const callsBoard = document.getElementById('calls');
  const tablesBoard = document.getElementById('tables');
  const soundToggle = document.getElementById('soundToggle');

  soundToggle.addEventListener('click', () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    soundOn = !soundOn;
    soundToggle.textContent = soundOn ? '🔔 צליל פעיל' : '🔕 הפעלת צליל';
    if (soundOn) playChime(); // quick confirmation beep
  });

  function playChime() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  // A different, more urgent-sounding alert (single repeated tone) for table
  // calls, so waiters can tell "dish ready" and "table needs something" apart by ear.
  function playCallChime() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [0, 0.22, 0.44].forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 660;
      const start = now + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  function init(staffToken) {
    socket = io();
    socket.on('connect', () => socket.emit('join', { role: 'kitchen', token: staffToken }));
    socket.on('staff:unauthorized', () => {
      localStorage.removeItem('easyway_staff_token');
      location.reload();
    });
    socket.on('kitchen:state', (data) => {
      const ready = data.items.filter((i) => i.status === 'ready' && COURSE_STATION[i.course] === STATION);
      const newlyReady = ready.filter((i) => !knownReadyIds.has(i.id));
      if (newlyReady.length && soundOn) playChime();
      knownReadyIds = new Set(ready.map((i) => i.id));
      items = ready.sort((a, b) => a.readyAt - b.readyAt);
      render();
    });
    socket.on('calls:state', (data) => {
      const newCalls = data.calls.filter((c) => !knownCallIds.has(c.id));
      if (newCalls.length && soundOn) playCallChime();
      knownCallIds = new Set(data.calls.map((c) => c.id));
      calls = data.calls;
      renderCalls();
    });
    socket.on('tables:state', (data) => {
      tables = data.tables;
      renderTables();
    });
  }

  function minutesAgo(ts) {
    return Math.max(0, Math.round((Date.now() - ts) / 60000));
  }

  function renderCalls() {
    if (!calls.length) {
      callsBoard.innerHTML = '';
      return;
    }
    let html = `<div class="section-title">🔔 קריאות מהשולחנות</div>`;
    for (const c of calls) {
      const mins = minutesAgo(c.createdAt);
      html += `
        <div class="card" style="border-top:4px solid var(--danger);display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="font-size:28px;font-weight:800;color:var(--danger);min-width:70px;text-align:center">שולחן<br/>${c.tableNumber}</div>
            <div>
              <div style="font-size:16px"><b>${c.reason}</b></div>
              <div class="meta">⏱️ לפני ${mins} דק'</div>
            </div>
          </div>
          <button class="accent" data-resolve-call="${c.id}">✅ טופל</button>
        </div>`;
    }
    callsBoard.innerHTML = html;

    callsBoard.querySelectorAll('[data-resolve-call]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('waiter:resolveCall', { callId: b.dataset.resolveCall });
      })
    );
  }

  function renderTables() {
    if (!tablesBoard) return;
    if (!tables.length) {
      tablesBoard.innerHTML = '';
      return;
    }
    let html = `<div class="section-title">💳 סכומי שולחנות</div><div class="card">`;
    for (const t of tables) {
      html += `
        <div class="order-line">
          <div><b>שולחן ${t.tableNumber}</b> <span class="meta">· ${t.dinerCount} סועדים</span></div>
          <div style="font-weight:800;font-size:16px">${money(t.total)}</div>
        </div>`;
    }
    html += `</div>`;
    tablesBoard.innerHTML = html;
  }

  function render() {
    if (!items.length) {
      board.innerHTML = '<div class="empty">אין כרגע מנות שממתינות להגשה 🎉</div>';
      return;
    }
    let html = '';
    for (const it of items) {
      const mins = minutesAgo(it.readyAt);
      const overdue = mins >= 3;
      html += `
        <div class="card kitchen-card ready" style="${overdue ? 'border-top-color:var(--danger)' : ''};display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="font-size:28px;font-weight:800;color:var(--brand);min-width:70px;text-align:center">שולחן<br/>${it.tableNumber}</div>
            <div>
              <div style="font-size:16px"><b>${it.name}</b> × ${it.qty}</div>
              <div class="meta">👤 ${it.dinerName || ''} · ${COURSE_LABELS[it.course]}</div>
              ${it.notes ? `<div class="meta" style="font-style:italic">📝 ${it.notes}</div>` : ''}
              <div class="meta" style="${overdue ? 'color:var(--danger);font-weight:700' : ''}">⏱️ ממתינה ${mins} דק'</div>
            </div>
          </div>
          <button class="accent" data-served="${it.id}" data-session="${it.sessionId}">✅ לקחתי, בדרך לשולחן</button>
        </div>`;
    }
    board.innerHTML = html;

    board.querySelectorAll('[data-served]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('master:markServed', { sessionId: b.dataset.session, itemId: b.dataset.served });
      })
    );
  }

  setInterval(() => {
    render();
    renderCalls();
  }, 15000);
  requireStaffAuth(init);
})();
