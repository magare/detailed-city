import { expect, test } from '@playwright/test';

test('debug panel exposes current city diagnostics and can collapse', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const panel = page.locator('[data-city-debug-panel="true"]');
  const panelBody = panel.locator('.city-debug-panel__body');
  const toggleButton = panel.getByRole('button', { name: 'Collapse diagnostics' });

  await expect(panel).toBeVisible();
  const panelText = await panel.textContent();

  expect(panelText).toContain('Debug');
  expect(panelText).toContain('Seed');
  expect(panelText).toContain('detailed-city-v1');
  expect(panelText).toContain('Config');
  expect(panelText).toContain('medium, grid 12, traffic 0.42');
  expect(panelText).toContain('Validation');
  expect(panelText).toContain('pass, 0 issues');
  expect(panelText).toContain('Geo');
  expect(panelText).toContain('local-xz, 0.01m');
  expect(panelText).toContain('Metadata');
  expect(panelText).toContain('4751/4751 tagged');
  expect(panelText).toContain('Traffic');
  expect(panelText).toContain('7 agents, 932 markings');
  expect(panelText).toContain('City');
  expect(panelText).toContain('566 buildings, 42 frontages');
  expect(panelText).toContain('Assets');
  expect(panelText).toContain('30 assets, 30 bindings');
  expect(panelText).toContain('Export');
  expect(panelText).toContain('6 formats, 3812 objects');
  expect(panelText).toContain('Registry');
  expect(panelText).toContain('27 kinds');
  expect(panelText).toContain('Overlays');
  expect(panelText).toContain('5: districts, parcels, roads, validation-issues, owner-domains');
  expect(panelText).toContain('LOD');
  expect(panelText).toContain('5 tiers lod0/lod1/lod2/lod3/lod4');
  expect(panelText).toContain('27 policies');
  expect(panelText).toContain('Performance');
  expect(panelText).toContain('Frame');
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'expanded');

  const layout = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth
    };
  });

  expect(layout.x).toBeGreaterThanOrEqual(0);
  expect(layout.y).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight);
  const expectedMaxWidth = layout.viewportWidth <= 640 ? layout.viewportWidth - 16 : Math.min(320, layout.viewportWidth);
  expect(layout.width).toBeLessThanOrEqual(expectedMaxWidth);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);

  await toggleButton.click();
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'collapsed');
  await expect(panelBody).toBeHidden();

  const expandButton = panel.getByRole('button', { name: 'Expand diagnostics' });
  await expandButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'expanded');
  await expect(panelBody).toBeVisible();
});

test('debug panel can be hidden for clean browser checks', async ({ page }) => {
  await page.goto('/?debugPanel=hidden');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const panel = page.locator('[data-city-debug-panel="true"]');

  await expect(panel).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'hidden');
  await expect(page.locator('canvas')).toBeVisible();
});
