import { getById, markBound } from '../../utils/dom.js';
import { parseNumber } from '../../utils/number.js';

export class BaseSection {
  constructor(documentRef, store, schedulePersist) {
    this.document = documentRef;
    this.store = store;
    this.schedulePersist = schedulePersist;
  }

  $(id) {
    return getById(this.document, id);
  }

  get config() {
    return this.store.getConfig();
  }

  ensure(path, fallback) {
    return this.store.ensure(path, fallback);
  }

  ensureArray(path) {
    return this.store.ensureArray(path);
  }

  bindText(id, { get, set }) {
    const element = this.$(id);
    if (!element) return;
    element.value = get() ?? '';
    if (!markBound(element)) return;
    element.addEventListener('input', (event) => {
      set(event.target.value);
      this.schedulePersist();
    });
  }

  bindTextarea(id, { get, set }) {
    const element = this.$(id);
    if (!element) return;
    element.value = get() ?? '';
    if (!markBound(element)) return;
    element.addEventListener('input', (event) => {
      set(event.target.value);
      this.schedulePersist();
    });
  }

  bindNumber(id, { get, set, fallback = 0, format = (value) => value, transform = (value) => value }) {
    const element = this.$(id);
    if (!element) return;
    const current = get();
    element.value = format(Number.isFinite(current) ? current : fallback);
    if (!markBound(element)) return;
    element.addEventListener('input', (event) => {
      const parsed = transform(parseNumber(event.target.value, fallback));
      set(parsed);
      event.target.value = format(parsed);
      this.schedulePersist();
    });
  }
}
