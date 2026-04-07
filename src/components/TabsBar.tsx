import type { TabKey } from '../types';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'base', label: 'Base' },
  { key: 'funil', label: 'Funil' },
];

interface TabsBarProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

export function TabsBar({ activeTab, onChange }: TabsBarProps) {
  return (
    <nav className="tabs-bar glass-card">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={tab.key === activeTab ? 'tab-button active' : 'tab-button'}
          onClick={() => onChange(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
