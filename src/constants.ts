import type { LeadFormData, LeadStage, LeadStatus } from './types';

export const STATUS_OPTIONS: LeadStatus[] = [
  'Novo',
  'Contato iniciado',
  'Proposta enviada',
  'Aguardando retorno',
  'Fechado',
  'Perdido',
];

export const STAGE_OPTIONS: LeadStage[] = [
  'Entrada',
  'Qualificação',
  'Simulação',
  'Proposta',
  'Assinatura',
  'Pós-venda',
];

export const DEFAULT_FORM: LeadFormData = {
  nome: '',
  telefone: '',
  cpf: '',
  email: '',
  empresa: '',
  origem: '',
  produto: '',
  status: 'Novo',
  etapa: 'Entrada',
  valor_interesse: '',
  observacoes: '',
};
