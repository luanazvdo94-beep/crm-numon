import { useEffect, useMemo, useState } from 'react';
import { BankLogo } from './BankLogo';
import type { BankChanceLabel, CltPreSimulatorFormData, EligibleCltBank, EnrichedCompanyProfile } from '../types';
import { getEligibleCltBanks, shouldShowCltEligibilityResults } from '../utils/cltEligibility';
import { getCltBankDestination, openCltBankDestination } from '../utils/cltBankNavigation';
import { generateCltCustomerMessage } from '../utils/cltCommercialMessage';
import { isSelectedCompanyInputDirty, searchCompaniesByName } from '../utils/companyEnrichment';

const INITIAL_FORM: CltPreSimulatorFormData = {
  idade: '',
  tempoEmpresa: '',
  empresa: '',
  trabalhandoHoje: '',
  consignadoAtivo: '',
  objetivoCliente: '',
};

function getEligibilityClassName(eligibility: BankChanceLabel) {
  if (eligibility === 'Alta chance') return 'bank-badge high';
  if (eligibility === 'Media chance') return 'bank-badge medium';
  return 'bank-badge low';
}

function getEligibilityLabel(eligibility: BankChanceLabel) {
  if (eligibility === 'Media chance') return 'Média chance';
  return eligibility;
}

function getTopOptionLabel(index: number) {
  if (index === 0) return '1ª opção';
  if (index === 1) return '2ª opção';
  if (index === 2) return '3ª opção';
  return null;
}

function EligibleBankCard({ bank, rankIndex }: { bank: EligibleCltBank; rankIndex: number }) {
  const destination = getCltBankDestination(bank.id);
  const topOptionLabel = getTopOptionLabel(rankIndex);

  return (
    <button
      key={bank.id}
      type="button"
      className="bank-card"
      aria-label={`Abrir destino do banco ${bank.name}`}
      title={destination ? `Abrir ${bank.name} em nova aba` : `Destino do banco ${bank.name} não configurado`}
      onClick={() => openCltBankDestination(bank)}
    >
      {topOptionLabel ? <span className="bank-rank-chip">{topOptionLabel}</span> : null}
      <BankLogo bankId={bank.id} bankName={bank.name} />
      <div className="bank-card-body">
        <strong>{bank.name}</strong>
        <span className={getEligibilityClassName(bank.badge)}>{getEligibilityLabel(bank.badge)}</span>
      </div>
    </button>
  );
}

export function CltPreSimulator() {
  const [form, setForm] = useState<CltPreSimulatorFormData>(INITIAL_FORM);
  const [selectedCompany, setSelectedCompany] = useState<EnrichedCompanyProfile | null>(null);
  const [companySuggestions, setCompanySuggestions] = useState<EnrichedCompanyProfile[]>([]);
  const [customerMessage, setCustomerMessage] = useState('');
  const eligibleBanks = useMemo(() => getEligibleCltBanks(form, selectedCompany), [form, selectedCompany]);
  const showResults = useMemo(() => shouldShowCltEligibilityResults(form), [form]);
  const showCompanySuggestions = form.empresa.trim().length >= 2 && companySuggestions.length > 0;
  const selectedCompanyNeedsReview = useMemo(
    () => isSelectedCompanyInputDirty(form.empresa, selectedCompany),
    [form.empresa, selectedCompany],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCompanySuggestions() {
      const companies = await searchCompaniesByName(form.empresa);
      if (isMounted) {
        setCompanySuggestions(companies);
      }
    }

    void loadCompanySuggestions();

    return () => {
      isMounted = false;
    };
  }, [form.empresa]);

  function updateField<K extends keyof CltPreSimulatorFormData>(field: K, value: CltPreSimulatorFormData[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCompanyInputChange(value: string) {
    setForm((current) => ({ ...current, empresa: value }));

    if (selectedCompany && value.trim() !== selectedCompany.nomeFantasia) {
      setSelectedCompany(null);
    }
  }

  function handleCompanySelect(company: EnrichedCompanyProfile) {
    setSelectedCompany(company);
    setForm((current) => ({ ...current, empresa: company.nomeFantasia }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setSelectedCompany(null);
    setCompanySuggestions([]);
    setCustomerMessage('');
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
            placeholder="Nome da empresa"
            value={form.empresa}
            onChange={(event) => handleCompanyInputChange(event.target.value)}
          />

          {showCompanySuggestions ? (
            <div className="company-suggestions glass-card">
              {companySuggestions.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className="company-suggestion-item"
                  onClick={() => handleCompanySelect(company)}
                >
                  <strong>{company.nomeFantasia}</strong>
                  <span>{company.razaoSocial}</span>
                  <small>{company.cnpj}</small>
                </button>
              ))}
            </div>
          ) : null}

          {selectedCompany ? (
            <div className="company-selected-card">
              <div className="company-selected-header">
                <strong>Empresa identificada</strong>
                <span className="company-selected-tag">Base local temporária</span>
              </div>
              <div className="company-selected-grid">
                <span>{selectedCompany.nomeFantasia}</span>
                <span>{selectedCompany.cnpj}</span>
                <span>{selectedCompany.porte}</span>
                <span>{selectedCompany.cnaePrincipal}</span>
              </div>
            </div>
          ) : null}

          {!selectedCompany && form.empresa.trim().length >= 2 && companySuggestions.length === 0 ? (
            <div className="company-helper-text">Nenhuma empresa mockada encontrada para este nome.</div>
          ) : null}

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
        A elegibilidade abaixo usa regras locais de idade, tempo de empresa, vinculo ativo e restricao conservadora
        para consignado ativo. Regras que dependem de enriquecimento da empresa ficam para a fase 2.
      </div>

      <div className="simulator-results">
        <div className="panel-header simulator-results-header">
          <div>
            <span className="eyebrow">Resultados visuais</span>
            <h3>Bancos elegíveis</h3>
            <p className="panel-subtitle">Os cards abaixo aparecem apenas quando o formulario atende as regras locais.</p>
          </div>
        </div>

        {!showResults ? (
          <div className="simulator-empty-state">
            Preencha idade, tempo de empresa, situação de trabalho atual e consignado ativo para ver os bancos
            elegíveis.
          </div>
        ) : null}

        {showResults && eligibleBanks.length === 0 ? (
          <div className="simulator-empty-state">
            Nenhum banco elegível foi encontrado com as regras locais desta fase. Revise os dados informados ou siga
            para a próxima etapa de análise manual.
          </div>
        ) : null}

        {showResults && eligibleBanks.length > 0 ? (
          <>
            <div className="simulator-summary-card">
              <span className="badge">{eligibleBanks.length} bancos elegíveis</span>
              <p>Encontramos {eligibleBanks.length} bancos com potencial de aprovação para este perfil.</p>
            </div>

            <div className="simulator-actions">
              <button className="primary-button" type="button" onClick={handleGenerateCustomerMessage}>
                Gerar mensagem para cliente
              </button>
            </div>

            <div className="bank-grid">
              {eligibleBanks.map((bank, index) => (
                <EligibleBankCard key={bank.id} bank={bank} rankIndex={index} />
              ))}
            </div>

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
