import { useEffect, useMemo, useState } from 'react';
import { STATUS_OPTIONS } from '../constants';
import { supabase } from '../supabase';
import type { LeadRecord } from '../types';

type LeadRecordWithOperationalFields = LeadRecord & {
  cpf?: string | null;
  rg?: string | null;
  document_uf?: string | null;
  mother_name?: string | null;
  email?: string | null;
  marital_status?: string | null;
  cep?: string | null;
  full_address?: string | null;
  city_state?: string | null;
  bank_name?: string | null;
  bank_agency?: string | null;
  bank_account?: string | null;
  pix_key?: string | null;
  data_validation_preference?: string | null;
  signature_link?: string | null;
  signature_sent_at?: string | null;
  signature_confirmation_requested_at?: string | null;
  signature_confirmed_by_client_at?: string | null;
  signed_at?: string | null;

  clt_ready_for_presimulation?: boolean | null;
  clt_triage_completed_at?: string | null;
  last_client_interaction_at?: string | null;
  last_message_sent_at?: string | null;
  is_archived?: boolean | null;
  closed_at?: string | null;
  closure_reason?: string | null;
  closure_note?: string | null;
  followup_recommended?: boolean | null;
  followup_date?: string | null;
  followup_level?: string | null;
  selected_offer_id?: string | null;
  selected_offer_summary?: string | null;
  selected_offer_chosen_at?: string | null;
  active_offer_round?: number | null;
};

type LeadOfferStatus = 'draft' | 'sent' | 'chosen' | 'discarded';

type LeadOfferRecord = {
  id?: string;
  lead_id?: string;
  user_id?: string;
  offer_round?: number;
  offer_number: number;
  bank_name: string;
  released_amount: string;
  installment_amount: string;
  term_months: string;
  interest_rate: string;
  description: string;
  status?: LeadOfferStatus;
  sent_at?: string | null;
  chosen_at?: string | null;
};

type ContractDataForm = {
  nome: string;
  cpf: string;
  rg: string;
  document_uf: string;
  mother_name: string;
  email: string;
  marital_status: string;
  cep: string;
  full_address: string;
  city_state: string;
  bank_account: string;
  bank_agency: string;
  pix_key: string;
  bank_name: string;
};

interface FunnelViewProps {
  leads: LeadRecord[];
  onPreSimulateLead?: (leadId: string) => void;
}

const KANBAN_STAGES = [
  'Novo lead',
  'Em atendimento',
  'Vai analisar',
  'Em proposta',
  'Em digitação',
  'Assinado',
  'Pago',
  'Pós-venda',
];

const FUNNEL_AUTOMATION_ENDPOINT =
  'https://nodejs-production-15c2.up.railway.app/send-indication-message';

const SEND_LEAD_OFFERS_ENDPOINT =
  'https://nodejs-production-15c2.up.railway.app/send-lead-offers';

const SEND_SIGNATURE_LINK_ENDPOINT =
  'https://nodejs-production-15c2.up.railway.app/send-signature-link';

const TEMPLATE_BY_STAGE: Record<string, string> = {
  'Em proposta': 'proposta_clt',
  Assinado: 'contrato_aprovado',
  Pago: 'cliente_pago',
  'Pós-venda': 'pos_venda',
};

const CLOSURE_REASONS = [
  'Venda realizada',
  'Cliente recusou',
  'Sem margem / sem elegibilidade',
  'Não respondeu',
  'Número errado',
  'Sem interesse agora',
  'Vai pensar',
  'Proposta não agradou',
  'Não trabalha CLT / perfil incompatível',
  'Outro',
];

function createEmptyOffer(offerNumber: number): LeadOfferRecord {
  return {
    offer_number: offerNumber,
    bank_name: '',
    released_amount: '',
    installment_amount: '',
    term_months: '',
    interest_rate: '',
    description: '',
    status: 'draft',
  };
}

function createEmptyOffers() {
  return [1, 2, 3, 4, 5].map(createEmptyOffer);
}

function createEmptyContractDataForm(): ContractDataForm {
  return {
    nome: '',
    cpf: '',
    rg: '',
    document_uf: '',
    mother_name: '',
    email: '',
    marital_status: '',
    cep: '',
    full_address: '',
    city_state: '',
    bank_account: '',
    bank_agency: '',
    pix_key: '',
    bank_name: '',
  };
}

function createContractDataFormFromLead(lead: LeadRecord | null): ContractDataForm {
  if (!lead) return createEmptyContractDataForm();

  const extendedLead = lead as LeadRecordWithOperationalFields;

  return {
    nome: lead.nome || '',
    cpf: extendedLead.cpf || '',
    rg: extendedLead.rg || '',
    document_uf: extendedLead.document_uf || '',
    mother_name: extendedLead.mother_name || '',
    email: extendedLead.email || '',
    marital_status: extendedLead.marital_status || '',
    cep: extendedLead.cep || '',
    full_address: extendedLead.full_address || '',
    city_state: extendedLead.city_state || '',
    bank_account: extendedLead.bank_account || '',
    bank_agency: extendedLead.bank_agency || '',
    pix_key: extendedLead.pix_key || '',
    bank_name: extendedLead.bank_name || '',
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatMoneyOptional(value?: number | string | null) {
  const numeric = Number(value || 0);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'R$ 0,00';
  }

  return formatMoney(numeric);
}

function normalizeStage(lead: LeadRecord) {
  if (!lead.etapa || !KANBAN_STAGES.includes(lead.etapa)) {
    return 'Novo lead';
  }

  return lead.etapa;
}

function statusFromStage(stage: string) {
  if (stage === 'Assinado' || stage === 'Pago' || stage === 'Pós-venda') return 'Fechado';
  if (stage === 'Perdido') return 'Perdido';
  return stage;
}

function normalizePhone(phone?: string | null) {
  return String(phone || '').replace(/\D/g, '');
}

function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    start,
    end,
  };
}

function isDateInCurrentMonth(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const { start, end } = getCurrentMonthRange();

  return date >= start && date < end;
}

function getLeadOperationalDate(lead: LeadRecordWithOperationalFields) {
  return (
    lead.last_client_interaction_at ||
    lead.clt_triage_completed_at ||
    lead.closed_at ||
    lead.updated_at ||
    lead.last_message_sent_at ||
    lead.created_at
  );
}

function isLeadInCurrentMonth(lead: LeadRecordWithOperationalFields) {
  return isDateInCurrentMonth(getLeadOperationalDate(lead));
}

function isArchivedLead(lead: LeadRecord) {
  const extendedLead = lead as LeadRecordWithOperationalFields;
  return extendedLead.is_archived === true;
}

function canPreSimulateLead(lead: LeadRecord) {
  const extendedLead = lead as LeadRecordWithOperationalFields;
  const stage = normalizeStage(lead);

  return extendedLead.clt_ready_for_presimulation === true && stage === 'Em proposta';
}

function canManageOffers(lead: LeadRecord) {
  const stage = normalizeStage(lead);
  return stage === 'Em proposta';
}

function canManageDigitation(lead: LeadRecord) {
  const stage = normalizeStage(lead);
  return stage === 'Em digitação';
}

function getSelectedOfferSummary(lead: LeadRecord) {
  const extendedLead = lead as LeadRecordWithOperationalFields;
  return extendedLead.selected_offer_summary || null;
}

function getSignatureLink(lead: LeadRecord) {
  const extendedLead = lead as LeadRecordWithOperationalFields;
  return extendedLead.signature_link || null;
}

function getActiveOfferRound(lead: LeadRecord | null) {
  if (!lead) return 1;

  const extendedLead = lead as LeadRecordWithOperationalFields;
  const round = Number(extendedLead.active_offer_round || 1);

  if (!Number.isFinite(round) || round <= 0) return 1;

  return round;
}

function parseBrazilianDecimal(value: string) {
  const trimmed = String(value || '').trim();

  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const numeric = Number(normalized);

  if (!Number.isFinite(numeric)) return null;

  return numeric;
}

function parseInteger(value: string) {
  const numeric = Number(String(value || '').replace(/\D/g, ''));

  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  return numeric;
}

function getPreSimulationButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    border: 0,
    borderRadius: 10,
    padding: '9px 10px',
    background: disabled ? '#f1f5f9' : 'linear-gradient(180deg, #6ee7f9, #4cc9f0)',
    color: disabled ? '#94a3b8' : '#071018',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 800,
    marginTop: 8,
  };
}

function getOfferButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    border: '1px solid #bfdbfe',
    borderRadius: 10,
    padding: '9px 10px',
    background: disabled ? '#f1f5f9' : '#eff6ff',
    color: disabled ? '#94a3b8' : '#1d4ed8',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 900,
    marginTop: 8,
  };
}

function getDigitationButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    border: '1px solid #fed7aa',
    borderRadius: 10,
    padding: '9px 10px',
    background: disabled ? '#f1f5f9' : '#fff7ed',
    color: disabled ? '#94a3b8' : '#c2410c',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 900,
    marginTop: 8,
  };
}

function getSignatureButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '9px 10px',
    background: disabled ? '#f1f5f9' : '#f0fdf4',
    color: disabled ? '#94a3b8' : '#166534',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 900,
    marginTop: 8,
  };
}

function getClosureFollowupConfig(reason: string) {
  const today = new Date();

  function addDays(days: number) {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  if (reason === 'Venda realizada') {
    return {
      followup_recommended: false,
      followup_level: 'sem_followup',
      followup_date: null,
    };
  }

  if (reason === 'Vai pensar') {
    return {
      followup_recommended: true,
      followup_level: 'quente',
      followup_date: addDays(2),
    };
  }

  if (reason === 'Cliente recusou' || reason === 'Proposta não agradou') {
    return {
      followup_recommended: true,
      followup_level: 'morno',
      followup_date: addDays(10),
    };
  }

  if (reason === 'Não respondeu' || reason === 'Sem interesse agora') {
    return {
      followup_recommended: true,
      followup_level: 'frio',
      followup_date: addDays(30),
    };
  }

  if (
    reason === 'Número errado' ||
    reason === 'Não trabalha CLT / perfil incompatível'
  ) {
    return {
      followup_recommended: false,
      followup_level: 'invalido',
      followup_date: null,
    };
  }

  if (reason === 'Sem margem / sem elegibilidade') {
    return {
      followup_recommended: true,
      followup_level: 'frio',
      followup_date: addDays(45),
    };
  }

  return {
    followup_recommended: false,
    followup_level: 'manual',
    followup_date: null,
  };
}

function getCurrentMonthLabel() {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function buildContractDataText(form: ContractDataForm) {
  return [
    'DADOS PARA DIGITAÇÃO',
    '',
    `Nome completo: ${form.nome || '-'}`,
    `CPF: ${form.cpf || '-'}`,
    `RG: ${form.rg || '-'}`,
    `UF de emissão do documento: ${form.document_uf || '-'}`,
    `Nome da mãe: ${form.mother_name || '-'}`,
    `Email: ${form.email || '-'}`,
    `Estado civil: ${form.marital_status || '-'}`,
    `CEP: ${form.cep || '-'}`,
    `Endereço completo: ${form.full_address || '-'}`,
    `Cidade e Estado: ${form.city_state || '-'}`,
    `Conta com dígito: ${form.bank_account || '-'}`,
    `Agência com dígito: ${form.bank_agency || '-'}`,
    `PIX: ${form.pix_key || '-'}`,
    `Banco: ${form.bank_name || '-'}`,
  ].join('\n');
}

export function FunnelView({ leads, onPreSimulateLead }: FunnelViewProps) {
  const [localLeads, setLocalLeads] = useState<LeadRecord[]>(leads);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [closingLead, setClosingLead] = useState<LeadRecord | null>(null);
  const [closureReason, setClosureReason] = useState('');
  const [closureNote, setClosureNote] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);

  const [offerLead, setOfferLead] = useState<LeadRecord | null>(null);
  const [offerForms, setOfferForms] = useState<LeadOfferRecord[]>(createEmptyOffers);
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerSending, setOfferSending] = useState(false);
  const [changingOffers, setChangingOffers] = useState(false);

  const [contractDataLead, setContractDataLead] = useState<LeadRecord | null>(null);
  const [contractDataForm, setContractDataForm] = useState<ContractDataForm>(
    createEmptyContractDataForm,
  );
  const [contractDataSaving, setContractDataSaving] = useState(false);
  const [contractDataCopying, setContractDataCopying] = useState(false);

  const [signatureLead, setSignatureLead] = useState<LeadRecord | null>(null);
  const [signatureLink, setSignatureLink] = useState('');
  const [signatureSending, setSignatureSending] = useState(false);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const stages = useMemo(() => KANBAN_STAGES, []);

  const currentMonthLeads = useMemo(() => {
    return localLeads.filter((lead) => isLeadInCurrentMonth(lead as LeadRecordWithOperationalFields));
  }, [localLeads]);

  const activeCurrentMonthLeads = useMemo(() => {
    return currentMonthLeads.filter((lead) => !isArchivedLead(lead));
  }, [currentMonthLeads]);

  const archivedCurrentMonthLeads = useMemo(() => {
    return currentMonthLeads.filter((lead) => isArchivedLead(lead));
  }, [currentMonthLeads]);

  const total = currentMonthLeads.length;

  const byStatus = STATUS_OPTIONS.map((status) => ({
    label: status,
    count: currentMonthLeads.filter((lead) => lead.status === status).length,
  }));

  const closedValue = currentMonthLeads
    .filter(
      (lead) =>
        lead.status === 'Fechado' ||
        lead.etapa === 'Assinado' ||
        lead.etapa === 'Pago' ||
        lead.etapa === 'Pós-venda',
    )
    .reduce((sum, lead) => sum + (lead.valor_interesse ?? 0), 0);

  const signedCount = currentMonthLeads.filter(
    (lead) =>
      lead.status === 'Fechado' ||
      lead.etapa === 'Assinado' ||
      lead.etapa === 'Pago' ||
      lead.etapa === 'Pós-venda',
  ).length;

  const conversionRate = total > 0 ? Math.round((signedCount / total) * 100) : 0;

  const stageMetrics = stages.map((stage, index) => {
    const count = currentMonthLeads.filter((lead) => normalizeStage(lead) === stage).length;
    const previousCount =
      index === 0
        ? total
        : currentMonthLeads.filter((lead) => normalizeStage(lead) === stages[index - 1]).length;

    const conversion = previousCount > 0 ? Math.round((count / previousCount) * 100) : 0;

    return {
      label: stage,
      count,
      conversion,
    };
  });

  function handlePreSimulate(lead: LeadRecord) {
    if (!canPreSimulateLead(lead)) {
      setFeedback('Este lead ainda não está pronto para pré-simulação automática nesta etapa.');
      return;
    }

    if (!onPreSimulateLead) {
      setFeedback('A integração com a aba Pré-simulador ainda não foi conectada no App.');
      return;
    }

    setSelectedLead(null);
    onPreSimulateLead(lead.id);
  }

  async function openOffersModal(lead: LeadRecord) {
    setOfferLead(lead);
    setOfferForms(createEmptyOffers());
    setFeedback(null);
    setOfferLoading(true);

    const activeRound = getActiveOfferRound(lead);

    const { data, error } = await supabase
      .from('lead_offers')
      .select('*')
      .eq('lead_id', lead.id)
      .eq('offer_round', activeRound)
      .order('offer_number', { ascending: true });

    if (error) {
      setFeedback(`Erro ao carregar ofertas: ${error.message}`);
      setOfferLoading(false);
      return;
    }

    const nextOffers = createEmptyOffers();

    (data || []).forEach((offer: any) => {
      const index = Number(offer.offer_number) - 1;

      if (index >= 0 && index < nextOffers.length) {
        nextOffers[index] = {
          id: offer.id,
          lead_id: offer.lead_id,
          user_id: offer.user_id,
          offer_round: Number(offer.offer_round || activeRound),
          offer_number: Number(offer.offer_number),
          bank_name: offer.bank_name || '',
          released_amount:
            offer.released_amount !== null && offer.released_amount !== undefined
              ? String(offer.released_amount).replace('.', ',')
              : '',
          installment_amount:
            offer.installment_amount !== null && offer.installment_amount !== undefined
              ? String(offer.installment_amount).replace('.', ',')
              : '',
          term_months:
            offer.term_months !== null && offer.term_months !== undefined
              ? String(offer.term_months)
              : '',
          interest_rate:
            offer.interest_rate !== null && offer.interest_rate !== undefined
              ? String(offer.interest_rate).replace('.', ',')
              : '',
          description: offer.description || '',
          status: offer.status || 'draft',
          sent_at: offer.sent_at || null,
          chosen_at: offer.chosen_at || null,
        };
      }
    });

    setOfferForms(nextOffers);
    setOfferLoading(false);
  }

  function closeOffersModal() {
    setOfferLead(null);
    setOfferForms(createEmptyOffers());
    setOfferLoading(false);
    setOfferSaving(false);
    setOfferSending(false);
    setChangingOffers(false);
  }

  function updateOfferField(
    offerIndex: number,
    field: keyof LeadOfferRecord,
    value: string,
  ) {
    setOfferForms((current) =>
      current.map((offer, index) =>
        index === offerIndex
          ? {
              ...offer,
              [field]: value,
            }
          : offer,
      ),
    );
  }

  function getValidOffersForSave() {
    return offerForms.filter((offer) => offer.bank_name.trim().length > 0);
  }

  async function startNewOfferRound() {
    if (!offerLead) return;

    const currentRound = getActiveOfferRound(offerLead);
    const nextRound = currentRound + 1;

    setChangingOffers(true);
    setFeedback(null);

    await supabase
      .from('lead_offers')
      .update({
        status: 'discarded',
      })
      .eq('lead_id', offerLead.id)
      .eq('offer_round', currentRound)
      .in('status', ['draft', 'sent']);

    const patch = {
      active_offer_round: nextRound,
      selected_offer_id: null,
      selected_offer_summary: null,
      selected_offer_chosen_at: null,
      etapa: 'Em proposta',
      status: 'Em proposta',
      is_archived: false,
    };

    const { error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', offerLead.id);

    if (error) {
      setFeedback(`Erro ao iniciar nova rodada de ofertas: ${error.message}`);
      setChangingOffers(false);
      return;
    }

    const updatedLead = {
      ...offerLead,
      ...patch,
    } as LeadRecord;

    setOfferLead(updatedLead);
    setOfferForms(createEmptyOffers());

    setLocalLeads((current) =>
      current.map((lead) =>
        lead.id === offerLead.id
          ? ({
              ...lead,
              ...patch,
            } as LeadRecord)
          : lead,
      ),
    );

    if (selectedLead?.id === offerLead.id) {
      setSelectedLead({
        ...selectedLead,
        ...patch,
      } as LeadRecord);
    }

    setFeedback(`Nova rodada de ofertas iniciada. Rodada atual: ${nextRound}.`);
    setChangingOffers(false);
  }

  async function saveOffers() {
    if (!offerLead) return false;

    const validOffers = getValidOffersForSave();

    if (validOffers.length === 0) {
      setFeedback('Cadastre pelo menos uma oferta com o nome do banco.');
      return false;
    }

    const activeRound = getActiveOfferRound(offerLead);

    setOfferSaving(true);
    setFeedback(null);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      setFeedback('Usuário autenticado não encontrado. Faça login novamente.');
      setOfferSaving(false);
      return false;
    }

    const { error: deleteError } = await supabase
      .from('lead_offers')
      .delete()
      .eq('lead_id', offerLead.id)
      .eq('offer_round', activeRound)
      .in('status', ['draft', 'sent', 'discarded']);

    if (deleteError) {
      setFeedback(`Erro ao limpar ofertas anteriores da rodada atual: ${deleteError.message}`);
      setOfferSaving(false);
      return false;
    }

    const payload = validOffers.map((offer, index) => ({
      lead_id: offerLead.id,
      user_id: userId,
      offer_round: activeRound,
      offer_number: index + 1,
      bank_name: offer.bank_name.trim(),
      released_amount: parseBrazilianDecimal(offer.released_amount),
      installment_amount: parseBrazilianDecimal(offer.installment_amount),
      term_months: parseInteger(offer.term_months),
      interest_rate: parseBrazilianDecimal(offer.interest_rate),
      description: offer.description.trim() || null,
      status: 'draft',
    }));

    const { error: insertError } = await supabase
      .from('lead_offers')
      .insert(payload);

    if (insertError) {
      setFeedback(`Erro ao salvar ofertas: ${insertError.message}`);
      setOfferSaving(false);
      return false;
    }

    setFeedback(
      `${payload.length} oferta${payload.length === 1 ? '' : 's'} salva${
        payload.length === 1 ? '' : 's'
      } com sucesso na rodada ${activeRound}.`,
    );

    setOfferSaving(false);

    await openOffersModal(offerLead);

    return true;
  }

  async function sendOffers() {
    if (!offerLead) return;

    setOfferSending(true);
    setFeedback(null);

    const saved = await saveOffers();

    if (!saved) {
      setOfferSending(false);
      return;
    }

    try {
      const response = await fetch(SEND_LEAD_OFFERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: offerLead.id,
        }),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok || responseData?.success === false) {
        const message = responseData?.error || `Falha no envio das propostas. HTTP ${response.status}`;
        setFeedback(message);
        setOfferSending(false);
        return;
      }

      setFeedback(
        `Propostas enviadas com sucesso para o WhatsApp. Rodada ${
          responseData?.offerRound || getActiveOfferRound(offerLead)
        }. Total enviado: ${responseData?.sent || getValidOffersForSave().length}.`,
      );

      setLocalLeads((current) =>
        current.map((lead) =>
          lead.id === offerLead.id
            ? {
                ...lead,
                status: 'Em proposta',
              }
            : lead,
        ),
      );

      closeOffersModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao enviar propostas.';
      setFeedback(`Erro ao enviar propostas: ${message}`);
      setOfferSending(false);
    }
  }

  function openContractDataModal(lead: LeadRecord) {
    setContractDataLead(lead);
    setContractDataForm(createContractDataFormFromLead(lead));
    setContractDataSaving(false);
    setContractDataCopying(false);
    setFeedback(null);
  }

  function closeContractDataModal() {
    setContractDataLead(null);
    setContractDataForm(createEmptyContractDataForm());
    setContractDataSaving(false);
    setContractDataCopying(false);
  }

  function updateContractDataField(field: keyof ContractDataForm, value: string) {
    setContractDataForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveContractData() {
    if (!contractDataLead) return false;

    setContractDataSaving(true);
    setFeedback(null);

    const patch = {
      nome: contractDataForm.nome.trim() || null,
      cpf: contractDataForm.cpf.trim() || null,
      rg: contractDataForm.rg.trim() || null,
      document_uf: contractDataForm.document_uf.trim().toUpperCase() || null,
      mother_name: contractDataForm.mother_name.trim() || null,
      email: contractDataForm.email.trim() || null,
      marital_status: contractDataForm.marital_status.trim() || null,
      cep: contractDataForm.cep.trim() || null,
      full_address: contractDataForm.full_address.trim() || null,
      city_state: contractDataForm.city_state.trim() || null,
      bank_account: contractDataForm.bank_account.trim() || null,
      bank_agency: contractDataForm.bank_agency.trim() || null,
      pix_key: contractDataForm.pix_key.trim() || null,
      bank_name: contractDataForm.bank_name.trim() || null,
      etapa: 'Em digitação',
      status: 'Dados validados para digitação',
      is_archived: false,
    };

    const { error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', contractDataLead.id);

    if (error) {
      setFeedback(`Erro ao salvar dados de digitação: ${error.message}`);
      setContractDataSaving(false);
      return false;
    }

    setLocalLeads((current) =>
      current.map((lead) =>
        lead.id === contractDataLead.id
          ? ({
              ...lead,
              ...patch,
            } as LeadRecord)
          : lead,
      ),
    );

    if (selectedLead?.id === contractDataLead.id) {
      setSelectedLead({
        ...selectedLead,
        ...patch,
      } as LeadRecord);
    }

    setContractDataLead({
      ...contractDataLead,
      ...patch,
    } as LeadRecord);

    setFeedback('Dados para digitação salvos com sucesso.');
    setContractDataSaving(false);
    return true;
  }

  async function copyContractData() {
    setContractDataCopying(true);

    const saved = await saveContractData();

    if (!saved) {
      setContractDataCopying(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(buildContractDataText(contractDataForm));
      setFeedback('Dados copiados para a área de transferência.');
    } catch {
      setFeedback('Dados salvos, mas não foi possível copiar automaticamente. Copie manualmente pelo modal.');
    }

    setContractDataCopying(false);
  }

  function openSignatureModal(lead: LeadRecord) {
    setSignatureLead(lead);
    setSignatureLink(getSignatureLink(lead) || '');
    setSignatureSending(false);
    setFeedback(null);
  }

  function closeSignatureModal() {
    setSignatureLead(null);
    setSignatureLink('');
    setSignatureSending(false);
  }

  async function sendSignatureLink() {
    if (!signatureLead) return;

    const cleanLink = signatureLink.trim();

    if (!cleanLink || !/^https?:\/\//i.test(cleanLink)) {
      setFeedback('Informe um link válido começando com http ou https.');
      return;
    }

    setSignatureSending(true);
    setFeedback(null);

    try {
      const response = await fetch(SEND_SIGNATURE_LINK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: signatureLead.id,
          signatureLink: cleanLink,
        }),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok || responseData?.success === false) {
        const message =
          responseData?.error || `Falha no envio do link de assinatura. HTTP ${response.status}`;
        setFeedback(message);
        setSignatureSending(false);
        return;
      }

      const patch = {
        signature_link: cleanLink,
        signature_sent_at: responseData?.signatureSentAt || new Date().toISOString(),
        etapa: 'Em digitação',
        status: 'Link de assinatura enviado',
        is_archived: false,
      };

      setLocalLeads((current) =>
        current.map((lead) =>
          lead.id === signatureLead.id
            ? ({
                ...lead,
                ...patch,
              } as LeadRecord)
            : lead,
        ),
      );

      if (selectedLead?.id === signatureLead.id) {
        setSelectedLead({
          ...selectedLead,
          ...patch,
        } as LeadRecord);
      }

      setFeedback('Link de assinatura enviado ao cliente. A confirmação será enviada automaticamente no WhatsApp.');
      setSignatureSending(false);
      closeSignatureModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido ao enviar link de assinatura.';
      setFeedback(`Erro ao enviar link de assinatura: ${message}`);
      setSignatureSending(false);
    }
  }

  function openClosureModal(lead: LeadRecord) {
    setClosingLead(lead);
    setClosureReason('');
    setClosureNote('');
    setFeedback(null);
  }

  function closeClosureModal() {
    setClosingLead(null);
    setClosureReason('');
    setClosureNote('');
    setClosingId(null);
  }

  async function finalizeLead() {
    if (!closingLead) return;

    if (!closureReason) {
      setFeedback('Selecione o motivo do encerramento.');
      return;
    }

    setClosingId(closingLead.id);
    setFeedback(null);

    const followupConfig = getClosureFollowupConfig(closureReason);
    const closedAt = new Date().toISOString();

    const patch = {
      is_archived: true,
      closed_at: closedAt,
      closure_reason: closureReason,
      closure_note: closureNote.trim() || null,
      followup_recommended: followupConfig.followup_recommended,
      followup_level: followupConfig.followup_level,
      followup_date: followupConfig.followup_date,
    };

    const { error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', closingLead.id);

    if (error) {
      setFeedback(error.message);
      setClosingId(null);
      return;
    }

    setLocalLeads((current) =>
      current.map((item) =>
        item.id === closingLead.id
          ? {
              ...item,
              ...patch,
            } as LeadRecord
          : item,
      ),
    );

    if (selectedLead?.id === closingLead.id) {
      setSelectedLead(null);
    }

    const followupText = followupConfig.followup_recommended
      ? ` Follow-up sugerido: ${followupConfig.followup_level} em ${followupConfig.followup_date}.`
      : ' Sem follow-up automático recomendado.';

    setFeedback(`Atendimento finalizado e enviado para histórico.${followupText}`);
    closeClosureModal();
  }

  async function moveLead(lead: LeadRecord, nextStage: string) {
    setUpdatingId(lead.id);
    setFeedback(null);

    const previousStage = normalizeStage(lead);
    const nextStatus = statusFromStage(nextStage);
    const templateKey = TEMPLATE_BY_STAGE[nextStage];
    const phone = normalizePhone(lead.telefone);

    const { error } = await supabase
      .from('leads')
      .update({
        etapa: nextStage,
        status: nextStatus,
      })
      .eq('id', lead.id);

    if (error) {
      setFeedback(error.message);
      setUpdatingId(null);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    let logId: string | null = null;

    if (userId) {
      const { data: logData, error: logError } = await supabase
        .from('funnel_automation_logs')
        .insert({
          user_id: userId,
          lead_id: lead.id,
          from_stage: previousStage,
          to_stage: nextStage,
          phone,
          lead_name: lead.nome,
          message_text: null,
          status: templateKey ? 'pending' : 'no_template',
          error_message: templateKey ? null : 'Nenhum template configurado para esta etapa.',
        })
        .select('id')
        .single();

      if (!logError && logData?.id) {
        logId = logData.id;
      }
    }

    if (templateKey && phone) {
      try {
        const response = await fetch(FUNNEL_AUTOMATION_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leadId: lead.id,
            phone,
            templateKey,
            nome: lead.nome,
            empresa: lead.empresa,
          }),
        });

        const responseData = await response.json().catch(() => null);

        if (!response.ok || responseData?.success === false) {
          const errorMessage =
            responseData?.error || `Falha no envio. HTTP ${response.status}`;

          if (logId) {
            await supabase
              .from('funnel_automation_logs')
              .update({
                status: 'error',
                error_message: errorMessage,
              })
              .eq('id', logId);
          }

          setFeedback(`Lead movido para "${nextStage}", mas o WhatsApp não disparou: ${errorMessage}`);
        } else {
          if (logId) {
            await supabase
              .from('funnel_automation_logs')
              .update({
                status: 'sent',
                error_message: null,
              })
              .eq('id', logId);
          }

          setFeedback(`Lead movido para "${nextStage}" e WhatsApp disparado.`);
        }
      } catch (sendError) {
        const errorMessage =
          sendError instanceof Error ? sendError.message : 'Erro desconhecido no envio.';

        if (logId) {
          await supabase
            .from('funnel_automation_logs')
            .update({
              status: 'error',
              error_message: errorMessage,
            })
            .eq('id', logId);
        }

        setFeedback(`Lead movido para "${nextStage}", mas o WhatsApp não disparou: ${errorMessage}`);
      }
    } else if (templateKey && !phone) {
      if (logId) {
        await supabase
          .from('funnel_automation_logs')
          .update({
            status: 'error',
            error_message: 'Lead sem telefone válido.',
          })
          .eq('id', logId);
      }

      setFeedback(`Lead movido para "${nextStage}", mas não disparou: telefone inválido.`);
    } else {
      setFeedback(`Lead movido para "${nextStage}".`);
    }

    setLocalLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              etapa: nextStage,
              status: nextStatus,
            }
          : item,
      ),
    );

    if (selectedLead?.id === lead.id) {
      setSelectedLead({
        ...lead,
        etapa: nextStage,
        status: nextStatus,
      });
    }

    setUpdatingId(null);
  }

  function getPreviousStage(currentStage: string) {
    const index = stages.indexOf(currentStage);
    if (index <= 0) return null;
    return stages[index - 1];
  }

  function getNextStage(currentStage: string) {
    const index = stages.indexOf(currentStage);
    if (index < 0 || index >= stages.length - 1) return null;
    return stages[index + 1];
  }

  function renderLeadActionButtons(lead: LeadRecord) {
    const canPreSimulate = canPreSimulateLead(lead);
    const canOpenOffers = canManageOffers(lead);
    const canOpenDigitation = canManageDigitation(lead);

    return (
      <>
        {canPreSimulate ? (
          <button
            type="button"
            disabled={updatingId === lead.id}
            onClick={() => handlePreSimulate(lead)}
            style={getPreSimulationButtonStyle(updatingId === lead.id)}
          >
            Pré-simular
          </button>
        ) : null}

        {canOpenOffers ? (
          <button
            type="button"
            disabled={updatingId === lead.id}
            onClick={() => void openOffersModal(lead)}
            style={getOfferButtonStyle(updatingId === lead.id)}
          >
            Ofertas
          </button>
        ) : null}

        {canOpenDigitation ? (
          <>
            <button
              type="button"
              disabled={updatingId === lead.id}
              onClick={() => openContractDataModal(lead)}
              style={getDigitationButtonStyle(updatingId === lead.id)}
            >
              Dados para digitação
            </button>

            <button
              type="button"
              disabled={updatingId === lead.id}
              onClick={() => openSignatureModal(lead)}
              style={getSignatureButtonStyle(updatingId === lead.id)}
            >
              Enviar link de assinatura
            </button>
          </>
        ) : null}
      </>
    );
  }

  return (
    <section className="panel glass-card">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Funil</span>
          <h2>Kanban operacional</h2>
          <p style={{ marginTop: 6, color: '#64748b', maxWidth: 760 }}>
            Visão operacional do mês atual: {getCurrentMonthLabel()}. Leads finalizados saem do Kanban,
            mas permanecem no histórico e nas métricas.
          </p>
        </div>
      </div>

      {feedback ? <div className="feedback-banner glass-card">{feedback}</div> : null}

      <div className="stats-grid">
        <article className="stat-card">
          <span>Total de leads no mês</span>
          <strong>{total}</strong>
        </article>

        <article className="stat-card">
          <span>Conversão do mês</span>
          <strong>{conversionRate}%</strong>
        </article>

        <article className="stat-card">
          <span>Fechados no mês</span>
          <strong>{signedCount}</strong>
        </article>

        <article className="stat-card">
          <span>Volume fechado no mês</span>
          <strong>{formatMoney(closedValue)}</strong>
        </article>
      </div>

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <article className="stat-card">
          <span>Ativos no Kanban</span>
          <strong>{activeCurrentMonthLeads.length}</strong>
        </article>

        <article className="stat-card">
          <span>Finalizados no mês</span>
          <strong>{archivedCurrentMonthLeads.length}</strong>
        </article>

        <article className="stat-card">
          <span>Follow-ups futuros</span>
          <strong>
            {
              archivedCurrentMonthLeads.filter((lead) => {
                const extendedLead = lead as LeadRecordWithOperationalFields;
                return extendedLead.followup_recommended === true;
              }).length
            }
          </strong>
        </article>

        <article className="stat-card">
          <span>Mês operacional</span>
          <strong style={{ fontSize: '1rem' }}>{getCurrentMonthLabel()}</strong>
        </article>
      </div>

      <div className="funnel-columns" style={{ marginTop: 18 }}>
        <div className="funnel-block">
          <h3>Métricas por etapa</h3>

          {stageMetrics.map((item) => (
            <div key={item.label} className="metric-row">
              <span>{item.label}</span>
              <strong>
                {item.count} lead{item.count === 1 ? '' : 's'} · {item.conversion}%
              </strong>
            </div>
          ))}
        </div>

        <div className="funnel-block">
          <h3>Por status</h3>

          {byStatus.map((item) => (
            <div key={item.label} className="metric-row">
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))`,
          gap: 14,
          overflowX: 'auto',
          paddingBottom: 8,
          marginTop: 22,
        }}
      >
        {stages.map((stage) => {
          const stageLeads = activeCurrentMonthLeads.filter((lead) => normalizeStage(lead) === stage);

          return (
            <div
              key={stage}
              style={{
                minWidth: 220,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 18,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>{stage}</h3>
                <strong
                  style={{
                    minWidth: 30,
                    height: 30,
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: 13,
                  }}
                >
                  {stageLeads.length}
                </strong>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {stageLeads.length === 0 ? (
                  <div
                    style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: 14,
                      padding: 14,
                      color: '#94a3b8',
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                  >
                    Sem leads nesta etapa
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const currentStage = normalizeStage(lead);
                    const previousStage = getPreviousStage(currentStage);
                    const nextStage = getNextStage(currentStage);
                    const canPreSimulate = canPreSimulateLead(lead);
                    const selectedOfferSummary = getSelectedOfferSummary(lead);
                    const signatureLink = getSignatureLink(lead);

                    return (
                      <article
                        key={lead.id}
                        style={{
                          background: '#fff',
                          border: canPreSimulate ? '1px solid #67e8f9' : '1px solid #e2e8f0',
                          borderRadius: 16,
                          padding: 12,
                          boxShadow: canPreSimulate
                            ? '0 12px 28px rgba(14, 165, 233, 0.14)'
                            : '0 10px 24px rgba(15, 23, 42, 0.06)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          style={{
                            width: '100%',
                            border: 0,
                            background: 'transparent',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <strong style={{ display: 'block', color: '#0f172a', fontSize: 14 }}>
                            {lead.nome || 'Lead sem nome'}
                          </strong>

                          <span style={{ display: 'block', color: '#64748b', fontSize: 12, marginTop: 4 }}>
                            {lead.telefone || 'Sem telefone'}
                          </span>

                          {lead.empresa ? (
                            <span style={{ display: 'block', color: '#334155', fontSize: 12, marginTop: 4 }}>
                              {lead.empresa}
                            </span>
                          ) : null}

                          {lead.valor_interesse ? (
                            <span style={{ display: 'block', color: '#0f172a', fontSize: 12, marginTop: 8 }}>
                              Interesse: {formatMoney(lead.valor_interesse)}
                            </span>
                          ) : null}

                          {canPreSimulate ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                marginTop: 8,
                                borderRadius: 999,
                                padding: '5px 8px',
                                background: '#ecfeff',
                                border: '1px solid #67e8f9',
                                color: '#0e7490',
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              Pronto para pré-simular
                            </span>
                          ) : null}

                          {selectedOfferSummary ? (
                            <span
                              style={{
                                display: 'block',
                                marginTop: 8,
                                borderRadius: 12,
                                padding: 9,
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#166534',
                                fontSize: 11,
                                fontWeight: 800,
                                lineHeight: 1.45,
                              }}
                            >
                              Oferta escolhida: {selectedOfferSummary}
                            </span>
                          ) : null}

                          {signatureLink ? (
                            <span
                              style={{
                                display: 'block',
                                marginTop: 8,
                                borderRadius: 12,
                                padding: 9,
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                color: '#c2410c',
                                fontSize: 11,
                                fontWeight: 800,
                                lineHeight: 1.45,
                              }}
                            >
                              Link de assinatura enviado
                            </span>
                          ) : null}
                        </button>

                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button
                            type="button"
                            disabled={!previousStage || updatingId === lead.id}
                            onClick={() => previousStage && void moveLead(lead, previousStage)}
                            style={{
                              flex: 1,
                              border: '1px solid #cbd5e1',
                              borderRadius: 10,
                              padding: '8px 10px',
                              background: previousStage ? '#fff' : '#f1f5f9',
                              color: previousStage ? '#0f172a' : '#94a3b8',
                              cursor: previousStage ? 'pointer' : 'not-allowed',
                              fontSize: 12,
                            }}
                          >
                            Voltar
                          </button>

                          <button
                            type="button"
                            disabled={!nextStage || updatingId === lead.id}
                            onClick={() => nextStage && void moveLead(lead, nextStage)}
                            style={{
                              flex: 1,
                              border: 0,
                              borderRadius: 10,
                              padding: '8px 10px',
                              background: nextStage ? '#0f172a' : '#f1f5f9',
                              color: nextStage ? '#fff' : '#94a3b8',
                              cursor: nextStage ? 'pointer' : 'not-allowed',
                              fontSize: 12,
                            }}
                          >
                            Avançar
                          </button>
                        </div>

                        {renderLeadActionButtons(lead)}

                        <button
                          type="button"
                          disabled={updatingId === lead.id || closingId === lead.id}
                          onClick={() => openClosureModal(lead)}
                          style={{
                            width: '100%',
                            border: '1px solid #fecdd3',
                            borderRadius: 10,
                            padding: '9px 10px',
                            background: '#fff1f2',
                            color: '#be123c',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 800,
                            marginTop: 8,
                          }}
                        >
                          Finalizar
                        </button>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedLead ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            padding: 20,
          }}
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 560,
              background: '#fff',
              borderRadius: 22,
              padding: 22,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header" style={{ marginBottom: 16 }}>
              <div>
                <span className="eyebrow">Detalhes do lead</span>
                <h2>{selectedLead.nome || 'Lead sem nome'}</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                style={{
                  border: 0,
                  borderRadius: 999,
                  background: '#0f172a',
                  color: '#fff',
                  padding: '9px 14px',
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div className="metric-row">
                <span>Telefone</span>
                <strong>{selectedLead.telefone || '-'}</strong>
              </div>

              <div className="metric-row">
                <span>Empresa</span>
                <strong>{selectedLead.empresa || '-'}</strong>
              </div>

              <div className="metric-row">
                <span>Status</span>
                <strong>{selectedLead.status || '-'}</strong>
              </div>

              <div className="metric-row">
                <span>Etapa</span>
                <strong>{normalizeStage(selectedLead)}</strong>
              </div>

              <div className="metric-row">
                <span>Produto</span>
                <strong>{selectedLead.produto || '-'}</strong>
              </div>

              <div className="metric-row">
                <span>Origem</span>
                <strong>{selectedLead.origem || '-'}</strong>
              </div>

              <div className="metric-row">
                <span>Valor de interesse</span>
                <strong>{formatMoney(selectedLead.valor_interesse ?? 0)}</strong>
              </div>

              {canPreSimulateLead(selectedLead) ? (
                <div className="metric-row">
                  <span>Pré-simulação</span>
                  <strong>Pronto</strong>
                </div>
              ) : null}

              {getSelectedOfferSummary(selectedLead) ? (
                <div className="metric-row">
                  <span>Oferta escolhida</span>
                  <strong>{getSelectedOfferSummary(selectedLead)}</strong>
                </div>
              ) : null}

              {getSignatureLink(selectedLead) ? (
                <div className="metric-row">
                  <span>Assinatura</span>
                  <strong>Link enviado</strong>
                </div>
              ) : null}
            </div>

            {selectedLead.observacoes ? (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 8 }}>Observações</h3>
                <p
                  style={{
                    margin: 0,
                    padding: 14,
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedLead.observacoes}
                </p>
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                disabled={!getPreviousStage(normalizeStage(selectedLead)) || updatingId === selectedLead.id}
                onClick={() => {
                  const previousStage = getPreviousStage(normalizeStage(selectedLead));
                  if (previousStage) void moveLead(selectedLead, previousStage);
                }}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '11px 14px',
                  background: '#fff',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                Voltar etapa
              </button>

              <button
                type="button"
                disabled={!getNextStage(normalizeStage(selectedLead)) || updatingId === selectedLead.id}
                onClick={() => {
                  const nextStage = getNextStage(normalizeStage(selectedLead));
                  if (nextStage) void moveLead(selectedLead, nextStage);
                }}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: '11px 14px',
                  background: '#0f172a',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Avançar etapa
              </button>
            </div>

            {renderLeadActionButtons(selectedLead)}

            <button
              type="button"
              disabled={closingId === selectedLead.id}
              onClick={() => openClosureModal(selectedLead)}
              style={{
                width: '100%',
                border: '1px solid #fecdd3',
                borderRadius: 12,
                padding: '12px 14px',
                background: '#fff1f2',
                color: '#be123c',
                cursor: 'pointer',
                fontWeight: 900,
                marginTop: 10,
              }}
            >
              Finalizar atendimento
            </button>
          </div>
        </div>
      ) : null}

      {offerLead ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 95,
            padding: 20,
          }}
          onClick={closeOffersModal}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 980,
              maxHeight: '92vh',
              overflow: 'auto',
              background: '#fff',
              borderRadius: 22,
              padding: 22,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header" style={{ marginBottom: 16 }}>
              <div>
                <span className="eyebrow">Ofertas manuais</span>
                <h2>{offerLead.nome || 'Lead sem nome'}</h2>
                <p className="panel-subtitle">
                  Rodada atual: {getActiveOfferRound(offerLead)}. Cadastre as propostas simuladas nos bancos e envie ao cliente em carrossel no WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={closeOffersModal}
                style={{
                  border: 0,
                  borderRadius: 999,
                  background: '#0f172a',
                  color: '#fff',
                  padding: '9px 14px',
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>

            {offerLoading ? (
              <div className="feedback-banner glass-card">Carregando ofertas...</div>
            ) : null}

            {getSelectedOfferSummary(offerLead) ? (
              <div
                style={{
                  borderRadius: 16,
                  padding: 14,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 14,
                }}
              >
                <div>Oferta escolhida pelo cliente: {getSelectedOfferSummary(offerLead)}</div>

                <button
                  type="button"
                  onClick={() => void startNewOfferRound()}
                  disabled={changingOffers || offerSaving || offerSending}
                  style={{
                    marginTop: 12,
                    border: '1px solid #86efac',
                    borderRadius: 12,
                    padding: '10px 12px',
                    background: '#fff',
                    color: '#166534',
                    cursor: changingOffers || offerSaving || offerSending ? 'not-allowed' : 'pointer',
                    fontWeight: 900,
                  }}
                >
                  {changingOffers ? 'Preparando nova rodada...' : 'Mudar ofertas'}
                </button>
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 14 }}>
              {offerForms.map((offer, index) => (
                <div
                  key={offer.offer_number}
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong style={{ color: '#0f172a' }}>Oferta {offer.offer_number}</strong>

                    {offer.status && offer.status !== 'draft' ? (
                      <span
                        style={{
                          borderRadius: 999,
                          padding: '6px 10px',
                          background:
                            offer.status === 'chosen'
                              ? '#dcfce7'
                              : offer.status === 'sent'
                                ? '#dbeafe'
                                : '#f1f5f9',
                          border:
                            offer.status === 'chosen'
                              ? '1px solid #86efac'
                              : offer.status === 'sent'
                                ? '1px solid #bfdbfe'
                                : '1px solid #cbd5e1',
                          color:
                            offer.status === 'chosen'
                              ? '#166534'
                              : offer.status === 'sent'
                                ? '#1d4ed8'
                                : '#475569',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {offer.status === 'chosen'
                          ? 'Escolhida'
                          : offer.status === 'sent'
                            ? 'Enviada'
                            : offer.status === 'discarded'
                              ? 'Descartada'
                              : 'Rascunho'}
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 12,
                    }}
                  >
                    <label>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>Banco</span>
                      <input
                        value={offer.bank_name}
                        onChange={(event) => updateOfferField(index, 'bank_name', event.target.value)}
                        placeholder="Ex.: Zili"
                      />
                    </label>

                    <label>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>Valor liberado</span>
                      <input
                        value={offer.released_amount}
                        onChange={(event) => updateOfferField(index, 'released_amount', event.target.value)}
                        placeholder="Ex.: 4200,00"
                      />
                    </label>

                    <label>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>Parcela</span>
                      <input
                        value={offer.installment_amount}
                        onChange={(event) => updateOfferField(index, 'installment_amount', event.target.value)}
                        placeholder="Ex.: 218,40"
                      />
                    </label>

                    <label>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>Prazo</span>
                      <input
                        value={offer.term_months}
                        onChange={(event) => updateOfferField(index, 'term_months', event.target.value)}
                        placeholder="Ex.: 24"
                      />
                    </label>

                    <label>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>Taxa</span>
                      <input
                        value={offer.interest_rate}
                        onChange={(event) => updateOfferField(index, 'interest_rate', event.target.value)}
                        placeholder="Ex.: 2,05"
                      />
                    </label>

                    <label>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>Resumo</span>
                      <input
                        value={
                          offer.bank_name
                            ? `${offer.bank_name} • ${formatMoneyOptional(parseBrazilianDecimal(offer.released_amount))}`
                            : ''
                        }
                        readOnly
                        placeholder="Gerado automaticamente"
                      />
                    </label>
                  </div>

                  <label>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>Observação</span>
                    <textarea
                      rows={2}
                      value={offer.description}
                      onChange={(event) => updateOfferField(index, 'description', event.target.value)}
                      placeholder="Ex.: Melhor valor liberado, menor parcela, aprovação mais rápida..."
                    />
                  </label>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={() => void saveOffers()}
                disabled={offerSaving || offerSending || changingOffers}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: '#fff',
                  color: '#0f172a',
                  cursor: offerSaving || offerSending || changingOffers ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                }}
              >
                {offerSaving ? 'Salvando...' : 'Salvar ofertas'}
              </button>

              <button
                type="button"
                onClick={() => void sendOffers()}
                disabled={offerSaving || offerSending || changingOffers}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: 'linear-gradient(180deg, #6ee7f9, #4cc9f0)',
                  color: '#071018',
                  cursor: offerSaving || offerSending || changingOffers ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                }}
              >
                {offerSending ? 'Enviando...' : 'Enviar propostas'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {contractDataLead ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
          onClick={closeContractDataModal}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 980,
              maxHeight: '92vh',
              overflow: 'auto',
              background: '#fff',
              borderRadius: 22,
              padding: 22,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header" style={{ marginBottom: 16 }}>
              <div>
                <span className="eyebrow">Dados para digitação</span>
                <h2>{contractDataLead.nome || 'Lead sem nome'}</h2>
                <p className="panel-subtitle">
                  Preencha, salve e copie os dados para digitar a proposta no banco.
                </p>
              </div>

              <button
                type="button"
                onClick={closeContractDataModal}
                style={{
                  border: 0,
                  borderRadius: 999,
                  background: '#0f172a',
                  color: '#fff',
                  padding: '9px 14px',
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Nome completo</span>
                <input
                  value={contractDataForm.nome}
                  onChange={(event) => updateContractDataField('nome', event.target.value)}
                  placeholder="Nome completo"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>CPF</span>
                <input
                  value={contractDataForm.cpf}
                  onChange={(event) => updateContractDataField('cpf', event.target.value)}
                  placeholder="CPF"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>RG</span>
                <input
                  value={contractDataForm.rg}
                  onChange={(event) => updateContractDataField('rg', event.target.value)}
                  placeholder="RG"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>UF de emissão do documento</span>
                <input
                  value={contractDataForm.document_uf}
                  onChange={(event) => updateContractDataField('document_uf', event.target.value)}
                  placeholder="Ex.: PI"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Nome da mãe</span>
                <input
                  value={contractDataForm.mother_name}
                  onChange={(event) => updateContractDataField('mother_name', event.target.value)}
                  placeholder="Nome da mãe"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Email</span>
                <input
                  value={contractDataForm.email}
                  onChange={(event) => updateContractDataField('email', event.target.value)}
                  placeholder="email@exemplo.com"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Estado civil</span>
                <input
                  value={contractDataForm.marital_status}
                  onChange={(event) => updateContractDataField('marital_status', event.target.value)}
                  placeholder="Solteiro, casado..."
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>CEP</span>
                <input
                  value={contractDataForm.cep}
                  onChange={(event) => updateContractDataField('cep', event.target.value)}
                  placeholder="CEP"
                />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Endereço completo</span>
                <input
                  value={contractDataForm.full_address}
                  onChange={(event) => updateContractDataField('full_address', event.target.value)}
                  placeholder="Rua, número, bairro, complemento"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Cidade e Estado</span>
                <input
                  value={contractDataForm.city_state}
                  onChange={(event) => updateContractDataField('city_state', event.target.value)}
                  placeholder="Teresina/PI"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Banco</span>
                <input
                  value={contractDataForm.bank_name}
                  onChange={(event) => updateContractDataField('bank_name', event.target.value)}
                  placeholder="Banco para recebimento"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Agência com dígito</span>
                <input
                  value={contractDataForm.bank_agency}
                  onChange={(event) => updateContractDataField('bank_agency', event.target.value)}
                  placeholder="Agência com dígito"
                />
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Conta com dígito</span>
                <input
                  value={contractDataForm.bank_account}
                  onChange={(event) => updateContractDataField('bank_account', event.target.value)}
                  placeholder="Conta com dígito"
                />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>PIX</span>
                <input
                  value={contractDataForm.pix_key}
                  onChange={(event) => updateContractDataField('pix_key', event.target.value)}
                  placeholder="Chave PIX"
                />
              </label>
            </div>

            <div
              style={{
                marginTop: 16,
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                padding: 14,
              }}
            >
              <strong style={{ color: '#0f172a' }}>Prévia para copiar</strong>
              <pre
                style={{
                  margin: '10px 0 0',
                  whiteSpace: 'pre-wrap',
                  color: '#334155',
                  fontSize: 12,
                  lineHeight: 1.55,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                {buildContractDataText(contractDataForm)}
              </pre>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={() => void saveContractData()}
                disabled={contractDataSaving || contractDataCopying}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: '#fff',
                  color: '#0f172a',
                  cursor: contractDataSaving || contractDataCopying ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                }}
              >
                {contractDataSaving ? 'Salvando...' : 'Salvar dados'}
              </button>

              <button
                type="button"
                onClick={() => void copyContractData()}
                disabled={contractDataSaving || contractDataCopying}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: '#0f172a',
                  color: '#fff',
                  cursor: contractDataSaving || contractDataCopying ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                }}
              >
                {contractDataCopying ? 'Copiando...' : 'Salvar e copiar dados'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {signatureLead ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 105,
            padding: 20,
          }}
          onClick={closeSignatureModal}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 620,
              background: '#fff',
              borderRadius: 22,
              padding: 22,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header" style={{ marginBottom: 16 }}>
              <div>
                <span className="eyebrow">Assinatura digital</span>
                <h2>{signatureLead.nome || 'Lead sem nome'}</h2>
                <p className="panel-subtitle">
                  Cole o link gerado no banco. O CRM enviará o link ao cliente e depois perguntará se o contrato foi assinado.
                </p>
              </div>

              <button
                type="button"
                onClick={closeSignatureModal}
                style={{
                  border: 0,
                  borderRadius: 999,
                  background: '#0f172a',
                  color: '#fff',
                  padding: '9px 14px',
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>

            <label>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>Link de assinatura</span>
              <input
                value={signatureLink}
                onChange={(event) => setSignatureLink(event.target.value)}
                placeholder="https://..."
              />
            </label>

            <div
              style={{
                borderRadius: 16,
                padding: 14,
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                color: '#9a3412',
                fontSize: 13,
                lineHeight: 1.5,
                marginTop: 14,
              }}
            >
              O botão “Contrato assinado” não será enviado junto com o link. Ele será enviado depois pelo backend,
              evitando que o cliente confirme antes de abrir o contrato.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={closeSignatureModal}
                disabled={signatureSending}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: '#fff',
                  color: '#0f172a',
                  cursor: signatureSending ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void sendSignatureLink()}
                disabled={signatureSending}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: 'linear-gradient(180deg, #86efac, #22c55e)',
                  color: '#052e16',
                  cursor: signatureSending ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                }}
              >
                {signatureSending ? 'Enviando...' : 'Enviar link'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {closingLead ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
            padding: 20,
          }}
          onClick={closeClosureModal}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 560,
              background: '#fff',
              borderRadius: 22,
              padding: 22,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header" style={{ marginBottom: 16 }}>
              <div>
                <span className="eyebrow">Encerrar atendimento</span>
                <h2>{closingLead.nome || 'Lead sem nome'}</h2>
                <p className="panel-subtitle">
                  O lead sairá do Kanban operacional, mas continuará salvo para histórico, métricas e follow-up.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Motivo do encerramento</span>
                <select value={closureReason} onChange={(event) => setClosureReason(event.target.value)}>
                  <option value="">Selecione o motivo</option>
                  {CLOSURE_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Observação interna opcional</span>
                <textarea
                  rows={4}
                  value={closureNote}
                  onChange={(event) => setClosureNote(event.target.value)}
                  placeholder="Ex.: cliente achou a parcela alta, pediu retorno mês que vem..."
                />
              </label>

              {closureReason ? (
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {(() => {
                    const config = getClosureFollowupConfig(closureReason);

                    if (!config.followup_recommended) {
                      return `Classificação: ${config.followup_level}. Sem follow-up automático recomendado.`;
                    }

                    return `Classificação: ${config.followup_level}. Follow-up sugerido para ${config.followup_date}.`;
                  })()}
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={closeClosureModal}
                  disabled={closingId === closingLead.id}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 12,
                    padding: '12px 14px',
                    background: '#fff',
                    color: '#0f172a',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => void finalizeLead()}
                  disabled={closingId === closingLead.id}
                  style={{
                    border: 0,
                    borderRadius: 12,
                    padding: '12px 14px',
                    background: '#be123c',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 900,
                  }}
                >
                  {closingId === closingLead.id ? 'Finalizando...' : 'Finalizar atendimento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}