export type TabKey = 'cadastro' | 'base' | 'funil';

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
