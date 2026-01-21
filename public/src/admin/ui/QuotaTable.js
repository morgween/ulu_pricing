import { getById, query } from '../../utils/dom.js';
import { CellFactory } from './CellFactory.js';

export class QuotaTable {
  constructor(documentRef, store, schedulePersist) {
    this.document = documentRef;
    this.store = store;
    this.cellFactory = new CellFactory(documentRef, schedulePersist);
    this.schedulePersist = schedulePersist;
  }

  render() {
    const tbody = query(this.document, '#tblExtras tbody');
    if (!tbody) {
      return;
    }
    tbody.innerHTML = '';
    const quotas = this.store.getQuotas();
    quotas.forEach((quota, index) => {
      const tr = this.document.createElement('tr');
      tr.appendChild(this.cellFactory.text(quota.label || '', (value) => {
        this.store.setQuotaProperty(index, 'label', value);
      }));
      tr.appendChild(this.cellFactory.text(quota.desc || '', (value) => {
        this.store.setQuotaProperty(index, 'desc', value);
      }));
      tr.appendChild(
        this.cellFactory.select(quota.type || 'fixed', [
          ['fixed', 'לפי אירוע'],
          ['per_person', 'לפי אדם אפקטיבי'],
          ['free_note', 'שורת מתנה']
        ], (value) => {
          this.store.setQuotaProperty(index, 'type', value);
        })
      );
      tr.appendChild(
        this.cellFactory.number(quota.qty ?? 1, (value) => {
          this.store.setQuotaProperty(index, 'qty', value);
        }, { step: '1', min: '0', fallback: 1 })
      );
      tr.appendChild(
        this.cellFactory.number(quota.unit_exVAT ?? 0, (value) => {
          this.store.setQuotaProperty(index, 'unit_exVAT', value);
        }, { step: '0.5', min: '0', fallback: 0 })
      );
      tr.appendChild(
        this.cellFactory.remove(() => {
          this.store.removeQuota(index);
          this.render();
        })
      );
      tbody.appendChild(tr);
    });
  }

  addQuota() {
    this.store.addQuota();
    this.render();
    this.schedulePersist();
  }

  bindAddButton(buttonId = 'addExtra') {
    const button = getById(this.document, buttonId);
    if (button) {
      button.addEventListener('click', () => this.addQuota());
    }
  }
}
