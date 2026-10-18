/* Быстрый разбор: Power BI и/или выгрузка из Ads Manager (FB).
   Сводит обе по креативу (US0067-176-1 и т.п.), ищет нестыковки по депам и говорит, что делать. */
window.FD = window.FD || {};

FD.MONTHS = { 'январь': 1, 'февраль': 2, 'март': 3, 'апрель': 4, 'май': 5, 'июнь': 6, 'июль': 7, 'август': 8, 'сентябрь': 9, 'октябрь': 10, 'ноябрь': 11, 'декабрь': 12 };
FD.dayNum = function (y, m, d) {
  var mm = typeof m === 'number' ? m : FD.MONTHS[String(m || '').toLowerCase().trim()] || +m;
  if (!y || !mm || !d) return null;
  return Math.round(Date.UTC(+y, mm - 1, +d) / 864e5);
};
FD.dayStr = function (n) { var d = new Date(n * 864e5); return ('0' + d.getUTCDate()).slice(-2) + '.' + ('0' + (d.getUTCMonth() + 1)).slice(-2); };

/* --- Ads Manager --- */
FD.FBCOL = {
  camp: /^(campaign name|название кампании)$/i,
  adset: /^(ad set name|название группы объявлений)$/i,
  ad: /^(ad name|название объявления)$/i,
  spend: /^(amount spent|потраченная сумма)/i,
  clk: /^(link clicks|клики по ссылке)$/i,
  imp: /^(impressions|показы)$/i,
  regs: /^(leads|лиды|registrations completed|завершенные регистрации|завершённые регистрации)$/i,
  fd: /^(purchases|покупки)$/i,
  res: /^(results|результаты)$/i,
  resInd: /^(result indicator|индикатор результатов)$/i,
  rev: /^(purchases conversion value|ценность конверсии покупок|ценность конверсий покупок)/i,
  start: /^(reporting starts|начало отчетности|начало отчётности)$/i,
  end: /^(reporting ends|конец отчетности|конец отчётности)$/i,
  day: /^(day|день)$/i,
  acct: /^(account name|название аккаунта|название рекламного аккаунта|account id|id аккаунта)$/i,
  status: /^(campaign delivery|ad set delivery|ad delivery|показ кампании|показ группы объявлений|показ объявления)$/i
};
FD.detectFB = function (rows) {
  for (var i = 0; i < Math.min(rows.length, 10); i++) {
    var row = (rows[i] || []).map(function (c) { return c == null ? '' : String(c).trim(); });
    var col = {};
    row.forEach(function (c, j) { Object.keys(FD.FBCOL).forEach(function (k) { if (col[k] == null && FD.FBCOL[k].test(c)) col[k] = j; }); });
    if (col.spend != null && (col.camp != null || col.ad != null || col.adset != null)) return { hi: i, col: col };
  }
  return null;
};
FD.isoDay = function (v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Math.round(v - 25569); // excel serial → дни от 1970
  var m = String(v).match(/(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return FD.dayNum(+m[1], +m[2], +m[3]);
  m = String(v).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); if (m) return FD.dayNum(+m[3], +m[2], +m[1]);
  return null;
};
FD.fbRecs = function (rows, label) {
  var det = FD.detectFB(rows); if (!det) return null;
  var c = det.col, recs = [], start = null, end = null, useRes = c.fd == null && c.res != null; /* нет колонки «Покупки» — берём «Результаты», если результат = покупка */
  rows.slice(det.hi + 1).forEach(function (r) {
    if (!r) return;
    var camp = c.camp != null ? r[c.camp] : null, ad = c.ad != null ? r[c.ad] : null;
    var name = camp || ad; if (name == null || String(name).trim() === '') return;
    var s0 = FD.isoDay(c.start != null ? r[c.start] : null), e0 = FD.isoDay(c.end != null ? r[c.end] : null), d0 = FD.isoDay(c.day != null ? r[c.day] : null);
    if (s0 != null) start = start == null ? s0 : Math.min(start, s0);
    if (e0 != null) end = end == null ? e0 : Math.max(end, e0);
    var adset = c.adset != null ? r[c.adset] : null, stt = c.status != null && r[c.status] != null ? String(r[c.status]).trim() : null;
    var ac = c.acct != null && r[c.acct] != null && String(r[c.acct]).trim() !== '' ? String(r[c.acct]).trim() : (label || 'РК');
    recs.push({ src: 'fb', acct: ac, status: stt, camp: camp != null ? String(camp) : null, adset: adset != null ? String(adset) : null, ad: ad != null ? String(ad) : null, dn: d0,
      spend: FD.num(r[c.spend]), clk: FD.num(c.clk != null ? r[c.clk] : 0), imp: FD.num(c.imp != null ? r[c.imp] : 0),
      regs: FD.num(c.regs != null ? r[c.regs] : 0), fd: c.fd != null ? FD.num(r[c.fd]) : useRes && /purchase|покупк/i.test(String(c.resInd != null ? r[c.resInd] : 'purchase')) ? FD.num(r[c.res]) : 0, rev: FD.num(c.rev != null ? r[c.rev] : 0) });
  });
  return { recs: recs, fromLabel: c.acct == null, label: label || 'РК', hasStatus: c.status != null, start: start, end: end, byDay: c.day != null, hasFd: c.fd != null || useRes, level: c.ad != null ? 'объявления' : c.adset != null ? 'группы' : 'кампании' };
};

/* несколько выгрузок FB (по одной на РК) → одна */
FD.fbMerge = function (list) {
  if (!list.length) return null;
  var m = { recs: [], start: null, end: null, byDay: true, hasFd: false, hasStatus: false, levels: {}, files: list.length, renamed: [], dropped: [] };
  /* одинаковые имена файлов (rk1 и rk1) — это разные РК, если кампании разные; если кампании те же — это один РК выгружен дважды */
  var byLbl = {}, keep = [];
  var names = function (f) { var o = {}; f.recs.forEach(function (x) { o[FD.normCamp(x.camp || x.ad)] = 1; }); return o; };
  var span = function (f) { return (f.end || 0) - (f.start || 0); };
  list.forEach(function (f) {
    if (!f.fromLabel) { keep.push(f); return; }
    var L = f.label, prev = byLbl[L] || (byLbl[L] = []), mine = names(f), mk = Object.keys(mine), same = null;
    prev.forEach(function (p) { if (same) return; var pk = p.nm, hit = mk.filter(function (k) { return pk[k]; }).length; if (hit && hit >= 0.5 * Math.min(mk.length, Object.keys(pk).length)) same = p; });
    if (same) {
      var better = (f.end || 0) > (same.f.end || 0) || ((f.end || 0) === (same.f.end || 0) && span(f) > span(same.f));
      m.dropped.push(L);
      if (better) { keep[keep.indexOf(same.f)] = f; same.f = f; same.nm = mine; }
      return;
    }
    if (prev.length) {
      var nn = L + ' (' + (prev.length + 1) + ')';
      f = { recs: f.recs.map(function (x) { var y = {}; for (var k in x) y[k] = x[k]; y.acct = nn; return y; }), fromLabel: true, label: nn, hasStatus: f.hasStatus, start: f.start, end: f.end, byDay: f.byDay, hasFd: f.hasFd, level: f.level };
      m.renamed.push(nn);
    }
    prev.push({ f: f, nm: mine }); keep.push(f);
  });
  m.files = keep.length;
  m.acctNo = {}; var an = 0; keep.forEach(function (f) { f.recs.forEach(function (x) { if (m.acctNo[x.acct] == null) m.acctNo[x.acct] = ++an; }); });
  keep.forEach(function (f) {
    m.recs = m.recs.concat(f.recs);
    if (f.start != null) m.start = m.start == null ? f.start : Math.min(m.start, f.start);
    if (f.end != null) m.end = m.end == null ? f.end : Math.max(m.end, f.end);
    m.byDay = m.byDay && f.byDay; m.hasFd = m.hasFd || f.hasFd; m.hasStatus = m.hasStatus || f.hasStatus; m.levels[f.level] = 1;
  });
  m.level = Object.keys(m.levels).join(' / ');
  m.ranges = keep.map(function (f) { return f.start != null ? FD.dayStr(f.start) + '–' + FD.dayStr(f.end) : '?'; });
  return m;
};
FD.pbMerge = function (list) {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  var seen = {}, recs = [];
  list.forEach(function (p) { p.recs.forEach(function (x) { var k = [x.dn, x.camp, x.adset, x.ad, Math.round(x.spend * 100), x.fd, x.regs].join('|'); if (!seen[k]) { seen[k] = 1; recs.push(x); } }); });
  return { det: list[0].det, recs: recs, files: list.length };
};

/* общий ключ кампании и креатива для обеих выгрузок */
FD.normCamp = function (n) { return String(n || '').replace(/\s+by\s+\S+\s*$/i, '').replace(/\s+/g, ' ').replace(/\s+[-—–]\s+(Copy|Копия)( \d+)?$/i, '').trim(); };
/* для сопоставления FB ↔ Power BI: без номера Кейтаро в начале (кампании переименовывают 3863 → 4499) */
FD.matchCamp = function (n) { return FD.normCamp(n).replace(/^\d{3,6}\s*\|\s*/, ''); };
FD.CR_RX = /(?:^|[\s|_])([A-Z]{2}\d{4})(?=[-.\s|_]|$)/;
FD.crKey = function (camp, ad, adset, mode) {
  if (mode === 'camp') return FD.matchCamp(camp) || String(ad || '');
  var src = [camp, adset, ad];
  for (var i = 0; i < src.length; i++) { var m = String(src[i] || '').match(FD.CR_RX); if (m) return m[1]; }
  if (ad) return String(ad).replace(/ \d+$/, '');
  return FD.normCamp(camp);
};
FD.campInfo = function (camp) {
  var n = FD.normCamp(camp), parts = n.split('|').map(function (x) { return x.trim(); });
  var kid = /^\d{3,5}$/.test(parts[0]) ? parts[0] : null, launch = null;
  parts.forEach(function (x) { var m = x.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/); if (m && launch == null) launch = { d: +m[1], m: +m[2] }; });
  var st = parts.filter(function (x) { return FD.US.indexOf(x) > -1; })[0] || null;
  if (!st && kid && FD.state && FD.state.my) { var o = FD.state.my.filter(function (x) { return String(x[0]) === kid; })[0]; if (o && o[1]) st = String(o[1]).toUpperCase(); }
  var struct = (n.match(/\b(\d{1,2}-\d{1,2}-\d{1,2})\b/) || [])[1] || null;
  return { kid: kid, launch: launch, st: st, struct: struct };
};

/* Гео: США или нет — по неймингу кампании/креатива (и по выплате за деп, см. FD.quick) */
FD.US_SET = FD.US.concat(['BF', 'QN', 'YK', 'SY', 'HV', 'BT', 'ES', 'DU', 'OG', 'FR', 'KC']);
FD.geoGuess = function (camp, ad) {
  camp = String(camp || ''); ad = String(ad || '');
  if (/tower\s*rush|banda app/i.test(camp)) return 'не США (Tower Rush)';
  var cr = ad.match(/^([A-Z]{2})-[A-Z]+-\d+-\d+-[A-Z]+-[0-9A-Za-z]+-([A-Za-z]{2})-/);
  if (cr && cr[1] !== 'EN') return 'не США (' + cr[1] + ')';
  if (cr && FD.US_SET.indexOf(cr[2].toUpperCase()) < 0 && cr[2].toUpperCase() !== 'US') return 'не США (' + cr[2].toUpperCase() + ')';
  var cc = ad.match(/^\+?\d*\+?([A-Za-z]{2})\d/);
  if (cc && ['US', 'EN'].indexOf(cc[1].toUpperCase()) < 0 && (FD.US_SET.indexOf(cc[1].toUpperCase()) < 0 || cc[1].toUpperCase() === 'DE')) return 'не США (' + cc[1].toUpperCase() + ')';
  var parts = camp.split('|').map(function (x) { return x.trim(); });
  for (var i = 1; i < 3 && i < parts.length; i++) { var m = parts[i].match(/^([A-Z]{2,3})\b/); if (m && ['EN', 'CBO', 'ABO'].indexOf(m[1]) < 0) { if (m[1] === 'US' || m[1] === 'USA' || FD.US_SET.indexOf(m[1]) > -1) return m[1] === 'DE' && !cr ? 'не США (DE)' : 'US'; return 'не США (' + m[1] + ')'; } }
  if (/(?:^|[^A-Za-z])USA?(?:[^A-Za-z]|$)/i.test(camp) || /^(EN|US)[-\d_]/.test(ad)) return 'US';
  var foreign = (camp + ' ' + ad).match(/(?:^|[\s|_-])(BR|IT|NL|UK|GB|PT|PL|AT|CH|MX|CL|PE|TR|JP|AU|NZ|IE|SE|NO|FI|DK|BE|CZ|RO|HU|GR)(?:[\s|_-]|$)/i);
  if (foreign) return 'не США (' + foreign[1].toUpperCase() + ')';
  return '?';
};

/* сводим */
FD.OFF_RX = /inactive|paused|off\b|archived|deleted|completed|неактив|выкл|приостан|архив|удал|заверш/i;
FD.quick = function (pb, fb, period, mode) {
  var lastDay = null;
  if (pb) pb.recs.forEach(function (x) { if (x.dn != null) lastDay = lastDay == null ? x.dn : Math.max(lastDay, x.dn); });
  if (fb) { if (fb.byDay) fb.recs.forEach(function (x) { if (x.dn != null) lastDay = lastDay == null ? x.dn : Math.max(lastDay, x.dn); }); else if (fb.end != null && lastDay == null) lastDay = fb.end; }
  var from = period && lastDay != null ? lastDay - period + 1 : null, to = null, lockFb = false;
  /* FB без разбивки по дням: сравнивать можно только за тот же период, что в выгрузке FB */
  if (pb && fb && !fb.byDay && fb.start != null) { from = fb.start; to = fb.end; lastDay = fb.end; lockFb = true; }
  function inP(x) { return x.dn == null || ((from == null || x.dn >= from) && (to == null || x.dn <= to)); }
  var C = {}, warn = [];
  function slot(key) { return C[key] || (C[key] = { key: key, pb: null, fb: null, camps: {}, info: null, story: null, minLaunch: null }); }
  function add(o, x) { ['spend', 'clk', 'regs', 'fd', 'rev', 'imp'].forEach(function (k) { o[k] += x[k] || 0; }); }
  function z() { return { spend: 0, clk: 0, regs: 0, fd: 0, rev: 0, imp: 0, n: 0 }; }
  var orphan = { fd: 0, rev: 0 };
  var read = {};
  if (pb) { var rc = {}, rcr = {}, dd = []; read.pb = { spend: 0, fd: 0, camps: 0, cr: 0 }; pb.recs.forEach(function (x) { read.pb.spend += x.spend; read.pb.fd += x.fd; if (x.camp) rc[FD.normCamp(x.camp)] = 1; rcr[FD.crKey(x.camp, x.ad, x.adset, 'cr')] = 1; if (x.dn != null) dd.push(x.dn); }); read.pb.camps = Object.keys(rc).length; read.pb.cr = Object.keys(rcr).length; if (dd.length) read.pb.days = FD.dayStr(Math.min.apply(null, dd)) + '–' + FD.dayStr(Math.max.apply(null, dd)); }
  if (fb) { read.fb = { rows: fb.recs.length, spend: fb.recs.reduce(function (a, x) { return a + x.spend; }, 0) }; }
  var outP = { spend: 0, fd: 0, keys: {} };
  if (pb) pb.recs.forEach(function (x) { if (!inP(x)) { outP.spend += x.spend; outP.fd += x.fd; outP.keys[FD.crKey(x.camp, x.ad, x.adset, mode)] = 1; } });
  if (pb) pb.recs.filter(inP).forEach(function (x) {
    if (x.camp && (FD.parseCamp(x.camp).nd || !/\|/.test(x.camp) || /^US \|/.test(x.camp)) && x.spend < 0.5) { orphan.fd += x.fd; orphan.rev += x.rev; return; }
    var key = FD.crKey(x.camp, x.ad, x.adset, mode);
    var o = slot(key); o.pb = o.pb || z(); add(o.pb, x); o.pb.n++;
    if (x.camp) { var cn = FD.matchCamp(x.camp); o.cm = o.cm || {}; o.cm[cn] = o.cm[cn] || {}; o.cm[cn].pb = o.cm[cn].pb || z(); add(o.cm[cn].pb, x); }
    if (x.camp) { o.camps[FD.matchCamp(x.camp)] = 1; o.info = o.info || FD.campInfo(x.camp); }
    if (!o.geo || o.geo === '?') o.geo = FD.geoGuess(x.camp, x.ad);
    if (x.ad && /^[A-Z]{2}-/.test(x.ad)) { var pc = FD.parseCreative(x.ad); if (pc) { o.story = o.story || pc.story; if (pc.geo && o.info && !o.info.st) o.info.st = pc.geo; o.casino = o.casino || pc.casino; o.st2 = o.st2 || pc.geo; } }
  });
  if (fb) fb.recs.filter(inP).forEach(function (x) {
    var key = FD.crKey(x.camp, x.ad, x.adset, mode);
    var o = slot(key); o.fb = o.fb || z(); add(o.fb, x); o.fb.n++;
    if (!o.geo || o.geo === '?') o.geo = FD.geoGuess(x.camp, x.ad);
    if (x.status) { o.st_n = (o.st_n || 0) + 1; if (!FD.OFF_RX.test(x.status)) o.st_on = (o.st_on || 0) + 1; }
    o.loc = o.loc || {}; var lk = x.acct + '\u0001' + (x.camp || x.ad || ''), L0 = o.loc[lk] || (o.loc[lk] = { acct: x.acct, no: fb.acctNo ? fb.acctNo[x.acct] : null, camp: x.camp || x.ad || '', on: false, st: false, spend: 0, fd: 0, n: 0 }); L0.spend += x.spend; L0.fd += x.fd; L0.n++; if (x.status) { L0.st = true; if (!FD.OFF_RX.test(x.status)) L0.on = true; }
    if (x.camp) { var cn = FD.matchCamp(x.camp); o.cm = o.cm || {}; o.cm[cn] = o.cm[cn] || {}; o.cm[cn].fb = o.cm[cn].fb || z(); add(o.cm[cn].fb, x); }
    if (x.camp) { o.camps[FD.matchCamp(x.camp)] = 1; o.info = o.info || FD.campInfo(x.camp); }
  });
  var LIFE = {};
  if (pb) pb.recs.forEach(function (x) {
    if (x.dn != null && ((to != null && x.dn > to) || (lastDay != null && x.dn > lastDay))) return;
    if (x.camp && (FD.parseCamp(x.camp).nd || !/\|/.test(x.camp) || /^US \|/.test(x.camp)) && x.spend < 0.5) return;
    var key = FD.crKey(x.camp, x.ad, x.adset, mode);
    var l = LIFE[key] || (LIFE[key] = z()); add(l, x);
  });
  var pbDaysAll = pb ? pb.recs.filter(function (x) { return x.dn != null; }).map(function (x) { return x.dn; }) : [];
  var pbFrom0 = pbDaysAll.length ? Math.min.apply(null, pbDaysAll) : null;
  var list = Object.keys(C).map(function (k) { return C[k]; }).filter(function (o) { return (o.pb && (o.pb.spend > 0.5 || o.pb.fd > 0)) || (o.fb && (o.fb.spend > 0.5 || o.fb.fd > 0)); });
  list.forEach(function (o) {
    var t = o.pb || o.fb, f = o.fb;
    o.spend = o.pb ? o.pb.spend : o.fb.spend; o.clk = (o.pb && o.pb.clk) || (o.fb && o.fb.clk) || 0;
    o.regs = o.pb ? o.pb.regs : o.fb.regs; o.fd = o.pb ? o.pb.fd : o.fb.fd; o.rev = o.pb ? o.pb.rev : (o.fb.rev || o.fb.fd * FD.PAYOUT);
    o.st = (o.info && o.info.st) || o.st2 || null;
    var ld = o.info && o.info.launch && lastDay != null ? FD.dayNum(new Date(lastDay * 864e5).getUTCFullYear(), o.info.launch.m, o.info.launch.d) : null;
    o.age = ld != null && lastDay >= ld ? lastDay - ld + 1 : 1;
    var L = LIFE[o.key];
    o.life = L && (L.spend > o.spend + 0.5 || L.fd > o.fd) ? L : null;
    var ds = o.life || o;
    o.v = FD.decide(ds.spend, ds.clk, ds.regs, ds.fd, o.age);
    if (o.life) o.v.why = 'За всю жизнь креатива: $' + Math.round(ds.spend) + ', ' + FD.pl(Math.round(ds.fd), 'деп', 'депа', 'депов') + '. ' + o.v.why;
    if (o.v.code === 'wait' && o.age > 1) o.v = { code: 'idle', label: 'НЕ ТРАТИТ', cls: 'muted', why: 'Креатив уже не новый (день ' + o.age + '), а в этом периоде FB на него почти не тратит. Выгорел или выключен. Если депов за жизнь нет — выключи и не жди.' };
    if (o.spend < 5 && o.fd > 0) o.v = { code: 'hold', label: 'ДЕПЫ ДОЕХАЛИ', cls: 'good', why: 'В этом периоде креатив почти не тратил, но доехали депы от прошлых дней (' + o.fd + '). Смотри его за весь срок — выбери «Всё».' };
    o.roi = o.spend ? (o.rev / o.spend - 1) * 100 : null;
    o.copies = Object.keys(o.camps).length;
    /* нестыковки */
    o.flags = [];
    var pay = o.fd > 0 ? o.rev / o.fd : null;
    o.nonUS = /^не США/.test(o.geo || '') || (pay != null && o.pb && (pay < 115 || pay > 180));
    if (o.nonUS) o.flags.push({ cls: 'warn', t: (/^не США/.test(o.geo || '') ? 'Похоже, ' + o.geo + ' по неймингу.' : 'Выплата $' + Math.round(pay) + ' за деп — не похоже на наши США-офферы ($120–170).') + ' Сравнение с пацанами и «зря вырубил» для него не считаю.' });
    if (o.pb && o.fb) {
      /* сравниваем только кампании, которые есть в обеих выгрузках */
      var bp = z(), bf = z(), miss = 0;
      Object.keys(o.cm || {}).forEach(function (k) { var c = o.cm[k]; if (c.pb && c.fb) { add(bp, c.pb); add(bf, c.fb); } else if (c.pb && c.pb.spend > 1) miss++; });
      o.cmp = { pb: bp, fb: bf };
      var dd = bp.fd - bf.fd;
      if (dd > 0) o.flags.push({ cls: 'bad', t: 'FB пиздит: по одним и тем же кампаниям в трекере ' + FD.pl(bp.fd, 'деп', 'депа', 'депов') + ', а FB видит ' + bf.fd + '. Пиксель потерял ' + dd + '. Решай по трекеру.' });
      if (dd < 0) o.flags.push({ cls: 'warn', t: 'FB видит ' + FD.pl(bf.fd, 'деп', 'депа', 'депов') + ', а в трекере ' + bp.fd + '. Либо деп ещё не доехал в трекер, либо FB считает лишнее. Деньги платят по трекеру.' });
      if (miss) o.flags.push({ cls: 'mut', t: FD.pl(miss, 'кампания', 'кампании', 'кампаний') + ' этого креатива ' + (miss === 1 ? 'есть только в Power BI — в сверку не вошла.' : 'есть только в Power BI — в сверку не вошли.') });
      var fbOnly = FD.decide(o.fb.spend, o.fb.clk, o.fb.regs, o.fb.fd, o.age);
      if (fbOnly.code !== o.v.code) o.flags.push({ cls: 'acc', t: 'Если смотреть только в FB: «' + fbOnly.label + '». По трекеру: «' + o.v.label + '».' });
      if (bp.regs && bf.regs && Math.abs(bp.regs - bf.regs) >= 3 && Math.abs(bp.regs - bf.regs) / Math.max(bp.regs, bf.regs) > 0.4) o.flags.push({ cls: 'warn', t: 'Реги не сходятся: трекер ' + bp.regs + ', FB (лиды) ' + bf.regs + '. Проверь, что событие реги в пикселе стоит правильно.' });
    } else if (pb && fb && o.fb && !o.pb && o.fb.spend >= 10) o.flags.push({ cls: 'bad', t: 'Есть в FB ($' + Math.round(o.fb.spend) + '), но нет в Power BI. ' + (pbFrom0 != null && fb.start != null && pbFrom0 > fb.start ? 'Может, она крутилась до ' + FD.dayStr(pbFrom0) + ', а Power BI у тебя только с этого дня. Если нет — проверь ссылку Кейтаро и нейминг.' : 'Проверь ссылку Кейтаро и нейминг — трекер эту кампанию не видит.') });
    else if (pb && fb && o.pb && !o.fb && o.pb.spend >= 10) o.pbOnly = true;
  });
  var pbOnly = list.filter(function (o) { return o.pbOnly; });
  if (pbOnly.length > 3) warn.push(FD.pl(pbOnly.length, mode === 'camp' ? 'кампания' : 'креатив', mode === 'camp' ? 'кампании' : 'креатива', mode === 'camp' ? 'кампаний' : 'креативов') + ' есть в Power BI, но их нет в выгрузке FB (' + pbOnly.slice(0, 4).map(function (o) { return mode === 'camp' ? ((o.key.match(FD.CR_RX) || [])[1] || o.key.slice(0, 30)) : o.key; }).join(', ') + '…). Выгрузил не все кабинеты или другой период? Решения по ним — по трекеру.');
  else pbOnly.forEach(function (o) { o.flags.push({ cls: 'warn', t: 'Есть в Power BI, но нет в выгрузке FB. Другой кабинет или другой период выгрузки.' }); });
  if (pb && fb && pb.det && pb.det.type === 'creative' && fb.level.indexOf('объявления') < 0) warn.push('Из Power BI загружен отчёт по креативам (названия объяв), а из FB — по кампаниям. Их не сопоставить. Кидай из Power BI отчёт по кампаниям или из FB выгрузку на уровне объявлений.');
  if (lockFb && (outP.spend > 1 || outP.fd)) warn.push('Из Power BI не вошло $' + Math.round(outP.spend) + (outP.fd ? ' и ' + FD.pl(outP.fd, 'деп', 'депа', 'депов') : '') + ' — это дни вне периода выгрузки FB (' + FD.dayStr(fb.start) + '–' + FD.dayStr(fb.end) + '). Выгрузи FB за те же даты, что Power BI, — тогда войдёт всё.');
  if (orphan.fd) warn.push('Ещё ' + orphan.fd + ' деп без кампании (постбэки без спенда, $' + Math.round(orphan.rev) + ') — они в итог ROI не попали.');
  /* «зря вырубил»: FB говорит, что все кампании креатива выключены, а лестница говорила держать */
  var cowards = [], rightKills = 0, rk = [], goodHolds = [], burning = [];
  list.forEach(function (o) {
    if (!o.st_n) return;
    /* если у креатива есть кампании, которых нет в выгрузке FB (другой РК), статус неизвестен — не ругаем */
    var unseen = Object.keys(o.cm || {}).some(function (k) { var c = o.cm[k]; return c.pb && c.pb.spend > 1 && !c.fb; });
    o.fbOff = !o.st_on; o.unseen = unseen;
    if (unseen) { o.st_n = 0; return; }
    o.off = !o.st_on;
    if (!o.off) return;
    var ds = o.life || o;
    if (o.v.code === 'dub' || (o.v.code === 'hold' && ds.fd > 0)) o.flags.unshift({ cls: 'bad', t: 'Выключен, а был в плюсе. Перезалей этот креатив копиями в другие РК.' });
    if (o.nonUS) return;
    if (['keep', 'hold', 'dub'].indexOf(o.v.code) > -1 && ds.spend >= 5) {
      o.coward = true;
      if (FD.similar) { try { o.sim = FD.similar(ds.spend, Math.round(ds.clk), Math.round(ds.regs), Math.round(ds.fd), o.age); } catch (e) { o.sim = null; } }
      cowards.push(o);
    } else if (o.v.code === 'kill' || o.v.code === 'cut') { rightKills++; rk.push(o); }
  });
  list.forEach(function (o) { if (!o.st_n || o.off) return; if (o.v.code === 'dub' || (o.v.code === 'hold' && o.fd > 0)) goodHolds.push(o); else if (o.v.code === 'kill') burning.push(o); });
  cowards.sort(function (a, b) { return (b.life || b).spend - (a.life || a).spend; });
  /* по РК */
  var accts = {}, unmatchedPb = { fd: 0, spend: 0, n: 0 };
  if (fb) {
    var campAcct = {};
    fb.recs.filter(inP).forEach(function (x) {
      var a = accts[x.acct] || (accts[x.acct] = { name: x.acct, rows: 0, rowsOn: 0, spend: 0, clk: 0, regs: 0, fd: 0, rev: 0, camps: {}, on: {}, pbFd: 0, pbRev: 0, pbSpend: 0, shared: 0 });
      a.spend += x.spend; a.clk += x.clk; a.regs += x.regs; a.fd += x.fd; a.rev += x.rev;
      var cn = FD.matchCamp(x.camp || x.ad); a.camps[cn] = 1; a.rows++;
      if (x.status && !FD.OFF_RX.test(x.status)) { a.on[cn] = 1; a.rowsOn++; }
      (campAcct[cn] = campAcct[cn] || {})[x.acct] = 1;
    });
    if (pb) {
      var pbBy = {};
      pb.recs.filter(inP).forEach(function (x) { if (!x.camp) return; var cn = FD.matchCamp(x.camp), q = pbBy[cn] || (pbBy[cn] = { fd: 0, rev: 0, spend: 0 }); q.fd += x.fd; q.rev += x.rev; q.spend += x.spend; });
      Object.keys(campAcct).forEach(function (cn) {
        var owners = Object.keys(campAcct[cn]), q = pbBy[cn]; if (!q) return;
        if (owners.length === 1) { var a = accts[owners[0]]; a.pbFd += q.fd; a.pbRev += q.rev; a.pbSpend += q.spend; }
        else owners.forEach(function (o) { accts[o].shared++; });
      });
      var matched = {}; Object.keys(campAcct).forEach(function (cn) { matched[cn] = 1; });
      Object.keys(pbBy).forEach(function (cn) { if (!matched[cn] && pbBy[cn].spend > 1) { unmatchedPb.fd += pbBy[cn].fd; unmatchedPb.spend += pbBy[cn].spend; unmatchedPb.n++; } });
    }
  }
  var acctList = Object.keys(accts).map(function (k) { var a = accts[k]; a.nCamps = a.rows; a.nOn = a.rowsOn; a.no = fb.acctNo ? fb.acctNo[k] : null; return a; }).sort(function (a, b) { return b.spend - a.spend; });
  var ORDER = { dub: 1, cut: 4, kill: 5, hold: 2, keep: 3, wait: 6, idle: 7 };
  list.sort(function (a, b) { return (ORDER[a.v.code] || 9) - (ORDER[b.v.code] || 9) || b.spend - a.spend; });
  var T = { spend: 0, fd: 0, rev: 0, pbFd: 0, fbFd: 0, pbSpend: 0, fbSpend: 0, both: 0, lost: 0, extra: 0 };
  list.forEach(function (o) {
    T.spend += o.spend; T.fd += o.fd; T.rev += o.rev;
    if (o.pb) { T.pbFd += o.pb.fd; T.pbSpend += o.pb.spend; }
    if (o.fb) { T.fbFd += o.fb.fd; T.fbSpend += o.fb.spend; }
    if (o.cmp) { T.both++; T.cmpPb = (T.cmpPb || 0) + o.cmp.pb.fd; T.cmpFb = (T.cmpFb || 0) + o.cmp.fb.fd; var d = o.cmp.pb.fd - o.cmp.fb.fd; if (d > 0) T.lost += d; else T.extra -= d; }
  });
  T.roi = T.spend ? (T.rev / T.spend - 1) * 100 : null; T.dep = T.fd ? T.spend / T.fd : null;
  /* сверка периодов */
  if (pb && fb) {
    var pbDays = pb.recs.filter(function (x) { return x.dn != null; }).map(function (x) { return x.dn; });
    var pbFrom = pbDays.length ? Math.min.apply(null, pbDays) : null, pbTo = pbDays.length ? Math.max.apply(null, pbDays) : null;
    if (lockFb && pbFrom != null && (pbFrom > fb.start || pbTo < fb.end))
      warn.push('Периоды разные: FB ' + FD.dayStr(fb.start) + '–' + FD.dayStr(fb.end) + ', в Power BI есть ' + FD.dayStr(pbFrom) + '–' + FD.dayStr(pbTo) + '. Сравниваю только общие дни, но у FB внутри больше дней — его депов может быть больше. Для точной сверки выгрузи оба за одни и те же даты.');
    if (!fb.hasFd) warn.push('В выгрузке FB нет колонки «Покупки» (Purchases) — депы FB сравнить не с чем. Добавь колонку в Ads Manager.');
  }
  var groups = {}; list.forEach(function (o) { (groups[o.v.code] = groups[o.v.code] || []).push(o); });
  return { read: read, outP: outP, unmatchedPb: unmatchedPb, accts: acctList, cowards: cowards, rightKills: rightKills, rk: rk, goodHolds: goodHolds, burning: burning, hasStatus: !!(fb && fb.hasStatus), mode: mode || 'cr', list: list, T: T, orphan: orphan, lockFb: lockFb, to: to, groups: groups, warn: warn, lastDay: lastDay, from: from, period: period, hasPb: !!pb, hasFb: !!fb, fbRange: fb && fb.start != null ? FD.dayStr(fb.start) + '–' + FD.dayStr(fb.end) : null };
};

FD.pl = function (n, a, b, c) { var m = Math.abs(n) % 100, k = m % 10; return n + ' ' + (m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c); };
FD.quickSay = function (Q) {
  var g = Q.groups, n = function (k) { return (g[k] || []).length; }, t = 'Короче. ' + (Q.accts && Q.accts.length > 1 ? 'Загружено ' + FD.pl(Q.accts.length, 'кабинет', 'кабинета', 'кабинетов') + '. ' : '');
  var parts = [];
  if (n('dub')) parts.push(n('dub') + ' дублировать');
  if (n('hold')) parts.push(n('hold') + ' держать');
  if (n('keep')) parts.push(n('keep') + ' рано решать, не трогай');
  if (n('cut')) parts.push(n('cut') + ' урезать вдвое');
  if (n('kill')) parts.push(n('kill') + ' выключить');
  if (n('wait')) parts.push(n('wait') + ' не открутились, перезалить');
  if (n('idle')) parts.push(n('idle') + ' уже не тратят');
  t += parts.join(', ') + '. ';
  if (Q.T.roi != null) t += 'ROI ' + (Q.T.roi >= 0 ? 'плюс ' : 'минус ') + FD.pl(Math.abs(Math.round(Q.T.roi)), 'процент', 'процента', 'процентов') + '. ';
  if (Q.hasPb && Q.hasFb && Q.T.lost) t += 'Фейсбук тебе пиздит: потерял ' + FD.pl(Q.T.lost, 'деп', 'депа', 'депов') + ' из ' + (Q.T.cmpPb || Q.T.pbFd) + ' по одним и тем же кампаниям. Решения я приняла… принял по трекеру. ';
  var dubOn = (g.dub || []).filter(function (o) { return !o.off; }), dubOff = (g.dub || []).filter(function (o) { return o.off; });
  if (dubOn[0]) t += 'Первым делом дублируй ' + FD.shortKey(dubOn[0]) + '. ';
  if (dubOff[0]) t += FD.shortKey(dubOff[0]) + ' был в плюсе, а ты его выключил — перезалей. ';
  var killOn = (g.kill || []).filter(function (o) { return !o.off; });
  if (killOn.length) t += 'Выключи: ' + killOn.slice(0, 3).map(function (o) { return FD.shortKey(o); }).join(', ') + (killOn.length > 3 ? ' и остальные из списка.' : '.');
  if (Q.cowards && Q.cowards.length) t += ' И ещё: ' + (Q.mode === 'camp' ? FD.pl(Q.cowards.length, 'кампанию ты вырубил', 'кампании ты вырубил', 'кампаний ты вырубил') : FD.pl(Q.cowards.length, 'креатив ты вырубил', 'креатива ты вырубил', 'креативов ты вырубил')) + ' зря. ' + FD.cowardText(Q.cowards[0], 0).text;
  return t.replace('приняла… принял', FD.g('принял', 'приняла'));
};

FD.COWARD = [
  'Ха-ха, ебать ты ссыкло. Зачем вырубил {k}? {m} — нормальные же цифры были.',
  'Обосрался и выключил {k} на {s}. {m}. Лестница говорила держать, а ты в трусы наложил.',
  '{k} вырубил? {m}. Братан, это не слив, это ты сам себе деньги не дал заработать.',
  'Ссыкло детектед: {k}, {m}. Руки бы убрал — мог заработать.',
  'Опять зассал. {k}: {m}. Так ты Измаилова никогда не догонишь.',
  'Ну и нахуя ты убил {k}? {m}. Он только разгонялся.',
  'Ебать, {k} на {s} выключил. {m}. Моя бабка терпеливее, а она очередь в поликлинике выстаивает.',
  'Пиздец, {k}: {m}. Это был нормальный креатив, а ты его прибил, как муху.',
  'Ха-ха, {k} на {s}? {m}. Фейсбук только начал искать людей, а ты уже рубильник дёрнул.',
  'Слышь, герой, {k} зачем вырубил? {m}. Это не минус, это шум.',
  'Очко сыграло на {k}. {m}. Держал бы до следующей ступеньки — узнал бы правду.',
  '{k}: {m}. Выключил на нервах. Нервы лечи, креативы не трогай.'
];
FD.COWARD_WEAK = [
  'Ссыкло, {k} на {s} вырубил. {m}. Да, некрасиво, но это ещё шум — лестница решает только с $30.',
  '{k}: {m}. Цифры кривые, согласна… согласен. Но на {s} это монетка, а ты уже рубишь. Терпи до $25–30.',
  'Ха-ха, опять нервы. {k}, {s}: {m}. Рано судить, братан, FB ещё не нашёл людей.',
  '{k} на {s}? {m}. Выглядит хреново, но пацаны с такими цифрами иногда вытаскивали. Рубить — с $25 без кликов.'
];
FD.COWARD_SOFT = [
  'Ну… {k} по лестнице выключать было рано ({m}). Но у пацанов держание таких в среднем в минус — так что ты почти прав, ссыкло засчитываю наполовину.',
  '{k}: {m}. По правилам рано, по истории — шансы так себе. Ничья, но в следующий раз доводи до ступеньки.',
  '{k} выключил раньше лестницы ({m}). Пацаны с такими цифрами в среднем тоже не заработали. Повезло тебе, ссыкло.'
];
FD.PRAISE_KILL = [
  'Красава, {k} вырубил правильно: {m}. Это был слив, не жалей.',
  'Вот это по-взрослому. {k}: {m} — тут ловить было нечего.',
  '{k} убит по делу: {m}. Холодная голова, уважаю.',
  'Чётко. {k} — {m}. Выключил вовремя, деньги сберёг.',
  'Правильно, {k} на {s} — {m}. Лестница сказала выкл, ты выключил. Так и надо.'
];
FD.PRAISE_HOLD = [
  'Красава, {k} крутится: {m}. Не трогай оригинал, дублируй в другие РК.',
  '{k} — {m}. Вот это креатив. Не ссышь — и правильно, размножай.',
  'Опа, {k}: {m}. Держишь победителя, уважение. Теперь копии в соседние штаты.',
  '{k} работает: {m}. Так бы с каждым креативом.'
];
FD.ROAST_BURN = [
  '{k} всё ещё жрёт бабки: {m}. Вырубай, хули ждёшь.',
  'Слышь, {k} до сих пор включён? {m}. Это уже не тест, это благотворительность для фейсбука.',
  '{k}: {m}. Его время вышло, а ты всё платишь. Выключай.',
  'Ебать, {k} крутится на {s} без толку. {m}. Рубильник вниз.'
];
FD.pickT = function (arr, i) { return arr[(i + Math.floor(Math.random() * arr.length)) % arr.length]; };
FD.qMetric = function (o, noSpend) {
  var ds = o.life || o, cpc = ds.clk ? ds.spend / ds.clk : null, reg = ds.regs ? ds.spend / ds.regs : null;
  var parts = [];
  if (!noSpend) parts.push('$' + Math.round(ds.spend));
  parts.push(cpc ? 'клик $' + cpc.toFixed(2) : 'кликов нет');
  parts.push(reg ? FD.pl(Math.round(ds.regs), 'рега', 'реги', 'рег') + ' по $' + Math.round(reg) : 'рег нет');
  if (ds.fd) parts.push(FD.pl(Math.round(ds.fd), 'деп', 'депа', 'депов') + ' по $' + Math.round(ds.spend / ds.fd));
  return parts.join(', ');
};
FD.shortKey = function (o) {
  if (!/\|/.test(o.key)) return o.key;
  var tok = (o.key.match(FD.CR_RX) || [])[1], i = o.info || {};
  var fid = (o.key.match(/\|\s*(\d{8,})\s*(?:\||$)/) || [])[1];
  return (tok || o.key.slice(0, 24)) + ' (' + [i.struct, i.launch ? ('0' + i.launch.d).slice(-2) + '.' + ('0' + i.launch.m).slice(-2) : null, i.kid ? 'Кейтаро ' + i.kid : null, fid ? 'id …' + fid.slice(-4) : null].filter(Boolean).join(', ') + ')';
};
FD.fillT = function (tpl, o) { var ds = o.life || o, hasS = tpl.indexOf('{s}') > -1, m = FD.qMetric(o, hasS); if (/[.?!]\s\{m\}/.test(tpl)) m = m.charAt(0).toUpperCase() + m.slice(1); return tpl.replace('{k}', FD.shortKey(o)).replace('{s}', '$' + Math.round(ds.spend)).replace('{m}', m); };
FD.cowardText = function (o, i) {
  var M = o.sim, ok = M && M.n >= 8 && M.held >= 10, net = ok ? M.gainMean - M.lateClosed : null, ex = null;
  var soft = ok && net < 0;
  var ds = o.life || o, cpc = ds.clk ? ds.spend / ds.clk : null, weak = ds.spend < 30 && (cpc == null || cpc > 6 || !ds.regs) && !ds.fd;
  var t = (o.v.code === 'dub' ? FD.pickT(['Ты вырубил ПОБЕДИТЕЛЯ, ебать. ', 'Бля, это же был победитель! ', 'Ты убил курицу, которая несла золотые депы. '], i || 0) : '') + FD.fillT(o._tpl || (o._tpl = FD.pickT(soft ? FD.COWARD_SOFT : weak ? FD.COWARD_WEAK : FD.COWARD, i || 0)), o).replace('согласна… согласен', FD.g('согласен', 'согласна'));
  if (ok) {
    t += ' У пацанов с похожими цифрами держали ' + FD.pl(M.held, 'раз', 'раза', 'раз') + ': деп за неделю случился в ' + Math.round(M.depPct) + '% случаев, в плюс вышли ' + Math.round(M.winPct) + '%, в среднем держать ' + (net >= 0 ? 'выгоднее на $' + Math.round(net) : 'хуже на $' + Math.round(-net)) + '.';
    ex = M.best[0] || null;
    if (ex && !soft) t += ' Например, ' + ex.buyer + ' ' + FD.dayStr(Math.round(Date.UTC(2026, 0, ex.date) / 864e5)) + ' держал похожий ($' + ex.s + ', ' + FD.pl(ex.c, 'клик', 'клика', 'кликов') + ', ' + FD.pl(ex.rg, 'рега', 'реги', 'рег') + ') и за 7 дней сделал +$' + Math.round(ex.gain) + '.';
  } else t += ' Похожих случаев у пацанов мало, но по лестнице — рано было.';
  return { text: t, ex: ex, M: M, soft: soft, net: net };
};

/* «Что делать прямо сейчас»: общий список действий + можно ли это делать в это время (nyH — час в Нью-Йорке, off — разница Минск−NY) */
FD.nowPlan = function (Q, nyH, off) {
  var B = { onDub: [], maybe: [], skip: [], on: [], dub: [], scale: [], reup: [], cut: [], kill: [], keep: [], doneKill: [], dead: [], nofb: [] };
  var hasSt = Q.hasStatus;
  Q.list.forEach(function (o) {
    var ds = o.life || o, known = !!(hasSt && o.fb && o.fbOff != null), isOff = !!(known && o.fbOff), isOn = !known || !o.fbOff;
    if (hasSt && !o.fb) { if (o.v.code !== 'idle') B.nofb.push({ o: o, off: null }); return; }
    var push = function (k, it) { it.off = isOff; B[k].push(it); };
    if (o.v.code === 'idle') { if (known && !isOff && !ds.fd) push('reup', { o: o, why: 'включён, а FB почти не тратит (день ' + o.age + ') — эту выключи, залей копию в другой РК' }); return; }
    var cw = !o.nonUS && ['keep', 'hold', 'dub'].indexOf(o.v.code) > -1 && ds.spend >= 5;
    var win = o.v.code === 'dub' || (o.v.code === 'hold' && ds.fd > 0);
    if (isOff) {
      if (o.v.code === 'dub') push('onDub', { o: o, why: 'был в плюсе — включи обратно и сразу дубли' });
      else if (win) push('on', { o: o, why: 'был в плюсе — включи обратно, дубли пока рано' });
      else if (cw && o.age >= 3 && ds.spend < 30 && !ds.fd) push('dead', { o: o });
      else if (cw) {
        var R = o._risk || (o._risk = FD.riskOf(o));
        if (R.lvl === 'go' || R.lvl === 'small') push('on', { o: o, why: 'вырубил рано — у таких шансы есть' });
        else if (R.lvl === 'no') push('skip', { o: o });
        else push('maybe', { o: o, why: R.lvl === 'lotto' ? 'лотерея: чаще сливает, но иногда выстреливает жирно' : 'похожих случаев мало — решай сам' });
      }
      else if (o.v.code === 'kill' || o.v.code === 'cut') push('doneKill', { o: o });
      return;
    }
    if (o.v.code === 'dub') { push(ds.fd >= 3 && (ds.rev / ds.spend - 1) * 100 >= 50 ? 'scale' : 'dub', { o: o }); return; }
    if (o.v.code === 'wait') { push('reup', { o: o, why: 'FB не берёт в показ — копия в другой РК' }); return; }
    if (o.v.code === 'cut') { push('cut', { o: o }); return; }
    if (o.v.code === 'kill') { push('kill', { o: o }); return; }
    if (isOn) push('keep', { o: o });
  });
  var h = nyH, mk = function (nh) { var x = Math.round(((nh + off) % 24 + 24) % 24); return ('0' + x).slice(-2) + ':00'; };
  var start = mk(7), late = mk(15), ph, launch;
  if (h < 6) { ph = 'night'; launch = { ok: 0, t: 'Нет. В США ночь (' + ('0' + Math.floor(h)).slice(-2) + ':xx), людей нет — включать сейчас тупо: FB потратит на мусор или вообще не открутит. Подготовь копии, пройди модерацию, а включай с ' + start + ' по-твоему (7 утра в Нью-Йорке).' }; }
  else if (h < 11) { ph = 'morning'; launch = { ok: 2, t: 'Да, самое время. В США утро — всё, что включишь сейчас, успеет набрать трафик за день.' }; }
  else if (h < 15) { ph = 'day'; launch = { ok: 2, t: 'Да, ещё можно. В США день. Заливай до ' + late + ' по-твоему — позже уже поздно.' }; }
  else if (h < 17) { ph = 'late'; launch = { ok: 1, t: 'Можно, но только дубли победителей. Новые тесты сейчас не запускай — до вечера не обучатся. Остальное — завтра с ' + start + '.' }; }
  else { ph = 'evening'; launch = { ok: 0, t: 'Нет. В США вечер — до конца их дня мало, новое не успеет обучиться, а бюджет сожрёт. Подготовь всё и включай завтра с ' + start + ' по-твоему.' }; }
  var killT = h < 11 ? { ok: 2, t: 'Да, выключать сливы можно всегда. Только помни: вчерашние депы ещё доезжают в трекер до обеда — если креатив вчера давал депы, глянь его ещё раз ближе к ' + mk(12) + '.' } : { ok: 2, t: 'Да, сливы выключай сразу — каждая минута стоит денег.' };
  var keepT = ph === 'evening' ? 'Вечер в США — самый жирный кусок. Ничего не трогай, поставь автоправила и иди спать.' : ph === 'night' ? 'Ночь в США — цифры почти не меняются. Не дёргай.' : 'Не трогай. Проверь через час-два по лестнице.';
  return { B: B, ph: ph, launch: launch, kill: killT, keepT: keepT, start: start, late: late, hasSt: hasSt };
};

/* где лежит креатив: по РК */
FD.locOf = function (o) {
  var by = {}, L = o.loc || {};
  Object.keys(L).forEach(function (k) { var x = L[k], a = by[x.acct] || (by[x.acct] = { acct: x.acct, no: x.no, camps: [], spend: 0, fd: 0, on: 0, n: 0 }); a.camps.push(x); a.spend += x.spend; a.fd += x.fd; a.n++; if (x.on) a.on++; });
  return Object.keys(by).map(function (k) { by[k].camps.sort(function (a, b) { return b.spend - a.spend; }); return by[k]; }).sort(function (a, b) { return (a.no || 99) - (b.no || 99); });
};
/* «боюсь включать»: риск по истории пацанов */
FD.LADDER_STEPS = [30, 80, 160, 250, 350, 500];
FD.riskOf = function (o) {
  var ds = o.life || o, S = ds.spend, D = Math.round(ds.fd);
  var stop = FD.LADDER_STEPS.filter(function (x) { return x > S + 5; })[0] || Math.round(S + 150), add = Math.round(stop - S);
  var M = null; try { M = FD.similar(S, Math.round(ds.clk), Math.round(ds.regs), D, o.age); } catch (e) {}
  var R = { stop: stop, add: add, M: M && M.held >= 10 ? M : null };
  if (o.nonUS) { R.lvl = 'thin'; R.t = 'Похоже, не США — с пацанами не сравниваю.'; return R; }
  if (!R.M) { R.lvl = 'thin'; R.t = 'Похожих случаев мало — честного шанса не скажу. Хочешь рискнуть — дай максимум ещё $' + add + ' (до $' + stop + '). Нет депа — выключай.'; return R; }
  var p = M.split || { n: 0 }, of10 = function (k) { return p.n ? Math.round(p[k] / p.n * 10) : 0; };
  R.dep = Math.round(M.depPct || 0); R.win = Math.round(M.winPct || 0); R.big10 = of10('big'); R.bigAvg = Math.round(p.bigAvg || 0); R.negAvg = Math.round(p.negAvg || 0); R.posAvg = Math.round(p.posAvg || 0); R.gain = Math.round(M.gainMean); R.n = M.held;
  if (R.gain > 0 && R.win >= 45) R.lvl = 'go';
  else if (R.gain > -20 && (R.win >= 30 || R.dep >= 50)) R.lvl = 'small';
  else if (R.gain > 0) R.lvl = 'lotto';
  else R.lvl = 'no';
  return R;
};
