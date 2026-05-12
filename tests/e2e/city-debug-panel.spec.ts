import { expect, test } from '@playwright/test';

test('debug panel exposes current city diagnostics and can collapse', async ({ page }) => {
  test.setTimeout(70_000);

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
  expect(panelText).toContain('Master Plan');
  expect(panelText).toContain('4 centers, 3 open spaces, 3 boundaries');
  expect(panelText).toContain('Districts');
  expect(panelText).toContain('5 rules, 14 transitions');
  expect(panelText).toContain('Boundaries');
  expect(panelText).toContain('18 admin, 4 wards, 5 neighborhoods');
  expect(panelText).toContain('Blocks');
  expect(panelText).toContain('Constraints');
  expect(panelText).toContain('11 rules, 3 no-build');
  expect(panelText).toContain('Hazards');
  expect(panelText).toContain('6 zones, 1 critical, 2 no-build');
  expect(panelText).toContain('Soils');
  expect(panelText).toContain('5 zones, 2 high-risk, 2 drainage');
  expect(panelText).toContain('Resilience');
  expect(panelText).toContain('7 goals, 3 shelters');
  expect(panelText).toContain('Metrics');
  expect(panelText).toContain('8 metrics, 6 pass, 2 warn');
  expect(panelText).toContain('Validation');
  expect(panelText).toContain('pass, 0 issues');
  expect(panelText).toContain('Geo');
  expect(panelText).toContain('local-xz, 0.01m');
  expect(panelText).toContain('Metadata');
  expect(panelText).toContain('4903/4903 tagged');
  expect(panelText).toContain('Traffic');
  expect(panelText).toContain('7 agents, 950 markings');
  expect(panelText).toContain('City');
  expect(panelText).toContain('Calming');
  expect(panelText).toContain('12 devices, 2 curb, 15kph min');
  expect(panelText).toContain('583 buildings, 44 frontages');
  expect(panelText).toContain('Assets');
  expect(panelText).toContain('32 assets, 32 bindings');
  expect(panelText).toContain('Export');
  expect(panelText).toContain('6 formats, 3946 objects');
  expect(panelText).toContain('Registry');
  expect(panelText).toContain('37 kinds');
  expect(panelText).toContain('Groups');
  expect(panelText).toContain('32 groups, 5 districts');
  expect(panelText).toContain('Overlays');
  expect(panelText).toContain(
    '15: administrative-boundaries, districts, zoning, waterways, waterfront, hazards, topography, soil-geology, city-metrics, constraints, resilience-goals, parcels, roads, validation-issues, owner-domains'
  );
  expect(panelText).toContain('LOD');
  expect(panelText).toContain('5 tiers lod0/lod1/lod2/lod3/lod4');
  expect(panelText).toContain('37 policies');
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
  await expect(expandButton).toBeVisible();
  await expandButton.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'expanded');
  await expect(panelBody).toBeVisible();
});

test('debug panel can be hidden for clean browser checks', async ({ page }) => {
  test.setTimeout(45_000);

  await page.goto('/?debugPanel=hidden');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const panel = page.locator('[data-city-debug-panel="true"]');

  await expect(panel).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'hidden');
  await expect(page.locator('canvas')).toBeVisible();
});
