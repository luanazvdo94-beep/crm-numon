import type { ClipboardEvent } from 'react';
import { DEFAULT_FORM } from '../constants';
import { STAGE_OPTIONS, STATUS_OPTIONS } from '../constants';
import type { LeadFormData } from '../types';
import { formatCpf, formatCurrencyInput, formatPhone, getPasteText, sanitizeText } from '../utils';

interface LeadFormProps {
  form: LeadFormData;
  editingId: string | null;
  saving: boolean;
  onChange: (next: LeadFormData) => void;
  onSubmit: () => void;
  onReset: () => void;
}

export function LeadForm({ form, editingId, saving, onChange, onSubmit, onReset }: LeadFormProps) {
  function updateField<K extends keyof LeadFormData>(field: K, value: LeadFormData[K]) {
    onChange({ ...form, [field]: value });
  }

  function handleTextChange(field: keyof LeadFormData, value: string) {
    updateField(field, value as never);
  }

  function handlePaste(field: keyof LeadFormData, formatter?: (value: string) => string) {
    return (event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      event.preventDefault();
      const pasted = getPasteText(event);
      const cleaned = sanitizeText(pasted);
      updateField(field, (formatter ? formatter(cleaned) : cleaned) as never);
    };
  }

  return (
    <section className="panel glass-card">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Cadastro</span>
          <h2>{editingId ? 'Editar lead' : 'Novo lead'}</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onReset}>
          {editingId ? 'Cancelar edição' : 'Limpar'}
        </button>
      </div>

      <div className="form-grid">
        <label>
          <span>Nome *</span>
          <input
            name="nome"
            autoComplete="name"
            placeholder="Nome completo"
            value={form.nome}
            onChange={(e) => handleTextChange('nome', e.target.value)}
            onPaste={handlePaste('nome')}
          />
        </label>

        <label>
          <span>Telefone</span>
          <input
            name="telefone"
            autoComplete="tel"
            placeholder="(99) 99999-9999"
            value={form.telefone}
            onChange={(e) => handleTextChange('telefone', formatPhone(e.target.value))}
            onPaste={handlePaste('telefone', formatPhone)}
            inputMode="tel"
          />
        </label>

        <label>
          <span>CPF</span>
          <input
            name="cpf"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => handleTextChange('cpf', formatCpf(e.target.value))}
            onPaste={handlePaste('cpf', formatCpf)}
            inputMode="numeric"
          />
        </label>

        <label>
          <span>E-mail</span>
          <input
            name="email"
            autoComplete="email"
            placeholder="cliente@email.com"
            value={form.email}
            onChange={(e) => handleTextChange('email', e.target.value)}
            onPaste={handlePaste('email')}
          />
        </label>

        <label>
          <span>Empresa</span>
          <input
            name="organization"
            autoComplete="organization"
            placeholder="Empresa atual"
            value={form.empresa}
            onChange={(e) => handleTextChange('empresa', e.target.value)}
            onPaste={handlePaste('empresa')}
          />
        </label>

        <label>
          <span>Origem</span>
          <input
            name="origem"
            autoComplete="off"
            placeholder="Instagram, WhatsApp, Base fria..."
            value={form.origem}
            onChange={(e) => handleTextChange('origem', e.target.value)}
            onPaste={handlePaste('origem')}
          />
        </label>

        <label>
          <span>Produto</span>
          <input
            name="produto"
            autoComplete="off"
            placeholder="CLT, FGTS, Assistência..."
            value={form.produto}
            onChange={(e) => handleTextChange('produto', e.target.value)}
            onPaste={handlePaste('produto')}
          />
        </label>

        <label>
          <span>Valor de interesse</span>
          <input
            name="valor_interesse"
            autoComplete="off"
            placeholder="R$ 0,00"
            value={form.valor_interesse}
            onChange={(e) => handleTextChange('valor_interesse', formatCurrencyInput(e.target.value))}
            onPaste={handlePaste('valor_interesse', formatCurrencyInput)}
            inputMode="numeric"
          />
        </label>

        <label>
          <span>Status</span>
          <select value={form.status} onChange={(e) => handleTextChange('status', e.target.value)}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Etapa</span>
          <select value={form.etapa} onChange={(e) => handleTextChange('etapa', e.target.value)}>
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>

        <label className="full-span">
          <span>Observações</span>
          <textarea
            name="observacoes"
            autoComplete="off"
            rows={5}
            placeholder="Pendências, objeções, próxima ação, contexto da negociação..."
            value={form.observacoes}
            onChange={(e) => handleTextChange('observacoes', e.target.value)}
            onPaste={handlePaste('observacoes')}
          />
        </label>
      </div>

      <div className="form-actions">
        <button className="primary-button" type="button" disabled={saving || !form.nome.trim()} onClick={onSubmit}>
          {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar lead'}
        </button>
        <button className="ghost-button" type="button" onClick={() => onChange(DEFAULT_FORM)}>
          Resetar formulário
        </button>
      </div>
    </section>
  );
}
