export type IndicatorStatus = 'ativo' | 'inativo' | 'bloqueado';

export interface Indicator {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  cpf?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email: string;
  pix_key?: string | null;
  pix_key_type?: string | null;
  bank_name?: string | null;
  agency?: string | null;
  account_number?: string | null;
  status: IndicatorStatus;
  slug: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}