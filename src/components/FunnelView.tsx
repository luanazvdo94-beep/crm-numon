import { useEffect, useMemo, useState } from 'react';
import { STATUS_OPTIONS } from '../constants';
import { supabase } from '../supabase';
import type { LeadRecord } from '../types';

type LeadRecordWithOperationalFields = LeadRecord & {
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
  'Assinado',
  'Pago',
  'Pós-venda',
];

const FUNNEL_AUTOMATION_ENDPOINT =
  'https://nodejs-production-15c2.up.railway.app/send-indication-message';

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

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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
  return extendedLead.clt_ready_for_presimulation === true;
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

export function FunnelView({ leads, onPreSimulateLead }: FunnelViewProps) {
  const [localLeads, setLocalLeads] = useState<LeadRecord[]>(leads);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [closingLead, setClosingLead] = useState<LeadRecord | null>(null);
  const [closureReason, setClosureReason] = useState('');
  const [closureNote, setClosureNote] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);

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
      setFeedback('Este lead ainda não está pronto para pré-simulação automática.');
      return;
    }

    if (!onPreSimulateLead) {
      setFeedback('A integração com a aba Pré-simulador ainda não foi conectada no App.');
      return;
    }

    setSelectedLead(null);
    onPreSimulateLead(lead.id);
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
          gridTemplateColumns: 'repeat(7, minmax(220px, 1fr))',
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

            {canPreSimulateLead(selectedLead) ? (
              <button
                type="button"
                disabled={updatingId === selectedLead.id}
                onClick={() => handlePreSimulate(selectedLead)}
                style={{
                  width: '100%',
                  border: 0,
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: 'linear-gradient(180deg, #6ee7f9, #4cc9f0)',
                  color: '#071018',
                  cursor: 'pointer',
                  fontWeight: 900,
                  marginTop: 10,
                }}
              >
                Pré-simular
              </button>
            ) : null}

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