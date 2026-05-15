import { expect, test } from '@playwright/test';

test('debug panel controls scene layer visibility without changing diagnostics', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const initial = await page.evaluate(() => {
    const app = window.cityApp as unknown as {
      getSceneLayerStates: () => readonly { id: string; visible: boolean; renderOrder: number }[];
    };

    return {
      diagnostics: window.cityDiagnostics?.sceneLayers.map((layer) => ({
        id: layer.id,
        objectCount: layer.objectCount
      })),
      states: app.getSceneLayerStates()
    };
  });

  expect(initial.states.map((layer) => layer.id)).toEqual([
    'terrain',
    'networks',
    'buildings',
    'public-realm',
    'agents',
    'overlays'
  ]);
  expect(initial.states.every((layer) => layer.visible)).toBe(true);

  const panel = page.locator('[data-city-debug-panel="true"]');
  await expect(panel.getByLabel('Scene layer controls')).toBeVisible();
  await expect(panel.getByRole('checkbox')).toHaveCount(6);

  const networksToggle = panel.getByRole('checkbox', { name: 'Networks layer' });
  await expect(networksToggle).toBeChecked();
  await networksToggle.uncheck();

  await expect(page.locator('body')).toHaveAttribute('data-scene-layer-networks-visible', 'false');
  await expect(networksToggle).not.toBeChecked();

  const hiddenState = await page.evaluate(() => {
    const app = window.cityApp as unknown as {
      getSceneLayerStates: () => readonly { id: string; visible: boolean; renderOrder: number }[];
    };

    return {
      diagnostics: window.cityDiagnostics?.sceneLayers.map((layer) => ({
        id: layer.id,
        objectCount: layer.objectCount
      })),
      networksVisible: app.getSceneLayerStates().find((layer) => layer.id === 'networks')?.visible
    };
  });

  expect(hiddenState.networksVisible).toBe(false);
  expect(hiddenState.diagnostics).toEqual(initial.diagnostics);

  await expect(page.locator('canvas')).toBeVisible();
  await networksToggle.check();
  await expect(page.locator('body')).toHaveAttribute('data-scene-layer-networks-visible', 'true');
});

test('debug panel controls scene layer render order at runtime', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const buildingsOrder = page
    .locator('[data-city-debug-panel="true"]')
    .getByRole('spinbutton', { name: 'Buildings render order' });

  await expect(buildingsOrder).toHaveValue('2');
  await buildingsOrder.fill('8');
  await buildingsOrder.blur();

  await expect(page.locator('body')).toHaveAttribute('data-scene-layer-buildings-order', '8');

  const orderState = await page.evaluate(() => {
    const app = window.cityApp as unknown as {
      getSceneLayerStates: () => readonly { id: string; visible: boolean; renderOrder: number }[];
    };

    return app.getSceneLayerStates().find((layer) => layer.id === 'buildings')?.renderOrder;
  });

  expect(orderState).toBe(8);
});
