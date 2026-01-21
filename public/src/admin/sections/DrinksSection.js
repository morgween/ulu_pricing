import { query } from '../../utils/dom.js';
import { BaseSection } from './BaseSection.js';
import { CellFactory } from '../ui/CellFactory.js';

export class DrinksSection extends BaseSection {
  constructor(documentRef, store, schedulePersist) {
    super(documentRef, store, schedulePersist);
    this.cellFactory = new CellFactory(documentRef, schedulePersist);
  }

  initialize() {
    this.bindInputs();
    this.bindAddDurationButton();
    this.renderDurations();
  }

  render() {
    this.bindInputs();
    this.renderDurations();
  }

  getDrinksConfig() {
    return this.ensure(['drinks'], {});
  }

  bindInputs() {
    const drinks = this.getDrinksConfig();
    const hot = drinks.hot = drinks.hot || { costPerUnit: 0, pricePerUnit: 0 };
    const cold = drinks.cold = drinks.cold || { costPerUnit: 0, pricePerUnit: 0 };

    this.bindNumber('drinks_hot_cost', {
      get: () => Number.isFinite(hot.costPerUnit) ? hot.costPerUnit : 0,
      set: (value) => {
        hot.costPerUnit = value;
        // Recalculate pricePerUnit if multiplier exists
        const multiplier = hot.pricePerUnit && hot.costPerUnit ? hot.pricePerUnit / hot.costPerUnit : 3;
        hot.pricePerUnit = value * multiplier;
      },
      fallback: 0,
      format: (value) => value
    });

    this.bindNumber('drinks_hot_multiplier', {
      get: () => {
        if (Number.isFinite(hot.pricePerUnit) && Number.isFinite(hot.costPerUnit) && hot.costPerUnit > 0) {
          return hot.pricePerUnit / hot.costPerUnit;
        }
        return 3;
      },
      set: (value) => {
        hot.pricePerUnit = (hot.costPerUnit || 0) * value;
      },
      fallback: 1,
      format: (value) => value
    });

    this.bindNumber('drinks_child_hot', {
      get: () => Number.isFinite(drinks.childHotMultiplier) ? drinks.childHotMultiplier : 0.75,
      set: (value) => {
        drinks.childHotMultiplier = value;
      },
      fallback: 0.75,
      format: (value) => value
    });

    this.bindNumber('drinks_cold_cost', {
      get: () => Number.isFinite(cold.costPerUnit) ? cold.costPerUnit : 0,
      set: (value) => {
        cold.costPerUnit = value;
        // Recalculate pricePerUnit if multiplier exists
        const multiplier = cold.pricePerUnit && cold.costPerUnit ? cold.pricePerUnit / cold.costPerUnit : 3.2;
        cold.pricePerUnit = value * multiplier;
      },
      fallback: 0,
      format: (value) => value
    });

    this.bindNumber('drinks_cold_multiplier', {
      get: () => {
        if (Number.isFinite(cold.pricePerUnit) && Number.isFinite(cold.costPerUnit) && cold.costPerUnit > 0) {
          return cold.pricePerUnit / cold.costPerUnit;
        }
        return 3.2;
      },
      set: (value) => {
        cold.pricePerUnit = (cold.costPerUnit || 0) * value;
      },
      fallback: 1,
      format: (value) => value
    });

    this.bindNumber('drinks_child_cold', {
      get: () => Number.isFinite(drinks.childColdMultiplier) ? drinks.childColdMultiplier : 1,
      set: (value) => {
        drinks.childColdMultiplier = value;
      },
      fallback: 1,
      format: (value) => value
    });
  }

  renderDurations() {
    const drinks = this.getDrinksConfig();
    const counts = drinks.ratesByDuration = drinks.ratesByDuration || {};
    const tbody = query(this.document, '#tblDrinkDurations tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    Object.keys(counts).forEach((key) => {
      let currentKey = key;
      counts[currentKey] = counts[currentKey] || { hot: 0, cold: 0 };
      const entry = counts[currentKey];
      const tr = this.document.createElement('tr');

      const tdKey = this.document.createElement('td');
      const inputKey = this.document.createElement('input');
      inputKey.type = 'text';
      inputKey.value = currentKey;
      inputKey.addEventListener('change', (event) => {
        const newKey = event.target.value.trim();
        if (!newKey || newKey === currentKey) {
          event.target.value = currentKey;
          return;
        }
        if (counts[newKey]) {
          this.alert('מפתח זה כבר קיים');
          event.target.value = currentKey;
          return;
        }
        counts[newKey] = counts[currentKey];
        delete counts[currentKey];
        currentKey = newKey;
        this.renderDurations();
        this.schedulePersist();
      });
      tdKey.appendChild(inputKey);
      tr.appendChild(tdKey);

      tr.appendChild(this.cellFactory.number(entry.hot ?? 0, (value) => {
        counts[currentKey].hot = value;
      }, { step: '0.1', min: '0', fallback: 0 }));
      tr.appendChild(this.cellFactory.number(entry.cold ?? 0, (value) => {
        counts[currentKey].cold = value;
      }, { step: '0.1', min: '0', fallback: 0 }));
      tr.appendChild(
        this.cellFactory.remove(() => {
          delete counts[currentKey];
          this.renderDurations();
        })
      );
      tbody.appendChild(tr);
    });
  }

  bindAddDurationButton() {
    const button = this.$('addDrinkDuration');
    if (!button) return;
    button.addEventListener('click', () => this.addDuration());
  }

  addDuration() {
    const drinks = this.getDrinksConfig();
    const counts = drinks.ratesByDuration = drinks.ratesByDuration || {};
    let key = `duration_${Date.now()}`;
    while (counts[key]) {
      key = `${key}_1`;
    }
    counts[key] = { hot: 0, cold: 0 };
    this.renderDurations();
    this.schedulePersist();
  }

  alert(message) {
    const view = this.document.defaultView;
    if (view && typeof view.alert === 'function') {
      view.alert(message);
    }
  }
}
