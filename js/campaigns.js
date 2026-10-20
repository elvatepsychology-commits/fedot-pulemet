/* Кампании: таблицы Дениса и Гриши + общий вид ВСЕ. Формат Notion. Все поля обязательные.
   Хранится в браузере; между людьми — экспорт/импорт файла (слияние по id). */
(function () {
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var KEY = 'fedot.camp.v1', OWNERS = ['Денис', 'Гриша'], ALL = 'ALL';
  var STATUSES = [['todo', 'Не начато'], ['wip', 'В работе'], ['done', 'Готово']];
  var FIELDS = [
    { k: 'name', l: 'Кампания', i: 'Aa', t: 'text', ph: '3908 | USA | 19.09 | Skak | 3-5-1 | US0039-176-1 | 197464…' },
    { k: 'adset', l: 'Адсет', i: '≡', t: 'text', ph: 'US00039.5' },
    { k: 'ban', l: 'БАН', i: '✦', t: 'status' },
    { k: 'headline', l: 'Заголовок', i: '≡', t: 'text', ph: 'Seminole Casino Coconut Creek' },
    { k: 'creative', l: 'Креатив', i: '≡', t: 'text', ph: 'EN-MGM-176-176-STORY-155-FL-na-na-001' },
    { k: 'offer', l: 'Ссылка на офер', i: '🔗', t: 'text', ph: 'elvatelick.site' },
    { k: 'state', l: 'Штат', i: '≡', t: 'state', ph: 'Florida' },
    { k: 'photo', l: 'Фото / Крео', i: '📎', t: 'photo' },
    { k: 'body', l: 'Основной текст', i: '📋', t: 'area', ph: 'Текст объявления целиком' }
  ];
  var OWNER_F = { k: 'owner', l: 'Таблица', i: '👤', t: 'owner' };
  var S = { items: [], me: '', tbl: null, view: 'table', q: '', cur: null, draft: null, isNew: false, mode: 'file', showErr: false };

  function load() { try { var r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r) { S.items = r.items || []; S.me = r.me || ''; S.tbl = r.tbl || null; } } catch (e) {} }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ items: S.items, me: S.me, tbl: S.tbl })); return true; }
    catch (e) { alert('Память браузера кончилась. Вставляй фото ссылкой или сделай экспорт и удали старое.'); return false; }
  }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function stObj(id) { return STATUSES.filter(function (s) { return s[0] === id; })[0] || STATUSES[0]; }
  function photoOk(v) { return /^(data:image\/|https?:\/\/)/i.test(String(v || '').trim()); }
  function fieldsFor() { return S.tbl === ALL ? FIELDS.concat([OWNER_F]) : FIELDS; }
  function empty(f, v) { if (f.t === 'photo') return !photoOk(v); return !String(v == null ? '' : v).trim(); }
  function missing(d) { return fieldsFor().filter(function (f) { return empty(f, d[f.k]); }); }
  function fmt(ts) { var d = new Date(ts); return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
  function href(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : 'https://' + u; }
  function mine() { return S.items.filter(function (c) { return S.tbl === ALL || c.owner === S.tbl; }); }
  function filtered() {
    var q = S.q.trim().toLowerCase();
    return mine().filter(function (c) { return !q || [c.name, c.adset, c.headline, c.creative, c.offer, c.state, c.body, c.owner].join(' ').toLowerCase().indexOf(q) > -1; })
      .sort(function (a, b) { return b.created - a.created; });
  }
  function title() { return S.tbl === ALL ? 'FB Кампании · ВСЕ' : 'FB Кампании ' + S.tbl; }

  /* ---------- страница ---------- */
  function render() {
    var host = $('#campBox'); if (!host) return;
    if (!S.tbl) {
      host.innerHTML = '<h2 class="nt-title">🎯 FB Кампании</h2><p style="color:var(--n-mut);margin:0 0 6px">Выбери, чью таблицу открыть.</p><div class="nt-pick">' +
        OWNERS.map(function (o) { return '<button type="button" class="nt-pc" data-tbl="' + o + '"><span class="big">🎯</span><b>' + o + '</b><span>' + S.items.filter(function (c) { return c.owner === o; }).length + ' кампаний</span></button>'; }).join('') +
        '<button type="button" class="nt-pc" data-tbl="' + ALL + '"><span class="big">🗂</span><b>ВСЕ</b><span>' + S.items.length + ' кампаний, обе таблицы вместе</span></button></div>';
      return;
    }
    var list = filtered(), all = S.tbl === ALL;
    var h = '<div class="nt-crumb"><button type="button" data-tbl="">← Сменить таблицу</button><span>/</span><span>🎯 ' + esc(title()) + '</span></div>' +
      '<h2 class="nt-title">🎯 ' + esc(title()) + '</h2>' +
      '<div class="nt-bar"><button class="nt-v" type="button" data-v="table" aria-pressed="' + (S.view === 'table') + '">▦ Все кампании</button><button class="nt-v" type="button" data-v="board" aria-pressed="' + (S.view === 'board') + '">▥ По статусу</button><span class="nt-sp"></span>' +
      '<input class="nt-in" id="campQ" type="search" placeholder="Поиск…" value="' + esc(S.q) + '"><button class="nt-b" id="campExp" type="button">⬇ Экспорт</button><label class="nt-b" style="cursor:pointer">⬆ Импорт<input id="campImp" type="file" accept=".json,application/json" hidden></label><button class="nt-new" id="campNew" type="button">New</button></div>';
    if (!mine().length) h += '<div class="nt-empty">Пусто. Жми «New» и заполни все поля.</div>';
    else if (!list.length) h += '<div class="nt-empty">Ничего не нашлось.</div>';
    else if (S.view === 'table') {
      h += '<div class="nt-tw"><table class="nt-t"><thead><tr><th>Aa Кампания</th><th>≡ Адсет</th><th>✦ БАН</th><th>≡ Заголовок</th><th>≡ Креатив</th><th>🔗 Ссылка на офер</th><th>≡ Штат</th><th>📎 Фото</th>' + (all ? '<th>👤 Таблица</th>' : '') + '</tr></thead><tbody>' +
        list.map(function (c) {
          var s = stObj(c.ban);
          return '<tr data-id="' + c.id + '" tabindex="0"><td class="nm"><span class="doc">📄</span>' + esc(c.name) + (c.comments && c.comments.length ? ' <span style="color:var(--n-mut);font-weight:400">💬 ' + c.comments.length + '</span>' : '') + '</td><td>' + esc(c.adset) + '</td><td><span class="st ' + s[0] + '">' + s[1] + '</span></td><td>' + esc(c.headline) + '</td><td>' + esc(c.creative) + '</td><td>' + esc(c.offer) + '</td><td>' + esc(c.state) + '</td><td>' + (c.photo ? '<img class="thumb" src="' + esc(c.photo) + '" alt="">' : '') + '</td>' + (all ? '<td><span class="who">' + esc(c.owner) + '</span></td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div><div class="nt-cnt">' + list.length + ' из ' + mine().length + '. Ткни в строку: откроется карточка, листай стрелками ← →.</div>';
    } else {
      h += '<div class="nt-board">' + STATUSES.map(function (s) {
        var col = list.filter(function (c) { return (c.ban || 'todo') === s[0]; });
        return '<div class="nt-col"><h4><span class="st ' + s[0] + '">' + s[1] + '</span><span style="color:var(--n-mut)">' + col.length + '</span></h4>' + col.map(function (c) {
          return '<div class="nt-kc" data-id="' + c.id + '" tabindex="0">' + (c.photo ? '<img src="' + esc(c.photo) + '" alt="">' : '') + '<b>' + esc(c.name) + '</b><small>' + esc(c.state) + ' · ' + esc(c.adset) + (all ? ' · ' + esc(c.owner) : '') + '</small></div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
    host.innerHTML = h;
  }

  /* ---------- боковая карточка ---------- */
  function openPeek(id) {
    var c = S.items.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    S.cur = id; S.isNew = false; S.draft = JSON.parse(JSON.stringify(c)); S.showErr = false; S.mode = /^https?:/i.test(c.photo || '') ? 'url' : 'file'; drawPeek();
  }
  function newPeek() {
    S.cur = null; S.isNew = true; S.showErr = false; S.mode = 'file';
    S.draft = { id: uid(), owner: S.tbl === ALL ? '' : S.tbl, name: '', adset: '', ban: 'todo', headline: '', creative: '', offer: '', state: '', photo: '', body: '', comments: [], created: Date.now(), updated: Date.now() };
    drawPeek();
  }
  function drawPeek() {
    var p = $('#campPeek'), d = S.draft, ids = filtered().map(function (x) { return x.id; }), i = ids.indexOf(S.cur);
    var h = '<div class="peek-top"><button class="nt-b" id="pkClose" type="button">✕ Закрыть</button>' +
      (S.isNew ? '' : '<button class="nt-b" id="pkPrev" type="button"' + (i <= 0 ? ' disabled' : '') + '>← Назад</button><button class="nt-b" id="pkNext" type="button"' + (i < 0 || i >= ids.length - 1 ? ' disabled' : '') + '>Дальше →</button><span class="cnt">' + (i + 1) + ' / ' + ids.length + '</span>') + '</div>';
    h += '<h3 class="pk-title">' + (S.isNew ? 'Новая кампания' : esc(d.name || 'Без названия')) + '</h3><div class="pk-props">';
    fieldsFor().forEach(function (f) {
      var bad = S.showErr && empty(f, d[f.k]), v = d[f.k], inp = '';
      if (f.t === 'text') inp = '<input data-k="' + f.k + '" value="' + esc(v) + '" placeholder="' + esc(f.ph) + '">' + (f.k === 'offer' && v ? '<a class="pk-lnk" href="' + esc(href(v)) + '" target="_blank" rel="noopener">открыть ↗</a>' : '');
      else if (f.t === 'state') inp = '<input data-k="state" list="usStates" value="' + esc(v) + '" placeholder="' + esc(f.ph) + '" autocomplete="off">';
      else if (f.t === 'area') inp = '<textarea data-k="body" rows="12" placeholder="' + esc(f.ph) + '">' + esc(v) + '</textarea>';
      else if (f.t === 'status') inp = '<select data-k="ban">' + STATUSES.map(function (s) { return '<option value="' + s[0] + '"' + (v === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select>';
      else if (f.t === 'owner') inp = '<select data-k="owner"><option value="">Выбери таблицу</option>' + OWNERS.map(function (o) { return '<option' + (v === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
      else if (f.t === 'photo') {
        var isUrl = /^https?:/i.test(v || '');
        inp = '<div class="seg"><button type="button" data-mode="file" aria-pressed="' + (S.mode === 'file') + '">Загрузить фото</button><button type="button" data-mode="url" aria-pressed="' + (S.mode === 'url') + '">Вставить ссылку</button></div>' +
          (S.mode === 'file' ? '<label class="pk-file">' + (v && !isUrl ? 'Заменить файл' : 'Выбрать файл') + '<input id="pkFile" type="file" accept="image/*" hidden></label>'
            : '<input data-k="photo" id="pkUrl" value="' + esc(isUrl ? v : '') + '" placeholder="https://…/картинка.jpg" inputmode="url">') +
          (photoOk(v) ? '<img class="pk-img" src="' + esc(v) + '" alt="">' : '');
      }
      h += '<div class="prop' + (bad ? ' err' : '') + (f.t === 'area' ? ' wide' : '') + '"><span class="pl"><span>' + f.i + '</span>' + f.l + ' <i>*</i></span><div class="pv">' + inp + (bad ? '<small class="errt">Обязательное поле' + (f.t === 'photo' ? ' (файл или ссылка http…)' : '') + '</small>' : '') + '</div></div>';
    });
    h += '</div><div class="pk-act"><button class="nt-new" id="pkSave" type="button">' + (S.isNew ? 'Добавить' : 'Сохранить') + '</button>' + (S.isNew ? '' : '<button class="del" id="pkDel" type="button">Удалить</button>') + '</div>';
    if (!S.isNew) {
      h += '<div class="pk-com"><h4>Comments</h4>' + (d.comments || []).map(function (m) { return '<div class="cm"><b>' + esc(m.by) + '</b> <span>' + fmt(m.at) + '</span><p>' + esc(m.t) + '</p></div>'; }).join('') +
        '<div class="cm-add"><input id="cmT" placeholder="Добавить комментарий…"><button class="nt-new" id="cmGo" type="button">Отправить</button></div></div><div class="pk-meta">Изменено ' + fmt(d.updated) + (d.by ? ' · ' + esc(d.by) : '') + '</div>';
    }
    p.innerHTML = h; p.hidden = false; $('#campShade').hidden = false; document.body.classList.add('peek-open'); p.scrollTop = 0;
  }
  function closePeek() { $('#campPeek').hidden = true; $('#campShade').hidden = true; document.body.classList.remove('peek-open'); S.cur = null; S.draft = null; }
  function who() {
    if (S.tbl && S.tbl !== ALL) return S.tbl;
    if (!S.me) { var n = prompt('Как тебя подписывать? (Денис или Гриша)'); if (!n) return null; S.me = n.trim().slice(0, 30); save(); }
    return S.me;
  }
  function step(dir) { var ids = filtered().map(function (x) { return x.id; }), n = ids[ids.indexOf(S.cur) + dir]; if (n) openPeek(n); }
  function commit() {
    var d = S.draft;
    if (missing(d).length) { S.showErr = true; var sc = $('#campPeek').scrollTop; drawPeek(); var e = $('#campPeek .err'); if (e) e.scrollIntoView({ block: 'center' }); else $('#campPeek').scrollTop = sc; return; }
    d.updated = Date.now(); d.by = who() || d.owner;
    if (S.isNew) { d.comments = []; S.items.push(d); } else { S.items = S.items.map(function (x) { return x.id === d.id ? d : x; }); }
    if (!save()) { if (S.isNew) S.items.pop(); return; }
    render(); openPeek(d.id);
  }
  function resize(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var im = new Image();
      im.onload = function () {
        var m = 720, k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.72));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- экспорт / импорт ---------- */
  function doExport() {
    var items = mine(), blob = new Blob([JSON.stringify({ app: 'fedot-camp', v: 2, items: items }, null, 1)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'kampanii-' + (S.tbl === ALL ? 'vse' : S.tbl) + '-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function doImport(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var j = JSON.parse(r.result); if (!j || j.app !== 'fedot-camp' || !Array.isArray(j.items)) throw 0;
        var add = 0, upd = 0, skip = 0, map = {}; S.items.forEach(function (x) { map[x.id] = x; });
        j.items.forEach(function (x) {
          if (!x.owner && S.tbl !== ALL) x.owner = S.tbl;
          if (OWNERS.indexOf(x.owner) < 0 || FIELDS.some(function (f) { return empty(f, x[f.k]); })) { skip++; return; }
          var o = map[x.id];
          if (!o) { S.items.push(x); add++; } else if ((x.updated || 0) > (o.updated || 0)) { S.items[S.items.indexOf(o)] = x; upd++; }
        });
        if (save()) { render(); alert('Готово. Добавлено: ' + add + ', обновлено: ' + upd + (skip ? ', пропущено незаполненных: ' + skip : '') + '.'); }
      } catch (e) { alert('Это не файл из раздела «Кампании».'); }
    };
    r.readAsText(file);
  }

  var US = ['Alabama','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];

  function init() {
    load();
    var v = $('#v-camp'); if (!v) return;
    var dl = document.createElement('datalist'); dl.id = 'usStates'; dl.innerHTML = US.map(function (s) { return '<option value="' + s + '">'; }).join(''); document.body.appendChild(dl);
    S.items.forEach(function (c) { if (!c.owner && S.tbl && S.tbl !== ALL) c.owner = S.tbl; });
    v.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tbl]'); if (t) { S.tbl = t.dataset.tbl || null; S.q = ''; S.items.forEach(function (c) { if (!c.owner && S.tbl && S.tbl !== ALL) c.owner = S.tbl; }); save(); render(); return; }
      var b = e.target.closest('[data-v]'); if (b) { S.view = b.dataset.v; render(); return; }
      if (e.target.closest('#campNew')) { newPeek(); return; }
      if (e.target.closest('#campExp')) { doExport(); return; }
      var r = e.target.closest('[data-id]'); if (r) openPeek(r.dataset.id);
    });
    v.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var r = e.target.closest && e.target.closest('[data-id]'); if (r) openPeek(r.dataset.id); } });
    v.addEventListener('input', function (e) { if (e.target.id === 'campQ') { S.q = e.target.value; var pos = e.target.selectionStart; render(); var q = $('#campQ'); q.focus(); q.setSelectionRange(pos, pos); } });
    v.addEventListener('change', function (e) { if (e.target.id === 'campImp') { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; } });
    var p = $('#campPeek');
    p.addEventListener('input', function (e) { var k = e.target.dataset && e.target.dataset.k; if (k) S.draft[k] = e.target.value; });
    p.addEventListener('change', function (e) {
      var k = e.target.dataset && e.target.dataset.k;
      if (k === 'photo') { drawPeek(); return; }
      if (k && e.target.tagName === 'SELECT') S.draft[k] = e.target.value;
      if (e.target.id === 'pkFile' && e.target.files[0]) resize(e.target.files[0], function (u) { S.draft.photo = u; drawPeek(); });
    });
    p.addEventListener('click', function (e) {
      var m = e.target.closest('[data-mode]'); if (m) { S.mode = m.dataset.mode; if (S.mode === 'url' && !/^https?:/i.test(S.draft.photo || '')) S.draft.photo = ''; drawPeek(); return; }
      var id = e.target.id;
      if (id === 'pkClose') closePeek();
      else if (id === 'pkPrev') step(-1); else if (id === 'pkNext') step(1);
      else if (id === 'pkSave') commit();
      else if (id === 'pkDel') { if (confirm('Удалить кампанию навсегда?')) { S.items = S.items.filter(function (x) { return x.id !== S.draft.id; }); save(); closePeek(); render(); } }
      else if (id === 'cmGo') {
        var t = $('#cmT').value.trim(); if (!t) return; var me = who(); if (!me) return;
        var cur = S.items.filter(function (x) { return x.id === S.cur; })[0]; cur.comments = (cur.comments || []).concat([{ by: me, at: Date.now(), t: t }]); cur.updated = Date.now();
        save(); S.draft.comments = cur.comments; S.draft.updated = cur.updated; drawPeek(); render();
      }
    });
    $('#campShade').onclick = closePeek;
    document.addEventListener('keydown', function (e) {
      if ($('#campPeek').hidden) return;
      if (e.key === 'Escape') { closePeek(); return; }
      var t = e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1);
    });
  }
  window.FD = window.FD || {}; FD.camp = { render: render };
  document.addEventListener('DOMContentLoaded', init);
})();
