(function () {
  const token = location.pathname.split('/t/')[1];
  const storageKey = `easyway_diner_${token}`;

  let table = null;
  let session = null;
  let diner = null;
  let menu = [];
  let items = [];
  let bill = { diners: [] };
  let qtyDraft = {};
  let notesDraft = {};
  let notesOpen = new Set();
  let customTipDraft = '';
  let view = 'menu';
  let socket = null;
  let cookingMsgIndex = 0;
  let activeCourse = null;
  let detailItemId = null;

  setInterval(() => {
    cookingMsgIndex = (cookingMsgIndex + 1) % COOKING_MESSAGES.length;
    const el = document.getElementById('cookingMsg');
    if (el) el.textContent = COOKING_MESSAGES[cookingMsgIndex];
  }, 2400);

  const els = {
    tableTitle: document.getElementById('tableTitle'),
    dinerTag: document.getElementById('dinerTag'),
    notice: document.getElementById('notice'),
    menuView: document.getElementById('menuView'),
    cartView: document.getElementById('cartView'),
    navMenu: document.getElementById('navMenu'),
    navCart: document.getElementById('navCart'),
    cartCount: document.getElementById('cartCount'),
    fabCart: document.getElementById('fabCart'),
    fabCartBtn: document.getElementById('fabCartBtn'),
    nameModal: document.getElementById('nameModal'),
    nameInput: document.getElementById('nameInput'),
    nameSubmit: document.getElementById('nameSubmit'),
    callWaiterBtn: document.getElementById('callWaiterBtn'),
    callModal: document.getElementById('callModal'),
    callCustomInput: document.getElementById('callCustomInput'),
    callCustomBtn: document.getElementById('callCustomBtn'),
    callModalClose: document.getElementById('callModalClose'),
  };

  els.navMenu.onclick = () => setView('menu');
  els.navCart.onclick = () => setView('cart');
  els.fabCartBtn.onclick = () => setView('cart');

  els.callWaiterBtn.onclick = () => (els.callModal.style.display = 'flex');
  els.callModalClose.onclick = () => (els.callModal.style.display = 'none');
  els.callModal.querySelectorAll('[data-call-reason]').forEach((b) =>
    b.addEventListener('click', () => sendCall(b.dataset.callReason))
  );
  els.callCustomBtn.onclick = () => {
    const text = els.callCustomInput.value.trim();
    if (text) sendCall(text);
  };

  function sendCall(reason) {
    socket.emit('diner:callWaiter', { sessionId: session.id, reason });
    els.callModal.style.display = 'none';
    els.callCustomInput.value = '';
    els.notice.innerHTML = `<div class="notice">🔔 הקריאה נשלחה — מלצר/ית בדרך!</div>`;
    setTimeout(() => {
      if (els.notice.innerHTML.includes('הקריאה נשלחה')) els.notice.innerHTML = '';
    }, 4000);
  }

  function setView(v) {
    view = v;
    els.navMenu.classList.toggle('active', v === 'menu');
    els.navCart.classList.toggle('active', v === 'cart');
    els.menuView.style.display = v === 'menu' ? '' : 'none';
    els.cartView.style.display = v === 'cart' ? '' : 'none';
    render();
  }

  async function init() {
    const res = await fetch(`/api/table/${token}`);
    if (!res.ok) {
      els.tableTitle.textContent = 'שולחן לא נמצא';
      return;
    }
    const data = await res.json();
    table = data.table;
    session = data.session;
    els.tableTitle.textContent = `רוטשילד 22 · ${table.name}`;

    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && saved.sessionId === session.id) {
      diner = { id: saved.dinerId, name: saved.name };
      els.dinerTag.innerHTML = `<span class="diner-tag">👤 ${diner.name}</span>`;
      afterJoin();
    } else {
      els.nameModal.style.display = 'flex';
      els.nameSubmit.onclick = submitName;
      els.nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitName();
      });
    }
  }

  async function submitName() {
    const name = els.nameInput.value.trim() || 'סועד/ת';
    const res = await fetch(`/api/session/${session.id}/diner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    diner = data.diner;
    localStorage.setItem(storageKey, JSON.stringify({ dinerId: diner.id, name: diner.name, sessionId: session.id }));
    els.dinerTag.innerHTML = `<span class="diner-tag">👤 ${diner.name}</span>`;
    els.nameModal.style.display = 'none';
    afterJoin();
  }

  async function afterJoin() {
    const menuRes = await fetch('/api/menu');
    const menuData = await menuRes.json();
    menu = menuData.items;
    els.callWaiterBtn.style.display = '';

    socket = io();
    socket.on('connect', () => socket.emit('join', { role: 'diner', sessionId: session.id }));
    socket.on('session:state', (data) => {
      items = data.items;
      bill = data.bill || { diners: [] };
      render();
    });
    socket.on('session:closed', () => {
      els.notice.innerHTML = `<div class="notice">🙏 השולחן נסגר, תודה שסעדתם איתנו!</div>`;
    });
    // Kitchen/bar 86'd (or brought back) a dish mid-service — refresh the menu.
    socket.on('menu:updated', async () => {
      const r = await fetch('/api/menu');
      menu = (await r.json()).items;
      render();
    });

    render();
  }

  function render() {
    if (view === 'menu') renderMenu();
    else renderCart();
    renderFab();
  }

  function dishPhotoHtml(m) {
    const icon = COURSE_ICON[m.course] || '🍽️';
    if (!m.image) {
      return `<div class="dish-photo-wrap"><div class="dish-photo placeholder">${icon}</div></div>`;
    }
    return `<div class="dish-photo-wrap">
      <div class="dish-photo placeholder">${icon}</div>
      <img class="dish-photo" src="${m.image}" alt="${m.name}" loading="lazy" onerror="this.remove()" />
    </div>`;
  }

  function renderDetailModal() {
    const existing = document.getElementById('detailModal');
    if (existing) existing.remove();
    if (!detailItemId) return;
    const m = menu.find((x) => x.id === detailItemId);
    if (!m) return;

    const qty = qtyDraft[m.id] || 1;
    const allergensHtml =
      m.allergens && m.allergens.length
        ? `<div class="allergen-tags">${m.allergens.map((a) => `<span class="allergen-tag">${a}</span>`).join('')}</div>`
        : `<div class="meta">ללא אלרגנים ידועים</div>`;

    const div = document.createElement('div');
    div.id = 'detailModal';
    div.className = 'modal-backdrop';
    div.innerHTML = `
      <div class="modal-sheet">
        ${dishPhotoHtml(m)}
        <h2 style="margin:12px 0 2px">${m.name}${m.spicy ? '<span class="spicy-badge">🌶️ חריף</span>' : ''}</h2>
        ${m.description ? `<p style="color:var(--muted);font-size:14px;margin:0 0 10px">${m.description}</p>` : ''}
        ${m.ingredients ? `<div class="section-title" style="margin:12px 0 4px">מרכיבים</div><p style="font-size:14px;margin:0">${m.ingredients}</p>` : ''}
        <div class="section-title" style="margin:12px 0 4px">אלרגנים</div>
        ${allergensHtml}
        <div class="dish-price-row" style="margin-top:14px">
          <span class="dish-price-leader"></span><span class="dish-price">${money(m.price)}</span>
        </div>
        <label class="field" style="margin-top:12px">הערה למנה (אופציונלי)</label>
        <input type="text" id="detailNoteInput" value="${notesDraft[m.id] || ''}" placeholder="לדוגמה: בלי בצל, רגיש/ה לבוטנים" />
        <div class="dish-actions" style="padding:0 0 0">
          <div class="qty-control">
            <button id="detailDec">－</button>
            <span id="detailQty">${qty}</span>
            <button id="detailInc">＋</button>
          </div>
          <button class="primary" id="detailAdd" style="flex:1">הוספה לעגלה</button>
        </div>
        <button class="ghost" id="detailModalClose" style="width:100%;margin-top:10px">סגירה</button>
      </div>`;
    document.body.appendChild(div);

    document.getElementById('detailModalClose').onclick = () => {
      detailItemId = null;
      renderDetailModal();
    };
    document.getElementById('detailInc').onclick = () => {
      qtyDraft[m.id] = (qtyDraft[m.id] || 1) + 1;
      renderDetailModal();
    };
    document.getElementById('detailDec').onclick = () => {
      qtyDraft[m.id] = Math.max(1, (qtyDraft[m.id] || 1) - 1);
      renderDetailModal();
    };
    document.getElementById('detailNoteInput').addEventListener('input', (e) => {
      notesDraft[m.id] = e.target.value;
    });
    document.getElementById('detailAdd').onclick = () => {
      const notes = (notesDraft[m.id] || '').trim();
      socket.emit('cart:add', { sessionId: session.id, dinerId: diner.id, menuItemId: m.id, qty: qtyDraft[m.id] || 1, notes });
      notesDraft[m.id] = '';
      notesOpen.delete(m.id);
      detailItemId = null;
      renderDetailModal();
      render();
    };
  }

  function renderMenu() {
    if (!menu.length) {
      els.menuView.innerHTML = '<div class="empty">התפריט נטען...</div>';
      return;
    }
    const availableCourses = COURSE_ORDER.filter((c) => menu.some((m) => m.course === c));
    if (!activeCourse || !availableCourses.includes(activeCourse)) {
      activeCourse = availableCourses[0];
    }

    let navHtml = '<div class="pill-nav" style="position:sticky;top:0;z-index:5;background:var(--bg);padding:4px 0">';
    for (const course of availableCourses) {
      const active = course === activeCourse;
      navHtml += `<button data-nav="${course}" class="${active ? 'active' : ''}">${COURSE_ICON[course] || ''} ${COURSE_LABELS[course]}</button>`;
    }
    navHtml += '</div>';

    const courseItems = menu.filter((m) => m.course === activeCourse);
    const categories = [];
    for (const m of courseItems) {
      if (!categories.includes(m.category)) categories.push(m.category);
    }
    let html = '';
    for (const cat of categories) {
      if (categories.length > 1) {
        html += `<div class="section-title"${cat === categories[0] ? ' style="margin-top:8px"' : ''}>${cat}</div>`;
      }
      html += `<div class="dish-grid">`;
      for (const m of courseItems.filter((x) => x.category === cat)) {
        const qty = qtyDraft[m.id] || 1;
        const noteOpen = notesOpen.has(m.id);
        const noteVal = notesDraft[m.id] || '';
        html += `
          <div class="dish-card">
            <div data-detail="${m.id}" style="cursor:pointer">${dishPhotoHtml(m)}</div>
            <div class="dish-body">
              <div class="dish-name">${m.name}${m.spicy ? '<span class="spicy-badge">🌶️ חריף</span>' : ''}</div>
              ${m.description ? `<div class="dish-desc">${m.description}</div>` : ''}
              <span class="dish-detail-link" data-detail="${m.id}">ℹ️ מרכיבים ואלרגנים</span>
              <div class="dish-price-row"><span class="dish-price-leader"></span><span class="dish-price">${money(m.price)}</span></div>
            </div>
            <div class="dish-actions">
              <div class="qty-control">
                <button data-dec="${m.id}">－</button>
                <span>${qty}</span>
                <button data-inc="${m.id}">＋</button>
              </div>
              <button class="ghost" data-note-toggle="${m.id}" style="font-size:12px;padding:6px 10px">📝 ${noteOpen || noteVal ? 'עריכת הערה' : 'הוספת הערה'}</button>
              <button class="primary" data-add="${m.id}">הוספה</button>
              ${noteOpen ? `<input type="text" data-note-input="${m.id}" value="${noteVal}" placeholder="לדוגמה: בלי בצל, רגיש/ה לבוטנים" />` : ''}
            </div>
          </div>`;
      }
      html += `</div>`;
    }
    els.menuView.innerHTML = navHtml + html;

    els.menuView.querySelectorAll('[data-nav]').forEach((b) =>
      b.addEventListener('click', () => {
        activeCourse = b.dataset.nav;
        render();
      })
    );
    els.menuView.querySelectorAll('[data-detail]').forEach((b) =>
      b.addEventListener('click', () => {
        detailItemId = b.dataset.detail;
        renderDetailModal();
      })
    );
    els.menuView.querySelectorAll('[data-inc]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.inc;
        qtyDraft[id] = (qtyDraft[id] || 1) + 1;
        render();
      })
    );
    els.menuView.querySelectorAll('[data-dec]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.dec;
        qtyDraft[id] = Math.max(1, (qtyDraft[id] || 1) - 1);
        render();
      })
    );
    els.menuView.querySelectorAll('[data-note-toggle]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.noteToggle;
        if (notesOpen.has(id)) notesOpen.delete(id);
        else notesOpen.add(id);
        render();
      })
    );
    els.menuView.querySelectorAll('[data-note-input]').forEach((inp) =>
      inp.addEventListener('input', () => {
        notesDraft[inp.dataset.noteInput] = inp.value;
      })
    );
    els.menuView.querySelectorAll('[data-add]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.add;
        const qty = qtyDraft[id] || 1;
        const notes = (notesDraft[id] || '').trim();
        socket.emit('cart:add', { sessionId: session.id, dinerId: diner.id, menuItemId: id, qty, notes });
        qtyDraft[id] = 1;
        notesDraft[id] = '';
        notesOpen.delete(id);
        b.textContent = 'נוסף ✓';
        setTimeout(() => (b.textContent = 'הוספה'), 900);
      })
    );
  }

  function noteLine(it) {
    return it.notes ? `<div class="meta" style="font-style:italic">📝 ${it.notes}</div>` : '';
  }

  function renderCart() {
    if (!items.length) {
      els.cartView.innerHTML = '<div class="empty">עוד לא הוזמן כלום מהשולחן הזה. עברו לתפריט כדי להוסיף מנות 🍽️</div>';
      return;
    }
    const byStatus = {};
    for (const it of items) {
      (byStatus[it.status] = byStatus[it.status] || []).push(it);
    }
    // Diners only ever see "in progress" — the real sent/preparing/ready
    // distinction stays internal to the master tablet and kitchen, so a dish
    // doesn't look "done" before it's actually on its way to the table.
    const cooking = items.filter((i) => ['sent', 'preparing', 'ready'].includes(i.status));
    let html = '';
    let total = 0;
    for (const it of items) {
      if (it.status !== 'cancelled' && it.status !== 'removed') total += it.price * it.qty;
    }

    const inCart = byStatus['in_cart'] || [];
    if (inCart.length) {
      html += `<div class="section-title">${STATUS_LABELS.in_cart}</div><div class="card">`;
      for (const it of inCart) {
        const mine = it.dinerId === diner.id;
        html += `
          <div class="order-line">
            <div>
              <div><b>${it.name}</b> × ${it.qty}</div>
              <div class="meta">👤 ${it.dinerName || ''} · ${money(it.price * it.qty)}</div>
              ${noteLine(it)}
            </div>
            <div class="actions">
              <span class="badge in_cart">${STATUS_LABELS.in_cart}</span>
              ${mine ? `<button class="ghost" data-remove="${it.id}">הסרה</button>` : ''}
            </div>
          </div>`;
      }
      html += `</div>`;
    }

    if (cooking.length) {
      html += `<div class="section-title">👨‍🍳 בהכנה</div><div class="cooking-card">
        <div class="cooking-banner">
          <span id="cookingMsg">${COOKING_MESSAGES[cookingMsgIndex]}</span>
          <span class="cooking-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>`;
      for (const it of cooking) {
        html += `<div class="cooking-item-row"><span><b>${it.name}</b> × ${it.qty}${it.notes ? ` <i>· 📝 ${it.notes}</i>` : ''}</span><span>👤 ${it.dinerName || ''}</span></div>`;
      }
      html += `</div>`;
    }

    const served = byStatus['served'] || [];
    if (served.length) {
      html += `<div class="section-title">🍽️ בתאבון!</div><div class="card">`;
      for (const it of served) {
        html += `
          <div class="order-line">
            <div>
              <div><b>${it.name}</b> × ${it.qty}</div>
              <div class="meta">👤 ${it.dinerName || ''} · ${money(it.price * it.qty)}</div>
            </div>
            <span class="badge served">🍽️ הוגש</span>
          </div>`;
      }
      html += `</div>`;
    }

    for (const status of ['removed', 'cancelled']) {
      const list = byStatus[status];
      if (!list || !list.length) continue;
      html += `<div class="section-title">${STATUS_LABELS[status]}</div><div class="card">`;
      for (const it of list) {
        html += `
          <div class="order-line">
            <div>
              <div><b>${it.name}</b> × ${it.qty}</div>
              <div class="meta">👤 ${it.dinerName || ''} · ${money(it.price * it.qty)}</div>
            </div>
            <div class="actions">
              <span class="badge ${it.status}">${STATUS_LABELS[it.status]}</span>
              ${status === 'removed' ? `<button class="ghost" data-restore="${it.id}">↩️ החזרה לעגלה</button>` : ''}
            </div>
          </div>`;
      }
      html += `</div>`;
    }

    html += `<div class="card" style="display:flex;justify-content:space-between;font-weight:700">
      <span>סה"כ לשולחן</span><span>${money(total)}</span>
    </div>`;
    if (inCart.length) {
      html += `<div class="notice">המנות שבעגלה עדיין לא נשלחו למטבח — הן ימתינו למאסטר טאבלט של השולחן, שיאשר ויתזמן את שליחתן.</div>`;
    }
    html += renderMyBillHtml();
    els.cartView.innerHTML = html;

    els.cartView.querySelectorAll('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('cart:remove', { sessionId: session.id, itemId: b.dataset.remove });
      })
    );
    els.cartView.querySelectorAll('[data-restore]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('cart:restore', { sessionId: session.id, itemId: b.dataset.restore });
      })
    );
    wireMyBill();
  }

  function myBillEntry() {
    return (bill.diners || []).find((d) => d.dinerId === diner.id);
  }

  function renderMyBillHtml() {
    const mine = myBillEntry();
    if (!mine || mine.subtotal <= 0) return '';
    let html = `<div class="section-title">💳 החשבון שלי</div><div class="card">
      <div class="order-line">
        <span>סכום המנות שלי</span><span>${money(mine.subtotal)}</span>
      </div>
      <div class="order-line">
        <span>טיפ</span><span>${money(mine.tip)}</span>
      </div>
      <div style="margin:10px 0 6px;font-size:13px;color:var(--muted)">בחירת טיפ:</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">`;
    for (const pct of TIP_PRESETS) {
      const active = mine.tipMode === 'percent' && Number(mine.tipValue) === pct;
      html += `<button class="${active ? 'primary' : 'ghost'}" data-tip-pct="${pct}">${pct}%</button>`;
    }
    html += `</div>
      <div style="display:flex;gap:6px;align-items:center">
        <input type="text" inputmode="decimal" placeholder="סכום טיפ אחר בש״ח" id="customTipInput" value="${customTipDraft}" style="margin-bottom:0" />
        <button class="ghost" id="customTipBtn">עדכון</button>
      </div>
      <div class="order-line" style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px;font-weight:700">
        <span>סה"כ לתשלום שלי</span><span>${money(mine.total)}</span>
      </div>
    </div>`;
    return html;
  }

  function wireMyBill() {
    els.cartView.querySelectorAll('[data-tip-pct]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('diner:setTip', {
          sessionId: session.id,
          dinerId: diner.id,
          mode: 'percent',
          value: Number(b.dataset.tipPct),
        });
      })
    );
    const customBtn = document.getElementById('customTipBtn');
    const customInput = document.getElementById('customTipInput');
    if (customInput) {
      customInput.addEventListener('input', () => (customTipDraft = customInput.value));
    }
    if (customBtn) {
      customBtn.addEventListener('click', () => {
        const value = Number(customInput.value);
        if (!isNaN(value) && value >= 0) {
          socket.emit('diner:setTip', { sessionId: session.id, dinerId: diner.id, mode: 'amount', value });
        }
      });
    }
  }

  function renderFab() {
    const inCartCount = items.filter((i) => i.status === 'in_cart').length;
    els.cartCount.textContent = items.length ? `(${items.length})` : '';
    if (view === 'menu' && inCartCount > 0) {
      els.fabCart.style.display = '';
      els.fabCartBtn.textContent = `לצפייה בעגלת השולחן (${inCartCount} ממתינות) 🧾`;
    } else {
      els.fabCart.style.display = 'none';
    }
  }

  init();
})();
