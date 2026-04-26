import type { EligibleCltBank } from '../types';

const MAX_BANKS_IN_MESSAGE = 3;

export function generateCltCustomerMessage(banks: EligibleCltBank[]) {
  const topBanks = banks.slice(0, MAX_BANKS_IN_MESSAGE);

  if (topBanks.length === 0) {
    return '';
  }

  const bankList = topBanks.map((bank, index) => `${index + 1}. ${bank.name}`).join('\n');

  return `Analisei seu perfil e identifiquei estas opções com maior chance de liberação no momento:

${bankList}

Essas são as alternativas mais promissoras para seguir com a simulação agora.

Se quiser, eu posso verificar neste momento qual delas tende a liberar o melhor valor para você.`;
}
