const { nanoid } = require('nanoid');

// One shared PIN for all staff screens (master tablet / kitchen / bar /
// waiter boards). Set STAFF_PIN as an environment variable in production —
// this default is only here so a fresh clone works out of the box.
const STAFF_PIN = process.env.STAFF_PIN || '1234';

// In-memory only: a redeploy or a free-tier sleep/wake resets these, same as
// the rest of the store, so staff just re-enter the PIN once after that.
const validTokens = new Set();

function checkPin(pin) {
  return typeof pin === 'string' && pin === STAFF_PIN;
}

function issueToken() {
  const token = nanoid(24);
  validTokens.add(token);
  return token;
}

function isValidToken(token) {
  return typeof token === 'string' && validTokens.has(token);
}

module.exports = { checkPin, issueToken, isValidToken };
