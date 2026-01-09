import { Prisma } from '@prisma/client';
import type { ContinentId, Country } from '../discord/features/settings/countriesView.js';
import { getContinent, getContinents } from '../discord/features/settings/countriesView.js';
import { prisma } from '../database/prisma.js';
import { clearCountryRegistration, normalizeCountryKey, setCountryRegistration } from './countryProfileService.js';
import { getUserActiveCompany, type PrivateCompanyRecord } from './privateCompanyService.js';

export type CountryRegistrationRecord = Prisma.CountryRegistrationGetPayload<{ }>;

type CountryLookupResult = {
  continentId: ContinentId;
  country: Country;
};

function normalizeSearchValue(value: string): string {
  return normalizeCountryKey(value).replace(/:/g, '');
}

function extractEmojiName(value: string): string | null {
  const trimmed = value.trim();
  const mentionMatch = trimmed.match(/^<a?:([\w-]+):\d+>$/);
  if (mentionMatch?.[1]) return mentionMatch[1];

  const colonMatch = trimmed.match(/^:([\w-]+):$/);
  if (colonMatch?.[1]) return colonMatch[1];

  return null;
}

function extractFlagKey(value: string): string | null {
  const codePoints = [...value.trim()];
  if (codePoints.length !== 2) return null;

  const base = 0x1f1e6;
  const offsets = codePoints.map((char) => {
    const point = char.codePointAt(0);
    if (!point) return null;
    const offset = point - base;
    return offset >= 0 && offset < 26 ? offset : null;
  });

  if (offsets.includes(null)) return null;

  const letters = offsets.map((offset) => String.fromCharCode((offset ?? 0) + 97)).join('');
  return `flag_${letters}`;
}

function findCountryByPredicate(predicate: (params: { country: Country; continentId: ContinentId }) => boolean):
  | CountryLookupResult
  | null {
  for (const continent of getContinents()) {
    for (const country of continent.countries) {
      if (predicate({ country, continentId: continent.id })) {
        return { continentId: continent.id, country };
      }
    }
  }

  return null;
}

export function findCountryByQuery(query: string): CountryLookupResult | null {
  const normalizedQuery = normalizeSearchValue(query);
  const emojiName = extractEmojiName(query);
  const emojiQuery = emojiName ? normalizeSearchValue(emojiName) : normalizedQuery;
  const flagQuery = extractFlagKey(query);

  return (
    findCountryByPredicate(({ country }) => normalizeSearchValue(country.name) === normalizedQuery) ??
    findCountryByPredicate(({ country }) => normalizeSearchValue(country.emoji) === emojiQuery) ??
    (flagQuery
      ? findCountryByPredicate(({ country }) => normalizeSearchValue(country.emoji) === normalizeSearchValue(flagQuery))
      : null)
  );
}

export function findCountryByKey(countryKey: string): CountryLookupResult | null {
  const normalizedKey = normalizeSearchValue(countryKey);
  return findCountryByPredicate(({ country }) => normalizeSearchValue(country.name) === normalizedKey);
}

export async function getUserRegistration(guildId: string, userId: string): Promise<CountryRegistrationRecord | null> {
  return prisma.countryRegistration.findUnique({
    where: {
      guildId_userId: {
        guildId: BigInt(guildId),
        userId: BigInt(userId)
      }
    }
  });
}

export async function getCountryRegistration(
  guildId: string,
  country: Country
): Promise<CountryRegistrationRecord | null> {
  return prisma.countryRegistration.findUnique({
    where: {
      guildId_countryKey: {
        guildId: BigInt(guildId),
        countryKey: normalizeCountryKey(country.name)
      }
    }
  });
}

export async function getAvailableCountries(
  guildId: string,
  continentId: ContinentId
): Promise<Country[]> {
  const continent = getContinent(continentId);
  if (!continent) return [];

  const rows = await prisma.$queryRaw<{ country_key: string }[]>`
    SELECT "countryKey" as country_key
    FROM "CountryRegistration"
    WHERE "guildId" = ${BigInt(guildId)} AND "continent" = ${continentId}::"ContinentId"
    UNION
    SELECT "countryName" as country_key
    FROM "CountryProfile"
    WHERE "guildId" = ${BigInt(guildId)} AND "registeredUserId" IS NOT NULL
  `;

  const taken = new Set<string>();

  for (const record of rows) {
    taken.add(record.country_key);
  }

  return continent.countries.filter((country) => !taken.has(normalizeCountryKey(country.name)));
}

export type RegisterCountryResult =
  | { status: 'registered'; registration: CountryRegistrationRecord }
  | { status: 'alreadyRegistered'; registration: CountryRegistrationRecord }
  | { status: 'countryTaken'; registration: CountryRegistrationRecord | null }
  | { status: 'companyRegistered'; company: PrivateCompanyRecord };

export type UnregisterCountryResult =
  | { status: 'notRegistered' }
  | { status: 'unregistered'; registration: CountryRegistrationRecord; country: Country; continentId: ContinentId };

export async function registerCountryForUser(
  guildId: string,
  userId: string,
  continentId: ContinentId,
  country: Country
): Promise<RegisterCountryResult> {
  const existingCompany = await getUserActiveCompany(guildId, userId);
  if (existingCompany) {
    return { status: 'companyRegistered', company: existingCompany };
  }

  const normalizedKey = normalizeCountryKey(country.name);
  const registeredAt = new Date();

  try {
    const { registration } = await prisma.$transaction(async (tx) => {
      const created = await tx.countryRegistration.create({
        data: {
          guildId: BigInt(guildId),
          userId: BigInt(userId),
          countryName: country.name,
          countryKey: normalizedKey,
          continent: continentId
        }
      });

      await setCountryRegistration(guildId, country, userId, registeredAt, tx);

      return { registration: created };
    });

    return { status: 'registered', registration };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existingUserRegistration = await getUserRegistration(guildId, userId);
      if (existingUserRegistration) {
        return { status: 'alreadyRegistered', registration: existingUserRegistration };
      }

      const existingCountryRegistration = await getCountryRegistration(guildId, country);
      return { status: 'countryTaken', registration: existingCountryRegistration };
    }

    throw error;
  }
}

export async function clearCountryRegistrationForCountry(guildId: string, country: Country): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.countryRegistration.deleteMany({
      where: {
        guildId: BigInt(guildId),
        countryKey: normalizeCountryKey(country.name)
      }
    });

    await clearCountryRegistration(guildId, country, tx);
  });
}

export async function unregisterCountryForUser(
  guildId: string,
  userId: string
): Promise<UnregisterCountryResult> {
  const registration = await prisma.countryRegistration.findUnique({
    where: {
      guildId_userId: {
        guildId: BigInt(guildId),
        userId: BigInt(userId)
      }
    }
  });

  if (!registration) {
    return { status: 'notRegistered' };
  }

  const lookup = findCountryByKey(registration.countryKey);
  const country = lookup?.country ?? { name: registration.countryName, emoji: '' };

  await prisma.$transaction(async (tx) => {
    await tx.countryRegistration.delete({ where: { id: registration.id } });
    await clearCountryRegistration(guildId, country, tx);
  });

  return {
    status: 'unregistered',
    registration,
    country,
    continentId: lookup?.continentId ?? registration.continent
  };
}