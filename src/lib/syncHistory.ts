export interface SyncHistoryEntry {
  id: string;
  timestamp: number;
  type: 'success' | 'failure' | 'partial';
  syncedCount: number;
  failedCount: number;
  details?: string;
}

const STORAGE_KEY = 'sync-history';
const MAX_HISTORY_ENTRIES = 50;

export const syncHistory = {
  async getHistory(): Promise<SyncHistoryEntry[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async addEntry(entry: Omit<SyncHistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    const history = await this.getHistory();
    const newEntry: SyncHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    // Add to beginning and limit size
    history.unshift(newEntry);
    const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent('sync-history-updated'));
  },

  async clearHistory(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('sync-history-updated'));
  },
};
