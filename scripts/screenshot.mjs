import { chromium } from '@playwright/test';

const url = process.env.SHOT_URL ?? 'http://localhost:5173/';
const out = process.env.SHOT_OUT ?? 'shots';
const night = process.env.SHOT_NIGHT === '1';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[console.error]', msg.text());
});
page.on('pageerror', (err) => console.log('[pageerror]', err.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

if (night) {
  await page.evaluate(() => {
    const app = window.cityApp;
    if (app?.setNightModeEnabled) app.setNightModeEnabled(true);
  });
  await page.waitForTimeout(2500);
}

const preset = process.env.SHOT_PRESET;
if (preset) {
  await page.evaluate((id) => window.cityApp.applyVisualQaCameraPreset(id), preset);
  await page.waitForTimeout(800);
}

await page.screenshot({ path: out, timeout: 90000, animations: 'disabled' });
await browser.close();
console.log('saved', out);
