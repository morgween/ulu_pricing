// app.js - מחשבון תמחור אירועים
export class PricingCalculator {
  constructor(windowRef = window) {
    this.window = windowRef;
    this.document = windowRef.document;
    this.liveReloadInstalled = false;
    this.liveReloadTimer = null;
    this.installLiveUpdateHook();
  }

  installLiveUpdateHook() {
    if (this.liveReloadInstalled) return;
    const window = this.window;
    if (!window || typeof window.addEventListener !== 'function') return;
    const reloadKeys = new Set(['WINERY_CONFIG_OVERRIDE', 'WINERY_QUOTAS_OVERRIDE']);
    const triggerReload = () => {
      if (this.liveReloadTimer != null) return;

      // Show loading indicator
      const indicator = window.document.createElement('div');
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2196F3;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
      `;
      indicator.textContent = 'מעדכן הגדרות... (Updating settings...)';
      window.document.body.appendChild(indicator);

      this.liveReloadTimer = window.setTimeout(() => {
        this.liveReloadTimer = null;
        try {
          window.location.reload();
        } catch (error) {
          console.warn('Failed reloading after config update', error);
          indicator.style.background = '#f44336';
          indicator.textContent = 'שגיאה בעדכון (Update failed)';
          setTimeout(() => {
            if (indicator.parentNode) {
              indicator.parentNode.removeChild(indicator);
            }
          }, 3000);
        }
      }, 150);
    };

    window.addEventListener('storage', (event) => {
      if (!event) return;
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key && !reloadKeys.has(event.key)) return;
      triggerReload();
    });

    window.addEventListener('winery:overrides-updated', (event) => {
      if (!event?.detail || (!event.detail.configUpdated && !event.detail.quotasUpdated)) return;
      triggerReload();
    });

    this.liveReloadInstalled = true;
  }

  initialize() {
    const window = this.window;
    const document = this.document;
    const CFG = window.WINERY_CONFIG;
    const PRESETS = window.WINERY_QUOTA_PRESETS || [];

    const $ = (id) => document.getElementById(id);
    const q = (sel) => document.querySelector(sel);
    const qa = (sel) => Array.from(document.querySelectorAll(sel));
    const nf = (n) => "₪" + Math.round(+n || 0).toLocaleString("he-IL");
    const integerFormatter = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
    const toInteger = (value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return 0;
      return Math.round(num);
    };
    const formatNumber = (n, digits = 0) => {
      const num = Number.isFinite(+n) ? +n : 0;
      if (digits <= 0) return integerFormatter.format(num);
      return new Intl.NumberFormat('he-IL', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }).format(num);
    };
    const toWholeNumber = (value) => toInteger(value);
    const selectedRadio = (name) => (q(`input[name="${name}"]:checked`) || {}).value;
    let isSettingBottles = false;
    let isSettingDrinks = false;
    let availableVenues = {};

  const parseNumberInput = (input, fallback = 0) => {
    if (!input) return fallback;
    const raw = typeof input.value === 'string' ? input.value.trim() : '';
    const normalized = raw.replace(',', '.');
    const num = Number.parseFloat(normalized);
    if (!Number.isFinite(num)) return fallback;
    return num;
  };

  const clampNonNegative = (num) => (num < 0 ? 0 : num);

  const getMinimumGuests = () => {
    const configured = Number(CFG?.events?.minimumGuests);
    return Number.isFinite(configured) && configured > 0 ? Math.round(configured) : 0;
  };

  const enforceMinimumGuests = () => {
    const adultsInput = $('adults');
    const childrenInput = $('children');
    if (!adultsInput || !childrenInput) return;
    const minGuests = getMinimumGuests();
    let adults = Math.max(0, Math.round(parseNumberInput(adultsInput, 0)));
    let children = Math.max(0, Math.round(parseNumberInput(childrenInput, 0)));
    const total = adults + children;
    if (minGuests > 0 && total < minGuests) {
      adults += minGuests - total;
    }
    adultsInput.value = String(adults);
    childrenInput.value = String(children);
  };

  if (!CFG) {
    alert('קובץ ההגדרות (config.js) לא נטען');
    return;
  }

  // חישוב ראשים
  function heads() {
    const A = +($('adults')?.value || 0);
    const C = +($('children')?.value || 0);
    const childFactor = CFG?.food?.child_food_factor ?? CFG?.children?.factor ?? 0.75;
    return { A, C, heads: A + C, E: A + childFactor * C };
  }

  // בניית מיקומים
  function buildVenueRadios() {
    const r = $('venueRow');
    if (!r) return;
    r.innerHTML = '';
    const venueMap = { ...(CFG?.pricing?.place?.venues || {}) };
    const baseFees = CFG?.pricing?.venues?.baseFees;
    if (Array.isArray(baseFees)) {
      baseFees.forEach((entry) => {
        if (!entry || !entry.key) return;
        const key = entry.key;
        const existing = venueMap[key] || {};
        const baseFee = Number.parseFloat(entry.baseFee_exVAT);
        const baseCost = Number.parseFloat(entry.cost_exVAT);
        const locMultiplier = Number.parseFloat(entry.locationMultiplier);
        venueMap[key] = {
          ...existing,
          label: entry.label || existing.label || key,
          base_exVAT: Number.isFinite(baseFee) ? baseFee : existing.base_exVAT,
          cost_exVAT: Number.isFinite(baseCost) ? baseCost : existing.cost_exVAT,
          locationMultiplier: Number.isFinite(locMultiplier) ? locMultiplier : existing.locationMultiplier
        };
      });
    }
    const venues = venueMap;
    availableVenues = venues;
    Object.entries(venues).forEach(([key, v]) => {
      const label = document.createElement('label');
      label.className = 'pill';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'venue';
      input.value = key;

      const span = document.createElement('span');
      const multiplier = Number.isFinite(v?.locationMultiplier) ? v.locationMultiplier : null;
      if (multiplier && Math.abs(multiplier - 1) > 0.001) {
        span.textContent = `${v.label || key} (×${formatNumber(multiplier, 2)})`;
      } else {
        span.textContent = v.label || key;
      }

      label.appendChild(input);
      label.appendChild(span);
      r.appendChild(label);
    });
    const first = q('input[name="venue"]');
    if (first) first.checked = true;
    qa('input[name="venue"]').forEach(inp => {
      ['change', 'input'].forEach(evt => inp.addEventListener(evt, calc));
    });
  }

  function buildMenuExtrasUI() {
    const wrap = $('upgrade_wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    wrap.classList.remove('is-hidden');
    const extrasCfg = CFG?.food?.extras || {};
    const orderedExtras = ['quiches', 'pizza', 'snack']
      .map((key) => ({ key, cfg: extrasCfg[key] }))
      .filter((entry) => entry.cfg && entry.cfg.id);

    if (!orderedExtras.length) {
      wrap.classList.add('is-hidden');
      return;
    }

    const row = document.createElement('div');
    row.className = 'row';

    orderedExtras.forEach(({ cfg }) => {
      const label = document.createElement('label');
      label.className = 'pill';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = cfg.id;
      input.dataset.appliesTo = cfg.appliesTo || 'any';
      label.appendChild(input);

      const text = document.createTextNode(` ${cfg.label || cfg.id}`);
      label.appendChild(text);

      input.addEventListener('change', () => {
        calc();
      });

      row.appendChild(label);
    });

    wrap.appendChild(row);
  }

  function refreshExtrasAvailability() {
    const wrap = $('upgrade_wrap');
    if (!wrap) return;
    const menu = selectedRadio('menu') || 'winery';
    let extrasChanged = false;
    const inputs = qa('#upgrade_wrap input[type="checkbox"]');
    let hasAllowedExtras = false;
    inputs.forEach((input) => {
      const appliesTo = input.dataset.appliesTo || 'any';
      const allowed = appliesTo === 'any'
        || (appliesTo === 'winery' && menu === 'winery')
        || (appliesTo === 'catering' && menu === 'own_catering')
        || (appliesTo === 'client' && menu === 'client_catering');
      hasAllowedExtras = hasAllowedExtras || allowed;
      if (!allowed && input.checked) {
        input.checked = false;
        extrasChanged = true;
      }
      input.disabled = !allowed;
      const label = input.closest('label');
      if (label) {
        label.classList.toggle('is-disabled', !allowed);
      }
    });
    wrap.classList.toggle('is-hidden', !hasAllowedExtras);
    if (extrasChanged) {
      calc();
    }
  }

  // שדות ייעודיים לאירוע עסקי
  function updateCorporateVisibility() {
    const kind = selectedRadio('etype') || 'personal';
    qa('.corp-only').forEach(el => el.classList.toggle('is-visible', kind === 'corporate'));
  }

  // עדכון תצוגת תפריט
  function updateMenuVisibility() {
    const menu = selectedRadio('menu');
    const upgrade = $('upgrade_wrap');
    const own = $('own_catering_wrap');
    if (own) {
      own.classList.toggle('is-hidden', menu !== 'own_catering');
    }
    if (upgrade) {
      const inputs = qa('#upgrade_wrap input[type="checkbox"]');
      const hasVisibleExtras = inputs.some((input) => {
        const appliesTo = input.dataset.appliesTo || 'any';
        return appliesTo === 'any'
          || (appliesTo === 'winery' && menu === 'winery')
          || (appliesTo === 'catering' && menu === 'own_catering')
          || (appliesTo === 'client' && menu === 'client_catering');
      });
      upgrade.classList.toggle('is-hidden', !hasVisibleExtras);
    }
    refreshExtrasAvailability();
  }

  function updateAutoToggleUI() {
    const wrapper = q('.field--auto');
    const auto = $('autoBottles');
    if (wrapper && auto) {
      wrapper.classList.toggle('is-active', auto.checked);
    }
  }

  function distributeBottlesByMix(total, mix = {}) {
    const fallback = CFG?.pricing?.wine?.defaults?.mix || { white: 0.4, rose: 0.4, red: 0.2 };
    const raw = {
      white: clampNonNegative(mix.white ?? fallback.white ?? 0.4),
      rose: clampNonNegative(mix.rose ?? fallback.rose ?? 0.4),
      red: clampNonNegative(mix.red ?? fallback.red ?? 0.2)
    };
    const safeTotal = Math.max(0, Math.round(total));
    const sum = raw.white + raw.rose + raw.red || 1;
    const weights = {
      white: raw.white / sum,
      rose: raw.rose / sum,
      red: raw.red / sum
    };
    let white = Math.floor(safeTotal * weights.white);
    let rose = Math.floor(safeTotal * weights.rose);
    let red = Math.floor(safeTotal * weights.red);
    let remain = safeTotal - (white + rose + red);
    const order = ['rose', 'white', 'red'];
    let i = 0;
    while (remain-- > 0) {
      const key = order[i % order.length];
      if (key === 'rose') rose++;
      else if (key === 'white') white++;
      else red++;
      i++;
    }
    return { total: safeTotal, white, rose, red };
  }

  function updateWineFieldVisibility() {
    // Get wine ratios from config
    const ratio = CFG?.wine?.baseline?.ratio || { white: 0.4, rose: 0.4, red: 0.2 };
    const colors = ['white', 'rose', 'red'];

    colors.forEach(color => {
      const fieldId = `bottles_${color}`;
      const field = $(fieldId);
      if (field) {
        const parent = field.closest('.field');
        if (parent) {
          const ratioValue = Number(ratio[color]) || 0;
          // Hide field if ratio is 0, otherwise show
          if (ratioValue === 0) {
            parent.style.display = 'none';
            field.value = '0'; // Reset value to 0
          } else {
            parent.style.display = '';
          }
        }
      }
    });
  }

  function applyBottleValues(values, { markManual = false } = {}) {
    isSettingBottles = true;
    try {
      // Update field visibility based on ratios
      updateWineFieldVisibility();

      const totalEl = $('bottles_total');
      if (totalEl) {
        totalEl.value = Math.max(0, Math.round(values.total ?? 0));
        totalEl.dataset.manual = markManual ? 'true' : 'false';
      }
      const whiteEl = $('bottles_white');
      if (whiteEl) {
        whiteEl.value = Math.max(0, Math.round(values.white ?? 0));
        whiteEl.dataset.manual = markManual ? 'true' : 'false';
      }
      const roseEl = $('bottles_rose');
      if (roseEl) {
        roseEl.value = Math.max(0, Math.round(values.rose ?? 0));
        roseEl.dataset.manual = markManual ? 'true' : 'false';
      }
      const redEl = $('bottles_red');
      if (redEl) {
        redEl.value = Math.max(0, Math.round(values.red ?? 0));
        redEl.dataset.manual = markManual ? 'true' : 'false';
      }
    } finally {
      isSettingBottles = false;
    }
  }

  function disableAutoBottles() {
    const auto = $('autoBottles');
    if (!auto) return;
    if (auto.checked) {
      auto.checked = false;
      updateAutoToggleUI();
    }
    ['bottles_total', 'bottles_white', 'bottles_rose', 'bottles_red'].forEach(id => {
      const el = $(id);
      if (el) el.dataset.manual = 'true';
    });
  }

  // יין - חישוב אוטומטי
  function primeBottlesAuto() {
    const auto = $('autoBottles');
    if (!auto || !auto.checked) return;
    const { A } = heads();
    const guestsPerBottle = Number(CFG?.wine?.baseline?.guestsPerBottle)
      || Number(CFG?.pricing?.wine?.defaults?.bottlePerAdults)
      || 5;
    const ratio = CFG?.wine?.baseline?.ratio
      || CFG?.pricing?.wine?.defaults?.mix
      || { white: 0.4, rose: 0.4, red: 0.2 };
    const totalRequested = Math.ceil(A / Math.max(1, guestsPerBottle));
    const baseline = distributeWineByRatio(totalRequested, ratio, A);
    const total = (baseline.white || 0) + (baseline.rose || 0) + (baseline.red || 0);
    applyBottleValues({ total, ...baseline }, { markManual: false });
    updateAutoToggleUI();
  }

  function syncManualBottles() {
    if (isSettingBottles) return;
    const w = clampNonNegative(parseNumberInput($('bottles_white'), 0));
    const r = clampNonNegative(parseNumberInput($('bottles_rose'), 0));
    const d = clampNonNegative(parseNumberInput($('bottles_red'), 0));
    const total = Math.max(0, Math.round(w + r + d));
    const totalEl = $('bottles_total');
    if (totalEl) {
      isSettingBottles = true;
      totalEl.value = total;
      totalEl.dataset.manual = 'true';
      isSettingBottles = false;
    }
  }

  const toStepString = (value) => {
    const rounded = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
    if (!Number.isFinite(rounded) || rounded === 0) return '0';
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
      return String(Math.round(rounded));
    }
    return rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  };

  function drinkDefaultsByDuration(duration) {
    const defaults = (CFG?.drinks?.ratesByDuration || {})[duration] || {};
    return {
      hot: clampNonNegative(defaults.hot ?? 0),
      cold: clampNonNegative(defaults.cold ?? 0)
    };
  }

  function applyDrinkDefaults({ force = false } = {}) {
    const duration = $('duration')?.value || 'short';
    const defaults = drinkDefaultsByDuration(duration);
    [['hot', 'hot_count'], ['cold', 'cold_count']].forEach(([type, id]) => {
      const input = $(id);
      if (!input) return;
      input.dataset.defaultValue = defaults[type];
      const isManual = input.dataset.userEdited === 'true';
      if (force || !isManual) {
        isSettingDrinks = true;
        input.value = toStepString(defaults[type]);
        input.dataset.userEdited = 'false';
        isSettingDrinks = false;
      }
    });
  }

  function refreshDrinkAvailability() {
    const hotToggle = $('use_hot');
    const coldToggle = $('use_cold');
    const hotInput = $('hot_count');
    const coldInput = $('cold_count');
    if (hotInput && hotToggle) {
      hotInput.disabled = !hotToggle.checked;
    }
    if (coldInput && coldToggle) {
      coldInput.disabled = !coldToggle.checked;
    }
    qa('.quantity-control').forEach(ctrl => {
      const targetId = ctrl.dataset.input;
      const input = targetId ? $(targetId) : null;
      if (!input) return;
      const disabled = input.disabled;
      ctrl.classList.toggle('is-disabled', disabled);
      ctrl.querySelectorAll('.qty-btn').forEach(btn => {
        btn.disabled = disabled;
        btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      });
    });
  }

  // הוספת תוספת - enhanced with commission calculation
  function addQuotaRow(item = { desc: '', category: 'winery', price_ex: 0, type: 'fixed' }) {
    const tbody = q('#quotaTable tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');

    // Description field
    const tdDesc = document.createElement('td');
    const inputDesc = document.createElement('input');
    inputDesc.type = 'text';
    inputDesc.className = 'q-desc';
    inputDesc.value = item.desc || '';
    inputDesc.placeholder = 'תיאור התוספת';
    tdDesc.appendChild(inputDesc);
    tr.appendChild(tdDesc);

    // Source dropdown (who brings it)
    const tdSource = document.createElement('td');
    const selectSource = document.createElement('select');
    selectSource.className = 'q-source';
    const optWinery = document.createElement('option');
    optWinery.value = 'winery';
    optWinery.textContent = 'יקב מביא';
    const optCustomer = document.createElement('option');
    optCustomer.value = 'customer';
    optCustomer.textContent = 'לקוח מביא';
    selectSource.appendChild(optWinery);
    selectSource.appendChild(optCustomer);
    selectSource.value = item.category === 'customer' ? 'customer' : 'winery';
    tdSource.appendChild(selectSource);
    tr.appendChild(tdSource);

    // Pricing type dropdown (for winery) / Commission type (for customer)
    const tdType = document.createElement('td');
    const selectType = document.createElement('select');
    selectType.className = 'q-type';
    const optFixed = document.createElement('option');
    optFixed.value = 'fixed';
    optFixed.textContent = 'מחיר קבוע';
    const optCommissionWineryFixed = document.createElement('option');
    optCommissionWineryFixed.value = 'commission_winery_fixed';
    optCommissionWineryFixed.textContent = 'עמלה 15% (לאירוע)';
    const optCommissionWineryPerPerson = document.createElement('option');
    optCommissionWineryPerPerson.value = 'commission_winery_per_person';
    optCommissionWineryPerPerson.textContent = 'עמלה 15% (לאדם)';
    const optCommissionPerPerson = document.createElement('option');
    optCommissionPerPerson.value = 'commission_per_person';
    optCommissionPerPerson.textContent = 'עמלה לאדם';
    selectType.appendChild(optFixed);
    selectType.appendChild(optCommissionWineryFixed);
    selectType.appendChild(optCommissionWineryPerPerson);
    selectType.appendChild(optCommissionPerPerson);
    selectType.value = item.type || 'fixed';
    tdType.appendChild(selectType);
    tr.appendChild(tdType);

    // Price/Commission field
    const tdPrice = document.createElement('td');
    const inputPrice = document.createElement('input');
    inputPrice.type = 'number';
    inputPrice.min = '0';
    inputPrice.step = '10';
    inputPrice.className = 'q-price';
    inputPrice.value = item.price_ex || item.unit_exVAT || 0;
    inputPrice.placeholder = '0';
    tdPrice.appendChild(inputPrice);
    tr.appendChild(tdPrice);

    // Total
    const tdTotal = document.createElement('td');
    tdTotal.className = 'q-total';
    tdTotal.textContent = nf(0);
    tr.appendChild(tdTotal);

    // Remove button
    const tdRemove = document.createElement('td');
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn danger q-del';
    btnRemove.textContent = '×';
    btnRemove.setAttribute('aria-label', 'מחק תוספת');
    tdRemove.appendChild(btnRemove);
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);

    const updateTypeOptions = () => {
      const source = selectSource.value;
      const isCustomer = source === 'customer';

      // Show/hide options based on source
      optFixed.style.display = '';
      optCommissionWineryFixed.style.display = isCustomer ? 'none' : '';
      optCommissionWineryPerPerson.style.display = isCustomer ? 'none' : '';
      optCommissionPerPerson.style.display = isCustomer ? '' : 'none';

      // Reset to appropriate default if needed
      if (isCustomer && (selectType.value === 'commission_winery_fixed' || selectType.value === 'commission_winery_per_person')) {
        selectType.value = 'commission_per_person';
      } else if (!isCustomer && selectType.value === 'commission_per_person') {
        selectType.value = 'commission_winery_fixed';
      }

      // Update input placeholder and label based on type
      updateInputLabel();
    };

    const updateInputLabel = () => {
      const type = selectType.value;
      const commissionMin = Number(CFG?.addons?.customerCommissionMin) || 10;
      const commissionMax = Number(CFG?.addons?.customerCommissionMax) || 60;

      if (type === 'commission_winery_fixed') {
        inputPrice.placeholder = 'מחיר ספק לאירוע';
        inputPrice.min = '0';
        inputPrice.removeAttribute('max');
      } else if (type === 'commission_winery_per_person') {
        inputPrice.placeholder = 'מחיר ספק לאדם';
        inputPrice.min = '0';
        inputPrice.removeAttribute('max');
      } else if (type === 'commission_per_person') {
        inputPrice.placeholder = `עמלה לאדם (${commissionMin}-${commissionMax})`;
        inputPrice.min = String(commissionMin);
        inputPrice.max = String(commissionMax);
      } else {
        inputPrice.placeholder = 'מחיר';
        inputPrice.min = '0';
        inputPrice.removeAttribute('max');
      }
    };

    const update = () => {
      const source = selectSource.value === 'customer' ? 'customer' : 'winery';
      const type = selectType.value;
      const { heads: guestCount } = heads();

      const wineryCommissionRate = Number(CFG?.addons?.wineryCommissionRate) || 0.15;
      const commissionMin = Number(CFG?.addons?.customerCommissionMin) || 10;
      const commissionMax = Number(CFG?.addons?.customerCommissionMax) || 60;

      let fullPrice = 0;
      let commission = 0;
      let vendorPriceInput = parseNumberInput(inputPrice, 0);
      let vendorPriceTotal = 0;

      if (type === 'commission_winery_fixed') {
        // Commission when winery brings addon (fixed price)
        // Vendor price is per event
        vendorPriceTotal = vendorPriceInput;
        commission = vendorPriceTotal * wineryCommissionRate;
        fullPrice = vendorPriceTotal + commission;
        const pct = Math.round(wineryCommissionRate * 100);
        tdTotal.textContent = nf(fullPrice);
        tdTotal.title = 'ספק: ' + nf(vendorPriceTotal) + ' • עמלה ' + pct + '%: ' + nf(commission);
      } else if (type === 'commission_winery_per_person') {
        // Commission when winery brings addon (per person)
        // Vendor price is per person
        vendorPriceTotal = vendorPriceInput * guestCount;
        commission = vendorPriceTotal * wineryCommissionRate;
        fullPrice = vendorPriceTotal + commission;
        const pct = Math.round(wineryCommissionRate * 100);
        tdTotal.textContent = nf(fullPrice);
        tdTotal.title = nf(vendorPriceInput) + '×' + guestCount + ' אורחים • עמלה ' + pct + '%: ' + nf(commission);
      } else if (type === 'commission_per_person') {
        // Per-person commission when customer brings
        const commissionRate = Math.max(commissionMin, Math.min(commissionMax, vendorPriceInput));
        commission = commissionRate * guestCount;
        fullPrice = commission; // Only commission, no vendor cost
        vendorPriceTotal = 0;
        tdTotal.textContent = nf(fullPrice);
        tdTotal.title = nf(commissionRate) + '×' + guestCount + ' אורחים';
      } else {
        // Fixed pricing
        fullPrice = vendorPriceInput;
        vendorPriceTotal = 0;
        commission = 0;
        tdTotal.textContent = nf(fullPrice);
        tdTotal.title = '';
      }

      // Store data for calculation
      tr.dataset.source = source;
      tr.dataset.type = type;
      tr.dataset.vendor_price_input = String(vendorPriceInput);
      tr.dataset.vendor_price_total = String(vendorPriceTotal);
      tr.dataset.commission = String(commission);
      tr.dataset.full_price = String(fullPrice);
      tr.dataset.commission_rate = type === 'commission_per_person' ? String(Math.max(commissionMin, Math.min(commissionMax, vendorPriceInput))) : '0';

      calc();
    };

    inputPrice.addEventListener('input', update);
    selectType.addEventListener('change', () => {
      updateInputLabel();
      update();
    });
    selectSource.addEventListener('change', () => {
      updateTypeOptions();
      update();
    });
    btnRemove.addEventListener('click', () => {
      tr.remove();
      calc();
    });

    updateTypeOptions();
    update();
  }

  function buildQuotaPresets() {
    const row = $('quotaPresets');
    if (!row) return;
    row.innerHTML = '';
    PRESETS.forEach(p => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = p.label || p.desc || 'הוסף';
      b.addEventListener('click', (e) => {
        e.preventDefault();
        addQuotaRow({ desc: p.desc || p.label, type: p.type, qty: p.qty, unit_exVAT: p.unit_exVAT, category: p.category });
      });
      row.appendChild(b);
    });
  }

  const getVatRate = () => {
    const vat = Number(CFG?.vat);
    return Number.isFinite(vat) && vat >= 0 ? vat : 0.18;
  };

  const toExVat = (amountInc, vatRate) => {
    const value = Number(amountInc);
    const rate = Number(vatRate);
    if (!Number.isFinite(value)) return 0;
    const divisor = 1 + (Number.isFinite(rate) ? rate : 0);
    return divisor > 0 ? value / divisor : value;
  };

  const computeWorkerCount = (guestCount, mode) => {
    const normalized = mode === 'our_food' ? 'our_food' : 'catering';
    const matrix = Array.isArray(CFG?.staffing?.workerMatrix) ? CFG.staffing.workerMatrix : [];
    const guests = Number(guestCount);
    if (matrix.length) {
      let selected = matrix.find((row) => {
        const min = Number(row?.minGuests);
        const max = Number(row?.maxGuests);
        const lower = Number.isFinite(min) ? min : -Infinity;
        const upper = Number.isFinite(max) ? max : Infinity;
        return guests >= lower && guests <= upper;
      });
      if (!selected) {
        const ordered = matrix.slice().sort((a, b) => (Number(a?.minGuests) || 0) - (Number(b?.minGuests) || 0));
        if (guests < (Number(ordered[0]?.minGuests) || 0)) {
          selected = ordered[0];
        } else {
          selected = ordered[ordered.length - 1];
        }
      }
      const workers = Number(selected?.[normalized]);
      if (Number.isFinite(workers) && workers > 0) return workers;
    }
    return 1;
  };

  const distributeWineByRatio = (totalBottles, ratio, adultGuests) => {
    const colors = ['white', 'rose', 'red'];
    const baselineCfg = CFG?.wine?.baseline || {};
    const minGuests = Number(baselineCfg.minimumGuestsForAllTypes) || 5;
    const ensureAllTypes = Number(adultGuests) >= minGuests;
    const total = Math.max(0, Math.round(totalBottles));
    const result = { white: 0, rose: 0, red: 0 };
    if (!total) return result;

    // Normalize weights
    const weights = {
      white: Number(ratio?.white) || 0,
      rose: Number(ratio?.rose) || 0,
      red: Number(ratio?.red) || 0
    };
    const weightSum = weights.white + weights.rose + weights.red || 1;
    colors.forEach((color) => {
      weights[color] = weights[color] / weightSum;
    });

    // Identify which colors should be included (ratio > 0)
    const activeColors = colors.filter(color => weights[color] > 0);
    if (activeColors.length === 0) return result;

    // Calculate ideal distribution based on ratio
    const exact = {};
    activeColors.forEach((color) => {
      exact[color] = weights[color] * total;
    });

    // Start with floor values
    let allocated = 0;
    activeColors.forEach((color) => {
      result[color] = Math.floor(exact[color]);
      allocated += result[color];
    });

    // If ensuring all 3 types, make sure each has at least 1
    if (ensureAllTypes && activeColors.length === 3) {
      activeColors.forEach((color) => {
        if (result[color] === 0) {
          result[color] = 1;
          allocated += 1;
        }
      });
    }

    // Distribute remaining bottles based on fractional parts
    // Priority when fractions are equal: Rose > White > Red
    const remaining = total - allocated;
    if (remaining > 0) {
      const fractionalParts = activeColors.map(color => ({
        color,
        fraction: exact[color] - Math.floor(exact[color]),
        current: result[color],
        target: exact[color]
      }));

      // Sort by:
      // 1. Largest fractional part first
      // 2. If equal, priority: rose > white > red
      fractionalParts.sort((a, b) => {
        const fracDiff = b.fraction - a.fraction;
        if (Math.abs(fracDiff) > 1e-9) return fracDiff;
        // Priority tiebreaker
        const priority = { rose: 3, white: 2, red: 1 };
        return (priority[b.color] || 0) - (priority[a.color] || 0);
      });

      // Distribute remaining bottles
      for (let i = 0; i < remaining; i++) {
        const idx = i % fractionalParts.length;
        result[fractionalParts[idx].color] += 1;
      }
    }

    return result;
  };

  const splitWineByTier = (colorCounts, tierKey) => {
    const colors = ['white', 'rose', 'red'];
    const sanitizedCounts = {};
    let totalBottles = 0;
    colors.forEach((color) => {
      const value = Math.max(0, Math.round(Number(colorCounts?.[color] || 0)));
      sanitizedCounts[color] = value;
      totalBottles += value;
    });

    const allocation = {
      ulu: { white: 0, rose: 0, red: 0, total: 0 },
      kosher: { white: 0, rose: 0, red: 0, total: 0 }
    };

    if (!totalBottles) {
      return allocation;
    }

    if (tierKey === 'kosher') {
      colors.forEach((color) => {
        const count = sanitizedCounts[color];
        allocation.kosher[color] = count;
        allocation.kosher.total += count;
      });
      return allocation;
    }

    if (tierKey !== 'mix') {
      colors.forEach((color) => {
        const count = sanitizedCounts[color];
        allocation.ulu[color] = count;
        allocation.ulu.total += count;
      });
      return allocation;
    }

    // tierKey === 'mix'
    const mixSplit = CFG?.wine?.baseline?.mixSplit || { ulu: 0.7, kosher: 0.3 };
    const desiredRatio = CFG?.wine?.baseline?.ratio || { white: 0.4, rose: 0.4, red: 0.2 };
    const ratioWeights = { ...desiredRatio };
    const ratioSum = (Number(ratioWeights.white) || 0)
      + (Number(ratioWeights.rose) || 0)
      + (Number(ratioWeights.red) || 0) || 1;
    colors.forEach((color) => {
      ratioWeights[color] = (Number(ratioWeights[color]) || 0) / ratioSum;
    });

    const uluShare = Number.isFinite(Number(mixSplit?.ulu)) ? Number(mixSplit.ulu) : 0.7;
    let uluTarget = Math.round(totalBottles * uluShare);
    uluTarget = Math.max(0, Math.min(uluTarget, totalBottles));
    const kosherTarget = totalBottles - uluTarget;

    const targets = { ulu: uluTarget, kosher: kosherTarget };

    colors.forEach((color) => {
      let remaining = sanitizedCounts[color];
      while (remaining > 0) {
        const options = [];
        ['ulu', 'kosher'].forEach((label) => {
          const targetTotal = targets[label];
          if (targetTotal <= 0) return;
          const currentTotal = allocation[label].total;
          if (currentTotal >= targetTotal) return;
          const desiredShare = ratioWeights[color] || 0;
          const currentShare = currentTotal > 0
            ? (allocation[label][color] || 0) / currentTotal
            : 0;
          const remainingCapacity = targetTotal - currentTotal;
          const score = desiredShare - currentShare;
          options.push({ label, score, remainingCapacity });
        });

        let chosenLabel = options.length ? options[0].label : null;
        if (options.length > 1) {
          options.sort((a, b) => {
            if (Math.abs(b.score - a.score) > 1e-9) {
              return b.score - a.score;
            }
            return b.remainingCapacity - a.remainingCapacity;
          });
          chosenLabel = options[0].label;
        }

        if (!chosenLabel) {
          chosenLabel = (targets.kosher > allocation.kosher.total) ? 'kosher' : 'ulu';
        }

        allocation[chosenLabel][color] += 1;
        allocation[chosenLabel].total += 1;
        remaining -= 1;
      }
    });

    return allocation;
  };

  const computeWineFinancials = (colorCounts, tierKey) => {
    const allocation = splitWineByTier(colorCounts, tierKey);
    const tiers = CFG?.wine?.tiers || {};
    const vatRate = getVatRate();
    const colors = ['white', 'rose', 'red'];
    const byLabel = {
      ulu: { cost: 0, income: 0 },
      kosher: { cost: 0, income: 0 }
    };
    const counts = { white: 0, rose: 0, red: 0 };
    colors.forEach((color) => {
      const uluCount = allocation.ulu[color] || 0;
      const kosherCount = allocation.kosher[color] || 0;
      counts[color] = uluCount + kosherCount;
      if (uluCount > 0) {
        const tier = tiers.ulu || {};
        const costPer = Number(tier?.cost_exVAT?.[color]) || 0;
        const pricePer = toExVat(tier?.price_incVAT?.[color], vatRate);
        byLabel.ulu.cost += costPer * uluCount;
        byLabel.ulu.income += pricePer * uluCount;
      }
      if (kosherCount > 0) {
        const tier = tiers.kosher || {};
        const costPer = Number(tier?.cost_exVAT?.[color]) || 0;
        const pricePer = toExVat(tier?.price_incVAT?.[color], vatRate);
        byLabel.kosher.cost += costPer * kosherCount;
        byLabel.kosher.income += pricePer * kosherCount;
      }
    });
    return {
      counts,
      allocation,
      costTotal: byLabel.ulu.cost + byLabel.kosher.cost,
      incomeTotal: byLabel.ulu.income + byLabel.kosher.income,
      byLabel
    };
  };

  // חישוב ראשי
  let lastCalc = null;

  function calc() {
    if (!CFG) return null;

    const vatRate = getVatRate();
    const kind = selectedRadio('etype') || 'personal';
    const clientName = $('client')?.value?.trim() || '';
    const date = $('date')?.value || '';
    const eventType = $('event_type')?.value || '';
    const duration = $('duration')?.value || 'short';
    enforceMinimumGuests();
    const { A, C, heads: headsTotalGuests, E: effectiveGuests } = heads();
    const minimumGuests = getMinimumGuests();
    const totalGuests = Math.max(minimumGuests, headsTotalGuests);
    const menu = selectedRadio('menu') || 'winery';
    const venueKey = selectedRadio('venue') || '';
    const venueLabel = (() => {
      const input = venueKey ? document.querySelector(`input[name="venue"][value="${venueKey}"]`) : null;
      const label = input?.closest('label');
      return label ? label.textContent.trim() : '';
    })();
    const venueInfo = (availableVenues && availableVenues[venueKey]) || {};
    const venueBasePrice_ex = Math.max(0, Number(venueInfo.base_exVAT ?? venueInfo.baseFee_exVAT ?? 0) || 0);
    const venueBaseCost_ex = Math.max(0, Number(venueInfo.cost_exVAT) || 0);
    const ownCateringRate = menu === 'own_catering' ? parseNumberInput($('own_catering_pp'), 0) : 0;
    const wineTierInput = $('wine_tier')?.value || 'ulu';
    const wineTier = ['mix', 'kosher', 'ulu'].includes(wineTierInput) ? wineTierInput : 'ulu';

    const extrasCfg = CFG?.food?.extras || {};
    const extraSelections = {
      quiches: extrasCfg.quiches?.id ? Boolean($(extrasCfg.quiches.id)?.checked) : false,
      pizza: extrasCfg.pizza?.id ? Boolean($(extrasCfg.pizza.id)?.checked) : false,
      snack: extrasCfg.snack?.id ? Boolean($(extrasCfg.snack.id)?.checked) : false
    };

    const defaultsDrink = drinkDefaultsByDuration(duration);
    const includeHot = $('use_hot') ? $('use_hot').checked : true;
    const includeCold = $('use_cold') ? $('use_cold').checked : true;
    const hotRate = clampNonNegative(parseNumberInput($('hot_count'), defaultsDrink.hot));
    const coldRate = clampNonNegative(parseNumberInput($('cold_count'), defaultsDrink.cold));
    const baselineHotRate = clampNonNegative(defaultsDrink.hot);
    const baselineColdRate = clampNonNegative(defaultsDrink.cold);

    const bottles = {
      white: Math.max(0, Math.round(parseNumberInput($('bottles_white'), 0))),
      rose: Math.max(0, Math.round(parseNumberInput($('bottles_rose'), 0))),
      red: Math.max(0, Math.round(parseNumberInput($('bottles_red'), 0)))
    };

    const addons = qa('#quotaTable tbody tr').map((tr) => {
      const desc = (tr.querySelector('.q-desc')?.value || '').trim();
      const source = tr.dataset.source || (tr.querySelector('.q-source')?.value === 'customer' ? 'customer' : 'winery');
      const type = tr.dataset.type || 'fixed';
      const vendorPriceInput = Number(tr.dataset.vendor_price_input || parseNumberInput(tr.querySelector('.q-price'), 0)) || 0;
      const vendorPriceTotal = Number(tr.dataset.vendor_price_total) || 0;
      const commission = Number(tr.dataset.commission) || 0;
      const fullPrice = Number(tr.dataset.full_price) || vendorPriceInput;

      let revenue = 0;
      let cost = 0;
      let effectiveQty = 1;
      let displayPrice = fullPrice;

      if (type === 'commission_winery_fixed' || type === 'commission_winery_per_person') {
        // 15% commission when winery brings addon
        // Full price charged to customer = vendor price + 15%
        // Revenue (our profit) is the 15% commission
        // Cost to us is the vendor price
        revenue = commission;
        cost = vendorPriceTotal;
        effectiveQty = type === 'commission_winery_per_person' ? totalGuests : 1;
        displayPrice = fullPrice; // Show full price to customer
      } else if (type === 'commission_per_person') {
        // Per-person commission when customer brings
        const commissionMin = Number(CFG?.addons?.customerCommissionMin) || 10;
        const commissionMax = Number(CFG?.addons?.customerCommissionMax) || 60;
        const commissionRate = Number(tr.dataset.commission_rate) || Math.max(commissionMin, Math.min(commissionMax, vendorPriceInput));
        revenue = commissionRate * totalGuests;
        cost = 0; // No cost to us
        effectiveQty = totalGuests;
        displayPrice = commissionRate;
      } else {
        // Fixed pricing (traditional)
        revenue = vendorPriceInput;
        cost = 0; // Assuming no cost for traditional addons
        effectiveQty = 1;
        displayPrice = vendorPriceInput;
      }

      return {
        desc,
        type,
        category: source,
        baseQty: 1,
        unit: displayPrice,
        effectiveQty,
        price_ex: fullPrice, // Total price charged to customer
        revenue, // Our profit/commission
        cost, // Cost to us (vendor price for commission_winery)
        vendorPriceInput,
        vendorPriceTotal,
        commission,
        isCommission: type.startsWith('commission_')
      };
    });
    const addonsIncome = addons.reduce((sum, item) => sum + (Number(item.price_ex) || 0), 0); // Total charged to customer
    const addonsRevenue = addons.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0); // Our profit/commission
    const addonsTotalCost = addons.reduce((sum, item) => sum + (Number(item.cost) || 0), 0); // Our costs

    const workerMode = menu === 'winery' ? 'our_food' : 'catering';
    const workers = computeWorkerCount(totalGuests, workerMode);
    const workerRate = Number(CFG?.staffing?.workerRate_exVAT) || 0;
    const managerCost = Number(CFG?.staffing?.managerBonus_exVAT) || 0;
    const workerRevenueComponent = Number(CFG?.staffing?.revenueComponent_exVAT) || 100;
    const workersCost = managerCost + workers * workerRate;
    const workersIncome = workersCost + workerRevenueComponent;

    const extrasApplied = [];
    const extrasOutsideBase = [];
    let foodCostBase = 0;
    let foodIncomeBase = 0;
    let foodCostTotal = 0;
    let foodIncomeTotal = 0;

    const registerFoodTotals = (cost, income, includeInBase) => {
      foodCostTotal += cost;
      foodIncomeTotal += income;
      if (includeInBase) {
        foodCostBase += cost;
        foodIncomeBase += income;
      }
    };

    const applyExtra = (cfg, enabled) => {
      if (!cfg || !enabled) return;
      const appliesTo = cfg.appliesTo || 'any';
      if (appliesTo === 'winery' && menu !== 'winery') return;
      if (appliesTo === 'catering' && menu === 'winery') return;
      const quantity = cfg.perGuestMode === 'total' ? totalGuests : effectiveGuests;
      if (!(quantity > 0)) return;
      const unitIncome = toExVat(cfg.price_incVAT, vatRate);
      const unitCost = Number(cfg.cost_exVAT) || 0;
      const includeInBase = cfg.excludeFromBase === true ? false : true;
      const totalCost = unitCost * quantity;
      const totalIncome = unitIncome * quantity;
      registerFoodTotals(totalCost, totalIncome, includeInBase);
      const entry = {
        key: cfg.id || cfg.label || '',
        label: cfg.label || '',
        quantity,
        unitCost_ex: unitCost,
        unitIncome_ex: unitIncome,
        totalCost_ex: totalCost,
        totalIncome_ex: totalIncome,
        includeInBase,
        perGuestMode: cfg.perGuestMode || 'adult_equivalent'
      };
      extrasApplied.push(entry);
      if (!includeInBase) {
        extrasOutsideBase.push(entry);
      }
    };

    if (menu === 'winery') {
      const baseCostPer = Number(CFG?.food?.winery?.cost_exVAT) || 0;
      const basePricePer = toExVat(CFG?.food?.winery?.price_incVAT, vatRate);
      registerFoodTotals(baseCostPer * effectiveGuests, basePricePer * effectiveGuests, true);
      applyExtra(extrasCfg.quiches, extraSelections.quiches);
      applyExtra(extrasCfg.pizza, extraSelections.pizza);
    } else if (menu === 'own_catering') {
      const guestsForCatering = totalGuests;
      const markup = (Number(CFG?.food?.catering_we_bring?.markup_percent) || 0) / 100;
      const perGuest = Math.max(0, ownCateringRate);
      const cost = perGuest * guestsForCatering;
      const income = perGuest * guestsForCatering * (1 + markup);
      registerFoodTotals(cost, income, true);
    } else if (menu === 'client_catering') {
      const feePerGuest = Number(CFG?.food?.catering_client_brings?.fee_per_guest_exVAT) || 0;
      registerFoodTotals(0, feePerGuest * totalGuests, true);
    }
    applyExtra(extrasCfg.snack, extraSelections.snack);

    const childHotMultiplier = CFG?.drinks?.childHotMultiplier ?? 0.75;
    const childColdMultiplier = CFG?.drinks?.childColdMultiplier ?? 1;
    const hotUnitsAdults = includeHot ? hotRate * A : 0;
    const hotUnitsChildren = includeHot ? hotRate * childHotMultiplier * C : 0;
    const coldUnitsAdults = includeCold ? coldRate * A : 0;
    const coldUnitsChildren = includeCold ? coldRate * childColdMultiplier * C : 0;
    const totalHotUnits = hotUnitsAdults + hotUnitsChildren;
    const totalColdUnits = coldUnitsAdults + coldUnitsChildren;

    const baselineHotUnitsAdults = includeHot ? baselineHotRate * A : 0;
    const baselineHotUnitsChildren = includeHot ? baselineHotRate * childHotMultiplier * C : 0;
    const baselineColdUnitsAdults = includeCold ? baselineColdRate * A : 0;
    const baselineColdUnitsChildren = includeCold ? baselineColdRate * childColdMultiplier * C : 0;
    const desiredBaselineHotUnits = baselineHotUnitsAdults + baselineHotUnitsChildren;
    const desiredBaselineColdUnits = baselineColdUnitsAdults + baselineColdUnitsChildren;
    const baselineHotUnits = Math.min(totalHotUnits, desiredBaselineHotUnits);
    const baselineColdUnits = Math.min(totalColdUnits, desiredBaselineColdUnits);
    const extraHotUnits = Math.max(0, totalHotUnits - baselineHotUnits);
    const extraColdUnits = Math.max(0, totalColdUnits - baselineColdUnits);
    // Support both old and new field names for backward compatibility
    const hotCostPer = Number(CFG?.drinks?.hot?.costPerUnit ?? CFG?.drinks?.hot?.cost_exVAT) || 0;
    const coldCostPer = Number(CFG?.drinks?.cold?.costPerUnit ?? CFG?.drinks?.cold?.cost_exVAT) || 0;
    const hotPricePer = Number(CFG?.drinks?.hot?.pricePerUnit) || (hotCostPer * (Number(CFG?.drinks?.hot?.priceMultiplier) || 3));
    const coldPricePer = Number(CFG?.drinks?.cold?.pricePerUnit) || (coldCostPer * (Number(CFG?.drinks?.cold?.priceMultiplier) || 3));
    const hotCost = totalHotUnits * hotCostPer;
    const coldCost = totalColdUnits * coldCostPer;
    const hotIncome = totalHotUnits * hotPricePer;
    const coldIncome = totalColdUnits * coldPricePer;

    const hotCostBaseline = baselineHotUnits * hotCostPer;
    const coldCostBaseline = baselineColdUnits * coldCostPer;
    const hotIncomeBaseline = baselineHotUnits * hotPricePer;
    const coldIncomeBaseline = baselineColdUnits * coldPricePer;
    const hotCostExtra = Math.max(0, hotCost - hotCostBaseline);
    const coldCostExtra = Math.max(0, coldCost - coldCostBaseline);
    const hotIncomeExtra = Math.max(0, hotIncome - hotIncomeBaseline);
    const coldIncomeExtra = Math.max(0, coldIncome - coldIncomeBaseline);

    const alcoholGuests = Math.max(0, A);
    // Validate guestsPerBottle is positive to prevent division errors
    const guestsPerBottleRaw = Number(CFG?.wine?.baseline?.guestsPerBottle);
    const guestsPerBottle = (Number.isFinite(guestsPerBottleRaw) && guestsPerBottleRaw > 0) ? guestsPerBottleRaw : 5;
    let baselineTotalBottles = Math.ceil(alcoholGuests / guestsPerBottle);
    const minGuestsForAll = Number(CFG?.wine?.baseline?.minimumGuestsForAllTypes) || 5;
    if (alcoholGuests >= minGuestsForAll && baselineTotalBottles < 3) baselineTotalBottles = 3;
    // Validate wine ratio has valid values, default to balanced mix
    const ratioRaw = CFG?.wine?.baseline?.ratio;
    const defaultRatio = { white: 0.4, rose: 0.4, red: 0.2 };
    const ratio = (ratioRaw && typeof ratioRaw === 'object'
      && Number.isFinite(ratioRaw.white) && Number.isFinite(ratioRaw.rose) && Number.isFinite(ratioRaw.red)
      && ratioRaw.white >= 0 && ratioRaw.rose >= 0 && ratioRaw.red >= 0)
      ? ratioRaw
      : defaultRatio;
    const baselineColorCounts = distributeWineByRatio(baselineTotalBottles, ratio, alcoholGuests);
    // Validate bottles object exists before accessing properties
    const safeBottles = bottles || { white: 0, rose: 0, red: 0 };
    const actualColorCounts = {
      white: Math.max(0, Math.round(safeBottles.white || 0)),
      rose: Math.max(0, Math.round(safeBottles.rose || 0)),
      red: Math.max(0, Math.round(safeBottles.red || 0))
    };
    const shortfallColorCounts = {
      white: Math.max(0, baselineColorCounts.white - actualColorCounts.white),
      rose: Math.max(0, baselineColorCounts.rose - actualColorCounts.rose),
      red: Math.max(0, baselineColorCounts.red - actualColorCounts.red)
    };
    const extraColorCounts = {
      white: Math.max(0, actualColorCounts.white - baselineColorCounts.white),
      rose: Math.max(0, actualColorCounts.rose - baselineColorCounts.rose),
      red: Math.max(0, actualColorCounts.red - baselineColorCounts.red)
    };
    const wineBaseline = computeWineFinancials(baselineColorCounts, wineTier);
    const wineExtra = computeWineFinancials(extraColorCounts, wineTier);
    const combineAllocations = (base, extra) => {
      const colors = ['white', 'rose', 'red'];
      const labels = ['ulu', 'kosher'];
      const combined = {
        ulu: { white: 0, rose: 0, red: 0, total: 0 },
        kosher: { white: 0, rose: 0, red: 0, total: 0 }
      };
      labels.forEach((label) => {
        colors.forEach((color) => {
          const value = (base?.allocation?.[label]?.[color] || 0) + (extra?.allocation?.[label]?.[color] || 0);
          combined[label][color] = value;
          combined[label].total += value;
        });
      });
      return combined;
    };
    const wineAllocation = combineAllocations(wineBaseline, wineExtra);
    const actualTotalBottles = actualColorCounts.white + actualColorCounts.rose + actualColorCounts.red;
    const baselineRequiredTotal = baselineColorCounts.white + baselineColorCounts.rose + baselineColorCounts.red;
    const wineShortfallTotal = shortfallColorCounts.white + shortfallColorCounts.rose + shortfallColorCounts.red;

    const foodCost_base_ex = foodCostBase;
    const foodIncome_base_ex = foodIncomeBase;
    const foodCost_ex = foodCostTotal;
    const foodIncome_ex = foodIncomeTotal;
    const foodCost_extra_ex = foodCost_ex - foodCost_base_ex;
    const foodIncome_extra_ex = foodIncome_ex - foodIncome_base_ex;
    const drinksCost_ex = hotCost + coldCost;
    const drinksIncome_ex = hotIncome + coldIncome;
    const drinksCost_base_ex = hotCostBaseline + coldCostBaseline;
    const drinksIncome_base_ex = hotIncomeBaseline + coldIncomeBaseline;
    const drinksCost_extra_ex = Math.max(0, drinksCost_ex - drinksCost_base_ex);
    const drinksIncome_extra_ex = Math.max(0, drinksIncome_ex - drinksIncome_base_ex);
    const wineBaselineCost = wineBaseline.costTotal;
    const wineBaselineIncome = wineBaseline.incomeTotal;
    const wineExtraCost = wineExtra.costTotal;
    const wineExtraIncome = wineExtra.incomeTotal;

    // All wine (baseline + extra) included in base price calculation
    const totalWineCost = wineBaselineCost + wineExtraCost;
    const totalWineIncome = wineBaselineIncome + wineExtraIncome;

    const F_w = foodCost_base_ex;
    const F_c = foodIncome_base_ex;
    const D_w = drinksCost_base_ex + totalWineCost;  // All wine included
    const D_c = drinksIncome_base_ex + totalWineIncome;  // All wine included
    const W_w = workersCost;
    const W_i = workersIncome;
    const V_i = venueBasePrice_ex;  // Venue income (venue cost = 0)
    const manualBasePrice_ex = venueBasePrice_ex;  // Legacy variable name for venue income
    const manualBaseCost_ex = 0;  // Venue cost is always 0 (own venue)

    // Base cost calculation: Food + Drinks + Wine + Workers (NO venue cost)
    const baseCost = F_w + D_w + W_w;
    // Margins from items: includes venue income (cost is 0)
    const baseProfit = (F_c - F_w) + (D_c - D_w) + (W_i - W_w) + V_i;

    const foodMode = menu === 'own_catering' ? 'catering' : (menu === 'client_catering' ? 'customer_catering' : 'our_food');
    const computeBasePriceFn = window.WineryPricing?.computeBasePrice;
    const basePriceCalc = typeof computeBasePriceFn === 'function'
      ? computeBasePriceFn({
          guests: totalGuests,
          mode: foodMode,
          F_c,
          F_w,
          D_c,
          D_w,
          W_i: W_i + V_i,  // Workers income + Venue income
          W_w: W_w,  // Workers cost only (venue cost = 0)
          vatRate
        })
      : (() => {
          const fallbackTarget = typeof window.WineryPricing?.getTargetPct === 'function'
            ? window.WineryPricing.getTargetPct(totalGuests, foodMode)
            : 0;
          const denom = baseCost;
          const profitBeforeVat = baseProfit;
          const revenueNoBp = denom > 0 ? profitBeforeVat / denom : 0;
          if (!(denom > 0)) {
            return {
              bp: 0,
              rawBP: 0,
              targetPct: fallbackTarget,
              revenuePctNoBP: revenueNoBp,
              revenuePct: revenueNoBp,
              denom,
              surplusIfAny: 0,
              note: 'Cannot compute basis price because total base expenses are not positive.'
            };
          }
          const raw = fallbackTarget * denom - profitBeforeVat;
          let bp = Number.isFinite(raw) ? raw : 0;
          const surplusIfAny = raw < 0 ? Math.abs(raw) : 0;
          if (bp < 0) bp = 0;
          const computeRevenuePct = (bpValue) => (denom > 0 ? (profitBeforeVat + bpValue) / denom : 0);
          let revenuePct = computeRevenuePct(bp);
          if (bp > 0 && revenuePct + 1e-6 < fallbackTarget) {
            const correction = (fallbackTarget - revenuePct) * denom;
            bp += correction;
            revenuePct = computeRevenuePct(bp);
          }
          if (bp === 0) {
            revenuePct = revenueNoBp;
          } else if (revenuePct < fallbackTarget) {
            revenuePct = fallbackTarget;
          }
          return {
            bp,
            rawBP: raw,
            targetPct: fallbackTarget,
            revenuePctNoBP: revenueNoBp,
            revenuePct,
            denom,
            surplusIfAny
          };
        })();

    const basePriceAdditional = Math.max(0, Number(basePriceCalc?.bp) || 0);
    const basePriceFinal = manualBasePrice_ex + basePriceAdditional;
    const targetPct = Math.max(0, Number(basePriceCalc?.targetPct) || 0);
    const revenue_pct_no_bp = Number(basePriceCalc?.revenuePctNoBP) || 0;
    const revenue_pct = Number(basePriceCalc?.revenuePct) || 0;
    const basePriceRaw = Number(basePriceCalc?.rawBP) || 0;
    const basePriceSurplus = Number(basePriceCalc?.surplusIfAny) || 0;
    const basePriceDenom = Number.isFinite(Number(basePriceCalc?.denom)) ? Number(basePriceCalc?.denom) : baseCost;
    const basisNote = typeof basePriceCalc?.note === 'string' ? basePriceCalc.note.trim() : '';

    const subtotalIncome_ex = foodIncome_ex
      + drinksIncome_ex
      + totalWineIncome  // All wine (baseline + extra)
      + W_i
      + basePriceFinal  // Venue income + calculated base price
      + addonsIncome;  // Full addon price (vendor + commission)
    const subtotalCost_ex = foodCost_ex
      + drinksCost_ex
      + totalWineCost  // All wine (baseline + extra)
      + W_w  // Workers only (venue cost = 0, so manualBaseCost_ex removed)
      + addonsTotalCost;  // Addon costs (vendor prices for commission addons)

    const discountAmount = clampNonNegative(parseNumberInput($('discount_amount'), 0));
    const discountPercentInput = clampNonNegative(parseNumberInput($('discount_percent'), 0));
    const discountPercent = Math.min(discountPercentInput, 100);
    const discountFromPercent = subtotalIncome_ex * (discountPercent / 100);
    // Note: Both discount amount and percentage can stack. Cap total to prevent exceeding 100%
    const totalDiscountRaw = discountAmount + discountFromPercent;
    const totalDiscount = Math.min(totalDiscountRaw, subtotalIncome_ex);
    const finalIncome_ex = Math.max(0, subtotalIncome_ex - totalDiscount);
    const profit_ex = finalIncome_ex - subtotalCost_ex;
    const actualMargin_pct = finalIncome_ex > 0 ? profit_ex / finalIncome_ex : 0;  // Margin = profit/income
    const vatAmt = finalIncome_ex * vatRate;
    const total_inc = finalIncome_ex + vatAmt;
    const pp_inc = totalGuests > 0 ? total_inc / totalGuests : 0;

    const pricingComponents = [
      {
        key: 'menu',
        label: 'כיבוד',
        cost: foodCost_ex,
        income: foodIncome_ex,
        details: {
          extras: extrasApplied,
          baseCost: foodCost_base_ex,
          baseIncome: foodIncome_base_ex,
          extraCost: foodCost_extra_ex,
          extraIncome: foodIncome_extra_ex
        }
      },
      { key: 'drinks', label: 'משקאות', cost: drinksCost_ex, income: drinksIncome_ex, details: {
        includeHot,
        includeCold,
        rates: { hot: hotRate, cold: coldRate },
        baselineRates: { hot: baselineHotRate, cold: baselineColdRate },
        consumption: {
          adults: { hot: hotUnitsAdults, cold: coldUnitsAdults },
          children: { hot: hotUnitsChildren, cold: coldUnitsChildren },
          baseline: {
            adults: { hot: baselineHotUnitsAdults, cold: baselineColdUnitsAdults },
            children: { hot: baselineHotUnitsChildren, cold: baselineColdUnitsChildren },
            total: { hot: baselineHotUnits, cold: baselineColdUnits }
          },
          extra: { hot: extraHotUnits, cold: extraColdUnits }
        },
        totals: {
          baseline: { cost: drinksCost_base_ex, income: drinksIncome_base_ex },
          extra: { cost: drinksCost_extra_ex, income: drinksIncome_extra_ex }
        }
      } },
      { key: 'wine', label: 'יין', cost: totalWineCost, income: totalWineIncome, details: { baseline: wineBaseline, extra: wineExtra, combined: wineAllocation } },
      { key: 'staff', label: 'כוח אדם', cost: workersCost, income: workersIncome, details: { workers, managerCost, workerRate, revenueComponent: workerRevenueComponent } },
      { key: 'addons', label: 'תוספות', cost: addonsTotalCost, income: addonsIncome, details: { lines: addons, totalRevenue: addonsRevenue } }
    ];

    const pricingBreakdown = {
      baseLine: {
        key: 'base',
        income: basePriceFinal,
        expense: manualBaseCost_ex,
        profit: basePriceFinal - manualBaseCost_ex
      },
      components: pricingComponents
    };

    const pricingTotals = {
      baseCost,
      totalCost: subtotalCost_ex,
      basePrice: F_c + D_c + W_i + basePriceFinal,
      basePriceAdmin: manualBasePrice_ex,
      basePriceAdditional: basePriceAdditional,
      subtotalPrice: subtotalIncome_ex,
      enforcedMin: finalIncome_ex,
      targetMargin: targetPct,
      actualMargin: actualMargin_pct,
      baseMargin: revenue_pct,
      baseMarginNatural: revenue_pct_no_bp
    };

    const discount_reason = $('discount_reason')?.value?.trim() || '';

    lastCalc = {
      kind,
      client: clientName,
      date,
      eventType,
      duration,
      A,
      C,
      H: totalGuests,
      minimumGuests,
      E: effectiveGuests,
      menu,
      ownCateringRate,
      wineTier,
      extrasSelections: extraSelections,
      extrasApplied,
      drinksIncluded: { hot: includeHot, cold: includeCold },
      drinkRates: { hot: hotRate, cold: coldRate },
      bottles: {
        ...actualColorCounts,
        total: actualTotalBottles,
        required: { ...baselineColorCounts, total: baselineRequiredTotal },
        shortfall: { ...shortfallColorCounts, total: wineShortfallTotal }
      },
      wine: {
        tier: wineTier,
        baseline: wineBaseline,
        extra: wineExtra,
        allocation: wineAllocation,
        actual: actualColorCounts,
        required: { counts: baselineColorCounts, total: baselineRequiredTotal },
        shortfall: { counts: shortfallColorCounts, total: wineShortfallTotal }
      },
      workers,
      workersCost_ex: workersCost,
      workersIncome_ex: workersIncome,
      workersManagerCost: managerCost,
      venueKey,
      venueLabel,
      foodCost_ex,
      foodIncome_ex,
      foodCost_base_ex,
      foodCost_extra_ex,
      foodIncome_base_ex,
      foodIncome_extra_ex,
      drinksCost_ex,
      drinksCost_base_ex,
      drinksCost_extra_ex,
      drinksIncome_ex,
      drinksIncome_base_ex,
      drinksIncome_extra_ex,
      wineCost_ex: wineBaselineCost + wineExtraCost,
      winePrice_ex: wineBaselineIncome + wineExtraIncome,
      wineBaselineCost_ex: wineBaselineCost,
      wineBaselineIncome_ex: wineBaselineIncome,
      wineExtraCost_ex: wineExtraCost,
      wineExtraIncome_ex: wineExtraIncome,
      addons: {
        totalCost: 0,
        totalPrice: addonsRevenue,
        lines: addons
      },
      menuExtras: {
        totalCost_ex: foodCost_extra_ex,
        totalIncome_ex: foodIncome_extra_ex,
        lines: extrasOutsideBase
      },
      basisPrice_ex: basePriceFinal,
      basisPrice_additional_ex: basePriceAdditional,
      basePrice_manual_ex: manualBasePrice_ex,
      basePrice_manual_cost_ex: manualBaseCost_ex,
      basisPrice_raw_ex: basePriceRaw,
      basisPrice_surplus_ex: basePriceSurplus,
      basisPrice_denom_ex: basePriceDenom,
      basisPrice_note: basisNote,
      basePriceComponent_ex: basePriceAdditional,
      baseMin_ex: basePriceFinal,
      F_c,
      F_w,
      D_c,
      D_w,
      W_i,
      W_w,
      subtotalCost_ex,
      subtotalIncome_ex,
      subtotalPrice_ex: subtotalIncome_ex,
      subtotalPriceAfterDiscount_ex: Math.max(0, subtotalIncome_ex - totalDiscount),
      discount_ex: totalDiscount,
      discount_amount_input: discountAmount,
      discount_pct: discountPercent,
      discount_reason,
      minDuePrice_ex: finalIncome_ex,
      enforcedMin_ex: finalIncome_ex,
      totalIncome_ex: finalIncome_ex,
      totalExpense_ex: subtotalCost_ex,
      profit_ex,
      revenue_pct,
      revenue_pct_no_bp: revenue_pct_no_bp,
      revenue_surplus_ex: basePriceSurplus,
      revenue_denom_ex: basePriceDenom,
      overall_margin_pct: actualMargin_pct,
      vatAmt,
      total_inc,
      pp_inc,
      pricingBreakdown,
      pricingTotals,
      pricingDetails: {
        drinks: {
          includeHot,
          includeCold,
          rates: { hot: hotRate, cold: coldRate },
          baselineRates: { hot: baselineHotRate, cold: baselineColdRate },
          consumption: {
            adults: { hot: hotUnitsAdults, cold: coldUnitsAdults },
            children: { hot: hotUnitsChildren, cold: coldUnitsChildren },
            baseline: {
              adults: { hot: baselineHotUnitsAdults, cold: baselineColdUnitsAdults },
              children: { hot: baselineHotUnitsChildren, cold: baselineColdUnitsChildren },
              total: { hot: baselineHotUnits, cold: baselineColdUnits }
            },
            extra: { hot: extraHotUnits, cold: extraColdUnits }
          },
          totals: {
            baseline: { cost: drinksCost_base_ex, income: drinksIncome_base_ex },
            extra: { cost: drinksCost_extra_ex, income: drinksIncome_extra_ex }
          }
        }
      },
      margin_target: targetPct,
      margin_actual: actualMargin_pct,
      margin_base: revenue_pct,
      margin_natural: revenue_pct_no_bp
    };

    renderSummary();
    renderMiniKPIs();
    return lastCalc;
  }


  function costBreakdownRows(c) {
    if (!c) return [];
    const rows = [];
    const baseIncome = c.pricingBreakdown?.baseLine?.income
      ?? c.basisPrice_ex
      ?? c.baseMin_ex
      ?? 0;
    const baseExpense = c.pricingBreakdown?.baseLine?.expense
      ?? c.basePrice_manual_cost_ex
      ?? 0;
    const baseProfit = baseIncome - baseExpense;
    const baseMargin = baseIncome > 0 ? (baseProfit / baseIncome) : 0;
    rows.push({
      key: 'base',
      label: 'מחיר בסיס אירוע',
      income: baseIncome,
      expense: baseExpense,
      profit: baseProfit,
      margin_pct: baseMargin
    });

    const comps = Array.isArray(c.pricingBreakdown?.components) ? c.pricingBreakdown.components : [];
    comps.forEach((comp) => {
      if (!comp) return;
      let label = comp.label || comp.key || '';
      if (comp.key === 'venue') {
        const totalMultiplier = comp.details?.multipliers?.total;
        if (Number.isFinite(totalMultiplier) && Math.abs(totalMultiplier - 1) > 0.001) {
          label = `מיקום (מקדם ×${formatNumber(totalMultiplier, 2)})`;
        } else {
          label = 'מיקום';
        }
      } else if (comp.key === 'staff') {
        const workerCount = Number(comp.details?.workers ?? c.workers ?? 0);
        const managerCost = Number(comp.details?.managerCost ?? c.workersManagerCost ?? 0);
        const managerText = managerCost > 0 ? ' + מנהל/ת' : '';
        label = `כוח אדם (${formatNumber(workerCount)} עובדים${managerText})`;
      } else if (comp.key === 'menu') {
        label = 'כיבוד';
      } else if (comp.key === 'drinks') {
        label = 'משקאות';
      } else if (comp.key === 'wine') {
        label = 'יין (בסיס)';
      } else if (comp.key === 'wine_extra') {
        label = 'יין נוסף';
      } else if (comp.key === 'addons') {
        label = 'תוספות';
      }

      const income = comp.income || 0;
      const expense = comp.cost || 0;
      const profit = Number.isFinite(comp.profit) ? comp.profit : (income - expense);
      const marginPct = income > 0 ? (profit / income) : 0;
      if (!income && !expense) return;
      rows.push({ key: comp.key, label, income, expense, profit, margin_pct: marginPct });
    });

    return rows;
  }

  function describeMenuPublic(c) {
    if (!c) return '—';
    if (c.menu === 'winery') {
      // Don't show food addons in menu details - they appear in תוספות section
      return 'כיבוד היקב';
    }
    if (c.menu === 'own_catering') {
      return 'קייטרינג מטעמנו';
    }
    if (c.menu === 'client_catering') {
      return 'קייטרינג חיצוני (לקוח מביא)';
    }
    return '—';
  }

  function describeWinePublic(c) {
    if (!c) return '—';
    const total = toWholeNumber(c.bottles?.total);
    if (!total) return 'ללא יין';
    const colors = { white: 'לבן', rose: 'רוזה', red: 'אדום' };
    const totalsByColor = {
      white: toWholeNumber(c.bottles?.white),
      rose: toWholeNumber(c.bottles?.rose),
      red: toWholeNumber(c.bottles?.red)
    };
    const colorParts = Object.entries(colors)
      .map(([colorKey, title]) => {
        const amount = totalsByColor[colorKey];
        return amount ? `${title} ${formatNumber(amount)}` : null;
      })
      .filter(Boolean);
    const colorsText = colorParts.length ? ` (${colorParts.join(', ')})` : '';
    return `סה"כ ${formatNumber(total)} בקבוקים${colorsText}`;
  }

  function describeInclusions(c) {
    if (!c) return [];
    const items = [];
    const menuText = describeMenuPublic(c);
    if (menuText && menuText !== '—') items.push(menuText);
    const wineText = describeWinePublic(c);
    if (wineText && wineText !== '—') items.push(wineText);
    if (c.drinksIncluded) {
      const drinkParts = [];
      drinkParts.push(`חמים ${c.drinksIncluded.hot ? 'כן' : 'לא'}`);
      drinkParts.push(`קרים ${c.drinksIncluded.cold ? 'כן' : 'לא'}`);
      items.push(`משקאות: ${drinkParts.join(' / ')}`);
    }
    return items;
  }

  function collectAddonLines(c) {
    if (!c) return [];
    const lines = [];
    const addons = c.addons;
    if (addons && Array.isArray(addons.lines)) {
      addons.lines.forEach((line) => {
        lines.push({ ...line });
      });
    }
    const menuExtras = Array.isArray(c.menuExtras?.lines) ? c.menuExtras.lines : [];
    menuExtras.forEach((extra) => {
      const mode = extra.perGuestMode === 'total' ? 'fixed' : 'per_person';
      lines.push({
        desc: extra.label || extra.key || 'תוספת',
        type: mode,
        category: 'winery',
        baseQty: extra.quantity,
        effectiveQty: extra.quantity,
        unit: extra.unitIncome_ex,
        price_ex: extra.totalIncome_ex,
        cost_ex: extra.totalCost_ex,
        source: 'menu_extra'
      });
    });
    return lines;
  }

  function computeAddonSummaries(c, opts = {}) {
    const {
      includePrice = false,
      priceIncludesVat = false,
      showType = true,
      showQuantity = true,
      emptyLabel = 'ללא תוספות נוספות'
    } = opts;
    if (!c) return [];
    const vatRate = CFG?.vat ?? 0;
    const lines = collectAddonLines(c);
    if (!lines.length) {
      return emptyLabel ? [emptyLabel] : [];
    }
    return lines.map(line => {
      const parts = [line.desc];
      if (showType) {
        // Show commission type if applicable
        const wineryRate = Number(CFG?.addons?.wineryCommissionRate) || 0.15;
        const wineryPct = Math.round(wineryRate * 100);

        if (line.type === 'commission_winery_fixed') {
          parts.push(`עמלה ${wineryPct}% (לאירוע)`);
        } else if (line.type === 'commission_winery_per_person') {
          parts.push(`עמלה ${wineryPct}% (לאדם)`);
        } else if (line.type === 'commission_per_person') {
          parts.push('עמלה לפי אדם');
        } else {
          parts.push(line.type === 'per_person' ? 'לפי אורח' : 'לפי אירוע');
        }
        const categoryLabel = line.category === 'customer' ? 'לקוח מביא' : 'היקב מביא';
        parts.push(categoryLabel);
      }
      if (showQuantity && line.effectiveQty > 0) {
        const digits = Number.isInteger(line.effectiveQty) ? 0 : 2;
        parts.push(`כמות מחויבת ${formatNumber(line.effectiveQty, digits)}`);
      }
      if (includePrice) {
        const price = priceIncludesVat ? line.price_ex * (1 + vatRate) : line.price_ex;
        if (price <= 0) {
          parts.push('ללא חיוב');
        } else {
          const digits = price % 1 === 0 ? 0 : 2;
          const label = priceIncludesVat ? 'כולל מע"מ' : 'לפני מע"מ';
          parts.push(`₪${formatNumber(price, digits)} ${label}`);
        }
      }
      return parts.join(' · ');
    });
  }

  function describeDiscount(c) {
    if (!c) return '';
    const parts = [];
    if (c.discount_pct > 0) {
      const digits = Number.isInteger(c.discount_pct) ? 0 : 1;
      parts.push(`${formatNumber(c.discount_pct, digits)}%`);
    }
    if (c.discount_ex > 0) {
      parts.push(nf(c.discount_ex));
    }
    if (!parts.length) return '';
    let text = `המחיר כולל הנחה (${parts.join(' + ')})`;
    if (c.discount_reason) text += ` — ${c.discount_reason}`;
    return text;
  }

  function shortenAddonText(text, limit = 70) {
    const normalized = (text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return '';
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit - 1).trim()}…`;
  }

  function renderSummary() {
    if (!lastCalc) return;
    const c = lastCalc;

    const setMetric = (id, labelText, valueText) => {
      const el = $(id);
      if (!el) return;
      el.textContent = valueText;
      const container = el.parentElement;
      const labelEl = container?.querySelector('span');
      if (labelEl && labelText) {
        labelEl.textContent = labelText;
      }
    };

    const vatRate = Number.isFinite(c.vat_rate) ? c.vat_rate : (CFG?.vat ?? 0);
    const vatPercent = vatRate * 100;
    const vatDigits = Math.abs(vatPercent % 1) < 0.001 ? 0 : 1;
    const totalBefore = Number.isFinite(c.minDuePrice_ex)
      ? c.minDuePrice_ex
      : Number.isFinite(c.total_inc)
        ? c.total_inc / (1 + vatRate)
        : 0;
    setMetric('total_exvat', 'סה"כ לפני מע"מ', nf(totalBefore));
    setMetric('total_incvat', 'סה"כ כולל מע"מ', nf(c.total_inc));
    const perDigits = (c.pp_inc % 1 === 0) ? 0 : 2;
    setMetric('pp_incvat', 'מחיר לאדם (כולל מע"מ)', `₪${formatNumber(c.pp_inc, perDigits)}`);
    setMetric('vat_amt', `מע"מ (${formatNumber(vatPercent, vatDigits)}%)`, nf(c.vatAmt));

    [
      ['meta_client', c.client || '—'],
      ['meta_date', c.date || '—'],
      ['meta_event', c.eventType || '—'],
      ['meta_venue', c.venueLabel || '—'],
      ['meta_guests', formatNumber(c.H)],
      ['meta_guests_effective', formatNumber(c.E, Number.isInteger(c.E) ? 0 : 1)]
    ].forEach(([id, value]) => {
      const el = $(id);
      if (el) el.textContent = value;
    });

    const menuEl = $('meta_menu');
    if (menuEl) menuEl.textContent = describeMenuPublic(c);
    const wineEl = $('meta_wine');
    if (wineEl) wineEl.textContent = describeWinePublic(c);

    const ensureFinanceSection = () => {
      let list = $('summary_finance');
      if (list) return list;
      const panel = $('summary_included')?.parentElement;
      if (!panel) return null;
      const title = document.createElement('h3');
      title.className = 'subheading';
      title.id = 'summary_finance_title';
      title.textContent = 'סיכום פיננסי';
      const listEl = document.createElement('ul');
      listEl.className = 'summary-list';
      listEl.id = 'summary_finance';
      const addonsTitle = $('summary_addons_title');
      if (addonsTitle) {
        panel.insertBefore(listEl, addonsTitle);
        panel.insertBefore(title, listEl);
      } else {
        panel.appendChild(title);
        panel.appendChild(listEl);
      }
      return listEl;
    };

    const financeList = ensureFinanceSection();
    if (financeList) {
      financeList.innerHTML = '';
      const totalIncomeEx = Number.isFinite(c.totalIncome_ex) ? c.totalIncome_ex : c.minDuePrice_ex;
      const totalExpenseEx = Number.isFinite(c.totalExpense_ex) ? c.totalExpense_ex : 0;
      const basisValue = Number(c.basisPrice_ex ?? c.baseMin_ex ?? 0);
      const actualMarginPct = Number.isFinite(c.margin_actual)
        ? c.margin_actual
        : (totalIncomeEx > 0 ? (totalIncomeEx - totalExpenseEx) / totalIncomeEx : 0);  // Margin = profit/income (not profit/cost)
      const marginPercent = actualMarginPct * 100;
      const marginDigits = Math.abs(marginPercent % 1) < 0.001 ? 0 : 1;
      const financeItems = [
        `סה"כ הכנסה (ללא מע"מ): ${nf(totalIncomeEx)}`,
        `סה"כ הוצאה (ללא מע"מ): ${nf(totalExpenseEx)}`,
        `מחיר בסיס נדרש: ${nf(basisValue)}`,
        `רווח עבור אירוע: ${formatNumber(marginPercent, marginDigits)}%`
      ];
      if (c.basisPrice_note) {
        financeItems.push(c.basisPrice_note);
      }
      financeItems.forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        financeList.appendChild(li);
      });
    }

    const includedEl = $('summary_included');
    if (includedEl) {
      includedEl.innerHTML = '';
      const items = describeInclusions(c);
      items.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        includedEl.appendChild(li);
      });
      const title = $('summary_included_title');
      includedEl.classList.toggle('hidden', items.length === 0);
      if (title) title.classList.toggle('hidden', items.length === 0);
    }

    const addonsEl = $('summary_addons');
    if (addonsEl) {
      addonsEl.innerHTML = '';
      const list = computeAddonSummaries(c, { showType: true, showQuantity: true, includePrice: true, priceIncludesVat: false, emptyLabel: '' })
        .filter(Boolean);
      list.forEach(txt => {
        const li = document.createElement('li');
        li.textContent = txt;
        addonsEl.appendChild(li);
      });
      const title = $('summary_addons_title');
      const hasItems = list.length > 0;
      addonsEl.classList.toggle('hidden', !hasItems);
      if (title) title.classList.toggle('hidden', !hasItems);
    }

    const discountEl = $('discount_note');
    if (discountEl) {
      const text = describeDiscount(c);
      const hasText = Boolean(text);
      discountEl.classList.toggle('hidden', !hasText);
      discountEl.textContent = hasText ? text : '';
    }
  }

  function renderMiniKPIs() {
    const c = lastCalc || calc();
    if (!c) return;
    
    const setN = (id, val) => {
      const el = $(id);
      if (el) el.textContent = nf(val);
    };

    [['mini2_total', 'mini2_pp'],
     ['mini3_total', 'mini3_pp'],
     ['mini4_total', 'mini4_pp']].forEach(([t, pp]) => {
      setN(t, c.total_inc);
      setN(pp, c.pp_inc);
    });
  }

  // ניווט
  function goStep(idx) {
    [1, 2, 3, 4, 5].forEach(i => {
      const C = $('step' + i);
      const S = $('s' + i);
      const on = (i === idx);
      if (C) {
        C.classList.toggle('is-active', on);
        C.classList.toggle('hidden', !on);
      }
      if (S) S.classList.toggle('active', on);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // כפתורי ניווט
  $('next1')?.addEventListener('click', (e) => {
    e.preventDefault();
    updateCorporateVisibility();
    goStep(2);
  });
  $('back2')?.addEventListener('click', () => goStep(1));
  $('next2')?.addEventListener('click', () => {
    primeBottlesAuto();
    calc();
    goStep(3);
  });
  $('back3')?.addEventListener('click', () => goStep(2));
  $('next3')?.addEventListener('click', () => {
    calc();
    goStep(4);
  });
  $('back4')?.addEventListener('click', () => goStep(3));
  $('next4')?.addEventListener('click', () => {
    calc();
    goStep(5);
  });
  $('back5')?.addEventListener('click', () => goStep(4));

  // קליקים על כותרות שלבים
  [['s1', 1], ['s2', 2], ['s3', 3]].forEach(([id, step]) => {
    const el = $(id);
    if (el) {
      el.addEventListener('click', () => goStep(step));
    }
  });

  // מאזינים
  ['adults', 'children'].forEach(id => {
    $(id)?.addEventListener('input', () => {
      enforceMinimumGuests();
      if ($('autoBottles')?.checked) primeBottlesAuto();
      calc();
    });
  });

  $('duration')?.addEventListener('change', () => {
    applyDrinkDefaults({ force: true });
    if ($('autoBottles')?.checked) primeBottlesAuto();
    calc();
  });

  $('autoBottles')?.addEventListener('change', (ev) => {
    updateAutoToggleUI();
    if (ev.target.checked) {
      ['bottles_total', 'bottles_white', 'bottles_rose', 'bottles_red'].forEach(id => {
        const el = $(id);
        if (el) el.dataset.manual = 'false';
      });
      primeBottlesAuto();
    }
    calc();
  });

  const bottleColorIds = ['bottles_white', 'bottles_rose', 'bottles_red'];
  bottleColorIds.forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (isSettingBottles) return;
      disableAutoBottles();
      const value = Math.max(0, Math.round(parseNumberInput(el, 0)));
      isSettingBottles = true;
      el.value = value;
      isSettingBottles = false;
      syncManualBottles();
      calc();
    });
  });

  const totalEl = $('bottles_total');
  if (totalEl) {
    totalEl.addEventListener('input', () => {
      if (isSettingBottles) return;
      const total = Math.max(0, Math.round(parseNumberInput(totalEl, 0)));
      disableAutoBottles();
      const current = {
        white: clampNonNegative(parseNumberInput($('bottles_white'), 0)),
        rose: clampNonNegative(parseNumberInput($('bottles_rose'), 0)),
        red: clampNonNegative(parseNumberInput($('bottles_red'), 0))
      };
      const sum = current.white + current.rose + current.red;
      const mix = sum > 0 ? current : (CFG?.pricing?.wine?.defaults?.mix || current);
      const dist = distributeBottlesByMix(total, mix);
      applyBottleValues(dist, { markManual: true });
      calc();
    });
  }

  ['hot_count', 'cold_count'].forEach(id => {
    const input = $(id);
    if (!input) return;
    input.addEventListener('input', () => {
      if (isSettingDrinks) return;
      input.dataset.userEdited = 'true';
      const value = clampNonNegative(parseNumberInput(input, 0));
      isSettingDrinks = true;
      input.value = toStepString(value);
      isSettingDrinks = false;
      calc();
    });
  });

  qa('.quantity-control').forEach(ctrl => {
    const inputId = ctrl.dataset.input;
    const input = inputId ? $(inputId) : null;
    if (!input) return;
    ctrl.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = Number(btn.dataset.delta || 0);
        const step = Number(input.step) || 0.25;
        const current = clampNonNegative(parseNumberInput(input, 0));
        const next = clampNonNegative(current + delta);
        const snapped = Math.max(0, Math.round(next / step) * step);
        isSettingDrinks = true;
        input.value = toStepString(snapped);
        isSettingDrinks = false;
        input.dataset.userEdited = 'true';
        calc();
      });
    });
  });

  qa('input[name="etype"]').forEach(r => r.addEventListener('change', () => {
    updateCorporateVisibility();
    calc();
  }));

  qa('input[name="menu"]').forEach(r => r.addEventListener('change', () => {
    updateMenuVisibility();
    calc();
  }));

  $('own_catering_pp')?.addEventListener('input', calc);
  $('wine_tier')?.addEventListener('change', calc);
  $('event_type')?.addEventListener('change', calc);
  $('discount_amount')?.addEventListener('input', calc);
  $('discount_percent')?.addEventListener('input', calc);
  $('use_hot')?.addEventListener('change', () => {
    refreshDrinkAvailability();
    calc();
  });
  $('use_cold')?.addEventListener('change', () => {
    refreshDrinkAvailability();
    calc();
  });

  $('addQuotaWinery')?.addEventListener('click', (e) => {
    e.preventDefault();
    addQuotaRow({ category: 'winery' });
  });

  $('addQuotaCustomer')?.addEventListener('click', (e) => {
    e.preventDefault();
    addQuotaRow({ category: 'customer' });
  });


  async function exportXlsx() {
    const XlsxPopulate = window.XlsxPopulate;
    if (!XlsxPopulate || typeof XlsxPopulate.fromBlankAsync !== 'function') {
      alert('ספריית XlsxPopulate לא זמינה');
      return;
    }

    const c = calc();
    if (!c) return;

    const toCurrency = (value) => Number((Number(value) || 0).toFixed(2));
    const describeWineInternal = () => {
      const total = toWholeNumber(c.bottles?.total);
      const colors = { white: 'לבן', rose: 'רוזה', red: 'אדום' };
      const tierLabels = {
        ulu: CFG?.wine?.tiers?.ulu?.label || CFG?.pricing?.wine?.ulu?.label || 'ULU',
        kosher: CFG?.wine?.tiers?.kosher?.label || CFG?.pricing?.wine?.kosher?.label || 'כשר'
      };
      const formatAlloc = (alloc) => {
        if (!alloc) return '';
        const groups = [];
        Object.entries(alloc).forEach(([tierKey, info = {}]) => {
          const colorParts = Object.entries(colors)
            .map(([colorKey, title]) => {
              const count = toWholeNumber(info[colorKey]);
              return count ? `${title} ${formatNumber(count)}` : null;
            })
            .filter(Boolean);
          if (!colorParts.length) return;
          const totalCount = toWholeNumber(info.total);
          const suffix = totalCount ? ` (סה"כ ${formatNumber(totalCount)})` : '';
          groups.push(`${tierLabels[tierKey] || tierKey}: ${colorParts.join(', ')}${suffix}`);
        });
        return groups.join(' | ');
      };
      // Merge baseline and extra allocations to show all wine types
      const mergeAllocations = (baseline, extra) => {
        if (!baseline && !extra) return null;
        const merged = {};
        [baseline, extra].forEach(alloc => {
          if (!alloc) return;
          Object.entries(alloc).forEach(([tierKey, info]) => {
            if (!merged[tierKey]) merged[tierKey] = {};
            Object.keys(colors).forEach(colorKey => {
              const count = toWholeNumber(info[colorKey]);
              if (count) {
                merged[tierKey][colorKey] = (merged[tierKey][colorKey] || 0) + count;
              }
            });
          });
        });
        // Recalculate totals for each tier
        Object.keys(merged).forEach(tierKey => {
          merged[tierKey].total = Object.keys(colors).reduce((sum, colorKey) =>
            sum + (merged[tierKey][colorKey] || 0), 0);
        });
        return Object.keys(merged).length ? merged : null;
      };

      const combinedAllocation = mergeAllocations(c.wine?.baseline?.allocation, c.wine?.extra?.allocation);

      return {
        totalText: total ? `סה"כ ${formatNumber(total)} בקבוקים` : 'ללא יין',
        baselineText: formatAlloc(c.wine?.baseline?.allocation),
        extraText: formatAlloc(c.wine?.extra?.allocation),
        allTypesText: formatAlloc(combinedAllocation)
      };
    };

    const describeMenuInternal = () => {
      if (c.menu === 'winery') {
        // Don't show food addons in menu details - they appear in תוספות section
        return 'כיבוד היקב';
      }
      if (c.menu === 'own_catering') {
        return 'קייטרינג מטעמנו';
      }
      if (c.menu === 'client_catering') {
        return 'קייטרינג חיצוני (לקוח מביא)';
      }
      return '—';
    };

    const exportStamp = new Date().toLocaleString('he-IL');
    const vatRate = CFG?.vat ?? 0;
    const totalGuests = Number.isFinite(c.H) ? c.H : 0;
    const effectiveGuests = Number.isFinite(c.E) ? (Number.isInteger(c.E) ? c.E : Number(c.E.toFixed(1))) : 0;

    try {
      const workbook = await XlsxPopulate.fromBlankAsync();
      const sheet = workbook.sheet(0);
      sheet.name('דוח תמחור');
      if (typeof sheet.rightToLeft === 'function') {
        sheet.rightToLeft(true);
      }

      const baseStyle = {
        fontFamily: 'Assistant',
        fontSize: 13,  // Slightly larger for better readability
        horizontalAlignment: 'center',
        verticalAlignment: 'center',
        wrapText: true
      };
      const ensureRtl = (target) => {
        try {
          target.style('readingOrder', 'RightToLeft');
        } catch (err) {
          try { target.style('rightToLeft', true); } catch (_) { /* ignore */ }
        }
      };
      const applyBorders = (target) => {
        target.style({
          topBorder: { style: 'thin', color: 'D9D9D9' },
          bottomBorder: { style: 'thin', color: 'D9D9D9' },
          leftBorder: { style: 'thin', color: 'D9D9D9' },
          rightBorder: { style: 'thin', color: 'D9D9D9' }
        });
      };
      const styleTarget = (target, extra = {}) => {
        target.style({ ...baseStyle, ...extra });
        ensureRtl(target);
      };
      const writeCell = (addr, value, extra = {}) => {
        const cell = sheet.cell(addr);
        cell.value(value == null ? '' : value);
        styleTarget(cell, extra);
        applyBorders(cell);
        return cell;
      };

      const currencyFormat = '#,##0.00';
      const percentFormat = '0.0%';
      const colors = {
        header: '#E8D6B5',
        headerLabel: '#E0C89D',
        bodyA: '#FFFDF8',
        bodyB: '#FDF1DF',
        total: '#FFE0B2',
        summaryValue: '#FFF3E0',
        summaryLabel: '#F9E3C7',
        summaryStrong: '#FFD180',
        discount: '#FFF8E1',
        addonHeader: '#E0F2F1',
        addonRow: '#F1F8E9'
      };

      sheet.column('A').width(24);  // רווח% - bigger for readability
      sheet.column('B').width(28);  // רווח - wider
      sheet.column('C').width(28);  // הוצאה - wider
      sheet.column('D').width(28);  // הכנסה - wider
      sheet.column('E').width(50);  // רכיב - wider for readability

      // Set row heights for better spacing
      sheet.row(1).height(36);  // Title row - taller for prominence
      for (let i = 2; i <= 7; i++) {
        sheet.row(i).height(28);  // Metadata rows - more padding
      }
      sheet.row(9).height(34);  // Header row - more padding

      const titleRange = sheet.range('A1:E1');
      titleRange.merged(true);
      titleRange.value(CFG?.branding?.internalReportTitle || 'יקב אולו - דוח תמחור פנימי');
      styleTarget(titleRange, { bold: true, fontSize: 18, horizontalAlignment: 'center', fill: '#F1EEDB' });
      applyBorders(titleRange);

      const metaFill = '#FFF8E1';
      const metaLabelFill = '#F3D8B6';
      const setMeta = (valueAddr, value, labelAddr, label) => {
        writeCell(valueAddr, value ?? '—', { fill: metaFill });
        writeCell(labelAddr, label ?? '', { fill: metaLabelFill, bold: true });
      };

      setMeta('A2', exportStamp, 'B2', 'תאריך יצוא');
      setMeta('C2', c.client || '—', 'D2', 'לקוח');
      writeCell('E2', '', { fill: metaFill });  // Use column E

      setMeta('A3', c.date || '-', 'B3', 'תאריך אירוע');
      setMeta('C3', c.eventType || '-', 'D3', 'סוג אירוע');
      writeCell('E3', '', { fill: metaFill });

      setMeta('A4', c.venueLabel || '-', 'B4', 'מיקום');
      setMeta('C4', describeMenuInternal(), 'D4', 'תפריט');
      writeCell('E4', '', { fill: metaFill });

      setMeta('A5', formatNumber(effectiveGuests), 'B5', 'אורחי חיוב');
      setMeta('C5', formatNumber(totalGuests), 'D5', 'סה"כ אורחים');
      writeCell('E5', '', { fill: metaFill });

      const wineInternal = describeWineInternal();
      const wineTypesDisplay = wineInternal.allTypesText || '';
      const wineFullText = wineTypesDisplay
        ? `${wineInternal.totalText || 'ללא יין'} · ${wineTypesDisplay}`
        : (wineInternal.totalText || 'ללא יין');

      // Row 6 - Wine data with no bottom border on A6/B6 to merge with A7/B7
      const cellA6 = sheet.cell('A6');
      cellA6.value(wineFullText ?? '—');
      styleTarget(cellA6, { fill: metaFill });
      cellA6.style({
        topBorder: { style: 'thin', color: 'D9D9D9' },
        leftBorder: { style: 'thin', color: 'D9D9D9' },
        rightBorder: { style: 'thin', color: 'D9D9D9' }
        // No bottomBorder to merge with A7
      });

      const cellB6 = sheet.cell('B6');
      cellB6.value('יין' ?? '');
      styleTarget(cellB6, { fill: metaLabelFill, bold: true });
      cellB6.style({
        topBorder: { style: 'thin', color: 'D9D9D9' },
        leftBorder: { style: 'thin', color: 'D9D9D9' },
        rightBorder: { style: 'thin', color: 'D9D9D9' }
        // No bottomBorder to merge with B7
      });

      writeCell('C6', '', { fill: metaFill });
      writeCell('D6', '', { fill: metaFill });
      writeCell('E6', '', { fill: metaFill });

      // Row 7 - empty with no top border on A7/B7 to merge with A6/B6
      const cellA7 = sheet.cell('A7');
      cellA7.value('');
      styleTarget(cellA7, { fill: metaFill });
      cellA7.style({
        bottomBorder: { style: 'thin', color: 'D9D9D9' },
        leftBorder: { style: 'thin', color: 'D9D9D9' },
        rightBorder: { style: 'thin', color: 'D9D9D9' }
        // No topBorder to merge with A6
      });

      const cellB7 = sheet.cell('B7');
      cellB7.value('');
      styleTarget(cellB7, { fill: metaLabelFill });
      cellB7.style({
        bottomBorder: { style: 'thin', color: 'D9D9D9' },
        leftBorder: { style: 'thin', color: 'D9D9D9' },
        rightBorder: { style: 'thin', color: 'D9D9D9' }
        // No topBorder to merge with B6
      });

      writeCell('C7', '', { fill: metaFill });
      writeCell('D7', '', { fill: metaFill });
      writeCell('E7', '', { fill: metaFill });

      writeCell('A9', 'רווח %', { fill: colors.header, bold: true, horizontalAlignment: 'center' });
      writeCell('B9', 'רווח (₪ ללא מע"מ)', { fill: colors.header, bold: true, horizontalAlignment: 'center' });
      writeCell('C9', 'הוצאה (₪ ללא מע"מ)', { fill: colors.header, bold: true, horizontalAlignment: 'center' });
      writeCell('D9', 'הכנסה (₪ ללא מע"מ)', { fill: colors.header, bold: true, horizontalAlignment: 'center' });
      writeCell('E9', 'רכיב', { fill: colors.headerLabel, bold: true, horizontalAlignment: 'center' });

      const breakdown = costBreakdownRows(c).map((row) => {
        const income = toCurrency(row.income);
        const expense = toCurrency(row.expense);
        const profit = toCurrency(row.profit ?? (row.income - row.expense));
        const marginPct = row.margin_pct ?? (income > 0 ? (profit / income) : 0);
        return {
          label: row.label,
          income,
          expense,
          profit,
          marginPct: Number.isFinite(marginPct) ? marginPct : 0
        };
      });
      if (c.discount_ex > 0) {
        const discountValue = toCurrency(-c.discount_ex);
        breakdown.push({ label: 'הנחה', income: discountValue, expense: 0, profit: discountValue, marginPct: 0 });
      }
      const subtotalAfterDiscount = (c.subtotalPrice_ex || 0) - (c.discount_ex || 0);
      const minGap = (c.minDuePrice_ex || 0) - subtotalAfterDiscount;
      if (minGap > 0.01) {
        const minValue = toCurrency(minGap);
        // Minimum adjustment has no expense, so margin = profit/income = 100%
        const minMarginPct = minValue > 0 ? (minValue / minValue) : 0;
        breakdown.push({ label: 'התאמת מינימום', income: minValue, expense: 0, profit: minValue, marginPct: minMarginPct });
      }

      let tableRowIndex = 10;
      breakdown.forEach((item, idx) => {
        const fill = idx % 2 === 0 ? colors.bodyA : colors.bodyB;
        const marginCell = sheet.cell(`A${tableRowIndex}`);
        if (item.income > 0 && Number.isFinite(item.marginPct)) {
          marginCell.value(item.marginPct);
          styleTarget(marginCell, { fill, numberFormat: percentFormat });
        } else if (item.income === 0 && (item.profit ?? 0) === 0) {
          marginCell.value(0);
          styleTarget(marginCell, { fill, numberFormat: percentFormat });
        } else {
          marginCell.value('—');
          styleTarget(marginCell, { fill });
        }
        applyBorders(marginCell);
        writeCell(`B${tableRowIndex}`, item.profit ?? (item.income - item.expense), { fill, numberFormat: currencyFormat });
        writeCell(`C${tableRowIndex}`, item.expense, { fill, numberFormat: currencyFormat });
        writeCell(`D${tableRowIndex}`, item.income, { fill, numberFormat: currencyFormat });
        writeCell(`E${tableRowIndex}`, item.label, { fill });
        sheet.row(tableRowIndex).height(30);  // More padding for data rows
        tableRowIndex += 1;
      });

      const totals = breakdown.reduce((acc, row) => {
        acc.income += row.income;
        acc.expense += row.expense;
        acc.profit += (row.profit ?? (row.income - row.expense));
        return acc;
      }, { income: 0, expense: 0, profit: 0 });
      totals.income = toCurrency(totals.income);
      totals.expense = toCurrency(totals.expense);
      totals.profit = toCurrency(totals.profit);
      const totalsRowIndex = tableRowIndex;
      const totalBefore = toCurrency(c.minDuePrice_ex || totals.income);
      const totalAfterRaw = c.total_inc || (totalBefore * (1 + vatRate));
      const vatBase = c.vatAmt ?? (totalAfterRaw - totalBefore);
      const vatAmount = toCurrency(vatBase);
      const totalAfter = toCurrency(totalAfterRaw);
      const totalProfitRaw = totalBefore - totals.expense;  // Profit = income (ex VAT) - expense
      const totalProfit = toCurrency(totalProfitRaw);
      totals.profit = totalProfit;
      const totalMarginValue = totalBefore > 0 ? (totalProfitRaw / totalBefore) : 0;  // Margin = profit/income (ex VAT)
      const totalMarginCell = sheet.cell(`A${totalsRowIndex}`);
      totalMarginCell.value(totalMarginValue);
      styleTarget(totalMarginCell, { fill: colors.total, numberFormat: percentFormat });
      applyBorders(totalMarginCell);
      writeCell(`B${totalsRowIndex}`, totalProfit, { fill: colors.total, numberFormat: currencyFormat });
      writeCell(`C${totalsRowIndex}`, totals.expense, { fill: colors.total, numberFormat: currencyFormat });
      writeCell(`D${totalsRowIndex}`, totals.income, { fill: colors.total, numberFormat: currencyFormat });
      writeCell(`E${totalsRowIndex}`, 'סה"כ לפני מע"מ', { fill: colors.total, bold: true });
      sheet.row(totalsRowIndex).height(36);  // More padding for totals row

      let summaryRowIndex = totalsRowIndex + 1;  // Tables closer together
      const perPersonInc = toCurrency(c.pp_inc || (totalAfter / Math.max(1, totalGuests)));
      const vatPercent = vatRate * 100;
      const vatDigits = Math.abs(vatPercent % 1) < 0.001 ? 0 : 1;
      const summaryRows = [
        { value: totalBefore, label: 'סה"כ לפני מע"מ' },
        { value: vatAmount, label: `מע"מ (${formatNumber(vatPercent, vatDigits)}%)` },
        { value: totalAfter, label: 'סה"כ כולל מע"מ', strong: true },
        { value: perPersonInc, label: 'מחיר לאדם (כולל מע"מ)' },
        { value: totalProfit, label: 'רווח' }
      ];
      summaryRows.forEach((row) => {
        const fillValue = row.strong ? colors.summaryStrong : colors.summaryValue;
        writeCell(`C${summaryRowIndex}`, row.value, { fill: fillValue, numberFormat: currencyFormat });
        writeCell(`D${summaryRowIndex}`, row.label, { fill: row.strong ? colors.summaryStrong : colors.summaryLabel, bold: true });
        sheet.row(summaryRowIndex).height(row.strong ? 32 : 28);  // More padding for text readability
        summaryRowIndex += 1;
      });

      const hasDiscount = (c.discount_ex || 0) > 0 || (c.discount_pct || 0) > 0;
      if (hasDiscount) {
        const discountValue = toCurrency(c.discount_ex || 0);
        writeCell(`C${summaryRowIndex}`, -discountValue, { fill: colors.discount, numberFormat: currencyFormat, fontColor: '#B71C1C' });
        writeCell(`D${summaryRowIndex}`, describeDiscount(c) || 'הנחה', { fill: colors.discount, bold: true });
        sheet.row(summaryRowIndex).height(28);  // Add padding for discount row
        summaryRowIndex += 1;
      }
      summaryRowIndex += 1;  // Small gap before addons

      const addonsHeaderRowIndex = summaryRowIndex;
      writeCell(`C${addonsHeaderRowIndex}`, '', { fill: colors.addonHeader });
      writeCell(`D${addonsHeaderRowIndex}`, 'תוספות', { fill: colors.addonHeader, bold: true });
      sheet.row(addonsHeaderRowIndex).height(32);  // More padding for header
      let addonRowIndex = addonsHeaderRowIndex + 1;
      const addonLines = collectAddonLines(c);
      const addonSummaries = addonLines.length
        ? addonLines.map((line, idx) => {
            const price = toCurrency(line.price_ex);
            const digits = price % 1 === 0 ? 0 : 2;
            const priceLabel = price ? `₪${formatNumber(price, digits)}` : '₪0';

            const wineryRate = Number(CFG?.addons?.wineryCommissionRate) || 0.15;
            const wineryPct = Math.round(wineryRate * 100);

            let typeLabel;
            if (line.type === 'commission_winery_fixed') {
              typeLabel = `עמלה ${wineryPct}% (לאירוע)`;
            } else if (line.type === 'commission_winery_per_person') {
              typeLabel = `עמלה ${wineryPct}% (לאדם)`;
            } else if (line.type === 'commission_per_person') {
              typeLabel = 'עמלה לפי אדם';
            } else {
              typeLabel = line.type === 'per_person' ? 'לפי אורח' : 'לפי אירוע';
            }
            const categoryLabel = line.category === 'customer' ? 'לקוח מביא' : 'היקב מביא';
            const baseText = shortenAddonText(line.desc, 120) || 'תוספת';
            return `${idx + 1}. ${baseText} · ${priceLabel} (${typeLabel} · ${categoryLabel})`;
          })
        : ['ללא תוספות נוספות'];
      addonSummaries.forEach((line) => {
        writeCell(`C${addonRowIndex}`, '', { fill: colors.addonRow });
        writeCell(`D${addonRowIndex}`, line, { fill: colors.addonRow });
        sheet.row(addonRowIndex).height(28);  // Add padding for addon rows
        addonRowIndex += 1;
      });

      const safeClient = (c.client || 'לקוח')
        .replace(/[\/:*?"<>|\r\n]+/g, '_')
        .replace(/\s+/g, '_');
      const fileName = `דוח_יקב_${safeClient}.xlsx`;
      const blob = await workbook.outputAsync();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
      }, 100);
    } catch (err) {
      console.error('XLSX export failed', err);
      alert('יצוא אקסל נכשל, נסו שוב');
    }
  }

  // PDF ללקוח עם תמיכה בעברית באמצעות גופן מותאם
  async function loadHebrewFont(doc) {
    const fontDataUrl = CFG?.branding?.fontDataUrl;
    const fontUrl = CFG?.branding?.fontUrl;
    let base64 = '';
    try {
      if (fontDataUrl && fontDataUrl.startsWith('data:')) {
        const comma = fontDataUrl.indexOf(',');
        base64 = fontDataUrl.substring(comma + 1);
      } else if (fontUrl) {
        const res = await fetch(fontUrl, { mode: 'cors' });
        const buf = await res.arrayBuffer();
        base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      } else {
        const candidates = [
          'assets/fonts/Heebo-VariableFont_wght.ttf',
          './assets/fonts/Heebo-VariableFont_wght.ttf',
          'assets/fonts/Heebo.ttf',
          './assets/fonts/Heebo.ttf'
        ];
        let fetched = false;
        for (const p of candidates) {
          try {
            const res = await fetch(p);
            if (!res.ok) continue;
            const buf = await res.arrayBuffer();
            base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            fetched = true;
            break;
          } catch(_) { /* try next */ }
        }
        if (!fetched) return false;
      }
      doc.addFileToVFS('Heebo.ttf', base64);
      doc.addFont('Heebo.ttf', 'Heebo', 'normal');
      doc.addFont('Heebo.ttf', 'Heebo', 'bold');
      doc.setFont('Heebo', 'normal');
      return true;
    } catch (e) {
      console.warn('Font load failed', e);
      return false;
    }
  }

  async function generatePdf() {
    const c = lastCalc || calc();
    if (!c) return;

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      alert('ספריית jsPDF לא זמינה');
      return;
    }

    let cleanupTemplate = () => {};
    try {
      const response = await fetch('example.html');
      if (!response.ok) {
        throw new Error(`Template fetch failed: ${response.status}`);
      }
      const tpl = await response.text();
      const parser = new DOMParser();
      const parsed = parser.parseFromString(tpl, 'text/html');
      const pageTemplate = parsed.querySelector('.sheet') || parsed.querySelector('main');
      if (!pageTemplate) {
        throw new Error('Template missing .sheet root');
      }

      const div = document.createElement('div');
      div.style.position = 'fixed';
      div.style.top = '0';
      div.style.left = '0';
      div.style.width = '210mm';
      div.style.pointerEvents = 'none';
      div.style.opacity = '0';
      div.setAttribute('data-pdf-host', '');

      const styleAggregate = Array.from(parsed.querySelectorAll('style'))
        .map((styleEl) => styleEl.textContent || '')
        .join('\n');
      if (styleAggregate.trim()) {
        const styleEl = document.createElement('style');
        styleEl.textContent = styleAggregate;
        div.appendChild(styleEl);
      }

      const fontHref = parsed.querySelector('link[rel="stylesheet"][href]')?.getAttribute('href');
      let fontLink;
      if (fontHref) {
        fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = fontHref;
        fontLink.setAttribute('data-pdf-font', '');
        document.head.appendChild(fontLink);
      }

      const page_1 = pageTemplate.cloneNode(true);
      div.appendChild(page_1);
      document.body.appendChild(div);
      cleanupTemplate = () => {
        div.remove();
        if (fontLink) fontLink.remove();
      };

      div.querySelectorAll('img').forEach((img) => {
        img.setAttribute('crossorigin', 'anonymous');
      });

      const totalEl = div.querySelector('.value');
      if (totalEl) totalEl.textContent = nf(c.total_inc);
      const perPersonEl = div.querySelector('.price-per-person');
      if (perPersonEl) {
        const digits = (c.pp_inc % 1 === 0) ? 0 : 2;
        perPersonEl.textContent = `₪${formatNumber(c.pp_inc, digits)} לאדם כולל מע"מ`;
      }

      [
        ['.title', 'יקב אולו'],
        ['.document-type', 'הצעת מחיר ללקוח'],
        ['.subtitle', c.eventType ? `אירוע ${c.eventType}` : 'הצעת מחיר לאירוע']
      ].forEach(([sel, val]) => {
        const el = div.querySelector(sel);
        if (el) el.textContent = val;
      });

      const assignMeta = (containerSel, value, { fallback = '—', hideOnEmpty = false } = {}) => {
        const container = div.querySelector(containerSel);
        if (!container) return;
        const dd = container.querySelector('dd');
        const valueSpan = container.querySelector('.menu-value, .wine-summary, .drinks-summary, .menu-summary');
        const normalized = (value ?? '').toString().trim();
        const hasValue = !!normalized && normalized !== '—';
        if (dd) {
          dd.textContent = hasValue ? normalized : fallback;
        }
        if (valueSpan) {
          valueSpan.textContent = hasValue ? normalized : fallback;
        }
        container.classList.toggle('is-hidden', hideOnEmpty && !hasValue);
      };

      const describeDrinksPublic = (calc) => {
        if (!calc || !calc.drinksIncluded) return '—';
        const parts = [];
        if (calc.drinksIncluded.hot) {
          parts.push('חמים');
        }
        if (calc.drinksIncluded.cold) {
          parts.push('קרים');
        }
        return parts.length ? parts.join(' · ') : 'ללא משקאות';
      };

      assignMeta('.meta-client', c.client || '', { fallback: '—' });
      assignMeta('.meta-date', c.date || '', { fallback: '—' });
      assignMeta('.meta-type', c.eventType || '', { fallback: '—' });
      assignMeta('.meta-guests', formatNumber(c.H), { fallback: '0' });
      assignMeta('.meta-menu', describeMenuPublic(c), { hideOnEmpty: false });
      assignMeta('.meta-wine', describeWinePublic(c), { hideOnEmpty: false });
      assignMeta('.meta-drinks', describeDrinksPublic(c), { hideOnEmpty: false });

      const addonsSection = div.querySelector('[data-section="addons"]');
      const addonsList = div.querySelector('.addons');
      if (addonsList) {
        addonsList.innerHTML = '';
        const addons = computeAddonSummaries(c, { showType: false, showQuantity: false, emptyLabel: '' })
          .map(text => shortenAddonText(text))
          .filter(Boolean);
        addons.forEach(text => {
          const li = document.createElement('li');
          li.textContent = text;
          addonsList.appendChild(li);
        });
        if (addonsSection) {
          addonsSection.classList.toggle('hidden', addons.length === 0);
        }
      }

      const discountNote = div.querySelector('.discount-note');
      if (discountNote) {
        const textNote = describeDiscount(c);
        discountNote.textContent = textNote || '';
        discountNote.classList.toggle('hidden', !textNote);
      }

      const logoEl = div.querySelector('.logo');
      if (logoEl) {
        const cfgLogo = CFG?.branding?.logoDataUrl;
        logoEl.src = cfgLogo || 'assets/images/logo.png';
      }
      const qrEl = div.querySelector('.qr');
      if (qrEl) {
        qrEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = 'assets/images/qr-code.png';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        qrEl.appendChild(img);
      }

      const page = div.querySelector('.sheet') || div.firstElementChild;
      const canvas = await window.html2canvas(page, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: page.scrollWidth,
        windowHeight: page.scrollHeight,
        scrollX: 0,
        scrollY: -window.scrollY
      });
      const img = canvas.toDataURL('image/png');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = (canvas.height * pageW) / canvas.width;
      doc.addImage(img, 'PNG', 0, 0, pageW, pageH);
      cleanupTemplate();
      doc.save('הצעת_מחיר.pdf');
      return;
    } catch (e) {
      cleanupTemplate();
      console.warn('HTML template render failed, falling back to vector PDF.', e);
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    if (typeof doc.setR2L === 'function') {
      doc.setR2L(true);
    }
    const hasHebrewFont = await loadHebrewFont(doc);
    if (!hasHebrewFont) {
      doc.setFont('helvetica', 'normal');
    } else {
      doc.setFont('Heebo', 'normal');
    }

    try {
      const branding = CFG.branding || {};
      if (branding.logoDataUrl) {
        doc.addImage(branding.logoDataUrl, 'PNG', 40, 32, branding.logoWidthPt || 120, branding.logoHeightPt || 40);
      }
    } catch (_) {}

    const setLine = (textLine, y, size = 12, bold = false) => {
      doc.setFont(hasHebrewFont ? 'Heebo' : 'helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.text(String(textLine || ''), 560, y, { align: 'right', isInputRtl: true });
    };

    setLine('הצעת מחיר לאירוע', 60, 20, true);
    setLine(`לקוח/ה: ${c.client || '-'}`, 90);
    setLine(`תאריך האירוע: ${c.date || '-'} · סוג: ${c.eventType || '-'} · אורחים: ${formatNumber(c.H)}`, 110);
    setLine(`סה"כ לתשלום כולל מע"מ: ${nf(c.total_inc)}`, 140, 16, true);
    const perDigits = (c.pp_inc % 1 === 0) ? 0 : 2;
    setLine(`מחיר לאדם: ₪${formatNumber(c.pp_inc, perDigits)}`, 160, 12);

    let y = 190;
    const menuSummary = describeMenuPublic(c);
    const wineSummary = describeWinePublic(c);
    if (menuSummary && menuSummary !== '—') {
      setLine('תפריט האירוע:', y, 14, true);
      y += 18;
      setLine(menuSummary, y);
      y += 16;
      y += 6;
    }

    if (wineSummary && wineSummary !== '—') {
      setLine('יינות באירוע:', y, 14, true);
      y += 18;
      setLine(wineSummary, y);
      y += 16;
      y += 6;
    }

    const addonLines = computeAddonSummaries(c, { showType: false, showQuantity: false, emptyLabel: '' });
    if (addonLines.length) {
      setLine('תוספות:', y, 14, true);
      y += 18;
      addonLines.forEach(item => {
        setLine(`• ${item}`, y);
        y += 16;
      });
    }

    if (c.discount_ex > 0 || c.discount_pct > 0) {
      y += 10;
      setLine(describeDiscount(c), y, 12);
    }

    doc.save('הצעת_מחיר.pdf');
  }
  $('downloadPDFClient')?.addEventListener('click', generatePdf);
  $('downloadXLSXInternal')?.addEventListener('click', exportXlsx);

  // אתחול
  buildVenueRadios();
  buildMenuExtrasUI();
  updateCorporateVisibility();
  updateMenuVisibility();

  // מילוי משפחות יין
  (function fillWineTiers() {
    const sel = $('wine_tier');
    if (!sel) return;
    sel.innerHTML = '';
    const tiers = CFG?.wine?.tiers || {};
    const keys = Object.keys(tiers).filter((key) => key !== 'defaults');
    keys.forEach((key) => {
      const tier = tiers[key] || {};
      const o = document.createElement('option');
      o.value = key;
      o.textContent = tier.label || key;
      sel.appendChild(o);
    });

    if (keys.includes('ulu') && keys.includes('kosher')) {
      const mixOption = document.createElement('option');
      mixOption.value = 'mix';
      mixOption.textContent = 'אולו + כשר (70/30)';
      sel.appendChild(mixOption);
    }
  })();

  applyDrinkDefaults({ force: true });
  refreshDrinkAvailability();
  updateAutoToggleUI();
  primeBottlesAuto();
  buildQuotaPresets();
  goStep(1);
  enforceMinimumGuests();
  calc();
  }
}

export function initializePricingCalculator(windowRef = window) {
  const calculator = new PricingCalculator(windowRef);
  calculator.initialize();
  return calculator;
}
