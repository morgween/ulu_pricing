import { query } from '../../utils/dom.js';
import { BaseSection } from './BaseSection.js';
import { CellFactory } from '../ui/CellFactory.js';
import { SliderControls, RatioValidator } from '../ui/SliderControls.js';

const COLORS = ['white', 'rose', 'red'];

export class WineSection extends BaseSection {
  constructor(documentRef, store, schedulePersist) {
    super(documentRef, store, schedulePersist);
    this.cellFactory = new CellFactory(documentRef, schedulePersist);
    this.sliderControls = new SliderControls(documentRef);
    this.ratioValidator = new RatioValidator(documentRef);
  }

  initialize() {
    this.bindBaselineInputs();
    this.bindAddTierButton();
    this.bindMixSplitSliders();
    this.renderTiers();
    this.setupRatioValidation();
  }

  render() {
    this.bindBaselineInputs();
    this.bindMixSplitSliders();
    this.renderTiers();
    this.setupRatioValidation();
  }

  getWineConfig() {
    return this.ensure(['wine'], {});
  }

  getBaseline() {
    const wine = this.getWineConfig();
    const baseline = wine.baseline = wine.baseline || {
      guestsPerBottle: 5,
      ratio: { white: 0.4, rose: 0.4, red: 0.2 },
      mixSplit: { ulu: 0.7, kosher: 0.3 }
    };
    baseline.ratio = baseline.ratio || { white: 0.4, rose: 0.4, red: 0.2 };
    baseline.mixSplit = baseline.mixSplit || { ulu: 0.7, kosher: 0.3 };
    return baseline;
  }

  bindBaselineInputs() {
    const baseline = this.getBaseline();

    // Bind guests per bottle slider
    const getValue1 = () => Number.isFinite(baseline.guestsPerBottle) ? baseline.guestsPerBottle : 5;
    const setValue1 = (value) => {
      baseline.guestsPerBottle = value;
      this.schedulePersist();
    };

    this.bindNumber('wine_bottle_per_adults-number', {
      get: getValue1,
      set: setValue1,
      fallback: 5,
      format: (value) => value
    });

    this.sliderControls.bindSlider('wine_bottle_per_adults', {
      getValue: getValue1,
      setValue: setValue1,
      formatDisplay: (v) => String(Math.round(v)),
      min: 3,
      max: 10,
      step: 1
    });


    // Bind color ratio sliders
    const getValueWhite = () => Number.isFinite(baseline.ratio.white) ? baseline.ratio.white : 0.4;
    const setValueWhite = (value) => {
      baseline.ratio.white = value;
      this.schedulePersist();
    };

    this.bindNumber('wine_ratio_white-number', {
      get: getValueWhite,
      set: setValueWhite,
      fallback: 0.4,
      format: (value) => value
    });

    // Define all three sliders with auto-balancing
    const colorRatioSliders = ['wine_ratio_white', 'wine_ratio_rose', 'wine_ratio_red'];

    this.sliderControls.bindSlider('wine_ratio_white', {
      getValue: getValueWhite,
      setValue: setValueWhite,
      formatDisplay: (v) => `${Math.round(v * 100)}%`,
      min: 0,
      max: 1,
      step: 0.05,
      linkedSliders: colorRatioSliders,
      linkMode: 'distribute'
    });

    const getValueRose = () => Number.isFinite(baseline.ratio.rose) ? baseline.ratio.rose : 0.4;
    const setValueRose = (value) => {
      baseline.ratio.rose = value;
      this.schedulePersist();
    };

    this.bindNumber('wine_ratio_rose-number', {
      get: getValueRose,
      set: setValueRose,
      fallback: 0.4,
      format: (value) => value
    });

    this.sliderControls.bindSlider('wine_ratio_rose', {
      getValue: getValueRose,
      setValue: setValueRose,
      formatDisplay: (v) => `${Math.round(v * 100)}%`,
      min: 0,
      max: 1,
      step: 0.05,
      linkedSliders: colorRatioSliders,
      linkMode: 'distribute'
    });

    const getValueRed = () => Number.isFinite(baseline.ratio.red) ? baseline.ratio.red : 0.2;
    const setValueRed = (value) => {
      baseline.ratio.red = value;
      this.schedulePersist();
    };

    this.bindNumber('wine_ratio_red-number', {
      get: getValueRed,
      set: setValueRed,
      fallback: 0.2,
      format: (value) => value
    });

    this.sliderControls.bindSlider('wine_ratio_red', {
      getValue: getValueRed,
      setValue: setValueRed,
      formatDisplay: (v) => `${Math.round(v * 100)}%`,
      min: 0,
      max: 1,
      step: 0.05,
      linkedSliders: colorRatioSliders,
      linkMode: 'distribute'
    });
  }

  bindMixSplitSliders() {
    const baseline = this.getBaseline();

    // Define both sliders for auto-balancing
    const supplierRatioSliders = ['wine_mix_ulu', 'wine_mix_kosher'];

    // Bind ULU mix slider
    const getValueUlu = () => Number.isFinite(baseline.mixSplit.ulu) ? baseline.mixSplit.ulu : 0.7;
    const setValueUlu = (value) => {
      baseline.mixSplit.ulu = value;
      this.schedulePersist();
    };

    this.bindNumber('wine_mix_ulu-number', {
      get: getValueUlu,
      set: setValueUlu,
      fallback: 0.7,
      format: (value) => value
    });

    this.sliderControls.bindSlider('wine_mix_ulu', {
      getValue: getValueUlu,
      setValue: setValueUlu,
      formatDisplay: (v) => `${Math.round(v * 100)}%`,
      min: 0,
      max: 1,
      step: 0.05,
      linkedSliders: supplierRatioSliders,
      linkMode: 'subtract' // For 2 sliders, use subtract mode
    });

    // Bind Kosher mix slider
    const getValueKosher = () => Number.isFinite(baseline.mixSplit.kosher) ? baseline.mixSplit.kosher : 0.3;
    const setValueKosher = (value) => {
      baseline.mixSplit.kosher = value;
      this.schedulePersist();
    };

    this.bindNumber('wine_mix_kosher-number', {
      get: getValueKosher,
      set: setValueKosher,
      fallback: 0.3,
      format: (value) => value
    });

    this.sliderControls.bindSlider('wine_mix_kosher', {
      getValue: getValueKosher,
      setValue: setValueKosher,
      formatDisplay: (v) => `${Math.round(v * 100)}%`,
      min: 0,
      max: 1,
      step: 0.05,
      linkedSliders: supplierRatioSliders,
      linkMode: 'subtract' // For 2 sliders, use subtract mode
    });
  }

  setupRatioValidation() {
    const baseline = this.getBaseline();

    // Register color ratio validation
    this.ratioValidator.registerGroup('color', [
      'wine_ratio_white',
      'wine_ratio_rose',
      'wine_ratio_red'
    ], {
      validationMessageId: 'color-ratio-validation',
      validationSumId: 'color-ratio-sum',
      visualizerId: 'color-ratio-viz',
      getValues: () => [
        baseline.ratio.white || 0,
        baseline.ratio.rose || 0,
        baseline.ratio.red || 0
      ],
      colors: ['#e8d4a8', '#f4c5c5', '#d4a5a5'],
      labels: ['לבן', 'רוזה', 'אדום']
    });

    // Register supplier ratio validation
    this.ratioValidator.registerGroup('supplier', [
      'wine_mix_ulu',
      'wine_mix_kosher'
    ], {
      validationMessageId: 'supplier-ratio-validation',
      validationSumId: 'supplier-ratio-sum',
      visualizerId: 'supplier-ratio-viz',
      getValues: () => [
        baseline.mixSplit.ulu || 0,
        baseline.mixSplit.kosher || 0
      ],
      colors: ['#b88d3b', '#8b7355'],
      labels: ['ULU', 'כשר']
    });
  }

  renderMixSplit() {
    // No longer needed - replaced by bindMixSplitSliders
  }

  renderTiers() {
    const wine = this.getWineConfig();
    const tiers = wine.tiers = wine.tiers || {};
    const tbody = query(this.document, '#tblWineTiers tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    Object.keys(tiers).forEach((key) => {
      let currentKey = key;
      tiers[currentKey] = tiers[currentKey] || { label: '', cost_exVAT: {}, price_incVAT: {} };
      const tier = tiers[currentKey];
      tier.cost_exVAT = tier.cost_exVAT || { white: 0, rose: 0, red: 0 };
      tier.price_incVAT = tier.price_incVAT || { white: 0, rose: 0, red: 0 };
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
        if (tiers[newKey]) {
          this.alert('מפתח זה כבר קיים');
          event.target.value = currentKey;
          return;
        }
        tiers[newKey] = tiers[currentKey];
        delete tiers[currentKey];
        currentKey = newKey;
        this.renderTiers();
        this.schedulePersist();
      });
      tdKey.appendChild(inputKey);
      tr.appendChild(tdKey);

      tr.appendChild(this.cellFactory.text(tier.label || '', (value) => {
        tiers[currentKey].label = value;
      }));

      COLORS.forEach((color) => {
        tr.appendChild(this.cellFactory.number(tier.cost_exVAT[color] ?? 0, (value) => {
          tiers[currentKey].cost_exVAT[color] = value;
        }, { step: '0.5', min: '0', fallback: 0 }));
        tr.appendChild(this.cellFactory.number(tier.price_incVAT[color] ?? 0, (value) => {
          tiers[currentKey].price_incVAT[color] = value;
        }, { step: '0.5', min: '0', fallback: 0 }));
      });

      tr.appendChild(
        this.cellFactory.remove(() => {
          delete tiers[currentKey];
          this.renderTiers();
        })
      );

      tbody.appendChild(tr);
    });
  }

  bindAddTierButton() {
    const button = this.$('addWineTier');
    if (!button) return;
    button.addEventListener('click', () => this.addTier());
  }

  addTier() {
    const wine = this.getWineConfig();
    const tiers = wine.tiers = wine.tiers || {};
    let key = `tier_${Date.now()}`;
    while (tiers[key]) {
      key = `${key}_1`;
    }
    tiers[key] = {
      label: 'יין חדש',
      cost_exVAT: { white: 0, rose: 0, red: 0 },
      price_incVAT: { white: 0, rose: 0, red: 0 }
    };
    this.renderTiers();
    this.schedulePersist();
  }

  alert(message) {
    const view = this.document.defaultView;
    if (view && typeof view.alert === 'function') {
      view.alert(message);
    }
  }
}
