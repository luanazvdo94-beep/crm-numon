export type TabKey =
  | 'cadastro'
  | 'base'
  | 'funil'
  | 'pre-simulador-clt'
  | 'indicators'
  | 'indicacoes'
  | 'templates-whatsapp'
  | 'disparo-massa'
  | 'historico-disparos';

export type LeadStatus =
  | 'Novo'
  | 'Contato iniciado'
  | 'Proposta enviada'
  | 'Aguardando retorno'
  | 'Fechado'
  | 'Perdido';

export type LeadStage =
  | 'Entrada'
  | 'Qualificação'
  | 'Simulação'
  | 'Proposta'
  | 'Assinatura'
  | 'Pós-venda';

export interface LeadFormData {
  nome: string;
  telefone: string;
  cpf: string;
  email: string;
  empresa: string;
  origem: string;
  produto: string;
  status: LeadStatus;
  etapa: LeadStage;
  valor_interesse: string;
  observacoes: string;
}

export interface LeadRecord {
  id: string;
  user_id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  email: string | null;
  empresa: string | null;
  origem: string | null;
  produto: string | null;
  status: LeadStatus;
  etapa: LeadStage;
  valor_interesse: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type CltBinaryAnswer = '' | 'sim' | 'nao';

export interface CltPreSimulatorFormData {
  idade: string;
  tempoEmpresa: string;
  empresa: string;
  trabalhandoHoje: CltBinaryAnswer;
  consignadoAtivo: CltBinaryAnswer;
  objetivoCliente: string;
}

export type BankChanceLabel = 'Alta chance' | 'Media chance' | 'Baixa chance';

export type SexKey = 'female' | 'male';

export interface CltAgeRule {
  min: number;
  max?: {
    type: 'current_age' | 'contract_end_age';
    value: number;
  };
  maxBySex?: {
    type: 'current_age' | 'contract_end_age';
    female: number;
    male: number;
  };
}

export interface CltContractRule {
  type: 'none' | 'max_active_contracts' | 'source_specific_limits';
  maxActiveContracts?: number;
  sourceSpecificLimits?: Array<{
    source: string;
    maxActiveContracts: number;
  }>;
  insufficientDataBehavior: 'neutral';
  notes?: string[];
}

export interface CltCompanyRule {
  minCompanyYears?: number;
  minEmployees?: number;
  requireFgtsRegular?: boolean;
  requireInssRegular?: boolean;
  rejectMei?: boolean;
  rejectMe?: boolean;
  minCompanyYearsByCompanyType?: {
    me: number;
    default: number;
  };
  allowEmployerPersonTypeCheck?: boolean;
  minRevenue?: number;
  employeesOrRevenue?: {
    minEmployees: number;
    minRevenue: number;
  };
  insufficientDataBehavior: 'neutral';
  notes?: string[];
}

export interface CltBankRule {
  id: string;
  name: string;
  logo: string;
  ageRule: CltAgeRule;
  minEmploymentMonths: number;
  requiresActiveEmployment: boolean;
  contractRule: CltContractRule;
  companyRule?: CltCompanyRule;
  visualBadge: BankChanceLabel;
  notes?: string[];
  pendingPhase2Checks: string[];
}

export interface EligibleCltBank {
  id: string;
  name: string;
  logo: string;
  badge: BankChanceLabel;
}

export type CltRankingMetric =
  | 'approvalChance'
  | 'releasedAmount'
  | 'installmentTerm'
  | 'interestRate'
  | 'operationalFriction'
  | 'journeySpeed'
  | 'commission'
  | 'structuralFit';

export type CltRankingWeights = Record<CltRankingMetric, number>;

export interface CltBankRankingProfile {
  approvalChance: number;
  releasedAmount: number;
  installmentTerm: number;
  interestRate: number;
  operationalFriction: number;
  journeySpeed: number;
  commission: number;
  structuralFit: number;
}

export type CltRankingGoal =
  | 'default'
  | 'maior-valor'
  | 'menor-parcela'
  | 'aprovacao-facil';

export interface EnrichedCompanyProfile {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  cnaePrincipal: string;
  porte: string;
  anosEmpresa: number;
  funcionarios: number;
  faturamentoEstimado: string;
  fgtsRegular: boolean;
  inssRegular: boolean;
  mei: boolean;
  me: boolean;
}

export type CompanyDataSource = 'mock' | 'external';

export type CompanyLookupStatus = 'idle' | 'success' | 'empty' | 'error';

export interface CompanySearchResult {
  companies: EnrichedCompanyProfile[];
  source: CompanyDataSource;
  status: CompanyLookupStatus;
}

export type CltBankDestinationType = 'external_url';

export interface CltBankDestination {
  id: string;
  name: string;
  destinationType: CltBankDestinationType;
  destinationValue: string;
}