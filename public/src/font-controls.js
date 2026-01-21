(function (global) {
  const { document } = global;
  if (!document) {
    return;
  }

  const boundScopes = new WeakSet();

  const clampFactory = (minPx, maxPx) => (value) => Math.min(maxPx, Math.max(minPx, value));

  function createFontController(doc, body) {
    if (!doc || !body) return null;
    const dataset = body.dataset || {};
    const fontKey = dataset.fontKey || 'app_font_px';
    const minPx = Number(dataset.fontMin || 12);
    const maxPx = Number(dataset.fontMax || 22);
    const defaultPx = Number(dataset.fontDefault || 16);
    const clamp = clampFactory(minPx, maxPx);

    const readStored = () => {
      try {
        const stored = localStorage.getItem(fontKey);
        if (stored == null) return null;
        const asNumber = Number(stored);
        return Number.isFinite(asNumber) ? clamp(asNumber) : null;
      } catch (e) {
        return null;
      }
    };

    const persist = (value) => {
      try {
        localStorage.setItem(fontKey, String(value));
      } catch (e) {
        /* ignore */
      }
    };

    const applyFont = (value, shouldPersist = true) => {
      const px = clamp(Number.isFinite(value) ? value : defaultPx);
      doc.documentElement.style.setProperty('--base-font-size', `${px}px`);
      doc.documentElement.style.fontSize = `${px}px`;
      if (shouldPersist) {
        persist(px);
      }
      return px;
    };

    const initial = readStored() ?? defaultPx;
    let current = applyFont(initial, false);

    const adjust = (delta) => {
      current = applyFont(current + delta);
    };

    return { adjust };
  }

  function bindButtons(scope, adjust) {
    if (!scope || !adjust || boundScopes.has(scope)) {
      return;
    }
    const inc = scope.querySelector('#fontInc');
    const dec = scope.querySelector('#fontDec');

    if (inc) {
      inc.addEventListener('click', () => adjust(1));
    }
    if (dec) {
      dec.addEventListener('click', () => adjust(-1));
    }
    boundScopes.add(scope);
  }

  function init(scope) {
    const doc = scope?.ownerDocument || document;
    const body = scope?.closest ? scope.closest('body') || doc.body : doc.body;
    const controller = createFontController(doc, body);
    if (!controller) return;
    bindButtons(scope || doc, controller.adjust);
  }

  function autoInit() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init(document));
    } else {
      init(document);
    }
  }

  global.WineryFontControls = { init };
  autoInit();
})(typeof window !== 'undefined' ? window : globalThis);
