import { STAGE_OPTIONS, STATUS_OPTIONS } from '../constants';
import type { LeadRecord } from '../types';

interface FunnelViewProps {
  leads: LeadRecord[];
}

export function FunnelView({ leads }: FunnelViewProps) {
  const total = leads.length;
  const byStatus = STATUS_OPTIONS.map((status) => ({
    label: status,
    count: leads.filter((lead) => lead.status === status).length,
  }));

  const byStage = STAGE_OPTIONS.map((stage) => ({
    label: stage,
    count: leads.filter((lead) => lead.etapa === stage).length,
  }));

  const closedValue = leads
    .filter((lead) => lead.status === 'Fechado')
    .reduce((sum, lead) => sum + (lead.valor_interesse ?? 0), 0);

  return (
    <section className="panel glass-card">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Funil</span>
          <h2>Visão operacional</h2>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Total de leads</span>
          <strong>{total}</strong>
        </article>
        <article className="stat-card">
          <span>Fechados</span>
          <strong>{byStatus.find((item) => item.label === 'Fechado')?.count ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Perdidos</span>
          <strong>{byStatus.find((item) => item.label === 'Perdido')?.count ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Volume fechado</span>
          <strong>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(closedValue)}
          </strong>
        </article>
      </div>

      <div className="funnel-columns">
        <div className="funnel-block">
          <h3>Por status</h3>
          {byStatus.map((item) => (
            <div key={item.label} className="metric-row">
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>

        <div className="funnel-block">
          <h3>Por etapa</h3>
          {byStage.map((item) => (
            <div key={item.label} className="metric-row">
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
