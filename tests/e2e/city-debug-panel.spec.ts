import { expect, test } from '@playwright/test';

test('debug panel exposes current city diagnostics and can collapse', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('/?testMode=fast');
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
  expect(panelText).toContain('Utilities');
  expect(panelText).toContain('45 nodes, 38 edges, 8 networks');
  expect(panelText).toContain('Power');
  expect(panelText).toContain('8 nodes, 3 transformers, 12 lights');
  expect(panelText).toContain('Water Supply');
  expect(panelText).toContain('7 nodes, 2 hydrants, 583 buildings');
  expect(panelText).toContain('Wastewater');
  expect(panelText).toContain('6 nodes, 2 manholes, 583 buildings');
  expect(panelText).toContain('Stormwater');
  expect(panelText).toContain('8 nodes, 2 inlets, 26 roads');
  expect(panelText).toContain('Telecom');
  expect(panelText).toContain('7 nodes, 2 antennas, 583 buildings');
  expect(panelText).toContain('Thermal');
  expect(panelText).toContain('8 nodes, 1 exchangers, 583 buildings');
  expect(panelText).toContain('Constraints');
  expect(panelText).toContain('11 rules, 3 no-build');
  expect(panelText).toContain('Hazards');
  expect(panelText).toContain('6 zones, 1 critical, 2 no-build');
  expect(panelText).toContain('Soils');
  expect(panelText).toContain('5 zones, 2 high-risk, 2 drainage');
  expect(panelText).toContain('Resilience');
  expect(panelText).toContain('7 goals, 3 shelters');
  expect(panelText).toContain('Phasing');
  expect(panelText).toContain('3 phases, 1 active, 3 closures');
  expect(panelText).toContain('Metrics');
  expect(panelText).toContain('8 metrics, 6 pass, 2 warn');
  expect(panelText).toContain('Weather');
  expect(panelText).toContain('clear, 5 presets, 3 rain');
  expect(panelText).toContain('Solar');
  expect(panelText).toContain('24 samples, 12 roofs, 3 glare');
  expect(panelText).toContain('Heat');
  expect(panelText).toContain('17 zones, 2 high, 2 routes');
  expect(panelText).toContain('Validation');
  expect(panelText).toContain('pass, 0 issues');
  expect(panelText).toContain('Geo');
  expect(panelText).toContain('local-xz, 0.01m');
  expect(panelText).toContain('Metadata');
  expect(panelText).toContain('11273/11273 tagged');
  expect(panelText).toContain('Traffic');
  expect(panelText).toContain('7 agents, 950 markings');
  expect(panelText).toContain('City');
  expect(panelText).toContain('Calming');
  expect(panelText).toContain('12 devices, 2 curb, 15kph min');
  expect(panelText).toContain('Parks');
  expect(panelText).toContain('24 features, 6 paths, 3 connected');
  expect(panelText).toContain('Plaza');
  expect(panelText).toContain('6 zones, 255 event cap, 1 active edge');
  expect(panelText).toContain('Promenade');
  expect(panelText).toContain('8 spaces, 154 seats, 3 water access');
  expect(panelText).toContain('Planting');
  expect(panelText).toContain('145 trees, 27 corridors, 3116m2 canopy');
  expect(panelText).toContain('Furniture');
  expect(panelText).toContain('208 citywide, 6 railings, 19 shelters');
  expect(panelText).toContain('Transit');
  expect(panelText).toContain('9 routes, 19 stops, 1762 demand');
  expect(panelText).toContain('583 buildings, 44 frontages');
  expect(panelText).toContain('Civic');
  expect(panelText).toContain('6 anchors, 6 services, 3 emergency');
  expect(panelText).toContain('Community');
  expect(panelText).toContain('8 anchors, 1700 visits, 5 crowd');
  expect(panelText).toContain('Culture');
  expect(panelText).toContain('6 anchors, 1680 footfall, 4 evening');
  expect(panelText).toContain('Government');
  expect(panelText).toContain('5 anchors, 29 counters, 5 plaza links');
  expect(panelText).toContain('Assets');
  expect(panelText).toContain('47 assets, 47 bindings');
  expect(panelText).toContain('Export');
  expect(panelText).toContain('6 formats, 10316 objects');
  expect(panelText).toContain('Registry');
  expect(panelText).toContain('62 kinds');
  expect(panelText).toContain('Groups');
  expect(panelText).toContain('32 groups, 5 districts');
  expect(panelText).toContain('Overlays');
  expect(panelText).toContain(
    '28: administrative-boundaries, districts, zoning, waterways, waterfront, hazards, topography, soil-geology, phasing, weather-presets, solar-shading, urban-heat, city-metrics, cycling-network, navigation-graphs, freight-logistics, civic-anchors, community-anchors, culture-anchors, government-anchors, constraints, resilience-goals, thermal-service, thermal-outages, parcels, roads, validation-issues, owner-domains'
  );
  expect(panelText).toContain('LOD');
  expect(panelText).toContain('5 tiers lod0/lod1/lod2/lod3/lod4');
  expect(panelText).toContain('62 policies');
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

  await page.goto('/?testMode=fast&debugPanel=hidden');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const panel = page.locator('[data-city-debug-panel="true"]');

  await expect(panel).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-debug-panel-state', 'hidden');
  await expect(page.locator('canvas')).toBeVisible();
});
