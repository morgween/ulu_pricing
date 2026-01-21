(function (global) {
  const clamp = (num, min, max) => {
    if (!Number.isFinite(num)) return min;
    if (Number.isFinite(min) && num < min) return min;
    if (Number.isFinite(max) && num > max) return max;
    return num;
  };

  const toNumber = (val, fallback = 0) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  };

  const BASIS_TARGET_TABLE = {
    20: { our_food: 0.67, catering: 0.68, customer_catering: 0.48 },
    30: { our_food: 0.59, catering: 0.68, customer_catering: 0.42 },
    40: { our_food: 0.57, catering: 0.68, customer_catering: 0.39 },
    50: { our_food: 0.59, catering: 0.68, customer_catering: 0.38 },
    60: { our_food: 0.59, catering: 0.68, customer_catering: 0.38 },
    70: { our_food: 0.6, catering: 0.68, customer_catering: 0.38 },
    80: { our_food: 0.58, catering: 0.68, customer_catering: 0.3 },
    100: { our_food: 0.55, catering: 0.68, customer_catering: 0.35 }
  };

  const BASIS_TARGET_POINTS = Object.keys(BASIS_TARGET_TABLE)
    .map((key) => Number(key))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  const BASIS_MODES = ['our_food', 'catering', 'customer_catering'];

  const resolveMode = (mode) => (BASIS_MODES.includes(mode) ? mode : 'our_food');

  const getRowValue = (point, mode) => {
    const row = BASIS_TARGET_TABLE[String(point)] || {};
    const value = Number(row[mode]);
    return Number.isFinite(value) ? value : 0;
  };

  /**
   * @param {number} guests
   * @param {'our_food'|'catering'|'customer_catering'} [mode]
   * @returns {number}
   */
  function getTargetPct(guests, mode = 'our_food') {
    const points = BASIS_TARGET_POINTS;
    if (!points.length) return 0;
    const normalizedMode = resolveMode(mode);
    const g = Number(guests);
    if (!Number.isFinite(g)) {
      return getRowValue(points[0], normalizedMode);
    }
    if (g <= points[0]) {
      return getRowValue(points[0], normalizedMode);
    }
    const lastPoint = points[points.length - 1];
    if (g >= lastPoint) {
      return getRowValue(lastPoint, normalizedMode);
    }
    for (let i = 0; i < points.length - 1; i += 1) {
      const start = points[i];
      const end = points[i + 1];
      if (g <= end) {
        const span = end - start;
        if (span <= 0) {
          return getRowValue(end, normalizedMode);
        }
        const startVal = getRowValue(start, normalizedMode);
        const endVal = getRowValue(end, normalizedMode);
        const ratio = (g - start) / span;
        return startVal + (endVal - startVal) * ratio;
      }
    }
    return getRowValue(lastPoint, normalizedMode);
  }

  /**
   * @typedef {Object} BasePriceInput
   * @property {number} guests
   * @property {'our_food'|'catering'|'customer_catering'} mode
   * @property {number} F_c
   * @property {number} F_w
   * @property {number} D_c
   * @property {number} D_w
   * @property {number} W_i
   * @property {number} W_w
   * @property {number} [vatRate]
   */

  /**
   * @typedef {Object} BasePriceResult
   * @property {number} bp
   * @property {number} rawBP
   * @property {number} targetPct
   * @property {number} revenuePctNoBP
   * @property {number} revenuePct
   * @property {number} denom
   * @property {number} surplusIfAny
   * @property {string} [note]
   */

  /**
   * @param {BasePriceInput} input
   * @returns {BasePriceResult}
   */
  function computeBasePrice(input) {
    const normalizedMode = resolveMode(input?.mode);
    const guests = Number(input?.guests);
    const safeGuests = Number.isFinite(guests) ? guests : 0;
    const F_c = toNumber(input?.F_c);
    const F_w = toNumber(input?.F_w);
    const D_c = toNumber(input?.D_c);
    const D_w = toNumber(input?.D_w);
    const W_i = toNumber(input?.W_i);
    const W_w = toNumber(input?.W_w);
    const denom = F_w + D_w + W_w;
    const targetPct = Math.max(0, getTargetPct(safeGuests, normalizedMode));
    const baseProfit = (F_c - F_w) + (D_c - D_w) + (W_i - W_w);
    const profitBeforeVat = baseProfit;
    const revenuePctNoBP = denom > 0 ? profitBeforeVat / denom : 0;

    if (!(denom > 0)) {
      const result = {
        bp: 0,
        rawBP: 0,
        targetPct,
        revenuePctNoBP,
        revenuePct: revenuePctNoBP,
        denom,
        surplusIfAny: 0
      };
      const note = 'Cannot compute basis price because total base expenses are not positive.';
      result.note = note;
      return result;
    }

    const rawBP = targetPct * denom - profitBeforeVat;
    let bp = Number.isFinite(rawBP) ? rawBP : 0;
    const surplusIfAny = rawBP < 0 ? Math.abs(rawBP) : 0;
    if (bp < 0) bp = 0;
    const computeRevenuePct = (bpValue) => (denom > 0 ? (profitBeforeVat + bpValue) / denom : 0);
    let revenuePct = computeRevenuePct(bp);
    if (bp > 0 && revenuePct + 1e-6 < targetPct) {
      const correction = (targetPct - revenuePct) * denom;
      bp += correction;
      revenuePct = computeRevenuePct(bp);
    }
    if (bp === 0) {
      revenuePct = revenuePctNoBP;
    } else if (revenuePct < targetPct) {
      revenuePct = targetPct;
    }

    return {
      bp,
      rawBP,
      targetPct,
      revenuePctNoBP,
      revenuePct,
      denom,
      surplusIfAny
    };
  }

  function selectBracket(brackets, headcount) {
    if (!Array.isArray(brackets) || !brackets.length) return null;
    for (const bracket of brackets) {
      if (!bracket) continue;
      const maxGuests = Number.isFinite(bracket.maxGuests) ? bracket.maxGuests : Infinity;
      if (headcount <= maxGuests) return bracket;
    }
    return brackets[brackets.length - 1] || null;
  }

  function computeMargin(policy, variantKey, headcount) {
    const defaults = { low: 0.5, high: 0.35 };
    const cfg = policy || {};
    const minMargin = Number.isFinite(cfg.min) ? cfg.min : 0.3;
    const maxMargin = Number.isFinite(cfg.max) ? cfg.max : 0.65;
    const rangeCfg = cfg.headcountRange || {};
    const minGuests = Number.isFinite(rangeCfg.min) ? rangeCfg.min : 20;
    const maxGuests = Number.isFinite(rangeCfg.max) ? rangeCfg.max : 200;
    const span = Math.max(1, maxGuests - minGuests);
    const normalizedGuests = clamp(headcount, minGuests, maxGuests);
    const ratio = (normalizedGuests - minGuests) / span;
    const typeCfg = (cfg.foodTypes && cfg.foodTypes[variantKey]) || cfg.foodTypes?.default || defaults;
    const low = Number.isFinite(typeCfg.low) ? typeCfg.low : defaults.low;
    const high = Number.isFinite(typeCfg.high) ? typeCfg.high : defaults.high;
    const rawTarget = low + (high - low) * ratio;
    const clampedTarget = clamp(rawTarget, minMargin, maxMargin);
    const enforced = Math.max(0.3, clampedTarget);
    return {
      raw: rawTarget,
      target: enforced,
      min: minMargin,
      max: maxMargin
    };
  }

  function computeBaseMinimum(baseCfg, kind, eventType, headcount, fallback) {
    const cfg = baseCfg || {};
    const scope = cfg[kind] || {};
    if (kind === 'personal' && eventType === 'חתונה' && Array.isArray(scope.weddingTiers) && scope.weddingTiers.length) {
      const bracket = selectBracket(scope.weddingTiers, headcount) || scope.weddingTiers[scope.weddingTiers.length - 1];
      const value = toNumber(bracket?.baseFee);
      if (value > 0) return value;
    }
    const byType = scope.byType || {};
    const value = toNumber(byType[eventType]);
    if (value > 0) return value;

    // fallbacks from legacy configuration
    if (kind === 'personal' && eventType === 'חתונה' && Array.isArray(fallback?.weddingBaseTiers)) {
      const bracket = selectBracket(fallback.weddingBaseTiers, headcount) || fallback.weddingBaseTiers[fallback.weddingBaseTiers.length - 1];
      const fee = toNumber(bracket?.base_exVAT);
      if (fee > 0) return fee;
    }
    const legacyMap = kind === 'corporate' ? fallback?.corporateBaseMinEXVAT : fallback?.personalBaseMinEXVAT;
    if (legacyMap && typeof legacyMap === 'object') {
      const fee = toNumber(legacyMap[eventType]);
      if (fee > 0) return fee;
    }
    const defaultFee = toNumber(scope.default);
    return defaultFee > 0 ? defaultFee : 0;
  }

  function computeVenue(pricing, fallback, venueKey, headcount, timeFlags) {
    const arrayVenues = Array.isArray(pricing?.venues?.baseFees)
      ? pricing.venues.baseFees.reduce((acc, entry) => {
          if (!entry || !entry.key) return acc;
          const key = entry.key;
          const base = Number.parseFloat(entry.baseFee_exVAT);
          const cost = Number.parseFloat(entry.cost_exVAT);
          const multiplier = Number.parseFloat(entry.locationMultiplier);
          acc[key] = {
            label: entry.label || key,
            base_exVAT: Number.isFinite(base) ? base : undefined,
            cost_exVAT: Number.isFinite(cost) ? cost : undefined,
            locationMultiplier: Number.isFinite(multiplier) ? multiplier : undefined
          };
          return acc;
        }, {})
      : {};
    const venuesCfg = { ...(pricing?.place?.venues || {}), ...arrayVenues };
    const fallbackVenues = (fallback?.pricing?.place?.venues) || fallback?.venues || {};
    const venueCfg = venuesCfg[venueKey] || fallbackVenues[venueKey] || {};
    const brackets = venueCfg.brackets;
    const bracket = selectBracket(brackets, headcount);
    const baseFee = toNumber(
      bracket?.baseFee,
      toNumber(venueCfg.baseFee, toNumber(venueCfg.baseFee_exVAT, toNumber(venueCfg.base_exVAT, 0)))
    );
    const baseCost = toNumber(
      bracket?.cost,
      toNumber(venueCfg.cost, toNumber(venueCfg.cost_exVAT, 0))
    );
    const headcountMultiplier = Number.isFinite(bracket?.multiplier) ? bracket.multiplier : 1;
    const locationMultiplier = Number.isFinite(venueCfg.locationMultiplier) ? venueCfg.locationMultiplier : 1;
    const timeCfg = pricing?.timeMultipliers || {};
    const timeMultiplier = ['night', 'shabbat', 'holiday'].reduce((acc, key) => {
      if (timeFlags && timeFlags[key]) {
        const m = Number.isFinite(timeCfg[key]) ? timeCfg[key] : 1;
        return acc * m;
      }
      return acc;
    }, 1);
    const totalMultiplier = headcountMultiplier * locationMultiplier * timeMultiplier;
    const cost = baseCost * totalMultiplier;
    const fee = baseFee * totalMultiplier;
    return {
      key: venueKey,
      label: venueCfg.label || fallback?.venues?.[venueKey]?.label || venueKey || 'מיקום',
      baseFee: fee,
      totalCost: cost,
      multipliers: {
        headcount: headcountMultiplier,
        location: locationMultiplier,
        time: timeMultiplier,
        total: totalMultiplier
      },
      bracket: bracket || null
    };
  }

  function computeStaffing(pricing, fallback, headcount, managerRequired = true) {
    const staffingCfg = pricing?.staffing || {};
    const steps = Array.isArray(staffingCfg.tiers) && staffingCfg.tiers.length
      ? staffingCfg.tiers
      : (fallback?.staffing?.tiers || fallback?.staffSteps || []);
    let workers = 0;
    if (steps.length) {
      const bracket = selectBracket(steps, headcount) || steps[steps.length - 1];
      workers = toNumber(bracket?.workers, toNumber(steps[steps.length - 1]?.workers, 0));
    }
    if (workers <= 0) workers = 1;
    const workerRate = toNumber(staffingCfg.workerRate_exVAT, toNumber(staffingCfg.workerRate, toNumber(fallback?.staffing?.workerRate_exVAT, toNumber(fallback?.workerRate, 0))));
    const managerBase = toNumber(staffingCfg.managerBonus_exVAT, toNumber(staffingCfg.event_manager_fee_exVAT, toNumber(fallback?.staffing?.managerBonus_exVAT, toNumber(fallback?.managerBonus, 0))));
    const managerBonus = managerRequired ? managerBase : 0;
    const workerCost = workers * workerRate;
    const totalCost = workerCost + managerBonus;
    const fixedRevenue = Number.isFinite(staffingCfg.fixedRevenue_exVAT)
      ? staffingCfg.fixedRevenue_exVAT
      : (Number.isFinite(fallback?.staffing?.fixedRevenue_exVAT)
        ? fallback.staffing.fixedRevenue_exVAT
        : 100);
    return {
      workers,
      workerRate,
      managerBonus,
      workerCost,
      totalCost,
      fixedRevenue,
      details: {
        workers,
        workerRate,
        managerBonus,
        workerCost,
        managerCost: managerBonus,
        includeManager: managerBonus > 0,
        fixedRevenue
      }
    };
  }

  function computeDrinks(pricing, fallback, guests, drinksInput, duration) {
    const drinksCfg = pricing?.drinks || {};
    const hotCfg = drinksCfg.hot || {};
    const coldCfg = drinksCfg.cold || {};
    const legacyDrinks = fallback?.drinks || {};
    const ratesByDuration = drinksCfg.ratesByDuration || legacyDrinks.counts_by_duration || {};
    const durationKey = duration && ratesByDuration[duration] ? duration : 'short';
    const durationDefaults = ratesByDuration[durationKey] || {};
    const includeHot = drinksInput.includeHot !== false;
    const includeCold = drinksInput.includeCold !== false;
    const hotRate = toNumber(drinksInput.hotRate, toNumber(durationDefaults.hot, 0));
    const coldRate = toNumber(drinksInput.coldRate, toNumber(durationDefaults.cold, 0));
    const hotUnitCost = toNumber(hotCfg.costPerUnit, toNumber(legacyDrinks.hot_cost_exVAT, 0));
    const coldUnitCost = toNumber(coldCfg.costPerUnit, toNumber(legacyDrinks.cold_cost_exVAT, 0));
    const adults = Math.max(0, toNumber(guests?.adults, guests?.totalGuests));
    const children = Math.max(0, toNumber(guests?.children, 0));
    const childRules = pricing?.children_rules || {};
    const childColdUnits = toNumber(childRules.cold_drinks_units, 1);
    const childHotUnits = toNumber(childRules.hot_drinks_units, 0.5);
    const hotUnitsAdults = includeHot ? adults * hotRate : 0;
    const hotUnitsChildren = includeHot ? children * childHotUnits : 0;
    const totalHotUnits = hotUnitsAdults + hotUnitsChildren;
    const coldUnitsAdults = includeCold ? adults * coldRate : 0;
    const coldUnitsChildren = includeCold ? children * childColdUnits : 0;
    const totalColdUnits = coldUnitsAdults + coldUnitsChildren;
    const hotCost = totalHotUnits * hotUnitCost;
    const coldCost = totalColdUnits * coldUnitCost;
    const totalCost = hotCost + coldCost;
    const hotUnitPrice = toNumber(hotCfg.pricePerUnit, toNumber(legacyDrinks.hot_price_exVAT, hotUnitCost));
    const coldUnitPrice = toNumber(coldCfg.pricePerUnit, toNumber(legacyDrinks.cold_price_exVAT, coldUnitCost));
    const hotPrice = totalHotUnits * hotUnitPrice;
    const coldPrice = totalColdUnits * coldUnitPrice;
    const totalPrice = hotPrice + coldPrice;
    const baseRevenue = Math.max(0, totalPrice - totalCost);
    return {
      totalCost,
      baseRevenue,
      details: {
        includeHot,
        includeCold,
        rates: { hot: hotRate, cold: coldRate },
        consumption: {
          adults: { hot: hotUnitsAdults, cold: coldUnitsAdults },
          children: { hot: hotUnitsChildren, cold: coldUnitsChildren }
        },
        unitCosts: { hot: hotUnitCost, cold: coldUnitCost },
        unitPrices: { hot: hotUnitPrice, cold: coldUnitPrice },
        totalPrice_exVAT: totalPrice
      }
    };
  }

  function resolveWineTier(pricing, fallback, tierKey) {
    const wineCfg = pricing?.wine || {};
    const tiers = wineCfg.tiers || {};
    if (tiers[tierKey]) return tiers[tierKey];
    const skuTier = wineCfg.skus?.[tierKey];
    if (skuTier) {
      const variants = skuTier.variants || {};
      const mapColor = (color) => ({
        cost: toNumber(variants[color]?.cost_exVAT, 0),
        price: toNumber(variants[color]?.price_exVAT, toNumber(variants[color]?.priceExVAT, 0))
      });
      return {
        label: skuTier.label || tierKey,
        cost: {
          white: mapColor('white').cost,
          rose: mapColor('rose').cost,
          red: mapColor('red').cost
        },
        price: {
          white: mapColor('white').price,
          rose: mapColor('rose').price,
          red: mapColor('red').price
        }
      };
    }
    const directTier = wineCfg[tierKey];
    if (directTier && typeof directTier === 'object') {
      return {
        label: directTier.label || tierKey,
        cost: {
          white: toNumber(directTier.white?.cost_exVAT, toNumber(directTier.white?.cost, 0)),
          rose: toNumber(directTier.rose?.cost_exVAT, toNumber(directTier.rose?.cost, 0)),
          red: toNumber(directTier.red?.cost_exVAT, toNumber(directTier.red?.cost, 0))
        },
        price: {
          white: toNumber(directTier.white?.price_exVAT, toNumber(directTier.white?.price, 0)),
          rose: toNumber(directTier.rose?.price_exVAT, toNumber(directTier.rose?.price, 0)),
          red: toNumber(directTier.red?.price_exVAT, toNumber(directTier.red?.price, 0))
        }
      };
    }
    const mixCfg = wineCfg.mixes?.[tierKey];
    if (mixCfg) {
      const components = mixCfg.components || [];
      const cost = { white: 0, rose: 0, red: 0 };
      const price = { white: 0, rose: 0, red: 0 };
      components.forEach((item) => {
        const refTier = tiers[item.key];
        if (!refTier) return;
        const weight = Number.isFinite(item.weight) ? item.weight : 0;
        ['white', 'rose', 'red'].forEach((color) => {
          const c = toNumber(refTier.cost?.[color]);
          const p = toNumber(refTier.price?.[color]);
          cost[color] += c * weight;
          price[color] += p * weight;
        });
      });
      return { cost, price, label: mixCfg.label || tierKey };
    }
    const legacyCost = fallback?.wineCost?.[tierKey];
    const legacyPrice = fallback?.winePrice?.[tierKey];
    if (legacyCost || legacyPrice) {
      return {
        cost: legacyCost || { white: 0, rose: 0, red: 0 },
        price: legacyPrice || { white: 0, rose: 0, red: 0 },
        label: tierKey
      };
    }
    return tiers.winery || {
      cost: fallback?.wineCost?.winery || { white: 0, rose: 0, red: 0 },
      price: fallback?.winePrice?.winery || { white: 0, rose: 0, red: 0 },
      label: 'winery'
    };
  }

  function computeWine(pricing, fallback, wineInput) {
    const tierKey = wineInput.tier || 'winery';
    const tier = resolveWineTier(pricing, fallback, tierKey);
    const bottles = wineInput.bottles || {};
    const white = toNumber(bottles.white, 0);
    const rose = toNumber(bottles.rose, 0);
    const red = toNumber(bottles.red, 0);
    const priceMap = tier.price || {};
    const priceWhite = toNumber(priceMap.white, toNumber(tier.cost?.white, 0));
    const priceRose = toNumber(priceMap.rose, toNumber(tier.cost?.rose, 0));
    const priceRed = toNumber(priceMap.red, toNumber(tier.cost?.red, 0));
    const totals = {
      cost: (white * toNumber(tier.cost?.white)) + (rose * toNumber(tier.cost?.rose)) + (red * toNumber(tier.cost?.red)),
      price: (white * priceWhite) + (rose * priceRose) + (red * priceRed),
      bottles: { white, rose, red }
    };
    const baseRevenue = Math.max(0, totals.price - totals.cost);
    return {
      totalCost: totals.cost,
      baseRevenue,
      details: {
        tier: tierKey,
        costPerBottle: tier.cost || { white: 0, rose: 0, red: 0 },
        pricePerBottle: tier.price || { white: priceWhite, rose: priceRose, red: priceRed },
        bottles: totals.bottles,
        label: tier.label || tierKey,
        totalPrice_exVAT: totals.price
      }
    };
  }

  function computeFood(pricing, fallback, guests, menuKey, upgrade, ownCateringRate) {
    const menuCfg = pricing?.food || {};
    const legacyMenu = fallback?.menu || {};
    const adults = Math.max(0, toNumber(guests?.adults, guests?.totalGuests));
    const children = Math.max(0, toNumber(guests?.children, 0));
    const totalGuests = Math.max(0, toNumber(guests?.totalGuests, adults + children));
    if (menuKey === 'own_catering') {
      const rate = Math.max(0, toNumber(ownCateringRate, 0));
      const totalCost = totalGuests * rate;
      const markupPct = toNumber(menuCfg.catering_we_bring?.markup_percent, 15) / 100;
      const totalPrice = totalCost * (1 + markupPct);
      return {
        totalCost,
        baseRevenue: totalPrice - totalCost,
        variantKey: 'catering_we_bring',
        label: 'כיבוד - קייטרינג מטעמנו',
        details: {
          type: 'own_catering',
          ratePerGuest: rate,
          guests: totalGuests,
          markupPercent: markupPct * 100,
          totalPrice_exVAT: totalPrice
        }
      };
    }
    if (menuKey === 'client_catering') {
      const feesNew = menuCfg.catering_client_brings || {};
      const threshold = Number.isFinite(feesNew.threshold) ? feesNew.threshold : 50;
      let serviceFee = 0;
      if (totalGuests < threshold) {
        const feePerGuest = toNumber(feesNew.fee_under_50_per_person_exVAT, 24);
        serviceFee = feePerGuest * totalGuests;
      } else {
        serviceFee = toNumber(feesNew.fee_50_or_more_total_exVAT, 2400);
      }
      return {
        totalCost: 0,
        baseRevenue: serviceFee,
        variantKey: 'client_catering',
        label: 'כיבוד - קייטרינג חיצוני (לקוח)',
        details: {
          type: 'client_catering',
          serviceFee,
          threshold,
          headcount: totalGuests
        }
      };
    }
    const wineryCfg = menuCfg.winery || {};
    const childRules = pricing?.children_rules || {};
    const childFoodMultiplier = toNumber(childRules.food_multiplier_if_winery_food, toNumber(fallback?.children?.factor, 0.75));
    const adultsCostPerGuest = toNumber(upgrade ? wineryCfg.upgrade?.cost_exVAT : wineryCfg.base?.cost_exVAT, toNumber(wineryCfg.costPerGuest, toNumber(legacyMenu.winery_cost_exVAT, 0)));
    const adultsPricePerGuest = toNumber(upgrade ? wineryCfg.upgrade?.price_exVAT : wineryCfg.base?.price_exVAT, toNumber(wineryCfg.pricePerGuest, adultsCostPerGuest));
    const childrenCostPerGuest = adultsCostPerGuest * childFoodMultiplier;
    const childrenPricePerGuest = adultsPricePerGuest * childFoodMultiplier;
    const adultsCost = adults * adultsCostPerGuest;
    const childrenCost = children * childrenCostPerGuest;
    const adultsPrice = adults * adultsPricePerGuest;
    const childrenPrice = children * childrenPricePerGuest;
    const totalCost = adultsCost + childrenCost;
    const totalPrice = adultsPrice + childrenPrice;
    return {
      totalCost,
      baseRevenue: Math.max(0, totalPrice - totalCost),
      variantKey: upgrade ? 'winery_extended' : 'winery',
      label: upgrade ? 'כיבוד היקב – תפריט מורחב' : 'כיבוד היקב',
      details: {
        type: 'winery',
        upgrade,
        adults,
        children,
        adultCostPerGuest: adultsCostPerGuest,
        childCostPerGuest: childrenCostPerGuest,
        adultPricePerGuest: adultsPricePerGuest,
        childPricePerGuest: childrenPricePerGuest,
        totalPrice_exVAT: totalPrice
      }
    };
  }

  function computeUtensils(pricing, fallback, guests, variantKey) {
    const totalGuests = Math.max(0, toNumber(guests?.totalGuests, guests?.adults + guests?.children));
    const utensilCfg = pricing?.kitchen_utensils_expense || {};
    const enabledFor = Array.isArray(utensilCfg.enabled_for) ? utensilCfg.enabled_for : ['winery', 'winery_extended'];
    const normalizedKey = variantKey || '';
    if (!enabledFor.includes(normalizedKey)) {
      return { totalCost: 0, details: { perGuest: 0, totalGuests, variantKey } };
    }
    const defaultPerGuest = 1.1 * 15;
    const perGuest = Number.isFinite(utensilCfg.per_guest_cost_exVAT)
      ? utensilCfg.per_guest_cost_exVAT
      : defaultPerGuest;
    const totalCost = totalGuests * perGuest;
    return {
      totalCost,
      details: {
        perGuest,
        totalGuests,
        variantKey
      }
    };
  }

  function computeAddons(pricing, fallback, guests, addonsInput) {
    const totalGuests = Math.max(0, toNumber(guests?.totalGuests, guests?.adults + guests?.children));
    const markupCfg = pricing?.addons || {};
    const weBringMarkup = toNumber(markupCfg.we_bring?.markup_percent, 15) / 100;
    const customerMarkup = toNumber(markupCfg.customer_brings?.markup_percent, 0) / 100;
    const lines = [];
    let totalCost = 0;
    let totalPrice = 0;
    addonsInput.forEach((addon) => {
      if (!addon) return;
      const desc = (addon.desc || '').trim() || 'תוספת';
      const type = addon.type === 'per_person' ? 'per_person' : 'fixed';
      const qty = Math.max(0, toNumber(addon.qty, 0));
      const unit = Math.max(0, toNumber(addon.unitCost, 0));
      const unitIncome = Math.max(0, toNumber(addon.unitIncome, addon.unitPrice, addon.unit));
      const category = addon.category === 'customer' ? 'customer' : 'winery';
      const effectiveQty = type === 'per_person' ? totalGuests * qty : qty;
      let cost = 0;
      let price = 0;
      let markupPercent = category === 'customer' ? customerMarkup : weBringMarkup;
      if (category === 'customer') {
        price = unitIncome * effectiveQty;
      } else {
        cost = unit * effectiveQty;
        price = cost * (1 + markupPercent);
      }
      totalCost += cost;
      totalPrice += price;
      lines.push({
        desc,
        type,
        category,
        baseQty: qty,
        effectiveQty,
        unit,
        unitIncome,
        cost_ex: cost,
        price_ex: price,
        markup_percent: markupPercent * 100
      });
    });
    return {
      totalCost,
      totalPrice,
      lines,
      summary: {
        weBringMarkupPercent: weBringMarkup * 100,
        customerMarkupPercent: customerMarkup * 100
      }
    };
  }

  function compute(inputs, config) {
    if (!inputs || !config) return null;
    const pricing = config.pricing || {};
    const childRules = pricing?.children_rules || {};
    const adults = Math.max(0, toNumber(inputs.adults, inputs.totalGuests));
    const children = Math.max(0, toNumber(inputs.children, 0));
    const totalGuests = Math.max(0, toNumber(inputs.totalGuests, adults + children));
    const childFoodMultiplier = Number.isFinite(childRules.food_multiplier_if_winery_food)
      ? childRules.food_multiplier_if_winery_food
      : toNumber(config.childFactor, 0.75);
    const effectiveGuests = Number.isFinite(inputs.effectiveGuests)
      ? inputs.effectiveGuests
      : adults + childFoodMultiplier * children;
    const guestInfo = {
      adults,
      children,
      totalGuests,
      effectiveGuests
    };

    const baseMin = computeBaseMinimum(pricing.baseMinimums, inputs.kind || 'personal', inputs.eventType || '', totalGuests, config);
    const venue = computeVenue(pricing, config, inputs.venueKey, totalGuests, inputs.timeFlags || {});
    const staffing = computeStaffing(pricing, config, totalGuests, inputs.managerRequired !== false);
    const drinks = computeDrinks(pricing, config, guestInfo, inputs.drinks || {}, inputs.duration);
    const food = computeFood(pricing, config, guestInfo, inputs.menuKey || 'winery', Boolean(inputs.menuUpgrade), inputs.ownCateringRate);
    const utensils = computeUtensils(pricing, config, guestInfo, food.variantKey);
    const wine = computeWine(pricing, config, inputs.wine || {});
    const addons = computeAddons(pricing, config, guestInfo, inputs.addons || []);

    const staffBaseRevenue = Number.isFinite(staffing.fixedRevenue) ? staffing.fixedRevenue : 100;
    const costComponents = [
      { key: 'venue', label: venue.label || 'מיקום', cost: venue.totalCost, baseRevenue: venue.baseFee, details: { ...venue } },
      { key: 'staff', label: 'כוח אדם', cost: staffing.totalCost, baseRevenue: staffBaseRevenue, details: staffing.details, applyMarkup: false },
      { key: 'drinks', label: 'משקאות', cost: drinks.totalCost, baseRevenue: drinks.baseRevenue || 0, details: drinks.details },
      { key: 'menu', label: food.label || 'כיבוד', cost: food.totalCost, baseRevenue: food.baseRevenue || 0, details: food.details },
      { key: 'utensils', label: 'כלי הגשה', cost: utensils.totalCost, baseRevenue: 0, details: utensils.details },
      { key: 'wine', label: 'יין', cost: wine.totalCost, baseRevenue: wine.baseRevenue || 0, details: wine.details }
    ];

    const markupComponents = costComponents.filter((comp) => comp.applyMarkup !== false);
    const nonMarkupComponents = costComponents.filter((comp) => comp.applyMarkup === false);

    const markupBaseCost = markupComponents.reduce((sum, comp) => sum + comp.cost, 0);
    const nonMarkupCost = nonMarkupComponents.reduce((sum, comp) => sum + comp.cost, 0);
    const baseCost = markupBaseCost + nonMarkupCost;
    const componentBaseRevenue = costComponents.reduce((sum, comp) => sum + (comp.baseRevenue || 0), 0);

    const marginInfo = computeMargin(pricing.marginPolicy, food.variantKey, totalGuests);
    const targetMargin = marginInfo.target;

    const marginPortionPrice = markupBaseCost > 0 ? (markupBaseCost / (1 - targetMargin)) : 0;
    const basePriceBeforeMin = baseMin + componentBaseRevenue + nonMarkupCost + marginPortionPrice;
    const enforcedMin = baseMin + (venue.baseFee || 0) + (food.baseRevenue || 0);
    const basePrice = Math.max(basePriceBeforeMin, enforcedMin);

    const markupPool = basePrice - baseMin - componentBaseRevenue - nonMarkupCost;
    const costMarkupFactor = markupBaseCost > 0 ? (markupPool / markupBaseCost) : 0;

    costComponents.forEach((comp) => {
      const baseRevenue = comp.baseRevenue || 0;
      let price;
      if (comp.applyMarkup === false) {
        price = comp.cost + baseRevenue;
      } else {
        price = baseRevenue + comp.cost * costMarkupFactor;
      }
      comp.income = price;
      comp.profit = price - comp.cost;
    });

    const addonComponent = {
      key: 'addons',
      label: 'תוספות',
      cost: addons.totalCost,
      income: addons.totalPrice,
      profit: addons.totalPrice - addons.totalCost,
      details: { lines: addons.lines, summary: addons.summary },
      baseRevenue: 0
    };
    const components = [...costComponents, addonComponent];

    const subtotalPrice = basePrice + addons.totalPrice;
    const totalCost = baseCost + addons.totalCost;
    const actualMargin = subtotalPrice > 0 ? Math.max(0, (subtotalPrice - totalCost) / subtotalPrice) : 0;

    // attach totals to detailed objects for convenience
    const attachIncome = (key, value) => {
      const found = components.find((comp) => comp.key === key);
      return found ? found.income : value;
    };

    venue.totalPrice = attachIncome('venue', venue.baseFee);
    staffing.totalPrice = attachIncome('staff', staffing.totalCost + staffBaseRevenue);
    drinks.totalPrice = attachIncome('drinks', drinks.totalCost + (drinks.baseRevenue || 0));
    food.totalPrice = attachIncome('menu', food.totalCost + (food.baseRevenue || 0));
    utensils.totalPrice = attachIncome('utensils', utensils.totalCost);
    wine.totalPrice = attachIncome('wine', wine.totalCost + (wine.baseRevenue || 0));

    return {
      baseMin,
      venue,
      staffing,
      drinks,
      food,
      utensils,
      wine,
      addons,
      totals: {
        baseCost,
        addonCost: addons.totalCost,
        totalCost,
        basePriceBeforeMin,
        basePrice,
        subtotalPrice,
        enforcedMin,
        targetMargin,
        actualMargin,
        costMarkupFactor
      },
      breakdown: {
        baseLine: { key: 'base', income: baseMin },
        components
      }
    };
  }

  global.WineryPricing = {
    compute,
    getTargetPct,
    computeBasePrice
  };
})(typeof window !== 'undefined' ? window : globalThis);
