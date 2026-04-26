import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

type IndicatorLookup = {
  id: string;
  full_name: string;
  slug: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
  auth_user_id: string | null;
};

type FormState = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  empresa: string;
};

const initialForm: FormState = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  empresa: '',
};

// 🔥 SEU USER ID FIXO (DONO DO CRM)
const DEFAULT_USER_ID = '3b7cfecb-dd1f-4419-9ab0-21d57d1e0b9f';

export default function ReferralLandingPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [indicator, setIndicator] = useState<IndicatorLookup | null>(null);
  const [loadingIndicator, setLoadingIndicator] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const ref = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref')?.trim() || '';
  }, []);

  useEffect(() => {
    const loadIndicator = async () => {
      if (!ref) {
        setLoadingIndicator(false);
        return;
      }

      const { data, error } = await supabase
        .from('indicators')
        .select('id, full_name, slug, status, auth_user_id')
        .eq('slug', ref)
        .eq('status', 'ativo')
        .single();

      if (error) {
        console.error(error);
        setIndicator(null);
      } else {
        setIndicator(data as IndicatorLookup);
      }

      setLoadingIndicator(false);
    };

    void loadIndicator();
  }, [ref]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!indicator) {
      alert('Indicador inválido ou inativo.');
      return;
    }

    setSubmitting(true);

    // 🔥 AQUI ESTÁ A MÁGICA
    const userIdToUse = indicator.auth_user_id || DEFAULT_USER_ID;

    const { error } = await supabase.from('leads').insert({
      nome: form.nome,
      cpf: form.cpf,
      telefone: form.telefone,
      email: form.email,
      empresa: form.empresa,
      origem: 'indicacao',
      source: 'indicacao',
      indicator_id: indicator.id,
      ref_code: indicator.slug,
      user_id: userIdToUse,
      status: 'Novo',
      etapa: 'Entrada',
    });

    if (error) {
      console.error(error);
      alert(`Erro ao enviar indicação: ${error.message}`);
    } else {
      alert('Indicação enviada com sucesso.');
      setForm(initialForm);
    }

    setSubmitting(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid #D6E0EA',
    background: '#FFFFFF',
    color: '#0F172A',
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: 6,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    color: '#123C73',
    fontWeight: 600,
  };

  if (loadingIndicator) {
    return <div>Carregando...</div>;
  }

  if (!indicator) {
    return <div>Link inválido</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Indicação</h1>
      <p>Indicação de: {indicator.full_name}</p>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Nome"
          value={form.nome}
          onChange={(e) => updateField('nome', e.target.value)}
        />

        <input
          placeholder="CPF"
          value={form.cpf}
          onChange={(e) => updateField('cpf', e.target.value)}
        />

        <input
          placeholder="Telefone"
          value={form.telefone}
          onChange={(e) => updateField('telefone', e.target.value)}
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}