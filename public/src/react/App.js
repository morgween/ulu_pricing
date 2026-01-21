import { LegacyCalculatorApp } from './components/LegacyCalculatorApp.js';

const { createElement } = window.React;

export function App() {
  return createElement(LegacyCalculatorApp);
}
