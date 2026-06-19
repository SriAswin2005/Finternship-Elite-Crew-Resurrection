/* ═══════════════════════════════════════════════════════════
   app.js — Navigation + App Init + API Status
   ═══════════════════════════════════════════════════════════ */

// ── Screen registry ────────────────────────────────────────────────────────────
const SCREENS = {
  dashboard:       renderDashboard,
  recommendations: renderRecommendations,
  'log-sales':     renderLogSales,
  trends:          renderTrends,
  settings:        renderSettings,
};

// Screens that persist their DOM between visits (not re-rendered each time)
const PERSIST_SCREENS = new Set(['settings']);

let _activeScreen = null;
const _screenCache = {}; // Caches rendered DOM nodes for persistent screens

// ── Navigation ─────────────────────────────────────────────────────────────────
function navigateTo(screenId) {
  if (_activeScreen === screenId) return;

  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.screen === screenId)
  );

  const main = document.getElementById('app-main');
  if (!main) return;
  main.scrollTop = 0;

  // Save current screen's DOM if it's a persistent screen
  if (_activeScreen && PERSIST_SCREENS.has(_activeScreen)) {
    _screenCache[_activeScreen] = main.innerHTML;
  }

  _activeScreen = screenId;
  main.innerHTML = '';

  // Restore from cache if available for persistent screens
  if (PERSIST_SCREENS.has(screenId) && _screenCache[screenId]) {
    main.innerHTML = _screenCache[screenId];
    // Re-attach event listeners for buttons (innerHTML doesn't preserve them)
    _reattachSettingsListeners();
    return;
  }

  const renderFn = SCREENS[screenId];
  if (renderFn) renderFn(main);
}

// Re-attach onclick handlers after restoring settings DOM from cache
function _reattachSettingsListeners() {
  const btns = {
    'retrain-btn': retrainModel,
  };
  for (const [id, fn] of Object.entries(btns)) {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  }
}

// ── Header ─────────────────────────────────────────────────────────────────────
function initHeader() {
  const now = new Date();
  const hour = now.getHours();
  let greeting;
  if (hour < 6)       greeting = 'Good night';
  else if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else if (hour < 20) greeting = 'Good evening';
  else                greeting = 'Good night';
  setEl('greeting-text', greeting + ', Chef! 👨‍🍳');

  // Use local timezone (not UTC) — fixes IST users seeing previous day
  function _updateDate() {
    const d = new Date();
    const dateStr = d.toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
    setEl('today-date', dateStr);
  }
  _updateDate();
  // Refresh date every minute so it stays current if left open overnight
  setInterval(_updateDate, 60000);
}

// ── API Status Dot ─────────────────────────────────────────────────────────────
async function checkApiStatus() {
  const dot = document.getElementById('api-dot');
  if (!dot) return;
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      dot.classList.add('online');
      dot.classList.remove('offline');
      dot.title = 'API Online ✓';
    } else throw new Error();
  } catch {
    dot.classList.add('offline');
    dot.classList.remove('online');
    dot.title = 'API Offline — using mock data';
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(message, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Splash ─────────────────────────────────────────────────────────────────────
function hideSplash() {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');
  }, 2000);
}

// ── Chart.js global defaults ───────────────────────────────────────────────────
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#9B9B9B';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.borderColor = '#2A2A2A';
}

// ── Init ───────────────────────────────────────────────────────────────────────
function initApp() {
  initHeader();
  checkApiStatus();
  setInterval(checkApiStatus, 60000);

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.screen));
  });

  navigateTo('dashboard');
  hideSplash();
}

document.addEventListener('DOMContentLoaded', initApp);
