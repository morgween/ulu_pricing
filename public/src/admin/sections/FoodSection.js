import { parseNumber } from '../../utils/number.js';
import { query } from '../../utils/dom.js';
import { BaseSection } from './BaseSection.js';
import { CellFactory } from '../ui/CellFactory.js';
import { CHILD_FACTOR_CHANGED_EVENT } from './GeneralSection.js';

export class FoodSection extends BaseSection {
  constructor(documentRef, store, schedulePersist) {
    super(documentRef, store, schedulePersist);
    this.cellFactory = new CellFactory(documentRef, schedulePersist);
  }

  initialize() {
    this.document.addEventListener(CHILD_FACTOR_CHANGED_EVENT, (event) => {
      const input = this.$('food_child_factor');
      if (!input || this.document.activeElement === input) {
        return;
      }
      input.value = event.detail;
    });
    this.bindInputs();
    this.bindAddExtraButton();
    this.renderExtras();
  }

  render() {
    this.bindInputs();
    this.renderExtras();
  }

  getFoodConfig() {
    return this.ensure(['food'], {});
  }

  getExtras() {
    return this.ensure(['food', 'extras'], {});
  }

  bindInputs() {
    const food = this.getFoodConfig();
    const winery = food.winery = food.winery || { price_incVAT: 0, cost_exVAT: 0 };
    const cateringOur = food.catering_we_bring = food.catering_we_bring || { markup_percent: 0 };
    const customerBrings = food.catering_client_brings = food.catering_client_brings || { fee_per_guest_exVAT: 0 };

    this.bindNumber('food_price_incVAT', {
      get: () => Number.isFinite(winery.price_incVAT) ? winery.price_incVAT : 0,
      set: (value) => {
        winery.price_incVAT = value;
      },
      fallback: 0,
      format: (value) => value
    });

    this.bindNumber('food_cost_exVAT', {
      get: () => Number.isFinite(winery.cost_exVAT) ? winery.cost_exVAT : 0,
      set: (value) => {
        winery.cost_exVAT = value;
      },
      fallback: 0,
      format: (value) => value
    });

    this.bindNumber('food_child_factor', {
      get: () => parseNumber(food.child_food_factor ?? this.config?.children?.factor, 0.75),
      set: (value) => {
        const normalized = Number.isFinite(value) ? value : 0.75;
        this.store.setChildFactor(normalized);
        const generalInput = this.$('childFactor');
        if (generalInput && this.document.activeElement !== generalInput) {
          generalInput.value = normalized;
        }
      },
      fallback: 0.75,
      transform: (value) => (Number.isFinite(value) ? value : 0.75),
      format: (value) => value
    });

    this.bindNumber('food_catering_markup', {
      get: () => Number.isFinite(cateringOur.markup_percent) ? cateringOur.markup_percent : 0,
      set: (value) => {
        cateringOur.markup_percent = value;
      },
      fallback: 0,
      format: (value) => value
    });

    this.bindNumber('food_customer_fee_pp', {
      get: () => Number.isFinite(customerBrings.fee_per_guest_exVAT) ? customerBrings.fee_per_guest_exVAT : 0,
      set: (value) => {
        customerBrings.fee_per_guest_exVAT = value;
      },
      fallback: 0,
      format: (value) => value
    });
  }

  renderExtras() {
    const extras = this.getExtras();
    const tbody = query(this.document, '#tblFoodExtras tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    Object.keys(extras).forEach((key) => {
      let currentKey = key;
      extras[currentKey] = extras[currentKey] || {};
      const extra = extras[currentKey];
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
        if (extras[newKey]) {
          this.alert('מפתח זה כבר קיים');
          event.target.value = currentKey;
          return;
        }
        extras[newKey] = extras[currentKey];
        delete extras[currentKey];
        currentKey = newKey;
        this.renderExtras();
        this.schedulePersist();
      });
      tdKey.appendChild(inputKey);
      tr.appendChild(tdKey);

      tr.appendChild(this.cellFactory.text(extra.label || '', (value) => {
        extras[currentKey].label = value;
      }));
      tr.appendChild(this.cellFactory.text(extra.id || '', (value) => {
        extras[currentKey].id = value;
      }));
      tr.appendChild(this.cellFactory.number(extra.price_incVAT ?? 0, (value) => {
        extras[currentKey].price_incVAT = value;
      }, { step: '0.5', min: '0', fallback: 0 }));
      tr.appendChild(this.cellFactory.number(extra.cost_exVAT ?? 0, (value) => {
        extras[currentKey].cost_exVAT = value;
      }, { step: '0.5', min: '0', fallback: 0 }));
      tr.appendChild(
        this.cellFactory.select(extra.appliesTo || 'any', [
          ['any', 'כל סוג תפריט'],
          ['winery', 'כיבוד היקב'],
          ['catering', 'קייטרינג שלנו'],
          ['customer', 'לקוח מביא']
        ], (value) => {
          extras[currentKey].appliesTo = value;
        })
      );
      tr.appendChild(
        this.cellFactory.select(extra.perGuestMode || 'adult_equivalent', [
          ['adult_equivalent', 'לאדם אפקטיבי'],
          ['per_adult', 'למבוגר בלבד'],
          ['per_event', 'פר אירוע']
        ], (value) => {
          extras[currentKey].perGuestMode = value;
        })
      );
      tr.appendChild(
        this.cellFactory.remove(() => {
          delete extras[currentKey];
          this.renderExtras();
        })
      );
      tbody.appendChild(tr);
    });
  }

  bindAddExtraButton() {
    const button = this.$('addFoodExtra');
    if (!button) return;
    button.addEventListener('click', () => this.addExtra());
  }

  addExtra() {
    const extras = this.getExtras();
    let key = `extra_${Date.now()}`;
    while (extras[key]) {
      key = `${key}_1`;
    }
    extras[key] = {
      label: 'תוספת חדשה',
      id: '',
      price_incVAT: 0,
      cost_exVAT: 0,
      appliesTo: 'any',
      perGuestMode: 'adult_equivalent'
    };
    this.renderExtras();
    this.schedulePersist();
  }

  alert(message) {
    const view = this.document.defaultView;
    if (view && typeof view.alert === 'function') {
      view.alert(message);
    }
  }
}
