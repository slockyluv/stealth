import type { Prisma, PrismaClient } from '@prisma/client';
import { formatDateTime } from '../shared/time.js';
import type { Country } from '../discord/features/settings/countriesView.js';
import { prisma } from '../database/prisma.js';

type CountryFacts = {
  ruler: string;
  territory: string;
  population: string;
};

type CountryPolitics = {
  ideology?: string;
  governmentForm?: string;
  stateStructure?: string;
  religion?: string;
};

type CountryEconomy = {
  budget: bigint;
};

export type CountryProfile = CountryFacts &
  CountryPolitics &
  CountryEconomy & {
    registeredUserId?: string;
    registeredAt?: Date;
  };

type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient;

const FALLBACK_FACTS: CountryFacts = {
  ruler: 'Неизвестно',
  territory: 'Неизвестно',
  population: 'Неизвестно'
};

const DEFAULT_POLITICS: Required<CountryPolitics> = {
  ideology: 'Не выбрано',
  governmentForm: 'Не выбрана',
  stateStructure: 'Не выбрано',
  religion: 'Не выбрана'
};

const DEFAULT_BUDGET = 0n;

function getDbClient(db?: PrismaClientOrTransaction): PrismaClientOrTransaction {
  return db ?? prisma;
}

const RAW_DEFAULT_FACTS: Record<string, CountryFacts> = {
  'Албания': { ruler: 'Байрам Бегай', territory: '28 748 км²', population: '2 800 000 человек' },
  'Андорра': { ruler: 'Эмманюэль Макрон и Жоан-Энрик Вивес-и-Сисилья', territory: '468 км²', population: '80 000 человек' },
  'Австрия': { ruler: 'Александр ван дер Беллен', territory: '83 879 км²', population: '9 100 000 человек' },
  'Беларусь': { ruler: 'Александр Лукашенко', territory: '207 600 км²', population: '9 200 000 человек' },
  'Бельгия': { ruler: 'Филипп', territory: '30 689 км²', population: '11 700 000 человек' },
  'Болгария': { ruler: 'Румен Радев', territory: '110 994 км²', population: '6 400 000 человек' },
  'Босния и герцеговина': { ruler: 'Желько Комшич', territory: '51 197 км²', population: '3 200 000 человек' },
  'Ватикан': { ruler: 'Франциск', territory: '0,44 км²', population: '800 человек' },
  'Великобритания': { ruler: 'Карл III', territory: '243 610 км²', population: '68 000 000 человек' },
  'Венгрия': { ruler: 'Тамаш Шуйок', territory: '93 030 км²', population: '9 600 000 человек' },
  'Германия': { ruler: 'Франк-Вальтер Штайнмайер', territory: '357 588 км²', population: '84 000 000 человек' },
  'Греция': { ruler: 'Катерина Сакелларопулу', territory: '131 957 км²', population: '10 300 000 человек' },
  'Дания': { ruler: 'Фредерик X', territory: '42 933 км²', population: '5 950 000 человек' },
  'Ирландия': { ruler: 'Майкл Хиггинс', territory: '70 273 км²', population: '5 200 000 человек' },
  'Исландия': { ruler: 'Гудни Торласиус Йоханнессон', territory: '103 000 км²', population: '390 000 человек' },
  'Испания': { ruler: 'Филипп VI', territory: '505 990 км²', population: '48 000 000 человек' },
  'Италия': { ruler: 'Серджо Маттарелла', territory: '301 340 км²', population: '59 000 000 человек' },
  'Латвия': { ruler: 'Эдгарс Ринкевичс', territory: '64 589 км²', population: '1 900 000 человек' },
  'Литва': { ruler: 'Гитанас Науседа', territory: '65 300 км²', population: '2 800 000 человек' },
  'Лихтенштейн': { ruler: 'Ханс-Адам II', territory: '160 км²', population: '39 000 человек' },
  'Люксембург': { ruler: 'Анри', territory: '2 586 км²', population: '650 000 человек' },
  'Мальта': { ruler: 'Мирьям Спитери Дебоно', territory: '316 км²', population: '520 000 человек' },
  'Молдова': { ruler: 'Майя Санду', territory: '33 846 км²', population: '2 600 000 человек' },
  'Монако': { ruler: 'Альбер II', territory: '2,02 км²', population: '38 000 человек' },
  'Нидерланды': { ruler: 'Виллем-Александр', territory: '41 543 км²', population: '17 800 000 человек' },
  'Норвегия': { ruler: 'Харальд V', territory: '385 207 км²', population: '5 500 000 человек' },
  'Польша': { ruler: 'Анджей Дуда', territory: '312 696 км²', population: '37 800 000 человек' },
  'Португалия': { ruler: 'Марселу Ребелу де Соза', territory: '92 212 км²', population: '10 300 000 человек' },
  'Россия': { ruler: 'Владимир Путин', territory: '17 098 246 км²', population: '146 000 000 человек' },
  'Румыния': { ruler: 'Клаус Йоханнис', territory: '238 397 км²', population: '19 000 000 человек' },
  'Сан-марино': { ruler: 'Филиппо Таманьини и Гаэтано Тройна', territory: '61 км²', population: '34 000 человек' },
  'Северная македония': { ruler: 'Стево Пендаровски', territory: '25 713 км²', population: '1 800 000 человек' },
  'Сербия': { ruler: 'Александр Вучич', territory: '88 361 км²', population: '6 700 000 человек' },
  'Словакия': { ruler: 'Зузана Чапутова', territory: '49 035 км²', population: '5 400 000 человек' },
  'Словения': { ruler: 'Наташа Пирц Мусар', territory: '20 273 км²', population: '2 100 000 человек' },
  'Украина': { ruler: 'Владимир Зеленский', territory: '603 628 км²', population: '36 000 000 человек' },
  'Финляндия': { ruler: 'Александр Стубб', territory: '338 440 км²', population: '5 600 000 человек' },
  'Франция': { ruler: 'Эмманюэль Макрон', territory: '551 695 км²', population: '68 000 000 человек' },
  'Хорватия': { ruler: 'Зоран Миланович', territory: '56 594 км²', population: '3 900 000 человек' },
  'Черногория': { ruler: 'Яков Милатович', territory: '13 812 км²', population: '620 000 человек' },
  'Чехия': { ruler: 'Петр Павел', territory: '78 866 км²', population: '10 700 000 человек' },
  'Швейцария': { ruler: 'Виола Амхерд', territory: '41 285 км²', population: '8 900 000 человек' },
  'Швеция': { ruler: 'Карл XVI Густав', territory: '450 295 км²', population: '10 500 000 человек' },
  'Эстония': { ruler: 'Алар Карис', territory: '45 228 км²', population: '1 350 000 человек' },
  'Косово (частично признано)': { ruler: 'Вьоса Османи', territory: '10 887 км²', population: '1 800 000 человек' },
  'Северный кипр (частично признан)': { ruler: 'Эрсин Татар', territory: '3 355 км²', population: '330 000 человек' },
  'Абхазия (частично признана)': { ruler: 'Аслан Бжания', territory: '8 660 км²', population: '245 000 человек' },
  'Южная осетия (частично признана)': { ruler: 'Алан Гагаев', territory: '3 900 км²', population: '55 000 человек' },
  'Афганистан': { ruler: 'Абдул Гани Барадар', territory: '652 230 км²', population: '41 000 000 человек' },
  'Армения': { ruler: 'Никол Пашинян', territory: '29 743 км²', population: '2 800 000 человек' },
  'Азербайджан': { ruler: 'Ильхам Алиев', territory: '86 600 км²', population: '10 200 000 человек' },
  'Бахрейн': { ruler: 'Хамад ибн Иса Аль Халифа', territory: '765 км²', population: '1 800 000 человек' },
  'Бангладеш': { ruler: 'Шейх Хасина', territory: '148 460 км²', population: '170 000 000 человек' },
  'Бутан': { ruler: 'Джигме Кхесар Намгьял Вангчук', territory: '38 394 км²', population: '780 000 человек' },
  'Бруней': { ruler: 'Хассанал Болкиах', territory: '5 765 км²', population: '450 000 человек' },
  'Вьетнам': { ruler: 'То Лам', territory: '331 212 км²', population: '99 000 000 человек' },
  'Грузия': { ruler: 'Саломе Зурабишвили', territory: '69 700 км²', population: '3 700 000 человек' },
  'Израиль': { ruler: 'Ицхак Герцог', territory: '22 145 км²', population: '9 700 000 человек' },
  'Индия': { ruler: 'Нарендра Моди', territory: '3 287 263 км²', population: '1 420 000 000 человек' },
  'Индонезия': { ruler: 'Прабово Субианто', territory: '1 904 569 км²', population: '280 000 000 человек' },
  'Иордания': { ruler: 'Абдалла II', territory: '89 342 км²', population: '11 500 000 человек' },
  'Ирак': { ruler: 'Абдул Латиф Рашид', territory: '438 317 км²', population: '45 000 000 человек' },
  'Иран': { ruler: 'Али Хаменеи', territory: '1 648 195 км²', population: '88 000 000 человек' },
  'Йемен': { ruler: 'Рашад аль-Алими', territory: '527 968 км²', population: '34 000 000 человек' },
  'Казахстан': { ruler: 'Касым-Жомарт Токаев', territory: '2 724 900 км²', population: '19 900 000 человек' },
  'Камбоджа': { ruler: 'Нородом Сиамони', territory: '181 035 км²', population: '17 000 000 человек' },
  'Катар': { ruler: 'Тамим бин Хамад Аль Тани', territory: '11 586 км²', population: '3 000 000 человек' },
  'Филиппины': { ruler: 'Фердинанд Маркос-младший', territory: '300 000 км²', population: '115 000 000 человек' },
  'Китай': { ruler: 'Си Цзиньпин', territory: '9 596 961 км²', population: '1 410 000 000 человек' },
  'Кндр': { ruler: 'Ким Чен Ын', territory: '120 540 км²', population: '25 800 000 человек' },
  'Республика корея': { ruler: 'Юн Сок Ёль', territory: '100 210 км²', population: '51 700 000 человек' },
  'Кувейт': { ruler: 'Мишаль аль-Ахмед ас-Сабах', territory: '17 818 км²', population: '4 400 000 человек' },
  'Кыргызстан': { ruler: 'Садыр Жапаров', territory: '199 951 км²', population: '6 800 000 человек' },
  'Лаос': { ruler: 'Тхонглуен Сисулит', territory: '236 800 км²', population: '7 500 000 человек' },
  'Ливан': { ruler: 'Наджиб Микати', territory: '10 452 км²', population: '5 500 000 человек' },
  'Малайзия': { ruler: 'Ибрагим', territory: '330 803 км²', population: '34 000 000 человек' },
  'Мальдивы': { ruler: 'Мохамед Муаззу', territory: '298 км²', population: '520 000 человек' },
  'Монголия': { ruler: 'Ухнаагийн Хурэлсух', territory: '1 564 116 км²', population: '3 400 000 человек' },
  'Мьянма': { ruler: 'Мин Аун Хлайн', territory: '676 578 км²', population: '55 000 000 человек' },
  'Непал': { ruler: 'Пушпа Камал Дахал', territory: '147 516 км²', population: '30 000 000 человек' },
  'Оаэ': { ruler: 'Мухаммед бин Заид Аль Нахаян', territory: '83 600 км²', population: '10 000 000 человек' },
  'Оман': { ruler: 'Хайсам бин Тарик', territory: '309 500 км²', population: '4 700 000 человек' },
  'Пакистан': { ruler: 'Асиф Али Зардари', territory: '881 913 км²', population: '242 000 000 человек' },
  'Палестина': { ruler: 'Махмуд Аббас', territory: '6 020 км²', population: '5 300 000 человек' },
  'Саудовская аравия': { ruler: 'Сальман бин Абдул-Азиз Аль Сауд', territory: '2 149 690 км²', population: '36 000 000 человек' },
  'Сингапур': { ruler: 'Тхармэн Шанмугаратнам', territory: '728 км²', population: '5 900 000 человек' },
  'Сирия': { ruler: 'Башар Асад', territory: '185 180 км²', population: '22 000 000 человек' },
  'Таджикистан': { ruler: 'Эмомали Рахмон', territory: '143 100 км²', population: '10 000 000 человек' },
  'Таиланд': { ruler: 'Маха Вачиралонгкорн Рама X', territory: '513 120 км²', population: '70 000 000 человек' },
  'Тимор-лесте': { ruler: 'Жозе Рамуш-Орта', territory: '14 874 км²', population: '1 400 000 человек' },
  'Туркменистан': { ruler: 'Сердар Бердымухамедов', territory: '488 100 км²', population: '6 200 000 человек' },
  'Турция': { ruler: 'Реджеп Тайип Эрдоган', territory: '783 562 км²', population: '86 000 000 человек' },
  'Узбекистан': { ruler: 'Шавкат Мирзиёев', territory: '448 978 км²', population: '36 000 000 человек' },
  'Шри-ланка': { ruler: 'Ранил Викрамасингхе', territory: '65 610 км²', population: '22 000 000 человек' },
  'Япония': { ruler: 'Фумио Кисида', territory: '377 975 км²', population: '125 000 000 человек' },
  'Тайвань (частично признан)': { ruler: 'Лай Цинде', territory: '36 197 км²', population: '23 500 000 человек' },
  'Антигуа и барбуда': { ruler: 'Родни Уильямс', territory: '442 км²', population: '100 000 человек' },
  'Багамы': { ruler: 'Синетта Десмон-Уильямс', territory: '13 880 км²', population: '410 000 человек' },
  'Барбадос': { ruler: 'Сандра Мейсон', territory: '430 км²', population: '280 000 человек' },
  'Белиз': { ruler: 'Фройла Цалам', territory: '22 966 км²', population: '420 000 человек' },
  'Гаити': { ruler: 'Эдгар Леблан Филс', territory: '27 750 км²', population: '11 600 000 человек' },
  'Гватемала': { ruler: 'Бернардо Аревало', territory: '108 889 км²', population: '18 000 000 человек' },
  'Гондурас': { ruler: 'Сиомара Кастро', territory: '112 492 км²', population: '10 600 000 человек' },
  'Гренада': { ruler: 'Сесил Ла Гренье', territory: '344 км²', population: '125 000 человек' },
  'Доминика': { ruler: 'Сильвана Бертран', territory: '751 км²', population: '72 000 человек' },
  'Доминиканская республика': { ruler: 'Луис Абинадер', territory: '48 670 км²', population: '11 000 000 человек' },
  'Канада': { ruler: 'Мэри Саймон', territory: '9 984 670 км²', population: '40 000 000 человек' },
  'Коста-рика': { ruler: 'Родриго Чавес', territory: '51 100 км²', population: '5 200 000 человек' },
  'Куба': { ruler: 'Мигель Диас-Канель', territory: '109 884 км²', population: '11 200 000 человек' },
  'Мексика': { ruler: 'Клаудия Шейнбаум', territory: '1 964 375 км²', population: '129 000 000 человек' },
  'Никарагуа': { ruler: 'Даниэль Ортега', territory: '130 373 км²', population: '6 900 000 человек' },
  'Панама': { ruler: 'Хосе Рауль Мулино', territory: '75 417 км²', population: '4 400 000 человек' },
  'Сальвадор': { ruler: 'Найиб Букеле', territory: '21 041 км²', population: '6 500 000 человек' },
  'Сент-винсент и гренадины': { ruler: 'Сьюзан Дугган', territory: '389 км²', population: '110 000 человек' },
  'Сент-китс и невис': { ruler: 'Марселла Лайбёрд', territory: '261 км²', population: '50 000 человек' },
  'Сент-люсия': { ruler: 'Сирил Эррол Мельхиор', territory: '616 км²', population: '180 000 человек' },
  'Сша': { ruler: 'Дональд Трамп', territory: '9 833 517 км²', population: '343 000 000 человек' },
  'Тринидад и тобаго': { ruler: 'Кристин Кармона', territory: '5 128 км²', population: '1 530 000 человек' },
  'Ямайка': { ruler: 'Патрик Аллен', territory: '10 991 км²', population: '2 800 000 человек' },
  'Аргентина': { ruler: 'Хавьер Милей', territory: '2 780 400 км²', population: '46 000 000 человек' },
  'Боливия': { ruler: 'Луис Арсе', territory: '1 098 581 км²', population: '12 000 000 человек' },
  'Бразилия': { ruler: 'Лула да Силва', territory: '8 515 767 км²', population: '203 000 000 человек' },
  'Венесуэла': { ruler: 'Николас Мадуро', territory: '916 445 км²', population: '28 000 000 человек' },
  'Гайана': { ruler: 'Ирфан Али', territory: '214 970 км²', population: '800 000 человек' },
  'Колумбия': { ruler: 'Густаво Петро', territory: '1 141 748 км²', population: '52 000 000 человек' },
  'Парагвай': { ruler: 'Сантъяго Пенья', territory: '406 752 км²', population: '7 400 000 человек' },
  'Перу': { ruler: 'Дина Болуарте', territory: '1 285 216 км²', population: '34 000 000 человек' },
  'Суринам': { ruler: 'Чандрикаперсад Сантоки', territory: '163 820 км²', population: '620 000 человек' },
  'Уругвай': { ruler: 'Луис Лакалье Поу', territory: '176 215 км²', population: '3 500 000 человек' },
  'Чили': { ruler: 'Габриэль Борич', territory: '756 102 км²', population: '19 700 000 человек' },
  'Эквадор': { ruler: 'Даниэль Нобоа', territory: '276 841 км²', population: '18 300 000 человек' },
  'Алжир': { ruler: 'Абдельмаджид Теббун', territory: '2 381 741 км²', population: '45 000 000 человек' },
  'Ангола': { ruler: 'Жуан Лоренсу', territory: '1 246 700 км²', population: '36 000 000 человек' },
  'Бенин': { ruler: 'Патрис Талон', territory: '114 763 км²', population: '13 000 000 человек' },
  'Ботсвана': { ruler: 'Мокгвицеси Масиси', territory: '581 730 км²', population: '2 600 000 человек' },
  'Буркина-фасо': { ruler: 'Ибрагим Траоре', territory: '274 200 км²', population: '22 000 000 человек' },
  'Бурунди': { ruler: 'Эварист Ндайишимие', territory: '27 834 км²', population: '12 000 000 человек' },
  'Габон': { ruler: 'Брис Олигий Нгема', territory: '267 668 км²', population: '2 300 000 человек' },
  'Гамбия': { ruler: 'Адама Бэрроу', territory: '11 295 км²', population: '2 700 000 человек' },
  'Гана': { ruler: 'Нана Акуфо-Аддо', territory: '238 533 км²', population: '33 000 000 человек' },
  'Гвинея': { ruler: 'Мамади Думбуя', territory: '245 857 км²', population: '14 000 000 человек' },
  'Гвинея-бисау': { ruler: 'Умару Сиссоку Эмбало', territory: '36 125 км²', population: '2 000 000 человек' },
  'Джибути': { ruler: 'Исмаил Омар Гелле', territory: '23 200 км²', population: '1 000 000 человек' },
  'Египет': { ruler: 'Абдель Фаттах ас-Сиси', territory: '1 002 450 км²', population: '110 000 000 человек' },
  'Замбия': { ruler: 'Хакайинде Хичилема', territory: '752 618 км²', population: '20 000 000 человек' },
  'Зимбабве': { ruler: 'Эммерсон Мнангагва', territory: '390 757 км²', population: '16 000 000 человек' },
  'Кабо-верде': { ruler: 'Жозе Мария Невеш', territory: '4 033 км²', population: '560 000 человек' },
  'Камерун': { ruler: 'Поль Бийя', territory: '475 442 км²', population: '28 000 000 человек' },
  'Кения': { ruler: 'Уильям Руто', territory: '580 367 км²', population: '55 000 000 человек' },
  'Коморы': { ruler: 'Азали Ассумани', territory: '2 235 км²', population: '870 000 человек' },
  'Конго (республика)': { ruler: 'Дени Сассу-Нгессо', territory: '342 000 км²', population: '5 900 000 человек' },
  'Конго (др конго)': { ruler: 'Феликс Чисекеди', territory: '2 344 858 км²', population: '100 000 000 человек' },
  'Кот-д’ивуар': { ruler: 'Алассан Уаттара', territory: '322 463 км²', population: '28 000 000 человек' },
  'Лесото': { ruler: 'Летсие III', territory: '30 355 км²', population: '2 300 000 человек' },
  'Либерия': { ruler: 'Джозеф Бойкай', territory: '111 369 км²', population: '5 300 000 человек' },
  'Ливия': { ruler: 'Абделхамид Дбейба', territory: '1 759 540 км²', population: '7 000 000 человек' },
  'Маврикий': { ruler: 'Притхвираджсинг Рупун', territory: '2 040 км²', population: '1 300 000 человек' },
  'Мавритания': { ruler: 'Мохамед ульд Газуани', territory: '1 030 700 км²', population: '4 800 000 человек' },
  'Мадагаскар': { ruler: 'Андри Радзуэлина', territory: '587 041 км²', population: '30 000 000 человек' },
  'Малави': { ruler: 'Лазарус Чаквера', territory: '118 484 км²', population: '20 000 000 человек' },
  'Мали': { ruler: 'Ассими Гойта', territory: '1 240 192 км²', population: '21 000 000 человек' },
  'Марокко': { ruler: 'Мохаммед VI', territory: '710 850 км²', population: '37 000 000 человек' },
  'Мозамбик': { ruler: 'Филипе Ньюси', territory: '801 590 км²', population: '33 000 000 человек' },
  'Намибия': { ruler: 'Нанголо Мбумба', territory: '825 615 км²', population: '2 700 000 человек' },
  'Нигер': { ruler: 'Абдурахман Тчиани', territory: '1 267 000 км²', population: '26 000 000 человек' },
  'Нигерия': { ruler: 'Бола Тинубу', territory: '923 768 км²', population: '220 000 000 человек' },
  'Руанда': { ruler: 'Поль Кагаме', territory: '26 338 км²', population: '13 000 000 человек' },
  'Сан-томе и принсипи': { ruler: 'Карлуш Виейра', territory: '964 км²', population: '220 000 человек' },
  'Сейшелы': { ruler: 'Вавел Рамкалаван', territory: '459 км²', population: '100 000 человек' },
  'Сенегал': { ruler: 'Бассира Диомай Файе', territory: '196 722 км²', population: '18 000 000 человек' },
  'Сомали': { ruler: 'Хассан Шейх Мохамуд', territory: '637 657 км²', population: '17 000 000 человек' },
  'Сомалиленд (частично признан)': { ruler: 'Мусе Бихи Абди', territory: '176 120 км²', population: '5 700 000 человек' },
  'Судан': { ruler: 'Абдель Фаттах аль-Бурхан', territory: '1 861 484 км²', population: '49 000 000 человек' },
  'Сьерра-леоне': { ruler: 'Юлиус Мада Био', territory: '71 740 км²', population: '8 800 000 человек' },
  'Танзания': { ruler: 'Самия Сулуху Хасан', territory: '947 303 км²', population: '65 000 000 человек' },
  'Того': { ruler: 'Фор Гнассингбе', territory: '56 785 км²', population: '9 000 000 человек' },
  'Тунис': { ruler: 'Каис Саид', territory: '163 610 км²', population: '12 000 000 человек' },
  'Уганда': { ruler: 'Йовери Мусевени', territory: '241 038 км²', population: '49 000 000 человек' },
  'Цар': { ruler: 'Фостен-Арканж Туадера', territory: '622 984 км²', population: '5 600 000 человек' },
  'Чад': { ruler: 'Махамат Деби', territory: '1 284 000 км²', population: '18 000 000 человек' },
  'Экваториальная гвинея': { ruler: 'Теодоро Обианг Нгема Мбасого', territory: '28 051 км²', population: '1 700 000 человек' },
  'Эритрея': { ruler: 'Исайяс Афеворки', territory: '117 600 км²', population: '3 700 000 человек' },
  'Эсватини': { ruler: 'Мсвати III', territory: '17 364 км²', population: '1 200 000 человек' },
  'Эфиопия': { ruler: 'Абий Ахмед', territory: '1 104 300 км²', population: '120 000 000 человек' },
  'Юар': { ruler: 'Сирил Рамафоса', territory: '1 221 037 км²', population: '60 000 000 человек' },
  'Южный судан': { ruler: 'Сальва Киир', territory: '619 745 км²', population: '11 000 000 человек' },
  'Садр / западная сахара (частично признана)': { ruler: 'Брахим Гали', territory: '266 000 км²', population: '600 000 человек' },
  'Австралия': { ruler: 'Дэвид Херли', territory: '7 692 024 км²', population: '26 700 000 человек' },
  'Вануату': { ruler: 'Норберт Легран', territory: '12 189 км²', population: '330 000 человек' },
  'Кирибати': { ruler: 'Танети Маамау', territory: '811 км²', population: '120 000 человек' },
  'Маршалловы острова': { ruler: 'Хилда Хайне', territory: '181 км²', population: '60 000 человек' },
  'Микронезия': { ruler: 'Уэсли Симеон', territory: '702 км²', population: '100 000 человек' },
  'Науру': { ruler: 'Дэвид Адианг', territory: '21 км²', population: '13 000 человек' },
  'Новая зеландия': { ruler: 'Синди Киро', territory: '268 838 км²', population: '5 200 000 человек' },
  'Палау': { ruler: 'Сурангел Уипс младший', territory: '459 км²', population: '18 000 человек' },
  'Папуа — новая гвинея': { ruler: 'Боб Дадаэ', territory: '462 840 км²', population: '10 300 000 человек' },
  'Самоа': { ruler: 'Афио Матуатуфа Сайли Туималеалифано', territory: '2 842 км²', population: '225 000 человек' },
  'Соломоновы острова': { ruler: 'Дэвид Вуньеги', territory: '28 896 км²', population: '730 000 человек' },
  'Тонга': { ruler: 'Тупоу VI', territory: '747 км²', population: '105 000 человек' },
  'Тувалу': { ruler: 'Тофинга Фафоа', territory: '26 км²', population: '11 000 человек' },
  'Фиджи': { ruler: 'Рату Вилиями Катонивере', territory: '18 274 км²', population: '940 000 человек' },
  'Острова кука': { ruler: 'Том Марстерс', territory: '236 км²', population: '18 000 человек' },
  'Ниуэ': { ruler: 'Далтон Тагелаги', territory: '261 км²', population: '1 600 человек' },
};

export function normalizeCountryKey(countryName: string): string {
  return countryName.trim().toLowerCase();
}

function buildKey(guildId: string, countryName: string): string {
  return countryName
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
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

const DEFAULT_FACTS = new Map<string, CountryFacts>(
  Object.entries(RAW_DEFAULT_FACTS).map(([countryName, facts]) => [
    normalizeCountryKey(countryName),
    sanitizeCountryFacts(facts)
  ])
);

const DEFAULT_FALLBACK_FACTS = sanitizeCountryFacts(FALLBACK_FACTS);

const profiles = new Map<string, CountryProfile>();

function getDefaultFacts(country: Country): CountryFacts {
  const defaults = DEFAULT_FACTS.get(normalizeCountryKey(country.name)) ?? DEFAULT_FALLBACK_FACTS;
  return defaults;
}

function sanitizeOptionalText(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 0 ? trimmed : undefined;
}

function mapRecordToProfile(record: {
  ruler: string;
  territory: string;
  population: string;
  ideology: string | null;
  governmentForm: string | null;
  stateStructure: string | null;
  religion: string | null;
  budget: bigint | null;
  registeredUserId: bigint | null;
  registeredAt: Date | null;
}): CountryProfile {
  return {
    ruler: sanitizeRulerName(record.ruler),
    territory: record.territory.trim(),
    population: sanitizePopulation(record.population),
    ideology: sanitizeOptionalText(record.ideology) ?? DEFAULT_POLITICS.ideology,
    governmentForm: sanitizeOptionalText(record.governmentForm) ?? DEFAULT_POLITICS.governmentForm,
    stateStructure: sanitizeOptionalText(record.stateStructure) ?? DEFAULT_POLITICS.stateStructure,
    religion: sanitizeOptionalText(record.religion) ?? DEFAULT_POLITICS.religion,
    budget: typeof record.budget === 'bigint' ? record.budget : DEFAULT_BUDGET,
    registeredUserId: record.registeredUserId ? record.registeredUserId.toString() : undefined,
    registeredAt: record.registeredAt ?? undefined
  };
}

function buildDefaultProfile(country: Country): CountryProfile {
  return {
    ...getDefaultFacts(country),
    ...DEFAULT_POLITICS,
    budget: DEFAULT_BUDGET
  };
}

export async function getCountryProfile(
  guildId: string,
  country: Country,
  db?: PrismaClientOrTransaction
): Promise<CountryProfile> {
  const cacheKey = buildKey(guildId, country.name);
  const cached = profiles.get(cacheKey);

  if (cached) return cached;

  const dbClient = getDbClient(db);
  const normalizedName = normalizeCountryKey(country.name);

  const stored = await dbClient.countryProfile.findUnique({
    where: {
      guildId_countryName: {
        guildId: BigInt(guildId),
        countryName: normalizedName
      }
    }
  });

  const profile = stored ? mapRecordToProfile(stored) : buildDefaultProfile(country);
  profiles.set(cacheKey, profile);
  return profile;
}

async function saveCountryProfile(
  guildId: string,
  country: Country,
  profile: CountryProfile,
  db?: PrismaClientOrTransaction
): Promise<CountryProfile> {
  const normalizedName = normalizeCountryKey(country.name);
  const cacheKey = buildKey(guildId, country.name);
  const sanitized: CountryProfile = {
    ...buildDefaultProfile(country),
    ...profile,
    ruler: sanitizeRulerName(profile.ruler),
    territory: profile.territory.trim(),
    population: sanitizePopulation(profile.population),
    ideology: sanitizeOptionalText(profile.ideology) ?? DEFAULT_POLITICS.ideology,
    governmentForm: sanitizeOptionalText(profile.governmentForm) ?? DEFAULT_POLITICS.governmentForm,
    stateStructure: sanitizeOptionalText(profile.stateStructure) ?? DEFAULT_POLITICS.stateStructure,
    religion: sanitizeOptionalText(profile.religion) ?? DEFAULT_POLITICS.religion,
    budget: typeof profile.budget === 'bigint' ? profile.budget : BigInt(profile.budget)
  };

  const dbClient = getDbClient(db);

  const stored = await dbClient.countryProfile.upsert({
    where: {
      guildId_countryName: {
        guildId: BigInt(guildId),
        countryName: normalizedName
      }
    },
    update: {
      ruler: sanitized.ruler,
      territory: sanitized.territory,
      population: sanitized.population,
      ideology: sanitized.ideology,
      governmentForm: sanitized.governmentForm,
      stateStructure: sanitized.stateStructure,
      religion: sanitized.religion,
      budget: sanitized.budget,
      registeredUserId: sanitized.registeredUserId ? BigInt(sanitized.registeredUserId) : null,
      registeredAt: sanitized.registeredAt ?? null
    },
    create: {
      guildId: BigInt(guildId),
      countryName: normalizedName,
      ruler: sanitized.ruler,
      territory: sanitized.territory,
      population: sanitized.population,
      ideology: sanitized.ideology,
      governmentForm: sanitized.governmentForm,
      stateStructure: sanitized.stateStructure,
      religion: sanitized.religion,
      budget: sanitized.budget,
      registeredUserId: sanitized.registeredUserId ? BigInt(sanitized.registeredUserId) : null,
      registeredAt: sanitized.registeredAt ?? null
    }
  });

  const mapped = mapRecordToProfile(stored);
  profiles.set(cacheKey, mapped);
  return mapped;
}

export async function updateCountryProfile(
  guildId: string,
  country: Country,
  updates: Partial<Pick<CountryProfile, 'ruler' | 'territory' | 'population'>>,
  userId?: string,
  db?: PrismaClientOrTransaction
): Promise<CountryProfile> {
  const current = await getCountryProfile(guildId, country, db);
  const defaults = getDefaultFacts(country);
  const sanitizedUpdates: Partial<CountryFacts> = {
    ruler: updates.ruler ? sanitizeRulerName(updates.ruler) : undefined,
    territory: updates.territory?.trim(),
    population: updates.population ? sanitizePopulation(updates.population) : undefined
  };

  const now = new Date();

  const nextProfile: CountryProfile = {
    ...current,
    ruler: sanitizedUpdates.ruler ?? defaults.ruler,
    territory: sanitizedUpdates.territory ?? defaults.territory,
    population: sanitizedUpdates.population ?? defaults.population,
    registeredUserId: userId ?? current.registeredUserId,
    registeredAt: userId ? now : current.registeredAt
  };

  return saveCountryProfile(guildId, country, nextProfile, db);
}

export async function updateCountryPolitics(
  guildId: string,
  country: Country,
  updates: Partial<Pick<CountryProfile, 'ideology' | 'governmentForm' | 'stateStructure' | 'religion'>>
): Promise<CountryProfile> {
  const current = await getCountryProfile(guildId, country);
  const nextProfile: CountryProfile = {
    ...current,
    ideology: sanitizeOptionalText(updates.ideology) ?? current.ideology,
    governmentForm: sanitizeOptionalText(updates.governmentForm) ?? current.governmentForm,
    stateStructure: sanitizeOptionalText(updates.stateStructure) ?? current.stateStructure,
    religion: sanitizeOptionalText(updates.religion) ?? current.religion
  };

  return saveCountryProfile(guildId, country, nextProfile);
}

export async function updateCountryDevelopment(
  guildId: string,
  country: Country,
  updates: Partial<Pick<CountryProfile, 'budget'>>
): Promise<CountryProfile> {
  const current = await getCountryProfile(guildId, country);
  const budgetValue = updates.budget ?? current.budget ?? DEFAULT_BUDGET;
  const normalizedBudget = typeof budgetValue === 'bigint' ? budgetValue : BigInt(budgetValue);

  const nextProfile: CountryProfile = {
    ...current,
    budget: normalizedBudget
  };

  return saveCountryProfile(guildId, country, nextProfile);
}

export type CountryProfileSection = 'characteristics' | 'politics' | 'development';

export async function resetCountryProfile(
  guildId: string,
  country: Country,
  section: CountryProfileSection = 'characteristics',
  db?: PrismaClientOrTransaction
): Promise<CountryProfile> {
  const dbClient = getDbClient(db);
  await dbClient.countryRegistration.deleteMany({
    where: {
      guildId: BigInt(guildId),
      countryKey: normalizeCountryKey(country.name)
    }
  });

  const current = await getCountryProfile(guildId, country, dbClient);
  const defaults = buildDefaultProfile(country);

  if (section === 'politics') {
    const updated: CountryProfile = {
      ...current,
      ...DEFAULT_POLITICS
    };

    return saveCountryProfile(guildId, country, updated, dbClient);
  }

  if (section === 'development') {
    const updated: CountryProfile = {
      ...current,
      budget: DEFAULT_BUDGET
    };

    return saveCountryProfile(guildId, country, updated, dbClient);
  }

  const updated: CountryProfile = {
    ...current,
    ruler: defaults.ruler,
    territory: defaults.territory,
    population: defaults.population,
    registeredUserId: undefined,
    registeredAt: undefined
  };

  return saveCountryProfile(guildId, country, updated, dbClient);
}

export async function setCountryRegistration(
  guildId: string,
  country: Country,
  userId: string,
  registeredAt: Date,
  db?: PrismaClientOrTransaction
): Promise<CountryProfile> {
  const current = await getCountryProfile(guildId, country, db);
  const updated: CountryProfile = {
    ...current,
    registeredUserId: userId,
    registeredAt
  };

  return saveCountryProfile(guildId, country, updated, db);
}

export async function clearCountryRegistration(
  guildId: string,
  country: Country,
  db?: PrismaClientOrTransaction
): Promise<CountryProfile> {
  const current = await getCountryProfile(guildId, country, db);
  const updated: CountryProfile = {
    ...current,
    registeredUserId: undefined,
    registeredAt: undefined
  };

  return saveCountryProfile(guildId, country, updated, db);
}

export function formatRegistration(profile: CountryProfile): string {
  if (!profile.registeredAt) return '`-`';
  return `\`${formatDateTime(profile.registeredAt)}\``;
}