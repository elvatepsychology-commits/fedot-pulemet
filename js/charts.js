/* Простые SVG-графики без библиотек. */
window.FD = window.FD || {};
FD.ch = {};
var NS = 'http://www.w3.org/2000/svg';
FD.ch.svg = function (el, w, h) {
  el.innerHTML = '';
  var s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); s.setAttribute('class', 'chart-svg');
  el.appendChild(s);
  s.add = function (t, a, txt) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; s.appendChild(e); return e; };
  return s;
};
FD.ch.money = function (v) { return '$' + Math.round(v).toLocaleString('ru-RU'); };

/* горизонтальные бары: items [{label, value, color, note}] */
FD.ch.hbars = function (el, items, o) {
  o = o || {};
  var W = 560, rowH = 34, L = o.labelW || 150, R = 70, H = items.length * rowH + 10;
  var s = FD.ch.svg(el, W, H);
  var max = o.max || Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); })) || 1;
  var min = o.min != null ? o.min : Math.min(0, Math.min.apply(null, items.map(function (i) { return i.value; })));
  var span = max - min, pw = W - L - R;
  function x(v) { return L + (v - min) / span * pw; }
  if (min < 0) s.add('line', { x1: x(0), x2: x(0), y1: 0, y2: H, stroke: 'var(--line)', 'stroke-width': 1.5 });
  items.forEach(function (it, i) {
    var y = 6 + i * rowH, x0 = x(Math.min(0, it.value)), x1 = x(Math.max(0, it.value));
    s.add('text', { x: L - 10, y: y + 18, 'text-anchor': 'end', class: 'lbl' }, it.label);
    var r = s.add('rect', { x: x0, y: y + 4, width: Math.max(2, x1 - x0), height: rowH - 12, rx: 6, fill: it.color || 'var(--acc)' });
    r.style.animationDelay = (i * 60) + 'ms'; r.setAttribute('class', 'grow');
    s.add('text', { x: (it.value < 0 ? x(0) + 6 : x1 + 6), y: y + 19, 'text-anchor': 'start', class: 'val' }, it.text != null ? it.text : it.value);
  });
};

/* вертикальные группы: cats [], series [{name,color,values[]}] */
FD.ch.vgroups = function (el, cats, series, o) {
  o = o || {};
  var W = 600, H = 260, L = 40, B = 40, T = 18, R = 8;
  var s = FD.ch.svg(el, W, H);
  var max = o.max || Math.max.apply(null, series.flatMap(function (se) { return se.values.filter(function (v) { return v != null; }); })) * 1.1;
  var pw = W - L - R, ph = H - T - B, gw = pw / cats.length, bw = Math.min(26, gw * 0.8 / series.length);
  function y(v) { return T + ph - v / max * ph; }
  (o.ticks || []).forEach(function (t) {
    s.add('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), stroke: 'var(--line)' });
    s.add('text', { x: L - 6, y: y(t) + 4, 'text-anchor': 'end', class: 'tick' }, (o.pre || '') + t + (o.suf || ''));
  });
  cats.forEach(function (c, i) {
    var gx = L + i * gw + (gw - bw * series.length) / 2;
    series.forEach(function (se, j) {
      var v = se.values[i]; if (v == null) return;
      var r = s.add('rect', { x: gx + j * bw + 1, y: y(v), width: bw - 2, height: Math.max(1, y(0) - y(v)), rx: 3, fill: se.color, class: 'growv' });
      r.style.animationDelay = (i * 80 + j * 40) + 'ms';
      if (o.labels !== false) s.add('text', { x: gx + j * bw + bw / 2, y: y(v) - 4, 'text-anchor': 'middle', class: 'val sm' }, (o.pre || '') + v + (o.suf || ''));
    });
    s.add('text', { x: L + i * gw + gw / 2, y: H - B + 18, 'text-anchor': 'middle', class: 'lbl' }, c);
  });
  if (series.length > 1) {
    var lx = L;
    series.forEach(function (se) {
      s.add('rect', { x: lx, y: H - 12, width: 10, height: 10, rx: 2, fill: se.color });
      s.add('text', { x: lx + 14, y: H - 3, class: 'tick' }, se.name); lx += 14 + se.name.length * 7 + 16;
    });
  }
};

/* линии */
FD.ch.lines = function (el, xs, series, o) {
  o = o || {};
  var W = 600, H = 240, L = 44, B = 34, T = 16, R = 16;
  var s = FD.ch.svg(el, W, H);
  var max = o.max, pw = W - L - R, ph = H - T - B;
  function y(v) { return T + ph - v / max * ph; } function x(i) { return L + i * pw / (xs.length - 1); }
  (o.ticks || []).forEach(function (t) {
    s.add('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), stroke: 'var(--line)' });
    s.add('text', { x: L - 6, y: y(t) + 4, 'text-anchor': 'end', class: 'tick' }, '$' + t);
  });
  if (o.hline) { s.add('line', { x1: L, x2: W - R, y1: y(o.hline[0]), y2: y(o.hline[0]), stroke: 'var(--muted)', 'stroke-dasharray': '6 4', 'stroke-width': 2 }); s.add('text', { x: W - R, y: y(o.hline[0]) - 6, 'text-anchor': 'end', class: 'tick' }, o.hline[1]); }
  xs.forEach(function (lb, i) { s.add('text', { x: x(i), y: H - B + 18, 'text-anchor': 'middle', class: 'tick' }, lb); });
  series.forEach(function (se) {
    var d = se.values.map(function (v, i) { return (i ? 'L' : 'M') + x(i) + ' ' + y(v); }).join(' ');
    var p = s.add('path', { d: d, fill: 'none', stroke: se.color, 'stroke-width': 3.5, 'stroke-linejoin': 'round', class: 'draw' });
    se.values.forEach(function (v, i) { s.add('circle', { cx: x(i), cy: y(v), r: 4, fill: se.color }); });
    s.add('text', { x: x(se.values.length - 1) - 4, y: y(se.values[se.values.length - 1]) - 10, 'text-anchor': 'end', class: 'val', fill: se.color }, se.name);
  });
};

/* часы: 24ч */
FD.ch.clock = function (el) {
  var W = 600, H = 150, L = 96, R = 10, s = FD.ch.svg(el, W, H), hw = (W - L - R) / 24;
  function x(h) { return L + h * hw; }
  s.add('rect', { x: x(6), y: 34, width: x(14) - x(6), height: 34, rx: 6, fill: 'var(--night)' });
  s.add('rect', { x: x(14), y: 34, width: x(18) - x(14), height: 34, rx: 6, fill: 'var(--acc)' });
  s.add('rect', { x: x(18), y: 34, width: x(24) - x(18), height: 34, rx: 6, fill: 'var(--good)' });
  s.add('rect', { x: x(0), y: 34, width: x(6) - x(0), height: 34, rx: 6, fill: 'var(--good)' });
  s.add('text', { x: (x(6) + x(14)) / 2, y: 56, 'text-anchor': 'middle', class: 'lbl inv' }, 'США спит');
  s.add('text', { x: (x(14) + x(18)) / 2, y: 56, 'text-anchor': 'middle', class: 'lbl inv' }, 'ЗАЛИВ');
  s.add('text', { x: (x(18) + x(24)) / 2, y: 56, 'text-anchor': 'middle', class: 'lbl inv' }, 'БАБКИ');
  s.add('text', { x: (x(0) + x(6)) / 2, y: 56, 'text-anchor': 'middle', class: 'lbl inv' }, 'БАБКИ');
  s.add('text', { x: L - 8, y: 56, 'text-anchor': 'end', class: 'lbl' }, 'Москва');
  [['Нью-Йорк', -7, 96], ['Айдахо', -9, 122]].forEach(function (r) { s.add('text', { x: L - 8, y: r[2], 'text-anchor': 'end', class: 'tick' }, r[0]); });
  for (var h = 0; h <= 24; h += 3) {
    s.add('text', { x: x(h), y: 24, 'text-anchor': 'middle', class: 'tick b' }, (h % 24 < 10 ? '0' : '') + (h % 24));
    [[-7, 96], [-9, 122]].forEach(function (r) { var t = ((h + r[0]) % 24 + 24) % 24; s.add('text', { x: x(h), y: r[1], 'text-anchor': 'middle', class: 'tick' }, (t < 10 ? '0' : '') + t); });
  }
};

/* шаблоны графиков для слайдов курса */
FD.ch.slide = function (el, kind) {
  var B = FD.BENCH, C = { acc: 'var(--acc)', good: 'var(--good)', warn: 'var(--warn)', kill: 'var(--kill)', gold: 'var(--gold)', mute: 'var(--muted)' };
  if (kind === 'forget') FD.ch.lines(el, ['сразу', '1 день', '2 дня', '6 дней', '1 мес'], [{ name: 'без повтора', color: C.kill, values: [100, 45, 35, 25, 20] }, { name: 'с повтором', color: C.good, values: [100, 90, 92, 90, 88] }], { max: 110, ticks: [] });
  if (kind === 'truth') FD.ch.hbars(el, [{ label: 'Цена депа: ты', value: 90, color: C.gold, text: '$90' }, { label: 'Цена депа: он', value: 91, color: C.acc, text: '$91' }, { label: 'Спенд/день: ты', value: 531, color: C.gold, text: '$531' }, { label: 'Спенд/день: он', value: 9698, color: C.acc, text: '$9 698' }], { max: 9698 });
  if (kind === 'ramp') FD.ch.vgroups(el, ['26.09', '27.09', '30.09', '1.10', '2.10', '3.10', '4.10', '6.10'], [{ name: 'спенд', color: C.acc, values: [111, 224, 179, 572, 1863, 5380, 6174, 9698] }], { max: 11000, ticks: [0, 5000, 10000], pre: '$' });
  if (kind === 'packs') FD.ch.hbars(el, [{ label: 'Пачка 1 (Longread)', value: 88, color: C.good, text: '+88%' }, { label: 'Пачка 2 (Story)', value: 13, color: C.warn, text: '+13%' }], { max: 100 });
  if (kind === 'lottery') FD.ch.hbars(el, [{ label: '1 копия', value: 47, color: C.warn, text: '47% ловят деп' }, { label: '3 копии', value: 89, color: C.good, text: '89% ловят деп' }], { max: 100 });
  if (kind === 'decay') FD.ch.lines(el, ['д1', 'д2', 'д3', 'д4', 'д5', 'д6', 'д7'], [{ name: 'цена 1000 показов', color: C.acc, values: [91, 100, 115, 132, 137, 148, 146] }, { name: 'цена депа', color: C.kill, values: [80, 88, 90, 105, 98, 96, 140] }], { max: 180, ticks: [0, 50, 100, 150], hline: [158, 'выплата'] });
  if (kind === 'clock') FD.ch.clock(el);
  if (kind === 'hit') FD.ch.vgroups(el, FD.BUCKET_LABELS, [{ name: 'Вся команда', color: C.acc, values: FD.TEAM.hit }, { name: 'ED', color: C.good, values: B.ed.hit }, { name: 'Ты', color: C.kill, values: B.me.hit }], { max: 110, ticks: [0, 50, 100], suf: '%', labels: false });
  if (kind === 'ladder') {
    el.innerHTML = '<div class="ladder">' + [['$0–30', 'НЕ ТРОГАЙ', 'good', 'Это шум. Выкл только если ноль кликов к $25.'], ['$30–80', 'ЦЕНА КЛИКА', 'warn', 'Клик дороже $8 = выкл. Нет реги к $60 = выкл.'], ['$80–160', 'РЕГИ', 'warn', 'Держи, если реги по $25 и дешевле, и их 3+.'], ['$160+', 'ВЫКЛ', 'kill', 'Ноль депов = нахуй. Без разговоров.']].map(function (r, i) {
      return '<div class="rung" style="animation-delay:' + i * 120 + 'ms"><span class="mono">' + r[0] + '</span><span class="pill ' + r[2] + '">' + r[1] + '</span><p>' + FD.clean(r[3]) + '</p></div>';
    }).join('') + '</div>';
  }
  if (kind === 'statesgo' || kind === 'statestest' || kind === 'statesstop') {
    var tier = { statesgo: 'go', statestest: 'test', statesstop: 'stop' }[kind];
    el.innerHTML = '<div class="state-grid">' + Object.keys(FD.STATES).filter(function (k) { return FD.STATES[k].tier === tier; }).map(function (k, i) {
      var st = FD.STATES[k], t = FD.TIER[st.tier];
      return '<div class="state ' + t[1] + '" style="animation-delay:' + i * 50 + 'ms"><b>' + k + '</b><span>' + st.n + '</span><em>' + st.all + '</em></div>';
    }).join('') + '</div>';
  }
  if (kind === 'casinos') {
    var cs = FD.CASINOS.filter(function (c, i) { return i < 8 || c[4] === 'stop'; }).slice(0, 14);
    FD.ch.hbars(el, cs.map(function (c) { return { label: c[0] + ' · ' + c[1], value: c[2], color: c[2] >= 50 ? C.good : c[2] >= 0 ? C.warn : C.kill, text: (c[2] > 0 ? '+' : '') + c[2] + '%' }; }), { max: 170, min: -70, labelW: 150 });
  }
  if (kind === 'reg') FD.ch.hbars(el, [{ label: 'рега до $10', value: 84, color: C.good, text: '+84%' }, { label: 'рега $10–14', value: 118, color: C.good, text: '+118%' }, { label: 'рега $14–18', value: 74, color: C.good, text: '+74%' }, { label: 'рега $18–22 (ты)', value: 39, color: C.warn, text: '+39%' }, { label: 'рега $22–30', value: 12, color: C.warn, text: '+12%' }, { label: 'рега $30+', value: -20, color: C.kill, text: '−20%' }], { max: 130, min: -30, labelW: 150 });
  if (kind === 'market') FD.ch.vgroups(el, ['1–15 сен', '16–30 сен', '1–10 окт', '11–18 окт'], [{ name: 'ROI команды', color: C.acc, values: [88, 72, 77, 31] }], { max: 100, ticks: [0, 50, 100], suf: '%' });
  if (kind === 'firstdep') FD.ch.hbars(el, [{ label: '25% депов', value: 45, color: C.good, text: 'до $45' }, { label: '50% депов', value: 82, color: C.good, text: 'до $82' }, { label: '75% депов', value: 140, color: C.warn, text: 'до $140' }, { label: '90% депов', value: 212, color: C.kill, text: 'до $212' }], { max: 230 });
  if (kind === 'beat') FD.ch.hbars(el, [{ label: 'Измаилов, деп $91', value: 4700, color: C.acc, text: '$4 700/день' }, { label: 'Ты сейчас, деп $90', value: 4500, color: C.gold, text: '$4 500/день' }, { label: 'Объём + текст ED, деп $60', value: 10000, color: C.good, text: '$10 000/день' }], { max: 10000, labelW: 190 });
};
