interface AppHeaderProps {
  userEmail: string;
  onRefresh: () => void;
  onExport: () => void;
  onLogout: () => void;
  loading: boolean;
}

export function AppHeader({ userEmail, onRefresh, onExport, onLogout, loading }: AppHeaderProps) {
  return (
    <header className="app-header glass-card">
      <div>
        <span className="eyebrow">NUMON CRM</span>
        <h1>Operação comercial</h1>
        <p>{userEmail}</p>
      </div>

      <div className="header-actions">
        <button className="ghost-button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
        <button className="ghost-button" onClick={onExport}>
          Exportar CSV
        </button>
        <button className="danger-button" onClick={onLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}
