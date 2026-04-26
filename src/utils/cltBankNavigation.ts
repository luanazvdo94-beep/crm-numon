import { CLT_BANK_DESTINATIONS } from '../data/cltBankDestinations';
import type { CltBankDestination, EligibleCltBank } from '../types';

export function getCltBankDestination(bankId: string): CltBankDestination | null {
  return CLT_BANK_DESTINATIONS[bankId] ?? null;
}

export function openCltBankDestination(bank: EligibleCltBank) {
  const destination = getCltBankDestination(bank.id);
  if (!destination) {
    return;
  }

  if (destination.destinationType === 'external_url') {
    window.open(destination.destinationValue, '_blank', 'noopener,noreferrer');
  }
}
