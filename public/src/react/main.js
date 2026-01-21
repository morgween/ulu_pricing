import { App } from './App.js';

const react = window.React;
const reactDOM = window.ReactDOM;

if (!react || !reactDOM) {
  throw new Error('React failed to load.');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element "#root" was not found.');
}

const root = reactDOM.createRoot(rootElement);
root.render(react.createElement(App));
