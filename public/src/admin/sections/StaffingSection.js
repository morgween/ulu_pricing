import { query } from '../../utils/dom.js';
import { BaseSection } from './BaseSection.js';
import { CellFactory } from '../ui/CellFactory.js';

export class StaffingSection extends BaseSection {
  constructor(documentRef, store, schedulePersist) {
    super(documentRef, store, schedulePersist);
    this.cellFactory = new CellFactory(documentRef, schedulePersist);
  }

  initialize() {
    this.bindInputs();
    this.bindAddRowButton();
    this.renderMatrix();
  }

  render() {
    this.bindInputs();
    this.renderMatrix();
  }

  getStaffingConfig() {
    return this.ensure(['staffing'], {});
  }

  bindInputs() {
    const staffing = this.getStaffingConfig();

    staffing.workerRate_exVAT = Number.isFinite(staffing.workerRate_exVAT)
      ? staffing.workerRate_exVAT
      : Number.isFinite(staffing.workerRate)
        ? staffing.workerRate
        : 0;

    this.bindNumber('staff_worker_rate', {
      get: () => Number.isFinite(staffing.workerRate_exVAT) ? staffing.workerRate_exVAT : 0,
      set: (value) => {
        staffing.workerRate_exVAT = value;
      },
      fallback: 0,
      format: (value) => value
    });

    this.bindNumber('staff_manager_bonus', {
      get: () => Number.isFinite(staffing.managerBonus_exVAT) ? staffing.managerBonus_exVAT : 0,
      set: (value) => {
        staffing.managerBonus_exVAT = value;
      },
      fallback: 0,
      format: (value) => value
    });

    this.bindNumber('staff_revenue_component', {
      get: () => Number.isFinite(staffing.revenueComponent_exVAT) ? staffing.revenueComponent_exVAT : 0,
      set: (value) => {
        staffing.revenueComponent_exVAT = value;
      },
      fallback: 0,
      format: (value) => value
    });
  }

  renderMatrix() {
    const matrix = this.ensureArray(['staffing', 'workerMatrix']);
    const tbody = query(this.document, '#tblWorkerMatrix tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    matrix.forEach((row, index) => {
      const tr = this.document.createElement('tr');
      tr.appendChild(this.cellFactory.number(row.minGuests ?? 0, (value) => {
        matrix[index].minGuests = value;
      }, { step: '1', fallback: 0 }));
      tr.appendChild(this.cellFactory.number(row.maxGuests ?? 0, (value) => {
        matrix[index].maxGuests = value;
      }, { step: '1', fallback: 0 }));
      tr.appendChild(this.cellFactory.number(row.our_food ?? 0, (value) => {
        matrix[index].our_food = value;
      }, { step: '1', fallback: 0 }));
      tr.appendChild(this.cellFactory.number(row.catering ?? 0, (value) => {
        matrix[index].catering = value;
      }, { step: '1', fallback: 0 }));
      tr.appendChild(
        this.cellFactory.remove(() => {
          matrix.splice(index, 1);
          this.renderMatrix();
        })
      );
      tbody.appendChild(tr);
    });
  }

  bindAddRowButton() {
    const button = this.$('addWorkerMatrix');
    if (!button) return;
    button.addEventListener('click', () => this.addRow());
  }

  addRow() {
    const matrix = this.ensureArray(['staffing', 'workerMatrix']);
    matrix.push({ minGuests: 0, maxGuests: 0, our_food: 1, catering: 1 });
    this.renderMatrix();
    this.schedulePersist();
  }
}
