const { nanoid } = require('nanoid');
const { state, save } = require('./store');

const CART_STATUS = 'in_cart';
const SENT_STATUS = 'sent';
const PREPARING_STATUS = 'preparing';
const READY_STATUS = 'ready';
const SERVED_STATUS = 'served';
const CANCELLED_STATUS = 'cancelled';
const REMOVED_STATUS = 'removed';

const COURSE_ORDER = ['drink', 'starter', 'main', 'dessert'];
const COURSE_LABELS = {
  drink: 'שתייה',
  starter: 'ראשונות',
  main: 'עיקריות',
  dessert: 'קינוחים',
};

// ---------- Tables ----------
function createTable({ number, name }) {
  const id = nanoid(8);
  const token = nanoid(10);
  state.tables[id] = { id, number, name: name || `שולחן ${number}`, token, createdAt: Date.now() };
  save();
  return state.tables[id];
}

function listTables() {
  return Object.values(state.tables).sort((a, b) => a.number - b.number);
}

function getTable(id) {
  return state.tables[id] || null;
}

function getTableByToken(token) {
  return Object.values(state.tables).find((t) => t.token === token) || null;
}

// ---------- Menu ----------
function addMenuItem(item) {
  const id = nanoid(8);
  state.menuItems[id] = {
    id,
    name: item.name,
    description: item.description || '',
    price: item.price,
    category: item.category || '',
    course: item.course,
    available: item.available !== false,
    imageSlug: item.imageSlug || null,
    ingredients: item.ingredients || '',
    allergens: item.allergens || [],
    spicy: item.spicy === true,
  };
  save();
  return state.menuItems[id];
}

function listMenu({ onlyAvailable = true } = {}) {
  const items = Object.values(state.menuItems);
  return (onlyAvailable ? items.filter((i) => i.available) : items).sort((a, b) =>
    COURSE_ORDER.indexOf(a.course) - COURSE_ORDER.indexOf(b.course)
  );
}

function getMenuItem(id) {
  return state.menuItems[id] || null;
}

// Lets kitchen/bar staff 86 a dish mid-service without touching code.
function setMenuItemAvailability(id, available) {
  const item = state.menuItems[id];
  if (!item) return null;
  item.available = available !== false;
  save();
  return item;
}

// ---------- Sessions ----------
function getOrCreateActiveSession(tableId) {
  const existing = Object.values(state.sessions).find(
    (s) => s.tableId === tableId && s.status === 'active'
  );
  if (existing) return existing;
  const id = nanoid(10);
  state.sessions[id] = { id, tableId, status: 'active', createdAt: Date.now(), closedAt: null };
  save();
  return state.sessions[id];
}

function getSession(id) {
  return state.sessions[id] || null;
}

function closeSession(sessionId) {
  const session = state.sessions[sessionId];
  if (!session) return null;
  session.status = 'closed';
  session.closedAt = Date.now();
  save();
  return session;
}

// ---------- Diners ----------
function createDiner(sessionId, name) {
  const id = nanoid(8);
  state.diners[id] = {
    id,
    sessionId,
    name: name || 'סועד/ת',
    createdAt: Date.now(),
    tipMode: null, // 'percent' | 'amount' | null
    tipValue: 0,
  };
  save();
  return state.diners[id];
}

function getDiner(id) {
  return state.diners[id] || null;
}

function setDinerTip(dinerId, mode, value) {
  const diner = state.diners[dinerId];
  if (!diner) return null;
  const numeric = Math.max(0, Number(value) || 0);
  if (mode !== 'percent' && mode !== 'amount') return null;
  diner.tipMode = mode;
  diner.tipValue = numeric;
  save();
  return diner;
}

// ---------- Waiter calls ("call for water / cutlery / the bill / help") ----------
function createCall(sessionId, reason) {
  const id = nanoid(10);
  state.calls[id] = {
    id,
    sessionId,
    reason: reason || 'עזרה',
    status: 'open',
    createdAt: Date.now(),
    resolvedAt: null,
  };
  save();
  return state.calls[id];
}

function resolveCall(callId) {
  const call = state.calls[callId];
  if (!call || call.status !== 'open') return null;
  call.status = 'resolved';
  call.resolvedAt = Date.now();
  save();
  return call;
}

function listOpenCalls() {
  return Object.values(state.calls)
    .filter((c) => c.status === 'open')
    .map(enrichCall)
    .sort((a, b) => a.createdAt - b.createdAt);
}

// Every call for this table's session, open or resolved — lets the diner
// who called see it get picked up, not just the staff-side board.
function listSessionCalls(sessionId) {
  return Object.values(state.calls)
    .filter((c) => c.sessionId === sessionId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

function enrichCall(call) {
  const session = getSession(call.sessionId);
  const table = session ? getTable(session.tableId) : null;
  return { ...call, tableNumber: table ? table.number : null, tableName: table ? table.name : null };
}

// ---------- Order / cart items ----------
function addCartItem({ sessionId, dinerId, menuItemId, qty, notes }) {
  const menuItem = getMenuItem(menuItemId);
  if (!menuItem) throw new Error('menu item not found');
  const id = nanoid(10);
  state.orderItems[id] = {
    id,
    sessionId,
    dinerId,
    menuItemId,
    name: menuItem.name,
    price: menuItem.price,
    course: menuItem.course,
    qty: Math.max(1, qty || 1),
    notes: notes || '',
    status: CART_STATUS,
    createdAt: Date.now(),
    sentAt: null,
    preparingAt: null,
    readyAt: null,
    servedAt: null,
    cancelledAt: null,
    removedAt: null,
  };
  save();
  return state.orderItems[id];
}

function getOrderItem(id) {
  return state.orderItems[id] || null;
}

function updateCartItemQty(itemId, qty) {
  const item = state.orderItems[itemId];
  if (!item || item.status !== CART_STATUS) return null;
  item.qty = Math.max(1, qty);
  save();
  return item;
}

// Notes stay editable only while the item is still in the cart — once it's
// sent, the kitchen may already be reading the original note.
function updateCartItemNotes(itemId, notes) {
  const item = state.orderItems[itemId];
  if (!item || item.status !== CART_STATUS) return null;
  item.notes = (notes || '').trim();
  save();
  return item;
}

// Soft-delete: keep the item (as `removed`) instead of erasing it, so the
// master tablet and the diner who added it both still see that it happened.
function removeCartItem(itemId) {
  const item = state.orderItems[itemId];
  if (!item || item.status !== CART_STATUS) return null;
  item.status = REMOVED_STATUS;
  item.removedAt = Date.now();
  save();
  return item;
}

// Undo a removal — puts the item back in the cart, exactly as it was.
function restoreCartItem(itemId) {
  const item = state.orderItems[itemId];
  if (!item || item.status !== REMOVED_STATUS) return null;
  item.status = CART_STATUS;
  item.removedAt = null;
  save();
  return item;
}

// Master sends chosen in-cart items to the kitchen ("fire").
function sendItems(itemIds) {
  const sent = [];
  for (const id of itemIds) {
    const item = state.orderItems[id];
    if (item && item.status === CART_STATUS) {
      item.status = SENT_STATUS;
      item.sentAt = Date.now();
      sent.push(item);
    }
  }
  if (sent.length) save();
  return sent;
}

// Fire every in-cart item of a given course in one go.
function fireCourse(sessionId, course) {
  const ids = Object.values(state.orderItems)
    .filter((i) => i.sessionId === sessionId && i.course === course && i.status === CART_STATUS)
    .map((i) => i.id);
  return sendItems(ids);
}

// Cancel is only allowed while the kitchen has not yet started preparing.
function cancelItem(itemId) {
  const item = state.orderItems[itemId];
  if (!item) return null;
  if (item.status !== SENT_STATUS) return null;
  item.status = CANCELLED_STATUS;
  item.cancelledAt = Date.now();
  save();
  return item;
}

function startPreparing(itemId) {
  const item = state.orderItems[itemId];
  if (!item || item.status !== SENT_STATUS) return null;
  item.status = PREPARING_STATUS;
  item.preparingAt = Date.now();
  save();
  return item;
}

function markReady(itemId) {
  const item = state.orderItems[itemId];
  if (!item || item.status !== PREPARING_STATUS) return null;
  item.status = READY_STATUS;
  item.readyAt = Date.now();
  save();
  return item;
}

function markServed(itemId) {
  const item = state.orderItems[itemId];
  if (!item || item.status !== READY_STATUS) return null;
  item.status = SERVED_STATUS;
  item.servedAt = Date.now();
  save();
  return item;
}

function listSessionItems(sessionId) {
  return Object.values(state.orderItems)
    .filter((i) => i.sessionId === sessionId)
    .map(enrichItem)
    .sort((a, b) => a.createdAt - b.createdAt);
}

function kitchenQueue() {
  return Object.values(state.orderItems)
    .filter((i) => [SENT_STATUS, PREPARING_STATUS, READY_STATUS].includes(i.status))
    .map(enrichItem)
    .sort((a, b) => a.sentAt - b.sentAt);
}

// Per-diner subtotal (their own dishes only) + chosen tip + total, plus table-wide totals.
function sessionBillSummary(sessionId) {
  const diners = Object.values(state.diners).filter((d) => d.sessionId === sessionId);
  const items = Object.values(state.orderItems).filter(
    (i) => i.sessionId === sessionId && i.status !== CANCELLED_STATUS && i.status !== REMOVED_STATUS
  );

  const perDiner = diners.map((diner) => {
    const subtotal = items
      .filter((i) => i.dinerId === diner.id)
      .reduce((sum, i) => sum + i.price * i.qty, 0);
    const tip =
      diner.tipMode === 'percent'
        ? Math.round((subtotal * diner.tipValue) / 100)
        : diner.tipMode === 'amount'
        ? Math.round(diner.tipValue)
        : 0;
    return {
      dinerId: diner.id,
      name: diner.name,
      subtotal,
      tipMode: diner.tipMode,
      tipValue: diner.tipValue,
      tip,
      total: subtotal + tip,
    };
  });

  return {
    diners: perDiner,
    subtotal: perDiner.reduce((s, d) => s + d.subtotal, 0),
    tip: perDiner.reduce((s, d) => s + d.tip, 0),
    total: perDiner.reduce((s, d) => s + d.total, 0),
  };
}

function enrichItem(item) {
  const diner = getDiner(item.dinerId);
  const session = getSession(item.sessionId);
  const table = session ? getTable(session.tableId) : null;
  return {
    ...item,
    dinerName: diner ? diner.name : null,
    tableId: table ? table.id : null,
    tableNumber: table ? table.number : null,
    tableName: table ? table.name : null,
  };
}

module.exports = {
  STATUS: {
    CART: CART_STATUS,
    SENT: SENT_STATUS,
    PREPARING: PREPARING_STATUS,
    READY: READY_STATUS,
    SERVED: SERVED_STATUS,
    CANCELLED: CANCELLED_STATUS,
  },
  COURSE_ORDER,
  COURSE_LABELS,
  createTable,
  listTables,
  getTable,
  getTableByToken,
  addMenuItem,
  listMenu,
  getMenuItem,
  setMenuItemAvailability,
  getOrCreateActiveSession,
  getSession,
  closeSession,
  createDiner,
  getDiner,
  setDinerTip,
  createCall,
  resolveCall,
  listOpenCalls,
  listSessionCalls,
  sessionBillSummary,
  addCartItem,
  getOrderItem,
  updateCartItemQty,
  updateCartItemNotes,
  removeCartItem,
  restoreCartItem,
  sendItems,
  fireCourse,
  cancelItem,
  startPreparing,
  markReady,
  markServed,
  listSessionItems,
  kitchenQueue,
};
