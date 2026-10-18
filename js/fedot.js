/* Сеньор Федот Пулемёт: аватар, голос, пузырь, мат-фильтр. */
window.FD = window.FD || {};

FD.AVATAR_SVG = `
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" class="fedot-svg" aria-label="Сеньор Федот Пулемёт">
  <defs>
    <radialGradient id="fbg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#FFB547"/><stop offset="1" stop-color="#FF5A3C"/></radialGradient>
    <linearGradient id="fgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset="1" stop-color="#E0A21B"/></linearGradient>
    <clipPath id="fclip"><circle cx="120" cy="120" r="118"/></clipPath>
  </defs>
  <circle cx="120" cy="120" r="118" fill="url(#fbg)"/>
  <g clip-path="url(#fclip)">
    <g class="f-rays" opacity=".18" stroke="#fff" stroke-width="6">
      <line x1="120" y1="120" x2="120" y2="-10"/><line x1="120" y1="120" x2="250" y2="40"/><line x1="120" y1="120" x2="-10" y2="40"/>
    </g>
    <g class="f-body">
      <path d="M22 250 C32 186 74 168 120 168 C166 168 208 186 218 250 Z" fill="#2B1F63"/>
      <path d="M88 170 L120 206 L152 170" fill="none" stroke="#1C1446" stroke-width="6" stroke-linejoin="round"/>
      <line x1="104" y1="190" x2="100" y2="222" stroke="#E9E4FF" stroke-width="3" stroke-linecap="round"/>
      <line x1="136" y1="190" x2="140" y2="222" stroke="#E9E4FF" stroke-width="3" stroke-linecap="round"/>
      <g class="f-chain">
        <path d="M84 172 Q120 214 156 172" fill="none" stroke="url(#fgold)" stroke-width="5" stroke-dasharray="3 3"/>
        <circle cx="120" cy="206" r="13" fill="url(#fgold)" stroke="#B57A00" stroke-width="2"/>
        <text x="120" y="212" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="16" fill="#7A4A00">$</text>
      </g>
    </g>
    <g class="f-head">
      <rect x="104" y="150" width="32" height="24" rx="8" fill="#E2A97F"/>
      <circle cx="68" cy="118" r="11" fill="#E9B48C"/><circle cx="172" cy="118" r="11" fill="#E9B48C"/>
      <ellipse cx="120" cy="114" rx="52" ry="58" fill="#F1C39C"/>
      <path d="M78 136 Q120 182 162 136 Q150 170 120 172 Q90 170 78 136 Z" fill="#E5AE85" opacity=".55"/>
      <!-- кепка задом наперёд -->
      <path d="M66 96 C66 46 174 46 174 96 C150 84 90 84 66 96 Z" fill="#1D1640"/>
      <path d="M66 96 C90 88 150 88 174 96" fill="none" stroke="#FF5A3C" stroke-width="5"/>
      <path d="M58 92 C46 92 40 100 44 104 C56 102 64 100 70 98 Z" fill="#1D1640"/>
      <text x="120" y="76" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="18" fill="#FFC53D">FP</text>
      <!-- брови -->
      <g class="f-brows" fill="#3A2210">
        <path class="f-brow-l" d="M80 94 Q98 86 114 93 L113 99 Q98 94 81 100 Z"/>
        <path class="f-brow-r" d="M126 93 Q142 86 160 94 L159 100 Q142 94 127 99 Z"/>
      </g>
      <!-- очки -->
      <g class="f-glasses">
        <rect x="80" y="100" width="36" height="22" rx="9" fill="#111"/>
        <rect x="124" y="100" width="36" height="22" rx="9" fill="#111"/>
        <path d="M116 108 Q120 104 124 108" stroke="#111" stroke-width="4" fill="none"/>
        <line x1="80" y1="106" x2="68" y2="110" stroke="#111" stroke-width="4"/><line x1="160" y1="106" x2="172" y2="110" stroke="#111" stroke-width="4"/>
        <path class="f-shine" d="M86 106 L96 104 M130 106 L140 104" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      </g>
      <ellipse cx="120" cy="132" rx="9" ry="7" fill="#E09B72"/>
      <!-- рот -->
      <g class="f-mouth">
        <path class="m-closed" d="M106 154 Q120 160 134 154" stroke="#7A2E1E" stroke-width="4" fill="none" stroke-linecap="round"/>
        <g class="m-open"><ellipse cx="120" cy="156" rx="13" ry="9" fill="#5B1712"/><rect x="110" y="148" width="20" height="5" rx="2" fill="#fff"/><ellipse cx="120" cy="161" rx="7" ry="3" fill="#E0605A"/></g>
      </g>
      <!-- усы-пулемёт -->
      <path class="f-stache" d="M120 140 C108 136 94 138 86 146 C80 152 74 150 72 144 C74 156 88 160 100 152 C108 147 114 146 120 148 C126 146 132 147 140 152 C152 160 166 156 168 144 C166 150 160 152 154 146 C146 138 132 136 120 140 Z" fill="#4A2A12"/>
      <!-- гарнитура -->
      <path d="M62 116 C58 54 182 54 178 116" fill="none" stroke="#1B1B1B" stroke-width="6"/>
      <rect x="54" y="106" width="14" height="24" rx="6" fill="#1B1B1B"/><rect x="172" y="106" width="14" height="24" rx="6" fill="#1B1B1B"/>
      <path d="M62 128 Q70 160 98 160" fill="none" stroke="#1B1B1B" stroke-width="4"/>
      <circle class="f-mic" cx="100" cy="160" r="5" fill="#FF5A3C"/>
    </g>
  </g>
  <circle cx="120" cy="120" r="117" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
</svg>`;


FD.ZINA_SVG = `
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" class="fedot-svg" aria-label="Сеньора Зина Пулемёт">
  <defs>
    <radialGradient id="zbg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#FF8FC7"/><stop offset="1" stop-color="#8B5BFF"/></radialGradient>
    <linearGradient id="zgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset="1" stop-color="#E0A21B"/></linearGradient>
    <clipPath id="zclip"><circle cx="120" cy="120" r="118"/></clipPath>
  </defs>
  <circle cx="120" cy="120" r="118" fill="url(#zbg)"/>
  <g clip-path="url(#zclip)">
    <g class="f-rays" opacity=".18" stroke="#fff" stroke-width="6"><line x1="120" y1="120" x2="120" y2="-10"/><line x1="120" y1="120" x2="250" y2="40"/><line x1="120" y1="120" x2="-10" y2="40"/></g>
    <g class="f-body">
      <path d="M22 250 C32 186 74 168 120 168 C166 168 208 186 218 250 Z" fill="#E0245E"/>
      <path d="M86 172 L120 214 L154 172" fill="#1A1433"/>
      <g class="f-chain"><path d="M84 172 Q120 214 156 172" fill="none" stroke="url(#zgold)" stroke-width="5" stroke-dasharray="3 3"/>
        <circle cx="120" cy="206" r="13" fill="url(#zgold)" stroke="#B57A00" stroke-width="2"/>
        <text x="120" y="212" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="16" fill="#7A4A00">$</text></g>
    </g>
    <g class="f-head">
      <!-- волосы сзади -->
      <path d="M58 120 C40 60 90 30 120 34 C150 30 200 60 182 120 C190 150 176 170 164 176 L76 176 C64 170 50 150 58 120 Z" fill="#7A1E2E"/>
      <circle cx="120" cy="30" r="22" fill="#7A1E2E"/>
      <rect x="104" y="150" width="32" height="24" rx="8" fill="#E2A97F"/>
      <ellipse cx="120" cy="116" rx="50" ry="56" fill="#F3C9A4"/>
      <!-- чёлка -->
      <path d="M70 100 C72 62 104 52 124 56 C150 58 172 74 170 100 C152 82 128 76 104 84 C92 88 80 94 70 100 Z" fill="#8E2236"/>
      <circle cx="69" cy="128" r="7" fill="none" stroke="url(#zgold)" stroke-width="4"/><circle cx="171" cy="128" r="7" fill="none" stroke="url(#zgold)" stroke-width="4"/>
      <g class="f-brows" fill="#4A1A14">
        <path class="f-brow-l" d="M82 96 Q98 88 114 94 L113 98 Q98 94 83 100 Z"/>
        <path class="f-brow-r" d="M126 94 Q142 88 158 96 L157 100 Q142 94 127 98 Z"/>
      </g>
      <g class="f-glasses">
        <path d="M78 102 L118 102 L114 120 Q98 128 84 120 Z" fill="#111"/>
        <path d="M122 102 L162 102 L156 120 Q142 128 126 120 Z" fill="#111"/>
        <path d="M118 106 Q120 103 122 106" stroke="#111" stroke-width="4" fill="none"/>
        <path d="M78 102 L70 96 M162 102 L170 96" stroke="#111" stroke-width="4"/>
        <path class="f-shine" d="M86 108 L96 106 M130 108 L140 106" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      </g>
      <ellipse cx="120" cy="134" rx="7" ry="6" fill="#E5A27E"/>
      <circle cx="90" cy="140" r="7" fill="#FF7FA0" opacity=".45"/><circle cx="150" cy="140" r="7" fill="#FF7FA0" opacity=".45"/>
      <g class="f-mouth">
        <path class="m-closed" d="M106 152 Q120 162 134 152 Q120 156 106 152 Z" fill="#D7193F" stroke="#B0102F" stroke-width="2"/>
        <g class="m-open"><ellipse cx="120" cy="155" rx="13" ry="9" fill="#5B1712" stroke="#D7193F" stroke-width="4"/><rect x="110" y="147" width="20" height="5" rx="2" fill="#fff"/></g>
      </g>
      <circle cx="146" cy="150" r="2" fill="#5A2A12"/>
      <path d="M64 116 C60 54 180 54 176 116" fill="none" stroke="#1B1B1B" stroke-width="6"/>
      <rect x="56" y="106" width="14" height="24" rx="6" fill="#1B1B1B"/><rect x="170" y="106" width="14" height="24" rx="6" fill="#1B1B1B"/>
      <path d="M64 128 Q72 160 100 158" fill="none" stroke="#1B1B1B" stroke-width="4"/>
      <circle class="f-mic" cx="101" cy="158" r="5" fill="#FF5A3C"/>
    </g>
  </g>
  <circle cx="120" cy="120" r="117" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
</svg>`;
FD.CHARS = {
  fedot: { name: 'Сеньор Федот Пулемёт', short: 'Федот', acc: 'Федота', up: 'ФЕДОТ', title: 'СЕНЬОР МЕДИАБАЕР', g: 'm', svg: function () { return FD.AVATAR_SVG; } },
  zina: { name: 'Сеньора Зина Пулемёт', short: 'Зина', acc: 'Зину', up: 'ЗИНА', title: 'СЕНЬОРА МЕДИАБАЕР', g: 'f', svg: function () { return FD.ZINA_SVG; } }
};
FD.char = function () { return FD.CHARS[(FD.state && FD.state.char) || 'fedot'] || FD.CHARS.fedot; };
FD.g = function (m, f) { return FD.char().g === 'f' ? f : m; };

/* ---------- мат-фильтр ---------- */
FD.SOFT = [
  [/долбо[её]б(ина|ы|ом|у|а)?/gi, 'балбес'], [/нихуя/gi, 'ничего'], [/нахуй|нахуя/gi, 'нафиг'], [/похуй/gi, 'пофиг'],
  [/хуй там/gi, 'фиг там'], [/(^|\s)хуй(?=\s)/gi, '$1фиг'], [/хуйн[яюёеи]/gi, 'фигня'], [/пиздец/gi, 'капец'], [/пизд\w*/gi, 'капец'], [/блядь|бля/gi, 'блин'],
  [/ебать/gi, 'ёлки'], [/ёпта|епта/gi, 'ёлки'], [/обосрал(ся|ась)/gi, 'испугался'], [/ебаш(ить|ишь|ит|ил|у)/gi, 'фигач$1'],
  [/сука/gi, 'блин'], [/охуенн(о|ый|ая)/gi, 'офигенн$1'], [/хуёво|хуево/gi, 'фигово'], [/лошок/gi, 'новичок']
];
FD.clean = function (t) {
  if (FD.state && FD.state.mat === 'hard') return t;
  FD.SOFT.forEach(function (p) { t = t.replace(p[0], p[1]); });
  return t;
};

/* ---------- голос ---------- */
FD.voice = null;
FD.MALE_RE = /yuri|pavel|dmitr|maxim|ruslan|andrei|male|муж/i;
FD.ruVoices = function () { if (!('speechSynthesis' in window)) return []; try { return speechSynthesis.getVoices().filter(function (v) { return /^ru/i.test(v.lang); }); } catch (e) { return []; } };
FD.pickVoice = function () {
  var vs = FD.ruVoices(); if (!vs.length) { FD.voice = null; return null; }
  var want = FD.state && FD.state.voiceName;
  var chosen = want && vs.find(function (v) { return v.name === want; });
  if (!chosen) {
    var male = vs.find(function (v) { return FD.MALE_RE.test(v.name); });
    var fem = vs.find(function (v) { return !FD.MALE_RE.test(v.name); });
    chosen = FD.char().g === 'm' ? (male || vs[0]) : (fem || vs[0]);
  }
  FD.voice = chosen; return chosen;
};
FD.hasMale = function () { return FD.ruVoices().some(function (v) { return FD.MALE_RE.test(v.name); }); };
if ('speechSynthesis' in window) { try { speechSynthesis.onvoiceschanged = function () { FD.pickVoice(); if (FD.onVoices) FD.onVoices(); }; FD.pickVoice(); } catch (e) {} }

/* ---------- пузырь + рот ---------- */
FD._flap = null; FD._type = null; FD._queue = []; FD._busy = false;
FD.mood = function (m) {
  document.querySelectorAll('.fedot').forEach(function (el) {
    el.classList.remove('angry', 'happy', 'shock'); if (m) el.classList.add(m);
  });
};
FD.mouth = function (on) {
  var els = document.querySelectorAll('.fedot');
  clearInterval(FD._flap);
  document.body.classList.toggle('speaking', !!on);
  if (!on) { els.forEach(function (e) { e.classList.remove('talking', 'open'); }); return; }
  els.forEach(function (e) { e.classList.add('talking'); });
  FD._flap = setInterval(function () {
    els.forEach(function (e) { e.classList.toggle('open', Math.random() > 0.35); });
  }, 120);
};
FD.say = function (text, opts) {
  opts = opts || {};
  var t = FD.clean(text); FD.lastSaid = text;
  var bubble = document.getElementById('bubbleText');
  if (!bubble) return;
  FD.mood(opts.mood || null);
  clearInterval(FD._type);
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
  bubble.textContent = '';
  var i = 0, speed = opts.fast ? 6 : 22;
  FD.mouth(true);
  var voiceOn = FD.state && FD.state.voice && 'speechSynthesis' in window;
  var typingDone = false, speechDone = !voiceOn;
  function finish() { if (typingDone && speechDone) { FD.mouth(false); if (opts.done) opts.done(); } }
  FD._type = setInterval(function () {
    i += 2; bubble.textContent = t.slice(0, i); if (bubble.scrollHeight > bubble.clientHeight) bubble.scrollTop = bubble.scrollHeight;
    if (i >= t.length) { clearInterval(FD._type); bubble.textContent = t; typingDone = true; if (!voiceOn) setTimeout(finish, 250); else finish(); }
  }, speed);
  if (voiceOn) {
    try {
      var u = new SpeechSynthesisUtterance(t.replace(/\$(\d[\d\s,.]*)/g, '$1 долларов').replace(/[«»]/g, ''));
      u.lang = 'ru-RU'; var v = FD.voice || FD.pickVoice(); if (v) u.voice = v;
      u.rate = FD.state.rate || 1.05; u.pitch = FD.voice && FD.MALE_RE.test(FD.voice.name) ? 0.85 : (FD.char().g === 'm' ? 0.6 : 1.05);
      u.onend = u.onerror = function () { speechDone = true; finish(); };
      speechSynthesis.speak(u);
    } catch (e) { speechDone = true; }
  }
};
FD.shut = function (full) {
  clearInterval(FD._type);
  if (full && FD.lastSaid) { var b = document.getElementById('bubbleText'); if (b) b.textContent = FD.clean(FD.lastSaid); }
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
  FD.mouth(false);
};

/* ---------- фразы ---------- */
FD.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
FD.LINES = {
  hello: { fedot: [
    'Здарова, братишка. Я Сеньор Федот Пулемёт. Я видел цифры всей вашей компании: пятьдесят баеров, Измаилов, Иван, Эндлесс Дрим, и твои тоже видел. Сейчас буду делать из тебя баера, а не туриста.',
    'О, явился. Садись. Измаилов уже залил десять кампаний, пока ты глаза тёр. Погнали учиться.' ],
    zina: [
    'Привет, котик. Я Сеньора Зина Пулемёт. Я видела цифры всей вашей компании, и твои тоже видела. Ох, видела. Садись, будем делать из тебя человека.',
    'Ну здравствуй, солнышко. Эндлесс Дрим уже три креатива залил, пока ты кофе нюхал. Погнали.' ] },
  right: ['Ну хоть что-то в башке осталось. Красава.', 'Правильно, ёпта! Вот так и думай на заливе.', 'Опа, шаришь. Эндлесс Дрим бы кивнул.', 'Чётко. sii1m так и льёт, поэтому у него плюс девяносто три.', 'В точку. Записываю тебе плюс.',
    'Смотри-ка, мозг включился. Не выключай.', 'Правильно. Ещё пару таких, и Измаилов начнёт волноваться.', 'Да, бля! Вот это баер, а не турист.', 'Верно. Я аж в шоке. Короче, молодец.'],
  wrong: [
    'Ха-ха, ебать ты тормоз. Вот поэтому ты и льёшь в минус.', 'Ха-ха, мимо, долбоёб. Даже моя бабка бы ответила, а она думает, что фейсбук — это газета.',
    'Неа. Вот поэтому Измаилов заливает пачками, а ты по одной и с дрожащими руками.', 'Хуйня ответ. Но ошибся — значит запомнишь, это я тебе как психолог говорю.',
    'Ахаха, нет. С такими ответами твой ROI будет как температура в Якутии.', 'Братан, это не ответ, это слив бюджета в текстовом виде.',
    'Не-не-не. Эндлесс Дрим сейчас где-то тихо плачет.', 'Ты сейчас как кампания на пятнадцати баксах: выключился, не разобравшись.',
    'Ебать, ну ты и турист. Ладно, читай почему, и больше так не позорься.', 'Мимо кассы. Иван бы за такой ответ лишил тебя всех историй.',
    'Пиздец. Даже автоправило в Ads Manager умнее отвечает.', 'Нет, родной. Вот так и сливают депозит фейсбуку.',
    'Ха, классика. Так думают все, кто льёт по сто баксов и удивляется, почему ноль.', 'Не угадал. Моя кошка ткнула бы лапой и попала.',
    'Ответ настолько мимо, что даже Алабама в октябре так не сливала.', 'Мимо. Запомни правильный, я спрошу ещё раз, и тогда не отвертишься.',
    'Ебать ты гений. Гений слива. Читай ниже.', 'Ну ты и пельмень. Фейсбук такие ответы съедает вместе с бюджетом.',
    'Ха-ха-ха. Нет. Поэтому у тебя и минус, а у Magnum Ops плюс пятьдесят восемь.', 'Неправильно. Твой тимлид сейчас почувствовал боль и не понял откуда.',
    'Мимо, тормоз. Ладно, все через это проходили. Кроме Измаилова, он сразу родился с ROI.', 'Бля, ну ты даёшь. Так ответить мог только человек, который рубит креатив на десяти баксах.',
    'Нет, гений. Это как лить статику и ждать депов. Не будет.'],
  done: ['Урок закрыт. Карточки встали в очередь на повтор, завтра проверю, не ссы.', 'Готово. Теперь иди и сделай это на своей таблице, а не просто кивай.'],
  review: ['Повтор, братан. Вспоминай сам, не подглядывай.', 'Ну-ка, что ты помнишь? Только честно.'],
  idle: ['Ты чего завис? Кампании сами себя не зальют.', 'Сколько у тебя сейчас живых кампаний? Если меньше двадцати, то какого хуя ты тут сидишь?', 'Напоминаю: до тридцати баксов ничего не выключаешь. Руки убрал.',
    'Цена реги до четырнадцати — плюс сто восемнадцать по всей компании. Иди переписывай первые строки.', 'У Эндлесс Дрима учись депу, у Ивана историям, у Измаилова объёму. Собери лучшее от всех, а не молись на одного.']
};
FD.hello = function () { var c = (FD.state && FD.state.char) || 'fedot'; return FD.pick(FD.LINES.hello[c] || FD.LINES.hello.fedot); };
