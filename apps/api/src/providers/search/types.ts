import type { SearchResult } from '@resumeradar/shared';
import type { JobProfile } from '@resumeradar/shared';

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
  getDetails?(url: string): Promise<Partial<JobProfile> | null>;
}
