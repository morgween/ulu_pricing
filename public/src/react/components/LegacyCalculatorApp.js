import { initializePricingCalculator } from '../../app.js';

const { createElement, useEffect, useRef } = window.React;

export function LegacyCalculatorApp() {
  const containerRef = useRef(null);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) {
      return undefined;
    }

    const htmx = window.htmx;
    const fontControls = window.WineryFontControls;

    const renderMessage = (message, modifier = 'info') => {
      target.innerHTML = `\n        <div class="status-message status-message--${modifier}" aria-live="assertive">\n          <p>${message}</p>\n        </div>\n      `;
    };

    renderMessage('טוען את הממשק...', 'loading');

    if (!htmx) {
      renderMessage('htmx לא נטען, לא ניתן לטעון את הממשק.', 'error');
      return undefined;
    }

    const handleSwap = () => {
      try {
        if (typeof fontControls?.init === 'function') {
          fontControls.init(target);
        }
        initializePricingCalculator();
      } catch (error) {
        console.error('Failed to initialize pricing calculator', error);
        renderMessage('אירעה שגיאה בהפעלת המחשבון. נסו לרענן את הדף.', 'error');
      }
    };

    const handleError = () => {
      renderMessage('שגיאה בטעינת הממשק. נסו לרענן את הדף.', 'error');
    };

    target.addEventListener('htmx:afterSwap', handleSwap, { once: true });
    target.addEventListener('htmx:responseError', handleError, { once: true });
    target.addEventListener('htmx:sendError', handleError, { once: true });

    htmx.ajax('GET', 'partials/calculator.html', {
      target,
      swap: 'innerHTML'
    });

    return () => {
      target.removeEventListener('htmx:afterSwap', handleSwap);
      target.removeEventListener('htmx:responseError', handleError);
      target.removeEventListener('htmx:sendError', handleError);
    };
  }, []);

  return createElement('div', { className: 'legacy-app', ref: containerRef });
}
