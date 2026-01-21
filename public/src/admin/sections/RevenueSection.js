import { query } from '../../utils/dom.js';
import { BaseSection } from './BaseSection.js';
import { CellFactory } from '../ui/CellFactory.js';

const TABLE_MAP = {
  our_food: 'tblRevenueOurFood',
  catering: 'tblRevenueCatering',
  customer_catering: 'tblRevenueCustomer'
};

export class RevenueSection extends BaseSection {
  constructor(documentRef, store, schedulePersist) {
    super(documentRef, store, schedulePersist);
    this.cellFactory = new CellFactory(documentRef, schedulePersist);
  }

  initialize() {
    this.bindAddButtons();
    this.renderAll();
  }

  render() {
    this.renderAll();
  }

  getTargets() {
    return this.ensure(['revenueTargets'], {
      our_food: [],
      catering: [],
      customer_catering: []
    });
  }

  renderAll() {
    Object.keys(TABLE_MAP).forEach((key) => this.renderTable(key, TABLE_MAP[key]));
  }

  renderTable(key, tableId) {
    const targets = this.getTargets();
    const rows = this.ensureArray(['revenueTargets', key]);
    const tbody = query(this.document, `#${tableId} tbody`);
    if (!tbody) return;
    tbody.innerHTML = '';
    rows.forEach((row, index) => {
      const tr = this.document.createElement('tr');
      tr.appendChild(this.cellFactory.number(row.guests ?? 0, (value) => {
        rows[index].guests = value;
      }, { step: '1', min: '0', fallback: 0 }));
      tr.appendChild(this.cellFactory.number(row.pct ?? 0, (value) => {
        rows[index].pct = value;
      }, { step: '0.01', min: '0', max: '1', fallback: 0 }));
      tr.appendChild(
        this.cellFactory.remove(() => {
          rows.splice(index, 1);
          this.renderTable(key, tableId);
        })
      );
      tbody.appendChild(tr);
    });
  }

  bindAddButtons() {
    const ourFoodBtn = this.$('addRevenueOurFood');
    if (ourFoodBtn) {
      ourFoodBtn.addEventListener('click', () => this.addRow('our_food'));
    }
    const cateringBtn = this.$('addRevenueCatering');
    if (cateringBtn) {
      cateringBtn.addEventListener('click', () => this.addRow('catering'));
    }
    const customerBtn = this.$('addRevenueCustomer');
    if (customerBtn) {
      customerBtn.addEventListener('click', () => this.addRow('customer_catering'));
    }
  }

  addRow(key) {
    const rows = this.ensureArray(['revenueTargets', key]);
    rows.push({ guests: 0, pct: 0 });
    this.renderAll();
    const tableId = TABLE_MAP[key];
    const tbody = tableId ? query(this.document, `#${tableId} tbody`) : null;
    if (tbody && tbody.lastElementChild) {
      tbody.lastElementChild.scrollIntoView({ block: 'nearest' });
    }
    this.schedulePersist();
  }
}
