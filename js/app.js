/* Федот Пулемёт: интерфейс, курс, повтор, план дня, разбор, карта, шпаргалка. */
(function () {
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = function (v) { return v == null || !isFinite(v) ? '—' : '$' + Math.round(v).toLocaleString('ru-RU'); };
  var pct = function (v) { return v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + Math.round(v) + '%'; };

  /* ---------- состояние ---------- */
  var KEY = 'fedot.v1';
  var def = { char: 'fedot', voiceName: '', voice: false, mat: 'hard', rate: 1.05, xp: 0, done: {}, cards: {}, streak: { last: null, n: 0 }, plan: {} };
  FD.state = def;
  try { var raw = localStorage.getItem(KEY); if (raw) FD.state = Object.assign({}, def, JSON.parse(raw)); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(FD.state)); } catch (e) {} }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dayNum(s) { var p = s.split('-'); return Math.floor(new Date(+p[0], +p[1] - 1, +p[2]).getTime() / 864e5); }
  function addXP(n) {
    FD.state.xp += n;
    var t = today(), st = FD.state.streak;
    if (st.last !== t) { st.n = st.last && dayNum(t) - dayNum(st.last) === 1 ? st.n + 1 : 1; st.last = t; }
    save(); renderHud();
    var x = $('#xpPop'); x.textContent = '+' + n + ' XP'; x.classList.remove('pop'); void x.offsetWidth; x.classList.add('pop');
  }
  function rank(xp) { return xp < 100 ? 'Турист' : xp < 300 ? 'Джун' : xp < 600 ? 'Баер' : xp < 1000 ? 'Злой баер' : 'Обгоняет Измаилова'; }
  function renderHud() {
    $('#hudXp').textContent = FD.state.xp + ' XP';
    $('#hudRank').textContent = rank(FD.state.xp);
    $('#hudStreak').textContent = (FD.state.streak.n || 0) + ' дн. подряд';
    var due = dueCards().length; var b = $('#dueBadge'); b.textContent = due; b.hidden = !due;
    $('#voiceBtn').setAttribute('aria-pressed', FD.state.voice ? 'true' : 'false');
    $('#voiceBtn .lbl').textContent = FD.state.voice ? 'Голос вкл' : 'Голос выкл';
    $('#matBtn .lbl').textContent = FD.state.mat === 'hard' ? 'Мат: жёстко' : 'Мат: мягко';
  }

  /* ---------- вкладки ---------- */
  function show(tab) {
    $$('.tab').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false'); });
    $$('.view').forEach(function (v) { v.hidden = v.id !== 'v-' + tab; });
    try { localStorage.setItem('fedot.tab', tab); } catch (e) {}
    if (tab === 'path') renderPath();
    if (tab === 'review') renderReview();
    if (tab === 'map') renderMap();
    if (tab === 'plan') renderPlanForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- ПУТЬ ---------- */
  function renderPath() {
    var el = $('#pathList');
    el.innerHTML = FD.MODULES.map(function (m, i) {
      var done = FD.state.done[m.id], open = i === 0 || FD.state.done[FD.MODULES[i - 1].id] || done;
      return '<button class="node ' + (done ? 'done' : open ? 'open' : 'locked') + '" data-mod="' + i + '" style="--i:' + i + '">' +
        '<span class="node-n">' + (done ? '✓' : i + 1) + '</span><span class="node-t"><em>' + esc(m.tag) + '</em>' + esc(m.title) + '</span>' +
        (done ? '<span class="node-s">' + done + '/' + m.quiz.length + '</span>' : open ? '<span class="node-s go">Начать</span>' : '<span class="node-s">закрыто</span>') + '</button>';
    }).join('');
    var n = Object.keys(FD.state.done).length;
    $('#pathProg').style.width = (n / FD.MODULES.length * 100) + '%';
    $('#pathCount').textContent = n + ' из ' + FD.MODULES.length;
  }
  var L = null;
  function openLesson(i) {
    var m = FD.MODULES[i]; L = { i: i, m: m, s: 0, phase: 'slides', qi: 0, right: 0 };
    $('#lesson').hidden = false; $('#pathWrap').hidden = true;
    $('#lessonTitle').textContent = m.title; $('#lessonTag').textContent = 'Урок ' + (i + 1) + ' · ' + m.tag;
    renderSlide();
  }
  function closeLesson() { FD.shut(); $('#lesson').hidden = true; $('#pathWrap').hidden = false; renderPath(); }
  function renderSlide() {
    var m = L.m, box = $('#lessonBody');
    var total = m.slides.length + m.quiz.length;
    if (L.phase === 'slides') {
      var sl = m.slides[L.s];
      $('#lessonStep').style.width = ((L.s + 1) / total * 100) + '%';
      box.innerHTML = '<div class="slide in">' + FD.clean(sl.html) + '</div>';
      $$('[data-chart]', box).forEach(function (c) { FD.ch.slide(c, c.dataset.chart); });
      FD.say(sl.say);
      $('#lessonNext').textContent = L.s < m.slides.length - 1 ? 'Дальше' : 'К вопросам';
      $('#lessonNext').hidden = false; $('#lessonPrev').hidden = L.s === 0;
    } else if (L.phase === 'quiz') {
      var qq = m.quiz[L.qi];
      $('#lessonStep').style.width = ((m.slides.length + L.qi + 1) / total * 100) + '%';
      box.innerHTML = '<div class="slide in quiz"><span class="eyebrow">Вопрос ' + (L.qi + 1) + ' из ' + m.quiz.length + '</span><h3>' + esc(FD.clean(qq.q)) + '</h3><div class="answers">' +
        qq.a.map(function (a, j) { return '<button class="ans" data-j="' + j + '">' + esc(FD.clean(a)) + '</button>'; }).join('') + '</div><p class="why" hidden></p></div>';
      FD.say(FD.pick(['Ну-ка, вспоминай. Без подглядывания.', 'Вопрос на засыпку, братан.', 'Отвечай, а я посмотрю, не зря ли я тут ' + FD.g('распинался', 'распиналась') + '.']), { fast: true });
      $('#lessonNext').hidden = true; $('#lessonPrev').hidden = true;
    } else {
      var right = L.right, n = m.quiz.length;
      $('#lessonStep').style.width = '100%';
      box.innerHTML = '<div class="slide in finish"><div class="big-num ' + (right === n ? 'good' : right ? 'warn' : 'bad') + '">' + right + '/' + n + '</div><h3>' + (right === n ? 'Красава, всё в точку' : right ? 'Норм, но не идеал' : 'Пиздец, давай ещё раз') + '</h3><p>Карточки урока встали в очередь на повтор. Завтра ' + FD.char().short + ' проверит.</p><div class="row"><button class="btn" id="finTask">Применить на моей таблице</button><button class="btn ghost" id="finBack">К пути</button></div></div>';
      FD.say(right === n ? FD.pick(FD.LINES.done) : 'Ты набрал ' + right + ' из ' + n + '. ' + (right ? 'Не идеал, но живой. ' : 'Даже моя бабка набрала бы больше. ') + 'Ошибки я ' + FD.g('запомнил', 'запомнила') + ', ещё спрошу на повторе.', { mood: right === n ? 'happy' : 'angry' });
      $('#lessonNext').hidden = true; $('#lessonPrev').hidden = true;
      $('#finBack').onclick = closeLesson; $('#finTask').onclick = function () { closeLesson(); show('parse'); };
    }
  }
  function answer(j) {
    var qq = L.m.quiz[L.qi], ok = j === qq.c;
    $$('.ans').forEach(function (b, k) { b.disabled = true; if (k === qq.c) b.classList.add('right'); else if (k === j) b.classList.add('wrong'); });
    var w = $('.why'); w.hidden = false; w.textContent = FD.clean(qq.why);
    if (ok) { L.right++; addXP(10); }
    FD.say(FD.pick(ok ? FD.LINES.right : FD.LINES.wrong) + ' ' + qq.why, { mood: ok ? 'happy' : 'angry' });
    $('#lessonNext').hidden = false; $('#lessonNext').textContent = L.qi < L.m.quiz.length - 1 ? 'Следующий вопрос' : 'Итог';
  }
  function nextStep() {
    if (L.phase === 'slides') { if (L.s < L.m.slides.length - 1) L.s++; else { L.phase = 'quiz'; L.qi = 0; } }
    else if (L.phase === 'quiz') { if (L.qi < L.m.quiz.length - 1) L.qi++; else { finishLesson(); L.phase = 'end'; } }
    renderSlide();
  }
  function finishLesson() {
    var m = L.m; var first = !FD.state.done[m.id];
    FD.state.done[m.id] = L.right;
    m.cards.forEach(function (c, k) { var id = m.id + ':' + k; if (!FD.state.cards[id]) FD.state.cards[id] = { box: 0, due: dayNum(today()) + 1 }; });
    addXP(first ? 30 : 10); save();
  }

  /* ---------- ПОВТОР (Лейтнер) ---------- */
  var GAPS = [1, 3, 7, 16, 35];
  function allCards() { var out = []; FD.MODULES.forEach(function (m) { m.cards.forEach(function (c, k) { out.push({ id: m.id + ':' + k, q: c[0], a: c[1], mod: m.title }); }); }); return out; }
  function dueCards() { var t = dayNum(today()); return allCards().filter(function (c) { var s = FD.state.cards[c.id]; return s && s.due <= t; }); }
  var RV = null;
  function renderReview() {
    var due = dueCards(), el = $('#reviewBox'), learned = Object.keys(FD.state.cards).length;
    $('#reviewStat').textContent = 'Карточек в колоде: ' + learned + ' · на сегодня: ' + due.length;
    if (!due.length) {
      el.innerHTML = '<div class="empty"><div class="big-num good">0</div><p>' + (learned ? 'На сегодня всё повторено. Следующие карточки придут по графику 1 → 3 → 7 → 16 дней.' : 'Карточки появятся после первого пройденного урока.') + '</p>' +
        (learned ? '<button class="btn ghost" id="cramBtn">Прогнать все карточки сейчас</button>' : '') + '</div>';
      var cb = $('#cramBtn'); if (cb) cb.onclick = function () { RV = { list: allCards().filter(function (c) { return FD.state.cards[c.id]; }), i: 0, cram: true }; drawCard(); };
      return;
    }
    RV = { list: due, i: 0 }; drawCard(); FD.say(FD.pick(FD.LINES.review));
  }
  function drawCard() {
    var c = RV.list[RV.i], el = $('#reviewBox');
    if (!c) { el.innerHTML = '<div class="empty"><div class="big-num good">✓</div><p>Повтор закрыт. Мозг сказал спасибо.</p></div>'; FD.say('Всё, повтор закрыт. Вот так и держится в башке, а не вылетает через три дня.', { mood: 'happy' }); renderHud(); return; }
    el.innerHTML = '<div class="flash" id="flash"><div class="face front"><span class="eyebrow">' + esc(c.mod) + '</span><h3>' + esc(FD.clean(c.q)) + '</h3><button class="btn" id="flipBtn">Показать ответ</button></div>' +
      '<div class="face back"><span class="eyebrow">Ответ</span><h3>' + esc(FD.clean(c.a)) + '</h3><div class="row"><button class="btn good" id="knewBtn">Помнил</button><button class="btn bad" id="forgotBtn">Забыл</button></div></div></div>' +
      '<p class="mut center">' + (RV.i + 1) + ' из ' + RV.list.length + '</p>';
    $('#flipBtn').onclick = function () { $('#flash').classList.add('flipped'); };
    $('#knewBtn').onclick = function () { grade(c, true); };
    $('#forgotBtn').onclick = function () { grade(c, false); };
  }
  function grade(c, ok) {
    if (!RV.cram) { var s = FD.state.cards[c.id] || { box: 0 }; s.box = ok ? Math.min(s.box + 1, GAPS.length - 1) : 0; s.due = dayNum(today()) + (ok ? GAPS[s.box] : 1); FD.state.cards[c.id] = s; }
    if (ok) addXP(5); save();
    FD.say(ok ? FD.pick(FD.LINES.right) : 'Забыл? Нормально, завтра спрошу снова. Ответ: ' + c.a, { mood: ok ? 'happy' : null, fast: true });
    RV.i++; drawCard();
  }

  /* ---------- ПЛАН ДНЯ ---------- */
  function renderPlanForm() {
    var p = FD.state.plan, now = new Date();
    $('#pNow').value = p.now || (String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'));
    $('#pHours').value = p.hours || 8; $('#pLimit').value = p.limit || 1500; $('#pAcc').value = p.acc || 5; $('#pStories').value = p.stories || 4;
    if (!$('#planOut').dataset.done) buildPlan(false);
  }
  function hm(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function buildPlan(talk) {
    var nowS = $('#pNow').value || '10:00', hours = Math.max(1, +$('#pHours').value || 1), limit = Math.max(50, +$('#pLimit').value || 50),
      acc = Math.max(1, +$('#pAcc').value || 1), stories = Math.max(1, +$('#pStories').value || 1);
    FD.state.plan = { now: nowS, hours: hours, limit: limit, acc: acc, stories: stories }; save();
    var nm = (+nowS.split(':')[0]) * 60 + (+nowS.split(':')[1] || 0);
    if (nm < 6 * 60) nm += 1440;
    var byBudget = Math.floor(limit / 60), byTime = Math.floor(hours * 0.6 * 3.3), byAcc = acc * 2;
    var target = Math.max(1, Math.min(byBudget, byTime, byAcc)), stretch = Math.ceil(target * 1.2);
    var neck = target === byBudget ? 'бюджет' : target === byTime ? 'время' : 'аккаунты';
    var statesN = Math.max(1, Math.ceil(stretch / stories));
    var go = Object.keys(FD.STATES).filter(function (k) { return FD.STATES[k].tier === 'go'; }), test = Object.keys(FD.STATES).filter(function (k) { return FD.STATES[k].tier === 'test'; });
    var pickStates = go.concat(test).slice(0, Math.max(statesN, 4));
    var blocks = [], t = nm, budgetMin = hours * 60, used = 0;
    function add(start, dur, title, text, cls) { blocks.push({ s: start, e: start + dur, title: title, text: text, cls: cls || '' }); used += dur; }
    var nightLaunch = nm >= 19 * 60 || nm < 6 * 60;
    add(t, 30, 'Разбор вчерашнего', 'Кидаешь вчерашнюю таблицу во вкладку «Разбор». До $30 ничего не выключаешь, $160 без депа выключаешь, деп ≤ $110 идёт в «размножить».'); t += 30;
    var w1 = Math.ceil(stretch * 0.65), w2 = stretch - w1;
    if (!nightLaunch && nm < 14 * 60) {
      var write = Math.min(14 * 60 - t, Math.ceil(stretch * 8));
      if (write > 20) { add(t, write, 'Пишешь креативы', stories + ' истории × ' + statesN + ' штатов. Первые 2 строки — крючок. По 3 фото на штат.'); t += write; }
      t = Math.max(t, 14 * 60);
    }
    var w1d = Math.ceil(w1 * 10);
    add(t, w1d, 'Волна 1: ' + w1 + ' креативов = ' + w1 * 3 + ' кампании', '3-5-1 CBO, $100 на копию. Штаты: ' + pickStates.slice(0, 6).join(', ') + '.', 'wave'); t += w1d;
    add(t, 20, 'Проверка модерации', 'Отклонённые и $0 — копии в другой аккаунт.'); t += 20;
    if (w2 > 0) { var w2d = Math.ceil(w2 * 10); add(t, w2d, 'Волна 2: ' + w2 + ' креативов = ' + w2 * 3 + ' кампаний', 'Ещё штаты на лучшие истории + перезаливы не открутившихся.', 'wave'); t += w2d; }
    var sig = Math.max(t, 21 * 60);
    add(sig, 15, 'Первый сигнал FB', 'Креатив потратил меньше $10 при лимите $300 — FB он не нравится. У пацанов победители в первый день тратят ~$40.');
    var left = budgetMin - used, checks = [];
    for (var h = Math.max(22 * 60, sig + 60); h <= 27 * 60 && left >= 15; h += 60) { checks.push(h); left -= 15; }
    checks.forEach(function (h) { add(h, 15, 'Проверка ' + hm(h), 'Лестница: $30 / $80 / $160. Деп ≤ $110 — дубль сразу.'); });
    if (checks.length < 6) add(27 * 60 + 30, 0, 'Остальное — автоправила', 'Свободного времени не хватает на все проверки. Поставь в Ads Manager: спенд ≥ $40 и клик > $8 → выкл; спенд ≥ $25 и 0 кликов → выкл.', 'auto');
    add(30 * 60 + 30, 15, 'Утро: итог', 'Спенд / депы / цена депа / сколько залил. Утром не паникуй, депы доезжают.');
    blocks.sort(function (a, b) { return a.s - b.s; });
    var cmp = stretch * 3;
    var html = '<div class="goal-row">' +
      '<div class="goal"><b>' + target + '</b><span>креативов минимум</span><small>упираешься в: ' + neck + '</small></div>' +
      '<div class="goal hot"><b>' + stretch + '</b><span>креативов с запасом ×1,2</span><small>= ' + cmp + ' кампаний (3 копии)</small></div>' +
      '<div class="goal"><b>' + statesN + '</b><span>штатов на историю</span><small>' + pickStates.join(', ') + '</small></div>' +
      '<div class="goal"><b>' + money(stretch * 300) + '</b><span>лимит бюджетов</span><small>реально уйдёт ~' + money(stretch * 55) + '</small></div></div>' +
      '<div class="bench-line">Для сравнения: Endless Dream в пик — 16 креативов (59 кампаний) за день, Измаилов — 47 кампаний. ' + (cmp >= 47 ? '<b class="good">Ты на уровне Измаилова.</b>' : '<b class="warn">До Измаилова не хватает ' + (47 - cmp) + ' кампаний.</b>') + '</div>' +
      '<ol class="timeline-plan">' + blocks.map(function (b, i) {
        return '<li class="' + b.cls + '" style="animation-delay:' + i * 60 + 'ms"><label><input type="checkbox" data-pb="' + i + '"><span class="tm">' + hm(b.s) + (b.e > b.s ? '–' + hm(b.e) : '') + '</span><span class="tx"><b>' + esc(b.title) + '</b><span>' + esc(b.text) + '</span></span></label></li>';
      }).join('') + '</ol>';
    var out = $('#planOut'); out.innerHTML = html; out.dataset.done = '1';
    if (talk) {
      var msg = 'Короче. Сегодня минимум ' + target + ' креативов, а по-злому ' + stretch + ', это ' + cmp + ' кампаний. Упираешься в ' + neck + '. ';
      msg += cmp >= 47 ? 'Это уровень Измаилова, ебашь.' : 'Измаилов в свой лучший день залил сорок семь. ' + (neck === 'аккаунты' ? 'Иди к Феде за аккаунтами.' : neck === 'бюджет' ? 'Проси у Феди лимит побольше.' : 'Времени мало — ставь автоправила.');
      FD.say(msg, { mood: cmp >= 47 ? 'happy' : null });
    }
  }

  /* ---------- РАЗБОР ---------- */
  function handleFiles(files) {
    var out = $('#parseOut');
    Array.prototype.forEach.call(files, function (f) {
      var card = document.createElement('div'); card.className = 'report'; card.innerHTML = '<p class="mut">Читаю ' + esc(f.name) + '…</p>'; out.prepend(card);
      if (!window.XLSX) { card.innerHTML = '<p class="bad">Не загрузилась библиотека чтения Excel. Проверь интернет и обнови страницу.</p>'; return; }
      FD.readFile(f).then(function (rows) {
        var R = FD.analyze(rows, f.name); renderReport(card, R);
        var t = R.talk.map(function (x) { return x.text; }).join(' ');
        FD.say(t, { mood: (R.talk[0] || {}).mood });
        addXP(15);
      }).catch(function (e) { card.innerHTML = '<p class="bad">' + esc(f.name) + ': ' + esc(e.message) + '</p>'; FD.say('Братан, это что за таблица? ' + e.message, { mood: 'shock' }); });
    });
  }
  function kpi(label, val, bench, better, fmt) {
    var cls = '';
    if (bench != null && val != null && isFinite(val)) cls = (better === 'up' ? val >= bench : val <= bench) ? 'good' : 'bad';
    return '<div class="kpi ' + cls + '"><span>' + label + '</span><b>' + fmt(val) + '</b>' + (bench != null ? '<em>лучший у пацанов: ' + fmt(bench) + '</em>' : '') + '</div>';
  }
  function renderReport(card, R) {
    var t = R.tot, B = FD.BENCH;
    var h = '<div class="rep-head"><div><span class="eyebrow">' + (R.type === 'campaign' ? 'Отчёт по кампаниям' + (R.flat ? ' · до объяв' : '') : 'Отчёт по креативам') + '</span><h3>' + esc(R.file) + '</h3></div><button class="btn ghost sm" data-copy>Скопировать решения</button></div>';
    h += '<div class="kpis">' + kpi('Спенд', t.spend, null, null, money) + kpi('Депы', t.fd, null, null, function (v) { return Math.round(v); }) +
      kpi('ROI', t.roi, B.ed.roi, 'up', pct) + kpi('Цена депа', t.dep, B.ed.dep, 'down', money) +
      kpi('Кликают из 100', t.ctr, B.izm.ctr, 'up', function (v) { return v ? v.toFixed(1) : '—'; }) + kpi('Цена клика', t.cpc, B.ivan.cpc, 'down', function (v) { return v ? '$' + v.toFixed(2) : '—'; }) +
      kpi('Цена реги', t.reg, B.ed.reg, 'down', function (v) { return v ? '$' + v.toFixed(1) : '—'; }) + kpi('Бросаешь креатив без депа на', R.drop[0] || null, B.ed.drop[0], 'up', money) + '</div>';
    h += '<div class="talk">' + R.talk.map(function (x) { return '<p class="say ' + (x.mood || '') + '"><span>Федот:</span> ' + esc(FD.clean(x.text)) + '</p>'; }).join('') + '</div>';
    if (R.days) {
      h += '<h4>По дням</h4><div class="chart-box" data-days></div>';
      h += '<div class="kpis three">' + kpi('Пик новых кампаний за день', R.peakNewC, B.izm.peakNewCamps, 'up', function (v) { return v; }) + kpi('Пик живых кампаний', R.peakLive, B.izm.peakLive, 'up', function (v) { return v; }) + kpi('Новых креативов в день (среднее)', R.avgNewCr, B.ed.newCrDay, 'up', function (v) { return v.toFixed(1); }) + '</div>';
      if (R.structs && R.structs.length) h += '<h4>Схемы</h4><div class="tbl"><table><tr><th>Схема</th><th class="n">Кампаний</th><th class="n">Спенд</th><th class="n">Депы</th><th class="n">ROI</th></tr>' + R.structs.slice(0, 6).map(function (s) { return '<tr><td>' + esc(s.k) + '</td><td class="n">' + s.n + '</td><td class="n">' + money(s.spend) + '</td><td class="n">' + s.fd + '</td><td class="n ' + (s.roi > 30 ? 'good' : s.roi < 0 ? 'bad' : 'warn') + '">' + pct(s.roi) + '</td></tr>'; }).join('') + '</table></div>';
    }
    h += '<h4>Дал покрутиться = есть шанс (креативы с депом по спенду)</h4><div class="chart-box" data-hit></div>';
    var groups = [['dub', R.type === 'campaign' ? 'Размножить сейчас' : 'Раскатывать по штатам', 'acc'], ['kill', 'Вырубить', 'kill'], ['cut', 'Резать вдвое', 'warn'], ['keep', 'Не трогать / держать', 'good']];
    var act = R.crs.filter(function (o) { return o.active; });
    h += '<h4>' + (R.type === 'campaign' ? 'Что делать прямо сейчас' : 'Итоги периода: что раскатывать, что бросить') + '</h4><div class="acts">' + groups.map(function (g) {
      var xs = act.filter(function (o) { return o.v.code === g[0]; });
      return '<div class="act ' + g[2] + '"><b>' + g[1] + ' · ' + xs.length + '</b><ul>' + xs.slice(0, 8).map(function (o) { return '<li><span class="mono">' + esc(o.key) + '</span> ' + money(o.spend) + (o.fd ? ' · ' + o.fd + ' деп' : '') + '</li>'; }).join('') + (xs.length > 8 ? '<li class="mut">и ещё ' + (xs.length - 8) + '</li>' : '') + (xs.length ? '' : '<li class="mut">пусто</li>') + '</ul></div>';
    }).join('') + '</div>';
    h += '<h4>Креативы (сумма всех копий)</h4><div class="filters">' + ['all:Все', 'dub:Дубль', 'kill:Выкл', 'cut:Режь', 'keep:Держи', 'wait:Ждать'].map(function (f, i) { var p = f.split(':'); return '<button class="chip' + (i ? '' : ' on') + '" data-f="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="tbl"><table class="crtab"><tr><th>Креатив</th><th>Штат</th><th class="n">Копий</th><th class="n">Спенд</th><th class="n">Клик</th><th class="n">Рега</th><th class="n">Депы</th><th class="n">ROI</th><th>Решение</th></tr>' +
      R.crs.slice(0, 120).map(function (o) {
        return '<tr data-v="' + o.v.code + '"' + (o.active ? '' : ' class="dim"') + '><td class="mono">' + esc(o.key) + '</td><td>' + (o.geo || '—') + '</td><td class="n">' + (o.copies || '—') + '</td><td class="n">' + money(o.spend) + '</td><td class="n">' + (o.v.cpc ? '$' + o.v.cpc.toFixed(2) : '—') + '</td><td class="n">' + (o.v.reg ? '$' + o.v.reg.toFixed(1) : '—') + '</td><td class="n">' + o.fd + '</td><td class="n ' + (o.roi > 0 ? 'good' : 'bad') + '">' + pct(o.roi) + '</td><td><span class="pill ' + o.v.cls + '" title="' + esc(o.v.why) + '">' + o.v.label + '</span></td></tr>';
      }).join('') + '</table></div><p class="mut sm">Серые строки уже не крутятся. Наведи на решение — увидишь почему.</p>';
    if (R.geos.length) {
      h += '<h4>Твои штаты против карты пацанов</h4><div class="tbl"><table><tr><th>Штат</th><th class="n">Креативов</th><th class="n">Спенд</th><th class="n">Депы</th><th class="n">Твой ROI</th><th>У пацанов</th><th>Совет</th></tr>' + R.geos.map(function (s) {
        var st = FD.STATES[s.k], tier = st ? FD.TIER[st.tier] : null, tip;
        if (!st) tip = 'Мало данных у пацанов';
        else if (st.tier === 'stop') tip = s.roi > 30 ? 'У тебя плюс — держи, но не раздувай' : 'Выжжен. Переезжай в ID / IN / SD / TN';
        else if (s.roi >= 30) tip = 'Работает — раскатывай историю на соседей';
        else if (s.spend < 60) tip = 'Мало спенда, дай дожить до $80';
        else tip = 'У пацанов плюс, у тебя нет — меняй историю или казино';
        return '<tr><td><b>' + s.k + '</b> ' + (st ? esc(st.n) : '') + '</td><td class="n">' + s.n + '</td><td class="n">' + money(s.spend) + '</td><td class="n">' + s.fd + '</td><td class="n ' + (s.roi > 0 ? 'good' : 'bad') + '">' + pct(s.roi) + '</td><td>' + (tier ? '<span class="pill ' + tier[1] + '">' + tier[0] + '</span>' : '—') + '</td><td>' + esc(tip) + '</td></tr>';
      }).join('') + '</table></div>';
    }
    if (R.formats.length) h += '<h4>Форматы</h4><div class="tbl"><table><tr><th>Формат</th><th class="n">Креативов</th><th class="n">Спенд</th><th class="n">Депы</th><th class="n">ROI</th><th>У всей компании</th></tr>' + R.formats.map(function (s) { var tm = { STORY: '+56%', CELEBRITYSTORY: '+22%', EDIT: '−23%', NEURO: '−29%', STATIK: '−85%', AI: '+66%' }[s.k] || 'почти ноль депов'; return '<tr><td class="mono">' + esc(s.k) + '</td><td class="n">' + s.n + '</td><td class="n">' + money(s.spend) + '</td><td class="n">' + s.fd + '</td><td class="n ' + (s.roi > 0 ? 'good' : 'bad') + '">' + pct(s.roi) + '</td><td>' + tm + '</td></tr>'; }).join('') + '</table></div>';
    if (R.owns.length > 1) h += '<p class="mut sm">Своя связка: ' + R.owns.map(function (s) { return esc(s.k) + ' ' + money(s.spend) + ' · ROI ' + pct(s.roi); }).join(' · ') + '. У всей компании чужая связка даёт +60%, своя +48%.</p>';
    if (R.casinos.length) h += '<h4>Казино в историях</h4><div class="tbl"><table><tr><th>Казино</th><th class="n">Креативов</th><th class="n">Спенд</th><th class="n">Депы</th><th class="n">ROI</th></tr>' + R.casinos.slice(0, 15).map(function (s) { return '<tr><td class="mono">' + esc(s.k) + '</td><td class="n">' + s.n + '</td><td class="n">' + money(s.spend) + '</td><td class="n">' + s.fd + '</td><td class="n ' + (s.roi > 0 ? 'good' : 'bad') + '">' + pct(s.roi) + '</td></tr>'; }).join('') + '</table></div>';
    if (R.stories.length) h += '<h4>Скрипты (формат-номер)</h4><div class="tbl"><table><tr><th>Скрипт</th><th class="n">Креативов</th><th class="n">Спенд</th><th class="n">Депы</th><th class="n">ROI</th></tr>' + R.stories.slice(0, 15).map(function (s) { return '<tr><td class="mono">' + esc(s.k) + '</td><td class="n">' + s.n + '</td><td class="n">' + money(s.spend) + '</td><td class="n">' + s.fd + '</td><td class="n ' + (s.roi > 0 ? 'good' : 'bad') + '">' + pct(s.roi) + '</td></tr>'; }).join('') + '</table></div>';
    card.innerHTML = h;
    if (R.days) {
      var ds = R.days.filter(function (d) { return d.spend > 0 || d.fd > 0; }).slice(-18);
      FD.ch.vgroups($('[data-days]', card), ds.map(function (d) { return String(d.day); }), [{ name: 'спенд $', color: 'var(--acc)', values: ds.map(function (d) { return Math.round(d.spend); }) }, { name: 'новых кампаний ×10', color: 'var(--gold)', values: ds.map(function (d) { return d.newC * 10; }) }], { ticks: [], labels: false });
    }
    FD.ch.vgroups($('[data-hit]', card), FD.BUCKET_LABELS, [{ name: 'Ты', color: 'var(--kill)', values: R.hit.map(function (x) { return x.hit; }) }, { name: 'Endless Dream', color: 'var(--good)', values: FD.BENCH.ed.hit }, { name: 'Измаилов', color: 'var(--acc)', values: FD.BENCH.izm.hit }], { max: 110, ticks: [0, 50, 100], suf: '%', labels: false });
    $$('.chip', card).forEach(function (c) { c.onclick = function () { $$('.chip', card).forEach(function (x) { x.classList.toggle('on', x === c); }); $$('.crtab tr[data-v]', card).forEach(function (tr) { tr.hidden = c.dataset.f !== 'all' && tr.dataset.v !== c.dataset.f; }); }; });
    $('[data-copy]', card).onclick = function (e) {
      var txt = act.filter(function (o) { return o.v.code !== 'keep' && o.v.code !== 'wait'; }).map(function (o) { return o.v.label + ' — ' + o.key + ' (' + money(o.spend) + ', депов ' + o.fd + '): ' + o.v.why; }).join('\n');
      var b = e.currentTarget;
      try { navigator.clipboard.writeText(txt || 'Нечего делать, всё ок').then(function () { b.textContent = 'Скопировано'; }, function () { b.textContent = 'Не вышло скопировать'; }); } catch (er) { b.textContent = 'Не вышло скопировать'; }
    };
  }

  /* ---------- КАРТА ---------- */
  var TILES = { AK: [0, 0], ME: [10, 0], WI: [5, 1], VT: [9, 1], NH: [10, 1], WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2], MI: [6, 2], NY: [8, 2], MA: [9, 2], OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], IN: [5, 3], OH: [6, 3], PA: [7, 3], NJ: [8, 3], CT: [9, 3], RI: [10, 3], CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4], KY: [5, 4], WV: [6, 4], VA: [7, 4], MD: [8, 4], DE: [9, 4], AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5], NC: [6, 5], SC: [7, 5], OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6], HI: [0, 7], TX: [3, 7], FL: [8, 7] };
  function renderMap() {
    var el = $('#usmap'); if (el.dataset.done) return; el.dataset.done = 1;
    el.innerHTML = Object.keys(TILES).map(function (k) {
      var st = FD.STATES[k], tier = st ? st.tier : 'none';
      var lab = !st ? '' : (st.tier === 'stop' && /^−/.test(st.now) ? 'сейчас ' + st.now : st.tier === 'stop' && st.dep == null ? 'не лить' : st.all);
      return '<button class="tile t-' + tier + '" data-st="' + k + '" style="grid-column:' + (TILES[k][0] + 1) + ';grid-row:' + (TILES[k][1] + 1) + '"><b>' + k + '</b><span>' + lab + '</span></button>';
    }).join('');
    $('#casinoList').innerHTML = FD.CASINOS.map(function (c) { return '<tr><td class="mono">' + c[0] + '</td><td>' + c[1] + '</td><td class="n ' + (c[2] >= 50 ? 'good' : c[2] >= 0 ? 'warn' : 'bad') + '">' + (c[2] > 0 ? '+' : '') + c[2] + '%</td></tr>'; }).join('');
    $('#storyList').innerHTML = FD.STORIES.map(function (s) { return '<tr><td class="mono">' + esc(s[0]) + '</td><td>' + esc(s[1]) + '</td><td>' + esc(s[2]) + '</td></tr>'; }).join('');
  }
  function stateInfo(k) {
    var st = FD.STATES[k], box = $('#stateInfo');
    if (!st) { box.innerHTML = '<h3>' + k + '</h3><p>По этому штату у пацанов почти нет данных. Лей только как тест, $50–80 на креатив.</p>'; FD.say(k + '? Тут никто толком не лил. Хочешь быть первым — тестируй аккуратно.'); return; }
    var t = FD.TIER[st.tier];
    box.innerHTML = '<span class="pill ' + t[1] + '">' + t[0] + '</span><h3>' + k + ' · ' + esc(st.n) + '</h3><table class="t"><tr><td>Сейчас (вся команда, 10–18 окт)</td><td>' + esc(st.now) + '</td></tr><tr><td>Сентябрь</td><td>' + esc(st.sep) + '</td></tr><tr><td>Все вместе</td><td><b>' + esc(st.all) + '</b>' + (st.dep ? ' · деп $' + st.dep : '') + '</td></tr></table><p>' + esc(st.note) + '</p>';
    var line = { go: 'Сюда лей в первую очередь, братан. Плюсует и сейчас, и раньше.', test: 'Сейчас тут плюс, но объёма мало. Тестируй, пока толпа не набежала.', watch: 'Можно, но смотри в оба. Деп тут дороже.', stop: 'Осторожно. Тут либо выжгли свои, либо минус. Не лезь, пока есть штаты получше.' }[st.tier];
    FD.say(k + ', ' + st.n + '. ' + line + ' ' + st.note, { mood: st.tier === 'stop' ? 'angry' : st.tier === 'go' ? 'happy' : null });
  }

  /* ---------- шпаргалка: калькулятор ---------- */
  function calc() {
    var S = +$('#cS').value || 0, K = +$('#cK').value || 0, Rr = +$('#cR').value || 0, D = +$('#cD').value || 0, A = +$('#cA').value || 1;
    var v = FD.decide(S, K, Rr, D, A);
    $('#cOut').innerHTML = '<span class="pill big ' + v.cls + '">' + v.label + '</span><p>' + esc(FD.clean(v.why)) + '</p><p class="mono mut">клик ' + (v.cpc ? '$' + v.cpc.toFixed(2) : '—') + ' · рега ' + (v.reg ? '$' + v.reg.toFixed(1) : '—') + ' · прогноз депа ' + (v.est ? '~$' + Math.round(v.est) : '—') + '</p>';
    return v;
  }

  /* ---------- персонаж и голос ---------- */
  function applyChar() {
    var c = FD.char();
    $$('.fedot').forEach(function (el) { el.innerHTML = c.svg(); });
    $$('.fedot-mini').forEach(function (el) { el.innerHTML = FD.AVATAR_SVG; });
    $$('.zina-mini').forEach(function (el) { el.innerHTML = FD.ZINA_SVG; });
    $$('[data-n]').forEach(function (el) { el.textContent = c[el.dataset.n]; });
    $$('[data-g]').forEach(function (el) { var p = el.dataset.g.split('|'); el.textContent = FD.g(p[0], p[1]); });
    $$('.charpick button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.char === FD.state.char ? 'true' : 'false'); });
    $('#fedotBig').title = 'Ткни в ' + c.acc;
    document.title = c.name.replace(/^Сеньора? /, '');
    fillVoices();
  }
  function setChar(id, talk) {
    if (!FD.CHARS[id]) return;
    FD.state.char = id; FD.state.voiceName = ''; save(); FD.pickVoice(); applyChar();
    if (talk) FD.say(id === 'zina' ? 'Всё, теперь я тут главная. Федот курит в сторонке. Погнали, котик.' : 'Федот снова за пультом. Зина пошла пересчитывать ROI. Погнали.', { mood: 'happy' });
  }
  function fillVoices() {
    var sel = $('#voiceSel'); if (!sel) return;
    var vs = FD.ruVoices();
    if (!vs.length) { sel.innerHTML = '<option value="">Русского голоса нет</option>'; sel.disabled = true; $('#voiceHint').hidden = true; return; }
    sel.disabled = false;
    var cur = FD.voice ? FD.voice.name : '';
    sel.innerHTML = vs.map(function (v) { return '<option value="' + esc(v.name) + '"' + (v.name === cur ? ' selected' : '') + '>' + esc(v.name.replace(/^Microsoft |^Google /, '').replace(/ - Russian.*| Online.*/i, '')) + (FD.MALE_RE.test(v.name) ? ' ♂' : '') + '</option>'; }).join('');
    $('#voiceHint').hidden = !(FD.state.char === 'fedot' && !FD.hasMale());
  }
  FD.onVoices = fillVoices;

  /* ---------- старт ---------- */
  function init() {
    applyChar();
    $$('.charpick button').forEach(function (b) { b.onclick = function () { setChar(b.dataset.char, !b.closest('.intro')); }; });
    $('#charBtn').onclick = function () { setChar(FD.state.char === 'zina' ? 'fedot' : 'zina', true); };
    $('#voiceSel').onchange = function () { FD.state.voiceName = this.value; save(); FD.pickVoice(); FD.say(FD.g('Вот так я звучу. Нравится? Если нет, выбери другой голос.', 'Вот так я звучу, котик. Не нравится? Выбери другой.'), { fast: true }); };
    $('#voiceHint').onclick = function () { setChar('zina', true); };
    $$('.tab').forEach(function (b) { b.onclick = function () { show(b.dataset.tab); }; });
    $('#pathList').addEventListener('click', function (e) { var n = e.target.closest('.node'); if (!n || n.classList.contains('locked')) { if (n) FD.say('Куда лезешь? Сначала пройди предыдущий урок. По порядку, братан.', { mood: 'angry' }); return; } openLesson(+n.dataset.mod); });
    $('#lessonNext').onclick = nextStep;
    $('#lessonPrev').onclick = function () { if (L.phase === 'slides' && L.s > 0) { L.s--; renderSlide(); } };
    $('#lessonClose').onclick = closeLesson;
    $('#lessonBody').addEventListener('click', function (e) { var b = e.target.closest('.ans'); if (b && !b.disabled) answer(+b.dataset.j); });
    $('#voiceBtn').onclick = function () {
      FD.state.voice = !FD.state.voice; save(); renderHud();
      if (FD.state.voice && !('speechSynthesis' in window)) { FD.say('Твой браузер не умеет говорить. Читай глазами.'); FD.state.voice = false; save(); renderHud(); return; }
      if (FD.state.voice && !FD.pickVoice()) FD.say('Голос ' + FD.g('включил', 'включила') + ', но русского голоса в системе не ' + FD.g('нашёл', 'нашла') + '. Поставь русский голос в настройках системы или открой в Chrome.');
      else FD.say(FD.state.voice ? 'О, теперь ты меня слышишь. Готовь уши, братан.' : 'Ладно, молчу. Читай.');
    };
    $('#matBtn').onclick = function () { FD.state.mat = FD.state.mat === 'hard' ? 'soft' : 'hard'; save(); renderHud(); FD.say(FD.state.mat === 'hard' ? FD.g('Вернул', 'Вернула') + ' мат. Так запоминается лучше, бля.' : 'Ладно, буду ' + FD.g('культурным', 'культурной') + '. Но запоминаться будет хуже, предупреждаю.'); };
    $('#rate').oninput = function () { FD.state.rate = +this.value; save(); };
    $('#rate').value = FD.state.rate;
    $('#fedotBig').onclick = function () { FD.say(FD.pick(FD.LINES.idle)); };
    $('#replayBtn').onclick = function () { var t = $('#bubbleText').textContent; if (t) FD.say(t); };
    $('#planBtn').onclick = function () { buildPlan(true); };
    var drop = $('#drop'), inp = $('#fileIn');
    inp.onchange = function () { handleFiles(inp.files); inp.value = ''; };
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
    $('#usmap').addEventListener('click', function (e) { var t = e.target.closest('.tile'); if (t) stateInfo(t.dataset.st); });
    ['cS', 'cK', 'cR', 'cD', 'cA'].forEach(function (id) { $('#' + id).addEventListener('input', calc); });
    $('#cSay').onclick = function () { var v = calc(); FD.say(v.label + '. ' + v.why, { mood: v.cls === 'kill' ? 'angry' : v.cls === 'acc' ? 'happy' : null }); };
    calc();
    $$('[data-chart]', $('#v-cheat')).forEach(function (c) { FD.ch.slide(c, c.dataset.chart); });
    renderHud();
    var tab = 'path'; try { tab = localStorage.getItem('fedot.tab') || 'path'; } catch (e) {}
    show(tab);
    var start = $('#startBtn');
    start.onclick = function () { $('#intro').hidden = true; FD.state.voice = $('#introVoice').checked; save(); renderHud(); FD.pickVoice(); FD.say(FD.hello()); };
    if (FD.state.seen) { $('#intro').hidden = true; setTimeout(function () { $('#bubbleText').textContent = FD.clean(FD.pick(FD.LINES.idle)); }, 300); }
    else { FD.state.seen = true; save(); }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
