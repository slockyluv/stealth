import { Prisma } from '@prisma/client';
import type { ContinentId, Country } from '../discord/features/settings/countriesView.js';
import { getContinent } from '../discord/features/settings/countriesView.js';
import { prisma } from '../database/prisma.js';
import { clearCountryRegistration, normalizeCountryKey, setCountryRegistration } from './countryProfileService.js';

export type CountryRegistrationRecord = Prisma.CountryRegistrationGetPayload<{ }>;

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

  const registered = await prisma.countryRegistration.findMany({
    where: {
      guildId: BigInt(guildId),
      continent: continentId
    },
    select: {
      countryKey: true
    }
  });

  const taken = new Set(registered.map((record) => record.countryKey));

  return continent.countries.filter((country) => !taken.has(normalizeCountryKey(country.name)));
}

export type RegisterCountryResult =
  | { status: 'registered'; registration: CountryRegistrationRecord }
  | { status: 'alreadyRegistered'; registration: CountryRegistrationRecord }
  | { status: 'countryTaken'; registration: CountryRegistrationRecord | null };

export async function registerCountryForUser(
  guildId: string,
  userId: string,
  continentId: ContinentId,
  country: Country
): Promise<RegisterCountryResult> {
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