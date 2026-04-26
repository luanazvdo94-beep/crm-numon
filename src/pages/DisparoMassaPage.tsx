import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase';

type TemplateOption = {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
};

type LeadRowStatus = 'pendente' | 'enviado' | 'erro' | 'enviando';

type LeadRow = {
  nome: string;
  telefone: string;
  empresa: string;
  template: string;
  status: LeadRowStatus;
  statusDetail: string;
};

const BACKEND_URL = 'https://nodejs-production-15c2.up.railway.app';
const API_KEY = 'numon123';
const DELAY_MS = 15000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DisparoMassaPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingRowIndex, setSendingRowIndex] = useState<number | null>(null);
  const [globalTemplate, setGlobalTemplate] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [shouldStop, setShouldStop] = useState(false);
  const [campaignName, setCampaignName] = useState('');

  const stopRequestedRef = useRef(false);

  const isBusy = sendingAll || sendingRowIndex !== null;

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    stopRequestedRef.current = shouldStop;
  }, [shouldStop]);

  useEffect(() => {
    if (countdownSeconds == null || countdownSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setCountdownSeconds((prev) => (prev == null ? null : prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdownSeconds]);

  async function loadTemplates() {
    setLoadingTemplates(true);

    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('id, key, name, is_active')
      .eq('is_active', true)
      .order('flow_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      setFeedback(`Erro ao carregar templates: ${error.message}`);
      setLoadingTemplates(false);
      return;
    }

    setTemplates((data as TemplateOption[]) || []);
    setLoadingTemplates(false);
  }

  function normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');

    if (!digits) return '';
    if (digits.startsWith('55')) return digits;
    return `55${digits}`;
  }

  function parseCsvLine(line: string) {
    const separator = line.includes(';') ? ';' : ',';
    return line.split(separator).map((item) => item.trim());
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = String(event.target?.result || '')
        .replace(/\r/g, '')
        .replace(/^\uFEFF/, '');

      const lines = text.split('\n').filter((line) => line.trim() !== '');

      if (lines.length <= 1) {
        setRows([]);
        setFeedback('Arquivo vazio ou sem linhas de dados.');
        return;
      }

      const dataLines = lines.slice(1);

      const parsed = dataLines
        .map((line) => {
          const [nome, telefone, empresa] = parseCsvLine(line);

          return {
            nome: nome || '',
            telefone: normalizePhone(telefone || ''),
            empresa: empresa || '',
            template: '',
            status: 'pendente' as const,
            statusDetail: '',
          };
        })
        .filter((row) => row.nome || row.telefone || row.empresa);

      setRows(parsed);
      setFeedback(`${parsed.length} leads carregados.`);
    };

    reader.readAsText(file, 'utf-8');
  }

  function handleTemplateChange(index: number, value: string) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, template: value, status: 'pendente', statusDetail: '' }
          : row
      )
    );
  }

  function setRowState(index: number, patch: Partial<LeadRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  async function saveDispatchLog(params: {
    nome: string;
    telefone: string;
    empresa: string;
    templateKey: string;
    messageText: string;
    status: 'enviado' | 'erro';
    errorMessage: string | null;
  }) {
    const { error } = await supabase.from('mass_dispatch_logs').insert({
      nome: params.nome || null,
      telefone: params.telefone || null,
      empresa: params.empresa || null,
      template_key: params.templateKey || null,
      message_text: params.messageText || null,
      status: params.status,
      error_message: params.errorMessage,
      campaign_name: campaignName.trim() || 'sem_nome',
    });

    if (error) {
      console.error('Erro ao salvar histórico de disparo:', error);
    }
  }

  async function getTemplateMessagePreview(
    templateKey: string,
    nome: string,
    empresa: string
  ) {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('message_text')
      .eq('key', templateKey)
      .eq('is_active', true)
      .single();

    if (error || !data?.message_text) {
      return '';
    }

    return String(data.message_text)
      .replace(/{{\s*nome\s*}}/g, nome || '')
      .replace(/{{\s*empresa\s*}}/g, empresa || '');
  }

  async function sendRow(index: number) {
    const row = rows[index];

    if (!row?.telefone || !row?.template) {
      const errorMessage = 'Telefone e template são obrigatórios.';

      setRowState(index, {
        status: 'erro',
        statusDetail: errorMessage,
      });

      await saveDispatchLog({
        nome: row?.nome || '',
        telefone: row?.telefone || '',
        empresa: row?.empresa || '',
        templateKey: row?.template || '',
        messageText: '',
        status: 'erro',
        errorMessage,
      });

      return false;
    }

    setRowState(index, {
      status: 'enviando',
      statusDetail: 'Enviando...',
    });

    const messagePreview = await getTemplateMessagePreview(
      row.template,
      row.nome,
      row.empresa
    );

    try {
      const response = await fetch(`${BACKEND_URL}/send-indication-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          leadId: `mass-${Date.now()}-${index}`,
          phone: row.telefone,
          templateKey: row.template,
          nome: row.nome,
          empresa: row.empresa,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        const successMessage = 'Mensagem enviada com sucesso.';

        setRowState(index, {
          status: 'enviado',
          statusDetail: successMessage,
        });

        await saveDispatchLog({
          nome: row.nome,
          telefone: row.telefone,
          empresa: row.empresa,
          templateKey: row.template,
          messageText: messagePreview,
          status: 'enviado',
          errorMessage: null,
        });

        return true;
      }

      const errorMessage = data?.error || `Falha no envio. HTTP ${response.status}`;

      setRowState(index, {
        status: 'erro',
        statusDetail: errorMessage,
      });

      await saveDispatchLog({
        nome: row.nome,
        telefone: row.telefone,
        empresa: row.empresa,
        templateKey: row.template,
        messageText: messagePreview,
        status: 'erro',
        errorMessage,
      });

      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro inesperado no disparo.';

      setRowState(index, {
        status: 'erro',
        statusDetail: errorMessage,
      });

      await saveDispatchLog({
        nome: row.nome,
        telefone: row.telefone,
        empresa: row.empresa,
        templateKey: row.template,
        messageText: messagePreview,
        status: 'erro',
        errorMessage,
      });

      return false;
    }
  }

  async function handleDisparar(index: number) {
    if (isBusy) return;

    setSendingRowIndex(index);
    await sendRow(index);
    setSendingRowIndex(null);
  }

  function handleApplyTemplateToAll() {
    if (!globalTemplate) {
      setFeedback('Selecione um template global antes de aplicar para todos.');
      return;
    }

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        template: globalTemplate,
        status: row.status === 'enviado' ? row.status : 'pendente',
        statusDetail: row.status === 'enviado' ? row.statusDetail : '',
      }))
    );

    setFeedback('Template aplicado para toda a base.');
  }

  async function handleDispararTodos() {
    if (isBusy) return;

    if (rows.length === 0) {
      setFeedback('Importe uma base antes de disparar.');
      return;
    }

    const hasMissingTemplate = rows.some((row) => !row.template);
    const hasMissingPhone = rows.some((row) => !row.telefone);

    if (hasMissingTemplate) {
      setFeedback('Existem linhas sem template selecionado.');
      return;
    }

    if (hasMissingPhone) {
      setFeedback('Existem linhas sem telefone válido.');
      return;
    }

    setShouldStop(false);
    stopRequestedRef.current = false;
    setSendingAll(true);
    setFeedback('Disparo automático iniciado.');

    let interrupted = false;

    for (let index = 0; index < rows.length; index += 1) {
      if (stopRequestedRef.current) {
        interrupted = true;
        setFeedback('Disparo interrompido manualmente.');
        break;
      }

      setSendingRowIndex(index);
      await sendRow(index);

      if (index < rows.length - 1) {
        setCountdownSeconds(Math.floor(DELAY_MS / 1000));

        for (let elapsed = 0; elapsed < DELAY_MS; elapsed += 1000) {
          if (stopRequestedRef.current) {
            interrupted = true;
            break;
          }
          await sleep(1000);
        }

        if (stopRequestedRef.current) {
          setFeedback('Disparo interrompido manualmente.');
          break;
        }
      }
    }

    setCountdownSeconds(null);
    setSendingRowIndex(null);
    setSendingAll(false);
    setShouldStop(false);
    stopRequestedRef.current = false;

    if (!interrupted) {
      setFeedback('Disparo automático finalizado.');
    }
  }

  const sentCount = useMemo(
    () => rows.filter((row) => row.status === 'enviado').length,
    [rows]
  );

  const errorCount = useMemo(
    () => rows.filter((row) => row.status === 'erro').length,
    [rows]
  );

  const pendingCount = useMemo(
    () => rows.filter((row) => row.status === 'pendente').length,
    [rows]
  );

  const sendingCount = useMemo(
    () => rows.filter((row) => row.status === 'enviando').length,
    [rows]
  );

  return (
    <div style={{ padding: 24, background: '#F7FAFC', minHeight: '100vh' }}>
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h1 style={{ margin: 0, color: '#123C73' }}>Disparo em Massa</h1>
        <p style={{ marginTop: 8, color: '#64748B' }}>
          Faça upload de uma base e dispare mensagens direto pelo CRM.
        </p>

        {feedback && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#123C73',
            }}
          >
            {feedback}
          </div>
        )}

        <div
          style={{
            marginTop: 20,
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 14,
          }}
        >
          <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#123C73',
              }}
            >
              Nome da campanha
            </label>
            <input
              type="text"
              value={campaignName}
              disabled={isBusy}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Ex.: FGTS manhã / Base CLT abril / Follow-up antigos"
              style={input}
            />
          </div>

          <input
            type="file"
            accept=".csv"
            disabled={isBusy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            style={{ color: '#000000' }}
          />

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={globalTemplate}
              disabled={isBusy || loadingTemplates}
              onChange={(e) => setGlobalTemplate(e.target.value)}
              style={{
                ...input,
                maxWidth: 380,
              }}
            >
              <option value="">Selecione um template global</option>
              {templates.map((template) => (
                <option key={template.id} value={template.key}>
                  {template.name} ({template.key})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleApplyTemplateToAll}
              disabled={isBusy || !globalTemplate || rows.length === 0}
              style={{
                background: isBusy || !globalTemplate || rows.length === 0 ? '#94A3B8' : '#123C73',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                cursor:
                  isBusy || !globalTemplate || rows.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Aplicar template a todos
            </button>

            <button
              type="button"
              onClick={() => void handleDispararTodos()}
              disabled={isBusy || rows.length === 0}
              style={{
                background: isBusy || rows.length === 0 ? '#94A3B8' : '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                cursor: isBusy || rows.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {sendingAll ? 'Disparando base...' : 'Disparar todos'}
            </button>

            <button
              type="button"
              onClick={() => setShouldStop(true)}
              disabled={!sendingAll}
              style={{
                background: !sendingAll ? '#94A3B8' : '#EF4444',
                color: '#000000',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                cursor: !sendingAll ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              Parar disparo
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
            <span style={badgeInfo('#EFF6FF', '#123C73')}>
              Templates ativos: {loadingTemplates ? 'carregando...' : templates.length}
            </span>
            <span style={badgeInfo('#F8FAFC', '#475569')}>Pendentes: {pendingCount}</span>
            <span style={badgeInfo('#DCFCE7', '#166534')}>Enviados: {sentCount}</span>
            <span style={badgeInfo('#FEE2E2', '#991B1B')}>Erros: {errorCount}</span>
            <span style={badgeInfo('#FEF3C7', '#92400E')}>Enviando: {sendingCount}</span>
            {sendingAll && countdownSeconds != null ? (
              <span style={badgeInfo('#EDE9FE', '#5B21B6')}>
                Próximo envio em: {countdownSeconds}s
              </span>
            ) : null}
            {campaignName.trim() ? (
              <span style={badgeInfo('#DBEAFE', '#1D4ED8')}>
                Campanha: {campaignName.trim()}
              </span>
            ) : null}
          </div>
        </div>

        {rows.length > 0 && (
          <div style={{ marginTop: 20, overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: 10,
              }}
            >
              <thead>
                <tr style={{ background: '#F1F5F9' }}>
                  <th style={th}>Nome</th>
                  <th style={th}>Telefone</th>
                  <th style={th}>Empresa</th>
                  <th style={th}>Template</th>
                  <th style={th}>Status</th>
                  <th style={th}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={td}>{row.nome}</td>
                    <td style={td}>{row.telefone}</td>
                    <td style={td}>{row.empresa}</td>

                    <td style={td}>
                      <select
                        value={row.template}
                        disabled={isBusy}
                        onChange={(e) =>
                          handleTemplateChange(index, e.target.value)
                        }
                        style={input}
                      >
                        <option value="">Selecione um template</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.key}>
                            {template.name} ({template.key})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            padding: '6px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            width: 'fit-content',
                            background:
                              row.status === 'enviado'
                                ? '#DCFCE7'
                                : row.status === 'erro'
                                ? '#FEE2E2'
                                : row.status === 'enviando'
                                ? '#FEF3C7'
                                : '#F1F5F9',
                            color:
                              row.status === 'enviado'
                                ? '#166534'
                                : row.status === 'erro'
                                ? '#991B1B'
                                : row.status === 'enviando'
                                ? '#92400E'
                                : '#475569',
                          }}
                        >
                          {row.status}
                        </span>

                        {row.statusDetail ? (
                          <span
                            style={{
                              fontSize: 12,
                              color:
                                row.status === 'erro'
                                  ? '#991B1B'
                                  : '#475569',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {row.statusDetail}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td style={td}>
                      <button
                        onClick={() => void handleDisparar(index)}
                        disabled={isBusy}
                        style={{
                          background: isBusy ? '#94A3B8' : '#16A34A',
                          color: '#FFF',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: 8,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Disparar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function badgeInfo(background: string, color: string): React.CSSProperties {
  return {
    background,
    color,
    padding: '6px 10px',
    borderRadius: 999,
  };
}

const th: React.CSSProperties = {
  padding: 12,
  textAlign: 'left',
  fontSize: 14,
  color: '#123C73',
};

const td: React.CSSProperties = {
  padding: 12,
  fontSize: 14,
  color: '#0F172A',
  verticalAlign: 'top',
};

const input: React.CSSProperties = {
  padding: 8,
  borderRadius: 8,
  border: '1px solid #CBD5E1',
  width: '100%',
  color: '#000000',
  background: '#FFFFFF',
};