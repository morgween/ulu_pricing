/**
 * SliderControls - Handles slider/range input interactions
 * Syncs slider with number input and display value
 */

export class SliderControls {
  constructor(documentRef) {
    this.document = documentRef;
    this.sliders = new Map();
  }

  /**
   * Initialize a slider control with its associated inputs
   * @param {string} baseId - Base ID (e.g., 'vat')
   * @param {object} options - Configuration options
   */
  bindSlider(baseId, options = {}) {
    const {
      getValue,
      setValue,
      formatDisplay = (v) => v,
      onUpdate = () => {},
      min = 0,
      max = 1,
      step = 0.01,
      linkedSliders = null, // Array of linked slider IDs for auto-balancing
      linkMode = 'distribute' // 'distribute' or 'subtract'
    } = options;

    const slider = this.document.getElementById(baseId);
    const numberInput = this.document.getElementById(`${baseId}-number`);
    const display = this.document.getElementById(`${baseId}-display`);

    if (!slider) return;

    // Set initial values
    const initialValue = getValue();
    slider.value = initialValue;
    if (numberInput) numberInput.value = initialValue;
    if (display) display.textContent = formatDisplay(initialValue);

    // Update progress bar background
    this.updateSliderProgress(slider, initialValue, min, max);

    // Sync slider to number input and display
    const updateFromSlider = () => {
      const value = parseFloat(slider.value);
      if (numberInput) numberInput.value = value;
      if (display) display.textContent = formatDisplay(value);
      this.updateSliderProgress(slider, value, min, max);
      setValue(value);

      // Auto-balance linked sliders
      if (linkedSliders && linkedSliders.length > 0) {
        this.autoBalanceSliders(baseId, value, linkedSliders, linkMode);
      }

      onUpdate(value);
    };

    // Sync number input to slider and display
    const updateFromNumber = () => {
      const value = parseFloat(numberInput.value) || 0;
      const clamped = Math.max(min, Math.min(max, value));
      slider.value = clamped;
      if (display) display.textContent = formatDisplay(clamped);
      this.updateSliderProgress(slider, clamped, min, max);
      setValue(clamped);

      // Auto-balance linked sliders
      if (linkedSliders && linkedSliders.length > 0) {
        this.autoBalanceSliders(baseId, clamped, linkedSliders, linkMode);
      }

      onUpdate(clamped);
    };

    slider.addEventListener('input', updateFromSlider);
    if (numberInput) {
      numberInput.addEventListener('input', updateFromNumber);
    }

    this.sliders.set(baseId, { slider, numberInput, display, getValue, setValue, formatDisplay });
  }

  /**
   * Update slider background to show progress
   */
  updateSliderProgress(slider, value, min, max) {
    const percent = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--slider-progress', `${percent}%`);
  }

  /**
   * Auto-balance linked sliders to maintain sum of 1.0
   * @param {string} changedId - ID of the slider that changed
   * @param {number} newValue - New value of the changed slider
   * @param {Array<string>} linkedIds - IDs of other sliders to balance
   * @param {string} mode - 'distribute' or 'subtract'
   */
  autoBalanceSliders(changedId, newValue, linkedIds, mode = 'distribute') {
    // Get current values of all linked sliders
    const otherSliders = linkedIds.filter(id => id !== changedId);

    if (otherSliders.length === 0) return;

    // Calculate remaining value to distribute
    const remaining = Math.max(0, 1.0 - newValue);

    if (mode === 'distribute') {
      // Distribute remaining value proportionally among other sliders
      const currentTotal = otherSliders.reduce((sum, id) => {
        const sliderData = this.sliders.get(id);
        return sum + (sliderData ? sliderData.getValue() : 0);
      }, 0);

      otherSliders.forEach(id => {
        const sliderData = this.sliders.get(id);
        if (sliderData) {
          const currentValue = sliderData.getValue();
          // If currentTotal is 0, distribute equally
          const proportion = currentTotal > 0 ? currentValue / currentTotal : 1 / otherSliders.length;
          const newValue = Math.max(0, Math.min(1, remaining * proportion));
          this.updateSlider(id, newValue);
          sliderData.setValue(newValue);
        }
      });
    } else if (mode === 'subtract') {
      // For 2-slider groups, just subtract from the other one
      if (otherSliders.length === 1) {
        const otherId = otherSliders[0];
        const sliderData = this.sliders.get(otherId);
        if (sliderData) {
          this.updateSlider(otherId, remaining);
          sliderData.setValue(remaining);
        }
      }
    }
  }

  /**
   * Update a slider's value programmatically
   */
  updateSlider(baseId, value) {
    const sliderData = this.sliders.get(baseId);
    if (!sliderData) return;

    const { slider, numberInput, display, formatDisplay } = sliderData;
    slider.value = value;
    if (numberInput) numberInput.value = value;
    if (display) display.textContent = formatDisplay(value);

    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 1;
    this.updateSliderProgress(slider, value, min, max);
  }
}

/**
 * RatioValidator - Validates that a group of ratios sums to 1.0
 */
export class RatioValidator {
  constructor(documentRef) {
    this.document = documentRef;
    this.groups = new Map();
  }

  /**
   * Register a ratio group for validation
   * @param {string} groupName - Name of the group (e.g., 'color', 'supplier')
   * @param {Array<string>} sliderIds - IDs of sliders in this group
   * @param {object} options - Configuration
   */
  registerGroup(groupName, sliderIds, options = {}) {
    const {
      validationMessageId,
      validationSumId,
      visualizerId,
      getValues,
      colors = [],
      labels = []
    } = options;

    this.groups.set(groupName, {
      sliderIds,
      validationMessageId,
      validationSumId,
      visualizerId,
      getValues,
      colors,
      labels
    });

    // Attach listeners to sliders
    sliderIds.forEach(sliderId => {
      const slider = this.document.getElementById(sliderId);
      if (slider) {
        slider.addEventListener('input', () => this.validateGroup(groupName));
      }
    });

    // Initial validation
    this.validateGroup(groupName);
  }

  /**
   * Validate a ratio group
   */
  validateGroup(groupName) {
    const group = this.groups.get(groupName);
    if (!group) return;

    const values = group.getValues();
    const sum = values.reduce((acc, v) => acc + v, 0);
    const isValid = Math.abs(sum - 1.0) < 0.001; // tolerance for floating point

    // Update validation message
    const validationMsg = this.document.getElementById(group.validationMessageId);
    if (validationMsg) {
      validationMsg.classList.toggle('valid', isValid);
      validationMsg.classList.toggle('invalid', !isValid);
    }

    // Update sum display
    const sumDisplay = this.document.getElementById(group.validationSumId);
    if (sumDisplay) {
      sumDisplay.textContent = `סה״כ: ${sum.toFixed(2)}`;
    }

    // Update visualizer
    this.updateVisualizer(groupName, values);

    return isValid;
  }

  /**
   * Update the visual ratio bar
   */
  updateVisualizer(groupName, values) {
    const group = this.groups.get(groupName);
    if (!group || !group.visualizerId) return;

    const visualizer = this.document.getElementById(group.visualizerId);
    if (!visualizer) return;

    const ratioBar = visualizer.querySelector('.ratio-bar');
    const labelsContainer = visualizer.querySelector('.ratio-labels');

    if (ratioBar && group.colors.length === values.length) {
      // Build gradient
      let gradientStops = [];
      let cumulative = 0;
      values.forEach((value, index) => {
        const percent = value * 100;
        if (percent > 0) {
          gradientStops.push(`${group.colors[index]} ${cumulative}%`);
          cumulative += percent;
          gradientStops.push(`${group.colors[index]} ${cumulative}%`);
        }
      });

      if (gradientStops.length > 0) {
        ratioBar.style.background = `linear-gradient(to left, ${gradientStops.join(', ')})`;
      }
    }

    if (labelsContainer && group.labels.length === values.length) {
      const labelElements = labelsContainer.querySelectorAll('.ratio-label');
      values.forEach((value, index) => {
        if (labelElements[index]) {
          const percent = (value * 100).toFixed(0);
          labelElements[index].textContent = `${group.labels[index]}: ${percent}%`;
        }
      });
    }
  }
}
