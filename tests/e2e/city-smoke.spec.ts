import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

test('renders a nonblank WebGL city scene', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const screenshot = await canvas.screenshot();
  const png = PNG.sync.read(screenshot);
  let variedPixels = 0;

  for (let y = 0; y < png.height; y += 4) {
    for (let x = 0; x < png.width; x += 4) {
      const offset = (png.width * y + x) * 4;
      const red = png.data[offset];
      const green = png.data[offset + 1];
      const blue = png.data[offset + 2];
      const alpha = png.data[offset + 3];
      const brightness = red + green + blue;
      const channelSpread = Math.max(red, green, blue) - Math.min(red, green, blue);

      if (alpha > 0 && brightness > 45 && channelSpread > 5) {
        variedPixels += 1;
      }
    }
  }

  expect(variedPixels, `${testInfo.project.name} should render visible nonbackground pixels`).toBeGreaterThan(800);
});
