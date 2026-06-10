import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

await page.evaluate(() => window.cityApp.setNightModeEnabled(true));
await page.waitForTimeout(2200);

const layers = await page.evaluate(() => window.cityApp.getSceneLayerStates().map((l) => l.id));
console.log('layers:', layers);

for (const layer of layers) {
  await page.evaluate((id) => window.cityApp.setSceneLayerVisible(id, false), layer);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `shots/night-no-${layer}.png`, timeout: 90000, animations: 'disabled' });
  await page.evaluate((id) => window.cityApp.setSceneLayerVisible(id, true), layer);
  await page.waitForTimeout(200);
}

await browser.close();
console.log('done');
