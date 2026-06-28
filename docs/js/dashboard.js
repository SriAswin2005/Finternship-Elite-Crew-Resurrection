/* ═══════════════════════════════════════════════════════════
   dashboard.js — Screen 1 (2-panel responsive layout)
   ═══════════════════════════════════════════════════════════ */

let _revTrendChart = null;
let _topItemsChart = null;

function renderDashboard(container) {
  container.innerHTML = `
    <div class="screen">

      <!-- Weather Card -->
      <div class="weather-card" id="weather-card">
        <div class="weather-left">
          <div class="weather-icon" id="weather-icon">🌤️</div>
          <div>
            <div class="weather-temp" id="weather-temp">--°C</div>
            <div class="weather-desc" id="weather-desc">Loading weather...</div>
            <div class="weather-feels" id="weather-feels"></div>
          </div>
        </div>
        <div class="weather-tags" id="weather-tags"></div>
      </div>

      <!-- Festival Banner -->
      <div class="festival-banner hidden" id="festival-banner">
        🎉 <span id="festival-name">Festival</span>
      </div>

      <!-- Revenue Highlight -->
      <div class="revenue-highlight">
        <div class="rev-label">Today's Revenue ${infoTip('todayRevenue')}</div>
        <div class="rev-amount" id="rev-amount">₹ ---</div>
        <div class="rev-sub" id="rev-sub">Loading...</div>
      </div>

      <!-- Mini Stats Bar -->
      <div class="mini-bar">
        <div class="mini-stat">
          <div class="mini-stat-val" id="stat-units">---</div>
          <div class="mini-stat-lbl">Units Sold ${infoTip('todayUnits')}</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-val" id="stat-avg">---</div>
          <div class="mini-stat-lbl">Avg / Item ${infoTip('avgPerItem')}</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-val" id="stat-items">---</div>
          <div class="mini-stat-lbl">Active Items ${infoTip('activeItems')}</div>
        </div>
      </div>

      <!-- 2-Panel: Revenue Trend + Prediction Table -->
      <div class="dashboard-panels">

        <!-- Panel 1: Revenue Trend -->
        <div class="card panel-card">
          <div class="card-title">📈 Revenue Trend (14 days) ${infoTip('revenueTrend')}</div>
          <canvas id="revenue-trend-chart" height="200"></canvas>
          <div class="panel-remark" id="trend-remark">Loading trend data...</div>
        </div>

        <!-- Panel 2: Tomorrow's Predictions -->
        <div class="card panel-card">
          <div class="card-title">🔮 Tomorrow's Top Orders ${infoTip('tomorrowOrders')}</div>
          <div class="pred-table-wrap">
            <table class="pred-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty ${infoTip('recQty')}</th>
                  <th>Signal ${infoTip('recReason')}</th>
                </tr>
              </thead>
              <tbody id="pred-table-body">
                <tr>
                  <td colspan="3" style="text-align:center;padding:24px;color:var(--color-text-muted)">
                    Loading predictions...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="panel-remark" id="pred-remark">Loading...</div>
        </div>

      </div>

      <!-- Actual vs Predicted (bar chart) -->
      <div class="card chart-card">
        <div class="card-title">📊 Actual vs Predicted Today (Categories) ${infoTip('actualVsPred')}</div>
        <canvas id="top-items-chart" height="220"></canvas>
      </div>

      <!-- AI / Data Insights Section -->
      <div class="card" style="padding:16px;margin-bottom:16px">
        <div class="card-title" style="margin-bottom:12px;display:flex;align-items:center;gap:6px">
          <span>💡</span> <span>AI Kitchen & Sales Insights</span>
        </div>
        <div id="insights-container" style="display:flex;flex-direction:column;gap:10px">
          <div class="loading-spinner" style="padding:20px"></div>
        </div>
      </div>

      <div class="data-source" id="data-source-note">Connecting to backend...</div>
    </div>
  `;

  loadDashboardData();
}

// ── Main Data Loader ───────────────────────────────────────────────────────────
async function loadDashboardData() {
  const [summaryData, trendData] = await Promise.all([
    API.getDashboardSummary(),
    API.getRevenueTrend(14),
  ]);

  // Fill weather, revenue, mini stats, top items
  if (summaryData) fillSummary(summaryData);

  // Actual vs Predicted Chart
  const actualVsPredData = await API.getActualVsPredicted();
  if (actualVsPredData && actualVsPredData.categories?.length) {
    renderActualVsPredictedChart(actualVsPredData.categories);
  }

  // Revenue trend chart
  if (trendData) {
    renderRevenueTrend(trendData);
    const remark = generateTrendRemark(trendData);
    setEl('trend-remark', remark);
  }

  // Tomorrow's predictions
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const recData = await API.getRecommendations(tomorrowStr);
  const recs = recData?.recommendations || [];
  renderPredTable(recs);
  setEl('pred-remark', generatePredRemark(recs, tomorrowStr));

  // Load AI Kitchen insights
  loadDashboardInsights();
}

async function loadDashboardInsights() {
  const container = document.getElementById('insights-container');
  if (!container) return;

  container.innerHTML = `<div class="loading-spinner" style="padding:20px"></div>`;

  const res = await API.getInsights();
  const insights = res?.insights || [];

  if (!insights.length) {
    container.innerHTML = `
      <div style="font-size:12px;color:var(--color-text-dim);text-align:center;padding:12px">
        No insights available yet. Log more sales data to unlock trends!
      </div>`;
    return;
  }

  container.innerHTML = insights.map(ins => {
    let themeColor = 'var(--color-primary)';
    let bgLight = 'rgba(232, 83, 26, 0.06)';
    if (ins.color === 'success') {
      themeColor = 'var(--color-success)';
      bgLight = 'rgba(16, 185, 129, 0.06)';
    } else if (ins.color === 'warning') {
      themeColor = 'var(--color-warning)';
      bgLight = 'rgba(245, 158, 11, 0.06)';
    } else if (ins.color === 'danger') {
      themeColor = 'var(--color-danger)';
      bgLight = 'rgba(239, 68, 68, 0.06)';
    }

    const textHtml = ins.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return `
      <div class="card" style="padding:12px 14px;border-left:4px solid ${themeColor};background:${bgLight};margin-bottom:0;border-radius:var(--radius-sm)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px">
          <div style="font-size:13px;font-weight:700;color:var(--color-text)">${ins.title}</div>
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:${themeColor};background:var(--color-surface);padding:2px 8px;border-radius:4px">${ins.badge}</span>
        </div>
        <div style="font-size:12px;line-height:1.5;color:var(--color-text-muted)">
          ${textHtml}
        </div>
      </div>
    `;
  }).join('');
}

// ── Fill Summary Data ──────────────────────────────────────────────────────────
function fillSummary(data) {
  // Revenue
  const rev   = data.today_revenue || 0;
  const units = data.total_qty_sold || 0;
  // Show revenue if available; if qty logged but no revenue, show estimated note
  if (rev > 0) {
    setEl('rev-amount', '₹ ' + Math.round(rev).toLocaleString('en-IN'));
  } else if (units > 0) {
    setEl('rev-amount', units + ' units');
    // Update label to reflect units mode
    const lbl = document.querySelector('.rev-label');
    if (lbl) lbl.childNodes[0].textContent = 'Today\'s Sales ';
  } else {
    setEl('rev-amount', '₹ —');
  }
  setEl('rev-sub', units > 0 ? `${units} units sold today` : 'No sales logged yet — use Log Sales tab');
  setEl('stat-units', units > 0 ? units.toLocaleString('en-IN') : '—');
  setEl('stat-items', data.menu_items || data.top_items?.length || '—');
  const avgItem = (rev > 0 && units > 0) ? Math.round(rev / units) : 0;
  setEl('stat-avg', avgItem > 0 ? ('₹' + avgItem) : '—');

  // Weather card
  const w = data.weather || {};
  const ICONS = {
    Sunny: '☀️', Clear: '☀️',
    Rainy: '🌧️', Rain: '🌧️',
    Cloudy: '⛅', Clouds: '⛅',
    Thunderstorm: '⛈️',
    Drizzle: '🌦️',
    Misty: '🌫️', Hazy: '🌫️', Foggy: '🌫️', Haze: '🌫️',
    Smoky: '💨', Dusty: '🌪️',
  };
  setEl('weather-icon', ICONS[w.condition] || '🌤️');
  setEl('weather-temp', Math.round(w.max_temp || 36) + '°C');
  setEl('weather-desc', (w.condition || 'Sunny') + ' · Restaurant hours');
  if (w.feels_like) setEl('weather-feels', 'Feels like ' + Math.round(w.feels_like) + '°C at peak');

  const tagsEl = document.getElementById('weather-tags');
  if (tagsEl) {
    const tags = [];
    if ((w.max_temp || 0) >= 39) tags.push('<span class="weather-tag tag-hot">🔥 Very Hot</span>');
    else if ((w.max_temp || 0) >= 35) tags.push('<span class="weather-tag tag-hot">☀️ Hot</span>');
    if ((w.rainfall_mm || 0) > 2) tags.push('<span class="weather-tag tag-rain">🌧️ Rain</span>');
    else if (w.condition === 'Clear') tags.push('<span class="weather-tag tag-clear">✓ Clear</span>');
    if (w.feels_like) tags.push(`<span class="weather-tag tag-feels">${Math.round(w.feels_like)}°C feels</span>`);
    tagsEl.innerHTML = tags.join('');
  }

  // Festival banner
  const festEl = document.getElementById('festival-banner');
  if (festEl && data.festival_today) {
    setEl('festival-name', data.festival_today);
    festEl.classList.remove('hidden');
  }

  // Source note
  setEl('data-source-note', `📊 Data: Hotel Aditya Grand · ${new Date().toLocaleDateString('en-IN')}`);
}

// ── Trend Chart (Line) ─────────────────────────────────────────────────────────
function renderRevenueTrend(trendData) {
  const canvas = document.getElementById('revenue-trend-chart');
  if (!canvas || !trendData?.length) return;

  if (_revTrendChart) { _revTrendChart.destroy(); _revTrendChart = null; }

  const labels = trendData.map(d => {
    const dt = new Date(d.date + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });
  const values = trendData.map(d => d.revenue || 0);

  _revTrendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: values,
        borderColor: '#E8531A',
        backgroundColor: 'rgba(232,83,26,0.08)',
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#E8531A',
        pointBorderWidth: 0,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1A1A',
          borderColor: '#2A2A2A',
          borderWidth: 1,
          titleColor: '#F5F5F5',
          bodyColor: '#9B9B9B',
          callbacks: {
            label: ctx => '₹ ' + Math.round(ctx.raw).toLocaleString('en-IN')
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#2A2A2A' },
          ticks: { color: '#9B9B9B', font: { size: 10 }, maxRotation: 45 }
        },
        y: {
          grid: { color: '#2A2A2A' },
          ticks: {
            color: '#9B9B9B', font: { size: 10 },
            callback: v => '₹' + (v >= 1000 ? Math.round(v/1000) + 'k' : v)
          }
        }
      }
    }
  });
}

// ── Actual vs Predicted Chart (Grouped horizontal bar) ────────────────────────
function renderActualVsPredictedChart(categories) {
  const canvas = document.getElementById('top-items-chart');
  if (!canvas || !categories?.length) return;

  if (_topItemsChart) { _topItemsChart.destroy(); _topItemsChart = null; }

  // Filter out any zero actual and predicted
  let cats = categories.filter(c => c.actual_qty > 0 || c.predicted_qty > 0);
  
  // Sort by highest volume overall, take top 8
  cats.sort((a, b) => ((b.actual_qty + b.predicted_qty) - (a.actual_qty + a.predicted_qty)));
  const top8 = cats.slice(0, 8);

  // Distinct colors not used in the existing website elements
  // Primary site color is #E8531A (orange). 
  // Let's use Cyan and Indigo for comparison.
  const actualColor = '#06B6D4'; // Cyan-500
  const predColor = '#8B5CF6';   // Violet-500

  _topItemsChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: top8.map(i => i.category.charAt(0).toUpperCase() + i.category.slice(1)),
      datasets: [
        {
          label: 'Predicted Qty',
          data: top8.map(i => i.predicted_qty || 0),
          backgroundColor: predColor,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.8,
          categoryPercentage: 0.8
        },
        {
          label: 'Actual Qty',
          data: top8.map(i => i.actual_qty || 0),
          backgroundColor: actualColor,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.8,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { 
          display: true, 
          position: 'top', 
          labels: { color: '#9B9B9B', font: { size: 11 } } 
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          borderColor: '#2A2A2A',
          borderWidth: 1,
          titleColor: '#F5F5F5',
          bodyColor: '#9B9B9B',
        }
      },
      scales: {
        x: {
          grid: { color: '#2A2A2A' },
          ticks: { color: '#9B9B9B', font: { size: 10 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#F5F5F5', font: { size: 11, weight: '500' } }
        }
      }
    }
  });
}

// ── Prediction Table ───────────────────────────────────────────────────────────
function renderPredTable(recs) {
  const tbody = document.getElementById('pred-table-body');
  if (!tbody) return;

  const top15 = (recs || [])
    .sort((a, b) => (b.recommended_qty || 0) - (a.recommended_qty || 0))
    .slice(0, 15);

  if (!top15.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--color-text-muted)">
      No predictions yet — make sure backend is running</td></tr>`;
    return;
  }

  tbody.innerHTML = top15.map(r => `
    <tr>
      <td><div class="pred-item-name" title="${r.item_name}">${r.item_name}</div></td>
      <td><span class="pred-qty">${r.recommended_qty}</span></td>
      <td><div class="pred-signal" title="${r.reason || ''}">${r.reason || '—'}</div></td>
    </tr>
  `).join('');
}

// ── Remark Generators ──────────────────────────────────────────────────────────
function generateTrendRemark(trendData) {
  if (!trendData?.length) return '';
  const sorted = [...trendData].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  const best = sorted[0];
  const last7 = trendData.slice(-7);
  const avg7 = last7.reduce((s, d) => s + (d.revenue || 0), 0) / last7.length;
  const bestDate = new Date(best.date + 'T00:00:00')
    .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `Best: ${bestDate} · ₹${Math.round(best.revenue).toLocaleString('en-IN')} · 7-day avg: ₹${Math.round(avg7).toLocaleString('en-IN')}`;
}

function generatePredRemark(recs, tomorrowStr) {
  const dayName = new Date(tomorrowStr + 'T00:00:00')
    .toLocaleDateString('en-IN', { weekday: 'long' });
  if (!recs?.length) return `Predictions for ${dayName}`;
  const topCats = {};
  recs.forEach(r => { topCats[r.category] = (topCats[r.category] || 0) + (r.recommended_qty || 0); });
  const topCat = Object.entries(topCats).sort((a, b) => b[1] - a[1])[0];
  const total = recs.reduce((s, r) => s + (r.recommended_qty || 0), 0);
  return `${dayName} · Top: ${topCat ? topCat[0] : 'biryani'} · ~${total} total units expected`;
}
