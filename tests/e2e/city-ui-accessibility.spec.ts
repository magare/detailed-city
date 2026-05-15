import { expect, test } from '@playwright/test';

const EXPECTED_LAYER_LABELS = [
  'Terrain layer',
  'Networks layer',
  'Buildings layer',
  'Public Realm layer',
  'Agents layer',
  'Overlays layer'
];

test('debug and layer controls are named and keyboard operable', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const panel = page.locator('[data-city-debug-panel="true"]');
  const toggleButton = panel.getByRole('button', { name: 'Collapse diagnostics' });
  await expect(panel).toHaveAttribute('aria-label', 'City diagnostics');
  await expect(panel.getByLabel('Scene layer controls')).toBeVisible();

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

  for (const label of EXPECTED_LAYER_LABELS) {
    await expect(panel.getByRole('checkbox', { name: label })).toBeVisible();
    await expect(panel.getByRole('spinbutton', { name: label.replace(' layer', ' render order') })).toBeVisible();
  }

  await page.keyboard.press('Tab');
  await expect(toggleButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'collapsed');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'expanded');

  const reachableControlLabels: string[] = [];
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab');
    reachableControlLabels.push(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
    );
  }

  expect(reachableControlLabels).toEqual([
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
    'Overlays render order'
  ]);

  await panel.getByRole('checkbox', { name: 'Networks layer' }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('body')).toHaveAttribute('data-scene-layer-networks-visible', 'false');

  await panel.getByRole('spinbutton', { name: 'Buildings render order' }).focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('7');
  await page.keyboard.press('Tab');
  await expect(page.locator('body')).toHaveAttribute('data-scene-layer-buildings-order', '7');
});
