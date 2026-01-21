import { deepClone, ensureArray, ensureObject, ensurePath } from '../../utils/object.js';

const DEFAULT_QUOTA = () => ({ label: '', desc: '', type: 'fixed', qty: 1, unit_exVAT: 0 });

export class OverrideStore {
  constructor(windowRef) {
    this.window = windowRef;
    this.config = deepClone(windowRef?.WINERY_CONFIG || {});
    this.quotas = Array.isArray(windowRef?.WINERY_QUOTA_PRESETS)
      ? windowRef.WINERY_QUOTA_PRESETS.map((item) => ({ ...item }))
      : [];
  }

  getConfig() {
    return this.config;
  }

  getQuotas() {
    return this.quotas;
  }

  ensure(path, fallback) {
    return ensurePath(this.config, path, fallback);
  }

  ensureArray(path) {
    if (!Array.isArray(path) || path.length === 0) {
      throw new TypeError('ensureArray requires a non-empty path');
    }
    const container = ensurePath(this.config, path.slice(0, -1), {});
    return ensureArray(container, path[path.length - 1]);
  }

  setChildFactor(value) {
    const children = ensureObject(this.config, 'children', { factor: 0.75 });
    children.factor = value;
    const food = ensureObject(this.config, 'food', {});
    food.child_food_factor = value;
  }

  addQuota(quota = DEFAULT_QUOTA()) {
    this.quotas.push({ ...DEFAULT_QUOTA(), ...quota });
    return this.quotas.length - 1;
  }

  updateQuota(index, updater) {
    if (typeof updater !== 'function' || index < 0 || index >= this.quotas.length) {
      return;
    }
    const current = this.quotas[index];
    const next = { ...current };
    updater(next);
    this.quotas[index] = next;
  }

  setQuotaProperty(index, key, value) {
    if (index < 0 || index >= this.quotas.length) return;
    this.quotas[index] = { ...this.quotas[index], [key]: value };
  }

  removeQuota(index) {
    if (index < 0 || index >= this.quotas.length) return;
    this.quotas.splice(index, 1);
  }

  replaceConfig(config) {
    this.config = deepClone(config || {});
    this.updateGlobals();
  }

  replaceQuotas(quotas) {
    this.quotas = Array.isArray(quotas) ? quotas.map((item) => ({ ...item })) : [];
    this.updateGlobals();
  }

  updateGlobals() {
    if (!this.window) return;
    this.window.WINERY_CONFIG = deepClone(this.config);
    this.window.WINERY_QUOTA_PRESETS = this.quotas.map((item) => ({ ...item }));
  }

  snapshotConfig() {
    return deepClone(this.config);
  }

  snapshotQuotas() {
    return this.quotas.map((item) => ({ ...item }));
  }
}
