(function () {
  const STATION = window.STATION || 'kitchen';
  let items = [];
  let menuItems = [];
  let menuPanelOpen = false;
  let socket = null;
  let soundOn = false;
  let audioCtx = null;
  let knownSentIds = new Set();
  const board = document.getElementById('board');
  const menuPanel = document.getElementById('menuPanel');
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const soundToggle = document.getElementById('soundToggle');

  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      soundOn = !soundOn;
      soundToggle.textContent = soundOn ? '🔔 צליל פעיל' : '🔕 הפעלת צליל';
      if (soundOn) playChime();
    });
  }

  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', () => {
      menuPanelOpen = !menuPanelOpen;
      renderMenuPanel();
    });
  }

  function playChime() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [660, 990].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.14;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
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
      items = data.items.filter((i) => COURSE_STATION[i.course] === STATION);
      const sentIds = items.filter((i) => i.status === 'sent').map((i) => i.id);
      const newlySent = sentIds.filter((id) => !knownSentIds.has(id));
      if (newlySent.length && soundOn) playChime();
      knownSentIds = new Set(sentIds);
      render();
    });
    socket.on('menu:state', (data) => {
      menuItems = data.items.filter((i) => COURSE_STATION[i.course] === STATION);
      renderMenuPanel();
    });
  }

  // How long an item may sit in each status before it's flagged as overdue.
  const OVERDUE_MINUTES = { sent: 4, preparing: 12 };

  function minutesAgo(ts) {
    return Math.max(0, Math.round((Date.now() - ts) / 60000));
  }

  function renderMenuPanel() {
    if (!menuPanel) return;
    if (menuToggleBtn) {
      menuToggleBtn.textContent = menuPanelOpen ? '📋 סגירת ניהול תפריט' : '📋 ניהול תפריט (זמינות)';
    }
    if (!menuPanelOpen) {
      menuPanel.innerHTML = '';
      return;
    }
    if (!menuItems.length) {
      menuPanel.innerHTML = '<div class="card"><div class="empty">אין עדיין מנות בעמדה הזו</div></div>';
      return;
    }
    let html = '<div class="card">';
    for (const m of menuItems) {
      const unavailable = m.available === false;
      html += `
        <div class="avail-toggle">
          <span class="name${unavailable ? ' unavailable' : ''}">${COURSE_ICON[m.course] || ''} ${m.name}</span>
          ${
            unavailable
              ? `<button class="accent" data-avail-on="${m.id}">✅ סמן כזמין</button>`
              : `<button class="danger" data-avail-off="${m.id}">⛔ סמן כאזל</button>`
          }
        </div>`;
    }
    html += '</div>';
    menuPanel.innerHTML = html;

    menuPanel.querySelectorAll('[data-avail-off]').forEach((b) =>
      b.addEventListener('click', () => socket.emit('staff:setAvailability', { itemId: b.dataset.availOff, available: false }))
    );
    menuPanel.querySelectorAll('[data-avail-on]').forEach((b) =>
      b.addEventListener('click', () => socket.emit('staff:setAvailability', { itemId: b.dataset.availOn, available: true }))
    );
  }

  function render() {
    if (!items.length) {
      board.innerHTML = '<div class="empty">אין הזמנות פתוחות כרגע 🎉</div>';
      return;
    }
    const byTable = {};
    for (const it of items) {
      const key = it.tableNumber != null ? it.tableNumber : '?';
      (byTable[key] = byTable[key] || []).push(it);
    }
    const tableNumbers = Object.keys(byTable).sort((a, b) => a - b);
    let html = '';
    for (const num of tableNumbers) {
      const list = byTable[num];
      const worstStatus = list.some((i) => i.status === 'sent')
        ? 'sent'
        : list.every((i) => i.status === 'ready')
        ? 'ready'
        : 'preparing';
      html += `<div class="card kitchen-card ${worstStatus}">
        <h3>שולחן ${num}</h3>`;
      for (const it of list) {
        const statusTs = it.status === 'sent' ? it.sentAt : it.status === 'preparing' ? it.preparingAt : it.readyAt;
        const threshold = OVERDUE_MINUTES[it.status];
        const mins = statusTs ? minutesAgo(statusTs) : null;
        const overdue = threshold != null && mins != null && mins >= threshold;
        html += `
          <div class="item-row">
            <div>
              <div><b>${it.name}</b> × ${it.qty}</div>
              <div style="font-size:12px;color:var(--muted)">${COURSE_LABELS[it.course]} · ${it.dinerName || ''}</div>
              ${it.notes ? `<div style="font-size:12px;color:var(--danger);font-weight:700">📝 ${it.notes}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="badge ${it.status}">${STATUS_LABELS[it.status]}</span>
              ${mins != null ? `<span style="font-size:12px;${overdue ? 'color:var(--danger);font-weight:700' : 'color:var(--muted)'}">⏱️ ${mins} דק'</span>` : ''}
              ${it.status === 'sent' ? `<button class="warn" data-start="${it.id}">התחלת הכנה</button>` : ''}
              ${it.status === 'preparing' ? `<button class="accent" data-ready="${it.id}">מוכן</button>` : ''}
            </div>
          </div>`;
      }
      html += `</div>`;
    }
    board.innerHTML = html;

    board.querySelectorAll('[data-start]').forEach((b) =>
      b.addEventListener('click', () => socket.emit('kitchen:start', { itemId: b.dataset.start }))
    );
    board.querySelectorAll('[data-ready]').forEach((b) =>
      b.addEventListener('click', () => socket.emit('kitchen:ready', { itemId: b.dataset.ready }))
    );
  }

  setInterval(render, 15000);
  requireStaffAuth(init);
})();
