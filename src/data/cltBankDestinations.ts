import type { CltBankDestination } from '../types';

// Destinos operacionais por banco. Atualize destinationValue apenas quando
// houver mudança oficial no fluxo de acesso de cada parceiro.
export const CLT_BANK_DESTINATIONS: Record<string, CltBankDestination> = {
  c6: {
    id: 'c6',
    name: 'C6',
    destinationType: 'external_url',
    destinationValue: 'https://c6.c6consig.com.br/WebAutorizador/Login/AC.UI.LOGIN.aspx',
  },
  zili: {
    id: 'zili',
    name: 'Zili',
    destinationType: 'external_url',
    destinationValue: 'https://consig.zilimais.com.br/login',
  },
  v8: {
    id: 'v8',
    name: 'V8',
    destinationType: 'external_url',
    destinationValue: 'https://app.v8sistema.com/signin',
  },
  agil: {
    id: 'agil',
    name: 'Agil',
    destinationType: 'external_url',
    destinationValue: 'https://correspondente.agil.com.br/login',
  },
  facta: {
    id: 'facta',
    name: 'Facta',
    destinationType: 'external_url',
    destinationValue: 'https://desenv.facta.com.br/sistemaNovo/login.php',
  },
  qualibank: {
    id: 'qualibank',
    name: 'Qualibank',
    destinationType: 'external_url',
    destinationValue: 'https://quali.joinbank.com.br/sign-in?redirectURL=%2Floans',
  },
  bmg: {
    id: 'bmg',
    name: 'BMG',
    destinationType: 'external_url',
    destinationValue: 'https://consigmais.bancobmg.com.br/identificacao',
  },
  hub: {
    id: 'hub',
    name: 'Hub',
    destinationType: 'external_url',
    destinationValue: 'https://fgts.hubcredito.com.br/#/login',
  },
  'novo-saque': {
    id: 'novo-saque',
    name: 'Novo Saque',
    destinationType: 'external_url',
    destinationValue: 'https://sistema.novosaque.com.br/login',
  },
  'sua-bank': {
    id: 'sua-bank',
    name: 'Sua Bank',
    destinationType: 'external_url',
    destinationValue: 'https://suapromotora.nossafintech.com.br/session/login',
  },
  soma: {
    id: 'soma',
    name: 'Soma',
    destinationType: 'external_url',
    destinationValue: 'https://sistema.somabp2.com.br/login',
  },
};
