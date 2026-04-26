import type { LeadRecord } from '../types';
import { formatCpf, formatPhone } from '../utils';

interface BaseTableProps {
  leads: LeadRecord[];
  search: string;
  onSearch: (value: string) => void;
  onEdit: (lead: LeadRecord) => void;
  onDelete: (lead: LeadRecord) => void;
}

export function BaseTable({ leads, search, onSearch, onEdit, onDelete }: BaseTableProps) {
  return (
    <section className="panel glass-card">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Base</span>
          <h2>Leads cadastrados</h2>
        </div>
        <div className="badge">{leads.length} registros</div>
      </div>

      <div className="table-toolbar">
        <input
          className="search-input"
          placeholder="Buscar por nome, telefone, produto, empresa..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Produto</th>
              <th>Status</th>
              <th>Etapa</th>
              <th>Atualizado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Nenhum lead encontrado.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.nome}</strong>
                    <div className="muted-row">{lead.empresa ?? 'Sem empresa'}</div>
                  </td>
                  <td>
                    <div>{lead.telefone ? formatPhone(lead.telefone) : '—'}</div>
                    <div className="muted-row">{lead.cpf ? formatCpf(lead.cpf) : lead.email ?? '—'}</div>
                  </td>
                  <td>{lead.produto ?? '—'}</td>
                  <td>{lead.status}</td>
                  <td>{lead.etapa}</td>
                  <td>{new Date(lead.updated_at).toLocaleString('pt-BR')}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="small"
                        onClick={() => onEdit(lead)}
                        style={{
                          background: '#FACC15',
                          color: '#000000',
                          border: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="small"
                        onClick={() => onDelete(lead)}
                        style={{
                          background: '#EF4444',
                          color: '#000000',
                          border: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}