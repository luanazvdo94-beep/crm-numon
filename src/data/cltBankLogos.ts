export interface CltBankLogoConfig {
  assetPath: string | null;
  fallbackLabel: string;
  accentClassName: string;
}

// Estrutura preparada para futura troca por arquivos reais em /public/banks ou pasta equivalente.
// Enquanto os assets nao existem no projeto, o componente usa fallback visual padronizado.
export const CLT_BANK_LOGOS: Record<string, CltBankLogoConfig> = {
  c6: { assetPath: null, fallbackLabel: 'C6', accentClassName: 'accent-c6' },
  zili: { assetPath: null, fallbackLabel: 'ZI', accentClassName: 'accent-zili' },
  v8: { assetPath: null, fallbackLabel: 'V8', accentClassName: 'accent-v8' },
  agil: { assetPath: null, fallbackLabel: 'AG', accentClassName: 'accent-agil' },
  facta: { assetPath: null, fallbackLabel: 'FA', accentClassName: 'accent-facta' },
  qualibank: { assetPath: null, fallbackLabel: 'QB', accentClassName: 'accent-qualibank' },
  bmg: { assetPath: null, fallbackLabel: 'BMG', accentClassName: 'accent-bmg' },
  hub: { assetPath: null, fallbackLabel: 'HUB', accentClassName: 'accent-hub' },
  'novo-saque': { assetPath: null, fallbackLabel: 'NS', accentClassName: 'accent-novo-saque' },
  'sua-bank': { assetPath: null, fallbackLabel: 'SB', accentClassName: 'accent-sua-bank' },
  soma: { assetPath: null, fallbackLabel: 'SO', accentClassName: 'accent-soma' },
};

export function getCltBankLogoConfig(bankId: string) {
  return (
    CLT_BANK_LOGOS[bankId] ?? {
      assetPath: null,
      fallbackLabel: 'BK',
      accentClassName: 'accent-generic',
    }
  );
}
