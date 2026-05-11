import { App } from './app/App';
import './styles.css';

const container = document.querySelector<HTMLDivElement>('#app');

if (!container) {
  throw new Error('Missing #app container.');
}

let app: App | undefined;

try {
  app = new App(container);
  app.start();
  window.cityApp = app;
  window.cityDiagnostics = app.diagnostics;
} catch (error) {
  document.body.dataset.sceneReady = 'false';
  document.body.dataset.sceneValidationStatus = 'failed';
  window.cityStartupError = error;
  throw error;
}

window.addEventListener('beforeunload', () => {
  app?.dispose();
});

declare global {
  interface Window {
    cityApp?: App;
    cityDiagnostics?: App['diagnostics'];
    cityStartupError?: unknown;
  }
}
