import { prisma } from '../database/prisma.js';
import { logger } from '../shared/logger.js';

const POPULATION_TAX_INTERVAL_MS = 8 * 60 * 60;

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

async function collectPopulationTaxes(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const profiles = await tx.countryProfile.findMany({
      select: {
        id: true,
        population: true,
        populationTaxRate: true,
        budget: true
      }
    });

    if (profiles.length === 0) return;

    await Promise.all(
      profiles.map((profile) => {
        const taxAmount = calculatePopulationTax({
          population: profile.population,
          taxRate: profile.populationTaxRate ?? 10
        });
        const currentBudget = typeof profile.budget === 'bigint' ? profile.budget : 0n;
        return tx.countryProfile.update({
          where: { id: profile.id },
          data: { budget: currentBudget + taxAmount }
        });
      })
    );
  });
}

export function schedulePopulationTaxCollection(): void {
  const interval = setInterval(() => {
    collectPopulationTaxes().catch((error) => {
      logger.error(error);
    });
  }, POPULATION_TAX_INTERVAL_MS);

  interval.unref();
}