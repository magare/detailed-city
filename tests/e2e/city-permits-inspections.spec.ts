import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { GeneratedCity } from '../../src/types/city';

test('permit and inspection records are deterministic and cover development and temporary closure workflows', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));
  const closureOperationIds = new Set(
    firstCity.maintenanceOperations.filter((operation) => operation.createsTemporaryClosure).map((operation) => operation.id)
  );
  const closurePermitOperationIds = new Set(
    firstCity.permitInspectionRecords
      .filter((record) => record.recordKind === 'temporary-closure-permit')
      .map((record) => record.maintenanceOperationId)
  );

  expect(firstCity.permitInspectionRecords.map(getPermitInspectionSignature)).toEqual(
    secondCity.permitInspectionRecords.map(getPermitInspectionSignature)
  );
  expect(firstCity.validation.passed).toBe(true);
  expect(firstCity.permitInspectionRecords).toHaveLength(114);
  expect(diagnostics.permitsInspections).toMatchObject({
    total: 114,
    developmentPermits: 32,
    temporaryClosurePermits: 12,
    codeChecks: 16,
    approvals: 32,
    inspections: 12,
    complianceReviews: 10,
    approvedRecords: 32,
    activeRecords: 12,
    closureRoads: 7
  });
  expect(diagnostics.permitsInspections.openComplianceIssues).toBe(22);
  expect([...closureOperationIds].every((id) => closurePermitOperationIds.has(id))).toBe(true);
  expect(firstCity.permitInspectionRecords.every((record) => record.ownerDomain === 'operations')).toBe(true);
  expect(overlays.find((overlay) => overlay.id === 'permits-inspections')?.featureCount).toBe(114);
});

test('permit and inspection validation catches missing approvals, references, and closure permits', () => {
  const city = new CityGenerator(cityConfig).generate();
  const closurePermit = city.permitInspectionRecords.find((record) => record.recordKind === 'temporary-closure-permit');

  expect(closurePermit).toBeDefined();

  const invalidPermit = {
    ...closurePermit!,
    maintenanceOperationId: 'missing-maintenance-operation',
    validToDay: closurePermit!.validFromDay - 1,
    approval: {
      ...closurePermit!.approval,
      approvedByDepartmentId: undefined,
      approvalDay: undefined
    },
    compliance: {
      ...closurePermit!.compliance,
      passed: true,
      outstandingIssueCount: 1
    },
    closureRoadIds: ['missing-road'],
    relatedObjectIds: ['missing-related-object']
  };
  const invalidCity = {
    ...city,
    permitInspectionRecords: [
      invalidPermit,
      ...city.permitInspectionRecords.filter((record) => record.id !== closurePermit!.id)
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `missing-temporary-closure-permit-${closurePermit!.maintenanceOperationId}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `permit-inspection-missing-maintenance-operation-${closurePermit!.id}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `permit-inspection-invalid-validity-window-${closurePermit!.id}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `permit-inspection-missing-approval-${closurePermit!.id}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `permit-inspection-invalid-compliance-${closurePermit!.id}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `permit-inspection-missing-closure-road-missing-road-${closurePermit!.id}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `permit-inspection-missing-related-object-missing-related-object-${closurePermit!.id}`,
        category: 'operations'
      })
    ])
  );
});

test('permit and inspection diagnostics and overlays are inspectable in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    permits: window.cityDiagnostics?.permitsInspections,
    permitObjects: window.cityDiagnostics?.objectCounts.permitInspectionRecords,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'permits-inspections')?.featureCount,
    panelText: document.body.innerText
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.permits?.total).toBe(114);
  expect(diagnostics.permits?.developmentPermits).toBe(32);
  expect(diagnostics.permits?.temporaryClosurePermits).toBe(12);
  expect(diagnostics.permitObjects).toBe(114);
  expect(diagnostics.overlayFeatures).toBe(114);
  expect(diagnostics.panelText).toContain('Permits');
  expect(diagnostics.panelText).toContain('114 records');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getPermitInspectionSignature(record: GeneratedCity['permitInspectionRecords'][number]): readonly unknown[] {
  return [
    record.id,
    record.recordKind,
    record.status,
    record.applicantEntityId,
    record.responsibleDepartmentId,
    record.cadastreRecordId,
    record.parcelId,
    record.maintenanceOperationId,
    record.submittedDay,
    record.validFromDay,
    record.validToDay,
    record.approval.required,
    record.approval.approvedByDepartmentId,
    record.inspection.required,
    record.inspection.inspectorDepartmentId,
    record.compliance.code,
    record.compliance.passed,
    record.compliance.outstandingIssueCount,
    record.relatedObjectIds.join(','),
    record.closureRoadIds.join(',')
  ];
}
