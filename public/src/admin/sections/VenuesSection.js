import { query } from '../../utils/dom.js';
import { BaseSection } from './BaseSection.js';
import { CellFactory } from '../ui/CellFactory.js';

export class VenuesSection extends BaseSection {
  constructor(documentRef, store, schedulePersist) {
    super(documentRef, store, schedulePersist);
    this.cellFactory = new CellFactory(documentRef, schedulePersist);
  }

  initialize() {
    this.bindAddButton();
    this.renderVenues();
  }

  render() {
    this.renderVenues();
  }

  getPricingConfig() {
    return this.ensure(['pricing'], {});
  }

  renderVenues() {
    const pricing = this.getPricingConfig();
    const venuesConfig = pricing.venues = pricing.venues || { baseFees: [] };
    const baseFees = this.ensureArray(['pricing', 'venues', 'baseFees']);
    const place = pricing.place = pricing.place || { venues: {} };
    place.venues = place.venues || {};
    const tbody = query(this.document, '#tblVenues tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    baseFees.forEach((entry, index) => {
      const tr = this.document.createElement('tr');
      let currentKey = entry.key || `venue_${index}`;
      entry.key = currentKey;

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
        if (baseFees.some((item, idx) => idx !== index && item.key === newKey)) {
          this.alert('מפתח זה כבר קיים');
          event.target.value = currentKey;
          return;
        }
        entry.key = newKey;
        place.venues[newKey] = place.venues[currentKey] || { label: entry.label || newKey };
        delete place.venues[currentKey];
        currentKey = newKey;
        this.schedulePersist();
      });
      tdKey.appendChild(inputKey);
      tr.appendChild(tdKey);

      tr.appendChild(this.cellFactory.text(entry.label || '', (value) => {
        entry.label = value;
        place.venues[currentKey] = place.venues[currentKey] || {};
        place.venues[currentKey].label = value || currentKey;
      }));
      tr.appendChild(this.cellFactory.text(entry.description || '', (value) => {
        entry.description = value;
        place.venues[currentKey] = place.venues[currentKey] || {};
        place.venues[currentKey].description = value;
      }));
      tr.appendChild(this.cellFactory.number(entry.baseFee_exVAT ?? 0, (value) => {
        entry.baseFee_exVAT = value;
      }, { step: '1', min: '0', fallback: 0 }));
      tr.appendChild(this.cellFactory.number(entry.cost_exVAT ?? 0, (value) => {
        entry.cost_exVAT = value;
      }, { step: '1', min: '0', fallback: 0 }));
      tr.appendChild(this.cellFactory.number(entry.locationMultiplier ?? 1, (value) => {
        entry.locationMultiplier = value;
      }, { step: '0.01', min: '0', fallback: 1 }));
      tr.appendChild(
        this.cellFactory.remove(() => {
          baseFees.splice(index, 1);
          delete place.venues[currentKey];
          this.renderVenues();
        })
      );
      tbody.appendChild(tr);
    });
  }

  bindAddButton() {
    const button = this.$('addVenue');
    if (!button) return;
    button.addEventListener('click', () => this.addVenue());
  }

  addVenue() {
    const baseFees = this.ensureArray(['pricing', 'venues', 'baseFees']);
    baseFees.push({
      key: `venue_${Date.now()}`,
      label: 'מיקום חדש',
      description: '',
      baseFee_exVAT: 0,
      cost_exVAT: 0,
      locationMultiplier: 1
    });
    this.renderVenues();
    this.schedulePersist();
  }

  alert(message) {
    const view = this.document.defaultView;
    if (view && typeof view.alert === 'function') {
      view.alert(message);
    }
  }
}
