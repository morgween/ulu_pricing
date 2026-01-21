export const parseNumber = (value, fallback = 0) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    const num = Number.parseFloat(normalized);
    return Number.isFinite(num) ? num : fallback;
  }
  if (typeof value === 'object' && value && typeof value.value === 'string') {
    return parseNumber(value.value, fallback);
  }
  return fallback;
};

export const clamp = (num, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) => {
  if (!Number.isFinite(num)) return min;
  if (Number.isFinite(min) && num < min) return min;
  if (Number.isFinite(max) && num > max) return max;
  return num;
};

export const toInteger = (value, fallback = 0) => {
  const num = parseNumber(value, fallback);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(num);
};

export const toNonNegativeInteger = (value, fallback = 0) => {
  return Math.max(0, toInteger(value, fallback));
};
