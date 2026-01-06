import { Prisma } from '@prisma/client';
import type { ContinentId, Country } from '../discord/features/settings/countriesView.js';
import { getContinent } from '../discord/features/settings/countriesView.js';
import { prisma } from '../database/prisma.js';
import { normalizeCountryKey, type CountryBudgetChangeType } from './countryProfileService.js';
import type { CountryRegistrationRecord } from './countryRegistrationService.js';

export const COMPANY_PER_COUNTRY_LIMIT = 1;

export type PrivateCompanyRecord = Prisma.PrivateCompanyGetPayload<{}>;
export type PrivateCompanyDraftRecord = Prisma.PrivateCompanyDraftGetPayload<{}>;

export type CompanyIndustry = {
  key: string;
  label: string;
  emoji: string;
};

export type CompanyFeeKey =
  | 'paymentTransfer'
  | 'investmentTrade'
  | 'cryptoTrade'
  | 'cryptoTransfer'
  | 'constructionProfit'
  | 'manufacturingMarkup';

export const PAYMENT_SYSTEM_ONBOARDING_PRICES = {
  mainOffice: 100000n,
  serverInfrastructure: 150000n,
  webDevelopment: 200000n
} as const;

export type PaymentSystemInfrastructureKey = keyof Pick<
  typeof PAYMENT_SYSTEM_ONBOARDING_PRICES,
  'mainOffice' | 'serverInfrastructure'
>;

const COMPANY_FEE_FIELDS: Record<CompanyFeeKey, keyof Prisma.PrivateCompanyUncheckedUpdateInput> = {
  paymentTransfer: 'paymentTransferFeeRate',
  investmentTrade: 'investmentTradeFeeRate',
  cryptoTrade: 'cryptoTradeFeeRate',
  cryptoTransfer: 'cryptoTransferFeeRate',
  constructionProfit: 'constructionProfitRate',
  manufacturingMarkup: 'manufacturingMarkupRate'
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
      continent: continentId
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

export async function getInactiveCompanies(guildId: string): Promise<PrivateCompanyRecord[]> {
  return prisma.privateCompany.findMany({
    where: {
      guildId: BigInt(guildId),
      isActive: false
    },
    orderBy: [{ countryName: 'asc' }, { name: 'asc' }]
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

export type CompanyBudgetUpdateResult = {
  company: PrivateCompanyRecord;
  previousBudget: bigint;
};

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

export async function updateCompanyBudgetForUser(
  guildId: string,
  userId: string,
  options: { type: CountryBudgetChangeType; amount: bigint }
): Promise<CompanyBudgetUpdateResult | null> {
  return prisma.$transaction(async (tx) => {
    const company = await tx.privateCompany.findFirst({
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
      return null;
    }

    const currentBudget = company.budget ?? 0n;
    let nextBudget = currentBudget;

    if (options.type === 'increase') {
      nextBudget = currentBudget + options.amount;
    } else if (options.type === 'decrease') {
      nextBudget = currentBudget - options.amount;
    } else if (options.type === 'reset') {
      nextBudget = 0n;
    }

    const updated = await tx.privateCompany.update({
      where: { id: company.id },
      data: { budget: nextBudget }
    });

    return { company: updated, previousBudget: currentBudget };
  });
}

export async function updateCompanyFeeRateForUser(
  guildId: string,
  userId: string,
  feeKey: CompanyFeeKey,
  rate: number | null
): Promise<PrivateCompanyRecord | null> {
  const field = COMPANY_FEE_FIELDS[feeKey];

  return prisma.$transaction(async (tx) => {
    const company = await tx.privateCompany.findFirst({
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
      return null;
    }

    const updated = await tx.privateCompany.update({
      where: { id: company.id },
      data: { [field]: rate }
    });

    return updated;
  });
}

export function isPaymentSystemOnboardingComplete(company: PrivateCompanyRecord): boolean {
  return (
    company.paymentSystemLegalNewsDone &&
    company.paymentSystemInfrastructureMainOfficeBuilt &&
    company.paymentSystemInfrastructureServerBuilt &&
    company.paymentSystemWebDevelopmentOrdered
  );
}

export async function markPaymentSystemLegalNewsStarted(
  guildId: string,
  userId: string
): Promise<PrivateCompanyRecord | null> {
  return prisma.privateCompany.updateMany({
    where: {
      guildId: BigInt(guildId),
      ownerId: BigInt(userId),
      isActive: true,
      industryKey: 'payment_system'
    },
    data: {
      paymentSystemLegalNewsStarted: true
    }
  }).then(async (result) => {
    if (result.count === 0) {
      return null;
    }
    return getUserActiveCompany(guildId, userId);
  });
}

export async function markPaymentSystemLegalNewsDone(
  guildId: string,
  userId: string
): Promise<PrivateCompanyRecord | null> {
  return prisma.$transaction(async (tx) => {
    const company = await tx.privateCompany.findFirst({
      where: {
        guildId: BigInt(guildId),
        ownerId: BigInt(userId),
        isActive: true,
        industryKey: 'payment_system'
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    if (!company) {
      return null;
    }

    const nextState = {
      paymentSystemLegalNewsDone: true,
      paymentSystemInfrastructureMainOfficeBuilt: company.paymentSystemInfrastructureMainOfficeBuilt,
      paymentSystemInfrastructureServerBuilt: company.paymentSystemInfrastructureServerBuilt,
      paymentSystemWebDevelopmentOrdered: company.paymentSystemWebDevelopmentOrdered
    };

    const shouldOpenBranch = company.branchCount === 0 && isPaymentSystemOnboardingComplete({ ...company, ...nextState });

    return tx.privateCompany.update({
      where: { id: company.id },
      data: {
        paymentSystemLegalNewsStarted: true,
        paymentSystemLegalNewsDone: true,
        branchCount: shouldOpenBranch ? 1 : company.branchCount
      }
    });
  });
}

export type PaymentSystemPurchaseResult =
  | { status: 'notFound' | 'notAllowed'; price: bigint }
  | { status: 'insufficientFunds'; company: PrivateCompanyRecord; price: bigint }
  | { status: 'alreadyCompleted'; company: PrivateCompanyRecord; price: bigint }
  | { status: 'success'; company: PrivateCompanyRecord; price: bigint };

export async function buildPaymentSystemInfrastructure(
  guildId: string,
  userId: string,
  item: PaymentSystemInfrastructureKey
): Promise<PaymentSystemPurchaseResult> {
  const price = PAYMENT_SYSTEM_ONBOARDING_PRICES[item];

  return prisma.$transaction(async (tx) => {
    const company = await tx.privateCompany.findFirst({
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
      return { status: 'notFound', price };
    }

    if (company.industryKey !== 'payment_system') {
      return { status: 'notAllowed', price };
    }

    const isBuilt =
      item === 'mainOffice'
        ? company.paymentSystemInfrastructureMainOfficeBuilt
        : company.paymentSystemInfrastructureServerBuilt;

    if (isBuilt) {
      return { status: 'alreadyCompleted', company, price };
    }

    const currentBudget = company.budget ?? 0n;
    if (currentBudget < price) {
      return { status: 'insufficientFunds', company, price };
    }

    const updates =
      item === 'mainOffice'
        ? { paymentSystemInfrastructureMainOfficeBuilt: true }
        : { paymentSystemInfrastructureServerBuilt: true };

    const nextState = {
      paymentSystemLegalNewsDone: company.paymentSystemLegalNewsDone,
      paymentSystemInfrastructureMainOfficeBuilt:
        item === 'mainOffice' ? true : company.paymentSystemInfrastructureMainOfficeBuilt,
      paymentSystemInfrastructureServerBuilt:
        item === 'serverInfrastructure' ? true : company.paymentSystemInfrastructureServerBuilt,
      paymentSystemWebDevelopmentOrdered: company.paymentSystemWebDevelopmentOrdered
    };

    const shouldOpenBranch = company.branchCount === 0 && isPaymentSystemOnboardingComplete({ ...company, ...nextState });

    const updated = await tx.privateCompany.update({
      where: { id: company.id },
      data: {
        budget: currentBudget - price,
        ...updates,
        branchCount: shouldOpenBranch ? 1 : company.branchCount
      }
    });

    return { status: 'success', company: updated, price };
  });
}

export async function orderPaymentSystemWebDevelopment(
  guildId: string,
  userId: string
): Promise<PaymentSystemPurchaseResult> {
  const price = PAYMENT_SYSTEM_ONBOARDING_PRICES.webDevelopment;

  return prisma.$transaction(async (tx) => {
    const company = await tx.privateCompany.findFirst({
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
      return { status: 'notFound', price };
    }

    if (company.industryKey !== 'payment_system') {
      return { status: 'notAllowed', price };
    }

    if (company.paymentSystemWebDevelopmentOrdered) {
      return { status: 'alreadyCompleted', company, price };
    }

    const currentBudget = company.budget ?? 0n;
    if (currentBudget < price) {
      return { status: 'insufficientFunds', company, price };
    }

    const nextState = {
      paymentSystemLegalNewsDone: company.paymentSystemLegalNewsDone,
      paymentSystemInfrastructureMainOfficeBuilt: company.paymentSystemInfrastructureMainOfficeBuilt,
      paymentSystemInfrastructureServerBuilt: company.paymentSystemInfrastructureServerBuilt,
      paymentSystemWebDevelopmentOrdered: true
    };

    const shouldOpenBranch = company.branchCount === 0 && isPaymentSystemOnboardingComplete({ ...company, ...nextState });

    const updated = await tx.privateCompany.update({
      where: { id: company.id },
      data: {
        budget: currentBudget - price,
        paymentSystemWebDevelopmentOrdered: true,
        branchCount: shouldOpenBranch ? 1 : company.branchCount
      }
    });

    return { status: 'success', company: updated, price };
  });
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

  const sanitizedName = options.name?.trim() ?? null;
  const { industryKey, industryLabel, country, continentId } = options;
  const name = sanitizedName;
  if (!name || !industryKey || !industryLabel || !country || !continentId) {
    return { status: 'missingData', missing };
  }

  const normalizedKey = normalizeCountryKey(country.name);

  const company = await prisma.$transaction(async (tx) => {
    const [existingName, count] = await Promise.all([
      tx.privateCompany.findFirst({
        where: {
          guildId: BigInt(options.guildId),
          name: {
            equals: name,
            mode: 'insensitive'
          }
        }
      }),
      tx.privateCompany.count({
        where: {
          guildId: BigInt(options.guildId),
          countryKey: normalizedKey
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

export type RegisterExistingCompanyResult =
  | { status: 'registered'; company: PrivateCompanyRecord }
  | { status: 'companyRegistered'; company: PrivateCompanyRecord }
  | { status: 'countryRegistered'; registration: CountryRegistrationRecord }
  | { status: 'notAvailable' };

export async function registerExistingCompany(options: {
  guildId: string;
  userId: string;
  companyId: string;
}): Promise<RegisterExistingCompanyResult> {
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

  let companyId: bigint;
  try {
    companyId = BigInt(options.companyId);
  } catch {
    return { status: 'notAvailable' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const availableCompany = await tx.privateCompany.findFirst({
      where: {
        id: companyId,
        guildId: BigInt(options.guildId),
        isActive: false
      }
    });

    if (!availableCompany) {
      return null;
    }

    return tx.privateCompany.update({
      where: { id: availableCompany.id },
      data: {
        ownerId: BigInt(options.userId),
        isActive: true,
        registeredAt: new Date()
      }
    });
  });

  if (!updated) {
    return { status: 'notAvailable' };
  }

  return { status: 'registered', company: updated };
}

export function isCountryLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === 'countryLimit';
}

export function isCompanyNameTakenError(error: unknown): boolean {
  return error instanceof Error && error.message === 'nameTaken';
}

export async function resetPrivateCompanies(guildId: string): Promise<{
  companiesCleared: number;
  draftsCleared: number;
}> {
  const [companies, drafts] = await prisma.$transaction([
    prisma.privateCompany.deleteMany({
      where: {
        guildId: BigInt(guildId)
      }
    }),
    prisma.privateCompanyDraft.deleteMany({
      where: {
        guildId: BigInt(guildId)
      }
    })
  ]);

  return {
    companiesCleared: companies.count,
    draftsCleared: drafts.count
  };
}