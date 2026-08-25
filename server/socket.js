const models = require('./models');
const auth = require('./auth');

function sessionRoom(sessionId) {
  return `session:${sessionId}`;
}

const KITCHEN_ROOM = 'kitchen';

function broadcastSession(io, sessionId) {
  const session = models.getSession(sessionId);
  if (!session) return;
  const items = models.listSessionItems(sessionId);
  const bill = models.sessionBillSummary(sessionId);
  io.to(sessionRoom(sessionId)).emit('session:state', { session, items, bill });
}

function broadcastKitchen(io) {
  io.to(KITCHEN_ROOM).emit('kitchen:state', { items: models.kitchenQueue() });
}

function broadcastCalls(io) {
  io.to(KITCHEN_ROOM).emit('calls:state', { calls: models.listOpenCalls() });
}

// Kitchen/bar staff panels need every item (including already-86'd ones) so
// they can flip availability back on; diners just get nudged to re-fetch
// /api/menu, which already filters to available items only.
function broadcastMenu(io) {
  io.to(KITCHEN_ROOM).emit('menu:state', { items: models.listMenu({ onlyAvailable: false }) });
  io.emit('menu:updated');
}

function registerSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join', ({ role, sessionId, token }) => {
      if (role === 'kitchen') {
        if (!auth.isValidToken(token)) return socket.emit('staff:unauthorized');
        socket.data.isStaff = true;
        socket.join(KITCHEN_ROOM);
        socket.emit('kitchen:state', { items: models.kitchenQueue() });
        socket.emit('calls:state', { calls: models.listOpenCalls() });
        socket.emit('menu:state', { items: models.listMenu({ onlyAvailable: false }) });
        return;
      }
      if (role === 'master') {
        if (!auth.isValidToken(token)) return socket.emit('staff:unauthorized');
        socket.data.isStaff = true;
      }
      if (sessionId) {
        socket.join(sessionRoom(sessionId));
        const session = models.getSession(sessionId);
        if (session) {
          socket.emit('session:state', {
            session,
            items: models.listSessionItems(sessionId),
            bill: models.sessionBillSummary(sessionId),
          });
        }
      }
    });

    socket.on('cart:add', ({ sessionId, dinerId, menuItemId, qty, notes }, ack) => {
      try {
        const item = models.addCartItem({ sessionId, dinerId, menuItemId, qty, notes });
        broadcastSession(io, sessionId);
        if (ack) ack({ ok: true, item });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('cart:updateQty', ({ sessionId, itemId, qty }) => {
      const item = models.updateCartItemQty(itemId, qty);
      if (item) broadcastSession(io, sessionId);
    });

    socket.on('cart:remove', ({ sessionId, itemId }) => {
      const removed = models.removeCartItem(itemId);
      if (removed) broadcastSession(io, sessionId);
    });

    socket.on('cart:restore', ({ sessionId, itemId }) => {
      const restored = models.restoreCartItem(itemId);
      if (restored) broadcastSession(io, sessionId);
    });

    socket.on('diner:setTip', ({ sessionId, dinerId, mode, value }) => {
      const diner = models.setDinerTip(dinerId, mode, value);
      if (diner) broadcastSession(io, sessionId);
    });

    socket.on('master:send', ({ sessionId, itemIds }) => {
      if (!socket.data.isStaff) return;
      const sent = models.sendItems(itemIds);
      if (sent.length) {
        broadcastSession(io, sessionId);
        broadcastKitchen(io);
      }
    });

    socket.on('master:fireCourse', ({ sessionId, course }) => {
      if (!socket.data.isStaff) return;
      const sent = models.fireCourse(sessionId, course);
      if (sent.length) {
        broadcastSession(io, sessionId);
        broadcastKitchen(io);
      }
    });

    socket.on('master:cancel', ({ sessionId, itemId }) => {
      if (!socket.data.isStaff) return;
      const item = models.cancelItem(itemId);
      if (item) {
        broadcastSession(io, sessionId);
        broadcastKitchen(io);
      }
    });

    socket.on('master:markServed', ({ sessionId, itemId }) => {
      if (!socket.data.isStaff) return;
      const item = models.markServed(itemId);
      if (item) {
        broadcastSession(io, sessionId);
        broadcastKitchen(io);
      }
    });

    socket.on('diner:callWaiter', ({ sessionId, reason }, ack) => {
      const session = models.getSession(sessionId);
      if (!session) return;
      models.createCall(sessionId, reason);
      broadcastCalls(io);
      if (ack) ack({ ok: true });
    });

    socket.on('waiter:resolveCall', ({ callId }) => {
      if (!socket.data.isStaff) return;
      const call = models.resolveCall(callId);
      if (call) broadcastCalls(io);
    });

    socket.on('master:closeSession', ({ sessionId }) => {
      if (!socket.data.isStaff) return;
      const session = models.closeSession(sessionId);
      if (session) {
        io.to(sessionRoom(sessionId)).emit('session:closed');
      }
    });

    socket.on('kitchen:start', ({ itemId }) => {
      if (!socket.data.isStaff) return;
      const item = models.startPreparing(itemId);
      if (item) {
        broadcastKitchen(io);
        broadcastSession(io, item.sessionId);
      }
    });

    socket.on('kitchen:ready', ({ itemId }) => {
      if (!socket.data.isStaff) return;
      const item = models.markReady(itemId);
      if (item) {
        broadcastKitchen(io);
        broadcastSession(io, item.sessionId);
      }
    });

    socket.on('staff:setAvailability', ({ itemId, available }) => {
      if (!socket.data.isStaff) return;
      const item = models.setMenuItemAvailability(itemId, available);
      if (item) broadcastMenu(io);
    });
  });
}

module.exports = { registerSocket, broadcastSession, broadcastKitchen, broadcastMenu };
