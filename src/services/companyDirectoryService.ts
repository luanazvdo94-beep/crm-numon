import type { CompanySearchResult } from '../types';
import type { CompanySearchProvider } from '../providers/companySearchProvider';
import { mockCompanySearchProvider } from '../providers/mockCompanySearchProvider';

const activeCompanySearchProvider: CompanySearchProvider = mockCompanySearchProvider;

export async function searchCompanyDirectory(query: string): Promise<CompanySearchResult> {
  // Ponto de extensao para integrar provider externo real de empresa/CNPJ.
  // Quando a integracao estiver pronta, substituir o provider ativo por uma
  // composicao com fallback para mock sem alterar o componente visual.
  return activeCompanySearchProvider.searchByName(query);
}
