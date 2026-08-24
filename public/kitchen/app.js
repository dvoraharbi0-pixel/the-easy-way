(function () {
  const STATION = window.STATION || 'kitchen';
  let items = [];
  let socket = null;
  const board = document.getElementById('board');

  function init(staffToken) {
    socket = io();
    socket.on('connect', () => socket.emit('join', { role: 'kitchen', token: staffToken }));
    socket.on('staff:unauthorized', () => {
      localStorage.removeItem('easyway_staff_token');
      location.reload();
    });
    socket.on('kitchen:state', (data) => {
      items = data.items.filter((i) => COURSE_STATION[i.course] === STATION);
      render();
    });
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
        html += `
          <div class="item-row">
            <div>
              <div><b>${it.name}</b> × ${it.qty}</div>
              <div style="font-size:12px;color:var(--muted)">${COURSE_LABELS[it.course]} · ${it.dinerName || ''}</div>
              ${it.notes ? `<div style="font-size:12px;color:var(--danger);font-weight:700">📝 ${it.notes}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="badge ${it.status}">${STATUS_LABELS[it.status]}</span>
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

  requireStaffAuth(init);
})();
