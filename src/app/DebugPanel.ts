import type { RuntimePerformanceDiagnostics } from '../systems/performance/PerformanceMonitor';
import type { CityDiagnostics } from './cityDiagnostics';

export interface DebugPanelSource {
  readonly seed: string;
  readonly diagnostics: CityDiagnostics;
  readonly getPerformanceDiagnostics: () => RuntimePerformanceDiagnostics;
}

export class DebugPanel {
  readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly toggleButton: HTMLButtonElement;
  private intervalId: number | undefined;
  private collapsed = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly source: DebugPanelSource
  ) {
    this.root = document.createElement('aside');
    this.root.className = 'city-debug-panel';
    this.root.dataset.cityDebugPanel = 'true';
    this.root.setAttribute('aria-label', 'City diagnostics');

    const header = document.createElement('div');
    header.className = 'city-debug-panel__header';

    const title = document.createElement('div');
    title.className = 'city-debug-panel__title';
    title.textContent = 'Debug';

    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'city-debug-panel__toggle';
    this.toggleButton.type = 'button';
    this.toggleButton.title = 'Collapse diagnostics';
    this.toggleButton.setAttribute('aria-label', 'Collapse diagnostics');
    this.toggleButton.textContent = '-';
    this.toggleButton.addEventListener('click', () => this.setCollapsed(!this.collapsed));

    this.body = document.createElement('div');
    this.body.className = 'city-debug-panel__body';

    header.append(title, this.toggleButton);
    this.root.append(header, this.body);
    this.container.append(this.root);
    this.render();

    if (isDebugPanelHiddenByUrl()) {
      this.setHidden(true);
    } else {
      document.body.dataset.debugPanelState = 'expanded';
    }
  }

  start(): void {
    this.intervalId = window.setInterval(() => this.render(), 1000);
    this.render();
  }

  dispose(): void {
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.root.remove();
  }

  setCollapsed(collapsed: boolean): void {
    if (this.root.hidden) {
      return;
    }

    this.collapsed = collapsed;
    this.root.classList.toggle('is-collapsed', collapsed);
    this.body.hidden = collapsed;
    this.toggleButton.textContent = collapsed ? '+' : '-';
    this.toggleButton.title = collapsed ? 'Expand diagnostics' : 'Collapse diagnostics';
    this.toggleButton.setAttribute('aria-label', collapsed ? 'Expand diagnostics' : 'Collapse diagnostics');
    document.body.dataset.debugPanelState = collapsed ? 'collapsed' : 'expanded';
  }

  setHidden(hidden: boolean): void {
    this.root.hidden = hidden;
    document.body.dataset.debugPanelState = hidden ? 'hidden' : this.collapsed ? 'collapsed' : 'expanded';
  }

  private render(): void {
    if (this.root.hidden) {
      return;
    }

    const diagnostics = this.source.diagnostics;
    const performance = this.source.getPerformanceDiagnostics();
    const overlayNames = diagnostics.overlays.map((overlay) => overlay.id).join(', ');
    const lodTiers = diagnostics.lodPolicy.rules.map((rule) => rule.tier).join('/');
    const coordinatePrecision = diagnostics.geospatial.precision.coordinatePrecisionMeters;

    this.body.replaceChildren(
      createMetric('Seed', this.source.seed),
      createMetric(
        'Config',
        `${diagnostics.config.city.qualityPreset}, grid ${diagnostics.config.city.gridSize}, traffic ${diagnostics.config.city.density.trafficDensity}`
      ),
      createMetric(
        'Master Plan',
        `${diagnostics.masterPlan.centers.total} centers, ${diagnostics.masterPlan.protectedOpenSpaces.total} open spaces, ${diagnostics.masterPlan.growthBoundaries.total} boundaries`
      ),
      createMetric(
        'Districts',
        `${diagnostics.districtCharacter.districtRules} rules, ${diagnostics.districtCharacter.transitionBuffers} transitions`
      ),
      createMetric(
        'Constraints',
        `${diagnostics.constraintLayer.total} rules, ${diagnostics.constraintLayer.noBuildRules} no-build`
      ),
      createMetric(
        'Resilience',
        `${diagnostics.resilienceGoals.total} goals, ${diagnostics.resilienceGoals.shelterCandidates} shelters`
      ),
      createMetric(
        'Metrics',
        `${diagnostics.cityMetrics.total} metrics, ${diagnostics.cityMetrics.passing} pass, ${diagnostics.cityMetrics.warnings} warn`
      ),
      createMetric('Validation', getStatusLabel(diagnostics.validation.passed, diagnostics.validation.issues.length)),
      createMetric('Geo', `${diagnostics.geospatial.coordinateSystem}, ${coordinatePrecision}m`),
      createMetric(
        'Metadata',
        `${diagnostics.sourceMetadata.objectsWithMetadata}/${diagnostics.objectIndex.objectIds.length} tagged`
      ),
      createMetric(
        'Traffic',
        `${diagnostics.objectCounts.trafficVehicles} agents, ${diagnostics.objectCounts.laneMarkings} markings`
      ),
      createMetric(
        'City',
        `${diagnostics.objectCounts.buildings} buildings, ${diagnostics.objectCounts.activeFrontages} frontages`
      ),
      createMetric(
        'Assets',
        `${diagnostics.assetBindingDiagnostics.assetDefinitions} assets, ${diagnostics.assetBindingDiagnostics.renderBindings} bindings`
      ),
      createMetric(
        'Export',
        `${diagnostics.importExport.supportedFormatCount} formats, ${diagnostics.importExport.proceduralSeedExport.objectCount} objects`
      ),
      createMetric('Registry', `${diagnostics.objectRegistry.registeredKinds} kinds`),
      createMetric(
        'Groups',
        `${diagnostics.objectGroups.groupCount} groups, ${diagnostics.objectGroups.countsByKind['district']} districts`
      ),
      createMetric('Overlays', `${diagnostics.overlays.length}: ${overlayNames}`),
      createMetric(
        'LOD',
        `${diagnostics.lodPolicy.rules.length} tiers ${lodTiers}, ${diagnostics.lodCoverage.objectPolicyCount} policies`
      ),
      createMetric('Performance', `${performance.budget.status}, ${performance.renderer.drawCalls} draw calls`),
      createMetric('Frame', `${performance.frameTiming.status}, ${performance.frameTiming.estimatedFps} fps`)
    );
  }
}

function createMetric(label: string, value: string): HTMLElement {
  const item = document.createElement('div');
  item.className = 'city-debug-panel__metric';

  const labelElement = document.createElement('span');
  labelElement.className = 'city-debug-panel__label';
  labelElement.textContent = label;

  const valueElement = document.createElement('span');
  valueElement.className = 'city-debug-panel__value';
  valueElement.textContent = value;

  item.append(labelElement, valueElement);
  return item;
}

function getStatusLabel(passed: boolean, issueCount: number): string {
  return `${passed ? 'pass' : 'fail'}, ${issueCount} issues`;
}

function isDebugPanelHiddenByUrl(): boolean {
  return new URLSearchParams(window.location.search).get('debugPanel') === 'hidden';
}
