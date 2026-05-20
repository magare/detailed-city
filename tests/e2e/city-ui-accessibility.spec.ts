import { expect, test } from '@playwright/test';

const EXPECTED_LAYER_CONTROLS = [
  { id: 'terrain', name: 'Terrain' },
  { id: 'networks', name: 'Networks' },
  { id: 'buildings', name: 'Buildings' },
  { id: 'public-realm', name: 'Public Realm' },
  { id: 'agents', name: 'Agents' },
  { id: 'overlays', name: 'Overlays' }
];

test('debug and layer controls are named and keyboard operable', async ({ page }) => {
  test.setTimeout(300_000);

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const panel = page.locator('[data-city-debug-panel="true"]');
  const toggleButton = panel.locator('.city-debug-panel__toggle');
  await expect(panel).toHaveAttribute('aria-label', 'City diagnostics');
  await expect(toggleButton).toHaveAttribute('aria-label', 'Collapse diagnostics');
  await expect(panel.getByLabel('Scene layer controls')).toBeVisible();
  await expect(panel.getByLabel('Runtime lighting controls')).toBeVisible();

  const unnamedControls = await panel.locator('button, input').evaluateAll((controls) =>
    controls
      .filter((control) => {
        const ariaLabel = control.getAttribute('aria-label')?.trim();
        const text = control.textContent?.trim();
        return !ariaLabel && !text;
      })
      .map((control) => control.outerHTML)
  );
  expect(unnamedControls).toEqual([]);

  for (const layer of EXPECTED_LAYER_CONTROLS) {
    await expect(panel.locator(`[data-city-layer-toggle="${layer.id}"]`)).toHaveAttribute(
      'aria-label',
      `${layer.name} layer`
    );
    await expect(panel.locator(`[data-city-layer-order="${layer.id}"]`)).toHaveAttribute(
      'aria-label',
      `${layer.name} render order`
    );
  }
  await expect(panel.locator('[data-city-street-light-toggle="effects"]')).toHaveAttribute(
    'aria-label',
    'Street light effects'
  );

  await page.keyboard.press('Tab');
  await expect(toggleButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'collapsed');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'expanded');

  const focusableControlLabels = await panel.locator('button, input').evaluateAll((controls) =>
    controls.map((control) => control.getAttribute('aria-label') ?? '')
  );

  expect(focusableControlLabels).toEqual([
    'Collapse diagnostics',
    'Terrain layer',
    'Terrain render order',
    'Networks layer',
    'Networks render order',
    'Buildings layer',
    'Buildings render order',
    'Public Realm layer',
    'Public Realm render order',
    'Agents layer',
    'Agents render order',
    'Overlays layer',
    'Overlays render order',
    'Street light effects'
  ]);

  await panel.locator('[data-city-layer-toggle="networks"]').focus();
  await expect(panel.locator('[data-city-layer-toggle="networks"]')).toBeFocused();

  await panel.locator('[data-city-layer-order="buildings"]').focus();
  await expect(panel.locator('[data-city-layer-order="buildings"]')).toBeFocused();
});
