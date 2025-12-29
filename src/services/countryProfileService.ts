import { formatDateTime } from '../shared/time.js';
import type { Country } from '../discord/features/settings/countriesView.js';
import { prisma } from '../database/prisma.js';

type CountryFacts = {
  ruler: string;
  territory: string;
  population: string;
};

export type CountryProfile = CountryFacts & {
  registeredUserId?: string;
  registeredAt?: Date;
};

const FALLBACK_FACTS: CountryFacts = {
  ruler: 'Уточните действующего главу государства вручную.',
  territory: 'Уточните площадь территории в актуальных данных.',
  population: 'Уточните численность населения по последним данным.'
};

const DEFAULT_FACTS: Record<string, CountryFacts> = {
  'албания': { ruler: 'Президент Байрам Бегай', territory: '28 748 км²', population: '≈2 800 000 человек' },
  'андорра': {
    ruler: 'Соправители Эмманюэль Макрон и Жоан-Энрик Вивес-и-Сисилья',
    territory: '468 км²',
    population: '≈80 000 человек'
  },
  'австрия': { ruler: 'Президент Александр ван дер Беллен', territory: '83 879 км²', population: '≈9 100 000 человек' },
  'беларусь': { ruler: 'Президент Александр Лукашенко', territory: '207 600 км²', population: '≈9 200 000 человек' },
  'бельгия': { ruler: 'Король Филипп', territory: '30 689 км²', population: '≈11 700 000 человек' },
  'болгария': { ruler: 'Президент Румен Радев', territory: '110 994 км²', population: '≈6 400 000 человек' },
  'босния и герцеговина': {
    ruler: 'Коллективное Президиум Боснии и Герцеговины',
    territory: '51 197 км²',
    population: '≈3 200 000 человек'
  },
  'ватикан': { ruler: 'Папа Римский Франциск', territory: '0,44 км²', population: '≈800 человек' },
  'великобритания': { ruler: 'Король Карл III', territory: '243 610 км²', population: '≈68 000 000 человек' },
  'венгрия': { ruler: 'Президент Тамаш Шуйок (и.о.)', territory: '93 030 км²', population: '≈9 600 000 человек' },
  'германия': { ruler: 'Президент Франк-Вальтер Штайнмайер', territory: '357 588 км²', population: '≈84 000 000 человек' },
  'греция': { ruler: 'Президент Катерина Сакелларопулу', territory: '131 957 км²', population: '≈10 300 000 человек' },
  'дания': { ruler: 'Король Фредерик X', territory: '42 933 км²', population: '≈5 950 000 человек' },
  'ирландия': { ruler: 'Президент Майкл Хиггинс', territory: '70 273 км²', population: '≈5 200 000 человек' },
  'исландия': { ruler: 'Президент Гудни Торласиус Йоханнессон', territory: '103 000 км²', population: '≈390 000 человек' },
  'испания': { ruler: 'Король Филипп VI', territory: '505 990 км²', population: '≈48 000 000 человек' },
  'италия': { ruler: 'Президент Серджо Маттарелла', territory: '301 340 км²', population: '≈59 000 000 человек' },
  'латвия': { ruler: 'Президент Эдгарс Ринкевичс', territory: '64 589 км²', population: '≈1 900 000 человек' },
  'литва': { ruler: 'Президент Гитанас Науседа', territory: '65 300 км²', population: '≈2 800 000 человек' },
  'лихтенштейн': { ruler: 'Князь Ханс-Адам II', territory: '160 км²', population: '≈39 000 человек' },
  'люксембург': { ruler: 'Великий герцог Анри', territory: '2 586 км²', population: '≈650 000 человек' },
  'мальта': { ruler: 'Президент Мирьям Спитери Дебоно', territory: '316 км²', population: '≈520 000 человек' },
  'молдова': { ruler: 'Президент Майя Санду', territory: '33 846 км²', population: '≈2 600 000 человек' },
  'монако': { ruler: 'Князь Альбер II', territory: '2,02 км²', population: '≈38 000 человек' },
  'нидерланды': { ruler: 'Король Виллем-Александр', territory: '41 543 км²', population: '≈17 800 000 человек' },
  'норвегия': { ruler: 'Король Харальд V', territory: '385 207 км²', population: '≈5 500 000 человек' },
  'польша': { ruler: 'Президент Анджей Дуда', territory: '312 696 км²', population: '≈37 800 000 человек' },
  'португалия': { ruler: 'Президент Марселу Ребелу де Соза', territory: '92 212 км²', population: '≈10 300 000 человек' },
  'россия': { ruler: 'Президент Владимир Путин', territory: '17 098 246 км²', population: '≈146 000 000 человек' },
  'румыния': { ruler: 'Президент Клаус Йоханнис', territory: '238 397 км²', population: '≈19 000 000 человек' },
  'сан-марино': { ruler: 'Капитаны-регенты (сменяются каждые полгода)', territory: '61 км²', population: '≈34 000 человек' },
  'северная македония': { ruler: 'Президент Стево Пендаровски', territory: '25 713 км²', population: '≈1 800 000 человек' },
  'сербия': { ruler: 'Президент Александр Вучич', territory: '88 361 км²', population: '≈6 700 000 человек' },
  'словакия': { ruler: 'Президент Зузана Чапутова', territory: '49 035 км²', population: '≈5 400 000 человек' },
  'словения': { ruler: 'Президент Наташа Пирц Мусар', territory: '20 273 км²', population: '≈2 100 000 человек' },
  'украина': { ruler: 'Президент Владимир Зеленский', territory: '603 628 км²', population: '≈36 000 000 человек' },
  'финляндия': { ruler: 'Президент Александр Стубб', territory: '338 440 км²', population: '≈5 600 000 человек' },
  'франция': { ruler: 'Президент Эмманюэль Макрон', territory: '551 695 км²', population: '≈68 000 000 человек' },
  'хорватия': { ruler: 'Президент Зоран Миланович', territory: '56 594 км²', population: '≈3 900 000 человек' },
  'черногория': { ruler: 'Президент Яков Милатович', territory: '13 812 км²', population: '≈620 000 человек' },
  'чехия': { ruler: 'Президент Петр Павел', territory: '78 866 км²', population: '≈10 700 000 человек' },
  'швейцария': {
    ruler: 'Федеральный президент 2025 года (ротационный пост, например Виола Амхерд)',
    territory: '41 285 км²',
    population: '≈8 900 000 человек'
  },
  'швеция': { ruler: 'Король Карл XVI Густав', territory: '450 295 км²', population: '≈10 500 000 человек' },
  'эстония': { ruler: 'Президент Алар Карис', territory: '45 228 км²', population: '≈1 350 000 человек' },
  'косово (частично признано)': { ruler: 'Президент Вьоса Османи', territory: '10 887 км²', population: '≈1 800 000 человек' },
  'северный кипр (частично признан)': { ruler: 'Президент Эрсин Татар', territory: '3 355 км²', population: '≈330 000 человек' },
  'абхазия (частично признана)': { ruler: 'Президент Аслан Бжания', territory: '8 660 км²', population: '≈245 000 человек' },
  'южная осетия (частично признана)': { ruler: 'Президент Алан Гагаев', territory: '3 900 км²', population: '≈55 000 человек' },
  'афганистан': {
    ruler: 'Де-факто руководство движения «Талибан», исполняющий обязанности премьер Абдулла Гани Барадар',
    territory: '652 230 км²',
    population: '≈41 000 000 человек'
  },
  'армения': { ruler: 'Премьер-министр Никол Пашинян', territory: '29 743 км²', population: '≈2 800 000 человек' },
  'азербайджан': { ruler: 'Президент Ильхам Алиев', territory: '86 600 км²', population: '≈10 200 000 человек' },
  'бахрейн': { ruler: 'Король Хамад ибн Иса Аль Халифа', territory: '765 км²', population: '≈1 800 000 человек' },
  'бангладеш': { ruler: 'Премьер-министр Шейх Хасина', territory: '148 460 км²', population: '≈170 000 000 человек' },
  'бутан': { ruler: 'Король Джигме Кхесар Намгьял Вангчук', territory: '38 394 км²', population: '≈780 000 человек' },
  'бруней': { ruler: 'Султан Хассанал Болкиах', territory: '5 765 км²', population: '≈450 000 человек' },
  'вьетнам': { ruler: 'Президент То Лам', territory: '331 212 км²', population: '≈99 000 000 человек' },
  'грузия': { ruler: 'Президент Саломе Зурабишвили', territory: '69 700 км²', population: '≈3 700 000 человек' },
  'израиль': { ruler: 'Президент Ицхак Герцог', territory: '22 145 км²', population: '≈9 700 000 человек' },
  'индия': { ruler: 'Премьер-министр Нарендра Моди', territory: '3 287 263 км²', population: '≈1 420 000 000 человек' },
  'индонезия': { ruler: 'Президент Прабово Субианто', territory: '1 904 569 км²', population: '≈280 000 000 человек' },
  'иордания': { ruler: 'Король Абдалла II', territory: '89 342 км²', population: '≈11 500 000 человек' },
  'ирак': { ruler: 'Президент Абдул Латиф Рашид', territory: '438 317 км²', population: '≈45 000 000 человек' },
  'иран': { ruler: 'Верховный лидер Али Хаменеи', territory: '1 648 195 км²', population: '≈88 000 000 человек' },
  'йемен': { ruler: 'Президентский совет (де-факто разделённая власть)', territory: '527 968 км²', population: '≈34 000 000 человек' },
  'казахстан': { ruler: 'Президент Касым-Жомарт Токаев', territory: '2 724 900 км²', population: '≈19 900 000 человек' },
  'камбоджа': { ruler: 'Король Нородом Сиамони (премьер-министр Хун Манет)', territory: '181 035 км²', population: '≈17 000 000 человек' },
  'катар': { ruler: 'Эмир Тамим бин Хамад Аль Тани', territory: '11 586 км²', population: '≈3 000 000 человек' },
  'филиппины': { ruler: 'Президент Фердинанд Маркос-младший', territory: '300 000 км²', population: '≈115 000 000 человек' },
  'китай': { ruler: 'Председатель КНР Си Цзиньпин', territory: '9 596 961 км²', population: '≈1 410 000 000 человек' },
  'кндр': { ruler: 'Генеральный секретарь Ким Чен Ын', territory: '120 540 км²', population: '≈25 800 000 человек' },
  'республика корея': { ruler: 'Президент Юн Сок Ёль', territory: '100 210 км²', population: '≈51 700 000 человек' },
  'кувейт': { ruler: 'Эмир Мишаль аль-Ахмед ас-Сабах', territory: '17 818 км²', population: '≈4 400 000 человек' },
  'кыргызстан': { ruler: 'Президент Садыр Жапаров', territory: '199 951 км²', population: '≈6 800 000 человек' },
  'лаос': { ruler: 'Президент Тхонглуен Сисулит', territory: '236 800 км²', population: '≈7 500 000 человек' },
  'ливан': { ruler: 'Исполняющий обязанности президента через кабинет министров', territory: '10 452 км²', population: '≈5 500 000 человек' },
  'малайзия': { ruler: 'Ян ди-пертуан агонг Ибрагим', territory: '330 803 км²', population: '≈34 000 000 человек' },
  'мальдивы': { ruler: 'Президент Мохамед Муаззу', territory: '298 км²', population: '≈520 000 человек' },
  'монголия': { ruler: 'Президент Ухнаагийн Хурэлсух', territory: '1 564 116 км²', population: '≈3 400 000 человек' },
  'мьянма': { ruler: 'Главнокомандующий Мин Аун Хлайн (военная хунта)', territory: '676 578 км²', population: '≈55 000 000 человек' },
  'непал': { ruler: 'Премьер-министр Пушпа Камал Дахал', territory: '147 516 км²', population: '≈30 000 000 человек' },
  'оаэ': { ruler: 'Президент Мухаммед бин Заид Аль Нахаян', territory: '83 600 км²', population: '≈10 000 000 человек' },
  'оман': { ruler: 'Султан Хайсам бин Тарик', territory: '309 500 км²', population: '≈4 700 000 человек' },
  'пакистан': { ruler: 'Президент Асиф Али Зардари', territory: '881 913 км²', population: '≈242 000 000 человек' },
  'палестина': { ruler: 'Президент Махмуд Аббас (частично признана)', territory: '6 020 км²', population: '≈5 300 000 человек' },
  'саудовская аравия': { ruler: 'Король Сальман бин Абдул-Азиз Аль Сауд', territory: '2 149 690 км²', population: '≈36 000 000 человек' },
  'сингапур': { ruler: 'Президент Тхармэн Шанмугаратнам', territory: '728 км²', population: '≈5 900 000 человек' },
  'сирия': { ruler: 'Президент Башар Асад', territory: '185 180 км²', population: '≈22 000 000 человек' },
  'таджикистан': { ruler: 'Президент Эмомали Рахмон', territory: '143 100 км²', population: '≈10 000 000 человек' },
  'таиланд': { ruler: 'Король Маха Вачиралонгкорн Рама X', territory: '513 120 км²', population: '≈70 000 000 человек' },
  'тимор-лесте': { ruler: 'Президент Жозе Рамуш-Орта', territory: '14 874 км²', population: '≈1 400 000 человек' },
  'туркменистан': { ruler: 'Президент Сердар Бердымухамедов', territory: '488 100 км²', population: '≈6 200 000 человек' },
  'турция': { ruler: 'Президент Реджеп Тайип Эрдоган', territory: '783 562 км²', population: '≈86 000 000 человек' },
  'узбекистан': { ruler: 'Президент Шавкат Мирзиёев', territory: '448 978 км²', population: '≈36 000 000 человек' },
  'шри-ланка': { ruler: 'Президент Ранил Викрамасингхе', territory: '65 610 км²', population: '≈22 000 000 человек' },
  'япония': { ruler: 'Премьер-министр Фумио Кисида', territory: '377 975 км²', population: '≈125 000 000 человек' },
  'тайвань (частично признан)': { ruler: 'Президент Лай Цинде', territory: '36 197 км²', population: '≈23 500 000 человек' },
  'антигуа и барбуда': {
    ruler: 'Генерал-губернатор Родни Уильямс (король Карл III)',
    territory: '442 км²',
    population: '≈100 000 человек'
  },
  'багамы': {
    ruler: 'Генерал-губернатор Синетта Десмон-Уильямс (король Карл III)',
    territory: '13 880 км²',
    population: '≈410 000 человек'
  },
  'барбадос': { ruler: 'Президент Сандра Мейсон', territory: '430 км²', population: '≈280 000 человек' },
  'белиз': {
    ruler: 'Генерал-губернатор Фройла Цалам (король Карл III)',
    territory: '22 966 км²',
    population: '≈420 000 человек'
  },
  'гаити': { ruler: 'Переходный совет (временно)', territory: '27 750 км²', population: '≈11 600 000 человек' },
  'гватемала': { ruler: 'Президент Бернардо Аревало', territory: '108 889 км²', population: '≈18 000 000 человек' },
  'гондурас': { ruler: 'Президент Сиомара Кастро', territory: '112 492 км²', population: '≈10 600 000 человек' },
  'гренада': {
    ruler: 'Генерал-губернатор Сесил Ла Гренье (король Карл III)',
    territory: '344 км²',
    population: '≈125 000 человек'
  },
  'доминика': { ruler: 'Президент Сильвана Бертран', territory: '751 км²', population: '≈72 000 человек' },
  'доминиканская республика': { ruler: 'Президент Луис Абинадер', territory: '48 670 км²', population: '≈11 000 000 человек' },
  'канада': {
    ruler: 'Генерал-губернатор Мэри Саймон (король Карл III)',
    territory: '9 984 670 км²',
    population: '≈40 000 000 человек'
  },
  'коста-рика': { ruler: 'Президент Родриго Чавес', territory: '51 100 км²', population: '≈5 200 000 человек' },
  'куба': { ruler: 'Президент Мигель Диас-Канель', territory: '109 884 км²', population: '≈11 200 000 человек' },
  'мексика': { ruler: 'Президент Клаудия Шейнбаум', territory: '1 964 375 км²', population: '≈129 000 000 человек' },
  'никарагуа': { ruler: 'Президент Даниэль Ортега', territory: '130 373 км²', population: '≈6 900 000 человек' },
  'панама': { ruler: 'Президент Хосе Рауль Мулино', territory: '75 417 км²', population: '≈4 400 000 человек' },
  'сальвадор': { ruler: 'Президент Найиб Букеле', territory: '21 041 км²', population: '≈6 500 000 человек' },
  'сент-винсент и гренадины': {
    ruler: 'Генерал-губернатор Сьюзан Дугган (король Карл III)',
    territory: '389 км²',
    population: '≈110 000 человек'
  },
  'сент-китс и невис': {
    ruler: 'Генерал-губернатор Марселла Лайбёрд (король Карл III)',
    territory: '261 км²',
    population: '≈50 000 человек'
  },
  'сент-люсия': {
    ruler: 'Генерал-губернатор Сирил Эррол Мельхиор (король Карл III)',
    territory: '616 км²',
    population: '≈180 000 человек'
  },
  'сша': { ruler: 'Президент Дональд Трамп', territory: '9 833 517 км²', population: '343 000 000 человек' },
  'тринидад и тобаго': { ruler: 'Президент Кристин Кармона', territory: '5 128 км²', population: '≈1 530 000 человек' },
  'ямайка': {
    ruler: 'Генерал-губернатор Патрик Аллен (король Карл III)',
    territory: '10 991 км²',
    population: '≈2 800 000 человек'
  },
  'аргентина': { ruler: 'Президент Хавьер Милей', territory: '2 780 400 км²', population: '≈46 000 000 человек' },
  'боливия': { ruler: 'Президент Луис Арсе', territory: '1 098 581 км²', population: '≈12 000 000 человек' },
  'бразилия': { ruler: 'Президент Лула да Силва', territory: '8 515 767 км²', population: '≈203 000 000 человек' },
  'венесуэла': { ruler: 'Президент Николас Мадуро', territory: '916 445 км²', population: '≈28 000 000 человек' },
  'гайана': { ruler: 'Президент Ирфан Али', territory: '214 970 км²', population: '≈800 000 человек' },
  'колумбия': { ruler: 'Президент Густаво Петро', territory: '1 141 748 км²', population: '≈52 000 000 человек' },
  'парагвай': { ruler: 'Президент Сантъяго Пенья', territory: '406 752 км²', population: '≈7 400 000 человек' },
  'перу': { ruler: 'Президент Дина Болуарте', territory: '1 285 216 км²', population: '≈34 000 000 человек' },
  'суринам': { ruler: 'Президент Чандрикаперсад Сантоки', territory: '163 820 км²', population: '≈620 000 человек' },
  'уругвай': { ruler: 'Президент Луис Лакалье Поу', territory: '176 215 км²', population: '≈3 500 000 человек' },
  'чили': { ruler: 'Президент Габриэль Борич', territory: '756 102 км²', population: '≈19 700 000 человек' },
  'эквадор': { ruler: 'Президент Даниэль Нобоа', territory: '276 841 км²', population: '≈18 300 000 человек' },
  'алжир': { ruler: 'Президент Абдельмаджид Теббун', territory: '2 381 741 км²', population: '≈45 000 000 человек' },
  'ангола': { ruler: 'Президент Жуан Лоренсу', territory: '1 246 700 км²', population: '≈36 000 000 человек' },
  'бенин': { ruler: 'Президент Патрис Талон', territory: '114 763 км²', population: '≈13 000 000 человек' },
  'ботсвана': { ruler: 'Президент Мокгвицеси Масиси', territory: '581 730 км²', population: '≈2 600 000 человек' },
  'буркина-фасо': { ruler: 'Переходный президент Ибрагим Траоре', territory: '274 200 км²', population: '≈22 000 000 человек' },
  'бурунди': { ruler: 'Президент Эварист Ндайишимие', territory: '27 834 км²', population: '≈12 000 000 человек' },
  'габон': { ruler: 'Переходный президент Брис Олигий Нгема', territory: '267 668 км²', population: '≈2 300 000 человек' },
  'гамбия': { ruler: 'Президент Адама Бэрроу', territory: '11 295 км²', population: '≈2 700 000 человек' },
  'гана': { ruler: 'Президент Нана Акуфо-Аддо', territory: '238 533 км²', population: '≈33 000 000 человек' },
  'гвинея': { ruler: 'Переходный президент Мамади Думбуя', territory: '245 857 км²', population: '≈14 000 000 человек' },
  'гвинея-бисау': { ruler: 'Президент Умару Сиссоку Эмбало', territory: '36 125 км²', population: '≈2 000 000 человек' },
  'джибути': { ruler: 'Президент Исмаил Омар Гелле', territory: '23 200 км²', population: '≈1 000 000 человек' },
  'египет': { ruler: 'Президент Абдель Фаттах ас-Сиси', territory: '1 002 450 км²', population: '≈110 000 000 человек' },
  'замбия': { ruler: 'Президент Хакайинде Хичилема', territory: '752 618 км²', population: '≈20 000 000 человек' },
  'зимбабве': { ruler: 'Президент Эммерсон Мнангагва', territory: '390 757 км²', population: '≈16 000 000 человек' },
  'кабо-верде': { ruler: 'Президент Жозе Мария Невеш', territory: '4 033 км²', population: '≈560 000 человек' },
  'камерун': { ruler: 'Президент Поль Бийя', territory: '475 442 км²', population: '≈28 000 000 человек' },
  'кения': { ruler: 'Президент Уильям Руто', territory: '580 367 км²', population: '≈55 000 000 человек' },
  'коморы': { ruler: 'Президент Азали Ассумани', territory: '2 235 км²', population: '≈870 000 человек' },
  'конго (республика)': { ruler: 'Президент Дени Сассу-Нгессо', territory: '342 000 км²', population: '≈5 900 000 человек' },
  'конго (др конго)': { ruler: 'Президент Феликс Чисекеди', territory: '2 344 858 км²', population: '≈100 000 000 человек' },
  'кот-д’ивуар': { ruler: 'Президент Алассан Уаттара', territory: '322 463 км²', population: '≈28 000 000 человек' },
  'лесото': { ruler: 'Король Летсие III', territory: '30 355 км²', population: '≈2 300 000 человек' },
  'либерия': { ruler: 'Президент Джозеф Бойкай', territory: '111 369 км²', population: '≈5 300 000 человек' },
  'ливия': { ruler: 'Переходное правительство национального единства', territory: '1 759 540 км²', population: '≈7 000 000 человек' },
  'маврикий': { ruler: 'Президент Притхвираджсинг Рупун', territory: '2 040 км²', population: '≈1 300 000 человек' },
  'мавритания': { ruler: 'Президент Мохамед ульд Газуани', territory: '1 030 700 км²', population: '≈4 800 000 человек' },
  'мадагаскар': { ruler: 'Президент Андри Радзуэлина', territory: '587 041 км²', population: '≈30 000 000 человек' },
  'малави': { ruler: 'Президент Лазарус Чаквера', territory: '118 484 км²', population: '≈20 000 000 человек' },
  'мали': { ruler: 'Переходный президент Ассими Гойта', territory: '1 240 192 км²', population: '≈21 000 000 человек' },
  'марокко': { ruler: 'Король Мохаммед VI', territory: '710 850 км²', population: '≈37 000 000 человек' },
  'мозамбик': { ruler: 'Президент Филипе Ньюси', territory: '801 590 км²', population: '≈33 000 000 человек' },
  'намибия': { ruler: 'Президент Нанголо Мбумба', territory: '825 615 км²', population: '≈2 700 000 человек' },
  'нигер': { ruler: 'Национальный совет по защите родины (переходное правительство)', territory: '1 267 000 км²', population: '≈26 000 000 человек' },
  'нигерия': { ruler: 'Президент Бола Тинубу', territory: '923 768 км²', population: '≈220 000 000 человек' },
  'руанда': { ruler: 'Президент Поль Кагаме', territory: '26 338 км²', population: '≈13 000 000 человек' },
  'сан-томе и принсипи': { ruler: 'Президент Карлуш Виейра', territory: '964 км²', population: '≈220 000 человек' },
  'сейшелы': { ruler: 'Президент Вавел Рамкалаван', territory: '459 км²', population: '≈100 000 человек' },
  'сенегал': { ruler: 'Президент Бассира Диомай Файе', territory: '196 722 км²', population: '≈18 000 000 человек' },
  'сомали': { ruler: 'Президент Хассан Шейх Мохамуд', territory: '637 657 км²', population: '≈17 000 000 человек' },
  'сомалиленд (частично признан)': { ruler: 'Президент Мусе Бихи Абди', territory: '176 120 км²', population: '≈5 700 000 человек' },
  'судан': { ruler: 'Переходный Суверенный совет (военный конфликт)', territory: '1 861 484 км²', population: '≈49 000 000 человек' },
  'сьерра-леоне': { ruler: 'Президент Юлиус Мада Био', territory: '71 740 км²', population: '≈8 800 000 человек' },
  'танзания': { ruler: 'Президент Самия Сулуху Хасан', territory: '947 303 км²', population: '≈65 000 000 человек' },
  'того': { ruler: 'Президент Фор Гнассингбе', territory: '56 785 км²', population: '≈9 000 000 человек' },
  'тунис': { ruler: 'Президент Каис Саид', territory: '163 610 км²', population: '≈12 000 000 человек' },
  'уганда': { ruler: 'Президент Йовери Мусевени', territory: '241 038 км²', population: '≈49 000 000 человек' },
  'цар': { ruler: 'Президент Фостен-Арканж Туадера', territory: '622 984 км²', population: '≈5 600 000 человек' },
  'чад': { ruler: 'Переходный президент Махамат Деби', territory: '1 284 000 км²', population: '≈18 000 000 человек' },
  'экваториальная гвинея': { ruler: 'Президент Теодоро Обианг Нгема Мбасого', territory: '28 051 км²', population: '≈1 700 000 человек' },
  'эритрея': { ruler: 'Президент Исайяс Афеворки', territory: '117 600 км²', population: '≈3 700 000 человек' },
  'эсватини': { ruler: 'Король Мсвати III', territory: '17 364 км²', population: '≈1 200 000 человек' },
  'эфиопия': { ruler: 'Премьер-министр Абий Ахмед', territory: '1 104 300 км²', population: '≈120 000 000 человек' },
  'юар': { ruler: 'Президент Сирил Рамафоса', territory: '1 221 037 км²', population: '≈60 000 000 человек' },
  'южный судан': { ruler: 'Президент Сальва Киир', territory: '619 745 км²', population: '≈11 000 000 человек' },
  'садр / западная сахара (частично признана)': { ruler: 'Президент Брахим Гали', territory: '266 000 км²', population: '≈600 000 человек' },
  'австралия': {
    ruler: 'Генерал-губернатор Дэвид Херли (король Карл III)',
    territory: '7 692 024 км²',
    population: '≈26 700 000 человек'
  },
  'вануату': { ruler: 'Президент Норберт Легран', territory: '12 189 км²', population: '≈330 000 человек' },
  'кирибати': { ruler: 'Президент Танети Маамау', territory: '811 км²', population: '≈120 000 человек' },
  'маршалловы острова': { ruler: 'Президент Хилда Хайне', territory: '181 км²', population: '≈60 000 человек' },
  'микронезия': { ruler: 'Президент Уэсли Симеон', territory: '702 км²', population: '≈100 000 человек' },
  'науру': { ruler: 'Президент Дэвид Адианг', territory: '21 км²', population: '≈13 000 человек' },
  'новая зеландия': {
    ruler: 'Генерал-губернатор Синди Киро (король Карл III)',
    territory: '268 838 км²',
    population: '≈5 200 000 человек'
  },
  'палау': { ruler: 'Президент Сурангел Уипс младший', territory: '459 км²', population: '≈18 000 человек' },
  'папуа — новая гвинея': {
    ruler: 'Генерал-губернатор Боб Дадаэ (король Карл III)',
    territory: '462 840 км²',
    population: '≈10 300 000 человек'
  },
  'самоа': { ruler: 'Глава государства Афио Матуатуфа Сайли Туималеалифано', territory: '2 842 км²', population: '≈225 000 человек' },
  'соломоновы острова': {
    ruler: 'Генерал-губернатор Дэвид Вуньеги (король Карл III)',
    territory: '28 896 км²',
    population: '≈730 000 человек'
  },
  'тонга': { ruler: 'Король Тупоу VI', territory: '747 км²', population: '≈105 000 человек' },
  'тувалу': { ruler: 'Генерал-губернатор Тофинга Фафоа (король Карл III)', territory: '26 км²', population: '≈11 000 человек' },
  'фиджи': { ruler: 'Президент Рату Вилиями Катонивере', territory: '18 274 км²', population: '≈940 000 человек' },
  'острова кука': { ruler: 'Представитель короны Том Марстерс (король Карл III)', territory: '236 км²', population: '≈18 000 человек' },
  'ниуэ': { ruler: 'Премьер-министр Далтон Тагелаги', territory: '261 км²', population: '≈1 600 человек' }
};

const profiles = new Map<string, CountryProfile>();

function normalizeCountryKey(countryName: string): string {
  return countryName.trim().toLowerCase();
}

function buildKey(guildId: string, countryName: string): string {
  return `${guildId}:${normalizeCountryKey(countryName)}`;
}

function sanitizePopulation(value: string): string {
  return value.replace(/[≈~]/g, '').replace(/\s{2,}/g, ' ').trim();
}

function sanitizeRulerName(value: string): string {
  const roleKeywords = [
    'президент',
    'премьер-министр',
    'премьер министр',
    'король',
    'королева',
    'султан',
    'эмир',
    'князь',
    'капитаны-регенты',
    'папа римский',
    'великий герцог',
    'председатель кнр',
    'генеральный секретарь',
    'президентский совет',
    'глава государства',
    'генерал-губернатор',
    'ян ди-пертуан агонг',
    'верховный лидер',
    'представитель короны',
    'соправители',
    'коллективное президиум',
    'переходный президент',
    'переходный суверенный совет',
    'национальный совет',
    'главнокомандующий',
    'исполняющий обязанности',
    'де-факто руководство',
    'совет',
    'комитет',
    'глава'
  ];

  let cleaned = value.replace(/\([^)]*\)/g, '').trim();

  for (const keyword of roleKeywords) {
    const prefix = new RegExp(`^${keyword}\s+`, 'i');
    cleaned = cleaned.replace(prefix, '').trim();
  }

  return cleaned.replace(/^(?:[-–—]\s*)/, '').trim();
}

function sanitizeCountryFacts(facts: CountryFacts): CountryFacts {
  return {
    ruler: sanitizeRulerName(facts.ruler),
    territory: facts.territory.trim(),
    population: sanitizePopulation(facts.population)
  };
}

function getDefaultFacts(country: Country): CountryFacts {
  const defaults = DEFAULT_FACTS[normalizeCountryKey(country.name)] ?? FALLBACK_FACTS;
  return sanitizeCountryFacts(defaults);
}

function mapRecordToProfile(record: {
  ruler: string;
  territory: string;
  population: string;
  registeredUserId: bigint | null;
  registeredAt: Date | null;
}): CountryProfile {
  return {
    ruler: sanitizeRulerName(record.ruler),
    territory: record.territory.trim(),
    population: sanitizePopulation(record.population),
    registeredUserId: record.registeredUserId ? record.registeredUserId.toString() : undefined,
    registeredAt: record.registeredAt ?? undefined
  };
}

export async function getCountryProfile(guildId: string, country: Country): Promise<CountryProfile> {
  const cacheKey = buildKey(guildId, country.name);
  const cached = profiles.get(cacheKey);

  if (cached) return cached;

  const normalizedName = normalizeCountryKey(country.name);

  const stored = await prisma.countryProfile.findUnique({
    where: {
      guildId_countryName: {
        guildId: BigInt(guildId),
        countryName: normalizedName
      }
    }
  });

  const profile = stored ? mapRecordToProfile(stored) : getDefaultFacts(country);
  profiles.set(cacheKey, profile);
  return profile;
}

export async function updateCountryProfile(
  guildId: string,
  country: Country,
  updates: Partial<Pick<CountryProfile, 'ruler' | 'territory' | 'population'>>,
  userId?: string
): Promise<CountryProfile> {
  const normalizedName = normalizeCountryKey(country.name);
  const defaults = getDefaultFacts(country);
  const sanitizedUpdates: Partial<CountryFacts> = {
    ruler: updates.ruler ? sanitizeRulerName(updates.ruler) : undefined,
    territory: updates.territory?.trim(),
    population: updates.population ? sanitizePopulation(updates.population) : undefined
  };

  const now = new Date();

  const stored = await prisma.countryProfile.upsert({
    where: {
      guildId_countryName: {
        guildId: BigInt(guildId),
        countryName: normalizedName
      }
    },
    update: {
      ...sanitizedUpdates,
      registeredUserId: userId ? BigInt(userId) : undefined,
      registeredAt: userId ? now : undefined
    },
    create: {
      guildId: BigInt(guildId),
      countryName: normalizedName,
      ruler: sanitizedUpdates.ruler ?? defaults.ruler,
      territory: sanitizedUpdates.territory ?? defaults.territory,
      population: sanitizedUpdates.population ?? defaults.population,
      registeredUserId: userId ? BigInt(userId) : undefined,
      registeredAt: userId ? now : undefined
    }
  });

  const profile = mapRecordToProfile(stored);
  profiles.set(buildKey(guildId, country.name), profile);
  return profile;
}

export async function resetCountryProfile(guildId: string, country: Country): Promise<CountryProfile> {
  const normalizedName = normalizeCountryKey(country.name);

  await prisma.countryProfile.deleteMany({
    where: {
      guildId: BigInt(guildId),
      countryName: normalizedName
    }
  });

  const defaults = getDefaultFacts(country);
  profiles.set(buildKey(guildId, country.name), defaults);
  return defaults;
}

export function formatRegistration(profile: CountryProfile): string {
  if (!profile.registeredAt) return '`-`';
  return `\`${formatDateTime(profile.registeredAt)}\``;
}