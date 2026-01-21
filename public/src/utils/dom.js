export const getById = (documentRef, id) => documentRef.getElementById(id);

export const query = (root, selector) => root.querySelector(selector);

export const queryAll = (root, selector) => Array.from(root.querySelectorAll(selector));

export const markBound = (element) => {
  if (!element) return false;
  if (element.dataset.bound === 'true') {
    return false;
  }
  element.dataset.bound = 'true';
  return true;
};
