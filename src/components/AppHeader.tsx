interface AppHeaderProps {
  userEmail: string;
  onRefresh: () => void;
  onExport: () => void;
  onLogout: () => void;
  loading: boolean;
}

const CRM_LOGO_SRC = '/oncrm-logo.png';

export function AppHeader({ userEmail, onRefresh, onExport, onLogout, loading }: AppHeaderProps) {
  return (
    <header className="app-header glass-card">
      <div className="app-header-brand" aria-label="ON CRM">
        <img
          className="app-header-logo"
          src={CRM_LOGO_SRC}
          alt="ON CRM"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />

        <div className="app-header-logo-fallback">
          <strong>ON</strong>
          <span>CRM</span>
        </div>
      </div>

      <div className="app-header-right">
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

        <p className="logged-user" title={userEmail}>
          {userEmail}
        </p>
      </div>
    </header>
  );
}
