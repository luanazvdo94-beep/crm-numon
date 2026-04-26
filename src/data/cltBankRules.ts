import type { CltBankRule } from '../types';

const PENDING_PHASE_2_CHECKS = [
  'CNAE da empresa',
  'faturamento',
  'numero de funcionarios',
  'idade da empresa',
  'validacoes de FGTS/INSS',
  'porte da empresa',
];

export const CLT_BANK_RULES: CltBankRule[] = [
  {
    id: 'c6',
    name: 'C6',
    logo: 'C6',
    ageRule: {
      min: 21,
      max: { type: 'current_age', value: 60 },
    },
    minEmploymentMonths: 12,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'none',
      insufficientDataBehavior: 'neutral',
    },
    companyRule: {
      minCompanyYears: 2,
      insufficientDataBehavior: 'neutral',
    },
    // Placeholder visual while the UI still expects a badge-like label.
    visualBadge: 'Alta chance',
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'zili',
    name: 'Zili',
    logo: 'ZILI',
    ageRule: {
      min: 18,
      maxBySex: { type: 'current_age', female: 59, male: 64 },
    },
    minEmploymentMonths: 5,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'none',
      insufficientDataBehavior: 'neutral',
      notes: ['Idade maxima oficial considera sexo, mas o formulario atual ainda nao coleta esse dado.'],
    },
    companyRule: {
      minCompanyYears: 2,
      rejectMei: true,
      requireFgtsRegular: true,
      requireInssRegular: true,
      insufficientDataBehavior: 'neutral',
    },
    visualBadge: 'Alta chance',
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'v8',
    name: 'V8',
    logo: 'V8',
    ageRule: {
      min: 21,
      max: { type: 'current_age', value: 65 },
    },
    minEmploymentMonths: 3,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'none',
      insufficientDataBehavior: 'neutral',
    },
    companyRule: {
      minCompanyYears: 3,
      requireFgtsRegular: true,
      requireInssRegular: true,
      insufficientDataBehavior: 'neutral',
    },
    visualBadge: 'Media chance',
    notes: ['Prazo depende do tempo de empresa.'],
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'agil',
    name: 'Agil',
    logo: 'AGL',
    ageRule: {
      min: 18,
      max: { type: 'current_age', value: 55 },
    },
    minEmploymentMonths: 12,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'none',
      insufficientDataBehavior: 'neutral',
    },
    companyRule: {
      minCompanyYears: 2,
      minEmployees: 50,
      insufficientDataBehavior: 'neutral',
    },
    visualBadge: 'Alta chance',
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'facta',
    name: 'Facta',
    logo: 'FACTA',
    ageRule: {
      min: 21,
      maxBySex: { type: 'current_age', female: 57, male: 62 },
    },
    minEmploymentMonths: 3,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'none',
      insufficientDataBehavior: 'neutral',
      notes: ['Nao excluir por consignado ativo, pois isso conflita com portabilidade e refinanciamento.'],
    },
    companyRule: {
      insufficientDataBehavior: 'neutral',
      notes: ['Regra empresarial detalhada permanece neutra nesta fase.'],
    },
    visualBadge: 'Media chance',
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'qualibank',
    name: 'Qualibank',
    logo: 'QLB',
    ageRule: {
      min: 21,
      max: { type: 'contract_end_age', value: 65 },
    },
    minEmploymentMonths: 3,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'max_active_contracts',
      maxActiveContracts: 3,
      insufficientDataBehavior: 'neutral',
      notes: ['Maximo de 3 contratos por CPF.'],
    },
    companyRule: {
      minCompanyYears: 3,
      rejectMei: true,
      allowEmployerPersonTypeCheck: true,
      insufficientDataBehavior: 'neutral',
      notes: [
        'Nao aceitar empregador pessoa fisica permanece pendente, pois o mock atual nao distingue isso com confianca.',
        'Capital social minimo permanece pendente.',
        'Faturamento anual presumido minimo permanece pendente sem validacao segura.',
      ],
    },
    visualBadge: 'Media chance',
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'bmg',
    name: 'BMG',
    logo: 'BMG',
    ageRule: {
      min: 18,
      max: { type: 'current_age', value: 60 },
    },
    minEmploymentMonths: 12,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'none',
      insufficientDataBehavior: 'neutral',
    },
    companyRule: {
      minCompanyYears: 5,
      insufficientDataBehavior: 'neutral',
    },
    visualBadge: 'Alta chance',
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'hub',
    name: 'Hub',
    logo: 'HUB',
    ageRule: {
      min: 18,
      max: { type: 'current_age', value: 60 },
    },
    minEmploymentMonths: 6,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'none',
      insufficientDataBehavior: 'neutral',
    },
    companyRule: {
      minCompanyYears: 2,
      minEmployees: 20,
      insufficientDataBehavior: 'neutral',
    },
    visualBadge: 'Media chance',
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'novo-saque',
    name: 'Novo Saque',
    logo: 'NS',
    ageRule: {
      min: 21,
      max: { type: 'contract_end_age', value: 60 },
    },
    minEmploymentMonths: 6,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'none',
      insufficientDataBehavior: 'neutral',
    },
    companyRule: {
      minCompanyYearsByCompanyType: {
        me: 3,
        default: 2,
      },
      insufficientDataBehavior: 'neutral',
    },
    visualBadge: 'Baixa chance',
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'sua-bank',
    name: 'Sua Bank',
    logo: 'SB',
    ageRule: {
      min: 21,
      maxBySex: { type: 'current_age', female: 57, male: 62 },
    },
    minEmploymentMonths: 6,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'max_active_contracts',
      maxActiveContracts: 1,
      insufficientDataBehavior: 'neutral',
      notes: ['Maximo de 1 contrato por CPF.'],
    },
    companyRule: {
      minCompanyYears: 3,
      requireFgtsRegular: true,
      insufficientDataBehavior: 'neutral',
    },
    visualBadge: 'Media chance',
    notes: ['Ha regra dinamica por tempo de empresa.'],
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
  {
    id: 'soma',
    name: 'Soma',
    logo: 'SOMA',
    ageRule: {
      min: 18,
      max: { type: 'current_age', value: 62 },
    },
    minEmploymentMonths: 6,
    requiresActiveEmployment: true,
    contractRule: {
      type: 'source_specific_limits',
      sourceSpecificLimits: [
        { source: 'UY3', maxActiveContracts: 1 },
        { source: 'Dataprev', maxActiveContracts: 4 },
      ],
      insufficientDataBehavior: 'neutral',
      notes: ['Regra depende da origem dos contratos ativos.'],
    },
    companyRule: {
      minCompanyYears: 3,
      rejectMei: true,
      rejectMe: true,
      requireFgtsRegular: true,
      requireInssRegular: true,
      employeesOrRevenue: {
        minEmployees: 20,
        minRevenue: 1500000,
      },
      insufficientDataBehavior: 'neutral',
    },
    visualBadge: 'Baixa chance',
    pendingPhase2Checks: PENDING_PHASE_2_CHECKS,
  },
];
