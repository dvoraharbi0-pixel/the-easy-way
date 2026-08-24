const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function emptyState() {
  return {
    tables: {},
    menuItems: {},
    sessions: {},
    diners: {},
    orderItems: {},
  };
}

const state = emptyState();

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      Object.assign(state, emptyState(), parsed);
    }
  } catch (err) {
    console.error('Failed to load store.json, starting with an empty store:', err.message);
  }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  }, 50);
}

module.exports = { state, load, save };
