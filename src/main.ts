import { App } from './app/App';
import './styles.css';

const container = document.querySelector<HTMLDivElement>('#app');

if (!container) {
  throw new Error('Missing #app container.');
}

const app = new App(container);
app.start();

window.addEventListener('beforeunload', () => {
  app.dispose();
});

declare global {
  interface Window {
    cityApp?: App;
  }
}

window.cityApp = app;
