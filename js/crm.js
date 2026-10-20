/* CRM: Креативы в формате Notion — Кампания, Адсет, Креатив, Штат, Таргет, Статус, Фото/Крео, Казино, Ссылка на оффер.
   Нейминг: язык-команда-залив-связка-ФОРМАТ-скрипт-штат-слот-бренд-номер, напр. EN-MGM-209-176-STORY-920-ID-OFF-CDC-001. */
window.FD = window.FD || {};
FD.CRM = {};

(function (C) {
  var SUPA_URL = 'https://nugdmbjstwvpogsloqoq.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51Z2RtYmpzdHd2cG9nc2xvcW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0OTAyNjIsImV4cCI6MjEwODA2NjI2Mn0.8-vl3ffkHLwWJds5Rtb5FdHrBxLKrZk9cUgWNmEAjxs';
  C.hasSupa = function () { return !!(SUPA_URL && SUPA_KEY); };

  var LKEY = 'fedot.crm.v1';
  var LCFG = 'fedot.crm.cfg.v1';
  var LME = 'fedot.crm.me.v1';

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

  C.me = (function () { try { return JSON.parse(localStorage.getItem(LME) || 'null'); } catch (e) { return null; } })();
  C.setMe = function (buyerId) { C.me = buyerId; try { localStorage.setItem(LME, JSON.stringify(buyerId)); } catch (e) {} };

  function localAll() { try { return JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch (e) { return []; } }
  function localSave(list) { try { localStorage.setItem(LKEY, JSON.stringify(list)); } catch (e) {} }

  var sb = null;
  function supa() {
    if (sb || !C.hasSupa()) return sb;
    if (!window.supabase) return null;
    sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
    return sb;
  }

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

  C.onChange = function (cb) {
    var cl = supa();
    if (!cl) return function () {};
    var ch = cl.channel('creatives-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creatives' }, cb)
      .subscribe();
    return function () { cl.removeChannel(ch); };
  };

  C.uploadFile = function (file) {
    var cl = supa();
    if (!cl) return Promise.reject(new Error('Supabase не подключён'));
    var path = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    return cl.storage.from('creatives').upload(path, file).then(function (r) {
      if (r.error) throw r.error;
      var publicUrl = SUPA_URL + '/storage/v1/object/public/creatives/' + path;
      return publicUrl;
    });
  };

  C.buildName = function (f) {
    var parts = [f.lang, f.team, f.buyerOwn, f.buyerLink || f.buyerOwn, f.format];
    if (f.script) parts.push(f.script);
    parts.push(f.state, f.slot);
    parts.push(f.brand || 'na');
    parts.push(('00' + f.num).slice(-3));
    return parts.join('-');
  };

  C.nextNum = function (list, f) {
    var key = f.script ? ('s:' + f.script + ':' + f.format) : ('b:' + f.buyerOwn + ':' + f.format);
    var max = 0;
    list.forEach(function (r) {
      if (!r.name) return;
      var p = C.parseName(r.name);
      if (!p) return;
      var k = p.script ? ('s:' + p.script + ':' + p.format) : ('b:' + p.buyerOwn + ':' + p.format);
      if (k === key && p.num > max) max = p.num;
    });
    return max + 1;
  };

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

  C.totals = function (stats) {
    var t = { spend: 0, clicks: 0, regs: 0, deps: 0, revenue: 0 };
    (stats || []).forEach(function (s) {
      t.spend += +s.spend || 0; t.clicks += +s.clicks || 0; t.regs += +s.regs || 0; t.deps += +s.deps || 0; t.revenue += (+s.revenue || 0) || ((+s.deps || 0) * (FD.PAYOUT || 70));
    });
    t.roi = t.spend ? (t.revenue / t.spend - 1) * 100 : 0;
    t.cpc = t.clicks ? t.spend / t.clicks : null;
    t.cpr = t.regs ? t.spend / t.regs : null;
    t.cpd = t.deps ? t.spend / t.deps : null;
    return t;
  };

  /* ---------- КРЕАТИВЫ: таблица как в Notion ---------- */
  C.renderCreativesMetrics = function (el, list) {
    var total = list.length;
    var withFiles = list.filter(function (r) { return r.file_urls && r.file_urls.length; }).length;
    var byBuyer = {};
    C.cfg.buyers.forEach(function (b) { byBuyer[b.id] = 0; });
    list.forEach(function (r) { if (r.buyer_own && byBuyer[r.buyer_own] !== undefined) byBuyer[r.buyer_own]++; });

    var h = '<div class="crm-metrics">';
    h += '<div class="crm-metric"><b>' + total + '</b><span>Всего креативов</span></div>';
    h += '<div class="crm-metric"><b>' + withFiles + '</b><span>С файлами</span></div>';
    C.cfg.buyers.forEach(function (b) {
      h += '<div class="crm-metric"><b>' + byBuyer[b.id] + '</b><span>' + b.nick + '</span></div>';
    });
    h += '</div>';
    el.innerHTML = h;
  };

  C.renderCreativesList = function (el, opts) {
    opts = opts || {};
    C.list().then(function (list) {
      var search = (opts.search || '').toLowerCase();
      var buyers = [];
      if (opts.buyer && opts.buyer.indexOf('multi:') === 0) {
        buyers = opts.buyer.slice(6).split(',');
      } else if (opts.buyer) {
        buyers = [opts.buyer];
      }

      var filtered = list.filter(function (r) {
        if (buyers.length && buyers.indexOf(r.buyer_own) === -1) return false;
        if (search && !r.name.toLowerCase().includes(search) && !(r.friendly_name && r.friendly_name.toLowerCase().includes(search))) return false;
        return true;
      });

      C.renderCreativesMetrics(document.querySelector('#creativesMetrics'), list);

      if (!filtered.length) {
        el.innerHTML = '<div class="empty"><span class="fedot" style="width:70px"></span><p class="mut">Пока нет креативов. Добавь первый.</p></div>';
        return;
      }

      var h = '<div class="crm-table"><table class="t"><thead><tr><th>Кампания</th><th>Адсет</th><th>Креатив</th><th>Штат</th><th>Таргет</th><th>Статус</th><th>Фото / Крео</th><th>Казино</th><th>Ссылка на оффер</th></tr></thead><tbody>';
      filtered.forEach(function (r) {
        var p = C.parseName(r.name);
        var statusColor = r.status === 'test' ? 'warn' : r.status === 'dup' ? 'acc' : r.status === 'kill' ? 'kill' : r.status === 'hold' ? 'good' : '';
        h += '<tr data-id="' + r.id + '" style="cursor:pointer">';
        h += '<td><b>' + (r.friendly_name || '—') + '</b></td>';
        h += '<td>' + (r.adset_id || '—') + '</td>';
        h += '<td class="mono" style="font-size:12px">' + (r.name || '—') + '</td>';
        h += '<td>' + (p ? C.stateName(p.state) : '—') + '</td>';
        h += '<td>' + (r.target || '—') + '</td>';
        h += '<td><span class="pill ' + statusColor + '" data-id="' + r.id + '" data-status="' + (r.status || 'test') + '">' + (r.status || 'test') + '</span></td>';
        h += '<td>';
        if (r.file_urls && r.file_urls.length) {
          r.file_urls.slice(0, 3).forEach(function (url) {
            h += '<img src="' + url + '" style="width:36px;height:36px;object-fit:cover;border-radius:4px;margin-right:4px;vertical-align:middle">';
          });
        } else {
          h += '—';
        }
        h += '</td>';
        h += '<td>' + (r.brand ? C.brandName(r.brand) : '—') + '</td>';
        h += '<td>' + (r.offer_link ? '<a href="' + r.offer_link + '" target="_blank" style="color:var(--gold);font-size:12px">' + r.offer_link.replace(/^https?:\/\//, '') + '</a>' : '—') + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
      el.innerHTML = h;

      el.querySelectorAll('tr[data-id]').forEach(function (tr) {
        tr.onclick = function () { C.editCreativeModal(tr.dataset.id); };
      });

      el.querySelectorAll('.pill[data-id]').forEach(function (pill) {
        pill.onclick = function (e) { e.stopPropagation(); C.changeStatus(pill.dataset.id, pill.dataset.status); };
      });
    }).catch(function (e) { el.innerHTML = '<p class="bad">Ошибка загрузки: ' + e.message + '</p>'; });
  };

  C.changeStatus = function (id, currentStatus) {
    var statuses = ['test', 'hold', 'dup', 'cut', 'kill', 'wait'];
    var idx = statuses.indexOf(currentStatus);
    var next = statuses[(idx + 1) % statuses.length];
    C.list().then(function (list) {
      var r = list.find(function (x) { return x.id === id; });
      if (!r) return;
      r.status = next;
      return C.upsert(r);
    }).then(function () {
      C.renderCreativesList(document.querySelector('#creativesList'), {});
    }).catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  C.editCreativeModal = function (id) {
    C.list().then(function (list) {
      var r = list.find(function (x) { return x.id === id; });
      if (!r) { alert('Креатив не найден'); return; }
      var h = '<div class="modal-overlay" id="creativeModal">';
      h += '<div class="modal-card">';
      h += '<button type="button" class="modal-close" aria-label="Закрыть">✕</button>';
      h += '<h3>' + (r.friendly_name || r.name) + '</h3>';
      h += '<div class="modal-section">';
      h += '<h4>Основное</h4>';
      h += '<div class="modal-row"><label>Название кампании</label><input type="text" id="editFriendlyName" value="' + (r.friendly_name || '') + '" placeholder="Крео Дальнобой 1"></div>';
      h += '<div class="modal-row"><label>Адсет</label><input type="text" id="editAdsetId" value="' + (r.adset_id || '') + '" placeholder="US0001"></div>';
      h += '<div class="modal-row"><label>Креатив (нейминг FB)</label><input type="text" id="editName" value="' + (r.name || '') + '" readonly style="background:var(--panel2);opacity:0.7"></div>';
      h += '<div class="modal-row"><label>Таргет (опционально)</label><input type="text" id="editTarget" value="' + (r.target || '') + '" placeholder="St. Charles + St. Louis metro area"></div>';
      h += '<div class="modal-row"><label>Ссылка на оффер</label><input type="text" id="editOfferLink" value="' + (r.offer_link || '') + '" placeholder="https://supervaca.store"></div>';
      h += '<div class="modal-row"><label>Статус</label><select id="editStatus">';
      ['test', 'hold', 'dup', 'cut', 'kill', 'wait'].forEach(function (s) {
        h += '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + s + '</option>';
      });
      h += '</select></div>';
      h += '</div>';

      if (r.file_urls && r.file_urls.length) {
        h += '<div class="modal-section">';
        h += '<h4>Файлы</h4>';
        r.file_urls.forEach(function (url) {
          h += '<img src="' + url + '" style="max-width:100%;border-radius:12px;margin-bottom:8px">';
        });
        h += '</div>';
      }

      h += '<div class="modal-footer">';
      h += '<button type="button" class="btn ghost" id="deleteCreative">Удалить</button>';
      h += '<button type="button" class="btn ghost" onclick="document.querySelector(\'#creativeModal\').remove()">Отменить</button>';
      h += '<button type="button" class="btn" id="saveCreative">Сохранить</button>';
      h += '</div>';
      h += '</div></div>';

      document.body.insertAdjacentHTML('beforeend', h);
      var modal = document.querySelector('#creativeModal');

      modal.querySelector('.modal-close').onclick = function () { modal.remove(); };
      modal.querySelector('#deleteCreative').onclick = function () {
        if (!confirm('Удалить креатив ' + r.name + '?')) return;
        C.remove(id).then(function () {
          FD.say && FD.say('Креатив удалён', { mood: 'happy' });
          modal.remove();
          C.renderCreativesList(document.querySelector('#creativesList'), {});
        }).catch(function (e) { alert('Ошибка: ' + e.message); });
      };

      modal.querySelector('#saveCreative').onclick = function () {
        r.friendly_name = modal.querySelector('#editFriendlyName').value;
        r.adset_id = modal.querySelector('#editAdsetId').value;
        r.target = modal.querySelector('#editTarget').value;
        r.offer_link = modal.querySelector('#editOfferLink').value;
        r.status = modal.querySelector('#editStatus').value;
        C.upsert(r).then(function () {
          FD.say && FD.say('Креатив сохранён', { mood: 'happy' });
          modal.remove();
          C.renderCreativesList(document.querySelector('#creativesList'), {});
        }).catch(function (e) { alert('Ошибка: ' + e.message); });
      };

      modal.onclick = function (e) {
        if (e.target === modal) modal.remove();
      };
    });
  };

  C.renderCreativesForm = function (el) {
    var me = C.me || C.cfg.buyers[0].id;
    var h = '<div class="form crm-form">';
    h += '<label>Название кампании<input id="cFriendlyName" type="text" placeholder="Крео Дальнобой 1"></label>';
    h += '<label>Адсет<input id="cAdsetId" type="text" placeholder="US0001"></label>';
    h += '<label>Байер залива<select id="cBuyerOwn">' + C.cfg.buyers.map(function (b) { return '<option value="' + b.id + '"' + (b.id === me ? ' selected' : '') + '>' + b.nick + ' (' + b.id + ')</option>'; }).join('') + '</select></label>';
    h += '<label>Язык<select id="cLang">' + C.cfg.langs.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Команда<select id="cTeam">' + C.cfg.teams.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Формат<select id="cFormat">' + C.cfg.formats.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Скрипт<select id="cScript"><option value="">—</option>' + C.cfg.scripts.map(function (s) { return '<option value="' + s.num + '">' + C.scriptLabel(s.num) + '</option>'; }).join('') + '</select></label>';
    h += '<label>Штат<select id="cState">' + C.cfg.states.map(function (s) { return '<option value="' + s.id + '">' + s.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Слот<select id="cSlot">' + C.cfg.slots.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Бренд/казино<select id="cBrand">' + C.cfg.brands.map(function (b) { return '<option value="' + b.id + '">' + b.name + '</option>'; }).join('') + '</select></label>';
    h += '<label>Таргет (опц.)<input id="cTarget" type="text" placeholder="St. Charles + St. Louis metro area"></label>';
    h += '<label>Ссылка на оффер<input id="cOfferLink" type="text" placeholder="https://supervaca.store"></label>';
    h += '<label style="grid-column:1/-1">Файлы креатива (можно несколько)<input id="cFiles" type="file" accept="image/*,video/*" multiple></label>';
    h += '<button class="btn" id="cAdd" type="button">Добавить креатив</button>';
    h += '</div>';
    h += '<div id="cNamePreview" class="card" style="margin-top:12px"><h4>Нейминг креатива для FB</h4><p id="cNameText" class="mono" style="font-size:15px;word-break:break-all">—</p></div>';
    el.innerHTML = h;

    function upd() {
      var f = {
        lang: el.querySelector('#cLang').value, team: el.querySelector('#cTeam').value,
        buyerOwn: el.querySelector('#cBuyerOwn').value, format: el.querySelector('#cFormat').value,
        script: el.querySelector('#cScript').value || null, state: el.querySelector('#cState').value,
        slot: el.querySelector('#cSlot').value, brand: el.querySelector('#cBrand').value, num: 1
      };
      C.list().then(function (list) { f.num = C.nextNum(list, f); el.querySelector('#cNameText').textContent = C.buildName(f); });
    }
    ['cLang', 'cTeam', 'cBuyerOwn', 'cFormat', 'cScript', 'cState', 'cSlot', 'cBrand'].forEach(function (id) { el.querySelector('#' + id).onchange = upd; });
    upd();

    el.querySelector('#cAdd').onclick = function () {
      var f = {
        lang: el.querySelector('#cLang').value, team: el.querySelector('#cTeam').value,
        buyerOwn: el.querySelector('#cBuyerOwn').value, format: el.querySelector('#cFormat').value,
        script: el.querySelector('#cScript').value || null, state: el.querySelector('#cState').value,
        slot: el.querySelector('#cSlot').value, brand: el.querySelector('#cBrand').value
      };
      var files = Array.from(el.querySelector('#cFiles').files);
      var friendlyName = el.querySelector('#cFriendlyName').value.trim();
      var adsetId = el.querySelector('#cAdsetId').value.trim();
      var target = el.querySelector('#cTarget').value.trim();
      var offerLink = el.querySelector('#cOfferLink').value.trim();

      C.list().then(function (list) {
        f.num = C.nextNum(list, f);
        var row = {
          friendly_name: friendlyName || null,
          adset_id: adsetId || null,
          name: C.buildName(f), lang: f.lang, team: f.team, buyer_own: f.buyerOwn, buyer_link: f.buyerOwn,
          format: f.format, script: f.script, state: f.state, slot: f.slot, brand: f.brand, num: f.num,
          target: target || null,
          offer_link: offerLink || null,
          upload_date: new Date().toISOString().split('T')[0],
          status: 'test', stats: [],
          created_by: C.buyerNick(f.buyerOwn)
        };

        if (files.length) {
          return Promise.all(files.map(function (file) { return C.uploadFile(file); })).then(function (urls) {
            row.file_urls = urls;
            return C.upsert(row);
          });
        } else {
          return C.upsert(row);
        }
      }).then(function () {
        FD.say && FD.say('Креатив добавлен: ' + el.querySelector('#cNameText').textContent, { mood: 'happy' });
        el.querySelector('#cFriendlyName').value = '';
        el.querySelector('#cAdsetId').value = '';
        el.querySelector('#cTarget').value = '';
        el.querySelector('#cOfferLink').value = '';
        el.querySelector('#cFiles').value = '';
        upd();
        C.renderCreativesList(document.querySelector('#creativesList'), {});
      }).catch(function (e) { alert('Ошибка: ' + e.message); });
    };
  };

  /* ---------- CRM: парсинг CSV + статистика ---------- */
  C.renderMetrics = function (el, list) {
    var total = 0, totalSpend = 0, totalRoi = 0, testCount = 0;
    list.forEach(function (r) {
      var t = C.totals(r.stats);
      total++;
      totalSpend += t.spend;
      totalRoi += t.roi;
      if (r.status === 'test') testCount++;
    });
    var avgRoi = total > 0 ? totalRoi / total : 0;
    var h = '<div class="crm-metrics">';
    h += '<div class="crm-metric"><b>' + total + '</b><span>Всего крео</span></div>';
    h += '<div class="crm-metric"><b>$' + Math.round(totalSpend) + '</b><span>Общий спенд</span></div>';
    h += '<div class="crm-metric" style="border-left-color:' + (avgRoi > 0 ? 'var(--good)' : avgRoi < 0 ? 'var(--kill)' : 'var(--muted)') + '"><b>' + (total ? (avgRoi > 0 ? '+' : '') + Math.round(avgRoi) + '%' : '—') + '</b><span>Ср. ROI</span></div>';
    h += '<div class="crm-metric" style="border-left-color:var(--warn)"><b>' + testCount + '</b><span>В тесте</span></div>';
    h += '</div>';
    el.innerHTML = h;
  };

  C.renderList = function (el, opts) {
    opts = opts || {};
    C.list().then(function (list) {
      var search = (opts.search || '').toLowerCase();
      var buyers = [];
      if (opts.buyer && opts.buyer.indexOf('multi:') === 0) {
        buyers = opts.buyer.slice(6).split(',');
      } else if (opts.buyer) {
        buyers = [opts.buyer];
      }

      var filtered = list.filter(function (r) {
        if (buyers.length && buyers.indexOf(r.buyer_own) === -1) return false;
        if (search && !r.name.toLowerCase().includes(search) && !(r.campaign_name && r.campaign_name.toLowerCase().includes(search))) return false;
        return true;
      });

      C.renderMetrics(document.querySelector('#crmMetrics'), list);

      if (!filtered.length) {
        el.innerHTML = '<div class="empty"><span class="fedot" style="width:70px"></span><p class="mut">Пока нет креативов со статистикой. Загрузи CSV из Facebook.</p></div>';
        return;
      }

      var h = '<div class="crm-table"><table class="t"><thead><tr><th>Нейминг</th><th>Байер</th><th>Скрипт</th><th>Штат</th><th>Залито</th><th class="n">Спенд</th><th class="n">Депы</th><th class="n">ROI</th><th>Статус</th></tr></thead><tbody>';
      filtered.forEach(function (r) {
        var t = C.totals(r.stats), p = C.parseName(r.name);
        var statusColor = r.status === 'dup' ? 'acc' : r.status === 'kill' ? 'kill' : r.status === 'hold' ? 'good' : '';
        h += '<tr data-id="' + r.id + '" style="cursor:pointer">';
        h += '<td><b>' + (r.name || '—') + '</b>' + (r.campaign_name ? '<div class="sm mut">' + r.campaign_name + '</div>' : '') + '</td>';
        h += '<td>' + C.buyerNick(r.buyer_own) + (r.buyer_link && r.buyer_link !== r.buyer_own ? ' → ' + C.buyerNick(r.buyer_link) : '') + '</td>';
        h += '<td>' + (p && p.script ? C.scriptLabel(p.script) : '—') + '</td>';
        h += '<td>' + (p ? C.stateName(p.state) : '—') + '</td>';
        h += '<td>' + (r.upload_date ? r.upload_date : '—') + '</td>';
        h += '<td class="n">' + (t.spend ? '$' + Math.round(t.spend) : '—') + '</td>';
        h += '<td class="n">' + (t.deps || '—') + '</td>';
        h += '<td class="n ' + (t.roi > 0 ? 'good' : t.roi < 0 ? 'bad' : '') + '">' + (t.spend ? (t.roi > 0 ? '+' : '') + Math.round(t.roi) + '%' : '—') + '</td>';
        h += '<td><span class="pill ' + statusColor + '" data-id="' + r.id + '" data-status="' + (r.status || 'test') + '">' + (r.status || 'test') + '</span></td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
      el.innerHTML = h;

      el.querySelectorAll('tr[data-id]').forEach(function (tr) {
        tr.onclick = function () { C.editModal(tr.dataset.id); };
      });

      el.querySelectorAll('.pill[data-id]').forEach(function (pill) {
        pill.onclick = function (e) { e.stopPropagation(); C.changeStatus(pill.dataset.id, pill.dataset.status); };
      });
    }).catch(function (e) { el.innerHTML = '<p class="bad">Ошибка загрузки: ' + e.message + '</p>'; });
  };

  C.editModal = function (id) {
    C.list().then(function (list) {
      var r = list.find(function (x) { return x.id === id; });
      if (!r) { alert('Креатив не найден'); return; }
      var h = '<div class="modal-overlay" id="crmModal">';
      h += '<div class="modal-card">';
      h += '<button type="button" class="modal-close" aria-label="Закрыть">✕</button>';
      h += '<h3>' + r.name + '</h3>';
      h += '<div class="modal-section">';
      h += '<h4>Основное</h4>';
      h += '<div class="modal-row"><label>Статус</label><select id="crmEditStatus">';
      ['test', 'hold', 'dup', 'cut', 'kill', 'wait'].forEach(function (s) {
        h += '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + s + '</option>';
      });
      h += '</select></div>';
      h += '<div class="modal-row"><label>Заметка</label><textarea id="crmEditNote" placeholder="Твоя заметка по креативу...">' + (r.note || '') + '</textarea></div>';
      h += '</div>';

      h += '<div class="modal-section">';
      h += '<h4>Статистика по датам</h4>';
      h += '<div class="crm-stats-list" id="crmStatsList">';
      (r.stats || []).forEach(function (s, i) {
        h += '<div class="crm-stat-row">';
        h += '<input type="date" value="' + (s.date || '') + '" readonly>';
        h += '<div class="vals">';
        h += '<input type="number" placeholder="$spend" value="' + (s.spend || '') + '" data-key="spend" class="crm-stat-input">';
        h += '<input type="number" placeholder="clicks" value="' + (s.clicks || '') + '" data-key="clicks" class="crm-stat-input">';
        h += '<input type="number" placeholder="regs" value="' + (s.regs || '') + '" data-key="regs" class="crm-stat-input">';
        h += '<input type="number" placeholder="deps" value="' + (s.deps || '') + '" data-key="deps" class="crm-stat-input">';
        h += '<input type="number" placeholder="revenue" value="' + (s.revenue || '') + '" data-key="revenue" class="crm-stat-input">';
        h += '</div>';
        h += '<div class="btns"><button type="button" class="crm-del-stat" data-idx="' + i + '">✕</button></div>';
        h += '</div>';
      });
      h += '</div>';
      h += '<div class="crm-stat-add"><button type="button" id="crmAddStat">+ Добавить день</button></div>';
      h += '</div>';

      h += '<div class="modal-footer">';
      h += '<button type="button" class="btn ghost" id="crmDeleteCreative">Удалить</button>';
      h += '<button type="button" class="btn ghost" onclick="document.querySelector(\'#crmModal\').remove()">Отменить</button>';
      h += '<button type="button" class="btn" id="crmSaveEdit">Сохранить</button>';
      h += '</div>';
      h += '</div></div>';

      document.body.insertAdjacentHTML('beforeend', h);
      var modal = document.querySelector('#crmModal');

      modal.querySelector('.modal-close').onclick = function () { modal.remove(); };
      modal.querySelector('#crmDeleteCreative').onclick = function () {
        if (!confirm('Удалить креатив ' + r.name + '?')) return;
        C.remove(id).then(function () {
          FD.say && FD.say('Креатив удалён', { mood: 'happy' });
          modal.remove();
          C.renderList(document.querySelector('#crmList'), {});
        }).catch(function (e) { alert('Ошибка: ' + e.message); });
      };

      modal.querySelector('#crmAddStat').onclick = function () {
        var today = new Date().toISOString().split('T')[0];
        if (!r.stats) r.stats = [];
        r.stats.push({ date: today, spend: 0, clicks: 0, regs: 0, deps: 0, revenue: 0 });
        C.editModal(id);
        if (modal) modal.remove();
      };

      modal.querySelectorAll('.crm-del-stat').forEach(function (btn) {
        btn.onclick = function () {
          var idx = +btn.dataset.idx;
          r.stats.splice(idx, 1);
          C.editModal(id);
          if (modal) modal.remove();
        };
      });

      modal.querySelector('#crmSaveEdit').onclick = function () {
        r.status = modal.querySelector('#crmEditStatus').value;
        r.note = modal.querySelector('#crmEditNote').value;
        var stats = [];
        modal.querySelectorAll('.crm-stat-row').forEach(function (row, i) {
          var date = row.querySelector('input[type=date]').value;
          if (!date) return;
          var s = { date: date, spend: 0, clicks: 0, regs: 0, deps: 0, revenue: 0 };
          row.querySelectorAll('.crm-stat-input').forEach(function (inp) {
            s[inp.dataset.key] = +inp.value || 0;
          });
          stats.push(s);
        });
        r.stats = stats;
        C.upsert(r).then(function () {
          FD.say && FD.say('Креатив сохранён', { mood: 'happy' });
          modal.remove();
          C.renderList(document.querySelector('#crmList'), {});
        }).catch(function (e) { alert('Ошибка: ' + e.message); });
      };

      modal.onclick = function (e) {
        if (e.target === modal) modal.remove();
      };
    });
  };

  C.parseCSV = function (file) {
    return FD.readFile(file).then(function (rows) {
      var meta = FD.detect(rows);
      if (!meta) throw new Error('Файл не похож на выгрузку Facebook Ads Manager');

      var col = meta.col;
      var creativesByName = {};

      for (var i = meta.hi + 1; i < rows.length; i++) {
        var row = rows[i];
        var adName = row[col.fb_ad_name || col['Ad name']] || row[col['Объявление']] || '';
        if (!adName) continue;

        var spend = FD.num(row[col.spend || col['Amount spent (USD)'] || col['Потрачено (USD)']]);
        var results = FD.num(row[col.results || col['Results'] || col['Результаты']]);
        var clicks = FD.num(row[col.clicks || col['Link clicks'] || col['Клики по ссылке']]);

        if (!creativesByName[adName]) {
          creativesByName[adName] = { adName: adName, spend: 0, results: 0, clicks: 0 };
        }
        creativesByName[adName].spend += spend;
        creativesByName[adName].results += results;
        creativesByName[adName].clicks += clicks;
      }

      return Object.values(creativesByName);
    });
  };

  C.importCSV = function (file) {
    C.parseCSV(file).then(function (parsed) {
      return C.list().then(function (list) {
        var matched = 0, added = 0;
        var today = new Date().toISOString().split('T')[0];

        parsed.forEach(function (p) {
          var creative = list.find(function (r) { return r.name === p.adName; });
          if (!creative) return;

          matched++;
          var existingStat = (creative.stats || []).find(function (s) { return s.date === today; });
          if (existingStat) {
            existingStat.spend = p.spend;
            existingStat.clicks = p.clicks;
            existingStat.regs = p.results;
          } else {
            if (!creative.stats) creative.stats = [];
            creative.stats.push({ date: today, spend: p.spend, clicks: p.clicks, regs: p.results, deps: 0, revenue: 0 });
            added++;
          }
        });

        return Promise.all(list.filter(function (r) {
          return r.stats && r.stats.some(function (s) { return s.date === today; });
        }).map(function (r) { return C.upsert(r); })).then(function () {
          return { matched: matched, added: added };
        });
      });
    }).then(function (result) {
      FD.say && FD.say('Импортировано: ' + result.matched + ' креативов, ' + result.added + ' новых записей', { mood: 'happy' });
      C.renderList(document.querySelector('#crmList'), {});
    }).catch(function (e) {
      alert('Ошибка парсинга: ' + e.message);
    });
  };
})(FD.CRM);
