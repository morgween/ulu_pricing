import { configAPI } from '../api/ConfigAPI.js';

/**
 * APIPersistor - Saves configuration to server via API
 * Replaces LocalStoragePersistor for live updates without file downloads
 */
export class APIPersistor {
  constructor(windowRef, store, {
    delay = 500,
    fallbackToLocalStorage = true
  } = {}) {
    this.window = windowRef;
    this.store = store;
    this.delay = delay;
    this.fallbackToLocalStorage = fallbackToLocalStorage;
    this.timer = null;
    this.isSaving = false;
    this.lastSaveTime = 0;

    // Status tracking
    this.lastError = null;
    this.saveCount = 0;
    this.errorCount = 0;

    // Initialize status indicator
    this.initStatusIndicator();
  }

  /**
   * Schedule a save operation (debounced)
   */
  schedule() {
    if (this.timer) {
      this.window.clearTimeout(this.timer);
    }
    this.timer = this.window.setTimeout(() => {
      this.timer = null;
      this.persist();
    }, this.delay);

    // Update UI to show pending save
    this.updateStatusIndicator('pending');
  }

  /**
   * Immediately flush and save
   */
  flush() {
    if (this.timer) {
      this.window.clearTimeout(this.timer);
      this.timer = null;
    }
    return this.persist();
  }

  /**
   * Persist configuration to server
   */
  async persist() {
    if (this.isSaving) {
      console.log('Save already in progress, skipping...');
      return;
    }

    this.isSaving = true;
    this.updateStatusIndicator('saving');

    try {
      // Update globals before saving
      this.store.updateGlobals();

      // Get snapshots
      const config = this.store.snapshotConfig();
      const quotas = this.store.snapshotQuotas();

      // Save to server via API
      await Promise.all([
        configAPI.updateConfig(config),
        configAPI.updateQuotas(quotas)
      ]);

      // Success - Also write to localStorage to trigger storage event
      this.saveToLocalStorage(config, quotas);

      this.saveCount++;
      this.lastSaveTime = Date.now();
      this.lastError = null;
      this.updateStatusIndicator('success');

      console.log('✓ Configuration saved to server and localStorage');

    } catch (error) {
      console.error('Failed to save configuration to server:', error);
      this.errorCount++;
      this.lastError = error.message;
      this.updateStatusIndicator('error');

      // Fallback to localStorage if enabled
      if (this.fallbackToLocalStorage) {
        this.saveToLocalStorage();
      }
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Save to localStorage (used for both success and fallback)
   * @param {Object} config - Optional config to save, otherwise snapshot from store
   * @param {Array} quotas - Optional quotas to save, otherwise snapshot from store
   */
  saveToLocalStorage(config, quotas) {
    const { localStorage } = this.window;
    if (!localStorage) return;

    try {
      const configToSave = config || this.store.snapshotConfig();
      const quotasToSave = quotas || this.store.snapshotQuotas();

      localStorage.setItem('WINERY_CONFIG_OVERRIDE', JSON.stringify(configToSave));
      localStorage.setItem('WINERY_QUOTAS_OVERRIDE', JSON.stringify(quotasToSave));
      console.log('↓ Configuration saved to localStorage');
    } catch (error) {
      console.warn('Failed storing to localStorage:', error);
    }
  }

  /**
   * Load configuration from server
   */
  async load() {
    try {
      const [config, quotas] = await Promise.all([
        configAPI.getConfig(),
        configAPI.getQuotas()
      ]);

      return { config, quotas };
    } catch (error) {
      console.error('Failed to load configuration from server:', error);

      // Try loading from localStorage as fallback
      if (this.fallbackToLocalStorage) {
        return this.loadFromLocalStorage();
      }

      throw error;
    }
  }

  /**
   * Fallback: Load from localStorage
   */
  loadFromLocalStorage() {
    const { localStorage } = this.window;
    if (!localStorage) return null;

    try {
      const configStr = localStorage.getItem('WINERY_CONFIG_OVERRIDE');
      const quotasStr = localStorage.getItem('WINERY_QUOTAS_OVERRIDE');

      return {
        config: configStr ? JSON.parse(configStr) : null,
        quotas: quotasStr ? JSON.parse(quotasStr) : null
      };
    } catch (error) {
      console.warn('Failed loading from localStorage:', error);
      return null;
    }
  }

  /**
   * Initialize save status indicator in UI
   */
  initStatusIndicator() {
    // Check if indicator already exists
    let indicator = this.window.document.getElementById('save-status-indicator');
    if (indicator) return;

    // Create status indicator
    indicator = this.window.document.createElement('div');
    indicator.id = 'save-status-indicator';
    indicator.className = 'save-status-indicator';
    indicator.innerHTML = `
      <span class="save-status-icon"></span>
      <span class="save-status-text">שמור</span>
    `;

    // Add to page (next to save button if it exists)
    const saveButton = this.window.document.getElementById('saveAll');
    if (saveButton && saveButton.parentNode) {
      saveButton.parentNode.insertBefore(indicator, saveButton.nextSibling);
    } else {
      // Fallback: add to toolbar
      const toolbar = this.window.document.querySelector('.toolbar__actions');
      if (toolbar) {
        toolbar.appendChild(indicator);
      }
    }
  }

  /**
   * Update status indicator UI
   * @param {string} status - 'pending' | 'saving' | 'success' | 'error'
   */
  updateStatusIndicator(status) {
    const indicator = this.window.document.getElementById('save-status-indicator');
    if (!indicator) return;

    // Remove all status classes
    indicator.classList.remove('pending', 'saving', 'success', 'error');
    indicator.classList.add(status);

    const icon = indicator.querySelector('.save-status-icon');
    const text = indicator.querySelector('.save-status-text');

    switch (status) {
      case 'pending':
        if (icon) icon.textContent = '●';
        if (text) text.textContent = 'ממתין לשמירה...';
        break;
      case 'saving':
        if (icon) icon.textContent = '⟳';
        if (text) text.textContent = 'שומר...';
        break;
      case 'success':
        if (icon) icon.textContent = '✓';
        if (text) text.textContent = 'נשמר';
        // Auto-hide success message after 2 seconds
        setTimeout(() => {
          indicator.classList.remove('success');
        }, 2000);
        break;
      case 'error':
        if (icon) icon.textContent = '✗';
        if (text) text.textContent = 'שגיאה בשמירה';
        break;
    }
  }

  /**
   * Get save statistics
   */
  getStats() {
    return {
      saveCount: this.saveCount,
      errorCount: this.errorCount,
      lastSaveTime: this.lastSaveTime,
      lastError: this.lastError,
      isSaving: this.isSaving
    };
  }
}
