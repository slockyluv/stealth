import { prisma } from '../database/prisma.js';
import {
  applyPopulationTaxCollection,
  getCountryProfile,
  resolveCountryPopulation,
  type CountryProfile
} from './countryProfileService.js';
import type { Country } from '../discord/features/settings/countriesView.js';

export const POPULATION_TAX_INTERVAL_MS = 60_000;

const TAXATION_MIN = 200000; // taxation min
const TAXATION_MAX = 300000; // taxation max

const POPULATION_REDUCTION_STEPS: Array<{ threshold: number; reductionPercent: number }> = [
  { threshold: 10_000_000, reductionPercent: 10 },
  { threshold: 20_000_000, reductionPercent: 15 },
  { threshold: 35_000_000, reductionPercent: 20 },
  { threshold: 50_000_000, reductionPercent: 25 },
  { threshold: 75_000_000, reductionPercent: 30 },
  { threshold: 100_000_000, reductionPercent: 35 },
  { threshold: 125_000_000, reductionPercent: 40 },
  { threshold: 160_000_000, reductionPercent: 45 },
  { threshold: 200_000_000, reductionPercent: 50 },
  { threshold: 300_000_000, reductionPercent: 55 },
  { threshold: 400_000_000, reductionPercent: 60 },
  { threshold: 600_000_000, reductionPercent: 65 },
  { threshold: 800_000_000, reductionPercent: 70 },
  { threshold: 1_200_000_000, reductionPercent: 75 },
  { threshold: 1_600_000_000, reductionPercent: 80 }
];

function parsePopulationValue(population: string): number {
  const digits = population.replace(/[^\d]/g, '');
  const parsed = digits ? Number(digits) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPopulationUnits(population: number): number {
  if (population <= 0) return 1;
  return Math.max(1, Math.floor(population / 100_000));
}

function getRandomInt(min: number, max: number): number {
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  return Math.floor(Math.random() * (normalizedMax - normalizedMin + 1)) + normalizedMin;
}

function getTaxRateCoefficient(rate: number): number {
  if (!Number.isFinite(rate)) return 1;
  return Math.max(0, rate / 10);
}

function getPopulationReductionPercent(population: number): number {
  let reduction = 0;
  for (const step of POPULATION_REDUCTION_STEPS) {
    if (population > step.threshold) {
      reduction = step.reductionPercent;
    }
  }
  return reduction;
}

function applyPopulationReduction(amount: number, population: number): number {
  const reductionPercent = getPopulationReductionPercent(population);
  if (reductionPercent <= 0) return amount;
  return amount * (1 - reductionPercent / 100);
}

function calculatePopulationTax(options: { population: string; taxRate: number }): bigint {
  const populationCount = parsePopulationValue(options.population);
  const units = getPopulationUnits(populationCount);
  const baseRandom = getRandomInt(TAXATION_MIN, TAXATION_MAX);
  const coefficient = getTaxRateCoefficient(options.taxRate);
  const beforeReduction = baseRandom * units * coefficient;
  const afterReduction = applyPopulationReduction(beforeReduction, populationCount);
  const normalized = Math.max(0, Math.round(afterReduction));
  return BigInt(normalized);
}

export function getPopulationTaxCooldownMs(lastCollectedAt: Date | null | undefined, now = Date.now()): number {
  if (!lastCollectedAt) return 0;
  const elapsed = now - lastCollectedAt.getTime();
  return Math.max(0, POPULATION_TAX_INTERVAL_MS - elapsed);
}

export function canCollectPopulationTax(lastCollectedAt: Date | null | undefined, now = Date.now()): boolean {
  return getPopulationTaxCooldownMs(lastCollectedAt, now) <= 0;
}

export type PopulationTaxCollectionResult =
  | { status: 'collected'; taxAmount: bigint; profile: CountryProfile }
  | { status: 'cooldown'; availableAt: Date; profile: CountryProfile };

export async function collectPopulationTaxForCountry(options: {
  guildId: string;
  country: Country;
}): Promise<PopulationTaxCollectionResult> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const profile = await getCountryProfile(options.guildId, options.country, tx);
    const cooldownMs = getPopulationTaxCooldownMs(profile.lastPopulationTaxAt, now.getTime());
    if (cooldownMs > 0) {
      return {
        status: 'cooldown',
        availableAt: new Date(now.getTime() + cooldownMs),
        profile
      };
    }

    const resolvedPopulation = resolveCountryPopulation(options.country.name, profile.population);
    const taxAmount = calculatePopulationTax({
      population: resolvedPopulation,
      taxRate: profile.populationTaxRate ?? 10
    });

    const updatedProfile = await applyPopulationTaxCollection(
      options.guildId,
      options.country,
      { taxAmount, collectedAt: now },
      tx
    );

    return { status: 'collected', taxAmount, profile: updatedProfile };
  });
}