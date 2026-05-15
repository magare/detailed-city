import { expect, test, type Page } from '@playwright/test';

const VISUAL_PRESET_IDS = ['overview', 'detailed-street'] as const;

for (const presetId of VISUAL_PRESET_IDS) {
  test(`visual baseline for ${presetId} camera preset`, async ({ page }) => {
    test.setTimeout(90_000);

    await openStableVisualFixture(page, presetId);

    await expect(page.locator('canvas')).toHaveScreenshot(`city-${presetId}-canvas.png`, {
      maxDiffPixelRatio: 0.04,
      threshold: 0.25
    });
  });
}

async function openStableVisualFixture(page: Page, presetId: (typeof VISUAL_PRESET_IDS)[number]): Promise<void> {
  await page.goto('/?testMode=fast&debugPanel=hidden');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');
  await page.waitForSelector('canvas', { state: 'visible' });

  const applied = await page.evaluate((targetPresetId) => {
    const app = window.cityApp as unknown as {
      applyVisualQaCameraPreset: (presetId: string) => boolean;
      getVisualQaCameraPresets: () => readonly { id: string }[];
      renderVisualQaFrame: () => void;
      setSceneLayerVisible: (layerId: string, visible: boolean) => void;
    };

    const presetIds = app.getVisualQaCameraPresets().map((preset) => preset.id);

    if (!presetIds.includes(targetPresetId)) {
      return false;
    }

    app.setSceneLayerVisible('agents', false);
    const appliedPreset = app.applyVisualQaCameraPreset(targetPresetId);
    app.renderVisualQaFrame();
    return appliedPreset;
  }, presetId);

  expect(applied).toBe(true);
}
