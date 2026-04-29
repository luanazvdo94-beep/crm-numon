import { CLT_BANK_RULES } from '../data/cltBankRules';
import { rankEligibleCltBanks } from './cltRanking';
import type {
  CltAgeRule,
  CltAnalysisConfidence,
  CltApprovalProbability,
  CltBankEvaluation,
  CltBankEvaluationReason,
  CltBankRule,
  CltCompanyRule,
  CltEligibilityResult,
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

type CompanyWithRuntimeFields = EnrichedCompanyProfile & {
  anosEmpresa?: number;
  mei?: boolean;
  me?: boolean;
  fgtsRegular?: boolean;
  inssRegular?: boolean;
  funcionarios?: number;
  faturamentoEstimado?: string;
  dataAbertura?: string;
  data_abertura?: string;
  porte?: string;
  naturezaJuridica?: string;
  natureza_juridica?: string;
  capitalSocial?: number | string;
  capital_social?: number | string;
  rawData?: Record<string, unknown>;
  raw_data?: Record<string, unknown>;
};

type EvaluationDraft = {
  bank: CltBankRule;
  reasons: CltBankEvaluationReason[];
  pendingChecks: string[];
  hardRejected: boolean;
};

type ApprovalAnalysis = {
  approvalProbability: CltApprovalProbability;
  analysisConfidence: CltAnalysisConfidence;
  approvalScore: number;
  probabilityLabel: string;
};

export function getEligibleCltBanks(
  form: CltPreSimulatorFormData,
  selectedCompany: EnrichedCompanyProfile | null = null,
): EligibleCltBank[] {
  const result = getCltBankEligibilityResult(form, selectedCompany);

  const eligibleBanks = result.eligible.map((bank) => ({
    id: bank.id,
    name: bank.name,
    logo: bank.logo,
    badge: bank.badge,
  }));

  return rankEligibleCltBanks(eligibleBanks, form);
}

export function getCltBankEligibilityResult(
  form: CltPreSimulatorFormData,
  selectedCompany: EnrichedCompanyProfile | null = null,
): CltEligibilityResult {
  const parsed = parseCltForm(form);

  if (!isCltEligibilityFormReady(parsed)) {
    return {
      eligible: [],
      pending: [],
      notEligible: [],
      all: [],
    };
  }

  const evaluations = CLT_BANK_RULES.map((bank) => evaluateBank(bank, parsed, selectedCompany));

  const eligible = evaluations.filter((item) => item.status === 'eligible');
  const pending = evaluations
    .filter((item) => item.status === 'pending')
    .sort((a, b) => (b.approvalScore || 0) - (a.approvalScore || 0));

  const notEligible = evaluations
    .filter((item) => item.status === 'not_eligible')
    .sort((a, b) => (b.approvalScore || 0) - (a.approvalScore || 0));

  const rankedEligibleBase = rankEligibleCltBanks(
    eligible.map((bank) => ({
      id: bank.id,
      name: bank.name,
      logo: bank.logo,
      badge: bank.badge,
    })),
    form,
  );

  const rankedEligible = rankedEligibleBase
    .map((rankedBank) => eligible.find((bank) => bank.id === rankedBank.id))
    .filter((bank): bank is CltBankEvaluation => Boolean(bank))
    .sort((a, b) => (b.approvalScore || 0) - (a.approvalScore || 0));

  return {
    eligible: rankedEligible,
    pending,
    notEligible,
    all: [...rankedEligible, ...pending, ...notEligible],
  };
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

function evaluateBank(
  bank: CltBankRule,
  parsed: ParsedCltForm,
  selectedCompany: EnrichedCompanyProfile | null,
): CltBankEvaluation {
  const draft: EvaluationDraft = {
    bank,
    reasons: [],
    pendingChecks: [],
    hardRejected: false,
  };

  evaluateClientRules(draft, parsed);
  evaluateContractRules(draft, parsed);
  evaluateCompanyRules(draft, selectedCompany);

  const status = draft.hardRejected
    ? 'not_eligible'
    : draft.pendingChecks.length > 0
      ? 'pending'
      : 'eligible';

  if (status === 'eligible' && draft.reasons.length === 0) {
    draft.reasons.push({
      type: 'operational',
      message: 'Perfil compatível com as regras conhecidas deste banco.',
    });
  }

  const approvalAnalysis = calculateApprovalAnalysis({
    bank,
    status,
    parsed,
    selectedCompany,
    reasons: draft.reasons,
    pendingChecks: draft.pendingChecks,
  });

  return {
    id: bank.id,
    name: bank.name,
    logo: bank.logo,
    badge: bank.visualBadge,
    status,
    reasons: draft.reasons,
    pendingChecks: draft.pendingChecks,
    approvalProbability: approvalAnalysis.approvalProbability,
    analysisConfidence: approvalAnalysis.analysisConfidence,
    approvalScore: approvalAnalysis.approvalScore,
    probabilityLabel: approvalAnalysis.probabilityLabel,
  };
}

function calculateApprovalAnalysis({
  bank,
  status,
  parsed,
  selectedCompany,
  reasons,
  pendingChecks,
}: {
  bank: CltBankRule;
  status: CltBankEvaluation['status'];
  parsed: ParsedCltForm;
  selectedCompany: EnrichedCompanyProfile | null;
  reasons: CltBankEvaluationReason[];
  pendingChecks: string[];
}): ApprovalAnalysis {
  if (status === 'not_eligible') {
    const hasObjectiveCompanyRejection = reasons.some((reason) => reason.type === 'company');
    const hasObjectiveClientRejection = reasons.some((reason) => reason.type === 'client');

    return {
      approvalProbability: 'nao_recomendada',
      analysisConfidence: hasObjectiveCompanyRejection || hasObjectiveClientRejection ? 'alta' : 'media',
      approvalScore: 0,
      probabilityLabel: 'Não recomendada',
    };
  }

  let score = 50;

  const company = selectedCompany as CompanyWithRuntimeFields | null;

  if (parsed.age !== null) {
    score += 6;
  }

  if (parsed.employmentMonths !== null) {
    if (parsed.employmentMonths >= bank.minEmploymentMonths + 12) {
      score += 15;
    } else if (parsed.employmentMonths >= bank.minEmploymentMonths) {
      score += 9;
    } else {
      score -= 25;
    }
  }

  if (parsed.isWorkingNormally === true) {
    score += 8;
  }

  if (parsed.hasActiveConsignado === false) {
    score += 8;
  } else if (parsed.hasActiveConsignado === true) {
    score -= 10;
  }

  if (selectedCompany) {
    score += 8;

    const companyYears = getCompanyYears(company as CompanyWithRuntimeFields);
    const isMei = getIsMei(company as CompanyWithRuntimeFields);
    const isMe = getIsMe(company as CompanyWithRuntimeFields);
    const shareCapital = getShareCapital(company as CompanyWithRuntimeFields);

    if (companyYears !== null) {
      if (company.companyRuleRequiresYears?.minCompanyYears && companyYears >= company.companyRuleRequiresYears.minCompanyYears) {
        score += 5;
      }

      if (companyYears >= 5) {
        score += 8;
      } else if (companyYears >= 3) {
        score += 5;
      } else if (companyYears >= 2) {
        score += 2;
      }
    }

    if (isMei) {
      score -= 18;
    }

    if (isMe) {
      score -= 10;
    }

    if (shareCapital !== null) {
      if (shareCapital >= 200000) {
        score += 8;
      } else if (shareCapital < 50000) {
        score -= 5;
      }
    }

    if (company.porte) {
      const normalizedPorte = normalizeText(company.porte);

      if (
        normalizedPorte.includes('grande') ||
        normalizedPorte.includes('medio') ||
        normalizedPorte.includes('demais')
      ) {
        score += 8;
      }
    }
  } else {
    score -= 10;
  }

  if (status === 'eligible') {
    score += 10;
  }

  if (status === 'pending') {
    score -= Math.min(28, pendingChecks.length * 7);
  }

  if (bank.visualBadge === 'Alta chance') {
    score += 8;
  } else if (bank.visualBadge === 'Media chance') {
    score += 3;
  } else {
    score -= 3;
  }

  score = clamp(score, 0, 100);

  const criticalPendingCount = pendingChecks.filter((check) => {
    const normalized = normalizeText(check);

    return (
      normalized.includes('funcionario') ||
      normalized.includes('faturamento') ||
      normalized.includes('fgts') ||
      normalized.includes('inss') ||
      normalized.includes('divida') ||
      normalized.includes('cnae')
    );
  }).length;

  let analysisConfidence: CltAnalysisConfidence = 'media';

  if (status === 'eligible' && pendingChecks.length === 0 && selectedCompany) {
    analysisConfidence = 'alta';
  } else if (status === 'pending' && criticalPendingCount >= 2) {
    analysisConfidence = 'baixa';
  } else if (status === 'pending') {
    analysisConfidence = 'media';
  } else if (!selectedCompany) {
    analysisConfidence = 'baixa';
  }

  let approvalProbability: CltApprovalProbability = 'baixa';

  if (score >= 78 && status === 'eligible') {
    approvalProbability = 'alta';
  } else if (score >= 58) {
    approvalProbability = 'media';
  } else {
    approvalProbability = 'baixa';
  }

  const probabilityLabel = buildProbabilityLabel(approvalProbability, analysisConfidence, score);

  return {
    approvalProbability,
    analysisConfidence,
    approvalScore: score,
    probabilityLabel,
  };
}

function buildProbabilityLabel(
  approvalProbability: CltApprovalProbability,
  analysisConfidence: CltAnalysisConfidence,
  score: number,
) {
  if (approvalProbability === 'nao_recomendada') {
    return 'Não recomendada';
  }

  const probabilityText = {
    alta: 'Aprovação provável alta',
    media: 'Aprovação provável média',
    baixa: 'Aprovação provável baixa',
    nao_recomendada: 'Não recomendada',
  }[approvalProbability];

  const confidenceText = {
    alta: 'confiança alta',
    media: 'confiança média',
    baixa: 'confiança baixa',
  }[analysisConfidence];

  return `${probabilityText} • ${confidenceText} • score ${score}/100`;
}

function evaluateClientRules(draft: EvaluationDraft, parsed: ParsedCltForm) {
  const { bank } = draft;

  if (parsed.age === null || parsed.employmentMonths === null) {
    reject(draft, 'data', 'Dados básicos do cliente incompletos.');
    return;
  }

  if (!passesAgeRule(bank.ageRule, parsed)) {
    reject(draft, 'client', 'Idade fora da política operacional do banco.');
  }

  if (parsed.employmentMonths < bank.minEmploymentMonths) {
    reject(
      draft,
      'client',
      `Tempo de empresa insuficiente. Este banco exige no mínimo ${bank.minEmploymentMonths} meses de vínculo.`,
    );
  }

  if (bank.requiresActiveEmployment && parsed.isWorkingNormally === false) {
    reject(draft, 'client', 'Cliente não está trabalhando normalmente hoje.');
  }

  if (bank.requiresActiveEmployment && parsed.isWorkingNormally === null) {
    pending(draft, 'Confirmar se o cliente está trabalhando normalmente hoje.');
  }
}

function evaluateContractRules(draft: EvaluationDraft, parsed: ParsedCltForm) {
  const { bank } = draft;

  if (bank.contractRule.type === 'none') {
    return;
  }

  if (parsed.hasActiveConsignado === null) {
    pending(draft, 'Confirmar se o cliente já possui consignado CLT ativo.');
    return;
  }

  if (!parsed.hasActiveConsignado) {
    return;
  }

  if (bank.contractRule.insufficientDataBehavior === 'reject') {
    reject(
      draft,
      'contract',
      'Cliente possui consignado ativo e este banco exige validação contratual específica antes de seguir.',
    );
    return;
  }

  pending(
    draft,
    'Cliente possui consignado ativo. Validar quantidade de contratos, banco de origem e regra específica do roteiro.',
  );
}

function evaluateCompanyRules(draft: EvaluationDraft, selectedCompany: EnrichedCompanyProfile | null) {
  const { bank } = draft;
  const companyRule = bank.companyRule;

  if (!companyRule) {
    return;
  }

  if (!selectedCompany) {
    if (companyRule.insufficientDataBehavior === 'reject') {
      reject(draft, 'company', 'Banco exige análise da empresa/CNPJ, mas nenhuma empresa foi identificada.');
    } else {
      pending(draft, 'Identificar empresa/CNPJ para validar as regras deste banco.');
    }

    return;
  }

  const company = selectedCompany as CompanyWithRuntimeFields;

  const companyYears = getCompanyYears(company);
  const isMei = getIsMei(company);
  const isMe = getIsMe(company);
  const fgtsRegular = getBooleanCompanyField(company, 'fgtsRegular');
  const inssRegular = getBooleanCompanyField(company, 'inssRegular');
  const employeeCount = getEmployeeCount(company);
  const estimatedRevenue = getEstimatedRevenue(company);
  const shareCapital = getShareCapital(company);
  const cnaeCode = getCnaeCode(company);

  if (companyRule.minCompanyYears !== undefined) {
    if (companyYears === null) {
      handleMissingCompanyData(
        draft,
        companyRule,
        `Validar se a empresa possui pelo menos ${companyRule.minCompanyYears} anos de constituição.`,
      );
    } else if (companyYears < companyRule.minCompanyYears) {
      reject(
        draft,
        'company',
        `Empresa com tempo de constituição insuficiente. Exigido: ${companyRule.minCompanyYears} anos. Identificado: ${companyYears} anos.`,
      );
    }
  }

  if (companyRule.minCompanyYearsByCompanyType) {
    if (companyYears === null) {
      handleMissingCompanyData(draft, companyRule, 'Validar tempo de constituição da empresa conforme porte/tipo.');
    } else {
      const requiredYears = isMe
        ? companyRule.minCompanyYearsByCompanyType.me
        : companyRule.minCompanyYearsByCompanyType.default;

      if (companyYears < requiredYears) {
        reject(
          draft,
          'company',
          `Empresa com tempo de constituição insuficiente para este banco. Exigido: ${requiredYears} anos.`,
        );
      }
    }
  }

  if (companyRule.rejectMei && isMei) {
    reject(draft, 'company', 'Banco não aceita empresa enquadrada como MEI.');
  }

  if (companyRule.rejectMe && isMe) {
    reject(draft, 'company', 'Banco não aceita empresa enquadrada como ME/Micro Empresa.');
  }

  if (companyRule.requireFgtsRegular) {
    if (fgtsRegular === false) {
      reject(draft, 'company', 'Banco exige regularidade de FGTS e a empresa foi marcada como irregular.');
    } else if (fgtsRegular === null) {
      handleMissingCompanyData(draft, companyRule, 'Validar regularidade de FGTS da empresa.');
    }
  }

  if (companyRule.requireInssRegular) {
    if (inssRegular === false) {
      reject(draft, 'company', 'Banco exige regularidade de INSS e a empresa foi marcada como irregular.');
    } else if (inssRegular === null) {
      handleMissingCompanyData(draft, companyRule, 'Validar regularidade de INSS da empresa.');
    }
  }

  if (companyRule.minEmployees !== undefined) {
    if (employeeCount === null) {
      handleMissingCompanyData(
        draft,
        companyRule,
        `Validar se a empresa possui pelo menos ${companyRule.minEmployees} funcionários.`,
      );
    } else if (employeeCount < companyRule.minEmployees) {
      reject(
        draft,
        'company',
        `Quantidade de funcionários insuficiente. Exigido: ${companyRule.minEmployees}. Identificado: ${employeeCount}.`,
      );
    }
  }

  if (companyRule.minRevenue !== undefined) {
    if (estimatedRevenue === null) {
      handleMissingCompanyData(
        draft,
        companyRule,
        `Validar se a empresa possui faturamento mínimo de R$ ${formatNumber(companyRule.minRevenue)}.`,
      );
    } else if (estimatedRevenue < companyRule.minRevenue) {
      reject(
        draft,
        'company',
        `Faturamento estimado insuficiente. Exigido: R$ ${formatNumber(companyRule.minRevenue)}.`,
      );
    }
  }

  if (companyRule.minShareCapital !== undefined) {
    if (shareCapital === null) {
      handleMissingCompanyData(
        draft,
        companyRule,
        `Validar se a empresa possui capital social mínimo de R$ ${formatNumber(companyRule.minShareCapital)}.`,
      );
    } else if (shareCapital < companyRule.minShareCapital) {
      reject(
        draft,
        'company',
        `Capital social insuficiente. Exigido: R$ ${formatNumber(
          companyRule.minShareCapital,
        )}. Identificado: R$ ${formatNumber(shareCapital)}.`,
      );
    }
  }

  if (companyRule.employeesOrRevenue) {
    const meetsEmployees =
      employeeCount !== null && employeeCount >= companyRule.employeesOrRevenue.minEmployees;

    const meetsRevenue =
      estimatedRevenue !== null && estimatedRevenue >= companyRule.employeesOrRevenue.minRevenue;

    if (employeeCount === null && estimatedRevenue === null) {
      handleMissingCompanyData(
        draft,
        companyRule,
        `Validar se a empresa possui pelo menos ${companyRule.employeesOrRevenue.minEmployees} funcionários ou faturamento mínimo de R$ ${formatNumber(
          companyRule.employeesOrRevenue.minRevenue,
        )}.`,
      );
    } else if (!meetsEmployees && !meetsRevenue) {
      reject(
        draft,
        'company',
        `Empresa não atende a regra mínima de funcionários ou faturamento exigida pelo banco.`,
      );
    }
  }

  if (companyRule.blockedCnaes && companyRule.blockedCnaes.length > 0 && cnaeCode) {
    const isBlocked = companyRule.blockedCnaes.some((blocked) => normalizeCnae(blocked) === cnaeCode);

    if (isBlocked) {
      reject(draft, 'company', 'CNAE da empresa consta como não aceito por este banco.');
    }
  }

  if (companyRule.restrictedCnaes && companyRule.restrictedCnaes.length > 0 && cnaeCode) {
    const isRestricted = companyRule.restrictedCnaes.some((restricted) => normalizeCnae(restricted) === cnaeCode);

    if (isRestricted) {
      pending(draft, 'CNAE da empresa possui restrição. Validar política específica do banco antes de seguir.');
    }
  }

  if (bank.pendingPhase2Checks.length > 0) {
    bank.pendingPhase2Checks.forEach((check) => {
      if (!draft.pendingChecks.includes(check)) {
        draft.pendingChecks.push(check);
      }
    });
  }
}

function handleMissingCompanyData(draft: EvaluationDraft, companyRule: CltCompanyRule, message: string) {
  if (companyRule.insufficientDataBehavior === 'reject') {
    reject(draft, 'data', message);
    return;
  }

  if (companyRule.insufficientDataBehavior === 'pending') {
    pending(draft, message);
    return;
  }

  pending(draft, message);
}

function reject(draft: EvaluationDraft, type: CltBankEvaluationReason['type'], message: string) {
  draft.hardRejected = true;

  if (!draft.reasons.some((reason) => reason.message === message)) {
    draft.reasons.push({ type, message });
  }
}

function pending(draft: EvaluationDraft, message: string) {
  if (!draft.pendingChecks.includes(message)) {
    draft.pendingChecks.push(message);
  }
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
  const monthsMatch = normalized.match(/(\d+)\s*m[eê]s/);

  const years = yearsMatch ? Number.parseInt(yearsMatch[1], 10) : 0;
  const months = monthsMatch ? Number.parseInt(monthsMatch[1], 10) : 0;
  const totalMonths = years * 12 + months;

  return totalMonths > 0 ? totalMonths : null;
}

function getCompanyYears(company: CompanyWithRuntimeFields) {
  if (typeof company.anosEmpresa === 'number' && Number.isFinite(company.anosEmpresa)) {
    return company.anosEmpresa;
  }

  const dataAbertura =
    company.dataAbertura ||
    company.data_abertura ||
    getStringFromRaw(company, 'data_inicio_atividade');

  if (!dataAbertura) {
    return null;
  }

  const openingDate = new Date(dataAbertura);

  if (Number.isNaN(openingDate.getTime())) {
    return null;
  }

  const now = new Date();

  let years = now.getFullYear() - openingDate.getFullYear();

  const hasNotReachedAnniversary =
    now.getMonth() < openingDate.getMonth() ||
    (now.getMonth() === openingDate.getMonth() && now.getDate() < openingDate.getDate());

  if (hasNotReachedAnniversary) {
    years -= 1;
  }

  return Math.max(years, 0);
}

function getIsMei(company: CompanyWithRuntimeFields) {
  if (typeof company.mei === 'boolean') {
    return company.mei;
  }

  const rawMei = getRawValue(company, 'opcao_pelo_mei');

  if (typeof rawMei === 'boolean') {
    return rawMei;
  }

  const porte = normalizeText(company.porte || getStringFromRaw(company, 'porte'));
  const natureza = normalizeText(
    company.naturezaJuridica || company.natureza_juridica || getStringFromRaw(company, 'natureza_juridica'),
  );

  return porte.includes('mei') || natureza.includes('microempreendedor individual');
}

function getIsMe(company: CompanyWithRuntimeFields) {
  if (typeof company.me === 'boolean') {
    return company.me;
  }

  const porte = normalizeText(company.porte || getStringFromRaw(company, 'porte'));

  if (getIsMei(company)) {
    return false;
  }

  return porte.includes('micro empresa') || porte.includes('microempresa') || porte === 'me';
}

function getEmployeeCount(company: CompanyWithRuntimeFields) {
  if (typeof company.funcionarios === 'number' && Number.isFinite(company.funcionarios)) {
    return company.funcionarios;
  }

  const rawEmployees = getRawValue(company, 'funcionarios');

  if (typeof rawEmployees === 'number' && Number.isFinite(rawEmployees)) {
    return rawEmployees;
  }

  if (typeof rawEmployees === 'string') {
    const parsed = Number.parseInt(rawEmployees.replace(/\D/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getEstimatedRevenue(company: CompanyWithRuntimeFields) {
  const directRevenue = parseMoneyLikeValue(company.faturamentoEstimado);

  if (directRevenue !== null) {
    return directRevenue;
  }

  const rawRevenue =
    getRawValue(company, 'faturamento') ||
    getRawValue(company, 'faturamento_estimado') ||
    getRawValue(company, 'estimated_annual_revenue');

  const parsedRawRevenue = parseMoneyLikeValue(rawRevenue);

  if (parsedRawRevenue !== null) {
    return parsedRawRevenue;
  }

  return null;
}

function getShareCapital(company: CompanyWithRuntimeFields) {
  const directCapital = parseMoneyLikeValue(company.capitalSocial ?? company.capital_social);

  if (directCapital !== null) {
    return directCapital;
  }

  const rawCapital = getRawValue(company, 'capital_social');

  return parseMoneyLikeValue(rawCapital);
}

function getBooleanCompanyField(company: CompanyWithRuntimeFields, field: 'fgtsRegular' | 'inssRegular') {
  const direct = company[field];

  if (typeof direct === 'boolean') {
    return direct;
  }

  const raw = getRawValue(company, field);

  if (typeof raw === 'boolean') {
    return raw;
  }

  return null;
}

function getCnaeCode(company: CompanyWithRuntimeFields) {
  const direct =
    getRawValue(company, 'cnae_fiscal') ||
    getRawValue(company, 'cnae_principal_codigo') ||
    company.cnaePrincipal;

  if (typeof direct === 'number') {
    return normalizeCnae(String(direct));
  }

  if (typeof direct === 'string') {
    return normalizeCnae(direct);
  }

  return null;
}

function normalizeCnae(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function getRawValue(company: CompanyWithRuntimeFields, key: string) {
  const raw = company.rawData || company.raw_data;

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  return raw[key] ?? null;
}

function getStringFromRaw(company: CompanyWithRuntimeFields, key: string) {
  const value = getRawValue(company, key);

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return null;
}

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseMoneyLikeValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const onlyDigits = normalized.replace(/\D/g, '');

  if (!onlyDigits) {
    return null;
  }

  const parsed = Number.parseInt(onlyDigits, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}