(function () {
  const tableToken = location.pathname.split('/master/')[1];
  let table = null;
  let session = null;
  let items = [];
  let bill = { diners: [] };
  let selected = new Set();
  let notesDraft = {};
  let notesOpen = new Set();
  let socket = null;
  let cookingMsgIndex = 0;
  let staffToken = null;

  setInterval(() => {
    cookingMsgIndex = (cookingMsgIndex + 1) % COOKING_MESSAGES.length;
    const el = document.getElementById('cookingMsg');
    if (el) el.textContent = COOKING_MESSAGES[cookingMsgIndex];
  }, 2400);

  const els = {
    tableTitle: document.getElementById('tableTitle'),
    notice: document.getElementById('notice'),
    pendingSection: document.getElementById('pendingSection'),
    kitchenSection: document.getElementById('kitchenSection'),
    totalSection: document.getElementById('totalSection'),
    closeSessionBtn: document.getElementById('closeSessionBtn'),
  };

  els.closeSessionBtn.onclick = () => {
    if (confirm('לסגור את השולחן? הפעולה תסיים את ההזמנה הנוכחית.')) {
      socket.emit('master:closeSession', { sessionId: session.id });
    }
  };

  async function init() {
    const res = await fetch(`/api/table/${tableToken}`);
    if (!res.ok) {
      els.tableTitle.textContent = 'שולחן לא נמצא';
      return;
    }
    const data = await res.json();
    table = data.table;
    session = data.session;
    els.tableTitle.textContent = `${table.name} · טאבלט מאסטר`;

    socket = io();
    socket.on('connect', () => socket.emit('join', { role: 'master', sessionId: session.id, token: staffToken }));
    socket.on('staff:unauthorized', () => {
      localStorage.removeItem('easyway_staff_token');
      location.reload();
    });
    socket.on('session:state', (data) => {
      items = data.items;
      bill = data.bill || { diners: [] };
      render();
    });
    socket.on('session:closed', () => {
      els.notice.innerHTML = `<div class="notice">השולחן נסגר.</div>`;
      els.pendingSection.innerHTML = '';
      els.kitchenSection.innerHTML = '';
    });
  }

  function render() {
    renderPending();
    renderKitchenStatus();
    renderTotal();
  }

  function renderPending() {
    const pending = items.filter((i) => i.status === 'in_cart');
    let html = pending.length
      ? `<div class="section-title">🛎️ ממתין לאישור — לחצו "שלח" כדי להעביר למטבח</div>`
      : `<div class="section-title">🛎️ ממתין לאישור</div><div class="empty">אין מנות חדשות בעגלה כרגע.</div>`;
    for (const course of COURSE_ORDER) {
      const list = pending.filter((i) => i.course === course);
      if (!list.length) continue;
      html += `<div class="card course-group">
        <div class="course-head">
          <h3>${COURSE_ICON[course] || ''} ${COURSE_LABELS[course]}</h3>
          <button class="warn" data-fire-course="${course}">🔥 שלח את כל ה${COURSE_LABELS[course]}</button>
        </div>`;
      for (const it of list) {
        const noteOpen = notesOpen.has(it.id);
        const noteVal = notesDraft[it.id] !== undefined ? notesDraft[it.id] : it.notes || '';
        html += `
          <div class="order-line" style="flex-wrap:wrap">
            <label class="checkbox-row">
              <input type="checkbox" data-select="${it.id}" ${selected.has(it.id) ? 'checked' : ''} />
              <div>
                <div><b>${it.name}</b> × ${it.qty}</div>
                <div class="meta">👤 ${it.dinerName || ''} · ${money(it.price * it.qty)}</div>
                ${it.notes ? `<div class="meta" style="font-style:italic">📝 ${it.notes}</div>` : ''}
              </div>
            </label>
            <button class="primary" data-send-one="${it.id}">שלח</button>
            <button class="ghost" data-note-toggle="${it.id}" style="font-size:12px;padding:5px 9px">📝 ${it.notes ? 'עריכת הערה' : 'הוספת הערה'}</button>
            <button class="ghost" data-remove="${it.id}">הסרה</button>
            ${
              noteOpen
                ? `<input type="text" data-note-input="${it.id}" value="${noteVal}" placeholder="לדוגמה: בלי בצל, רגיש/ה לבוטנים" style="width:100%;margin-top:8px" />
                   <button class="primary" data-note-save="${it.id}" style="width:100%">שמירת הערה</button>`
                : ''
            }
          </div>`;
      }
      html += `</div>`;
    }
    if (selected.size) {
      html += `<button class="primary" id="sendSelectedBtn" style="width:100%;margin-bottom:12px">🔥 שליחת ${selected.size} מנות נבחרות למטבח</button>`;
    }

    const removed = items.filter((i) => i.status === 'removed');
    if (removed.length) {
      html += `<div class="section-title">🗑️ הוסרו מהעגלה</div><div class="card">`;
      for (const it of removed) {
        html += `
          <div class="order-line">
            <div>
              <div><b>${it.name}</b> × ${it.qty}</div>
              <div class="meta">👤 ${it.dinerName || ''} · ${money(it.price * it.qty)}</div>
            </div>
            <div class="actions">
              <span class="badge removed">🗑️ הוסרה</span>
              <button class="ghost" data-restore="${it.id}">↩️ החזרה לעגלה</button>
            </div>
          </div>`;
      }
      html += `</div>`;
    }

    els.pendingSection.innerHTML = html;

    els.pendingSection.querySelectorAll('[data-select]').forEach((cb) =>
      cb.addEventListener('change', () => {
        const id = cb.dataset.select;
        if (cb.checked) selected.add(id);
        else selected.delete(id);
        render();
      })
    );
    els.pendingSection.querySelectorAll('[data-send-one]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('master:send', { sessionId: session.id, itemIds: [b.dataset.sendOne] });
      })
    );
    els.pendingSection.querySelectorAll('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('cart:remove', { sessionId: session.id, itemId: b.dataset.remove });
      })
    );
    els.pendingSection.querySelectorAll('[data-restore]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('cart:restore', { sessionId: session.id, itemId: b.dataset.restore });
      })
    );
    els.pendingSection.querySelectorAll('[data-fire-course]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('master:fireCourse', { sessionId: session.id, course: b.dataset.fireCourse });
      })
    );
    els.pendingSection.querySelectorAll('[data-note-toggle]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.noteToggle;
        if (notesOpen.has(id)) {
          notesOpen.delete(id);
        } else {
          notesOpen.add(id);
          const it = items.find((x) => x.id === id);
          notesDraft[id] = it ? it.notes || '' : '';
        }
        render();
      })
    );
    els.pendingSection.querySelectorAll('[data-note-input]').forEach((inp) =>
      inp.addEventListener('input', () => {
        notesDraft[inp.dataset.noteInput] = inp.value;
      })
    );
    els.pendingSection.querySelectorAll('[data-note-save]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.noteSave;
        socket.emit('cart:updateNotes', { sessionId: session.id, itemId: id, notes: (notesDraft[id] || '').trim() });
        notesOpen.delete(id);
        render();
      })
    );
    const sendSelectedBtn = document.getElementById('sendSelectedBtn');
    if (sendSelectedBtn) {
      sendSelectedBtn.onclick = () => {
        socket.emit('master:send', { sessionId: session.id, itemIds: Array.from(selected) });
        selected.clear();
      };
    }
  }

  function renderKitchenStatus() {
    const active = items.filter((i) => ['sent', 'preparing', 'ready', 'served', 'cancelled'].includes(i.status));
    if (!active.length) {
      els.kitchenSection.innerHTML = '';
      return;
    }
    let html = `<div class="section-title">👨‍🍳 סטטוס אצל המטבח</div>`;

    // "ready" is only visible on the waiters' board (and comes with the sound
    // alert there) — the master tablet shows sent/preparing/ready all as one
    // live "בהכנה" card, until a waiter actually picks it up (which is when
    // it flips to "served").
    const cooking = active.filter((i) => ['sent', 'preparing', 'ready'].includes(i.status));
    if (cooking.length) {
      html += `<div class="cooking-card">
        <div class="cooking-banner">
          <span id="cookingMsg">${COOKING_MESSAGES[cookingMsgIndex]}</span>
          <span class="cooking-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>`;
      for (const it of cooking) {
        html += `
          <div class="cooking-item-row">
            <span><b>${it.name}</b> × ${it.qty} · 👤 ${it.dinerName || ''}${it.notes ? ` · <i>📝 ${it.notes}</i>` : ''}</span>
            ${it.status === 'sent' ? `<button class="danger" data-cancel="${it.id}">ביטול</button>` : ''}
          </div>`;
      }
      html += `</div>`;
    }

    for (const status of ['served', 'cancelled']) {
      const list = active.filter((i) => i.status === status);
      if (!list.length) continue;
      const label = status === 'served' ? '🍽️ הוגש — בתאבון!' : STATUS_LABELS[status];
      html += `<div class="card">`;
      for (const it of list) {
        html += `
          <div class="order-line">
            <div>
              <div><b>${it.name}</b> × ${it.qty}</div>
              <div class="meta">👤 ${it.dinerName || ''} · ${COURSE_LABELS[it.course]}</div>
            </div>
            <span class="badge ${status}">${label}</span>
          </div>`;
      }
      html += `</div>`;
    }
    els.kitchenSection.innerHTML = html;

    els.kitchenSection.querySelectorAll('[data-cancel]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('master:cancel', { sessionId: session.id, itemId: b.dataset.cancel });
      })
    );
  }

  function renderTotal() {
    const diners = (bill.diners || []).filter((d) => d.subtotal > 0);
    let html = '';
    if (diners.length) {
      html += `<div class="section-title">💳 פירוט חשבון לפי סועד</div><div class="card">`;
      for (const d of diners) {
        const tipLabel = d.tipMode === 'percent' ? ` (טיפ ${d.tipValue}%)` : d.tipMode === 'amount' ? ` (טיפ מותאם)` : '';
        html += `
          <div class="order-line">
            <div>
              <div><b>👤 ${d.name}</b></div>
              <div class="meta">מנות ${money(d.subtotal)} + טיפ ${money(d.tip)}${tipLabel}</div>
            </div>
            <div style="font-weight:700">${money(d.total)}</div>
          </div>`;
      }
      html += `</div>`;
    }
    html += `<div class="card" style="display:flex;justify-content:space-between;font-weight:700">
      <span>סה"כ חשבון השולחן (כולל טיפים)</span><span>${money(bill.total || 0)}</span>
    </div>`;
    els.totalSection.innerHTML = html;
  }

  requireStaffAuth((token) => {
    staffToken = token;
    init();
  });
})();
