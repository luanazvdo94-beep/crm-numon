import { getCltBankLogoConfig } from '../data/cltBankLogos';

interface BankLogoProps {
  bankId: string;
  bankName: string;
}

export function BankLogo({ bankId, bankName }: BankLogoProps) {
  const logo = getCltBankLogoConfig(bankId);

  if (logo.assetPath) {
    return (
      <div className={`bank-logo ${logo.accentClassName}`}>
        <img className="bank-logo-image" src={logo.assetPath} alt={`Logo ${bankName}`} />
      </div>
    );
  }

  return (
    <div className={`bank-logo ${logo.accentClassName}`} aria-label={`Logo temporario ${bankName}`} role="img">
      <span className="bank-logo-fallback">{logo.fallbackLabel}</span>
    </div>
  );
}
