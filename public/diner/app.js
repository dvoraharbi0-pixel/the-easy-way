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
  let customTipDraft = '';
  let view = 'menu';
  let socket = null;

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
  };

  els.navMenu.onclick = () => setView('menu');
  els.navCart.onclick = () => setView('cart');
  els.fabCartBtn.onclick = () => setView('cart');

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
    els.tableTitle.textContent = table.name;

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

    render();
  }

  function render() {
    if (view === 'menu') renderMenu();
    else renderCart();
    renderFab();
  }

  function renderMenu() {
    if (!menu.length) {
      els.menuView.innerHTML = '<div class="empty">התפריט נטען...</div>';
      return;
    }
    let html = '';
    for (const course of COURSE_ORDER) {
      const courseItems = menu.filter((m) => m.course === course);
      if (!courseItems.length) continue;
      html += `<div class="section-title">${COURSE_ICON[course] || ''} ${COURSE_LABELS[course]}</div><div class="card">`;
      for (const m of courseItems) {
        const qty = qtyDraft[m.id] || 1;
        html += `
          <div class="menu-item">
            <div class="info">
              <div class="name">${m.name}</div>
              ${m.description ? `<div class="desc">${m.description}</div>` : ''}
              <div class="price">${money(m.price)}</div>
            </div>
            <div class="qty-control">
              <button data-dec="${m.id}">－</button>
              <span>${qty}</span>
              <button data-inc="${m.id}">＋</button>
            </div>
            <button class="primary" data-add="${m.id}">הוספה</button>
          </div>`;
      }
      html += `</div>`;
    }
    els.menuView.innerHTML = html;

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
    els.menuView.querySelectorAll('[data-add]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.add;
        const qty = qtyDraft[id] || 1;
        socket.emit('cart:add', { sessionId: session.id, dinerId: diner.id, menuItemId: id, qty });
        qtyDraft[id] = 1;
        b.textContent = 'נוסף ✓';
        setTimeout(() => (b.textContent = 'הוספה'), 900);
      })
    );
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
    const order = ['in_cart', 'sent', 'preparing', 'ready', 'served', 'cancelled'];
    let html = '';
    let total = 0;
    for (const status of order) {
      const list = byStatus[status];
      if (!list || !list.length) continue;
      html += `<div class="section-title">${STATUS_LABELS[status]}</div><div class="card">`;
      for (const it of list) {
        if (it.status !== 'cancelled') total += it.price * it.qty;
        const mine = it.dinerId === diner.id;
        html += `
          <div class="order-line">
            <div>
              <div><b>${it.name}</b> × ${it.qty}</div>
              <div class="meta">👤 ${it.dinerName || ''} · ${money(it.price * it.qty)}</div>
            </div>
            <div class="actions">
              <span class="badge ${it.status}">${STATUS_LABELS[it.status]}</span>
              ${status === 'in_cart' && mine ? `<button class="ghost" data-remove="${it.id}">הסרה</button>` : ''}
            </div>
          </div>`;
      }
      html += `</div>`;
    }
    html += `<div class="card" style="display:flex;justify-content:space-between;font-weight:700">
      <span>סה"כ לשולחן</span><span>${money(total)}</span>
    </div>`;
    if (byStatus['in_cart'] && byStatus['in_cart'].length) {
      html += `<div class="notice">המנות שבעגלה עדיין לא נשלחו למטבח — הן ימתינו למאסטר טאבלט של השולחן, שיאשר ויתזמן את שליחתן.</div>`;
    }
    html += renderMyBillHtml();
    els.cartView.innerHTML = html;

    els.cartView.querySelectorAll('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => {
        socket.emit('cart:remove', { sessionId: session.id, itemId: b.dataset.remove });
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
