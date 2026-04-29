import { useEffect, useMemo, useState } from 'react';
import { BankLogo } from './BankLogo';
import type {
  BankChanceLabel,
  CltAnalysisConfidence,
  CltApprovalProbability,
  CltBankEvaluation,
  CltPreSimulatorFormData,
  EligibleCltBank,
  EnrichedCompanyProfile,
} from '../types';
import {
  getCltBankEligibilityResult,
  getEligibleCltBanks,
  shouldShowCltEligibilityResults,
} from '../utils/cltEligibility';
import { getCltBankDestination, openCltBankDestination } from '../utils/cltBankNavigation';
import { generateCltCustomerMessage } from '../utils/cltCommercialMessage';
import { isSelectedCompanyInputDirty } from '../utils/companyEnrichment';

const BACKEND_BASE_URL = 'https://nodejs-production-15c2.up.railway.app';

type CltPreSimulatorProps = {
  preSimulationLeadId?: string | null;
};

type CompanySearchResult = {
  id: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  municipio: string | null;
  uf: string | null;
  situacao_cadastral: string | null;
  cnae_principal_codigo: string | null;
  cnae_principal_descricao: string | null;
  porte: string | null;
  created_at?: string;
};

type ConsultCnpjResponse = {
  success: boolean;
  data?: {
    cnpj: string;
    razao_social: string | null;
    nome_fantasia: string | null;
    situacao_cadastral: string | null;
    data_abertura: string | null;
    natureza_juridica: string | null;
    porte: string | null;
    cnae_principal_codigo: string | null;
    cnae_principal_descricao: string | null;
    cnaes_secundarios?: unknown[];
    endereco?: {
      logradouro?: string | null;
      numero?: string | null;
      complemento?: string | null;
      bairro?: string | null;
      municipio?: string | null;
      uf?: string | null;
      cep?: string | null;
    };
    raw_data?: Record<string, unknown>;
  };
  error?: string;
};

type LeadPresimulationResponse = {
  success: boolean;
  data?: {
    lead: {
      id: string;
      nome: string | null;
      telefone: string | null;
      cpf: string | null;
      empresa: string | null;
      observacoes: string | null;
      clt_ready_for_presimulation?: boolean | null;
      clt_employment_months?: number | null;
      clt_is_working?: boolean | null;
      clt_has_active_loan?: boolean | null;
      clt_company_name?: string | null;
      clt_company_cnpj?: string | null;
      clt_age?: number | null;
      clt_triage_completed_at?: string | null;
    };
    answers: Array<{
      id: string;
      question_key: string;
      question_text: string | null;
      answer_value: string | null;
      created_at: string;
    }>;
  };
  error?: string;
};

const INITIAL_FORM: CltPreSimulatorFormData = {
  idade: '',
  tempoEmpresa: '',
  empresa: '',
  trabalhandoHoje: '',
  consignadoAtivo: '',
  objetivoCliente: '',
};

function onlyDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(
    8,
    12,
  )}-${digits.slice(12)}`;
}

function normalizeCompanyName(company: CompanySearchResult) {
  return (
    company.nome_fantasia?.trim() ||
    company.razao_social?.trim() ||
    `Empresa ${formatCnpj(company.cnpj)}`
  );
}

function mapSearchResultToCompany(company: CompanySearchResult): EnrichedCompanyProfile {
  return {
    id: company.id || company.cnpj,
    cnpj: onlyDigits(company.cnpj),
    nomeFantasia: normalizeCompanyName(company),
    razaoSocial: company.razao_social || normalizeCompanyName(company),
    porte: company.porte || 'Não informado',
    cnaePrincipal: company.cnae_principal_descricao || 'Não informado',
  };
}

function mapConsultedCnpjToCompany(data: NonNullable<ConsultCnpjResponse['data']>): EnrichedCompanyProfile {
  const nomeFantasia =
    data.nome_fantasia?.trim() ||
    data.razao_social?.trim() ||
    `Empresa ${formatCnpj(data.cnpj)}`;

  const rawData = data.raw_data || {};

  return {
    id: onlyDigits(data.cnpj),
    cnpj: onlyDigits(data.cnpj),
    nomeFantasia,
    razaoSocial: data.razao_social || nomeFantasia,
    porte: data.porte || 'Não informado',
    cnaePrincipal: data.cnae_principal_descricao || 'Não informado',
    dataAbertura: data.data_abertura || undefined,
    naturezaJuridica: data.natureza_juridica || undefined,
    capitalSocial:
      typeof rawData.capital_social === 'number' || typeof rawData.capital_social === 'string'
        ? rawData.capital_social
        : undefined,
    rawData,
    raw_data: rawData,
    data_abertura: data.data_abertura || undefined,
    natureza_juridica: data.natureza_juridica || undefined,
    capital_social:
      typeof rawData.capital_social === 'number' || typeof rawData.capital_social === 'string'
        ? rawData.capital_social
        : undefined,
  };
}

function monthsToFormValue(months?: number | null) {
  if (typeof months !== 'number' || !Number.isFinite(months) || months <= 0) {
    return '';
  }

  if (months < 12) {
    return `${months} meses`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years} ano${years > 1 ? 's' : ''}`;
  }

  return `${years} ano${years > 1 ? 's' : ''} e ${remainingMonths} meses`;
}

function booleanToBinaryAnswer(value?: boolean | null): CltPreSimulatorFormData['trabalhandoHoje'] {
  if (value === true) return 'sim';
  if (value === false) return 'nao';
  return '';
}

function getEligibilityClassName(eligibility: BankChanceLabel) {
  if (eligibility === 'Alta chance') return 'bank-badge high';
  if (eligibility === 'Media chance') return 'bank-badge medium';
  return 'bank-badge low';
}

function getEligibilityLabel(eligibility: BankChanceLabel) {
  if (eligibility === 'Media chance') return 'Média chance';
  return eligibility;
}

function getProbabilityClassName(probability?: CltApprovalProbability) {
  if (probability === 'alta') return 'bank-badge high';
  if (probability === 'media') return 'bank-badge medium';
  return 'bank-badge low';
}

function getProbabilityText(probability?: CltApprovalProbability) {
  if (probability === 'alta') return 'Aprovação provável alta';
  if (probability === 'media') return 'Aprovação provável média';
  if (probability === 'baixa') return 'Aprovação provável baixa';
  if (probability === 'nao_recomendada') return 'Não recomendada';
  return 'Aprovação provável indefinida';
}

function getConfidenceText(confidence?: CltAnalysisConfidence) {
  if (confidence === 'alta') return 'Confiança alta';
  if (confidence === 'media') return 'Confiança média';
  if (confidence === 'baixa') return 'Confiança baixa';
  return 'Confiança não definida';
}

function getTopOptionLabel(index: number) {
  if (index === 0) return '1ª opção';
  if (index === 1) return '2ª opção';
  if (index === 2) return '3ª opção';
  return null;
}

function toEligibleBank(bank: CltBankEvaluation): EligibleCltBank {
  return {
    id: bank.id,
    name: bank.name,
    logo: bank.logo,
    badge: bank.badge,
  };
}

function ProbabilityBlock({ bank }: { bank: CltBankEvaluation }) {
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
      <span className={getProbabilityClassName(bank.approvalProbability)}>
        {getProbabilityText(bank.approvalProbability)}
      </span>

      <small style={{ display: 'block', lineHeight: 1.45, opacity: 0.95 }}>
        {getConfidenceText(bank.analysisConfidence)}
        {typeof bank.approvalScore === 'number' ? ` • score ${bank.approvalScore}/100` : ''}
      </small>
    </div>
  );
}

function EligibleEvaluationBankCard({ bank, rankIndex }: { bank: CltBankEvaluation; rankIndex: number }) {
  const destination = getCltBankDestination(bank.id);
  const topOptionLabel = getTopOptionLabel(rankIndex);
  const eligibleBank = toEligibleBank(bank);

  return (
    <button
      key={bank.id}
      type="button"
      className="bank-card"
      aria-label={`Abrir destino do banco ${bank.name}`}
      title={destination ? `Abrir ${bank.name} em nova aba` : `Destino do banco ${bank.name} não configurado`}
      onClick={() => openCltBankDestination(eligibleBank)}
    >
      {topOptionLabel ? <span className="bank-rank-chip">{topOptionLabel}</span> : null}
      <BankLogo bankId={bank.id} bankName={bank.name} />

      <div className="bank-card-body">
        <strong>{bank.name}</strong>
        <span className={getEligibilityClassName(bank.badge)}>{getEligibilityLabel(bank.badge)}</span>

        <ProbabilityBlock bank={bank} />

        {bank.reasons.length > 0 ? (
          <div style={{ marginTop: 8, textAlign: 'left' }}>
            {bank.reasons.slice(0, 3).map((reason) => (
              <small key={reason.message} style={{ display: 'block', lineHeight: 1.45, opacity: 0.9 }}>
                • {reason.message}
              </small>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function EvaluationBankCard({
  bank,
  variant,
}: {
  bank: CltBankEvaluation;
  variant: 'pending' | 'not_eligible';
}) {
  const title = variant === 'pending' ? 'Pendente de validação' : 'Não indicado';
  const badgeClass = variant === 'pending' ? 'bank-badge medium' : 'bank-badge low';

  return (
    <div className="bank-card" style={{ cursor: 'default' }}>
      <BankLogo bankId={bank.id} bankName={bank.name} />

      <div className="bank-card-body">
        <strong>{bank.name}</strong>
        <span className={badgeClass}>{title}</span>

        <ProbabilityBlock bank={bank} />

        {bank.reasons.length > 0 ? (
          <div style={{ marginTop: 10, textAlign: 'left' }}>
            {bank.reasons.map((reason) => (
              <small key={reason.message} style={{ display: 'block', lineHeight: 1.45, opacity: 0.9 }}>
                • {reason.message}
              </small>
            ))}
          </div>
        ) : null}

        {bank.pendingChecks.length > 0 ? (
          <div style={{ marginTop: 10, textAlign: 'left' }}>
            {bank.pendingChecks.slice(0, 4).map((check) => (
              <small key={check} style={{ display: 'block', lineHeight: 1.45, opacity: 0.9 }}>
                • {check}
              </small>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CltPreSimulator({ preSimulationLeadId = null }: CltPreSimulatorProps) {
  const [form, setForm] = useState<CltPreSimulatorFormData>(INITIAL_FORM);
  const [selectedCompany, setSelectedCompany] = useState<EnrichedCompanyProfile | null>(null);
  const [companySuggestions, setCompanySuggestions] = useState<EnrichedCompanyProfile[]>([]);
  const [customerMessage, setCustomerMessage] = useState('');
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const [companyConsultLoading, setCompanyConsultLoading] = useState(false);
  const [companySearchError, setCompanySearchError] = useState('');
  const [companyConsultError, setCompanyConsultError] = useState('');
  const [lastSearchTerm, setLastSearchTerm] = useState('');
  const [leadLoadStatus, setLeadLoadStatus] = useState('');
  const [leadLoadError, setLeadLoadError] = useState('');

  const eligibilityResult = useMemo(
    () => getCltBankEligibilityResult(form, selectedCompany),
    [form, selectedCompany],
  );

  const eligibleBanks = useMemo(() => getEligibleCltBanks(form, selectedCompany), [form, selectedCompany]);
  const showResults = useMemo(() => shouldShowCltEligibilityResults(form), [form]);

  const indicatedBanks = eligibilityResult.eligible;
  const pendingBanks = eligibilityResult.pending;
  const notEligibleBanks = eligibilityResult.notEligible;

  const showCompanySuggestions =
    form.empresa.trim().length >= 2 && companySuggestions.length > 0 && !selectedCompany;

  const selectedCompanyNeedsReview = useMemo(
    () => isSelectedCompanyInputDirty(form.empresa, selectedCompany),
    [form.empresa, selectedCompany],
  );

  useEffect(() => {
    if (!preSimulationLeadId) {
      return;
    }

    let isMounted = true;

    async function loadLeadPresimulation() {
      try {
        setLeadLoadStatus('Carregando dados do lead para pré-simulação...');
        setLeadLoadError('');
        setCustomerMessage('');
        setSelectedCompany(null);
        setCompanySuggestions([]);
        setCompanySearchError('');
        setCompanyConsultError('');

        const response = await fetch(`${BACKEND_BASE_URL}/lead-presimulation/${preSimulationLeadId}`);
        const result: LeadPresimulationResponse = await response.json();

        if (!isMounted) return;

        if (!response.ok || !result.success || !result.data?.lead) {
          throw new Error(result.error || 'Erro ao carregar dados do lead');
        }

        const { lead } = result.data;

        const companyName = lead.clt_company_name || lead.empresa || '';

        const nextForm: CltPreSimulatorFormData = {
          idade: lead.clt_age ? String(lead.clt_age) : '',
          tempoEmpresa: monthsToFormValue(lead.clt_employment_months),
          empresa: companyName,
          trabalhandoHoje: booleanToBinaryAnswer(lead.clt_is_working),
          consignadoAtivo: booleanToBinaryAnswer(lead.clt_has_active_loan),
          objetivoCliente: lead.observacoes || `Pré-simulação automática do lead ${lead.nome || lead.telefone || ''}.`,
        };

        setForm(nextForm);

        if (lead.clt_company_cnpj) {
          setLeadLoadStatus('Dados do lead carregados. Consultando CNPJ da empresa...');
          await consultAndSelectCompanyByCnpj(lead.clt_company_cnpj, isMounted);
        } else if (companyName.trim().length >= 2) {
          setLeadLoadStatus('Dados do lead carregados. Buscando empresa informada na base CNPJ...');
          await searchAndSelectCompanyByName(companyName, isMounted);
        }

        if (isMounted) {
          setLeadLoadStatus('Dados do lead carregados no Pré-simulador CLT.');
        }
      } catch (error) {
        if (!isMounted) return;

        const message = error instanceof Error ? error.message : 'Erro ao carregar dados do lead';
        setLeadLoadError(message);
        setLeadLoadStatus('');
      }
    }

    void loadLeadPresimulation();

    return () => {
      isMounted = false;
    };
  }, [preSimulationLeadId]);

  useEffect(() => {
    const searchTerm = form.empresa.trim();

    if (searchTerm.length < 2 || selectedCompany) {
      setCompanySuggestions([]);
      setCompanySearchError('');
      setLastSearchTerm('');
      return;
    }

    let isMounted = true;

    async function loadCompanySuggestions() {
      try {
        setCompanySearchLoading(true);
        setCompanySearchError('');

        const params = new URLSearchParams({
          name: searchTerm,
        });

        const response = await fetch(`${BACKEND_BASE_URL}/search-company?${params.toString()}`);

        const result: {
          success: boolean;
          data?: CompanySearchResult[];
          error?: string;
        } = await response.json();

        if (!isMounted) return;

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Erro ao buscar empresas');
        }

        const mappedCompanies = (result.data || []).map(mapSearchResultToCompany);

        setCompanySuggestions(mappedCompanies);
        setLastSearchTerm(searchTerm);
      } catch (error) {
        if (!isMounted) return;

        const message = error instanceof Error ? error.message : 'Erro ao buscar empresas';
        setCompanySuggestions([]);
        setCompanySearchError(message);
      } finally {
        if (isMounted) {
          setCompanySearchLoading(false);
        }
      }
    }

    const timer = window.setTimeout(() => {
      void loadCompanySuggestions();
    }, 450);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [form.empresa, selectedCompany]);

  async function consultAndSelectCompanyByCnpj(cnpj: string, isMounted = true) {
    const response = await fetch(`${BACKEND_BASE_URL}/consult-cnpj`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cnpj }),
    });

    const result: ConsultCnpjResponse = await response.json();

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.error || 'Erro ao consultar CNPJ completo');
    }

    const enrichedCompany = mapConsultedCnpjToCompany(result.data);

    if (isMounted) {
      setSelectedCompany(enrichedCompany);
      setForm((current) => ({ ...current, empresa: enrichedCompany.nomeFantasia }));
      setCompanySuggestions([]);
    }

    return enrichedCompany;
  }

  async function searchAndSelectCompanyByName(companyName: string, isMounted = true) {
    const searchTerm = companyName.trim();

    if (searchTerm.length < 2) return null;

    try {
      setCompanySearchLoading(true);
      setCompanySearchError('');

      const params = new URLSearchParams({
        name: searchTerm,
      });

      const response = await fetch(`${BACKEND_BASE_URL}/search-company?${params.toString()}`);

      const result: {
        success: boolean;
        data?: CompanySearchResult[];
        error?: string;
      } = await response.json();

      if (!isMounted) return null;

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao buscar empresa informada pelo lead');
      }

      const companies = result.data || [];

      if (companies.length === 0) {
        setCompanySuggestions([]);
        setLastSearchTerm(searchTerm);
        setCompanySearchError(
          'Empresa informada pelo lead não encontrada automaticamente na base. O nome foi preenchido para busca manual.',
        );
        return null;
      }

      const mappedCompanies = companies.map(mapSearchResultToCompany);
      const bestCompany = mappedCompanies[0];

      setCompanySuggestions(mappedCompanies);
      setLastSearchTerm(searchTerm);

      try {
        const enrichedCompany = await consultAndSelectCompanyByCnpj(bestCompany.cnpj, isMounted);

        if (isMounted) {
          setCompanyConsultError('');
          setLeadLoadStatus('Dados do lead e empresa carregados no Pré-simulador CLT.');
        }

        return enrichedCompany;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao consultar CNPJ completo';

        if (isMounted) {
          setSelectedCompany(bestCompany);
          setForm((current) => ({ ...current, empresa: bestCompany.nomeFantasia }));
          setCompanySuggestions([]);
          setCompanyConsultError(`${message}. A empresa foi selecionada com os dados disponíveis na base de busca.`);
        }

        return bestCompany;
      }
    } catch (error) {
      if (!isMounted) return null;

      const message = error instanceof Error ? error.message : 'Erro ao buscar empresa informada pelo lead';
      setCompanySearchError(message);
      return null;
    } finally {
      if (isMounted) {
        setCompanySearchLoading(false);
      }
    }
  }

  function updateField<K extends keyof CltPreSimulatorFormData>(field: K, value: CltPreSimulatorFormData[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCompanyInputChange(value: string) {
    setForm((current) => ({ ...current, empresa: value }));
    setCompanyConsultError('');
    setCustomerMessage('');
    setLeadLoadStatus('');
    setLeadLoadError('');

    if (selectedCompany && value.trim() !== selectedCompany.nomeFantasia) {
      setSelectedCompany(null);
    }
  }

  async function handleCompanySelect(company: EnrichedCompanyProfile) {
    setCompanyConsultLoading(true);
    setCompanyConsultError('');

    const fallbackCompany = company;

    try {
      const enrichedCompany = await consultAndSelectCompanyByCnpj(company.cnpj);
      setSelectedCompany(enrichedCompany);
      setForm((current) => ({ ...current, empresa: enrichedCompany.nomeFantasia }));
      setCompanySuggestions([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao consultar CNPJ completo';

      setSelectedCompany(fallbackCompany);
      setForm((current) => ({ ...current, empresa: fallbackCompany.nomeFantasia }));
      setCompanySuggestions([]);
      setCompanyConsultError(`${message}. A empresa foi selecionada com os dados disponíveis na base de busca.`);
    } finally {
      setCompanyConsultLoading(false);
    }
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setSelectedCompany(null);
    setCompanySuggestions([]);
    setCustomerMessage('');
    setCompanySearchError('');
    setCompanyConsultError('');
    setLastSearchTerm('');
    setLeadLoadStatus('');
    setLeadLoadError('');
  }

  function handleGenerateCustomerMessage() {
    setCustomerMessage(generateCltCustomerMessage(eligibleBanks));
  }

  async function handleCopyCustomerMessage() {
    if (!customerMessage) return;
    await navigator.clipboard.writeText(customerMessage);
  }

  return (
    <section className="panel glass-card">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Pré-análise</span>
          <h2>Pré-simulador CLT</h2>
          <p className="panel-subtitle">
            Ferramenta inicial para identificar os bancos com maior chance de aprovação.
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={resetForm}>
          Limpar
        </button>
      </div>

      {leadLoadStatus ? <div className="feedback-banner glass-card">{leadLoadStatus}</div> : null}

      {leadLoadError ? (
        <div className="feedback-banner glass-card">
          Erro ao carregar dados do lead: {leadLoadError}
        </div>
      ) : null}

      <div className="form-grid">
        <label>
          <span>Idade</span>
          <input
            name="idade"
            type="number"
            inputMode="numeric"
            min="18"
            placeholder="Ex.: 32"
            value={form.idade}
            onChange={(event) => updateField('idade', event.target.value)}
          />
        </label>

        <label>
          <span>Tempo de empresa</span>
          <input
            name="tempoEmpresa"
            placeholder="Ex.: 2 anos e 4 meses"
            value={form.tempoEmpresa}
            onChange={(event) => updateField('tempoEmpresa', event.target.value)}
          />
        </label>

        <label className="full-span company-field">
          <span>Empresa onde trabalha</span>
          <input
            name="empresa"
            autoComplete="organization"
            placeholder="Digite o nome da empresa"
            value={form.empresa}
            onChange={(event) => handleCompanyInputChange(event.target.value)}
          />

          {companySearchLoading ? <div className="company-helper-text">Buscando empresas na base...</div> : null}

          {showCompanySuggestions ? (
            <div className="company-suggestions glass-card">
              {companySuggestions.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className="company-suggestion-item"
                  onClick={() => void handleCompanySelect(company)}
                  disabled={companyConsultLoading}
                >
                  <strong>{company.nomeFantasia}</strong>
                  <span>{company.razaoSocial}</span>
                  <small>
                    {formatCnpj(company.cnpj)} • {company.porte || 'Porte não informado'}
                  </small>
                </button>
              ))}
            </div>
          ) : null}

          {companyConsultLoading ? <div className="company-helper-text">Consultando CNPJ completo...</div> : null}

          {selectedCompany ? (
            <div className="company-selected-card">
              <div className="company-selected-header">
                <strong>Empresa identificada</strong>
                <span className="company-selected-tag">Base CNPJ NumON</span>
              </div>
              <div className="company-selected-grid">
                <span>{selectedCompany.nomeFantasia}</span>
                <span>{formatCnpj(selectedCompany.cnpj)}</span>
                <span>{selectedCompany.porte}</span>
                <span>{selectedCompany.cnaePrincipal}</span>
              </div>
            </div>
          ) : null}

          {!companySearchLoading &&
          !selectedCompany &&
          form.empresa.trim().length >= 2 &&
          companySuggestions.length === 0 &&
          lastSearchTerm === form.empresa.trim() ? (
            <div className="company-helper-text">
              Nenhuma empresa encontrada na base local. Quando o CNPJ for consultado uma vez, ele ficará disponível
              para buscas futuras por nome.
            </div>
          ) : null}

          {companySearchError ? (
            <div className="company-helper-text">Erro na busca de empresa: {companySearchError}</div>
          ) : null}

          {companyConsultError ? <div className="company-helper-text">{companyConsultError}</div> : null}

          {selectedCompanyNeedsReview ? (
            <div className="company-helper-text">
              O nome foi alterado após a seleção. Escolha novamente uma sugestão para enriquecer os dados da empresa.
            </div>
          ) : null}
        </label>

        <label>
          <span>Está trabalhando normalmente hoje?</span>
          <select
            name="trabalhandoHoje"
            value={form.trabalhandoHoje}
            onChange={(event) => updateField('trabalhandoHoje', event.target.value)}
          >
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>

        <label>
          <span>Já possui consignado ativo?</span>
          <select
            name="consignadoAtivo"
            value={form.consignadoAtivo}
            onChange={(event) => updateField('consignadoAtivo', event.target.value)}
          >
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>

        <label className="full-span">
          <span>Objetivo do cliente</span>
          <textarea
            name="objetivoCliente"
            rows={4}
            placeholder="Descreva o objetivo principal desta simulação."
            value={form.objetivoCliente}
            onChange={(event) => updateField('objetivoCliente', event.target.value)}
          />
        </label>
      </div>

      <div className="simulator-note">
        A elegibilidade abaixo usa regras locais de idade, tempo de empresa, vínculo ativo, consignado ativo e dados
        enriquecidos da empresa quando disponíveis. A aprovação provável é uma prioridade operacional, não garantia de
        aprovação bancária.
      </div>

      <div className="simulator-results">
        <div className="panel-header simulator-results-header">
          <div>
            <span className="eyebrow">Resultados técnicos</span>
            <h3>Análise de bancos</h3>
            <p className="panel-subtitle">
              Os cards abaixo separam bancos indicados, pendentes de validação e não indicados.
            </p>
          </div>
        </div>

        {!showResults ? (
          <div className="simulator-empty-state">
            Preencha idade, tempo de empresa, situação de trabalho atual e consignado ativo para ver a análise dos
            bancos.
          </div>
        ) : null}

        {showResults ? (
          <>
            <div className="simulator-summary-card">
              <span className="badge">{indicatedBanks.length} bancos indicados</span>
              <p>
                Encontramos {indicatedBanks.length} bancos indicados, {pendingBanks.length} pendentes de validação e{' '}
                {notEligibleBanks.length} não indicados para este perfil.
              </p>
            </div>

            {indicatedBanks.length > 0 ? (
              <>
                <div className="panel-header simulator-results-header">
                  <div>
                    <span className="eyebrow">Prioridade operacional</span>
                    <h3>Bancos indicados</h3>
                    <p className="panel-subtitle">
                      Bancos que passaram pelas regras conhecidas e estão ordenados pela prioridade de tentativa.
                    </p>
                  </div>
                </div>

                <div className="simulator-actions">
                  <button className="primary-button" type="button" onClick={handleGenerateCustomerMessage}>
                    Gerar mensagem para cliente
                  </button>
                </div>

                <div className="bank-grid">
                  {indicatedBanks.map((bank, index) => (
                    <EligibleEvaluationBankCard key={bank.id} bank={bank} rankIndex={index} />
                  ))}
                </div>
              </>
            ) : (
              <div className="simulator-empty-state">
                Nenhum banco indicado foi encontrado com as regras conhecidas. Verifique os pendentes e os não
                indicados.
              </div>
            )}

            {pendingBanks.length > 0 ? (
              <>
                <div className="panel-header simulator-results-header">
                  <div>
                    <span className="eyebrow">Atenção operacional</span>
                    <h3>Bancos pendentes de validação</h3>
                    <p className="panel-subtitle">
                      Bancos que podem aceitar, mas dependem de informação que a consulta gratuita ainda não entrega.
                    </p>
                  </div>
                </div>

                <div className="bank-grid">
                  {pendingBanks.map((bank) => (
                    <EvaluationBankCard key={bank.id} bank={bank} variant="pending" />
                  ))}
                </div>
              </>
            ) : null}

            {notEligibleBanks.length > 0 ? (
              <>
                <div className="panel-header simulator-results-header">
                  <div>
                    <span className="eyebrow">Reprovação técnica</span>
                    <h3>Bancos não indicados</h3>
                    <p className="panel-subtitle">
                      Bancos que reprovaram por uma regra objetiva conhecida do roteiro.
                    </p>
                  </div>
                </div>

                <div className="bank-grid">
                  {notEligibleBanks.map((bank) => (
                    <EvaluationBankCard key={bank.id} bank={bank} variant="not_eligible" />
                  ))}
                </div>
              </>
            ) : null}

            {customerMessage ? (
              <div className="customer-message-card">
                <div className="customer-message-header">
                  <div>
                    <span className="eyebrow">Saída comercial</span>
                    <h3>Mensagem para cliente</h3>
                  </div>
                  <button className="ghost-button" type="button" onClick={() => void handleCopyCustomerMessage()}>
                    Copiar mensagem
                  </button>
                </div>

                <pre className="customer-message-content">{customerMessage}</pre>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}