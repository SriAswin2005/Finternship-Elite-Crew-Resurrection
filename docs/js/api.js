/* ═══════════════════════════════════════════════════════════
   api.js — Central API module for Hotel Aditya Grand POC
   All API calls go here. Mock fallback when server is offline.
   ═══════════════════════════════════════════════════════════ */

// Backend URL is set in js/config.js — edit that file after deploying your backend.
const BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : (window.BACKEND_URL || 'https://YOUR-RAILWAY-URL.up.railway.app');

const USE_MOCK = false;   // Set true to always use mock data

// ── Fetch wrapper with error handling ─────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const defaultHeaders = {};
    // Only set Content-Type for JSON bodies; let browser set it for FormData
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { ...defaultHeaders, ...(options.headers || {}) },
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API] Failed:', path, err.message);
    return null;
  }
}

// ── Mock Data (real Hotel Aditya Grand items from the CSV) ─────────────────────
const MOCK = {
  dashboard: {
    today_revenue: 51321,
    total_qty_sold: 492,
    top_items: [
      { item_name: 'Sp Chicken Biryani',    qty: 32 },
      { item_name: 'Cool Drink 250ml',      qty: 28 },
      { item_name: 'Butter Naan',           qty: 24 },
      { item_name: 'Roti',                  qty: 22 },
      { item_name: 'Chicken Dum Biryani',   qty: 18 },
    ],
    weather: { condition: 'Clear', max_temp: 38, min_temp: 30, rainfall_mm: 0 },
    upcoming_festival: null,
    revenue_trend: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
      revenue: 35000 + Math.random() * 55000
    }))
  },
  recommendations: {
    recommendations: [
      { item_name: 'Sp Chicken Biryani',        category: 'biryani',     recommended_qty: 35, reason: '↑ Sun peak day | ↑ Trending up recently' },
      { item_name: 'Chicken Dum Biryani',        category: 'biryani',     recommended_qty: 20, reason: '↑ Sun peak day' },
      { item_name: 'Chicken Fry Piece Biryani',  category: 'biryani',     recommended_qty: 15, reason: 'Based on 7-day average' },
      { item_name: 'Veg Biryani',                category: 'biryani',     recommended_qty: 8,  reason: 'Based on 7-day average' },
      { item_name: 'Chicken Lollypop 6pc',       category: 'chicken',     recommended_qty: 12, reason: '↑ Sun peak day' },
      { item_name: 'Chilli Chicken BL',          category: 'chicken',     recommended_qty: 8,  reason: 'Based on 7-day average' },
      { item_name: 'Butter Chicken BL',          category: 'chicken',     recommended_qty: 7,  reason: '↓ Trending down recently' },
      { item_name: 'Cool Drink 250ml',           category: 'beverage',    recommended_qty: 48, reason: '↑ Clear boosts this | ↑ Trending up recently' },
      { item_name: 'Mi.Water Lt',                category: 'beverage',    recommended_qty: 35, reason: '↑ Clear boosts this' },
      { item_name: 'Lassi Sweet',                category: 'beverage',    recommended_qty: 12, reason: '↑ Clear boosts this' },
      { item_name: 'Butter Naan',                category: 'bread',       recommended_qty: 32, reason: '↑ Sun peak day' },
      { item_name: 'Roti',                       category: 'bread',       recommended_qty: 28, reason: 'Based on 7-day average' },
      { item_name: 'Paneer',                     category: 'dairy',       recommended_qty: 25, reason: '↑ Sun peak day' },
      { item_name: 'Curd',                       category: 'dairy',       recommended_qty: 8,  reason: 'Based on 7-day average' },
      { item_name: 'Curd Rice',                  category: 'rice',        recommended_qty: 18, reason: '↑ Sun peak day' },
      { item_name: 'Plain Rice',                 category: 'rice',        recommended_qty: 15, reason: 'Based on 7-day average' },
      { item_name: 'Gobi',                       category: 'starter',     recommended_qty: 35, reason: '↑ Sun peak day' },
      { item_name: 'Chicken 65',                 category: 'starter',     recommended_qty: 10, reason: 'Based on 7-day average' },
      { item_name: 'Black Current Ice Cream',    category: 'ice_cream',   recommended_qty: 6,  reason: '↑ Clear boosts this' },
      { item_name: 'Vanilla Ice Cream',          category: 'ice_cream',   recommended_qty: 5,  reason: '↑ Clear boosts this' },
      { item_name: 'Prawns',                     category: 'seafood',     recommended_qty: 6,  reason: 'Based on 7-day average' },
      { item_name: 'Chicken Manchow Soup',       category: 'soup',        recommended_qty: 3,  reason: 'Based on 7-day average' },
      { item_name: 'Sp Family Pack',             category: 'family_pack', recommended_qty: 5,  reason: '↑ Sun peak day' },
      { item_name: 'Egg',                        category: 'egg',         recommended_qty: 4,  reason: 'Based on 7-day average' },
    ]
  },
  items: [
    { item_name: 'Sp Chicken Biryani',       category: 'biryani',     avg_qty: 26 },
    { item_name: 'Chicken Dum Biryani',      category: 'biryani',     avg_qty: 13 },
    { item_name: 'Veg Biryani',              category: 'biryani',     avg_qty: 4  },
    { item_name: 'Cool Drink 250ml',         category: 'beverage',    avg_qty: 32 },
    { item_name: 'Mi.Water Lt',              category: 'beverage',    avg_qty: 40 },
    { item_name: 'Lassi Sweet',              category: 'beverage',    avg_qty: 8  },
    { item_name: 'Butter Naan',              category: 'bread',       avg_qty: 28 },
    { item_name: 'Roti',                     category: 'bread',       avg_qty: 26 },
    { item_name: 'Pulka',                    category: 'bread',       avg_qty: 22 },
    { item_name: 'Paneer',                   category: 'dairy',       avg_qty: 48 },
    { item_name: 'Curd',                     category: 'dairy',       avg_qty: 6  },
    { item_name: 'Chicken Lollypop 6pc',     category: 'chicken',     avg_qty: 8  },
    { item_name: 'Chilli Chicken BL',        category: 'chicken',     avg_qty: 6  },
    { item_name: 'Gobi',                     category: 'starter',     avg_qty: 20 },
    { item_name: 'Curd Rice',                category: 'rice',        avg_qty: 12 },
    { item_name: 'Plain Rice',               category: 'rice',        avg_qty: 13 },
    { item_name: 'Black Current Ice Cream',  category: 'ice_cream',   avg_qty: 3  },
    { item_name: 'Prawns',                   category: 'seafood',     avg_qty: 4  },
    { item_name: 'Sp Family Pack',           category: 'family_pack', avg_qty: 4  },
    { item_name: 'Egg',                      category: 'egg',         avg_qty: 4  },
    { item_name: 'Chicken Manchow Soup',     category: 'soup',        avg_qty: 2  },
    { item_name: 'Mushroom',                 category: 'other',       avg_qty: 3  },
  ],
  trends: {
    revenue: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      revenue: 28000 + Math.sin(i * 0.8) * 15000 + Math.random() * 18000
    })),
    categories: [
      { category: 'biryani',     revenue: 894512, qty: 3408 },
      { category: 'beverage',    revenue: 103255, qty: 5335 },
      { category: 'bread',       revenue: 126080, qty: 3025 },
      { category: 'dairy',       revenue: 59241,  qty: 2611 },
      { category: 'chicken',     revenue: 481033, qty: 1691 },
      { category: 'other',       revenue: 206920, qty: 2866 },
      { category: 'starter',     revenue: 77450,  qty: 1253 },
      { category: 'rice',        revenue: 80656,  qty: 737  },
      { category: 'ice_cream',   revenue: 49750,  qty: 406  },
      { category: 'seafood',     revenue: 70181,  qty: 388  },
      { category: 'family_pack', revenue: 147685, qty: 263  },
    ]
  },
  settings: {
    openweather_key_set: false,
    weather_source: 'mock',
    model_info: {
      trained_at: null,
      mae: null,
      n_items: 0,
      model_type: 'LightGBM (not yet trained)'
    },
    db_stats: {
      total_rows: 3521,
      date_range: '2026-04-01 to 2026-05-15',
      menu_items: 223
    }
  }
};

// ── API Functions ─────────────────────────────────────────────────────────────
window.memCache = {}; // Global memory cache to prevent refetching on tab switch

const API = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboardSummary: async () => {
    if (USE_MOCK) return MOCK.dashboard;
    if (window.memCache['dashboard']) return window.memCache['dashboard'];
    const data = await apiFetch('/dashboard/summary');
    if (data) window.memCache['dashboard'] = data;
    return data || MOCK.dashboard;
  },

  getRevenueTrend: async (days = 30) => {
    if (USE_MOCK) return MOCK.trends.revenue;
    const key = `rev_trend_${days}`;
    if (window.memCache[key]) return window.memCache[key];
    const data = await apiFetch(`/dashboard/revenue-trend?days=${days}`);
    const result = data?.series || MOCK.trends.revenue;
    if (data) window.memCache[key] = result;
    return result;
  },

  // ── Items ──────────────────────────────────────────────────────────────────
  getAllItems: async () => {
    if (USE_MOCK) return MOCK.items;
    if (window.memCache['all_items']) return window.memCache['all_items'];
    const data = await apiFetch('/items/');
    // API returns {count: N, items: [...]} — extract the array
    const result = data?.items || data || MOCK.items;
    if (result && Array.isArray(result)) window.memCache['all_items'] = result;
    return result;
  },

  getSalesByDate: async (date) => {
    if (USE_MOCK) return [];
    const data = await apiFetch(`/sales/?date=${date}`);
    // API returns {count: N, sales: [...]} — extract the array
    return data?.sales || [];
  },

  logSales: async (entries) => {
    if (USE_MOCK) return { success: true };
    // Backend expects a JSON array of SaleEntry objects directly
    const data = await apiFetch('/sales/log', {
      method: 'POST',
      body: JSON.stringify(entries)
    });
    // Clear cache after logging new sales so next tabs refresh data
    window.memCache = {};
    return data;
  },

  getItemTrend: async (item, days = 30) => {
    if (USE_MOCK) return null;
    const data = await apiFetch(`/sales/trends?item=${encodeURIComponent(item)}&days=${days}`);
    return data;
  },

  getCategoryTrends: async () => {
    if (USE_MOCK) return MOCK.trends.categories;
    if (window.memCache['cat_trends']) return window.memCache['cat_trends'];
    const data = await apiFetch('/dashboard/category-trends');
    const result = data?.categories || MOCK.trends.categories;
    if (data) window.memCache['cat_trends'] = result;
    return result;
  },

  // ── Recommendations ────────────────────────────────────────────────────────
  getRecommendations: async (date) => {
    if (USE_MOCK) return MOCK.recommendations;
    const key = `recs_${date}`;
    if (window.memCache[key]) return window.memCache[key];
    const data = await apiFetch(`/recommendations/?date=${date}`);
    if (data) window.memCache[key] = data;
    return data || MOCK.recommendations;
  },

  getRecommendationContext: async (date) => {
    if (USE_MOCK) return { weather: MOCK.dashboard.weather, festival_today: null };
    const data = await apiFetch(`/recommendations/context?date=${date}`);
    return data;
  },

  overrideRecommendation: async (item_name, date, qty) => {
    if (USE_MOCK) return { success: true };
    return await apiFetch('/recommendations/override', {
      method: 'PUT',
      body: JSON.stringify({ item_name, date, merchant_qty: qty })
    });
  },

  getAccuracy: async () => {
    if (USE_MOCK) return null;
    return await apiFetch('/recommendations/accuracy');
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings: async () => {
    if (USE_MOCK) return MOCK.settings;
    const data = await apiFetch('/settings/');
    return data || MOCK.settings;
  },

  saveSettings: async (body) => {
    if (USE_MOCK) return { status: 'saved' };
    return await apiFetch('/settings/', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  retrainModel: async () => {
    if (USE_MOCK) return { status: 'training_started' };
    return await apiFetch('/settings/retrain', { method: 'POST' });
  },

  refreshWeather: async () => {
    if (USE_MOCK) return { status: 'refreshed' };
    const data = await apiFetch('/settings/refresh-weather', { method: 'POST' });
    // Clear dashboard and weather cache so next load gets fresh data
    if (data && window.memCache) {
      delete window.memCache['dashboard'];
      delete window.memCache['weather'];
    }
    return data;
  },

  getActualVsPredicted: async () => {
    if (window.memCache && window.memCache['dashboard_actual_vs_pred']) {
      return window.memCache['dashboard_actual_vs_pred'];
    }
    const data = await apiFetch('/dashboard/actual-vs-predicted');
    if (data && window.memCache) window.memCache['dashboard_actual_vs_pred'] = data;
    return data;
  }
};

// ── LocalStorage cache helpers ─────────────────────────────────────────────────
const Cache = {
  set: (key, data, ttlMin = 30) => {
    localStorage.setItem(key, JSON.stringify({ data, exp: Date.now() + ttlMin * 60000 }));
  },
  get: (key) => {
    try {
      const item = JSON.parse(localStorage.getItem(key));
      if (item && item.exp > Date.now()) return item.data;
    } catch {}
    return null;
  },
  clear: (key) => localStorage.removeItem(key)
};
