import type { CompanySearchResult } from '../types';

export interface CompanySearchProvider {
  searchByName(query: string): Promise<CompanySearchResult>;
}
