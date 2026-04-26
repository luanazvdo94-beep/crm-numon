import type { EnrichedCompanyProfile } from '../types';
import { searchCompanyDirectory } from '../services/companyDirectoryService';

export async function searchCompaniesByName(query: string): Promise<EnrichedCompanyProfile[]> {
  const result = await searchCompanyDirectory(query);
  return result.companies;
}

export function isSelectedCompanyInputDirty(query: string, selectedCompany: EnrichedCompanyProfile | null) {
  if (!selectedCompany) return false;
  return normalizeCompanySearch(query) !== normalizeCompanySearch(selectedCompany.nomeFantasia);
}

function normalizeCompanySearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
