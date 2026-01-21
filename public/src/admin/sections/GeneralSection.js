import { parseNumber, toNonNegativeInteger } from '../../utils/number.js';
import { BaseSection } from './BaseSection.js';
import { SliderControls } from '../ui/SliderControls.js';

const CHILD_FACTOR_EVENT = 'admin:childFactorChanged';

export class GeneralSection extends BaseSection {
  constructor(documentRef, store, schedulePersist) {
    super(documentRef, store, schedulePersist);
    this.sliderControls = new SliderControls(documentRef);
  }

  initialize() {
    this.bindVat();
    this.bindChildFactor();
    this.bindMinimumGuests();
    this.bindAddonCommissions();
  }

  render() {
    this.initialize();
  }

  getChildFactor() {
    const foodFactor = parseNumber(this.config?.food?.child_food_factor, NaN);
    if (Number.isFinite(foodFactor)) return foodFactor;
    return parseNumber(this.config?.children?.factor, 0.75);
  }

  bindVat() {
    const getValue = () => Number.isFinite(this.config.vat) ? this.config.vat : 0.18;
    const setValue = (value) => {
      this.config.vat = value;
      this.schedulePersist();
    };

    this.bindNumber('vat-number', {
      get: getValue,
      set: setValue,
      fallback: 0.18,
      format: (value) => value
    });

    this.sliderControls.bindSlider('vat', {
      getValue,
      setValue,
      formatDisplay: (v) => `${Math.round(v * 100)}%`,
      min: 0,
      max: 0.30,
      step: 0.01
    });
  }

  bindChildFactor() {
    const getValue = () => this.getChildFactor();
    const setValue = (value) => {
      const normalized = value || 0;
      this.store.setChildFactor(normalized);
      const foodInput = this.$('food_child_factor');
      if (foodInput && this.document.activeElement !== foodInput) {
        foodInput.value = normalized;
      }
      this.notifyChildFactor(normalized);
      this.schedulePersist();
    };

    this.bindNumber('childFactor-number', {
      get: getValue,
      set: setValue,
      fallback: 0.75,
      transform: (value) => (Number.isFinite(value) ? value : 0.75),
      format: (value) => value
    });

    this.sliderControls.bindSlider('childFactor', {
      getValue,
      setValue,
      formatDisplay: (v) => `${Math.round(v * 100)}%`,
      min: 0,
      max: 1,
      step: 0.01
    });
  }

  bindMinimumGuests() {
    const events = this.ensure(['events'], { minimumGuests: 20 });
    const getValue = () => Number.isFinite(events.minimumGuests) ? events.minimumGuests : 20;
    const setValue = (value) => {
      events.minimumGuests = toNonNegativeInteger(value, 20);
      this.schedulePersist();
    };

    this.bindNumber('minGuests-number', {
      get: getValue,
      set: setValue,
      fallback: 20,
      transform: (value) => toNonNegativeInteger(value, 20),
      format: (value) => toNonNegativeInteger(value, 20)
    });

    this.sliderControls.bindSlider('minGuests', {
      getValue,
      setValue,
      formatDisplay: (v) => String(Math.round(v)),
      min: 10,
      max: 100,
      step: 1
    });
  }

  bindAddonCommissions() {
    const addons = this.ensure(['addons'], {
      wineryCommissionRate: 0.15,
      customerCommissionMin: 10,
      customerCommissionMax: 60,
      customerCommissionDefault: 40
    });

    // Winery commission rate (15%)
    const getWineryRate = () => Number.isFinite(addons.wineryCommissionRate) ? addons.wineryCommissionRate : 0.15;
    const setWineryRate = (value) => {
      addons.wineryCommissionRate = value;
      this.schedulePersist();
    };

    this.bindNumber('addonWineryCommission-number', {
      get: getWineryRate,
      set: setWineryRate,
      fallback: 0.15,
      format: (value) => value
    });

    this.sliderControls.bindSlider('addonWineryCommission', {
      getValue: getWineryRate,
      setValue: setWineryRate,
      formatDisplay: (v) => `${Math.round(v * 100)}%`,
      min: 0,
      max: 0.50,
      step: 0.01
    });

    // Customer commission minimum
    const getCustomerMin = () => Number.isFinite(addons.customerCommissionMin) ? addons.customerCommissionMin : 10;
    const setCustomerMin = (value) => {
      addons.customerCommissionMin = toNonNegativeInteger(value, 10);
      this.schedulePersist();
    };

    this.bindNumber('addonCustomerCommissionMin-number', {
      get: getCustomerMin,
      set: setCustomerMin,
      fallback: 10,
      transform: (value) => toNonNegativeInteger(value, 10),
      format: (value) => toNonNegativeInteger(value, 10)
    });

    this.sliderControls.bindSlider('addonCustomerCommissionMin', {
      getValue: getCustomerMin,
      setValue: setCustomerMin,
      formatDisplay: (v) => `₪${Math.round(v)}`,
      min: 5,
      max: 100,
      step: 1
    });

    // Customer commission maximum
    const getCustomerMax = () => Number.isFinite(addons.customerCommissionMax) ? addons.customerCommissionMax : 60;
    const setCustomerMax = (value) => {
      addons.customerCommissionMax = toNonNegativeInteger(value, 60);
      this.schedulePersist();
    };

    this.bindNumber('addonCustomerCommissionMax-number', {
      get: getCustomerMax,
      set: setCustomerMax,
      fallback: 60,
      transform: (value) => toNonNegativeInteger(value, 60),
      format: (value) => toNonNegativeInteger(value, 60)
    });

    this.sliderControls.bindSlider('addonCustomerCommissionMax', {
      getValue: getCustomerMax,
      setValue: setCustomerMax,
      formatDisplay: (v) => `₪${Math.round(v)}`,
      min: 10,
      max: 200,
      step: 5
    });

    // Customer commission default
    const getCustomerDefault = () => Number.isFinite(addons.customerCommissionDefault) ? addons.customerCommissionDefault : 40;
    const setCustomerDefault = (value) => {
      addons.customerCommissionDefault = toNonNegativeInteger(value, 40);
      this.schedulePersist();
    };

    this.bindNumber('addonCustomerCommissionDefault-number', {
      get: getCustomerDefault,
      set: setCustomerDefault,
      fallback: 40,
      transform: (value) => toNonNegativeInteger(value, 40),
      format: (value) => toNonNegativeInteger(value, 40)
    });

    this.sliderControls.bindSlider('addonCustomerCommissionDefault', {
      getValue: getCustomerDefault,
      setValue: setCustomerDefault,
      formatDisplay: (v) => `₪${Math.round(v)}`,
      min: 10,
      max: 100,
      step: 5
    });
  }

  notifyChildFactor(value) {
    const event = new CustomEvent(CHILD_FACTOR_EVENT, { detail: value });
    this.document.dispatchEvent(event);
  }
}

export const CHILD_FACTOR_CHANGED_EVENT = CHILD_FACTOR_EVENT;
