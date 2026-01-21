import { parseNumber } from '../../utils/number.js';

export class CellFactory {
  constructor(documentRef, schedulePersist) {
    this.document = documentRef;
    this.schedulePersist = schedulePersist;
  }

  text(value, onChange) {
    const td = this.document.createElement('td');
    const input = this.document.createElement('input');
    input.type = 'text';
    input.value = value ?? '';
    input.addEventListener('input', (event) => {
      onChange(event.target.value);
      this.schedulePersist();
    });
    td.appendChild(input);
    return td;
  }

  number(value, onChange, options = {}) {
    const td = this.document.createElement('td');
    const input = this.document.createElement('input');
    input.type = 'number';
    if (options.step != null) input.step = String(options.step);
    if (options.min != null) input.min = String(options.min);
    if (options.max != null) input.max = String(options.max);
    input.value = Number.isFinite(value) ? value : '';
    input.addEventListener('input', (event) => {
      const parsed = parseNumber(event.target.value, options.fallback ?? 0);
      onChange(parsed);
      this.schedulePersist();
    });
    td.appendChild(input);
    return td;
  }

  select(value, options, onChange) {
    const td = this.document.createElement('td');
    const select = this.document.createElement('select');
    options.forEach(([optionValue, label]) => {
      const option = this.document.createElement('option');
      option.value = optionValue;
      option.textContent = label;
      select.appendChild(option);
    });
    select.value = value;
    select.addEventListener('change', (event) => {
      onChange(event.target.value);
      this.schedulePersist();
    });
    td.appendChild(select);
    return td;
  }

  remove(onRemove) {
    const td = this.document.createElement('td');
    const button = this.document.createElement('button');
    button.type = 'button';
    button.className = 'btn danger del';
    button.textContent = '×';
    button.addEventListener('click', () => {
      onRemove();
      this.schedulePersist();
    });
    td.appendChild(button);
    return td;
  }
}
