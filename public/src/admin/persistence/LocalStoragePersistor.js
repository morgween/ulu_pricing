export class LocalStoragePersistor {
  constructor(windowRef, store, {
    configKey = 'WINERY_CONFIG_OVERRIDE',
    quotasKey = 'WINERY_QUOTAS_OVERRIDE',
    delay = 120
  } = {}) {
    this.window = windowRef;
    this.store = store;
    this.configKey = configKey;
    this.quotasKey = quotasKey;
    this.delay = delay;
    this.timer = null;
  }

  schedule() {
    if (this.timer) {
      this.window.clearTimeout(this.timer);
    }
    this.timer = this.window.setTimeout(() => {
      this.timer = null;
      this.persist();
    }, this.delay);
  }

  flush() {
    if (this.timer) {
      this.window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.persist();
  }

  persist() {
    this.store.updateGlobals();
    const { localStorage } = this.window;
    if (!localStorage) return;
    try {
      localStorage.setItem(this.configKey, JSON.stringify(this.store.snapshotConfig()));
    } catch (error) {
      console.warn('Failed storing config override', error);
    }
    try {
      localStorage.setItem(this.quotasKey, JSON.stringify(this.store.snapshotQuotas()));
    } catch (error) {
      console.warn('Failed storing quotas override', error);
    }
  }
}
