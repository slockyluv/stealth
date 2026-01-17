import { Prisma } from '@prisma/client';
import type { ContinentId, Country } from '../discord/features/settings/countriesView.js';
import { prisma } from '../database/prisma.js';
import { normalizeCountryKey } from './countryProfileService.js';
import type { PrivateCompanyRecord } from './privateCompanyService.js';

export type CompanyActivityCountryRecord = Prisma.CompanyActivityCountryGetPayload<{}>;

export async function addCompanyActivityCountry(options: {
  guildId: string;
  company: PrivateCompanyRecord;
  country: Country;
  continentId: ContinentId;
}): Promise<{ status: 'created' | 'alreadyExists'; record: CompanyActivityCountryRecord }> {
  const guildId = BigInt(options.guildId);
  const countryKey = normalizeCountryKey(options.country.name);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.companyActivityCountry.findUnique({
      where: {
        guildId_companyId_countryKey: {
          guildId,
          companyId: options.company.id,
          countryKey
        }
      }
    });

    if (existing) {
      return { status: 'alreadyExists', record: existing };
    }

    const record = await tx.companyActivityCountry.create({
      data: {
        guildId,
        companyId: options.company.id,
        companyName: options.company.name,
        companyIndustryKey: options.company.industryKey,
        companyIndustryLabel: options.company.industryLabel,
        countryName: options.country.name,
        countryKey,
        continent: options.continentId
      }
    });

    await tx.privateCompany.update({
      where: { id: options.company.id },
      data: { branchCount: { increment: 1 } }
    });

    return { status: 'created', record };
  });
}

export async function getCompanyActivityCountries(
  guildId: string,
  companyId: bigint
): Promise<CompanyActivityCountryRecord[]> {
  return prisma.companyActivityCountry.findMany({
    where: {
      guildId: BigInt(guildId),
      companyId
    },
    orderBy: { startedAt: 'desc' }
  });
}