/**
 * EACH Google Sheets Backend
 *
 * Two-way sync between the EACH web app and a human-readable workbook.
 *
 * Setup (once):
 * 1. Create a new Google Sheet — name it "EACH — [Your Company]".
 * 2. Extensions → Apps Script → paste this file → Save.
 * 3. Run setupWorkbook once (Run menu) and authorize.
 * 4. Deploy → New deployment → Web app → Execute as Me → Anyone.
 * 5. Copy the Web App URL into EACH (.env VITE_SHEETS_WEB_APP_URL or app Settings).
 *
 * Sheet tabs mirror EACH store keys. Edit rows in the sheet; the app reads them back on sync.
 */

var SKIP_SHEETS = ['Dashboard', 'RawData_Backup'];

function doPost(e) {
  try {
    var state = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var metadataSheet = getOrCreateSheet(ss, 'Metadata');
    var metadata = [];

    for (var key in state) {
      var value = state[key];
      if (Array.isArray(value)) {
        if (SKIP_SHEETS.indexOf(key) === -1) {
          writeArrayToSheet(ss, key, value);
        }
      } else {
        metadata.push([key, typeof value === 'object' ? JSON.stringify(value) : value]);
      }
    }

    metadataSheet.clear();
    if (metadata.length > 0) {
      metadataSheet.getRange(1, 1, metadata.length, 2).setValues(metadata);
      metadataSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    }

    var backupSheet = getOrCreateSheet(ss, 'RawData_Backup');
    backupSheet.clear();
    backupSheet.getRange(1, 1).setValue(e.postData.contents);
    if (!backupSheet.isSheetHidden()) {
      backupSheet.hideSheet();
    }

    refreshDashboard(ss);

    return response({ success: true });
  } catch (err) {
    return response({ error: err.toString() });
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var data = {};

    sheets.forEach(function (sheet) {
      var name = sheet.getName();
      if (name === 'RawData_Backup' || name === 'Dashboard') return;

      var vals = sheet.getDataRange().getValues();
      if (vals.length === 0) return;

      if (name === 'Metadata') {
        vals.forEach(function (r) {
          var k = r[0];
          var v = r[1];
          if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
            try {
              v = JSON.parse(v);
            } catch (err) {}
          }
          data[k] = v;
        });
        return;
      }

      var headers = vals[0];
      var arr = [];
      for (var i = 1; i < vals.length; i++) {
        var row = vals[i];
        var obj = {};
        var isEmpty = true;
        for (var j = 0; j < headers.length; j++) {
          var hk = headers[j];
          if (!hk) continue;
          var cell = row[j];
          if (cell !== '') isEmpty = false;
          if (typeof cell === 'string' && (cell.startsWith('{') || cell.startsWith('['))) {
            try {
              cell = JSON.parse(cell);
            } catch (err) {}
          }
          if (cell instanceof Date) {
            cell = cell.toISOString().slice(0, 10);
          }
          obj[hk] = cell;
        }
        if (!isEmpty) arr.push(obj);
      }
      data[name] = arr;
    });

    if (Object.keys(data).length === 0) {
      var b = ss.getSheetByName('RawData_Backup');
      if (b) {
        try {
          data = JSON.parse(b.getRange(1, 1).getValue());
        } catch (err) {}
      }
    }

    return response(data);
  } catch (err) {
    return response({ error: err.toString() });
  }
}

function setupWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = [
    'Dashboard',
    'Metadata',
    'foundingCapital',
    'expenses',
    'employees',
    'aiEmployees',
    'projects',
    'loans',
    'objectives',
    'actions',
  ];
  tabs.forEach(function (name) {
    getOrCreateSheet(ss, name);
  });
  refreshDashboard(ss);
  SpreadsheetApp.getUi().alert('EACH workbook ready. Deploy as web app and paste the URL into the EACH app.');
}

function refreshDashboard(ss) {
  var dash = getOrCreateSheet(ss, 'Dashboard');
  dash.clear();
  var rows = [
    ['Metric', 'Value', 'Plain English'],
    ['Founding capital', '=SUM(foundingCapital!D2:D)', 'Money shareholders put in'],
    ['Revenue received', '=SUM(projects!H2:H)', 'Cash already collected from deals'],
    ['Total expenses', '=SUM(expenses!F2:F)', 'Everything spent so far'],
    ['Cash on hand', '=B2+B3-B4', 'Blocks in your hand right now'],
    ['AI operator cost / mo', '=SUM(aiEmployees!F2:F)', 'Monthly AI subscriptions'],
    ['Human payroll / mo', '=SUM(employees!D2:D)', 'Monthly salaries'],
    ['Debt service / mo', '=SUM(loans!F2:F)', 'Loan installments due each month'],
    ['This month OpEx', '=SUMIFS(expenses!F:F,expenses!E:E,"opex",expenses!B:B,">="&EOMONTH(TODAY(),-1)+1,expenses!B:B,"<="&EOMONTH(TODAY(),0))', 'One-off operating spend this calendar month'],
    ['Monthly burn', '=B6+B7+B8+B9', 'What leaves the bank each month at current pace'],
    ['Runway (months)', '=IF(B10>0,FLOOR(B5/B10),"")', 'Months until cash hits zero'],
    ['Contracted revenue', '=SUMIF(projects!K:K,"commissioned",projects!G:G)', 'Signed deals total value'],
    ['Outstanding AR', '=B12-B3', 'Contracted but not yet received'],
  ];
  dash.getRange(1, 1, rows.length, 3).setValues(rows);
  dash.getRange(1, 1, 1, 3).setFontWeight('bold');
  dash.setColumnWidth(1, 180);
  dash.setColumnWidth(2, 140);
  dash.setColumnWidth(3, 320);
  dash.getRange('B2:B12').setNumberFormat('#,##0');
}

function writeArrayToSheet(ss, sheetName, arr) {
  var sheet = getOrCreateSheet(ss, sheetName);
  sheet.clear();
  if (!arr || arr.length === 0) return;

  var keysMap = {};
  arr.forEach(function (obj) {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(function (k) {
        keysMap[k] = true;
      });
    }
  });
  var headers = Object.keys(keysMap);
  if (headers.length === 0) return;

  var rows = [headers];
  arr.forEach(function (obj) {
    var row = headers.map(function (h) {
      var val = obj[h];
      if (typeof val === 'object') return JSON.stringify(val);
      if (val === undefined || val === null) return '';
      return val;
    });
    rows.push(row);
  });

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('EACH')
    .addItem('Setup workbook tabs', 'setupWorkbook')
    .addItem('Refresh Dashboard formulas', 'refreshDashboard')
    .addToUi();
}

function doOptions(e) {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}
