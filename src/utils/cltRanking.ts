import { CLT_BANK_RANKING_BASE, DEFAULT_CLT_RANKING_WEIGHTS } from '../data/cltBankRanking';
import type {
  CltBankRankingProfile,
  CltPreSimulatorFormData,
  CltRankingGoal,
  CltRankingMetric,
  CltRankingWeights,
  EligibleCltBank,
} from '../types';

const OBJECTIVE_WEIGHT_MULTIPLIER = 1.6;

export function rankEligibleCltBanks(banks: EligibleCltBank[], form: CltPreSimulatorFormData) {
  const weights = getAdjustedRankingWeights(form.objetivoCliente);

  return [...banks].sort((left, right) => {
    const rightScore = calculateCltBankPriorityScore(right.id, weights);
    const leftScore = calculateCltBankPriorityScore(left.id, weights);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return left.name.localeCompare(right.name, 'pt-BR');
  });
}

export function calculateCltBankPriorityScore(bankId: string, weights: CltRankingWeights) {
  const profile = CLT_BANK_RANKING_BASE[bankId];
  if (!profile) return 0;

  return Object.entries(weights).reduce((total, [metric, weight]) => {
    const value = profile[metric as CltRankingMetric] ?? 0;
    return total + value * weight;
  }, 0);
}

export function getAdjustedRankingWeights(rawObjective: string): CltRankingWeights {
  const goal = parseRankingGoal(rawObjective);
  if (goal === 'default') {
    return DEFAULT_CLT_RANKING_WEIGHTS;
  }

  const boostedMetric = getBoostedMetric(goal);
  const boostedWeights: CltRankingWeights = {
    ...DEFAULT_CLT_RANKING_WEIGHTS,
    [boostedMetric]: DEFAULT_CLT_RANKING_WEIGHTS[boostedMetric] * OBJECTIVE_WEIGHT_MULTIPLIER,
  };

  return normalizeWeights(boostedWeights);
}

function parseRankingGoal(rawObjective: string): CltRankingGoal {
  const normalized = normalizeObjective(rawObjective);

  if (!normalized) return 'default';
  if (normalized.includes('maior valor')) return 'maior-valor';
  if (normalized.includes('menor parcela')) return 'menor-parcela';
  if (normalized.includes('aprovacao mais facil')) return 'aprovacao-facil';

  return 'default';
}

function getBoostedMetric(goal: CltRankingGoal): CltRankingMetric {
  if (goal === 'maior-valor') return 'releasedAmount';
  if (goal === 'menor-parcela') return 'installmentTerm';
  return 'approvalChance';
}

function normalizeWeights(weights: CltRankingWeights): CltRankingWeights {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);

  return {
    approvalChance: weights.approvalChance / total,
    releasedAmount: weights.releasedAmount / total,
    installmentTerm: weights.installmentTerm / total,
    interestRate: weights.interestRate / total,
    operationalFriction: weights.operationalFriction / total,
    journeySpeed: weights.journeySpeed / total,
    commission: weights.commission / total,
    structuralFit: weights.structuralFit / total,
  };
}

function normalizeObjective(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
