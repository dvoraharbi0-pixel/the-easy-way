// Shared "staff PIN" gate for the master tablet / kitchen / bar / waiter
// screens — customer-facing pages (/t/:token) never load this. Injects its
// own modal so every staff page can just call requireStaffAuth(onReady).
(function () {
  const TOKEN_KEY = 'easyway_staff_token';

  function injectModal() {
    if (document.getElementById('staffAuthModal')) return;
    const div = document.createElement('div');
    div.id = 'staffAuthModal';
    div.className = 'modal-backdrop';
    div.innerHTML = `
      <div class="modal-sheet">
        <h2>🔒 כניסת צוות</h2>
        <p style="color:var(--muted);font-size:13px">הזינו את קוד הצוות כדי להמשיך למסך הזה.</p>
        <label class="field">קוד צוות</label>
        <input type="password" inputmode="numeric" id="staffPinInput" placeholder="••••" />
        <div id="staffPinError" style="color:var(--danger);font-size:13px;margin:2px 0 8px;min-height:16px"></div>
        <button class="primary" id="staffPinSubmit" style="width:100%">כניסה</button>
      </div>`;
    document.body.appendChild(div);
  }

  function showModal() {
    injectModal();
    document.getElementById('staffAuthModal').style.display = 'flex';
  }

  function hideModal() {
    const el = document.getElementById('staffAuthModal');
    if (el) el.style.display = 'none';
  }

  window.getStaffToken = function () {
    return localStorage.getItem(TOKEN_KEY);
  };

  window.requireStaffAuth = function (onReady) {
    function promptForPin() {
      showModal();
      const input = document.getElementById('staffPinInput');
      const err = document.getElementById('staffPinError');
      const submit = document.getElementById('staffPinSubmit');
      const attempt = () => {
        const pin = input.value.trim();
        if (!pin) return;
        err.textContent = '';
        fetch('/api/staff/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.ok) {
              localStorage.setItem(TOKEN_KEY, data.token);
              hideModal();
              onReady(data.token);
            } else {
              err.textContent = 'קוד שגוי, נסו שוב.';
              input.value = '';
              input.focus();
            }
          })
          .catch(() => {
            err.textContent = 'שגיאת תקשורת, נסו שוב.';
          });
      };
      submit.onclick = attempt;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') attempt();
      };
      setTimeout(() => input.focus(), 50);
    }

    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      promptForPin();
      return;
    }
    fetch('/api/staff/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: stored }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          onReady(stored);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          promptForPin();
        }
      })
      .catch(() => promptForPin());
  };
})();
