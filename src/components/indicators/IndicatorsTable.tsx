import type { Indicator } from '../../types/indicator';

type Props = {
  indicators: Indicator[];
  loading?: boolean;
};

export default function IndicatorsTable({ indicators, loading }: Props) {
  async function copyLink(slug: string) {
    const url = `${window.location.origin}/indique?ref=${slug}`;
    await navigator.clipboard.writeText(url);
    alert('Link copiado com sucesso.');
  }

  if (loading) {
    return <div style={{ padding: 20, color: '#0F172A' }}>Carregando indicadores...</div>;
  }

  return (
    <div
      style={{
        marginTop: 24,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 24,
        padding: 20,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        overflowX: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#0F172A' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#123C73' }}>
            <th style={{ padding: '12px 8px' }}>Nome</th>
            <th style={{ padding: '12px 8px' }}>E-mail</th>
            <th style={{ padding: '12px 8px' }}>Telefone</th>
            <th style={{ padding: '12px 8px' }}>Status</th>
            <th style={{ padding: '12px 8px' }}>Slug</th>
            <th style={{ padding: '12px 8px' }}>Ações</th>
          </tr>
        </thead>

        <tbody>
          {indicators.map((indicator) => (
            <tr key={indicator.id} style={{ borderTop: '1px solid #E2E8F0', color: '#0F172A' }}>
              <td style={{ padding: '12px 8px', color: '#0F172A' }}>{indicator.full_name}</td>
              <td style={{ padding: '12px 8px', color: '#0F172A' }}>{indicator.email}</td>
              <td style={{ padding: '12px 8px', color: '#0F172A' }}>
                {indicator.phone || indicator.whatsapp || '-'}
              </td>
              <td style={{ padding: '12px 8px', color: '#0F172A' }}>{indicator.status}</td>
              <td style={{ padding: '12px 8px', color: '#0F172A' }}>{indicator.slug}</td>
              <td style={{ padding: '12px 8px' }}>
                <button
                  onClick={() => copyLink(indicator.slug)}
                  style={{
                    background: '#123C73',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  Copiar link
                </button>
              </td>
            </tr>
          ))}

          {indicators.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, color: '#64748B' }}>
                Nenhum indicador cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}