import { chromium } from '@playwright/test';

const night = process.env.SHOT_NIGHT === '1';
const out = process.env.SHOT_OUT ?? 'shots/vehicle.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

if (night) {
  await page.evaluate(() => window.cityApp.setNightModeEnabled(true));
  await page.waitForTimeout(2200);
}

await page.evaluate(() => {
  const app = window.cityApp;
  const scene = app.bootstrap.scene;
  const vehicles = scene.getObjectByName('TrafficVehicles');
  const target = vehicles.children[0];
  const camera = app.bootstrap.camera;

  // Re-aim every frame (after controls update) so the moving vehicle stays centered.
  const follow = () => {
    const p = target.position;
    app.controls.setTarget({ x: p.x, y: 1, z: p.z });
    camera.position.set(p.x + 7, 4, p.z + 9);
    camera.lookAt(p.x, 1, p.z);
    requestAnimationFrame(follow);
  };
  follow();
});
await page.waitForTimeout(600);
await page.screenshot({ path: out, timeout: 90000, animations: 'disabled' });
await browser.close();
console.log('saved', out);
