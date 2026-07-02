/**
 * EACH — Apps Script backend. Two-way sync between the web app and a Google Sheet.
 *
 * Setup (once):
 *   1. In your Sheet → Extensions → Apps Script → paste this whole file.
 *   2. Run setupWorkbook() once (Run menu) and grant permissions.
 *   3. Deploy → New deployment → Web app → Execute as Me → Anyone → Deploy.
 *   4. Copy the Web App URL into EACH → Settings → Connect Sheet.
 *
 * The Sheet is the human-readable source of truth. EACH mirrors edits; you can
 * also edit tabs directly — pull from EACH Settings to overwrite (last write wins).
 */

var SKIP = ['Dashboard', 'RawData_Backup'];

function doPost(e) {
  try {
    var state = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    writeState_(ss, state);
    refreshDashboard(ss);
    return jsonOut_({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = readState_(ss);
    if (Object.keys(data).length === 0) {
      var b = ss.getSheetByName('RawData_Backup');
      if (b) { try { data = JSON.parse(b.getRange(1, 1).getValue()); } catch (_) {} }
    }
    return jsonOut_(data);
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

function doOptions() { return ContentService.createTextOutput('OK'); }

function setupWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = ['Dashboard','Metadata','foundingCapital','expenses','employees','aiEmployees','projects','loans','objectives','actions','invoices','payrollRuns','customers'];
  tabs.forEach(function(n){ getOrCreateSheet_(ss, n); });
  refreshDashboard(ss);
  SpreadsheetApp.getUi().alert('EACH workbook ready. Deploy as Web App, then paste the URL into EACH Settings.');
}

function eachVersion() { return jsonOut_({ version: 'each-v1', now: new Date().toISOString() }); }

function refreshDashboard(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = getOrCreateSheet_(ss, 'Dashboard');
  dash.clear();
  var rows = [
    ['Metric','Value','Plain English'],
    ['Founding capital','=SUM(foundingCapital!D2:D)','Money shareholders put in'],
    ['Revenue received','=SUM(projects!H2:H)','Cash already collected from deals'],
    ['Total expenses','=SUM(expenses!F2:F)','Everything spent so far'],
    ['Cash on hand','=B2+B3-B4','Blocks in your hand right now'],
    ['AI operator /mo','=SUM(aiEmployees!F2:F)','Monthly AI subscriptions'],
    ['Human payroll /mo','=SUM(employees!D2:D)','Monthly salaries'],
    ['Debt service /mo','=SUM(loans!F2:F)','Loan installments due each month'],
    ['This month OpEx','=SUMIFS(expenses!F:F,expenses!E:E,"opex",expenses!B:B,">="&EOMONTH(TODAY(),-1)+1,expenses!B:B,"<="&EOMONTH(TODAY(),0))','One-off operating spend this calendar month'],
    ['Monthly burn','=B7+B8+B9+B10','What leaves the bank each month at current pace'],
    ['Runway (months)','=IF(B11>0,FLOOR(B5/B11),"")','Months until cash hits zero'],
    ['Contracted revenue','=SUMIF(projects!K:K,"commissioned",projects!G:G)','Signed deals total value'],
    ['Outstanding AR','=B13-B3','Contracted but not yet received'],
  ];
  dash.getRange(1,1,rows.length,3).setValues(rows);
  dash.getRange(1,1,1,3).setFontWeight('bold');
  dash.setColumnWidth(1,180);
  dash.setColumnWidth(2,160);
  dash.setColumnWidth(3,360);
  dash.getRange('B2:B13').setNumberFormat('#,##0');
}

function writeState_(ss, state) {
  var meta = getOrCreateSheet_(ss, 'Metadata');
  var backup = getOrCreateSheet_(ss, 'RawData_Backup');
  var metaRows = [];
  for (var k in state) {
    var v = state[k];
    if (Array.isArray(v)) {
      if (SKIP.indexOf(k) === -1) writeArrayToSheet_(ss, k, v);
    } else {
      metaRows.push([k, typeof v === 'object' ? JSON.stringify(v) : v]);
    }
  }
  meta.clear();
  if (metaRows.length) { meta.getRange(1,1,metaRows.length,2).setValues(metaRows); meta.getRange(1,1,1,2).setFontWeight('bold'); }
  backup.clear();
  backup.getRange(1,1).setValue(JSON.stringify(state));
  if (!backup.isSheetHidden()) backup.hideSheet();
}

function readState_(ss) {
  var sheets = ss.getSheets();
  var data = {};
  sheets.forEach(function(sheet){
    var name = sheet.getName();
    if (name === 'RawData_Backup' || name === 'Dashboard') return;
    var vals = sheet.getDataRange().getValues();
    if (vals.length === 0) return;
    if (name === 'Metadata') {
      vals.forEach(function(r){
        var k = r[0]; if (!k) return;
        var v = r[1];
        if (typeof v === 'string' && (v.charAt(0)==='{' || v.charAt(0)==='[')) { try { v = JSON.parse(v); } catch(_){} }
        if (v instanceof Date) v = v.toISOString().slice(0,10);
        data[k] = v;
      });
      return;
    }
    var headers = vals[0];
    var arr = [];
    for (var i=1; i<vals.length; i++) {
      var row = vals[i];
      var obj = {};
      var empty = true;
      for (var j=0; j<headers.length; j++) {
        var h = headers[j]; if (!h) continue;
        var c = row[j];
        if (c !== '') empty = false;
        if (typeof c === 'string' && (c.charAt(0)==='{' || c.charAt(0)==='[')) { try { c = JSON.parse(c); } catch(_){} }
        if (c instanceof Date) c = c.toISOString().slice(0,10);
        obj[h] = c;
      }
      if (!empty) arr.push(obj);
    }
    data[name] = arr;
  });
  return data;
}

function writeArrayToSheet_(ss, name, arr) {
  var sh = getOrCreateSheet_(ss, name);
  sh.clear();
  if (!arr || !arr.length) return;
  var keys = {};
  arr.forEach(function(o){ if (o && typeof o === 'object') Object.keys(o).forEach(function(k){ keys[k] = true; }); });
  var headers = Object.keys(keys);
  if (!headers.length) return;
  var rows = [headers];
  arr.forEach(function(o){ rows.push(headers.map(function(h){ var v = o[h]; if (typeof v === 'object' && v !== null) return JSON.stringify(v); if (v === undefined || v === null) return ''; return v; })); });
  sh.getRange(1,1,rows.length,headers.length).setValues(rows);
  sh.getRange(1,1,1,headers.length).setFontWeight('bold');
}

function getOrCreateSheet_(ss, name) { var s = ss.getSheetByName(name); return s || ss.insertSheet(name); }
function jsonOut_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function onOpen() { SpreadsheetApp.getUi().createMenu('EACH').addItem('Setup workbook','setupWorkbook').addItem('Refresh dashboard','refreshDashboard').addToUi(); }
