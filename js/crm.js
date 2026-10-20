/* CRM крео: учёт креативов команды (общая таблица в Supabase + генератор/разбор нейминга).
   Нейминг: язык-команда-залив-связка-ФОРМАТ-скрипт-штат-слот-бренд-номер, напр. EN-MGM-209-176-STORY-920-ID-OFF-CDC-001.
   Если база не настроена (нет ключей Supabase) — работаем на localStorage, подсказываем об этом. */
window.FD = window.FD || {};
FD.CRM = {};

(function (C) {
  /* ---------- конфиг Supabase ---------- */
  /* Вставь свои значения после создания проекта на supabase.com → Settings → API.
     Таблицу создаёт SQL из supabase.sql (лежит рядом в репозитории). */
  var SUPA_URL = 'https://nugdmbjstwvpogsloqoq.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51Z2RtYmpzdHd2cG9nc2xvcW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0OTAyNjIsImV4cCI6MjEwODA2NjI2Mn0.8-vl3ffkHLwWJds5Rtb5FdHrBxLKrZk9cUgWNmEAjxs';
  C.hasSupa = function () { return !!(SUPA_URL && SUPA_KEY); };

  var LKEY = 'fedot.crm.v1';
  var LCFG = 'fedot.crm.cfg.v1';
  var LME = 'fedot.crm.me.v1';

  /* ---------- справочники по умолчанию (команда сама меняет нейминг-слова через «+») ---------- */
  var DEF_CFG = {
    buyers: [
      { id: '209', nick: 'madboutthatt1' },
      { id: '176', nick: 'topdenchick' }
    ],
    langs: [{ id: 'EN', name: 'English' }],
    teams: [{ id: 'MGM', name: 'Magnum Ops' }],
    formats: [
      { id: 'STORY', name: 'История' },
      { id: 'NEURO', name: 'Нейро' },
      { id: 'STATIC', name: 'Статика' },
      { id: 'AI', name: 'AI' }
    ],
    states: [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT',
      'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ].map(function (s) { return { id: s, name: (FD.STATES && FD.STATES[s] && FD.STATES[s].n) || s }; }),
    slots: [{ id: 'OFF', name: 'Offline' }, { id: 'ON', name: 'Online' }],
    brands: [
      { id: 'CDC', name: "Coeur d'Alene" }, { id: 'FRLICK', name: 'French Lick Casino' }, { id: 'AMERISTAR', name: 'Ameristar' },
      { id: 'HORSESHOE', name: 'Horseshoe' }, { id: 'MGM', name: 'MGM Resorts' }, { id: 'TMGH', name: 'The Mint Gaming Hall' }
    ],
    scripts: [{ num: '920', name: "Mom's Jackpot", buyer: '176' }]
  };

  function loadCfg() {
    var cfg; try { cfg = JSON.parse(localStorage.getItem(LCFG) || 'null'); } catch (e) { cfg = null; }
    if (!cfg) return JSON.parse(JSON.stringify(DEF_CFG));
    Object.keys(DEF_CFG).forEach(function (k) { if (!cfg[k]) cfg[k] = DEF_CFG[k]; });
    return cfg;
  }
  C.cfg = loadCfg();
  C.saveCfg = function () { try { localStorage.setItem(LCFG, JSON.stringify(C.cfg)); } catch (e) {} };

  /* кто сейчас работает (чтобы подставлять «мой байер» и подписывать карточки) */
  C.me = (function () { try { return JSON.parse(localStorage.getItem(LME) || 'null'); } catch (e) { return null; } })();
  C.setMe = function (buyerId) { C.me = buyerId; try { localStorage.setItem(LME, JSON.stringify(buyerId)); } catch (e) {} };

  /* ---------- хранилище креативов: Supabase если настроен, иначе localStorage ---------- */
  function localAll() { try { return JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch (e) { return []; } }
  function localSave(list) { try { localStorage.setItem(LKEY, JSON.stringify(list)); } catch (e) {} }

  var sb = null;
  function supa() {
    if (sb || !C.hasSupa()) return sb;
    if (!window.supabase) return null; // библиотека ещё не загрузилась
    sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
    return sb;
  }

  /* список креативов: возвращает Promise<array> */
  C.list = function () {
    var cl = supa();
    if (!cl) return Promise.resolve(localAll());
    return cl.from('creatives').select('*').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) { console.warn('CRM: supabase select', r.error); return localAll(); }
      return r.data || [];
    });
  };

  C.upsert = function (row) {
    var cl = supa();
    if (!cl) {
      var list = localAll();
      if (!row.id) row.id = 'l' + Date.now() + Math.random().toString(36).slice(2, 7);
      row.created_at = row.created_at || new Date().toISOString();
      row.updated_at = new Date().toISOString();
      var i = list.findIndex(function (x) { return x.id === row.id; });
      if (i > -1) list[i] = row; else list.unshift(row);
      localSave(list);
      return Promise.resolve(row);
    }
    row.updated_at = new Date().toISOString();
    return cl.from('creatives').upsert(row).select().then(function (r) {
      if (r.error) throw r.error;
      return r.data && r.data[0];
    });
  };

  C.remove = function (id) {
    var cl = supa();
    if (!cl) { localSave(localAll().filter(function (x) { return x.id !== id; })); return Promise.resolve(); }
    return cl.from('creatives').delete().eq('id', id).then(function (r) { if (r.error) throw r.error; });
  };

  /* realtime-подписка на изменения (общая таблица обновляется у обоих байеров сразу) */
  C.onChange = function (cb) {
    var cl = supa();
    if (!cl) return function () {};
    var ch = cl.channel('creatives-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creatives' }, cb)
      .subscribe();
    return function () { cl.removeChannel(ch); };
  };

  /* ---------- нейминг ---------- */
  /* строка: EN-MGM-209-209-STORY-920-ID-OFF-CDC-001 */
  C.buildName = function (f) {
    var parts = [f.lang, f.team, f.buyerOwn, f.buyerLink || f.buyerOwn, f.format];
    if (f.script) parts.push(f.script);
    parts.push(f.state, f.slot);
    parts.push(f.state ? (f.brand || 'na') : 'na');
    parts.push(('00' + f.num).slice(-3));
    return parts.join('-');
  };

  /* следующий номер крео: один счётчик на пару «скрипт + формат» (или «байер залива + формат», если скрипта нет) */
  C.nextNum = function (list, f) {
    var key = f.script ? ('s:' + f.script + ':' + f.format) : ('b:' + f.buyerOwn + ':' + f.format);
    var max = 0;
    list.forEach(function (r) {
      if (!r.name) return;
      var p = FD.CRM.parseName(r.name);
      if (!p) return;
      var k = p.script ? ('s:' + p.script + ':' + p.format) : ('b:' + p.buyerOwn + ':' + p.format);
      if (k === key && p.num > max) max = p.num;
    });
    return max + 1;
  };

  /* разбор строки нейминга обратно в поля (переиспользует FD.parseCreative, где возможно, плюс буйеров) */
  C.parseName = function (name) {
    var n = String(name || '').trim();
    var m = n.match(/^([A-Z]{2})-([A-Z0-9]+)-(\d+)-(\d+)-([A-Z]+)-(?:([0-9A-Za-z]+)-)?([A-Za-z]{2})-([A-Za-z]+)-([A-Za-z0-9]+)-(\d+)$/);
    if (!m) return null;
    return {
      lang: m[1], team: m[2], buyerOwn: m[3], buyerLink: m[4], format: m[5],
      script: m[6] || null, state: m[7].toUpperCase(), slot: m[8].toUpperCase(),
      brand: m[9] === 'na' ? null : m[9].toUpperCase(), num: +m[10]
    };
  };

  /* человекочитаемое описание скрипта: «#920 · Mom's Jackpot · байер 176» */
  C.scriptLabel = function (num) {
    if (!num) return '';
    var s = C.cfg.scripts.filter(function (x) { return x.num === String(num); })[0];
    if (!s) return '#' + num;
    return '#' + s.num + (s.name ? ' · ' + s.name : '') + (s.buyer ? ' · байер ' + s.buyer : '');
  };
  C.buyerNick = function (id) { var b = C.cfg.buyers.filter(function (x) { return x.id === String(id); })[0]; return b ? b.nick : id; };
  C.stateName = function (id) { var s = C.cfg.states.filter(function (x) { return x.id === id; })[0]; return s ? s.name : id; };
  C.brandName = function (id) { var b = C.cfg.brands.filter(function (x) { return x.id === id; })[0]; return b ? b.name : id; };
  C.formatName = function (id) { var f = C.cfg.formats.filter(function (x) { return x.id === id; })[0]; return f ? f.name : id; };

  /* ---------- статистика по креативу ---------- */
  /* метрики хранятся как массив записей по датам: [{date:'2026-10-20', spend, clicks, regs, deps, revenue}]
     агрегат считает сумму + ROI + цену депа, так же как FD.analyze в analyzer.js */
  C.totals = function (stats) {
    var t = { spend: 0, clicks: 0, regs: 0, deps: 0, revenue: 0 };
    (stats || []).forEach(function (s) {
      t.spend += +s.spend || 0; t.clicks += +s.clicks || 0; t.regs += +s.regs || 0; t.deps += +s.deps || 0; t.revenue += (+s.revenue || 0) || ((+s.deps || 0) * FD.PAYOUT);
    });
    t.roi = t.spend ? (t.revenue / t.spend - 1) * 100 : 0;
    t.cpc = t.clicks ? t.spend / t.clicks : null;
    t.cpr = t.regs ? t.spend / t.regs : null;
    t.cpd = t.deps ? t.spend / t.deps : null;
    return t;
  };

  /* ---------- UI ---------- */
  C.renderList = function (el, opts) {
    opts = opts || {};
    C.list().then(function (list) {
      if (opts.buyer) list = list.filter(function (r) { return r.buyer_own === opts.buyer; });
      if (!list.length) { el.innerHTML = '<div class="empty"><span class="fedot" style="width:70px"></span><p class="mut">Пока нет ни одного креатива. Добавь первый.</p></div>'; return; }
      var h = '<div class="tbl"><table class="t"><thead><tr><th>Нейминг</th><th>Байер</th><th>Скрипт</th><th>Штат</th><th>Залито</th><th class="n">Спенд</th><th class="n">Депы</th><th class="n">ROI</th><th>Статус</th></tr></thead><tbody>';
      list.forEach(function (r) {
        var t = C.totals(r.stats), p = C.parseName(r.name);
        h += '<tr data-id="' + r.id + '">';
        h += '<td><b>' + (r.name || '—') + '</b>' + (r.camp_name ? '<div class="sm mut">' + r.camp_name + '</div>' : '') + '</td>';
        h += '<td>' + C.buyerNick(r.buyer_own) + (r.buyer_link && r.buyer_link !== r.buyer_own ? ' → ' + C.buyerNick(r.buyer_link) : '') + '</td>';
        h += '<td>' + (p && p.script ? C.scriptLabel(p.script) : '—') + '</td>';
        h += '<td>' + (p ? C.stateName(p.state) : '—') + '</td>';
        h += '<td>' + (r.upload_date ? r.upload_date : '—') + '</td>';
        h += '<td class="n">' + (t.spend ? '$' + Math.round(t.spend) : '—') + '</td>';
        h += '<td class="n">' + (t.deps || '—') + '</td>';
        h += '<td class="n ' + (t.roi > 0 ? 'good' : t.roi < 0 ? 'bad' : '') + '">' + (t.spend ? (t.roi > 0 ? '+' : '') + Math.round(t.roi) + '%' : '—') + '</td>';
        h += '<td><span class="pill ' + (r.status === 'dup' ? 'acc' : r.status === 'kill' ? 'kill' : r.status === 'hold' ? 'good' : '') + '">' + (r.status || 'test') + '</span></td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
      el.innerHTML = h;
      el.querySelectorAll('tr[data-id]').forEach(function (tr) { tr.style.cursor = 'pointer'; tr.onclick = function () { C.editModal(tr.dataset.id); }; });
    }).catch(function (e) { el.innerHTML = '<p class="bad">Ошибка загрузки: ' + e.message + '</p>'; });
  };

  C.editModal = function (id) {
    /* placeholder — откроет модальное окно для редактирования креатива (stats, статус, заметка) */
    alert('Редактирование креатива ' + id + ' — сделаем далее');
  };

  C.renderForm = function (el) {
    var me = C.me || C.cfg.buyers[0].id;
    var h = '<div class="form crm-form">';
    h += '<label>Байер залива<select id="crmBuyerOwn">' + C.cfg.buyers.map(function (b) { return '<option value="' + b.id + '"' + (b.id === me ? ' selected' : '') + '>' + b.nick + ' (' + b.id + ')</option>'; }).join('') + '</select></label>';
    h += '<label>Язык<select id="crmLang">' + C.cfg.langs.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Команда<select id="crmTeam">' + C.cfg.teams.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Формат<select id="crmFormat">' + C.cfg.formats.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Скрипт<select id="crmScript"><option value="">—</option>' + C.cfg.scripts.map(function (s) { return '<option value="' + s.num + '">' + C.scriptLabel(s.num) + '</option>'; }).join('') + '</select></label>';
    h += '<label>Штат<select id="crmState">' + C.cfg.states.map(function (s) { return '<option value="' + s.id + '">' + s.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Слот<select id="crmSlot">' + C.cfg.slots.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Бренд/казино<select id="crmBrand">' + C.cfg.brands.map(function (b) { return '<option value="' + b.id + '">' + b.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Дата заливки<input id="crmDate" type="date"></label>';
    h += '<label>Время (МСК)<input id="crmTime" type="time"></label>';
    h += '<label>Название кампании (опц.)<input id="crmCampName" type="text" placeholder="Как в Ads Manager"></label>';
    h += '<button class="btn" id="crmAdd" type="button">Добавить креатив</button>';
    h += '</div>';
    h += '<div id="crmNamePreview" class="card" style="margin-top:12px"><h4>Нейминг</h4><p id="crmNameText" class="mono" style="font-size:15px;word-break:break-all">—</p></div>';
    el.innerHTML = h;
    var now = new Date();
    el.querySelector('#crmDate').value = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    el.querySelector('#crmTime').value = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    function upd() {
      var f = {
        lang: el.querySelector('#crmLang').value, team: el.querySelector('#crmTeam').value,
        buyerOwn: el.querySelector('#crmBuyerOwn').value, format: el.querySelector('#crmFormat').value,
        script: el.querySelector('#crmScript').value || null, state: el.querySelector('#crmState').value,
        slot: el.querySelector('#crmSlot').value, brand: el.querySelector('#crmBrand').value, num: 1
      };
      C.list().then(function (list) { f.num = C.nextNum(list, f); el.querySelector('#crmNameText').textContent = C.buildName(f); });
    }
    ['crmLang', 'crmTeam', 'crmBuyerOwn', 'crmFormat', 'crmScript', 'crmState', 'crmSlot', 'crmBrand'].forEach(function (id) { el.querySelector('#' + id).onchange = upd; });
    upd();
    el.querySelector('#crmAdd').onclick = function () {
      var f = {
        lang: el.querySelector('#crmLang').value, team: el.querySelector('#crmTeam').value,
        buyerOwn: el.querySelector('#crmBuyerOwn').value, format: el.querySelector('#crmFormat').value,
        script: el.querySelector('#crmScript').value || null, state: el.querySelector('#crmState').value,
        slot: el.querySelector('#crmSlot').value, brand: el.querySelector('#crmBrand').value
      };
      C.list().then(function (list) {
        f.num = C.nextNum(list, f);
        var row = {
          name: C.buildName(f), lang: f.lang, team: f.team, buyer_own: f.buyerOwn, buyer_link: f.buyerOwn,
          format: f.format, script: f.script, state: f.state, slot: f.slot, brand: f.brand, num: f.num,
          upload_date: el.querySelector('#crmDate').value, upload_time: el.querySelector('#crmTime').value,
          camp_name: el.querySelector('#crmCampName').value.trim() || null, status: 'test', stats: [],
          created_by: C.buyerNick(f.buyerOwn)
        };
        return C.upsert(row);
      }).then(function () {
        FD.say && FD.say('Креатив добавлен: ' + el.querySelector('#crmNameText').textContent, { mood: 'happy' });
        el.querySelector('#crmCampName').value = '';
        upd();
        C.renderList(document.querySelector('#crmList'), {});
      }).catch(function (e) { alert('Ошибка: ' + e.message); });
    };
  };
})(FD.CRM);
