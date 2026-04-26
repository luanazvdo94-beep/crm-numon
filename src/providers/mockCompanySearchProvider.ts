import { MOCK_COMPANIES } from '../data/mockCompanies';
import type { CompanySearchResult } from '../types';
import type { CompanySearchProvider } from './companySearchProvider';

const MAX_COMPANY_SUGGESTIONS = 6;

export const mockCompanySearchProvider: CompanySearchProvider = {
  async searchByName(query: string): Promise<CompanySearchResult> {
    const normalizedQuery = normalizeCompanySearch(query);

    if (normalizedQuery.length < 2) {
      return {
        companies: [],
        source: 'mock',
        status: 'idle',
      };
    }

    const companies = MOCK_COMPANIES.filter((company) => {
      const companyText = normalizeCompanySearch(
        `${company.nomeFantasia} ${company.razaoSocial} ${company.cnpj}`,
      );

      return companyText.includes(normalizedQuery);
    }).slice(0, MAX_COMPANY_SUGGESTIONS);

    return {
      companies,
      source: 'mock',
      status: companies.length > 0 ? 'success' : 'empty',
    };
  },
};

function normalizeCompanySearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
