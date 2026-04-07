import type { ClipboardEvent } from 'react';
import Papa from 'papaparse';
import type { LeadFormData, LeadRecord } from './types';

export function sanitizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatCurrencyInput(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return '';
  const amount = Number(digits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function parseCurrencyInput(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function prepareLeadPayload(form: LeadFormData) {
  return {
    nome: sanitizeText(form.nome),
    telefone: form.telefone ? onlyDigits(form.telefone) : null,
    cpf: form.cpf ? onlyDigits(form.cpf) : null,
    email: form.email ? sanitizeText(form.email).toLowerCase() : null,
    empresa: form.empresa ? sanitizeText(form.empresa) : null,
    origem: form.origem ? sanitizeText(form.origem) : null,
    produto: form.produto ? sanitizeText(form.produto) : null,
    status: form.status,
    etapa: form.etapa,
    valor_interesse: parseCurrencyInput(form.valor_interesse),
    observacoes: form.observacoes ? form.observacoes.trim() : null,
  };
}

export function hydrateForm(record: LeadRecord): LeadFormData {
  return {
    nome: record.nome ?? '',
    telefone: record.telefone ? formatPhone(record.telefone) : '',
    cpf: record.cpf ? formatCpf(record.cpf) : '',
    email: record.email ?? '',
    empresa: record.empresa ?? '',
    origem: record.origem ?? '',
    produto: record.produto ?? '',
    status: record.status,
    etapa: record.etapa,
    valor_interesse:
      typeof record.valor_interesse === 'number'
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.valor_interesse)
        : '',
    observacoes: record.observacoes ?? '',
  };
}

export function exportLeadsToCsv(leads: LeadRecord[]): string {
  return Papa.unparse(
    leads.map((lead) => ({
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone ? formatPhone(lead.telefone) : '',
      cpf: lead.cpf ? formatCpf(lead.cpf) : '',
      email: lead.email ?? '',
      empresa: lead.empresa ?? '',
      origem: lead.origem ?? '',
      produto: lead.produto ?? '',
      status: lead.status,
      etapa: lead.etapa,
      valor_interesse: lead.valor_interesse ?? '',
      observacoes: lead.observacoes ?? '',
      criado_em: new Date(lead.created_at).toLocaleString('pt-BR'),
      atualizado_em: new Date(lead.updated_at).toLocaleString('pt-BR'),
    })),
    { delimiter: ';' },
  );
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function getPasteText(event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  return event.clipboardData.getData('text/plain');
}
