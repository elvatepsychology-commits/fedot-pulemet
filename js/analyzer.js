/* Разбор выгрузок Power BI (xlsx) прямо в браузере.
   Понимает: отчёт по кампаниям (с макетом или «сводные данные», с днями) и отчёт по креативам (FacebookNew). */
window.FD = window.FD || {};
FD.US = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
FD.NYC = { BF: 'NY', QN: 'NY', YK: 'NY', SY: 'NY', HV: 'NY', BT: 'NY', ES: 'NY', DU: 'NY', OG: 'NY', FR: 'NY', KC: 'MO' };

FD.num = function (v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var s = String(v).replace(/\s/g, '').replace('%', '').replace(',', '.');
  var n = parseFloat(s); return isFinite(n) ? n : 0;
};

FD.readFile = function (file) {
  return file.arrayBuffer().then(function (buf) {
    var wb = XLSX.read(buf, { type: 'array' });
    var ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  });
};

/* разбор названия креатива из генератора */
FD.parseCreative = function (name) {
  /* язык-отдел-заливает-связка-ФОРМАТ-скрипт-штат-слот-бренд-номер, напр. EN-MGM-176-176-STORY-1116-KY-OFF-TMGH-004 */
  var n = String(name || '').replace(/ \d+$/, '').trim(), r = { story: null, fmt: null, geo: null, casino: null, slot: null, own: null };
  var m = n.match(/^[A-Z]{2}-([A-Z]+)-(\d+)-(\d+)-([A-Z]+)-([0-9A-Za-z]+)-([A-Za-z]{2})-([A-Za-z]+)-([A-Za-z0-9]+)-\d+$/);
  if (m) {
    r.fmt = m[4]; r.story = m[4] + '-' + m[5]; r.geo = m[6].toUpperCase(); r.slot = m[7].toUpperCase();
    r.casino = m[8] !== 'na' ? m[8].toUpperCase() : null; r.own = m[2] === m[3] ? 'своя связка' : 'чужая связка';
    return r;
  }
  m = n.match(/^[A-Z]{2}-([A-Z0-9]+(?:-SELEB|-BLACKJACK)?)-([A-Z]{2})-/);
  if (m) { r.story = m[1]; r.fmt = /SELEB|CELEB/.test(m[1]) ? 'CELEBRITYSTORY' : /^STORY/.test(m[1]) ? 'STORY' : m[1]; r.geo = m[2]; return r; }
  m = n.match(/^[A-Z]{2}-AI-([A-Z]{2})-([A-Za-z]+)-/);
  if (m) { r.fmt = 'AI'; r.story = 'AI'; r.geo = m[1]; r.casino = m[2].toUpperCase(); return r; }
  return r;
};
/* разбор названия кампании */
FD.parseCamp = function (raw) {
  var name = String(raw || '').replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
  var r = { name: name, struct: null, cr: null, copy: null, geo: null, agency: null, nd: / by ND$/.test(name) };
  var by = name.match(/ by (.+)$/); if (by) r.agency = by[1];
  var body = name.replace(/ by .+$/, '');
  if (body.indexOf(' | ') > -1) {
    var p = body.split(' | ');
    p.forEach(function (t) {
      t = t.trim();
      if (/^\d{1,2}-\d{1,2}-\d{1,2}$/.test(t)) r.struct = t;
      else if (/^(EN|ES|DE|PT)[-\dA-Z]/.test(t) && t.length > 6 && !r.cr) r.cr = t.replace(/ \d+$/, '');
      else if (/^US\d{3,}/.test(t) && !r.cr) r.cr = t;
    });
    var cp = body.match(/- (\d+)\s*$/); if (cp) r.copy = +cp[1];
  }
  var g = body.match(/^\d+ (?:US PWA |US |PWA |BR PWA )?([A-Z]{2}) /);
  if (g && g[1] !== 'US') r.geo = FD.NYC[g[1]] || g[1];
  
  if (!r.struct) { var cbo = /CBO/.test(body); if (/Longread|Story/.test(body)) r.struct = cbo ? 'CBO' : '1-N-1'; }
  if (r.cr) { var pc = FD.parseCreative(r.cr); if (!r.geo) r.geo = pc.geo; r.story = pc.story; r.casino = pc.casino; r.fmt = pc.fmt; r.slot = pc.slot; r.own = pc.own; }
  return r;
};

FD.detect = function (rows) {
  for (var i = 0; i < Math.min(rows.length, 15); i++) {
    var row = (rows[i] || []).map(function (c) { return c == null ? '' : String(c).trim(); });
    if (row.indexOf('fb_campaign_name') > -1 || row.indexOf('fb_ad_name') > -1) {
      var col = {}; row.forEach(function (c, j) { if (c) col[c] = j; });
      return { hi: i, col: col, type: col.fb_campaign_name != null ? 'campaign' : 'creative' };
    }
  }
  return null;
};

/* решение по креативу (сумма копий) */
FD.decide = function (S, K, R, D, age) {
  age = age || 1;
  var cpc = K ? S / K : null, reg = R ? S / R : null, dep = D ? S / D : null;
  var est = dep != null ? dep : reg != null ? reg * 5 : cpc != null ? cpc * 19 : null;
  function v(code, label, cls, why) { return { code: code, label: label, cls: cls, why: why, cpc: cpc, reg: reg, dep: dep, est: est }; }
  if (D > 0) {
    if (dep <= 110) return v('dub', 'ДУБЛЬ', 'acc', 'Деп по $' + Math.round(dep) + '. Оригинал не трогай, 3 новые копии по $200–300 в соседние штаты.');
    if (dep <= 150) return v('hold', 'ДЕРЖИ', 'good', 'Деп по $' + Math.round(dep) + ', в плюсе. Бюджет не трогай.');
    if (age >= 3 || S >= 300) return v('cut', 'РЕЖЬ ×0,5', 'warn', 'Деп по $' + Math.round(dep) + ' дороже $150, и креатив уже не новый. Режь вдвое, замена должна быть залита.');
    return v('hold', 'ДЕРЖИ', 'good', 'Деп дороже $150, но спенда мало. Смотри снова после $300.');
  }
  if (S < 5) return v('wait', 'ЖДИ / ПЕРЕЗАЛЕЙ', 'muted', 'Почти не крутилась. Если прошло 3+ часа американского дня — новые копии в другой аккаунт.');
  if (S < 30) { if (S >= 25 && K === 0) return v('kill', 'ВЫКЛ', 'kill', '$' + Math.round(S) + ' и ноль кликов. Креатив мёртвый.'); return v('keep', 'НЕ ТРОГАЙ', 'good', 'До $30 это шум. Руки убрал.'); }
  if (S >= 160) return v('kill', 'ВЫКЛ', 'kill', '$' + Math.round(S) + ' без депа — выплата сожжена.');
  if (S < 80) {
    if (cpc == null || cpc > 8) return v('kill', 'ВЫКЛ', 'kill', 'Клик ' + (cpc == null ? 'не было' : '$' + cpc.toFixed(2)) + ' — деп выйдет $150+.');
    if (R === 0 && S >= 60) return v('kill', 'ВЫКЛ', 'kill', '$' + Math.round(S) + ' и ни одной реги.');
    return v('keep', 'ДЕРЖИ', 'good', 'Клик $' + cpc.toFixed(2) + ', прогноз депа ~$' + Math.round(est) + '. Смотри снова на $80.');
  }
  if (reg == null || reg >= 32) return v('kill', 'ВЫКЛ', 'kill', 'Рега ' + (reg == null ? 'нет' : '$' + reg.toFixed(1)) + ' — деп будет дороже выплаты.');
  if (R >= 3 && reg <= 25) return v('keep', 'ДЕРЖИ ДО $160', 'warn', 'Рега $' + reg.toFixed(1) + ', прогноз депа ~$' + Math.round(reg * 5) + '. Деп может доехать.');
  return v('keep', 'ДЕРЖИ ДО $120', 'warn', 'Рег мало или дороговаты. Нет депа к $120 — выкл.');
};

function q(arr, p) { if (!arr.length) return 0; var a = arr.slice().sort(function (x, y) { return x - y; }); var i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); }
FD.q = q;

FD.analyze = function (rows, fname) {
  var det = FD.detect(rows); if (!det) throw new Error('Не нашёл заголовки. Нужна выгрузка из Power BI с колонками fb_campaign_name или fb_ad_name.');
  var c = det.col, data = rows.slice(det.hi + 1);
  /* у выгрузки «с макетом» верхние уровни (год, месяц, день, баер, кампания) пустые в строках ниже — протягиваем вниз */
  var H = ['Дата — Год', 'Дата — Месяц', 'Дата — День', 'buyer', 'fb_campaign_name', 'fb_adset_name', 'fb_ad_name'].filter(function (k) { return c[k] != null; });
  var ctx = {};
  data = data.map(function (r) {
    r = (r || []).slice();
    var lvl = -1;
    H.forEach(function (k, i) { var v = r[c[k]]; if (v != null && v !== '') { if (lvl < 0) lvl = i; } });
    if (lvl < 0) return r;
    H.forEach(function (k, i) {
      var v = r[c[k]];
      if (i < lvl) { if (v == null || v === '') r[c[k]] = ctx[k]; }
      else if (v != null && v !== '') ctx[k] = v; else ctx[k] = null;
    });
    return r;
  });
  var spendCol = c['Спэнд+%'] != null ? c['Спэнд+%'] : c['Спэнд'];
  function g(r, k) { return c[k] != null ? r[c[k]] : null; }
  var recs = [];
  if (det.type === 'campaign') {
    var hasTotalAdset = data.some(function (r) { return String(g(r, 'fb_adset_name')) === 'Total'; });
    data.forEach(function (r) {
      var day = g(r, 'Дата — День'), camp = g(r, 'fb_campaign_name');
      if (camp == null || String(camp).trim() === 'Total' || String(camp).trim() === '') return;
      if (typeof day !== 'number' && !/^\d+$/.test(String(day))) return;
      var ad = g(r, 'fb_adset_name');
      if (hasTotalAdset && String(ad) !== 'Total') return;
      recs.push({ day: +day, month: g(r, 'Дата — Месяц'), camp: String(camp), adset: hasTotalAdset ? null : (ad != null ? String(ad) : null), ad: hasTotalAdset ? null : (g(r, 'fb_ad_name') != null ? String(g(r, 'fb_ad_name')) : null),
        spend: FD.num(r[spendCol]), imp: FD.num(g(r, 'Impressions')), clk: FD.num(g(r, 'Click')), regs: FD.num(g(r, 'Regs')), fd: FD.num(g(r, 'FD')), rev: FD.num(g(r, 'К выплате')) });
    });
  } else {
    data.forEach(function (r) {
      var ad = g(r, 'fb_ad_name'); if (ad == null) return; ad = String(ad);
      if (ad === 'Total' || /automatic|Примененные/.test(ad) || String(g(r, 'offer_name')) !== 'Total') return;
      recs.push({ day: null, camp: null, ad: ad, spend: FD.num(r[spendCol]), imp: FD.num(g(r, 'Impressions')), clk: FD.num(g(r, 'Click')), regs: FD.num(g(r, 'Regs')), fd: FD.num(g(r, 'FD')), rev: FD.num(g(r, 'К выплате')) });
    });
  }
  if (!recs.length) throw new Error('Строк с цифрами не нашёл. Проверь, что выгрузка с днями и с названиями кампаний или креативов.');

  var R = { file: fname, type: det.type, flat: det.type === 'campaign' && recs.some(function (x) { return x.ad; }) };
  var tot = { spend: 0, imp: 0, clk: 0, regs: 0, fd: 0, rev: 0 };
  recs.forEach(function (x) { ['spend', 'imp', 'clk', 'regs', 'fd', 'rev'].forEach(function (k) { tot[k] += x[k]; }); });
  tot.roi = tot.spend ? (tot.rev / tot.spend - 1) * 100 : 0; tot.dep = tot.fd ? tot.spend / tot.fd : null; tot.ctr = tot.imp ? tot.clk / tot.imp * 100 : 0;
  tot.cpc = tot.clk ? tot.spend / tot.clk : null; tot.reg = tot.regs ? tot.spend / tot.regs : null; tot.payout = tot.fd ? tot.rev / tot.fd : FD.PAYOUT;
  R.tot = tot;

  /* креативы */
  var cr = {}, camps = {};
  recs.forEach(function (x) {
    var pc = x.camp ? FD.parseCamp(x.camp) : null;
    var key, meta;
    if (x.ad && det.type === 'creative') { key = x.ad.replace(/ \d+$/, ''); meta = FD.parseCreative(key); }
    else if (pc && pc.cr) { key = pc.cr; meta = { story: pc.story, geo: pc.geo, casino: pc.casino, fmt: pc.fmt, slot: pc.slot, own: pc.own }; }
    else if (x.ad && !/^\d+ \| /.test(x.ad)) { key = x.ad; meta = FD.parseCreative(x.ad); if (!meta.geo && pc) meta.geo = pc.geo; }
    else { key = pc ? pc.name : x.ad; meta = { story: null, geo: pc && pc.geo, casino: null }; }
    if (pc && pc.nd) return; // строки-постбэки без спенда
    var o = cr[key] || (cr[key] = { key: key, spend: 0, imp: 0, clk: 0, regs: 0, fd: 0, rev: 0, days: {}, camps: {}, geo: meta.geo, story: meta.story, casino: meta.casino, fmt: meta.fmt || null, slot: meta.slot || null, own: meta.own || null, first: 99, last: 0 });
    ['spend', 'imp', 'clk', 'regs', 'fd', 'rev'].forEach(function (k) { o[k] += x[k]; });
    if (x.day != null && x.spend > 0) { o.days[x.day] = (o.days[x.day] || 0) + x.spend; o.first = Math.min(o.first, x.day); o.last = Math.max(o.last, x.day); }
    if (x.camp) o.camps[x.camp] = 1;
    if (x.camp) {
      var cm = camps[x.camp] || (camps[x.camp] = { name: x.camp, p: pc, spend: 0, fd: 0, rev: 0, days: {}, first: 99, last: 0, adsets: {} });
      cm.spend += x.spend; cm.fd += x.fd; cm.rev += x.rev;
      if (x.spend > 0) { cm.days[x.day] = (cm.days[x.day] || 0) + x.spend; cm.first = Math.min(cm.first, x.day); cm.last = Math.max(cm.last, x.day); }
      if (x.adset) cm.adsets[x.adset] = 1;
    }
  });
  var crs = Object.keys(cr).map(function (k) { return cr[k]; }).filter(function (o) { return o.spend > 0.5 || o.fd > 0; });
  var maxDay = 0; recs.forEach(function (x) { if (x.day) maxDay = Math.max(maxDay, x.day); });
  R.maxDay = maxDay;
  crs.forEach(function (o) {
    o.age = Object.keys(o.days).length || 1; o.copies = Object.keys(o.camps).length;
    o.roi = o.spend ? (o.rev / o.spend - 1) * 100 : 0;
    o.active = det.type === 'creative' ? true : (o.last >= maxDay - 1);
    o.v = FD.decide(o.spend, o.clk, o.regs, o.fd, o.age);
  });
  crs.sort(function (a, b) { return b.spend - a.spend; });
  R.crs = crs;

  /* шанс депа по корзинам спенда */
  R.hit = FD.BUCKETS.map(function (b) { var xs = crs.filter(function (o) { return o.spend > b[0] && o.spend <= b[1]; }); return { n: xs.length, hit: xs.length ? Math.round(xs.filter(function (o) { return o.fd > 0; }).length / xs.length * 100) : null }; });
  var dropped = crs.filter(function (o) { return o.fd === 0 && o.spend > 1 && (det.type === 'creative' || o.last < maxDay - 1); });
  R.drop = [q(dropped.map(function (o) { return o.spend; }), .5), q(dropped.map(function (o) { return o.spend; }), .75), q(dropped.map(function (o) { return o.spend; }), .9)].map(Math.round);
  R.withFd = crs.length ? Math.round(crs.filter(function (o) { return o.fd > 0; }).length / crs.length * 100) : 0;
  R.over80 = crs.length ? Math.round(crs.filter(function (o) { return o.spend > 80; }).length / crs.length * 100) : 0;
  var srt = crs.slice().sort(function (a, b) { return b.fd - a.fd; }), top = srt.slice(0, Math.max(1, Math.round(crs.length * 0.1)));
  R.topShare = tot.fd ? Math.round(top.reduce(function (s, o) { return s + o.fd; }, 0) / crs.reduce(function (s, o) { return s + o.fd; }, 0) * 100) : 0;

  /* по дням */
  if (det.type === 'campaign') {
    var days = {};
    recs.forEach(function (x) { var d = days[x.day] || (days[x.day] = { day: x.day, spend: 0, fd: 0, rev: 0 }); d.spend += x.spend; d.fd += x.fd; d.rev += x.rev; });
    var cl = Object.keys(camps).map(function (k) { return camps[k]; }).filter(function (m) { return m.spend > 0; });
    cl.forEach(function (m) { Object.keys(m.days).forEach(function (d) { if (m.days[d] > 5) days[d].live = (days[d].live || 0) + 1; }); if (days[m.first]) days[m.first].newC = (days[m.first].newC || 0) + 1; });
    crs.forEach(function (o) { if (days[o.first]) days[o.first].newCr = (days[o.first].newCr || 0) + 1; });
    R.days = Object.keys(days).map(function (k) { var d = days[k]; d.roi = d.spend ? (d.rev / d.spend - 1) * 100 : 0; d.live = d.live || 0; d.newC = d.newC || 0; d.newCr = d.newCr || 0; return d; }).sort(function (a, b) { return a.day - b.day; });
    R.camps = cl;
    var st = {}; cl.forEach(function (m) { var k = (m.p && m.p.struct) || '?'; var s = st[k] || (st[k] = { k: k, n: 0, spend: 0, rev: 0, fd: 0 }); s.n++; s.spend += m.spend; s.rev += m.rev; s.fd += m.fd; });
    R.structs = Object.keys(st).map(function (k) { var s = st[k]; s.roi = s.spend ? (s.rev / s.spend - 1) * 100 : 0; return s; }).sort(function (a, b) { return b.spend - a.spend; });
    R.campLife = q(cl.map(function (m) { return m.spend; }), .5);
    var sd = R.days.filter(function (d) { return d.spend > 0; });
    R.avgNewC = sd.length ? sd.reduce(function (s, d) { return s + d.newC; }, 0) / sd.length : 0;
    R.peakNewC = Math.max.apply(null, R.days.map(function (d) { return d.newC; }).concat([0]));
    R.peakLive = Math.max.apply(null, R.days.map(function (d) { return d.live; }).concat([0]));
    R.avgNewCr = sd.length ? sd.reduce(function (s, d) { return s + d.newCr; }, 0) / sd.length : 0;
    if (R.flat) { var asz = cl.map(function (m) { return Object.keys(m.adsets).length; }).filter(Boolean); R.adsetsMed = q(asz, .5); }
  }
  function grp(field) {
    var m = {}; crs.forEach(function (o) { var k = o[field]; if (!k) return; var s = m[k] || (m[k] = { k: k, n: 0, spend: 0, fd: 0, rev: 0, clk: 0, regs: 0 }); s.n++; s.spend += o.spend; s.fd += o.fd; s.rev += o.rev; s.clk += o.clk; s.regs += o.regs; });
    return Object.keys(m).map(function (k) { var s = m[k]; s.roi = s.spend ? (s.rev / s.spend - 1) * 100 : 0; s.dep = s.fd ? s.spend / s.fd : null; return s; }).sort(function (a, b) { return b.spend - a.spend; });
  }
  R.geos = grp('geo').filter(function (s) { return FD.US.indexOf(s.k) > -1; });
  R.stories = grp('story'); R.casinos = grp('casino'); R.formats = grp('fmt'); R.owns = grp('own');
  R.talk = FD.roast(R);
  return R;
};

/* ---------- Федот комментирует ---------- */
FD.roast = function (R) {
  var t = R.tot, B = FD.BENCH, out = [], f = function (n) { return Math.round(n).toLocaleString('ru-RU'); };
  if (t.roi >= 100) out.push({ mood: 'happy', text: 'Плюс ' + f(t.roi) + ' процентов. Ну ахуеть, это уровень Ивана и Эндлесс Дрима. Не расслабляйся, теперь объём.' });
  else if (t.roi >= 40) out.push({ mood: null, text: 'Плюс ' + f(t.roi) + ' процентов. Норм, на уровне Измаилова. Но у Эндлесс Дрима плюс сто семьдесят четыре на тех же офферах, так что есть куда расти.' });
  else if (t.roi >= 0) out.push({ mood: 'angry', text: 'Плюс ' + f(t.roi) + ' процентов. Это почти ноль, братан. Ты работаешь на фейсбук, а не на себя.' });
  else out.push({ mood: 'angry', text: 'Минус ' + f(-t.roi) + ' процентов. Ты сливаешь бабки. Даже моя бабка, которая думает, что фейсбук это газета, льёт в плюс.' });
  if (R.days) {
    if (R.peakNewC < B.izm.peakNewCamps) out.push({ mood: 'angry', text: 'Максимум ' + R.peakNewC + ' новых кампаний за день. Измаилов шестого октября залил сорок семь, Эндлесс Дрим пятьдесят девять. Ты так его хуй обгонишь.' });
    else out.push({ mood: 'happy', text: R.peakNewC + ' новых кампаний за день. Охуенно, это уровень Измаилова. Вот так и ебашь.' });
    if (R.peakLive < 30) out.push({ mood: null, text: 'Живых кампаний максимум ' + R.peakLive + '. У Измаилова было восемьдесят две. Объём — твоя главная дыра.' });
  }
  var sts = (R.structs || []).filter(function (s) { return s.k && s.k !== '?' && s.spend >= 150; });
  if (sts.length >= 2) {
    var best = sts.slice().sort(function (a, b) { return b.roi - a.roi; })[0], worst = sts.slice().sort(function (a, b) { return a.roi - b.roi; })[0];
    if (best.roi - worst.roi >= 30) out.push({ mood: worst.roi < 0 ? 'angry' : null, text: 'Схемы: ' + best.k + ' даёт ' + (best.roi >= 0 ? 'плюс ' : 'минус ') + Math.abs(Math.round(best.roi)) + ', а ' + worst.k + ' ' + (worst.roi >= 0 ? 'плюс ' : 'минус ') + Math.abs(Math.round(worst.roi)) + ' процентов. Но сначала проверь, не рубил ли ты ' + worst.k + ' на пятнадцати баксах. Если рубил, схема тут ни при чём.' });
  }
  if (R.drop[0] && R.drop[0] < 20) out.push({ mood: 'angry', text: 'Креатив без депа ты бросаешь в среднем на ' + R.drop[0] + ' баксах. Вся команда — на двадцати пяти, а каждый десятый держит до восьмидесяти четырёх. Ты убиваешь их раньше, чем они проснулись. До тридцати руки убрал.' });
  if (t.ctr && t.ctr < 3.2) out.push({ mood: null, text: 'Кликают ' + t.ctr.toFixed(1) + ' из сотни. У пацанов три и девять. Первые две строки истории говно, переписывай крючок.' });
  if (t.reg) {
    var rr = FD.TEAM.regRoi.find(function (x) { return t.reg <= x[0]; }) || [0, -20];
    out.push({ mood: t.reg > 18 ? 'angry' : 'happy', text: 'Рега по ' + t.reg.toFixed(1) + '. У всей команды при такой реге ROI в среднем ' + (rr[1] > 0 ? 'плюс ' : 'минус ') + Math.abs(rr[1]) + ' процентов. ' + (t.reg > 14 ? 'А у кого рега до четырнадцати — плюс сто восемнадцать. Переписывай первые строки и фото.' : 'Это уровень лучших, красава.') });
  }
  var dub = R.crs.filter(function (o) { return o.v.code === 'dub' && o.active; }).length, kill = R.crs.filter(function (o) { return o.v.code === 'kill' && o.active; }).length;
  if (R.type === 'campaign') {
    if (dub) out.push({ mood: 'happy', text: 'Есть ' + dub + ' живых креативов, которые надо размножать прямо сейчас. Не сиди, дублируй в соседние штаты.' });
    if (kill) out.push({ mood: 'angry', text: kill + ' живых креативов жрут бабки впустую. Вырубай, список ниже.' });
  } else {
    var win = R.crs.filter(function (o) { return o.fd > 0 && o.spend / o.fd <= 110; }).length;
    if (win) out.push({ mood: 'happy', text: 'За период ' + win + ' креативов дали деп по сто десять и дешевле. Это твоя база: раскатывай эти истории на новые штаты.' });
    out.push({ mood: null, text: 'Это отчёт без дней, поэтому решения тут по итогам периода. Чтобы понять, что выключать сегодня, кинь отчёт по кампаниям с днями.' });
  }
  var nonStory = R.formats.filter(function (f) { return f.k !== 'STORY' && f.spend > 20; });
  if (nonStory.length) {
    var ns = nonStory.reduce(function (a, f) { return a + f.spend; }, 0), nr = nonStory.reduce(function (a, f) { return a + f.rev; }, 0);
    out.push({ mood: nr < ns ? 'angry' : null, text: 'Кроме историй ты льёшь ' + nonStory.map(function (f) { return f.k; }).join(', ') + ' на ' + Math.round(ns) + ' баксов, ROI ' + (nr >= ns ? 'плюс ' : 'минус ') + Math.abs(Math.round((nr / ns - 1) * 100)) + ' процентов. У всей компании всё, кроме историй, в минусе. Тесты — максимум десять процентов бюджета.' });
  }
  var bad = R.geos.filter(function (s) { var st = FD.STATES[s.k]; return st && st.tier === 'stop' && s.spend > 30 && s.roi < 30; });
  if (bad.length) out.push({ mood: 'shock', text: 'В ' + bad.slice(0, 6).map(function (s) { return s.k; }).join(', ') + ' у тебя минус, и у команды там сейчас тоже плохо. Переезжай в Индиану, Миссури, Теннесси, Айдахо.' });
  return out;
};
