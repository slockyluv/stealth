import { Prisma } from '@prisma/client';
import type { ContinentId, Country } from '../discord/features/settings/countriesView.js';
import { getContinent } from '../discord/features/settings/countriesView.js';
import { prisma } from '../database/prisma.js';
import { normalizeCountryKey } from './countryProfileService.js';
import type { CountryRegistrationRecord } from './countryRegistrationService.js';

export const COMPANY_PER_COUNTRY_LIMIT = 1;

export type PrivateCompanyRecord = Prisma.PrivateCompanyGetPayload<{}>;
export type PrivateCompanyDraftRecord = Prisma.PrivateCompanyDraftGetPayload<{}>;

export type CompanyIndustry = {
  key: string;
  label: string;
  emoji: string;
};

export const COMPANY_INDUSTRIES: CompanyIndustry[] = [
  { key: 'payment_system', label: 'Платежная система', emoji: 'transactionglobe' },
  { key: 'investment_exchange', label: 'Инвестиционная биржа', emoji: 'investment' },
  { key: 'crypto_exchange', label: 'Криптобиржа', emoji: 'exchangecrypto' },
  { key: 'construction', label: 'Строительство', emoji: 'towercrane' },
  { key: 'manufacturing', label: 'Производство', emoji: 'humanpictos' }
];

const COMPANY_INDUSTRY_MARKERS: Record<string, string> = {
  payment_system: 'PAY',
  investment_exchange: 'EXCH',
  crypto_exchange: 'CEX',
  construction: 'DEV',
  manufacturing: 'IND'
};

export function findIndustryByKey(key: string | null | undefined): CompanyIndustry | null {
  if (!key) return null;
  return COMPANY_INDUSTRIES.find((industry) => industry.key === key) ?? null;
}

export function getIndustryMarker(key: string | null | undefined): string | null {
  if (!key) return null;
  return COMPANY_INDUSTRY_MARKERS[key] ?? null;
}

export async function getCompanyDraft(guildId: string, userId: string): Promise<PrivateCompanyDraftRecord | null> {
  return prisma.privateCompanyDraft.findUnique({
    where: {
      guildId_userId: {
        guildId: BigInt(guildId),
        userId: BigInt(userId)
      }
    }
  });
}

export async function upsertCompanyDraft(
  guildId: string,
  userId: string,
  data: {
    name?: string | null;
    industryKey?: string | null;
    industryLabel?: string | null;
    countryName?: string | null;
    countryKey?: string | null;
    continent?: ContinentId | null;
  }
): Promise<PrivateCompanyDraftRecord> {
  return prisma.privateCompanyDraft.upsert({
    where: {
      guildId_userId: {
        guildId: BigInt(guildId),
        userId: BigInt(userId)
      }
    },
    create: {
      guildId: BigInt(guildId),
      userId: BigInt(userId),
      name: data.name ?? null,
      industryKey: data.industryKey ?? null,
      industryLabel: data.industryLabel ?? null,
      countryName: data.countryName ?? null,
      countryKey: data.countryKey ?? null,
      continent: data.continent ?? null
    },
    update: {
      name: data.name ?? undefined,
      industryKey: data.industryKey ?? undefined,
      industryLabel: data.industryLabel ?? undefined,
      countryName: data.countryName ?? undefined,
      countryKey: data.countryKey ?? undefined,
      continent: data.continent ?? undefined
    }
  });
}

export async function clearCompanyDraft(guildId: string, userId: string): Promise<void> {
  await prisma.privateCompanyDraft.deleteMany({
    where: {
      guildId: BigInt(guildId),
      userId: BigInt(userId)
    }
  });
}

export async function getAvailableCompanyCountries(
  guildId: string,
  continentId: ContinentId,
  limit = COMPANY_PER_COUNTRY_LIMIT
): Promise<Country[]> {
  const continent = getContinent(continentId);
  if (!continent) return [];

  const counts = await prisma.privateCompany.groupBy({
    by: ['countryKey'],
    where: {
      guildId: BigInt(guildId),
      continent: continentId,
      isActive: true
    },
    _count: {
      countryKey: true
    }
  });

  const taken = new Map<string, number>();
  for (const record of counts) {
    taken.set(record.countryKey, record._count.countryKey);
  }

  return continent.countries.filter((country) => {
    const countryKey = normalizeCountryKey(country.name);
    const count = taken.get(countryKey) ?? 0;
    return count < limit;
  });
}

export type RegisterCompanyResult =
  | { status: 'registered'; company: PrivateCompanyRecord }
  | { status: 'companyRegistered'; company: PrivateCompanyRecord }
  | { status: 'countryRegistered'; registration: CountryRegistrationRecord }
  | { status: 'missingData'; missing: Array<'name' | 'industry' | 'country'> };

export type UnregisterCompanyResult =
  | { status: 'notRegistered' }
  | { status: 'unregistered'; company: PrivateCompanyRecord };

export async function getUserActiveCompany(
  guildId: string,
  userId: string
): Promise<PrivateCompanyRecord | null> {
  return prisma.privateCompany.findFirst({
    where: {
      guildId: BigInt(guildId),
      ownerId: BigInt(userId),
      isActive: true
    },
    orderBy: {
      registeredAt: 'desc'
    }
  });
}

export async function unregisterCompanyForUser(
  guildId: string,
  userId: string
): Promise<UnregisterCompanyResult> {
  const company = await prisma.privateCompany.findFirst({
    where: {
      guildId: BigInt(guildId),
      ownerId: BigInt(userId),
      isActive: true
    },
    orderBy: {
      registeredAt: 'desc'
    }
  });

  if (!company) {
    return { status: 'notRegistered' };
  }

  const updated = await prisma.privateCompany.update({
    where: { id: company.id },
    data: { isActive: false }
  });

  return { status: 'unregistered', company: updated };
}

export async function registerPrivateCompany(options: {
  guildId: string;
  userId: string;
  name: string | null;
  industryKey: string | null;
  industryLabel: string | null;
  country: Country | null;
  continentId: ContinentId | null;
  limit?: number;
}): Promise<RegisterCompanyResult> {
  const existingCompany = await getUserActiveCompany(options.guildId, options.userId);
  if (existingCompany) {
    return { status: 'companyRegistered', company: existingCompany };
  }

  const existingRegistration = await prisma.countryRegistration.findUnique({
    where: {
      guildId_userId: {
        guildId: BigInt(options.guildId),
        userId: BigInt(options.userId)
      }
    }
  });
  if (existingRegistration) {
    return { status: 'countryRegistered', registration: existingRegistration };
  }

  const missing: Array<'name' | 'industry' | 'country'> = [];
  if (!options.name) missing.push('name');
  if (!options.industryKey || !options.industryLabel) missing.push('industry');
  if (!options.country || !options.continentId) missing.push('country');

  if (missing.length) {
    return { status: 'missingData', missing };
  }

  const { name, industryKey, industryLabel, country, continentId } = options;
  if (!name || !industryKey || !industryLabel || !country || !continentId) {
    return { status: 'missingData', missing };
  }

  const normalizedKey = normalizeCountryKey(country.name);

  const company = await prisma.$transaction(async (tx) => {
    const [existingName, count] = await Promise.all([
      tx.privateCompany.findFirst({
        where: {
          guildId: BigInt(options.guildId),
          isActive: true,
          name: {
            equals: name,
            mode: 'insensitive'
          }
        }
      }),
      tx.privateCompany.count({
        where: {
          guildId: BigInt(options.guildId),
          countryKey: normalizedKey,
          isActive: true
        }
      })
    ]);

    if (existingName) {
      throw new Error('nameTaken');
    }

    const limit = options.limit ?? COMPANY_PER_COUNTRY_LIMIT;
    if (count >= limit) {
      throw new Error('countryLimit');
    }

    return tx.privateCompany.create({
      data: {
        guildId: BigInt(options.guildId),
        ownerId: BigInt(options.userId),
        name,
        industryKey,
        industryLabel,
        countryName: country.name,
        countryKey: normalizedKey,
        continent: continentId,
        registeredAt: new Date(),
        isActive: true
      }
    });
  });

  await clearCompanyDraft(options.guildId, options.userId);

  return { status: 'registered', company };
}

export function isCountryLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === 'countryLimit';
}

export function isCompanyNameTakenError(error: unknown): boolean {
  return error instanceof Error && error.message === 'nameTaken';
}