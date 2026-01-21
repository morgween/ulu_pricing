export const deepClone = (value) => JSON.parse(JSON.stringify(value ?? {}));

export const ensureObject = (object, key, fallback = {}) => {
  if (!object || typeof object !== 'object') {
    throw new TypeError('ensureObject requires a target object');
  }
  if (!object[key] || typeof object[key] !== 'object' || Array.isArray(object[key])) {
    object[key] = typeof fallback === 'function' ? fallback() : deepClone(fallback);
  }
  return object[key];
};

export const ensureArray = (object, key) => {
  if (!object || typeof object !== 'object') {
    throw new TypeError('ensureArray requires a target object');
  }
  if (!Array.isArray(object[key])) {
    object[key] = [];
  }
  return object[key];
};

export const ensurePath = (object, path, fallback) => {
  if (!object || typeof object !== 'object') {
    throw new TypeError('ensurePath requires a target object');
  }
  if (!Array.isArray(path) || !path.length) {
    return object;
  }

  let current = object;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    current = ensureObject(current, key, {});
  }
  const lastKey = path[path.length - 1];
  if (current[lastKey] === undefined) {
    current[lastKey] = typeof fallback === 'function' ? fallback() : deepClone(fallback);
  }
  return current[lastKey];
};

export const setPath = (object, path, value) => {
  if (!Array.isArray(path) || !path.length) {
    throw new TypeError('setPath requires a non-empty path');
  }
  const target = ensurePath(object, path.slice(0, -1), {});
  target[path[path.length - 1]] = value;
  return object;
};

export const getPath = (object, path, fallback) => {
  if (!Array.isArray(path) || !path.length) {
    return object;
  }
  let current = object;
  for (let i = 0; i < path.length; i += 1) {
    if (!current || typeof current !== 'object') {
      return fallback;
    }
    current = current[path[i]];
  }
  return current === undefined ? fallback : current;
};
