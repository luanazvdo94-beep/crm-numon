import { CLT_BANK_RULES } from '../data/cltBankRules';
import { rankEligibleCltBanks } from './cltRanking';
import type {
  CltAgeRule,
  CltBankRule,
  CltCompanyRule,
  CltPreSimulatorFormData,
  EligibleCltBank,
  EnrichedCompanyProfile,
  SexKey,
} from '../types';

interface ParsedCltForm {
  age: number | null;
  employmentMonths: number | null;
  isWorkingNormally: boolean | null;
  hasActiveConsignado: boolean | null;
  sex: SexKey | null;
}

export function getEligibleCltBanks(
  form: CltPreSimulatorFormData,
  selectedCompany: EnrichedCompanyProfile | null = null,
): EligibleCltBank[] {
  const parsed = parseCltForm(form);

  if (!isCltEligibilityFormReady(parsed)) {
    return [];
  }

  const eligibleBanks = CLT_BANK_RULES.filter((bank) => isBankEligible(bank, parsed, selectedCompany)).map((bank) => ({
      id: bank.id,
      name: bank.name,
      logo: bank.logo,
      badge: bank.visualBadge,
    }));

  return rankEligibleCltBanks(eligibleBanks, form);
}

export function shouldShowCltEligibilityResults(form: CltPreSimulatorFormData) {
  return isCltEligibilityFormReady(parseCltForm(form));
}

function isCltEligibilityFormReady(parsed: ParsedCltForm) {
  return (
    parsed.age !== null &&
    parsed.employmentMonths !== null &&
    parsed.isWorkingNormally !== null &&
    parsed.hasActiveConsignado !== null
  );
}

function isBankEligible(
  bank: (typeof CLT_BANK_RULES)[number],
  parsed: ParsedCltForm,
  selectedCompany: EnrichedCompanyProfile | null,
) {
  if (parsed.age === null || parsed.employmentMonths === null) return false;
  if (parsed.isWorkingNormally === null || parsed.hasActiveConsignado === null) return false;

  if (!passesAgeRule(bank.ageRule, parsed)) {
    return false;
  }

  if (parsed.employmentMonths < bank.minEmploymentMonths) {
    return false;
  }

  if (bank.requiresActiveEmployment && !parsed.isWorkingNormally) {
    return false;
  }

  if (!passesContractRule(bank, parsed)) {
    return false;
  }

  if (!passesCompanyRule(bank.companyRule, selectedCompany)) {
    return false;
  }

  return true;
}

function parseCltForm(form: CltPreSimulatorFormData): ParsedCltForm {
  return {
    age: parseAge(form.idade),
    employmentMonths: parseEmploymentMonths(form.tempoEmpresa),
    isWorkingNormally: parseBinaryAnswer(form.trabalhandoHoje),
    hasActiveConsignado: parseBinaryAnswer(form.consignadoAtivo),
    sex: null,
  };
}

function passesAgeRule(ageRule: CltAgeRule, parsed: ParsedCltForm) {
  if (parsed.age === null) return false;

  if (parsed.age < ageRule.min) {
    return false;
  }

  if (ageRule.maxBySex) {
    if (parsed.sex) {
      const maxAge = ageRule.maxBySex[parsed.sex];
      return parsed.age <= maxAge;
    }

    const strictestMaxAge = Math.min(ageRule.maxBySex.female, ageRule.maxBySex.male);
    const broadestMaxAge = Math.max(ageRule.maxBySex.female, ageRule.maxBySex.male);

    if (parsed.age <= strictestMaxAge) {
      return true;
    }

    if (parsed.age > broadestMaxAge) {
      return false;
    }

    // Sem sexo no formulario atual, nao e seguro confirmar elegibilidade na faixa
    // em que um sexo passa e o outro nao. Nesta fase, preferimos nao exibir como elegivel.
    return false;
  }

  if (!ageRule.max) {
    return true;
  }

  if (ageRule.max.type === 'current_age') {
    return parsed.age <= ageRule.max.value;
  }

  if (parsed.age > ageRule.max.value) {
    return false;
  }

  // Regra oficial depende da idade no fim do contrato, mas o formulario ainda nao
  // coleta prazo. Nesta fase, mantemos abordagem neutra: nao excluimos apenas por
  // falta desse dado quando a idade atual ainda esta abaixo do teto informado.
  return true;
}

function passesContractRule(bank: CltBankRule, parsed: ParsedCltForm) {
  if (bank.contractRule.type === 'none') {
    return true;
  }

  if (!parsed.hasActiveConsignado) {
    return true;
  }

  // O formulario atual so informa se existe consignado ativo, sem quantidade,
  // origem do contrato ou se o caso e portabilidade/refin. Como as regras
  // oficiais desses bancos sao mais nuancadas do que um simples "tem ou nao tem",
  // mantemos postura neutra e nao excluimos automaticamente nesta fase.
  return true;
}

function passesCompanyRule(companyRule: CltCompanyRule | undefined, selectedCompany: EnrichedCompanyProfile | null) {
  if (!companyRule || !selectedCompany) {
    return true;
  }

  if (companyRule.minCompanyYears !== undefined && selectedCompany.anosEmpresa < companyRule.minCompanyYears) {
    return false;
  }

  if (companyRule.minCompanyYearsByCompanyType) {
    const requiredYears = selectedCompany.me
      ? companyRule.minCompanyYearsByCompanyType.me
      : companyRule.minCompanyYearsByCompanyType.default;

    if (selectedCompany.anosEmpresa < requiredYears) {
      return false;
    }
  }

  if (companyRule.rejectMei && selectedCompany.mei) {
    return false;
  }

  if (companyRule.rejectMe && selectedCompany.me) {
    return false;
  }

  if (companyRule.requireFgtsRegular && !selectedCompany.fgtsRegular) {
    return false;
  }

  if (companyRule.requireInssRegular && !selectedCompany.inssRegular) {
    return false;
  }

  if (companyRule.minEmployees !== undefined && selectedCompany.funcionarios < companyRule.minEmployees) {
    return false;
  }

  if (companyRule.employeesOrRevenue) {
    const estimatedRevenue = parseEstimatedRevenue(selectedCompany.faturamentoEstimado);
    const meetsEmployees = selectedCompany.funcionarios >= companyRule.employeesOrRevenue.minEmployees;
    const meetsRevenue =
      estimatedRevenue !== null && estimatedRevenue >= companyRule.employeesOrRevenue.minRevenue;

    if (!meetsEmployees && !meetsRevenue) {
      return false;
    }
  }

  // Regras como empregador pessoa fisica, capital social e faturamento presumido
  // minimo especifico ainda nao sao bloqueantes nesta fase quando o mock atual
  // nao permite validacao segura e padronizada.
  return true;
}

function parseAge(value: string) {
  const normalized = Number.parseInt(value.trim(), 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function parseBinaryAnswer(value: CltPreSimulatorFormData['trabalhandoHoje']) {
  if (value === 'sim') return true;
  if (value === 'nao') return false;
  return null;
}

function parseEmploymentMonths(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    const rawMonths = Number.parseInt(normalized, 10);
    return Number.isFinite(rawMonths) && rawMonths >= 0 ? rawMonths : null;
  }

  const yearsMatch = normalized.match(/(\d+)\s*ano/);
  const monthsMatch = normalized.match(/(\d+)\s*mes/);

  const years = yearsMatch ? Number.parseInt(yearsMatch[1], 10) : 0;
  const months = monthsMatch ? Number.parseInt(monthsMatch[1], 10) : 0;
  const totalMonths = years * 12 + months;

  return totalMonths > 0 ? totalMonths : null;
}

function parseEstimatedRevenue(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
