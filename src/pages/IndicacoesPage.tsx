import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

type IndicacaoRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  empresa: string | null;
  source: string | null;
  origem: string | null;
  indicator_id: string | null;
  ref_code: string | null;
  status: string | null;
  etapa: string | null;
  created_at: string | null;
  refusal_reason: string | null;
  indicator_commission_amount: number | null;
  indicator_payment_due_date: string | null;
  selected_message_template: string | null;
  last_message_sent_at: string | null;
  last_message_sent_text: string | null;
  indicators?: {
    full_name: string;
  } | null;
};

type EditableRowState = {
  refusal_reason: string;
  indicator_commission_amount: string;
  indicator_payment_due_date: string;
  selected_message_template: string;
};

const WHATSAPP_BACKEND_URL =
  'https://nodejs-production-15c2.up.railway.app/send-indication-message';

const WHATSAPP_BACKEND_API_KEY = 'numon123';

const MESSAGE_TEMPLATE_OPTIONS = [
  { value: '', label: 'Selecione um modelo' },
  { value: 'primeiro_contato', label: 'Primeiro Contato' },
];

export default function IndicacoesPage() {
  const [indicacoes, setIndicacoes] = useState<IndicacaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [firingRowId, setFiringRowId] = useState<string | null>(null);
  const [rowEdits, setRowEdits] = useState<Record<string, EditableRowState>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIndicacao, setSelectedIndicacao] = useState<IndicacaoRow | null>(null);

  async function loadIndicacoes() {
    setLoading(true);

    const { data, error } = await supabase
      .from('leads')
      .select(`
        id,
        nome,
        telefone,
        email,
        empresa,
        source,
        origem,
        indicator_id,
        ref_code,
        status,
        etapa,
        created_at,
        refusal_reason,
        indicator_commission_amount,
        indicator_payment_due_date,
        selected_message_template,
        last_message_sent_at,
        last_message_sent_text,
        indicators:indicator_id (
          full_name
        )
      `)
      .eq('source', 'indicacao')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      alert(`Erro ao carregar indicações: ${error.message}`);
    } else {
      const rows = (data as IndicacaoRow[]) || [];
      setIndicacoes(rows);

      const initialEdits: Record<string, EditableRowState> = {};
      rows.forEach((item) => {
        initialEdits[item.id] = {
          refusal_reason: item.refusal_reason || '',
          indicator_commission_amount:
            item.indicator_commission_amount != null
              ? String(item.indicator_commission_amount)
              : '',
          indicator_payment_due_date: item.indicator_payment_due_date || '',
          selected_message_template: item.selected_message_template || '',
        };
      });

      setRowEdits(initialEdits);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadIndicacoes();
  }, []);

  function formatDate(value: string | null) {
    if (!value) return '-';
    return new Date(value).toLocaleString('pt-BR');
  }

  function formatMoney(value: number | null) {
    if (value == null) return '-';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function handleOpenDetails(item: IndicacaoRow) {
    setSelectedIndicacao(item);
    setDetailsOpen(true);
  }

  function handleCloseDetails() {
    setDetailsOpen(false);
    setSelectedIndicacao(null);
  }

  async function handleFireMessage(id: string) {
    try {
      const lead = indicacoes.find((item) => item.id === id);

      if (!lead) {
        alert('Lead não encontrado.');
        return;
      }

      const phone = lead.telefone?.trim();

      if (!phone) {
        alert('Essa indicação não possui telefone válido para disparo.');
        return;
      }

      const templateKey = rowEdits[id]?.selected_message_template?.trim();

      if (!templateKey) {
        alert('Selecione um modelo de disparo antes de enviar.');
        return;
      }

      setFiringRowId(id);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (WHATSAPP_BACKEND_API_KEY.trim()) {
        headers['x-api-key'] = WHATSAPP_BACKEND_API_KEY;
      }

      const response = await fetch(WHATSAPP_BACKEND_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leadId: id,
          phone,
          templateKey,
          nome: lead.nome || '',
          empresa: lead.empresa || '',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        const errorMessage = data?.error || 'Falha ao enviar a mensagem pelo backend.';
        alert(`Erro ao disparar mensagem: ${errorMessage}`);
        return;
      }

      if (rowEdits[id]) {
        const { error: saveTemplateError } = await supabase
          .from('leads')
          .update({
            selected_message_template: templateKey,
          })
          .eq('id', id);

        if (saveTemplateError) {
          console.error(saveTemplateError);
        }
      }

      await loadIndicacoes();
      alert('Mensagem enviada com sucesso.');
    } catch (error) {
      console.error(error);
      alert('Erro no disparo da mensagem.');
    } finally {
      setFiringRowId(null);
    }
  }

  function handleEditChange(
    rowId: string,
    field: keyof EditableRowState,
    value: string
  ) {
    setRowEdits((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: value,
      },
    }));
  }

  async function handleSaveRow(rowId: string) {
    const current = rowEdits[rowId];
    if (!current) return;

    setSavingRowId(rowId);

    const commissionValue =
      current.indicator_commission_amount.trim() === ''
        ? null
        : Number(current.indicator_commission_amount.replace(',', '.'));

    if (
      current.indicator_commission_amount.trim() !== '' &&
      Number.isNaN(commissionValue)
    ) {
      alert('Comissão prevista inválida. Digite um número válido.');
      setSavingRowId(null);
      return;
    }

    const paymentDueDate =
      current.indicator_payment_due_date.trim() === ''
        ? null
        : current.indicator_payment_due_date;

    const { data, error } = await supabase
      .from('leads')
      .update({
        refusal_reason: current.refusal_reason.trim() || null,
        indicator_commission_amount: commissionValue,
        indicator_payment_due_date: paymentDueDate,
        selected_message_template:
          current.selected_message_template.trim() || null,
      })
      .eq('id', rowId)
      .select(`
        id,
        refusal_reason,
        indicator_commission_amount,
        indicator_payment_due_date,
        selected_message_template
      `)
      .maybeSingle();

    if (error) {
      console.error(error);
      alert(`Erro ao salvar indicação: ${error.message}`);
      setSavingRowId(null);
      return;
    }

    if (!data) {
      alert(
        'A operação não retornou a indicação atualizada. Isso pode indicar bloqueio por permissão ou que o registro não foi realmente alterado.'
      );
      setSavingRowId(null);
      return;
    }

    await loadIndicacoes();

    alert('Indicação atualizada com sucesso.');
    setSavingRowId(null);
  }

  return (
    <div style={{ padding: 24, background: '#F7FAFC', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#123C73' }}>Indicações</h1>
        <p style={{ color: '#64748B' }}>
          Leads recebidos pelos links dos indicadores.
        </p>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 24,
          padding: 20,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          overflowX: 'auto',
        }}
      >
        {loading ? (
          <div style={{ color: '#0F172A' }}>Carregando indicações...</div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              color: '#0F172A',
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left', color: '#123C73' }}>
                <th style={{ padding: '12px 8px' }}>Nome</th>
                <th style={{ padding: '12px 8px' }}>Telefone</th>
                <th style={{ padding: '12px 8px' }}>Empresa</th>
                <th style={{ padding: '12px 8px' }}>Indicador</th>
                <th style={{ padding: '12px 8px' }}>Motivo da recusa</th>
                <th style={{ padding: '12px 8px' }}>Comissão prevista</th>
                <th style={{ padding: '12px 8px' }}>Data prevista pagto.</th>
                <th style={{ padding: '12px 8px' }}>Modelo disparo</th>
                <th style={{ padding: '12px 8px' }}>Última mensagem</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
                <th style={{ padding: '12px 8px' }}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {indicacoes.map((item) => {
                const edit = rowEdits[item.id] || {
                  refusal_reason: '',
                  indicator_commission_amount: '',
                  indicator_payment_due_date: '',
                  selected_message_template: '',
                };

                return (
                  <tr key={item.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px 8px' }}>{item.nome}</td>
                    <td style={{ padding: '12px 8px' }}>{item.telefone || '-'}</td>
                    <td style={{ padding: '12px 8px' }}>{item.empresa || '-'}</td>
                    <td style={{ padding: '12px 8px' }}>
                      {item.indicators?.full_name || item.ref_code || '-'}
                    </td>

                    <td style={{ padding: '12px 8px', minWidth: 220 }}>
                      <input
                        type="text"
                        value={edit.refusal_reason}
                        onChange={(e) =>
                          handleEditChange(item.id, 'refusal_reason', e.target.value)
                        }
                        placeholder="Motivo da recusa"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid #CBD5E1',
                        }}
                      />
                    </td>

                    <td style={{ padding: '12px 8px', minWidth: 150 }}>
                      <input
                        type="text"
                        value={edit.indicator_commission_amount}
                        onChange={(e) =>
                          handleEditChange(
                            item.id,
                            'indicator_commission_amount',
                            e.target.value
                          )
                        }
                        placeholder="0,00"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid #CBD5E1',
                        }}
                      />
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: '#64748B',
                        }}
                      >
                        Atual: {formatMoney(item.indicator_commission_amount)}
                      </div>
                    </td>

                    <td style={{ padding: '12px 8px', minWidth: 170 }}>
                      <input
                        type="date"
                        value={edit.indicator_payment_due_date}
                        onChange={(e) =>
                          handleEditChange(
                            item.id,
                            'indicator_payment_due_date',
                            e.target.value
                          )
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid #CBD5E1',
                        }}
                      />
                    </td>

                    <td style={{ padding: '12px 8px', minWidth: 220 }}>
                      <select
                        value={edit.selected_message_template}
                        onChange={(e) =>
                          handleEditChange(
                            item.id,
                            'selected_message_template',
                            e.target.value
                          )
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#0F172A',
                        }}
                      >
                        {MESSAGE_TEMPLATE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '12px 8px', minWidth: 180 }}>
                      {item.last_message_sent_at
                        ? formatDate(item.last_message_sent_at)
                        : '-'}
                      {item.last_message_sent_text ? (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: '#64748B',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {item.last_message_sent_text}
                        </div>
                      ) : null}
                    </td>

                    <td style={{ padding: '12px 8px' }}>{item.status || '-'}</td>

                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleOpenDetails(item)}
                          style={{
                            background: '#123C73',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '8px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          Detalhes
                        </button>

                        <button
                          onClick={() => void handleFireMessage(item.id)}
                          disabled={firingRowId === item.id}
                          style={{
                            background:
                              firingRowId === item.id ? '#C9A96A' : '#D4A94D',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '8px 12px',
                            cursor:
                              firingRowId === item.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {firingRowId === item.id ? 'Disparando...' : 'Disparar'}
                        </button>

                        <button
                          onClick={() => void handleSaveRow(item.id)}
                          disabled={savingRowId === item.id}
                          style={{
                            background:
                              savingRowId === item.id ? '#94A3B8' : '#16A34A',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '8px 12px',
                            cursor:
                              savingRowId === item.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {savingRowId === item.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {indicacoes.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: 16, color: '#64748B' }}>
                    Nenhuma indicação recebida ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {detailsOpen && selectedIndicacao && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 24,
          }}
          onClick={handleCloseDetails}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 760,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: 24,
              border: '1px solid #E2E8F0',
              boxShadow: '0 20px 60px rgba(15, 23, 42, 0.18)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: 24,
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ margin: 0, color: '#123C73' }}>Detalhes da indicação</h2>
                <p style={{ margin: '6px 0 0', color: '#64748B' }}>
                  Visualização completa do lead indicado
                </p>
              </div>

              <button
                onClick={handleCloseDetails}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: 24,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <strong style={{ color: '#123C73' }}>Nome</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.nome || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Telefone</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.telefone || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Email</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.email || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Empresa</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.empresa || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Indicador</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.indicators?.full_name ||
                    selectedIndicacao.ref_code ||
                    '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Ref code</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.ref_code || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Status</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.status || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Etapa</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.etapa || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Origem</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.origem || selectedIndicacao.source || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Data de criação</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {formatDate(selectedIndicacao.created_at)}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Motivo da recusa</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.refusal_reason || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Comissão prevista</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {formatMoney(selectedIndicacao.indicator_commission_amount)}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Data prevista de pagamento</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.indicator_payment_due_date || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: '#123C73' }}>Modelo de disparo</strong>
                <div style={{ marginTop: 6, color: '#0F172A' }}>
                  {selectedIndicacao.selected_message_template || '-'}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ color: '#123C73' }}>Última mensagem enviada</strong>
                <div style={{ marginTop: 6, color: '#0F172A', whiteSpace: 'pre-wrap' }}>
                  {selectedIndicacao.last_message_sent_text || '-'}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#64748B' }}>
                  {selectedIndicacao.last_message_sent_at
                    ? `Enviada em ${formatDate(selectedIndicacao.last_message_sent_at)}`
                    : 'Nenhuma mensagem enviada ainda'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}