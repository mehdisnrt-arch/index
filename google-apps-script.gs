const SHEET_NAME = 'Indexes';
const SPREADSHEET_ID = '';
const DEFAULT_ADMIN_KEY = 'CHANGE_ME_ADMIN_CODE';
const BASELINE_INDEXES = {
  ASWAT: 4310,
  'MED RADIO': 3531,
  'MEDINA FM': 60049,
  MEDI1: 7137,
  'CAP RADIO': 78734,
  'CHADA FM': 6511,
  'HIT RADIO': 6671,
  MFM: 312562
};

function setup() {
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', DEFAULT_ADMIN_KEY);
  getSheet_();
}

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || 'list';

  try {
    let data;
    if (action === 'add') data = add_(params);
    else if (action === 'last') data = last_(params.radio);
    else if (action === 'list') data = list_(params.adminKey);
    else if (action === 'edit') data = edit_(params);
    else if (action === 'delete') data = remove_(params);
    else throw new Error('Action inconnue');

    return output_({ ok: true, data: data }, params.callback);
  } catch (error) {
    return output_({ ok: false, error: error.message }, params.callback);
  }
}

function add_(params) {
  const date = String(params.date || today_()).trim();
  const radio = radioLabel_(params.radio);
  const index = Number(params.index);
  if (!date || !radio || !isFinite(index)) throw new Error('Champs requis');

  const latest = last_(radio);
  if (latest && index < Number(latest.index)) throw new Error('Index erroné');

  const now = new Date().toISOString();
  const row = [Utilities.getUuid(), date, radio, index, now, now];
  getSheet_().appendRow(row);
  return rowToObject_(row);
}

function list_(adminKey) {
  requireAdmin_(adminKey);
  return getRows_().map(rowToObject_);
}

function edit_(params) {
  requireAdmin_(params.adminKey);
  const id = String(params.id || '').trim();
  const date = String(params.date || '').trim();
  const radio = radioLabel_(params.radio);
  const index = Number(params.index);
  if (!id || !date || !radio || !isFinite(index)) throw new Error('Champs requis');

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][0]) === id) {
      sheet.getRange(i + 1, 2, 1, 5).setValues([[date, radio, index, values[i][4], new Date().toISOString()]]);
      return rowToObject_([id, date, radio, index, values[i][4], new Date().toISOString()]);
    }
  }
  throw new Error('Index introuvable');
}

function remove_(params) {
  requireAdmin_(params.adminKey);
  const id = String(params.id || '').trim();
  if (!id) throw new Error('ID requis');

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][0]) === id) {
      sheet.deleteRow(i + 1);
      return { id: id };
    }
  }
  throw new Error('Index introuvable');
}

function last_(radio) {
  const normalized = normalizeRadio_(radio);
  let latest = null;
  getRows_().forEach(row => {
    if (normalizeRadio_(row[2]) === normalized) {
      latest = rowToObject_(row);
    }
  });

  if (latest) return latest;
  if (BASELINE_INDEXES[normalized] !== undefined) {
    return { id: '', date: '', radio: radioLabel_(radio), index: BASELINE_INDEXES[normalized], createdAt: '', updatedAt: '' };
  }
  return null;
}

function requireAdmin_(adminKey) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || DEFAULT_ADMIN_KEY;
  if (String(adminKey || '') !== expected) throw new Error('Code admin invalide');
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID', 'Date', 'Radio', 'Index', 'CreatedAt', 'UpdatedAt']);
  }
  return sheet;
}

function getRows_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 6).getValues();
}

function rowToObject_(row) {
  return {
    id: String(row[0] || ''),
    date: formatDate_(row[1]),
    radio: String(row[2] || ''),
    index: Number(row[3]),
    createdAt: formatDateTime_(row[4]),
    updatedAt: formatDateTime_(row[5])
  };
}

function radioLabel_(value) {
  const labels = ['Aswat', 'Med Radio', 'Medina FM', 'Medi1', 'Cap Radio', 'Chada FM', 'HIT RADIO', 'MFM'];
  const normalized = normalizeRadio_(value);
  const found = labels.find(label => normalizeRadio_(label) === normalized);
  return found || String(value || '').trim();
}

function normalizeRadio_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value || '');
}

function formatDateTime_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value || '');
}

function output_(payload, callback) {
  const body = callback ? `${callback}(${JSON.stringify(payload)});` : JSON.stringify(payload);
  const mime = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(body).setMimeType(mime);
}
