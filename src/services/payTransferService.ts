import { prisma } from '../database/prisma.js';
import { normalizeCountryKey } from './countryProfileService.js';
import {
  findCountryByKey,
  findCountryByPartialQuery,
  findCountryByQuery,
  getUserRegistration,
  type CountryRegistrationRecord
} from './countryRegistrationService.js';
import { getUserActiveCompany, type PrivateCompanyRecord } from './privateCompanyService.js';

export const CASH_TRANSFER_FEE_RATE = 50; // Процент комиссии для передачи наличными

export type PayTransferDraftRecord = {
  id: bigint;
  guildId: bigint;
  userId: bigint;
  recipientUserId: bigint | null;
  amount: bigint | null;
  paymentSystemCompanyId: bigint | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TransferEntity =
  | {
      type: 'company';
      userId: string;
      company: PrivateCompanyRecord;
      countryKey: string;
      countryName: string;
    }
  | {
      type: 'country';
      userId: string;
      registration: CountryRegistrationRecord;
      countryKey: string;
      countryName: string;
    };

export type PaymentSystemEntry = {
  company: PrivateCompanyRecord;
  feeRate: number;
};

export type PayTransferResult =
  | {
      status: 'success';
      method: 'payment_system' | 'cash';
      feeRate: number;
      feeAmount: bigint;
      receivedAmount: bigint;
      paymentSystemCompanyId: bigint | null;
      senderEntity: TransferEntity;
      recipientEntity: TransferEntity;
    }
  | { status: 'error'; reason: string };

export type PayTransferViewData = {
  senderEntity: TransferEntity;
  recipientEntity: TransferEntity | null;
  paymentSystem: PaymentSystemEntry | null;
  amount: bigint | null;
  feeRate: number;
};

export async function getPayTransferDraft(guildId: string, userId: string): Promise<PayTransferDraftRecord | null> {
  return prisma.payTransferDraft.findUnique({
    where: {
      guildId_userId: {
        guildId: BigInt(guildId),
        userId: BigInt(userId)
      }
    }
  });
}

export async function upsertPayTransferDraft(
  guildId: string,
  userId: string,
  data: {
    recipientUserId?: string | null;
    amount?: bigint | null;
    paymentSystemCompanyId?: bigint | null;
  }
): Promise<PayTransferDraftRecord> {
  return prisma.payTransferDraft.upsert({
    where: {
      guildId_userId: {
        guildId: BigInt(guildId),
        userId: BigInt(userId)
      }
    },
    create: {
      guildId: BigInt(guildId),
      userId: BigInt(userId),
      recipientUserId: data.recipientUserId ? BigInt(data.recipientUserId) : null,
      amount: data.amount ?? null,
      paymentSystemCompanyId: data.paymentSystemCompanyId ?? null
    },
    update: {
      recipientUserId: data.recipientUserId !== undefined ? (data.recipientUserId ? BigInt(data.recipientUserId) : null) : undefined,
      amount: data.amount !== undefined ? data.amount : undefined,
      paymentSystemCompanyId:
        data.paymentSystemCompanyId !== undefined ? data.paymentSystemCompanyId : undefined
    }
  });
}

export async function resolveTransferEntity(guildId: string, userId: string): Promise<TransferEntity | null> {
  const company = await getUserActiveCompany(guildId, userId);
  if (company) {
    return {
      type: 'company',
      userId,
      company,
      countryKey: normalizeCountryKey(company.countryName),
      countryName: company.countryName
    };
  }

  const registration = await getUserRegistration(guildId, userId);
  if (!registration) {
    return null;
  }

  return {
    type: 'country',
    userId,
    registration,
    countryKey: normalizeCountryKey(registration.countryName),
    countryName: registration.countryName
  };
}

export async function resolvePayTransferViewData(
  guildId: string,
  userId: string
): Promise<PayTransferViewData | null> {
  const senderEntity = await resolveTransferEntity(guildId, userId);
  if (!senderEntity) return null;

  const draft = await getPayTransferDraft(guildId, userId);
  const senderPaymentSystems = await getPaymentSystemsForCountry(guildId, senderEntity.countryKey);

  let paymentSystem: PaymentSystemEntry | null = null;
  if (draft?.paymentSystemCompanyId) {
    const matched =
      senderPaymentSystems.find((entry) => entry.company.id === draft.paymentSystemCompanyId) ?? null;
    if (matched) {
      paymentSystem = matched;
    } else {
      await upsertPayTransferDraft(guildId, userId, {
        paymentSystemCompanyId: null
      });
    }
  }

  const recipientEntity =
    draft?.recipientUserId ? await resolveTransferEntity(guildId, draft.recipientUserId.toString()) : null;

  const rawFeeRate = paymentSystem ? paymentSystem.feeRate : CASH_TRANSFER_FEE_RATE;
  const feeRate = Math.max(0, Math.min(100, rawFeeRate));

  return {
    senderEntity,
    recipientEntity,
    paymentSystem,
    amount: draft?.amount ?? null,
    feeRate
  };
}

export async function getPaymentSystemsForCountry(
  guildId: string,
  countryKey: string
): Promise<PaymentSystemEntry[]> {
  const normalizedKey = normalizeCountryKey(countryKey);
  const activities = await prisma.companyActivityCountry.findMany({
    where: {
      guildId: BigInt(guildId),
      countryKey: normalizedKey,
      companyIndustryKey: 'payment_system'
    }
  });

  if (!activities.length) return [];

  const companyIds = [...new Set(activities.map((entry) => entry.companyId))];
  const companies = await prisma.privateCompany.findMany({
    where: {
      id: { in: companyIds },
      isActive: true,
      industryKey: 'payment_system'
    },
    orderBy: { name: 'asc' }
  });

  return companies.map((company) => ({
    company,
    feeRate: company.paymentTransferFeeRate ?? 0
  }));
}

export async function findRecipientUserIdByQuery(
  guildId: string,
  query: string
): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const countryLookup = findCountryByQuery(trimmed) ?? findCountryByKey(trimmed) ?? findCountryByPartialQuery(trimmed) ?? null;
  const normalizedCountryKey = countryLookup ? normalizeCountryKey(countryLookup.country.name) : null;

  if (normalizedCountryKey) {
    const registration = await prisma.countryRegistration.findUnique({
      where: {
        guildId_countryKey: {
          guildId: BigInt(guildId),
          countryKey: normalizedCountryKey
        }
      }
    });
    if (registration?.userId) {
      return registration.userId.toString();
    }

    const profile = await prisma.countryProfile.findUnique({
      where: {
        guildId_countryName: {
          guildId: BigInt(guildId),
          countryName: normalizedCountryKey
        }
      }
    });
    if (profile?.registeredUserId) {
      return profile.registeredUserId.toString();
    }
  }

  const companies = await prisma.privateCompany.findMany({
    where: {
      guildId: BigInt(guildId),
      isActive: true,
      name: {
        contains: trimmed,
        mode: 'insensitive'
      }
    },
    take: 5
  });

  if (!companies.length) return null;

  const normalizedQuery = trimmed.toLowerCase();
  const bestMatch = [...companies].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aScore = aName === normalizedQuery ? 0 : aName.startsWith(normalizedQuery) ? 1 : aName.includes(normalizedQuery) ? 2 : 3;
    const bScore = bName === normalizedQuery ? 0 : bName.startsWith(normalizedQuery) ? 1 : bName.includes(normalizedQuery) ? 2 : 3;
    if (aScore !== bScore) return aScore - bScore;
    return aName.length - bName.length;
  })[0];

  return bestMatch?.ownerId ? bestMatch.ownerId.toString() : null;
}

export async function performPayTransfer(options: {
  guildId: string;
  senderUserId: string;
  recipientUserId: string;
  amount: bigint;
  preferredPaymentSystemId?: bigint | null;
}): Promise<PayTransferResult> {
  const senderEntity = await resolveTransferEntity(options.guildId, options.senderUserId);
  if (!senderEntity) {
    return { status: 'error', reason: 'Отправитель не зарегистрирован.' };
  }

  const recipientEntity = await resolveTransferEntity(options.guildId, options.recipientUserId);
  if (!recipientEntity) {
    return { status: 'error', reason: 'Получатель не зарегистрирован.' };
  }

  if (options.senderUserId === options.recipientUserId) {
    return { status: 'error', reason: 'Нельзя отправлять перевод самому себе.' };
  }

  const senderPaymentSystems = await getPaymentSystemsForCountry(options.guildId, senderEntity.countryKey);
  const recipientPaymentSystems = await getPaymentSystemsForCountry(options.guildId, recipientEntity.countryKey);
  const recipientPaymentIds = new Set(recipientPaymentSystems.map((entry) => entry.company.id));

  const preferred =
    options.preferredPaymentSystemId !== undefined && options.preferredPaymentSystemId !== null
      ? senderPaymentSystems.find((entry) => entry.company.id === options.preferredPaymentSystemId) ?? null
      : senderPaymentSystems.length > 0
        ? senderPaymentSystems[0]
        : null;

  const canUsePreferred = preferred ? recipientPaymentIds.has(preferred.company.id) : false;
  const method: 'payment_system' | 'cash' = canUsePreferred ? 'payment_system' : 'cash';
  const rawFeeRate = method === 'payment_system' ? preferred?.feeRate ?? 0 : CASH_TRANSFER_FEE_RATE;
  const feeRate = Math.max(0, Math.min(100, rawFeeRate));
  const feeAmount = (options.amount * BigInt(feeRate)) / 100n;
  const receivedAmount = options.amount - feeAmount;

  try {
    await prisma.$transaction(async (tx) => {
      const senderBudget =
        senderEntity.type === 'company'
          ? await tx.privateCompany.findUnique({ where: { id: senderEntity.company.id } })
          : await tx.countryProfile.findUnique({
              where: {
                guildId_countryName: {
                  guildId: BigInt(options.guildId),
                  countryName: normalizeCountryKey(senderEntity.countryName)
                }
              }
            });

      const senderBalance = senderEntity.type === 'company' ? senderBudget?.budget : senderBudget?.budget;
      if (senderBalance === null || senderBalance === undefined || senderBalance < options.amount) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      if (senderEntity.type === 'company') {
        await tx.privateCompany.update({
          where: { id: senderEntity.company.id },
          data: { budget: { decrement: options.amount } }
        });
      } else {
        await tx.countryProfile.update({
          where: {
            guildId_countryName: {
              guildId: BigInt(options.guildId),
              countryName: normalizeCountryKey(senderEntity.countryName)
            }
          },
          data: { budget: { decrement: options.amount } }
        });
      }

      if (recipientEntity.type === 'company') {
        await tx.privateCompany.update({
          where: { id: recipientEntity.company.id },
          data: { budget: { increment: receivedAmount } }
        });
      } else {
        await tx.countryProfile.update({
          where: {
            guildId_countryName: {
              guildId: BigInt(options.guildId),
              countryName: normalizeCountryKey(recipientEntity.countryName)
            }
          },
          data: { budget: { increment: receivedAmount } }
        });
      }

      if (method === 'payment_system' && preferred && feeAmount > 0n) {
        await tx.privateCompany.update({
          where: { id: preferred.company.id },
          data: { budget: { increment: feeAmount } }
        });
      }

      await tx.payTransfer.create({
        data: {
          guildId: BigInt(options.guildId),
          senderUserId: BigInt(options.senderUserId),
          recipientUserId: BigInt(options.recipientUserId),
          senderEntityType: senderEntity.type,
          recipientEntityType: recipientEntity.type,
          senderCompanyId: senderEntity.type === 'company' ? senderEntity.company.id : null,
          recipientCompanyId: recipientEntity.type === 'company' ? recipientEntity.company.id : null,
          senderCountryKey: senderEntity.countryKey,
          recipientCountryKey: recipientEntity.countryKey,
          amount: options.amount,
          feeRate,
          feeAmount,
          receivedAmount,
          method,
          paymentSystemCompanyId: method === 'payment_system' && preferred ? preferred.company.id : null
        }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_FUNDS') {
      return { status: 'error', reason: 'Недостаточно средств для перевода.' };
    }
    return { status: 'error', reason: 'Не удалось выполнить перевод. Попробуйте позже.' };
  }

  return {
    status: 'success',
    method,
    feeRate,
    feeAmount,
    receivedAmount,
    paymentSystemCompanyId: method === 'payment_system' && preferred ? preferred.company.id : null,
    senderEntity,
    recipientEntity
  };
}