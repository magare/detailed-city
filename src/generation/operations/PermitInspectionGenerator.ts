import type {
  CadastreRecordContract,
  CityId,
  MaintenanceOperationContract,
  PermitComplianceCode,
  PermitInspectionRecordContract,
  PermitInspectionRecordKind,
  PermitInspectionStatus
} from '../../city/data-contracts/cityContracts';

export interface PermitInspectionGeneratorInput {
  readonly cadastreRecords: readonly CadastreRecordContract[];
  readonly maintenanceOperations: readonly MaintenanceOperationContract[];
}

const DEVELOPMENT_PERMIT_LIMIT = 32;
const CODE_CHECK_LIMIT = 16;
const INSPECTION_LIMIT = 12;
const COMPLIANCE_REVIEW_LIMIT = 10;

export class PermitInspectionGenerator {
  create(input: PermitInspectionGeneratorInput): PermitInspectionRecordContract[] {
    const permitCadastreRecords = input.cadastreRecords
      .filter((record) => record.developmentRightStatus !== 'constrained')
      .sort(compareCadastreRecords)
      .slice(0, DEVELOPMENT_PERMIT_LIMIT);
    const codeCheckRecords = permitCadastreRecords.slice(0, CODE_CHECK_LIMIT);
    const inspectionRecords = permitCadastreRecords.slice(0, INSPECTION_LIMIT);
    const complianceReviewRecords = input.cadastreRecords
      .filter((record) => record.developmentRightStatus === 'constrained')
      .sort(compareCadastreRecords)
      .slice(0, COMPLIANCE_REVIEW_LIMIT);
    const closureOperations = input.maintenanceOperations
      .filter((operation) => operation.createsTemporaryClosure)
      .sort((first, second) => first.id.localeCompare(second.id));

    return [
      ...permitCadastreRecords.map((record, index) =>
        createCadastreRecord({
          record,
          recordKind: 'development-permit',
          status: 'approved',
          code: 'zoning',
          sequence: index,
          approvalRequired: true,
          inspectionRequired: true
        })
      ),
      ...permitCadastreRecords.map((record, index) =>
        createCadastreRecord({
          record,
          recordKind: 'approval',
          status: 'closed',
          code: 'operations',
          sequence: index,
          approvalRequired: true,
          inspectionRequired: false
        })
      ),
      ...codeCheckRecords.map((record, index) =>
        createCadastreRecord({
          record,
          recordKind: 'code-check',
          status: 'closed',
          code: 'zoning',
          sequence: index,
          approvalRequired: false,
          inspectionRequired: false
        })
      ),
      ...inspectionRecords.map((record, index) =>
        createCadastreRecord({
          record,
          recordKind: 'inspection',
          status: 'closed',
          code: 'accessibility',
          sequence: index,
          approvalRequired: false,
          inspectionRequired: true
        })
      ),
      ...complianceReviewRecords.map((record, index) =>
        createCadastreRecord({
          record,
          recordKind: 'compliance-review',
          status: 'under-review',
          code: 'fire-safety',
          sequence: index,
          approvalRequired: true,
          inspectionRequired: true,
          passed: false,
          outstandingIssueCount: 1 + (stableHash(record.id) % 3)
        })
      ),
      ...closureOperations.map((operation, index) => createClosurePermit(operation, index))
    ].sort((first, second) => first.id.localeCompare(second.id));
  }
}

interface CreateCadastreRecordInput {
  readonly record: CadastreRecordContract;
  readonly recordKind: PermitInspectionRecordKind;
  readonly status: PermitInspectionStatus;
  readonly code: PermitComplianceCode;
  readonly sequence: number;
  readonly approvalRequired: boolean;
  readonly inspectionRequired: boolean;
  readonly passed?: boolean;
  readonly outstandingIssueCount?: number;
}

function createCadastreRecord(input: CreateCadastreRecordInput): PermitInspectionRecordContract {
  const submittedDay = 21 + (stableHash(`${input.recordKind}:${input.record.id}`) % 120);
  const passed = input.passed ?? true;
  const outstandingIssueCount = input.outstandingIssueCount ?? 0;

  return {
    id: `permit-inspection-${input.recordKind}-${input.record.id}`,
    kind: 'permit-inspection-record',
    ownerDomain: 'operations',
    parentId: input.record.id,
    lod: 'lod1',
    tags: {
      recordKind: input.recordKind,
      status: input.status,
      complianceCode: input.code,
      parcelId: input.record.parcelId
    },
    recordKind: input.recordKind,
    status: input.status,
    applicantEntityId: input.record.ownerEntityId,
    responsibleDepartmentId: getResponsibleDepartment(input.recordKind, input.code),
    cadastreRecordId: input.record.id,
    parcelId: input.record.parcelId,
    relatedObjectIds: [input.record.parcelId, input.record.blockId, input.record.districtId],
    closureRoadIds: [],
    temporaryRestrictionIds: [],
    submittedDay,
    validFromDay: submittedDay + 3,
    validToDay: submittedDay + getValidityDays(input.recordKind),
    approval: {
      required: input.approvalRequired,
      approvedByDepartmentId: input.approvalRequired && passed ? getResponsibleDepartment(input.recordKind, input.code) : undefined,
      approvalDay: input.approvalRequired && passed ? submittedDay + 2 : undefined
    },
    inspection: {
      required: input.inspectionRequired,
      scheduledDay: input.inspectionRequired ? submittedDay + 5 + input.sequence : undefined,
      inspectorDepartmentId: input.inspectionRequired ? 'department:city-inspections' : undefined,
      passed: input.inspectionRequired ? passed : undefined
    },
    compliance: {
      code: input.code,
      passed,
      outstandingIssueCount
    }
  };
}

function createClosurePermit(operation: MaintenanceOperationContract, sequence: number): PermitInspectionRecordContract {
  const submittedDay = Math.max(0, operation.scheduledWindow.startDay - 7);

  return {
    id: `permit-inspection-temporary-closure-permit-${operation.id}`,
    kind: 'permit-inspection-record',
    ownerDomain: 'operations',
    parentId: operation.id,
    lod: 'lod1',
    tags: {
      recordKind: 'temporary-closure-permit',
      status: 'active',
      complianceCode: 'traffic-control',
      maintenanceOperationId: operation.id
    },
    recordKind: 'temporary-closure-permit',
    status: 'active',
    applicantEntityId: operation.responsibleDepartmentId,
    responsibleDepartmentId: 'department:transportation-permits',
    maintenanceOperationId: operation.id,
    relatedObjectIds: [operation.assetObjectId, ...operation.serviceAccessObjectIds],
    closureRoadIds: operation.closureRoadIds,
    temporaryRestrictionIds: operation.temporaryRestrictionIds,
    submittedDay,
    validFromDay: operation.scheduledWindow.startDay,
    validToDay: operation.scheduledWindow.endDay,
    approval: {
      required: true,
      approvedByDepartmentId: 'department:transportation-permits',
      approvalDay: Math.max(0, submittedDay + 2)
    },
    inspection: {
      required: true,
      scheduledDay: operation.scheduledWindow.startDay + sequence,
      inspectorDepartmentId: 'department:right-of-way-inspections',
      passed: true
    },
    compliance: {
      code: 'traffic-control',
      passed: true,
      outstandingIssueCount: 0
    }
  };
}

function getResponsibleDepartment(kind: PermitInspectionRecordKind, code: PermitComplianceCode): CityId {
  if (kind === 'development-permit' || kind === 'approval') {
    return 'department:planning-permits';
  }
  if (code === 'traffic-control') {
    return 'department:transportation-permits';
  }
  if (code === 'fire-safety') {
    return 'department:fire-code-review';
  }
  return 'department:city-inspections';
}

function getValidityDays(kind: PermitInspectionRecordKind): number {
  switch (kind) {
    case 'development-permit':
      return 365;
    case 'temporary-closure-permit':
      return 14;
    case 'code-check':
    case 'approval':
    case 'inspection':
    case 'compliance-review':
      return 45;
  }
}

function compareCadastreRecords(first: CadastreRecordContract, second: CadastreRecordContract): number {
  if (first.developmentRightStatus !== second.developmentRightStatus) {
    return developmentStatusRank(second.developmentRightStatus) - developmentStatusRank(first.developmentRightStatus);
  }
  if (first.assessedLandValue !== second.assessedLandValue) {
    return second.assessedLandValue - first.assessedLandValue;
  }
  return first.id.localeCompare(second.id);
}

function developmentStatusRank(status: CadastreRecordContract['developmentRightStatus']): number {
  return status === 'as-of-right' ? 3 : status === 'limited' ? 2 : 1;
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003;
  }
  return hash;
}
