/**
 * Smart Helmet - Google Apps Script backend (bound to your Google Sheet)
 * Author: Aravindhan S | ECE Final Year | P.T.Lee.CNCET, Kancheepuram
 *
 * Setup: Sheet > Extensions > Apps Script > paste this > run setup() once (allow permissions)
 *        Deploy > New deployment > Web app > Execute as: Me, Access: Anyone > copy the /exec URL
 *
 * Endpoints (all GET or POST):
 *   ?action=log&helmet_id=HLM-001&status=OK|VIOLATION&reason=NOT_WORN&streak=2&alert=0|1
 *   ?action=register&helmet_id=&rider=&guardian_name=&guardian_phone=&guardian_email=
 *   ?action=replace&old_id=&new_id=
 *   ?action=summary[&helmet_id=HLM-001]     (default - used by the dashboard)
 */
const TZ = 'Asia/Kolkata';
const TRIPS = ['Timestamp', 'Helmet ID', 'Status', 'Reason', 'Streak', 'Alert'];
const HELMETS = ['Helmet ID', 'Rider', 'Guardian name', 'Guardian phone', 'Guardian email', 'Active', 'Registered on'];
const ALERTS = ['Timestamp', 'Helmet ID', 'Guardian', 'Message'];

function setup() {
  sh_('Trips', TRIPS); sh_('Alerts', ALERTS);
  const h = sh_('Helmets', HELMETS);
  if (h.getLastRow() < 2) {
    h.appendRow(['HLM-001', 'Rider name', 'Guardian name', '+91XXXXXXXXXX', 'guardian@example.com', 'YES', new Date()]);
  }
  MailApp.getRemainingDailyQuota(); // triggers the email permission prompt
}

function sh_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(head); s.setFrozenRows(1); }
  return s;
}
function rows_(name, head) { const v = sh_(name, head).getDataRange().getValues(); v.shift(); return v; }

function doGet(e) { return route_(e.parameter || {}); }
function doPost(e) {
  let p = e.parameter || {};
  try { if (e.postData && e.postData.contents) p = Object.assign({}, p, JSON.parse(e.postData.contents)); } catch (x) {}
  return route_(p);
}

function route_(p) {
  const a = p.action || 'summary';
  let out;
  try {
    if (a === 'log') out = logTrip_(p);
    else if (a === 'register') out = register_(p);
    else if (a === 'replace') out = replace_(p);
    else out = summary_(p);
  } catch (err) { out = { ok: false, error: String(err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function logTrip_(p) {
  const now = new Date();
  sh_('Trips', TRIPS).appendRow([now, p.helmet_id || '', p.status || '', p.reason || '-', Number(p.streak || 0), p.alert === '1' ? 'YES' : '']);
  return { ok: true, alert_sent: p.alert === '1' ? alert_(p, now) : false };
}

function alert_(p, now) {
  const h = rows_('Helmets', HELMETS).find(r => r[0] === p.helmet_id && r[5] !== 'NO');
  const msg = 'Helmet alert: ' + (h ? h[1] : 'the rider') + ' skipped the helmet ' + p.streak + ' times in a row. Please talk to them today.';
  if (h && h[4]) MailApp.sendEmail(h[4], 'Helmet safety alert - ' + p.helmet_id, msg);
  sh_('Alerts', ALERTS).appendRow([now, p.helmet_id, h ? h[2] : '-', msg]);
  return !!(h && h[4]);
}

function register_(p) {
  sh_('Helmets', HELMETS).appendRow([p.helmet_id, p.rider || '', p.guardian_name || '', p.guardian_phone || '', p.guardian_email || '', 'YES', new Date()]);
  return { ok: true };
}

function replace_(p) {
  const s = sh_('Helmets', HELMETS), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] === p.old_id && v[i][5] !== 'NO') {
      s.getRange(i + 1, 6).setValue('NO');
      s.appendRow([p.new_id, v[i][1], v[i][2], v[i][3], v[i][4], 'YES', new Date()]);
      return { ok: true };
    }
  }
  return { ok: false, error: 'old helmet not found' };
}

function summary_(p) {
  const now = new Date();
  const day = d => Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
  const t = rows_('Trips', TRIPS).filter(r => r[0] instanceof Date && (!p.helmet_id || r[1] === p.helmet_id));
  const stat = L => {
    const ok = L.filter(r => r[2] === 'OK').length;
    return { trips: L.length, compliant: ok, violations: L.length - ok, compliance_pct: L.length ? Math.round(100 * ok / L.length) : null };
  };
  const within = n => t.filter(r => now - r[0] <= n * 864e5);
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = day(new Date(now - i * 864e5));
    last7.push(Object.assign({ date: d }, stat(t.filter(r => day(r[0]) === d))));
  }
  return {
    ok: true,
    daily: stat(t.filter(r => day(r[0]) === day(now))),
    weekly: stat(within(7)),
    monthly: stat(within(30)),
    last7: last7,
    recent: t.slice(-15).reverse().map(r => ({ time: Utilities.formatDate(r[0], TZ, 'dd MMM, HH:mm'), helmet_id: r[1], status: r[2], reason: r[3] })),
    helmets: rows_('Helmets', HELMETS).map(r => ({ helmet_id: r[0], rider: r[1], guardian: r[2], active: r[5] !== 'NO' })),
    alerts: rows_('Alerts', ALERTS).length
  };
}
