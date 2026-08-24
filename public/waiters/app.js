(function () {
  const STATION = window.STATION || 'kitchen';
  let items = [];
  let socket = null;
  let soundOn = false;
  let audioCtx = null;
  let knownReadyIds = new Set();

  const board = document.getElementById('board');
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

  function init() {
    socket = io();
    socket.on('connect', () => socket.emit('join', { role: 'kitchen' }));
    socket.on('kitchen:state', (data) => {
      const ready = data.items.filter((i) => i.status === 'ready' && COURSE_STATION[i.course] === STATION);
      const newlyReady = ready.filter((i) => !knownReadyIds.has(i.id));
      if (newlyReady.length && soundOn) playChime();
      knownReadyIds = new Set(ready.map((i) => i.id));
      items = ready.sort((a, b) => a.readyAt - b.readyAt);
      render();
    });
  }

  function minutesAgo(ts) {
    return Math.max(0, Math.round((Date.now() - ts) / 60000));
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

  setInterval(render, 15000);
  init();
})();
