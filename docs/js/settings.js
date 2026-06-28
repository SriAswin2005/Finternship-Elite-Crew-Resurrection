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
          <div style="margin-top:10px;font-size:12px;color:var(--color-text-dim);line-height:1.5;margin-bottom:16px">
            Retraining uses your latest logged sales data. Takes ~15–30 seconds
            in the background.
          </div>
          
          <div style="margin-top:16px; padding-top:16px; border-top: 1px solid var(--color-border);">
            <div style="font-size:12px; font-weight:700; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">
              📅 Daily Auto-Retraining
            </div>
            <div id="auto-retrain-status-display" style="font-size:12px; line-height:1.6; color:var(--color-text-dim);">
              <div class="loading-spinner" style="padding:10px"></div>
            </div>
            <div style="margin-top:12px; padding:10px; background:var(--color-surface-2); border-radius:var(--radius-md); font-size:11px; line-height:1.5; color:var(--color-text-dim);">
              <strong style="color:var(--color-text-muted)">Daily Cron Integration:</strong><br>
              To update the database and retrain the model automatically every day, create a free account at <a href="https://cron-job.org" target="_blank" style="color:var(--color-primary); text-decoration:underline;">cron-job.org</a> and configure a daily <strong>POST</strong> job to:
              <div style="margin-top:6px; display:flex; gap:6px; align-items:center;">
                <code id="cron-url-code" style="flex:1; color:var(--color-primary); font-family:monospace; background:rgba(0,0,0,0.25); padding:3px 6px; border-radius:3px; word-break:break-all; font-size:10px;">Loading URL...</code>
                <button class="btn btn-ghost" onclick="navigator.clipboard.writeText(document.getElementById('cron-url-code').textContent); showToast('URL copied!', 'success');" style="padding:4px 8px; font-size:10px; flex-shrink:0;">Copy</button>
              </div>
            </div>
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

      <!-- Custom Prediction Rules -->
      <div class="settings-section">
        <div class="settings-section-title">⚙️ Custom Prediction Rules</div>
        <div class="card" style="padding:16px">
          <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:14px;line-height:1.6">
            Override the AI for specific days or categories where you know better.
            Example: <em>"Saturdays → Chicken → −40%"</em> for religious reasons.
          </div>

          <!-- Existing rules list -->
          <div id="custom-rules-list" style="margin-bottom:14px"></div>

          <!-- Add new rule form -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end" id="add-rule-row">
            <div>
              <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:5px;font-weight:600;letter-spacing:0.05em">DAY</label>
              <select id="rule-day" class="api-key-input" style="padding:9px 10px">
                <option value="">Every day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:5px;font-weight:600;letter-spacing:0.05em">CATEGORY</label>
              <select id="rule-cat" class="api-key-input" style="padding:9px 10px">
                <option value="">All items</option>
                <option value="biryani">🍛 Biryani</option>
                <option value="chicken">🍗 Chicken</option>
                <option value="beverage">🥤 Beverages</option>
                <option value="bread">🫓 Breads</option>
                <option value="dairy">🧀 Dairy</option>
                <option value="starter">🍟 Starters</option>
                <option value="rice">🍚 Rice</option>
                <option value="ice_cream">🍦 Ice Cream</option>
                <option value="seafood">🦐 Seafood</option>
                <option value="veg">🥦 Veg</option>
                <option value="soup">🍲 Soup</option>
                <option value="dessert">🍮 Dessert</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:5px;font-weight:600;letter-spacing:0.05em">ADJUST %</label>
              <select id="rule-adj" class="api-key-input" style="padding:9px 10px">
                <option value="-0.5">−50% (Half)</option>
                <option value="-0.4" selected>−40%</option>
                <option value="-0.3">−30%</option>
                <option value="-0.2">−20%</option>
                <option value="-0.1">−10%</option>
                <option value="0.1">+10%</option>
                <option value="0.2">+20%</option>
                <option value="0.3">+30%</option>
                <option value="0.5">+50%</option>
                <option value="0.75">+75%</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="addCustomRule()" style="padding:9px 14px;white-space:nowrap">
              + Add
            </button>
          </div>

          <div style="margin-top:10px;font-size:12px;color:var(--color-text-dim);line-height:1.5">
            💡 Rules are applied <strong>after</strong> the AI prediction, as a final multiplier.
            The AI still learns — rules only correct the output.
          </div>
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

      <!-- Menu Management -->
      <div class="settings-section">
        <div class="settings-section-title">🍽️ Menu Management</div>
        <div class="card" style="padding:16px">
          <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:14px;line-height:1.6">
            View and edit item categories. Click a category to expand its items and reassign them.
          </div>

          <!-- Category list -->
          <div id="menu-category-list" style="margin-bottom:16px"></div>

          <!-- Rename category -->
          <div style="border-top:1px solid var(--color-border);padding-top:14px;margin-top:4px">
            <div style="font-size:12px;font-weight:600;letter-spacing:0.05em;color:var(--color-text-dim);margin-bottom:8px">RENAME A CATEGORY</div>
            <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end">
              <div>
                <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:4px;font-weight:600">CURRENT NAME</label>
                <select id="rename-cat-old" class="api-key-input" style="padding:9px 10px"></select>
              </div>
              <div>
                <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:4px;font-weight:600">NEW NAME</label>
                <input type="text" id="rename-cat-new" class="api-key-input" placeholder="e.g. starters" style="padding:9px 10px">
              </div>
              <button class="btn btn-primary" onclick="renameCategoryAction()" style="padding:9px 14px">Rename</button>
            </div>
          </div>

          <!-- Add new item -->
          <div style="border-top:1px solid var(--color-border);padding-top:14px;margin-top:14px">
            <div style="font-size:12px;font-weight:600;letter-spacing:0.05em;color:var(--color-text-dim);margin-bottom:8px">ADD NEW ITEM TO MENU</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 80px auto;gap:8px;align-items:end;margin-bottom:8px">
              <div>
                <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:4px;font-weight:600">ITEM NAME</label>
                <input type="text" id="new-item-name" class="api-key-input" placeholder="e.g. Paneer 65" style="padding:9px 10px">
              </div>
              <div>
                <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:4px;font-weight:600">CATEGORY</label>
                <select id="new-item-category" class="api-key-input" style="padding:9px 10px" onchange="handleNewItemCategoryChange(this.value)"></select>
              </div>
              <div>
                <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:4px;font-weight:600">PRICE (₹)</label>
                <input type="number" id="new-item-price" class="api-key-input" placeholder="e.g. 180" style="padding:9px 10px;text-align:right" value="0">
              </div>
              <button class="btn btn-primary" onclick="addMenuItemAction()" style="padding:9px 14px">+ Add</button>
            </div>
            <div id="new-item-category-custom-container" style="display:none;margin-top:8px">
              <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:4px;font-weight:600">NEW CATEGORY NAME</label>
              <input type="text" id="new-item-category-custom" class="api-key-input" placeholder="e.g. deserts" style="padding:9px 10px">
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Local Events -->
      <div class="settings-section">
        <div class="settings-section-title">📅 Custom Local Events</div>
        <div class="card" style="padding:16px">
          <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:14px;line-height:1.6">
            Add local events that boost demand — village fairs, school exams, cricket matches, marriages season, etc.
            The AI will apply the demand multiplier during that date range.
          </div>

          <div id="custom-events-list" style="margin-bottom:14px"></div>

          <!-- Add event form -->
          <div style="display:grid;gap:10px;margin-bottom:10px">
            <input type="text" id="event-name" class="api-key-input" placeholder="Event name (e.g. Local Cricket Tournament)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div>
                <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:5px;font-weight:600;letter-spacing:0.05em">FROM DATE</label>
                <input type="date" id="event-from" class="api-key-input" style="padding:9px 10px">
              </div>
              <div>
                <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:5px;font-weight:600;letter-spacing:0.05em">TO DATE</label>
                <input type="date" id="event-to" class="api-key-input" style="padding:9px 10px">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end">
              <div>
                <label style="font-size:11px;color:var(--color-text-dim);display:block;margin-bottom:5px;font-weight:600;letter-spacing:0.05em">DEMAND BOOST</label>
                <select id="event-mult" class="api-key-input" style="padding:9px 10px">
                  <option value="1.1">+10% (Minor event)</option>
                  <option value="1.2">+20%</option>
                  <option value="1.3" selected>+30% (Local fair)</option>
                  <option value="1.4">+40%</option>
                  <option value="1.5">+50% (Big event)</option>
                  <option value="1.75">+75%</option>
                  <option value="2.0">+100% (Major festival)</option>
                </select>
              </div>
              <button class="btn btn-primary" onclick="addCustomEvent()" style="padding:9px 16px">
                + Add Event
              </button>
            </div>
          </div>
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
  renderCustomRules();
  loadCustomEventsList();
  loadMenuManagement();
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

  // Auto-retraining status display
  const cronEl = document.getElementById('auto-retrain-status-display');
  if (cronEl) {
    const lastPing = data.last_cron_ping
      ? new Date(data.last_cron_ping).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : 'No ping received yet';
      
    let statusHtml = `
      <div style="margin-bottom:6px">
        <strong>Last Cron Ping:</strong> 
        <span style="color: ${data.last_cron_ping ? 'var(--color-success)' : 'var(--color-text-muted)'}">${lastPing}</span>
      </div>
    `;
    
    if (data.last_retrain_time) {
      const lastTrain = new Date(data.last_retrain_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      const isSuccess = data.last_retrain_status === 'success';
      const statusColor = isSuccess ? 'var(--color-success)' : 'var(--color-danger)';
      const statusLabel = isSuccess ? '✅ Success' : '❌ Failed';
      
      statusHtml += `
        <div style="margin-bottom:6px">
          <strong>Cron Retrain Status:</strong> 
          <span style="color:${statusColor}; font-weight:600">${statusLabel}</span>
        </div>
        <div style="margin-bottom:6px">
          <strong>Last Cron Retrain:</strong> 
          <span>${lastTrain}</span>
        </div>
      `;
      
      if (!isSuccess && data.last_retrain_error) {
        statusHtml += `
          <div style="color:var(--color-danger); font-size:11px; margin-top:4px; padding:6px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:4px; word-break:break-all">
            <strong>Error:</strong> ${data.last_retrain_error}
          </div>
        `;
      }
    } else {
      statusHtml += `
        <div>
          <strong>Cron Retrain Status:</strong> <span style="color:var(--color-text-dim)">N/A</span>
        </div>
      `;
    }
    
    cronEl.innerHTML = statusHtml;
  }

  // Populate cron URL code
  const urlEl = document.getElementById('cron-url-code');
  if (urlEl && API.BASE_URL) {
    urlEl.textContent = `${API.BASE_URL}/settings/retrain?source=cron`;
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

// ── Custom Prediction Rules ────────────────────────────────────────────────────
const RULES_KEY = 'hotel_aditya_custom_rules';

function loadCustomRules() {
  try { return JSON.parse(localStorage.getItem(RULES_KEY) || '[]'); }
  catch { return []; }
}

function saveCustomRules(rules) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

function renderCustomRules() {
  const container = document.getElementById('custom-rules-list');
  if (!container) return;
  const rules = loadCustomRules();
  if (!rules.length) {
    container.innerHTML = `<div style="font-size:12px;color:var(--color-text-dim);padding:8px 0">No custom rules yet. Add one below.</div>`;
    return;
  }
  container.innerHTML = rules.map((r, i) => {
    const dayLabel  = r.day  || 'Every day';
    const catLabel  = r.category ? r.category.charAt(0).toUpperCase() + r.category.slice(1) : 'All items';
    const adjNum    = parseFloat(r.adjustment);
    const adjLabel  = adjNum >= 0 ? `+${Math.round(adjNum * 100)}%` : `${Math.round(adjNum * 100)}%`;
    const adjColor  = adjNum >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--color-surface-2);border-radius:var(--radius-md);margin-bottom:6px;border:1px solid var(--color-border)">
        <div style="font-size:13px;color:var(--color-text)">
          <span style="color:var(--color-text-muted)">${dayLabel}</span>
          <span style="margin:0 6px;color:var(--color-text-dim)">→</span>
          <span>${catLabel}</span>
          <span style="margin-left:10px;font-weight:700;color:${adjColor}">${adjLabel}</span>
        </div>
        <button onclick="deleteCustomRule(${i})" style="background:none;border:none;color:var(--color-text-dim);cursor:pointer;font-size:16px;padding:2px 6px" title="Delete rule">✕</button>
      </div>`;
  }).join('');
}

function addCustomRule() {
  const day      = document.getElementById('rule-day')?.value  || '';
  const category = document.getElementById('rule-cat')?.value  || '';
  const adj      = parseFloat(document.getElementById('rule-adj')?.value || '-0.4');
  const rules    = loadCustomRules();
  rules.push({ day, category, adjustment: adj });
  saveCustomRules(rules);
  renderCustomRules();
  showToast('Rule added — will apply to next recommendations', 'success');
}

function deleteCustomRule(index) {
  const rules = loadCustomRules();
  rules.splice(index, 1);
  saveCustomRules(rules);
  renderCustomRules();
  showToast('Rule removed', '');
}

// ── Custom Local Events ───────────────────────────────────────────────────────
async function loadCustomEventsList() {
  const container = document.getElementById('custom-events-list');
  if (!container) return;
  const res = await API.getCustomEvents();
  const events = res?.events || [];
  if (!events.length) {
    container.innerHTML = `<div style="font-size:12px;color:var(--color-text-dim);padding:8px 0">No custom events yet. Add one below.</div>`;
    return;
  }
  container.innerHTML = events.map(e => {
    const fromStr = new Date(e.date_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const toStr = new Date(e.date_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const boostStr = `+${Math.round((e.demand_multiplier - 1) * 100)}%`;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--color-surface-2);border-radius:var(--radius-md);margin-bottom:6px;border:1px solid var(--color-border)">
        <div style="font-size:13px;color:var(--color-text)">
          <strong style="color:var(--color-text)">${e.name}</strong>
          <span style="margin-left:8px;font-size:11px;color:var(--color-text-muted)">(${fromStr} - ${toStr})</span>
          <span style="margin-left:10px;font-weight:700;color:var(--color-success)">${boostStr}</span>
        </div>
        <button onclick="removeCustomEvent(${e.id})" style="background:none;border:none;color:var(--color-text-dim);cursor:pointer;font-size:16px;padding:2px 6px" title="Delete event">✕</button>
      </div>`;
  }).join('');
}

async function addCustomEvent() {
  const name = document.getElementById('event-name')?.value?.trim();
  const from = document.getElementById('event-from')?.value;
  const to   = document.getElementById('event-to')?.value;
  const mult = parseFloat(document.getElementById('event-mult')?.value || '1.3');

  if (!name || !from || !to) {
    showToast('Please fill out all event fields', 'error');
    return;
  }

  const result = await API.addCustomEvent(name, from, to, mult);
  if (result && result.ok) {
    showToast('Event added successfully', 'success');
    document.getElementById('event-name').value = '';
    document.getElementById('event-from').value = '';
    document.getElementById('event-to').value = '';
    loadCustomEventsList();
    // Bust dashboard cache to load new festival info
    if (window.memCache) delete window.memCache['dashboard'];
  } else {
    showToast('Failed to add event', 'error');
  }
}

async function removeCustomEvent(id) {
  const result = await API.deleteCustomEvent(id);
  if (result && result.ok) {
    showToast('Event removed', '');
    loadCustomEventsList();
    if (window.memCache) delete window.memCache['dashboard'];
  } else {
    showToast('Failed to remove event', 'error');
  }
}

// ── Menu Management ────────────────────────────────────────────────────────────
let _allCategories = [];  // cached for dropdowns

async function loadMenuManagement() {
  const container = document.getElementById('menu-category-list');
  if (!container) return;

  container.innerHTML = `<div style="font-size:12px;color:var(--color-text-dim);padding:6px 0">Loading categories…</div>`;

  const res = await API.getCategories();
  _allCategories = res.categories || [];

  if (!_allCategories.length) {
    container.innerHTML = `<div style="font-size:12px;color:var(--color-text-dim)">No categories found.</div>`;
    return;
  }

  // Populate rename dropdown and new-item category dropdown
  const catOptions = _allCategories.map(c =>
    `<option value="${c.category}">${c.category.replace(/_/g,' ')} (${c.item_count})</option>`
  ).join('');
  const renameSel = document.getElementById('rename-cat-old');
  const newItemSel = document.getElementById('new-item-category');
  if (renameSel) renameSel.innerHTML = catOptions;
  if (newItemSel) newItemSel.innerHTML = catOptions + `<option value="__new__">[Create New Category...]</option>`;

  // Render category accordion list
  container.innerHTML = _allCategories.map(c => `
    <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:6px;overflow:hidden">
      <div onclick="toggleCategoryExpand('${c.category}')"
           style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--color-surface-2);cursor:pointer;user-select:none">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:13px;font-weight:600;color:var(--color-text);text-transform:capitalize">${c.category.replace(/_/g,' ')}</span>
          <span style="font-size:11px;color:var(--color-text-dim);background:var(--color-surface-3);padding:2px 8px;border-radius:999px">${c.item_count} items</span>
        </div>
        <span id="cat-arrow-${c.category}" style="font-size:11px;color:var(--color-text-dim)">▼</span>
      </div>
      <div id="cat-items-${c.category}" style="display:none;padding:10px 14px;background:var(--color-surface)">
        <div id="cat-items-inner-${c.category}" style="font-size:12px;color:var(--color-text-dim)">Loading…</div>
      </div>
    </div>
  `).join('');
}

function handleNewItemCategoryChange(val) {
  const container = document.getElementById('new-item-category-custom-container');
  if (container) {
    container.style.display = (val === '__new__') ? 'block' : 'none';
  }
}

async function toggleCategoryExpand(category) {
  const panel = document.getElementById(`cat-items-${category}`);
  const arrow  = document.getElementById(`cat-arrow-${category}`);
  const inner  = document.getElementById(`cat-items-inner-${category}`);
  if (!panel) return;

  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
  if (isOpen) return;

  // Load items on first expand
  inner.innerHTML = `<span style="color:var(--color-text-dim)">Loading…</span>`;
  const res = await API.getMenuItems(category);
  const items = res.items || [];

  if (!items.length) {
    inner.innerHTML = `<span style="color:var(--color-text-dim)">No items in this category.</span>`;
    return;
  }

  const catOptions = _allCategories.map(c =>
    `<option value="${c.category}" ${c.category === category ? 'selected' : ''}>${c.category.replace(/_/g,' ')}</option>`
  ).join('');

  inner.innerHTML = items.map(item => {
    const safeName = item.item_name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const priceVal = item.unit_price != null ? item.unit_price : 0;
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-border);flex-wrap:wrap;gap:8px">
      <span style="font-size:13px;color:var(--color-text);min-width:140px;flex:1">${item.item_name}</span>
      <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
        <div style="display:flex;align-items:center;gap:3px">
          <span style="font-size:12px;color:var(--color-text-muted)">₹</span>
          <input type="number" value="${priceVal}" 
                 onchange="updateItemPriceAction('${safeName}', this.value)"
                 style="font-size:12px;padding:4px 6px;border-radius:6px;width:55px;background:var(--color-surface-3);border:1px solid var(--color-border);color:var(--color-text);text-align:right">
        </div>
        <select onchange="moveItemToCategory('${safeName}', this.value, '${category}')"
                style="font-size:12px;padding:4px 6px;border-radius:6px;background:var(--color-surface-2);border:1px solid var(--color-border);color:var(--color-text);cursor:pointer;max-width:110px">
          ${catOptions}
        </select>
        <button onclick="deleteMenuItemAction('${safeName}', '${category}')"
                style="background:none;border:none;color:var(--color-text-dim);cursor:pointer;font-size:14px;padding:2px 6px;display:flex;align-items:center;justify-content:center"
                title="Delete item">✕</button>
      </div>
    </div>`;
  }).join('');
}

async function moveItemToCategory(itemName, newCategory, currentCategory) {
  if (newCategory === currentCategory) return;
  const result = await API.updateItemCategory(itemName, newCategory);
  if (result && result.ok) {
    showToast(`"${itemName}" moved to ${newCategory.replace(/_/g,' ')}`, 'success');
    await loadMenuManagement();
  } else {
    showToast('Failed to move item', 'error');
  }
}

async function renameCategoryAction() {
  const oldCat = document.getElementById('rename-cat-old')?.value?.trim();
  const newCat = document.getElementById('rename-cat-new')?.value?.trim();
  if (!oldCat || !newCat) {
    showToast('Please select a category and enter a new name', 'error');
    return;
  }
  const result = await API.renameCategory(oldCat, newCat);
  if (result && result.ok) {
    showToast(`Renamed to "${result.new_category}" — ${result.items_updated} items updated`, 'success');
    document.getElementById('rename-cat-new').value = '';
    await loadMenuManagement();
  } else {
    showToast('Failed to rename category', 'error');
  }
}

async function addMenuItemAction() {
  const name     = document.getElementById('new-item-name')?.value?.trim();
  let category   = document.getElementById('new-item-category')?.value?.trim();
  const price    = parseFloat(document.getElementById('new-item-price')?.value || '0');
  if (category === '__new__') {
    category = document.getElementById('new-item-category-custom')?.value?.trim();
  }
  if (!name || !category) {
    showToast('Please enter an item name and select/enter a category', 'error');
    return;
  }
  const result = await API.addMenuItem(name, category, 0, price);
  if (result && result.ok) {
    showToast(`"${name}" added to ${category.replace(/_/g,' ')} (₹${price})`, 'success');
    document.getElementById('new-item-name').value = '';
    document.getElementById('new-item-price').value = '0';
    const customInput = document.getElementById('new-item-category-custom');
    if (customInput) customInput.value = '';
    const selectEl = document.getElementById('new-item-category');
    if (selectEl) selectEl.value = _allCategories[0]?.category || '';
    handleNewItemCategoryChange(selectEl.value);
    await loadMenuManagement();
  } else {
    showToast('Failed to add item — it may already exist', 'error');
  }
}

async function updateItemPriceAction(itemName, price) {
  const p = parseFloat(price);
  if (isNaN(p) || p < 0) {
    showToast('Please enter a valid non-negative price', 'error');
    return;
  }
  const result = await API.updateItemPrice(itemName, p);
  if (result && result.ok) {
    showToast(`✅ "${itemName}" price updated to ₹${p}`, 'success');
  } else {
    showToast('Failed to update price', 'error');
  }
}

async function deleteMenuItemAction(itemName, category) {
  if (!confirm(`Are you sure you want to delete "${itemName}" from the menu?`)) return;
  const result = await API.deleteMenuItem(itemName);
  if (result && result.ok) {
    showToast(`"${itemName}" deleted from menu`, 'success');
    await loadMenuManagement();
  } else {
    showToast('Failed to delete item', 'error');
  }
}

