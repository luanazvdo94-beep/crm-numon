import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { supabase } from '../supabase';

type DispatchLogRecord = {
  id: string;
  created_at: string | null;
  nome: string | null;
  telefone: string | null;
  empresa: string | null;
  template_key: string | null;
  message_text: string | null;
  status: string | null;
  error_message: string | null;
  campaign_name: string | null;
};

type CampaignClassification = 'boa' | 'media' | 'ruim';
type CampaignAction = 'escalar' | 'ajustar' | 'pausar';

type TemplateClassification = 'bom' | 'medio' | 'ruim';
type TemplateAction = 'usar' | 'testar' | 'evitar';

type CampaignStat = {
  campaign: string;
  total: number;
  enviados: number;
  erros: number;
  successRate: number;
  errorRate: number;
  classification: CampaignClassification;
  action: CampaignAction;
};

type TemplateStat = {
  template: string;
  total: number;
  enviados: number;
  erros: number;
  successRate: number;
  errorRate: number;
  classification: TemplateClassification;
  action: TemplateAction;
};

function classifyCampaign(successRate: number): CampaignClassification {
  if (successRate >= 80) return 'boa';
  if (successRate >= 50) return 'media';
  return 'ruim';
}

function getCampaignAction(successRate: number): CampaignAction {
  if (successRate >= 80) return 'escalar';
  if (successRate >= 50) return 'ajustar';
  return 'pausar';
}

function classifyTemplate(successRate: number): TemplateClassification {
  if (successRate >= 80) return 'bom';
  if (successRate >= 50) return 'medio';
  return 'ruim';
}

function getTemplateAction(successRate: number): TemplateAction {
  if (successRate >= 80) return 'usar';
  if (successRate >= 50) return 'testar';
  return 'evitar';
}

function getClassificationLabel(classification: CampaignClassification) {
  if (classification === 'boa') return 'Boa';
  if (classification === 'media') return 'Média';
  return 'Ruim';
}

function getActionLabel(action: CampaignAction) {
  if (action === 'escalar') return 'ESCALAR';
  if (action === 'ajustar') return 'AJUSTAR';
  return 'PAUSAR';
}

function getActionDescription(action: CampaignAction) {
  if (action === 'escalar') return 'Campanha com boa performance. Pode receber mais base.';
  if (action === 'ajustar') return 'Campanha intermediária. Ajustar mensagem, público ou template.';
  return 'Campanha fraca. Pausar antes de continuar disparando.';
}

function getTemplateClassificationLabel(classification: TemplateClassification) {
  if (classification === 'bom') return 'Bom';
  if (classification === 'medio') return 'Médio';
  return 'Ruim';
}

function getTemplateActionLabel(action: TemplateAction) {
  if (action === 'usar') return 'USAR';
  if (action === 'testar') return 'TESTAR';
  return 'EVITAR';
}

function getTemplateActionDescription(action: TemplateAction) {
  if (action === 'usar') return 'Template com boa performance. Priorizar nos próximos disparos.';
  if (action === 'testar') return 'Template intermediário. Pode ser usado, mas deve ser comparado com outras mensagens.';
  return 'Template fraco. Evitar ou reescrever antes de continuar usando.';
}

function getClassificationBadgeStyle(classification: CampaignClassification): CSSProperties {
  if (classification === 'boa') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    };
  }

  if (classification === 'media') {
    return {
      background: '#fef9c3',
      color: '#854d0e',
      border: '1px solid #fde68a',
    };
  }

  return {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  };
}

function getActionBadgeStyle(action: CampaignAction): CSSProperties {
  if (action === 'escalar') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    };
  }

  if (action === 'ajustar') {
    return {
      background: '#fef9c3',
      color: '#854d0e',
      border: '1px solid #fde68a',
    };
  }

  return {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  };
}

function getTemplateClassificationBadgeStyle(classification: TemplateClassification): CSSProperties {
  if (classification === 'bom') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    };
  }

  if (classification === 'medio') {
    return {
      background: '#fef9c3',
      color: '#854d0e',
      border: '1px solid #fde68a',
    };
  }

  return {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  };
}

function getTemplateActionBadgeStyle(action: TemplateAction): CSSProperties {
  if (action === 'usar') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    };
  }

  if (action === 'testar') {
    return {
      background: '#fef9c3',
      color: '#854d0e',
      border: '1px solid #fde68a',
    };
  }

  return {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  };
}

function getChartColor(classification: CampaignClassification) {
  if (classification === 'boa') return '#16A34A';
  if (classification === 'media') return '#EAB308';
  return '#DC2626';
}

function formatDateTime(value: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR');
}

function formatPhone(phone: string | null) {
  if (!phone) return '-';

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9, 13)}`;
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  return phone;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeCsvCell(value: string | null) {
  const safeValue = value || '';
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export default function HistoricoDisparosPage() {
  const [logs, setLogs] = useState<DispatchLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'enviado' | 'erro'>('todos');
  const [dateFilter, setDateFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');

  async function loadLogs() {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('mass_dispatch_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(error.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs((data || []) as DispatchLogRecord[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  const campaignOptions = useMemo(() => {
    const set = new Set<string>();

    logs.forEach((item) => {
      if (item.campaign_name) {
        set.add(item.campaign_name);
      }
    });

    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = normalizeText(search);

    return logs.filter((item) => {
      const matchesSearch =
        !term ||
        normalizeText(item.nome || '').includes(term) ||
        normalizeText(item.telefone || '').includes(term) ||
        normalizeText(item.campaign_name || '').includes(term) ||
        normalizeText(item.template_key || '').includes(term);

      const matchesStatus = statusFilter === 'todos' || item.status === statusFilter;

      const matchesCampaign = !campaignFilter || item.campaign_name === campaignFilter;

      const matchesDate =
        !dateFilter ||
        (item.created_at &&
          new Date(item.created_at).toISOString().slice(0, 10) === dateFilter);

      return matchesSearch && matchesStatus && matchesCampaign && matchesDate;
    });
  }, [logs, search, statusFilter, campaignFilter, dateFilter]);

  const campaignStats = useMemo<CampaignStat[]>(() => {
    const map = new Map<string, CampaignStat>();

    filteredLogs.forEach((item) => {
      const campaign = item.campaign_name || 'sem_nome';

      if (!map.has(campaign)) {
        map.set(campaign, {
          campaign,
          total: 0,
          enviados: 0,
          erros: 0,
          successRate: 0,
          errorRate: 0,
          classification: 'media',
          action: 'ajustar',
        });
      }

      const current = map.get(campaign)!;

      current.total += 1;

      if (item.status === 'enviado') current.enviados += 1;
      if (item.status === 'erro') current.erros += 1;

      current.successRate =
        current.total > 0 ? Math.round((current.enviados / current.total) * 100) : 0;

      current.errorRate =
        current.total > 0 ? Math.round((current.erros / current.total) * 100) : 0;

      current.classification = classifyCampaign(current.successRate);
      current.action = getCampaignAction(current.successRate);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredLogs]);

  const templateStats = useMemo<TemplateStat[]>(() => {
    const map = new Map<string, TemplateStat>();

    filteredLogs.forEach((item) => {
      const template = item.template_key || 'sem_template';

      if (!map.has(template)) {
        map.set(template, {
          template,
          total: 0,
          enviados: 0,
          erros: 0,
          successRate: 0,
          errorRate: 0,
          classification: 'medio',
          action: 'testar',
        });
      }

      const current = map.get(template)!;

      current.total += 1;

      if (item.status === 'enviado') current.enviados += 1;
      if (item.status === 'erro') current.erros += 1;

      current.successRate =
        current.total > 0 ? Math.round((current.enviados / current.total) * 100) : 0;

      current.errorRate =
        current.total > 0 ? Math.round((current.erros / current.total) * 100) : 0;

      current.classification = classifyTemplate(current.successRate);
      current.action = getTemplateAction(current.successRate);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return b.total - a.total;
    });
  }, [filteredLogs]);

  const rankedBySuccess = useMemo(() => {
    return [...campaignStats].sort((a, b) => {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return b.total - a.total;
    });
  }, [campaignStats]);

  const rankedByVolume = useMemo(() => {
    return [...campaignStats].sort((a, b) => b.total - a.total);
  }, [campaignStats]);

  const rankedByError = useMemo(() => {
    return [...campaignStats].sort((a, b) => {
      if (b.errorRate !== a.errorRate) return b.errorRate - a.errorRate;
      return b.erros - a.erros;
    });
  }, [campaignStats]);

  const rankedTemplatesBySuccess = useMemo(() => {
    return [...templateStats].sort((a, b) => {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return b.total - a.total;
    });
  }, [templateStats]);

  const rankedTemplatesByVolume = useMemo(() => {
    return [...templateStats].sort((a, b) => b.total - a.total);
  }, [templateStats]);

  const rankedTemplatesByError = useMemo(() => {
    return [...templateStats].sort((a, b) => {
      if (b.errorRate !== a.errorRate) return b.errorRate - a.errorRate;
      return b.erros - a.erros;
    });
  }, [templateStats]);

  const bestCampaign = rankedBySuccess[0] || null;
  const biggestCampaign = rankedByVolume[0] || null;
  const worstCampaign = rankedByError[0] || null;

  const bestTemplate = rankedTemplatesBySuccess[0] || null;
  const mostUsedTemplate = rankedTemplatesByVolume[0] || null;
  const worstTemplate = rankedTemplatesByError[0] || null;

  const totalEnviados = filteredLogs.filter((item) => item.status === 'enviado').length;
  const totalErros = filteredLogs.filter((item) => item.status === 'erro').length;
  const totalGeral = filteredLogs.length;
  const taxaSucesso = totalGeral > 0 ? Math.round((totalEnviados / totalGeral) * 100) : 0;
  const maxChartValue = Math.max(...campaignStats.map((item) => item.total), 1);

  const totalEscalar = campaignStats.filter((item) => item.action === 'escalar').length;
  const totalAjustar = campaignStats.filter((item) => item.action === 'ajustar').length;
  const totalPausar = campaignStats.filter((item) => item.action === 'pausar').length;

  const totalTemplatesUsar = templateStats.filter((item) => item.action === 'usar').length;
  const totalTemplatesTestar = templateStats.filter((item) => item.action === 'testar').length;
  const totalTemplatesEvitar = templateStats.filter((item) => item.action === 'evitar').length;

  function exportCsv() {
    if (!filteredLogs.length) return;

    const headers = [
      'Data',
      'Campanha',
      'Nome',
      'Telefone',
      'Empresa',
      'Template',
      'Status',
      'Mensagem',
      'Erro',
    ];

    const csvRows = filteredLogs.map((item) => [
      formatDateTime(item.created_at),
      item.campaign_name || '',
      item.nome || '',
      item.telefone || '',
      item.empresa || '',
      item.template_key || '',
      item.status || '',
      item.message_text || '',
      item.error_message || '',
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const stamp = new Date().toISOString().slice(0, 10);
    const campaignSlug = campaignFilter
      ? campaignFilter
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .toLowerCase()
      : 'todas-campanhas';

    link.href = url;
    link.setAttribute('download', `historico-disparos-${campaignSlug}-${stamp}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function renderRankList(items: CampaignStat[], type: 'success' | 'volume' | 'error') {
    if (items.length === 0) {
      return <div style={styles.emptyMini}>Sem campanhas no filtro atual.</div>;
    }

    return (
      <div style={styles.rankList}>
        {items.slice(0, 5).map((item, index) => (
          <div key={`${type}-${item.campaign}`} style={styles.rankRow}>
            <span style={styles.rankPosition}>{index + 1}</span>

            <div style={styles.rankInfo}>
              <strong style={styles.rankCampaign}>{item.campaign}</strong>
              <span style={styles.rankMeta}>
                Total: {item.total} · Enviados: {item.enviados} · Erros: {item.erros}
              </span>
              <span
                style={{
                  ...styles.actionInlineBadge,
                  ...getActionBadgeStyle(item.action),
                }}
              >
                IA: {getActionLabel(item.action)}
              </span>
            </div>

            <strong
              style={{
                ...styles.rankValue,
                color:
                  type === 'error'
                    ? '#991B1B'
                    : type === 'success'
                    ? '#166534'
                    : '#123C73',
              }}
            >
              {type === 'volume'
                ? item.total
                : type === 'error'
                ? `${item.errorRate}%`
                : `${item.successRate}%`}
            </strong>
          </div>
        ))}
      </div>
    );
  }

  function renderTemplateRankList(items: TemplateStat[], type: 'success' | 'volume' | 'error') {
    if (items.length === 0) {
      return <div style={styles.emptyMini}>Sem templates no filtro atual.</div>;
    }

    return (
      <div style={styles.rankList}>
        {items.slice(0, 5).map((item, index) => (
          <div key={`${type}-${item.template}`} style={styles.rankRow}>
            <span style={styles.rankPosition}>{index + 1}</span>

            <div style={styles.rankInfo}>
              <strong style={styles.rankCampaign}>{item.template}</strong>
              <span style={styles.rankMeta}>
                Total: {item.total} · Enviados: {item.enviados} · Erros: {item.erros}
              </span>
              <span
                style={{
                  ...styles.actionInlineBadge,
                  ...getTemplateActionBadgeStyle(item.action),
                }}
                title={getTemplateActionDescription(item.action)}
              >
                IA: {getTemplateActionLabel(item.action)}
              </span>
            </div>

            <strong
              style={{
                ...styles.rankValue,
                color:
                  type === 'error'
                    ? '#991B1B'
                    : type === 'success'
                    ? '#166534'
                    : '#123C73',
              }}
            >
              {type === 'volume'
                ? item.total
                : type === 'error'
                ? `${item.errorRate}%`
                : `${item.successRate}%`}
            </strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Histórico de Disparos</h1>
          <p style={styles.subtitle}>
            Painel gerencial dos disparos por campanha, status e resultado.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => void loadLogs()}
            disabled={loading}
            style={{
              ...styles.refreshButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>

          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredLogs.length === 0}
            style={{
              ...styles.exportButton,
              opacity: filteredLogs.length === 0 ? 0.7 : 1,
              cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {loadError ? (
        <div style={styles.errorBox}>Erro ao carregar histórico: {loadError}</div>
      ) : null}

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Total filtrado</span>
          <strong style={styles.summaryValue}>{totalGeral}</strong>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Enviados</span>
          <strong style={styles.summaryValue}>{totalEnviados}</strong>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Erros</span>
          <strong style={styles.summaryValue}>{totalErros}</strong>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Taxa de sucesso</span>
          <strong style={styles.summaryValue}>{taxaSucesso}%</strong>
        </div>
      </div>

      <div style={styles.aiDecisionGrid}>
        <div style={styles.aiDecisionCard}>
          <span style={styles.aiDecisionLabel}>IA recomenda escalar</span>
          <strong style={styles.aiDecisionValue}>{totalEscalar}</strong>
          <span style={styles.aiDecisionHint}>Campanhas boas, com taxa de sucesso a partir de 80%.</span>
        </div>

        <div style={styles.aiDecisionCard}>
          <span style={styles.aiDecisionLabelAdjust}>IA recomenda ajustar</span>
          <strong style={styles.aiDecisionValue}>{totalAjustar}</strong>
          <span style={styles.aiDecisionHint}>Campanhas médias, entre 50% e 79% de sucesso.</span>
        </div>

        <div style={styles.aiDecisionCardDanger}>
          <span style={styles.aiDecisionLabelDanger}>IA recomenda pausar</span>
          <strong style={styles.aiDecisionValueDanger}>{totalPausar}</strong>
          <span style={styles.aiDecisionHintDanger}>Campanhas ruins, abaixo de 50% de sucesso.</span>
        </div>
      </div>

      <div style={styles.filtersCard}>
        <input
          placeholder="Buscar por nome, telefone, campanha ou template"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'todos' | 'enviado' | 'erro')}
          style={styles.input}
        >
          <option value="todos">Todos os status</option>
          <option value="enviado">Enviado</option>
          <option value="erro">Erro</option>
        </select>

        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          style={styles.input}
        >
          <option value="">Todas campanhas</option>
          {campaignOptions.map((campaign) => (
            <option key={campaign} value={campaign}>
              {campaign}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={styles.input}
        />

        <button
          type="button"
          onClick={() => {
            setSearch('');
            setStatusFilter('todos');
            setCampaignFilter('');
            setDateFilter('');
          }}
          style={styles.clearButton}
        >
          Limpar filtros
        </button>
      </div>

      <h2 style={styles.sectionTitle}>Gráfico de volume por campanha</h2>

      <div style={styles.chartCard}>
        {campaignStats.length === 0 ? (
          <div style={styles.emptyMini}>Sem dados para gráfico no filtro atual.</div>
        ) : (
          <div style={styles.chartScroll}>
            <div style={styles.chartArea}>
              {campaignStats.map((item) => {
                const height = Math.max((item.total / maxChartValue) * 100, 8);

                return (
                  <div key={`chart-${item.campaign}`} style={styles.barWrapper}>
                    <div style={styles.barTrack}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${height}%`,
                          background: getChartColor(item.classification),
                        }}
                        title={`${item.campaign}: ${item.total}`}
                      />
                    </div>

                    <strong style={styles.barValue}>{item.total}</strong>
                    <span style={styles.barLabel}>{item.campaign}</span>

                    <span
                      style={{
                        ...styles.classificationMiniBadge,
                        ...getClassificationBadgeStyle(item.classification),
                      }}
                    >
                      {getClassificationLabel(item.classification)}
                    </span>

                    <span
                      style={{
                        ...styles.actionMiniBadge,
                        ...getActionBadgeStyle(item.action),
                      }}
                      title={getActionDescription(item.action)}
                    >
                      {getActionLabel(item.action)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <h2 style={styles.sectionTitle}>Ranking de campanhas</h2>

      <div style={styles.rankingHighlights}>
        <div style={styles.rankingHighlightCard}>
          <span style={styles.rankingLabel}>Melhor taxa de sucesso</span>
          <strong style={styles.rankingMain}>
            {bestCampaign ? bestCampaign.campaign : '-'}
          </strong>
          <span style={styles.rankingSub}>
            {bestCampaign
              ? `${bestCampaign.successRate}% de sucesso · ${bestCampaign.total} registros · IA: ${getActionLabel(bestCampaign.action)}`
              : 'Sem dados'}
          </span>
        </div>

        <div style={styles.rankingHighlightCard}>
          <span style={styles.rankingLabel}>Maior volume</span>
          <strong style={styles.rankingMain}>
            {biggestCampaign ? biggestCampaign.campaign : '-'}
          </strong>
          <span style={styles.rankingSub}>
            {biggestCampaign
              ? `${biggestCampaign.total} registros · ${biggestCampaign.enviados} enviados · IA: ${getActionLabel(biggestCampaign.action)}`
              : 'Sem dados'}
          </span>
        </div>

        <div style={styles.rankingHighlightCardDanger}>
          <span style={styles.rankingLabelDanger}>Maior índice de erro</span>
          <strong style={styles.rankingMainDanger}>
            {worstCampaign ? worstCampaign.campaign : '-'}
          </strong>
          <span style={styles.rankingSubDanger}>
            {worstCampaign
              ? `${worstCampaign.errorRate}% de erro · ${worstCampaign.erros} erros · IA: ${getActionLabel(worstCampaign.action)}`
              : 'Sem dados'}
          </span>
        </div>
      </div>

      <div style={styles.rankingGrid}>
        <div style={styles.rankingCard}>
          <h3 style={styles.rankingTitle}>Top campanhas por sucesso</h3>
          {renderRankList(rankedBySuccess, 'success')}
        </div>

        <div style={styles.rankingCard}>
          <h3 style={styles.rankingTitle}>Top campanhas por volume</h3>
          {renderRankList(rankedByVolume, 'volume')}
        </div>

        <div style={styles.rankingCard}>
          <h3 style={styles.rankingTitle}>Campanhas com mais erro</h3>
          {renderRankList(rankedByError, 'error')}
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Ranking de templates</h2>

      <div style={styles.templateDecisionGrid}>
        <div style={styles.templateDecisionCard}>
          <span style={styles.aiDecisionLabel}>IA recomenda usar</span>
          <strong style={styles.aiDecisionValue}>{totalTemplatesUsar}</strong>
          <span style={styles.aiDecisionHint}>Templates bons, com taxa de sucesso a partir de 80%.</span>
        </div>

        <div style={styles.templateDecisionCard}>
          <span style={styles.aiDecisionLabelAdjust}>IA recomenda testar</span>
          <strong style={styles.aiDecisionValue}>{totalTemplatesTestar}</strong>
          <span style={styles.aiDecisionHint}>Templates médios, entre 50% e 79% de sucesso.</span>
        </div>

        <div style={styles.templateDecisionCardDanger}>
          <span style={styles.aiDecisionLabelDanger}>IA recomenda evitar</span>
          <strong style={styles.aiDecisionValueDanger}>{totalTemplatesEvitar}</strong>
          <span style={styles.aiDecisionHintDanger}>Templates ruins, abaixo de 50% de sucesso.</span>
        </div>
      </div>

      <div style={styles.rankingHighlights}>
        <div style={styles.rankingHighlightCard}>
          <span style={styles.rankingLabel}>Melhor template</span>
          <strong style={styles.rankingMain}>
            {bestTemplate ? bestTemplate.template : '-'}
          </strong>
          <span style={styles.rankingSub}>
            {bestTemplate
              ? `${bestTemplate.successRate}% de sucesso · ${bestTemplate.total} registros · IA: ${getTemplateActionLabel(bestTemplate.action)}`
              : 'Sem dados'}
          </span>
        </div>

        <div style={styles.rankingHighlightCard}>
          <span style={styles.rankingLabel}>Template mais usado</span>
          <strong style={styles.rankingMain}>
            {mostUsedTemplate ? mostUsedTemplate.template : '-'}
          </strong>
          <span style={styles.rankingSub}>
            {mostUsedTemplate
              ? `${mostUsedTemplate.total} registros · ${mostUsedTemplate.enviados} enviados · IA: ${getTemplateActionLabel(mostUsedTemplate.action)}`
              : 'Sem dados'}
          </span>
        </div>

        <div style={styles.rankingHighlightCardDanger}>
          <span style={styles.rankingLabelDanger}>Template com mais erro</span>
          <strong style={styles.rankingMainDanger}>
            {worstTemplate ? worstTemplate.template : '-'}
          </strong>
          <span style={styles.rankingSubDanger}>
            {worstTemplate
              ? `${worstTemplate.errorRate}% de erro · ${worstTemplate.erros} erros · IA: ${getTemplateActionLabel(worstTemplate.action)}`
              : 'Sem dados'}
          </span>
        </div>
      </div>

      <div style={styles.rankingGrid}>
        <div style={styles.rankingCard}>
          <h3 style={styles.rankingTitle}>Top templates por sucesso</h3>
          {renderTemplateRankList(rankedTemplatesBySuccess, 'success')}
        </div>

        <div style={styles.rankingCard}>
          <h3 style={styles.rankingTitle}>Top templates por volume</h3>
          {renderTemplateRankList(rankedTemplatesByVolume, 'volume')}
        </div>

        <div style={styles.rankingCard}>
          <h3 style={styles.rankingTitle}>Templates com mais erro</h3>
          {renderTemplateRankList(rankedTemplatesByError, 'error')}
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Desempenho por campanha</h2>

      <div style={styles.campaignGrid}>
        {campaignStats.length === 0 ? (
          <div style={styles.emptyState}>Nenhuma campanha encontrada.</div>
        ) : (
          campaignStats.map((campaign) => (
            <div key={campaign.campaign} style={styles.campaignCard}>
              <div style={styles.campaignHeader}>
                <strong style={styles.campaignTitle}>{campaign.campaign}</strong>

                <div style={styles.badgeGroup}>
                  <span
                    style={{
                      ...styles.classificationBadge,
                      ...getClassificationBadgeStyle(campaign.classification),
                    }}
                  >
                    {getClassificationLabel(campaign.classification)}
                  </span>

                  <span
                    style={{
                      ...styles.actionBadge,
                      ...getActionBadgeStyle(campaign.action),
                    }}
                    title={getActionDescription(campaign.action)}
                  >
                    {getActionLabel(campaign.action)}
                  </span>
                </div>
              </div>

              <div style={styles.campaignStats}>
                <span>Total: {campaign.total}</span>
                <span>Enviados: {campaign.enviados}</span>
                <span>Erros: {campaign.erros}</span>
                <span>Sucesso: {campaign.successRate}%</span>
                <span>Erro: {campaign.errorRate}%</span>
              </div>

              <div style={styles.aiRecommendationBox}>
                <strong style={styles.aiRecommendationTitle}>Decisão da IA</strong>
                <span style={styles.aiRecommendationText}>
                  {getActionDescription(campaign.action)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <h2 style={styles.sectionTitle}>Desempenho por template</h2>

      <div style={styles.campaignGrid}>
        {templateStats.length === 0 ? (
          <div style={styles.emptyState}>Nenhum template encontrado.</div>
        ) : (
          templateStats.map((template) => (
            <div key={template.template} style={styles.campaignCard}>
              <div style={styles.campaignHeader}>
                <strong style={styles.campaignTitle}>{template.template}</strong>

                <div style={styles.badgeGroup}>
                  <span
                    style={{
                      ...styles.classificationBadge,
                      ...getTemplateClassificationBadgeStyle(template.classification),
                    }}
                  >
                    {getTemplateClassificationLabel(template.classification)}
                  </span>

                  <span
                    style={{
                      ...styles.actionBadge,
                      ...getTemplateActionBadgeStyle(template.action),
                    }}
                    title={getTemplateActionDescription(template.action)}
                  >
                    {getTemplateActionLabel(template.action)}
                  </span>
                </div>
              </div>

              <div style={styles.campaignStats}>
                <span>Total: {template.total}</span>
                <span>Enviados: {template.enviados}</span>
                <span>Erros: {template.erros}</span>
                <span>Sucesso: {template.successRate}%</span>
                <span>Erro: {template.errorRate}%</span>
              </div>

              <div style={styles.aiRecommendationBox}>
                <strong style={styles.aiRecommendationTitle}>Decisão da IA para template</strong>
                <span style={styles.aiRecommendationText}>
                  {getTemplateActionDescription(template.action)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <h2 style={styles.sectionTitle}>Registros detalhados</h2>

      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.emptyState}>Carregando histórico...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={styles.emptyState}>Nenhum registro encontrado.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Campanha</th>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>Telefone</th>
                  <th style={styles.th}>Empresa</th>
                  <th style={styles.th}>Template</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Erro</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                    <td style={styles.td}>{item.campaign_name || '-'}</td>
                    <td style={styles.td}>{item.nome || '-'}</td>
                    <td style={styles.td}>{formatPhone(item.telefone)}</td>
                    <td style={styles.td}>{item.empresa || '-'}</td>
                    <td style={styles.td}>{item.template_key || '-'}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(item.status === 'erro' ? styles.statusError : styles.statusSent),
                        }}
                      >
                        {item.status || '-'}
                      </span>
                    </td>
                    <td style={styles.td}>{item.error_message || '-'}</td>
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

const styles: Record<string, CSSProperties> = {
  page: {
    padding: 24,
    background: '#f4f7fb',
    minHeight: '100%',
    color: '#0f172a',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    color: '#64748b',
  },
  refreshButton: {
    background: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontWeight: 700,
  },
  exportButton: {
    background: '#16A34A',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontWeight: 700,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: 16,
    padding: 18,
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  summaryLabel: {
    display: 'block',
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    color: '#0f172a',
  },
  aiDecisionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 20,
  },
  aiDecisionCard: {
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #bbf7d0',
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  aiDecisionCardDanger: {
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #fecaca',
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  templateDecisionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 20,
  },
  templateDecisionCard: {
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #bbf7d0',
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  templateDecisionCardDanger: {
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #fecaca',
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  aiDecisionLabel: {
    display: 'block',
    fontSize: 12,
    color: '#166534',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  aiDecisionLabelAdjust: {
    display: 'block',
    fontSize: 12,
    color: '#854d0e',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  aiDecisionLabelDanger: {
    display: 'block',
    fontSize: 12,
    color: '#991b1b',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  aiDecisionValue: {
    display: 'block',
    fontSize: 28,
    color: '#0f172a',
    marginBottom: 8,
  },
  aiDecisionValueDanger: {
    display: 'block',
    fontSize: 28,
    color: '#991b1b',
    marginBottom: 8,
  },
  aiDecisionHint: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 1.45,
  },
  aiDecisionHintDanger: {
    color: '#7f1d1d',
    fontSize: 13,
    lineHeight: 1.45,
  },
  filtersCard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 12,
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: 16,
    padding: 18,
    border: '1px solid #e2e8f0',
    marginBottom: 24,
  },
  input: {
    height: 42,
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    padding: '0 12px',
    color: '#0f172a',
    background: '#ffffff',
  },
  clearButton: {
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 700,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 20,
    color: '#0f172a',
  },
  chartCard: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
    marginBottom: 24,
  },
  chartScroll: {
    width: '100%',
    overflowX: 'auto',
  },
  chartArea: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 16,
    height: 310,
    minWidth: 600,
    padding: '12px 8px 4px',
  },
  barWrapper: {
    width: 95,
    minWidth: 95,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  barTrack: {
    height: 180,
    width: 44,
    background: '#e2e8f0',
    borderRadius: 999,
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 999,
  },
  barValue: {
    fontSize: 13,
    color: '#0f172a',
  },
  barLabel: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 95,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  classificationMiniBadge: {
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
  },
  actionMiniBadge: {
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.3,
  },
  rankingHighlights: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 14,
    marginBottom: 16,
  },
  rankingHighlightCard: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #bbf7d0',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  rankingHighlightCardDanger: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #fecaca',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  rankingLabel: {
    display: 'block',
    fontSize: 12,
    color: '#166534',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rankingLabelDanger: {
    display: 'block',
    fontSize: 12,
    color: '#991b1b',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rankingMain: {
    display: 'block',
    fontSize: 18,
    color: '#0f172a',
    marginBottom: 8,
  },
  rankingMainDanger: {
    display: 'block',
    fontSize: 18,
    color: '#991b1b',
    marginBottom: 8,
  },
  rankingSub: {
    color: '#475569',
    fontSize: 14,
  },
  rankingSubDanger: {
    color: '#7f1d1d',
    fontSize: 14,
  },
  rankingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 14,
    marginBottom: 24,
  },
  rankingCard: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  rankingTitle: {
    margin: 0,
    marginBottom: 12,
    color: '#123C73',
    fontSize: 16,
  },
  rankList: {
    display: 'grid',
    gap: 10,
  },
  rankRow: {
    display: 'grid',
    gridTemplateColumns: '32px 1fr auto',
    gap: 10,
    alignItems: 'center',
    padding: 10,
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    background: '#f8fafc',
    color: '#0f172a',
  },
  rankPosition: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: '#0f172a',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 13,
  },
  rankInfo: {
    display: 'grid',
    gap: 3,
  },
  rankCampaign: {
    color: '#0f172a',
    fontSize: 14,
  },
  rankMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  rankValue: {
    fontSize: 16,
    whiteSpace: 'nowrap',
  },
  actionInlineBadge: {
    display: 'inline-flex',
    width: 'fit-content',
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.3,
  },
  emptyMini: {
    color: '#64748b',
    fontSize: 14,
    padding: 10,
    background: '#f8fafc',
    borderRadius: 12,
  },
  campaignGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 14,
    marginBottom: 24,
  },
  campaignCard: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  campaignHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  campaignTitle: {
    display: 'block',
    fontSize: 16,
    color: '#123C73',
  },
  badgeGroup: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  classificationBadge: {
    padding: '5px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  actionBadge: {
    padding: '5px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    letterSpacing: 0.3,
  },
  campaignStats: {
    display: 'grid',
    gap: 6,
    color: '#334155',
    fontSize: 14,
  },
  aiRecommendationBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    display: 'grid',
    gap: 4,
  },
  aiRecommendationTitle: {
    color: '#123C73',
    fontSize: 13,
  },
  aiRecommendationText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 1.45,
  },
  tableCard: {
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: 16,
    padding: 18,
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(15,23,42,.06)',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    minWidth: 1100,
    borderCollapse: 'collapse',
    color: '#0f172a',
  },
  th: {
    textAlign: 'left',
    padding: 12,
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    color: '#334155',
    fontSize: 13,
  },
  td: {
    padding: 12,
    borderBottom: '1px solid #e2e8f0',
    color: '#0f172a',
    fontSize: 14,
    verticalAlign: 'top',
  },
  statusBadge: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  statusSent: {
    background: '#dcfce7',
    color: '#166534',
  },
  statusError: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  emptyState: {
    padding: 24,
    textAlign: 'center',
    color: '#64748b',
    background: '#ffffff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
  },
  errorBox: {
    padding: 12,
    background: '#fef2f2',
    color: '#991b1b',
    borderRadius: 12,
    border: '1px solid #fecaca',
    marginBottom: 16,
  },
};