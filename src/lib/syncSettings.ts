const SETTINGS_KEY = 'sync-settings';

export interface SyncSettings {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_SETTINGS: SyncSettings = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
};

export const syncSettings = {
  getSettings(): SyncSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load sync settings:', error);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: Partial<SyncSettings>): void {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('sync-settings-updated'));
    } catch (error) {
      console.error('Failed to save sync settings:', error);
    }
  },

  resetToDefaults(): void {
    localStorage.removeItem(SETTINGS_KEY);
    window.dispatchEvent(new CustomEvent('sync-settings-updated'));
  },

  getDefaults(): SyncSettings {
    return { ...DEFAULT_SETTINGS };
  },
};
