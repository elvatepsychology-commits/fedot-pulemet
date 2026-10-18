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
      return '<button class="node ' + (done ? 'done' : open ? 'open' : 'free') + '" data-mod="' + i + '" style="--i:' + i + '">' +
        '<span class="node-n">' + (done ? '✓' : i + 1) + '</span><span class="node-t"><em>' + esc(m.tag) + '</em>' + esc(m.title) + '</span>' +
        (done ? '<span class="node-s">' + done + '/' + m.quiz.length + '</span>' : open ? '<span class="node-s go">Начать</span>' : '<span class="node-s">открыть</span>') + '</button>';
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
    $('#pHours').value = p.hours || 8; $('#pLimit').value = p.limit || 1500; $('#pScheme').value = p.scheme || '3-5-1'; $('#pSleep').value = p.sleep || '01:00'; $('#pWake').value = p.wake || '10:00'; $('#pAccOld').value = p.accOld != null ? p.accOld : 3; $('#pAccNew').value = p.accNew != null ? p.accNew : 1; $('#pCapOld').value = p.capOld || 12; $('#pCapNew').value = p.capNew || 6; $('#pStories').value = p.stories || 4; $('#pNew').value = p.newN != null ? p.newN : 1; $('#pTS').value = p.tS || 10; $('#pTN').value = p.tN || 28;
    if (!$('#planOut').dataset.done) buildPlan(false);
  }
  function toMin(t) { var p = String(t || '00:00').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  function hm(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function pl(n, a, b, c) { var m = Math.abs(n) % 100, k = m % 10; return n + ' ' + (m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c); }
  function buildPlan(talk) {
    var nowS = $('#pNow').value || '10:00', hours = Math.max(1, +$('#pHours').value || 1), limit = Math.max(50, +$('#pLimit').value || 50),
      scheme = $('#pScheme').value || '3-5-1', accOld = Math.max(0, +$('#pAccOld').value || 0), accNew = Math.max(0, +$('#pAccNew').value || 0),
      capOld = Math.max(1, +$('#pCapOld').value || 12), capNew = Math.max(1, +$('#pCapNew').value || 6), acc = Math.max(1, accOld + accNew), stories = Math.max(1, +$('#pStories').value || 1),
      newWant = Math.max(0, +$('#pNew').value || 0), tS = Math.max(3, +$('#pTS').value || 10), tN = Math.max(5, +$('#pTN').value || 28);
    var sleepS = $('#pSleep').value || '01:00', wakeS = $('#pWake').value || '10:00';
    FD.state.plan = { sleep: sleepS, wake: wakeS, now: nowS, hours: hours, limit: limit, scheme: scheme, accOld: accOld, accNew: accNew, capOld: capOld, capNew: capNew, stories: stories, newN: newWant, tS: tS, tN: tN }; save();
    var nm = (+nowS.split(':')[0]) * 60 + (+nowS.split(':')[1] || 0);
    if (nm < 6 * 60) nm += 1440;
    var launchMin = Math.max(20, hours * 60 - 30 - 20 - Math.min(90, hours * 15));
    var newN = Math.min(newWant, Math.floor(launchMin / tN));
    var byBudget = Math.floor(limit / 50), byTime = newN + Math.floor((launchMin - newN * tN) / tS), cpc = scheme === '3-5-1' ? 3 : 1, capTot = accOld * capOld + accNew * capNew, byAcc = Math.max(1, Math.floor(capTot * 0.8 / cpc)), perCr = scheme === '3-5-1' ? 300 : 150;
    var target = Math.max(1, Math.min(byBudget, byTime, byAcc)), stretch = Math.max(target, Math.min(Math.ceil(target * 1.2), byAcc));
    var neck = target === byBudget ? 'бюджет' : target === byTime ? 'время' : 'аккаунты';
    var statesN = Math.max(1, Math.ceil(stretch / stories));
    var go = Object.keys(FD.STATES).filter(function (k) { return FD.STATES[k].tier === 'go'; }), test = Object.keys(FD.STATES).filter(function (k) { return FD.STATES[k].tier === 'test'; });
    var pickStates = go.concat(test).slice(0, Math.max(statesN, 4));
    var blocks = [], t = nm, budgetMin = hours * 60, used = 0;
    function add(start, dur, title, text, cls) { blocks.push({ s: start, e: start + dur, title: title, text: text, cls: cls || '' }); used += dur; }
    var nightLaunch = nm >= 19 * 60 || nm < 6 * 60;
    add(t, 30, 'Разбор вчерашнего', 'Кидаешь вчерашнюю таблицу во вкладку «Разбор». До $30 ничего не выключаешь, $160 без депа выключаешь, деп ≤ $110 идёт в «размножить».'); t += 30;
    var w1 = Math.ceil(stretch * 0.65), w2 = stretch - w1;
    if (newN > 0) { var find = Math.round(newN * (tN - tS)); add(t, find, 'Ищешь ' + newN + ' ' + (newN === 1 ? 'новый крео' : 'новых крео'), 'По ~' + (tN - tS) + ' мин на поиск и текст. Потом каждый заливаешь как обычный запуск в волне.'); t += find; }
    var w1d = Math.ceil(w1 * tS);
    add(t, w1d, 'Волна 1: ' + pl(w1, 'креатив', 'креатива', 'креативов') + ' = ' + pl(w1 * cpc, 'кампания', 'кампании', 'кампаний'), 'По ~' + tS + ' мин на штат: текст + Notion, залив ' + scheme + (scheme === '3-5-1' ? ' ($100 на копию, копии в разные РК)' : ' ($150 на кампанию)') + ', комменты. Пока один на модерации, делаешь следующий. Штаты: ' + pickStates.slice(0, 6).join(', ') + '.', 'wave'); t += w1d;
    add(t, 20, 'Проверка модерации', 'Отклонённые и $0 — копии в другой аккаунт.'); t += 20;
    if (w2 > 0) { var w2d = Math.ceil(w2 * tS); add(t, w2d, 'Волна 2: ' + pl(w2, 'креатив', 'креатива', 'креативов') + ' = ' + pl(w2 * cpc, 'кампания', 'кампании', 'кампаний'), 'Ещё штаты на лучшие истории + перезаливы не открутившихся.', 'wave'); t += w2d; }
    if (nightLaunch) add(t, 0, 'Ты заливаешь ночью', 'В США сейчас вечер — креативы стартуют на пике, но следить за ними некому. Автоправила (см. «Перед сном») ставь сразу после волны.', 'auto');
    if (!nightLaunch && 21 * 60 - t >= 60) add(t, Math.min(21 * 60 - t, 120), 'Окно до вечера', 'Американское утро, тратится мало — решать нечего. Готовь истории на завтра: новые штаты для победителей, 1–2 новых крео.');
    var sig = Math.max(t, 21 * 60);
    add(sig, 15, 'Первый сигнал FB', 'Креатив потратил меньше $10 при лимите $' + perCr + ' — FB он не нравится. У пацанов победители в первый день тратят ~$40.');
    /* ночь: проверки до сна, перед сном — автоправила, по желанию один будильник на пик депов */
    var sl = toMin(sleepS), wk = toMin(wakeS);
    if (sl < 12 * 60) sl += 1440;           // 01:00 → 25:00
    if (wk <= sl - 1440 || wk < 12 * 60) wk += 1440; if (wk <= sl) wk += 1440;
    var checks = [];
    for (var h = Math.max(21 * 60 + 60, sig + 60); h + 15 <= sl - 20; h += 60) checks.push(h);
    checks.forEach(function (h) { add(h, 15, 'Проверка ' + hm(h), 'Сортируешь по спенду, лестница по сумме креатива: $30 / $80 / $160. Деп ≤ $110 — дубли в другой РК.'); });
    var bed = Math.max(sl - 20, sig + 15);
    add(bed, 20, 'Перед сном: ночной режим', 'Победители (деп ≤ $110, ROI в плюсе) — не трогаешь, пусть льют. Всё остальное страхуешь автоправилами в Ads Manager (Правила → Создать правило, проверка раз в 30 мин): 1) спенд ≥ $25 и 0 кликов по ссылке → выкл; 2) спенд ≥ $40 и цена клика > $8 → выкл; 3) спенд ≥ $200 и 0 покупок → выкл (порог выше $160, потому что FB видит не все депы). Креативы без депа, которые уже близко к $160, выключи руками сам.', 'auto');
    var peak = 27 * 60 + 30; // 03:30 по Москве — вечер в США, пик депов
    if (sl < peak - 30 && wk > peak + 60) add(peak, 10, 'Будильник 03:30 (по желанию)', 'Встал, открыл Ads Manager на телефоне, 10 минут: креатив без депа и спенд ≥ $160 → выкл; деп ≤ $110 → отметь на утро «дублировать». Ничего нового не заливаешь. Спать.', 'auto');
    add(wk, 15, 'Утро: итог', 'Спенд / депы / цена депа / сколько залил. Что выключили автоправила — посмотри, не задели ли нормальные. Утром не паникуй: депы доезжают до обеда.');
    blocks.sort(function (a, b) { return a.s - b.s; });
    var cmp = stretch * cpc;
    /* раскладка по РК: сначала прогретые, потом новые, не больше лимита */
    var accs = []; for (var ai = 0; ai < accOld; ai++) accs.push({ n: 'РК ' + (ai + 1) + ' (прогретый)', cap: capOld, used: 0 }); for (var bi = 0; bi < accNew; bi++) accs.push({ n: 'РК ' + (accOld + bi + 1) + ' (новый)', cap: capNew, used: 0 });
    var over = 0;
    for (var ci = 0; ci < stretch; ci++) {
      for (var k = 0; k < cpc; k++) {
        var cand = accs.filter(function (a) { return a.used < a.cap && !(a.last === ci); }).sort(function (a, b) { return a.used / a.cap - b.used / b.cap; })[0]
          || accs.filter(function (a) { return a.used < a.cap; }).sort(function (a, b) { return a.used / a.cap - b.used / b.cap; })[0];
        if (cand) { cand.used++; cand.last = ci; } else over++;
      }
    }
    var accHtml = '<div class="bench-line"><b>Раскладка по РК (' + scheme + '):</b> ' + accs.map(function (a) { return a.n + ' — ' + pl(a.used, 'кампания', 'кампании', 'кампаний') + ' из ' + a.cap; }).join(' · ') + '.' +
      (scheme === '3-5-1' ? ' Копии -1, -2, -3 одного креатива — в <b>разные</b> РК.' : '') + (scheme === '3-5-1' && acc < 3 ? ' <b class="warn">Меньше 3 РК — копии придётся класть рядом, это риск. Лучше 1-5-1.</b>' : '') + (over ? ' <b class="bad">Не влезло ' + over + ' кампаний — лимиты РК кончились.</b>' : '') + ' ~20% лимита оставлено под дубли победителей — их клади в прогретые РК, не всё разом в новый.</div>';
    var html = '<div class="goal-row">' +
      '<div class="goal"><b>' + target + '</b><span>' + pl(target, 'креатив', 'креатива', 'креативов').replace(/^\d+ /, '') + ' минимум</span><small>упираешься в: ' + neck + '</small></div>' +
      '<div class="goal hot"><b>' + stretch + '</b><span>' + pl(stretch, 'креатив', 'креатива', 'креативов').replace(/^\d+ /, '') + ' с запасом ×1,2</span><small>= ' + pl(cmp, 'кампания', 'кампании', 'кампаний') + ' (' + scheme + ')</small></div>' +
      '<div class="goal"><b>' + statesN + '</b><span>' + pl(statesN, 'штат', 'штата', 'штатов').replace(/^\d+ /, '') + ' на историю</span><small>' + pickStates.join(', ') + '</small></div>' +
      '<div class="goal"><b>~' + money(stretch * 50) + '</b><span>реально уйдёт</span><small>сумма бюджетов ' + money(stretch * perCr) + ' — покажи Феде</small></div></div>' + accHtml +
      '<div class="bench-line">Для сравнения: Endless Dream в пик — 16 креативов (59 кампаний) за день, Измаилов — 47 кампаний. ' + (cmp >= 47 ? '<b class="good">Ты на уровне Измаилова.</b>' : '<b class="warn">До Измаилова не хватает ' + (47 - cmp) + ' кампаний.</b>') + '</div>' +
      '<ol class="timeline-plan">' + blocks.map(function (b, i) {
        return '<li class="' + b.cls + '" style="animation-delay:' + i * 60 + 'ms"><label><input type="checkbox" data-pb="' + i + '"><span class="tm">' + hm(b.s) + (b.e > b.s ? '–' + hm(b.e) : '') + '</span><span class="tx"><b>' + esc(b.title) + '</b><span>' + esc(b.text) + '</span></span></label></li>';
      }).join('') + '</ol>';
    var out = $('#planOut'); out.innerHTML = html; out.dataset.done = '1';
    if (talk) {
      var msg = 'Короче. Сегодня минимум ' + pl(target, 'креатив', 'креатива', 'креативов') + ', а по-злому ' + stretch + ', это ' + pl(cmp, 'кампания', 'кампании', 'кампаний') + '. Упираешься в ' + neck + '. ';
      msg += cmp >= 47 ? 'Это уровень Измаилова, ебашь.' : 'Измаилов в свой лучший день залил сорок семь. ' + (neck === 'аккаунты' ? 'Иди к Феде за аккаунтами.' : neck === 'бюджет' ? 'Проси у Феди лимит побольше.' : 'Времени мало — ставь автоправила.');
      FD.say(msg, { mood: cmp >= 47 ? 'happy' : null });
    }
  }

  /* ---------- РАЗБОР ---------- */
  /* ---------- быстрый разбор (Power BI + FB) ---------- */
  var QS = { pb: null, fb: null, pbName: '', fbName: '', per: 0, mode: 'camp', fbFiles: [], pbFiles: [] };
  function readClassify(f) {
    return FD.readFile(f).then(function (rows) {
      var cut = rows.slice(0, 4).some(function (r) { return (r || []).some(function (c) { return /Exported data limited|данные ограничены/i.test(String(c || '')); }); });
      var fb = FD.fbRecs(rows, f.name.replace(/\.(csv|xlsx?|xls)$/i, '').replace(/-?Campaigns?-.*$/i, '').replace(/[_-]+$/, '') || f.name);
      if (fb && fb.recs.length) return { kind: 'fb', fb: fb, name: f.name, rows: rows, size: f.size, cut: cut };
      var pb = FD.pbRecs(rows);
      return { kind: 'pb', pb: pb, name: f.name, rows: rows, size: f.size, cut: cut };
    });
  }
  function qLoad(items) {
    items.forEach(function (it) {
      var id = it.name + '|' + it.size;
      if (it.kind === 'fb') { if (!QS.fbFiles.some(function (x) { return x.id === id; })) QS.fbFiles.push({ id: id, name: it.name, fb: it.fb }); }
      else if (it.pb) { if (!QS.pbFiles.some(function (x) { return x.id === id; })) QS.pbFiles.push({ id: id, name: it.name, pb: it.pb, cut: it.cut }); }
    });
    QS.fb = FD.fbMerge(QS.fbFiles.map(function (x) { return x.fb; }));
    QS.pb = FD.pbMerge(QS.pbFiles.map(function (x) { return x.pb; }));
    QS.fbName = QS.fbFiles.length === 1 ? QS.fbFiles[0].name : QS.fbFiles.length + ' файлов';
    QS.pbName = QS.pbFiles.length === 1 ? QS.pbFiles[0].name : QS.pbFiles.length + ' файлов';
  }

  /* «Что делать прямо сейчас» — общий вывод по всем загруженным файлам с учётом времени */
  function timeOpts(sel) { var o = ''; for (var m = 0; m < 1440; m += 30) { var v = ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); o += '<option' + (v === sel ? ' selected' : '') + '>' + v + '</option>'; } return o; }
  function nowDefault() { var d = new Date(), mm = Math.floor((d.getHours() * 60 + d.getMinutes()) / 30) * 30; return ('0' + Math.floor(mm / 60)).slice(-2) + ':' + ('0' + (mm % 60)).slice(-2); }
  function todayS() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function nowCalc(Q) {
    var tm = QS.nowT || nowDefault(), u = usTime(todayS(), tm);
    var mH = +tm.split(':')[0] + (+tm.split(':')[1] || 0) / 60, off = Math.round(((mH - u.nyH) % 24 + 24) % 24);
    return { tm: tm, u: u, P: FD.nowPlan(Q, u.nyH, off) };
  }

  var RISKY = { todayBad: 0, waitNew: 0, stuck: 0, onDub: 1, on: 1, maybe: 1, reup: 1, keep: 1, dub: 1, scale: 1 };
  var RISK_LBL = { go: ['good', '🟢 Рискуй'], small: ['warn', '🟡 Рискни по-малому'], lotto: ['warn', '🎲 Лотерея'], no: ['kill', '🔴 Не стоит'], thin: ['muted', '⚪ Мало данных'] };
  function riskable(o) { return o.v.code !== 'idle' && o.v.code !== 'wait'; }
  function riskOf(o) { return o._risk || (o._risk = FD.riskOf(o)); }
  function riskHtml(o, k) {
    var R = riskOf(o), L = RISK_LBL[R.lvl], t;
    if (!R.M) t = R.t;
    else {
      var d10 = Math.round(R.dep / 10), w10 = Math.round(R.win / 10), v1 = function (n, a, b) { return n === 1 ? a : b; };
      t = 'У пацанов с такими же цифрами (' + pl(R.n, 'случай', 'случая', 'случаев') + ', кто держал дальше): из 10 ≈<b>' + d10 + '</b> ' + v1(d10, 'дал', 'дали') + ' деп за неделю, ≈<b>' + w10 + '</b> ' + v1(w10, 'вышел', 'вышли') + ' в плюс'
        + (R.big10 ? ', ≈<b>' + R.big10 + '</b> ' + v1(R.big10, 'слил', 'слили') + ' много (в среднем ' + sgn(R.bigAvg) + ')' : '') + '. '
        + 'Выстрелит — обычно ' + sgn(R.posAvg) + '. Не выстрелит — обычно ' + sgn(R.negAvg) + '. В среднем на креатив ' + sgn(R.gain) + '. ';
      var V = {
        on: { go: 'Риск оправдан — включай обратно.', small: 'Монетка. Включай, но только маленьким риском.', lotto: 'Лотерея: чаще сливает, но когда выстреливает — жирно, поэтому в среднем плюс.', no: 'Лестница говорит «рано», но у таких шансы плохие. Можешь не включать — это не ссыкло, а расчёт. Деньги лучше на дубль победителя или новый креатив.' },
        reup: { go: 'Риск оправдан — перезаливай копиями смело.', small: 'Монетка. Перезалей 1–2 копии, не больше.', lotto: 'Лотерея: перезалей одну копию, не больше.', no: 'Шансы плохие — перезаливать не обязательно, лучше новый креатив.' },
        keep: { go: 'Держи, шансы хорошие.', small: 'Держи, но только до стопа.', lotto: 'Лотерея: держи только до стопа.', no: 'Шансы плохие — можно выключить уже сейчас, не дожидаясь лестницы.' },
        dub: { go: 'Дублируй смело.', small: 'Дублируй, но 1–2 копии.', lotto: 'Дублируй одну копию.', no: 'Дублировать не спеши.' }
      }, vv = null;
      V.onDub = { go: 'Включай обратно и дублируй смело.', small: 'Включай и дублируй, но копий 1–2.', lotto: 'Оригинал дальше — лотерея. Включи, но главное — дубли.', no: 'Сам оригинал после таких цифр у пацанов чаще выгорал. Включи без больших надежд на него — главное тут дубли, они начинают с нуля.' };
      vv = V[k === 'maybe' ? 'on' : k] || V.dub;
      vv = vv[R.lvl] || vv.no;
      t += vv + (R.lvl !== 'no' || k === 'onDub' ? ' Стоп оригиналу — $' + R.stop + ' (ещё $' + R.add + '): дошёл до этой суммы без депа — выкл без жалости.' : '');
    }
    return '<div class="risk ' + L[0] + '"><span class="pill ' + L[0] + '">' + L[1] + '</span> <span class="sm">' + t + '</span></div>';
  }
  function riskSummary(B, F) {
    var g = { go: [], small: [], lotto: [], no: [], thin: [] };
    Object.keys(RISKY).forEach(function (k) { (B[k] || []).forEach(function (it) { if (F !== 'all' && (F === 'off') !== it.off) return; if (!riskable(it.o)) return; var R = riskOf(it.o); g[R.lvl].push((FD.shortKey ? FD.shortKey(it.o) : it.o.key) + (R.M ? ' (' + Math.round(R.win / 10) + '/10 в плюс)' : '') + (k === 'onDub' && R.lvl !== 'go' ? ' — оригинал; дубли всё равно делай' : '')); }); });
    if (!g.go.length && !g.small.length && !g.lotto.length && !g.no.length && !g.thin.length) return '<p class="mut sm">Тут оценивать нечего.</p>';
    var ln = function (k, title) { return g[k].length ? '<p class="sm"><span class="pill ' + RISK_LBL[k][0] + '">' + title + '</span> ' + esc(g[k].join(', ')) + '</p>' : ''; };
    return '<div class="risk-sum"><h4>😨 Где рискнуть, а где нет</h4>' + ln('go', 'Рискуй') + ln('small', 'По-малому') + ln('lotto', 'Лотерея') + ln('no', 'Не стоит') + ln('thin', 'Мало данных')
      + '<p class="mut sm">Шанс — что было у всей команды (только США) с такими же спендом, кликами, регами, депами и днём жизни, когда они не выключали, а держали ещё неделю. «Стоп» — следующая ступенька лестницы: дошёл до неё без депа — выключай. Подробности — под каждым креативом.</p></div>';
  }
  var NOW_PH = { night: 'ночь', morning: 'утро', day: 'день', evening: 'вечер, пик депов', late: 'поздний вечер' };
  function nowHtml(Q) {
    var c = nowCalc(Q), P = c.P, u = c.u, B = P.B;
    var usWd = u.nyPrev ? (u.wd + 6) % 7 : u.wd, W = FD.wdStats(ccfg().wm)[usWd], wk = '';
    if (W && W.droi != null && W.months) { var sh = W.pos / W.months; if (W.droi <= -5 && sh <= 0.4) wk = '📅 В США ' + FD.WD_NAMES[usWd] + ' — обычно слабый день. Не выключай креатив только из-за цифр за сегодня — смотри вместе с завтрашним днём.'; else if (W.droi >= 5 && sh >= 0.6) wk = '📅 В США ' + FD.WD_NAMES[usWd] + ' — обычно хороший день. Держи креативы смелее, победителей дублируй.'; }
    var ok = function (x) { return '<span class="pill ' + (x.ok === 2 ? 'good' : x.ok === 1 ? 'warn' : 'kill') + '">' + (x.ok === 2 ? '✅ сейчас можно' : x.ok === 1 ? '⚠️ частично' : '❌ не сейчас') + '</span>'; };
    var row = function (it) {
      var o = it.o, ds = o.life || o, key = FD.shortKey ? FD.shortKey(o) : o.key, tok = (String(o.key).match(/[A-Z]{2}\d{4}/) || [])[0];
      var loc = FD.locOf(o), lh = '';
      if (loc.length) {
        lh = '<div class="loc">📍 ' + loc.map(function (a) { return '<b>' + (a.no ? 'РК №' + a.no + ' ' : '') + '«' + esc(a.acct) + '»</b>: ' + pl(a.n, 'кампания', 'кампании', 'кампаний') + (a.on ? (a.on === a.n ? ' (вкл)' : ' (' + a.on + ' вкл)') : ' (выкл)') + ', ' + (a.n > 1 ? a.camps.map(function (c) { return money(c.spend); }).join(' + ') + ' = ' : '') + money(a.spend); }).join(' · ') + (tok ? ' · <span class="mut">в Ads Manager вбей в поиск <b class="mono">' + tok + '</b></span>' : '') + '</div>'
          + '<details class="loc-d"><summary>названия кампаний</summary><ul>' + loc.map(function (a) { return a.camps.map(function (c) { return '<li><span class="pill ' + (c.on ? 'good' : 'kill') + '">' + (c.on ? 'вкл' : c.st ? 'выкл' : '?') + '</span> ' + (a.no ? 'РК №' + a.no + ' ' : '') + '«' + esc(a.acct) + '» · ' + money(c.spend) + (c.fd ? ', ' + pl(Math.round(c.fd), 'деп', 'депа', 'депов') : '') + '<div class="mono sm">' + esc(c.camp) + '</div></li>'; }).join(''); }).join('') + '</ul></details>';
      } else if (QS.fb) lh = '<div class="loc mut">📍 Нет в загруженных выгрузках FB — значит, лежит в другом РК. Докинь его выгрузку.</div>';
      else lh = '<div class="loc mut">📍 Чтобы видеть, в каком РК лежит, докинь выгрузки FB.</div>';
      return '<li><b class="mono">' + esc(key) + '</b>' + (o.st ? ' <span class="mut">' + esc(o.st) + '</span>' : '') + ' · ' + money(ds.spend) + ', ' + pl(Math.round(ds.fd), 'деп', 'депа', 'депов') + (ds.spend && ds.fd ? ', ROI ' + pct((ds.rev / ds.spend - 1) * 100) : '') + (it.why ? ' — <span class="mut">' + esc(it.why) + '</span>' : '') + (o.nonUS ? ' <span class="pill warn">не США?</span>' : '') + lh + (QS.risk && RISKY[it.k] && riskable(it.o) ? riskHtml(it.o, it.k === 'scale' ? 'dub' : it.k) : '') + '</li>';
    };
    var A = [
      ['kill', '⛔ ВЫРУБАЙ, НЕ ДУБЛИРУЙ', (FD.EXPLAIN.kill || {}).press, P.kill],
      ['cut', '✂️ УРЕЖЬ ВДВОЕ, НЕ ДУБЛИРУЙ', (FD.EXPLAIN.cut || {}).press, P.kill],
      ['onDub', '🔛 ВКЛЮЧИ ОБРАТНО + ДУБЛИРУЙ', 'Рабочий креатив, зря выключен. Включи его кампании обратно (бюджет не меняй) и сразу сделай 3 копии в другие РК и соседние штаты. Включать лучше, чем перезаливать: у кампании уже есть обучение. Если за 2–3 часа американского дня не начнёт тратить — тогда перезалей копию.', P.launch],
      ['on', '🔛 ВКЛЮЧИ ОБРАТНО, НЕ ДУБЛИРУЙ', 'Включи кампании этого креатива обратно, бюджет не меняй. Дубли — когда придёт ещё деп. Не начнёт тратить за 2–3 часа американского дня — перезалей копию в другой РК.', P.launch],
      ['maybe', '🎲 МОЖНО ВКЛЮЧИТЬ — ПО ЖЕЛАНИЮ', 'Это лотерея или похожих случаев мало. Включай, только если есть свободный бюджет, и дай максимум до следующей ступеньки лестницы.', P.launch],
      ['scale', '🚀 ДЕРЖИ + МАСШТАБИРУЙ', 'Это жирный победитель (3+ депа и ROI +50% и выше). Оригинал не трогай, бюджет ему не поднимай. Залей 5 копий: в новые штаты из твоих офферов и в другие РК.', P.launch],
      ['dub', '📑 ДЕРЖИ + ДУБЛИРУЙ', (FD.EXPLAIN.dub || {}).press, P.launch],
      ['todayBad', '⚠️ СЕГОДНЯ ПЛОХО — ПРОВЕРЬ ЗА ВСЁ ВРЕМЯ', 'По одному дню не режь. Открой этот креатив в Ads Manager за «Maximum» (или кинь сюда выгрузку за Maximum / Power BI). За всё время в плюсе или деп дешевле $110 — не трогай. Без депов и сумма за всю жизнь уже $160+ — тогда вырубай.', null],
      ['waitNew', '⏳ ТОЛЬКО ЗАЛИЛ — ЖДИ, НЕ ДУБЛИРУЙ', 'Ничего не трогай. Первые 2–3 часа американского дня FB раскачивается и тратит копейки — это нормально.', null],
      ['stuck', '🐢 НЕ КРУТИТ — ПОДНИМИ БИД, НЕ ДУБЛИРУЙ', 'Не дублируй и не вырубай. Если кампания на Bid Cap — подними бид или переключи на Highest Volume. Через 2–3 часа американского дня всё ещё почти не тратит — тогда выключай и заливай копию в другой РК.', P.launch],
      ['reup', '♻️ ВЫРУБАЙ + ПЕРЕЗАЛЕЙ', 'Залей новую копию в другой РК или в новый штат. Старую не реанимируй.', P.launch],
      ['keep', '👌 ПРОСТО ДЕРЖИ, НЕ ДУБЛИРУЙ', P.keepT, null]
    ];
    var todo = [], h = '<div class="q-now"><div class="q-now-hd"><h3>🎯 Что делать прямо сейчас</h3><label>У тебя сейчас <select id="qNowT">' + timeOpts(c.tm) + '</select></label></div>';
    h += '<p><b>В Нью-Йорке ' + u.ny + '</b> — там ' + NOW_PH[P.ph] + (u.nyPrev ? ' (и у них ещё вчерашний день)' : '') + '. Включать и заливать новое: ' + ok(P.launch) + '</p><p class="sm">' + esc(P.launch.t) + '</p>' + (wk ? '<p class="sm">' + esc(wk) + '</p>' : '');
    if (!P.hasSt) h += '<p class="mut sm">В выгрузке нет колонки «Показ кампании» (Campaign delivery) — не вижу, что включено, а что нет. Считаю, что всё включено. Кидай выгрузку FB с этой колонкой.</p>';
    var F = P.hasSt ? (QS.nowF || 'on') : 'all', cnt = function (f) { var n = 0; Object.keys(B).forEach(function (k) { if (k !== 'nofb') B[k].forEach(function (x) { if (f === 'all' || (f === 'off') === x.off) n++; }); }); return n; };
    var onCamps = 0; Object.keys(B).forEach(function (k) { if (k === 'nofb') return; B[k].forEach(function (x) { if (x.off === false) FD.locOf(x.o).forEach(function (a) { onCamps += a.on; }); }); });
    if (P.hasSt && B.nofb.length) { var nAcc = Q.accts.length; h += '<div class="q-warn"><p>⚠️ Загружено РК: <b>' + nAcc + '</b> (' + esc(Q.accts.map(function (a) { return a.name; }).join(', ')) + '). Вкл/выкл вижу только по ' + (nAcc === 1 ? 'нему' : 'ним') + '. Ещё <b>' + pl(B.nofb.length, 'креатив', 'креатива', 'креативов') + '</b> из Power BI ' + (B.nofb.length === 1 ? 'лежит' : 'лежат') + ' в других РК — их статус не вижу, поэтому в «Активные» они не попали. Докинь выгрузки остальных РК — и счёт станет полным. Что делать с ними по цифрам трекера — в раскрывашке «❔ Статус не вижу» ниже.</p></div>'; }
    if (P.hasSt) h += '<div class="chips q-nowf" role="group">' + [['on', '🟢 Активные'], ['off', '⚫ Выключенные'], ['all', 'Все']].map(function (b) { return '<button type="button" data-nf="' + b[0] + '" aria-pressed="' + (F === b[0]) + '">' + b[1] + ' <span class="mut">' + cnt(b[0]) + (b[0] === 'on' ? ' крео · ' + onCamps + ' камп.' : '') + '</span></button>'; }).join('') + '</div>';
    h += '<div class="chips"><button type="button" data-risk aria-pressed="' + !!QS.risk + '">😨 Боюсь включать — оцени риск</button></div>';
    if (QS.risk) h += riskSummary(B, F);
    A.forEach(function (a) {
      var it = B[a[0]].filter(function (x) { return F === 'all' || (F === 'off') === x.off; }); if (!it.length) return;
      if (a[0] !== 'keep') todo.push({ k: a[0], n: it.length, ok: a[3] ? a[3].ok : 2, t: a[1] });
      h += '<details class="q-act"><summary>' + a[1] + ' · ' + it.length + (a[3] ? ' ' + ok(a[3]) : '') + '</summary><p class="sm">' + esc(a[2] || '') + (a[3] && a[3].ok < 2 && a[0] !== 'kill' && a[0] !== 'cut' ? ' <b>' + esc(a[3].ok === 0 ? 'Но не сейчас — включай с ' + P.start + '.' : 'Поздно: лучше с ' + P.start + '. Включаешь сейчас — только с автоправилами.') + '</b>' : '') + '</p><ul>' + it.slice(0, 10).map(function (x) { x.k = a[0]; return row(x); }).join('') + (it.length > 10 ? '<li class="mut">…и ещё ' + (it.length - 10) + '</li>' : '') + '</ul></details>';
    });
    if (B.nofb.length) {
      var gN = {}; B.nofb.forEach(function (x) { var c = x.o.v.code === 'keep' ? 'hold' : x.o.v.code; (gN[c] = gN[c] || []).push(x); });
      h += '<details class="q-act"><summary>❔ Статус не вижу (нет выгрузки их РК) · ' + B.nofb.length + '</summary><p class="sm">Эти креативы есть в Power BI, но их РК ты не загрузил — не знаю, включены они или нет. Вот что по цифрам трекера (за всю жизнь креатива). Если уже выключен — пропусти строку.</p>'
        + ['dub', 'hold', 'cut', 'kill', 'wait'].filter(function (c) { return gN[c]; }).map(function (c) { var cb = FD.COMBO[c]; return '<p class="sm"><span class="pill ' + ({ dub: 'acc', hold: 'good', cut: 'warn', kill: 'kill', wait: 'muted' })[c] + '">' + esc(({ dub: 'ДЕРЖИ + ДУБЛИРУЙ', hold: 'ДЕРЖИ, НЕ ДУБЛИРУЙ', cut: 'УРЕЖЬ ×0,5, НЕ ДУБЛИРУЙ', kill: 'ВЫРУБАЙ, НЕ ДУБЛИРУЙ', wait: 'ВЫРУБАЙ + ПЕРЕЗАЛЕЙ' })[c]) + '</span> <span class="mut">' + esc(cb.camp[1] + ' · ' + cb.dub[1]) + '</span></p><ul>' + gN[c].map(function (x) { x.k = 'nofb'; return row(x); }).join('') + '</ul>'; }).join('')
        + '</details>';
    }
    if (B.skip.length && F !== 'on') h += '<p class="mut sm">🙅 Вырубил рано, но у таких шансы плохие (у пацанов в плюс выходили 1–2 из 10) — можно не включать, это не ссыкло: ' + esc(B.skip.map(function (x) { return FD.shortKey ? FD.shortKey(x.o) : x.o.key; }).join(', ')) + '.</p>';
    if (B.dead.length && F !== 'on') h += '<p class="mut sm">🪦 Старые выключенные, на которые FB почти не тратил (меньше $30 без депов): ' + B.dead.length + ' — забей, включать их нет смысла. Нравится креатив — залей свежую копию.</p>';
    if (B.doneKill.length && F !== 'on') h += '<p class="mut sm">💪 Уже правильно выключено: ' + B.doneKill.length + '.</p>';
    if (!todo.length) h += '<p><b>' + (F === 'on' ? 'По активным делать нечего.' : F === 'off' ? 'По выключенным делать нечего.' : 'Делать нечего.') + '</b> Ничего не горит, никого не надо включать. ' + esc(P.keepT) + '</p>';
    h += '<p class="mut sm">Время — по Минску/Москве. Решения — по сумме за всю жизнь креатива в файле (лестница). Масштабировать = заливать копии, а не поднимать бюджет оригиналу.</p></div>';
    return { html: h, todo: todo, P: P, u: u, F: F };
  }
  function nowSay(N) {
    var P = N.P, t = (N.F === 'on' ? 'По активным кампаниям. ' : N.F === 'off' ? 'По выключенным. ' : '') + 'Что делать сейчас. В Нью-Йорке ' + N.u.ny + ', там ' + NOW_PH[P.ph] + '. ';
    var now = N.todo.filter(function (x) { return x.ok > 0; }), later = N.todo.filter(function (x) { return x.ok === 0; });
    var nm = { todayBad: ['проверь за всё время', 'креатив', 'креатива', 'креативов'], waitNew: ['подожди', 'креатив', 'креатива', 'креативов'], stuck: ['подними бид у', 'креатива', 'креативов', 'креативов'], onDub: ['включи обратно и дублируй', 'креатив', 'креатива', 'креативов'], maybe: ['по желанию включи', 'креатив', 'креатива', 'креативов'], kill: ['выключи', 'креатив', 'креатива', 'креативов'], cut: ['урежь', 'креатив', 'креатива', 'креативов'], on: ['включи обратно', 'креатив', 'креатива', 'креативов'], scale: ['масштабируй', 'победителя', 'победителей', 'победителей'], dub: ['дублируй', 'креатив', 'креатива', 'креативов'], reup: ['перезалей', 'креатив', 'креатива', 'креативов'] };
    if (now.length) t += 'Сейчас: ' + now.map(function (x) { var w = nm[x.k]; return w[0] + ' ' + pl(x.n, w[1], w[2], w[3]); }).join(', ') + '. ';
    if (later.length) t += 'Включать и заливать сейчас глупо — ' + later.map(function (x) { var w = nm[x.k]; return w[0] + ' ' + pl(x.n, w[1], w[2], w[3]); }).join(', ') + ' — с ' + P.start + '. ';
    if (!N.todo.length) t += 'Делать нечего, ничего не горит. ';
    return t;
  }
  function qRender(box, per, talk) {
    if (!QS.pb && !QS.fb) { box.innerHTML = ''; return; }
    var Q = FD.quick(QS.pb, QS.fb, per || null, QS.mode);
    var src = [];
    if (QS.pb) src.push('<b>Power BI:</b> ' + esc(QS.pbName));
    if (QS.fb) src.push('<b>Ads Manager:</b> загружено РК — <b>' + Q.accts.length + '</b>' + (QS.fbFiles.length !== Q.accts.length ? ' (файлов ' + QS.fbFiles.length + ')' : '') + (QS.fb.renamed.length ? '<br><span class="mut">Файлы с одинаковым названием, но разными кампаниями — посчитал как разные РК: ' + esc(QS.fb.renamed.join(', ')) + '. Лучше переименуй файлы по названию кабинета.</span>' : '') + (QS.fb.dropped.length ? '<br><span class="mut">Один и тот же РК загружен дважды (' + esc(QS.fb.dropped.join(', ')) + ') — взял свежую выгрузку, чтобы спенд не задвоился.</span>' : '') + (Q.fbRange ? ' · ' + Q.fbRange + ', уровень ' + QS.fb.level : ''));
    var period = Q.lastDay != null ? (Q.from != null ? FD.dayStr(Q.from) + '–' : 'всё до ') + FD.dayStr(Q.lastDay) : 'весь период файла';
    var T = Q.T, h = '<div class="q-src">' + src.join(' · ') + ' <button class="x" data-qclear type="button">Очистить</button></div>';
    h += '<p class="mut sm">Прочитано: ' + [Q.read.pb ? 'Power BI — ' + pl(Q.read.pb.camps, 'кампания', 'кампании', 'кампаний') + ', ' + pl(Q.read.pb.cr, 'креатив', 'креатива', 'креативов') + ', ' + money(Q.read.pb.spend) + ', ' + pl(Q.read.pb.fd, 'деп', 'депа', 'депов') + (Q.read.pb.days ? ', дни ' + Q.read.pb.days : '') : null, Q.read.fb ? 'FB — ' + pl(Q.read.fb.rows, 'кампания', 'кампании', 'кампаний') + ', ' + pl(Q.read.fb.cr, Q.mode === 'camp' ? 'уникальная' : 'креатив', Q.mode === 'camp' ? 'уникальные' : 'креатива', Q.mode === 'camp' ? 'уникальных' : 'креативов') + ', ' + money(Q.read.fb.spend) : null].filter(Boolean).join('; ') + '. В разборе: <b>' + Q.list.length + '</b>' + (Q.read.fb && Q.read.fb.zero.length ? '. Не крутились вообще ($0, без депов) — ' + Q.read.fb.zero.length + ': ' + esc(Q.read.fb.zero.slice(0, 6).map(function (k) { return k.length > 30 ? k.slice(0, 30) + '…' : k; }).join(', ')) + (Q.read.fb.zero.length > 6 ? '…' : '') + ' — их в разборе нет, решать там нечего' : '') + '.</p>';
    if (Q.pbScope && Q.pbScope.spendTotal - Q.pbScope.spendKept > 1) h += '<p class="mut sm">Считаю только загруженные РК (' + Q.accts.length + '). Из Power BI взял только их кампании: ' + money(Q.pbScope.spendKept) + ' из ' + money(Q.pbScope.spendTotal) + '. Остальное — другие РК, их не трогаю. Хочешь по всем — кидай только Power BI или докинь выгрузки остальных РК.</p>';
    if (QS.pbFiles.some(function (x) { return x.cut; })) h += '<div class="q-warn bad"><p>🚨 Power BI обрезал выгрузку («Exported data limited to 150000 rows») — часть строк в файл не попала. Выгрузи меньший период или без лишних колонок.</p></div>';
    if (Q.lockFb) h += '<p class="mut sm">Выгрузка FB без разбивки по дням, поэтому период берётся из неё: ' + period + '. Чтобы выбирать дни кнопками, выгрузи FB с разбивкой «По дням» или кидай только Power BI.</p>';
    else h += '<p class="mut sm">Период: <b>' + period + '</b>. В таблице цифры за этот период, а решение — по сумме за всю жизнь креатива, что есть в файле (лестница так и работает).</p>';
    if (Q.warn.length) h += '<div class="q-warn">' + Q.warn.map(function (w) { return '<p>⚠️ ' + esc(w) + '</p>'; }).join('') + '</div>';
    h += '<div class="kpis">' +
      '<div class="kpi"><span>Спенд</span><b>' + money(T.spend) + '</b></div>' +
      '<div class="kpi"><span>Депы' + (QS.pb ? ' (трекер)' : ' (FB)') + '</span><b>' + T.fd + '</b>' + (T.dep ? '<em>по ' + money(T.dep) + '</em>' : '') + '</div>' +
      '<div class="kpi ' + (T.roi >= 0 ? 'good' : 'bad') + '"><span>ROI</span><b>' + pct(T.roi) + '</b></div>' +
      (QS.pb && QS.fb && T.cmpPb != null ? '<div class="kpi ' + (T.lost ? 'bad' : 'good') + '"><span>Депы FB / трекер</span><b>' + T.cmpFb + ' / ' + T.cmpPb + '</b><em>' + (T.cmpPb ? 'FB видит ' + Math.round(T.cmpFb / T.cmpPb * 100) + '%' : '') + '</em></div>' : '') + '</div>';
    var N = nowHtml(Q); QS.lastQ = Q; h += '<div id="qNow">' + N.html + '</div>';
    if (QS.pb && QS.fb && T.cmpPb && T.cmpFb / T.cmpPb < 0.8) h += '<div class="q-warn bad"><p>🚨 FB видит только ' + Math.round(T.cmpFb / T.cmpPb * 100) + '% депов. FB учится на «Покупке» — чем меньше депов долетает, тем хуже он находит людей. Покажи это Феде: пиксель или постбэк теряет депы.</p></div>';
    if (Q.hasStatus) {
      var rh = '';
      if (Q.cowards.length) rh += '<h4>😂 Зря вырубил · ' + Q.cowards.length + '</h4>' + Q.cowards.slice(0, 8).map(function (o, i) {
        var c = FD.cowardText(o, i), M = c.M;
        return '<div class="roast bad"><p>' + esc(FD.clean(c.text)) + '</p>' + (M && M.n >= 8 && M.held >= 10 ? '<div class="chance"><span>Шанс на деп за неделю, если держать: <b>' + Math.round(M.depPct) + '%</b></span><span>Шанс выйти в плюс: <b>' + Math.round(M.winPct) + '%</b></span><span>Похожих случаев: ' + M.n + ' у ' + M.buyers + ' баеров</span></div>' : '') + '</div>';
      }).join('') + (Q.cowards.length > 8 ? '<p class="mut sm">…и ещё ' + (Q.cowards.length - 8) + '.</p>' : '');
      var pr = Q.rk.map(function (o, i) { return FD.fillT(FD.pickT(FD.PRAISE_KILL, i), o); }).concat(Q.goodHolds.map(function (o, i) { return FD.fillT(FD.pickT(FD.PRAISE_HOLD, i), o); }));
      if (pr.length) rh += '<h4>💪 Красава · ' + pr.length + '</h4>' + pr.slice(0, 6).map(function (t) { return '<div class="roast good"><p>' + esc(FD.clean(t)) + '</p></div>'; }).join('');
      if (Q.burning.length) rh += '<h4>🔥 Всё ещё жрёт бабки · ' + Q.burning.length + '</h4>' + Q.burning.slice(0, 6).map(function (o, i) { return '<div class="roast warn"><p>' + esc(FD.clean(FD.fillT(FD.pickT(FD.ROAST_BURN, i), o))) + '</p></div>'; }).join('');
      if (rh) h += '<details class="q-grp"><summary>😂 Разбор: зря вырубил / красава / жрёт бабки</summary><div class="q-roast">' + rh + '<p class="mut sm">Статус «вкл/выкл» берётся из колонки «Показ кампании» (Campaign delivery) в выгрузке FB. «Шанс» — что было у пацанов с такими же цифрами, если они держали дальше.</p></div></details>';
    }
    if (Q.accts.length) {
      var hasPbA = QS.pb && Q.accts.some(function (a) { return a.pbSpend > 0; });
      h += '<details class="q-grp"><summary>🗂 По рекламным кабинетам · ' + Q.accts.length + ' · ' + money(Q.accts.reduce(function (x, a) { return x + a.spend; }, 0)) + '</summary><div class="tbl"><table><thead><tr><th>РК</th><th class="n">Кампаний</th><th class="n">Вкл</th><th class="n">Спенд FB</th><th class="n">Клики</th><th class="n">Лиды</th><th class="n">Покупки FB</th>' + (hasPbA ? '<th class="n">Депы трекер</th><th class="n">ROI трекер</th>' : '') + '</tr></thead><tbody>'
        + Q.accts.map(function (a) {
          var lost = hasPbA && a.pbFd > a.fd;
          return '<tr><td><b>' + (a.no ? 'РК №' + a.no + ' ' : '') + esc(a.name) + '</b>' + (a.shared ? '<div class="mut sm">' + a.shared + ' кампаний с таким же названием есть в другом РК — их депы не делю</div>' : '') + '</td><td class="n">' + a.nCamps + '</td><td class="n">' + (QS.fb.hasStatus ? a.nOn : '—') + '</td><td class="n">' + money(a.spend) + '</td><td class="n">' + Math.round(a.clk) + '</td><td class="n">' + Math.round(a.regs) + '</td><td class="n ' + (lost ? 'bad' : '') + '">' + Math.round(a.fd) + '</td>'
            + (hasPbA ? '<td class="n">' + Math.round(a.pbFd) + '</td><td class="n ' + (a.pbSpend ? (a.pbRev / a.pbSpend >= 1 ? 'good' : 'bad') : '') + '">' + (a.pbSpend ? pct((a.pbRev / a.pbSpend - 1) * 100) : '—') + '</td>' : '') + '</tr>';
        }).join('')
        + (Q.accts.length > 1 ? '<tr class="hl"><td><b>Итого</b></td><td class="n">' + Q.accts.reduce(function (x, a) { return x + a.nCamps; }, 0) + '</td><td class="n">' + (QS.fb.hasStatus ? Q.accts.reduce(function (x, a) { return x + a.nOn; }, 0) : '—') + '</td><td class="n">' + money(Q.accts.reduce(function (x, a) { return x + a.spend; }, 0)) + '</td><td class="n">' + Math.round(Q.accts.reduce(function (x, a) { return x + a.clk; }, 0)) + '</td><td class="n">' + Math.round(Q.accts.reduce(function (x, a) { return x + a.regs; }, 0)) + '</td><td class="n">' + Math.round(Q.accts.reduce(function (x, a) { return x + a.fd; }, 0)) + '</td>' + (hasPbA ? '<td class="n">' + Math.round(Q.accts.reduce(function (x, a) { return x + a.pbFd; }, 0)) + '</td><td></td>' : '') + '</tr>' : '')
        + '</tbody></table></div>' + (hasPbA && Q.unmatchedPb.n ? '<p class="mut sm">Ещё ' + pl(Q.unmatchedPb.n, 'кампания', 'кампании', 'кампаний') + ' из Power BI ($' + Math.round(Q.unmatchedPb.spend) + ', ' + pl(Q.unmatchedPb.fd, 'деп', 'депа', 'депов') + ') не нашлись ни в одном загруженном РК — докинь выгрузки остальных кабинетов.</p>' : '') + '<p class="mut sm">Название РК — из колонки «Название аккаунта», если ты её добавил в Ads Manager, иначе из имени файла. Депы трекера по РК считаются по совпадению названий кампаний.</p></details>';
    }
    var G = [['dub', 'ДЕРЖИ + ДУБЛИРУЙ'], ['hold', 'ДЕРЖИ, НЕ ДУБЛИРУЙ'], ['keep', 'РАНО — ДЕРЖИ, НЕ ДУБЛИРУЙ'], ['check', 'СЕГОДНЯ ПЛОХО — ПРОВЕРЬ ЗА ВСЁ ВРЕМЯ'], ['cut', 'УРЕЖЬ ВДВОЕ, НЕ ДУБЛИРУЙ'], ['kill', 'ВЫРУБАЙ, НЕ ДУБЛИРУЙ'], ['wait', 'ЖДИ / ПОДНИМИ БИД, НЕ ДУБЛИРУЙ'], ['idle', 'УЖЕ НЕ ТРАТЯТ']];
    G.forEach(function (g) {
      var it = Q.groups[g[0]]; if (!it || !it.length) return;
      var e = FD.EXPLAIN[g[0]] || { press: 'Выгорели или выключены. Проверь, что в Ads Manager они выключены, и не трать на них время.' };
      h += '<details class="q-grp"><summary><span class="pill ' + it[0].v.cls + '">' + g[1] + '</span> ' + it.length + ' · <span class="mut sm">' + esc(e.press || '') + '</span></summary><div class="tbl"><table><thead><tr><th>' + (Q.mode === 'camp' ? 'Кампания' : 'Креатив') + '</th><th class="n">Спенд</th><th class="n">Клики</th><th class="n">Реги</th><th class="n">Депы' + (QS.pb && QS.fb ? ' трек/FB' : '') + '</th><th class="n">Деп $</th><th class="n">ROI</th><th>Почему</th></tr></thead><tbody>' +
        it.map(function (o) {
          var dep = o.fd ? o.spend / o.fd : null;
          return '<tr><td><b class="mono' + (Q.mode === 'camp' ? ' camp' : '') + '">' + esc(o.key) + '</b><div class="mut sm">' + (o.st_n ? (o.off ? '<span class="pill kill">выкл</span> ' : '<span class="pill good">вкл</span> ') : '') + (o.st ? o.st + ' · ' : '') + 'день ' + o.age + ' · ' + FD.pl(o.copies || 1, 'кампания', 'кампании', 'кампаний') + '</div></td><td class="n">' + money(o.spend) + '</td><td class="n">' + Math.round(o.clk) + '</td><td class="n">' + Math.round(o.regs) + '</td><td class="n">' + (o.pb && o.fb ? o.pb.fd + ' / ' + o.fb.fd : o.fd) + '</td><td class="n">' + (dep ? money(dep) : '—') + '</td><td class="n ' + (o.roi >= 0 ? 'good' : 'bad') + '">' + (o.roi == null ? '—' : pct(o.roi)) + '</td><td class="sm">' + esc(FD.clean(o.v.why)) + o.flags.map(function (f) { return '<div class="flag ' + f.cls + '">' + esc(FD.clean(f.t)) + '</div>'; }).join('') + '</td></tr>';
        }).join('') + '</tbody></table></div></details>';
    });
    box.innerHTML = h;
    var say = FD.quickSay(Q);
    if (talk) FD.say(nowSay(N) + ' ' + say, { mood: Q.T.roi < 0 || Q.T.lost ? 'angry' : 'happy' });
    return Q;
  }
  function qFiles(files, box, per) {
    if (!window.XLSX) { box.innerHTML = '<p class="bad">Не загрузилась библиотека чтения Excel. Проверь интернет и обнови страницу.</p>'; return Promise.resolve(); }
    box.innerHTML = '<p class="mut">Читаю…</p>';
    return Promise.all(Array.prototype.map.call(files, readClassify)).then(function (items) { qLoad(items); qRender(box, per, true); addXP(10); return items; })
      .catch(function (e) { box.innerHTML = '<p class="bad">' + esc(e.message) + '</p>'; FD.say('Братан, это что за таблица? ' + e.message, { mood: 'shock' }); });
  }
  function initQuick() {
    $('#qFile').onchange = function () { qFiles(this.files, $('#qOut'), QS.per); this.value = ''; };
    var d = $('#qDrop');
    ['dragenter', 'dragover'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.remove('over'); }); });
    d.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) qFiles(e.dataTransfer.files, $('#qOut'), QS.per); });
    $('#qMode').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; QS.mode = b.dataset.m; $$('#qMode button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); qRender($('#qOut'), QS.per, false); });
    $('#qPer').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; QS.per = +b.dataset.p; $$('#qPer button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); qRender($('#qOut'), QS.per, true); });
    document.addEventListener('click', function (e) { if (e.target.closest('[data-risk]') && QS.lastQ) { QS.risk = !QS.risk; var N = nowHtml(QS.lastQ); $('#qNow').innerHTML = N.html; if (QS.risk) $$('#qNow details.q-act').forEach(function (d) { d.open = true; }); } });
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-nf]'); if (b && QS.lastQ) { QS.nowF = b.dataset.nf; var N = nowHtml(QS.lastQ); $('#qNow').innerHTML = N.html; } });
    document.addEventListener('change', function (e) { if (e.target.id === 'qNowT' && QS.lastQ) { QS.nowT = e.target.value; var N = nowHtml(QS.lastQ); $('#qNow').innerHTML = N.html; FD.say(nowSay(N), { mood: N.P.launch.ok ? 'happy' : null }); } });
    document.addEventListener('click', function (e) { if (e.target.closest('[data-qclear]')) { QS.pb = QS.fb = null; QS.fbFiles = []; QS.pbFiles = []; $('#qOut').innerHTML = ''; $$('.q-box').forEach(function (b) { b.remove(); }); FD.shut(); } });
  }

  function handleFiles(files) {
    var out = $('#parseOut');
    if (!window.XLSX) { out.innerHTML = '<p class="bad">Не загрузилась библиотека чтения Excel. Проверь интернет и обнови страницу.</p>'; return; }
    Promise.all(Array.prototype.map.call(files, function (f) { return readClassify(f).catch(function (e) { return { kind: 'err', name: f.name, e: e }; }); })).then(function (items) {
      var hasFb = items.some(function (it) { return it.kind === 'fb'; }), talk = [];
      items.forEach(function (it) {
        if (it.kind === 'err') { var c0 = document.createElement('div'); c0.className = 'report'; c0.innerHTML = '<p class="bad">' + esc(it.name) + ': ' + esc(it.e.message) + '</p>'; out.prepend(c0); return; }
        if (it.kind !== 'pb') return;
        var card = document.createElement('div'); card.className = 'report'; out.prepend(card);
        try { var R = FD.analyze(it.rows, it.name); renderReport(card, R); if (!hasFb) talk = talk.concat(R.talk.map(function (x) { return x.text; })); }
        catch (e) { card.innerHTML = '<p class="bad">' + esc(it.name) + ': ' + esc(e.message) + '</p>'; talk.push('Братан, это что за таблица? ' + e.message); }
      });
      if (hasFb || items.filter(function (it) { return it.kind === 'pb'; }).length) {
        qLoad(items.filter(function (it) { return it.kind !== 'err'; }));
        if (hasFb) {
          var qb = document.createElement('div'); qb.className = 'report q-box'; qb.innerHTML = '<h3>Сверка и что делать</h3><div></div>'; out.prepend(qb);
          qRender(qb.lastChild, 0, true);
        }
      }
      if (talk.length) FD.say(talk.join(' '));
      addXP(15);
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
    FD.ch.casStates($('#casinoList'), Object.keys(FD.STATES).filter(function (k) { return FD.STATES[k].tier !== 'stop'; }), 150);
    $('#storyList').innerHTML = FD.STORIES.map(function (s) { return '<tr><td class="mono">' + esc(s[0]) + '</td><td>' + esc(s[1]) + '</td><td>' + esc(s[2]) + '</td></tr>'; }).join('');
  }
  function stateInfo(k) {
    var st = FD.STATES[k], box = $('#stateInfo');
    if (!st) { box.innerHTML = '<h3>' + k + '</h3><p>По этому штату у пацанов почти нет данных. Лей только как тест, $50–80 на креатив.</p>'; FD.say(k + '? Тут никто толком не лил. Хочешь быть первым — тестируй аккуратно.'); return; }
    var t = FD.TIER[st.tier];
    box.innerHTML = '<span class="pill ' + t[1] + '">' + t[0] + '</span><h3>' + k + ' · ' + esc(st.n) + '</h3><table class="t"><tr><td>Сейчас (вся команда, 10–18 окт)</td><td>' + esc(st.now) + '</td></tr><tr><td>Сентябрь</td><td>' + esc(st.sep) + '</td></tr><tr><td>Все вместе</td><td><b>' + esc(st.all) + '</b>' + (st.dep ? ' · деп $' + st.dep : '') + '</td></tr></table><p>' + esc(st.note) + '</p>';
    var line = { go: 'Сюда лей в первую очередь, братан. Плюсует и сейчас, и раньше.', test: 'Сейчас тут плюс, но объёма мало. Тестируй, пока толпа не набежала.', watch: 'Можно, но смотри в оба. Деп тут дороже.', stop: 'Осторожно. Тут либо выжгли свои, либо минус. Не лезь, пока есть штаты получше.' }[st.tier];
    var cs = FD.casByState(k).filter(function (c) { return c[5] >= 100 && c[2] != null; });
    if (cs.length) { var cbox = document.createElement('div'); box.appendChild(cbox); FD.ch.casStates(cbox, [k], 100); }
    var top = cs.filter(function (c) { return c[4] === 'go'; })[0], bad = cs.filter(function (c) { return c[4] === 'stop'; })[0];
    line += top ? ' Казино бери ' + FD.casName(top[0]) + ', плюс ' + top[2] + '.' : '';
    line += bad ? ' А ' + FD.casName(bad[0]) + ' сейчас в минусе, не бери.' : '';
    FD.say(k + ', ' + st.n + '. ' + line + ' ' + st.note, { mood: st.tier === 'stop' ? 'angry' : st.tier === 'go' ? 'happy' : null });
  }

  /* ---------- шпаргалка: калькулятор ---------- */
  function doy(n) { var d = new Date(2026, 0, n); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function sgn(v) { return (v >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(v)).toLocaleString('ru-RU'); }
  function wdOfDoy(n) { return (new Date(Date.UTC(2026, 0, n)).getUTCDay() + 6) % 7; }
  function simCard(x, good) {
    return '<div class="case ' + (good ? 'good' : 'bad') + (FD.PRIO.indexOf(x.buyer) > -1 ? ' prio' : '') + '"><div class="who">' + (FD.PRIO.indexOf(x.buyer) > -1 ? '⭐ ' + FD.PRIO_NAME[x.buyer] + ' (' + esc(x.buyer) + ')' : esc(x.buyer)) + ' · ' + doy(x.date) + ' (' + FD.WD_SHORT[wdOfDoy(x.date)] + ') · день ' + x.age + '</div><div class="nm mono">' + esc(x.name) + '</div>'
      + '<p>Было: $' + x.s + ', ' + pl(x.c, 'клик', 'клика', 'кликов') + ', ' + pl(x.rg, 'рега', 'реги', 'рег') + ', ' + pl(x.d, 'деп', 'депа', 'депов') + '.</p>'
      + '<p>' + (good ? 'Не зассал' : 'Держал') + ': на след. день ещё $' + x.ns + ' и ' + pl(x.nd, 'деп', 'депа', 'депов') + '. Всего дальше потратил ещё $' + x.es + ', получил ' + pl(x.ed, 'деп', 'депа', 'депов') + '.</p>'
      + '<p class="res">Итог держания: <b>' + sgn(x.gain) + '</b></p></div>';
  }
  /* --- обучение калькулятора: какие месяцы брать --- */
  var H_MONTHS = [[7, 'Июль 2026', 'с 21-го'], [8, 'Август 2026', ''], [9, 'Сентябрь 2026', ''], [10, 'Октябрь 2026', 'до 11-го']];
  function ccfg() {
    var c = FD.state.ccfg || (FD.state.ccfg = {});
    if (!c.hm || !c.hm.length) c.hm = H_MONTHS.map(function (m) { return m[0]; });
    if (!c.wm || !c.wm.length) c.wm = FD.dailyMonths().map(function (m) { return m.ym; });
    return c;
  }
  function renderCfg() {
    var c = ccfg(), H = FD.HIST, cnt = {};
    if (!H.mo) FD.similar(1, 0, 0, 0, 1);
    H.mo.forEach(function (m) { cnt[m] = (cnt[m] || 0) + 1; });
    var hcount = c.hm.reduce(function (s, m) { return s + (cnt[m] || 0); }, 0);
    var h = '<div class="cfg-col"><b>Похожие случаи баеров</b><p class="mut sm">Сколько точек решения в истории компании (только США). Сейчас выбрано: <b>' + hcount.toLocaleString('ru-RU') + '</b>.</p>'
      + H_MONTHS.map(function (m) { return '<label class="chk"><input type="checkbox" data-hm="' + m[0] + '"' + (c.hm.indexOf(m[0]) > -1 ? ' checked' : '') + '> ' + m[1] + (m[2] ? ' <span class="mut">(' + m[2] + ')</span>' : '') + ' <span class="mut">— ' + (cnt[m[0]] || 0).toLocaleString('ru-RU') + '</span></label>'; }).join('')
      + '<div class="row"><button type="button" class="btn ghost sm" data-hall>Все</button><button type="button" class="btn ghost sm" data-hlast>Только сен–окт</button></div></div>';
    var ms = FD.dailyMonths(), years = {};
    ms.forEach(function (m) { (years[m.ym.slice(0, 4)] = years[m.ym.slice(0, 4)] || []).push(m); });
    h += '<div class="cfg-col"><b>Дни недели (вся компания)</b><p class="mut sm">' + ms.length + ' месяцев в таблицах. Выбрано: <b>' + c.wm.length + '</b>. В старых месяцах были другие офферы и связки — бери осторожно.</p>'
      + Object.keys(years).sort().map(function (y) { return '<div class="yr"><span class="mut">' + y + '</span>' + years[y].map(function (m) { return '<label class="chk"><input type="checkbox" data-wm="' + m.ym + '"' + (c.wm.indexOf(m.ym) > -1 ? ' checked' : '') + '> ' + FD.monthLabel(m.ym).replace(/ \d{4}$/, '') + (m.spend < 20000 ? ' <span class="mut">(мало)</span>' : '') + '</label>'; }).join('') + '</div>'; }).join('')
      + '<div class="row"><button type="button" class="btn ghost sm" data-wall>Все</button><button type="button" class="btn ghost sm" data-w26>Только 2026</button><button type="button" class="btn ghost sm" data-w3>Последние 3</button></div></div>';
    $('#ccfgBody').innerHTML = h;
  }
  function cfgSaved() { save(); renderCfg(); calc(); }
  function initCfg() {
    renderCfg();
    $('#ccfgBody').addEventListener('change', function (e) {
      var c = ccfg(), t = e.target;
      if (t.dataset.hm) { var m = +t.dataset.hm; c.hm = t.checked ? c.hm.concat([m]) : c.hm.filter(function (x) { return x !== m; }); if (!c.hm.length) { c.hm = [m]; t.checked = true; FD.say('Хоть один месяц оставь, братан.'); } }
      if (t.dataset.wm) { var w = t.dataset.wm; c.wm = t.checked ? c.wm.concat([w]) : c.wm.filter(function (x) { return x !== w; }); if (!c.wm.length) { c.wm = [w]; t.checked = true; FD.say('Хоть один месяц оставь, братан.'); } }
      cfgSaved();
    });
    $('#ccfgBody').addEventListener('click', function (e) {
      var c = ccfg(), b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-hall')) c.hm = H_MONTHS.map(function (m) { return m[0]; });
      if (b.hasAttribute('data-hlast')) c.hm = [9, 10];
      var all = FD.dailyMonths().map(function (m) { return m.ym; });
      if (b.hasAttribute('data-wall')) c.wm = all;
      if (b.hasAttribute('data-w26')) c.wm = all.filter(function (m) { return m.indexOf('2026') === 0; });
      if (b.hasAttribute('data-w3')) c.wm = all.slice(-3);
      cfgSaved();
    });
  }
  function hPeriodLabel() { var c = ccfg(); var sel = H_MONTHS.filter(function (m) { return c.hm.indexOf(m[0]) > -1; }); return sel.length === H_MONTHS.length ? '21 июля – 11 октября 2026' : sel.map(function (m) { return m[1].replace(' 2026', '').toLowerCase(); }).join(', ') + ' 2026'; }
  function wPeriodLabel() { var c = ccfg(), all = FD.dailyMonths(); if (c.wm.length === all.length) return 'все ' + pl(all.length, 'месяц', 'месяца', 'месяцев') + ' (дек 2024 – окт 2026)'; var s = c.wm.slice().sort(); return s.length <= 3 ? s.map(FD.monthLabel).join(', ') : pl(s.length, 'месяц', 'месяца', 'месяцев') + ': ' + FD.monthLabel(s[0]) + ' – ' + FD.monthLabel(s[s.length - 1]); }

  /* --- вкладка «по дню и времени» --- */
  var CT = 'all';
  function usTime(dateS, timeS) {
    var p = String(dateS || '').split('-'), t = String(timeS || '12:00').split(':');
    if (p.length < 3) return null;
    var utc = Date.UTC(+p[0], +p[1] - 1, +p[2], (+t[0]) - 3, +t[1] || 0);
    function f(tz) { try { return new Intl.DateTimeFormat('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(utc)).replace(/^24:/, '00:'); } catch (e) { return null; } }
    var nyDay = null; try { nyDay = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', day: 'numeric' }).format(new Date(utc)); } catch (e) {}
    var ny = f('America/New_York'), la = f('America/Los_Angeles');
    if (!ny) { var h = ((+t[0] - 7) + 24) % 24; ny = ('0' + h).slice(-2) + ':' + ('0' + (+t[1] || 0)).slice(-2); }
    return { ny: ny, la: la, nyH: +ny.split(':')[0] + (+ny.split(':')[1] || 0) / 60, wd: (new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay() + 6) % 7, dom: +p[2], nyPrev: nyDay != null && nyDay !== +p[2] };
  }
  function wdBlock(wd) {
    var W = FD.wdStats(ccfg().wm), a = W[wd];
    var name = FD.WD_NAMES[wd].charAt(0).toUpperCase() + FD.WD_NAMES[wd].slice(1);
    function kind(x) { if (!x.n || x.droi == null) return { t: 'мало данных', c: '' }; var sh = x.months ? x.pos / x.months : 0.5; if (x.droi >= 5 && sh >= 0.6) return { t: '🟢 хороший', c: 'good' }; if (x.droi <= -5 && sh <= 0.4) return { t: '🔴 слабый', c: 'bad' }; return { t: '⚪ обычный', c: '' }; }
    function roiTxt(x) { if (x.droi == null) return '—'; var r = Math.round(x.droi); return r === 0 ? 'как обычно' : (r > 0 ? 'лучше на ' + r : 'хуже на ' + (-r)); }
    function depTxt(x) { if (x.ddep == null) return '—'; var r = Math.round(x.ddep); return Math.abs(r) < 3 ? 'как обычно' : (r > 0 ? 'дороже на ' + r + '%' : 'дешевле на ' + (-r) + '%'); }
    var k = kind(a), base = 50, ex = a.droi != null ? Math.round(base + a.droi) : null;
    var t = '<h4>' + name + ' — ' + k.t.replace(/^\S+ /, '') + ' день</h4>'
      + '<p>' + (a.droi == null ? 'По этому дню мало данных в выбранных месяцах.' :
        name + ' ' + ['был', 'был', 'была', 'был', 'была', 'была', 'было'][wd] + ' лучше обычного дня в <b>' + a.pos + ' месяцах из ' + a.months + '</b>. Окупаемость в этот день ' + (Math.round(a.droi) === 0 ? 'такая же, как обычно' : (a.droi > 0 ? '<b class="good">выше</b>' : '<b class="bad">ниже</b>') + ' в среднем на ' + pl(Math.abs(Math.round(a.droi)), 'пункт', 'пункта', 'пунктов')) + ', деп ' + depTxt(a) + '.')
      + (ex != null && Math.round(a.droi) !== 0 ? ' <span class="mut">Пример: если обычно у тебя ROI +' + base + '%, в ' + ['этот понедельник', 'этот вторник', 'эту среду', 'этот четверг', 'эту пятницу', 'эту субботу', 'это воскресенье'][wd] + ' в среднем выходит около ' + (ex >= 0 ? '+' : '−') + Math.abs(ex) + '%.</span>' : '') + '</p>'
      + '<p class="mut sm">Период: ' + esc(wPeriodLabel()) + ' (меняется в «Обучении калькулятора»).</p>'
      + '<table class="t"><tr><th>День</th><th>Какой день</th><th>Окупаемость против обычного дня</th><th>Цена депа</th><th>Был лучше обычного</th></tr>'
      + W.map(function (x, i) { var kk = kind(x); return '<tr' + (i === wd ? ' class="hl"' : '') + '><td>' + (i === wd ? '<b>' + FD.WD_SHORT[i] + '</b>' : FD.WD_SHORT[i]) + '</td><td class="' + kk.c + '">' + kk.t + '</td><td>' + roiTxt(x) + (x.droi != null && Math.round(x.droi) !== 0 ? ' пункт' + (Math.abs(Math.round(x.droi)) % 10 === 1 && Math.abs(Math.round(x.droi)) % 100 !== 11 ? '' : [2, 3, 4].indexOf(Math.abs(Math.round(x.droi)) % 10) > -1 && [12, 13, 14].indexOf(Math.abs(Math.round(x.droi)) % 100) < 0 ? 'а' : 'ов') : '') + '</td><td>' + depTxt(x) + '</td><td>' + x.pos + ' из ' + x.months + ' мес.</td></tr>'; }).join('') + '</table>';
    var tip = k.c === 'bad' ? 'Слабый день: не выключай креатив за один такой день — смотри его вместе со следующим.' : k.c === 'good' ? 'Хороший день — держи креативы смелее, не дёргай.' : 'Обычный день — решай по лестнице, день недели роли не играет.';
    return t + '<p class="verdict-line">' + tip + '</p><p class="mut sm">Как считается: окупаемость (ROI) каждого дня сравнивается со средней за 7 дней вокруг него — так убирается общий рост и падение рынка. «Пункт» — это разница в процентах ROI: было +50%, стало +62% — это на 12 пунктов лучше. Один день может отличаться на ±25 пунктов, это только тенденция.</p>';
  }
  function timeBlock(u) {
    var h = u.nyH, ph;
    if (h >= 0 && h < 6) ph = 'В США ночь. Тратится мало, депов ночью мало. Цифры за этот кусок дня почти не меняются — можно спать с автоправилами.';
    else if (h < 11) ph = 'В США утро: сегодняшний спенд только начался, а вчерашние депы ещё доезжают. Сегодняшний день по этим цифрам не оценивай — смотри сумму за вчера и за всё время креатива.';
    else if (h < 17) ph = 'В США день: трафик разгоняется. Решения по креативам уже можно принимать по лестнице, но день ещё далеко не закончен.';
    else ph = 'В США вечер — самое жирное время, люди дома с телефоном. Победителей не трогай, сливы режь по лестнице.';
    var done = Math.max(0, Math.min(100, Math.round(h / 24 * 100)));
    if (u.nyPrev) ph += ' Учти: у тебя уже ' + FD.WD_NAMES[u.wd] + ', а в США ещё ' + FD.WD_NAMES[(u.wd + 6) % 7] + '. Американцы живут ещё вчерашним днём.';
    return '<h4>Время: ' + u.ny + ' в Нью-Йорке' + (u.la ? ', ' + u.la + ' в Лос-Анджелесе' : '') + '</h4><p>' + ph + '</p><p class="mut sm">Если вбиваешь цифры за сегодня — по нью-йоркскому времени прошло ~' + done + '% американского дня. По часам статистики в отчётах нет, это просто часы США. Депы трекер дописывает до обеда следующего дня.</p>';
  }
  function dayHtml(S, K, Rr, D, A, v) {
    var u = usTime($('#cDate').value, $('#cTime').value);
    if (!u) return '<p class="mut">Выбери дату и время сверху.</p>';
    var h = wdBlock(u.wd) + timeBlock(u);
    var M = FD.similar(S, K, Rr, D, A, { wd: u.wd });
    if (!M || M.n < 8 || M.held < 10) M = FD.similar(S, K, Rr, D, A, { wd: u.wd, group: true });
    if (M && M.n >= 8) {
      var net = M.gainMean - M.lateClosed;
      h += '<h4>Похожие случаи — ' + esc(M.wdHow) + '</h4><div class="sim-kpi"><div><b>' + M.n + '</b><span>похожих у ' + M.buyers + ' баеров</span></div><div><b>' + Math.round(M.heldPct) + '%</b><span>держали дальше</span></div>'
        + '<div class="' + (M.winPct >= 50 ? 'good' : 'bad') + '"><b>' + Math.round(M.winPct) + '%</b><span>кто держал — заработал</span></div><div><b>' + (M.depPct == null ? '—' : Math.round(M.depPct) + '%') + '</b><span>деп за неделю, если держать</span></div></div>'
        + (M.held >= 10 ? '<p class="verdict-line">' + simLine(M) + '</p><p class="verdict-line ' + recon(v, M).cls + '">' + recon(v, M).t.replace('Итого:', 'Итого по этому дню недели:') + '</p>' : '<p class="verdict-line">Держали такие в этот день недели всего ' + M.held + ' раз — статистика слабая, смотри общую вкладку.</p>')
        + '<p class="mut sm">Чистая разница «держать − выключить»: <b class="' + (net >= 0 ? 'good' : 'bad') + '">' + sgn(net) + '</b>. День недели — по дню, когда была точка решения.</p>'
        + (M.best.length ? '<div class="cases">' + M.best.slice(0, 2).map(function (x) { return simCard(x, true); }).join('') + (M.worstEx[0] ? simCard(M.worstEx[0], false) : '') + '</div>' : '');
    } else h += '<p class="mut sm">В этот день недели похожих случаев почти нет — смотри общую вкладку.</p>';
    return h;
  }
  function calc() {
    var nn = function (id) { var v = +$(id).value; return isFinite(v) && v > 0 ? v : 0; };
    var S = nn('#cS'), K = Math.round(nn('#cK')), Rr = Math.round(nn('#cR')), D = Math.round(nn('#cD')), A = Math.max(1, Math.round(nn('#cA')) || 1);
    var v = FD.decide(S, K, Rr, D, A), e = FD.EXPLAIN[v.code] || {}; v.S = S; v.K = K;
    var cb = FD.COMBO[v.code] || FD.COMBO.keep;
    var h = '<span class="pill big ' + v.cls + '">' + v.label + '</span>'
      + '<div class="combo"><div class="combo-r"><span>Кампания</span><b class="' + cb.camp[0] + '">' + cb.camp[1] + '</b><em>' + esc(cb.camp[2]) + '</em></div><div class="combo-r"><span>Дубли</span><b class="' + cb.dub[0] + '">' + cb.dub[1] + '</b><em>' + esc(cb.dub[2]) + '</em></div></div>'
      + '<p>' + esc(FD.clean(v.why)) + '</p>' +
      '<p class="mono mut">клик ' + (v.cpc ? '$' + v.cpc.toFixed(2) : '—') + ' · рега ' + (v.reg ? '$' + v.reg.toFixed(1) : '—') + ' · ' + (v.dep ? 'деп $' + Math.round(v.dep) : 'прогноз депа ' + (v.est ? '~$' + Math.round(v.est) : '—')) + ' · выплата ~$158</p>' +
      '<div class="explain"><div><b>Что это значит</b><p>' + esc(e.what || '') + '</p></div><div><b>Что нажать</b><p>' + esc(e.press || '') + '</p></div></div><details class="ladder-help"><summary>Что за «лестница»?</summary><p>' + LADDER_TXT + '</p></details>';
    var M = FD.similar(S, K, Rr, D, A); v.sim = M;
    if (M && M.n >= 8) {
      var net = M.gainMean - M.lateClosed;
      h += '<div class="sim"><h4>Что было у пацанов с такими же цифрами</h4><p class="mut sm">' + FD.g('Нашёл', 'Нашла') + ' в истории всей компании (только США, ' + hPeriodLabel() + ') <b>' + M.n + '</b> ' + pl(M.n, 'похожий случай', 'похожих случая', 'похожих случаев').replace(/^\d+ /, '') + ' у ' + pl(M.buyers, 'баера', 'баеров', 'баеров') + '. Похожесть: ' + M.how + '.</p>'
        + '<div class="sim-kpi"><div><b>' + Math.round(M.heldPct) + '%</b><span>держали дальше (' + M.held + ')</span></div><div><b>' + Math.round(100 - M.heldPct) + '%</b><span>выключили (' + M.closed + ')</span></div>'
        + '<div class="' + (M.winPct >= 50 ? 'good' : 'bad') + '"><b>' + Math.round(M.winPct) + '%</b><span>кто держал — заработал</span></div>'
        + '<div class="' + (M.lossPct > 30 ? 'bad' : '') + '"><b>' + Math.round(M.lossPct) + '%</b><span>кто держал — слил больше $100</span></div></div>'
        + '<p class="verdict-line">' + simLine(M) + '</p>'
        + (M.held >= 10 ? '<p class="verdict-line ' + recon(v, M).cls + '">' + recon(v, M).t + '</p>' : '')
        + '<table class="t plain"><tr><td>Если <b>держишь</b> — сколько в среднем заработаешь сверху <span class="mut sm">(среднее на один креатив: кто-то сделал сотни, кто-то слил — см. ниже)</span></td><td class="n ' + (M.gainMean >= 0 ? 'good' : 'bad') + '">' + sgn(M.gainMean) + '</td></tr>'
        + '<tr><td>Если <b>выключишь</b> — сколько всё равно доедет запоздалых депов</td><td class="n">' + sgn(M.lateClosed) + '</td></tr>'
        + '<tr><td><b>Итог: держать выгоднее, чем выключить, на</b></td><td class="n ' + (net >= 0 ? 'good' : 'bad') + '"><b>' + sgn(net) + '</b></td></tr>'
        + '</table>' + splitHtml(M) + '<table class="t plain">'
        + '<tr><td>Окупаемость денег, которые потратишь дальше' + (M.roiAfter != null ? ' <span class="mut sm">(вложишь $100 — вернёшь ~$' + Math.max(0, Math.round(100 + M.roiAfter)) + ')</span>' : '') + '</td><td class="n ' + (M.roiAfter >= 0 ? 'good' : 'bad') + '">' + (M.roiAfter == null ? '—' : pct(M.roiAfter)) + '</td></tr>'
        + '<tr><td>Сколько обычно ещё потратишь, если держать</td><td class="n">$' + Math.round(M.spentAfterMed) + '</td></tr>'
        + (M.nextDepPct != null ? '<tr><td>Шанс, что завтра будет деп</td><td class="n">' + Math.round(M.nextDepPct) + '%</td></tr>' : '')
        + '<tr><td>Если не повезёт (слил больше $100): в среднем / самый плохой случай</td><td class="n bad">' + (M.lossMean ? sgn(M.lossMean) : '—') + ' / ' + sgn(M.worst) + '</td></tr></table>'
        + '<p class="mut sm"><b>Почему считаем неделю, если креатив живёт 1–3 дня?</b> Деньги он и правда тратит быстро' + (M.share2 != null ? ' — у пацанов ' + Math.round(M.share2) + '% всего, что ушло после этой точки, ушло в первые 2 дня' : '') + '. Но депы доезжают позже, плюс сюда входят дубли этого креатива. Неделя — чтобы ничего не потерять, а не потому что он столько крутится.</p>';
      if (M.best.length) h += '<h4>Не зассали и держали — что вышло</h4><div class="cases">' + M.best.map(function (x) { return simCard(x, true); }).join('') + '</div>';
      if (M.worstEx.length) h += '<h4>Держали и слили</h4><div class="cases">' + M.worstEx.map(function (x) { return simCard(x, false); }).join('') + '</div>';
      h += '<p class="mut sm">«Держали» = потратили ещё $5+ за следующие 2 дня. «Итог держания» = сколько заработали сверху (выплаты минус спенд) после этой точки, включая дубли этого креатива и депы, которые доехали позже. Креатив = все копии вместе. Депы по трекеру; ~6% депов в трекере без креатива («automatic fix») сюда не попали, поэтому реальность чуть лучше. Это история, а не гарантия: решает лестница, а цифры пацанов показывают риск.</p></div>';
    } else if (M) {
      h += '<div class="sim"><p class="mut sm">Похожих случаев в истории компании почти нет (' + M.n + '). Решай по лестнице.</p></div>';
    }
    var dh = dayHtml(S, K, Rr, D, A, v);
    var head = h.slice(0, h.indexOf('<div class="sim">') > -1 ? h.indexOf('<div class="sim">') : h.length), gen = h.slice(head.length);
    $('#cOut').innerHTML = head + '<div class="chips ctabs" role="tablist"><button type="button" data-ct="all" aria-pressed="' + (CT === 'all') + '">Общая статистика</button><button type="button" data-ct="day" aria-pressed="' + (CT === 'day') + '">По дню недели и времени</button></div>'
      + '<div class="ct-pane" data-pane="all"' + (CT === 'all' ? '' : ' hidden') + '>' + (gen || '<p class="mut sm">Похожих случаев нет.</p>') + '</div><div class="ct-pane" data-pane="day"' + (CT === 'day' ? '' : ' hidden') + '>' + dh + '</div>';
    v.dayU = usTime($('#cDate').value, $('#cTime').value);
    return v;
  }
  var LADDER_TXT = 'Лестница — это правило, когда выключать креатив без депа, по сумме спенда всех его копий: до $30 не трогаешь (только 0 кликов к $25 — выкл); $30–80 — выкл, если клик дороже $8 или нет ни одной реги к $60; $80–160 — держишь, если реги по $25 и дешевле и их 3+; $160 без депа — выкл.';
  function ladderNext(v) {
    var S = v.S || 0;
    if (v.dep) return { to: null, rule: 'смотришь цену депа: до $110 — дубли в другие РК, выше $150 два дня подряд — режь бюджет вдвое' };
    if (S < 25 && !v.K) return { to: 25, rule: 'если к $25 так и не будет ни одного клика — выключай' };
    if (S < 30) return { to: 30, rule: 'на $30 смотришь цену клика: дороже $8 — выкл' };
    if (S < 80) return { to: 80, rule: 'к $60 нет ни одной реги — выкл; на $80 смотришь реги: нужно 3+ по $25 и дешевле' };
    if (S < 160) return { to: 160, rule: 'на $160 без депа — выкл без разговоров' };
    return { to: Math.round(S), rule: 'уже сейчас по лестнице' };
  }
  function recon(v, M) {
    var net = M.gainMean - M.lateClosed, goOn = ['dub', 'hold', 'keep'].indexOf(v.code) > -1, stop = ['kill', 'cut'].indexOf(v.code) > -1, ns = ladderNext(v);
    if (goOn && v.code === 'keep' && net <= -20) return { cls: 'bad', t: '📉 Итого: лучше не рискуй — можно выключать. Правило ещё разрешает подержать до $' + ns.to + ', но у пацанов в таких же случаях держание в среднем давало ' + sgn(net) + ' за неделю, в плюс вышли только ' + Math.round(M.winPct) + '%. Выключить сейчас — не ошибка.' };
    if (goOn && net < 0) return { cls: 'warn', t: '⚖️ Итого: почти ноль — риск небольшой. ' + (ns.to ? 'Держи до $' + ns.to + ' и там реши: ' : 'Держи и следи: ') + ns.rule + '. Если нервничаешь — выключить сейчас тоже не ошибка, держание у пацанов в среднем ' + sgn(net) + '.' };
    if (stop && net > 0) return { cls: 'warn', t: '🎲 Итого: правило говорит «' + v.label + '». У пацанов держание иногда окупалось (' + sgn(net) + ' в среднем), но заработали только ' + Math.round(M.winPct) + '% державших — это лотерея. Безопасно — ' + (v.code === 'cut' ? 'резать вдвое' : 'выключать') + ', как говорит правило. Хочешь рискнуть — максимум ещё +$50, ' + (v.code === 'cut' ? 'деп не подешевел — выкл.' : 'нет депа — выкл.') + '' };
    if (goOn) return { cls: 'good', t: '✅ Итого: держи. И правило, и статистика пацанов за то, чтобы держать (в среднем ' + sgn(net) + '). ' + (ns.to ? 'Следующая проверка — на $' + ns.to + ': ' : 'Дальше ') + ns.rule + '.' };
    if (stop) return { cls: 'good', t: '✅ Итого: ' + (v.code === 'cut' ? 'режь бюджет вдвое' : 'выключай, не жалей') + '. И правило, и статистика пацанов за это.' };
    return { cls: '', t: 'Итого: решай по лестнице.' };
  }
  function splitHtml(M) {
    var p = M.split; if (!p || !p.n) return '';
    var w = function (k) { return Math.max(4, Math.round(p[k] / p.n * 100)); };
    var of10 = function (k) { return Math.round(p[k] / p.n * 10); };
    return '<div class="split"><b>Как складывается это среднее</b> <span class="mut sm">(из ' + pl(p.n, 'креатива', 'креативов', 'креативов') + ', которые пацаны держали)</span>'
      + '<div class="split-bar"><i class="g" style="width:' + w('pos') + '%"></i><i class="y" style="width:' + w('neg') + '%"></i><i class="r" style="width:' + w('big') + '%"></i></div>'
      + '<ul><li><span class="dot g"></span><b>' + p.pos + '</b> (≈' + of10('pos') + ' из 10) выстрелили — в среднем <b class="good">' + sgn(p.posAvg) + '</b></li>'
      + '<li><span class="dot y"></span><b>' + p.neg + '</b> (≈' + of10('neg') + ' из 10) не выстрелили, но и слили немного — в среднем <b>' + sgn(p.negAvg) + '</b></li>'
      + '<li><span class="dot r"></span><b>' + p.big + '</b> (≈' + of10('big') + ' из 10) слили много — в среднем <b class="bad">' + sgn(p.bigAvg) + '</b></li></ul>'
      + '<p class="mut sm">Сложи всё и подели на всех — выйдет ' + sgn(M.gainRaw) + ' на креатив' + (Math.round(M.gainRaw) !== Math.round(M.gainMean) ? ' (в таблице ' + sgn(M.gainMean) + ' — там убраны самые крайние случаи, чтобы один бешеный креатив не тянул всё)' : '') + '. Поэтому это не «заработаешь ровно столько», а «в среднем на каждый такой креатив держать выгоднее». Один конкретный креатив либо выстрелит на сотни, либо уйдёт в небольшой минус, либо редко сольёт много. Чтобы «редко сливает много» не случилось с тобой — держи строго по лестнице.</p></div>';
  }
  function simLine(M) {
    var net = M.gainMean - M.lateClosed, t;
    if (M.held < 10) return '⚠️ Держали такие всего ' + M.held + ' раз — статистика слабая. Решай по лестнице.';
    if (net >= 0 && M.winPct >= 50) t = '✅ Держать выгодно: больше половины, кто держал, заработали, в среднем ' + sgn(net) + ' на креатив.';
    else if (net >= 0) t = '🎲 Чаще не выстреливает (' + Math.round(100 - M.winPct) + '% без прибыли), но когда выстреливает — много. В среднем держать выгоднее на ' + sgn(net) + '. Это как лотерея, где в сумме ты в плюсе: держишь по правилу, а не по ощущениям.';
    else t = '⛔ В среднем держать хуже, чем выключить, на ' + sgn(-net).replace('+', '') + '. Не геройствуй.';
    return t + ' Слить больше $100 рискуешь в ' + Math.round(M.lossPct) + '% случаев.';
  }
  function daySay(v) {
    var u = v.dayU; if (!u) return simSay(v);
    var a0 = FD.wdStats(ccfg().wm)[u.wd], e = FD.EXPLAIN[v.code] || {}, sh = a0.months ? a0.pos / a0.months : 0.5;
    var t = v.label + '. ' + v.why + ' Что делать: ' + (e.press || '') + ' Сегодня ' + FD.WD_NAMES[u.wd] + '. ';
    t += a0.n < 4 ? 'По этому дню мало данных в выбранных месяцах. ' : (a0.droi <= -5 && sh <= 0.3) ? 'Этот день у компании обычно хуже, деп дороже. Не выключай за один плохой день. ' : (a0.droi >= 5 && sh >= 0.6) ? 'Этот день обычно лучше среднего, держи смелее. ' : 'День обычный, решай по лестнице. ';
    t += 'В Нью-Йорке сейчас ' + u.ny + '. ' + (u.nyH < 6 ? 'Там ночь.' : u.nyH < 11 ? 'Там утро, сегодняшний день не оценивай.' : u.nyH < 17 ? 'Там день, трафик разгоняется.' : 'Там вечер, самое жирное время.');
    return t;
  }
  function simSay(v) {
    var M = v.sim, e = FD.EXPLAIN[v.code] || {};
    var t = v.label + '. ' + v.why + ' ' + (e.what || '') + ' Что делать: ' + (e.press || '');
    if (M && M.n >= 8) {
      var net = M.gainMean - M.lateClosed;
      var P = function (x) { return FD.pl(Math.round(x), 'процент', 'процента', 'процентов'); };
      t += ' Теперь история. У пацанов было ' + FD.pl(M.n, 'такой случай', 'таких случая', 'таких случаев') + '. Держали дальше ' + P(M.heldPct) + '. Из тех, кто держал, заработали ' + P(M.winPct) + ', слили больше сотни ' + P(M.lossPct) + '. ';
      var stopV = ['kill', 'cut'].indexOf(v.code) > -1;
      t += M.held < 10 ? 'Но держали такие всего ' + M.held + ' раз, статистика слабая.' : net >= 0 ? 'В среднем держать выгоднее, чем выключить, на ' + FD.pl(Math.round(net), 'бакс', 'бакса', 'баксов') + '.' + (stopV ? '' : ' Не ссы.') : 'В среднем держать хуже, чем выключить, на ' + FD.pl(Math.round(-net), 'бакс', 'бакса', 'баксов') + '. Тут не геройствуй.';
      if (M.best[0]) t += ' Например, ' + M.best[0].buyer + ' держал такой же и сделал плюс ' + Math.round(M.best[0].gain) + '.';
      if (M.held >= 10) t += ' ' + recon(v, M).t;
    }
    return t;
  }

  /* ---------- мои офферы ---------- */
  function myOffers() { if (!FD.state.my) FD.state.my = FD.MY_DEFAULT.map(function (x) { return x.slice(); }); return FD.state.my; }
  function renderOffers() {
    var list = myOffers().map(function (o, i) { var r = FD.rateOffer(o[1], o[2]); r.o = o; r.i = i; return r; })
      .sort(function (a, b) { return a.rank - b.rank || (b.casRoi || 0) - (a.casRoi || 0); });
    var groups = [[1, 'Лить первым делом'], [2, 'Тестить 1–2 креатива'], [3, 'Можно, но аккуратно'], [4, 'Нахуй не трогать']];
    var h = '';
    groups.forEach(function (g) {
      var it = list.filter(function (r) { return r.rank === g[0]; }); if (!it.length) return;
      h += '<h4>' + FD.clean(g[1]) + ' · ' + it.length + '</h4><div class="tbl"><table class="t"><tbody>' + it.map(function (r) {
        return '<tr><td class="mono">' + esc(r.o[0]) + '</td><td><b>' + esc(r.st || '—') + '</b> ' + esc(r.o[2]) + (r.code ? ' <span class="mut sm">(' + r.code + ')</span>' : '') + '</td><td><span class="pill ' + r.cls + '">' + r.label + '</span><div class="sm">' + esc(FD.clean(r.why)) + '</div></td><td><button class="x" data-del="' + r.i + '" title="Удалить" type="button">✕</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    });
    var have = {}; myOffers().forEach(function (o) { have[String(o[1]).toUpperCase()] = 1; });
    var miss = Object.keys(FD.STATES).filter(function (k) { return FD.STATES[k].tier === 'go' && !have[k]; });
    var missCas = FD.CASINOS.filter(function (c) { return c[4] === 'go' && c[2] >= 80 && !myOffers().some(function (o) { return FD.casCode(o[2], String(o[1]).toUpperCase()) === c[0]; }); });
    if (miss.length || missCas.length) h += '<div class="remember"><b>Чего у тебя нет, а у команды сейчас плюсует:</b> ' + (miss.length ? 'штаты ' + miss.join(', ') + '. ' : '') + (missCas.length ? 'Казино ' + missCas.map(function (c) { return c[0] + ' (' + c[1] + ', +' + c[2] + '%)'; }).join(', ') + '. ' : '') + 'Попроси у Феди офферы под них.</div>';
    $('#offerList').innerHTML = h;
    return list;
  }
  function offersSay() {
    var list = renderOffers(), first = list.filter(function (r) { return r.rank === 1; }), no = list.filter(function (r) { return r.rank === 4; });
    var t = first.length ? 'Первым делом лей сюда: ' + first.map(function (r) { return r.st + ' ' + r.o[2]; }).join(', ') + '. ' : 'Из твоих офферов ни один штат сейчас не в топе. ';
    if (no.length) { var sts = {}; no.forEach(function (r) { sts[r.st || 'без штата'] = 1; }); t += 'А ' + no.length + ' офферов нахуй не трогай: ' + Object.keys(sts).join(', ') + '. Список на экране.'; }
    return t;
  }
  function initOffers() {
    renderOffers();
    $('#offerList').addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (!b) return; myOffers().splice(+b.dataset.del, 1); save(); renderOffers(); });
    $('#oAdd').onclick = function () {
      var id = $('#oId').value.trim(), st = $('#oSt').value.trim().toUpperCase(), cas = $('#oCas').value.trim();
      if (!st && !cas) { FD.say('Впиши хотя бы штат и казино, братан.', { mood: 'angry' }); return; }
      myOffers().unshift([id, st, cas]); save(); renderOffers();
      var r = FD.rateOffer(st, cas); FD.say(st + ' ' + cas + ': ' + r.label + '. ' + r.why, { mood: r.rank === 1 ? 'happy' : r.rank === 4 ? 'angry' : null });
      $('#oId').value = $('#oSt').value = $('#oCas').value = '';
    };
    $('#oSay').onclick = function () { FD.say(offersSay()); };
    $('#oReset').onclick = function () { FD.state.my = null; myOffers(); save(); renderOffers(); };
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
    $('#pathList').addEventListener('click', function (e) { var n = e.target.closest('.node'); if (!n) return; openLesson(+n.dataset.mod); });
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
    $('#replayBtn').onclick = function () { var t = FD.lastSaid || $('#bubbleText').textContent; if (t) FD.say(t); };
    $('#stopBtn').onclick = function () { FD.shut(true); };
    $('#hdrStop').onclick = function () { FD.shut(true); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('speaking')) FD.shut(true); });
    initOffers();
    initQuick();
    initCfg();
    $('#planBtn').onclick = function () { buildPlan(true); };
    var drop = $('#drop'), inp = $('#fileIn');
    inp.onchange = function () { handleFiles(inp.files); inp.value = ''; };
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
    $('#usmap').addEventListener('click', function (e) { var t = e.target.closest('.tile'); if (t) stateInfo(t.dataset.st); });
    (function () {
      var now = new Date(), sel = $('#cTime'), opts = '';
      for (var m = 0; m < 1440; m += 30) opts += '<option>' + ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2) + '</option>';
      sel.innerHTML = opts;
      var mm = Math.floor((now.getHours() * 60 + now.getMinutes()) / 30) * 30; sel.value = ('0' + Math.floor(mm / 60)).slice(-2) + ':' + ('0' + (mm % 60)).slice(-2);
      $('#cDate').value = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    })();
    ['cS', 'cK', 'cR', 'cD', 'cA', 'cDate', 'cTime'].forEach(function (id) { $('#' + id).addEventListener('input', calc); $('#' + id).addEventListener('change', calc); });
    $('#cOut').addEventListener('click', function (e) { var b = e.target.closest('[data-ct]'); if (!b) return; CT = b.dataset.ct; $$('#cOut [data-ct]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); $$('#cOut .ct-pane').forEach(function (p) { p.hidden = p.dataset.pane !== CT; }); });
    $('#cSay').onclick = function () { var v = calc(); FD.say(CT === 'day' ? daySay(v) : simSay(v), { mood: v.cls === 'kill' ? 'angry' : v.cls === 'acc' ? 'happy' : null }); };
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
