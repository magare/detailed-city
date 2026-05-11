import type * as THREE from 'three';
import type { PerformanceBudget } from '../../city/data-contracts/cityContracts';
import type { Updatable } from '../../types/city';

export type PerformanceBudgetStatus = 'pass' | 'warn';
export type PerformanceCheckStatus = PerformanceBudgetStatus | 'pending';

export interface FrameTimingDiagnostics {
  readonly framesObserved: number;
  readonly lastFrameMs: number;
  readonly averageFrameMs: number;
  readonly maxFrameMs: number;
  readonly estimatedFps: number;
  readonly targetFrameMs: number;
  readonly minimumFrameMs: number;
  readonly status: PerformanceCheckStatus;
}

export interface RendererPerformanceDiagnostics {
  readonly drawCalls: number;
  readonly triangles: number;
  readonly points: number;
  readonly lines: number;
  readonly geometries: number;
  readonly textures: number;
}

export interface PerformanceBudgetCheck {
  readonly id: 'visible-draw-calls' | 'visible-triangles' | 'dynamic-agents';
  readonly label: string;
  readonly value: number;
  readonly budget: number;
  readonly unit: 'count';
  readonly status: PerformanceBudgetStatus;
}

export interface PerformanceBudgetDiagnostics {
  readonly status: PerformanceBudgetStatus;
  readonly checks: readonly PerformanceBudgetCheck[];
}

export interface PerformanceAgentDiagnostics {
  readonly active: number;
  readonly budget: number;
  readonly status: PerformanceBudgetStatus;
}

export interface RuntimePerformanceDiagnostics {
  readonly ownerDomain: 'systems';
  readonly frameTiming: FrameTimingDiagnostics;
  readonly renderer: RendererPerformanceDiagnostics;
  readonly agents: PerformanceAgentDiagnostics;
  readonly budget: PerformanceBudgetDiagnostics;
}

export interface StaticPerformanceDiagnostics {
  readonly ownerDomain: 'systems';
  readonly agents: PerformanceAgentDiagnostics;
  readonly budget: PerformanceBudgetDiagnostics;
}

export class PerformanceMonitor implements Updatable {
  private framesObserved = 0;
  private lastFrameMs = 0;
  private averageFrameMs = 0;
  private maxFrameMs = 0;

  update(deltaSeconds: number): void {
    const frameMs = deltaSeconds * 1000;

    this.framesObserved += 1;
    this.lastFrameMs = roundMetric(frameMs);
    this.averageFrameMs = roundMetric(
      this.averageFrameMs + (frameMs - this.averageFrameMs) / this.framesObserved
    );
    this.maxFrameMs = roundMetric(Math.max(this.maxFrameMs, frameMs));
  }

  snapshot(
    renderer: THREE.WebGLRenderer,
    budget: PerformanceBudget,
    activeAgents: number
  ): RuntimePerformanceDiagnostics {
    const rendererSnapshot = createRendererPerformanceDiagnostics(renderer);

    return createRuntimePerformanceDiagnostics({
      frameTiming: this.createFrameTimingDiagnostics(budget),
      renderer: rendererSnapshot,
      budget,
      activeAgents
    });
  }

  private createFrameTimingDiagnostics(budget: PerformanceBudget): FrameTimingDiagnostics {
    const targetFrameMs = roundMetric(1000 / budget.targetFps);
    const minimumFrameMs = roundMetric(1000 / budget.minimumFps);
    const estimatedFps =
      this.averageFrameMs > 0 ? roundMetric(1000 / this.averageFrameMs) : 0;

    return {
      framesObserved: this.framesObserved,
      lastFrameMs: this.lastFrameMs,
      averageFrameMs: this.averageFrameMs,
      maxFrameMs: this.maxFrameMs,
      estimatedFps,
      targetFrameMs,
      minimumFrameMs,
      status:
        this.framesObserved === 0 ? 'pending' : this.averageFrameMs <= minimumFrameMs ? 'pass' : 'warn'
    };
  }
}

export function createStaticPerformanceDiagnostics(
  budget: PerformanceBudget,
  activeAgents: number
): StaticPerformanceDiagnostics {
  const renderer = createRendererPerformanceDiagnostics();
  const budgetDiagnostics = createPerformanceBudgetDiagnostics(renderer, budget, activeAgents, ['dynamic-agents']);

  return {
    ownerDomain: 'systems',
    agents: {
      active: activeAgents,
      budget: budget.dynamicAgents,
      status: activeAgents <= budget.dynamicAgents ? 'pass' : 'warn'
    },
    budget: budgetDiagnostics
  };
}

export function createRuntimePerformanceDiagnostics(input: {
  readonly frameTiming: FrameTimingDiagnostics;
  readonly renderer: RendererPerformanceDiagnostics;
  readonly budget: PerformanceBudget;
  readonly activeAgents: number;
}): RuntimePerformanceDiagnostics {
  const budgetDiagnostics = createPerformanceBudgetDiagnostics(input.renderer, input.budget, input.activeAgents);

  return {
    ownerDomain: 'systems',
    frameTiming: input.frameTiming,
    renderer: input.renderer,
    agents: {
      active: input.activeAgents,
      budget: input.budget.dynamicAgents,
      status: input.activeAgents <= input.budget.dynamicAgents ? 'pass' : 'warn'
    },
    budget: budgetDiagnostics
  };
}

export function createRendererPerformanceDiagnostics(
  renderer?: THREE.WebGLRenderer
): RendererPerformanceDiagnostics {
  return {
    drawCalls: renderer?.info.render.calls ?? 0,
    triangles: renderer?.info.render.triangles ?? 0,
    points: renderer?.info.render.points ?? 0,
    lines: renderer?.info.render.lines ?? 0,
    geometries: renderer?.info.memory.geometries ?? 0,
    textures: renderer?.info.memory.textures ?? 0
  };
}

function createPerformanceBudgetDiagnostics(
  renderer: RendererPerformanceDiagnostics,
  budget: PerformanceBudget,
  activeAgents: number,
  includedChecks: readonly PerformanceBudgetCheck['id'][] = [
    'visible-draw-calls',
    'visible-triangles',
    'dynamic-agents'
  ]
): PerformanceBudgetDiagnostics {
  const checks = [
    createBudgetCheck('visible-draw-calls', 'Visible draw calls', renderer.drawCalls, budget.visibleDrawCalls),
    createBudgetCheck('visible-triangles', 'Visible triangles', renderer.triangles, budget.visibleTriangles),
    createBudgetCheck('dynamic-agents', 'Dynamic agents', activeAgents, budget.dynamicAgents)
  ].filter((check) => includedChecks.includes(check.id));

  return {
    status: checks.every((check) => check.status === 'pass') ? 'pass' : 'warn',
    checks
  };
}

function createBudgetCheck(
  id: PerformanceBudgetCheck['id'],
  label: string,
  value: number,
  budget: number
): PerformanceBudgetCheck {
  return {
    id,
    label,
    value,
    budget,
    unit: 'count',
    status: value <= budget ? 'pass' : 'warn'
  };
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}
