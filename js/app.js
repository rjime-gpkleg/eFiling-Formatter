// js/app.js — 1042-S Formatter App Logic
'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let csvHeaders   = [];   // string[]
let csvRows      = [];   // string[][] (data rows, no header)
let mapping      = {};   // { colLetter: headerIndex | -1 }
let staticValues = {};   // { colLetter: string } — user-typed fixed values
let validated    = [];   // per-row error maps: { colLetter: errorString }
let activePreset = null; // currently applied PRESETS entry (or null)
let allParsed    = [];   // all rows from parseCSV (before header row split)

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip BOM
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i += 2; }
      else if (c === '"')                 { inQ = false; i++; }
      else                                { field += c; i++; }
    } else {
      if (c === '"')  { inQ = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\r' && text[i+1] === '\n') { row.push(field); rows.push(row); row=[]; field=''; i+=2; }
      else if (c === '\n' || c === '\r')  { row.push(field); rows.push(row); row=[]; field=''; i++; }
      else { field += c; i++; }
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  while (rows.length && rows[rows.length-1].every(c => c.trim() === '')) rows.pop();
  return rows;
}

// Apply header row offset: row N (1-indexed) becomes the header
function applyHeaderRow(parsed, headerRowNum) {
  const idx = Math.max(0, headerRowNum - 1);
  if (idx >= parsed.length) return { headers: [], rows: [] };
  return {
    headers: parsed[idx],
    rows:    parsed.slice(idx + 1),
  };
}

// ─── CSV Serializer ───────────────────────────────────────────────────────────
function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCSV(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
}

// ─── Auto-map heuristic ───────────────────────────────────────────────────────
function normalize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}
function autoMap(headers) {
  const result = {};
  const used   = new Set();
  for (const col of SCHEMA_COLUMNS) {
    result[col.col] = -1;
    const nName = normalize(col.name);
    let best = -1, bestScore = 0;
    headers.forEach((h, i) => {
      if (used.has(i)) return;
      const nH = normalize(h);
      if (nH === nName) { best = i; bestScore = 100; return; }
      const nameWords = nName.split(' ').filter(w => w.length > 2);
      const hits = nameWords.filter(w => nH.includes(w)).length;
      const score = nameWords.length ? (hits / nameWords.length) * 80 : 0;
      if (score > bestScore && score >= 40) { best = i; bestScore = score; }
    });
    if (best !== -1) { result[col.col] = best; used.add(best); }
  }
  return result;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function buildRowObj(rowArr) {
  const obj = {};
  for (const col of SCHEMA_COLUMNS) {
    const idx = mapping[col.col] ?? -1;
    if (idx >= 0) {
      obj[col.col] = rowArr[idx] ?? '';
    } else if (staticValues[col.col] && staticValues[col.col].trim() !== '') {
      obj[col.col] = staticValues[col.col];
    } else {
      obj[col.col] = '';
    }
  }
  // Apply preset defaults for still-empty fields
  if (activePreset?.defaults) {
    for (const [col, val] of Object.entries(activePreset.defaults)) {
      if (!obj[col] || obj[col].trim() === '') obj[col] = val;
    }
  }
  return obj;
}

function validateAll() {
  validated = csvRows.map(rowArr => {
    const rowObj = buildRowObj(rowArr);
    const errors = {};
    for (const col of SCHEMA_COLUMNS) {
      const v = rowObj[col.col];
      try {
        const err = col.validate(v, rowObj);
        if (err) errors[col.col] = err;
      } catch(e) { /* ignore */ }
    }
    return errors;
  });
  return validated;
}

function totalErrors() {
  return validated.reduce((sum, e) => sum + Object.keys(e).length, 0);
}

// ─── Export corrected CSV ─────────────────────────────────────────────────────
function buildCorrectedCSV() {
  const header = SCHEMA_COLUMNS.map(c => c.name);
  const dataRows = csvRows.map(rowArr => {
    const rowObj = buildRowObj(rowArr);
    return SCHEMA_COLUMNS.map(col => {
      let v = rowObj[col.col];
      try { v = col.autofix(v, rowObj) ?? v; } catch(e) { /* keep original */ }
      return v ?? '';
    });
  });
  return toCSV([header, ...dataRows]);
}

// ─── Step navigation ──────────────────────────────────────────────────────────
function goStep(n) {
  document.querySelectorAll('.step-panel').forEach((p, i) => {
    p.classList.toggle('active', i+1 === n);
  });
  document.querySelectorAll('.stepper-item').forEach((s, i) => {
    s.classList.toggle('active',    i+1 === n);
    s.classList.toggle('completed', i+1 < n);
  });
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────
function initUpload() {
  const zone    = document.getElementById('dropzone');
  const input   = document.getElementById('fileInput');
  const info    = document.getElementById('fileInfo');
  const btnNext = document.getElementById('btn-upload-next');
  const hdrInput = document.getElementById('headerRowNum');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => handleFile(input.files[0]));

  // Preset selector auto-fills header row
  const presetSel = document.getElementById('presetSelect');
  if (presetSel) {
    presetSel.addEventListener('change', () => {
      const p = PRESETS.find(p => p.id === presetSel.value);
      if (p?.suggestedHeaderRow) hdrInput.value = p.suggestedHeaderRow;
      else hdrInput.value = 1;
    });
  }

  btnNext.addEventListener('click', () => {
    // Re-apply the header row at step transition so the current input value is always used
    if (allParsed.length) {
      const hRow = parseInt(hdrInput?.value) || 1;
      const { headers, rows } = applyHeaderRow(allParsed, hRow);
      if (rows.length) { csvHeaders = headers; csvRows = rows; }
    }
    // Apply selected preset (if any) before building mapping UI
    const presetId = presetSel?.value;
    activePreset = PRESETS.find(p => p.id === presetId) ?? null;
    if (activePreset) {
      mapping = resolvePreset(activePreset, csvHeaders);
    }
    buildMappingUI();
    goStep(2);
  });

  function applyParsed(file) {
    const hRow = parseInt(hdrInput?.value) || 1;
    const { headers, rows } = applyHeaderRow(allParsed, hRow);
    if (rows.length < 1) { showMsg(info, 'No data rows found after the header row.', 'error'); return; }
    csvHeaders = headers;
    csvRows    = rows;
    mapping    = autoMap(csvHeaders);
    showMsg(info, `✓ Loaded: ${file.name} — ${csvRows.length} data row(s), ${csvHeaders.length} column(s)`, 'success');
    btnNext.disabled = false;
  }

  function handleFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith('.xls') || name.endsWith('.xlsx');
    const isCsv   = name.endsWith('.csv');
    if (!isExcel && !isCsv) {
      showMsg(info, 'Please upload a .csv, .xls, or .xlsx file.', 'error'); return;
    }

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = e => {
        allParsed = parseCSV(e.target.result);
        applyParsed(file);
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = e => {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheetName = wb.SheetNames.find(n => n.trim() === 'IRS-1042S') ?? wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
        allParsed = raw.map(r => Array.isArray(r) ? r.map(c => String(c ?? '')) : []);
        applyParsed(file);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  // Allow re-parsing if header row changes after file load (fires on spinner clicks too)
  if (hdrInput) {
    hdrInput.addEventListener('input', () => {
      if (!allParsed.length) return;
      const hRow = parseInt(hdrInput.value) || 1;
      const { headers, rows } = applyHeaderRow(allParsed, hRow);
      if (!rows.length) return;
      csvHeaders = headers;
      csvRows    = rows;
      mapping    = autoMap(csvHeaders);
      const info = document.getElementById('fileInfo');
      if (info.classList.contains('success')) {
        info.textContent = info.textContent.replace(/\d+ data row\(s\), \d+ column\(s\)/, `${csvRows.length} data row(s), ${csvHeaders.length} column(s)`);
      }
    });
  }
}

// ─── Step 2: Mapping UI ───────────────────────────────────────────────────────
const GROUPS_ORDER = ['Withholding Agent','Form ID','Recipient','Income & Tax','Primary WA','Intermediary','Payer','State Filing'];

function buildMappingUI() {
  const container = document.getElementById('mappingContainer');
  container.innerHTML = '';

  // Show preset notes banner if a preset is active
  if (activePreset) {
    const banner = document.createElement('div');
    banner.className = 'preset-banner';
    banner.innerHTML = `<strong>Preset applied: ${escHtml(activePreset.name)}</strong>
      <ul>${activePreset.notes.map(n => `<li>${escHtml(n)}</li>`).join('')}</ul>`;
    container.appendChild(banner);
  }

  const groups = {};
  for (const col of SCHEMA_COLUMNS) {
    if (!groups[col.group]) groups[col.group] = [];
    groups[col.group].push(col);
  }

  const optionsHtml = `<option value="-1">— not mapped —</option>` +
    csvHeaders.map((h, i) => `<option value="${i}">${escHtml(h)}</option>`).join('');

  // Groups that contain at least one required field — open by default
  const REQUIRED_GROUPS = new Set(SCHEMA_COLUMNS.filter(c => c.required).map(c => c.group));

  for (const groupName of GROUPS_ORDER) {
    const cols = groups[groupName];
    if (!cols) continue;

    const section = document.createElement('details');
    section.open = REQUIRED_GROUPS.has(groupName);
    section.className = 'mapping-group';

    // Count mapped columns for summary badge
    const mappedCount = cols.filter(c => (mapping[c.col] ?? -1) >= 0).length;
    const reqCount    = cols.filter(c => c.required).length;
    const summary = document.createElement('summary');
    summary.innerHTML = `${escHtml(groupName)}
      <span class="group-meta">${reqCount > 0 ? `${reqCount} required · ` : ''}${cols.length} fields · ${mappedCount} mapped</span>`;
    section.appendChild(summary);

    const table = document.createElement('table');
    table.className = 'mapping-table';
    table.innerHTML = `<thead><tr><th>Col</th><th>Template Field</th><th>Req</th><th>Your Column &nbsp;·&nbsp; <span style="font-weight:400;color:#7c3aed">Fixed Value</span></th></tr></thead>`;
    const tbody = document.createElement('tbody');

    // Sort: required fields first, then optional
    const sorted = [...cols].sort((a, b) => {
      if (a.required === b.required) return 0;
      return a.required ? -1 : 1;
    });

    let dividerAdded = false;
    const hasRequired = sorted.some(c => c.required);
    const hasOptional = sorted.some(c => !c.required);

    for (const col of sorted) {
      // Insert divider between required and optional
      if (!dividerAdded && !col.required && hasRequired && hasOptional) {
        const divRow = document.createElement('tr');
        divRow.className = 'opt-divider';
        divRow.innerHTML = `<td colspan="4"><span>Optional fields</span></td>`;
        tbody.appendChild(divRow);
        dividerAdded = true;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="col-letter">${col.col}</td>
        <td class="col-name">${escHtml(col.name)}</td>
        <td class="col-req">${col.required ? '<span class="req-badge">*</span>' : ''}</td>
        <td class="col-input-cell">
          <select data-col="${col.col}" class="col-select">${optionsHtml}</select>
          <input type="text" class="col-static" data-col="${col.col}"
            placeholder="or type fixed value…"
            value="${escHtml(staticValues[col.col] ?? '')}">
        </td>`;
      tbody.appendChild(tr);

      const select = tr.querySelector('select');
      const staticInput = tr.querySelector('.col-static');
      select.value = mapping[col.col] ?? -1;
      if (activePreset && mapping[col.col] >= 0) tr.classList.add('preset-mapped');
      select.addEventListener('change', e => {
        mapping[col.col] = parseInt(e.target.value);
        tr.classList.toggle('preset-mapped', parseInt(e.target.value) >= 0);
      });
      staticInput.addEventListener('input', e => {
        staticValues[col.col] = e.target.value;
      });
    }

    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  }

  // Wire buttons
  document.getElementById('btn-automatch').onclick = () => {
    mapping = autoMap(csvHeaders);
    activePreset = null;
    buildMappingUI();
  };
  document.getElementById('btn-map-back').onclick  = () => goStep(1);
  document.getElementById('btn-map-next').onclick  = () => { runValidation(); goStep(3); };
}

// ─── Step 3: Validation + Download ───────────────────────────────────────────
function runValidation() {
  validateAll();
  renderResults();
}

function renderResults() {
  const errCount  = totalErrors();
  const rowErrors = validated.filter(e => Object.keys(e).length > 0).length;
  const summary   = document.getElementById('validationSummary');
  const list      = document.getElementById('errorList');
  const btnDown   = document.getElementById('btn-download');

  summary.className = errCount === 0 ? 'summary ok' : 'summary errors';
  summary.innerHTML = errCount === 0
    ? `<strong>✓ No errors found</strong> — ${csvRows.length} row(s) validated successfully.`
    : `<strong>${errCount} error(s)</strong> across ${rowErrors} row(s). Auto-fixable issues will be corrected on download.`;

  list.innerHTML = '';
  btnDown.disabled = false;
  if (errCount === 0) return;

  validated.forEach((rowErrs, rowIdx) => {
    const errs = Object.entries(rowErrs);
    if (!errs.length) return;
    const rowNum = rowIdx + 2;
    const section = document.createElement('details');
    section.open = rowIdx < 5;
    section.className = 'error-row';
    section.innerHTML = `<summary>Row ${rowNum} — ${errs.length} error(s)</summary>`;
    const ul = document.createElement('ul');
    errs.forEach(([col, msg]) => {
      const colDef = SCHEMA_MAP[col];
      const rawVal = (() => { const idx = mapping[col] ?? -1; return idx >= 0 ? (csvRows[rowIdx][idx] ?? '') : ''; })();
      const li = document.createElement('li');
      li.innerHTML = `<span class="err-col">${col}</span>
        <span class="err-field">${escHtml(colDef?.name ?? col)}</span>
        <span class="err-msg">${escHtml(msg)}</span>
        ${rawVal ? `<span class="err-val">Value: ${escHtml(String(rawVal))}</span>` : ''}`;
      ul.appendChild(li);
    });
    section.appendChild(ul);
    list.appendChild(section);
  });

  document.getElementById('btn-results-back').onclick = () => goStep(2);
  document.getElementById('btn-download').onclick     = () => downloadCSV();
}

function downloadCSV() {
  const csv  = buildCorrectedCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `1042S_formatted_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function showMsg(el, msg, type) {
  el.textContent = msg;
  el.className   = 'file-info ' + type;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initUpload();
  goStep(1);
});
