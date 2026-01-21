(function () {
  const CONFIG_KEY = 'WINERY_CONFIG_OVERRIDE';
  const QUOTAS_KEY = 'WINERY_QUOTAS_OVERRIDE';

  const safeParse = (raw) => {
    if (typeof raw !== 'string' || !raw.trim()) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      console.warn('Failed parsing stored configuration override', e);
      return null;
    }
  };

  const deepClone = (value) => JSON.parse(JSON.stringify(value ?? {}));
  const ensurePath = (object, path, fallback) => {
    if (!Array.isArray(path) || !path.length) return object;
    let current = object;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    const last = path[path.length - 1];
    if (current[last] === undefined) {
      current[last] = typeof fallback === 'function' ? fallback() : fallback;
    }
    return current[last];
  };

  const upgradeLegacyConfig = (legacy) => {
    if (!legacy || typeof legacy !== 'object') return null;
    if (legacy.pricing && legacy.staffing && legacy.children) {
      return legacy;
    }

    const base = (window.WINERY_CONFIG && typeof window.WINERY_CONFIG === 'object')
      ? deepClone(window.WINERY_CONFIG)
      : {};

    if (legacy.branding) {
      base.branding = deepClone(legacy.branding);
    }
    if (typeof legacy.vat === 'number') {
      base.vat = legacy.vat;
    }
    if (typeof legacy.childFactor === 'number') {
      const children = ensurePath(base, ['children'], { factor: 0.75 });
      children.factor = legacy.childFactor;
    }

    if (legacy.workerRate != null || legacy.managerBonus != null || Array.isArray(legacy.staffSteps)) {
      const staffing = ensurePath(base, ['staffing'], { workerRate_exVAT: 0, managerBonus_exVAT: 0, tiers: [] });
      if (legacy.workerRate != null) staffing.workerRate_exVAT = legacy.workerRate;
      if (legacy.managerBonus != null) staffing.managerBonus_exVAT = legacy.managerBonus;
      if (Array.isArray(legacy.staffSteps)) staffing.tiers = legacy.staffSteps.map((step) => ({ ...step }));
    }

    const pricing = ensurePath(base, ['pricing'], {});

    if (legacy.drinks) {
      const drinks = ensurePath(pricing, ['drinks'], {});
      if (legacy.drinks.hot_cost_exVAT != null || legacy.drinks.hot_price_exVAT != null) {
        const hot = ensurePath(drinks, ['hot'], { cost_exVAT: 0, price_exVAT: 0 });
        if (legacy.drinks.hot_cost_exVAT != null) hot.cost_exVAT = legacy.drinks.hot_cost_exVAT;
        if (legacy.drinks.hot_price_exVAT != null) hot.price_exVAT = legacy.drinks.hot_price_exVAT;
      }
      if (legacy.drinks.cold_cost_exVAT != null || legacy.drinks.cold_price_exVAT != null) {
        const cold = ensurePath(drinks, ['cold'], { cost_exVAT: 0, price_exVAT: 0 });
        if (legacy.drinks.cold_cost_exVAT != null) cold.cost_exVAT = legacy.drinks.cold_cost_exVAT;
        if (legacy.drinks.cold_price_exVAT != null) cold.price_exVAT = legacy.drinks.cold_price_exVAT;
      }
      if (legacy.drinks.counts_by_duration) {
        drinks.counts_by_duration = deepClone(legacy.drinks.counts_by_duration);
      }
    }

    if (legacy.menu) {
      const winery = ensurePath(pricing, ['food', 'winery'], {});
      const baseMeal = ensurePath(winery, ['base'], { cost_exVAT: 0, price_exVAT: 0 });
      if (legacy.menu.winery_cost_exVAT != null) baseMeal.cost_exVAT = legacy.menu.winery_cost_exVAT;
      if (legacy.menu.winery_price_exVAT != null) baseMeal.price_exVAT = legacy.menu.winery_price_exVAT;
      const upgrade = ensurePath(winery, ['upgrade'], { cost_exVAT: 0, price_exVAT: 0 });
      if (legacy.menu.upgrade_cost_exVAT != null) upgrade.cost_exVAT = legacy.menu.upgrade_cost_exVAT;
      if (legacy.menu.upgrade_price_exVAT != null) upgrade.price_exVAT = legacy.menu.upgrade_price_exVAT;
    }

    if (legacy.ownCatering) {
      const markup = ensurePath(pricing, ['food', 'external', 'markup'], { small: 0, large: 0 });
      if (legacy.ownCatering.markup_small != null) markup.small = legacy.ownCatering.markup_small;
      if (legacy.ownCatering.markup_large != null) markup.large = legacy.ownCatering.markup_large;
    }

    if (legacy.clientCateringFees) {
      const fees = ensurePath(pricing, ['food', 'external', 'clientFees'], { perGuest_exVAT: 0, fixed_exVAT: 0 });
      if (legacy.clientCateringFees.fee_pp_exVAT != null) fees.perGuest_exVAT = legacy.clientCateringFees.fee_pp_exVAT;
      if (legacy.clientCateringFees.fee_fixed_exVAT != null) fees.fixed_exVAT = legacy.clientCateringFees.fee_fixed_exVAT;
    }

    if (legacy.externalCateringVendors) {
      const vendors = ensurePath(pricing, ['food', 'external', 'vendors'], {});
      Object.entries(legacy.externalCateringVendors).forEach(([key, vendor]) => {
        vendors[key] = {
          label: vendor?.label || '',
          kind: vendor?.kind || 'other',
          price_pp_exVAT: vendor?.price_pp_exVAT ?? 0
        };
      });
    }

    if (legacy.externalCateringForm) {
      const form = ensurePath(pricing, ['food', 'external', 'form'], {
        kosherLevel: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        notes: ''
      });
      Object.assign(form, deepClone(legacy.externalCateringForm));
    }

    if (legacy.venues) {
      const venues = ensurePath(pricing, ['place', 'venues'], {});
      Object.entries(legacy.venues).forEach(([key, venue]) => {
        venues[key] = {
          label: venue?.label || key,
          base_exVAT: venue?.base_exVAT ?? 0,
          cost_exVAT: venue?.cost_exVAT ?? 0
        };
      });
    }

    if (legacy.timeSurcharges) {
      const surcharges = ensurePath(pricing, ['place', 'surcharges_exVAT'], { night: 0, shabbat: 0, holiday: 0 });
      ['night', 'shabbat', 'holiday'].forEach((k) => {
        if (legacy.timeSurcharges[k] != null) {
          surcharges[k] = legacy.timeSurcharges[k];
        }
      });
    }

    const winePricing = ensurePath(pricing, ['wine'], {});
    const defaults = ensurePath(winePricing, ['defaults'], { bottlePerAdults: 5, mix: { white: 0.4, rose: 0.4, red: 0.2 } });
    if (legacy.bottlePerAdults != null) {
      defaults.bottlePerAdults = legacy.bottlePerAdults;
    }
    if (legacy.defaultWineMix) {
      defaults.mix = { ...defaults.mix, ...legacy.defaultWineMix };
    }

    const tierKeys = new Set([
      ...Object.keys(legacy.winePrice || {}),
      ...Object.keys(legacy.wineCost || {})
    ]);
    tierKeys.forEach((oldKey) => {
      const targetKey = oldKey === 'winery' ? 'ulu' : oldKey;
      const existingTier = winePricing[targetKey] || {};
      const tier = ensurePath(winePricing, [targetKey], {
        label: existingTier.label || '',
        white: { cost_exVAT: existingTier?.white?.cost_exVAT ?? 0, price_exVAT: existingTier?.white?.price_exVAT ?? 0 },
        rose: { cost_exVAT: existingTier?.rose?.cost_exVAT ?? 0, price_exVAT: existingTier?.rose?.price_exVAT ?? 0 },
        red: { cost_exVAT: existingTier?.red?.cost_exVAT ?? 0, price_exVAT: existingTier?.red?.price_exVAT ?? 0 }
      });
      const priceSource = legacy.winePrice?.[oldKey];
      if (priceSource) {
        if (priceSource.label) tier.label = priceSource.label;
        ['white', 'rose', 'red'].forEach((color) => {
          if (priceSource[color] != null) {
            const colorObj = ensurePath(tier, [color], { cost_exVAT: 0, price_exVAT: 0 });
            colorObj.price_exVAT = priceSource[color];
          }
        });
      }
      const costSource = legacy.wineCost?.[oldKey];
      if (costSource) {
        ['white', 'rose', 'red'].forEach((color) => {
          if (costSource[color] != null) {
            const colorObj = ensurePath(tier, [color], { cost_exVAT: 0, price_exVAT: 0 });
            colorObj.cost_exVAT = costSource[color];
          }
        });
      }
    });

    const revenue = ensurePath(base, ['revenue'], {});
    if (Array.isArray(legacy.eventTypesPersonal)) {
      const events = ensurePath(revenue, ['eventTypes'], {});
      events.personal = legacy.eventTypesPersonal.slice();
    }
    if (Array.isArray(legacy.eventTypesCorporate)) {
      const events = ensurePath(revenue, ['eventTypes'], {});
      events.corporate = legacy.eventTypesCorporate.slice();
    }
    if (legacy.personalBaseMinEXVAT) {
      const minimums = ensurePath(revenue, ['minimums_exVAT', 'personal'], {});
      Object.entries(legacy.personalBaseMinEXVAT).forEach(([key, value]) => {
        minimums[key] = value;
      });
    }
    if (legacy.corporateBaseMinEXVAT) {
      const minimums = ensurePath(revenue, ['minimums_exVAT', 'corporate'], {});
      Object.entries(legacy.corporateBaseMinEXVAT).forEach(([key, value]) => {
        minimums[key] = value;
      });
    }
    if (Array.isArray(legacy.weddingBaseTiers)) {
      revenue.weddingBaseTiers = legacy.weddingBaseTiers.map((tier) => ({ ...tier }));
    }

    return base;
  };

  const baseConfig = deepClone(window.WINERY_CONFIG || {});
  const baseQuotas = Array.isArray(window.WINERY_QUOTA_PRESETS)
    ? window.WINERY_QUOTA_PRESETS.map((item) => ({ ...item }))
    : [];

  let configSignature = JSON.stringify(baseConfig);
  let quotasSignature = JSON.stringify(baseQuotas);

  const dispatchOverridesUpdated = (detail = {}) => {
    if (typeof window?.dispatchEvent !== 'function') return;
    try {
      window.dispatchEvent(new CustomEvent('winery:overrides-updated', { detail }));
    } catch (error) {
      console.warn('Failed dispatching overrides-updated event', error);
    }
  };

  const applyConfigOverride = (raw) => {
    const parsed = safeParse(raw);
    if (parsed) {
      const upgraded = upgradeLegacyConfig(parsed) || parsed;
      window.WINERY_CONFIG = upgraded;
    } else {
      window.WINERY_CONFIG = deepClone(baseConfig);
    }
    const signature = JSON.stringify(window.WINERY_CONFIG || {});
    const changed = signature !== configSignature;
    configSignature = signature;
    return changed;
  };

  const applyQuotaOverride = (raw) => {
    const parsed = safeParse(raw);
    if (Array.isArray(parsed)) {
      window.WINERY_QUOTA_PRESETS = parsed.map((item) => ({ ...item }));
    } else {
      window.WINERY_QUOTA_PRESETS = baseQuotas.map((item) => ({ ...item }));
    }
    const signature = JSON.stringify(window.WINERY_QUOTA_PRESETS || []);
    const changed = signature !== quotasSignature;
    quotasSignature = signature;
    return changed;
  };

  const applyOverridesFromStorage = () => {
    if (!window?.localStorage) {
      return { configUpdated: false, quotasUpdated: false };
    }
    try {
      const cfgChanged = applyConfigOverride(window.localStorage.getItem(CONFIG_KEY));
      const quotasChanged = applyQuotaOverride(window.localStorage.getItem(QUOTAS_KEY));
      return { configUpdated: cfgChanged, quotasUpdated: quotasChanged };
    } catch (error) {
      console.warn('Unable to apply local configuration overrides', error);
      return { configUpdated: false, quotasUpdated: false };
    }
  };

  applyOverridesFromStorage();

  if (typeof window?.addEventListener === 'function') {
    window.addEventListener('storage', (event) => {
      if (!event) return;
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key && event.key !== CONFIG_KEY && event.key !== QUOTAS_KEY) return;
      const detail = applyOverridesFromStorage();
      if (detail.configUpdated || detail.quotasUpdated) {
        dispatchOverridesUpdated(detail);
      }
    });
  }
})();
