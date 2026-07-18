import type { SearchHistoryEntry, SearchScope } from "@/types/models";

// ---------------------------------------------------------------------------
// Search architecture.
//
// A minimal pluggable client the whole app searches through. The current
// implementation is a stub — it always returns an empty result set and
// stores history in memory. Swap `defaultSearchClient` for a backend-backed
// implementation later without changing consumers.
// ---------------------------------------------------------------------------

export interface SearchQuery {
  term: string;
  scope: SearchScope;
  locale?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResultItem {
  id: string;
  scope: SearchScope;
  titleKey: string;
  href: string;
  score: number;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  tookMs: number;
}

export interface SearchClient {
  search(query: SearchQuery): Promise<SearchResult>;
  recordHistory(entry: Omit<SearchHistoryEntry, "id" | "createdAt">): Promise<void>;
  listHistory(userId: string | null): Promise<SearchHistoryEntry[]>;
}

class InMemorySearchClient implements SearchClient {
  private history: SearchHistoryEntry[] = [];

  async search(_query: SearchQuery): Promise<SearchResult> {
    return { items: [], total: 0, tookMs: 0 };
  }

  async recordHistory(entry: Omit<SearchHistoryEntry, "id" | "createdAt">) {
    this.history = [
      {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
      ...this.history,
    ].slice(0, 50);
  }

  async listHistory(userId: string | null) {
    return this.history.filter((entry) => entry.userId === userId);
  }
}

export const defaultSearchClient: SearchClient = new InMemorySearchClient();