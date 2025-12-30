import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type Guild,
  type TopLevelComponentData
} from 'discord.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';
import type {
  CountryProfile,
  CountryProfileSection
} from '../../../services/countryProfileService.js';
import { formatDateTime } from '../../../shared/time.js';

export type ContinentId =
  | 'europe'
  | 'asia'
  | 'north_america'
  | 'south_america'
  | 'africa'
  | 'oceania';

export type Country = {
  name: string;
  emoji: string;
};

type Continent = {
  id: ContinentId;
  label: string;
  emoji: string;
  countries: Country[];
};

const CONTINENTS: Continent[] = [
  {
    id: 'europe',
    label: 'Европа',
    emoji: 'europapulse',
    countries: [
      { name: 'Албания', emoji: 'flag_al' },
      { name: 'Андорра', emoji: 'flag_ad' },
      { name: 'Австрия', emoji: 'flag_at' },
      { name: 'Беларусь', emoji: 'flag_by' },
      { name: 'Бельгия', emoji: 'flag_be' },
      { name: 'Болгария', emoji: 'flag_bg' },
      { name: 'Босния и Герцеговина', emoji: 'flag_ba' },
      { name: 'Ватикан', emoji: 'flag_va' },
      { name: 'Великобритания', emoji: 'flag_gb' },
      { name: 'Венгрия', emoji: 'flag_hu' },
      { name: 'Германия', emoji: 'flag_de' },
      { name: 'Греция', emoji: 'flag_gr' },
      { name: 'Дания', emoji: 'flag_dk' },
      { name: 'Ирландия', emoji: 'flag_ie' },
      { name: 'Исландия', emoji: 'flag_is' },
      { name: 'Испания', emoji: 'flag_es' },
      { name: 'Италия', emoji: 'flag_it' },
      { name: 'Латвия', emoji: 'flag_lv' },
      { name: 'Литва', emoji: 'flag_lt' },
      { name: 'Лихтенштейн', emoji: 'flag_li' },
      { name: 'Люксембург', emoji: 'flag_lu' },
      { name: 'Мальта', emoji: 'flag_mt' },
      { name: 'Молдова', emoji: 'flag_md' },
      { name: 'Монако', emoji: 'flag_mc' },
      { name: 'Нидерланды', emoji: 'flag_nl' },
      { name: 'Норвегия', emoji: 'flag_no' },
      { name: 'Польша', emoji: 'flag_pl' },
      { name: 'Португалия', emoji: 'flag_pt' },
      { name: 'Россия', emoji: 'flag_ru' },
      { name: 'Румыния', emoji: 'flag_ro' },
      { name: 'Сан-Марино', emoji: 'flag_sm' },
      { name: 'Северная Македония', emoji: 'flag_mk' },
      { name: 'Сербия', emoji: 'flag_rs' },
      { name: 'Словакия', emoji: 'flag_sk' },
      { name: 'Словения', emoji: 'flag_si' },
      { name: 'Украина', emoji: 'flag_ua' },
      { name: 'Финляндия', emoji: 'flag_fi' },
      { name: 'Франция', emoji: 'flag_fr' },
      { name: 'Хорватия', emoji: 'flag_hr' },
      { name: 'Черногория', emoji: 'flag_me' },
      { name: 'Чехия', emoji: 'flag_cz' },
      { name: 'Швейцария', emoji: 'flag_ch' },
      { name: 'Швеция', emoji: 'flag_se' },
      { name: 'Эстония', emoji: 'flag_ee' },
      { name: 'Косово (частично признано)', emoji: 'flag_xk' },
      { name: 'Северный Кипр (частично признан)', emoji: 'northcypr' },
      { name: 'Абхазия (частично признана)', emoji: 'abkhazia' },
      { name: 'Южная Осетия (частично признана)', emoji: 'ossetia' }
    ]
  },
  {
    id: 'asia',
    label: 'Азия',
    emoji: 'asiapulse',
    countries: [
      { name: 'Афганистан', emoji: 'flag_af' },
      { name: 'Армения', emoji: 'flag_am' },
      { name: 'Азербайджан', emoji: 'flag_az' },
      { name: 'Бахрейн', emoji: 'flag_bh' },
      { name: 'Бангладеш', emoji: 'flag_bd' },
      { name: 'Бутан', emoji: 'flag_bt' },
      { name: 'Бруней', emoji: 'flag_bn' },
      { name: 'Вьетнам', emoji: 'flag_vn' },
      { name: 'Грузия', emoji: 'flag_ge' },
      { name: 'Израиль', emoji: 'flag_il' },
      { name: 'Индия', emoji: 'flag_in' },
      { name: 'Индонезия', emoji: 'flag_id' },
      { name: 'Иордания', emoji: 'flag_jo' },
      { name: 'Ирак', emoji: 'flag_iq' },
      { name: 'Иран', emoji: 'flag_ir' },
      { name: 'Йемен', emoji: 'flag_ye' },
      { name: 'Казахстан', emoji: 'flag_kz' },
      { name: 'Камбоджа', emoji: 'flag_kh' },
      { name: 'Катар', emoji: 'flag_qa' },
      { name: 'Китай', emoji: 'flag_cn' },
      { name: 'КНДР', emoji: 'flag_kp' },
      { name: 'Республика Корея', emoji: 'flag_kr' },
      { name: 'Кувейт', emoji: 'flag_kw' },
      { name: 'Кыргызстан', emoji: 'flag_kg' },
      { name: 'Лаос', emoji: 'flag_la' },
      { name: 'Ливан', emoji: 'flag_lb' },
      { name: 'Малайзия', emoji: 'flag_my' },
      { name: 'Мальдивы', emoji: 'flag_mv' },
      { name: 'Монголия', emoji: 'flag_mn' },
      { name: 'Мьянма', emoji: 'flag_mm' },
      { name: 'Непал', emoji: 'flag_np' },
      { name: 'ОАЭ', emoji: 'flag_ae' },
      { name: 'Оман', emoji: 'flag_om' },
      { name: 'Пакистан', emoji: 'flag_pk' },
      { name: 'Палестина', emoji: 'flag_ps' },
      { name: 'Филиппины', emoji: 'flag_ph' },
      { name: 'Саудовская Аравия', emoji: 'flag_sa' },
      { name: 'Сингапур', emoji: 'flag_sg' },
      { name: 'Сирия', emoji: 'flag_sy' },
      { name: 'Таджикистан', emoji: 'flag_tj' },
      { name: 'Таиланд', emoji: 'flag_th' },
      { name: 'Тимор-Лесте', emoji: 'flag_tl' },
      { name: 'Туркменистан', emoji: 'flag_tm' },
      { name: 'Турция', emoji: 'flag_tr' },
      { name: 'Узбекистан', emoji: 'flag_uz' },
      { name: 'Шри-Ланка', emoji: 'flag_lk' },
      { name: 'Япония', emoji: 'flag_jp' },
      { name: 'Тайвань (частично признан)', emoji: 'flag_tw' }
    ]
  },
  {
    id: 'north_america',
    label: 'Северная Америка',
    emoji: 'americapulse',
    countries: [
      { name: 'Антигуа и Барбуда', emoji: 'flag_ag' },
      { name: 'Багамы', emoji: 'flag_bs' },
      { name: 'Барбадос', emoji: 'flag_bb' },
      { name: 'Белиз', emoji: 'flag_bz' },
      { name: 'Гаити', emoji: 'flag_ht' },
      { name: 'Гватемала', emoji: 'flag_gt' },
      { name: 'Гондурас', emoji: 'flag_hn' },
      { name: 'Гренада', emoji: 'flag_gd' },
      { name: 'Доминика', emoji: 'flag_dm' },
      { name: 'Доминиканская Республика', emoji: 'flag_do' },
      { name: 'Канада', emoji: 'flag_ca' },
      { name: 'Коста-Рика', emoji: 'flag_cr' },
      { name: 'Куба', emoji: 'flag_cu' },
      { name: 'Мексика', emoji: 'flag_mx' },
      { name: 'Никарагуа', emoji: 'flag_ni' },
      { name: 'Панама', emoji: 'flag_pa' },
      { name: 'Сальвадор', emoji: 'flag_sv' },
      { name: 'Сент-Винсент и Гренадины', emoji: 'flag_vc' },
      { name: 'Сент-Китс и Невис', emoji: 'flag_kn' },
      { name: 'Сент-Люсия', emoji: 'flag_lc' },
      { name: 'США', emoji: 'flag_us' },
      { name: 'Тринидад и Тобаго', emoji: 'flag_tt' },
      { name: 'Ямайка', emoji: 'flag_jm' }
    ]
  },
  {
    id: 'south_america',
    label: 'Южная Америка',
    emoji: 'americapulse',
    countries: [
      { name: 'Аргентина', emoji: 'flag_ar' },
      { name: 'Боливия', emoji: 'flag_bo' },
      { name: 'Бразилия', emoji: 'flag_br' },
      { name: 'Венесуэла', emoji: 'flag_ve' },
      { name: 'Гайана', emoji: 'flag_gy' },
      { name: 'Колумбия', emoji: 'flag_co' },
      { name: 'Парагвай', emoji: 'flag_py' },
      { name: 'Перу', emoji: 'flag_pe' },
      { name: 'Суринам', emoji: 'flag_sr' },
      { name: 'Уругвай', emoji: 'flag_uy' },
      { name: 'Чили', emoji: 'flag_cl' },
      { name: 'Эквадор', emoji: 'flag_ec' }
    ]
  },
  {
    id: 'africa',
    label: 'Африка',
    emoji: 'africapulse',
    countries: [
      { name: 'Алжир', emoji: 'flag_dz' },
      { name: 'Ангола', emoji: 'flag_ao' },
      { name: 'Бенин', emoji: 'flag_bj' },
      { name: 'Ботсвана', emoji: 'flag_bw' },
      { name: 'Буркина-Фасо', emoji: 'flag_bf' },
      { name: 'Бурунди', emoji: 'flag_bi' },
      { name: 'Габон', emoji: 'flag_ga' },
      { name: 'Гамбия', emoji: 'flag_gm' },
      { name: 'Гана', emoji: 'flag_gh' },
      { name: 'Гвинея', emoji: 'flag_gn' },
      { name: 'Гвинея-Бисау', emoji: 'flag_gw' },
      { name: 'Джибути', emoji: 'flag_dj' },
      { name: 'Египет', emoji: 'flag_eg' },
      { name: 'Замбия', emoji: 'flag_zm' },
      { name: 'Зимбабве', emoji: 'flag_zw' },
      { name: 'Кабо-Верде', emoji: 'flag_cv' },
      { name: 'Камерун', emoji: 'flag_cm' },
      { name: 'Кения', emoji: 'flag_ke' },
      { name: 'Коморы', emoji: 'flag_km' },
      { name: 'Конго (Республика)', emoji: 'flag_cg' },
      { name: 'Конго (ДР Конго)', emoji: 'flag_cd' },
      { name: 'Кот-д’Ивуар', emoji: 'flag_ci' },
      { name: 'Лесото', emoji: 'flag_ls' },
      { name: 'Либерия', emoji: 'flag_lr' },
      { name: 'Ливия', emoji: 'flag_ly' },
      { name: 'Маврикий', emoji: 'flag_mu' },
      { name: 'Мавритания', emoji: 'flag_mr' },
      { name: 'Мадагаскар', emoji: 'flag_mg' },
      { name: 'Малави', emoji: 'flag_mw' },
      { name: 'Мали', emoji: 'flag_ml' },
      { name: 'Марокко', emoji: 'flag_ma' },
      { name: 'Мозамбик', emoji: 'flag_mz' },
      { name: 'Намибия', emoji: 'flag_na' },
      { name: 'Нигер', emoji: 'flag_ne' },
      { name: 'Нигерия', emoji: 'flag_ng' },
      { name: 'Руанда', emoji: 'flag_rw' },
      { name: 'Сан-Томе и Принсипи', emoji: 'flag_st' },
      { name: 'Сейшелы', emoji: 'flag_sc' },
      { name: 'Сенегал', emoji: 'flag_sn' },
      { name: 'Сомали', emoji: 'flag_so' },
      { name: 'Сомалиленд (частично признан)', emoji: 'somaliland' },
      { name: 'Судан', emoji: 'flag_sd' },
      { name: 'Сьерра-Леоне', emoji: 'flag_sl' },
      { name: 'Танзания', emoji: 'flag_tz' },
      { name: 'Того', emoji: 'flag_tg' },
      { name: 'Тунис', emoji: 'flag_tn' },
      { name: 'Уганда', emoji: 'flag_ug' },
      { name: 'ЦАР', emoji: 'flag_cf' },
      { name: 'Чад', emoji: 'flag_td' },
      { name: 'Экваториальная Гвинея', emoji: 'flag_gq' },
      { name: 'Эритрея', emoji: 'flag_er' },
      { name: 'Эсватини', emoji: 'flag_sz' },
      { name: 'Эфиопия', emoji: 'flag_et' },
      { name: 'ЮАР', emoji: 'flag_za' },
      { name: 'Южный Судан', emoji: 'flag_ss' },
      { name: 'САДР / Западная Сахара (частично признана)', emoji: 'flag_eh' }
    ]
  },
  {
    id: 'oceania',
    label: 'Океания',
    emoji: 'asiapulse',
    countries: [
      { name: 'Австралия', emoji: 'flag_au' },
      { name: 'Вануату', emoji: 'flag_vu' },
      { name: 'Кирибати', emoji: 'flag_ki' },
      { name: 'Маршалловы Острова', emoji: 'flag_mh' },
      { name: 'Микронезия', emoji: 'flag_fm' },
      { name: 'Науру', emoji: 'flag_nr' },
      { name: 'Новая Зеландия', emoji: 'flag_nz' },
      { name: 'Палау', emoji: 'flag_pw' },
      { name: 'Папуа — Новая Гвинея', emoji: 'flag_pg' },
      { name: 'Самоа', emoji: 'flag_ws' },
      { name: 'Соломоновы Острова', emoji: 'flag_sb' },
      { name: 'Тонга', emoji: 'flag_to' },
      { name: 'Тувалу', emoji: 'flag_tv' },
      { name: 'Фиджи', emoji: 'flag_fj' },
      { name: 'Острова Кука', emoji: 'flag_ck' },
      { name: 'Ниуэ', emoji: 'flag_nu' }
    ]
  }
];

function normalizeEmojiName(raw: string): string {
  return raw.replace(/:/g, '');
}

function flagCodeToEmoji(code: string): string | null {
  if (code.length !== 2) return null;
  const codePoints = Array.from(code.toUpperCase()).map((char) => 0x1f1e6 + (char.charCodeAt(0) - 65));
  if (codePoints.some((point) => Number.isNaN(point))) return null;
  return String.fromCodePoint(...codePoints);
}

export function resolveEmojiIdentifier(raw: string, formatEmoji: (name: string) => string): string {
  const normalized = normalizeEmojiName(raw);
  const flagCode = normalized.match(/^flag_([a-z]{2})$/i)?.[1];

  if (flagCode) {
    const unicode = flagCodeToEmoji(flagCode);
    if (unicode) return unicode;
  }

  return formatEmoji(normalized);
}

function buildCountryLabel(name: string, emoji: string): string {
  return `${emoji} | ${name}`;
}

function formatBudgetValue(budget: bigint): string {
  return budget.toLocaleString('ru-RU');
}

function buildPageRange(total: number, pageSize: number): number {
  return Math.max(Math.ceil(total / pageSize), 1);
}

function buildCountryOptions(
  countries: Country[],
  formatEmoji: (name: string) => string,
  page: number,
  pageSize: number
): StringSelectMenuOptionBuilder[] {
  const start = (page - 1) * pageSize;
  return countries.slice(start, start + pageSize).map((country) => {
    const emoji = resolveEmojiIdentifier(country.emoji, formatEmoji);
    return new StringSelectMenuOptionBuilder()
      .setLabel(country.name)
      .setValue(country.name)
      .setEmoji(emoji);
  });
}

export function getContinent(continentId: string): Continent | null {
  return CONTINENTS.find((continent) => continent.id === continentId) ?? null;
}

export function getContinents(): Continent[] {
  return [...CONTINENTS];
}

export async function buildCountriesContinentView(guild: Guild): Promise<{ components: TopLevelComponentData[] }> {
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const worldEmoji = formatEmoji('worldpulse');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('settings', 'countriesContinent'))
    .setPlaceholder('Выберите континент');

  for (const continent of CONTINENTS) {
    const emoji = resolveEmojiIdentifier(continent.emoji, formatEmoji);
    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(continent.label)
        .setValue(continent.id)
        .setEmoji(emoji)
    );
  }

  const framed: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`**${worldEmoji} Список стран:**`, '*Выберите континент*'].join('\n')
      },
      { type: ComponentType.Separator, divider: true },
      {
        type: ComponentType.TextDisplay,
        content: CONTINENTS.map((continent) => `・${continent.label}`).join('\n')
      },
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON()
    ]
  };

  return { components: [framed] };
}

export async function buildCountriesView(options: {
  guild: Guild;
  continent: Continent;
  page?: number;
  pageSize?: number;
}): Promise<{
  components: TopLevelComponentData[];
  currentPage: number;
  totalPages: number;
}> {
  const pageSize = options.pageSize ?? 15;
  const { continent } = options;
  const requestedPage = options.page ?? 1;
  const formatEmoji = await createEmojiFormatter({
    client: options.guild.client,
    guildId: options.guild.id,
    guildEmojis: options.guild.emojis.cache.values()
  });

  const worldEmoji = formatEmoji('worldpulse');
  const totalPages = buildPageRange(continent.countries.length, pageSize);
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const emojiContinent = resolveEmojiIdentifier(continent.emoji, formatEmoji);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('settings', 'countriesCountry', continent.id, String(currentPage)))
    .setPlaceholder(`Выберите государство (Страница ${currentPage}/${totalPages})`)
    .setMinValues(1)
    .setMaxValues(1);

  const optionsBuilders = buildCountryOptions(continent.countries, formatEmoji, currentPage, pageSize);

  if (optionsBuilders.length === 0) {
    selectMenu
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Нет доступных стран')
          .setValue('none')
          .setDescription('Список стран недоступен')
      )
      .setDisabled(true);
  } else {
    for (const option of optionsBuilders) {
      selectMenu.addOptions(option);
    }
  }

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'countriesFirst', continent.id))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('angledoublesmallleft'))
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'countriesPrev', continent.id, String(currentPage)))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('anglesmallleft'))
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'countriesNext', continent.id, String(currentPage)))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('anglesmallright'))
      .setDisabled(currentPage >= totalPages),
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'countriesLast', continent.id))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('angledoublesmallright'))
      .setDisabled(currentPage >= totalPages)
  );

  const framed: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`**${worldEmoji} Государство:**`, '*Выберите государство для просмотра подробной информации.*'].join('\n')
      },
      { type: ComponentType.Separator, divider: true },
      {
        type: ComponentType.TextDisplay,
        content: ['**Континент:**', `*${emojiContinent} ${continent.label}*`].join('\n')
      },
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu).toJSON(),
      navRow.toJSON()
    ]
  };

  return { components: [framed], currentPage, totalPages };
}

type CountryDetailsViewOptions = {
  guild: Guild;
  continent: Continent;
  country: Country;
  countryIndex: number;
  profile: CountryProfile;
  page: number;
  tab?: CountryProfileSection;
};

function buildTabButtons(options: {
  continent: Continent;
  page: number;
  countryIndex: number;
  activeTab: CountryProfileSection;
}): ActionRowBuilder<ButtonBuilder> {
  const { continent, page, countryIndex, activeTab } = options;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        buildCustomId('settings', 'countriesTab', continent.id, String(page), String(countryIndex), 'characteristics')
      )
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Характеристика')
      .setDisabled(activeTab === 'characteristics'),
    new ButtonBuilder()
      .setCustomId(
        buildCustomId('settings', 'countriesTab', continent.id, String(page), String(countryIndex), 'politics')
      )
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Политика')
      .setDisabled(activeTab === 'politics'),
    new ButtonBuilder()
      .setCustomId(
        buildCustomId('settings', 'countriesTab', continent.id, String(page), String(countryIndex), 'development')
      )
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Развитие')
      .setDisabled(activeTab === 'development')
  );
}

export async function buildCountryDetailsView(options: CountryDetailsViewOptions): Promise<{ components: TopLevelComponentData[] }> {
  const { guild, continent, country, countryIndex, profile, page, tab } = options;
  const activeTab: CountryProfileSection = tab ?? 'characteristics';

  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const worldEmoji = formatEmoji('worldpulse');
  const navEmoji = formatEmoji('nav');
  const emojiContinent = resolveEmojiIdentifier(continent.emoji, formatEmoji);
  const emojiCountry = resolveEmojiIdentifier(country.emoji, formatEmoji);
  const countryDisplay = buildCountryLabel(country.name, emojiCountry);
  const userLine = profile.registeredUserId ? `<@${profile.registeredUserId}>` : '-';
  const registeredLine = profile.registeredAt ? `\`${formatDateTime(profile.registeredAt)}\`` : '`-`';

  const tabButtons = buildTabButtons({
    continent,
    page,
    countryIndex,
    activeTab
  });

  const generalInfo = [
    '**Континент:**',
    `*${emojiContinent} ${continent.label}*`,
    '',
    '**Государство:**',
    `*${countryDisplay}*`,
    '',
    '**Пользователь:**',
    userLine,
    '',
    '**Зарегистрирован:**',
    registeredLine
  ].join('\n');

  const characteristicsSection = [
    `**${navEmoji} Характеристика**`,
    '',
    '**Правитель:**',
    `*${profile.ruler}*`,
    '',
    '**Территория:**',
    `*${profile.territory}*`,
    '',
    '**Население:**',
    `*${profile.population}*`
  ].join('\n');

  const politicsSection = [
    `**${navEmoji} Политика**`,
    '',
    '**Идеология:**',
    `*${profile.ideology}*`,
    '',
    '**Форма правления:**',
    `*${profile.governmentForm}*`,
    '',
    '**Гос. устройство:**',
    `*${profile.stateStructure}*`,
    '',
    '**Религия:**',
    `*${profile.religion}*`
  ].join('\n');

  const developmentSection = [
    `**${navEmoji} Развитие**`,
    '',
    '**Бюджет государства:**',
    formatBudgetValue(profile.budget)
  ].join('\n');

  const detailsContent =
    activeTab === 'politics'
      ? politicsSection
      : activeTab === 'development'
        ? developmentSection
        : characteristicsSection;

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'countriesBack', continent.id, String(page)))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('undonew'))
      .setLabel('Назад'),
    new ButtonBuilder()
      .setCustomId(buildCustomId('settings', 'countriesEdit', continent.id, String(page), String(countryIndex)))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('edit'))
      .setLabel('Редактировать')
      .setDisabled(activeTab !== 'characteristics'),
    new ButtonBuilder()
      .setCustomId(
        buildCustomId('settings', 'countriesReset', continent.id, String(page), String(countryIndex), activeTab)
      )
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('action_system'))
      .setLabel('По умолчанию')
  );

  const framed: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      { type: ComponentType.TextDisplay, content: `**${worldEmoji} Информация**` },
      tabButtons.toJSON(),
      { type: ComponentType.Separator, divider: true },
      { type: ComponentType.TextDisplay, content: generalInfo },
      { type: ComponentType.Separator, divider: true },
      { type: ComponentType.TextDisplay, content: detailsContent },
      { type: ComponentType.Separator, divider: true },
      actions.toJSON()
    ]
  };

  return { components: [framed] };
}

export async function formatCountryDisplay(guild: Guild, country: Country): Promise<string> {
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const emoji = resolveEmojiIdentifier(country.emoji, formatEmoji);
  return buildCountryLabel(country.name, emoji);
}