const models = require('./models');

function sessionRoom(sessionId) {
  return `session:${sessionId}`;
}

const KITCHEN_ROOM = 'kitchen';

function broadcastSession(io, sessionId) {
  const session = models.getSession(sessionId);
  if (!session) return;
  const items = models.listSessionItems(sessionId);
  io.to(sessionRoom(sessionId)).emit('session:state', { session, items });
}

function broadcastKitchen(io) {
  io.to(KITCHEN_ROOM).emit('kitchen:state', { items: models.kitchenQueue() });
}

function registerSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join', ({ role, sessionId }) => {
      if (role === 'kitchen') {
        socket.join(KITCHEN_ROOM);
        socket.emit('kitchen:state', { items: models.kitchenQueue() });
        return;
      }
      if (sessionId) {
        socket.join(sessionRoom(sessionId));
        const session = models.getSession(sessionId);
        if (session) {
          socket.emit('session:state', { session, items: models.listSessionItems(sessionId) });
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

    socket.on('master:send', ({ sessionId, itemIds }) => {
      const sent = models.sendItems(itemIds);
      if (sent.length) {
        broadcastSession(io, sessionId);
        broadcastKitchen(io);
      }
    });

    socket.on('master:fireCourse', ({ sessionId, course }) => {
      const sent = models.fireCourse(sessionId, course);
      if (sent.length) {
        broadcastSession(io, sessionId);
        broadcastKitchen(io);
      }
    });

    socket.on('master:cancel', ({ sessionId, itemId }) => {
      const item = models.cancelItem(itemId);
      if (item) {
        broadcastSession(io, sessionId);
        broadcastKitchen(io);
      }
    });

    socket.on('master:markServed', ({ sessionId, itemId }) => {
      const item = models.markServed(itemId);
      if (item) {
        broadcastSession(io, sessionId);
        broadcastKitchen(io);
      }
    });

    socket.on('master:closeSession', ({ sessionId }) => {
      const session = models.closeSession(sessionId);
      if (session) {
        io.to(sessionRoom(sessionId)).emit('session:closed');
      }
    });

    socket.on('kitchen:start', ({ itemId }) => {
      const item = models.startPreparing(itemId);
      if (item) {
        broadcastKitchen(io);
        broadcastSession(io, item.sessionId);
      }
    });

    socket.on('kitchen:ready', ({ itemId }) => {
      const item = models.markReady(itemId);
      if (item) {
        broadcastKitchen(io);
        broadcastSession(io, item.sessionId);
      }
    });
  });
}

module.exports = { registerSocket, broadcastSession, broadcastKitchen };
