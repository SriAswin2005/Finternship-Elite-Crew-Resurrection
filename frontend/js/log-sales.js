/* ═══════════════════════════════════════════════════════════
   log-sales.js — Screen 3 (with PDF Upload + SSE progress)
   ═══════════════════════════════════════════════════════════ */

let _allItems = [];
let _logDate  = '';

// Reset cache whenever this screen is freshly loaded
function _resetLogSalesState() {
  _allItems = [];
  _logDate  = new Date().toISOString().split('T')[0];
}

// Store upload progress so it survives tab switches
let _uploadState = { isUploading: false, msg: '', progress: 0 };

function renderLogSales(container) {
  // Always compute today fresh using local time
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  _resetLogSalesState();
  _logDate = today;

  container.innerHTML = `
    <div class="screen">

      <!-- PDF Upload Section -->
      <div class="pdf-upload-section">
        <div class="pdf-upload-area" id="pdf-drop-zone"
             onclick="document.getElementById('pdf-file-input').click()">
          <div style="font-size:28px;margin-bottom:6px">📄</div>
          <div style="font-size:13px;font-weight:600;color:var(--color-text)">Upload PDF Sales Report</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:3px">
            Click or drag &amp; drop a daily sales PDF
          </div>
        </div>
        <input type="file" id="pdf-file-input" accept=".pdf" style="display:none"
               onchange="handlePdfUpload(this.files[0])">

        <!-- OCR Progress (hidden until upload) -->
        <div id="ocr-progress-area" style="display:none;margin-top:8px" class="card">
          <div style="padding:12px 14px">
            <div id="ocr-status-msg"
                 style="font-size:13px;color:var(--color-text-muted);margin-bottom:8px">
              Initializing...
            </div>
            <div class="ocr-progress">
              <div class="ocr-progress-bar" id="ocr-progress-bar" style="width:0%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Header row -->
      <div class="screen-title-row">
        <div class="screen-title">Log Sales ${infoTip('logDate')}</div>
        <input type="date" id="log-date" class="input-field" value="${today}"
               style="max-width:150px; font-size:13px; padding:8px 10px;">
      </div>

      <!-- Info card -->
      <div class="card" style="padding:12px 14px; margin-bottom:12px; font-size:13px; color:var(--color-text-muted); line-height:1.5;">
        Enter how many units of each item were sold today. Only fill items actually sold.
        Or upload a PDF above to auto-fill from a sales report.
      </div>

      <!-- Search -->
      <div class="search-row">
        <input type="text" id="item-search" class="input-field"
               placeholder="🔍 Search items...">
      </div>

      <!-- Category filter tabs -->
      <div class="tab-row" id="cat-tabs" style="margin-bottom:12px;">
        <button class="tab-btn active" onclick="filterCat('all', this)">All</button>
        <button class="tab-btn" onclick="filterCat('biryani', this)">🍛 Biryani</button>
        <button class="tab-btn" onclick="filterCat('chicken', this)">🍗 Chicken</button>
        <button class="tab-btn" onclick="filterCat('beverage', this)">🥤 Beverages</button>
        <button class="tab-btn" onclick="filterCat('bread', this)">🫓 Breads</button>
        <button class="tab-btn" onclick="filterCat('dairy', this)">🧀 Dairy</button>
        <button class="tab-btn" onclick="filterCat('starter', this)">🍟 Starters</button>
        <button class="tab-btn" onclick="filterCat('rice', this)">🍚 Rice</button>
        <button class="tab-btn" onclick="filterCat('ice_cream', this)">🍦 Ice Cream</button>
      </div>

      <!-- Items form -->
      <div id="sales-form" class="sales-form-wrap">
        <div class="loading-spinner"></div>
      </div>

      <!-- Save Button -->
      <div class="sticky-footer">
        <button class="btn btn-primary btn-full" id="save-sales-btn" onclick="saveSales()">
          💾 Save Sales Data
        </button>
      </div>
    </div>
  `;

  // Date change listener
  document.getElementById('log-date').addEventListener('change', (e) => {
    _logDate = e.target.value;
    _allItems = []; // force re-fetch items on date change too
    loadSalesForm(e.target.value);
  });

  // Search listener
  document.getElementById('item-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.sales-item-row').forEach(row => {
      const name = row.dataset.item?.toLowerCase() || '';
      const cat  = row.dataset.cat?.toLowerCase() || '';
      row.style.display = name.includes(q) || cat.includes(q) ? 'flex' : 'none';
    });
  });

  // PDF drag-and-drop
  const dropZone = document.getElementById('pdf-drop-zone');
  if (dropZone) {
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handlePdfUpload(file);
    });
  }

  // Restore upload progress state if currently uploading
  if (_uploadState.isUploading) {
    const pArea = document.getElementById('ocr-progress-area');
    const pMsg  = document.getElementById('ocr-status-msg');
    const pBar  = document.getElementById('ocr-progress-bar');
    if (pArea) pArea.style.display = 'block';
    if (pMsg)  pMsg.textContent = _uploadState.msg;
    if (pBar)  pBar.style.width = _uploadState.progress + '%';
  }

  loadSalesForm(today);
}

// ── PDF Upload with SSE Progress ───────────────────────────────────────────────
async function handlePdfUpload(file) {
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Please select a PDF file', 'error');
    return;
  }

  const progressArea = document.getElementById('ocr-progress-area');
  const statusMsg    = document.getElementById('ocr-status-msg');
  const progressBar  = document.getElementById('ocr-progress-bar');
  if (!progressArea) return;

  progressArea.style.display = 'block';
  statusMsg.textContent = '📤 Uploading PDF...';
  progressBar.style.width = '5%';

  _uploadState = { isUploading: true, msg: '📤 Uploading PDF...', progress: 5 };

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${BASE_URL}/sales/upload-pdf`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.msg) {
            statusMsg.textContent = evt.msg;
            _uploadState.msg = evt.msg;
          }
          if (evt.progress !== undefined) {
            progressBar.style.width = evt.progress + '%';
            _uploadState.progress = evt.progress;
          }

          // Show detected date and sync the date picker
          if (evt.status === 'date') {
            const dateMatch = evt.msg.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              const detectedDate = dateMatch[1];
              _logDate = detectedDate;
              const datePicker = document.getElementById('log-date');
              if (datePicker) datePicker.value = detectedDate;
              // Show a note below the progress bar
              let dateNote = document.getElementById('ocr-date-note');
              if (!dateNote) {
                dateNote = document.createElement('div');
                dateNote.id = 'ocr-date-note';
                dateNote.style.cssText = 'font-size:12px;color:var(--color-text-muted);margin-top:6px;padding:0 14px 10px';
                progressArea.appendChild(dateNote);
              }
              dateNote.innerHTML = `📅 Sale date from filename: <strong style="color:var(--color-text)">${detectedDate}</strong> — data will be saved/updated for this date`;
            }
          }

          if (evt.status === 'done') {
            progressBar.style.width = '100%';
            _uploadState.progress = 100;
            showToast(evt.msg, 'success');
            setTimeout(() => {
              progressArea.style.display = 'none';
              progressBar.style.width = '0%';
              const dateNote = document.getElementById('ocr-date-note');
              if (dateNote) dateNote.remove();
              _uploadState = { isUploading: false, msg: '', progress: 0 };
              window.memCache = {}; // Clear cache so new data is fetched
              loadSalesForm(_logDate);
            }, 2500);
          } else if (evt.status === 'error') {
            showToast(evt.msg || 'Upload failed', 'error');
            progressArea.style.display = 'none';
            const dateNote = document.getElementById('ocr-date-note');
            if (dateNote) dateNote.remove();
            _uploadState = { isUploading: false, msg: '', progress: 0 };
          }
        } catch (e) { /* ignore parse errors */ }
      }
    }
  } catch (err) {
    showToast('Upload failed — is backend running?', 'error');
    progressArea.style.display = 'none';
    _uploadState = { isUploading: false, msg: '', progress: 0 };
  }
}

// ── Load Sales Form ────────────────────────────────────────────────────────────
async function loadSalesForm(dateStr) {
  const formEl = document.getElementById('sales-form');
  if (!formEl) return;
  formEl.innerHTML = '<div class="loading-spinner"></div>';

  // Always re-fetch items (clear stale cache for this screen)
  let items = _allItems;
  if (!items || !items.length) {
    const fetched = await API.getAllItems();
    // getAllItems returns the array directly (after our api.js fix)
    items = Array.isArray(fetched) ? fetched : (fetched?.items || []);
    _allItems = items;
  }

  // getSalesByDate now returns the .sales array directly
  const existingSales = await API.getSalesByDate(dateStr);
  const existing = Array.isArray(existingSales) ? existingSales : [];
  const existingMap = {};
  existing.forEach(s => { existingMap[s.item_name] = s.qty_sold; });

  items.sort((a, b) => {
    const aHas = existingMap[a.item_name] ? 1 : 0;
    const bHas = existingMap[b.item_name] ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    return (b.avg_qty || 0) - (a.avg_qty || 0);
  });

  if (!items.length) {
    formEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        No items found. Check if backend is running at <code>localhost:8000</code>.
      </div>`;
    return;
  }

  const rows = items.map(item => {
    const val = existingMap[item.item_name] || 0;
    const cat = item.category || 'other';
    return `
      <div class="sales-item-row" data-item="${item.item_name}" data-cat="${cat}">
        <div class="sales-item-name">${item.item_name}</div>
        <div class="qty-stepper compact">
          <button class="stepper-btn sm" onclick="adjustQty(this, -1)">−</button>
          <input type="number" class="qty-input" data-item="${item.item_name}"
                 value="${val}" min="0" step="1">
          <button class="stepper-btn sm" onclick="adjustQty(this, 1)">+</button>
        </div>
      </div>`;
  }).join('');

  formEl.innerHTML = rows;
}

// ── Adjust Quantity ────────────────────────────────────────────────────────────
function adjustQty(btn, delta) {
  const input = delta === -1 ? btn.nextElementSibling : btn.previousElementSibling;
  if (!input) return;
  const val = Math.max(0, (parseInt(input.value) || 0) + delta);
  input.value = val;
  input.style.borderColor = val > 0 ? 'var(--color-primary)' : '';
  input.style.color = val > 0 ? 'var(--color-primary)' : '';
}

// ── Category Filter ────────────────────────────────────────────────────────────
function filterCat(cat, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.sales-item-row').forEach(row => {
    row.style.display = (cat === 'all' || row.dataset.cat === cat) ? 'flex' : 'none';
  });
}

// ── Save Sales ─────────────────────────────────────────────────────────────────
async function saveSales() {
  const btn  = document.getElementById('save-sales-btn');
  const date = document.getElementById('log-date')?.value || _logDate;

  const inputs  = document.querySelectorAll('.qty-input');
  const entries = [];
  inputs.forEach(input => {
    const qty = parseInt(input.value) || 0;
    if (qty > 0) entries.push({ date, item_name: input.dataset.item, qty_sold: qty });
  });

  if (entries.length === 0) {
    showToast('No quantities entered!', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Saving...';

  // Backend expects: List[SaleEntry] = [{date, item_name, qty_sold}, ...]
  // entries[] already has {date, item_name, qty_sold} — send array directly
  const result = await API.logSales(entries);

  if (result) {
    btn.textContent = '✅ Saved!';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-success');
    showToast(`Saved ${entries.length} items for ${date}`, 'success');
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 Save Sales Data';
      btn.classList.remove('btn-success');
      btn.classList.add('btn-primary');
    }, 2500);
  } else {
    btn.disabled = false;
    btn.textContent = '💾 Save Sales Data';
    showToast('Backend offline — data not saved', 'error');
  }
}
