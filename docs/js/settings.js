/* ═══════════════════════════════════════════════════════════
   settings.js — Screen 5 (API Keys, Location, Model Info)
   ═══════════════════════════════════════════════════════════ */

function renderSettings(container) {
  container.innerHTML = `
    <div class="screen">

      <div class="screen-title-row" style="margin-bottom:20px">
        <div class="screen-title">⚙️ Settings</div>
      </div>

      <!-- Location Section -->
      <div class="settings-section">
        <div class="settings-section-title">📍 Location</div>
        <div class="card" style="padding:16px">
          <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:14px;line-height:1.6">
            Set your hotel's location for accurate weather forecasts.
          </div>
          <button class="btn btn-ghost" onclick="useDeviceLocation()" style="width:100%;margin-bottom:12px;padding:10px;display:flex;align-items:center;justify-content:center;gap:8px">
            <span>📍</span> <span>Use Device Location</span>
          </button>
          <div style="display:flex;gap:10px;margin-bottom:12px">
            <div style="flex:1">
              <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:6px;font-weight:600;letter-spacing:0.05em">LATITUDE</label>
              <input type="number" step="any" id="lat-input" class="api-key-input" placeholder="e.g. 15.2131">
            </div>
            <div style="flex:1">
              <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:6px;font-weight:600;letter-spacing:0.05em">LONGITUDE</label>
              <input type="number" step="any" id="lon-input" class="api-key-input" placeholder="e.g. 79.9042">
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <button class="btn btn-primary" onclick="saveLocation()" style="padding:10px 20px;font-size:14px">
              💾 Save Location
            </button>
            <div id="location-status-badge" class="status-badge badge-warning">⚠️ Not set</div>
          </div>
        </div>
      </div>

      <!-- API Keys Section -->
      <div class="settings-section">
        <div class="settings-section-title">🔑 API Keys</div>
        <div class="card" style="padding:16px">

          <!-- OpenWeatherMap -->
          <div style="margin-bottom:20px">
            <div style="font-size:13px;font-weight:600;color:var(--color-text);margin-bottom:4px">🌤️ OpenWeatherMap</div>
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:10px;line-height:1.5">
              For real weather data. Without it, mock weather is used.
              <a href="https://openweathermap.org" target="_blank" style="color:var(--color-primary)"> Get free key →</a>
            </div>
            <input type="password" id="api-key-input" class="api-key-input" placeholder="Paste OpenWeatherMap API key..." style="margin-bottom:8px">
            <div style="display:flex;gap:10px;align-items:center">
              <button class="btn btn-primary" onclick="saveApiKey()" style="padding:8px 16px;font-size:13px">💾 Save</button>
              <div id="weather-status-badge" class="status-badge badge-warning">⚠️ Loading...</div>
            </div>
            <div id="weather-source-info" style="margin-top:8px;font-size:12px;color:var(--color-text-muted)"></div>
          </div>

          <div style="height:1px;background:var(--color-border);margin:0 0 20px 0"></div>

          <!-- Gemini AI OCR -->
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--color-text);margin-bottom:4px">✨ Gemini AI OCR <span style="font-size:11px;font-weight:400;color:var(--color-text-muted)">(Optional)</span></div>
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:10px;line-height:1.5">
              Uses Gemini 2.5 Flash to read bills and intelligently group item name variations
              (e.g. "Miwater", "Mi.water 500ml" → same item). Falls back to standard OCR if empty.
            </div>
            <input type="password" id="gemini-key-input" class="api-key-input" placeholder="Paste Gemini API key..." style="margin-bottom:8px">
            <div style="display:flex;gap:10px;align-items:center">
              <button class="btn btn-primary" onclick="saveGeminiKey()" style="padding:8px 16px;font-size:13px">💾 Save</button>
              <div id="gemini-status-badge" class="status-badge badge-warning">⚠️ Loading...</div>
            </div>
          </div>

        </div>
        <button class="btn btn-ghost" onclick="refreshWeather()" style="width:100%;margin-top:8px;padding:10px">
          🔄 Refresh Weather Data Now
        </button>
      </div>

      <!-- ML Model Section -->
      <div class="settings-section">
        <div class="settings-section-title">🧠 Prediction Model</div>
        <div class="card" style="padding:16px">
          <div id="model-info-display">
            <div class="loading-spinner" style="padding:20px"></div>
          </div>
          <button class="btn btn-primary" onclick="retrainModel()"
                  id="retrain-btn" style="width:100%;margin-top:14px">
            🧠 Retrain Model Now
          </button>
          <div style="margin-top:10px;font-size:12px;color:var(--color-text-dim);line-height:1.5">
            Retraining uses your latest logged sales data. Takes ~15–30 seconds
            in the background.
          </div>
        </div>
      </div>

      <!-- Database Info Section -->
      <div class="settings-section">
        <div class="settings-section-title">🗄️ Database</div>
        <div id="db-stats-display">
          <div class="loading-spinner" style="padding:20px"></div>
        </div>
      </div>

      <!-- How Predictions Work -->
      <div class="settings-section">
        <div class="settings-section-title">ℹ️ How Predictions Work</div>
        <div class="card" style="padding:16px;font-size:13px;color:var(--color-text-muted);line-height:1.7">
          <div style="color:var(--color-text);font-weight:600;margin-bottom:8px">
            LightGBM ML Model (Gradient Boosting)
          </div>
          The model learns from your logged sales history.
          For each item, it considers:<br><br>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
            <div>📅 Day of week</div>
            <div>🌤️ Weather (9am–10pm)</div>
            <div>🎉 Festivals</div>
            <div>📈 5-day trend</div>
            <div>⏮️ Yesterday's qty</div>
            <div>📊 7-day rolling avg</div>
          </div>
          <br>
          <strong style="color:var(--color-text)">Updates automatically</strong>
          every time you log new sales data.
        </div>
      </div>

      <!-- About -->
      <div class="settings-section">
        <div class="settings-section-title">About</div>
        <div class="card" style="padding:16px;font-size:13px;color:var(--color-text-muted);line-height:1.7">
          <strong style="color:var(--color-text);font-size:15px">Hotel Aditya Grand</strong>
          <br>AI Order Assistant
          <br><br>
          <span style="color:var(--color-text-dim)">
            OkCredit × Google Internship POC · Built with FastAPI + LightGBM
          </span>
        </div>
      </div>

    </div>
  `;

  loadSettings();
}

// ── Load Settings Data ─────────────────────────────────────────────────────────
async function loadSettings() {
  const data = await API.getSettings();
  if (!data) {
    setEl('weather-status-badge', '❌ Backend offline');
    return;
  }

  // Weather status
  const badge = document.getElementById('weather-status-badge');
  const sourceInfo = document.getElementById('weather-source-info');
  if (badge) {
    if (data.openweather_key_set) {
      badge.textContent = '✅ Active';
      badge.className = 'status-badge badge-success';
      if (sourceInfo) {
        const locStr = (data.latitude && data.longitude)
          ? ` · ${Number(data.latitude).toFixed(2)}°N, ${Number(data.longitude).toFixed(2)}°E`
          : '';
        sourceInfo.textContent = `🌤️ Using live weather data${locStr}`;
      }
    } else {
      badge.textContent = '⚠️ Mock data';
      badge.className = 'status-badge badge-warning';
      if (sourceInfo) sourceInfo.textContent = 'No API key — using realistic mock weather data';
    }
  }

  // Location inputs — only fill if actually saved (not null/undefined)
  const locBadge = document.getElementById('location-status-badge');
  const latInput = document.getElementById('lat-input');
  const lonInput = document.getElementById('lon-input');
  if (data.latitude != null && data.longitude != null) {
    if (latInput) latInput.value = Number(data.latitude).toFixed(4);
    if (lonInput) lonInput.value = Number(data.longitude).toFixed(4);
    if (locBadge) { locBadge.textContent = `✅ ${Number(data.latitude).toFixed(2)}°N, ${Number(data.longitude).toFixed(2)}°E`; locBadge.className = 'status-badge badge-success'; }
  } else {
    if (latInput) latInput.value = '';
    if (lonInput) lonInput.value = '';
    if (locBadge) { locBadge.textContent = '⚠️ Not set'; locBadge.className = 'status-badge badge-warning'; }
  }

  // Gemini status
  const geminiBadge = document.getElementById('gemini-status-badge');
  if (geminiBadge) {
    if (data.gemini_key_set) {
      geminiBadge.textContent = '✨ AI OCR Active';
      geminiBadge.className = 'status-badge badge-success';
    } else {
      geminiBadge.textContent = '⚠️ Standard OCR';
      geminiBadge.className = 'status-badge badge-warning';
    }
  }

  // Model info
  const modelEl = document.getElementById('model-info-display');
  if (modelEl) {
    const mi = data.model_info || {};
    const trainedAt = mi.trained_at
      ? new Date(mi.trained_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Never (will train on first recommendation)';
    const maeStr = mi.mae != null ? `${Number(mi.mae).toFixed(1)} units avg error` : 'N/A';

    modelEl.innerHTML = `
      <div class="settings-group">
        <div class="settings-row">
          <div class="settings-label">Model Type</div>
          <div class="settings-value">${mi.model_type || 'LightGBM'}</div>
        </div>
        <div class="settings-row">
          <div class="settings-label">Last Trained</div>
          <div class="settings-value" style="font-size:12px">${trainedAt}</div>
        </div>
        <div class="settings-row">
          <div class="settings-label">Accuracy (MAE)</div>
          <div class="settings-value">${maeStr}</div>
        </div>
        <div class="settings-row" style="border-bottom:none">
          <div class="settings-label">Items Modeled</div>
          <div class="settings-value">${mi.n_items || 0} menu items</div>
        </div>
      </div>`;
  }

  // DB stats
  const dbEl = document.getElementById('db-stats-display');
  if (dbEl) {
    const db = data.db_stats || {};
    dbEl.innerHTML = `
      <div class="settings-group">
        <div class="settings-row">
          <div class="settings-label">Total Sales Records</div>
          <div class="settings-value">${(db.total_rows || 0).toLocaleString('en-IN')}</div>
        </div>
        <div class="settings-row">
          <div class="settings-label">Date Range</div>
          <div class="settings-value" style="font-size:12px">${db.date_range || '—'}</div>
        </div>
        <div class="settings-row" style="border-bottom:none">
          <div class="settings-label">Menu Items</div>
          <div class="settings-value">${db.menu_items || '—'} items</div>
        </div>
      </div>`;
  }
}

// ── Save API Key ───────────────────────────────────────────────────────────────
async function saveApiKey() {
  const key = document.getElementById('api-key-input')?.value?.trim();
  if (!key) { showToast('Please enter an API key', 'error'); return; }

  const result = await API.saveSettings({ openweather_api_key: key });
  if (result) {
    showToast('✅ API key saved! Weather updating...', 'success');
    document.getElementById('api-key-input').value = '';
    setTimeout(loadSettings, 1200);
  } else {
    showToast('Failed — backend offline?', 'error');
  }
}

// ── Retrain Model ──────────────────────────────────────────────────────────────
async function retrainModel() {
  const btn = document.getElementById('retrain-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '⏳ Training in background... (~30s)';

  const result = await API.retrainModel();
  if (result) {
    showToast('🧠 Model retraining started!', 'success');
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '🧠 Retrain Model Now';
      loadSettings();
    }, 12000);
  } else {
    btn.disabled = false;
    btn.textContent = '🧠 Retrain Model Now';
    showToast('Retrain failed — backend offline?', 'error');
  }
}

// ── Refresh Weather ────────────────────────────────────────────────────────────
async function refreshWeather() {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Refreshing...'; }
  showToast('🔄 Refreshing weather data...', '');
  try {
    const result = await API.refreshWeather();
    if (result && result.status === 'refreshed') {
      const w = result.today_weather;
      const tempStr = w ? `${w.condition}, ${Math.round(w.max_temp)}°C` : '';
      showToast(`✅ Weather refreshed! ${tempStr}`, 'success');
      // Reload settings to reflect new weather source info
      loadSettings();
    } else {
      showToast('⚠️ Weather refresh failed — check API key and location', 'error');
    }
  } catch(e) {
    showToast('❌ Could not reach backend', 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = '🔄 Refresh Weather Data Now'; }
}

// ── Save Location ─────────────────────────────────────────────────────────────
async function saveLocation() {
  const lat = parseFloat(document.getElementById('lat-input')?.value);
  const lon = parseFloat(document.getElementById('lon-input')?.value);
  if (isNaN(lat) || isNaN(lon)) { showToast('Invalid coordinates', 'error'); return; }
  if (lat < -90 || lat > 90) { showToast('Latitude must be between -90 and 90', 'error'); return; }
  if (lon < -180 || lon > 180) { showToast('Longitude must be between -180 and 180', 'error'); return; }

  const btn = document.querySelector('button[onclick="saveLocation()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving & refreshing...'; }

  const result = await API.saveSettings({ latitude: lat, longitude: lon });
  if (result && result.status === 'saved') {
    // Update badge immediately
    const locBadge = document.getElementById('location-status-badge');
    if (locBadge) {
      locBadge.textContent = `✅ ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
      locBadge.className = 'status-badge badge-success';
    }

    // Backend already refreshed weather — show weather that came back
    if (result.weather_refreshed && result.new_weather) {
      const w = result.new_weather;
      const tempStr = w ? `, ${w.condition}, ${Math.round(w.max_temp || 0)}°C` : '';
      showToast(`📍 Location saved! Weather updated${tempStr}`, 'success');
    } else {
      showToast('📍 Location saved! Weather updating...', 'success');
    }

    // Bust dashboard memory cache so weather card refreshes on next visit
    if (window.memCache) {
      delete window.memCache['dashboard'];
      delete window.memCache['weather'];
    }

    loadSettings();
  } else {
    showToast('Failed to save location — is the backend running?', 'error');
  }

  if (btn) { btn.disabled = false; btn.textContent = '💾 Save Location'; }
}

// ── Use Device Location ────────────────────────────────────────────────────────
function useDeviceLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported by your browser', 'error');
    return;
  }
  showToast('📍 Getting location...', '');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      document.getElementById('lat-input').value = pos.coords.latitude.toFixed(4);
      document.getElementById('lon-input').value = pos.coords.longitude.toFixed(4);
      showToast('✅ Location found! Click Save.', 'success');
    },
    (err) => {
      showToast('❌ Location access denied or failed.', 'error');
    }
  );
}

// ── Save Gemini Key ─────────────────────────────────────────────────────
async function saveGeminiKey() {
  const key = document.getElementById('gemini-key-input')?.value?.trim();
  if (!key) { showToast('Please enter an API key', 'error'); return; }

  const result = await API.saveSettings({ gemini_api_key: key });
  if (result && result.status === 'saved') {
    const geminiBadge = document.getElementById('gemini-status-badge');
    if (geminiBadge) {
      geminiBadge.textContent = '✨ AI OCR Active';
      geminiBadge.className = 'status-badge badge-success';
    }
    document.getElementById('gemini-key-input').value = '';
    // Bust DOM cache so if user leaves & returns, it re-loads fresh
    if (typeof _screenCache !== 'undefined') delete _screenCache['settings'];
    showToast('✨ Gemini key saved! AI OCR is now active.', 'success');
  } else {
    showToast('Failed to save key — is the backend running?', 'error');
  }
}
