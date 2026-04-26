import { useState } from 'react';
import type { Indicator, IndicatorStatus } from '../../types/indicator';

type IndicatorFormData = Omit<Indicator, 'id' | 'created_at' | 'updated_at'>;

type Props = {
  initialValues?: Partial<IndicatorFormData>;
  onSubmit: (values: IndicatorFormData) => Promise<void>;
  loading?: boolean;
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function IndicatorForm({ initialValues, onSubmit, loading }: Props) {
  const [form, setForm] = useState<IndicatorFormData>({
    auth_user_id: initialValues?.auth_user_id ?? null,
    full_name: initialValues?.full_name ?? '',
    cpf: initialValues?.cpf ?? '',
    phone: initialValues?.phone ?? '',
    whatsapp: initialValues?.whatsapp ?? '',
    email: initialValues?.email ?? '',
    pix_key: initialValues?.pix_key ?? '',
    pix_key_type: initialValues?.pix_key_type ?? '',
    bank_name: initialValues?.bank_name ?? '',
    agency: initialValues?.agency ?? '',
    account_number: initialValues?.account_number ?? '',
    status: (initialValues?.status as IndicatorStatus) ?? 'ativo',
    slug: initialValues?.slug ?? '',
    notes: initialValues?.notes ?? '',
  });

  function updateField<K extends keyof IndicatorFormData>(key: K, value: IndicatorFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      ...form,
      slug: form.slug?.trim() || slugify(form.full_name),
    };

    await onSubmit(payload);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid #E2E8F0',
    outline: 'none',
    marginTop: 6,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    color: '#0F172A',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 24,
        padding: 24,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#123C73' }}>Cadastrar indicador</h2>
        <p style={{ margin: '8px 0 0', color: '#64748B' }}>
          Cadastre parceiros e gere links de indicação.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        <label style={labelStyle}>
          Nome completo
          <input
            style={inputStyle}
            value={form.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            required
          />
        </label>

        <label style={labelStyle}>
          E-mail
          <input
            style={inputStyle}
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />
        </label>

        <label style={labelStyle}>
          CPF
          <input
            style={inputStyle}
            value={form.cpf ?? ''}
            onChange={(e) => updateField('cpf', e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          Telefone
          <input
            style={inputStyle}
            value={form.phone ?? ''}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          WhatsApp
          <input
            style={inputStyle}
            value={form.whatsapp ?? ''}
            onChange={(e) => updateField('whatsapp', e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          Status
          <select
            style={inputStyle}
            value={form.status}
            onChange={(e) => updateField('status', e.target.value as IndicatorStatus)}
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </label>

        <label style={labelStyle}>
          Slug do link
          <input
            style={inputStyle}
            value={form.slug ?? ''}
            onChange={(e) => updateField('slug', e.target.value)}
            placeholder="maria-numon"
          />
        </label>

        <label style={labelStyle}>
          Tipo da chave PIX
          <input
            style={inputStyle}
            value={form.pix_key_type ?? ''}
            onChange={(e) => updateField('pix_key_type', e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          Chave PIX
          <input
            style={inputStyle}
            value={form.pix_key ?? ''}
            onChange={(e) => updateField('pix_key', e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          Banco
          <input
            style={inputStyle}
            value={form.bank_name ?? ''}
            onChange={(e) => updateField('bank_name', e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          Agência
          <input
            style={inputStyle}
            value={form.agency ?? ''}
            onChange={(e) => updateField('agency', e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          Conta
          <input
            style={inputStyle}
            value={form.account_number ?? ''}
            onChange={(e) => updateField('account_number', e.target.value)}
          />
        </label>
      </div>

      <label style={{ ...labelStyle, marginTop: 16 }}>
        Observações
        <textarea
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
          value={form.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </label>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#123C73',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 14,
            padding: '12px 18px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Salvando...' : 'Salvar indicador'}
        </button>
      </div>
    </form>
  );
}