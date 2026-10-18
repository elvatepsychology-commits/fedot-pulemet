/* Федот Пулемёт: все цифры и контент.
   Цифры посчитаны по отчётам Power BI: Измаилов (сен + 1–18 окт 2026), Иван и Endless Dream (сен), Кирилл (13–18 окт). */
window.FD = window.FD || {};

FD.PAYOUT = 158; // выплата за деп, $

FD.BENCH = {
  izm: { name: 'Измаилов', when: 'октябрь', roi: 78, dep: 91, ctr: 3.9, cpc: 2.79, reg: 16.3,
         peakNewCamps: 47, peakLive: 82, peakSpend: 9698, newCrDay: 54, peakNewCr: 144,
         drop: [14, 38, 86], hit: [14, 28, 62, 87, 100], struct: '1-3-1 / 1-5-1' },
  ed:  { name: 'Endless Dream', when: 'сентябрь', roi: 174, dep: 60, ctr: 3.9, cpc: 2.98, reg: 10.7,
         peakNewCamps: 59, peakLive: 64, peakSpend: 2776, newCrDay: 8, peakNewCr: 16,
         drop: [28, 49, 77], hit: [6, 31, 74, 96, 100], struct: '3-5-1 CBO' },
  ivan:{ name: 'Иван', when: 'сентябрь', roi: 145, dep: 67, ctr: 3.5, cpc: 2.77, reg: 10.8,
         peakNewCamps: 84, peakLive: 41, peakSpend: 2460, newCrDay: 7, peakNewCr: 20,
         drop: [35, 52, 65], hit: [12, 27, 67, 85, 100], struct: '1-5-1' },
  me:  { name: 'Ты', when: '13–18 окт', roi: 75, dep: 90, ctr: 2.5, cpc: 4.96, reg: 18.8,
         peakNewCamps: 17, peakLive: 17, peakSpend: 531, newCrDay: 7, peakNewCr: 9,
         drop: [14, 25, 38], hit: [0, 14, 100, 100, null], struct: '3-5-1 / 1-1-1' }
};
FD.BUCKETS = [[10, 30], [30, 80], [80, 160], [160, 400], [400, 1e9]];
FD.BUCKET_LABELS = ['$10–30', '$30–80', '$80–160', '$160–400', '$400+'];

/* Штаты: tier go | test | watch | stop. now = Измаилов 11–18 окт, sep = сентябрь (ED/Иван), all = все вместе */
FD.STATES = {
  IN: { n: 'Индиана', tier: 'go', now: '+59%', sep: '+65%', all: '+68%', dep: 96, note: '14 баеров, $8.6k за 10–18 окт и всё ещё плюс. Казино Horseshoe +57%, French Lick −18%.' },
  MO: { n: 'Миссури', tier: 'go', now: '+115%', sep: '+50%', all: '+73%', dep: 93, note: 'Ameristar сейчас +142%. У artempankra +222%.' },
  TN: { n: 'Теннесси', tier: 'go', now: '+148%', sep: '+124%', all: '+105%', dep: 80, note: 'Лили всего 3 баера. Рега $14 — одна из лучших.' },
  ID: { n: 'Айдахо', tier: 'go', now: '+93%', sep: '+114%', all: '+89%', dep: 85, note: 'Твой штат. Казино CDC сейчас +104%.' },
  GA: { n: 'Джорджия', tier: 'go', now: '+101%', sep: '+66%', all: '+76%', dep: 91, note: 'Стабильно плюс оба месяца.' },
  AZ: { n: 'Аризона', tier: 'go', now: '+77%', sep: '+37%', all: '+51%', dep: 108, note: 'Казино CASAR сейчас +99%. У Evg +147%.' },
  WV: { n: 'Зап. Вирджиния', tier: 'go', now: '+39%', sep: '+85%', all: '+65%', dep: 99, note: 'Казино MOUC сейчас +108%.' },
  SD: { n: 'Южная Дакота', tier: 'go', now: '+37%', sep: '+139%', all: '+98%', dep: 82, note: 'Казино TLADC сейчас +83%.' },
  NM: { n: 'Нью-Мексико', tier: 'test', now: '+80%', sep: '+47%', all: '+51%', dep: 107, note: 'У artempankra +130%.' },
  WY: { n: 'Вайоминг', tier: 'test', now: '+80%', sep: '+114%', all: '+129%', dep: 72, note: 'Мало спенда, но всегда плюс.' },
  MA: { n: 'Массачусетс', tier: 'test', now: '+50%', sep: '+73%', all: '+84%', dep: 89, note: 'Рега дорогая ($24).' },
  OH: { n: 'Огайо', tier: 'test', now: '+39%', sep: '+56%', all: '+62%', dep: 100, note: 'Казино Hollywood сейчас +99%. У sii1m +108%.' },
  AR: { n: 'Арканзас', tier: 'test', now: '+38%', sep: '+53%', all: '+48%', dep: 110, note: 'Казино OAKHS сейчас +162%.' },
  NC: { n: 'Сев. Каролина', tier: 'test', now: '+38%', sep: '+22%', all: '+48%', dep: 109, note: 'Казино HCC сейчас +41%.' },
  KY: { n: 'Кентукки', tier: 'test', now: '+33%', sep: '+39%', all: '+48%', dep: 110, note: 'Oak Grove +36%, TMGH около нуля.' },
  MS: { n: 'Миссисипи', tier: 'test', now: '+36%', sep: '−5%', all: '+44%', dep: 113, note: 'У artempankra +135%.' },
  NY: { n: 'Нью-Йорк', tier: 'watch', now: '+23%', sep: '+40%', all: '+57%', dep: 103, note: 'Самый залитый штат команды (14 баеров). Лучше по городам: Buffalo.' },
  TX: { n: 'Техас', tier: 'watch', now: '+26%', sep: '+55%', all: '+57%', dep: 103, note: 'LLCC сейчас +65%, KLECH −18%.' },
  CO: { n: 'Колорадо', tier: 'watch', now: '+26%', sep: '+70%', all: '+56%', dep: 104, note: '' },
  WI: { n: 'Висконсин', tier: 'watch', now: '+29%', sep: '+109%', all: '+66%', dep: 99, note: 'В сентябре огонь, сейчас тише.' },
  PA: { n: 'Пенсильвания', tier: 'watch', now: '+28%', sep: '+54%', all: '+34%', dep: 121, note: '' },
  KS: { n: 'Канзас', tier: 'watch', now: '+25%', sep: '+88%', all: '+73%', dep: 94, note: 'Harrah сейчас −41%, хотя в сентябре +101%.' },
  OK: { n: 'Оклахома', tier: 'watch', now: '+16%', sep: '+17%', all: '+40%', dep: 117, note: 'Выгорает.' },
  UT: { n: 'Юта', tier: 'watch', now: '+17%', sep: '+210%', all: '+111%', dep: 77, note: 'В сентябре +210%, сейчас выгорела.' },
  DE: { n: 'Делавэр', tier: 'watch', now: '+28%', sep: '+27%', all: '+20%', dep: 141, note: 'Дорогой деп.' },
  AL: { n: 'Алабама', tier: 'stop', now: '−39%', sep: '+52%', all: '+53%', dep: 108, note: 'Выжжена: в октябре лили 17 баеров.' },
  MI: { n: 'Мичиган', tier: 'stop', now: '−35%', sep: '+51%', all: '+46%', dep: 111, note: 'Резко сел.' },
  IA: { n: 'Айова', tier: 'stop', now: '−38%', sep: '+40%', all: '+45%', dep: 113, note: 'Резко сел.' },
  SC: { n: 'Юж. Каролина', tier: 'stop', now: '−27%', sep: '+66%', all: '+49%', dep: 109, note: '' },
  IL: { n: 'Иллинойс', tier: 'stop', now: '−42%', sep: '+44%', all: '+27%', dep: 129, note: '' },
  LA: { n: 'Луизиана', tier: 'stop', now: '+9%', sep: '+61%', all: '+44%', dep: 113, note: 'Если лить — только L\'Auberge (+84%).' },
  FL: { n: 'Флорида', tier: 'stop', now: '+3%', sep: '+68%', all: '+38%', dep: 117, note: 'Seminole +52%, остальное слабо.' },
  WA: { n: 'Вашингтон', tier: 'stop', now: '+3%', sep: '+88%', all: '+75%', dep: 93, note: 'В сентябре огонь, сейчас ноль.' },
  MN: { n: 'Миннесота', tier: 'stop', now: '+5%', sep: '+84%', all: '+60%', dep: 103, note: 'Сейчас около нуля.' },
  AK: { n: 'Аляска', tier: 'stop', now: '+8%', sep: '+118%', all: '+101%', dep: 82, note: 'Сейчас около нуля.' },
  ME: { n: 'Мэн', tier: 'stop', now: '+15%', sep: '+79%', all: '+63%', dep: 102, note: 'Oxford −60%.' },
  MT: { n: 'Монтана', tier: 'stop', now: '−6%', sep: '+57%', all: '+38%', dep: 115, note: '' },
  CA: { n: 'Калифорния', tier: 'stop', now: '+4%', sep: '−2%', all: '0%', dep: 163, note: 'Ноль весь период.' },
  NV: { n: 'Невада', tier: 'stop', now: '+20%', sep: '+11%', all: '+12%', dep: 143, note: 'Дорогой деп.' },
  NJ: { n: 'Нью-Джерси', tier: 'stop', now: '−49%', sep: '−22%', all: '−13%', dep: 192, note: 'Не лить.' },
  VA: { n: 'Вирджиния', tier: 'stop', now: '−100%', sep: '−22%', all: '−39%', dep: 269, note: 'Не лить.' },
  CT: { n: 'Коннектикут', tier: 'stop', now: '+41%', sep: '−58%', all: '−20%', dep: 200, note: 'Не лить.' },
  RI: { n: 'Род-Айленд', tier: 'stop', now: '−59%', sep: '−70%', all: '−38%', dep: 263, note: 'Не лить.' },
  HI: { n: 'Гавайи', tier: 'stop', now: '−100%', sep: '+17%', all: '+26%', dep: 132, note: 'Не лить.' },
  ND: { n: 'Сев. Дакота', tier: 'stop', now: '−100%', sep: '+69%', all: '+50%', dep: 110, note: 'Мало данных, в октябре минус.' },
  NE: { n: 'Небраска', tier: 'stop', now: '−30%', sep: '+144%', all: '+101%', dep: 82, note: 'Мало данных.' },
  NH: { n: 'Нью-Гэмпшир', tier: 'watch', now: '+197%', sep: '+87%', all: '+70%', dep: 97, note: 'Очень мало спенда.' },
  VT: { n: 'Вермонт', tier: 'watch', now: '—', sep: '+111%', all: '+113%', dep: 78, note: 'Очень мало спенда.' },
  MD: { n: 'Мэриленд', tier: 'stop', now: '+10%', sep: '+68%', all: '+51%', dep: 108, note: '' },
  OR: { n: 'Орегон', tier: 'watch', now: '+17%', sep: '+76%', all: '+37%', dep: 115, note: '' }
};
FD.TIER = { go: ['ЛИТЬ ПЕРВЫМ', 'good'], test: ['ТЕСТИТЬ СРОЧНО', 'acc'], watch: ['МОЖНО, СЛЕДИ', 'warn'], stop: ['ОСТОРОЖНО', 'kill'] };

FD.CASINOS = [
  ['AMERISTAR', 'MO', 142, 'сейчас', 'go'], ['OAKHS', 'AR', 162, 'сейчас', 'go'], ['MOUC', 'WV', 108, 'сейчас', 'go'], ['CDC', 'ID', 104, 'сейчас', 'go'],
  ['HOLLYWOOD', 'OH', 99, 'сейчас', 'go'], ['CASAR', 'AZ', 99, 'сейчас', 'go'], ['LAUBERGE', 'LA', 84, 'сейчас', 'go'], ['TLADC', 'SD', 83, 'сейчас', 'go'],
  ['LLCC', 'TX', 65, 'сейчас', 'go'], ['HORSESHOE', 'IN', 57, 'сейчас', 'go'], ['SMNLE', 'FL', 52, 'сейчас', 'go'], ['FLG', 'NY', 47, 'сейчас', 'go'],
  ['HCC', 'NC', 41, 'сейчас', 'watch'], ['OAKGROVE', 'KY', 36, 'сейчас', 'watch'], ['NQ', 'WA', 25, 'сейчас', 'watch'],
  ['FRLICK', 'IN', -18, 'сейчас', 'stop'], ['KLECH', 'TX', -18, 'сейчас', 'stop'], ['LCCR', 'WA', -33, 'сейчас', 'stop'], ['SHRH', 'FL', -33, 'сейчас', 'stop'],
  ['SRE', 'MI', -35, 'сейчас', 'stop'], ['HARRAH', 'KS', -41, 'сейчас', 'stop'], ['OXFCAS', 'ME', -60, 'сейчас', 'stop'], ['NC', 'TX', -66, 'сейчас', 'stop']
];
FD.STORIES = [
  ['STORY-9', '21 баер, 50 штатов', '+85%'],
  ['STORY-162', 'artempankra и др., $42k', '+94%'],
  ['STORY (ED) / STORY2', 'Endless Dream, Иван', '+143% / +121%'],
  ['STORY-33 / 78', 'Endless Dream', '+98%'],
  ['STORY-13 / 494', 'Иван, sii1m', '+87% / +85%'],
  ['STORY-343', 'Evg_1989', '+70%'],
  ['STORY-153 / 920', 'ты', '+106% / +211%'],
  ['STORY-7 / 75 / 127 / 340 / 640', 'слабые', '+13…+38%'],
  ['NEURO / EDIT', 'не лить', '−30…−36%']
];
FD.TEAM = { hit: [7, 23, 52, 89, 99], drop: [25, 49, 84], firstDep: [45, 82, 140, 212],
  regRoi: [[10, 84], [14, 118], [18, 74], [22, 39], [30, 12], [1e9, -20]],
  marketNow: 31, marketEarly: 77 };
