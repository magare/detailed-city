import { expect, test } from '@playwright/test';
import { DEFAULT_PERFORMANCE_BUDGET } from '../../src/city/data-contracts/cityContracts';
import {
  createRuntimePerformanceDiagnostics,
  createStaticPerformanceDiagnostics,
  type FrameTimingDiagnostics,
  type RendererPerformanceDiagnostics
} from '../../src/systems/performance/PerformanceMonitor';

const passingFrameTiming: FrameTimingDiagnostics = {
  framesObserved: 12,
  lastFrameMs: 16.67,
  averageFrameMs: 16.67,
  maxFrameMs: 18,
  estimatedFps: 60,
  targetFrameMs: 16.67,
  minimumFrameMs: 33.33,
  status: 'pass'
};

const rendererUnderBudget: RendererPerformanceDiagnostics = {
  drawCalls: 18,
  triangles: 24000,
  points: 0,
  lines: 0,
  geometries: 12,
  textures: 0
};

test('performance diagnostics report pass and warn budget states', () => {
  const staticDiagnostics = createStaticPerformanceDiagnostics(DEFAULT_PERFORMANCE_BUDGET, 7);
  const passingRuntime = createRuntimePerformanceDiagnostics({
    frameTiming: passingFrameTiming,
    renderer: rendererUnderBudget,
    budget: DEFAULT_PERFORMANCE_BUDGET,
    activeAgents: 7
  });
  const warningRuntime = createRuntimePerformanceDiagnostics({
    frameTiming: passingFrameTiming,
    renderer: {
      ...rendererUnderBudget,
      drawCalls: DEFAULT_PERFORMANCE_BUDGET.visibleDrawCalls + 1
    },
    budget: DEFAULT_PERFORMANCE_BUDGET,
    activeAgents: 7
  });

  expect(staticDiagnostics.budget.status).toBe('pass');
  expect(staticDiagnostics.agents).toEqual({
    active: 7,
    budget: DEFAULT_PERFORMANCE_BUDGET.dynamicAgents,
    status: 'pass'
  });
  expect(passingRuntime.budget.status).toBe('pass');
  expect(passingRuntime.budget.checks.map((check) => check.id)).toEqual([
    'visible-draw-calls',
    'visible-triangles',
    'dynamic-agents'
  ]);
  expect(warningRuntime.budget.status).toBe('warn');
  expect(warningRuntime.budget.checks.find((check) => check.id === 'visible-draw-calls')?.status).toBe('warn');
});

test('browser performance diagnostics expose renderer metrics under budget', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const handle = await page.waitForFunction(() => {
    const diagnostics = window.cityApp?.getPerformanceDiagnostics();

    if (
      diagnostics &&
      diagnostics.frameTiming.framesObserved >= 2 &&
      diagnostics.renderer.drawCalls > 0 &&
      diagnostics.renderer.triangles > 0
    ) {
      return diagnostics;
    }

    return undefined;
  });
  const diagnostics = (await handle.jsonValue()) as {
    readonly frameTiming: { readonly averageFrameMs: number };
    readonly renderer: { readonly drawCalls: number; readonly triangles: number };
  };

  expect(diagnostics).toMatchObject({
    ownerDomain: 'systems',
    agents: {
      active: 7,
      budget: DEFAULT_PERFORMANCE_BUDGET.dynamicAgents,
      status: 'pass'
    },
    budget: {
      status: 'pass'
    }
  });
  expect(diagnostics.frameTiming.averageFrameMs).toBeGreaterThan(0);
  expect(diagnostics.renderer.drawCalls).toBeGreaterThan(0);
  expect(diagnostics.renderer.drawCalls).toBeLessThanOrEqual(DEFAULT_PERFORMANCE_BUDGET.visibleDrawCalls);
  expect(diagnostics.renderer.triangles).toBeGreaterThan(0);
  expect(diagnostics.renderer.triangles).toBeLessThanOrEqual(DEFAULT_PERFORMANCE_BUDGET.visibleTriangles);
});
