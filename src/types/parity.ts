export type ParityRating = 'Full' | 'Partial' | 'Custom';

export interface ParityMappingRow {
  id: string;
  capability: string;
  awsControlTower: string;
  azureLandingZone: string;
  gcpFoundation: string;
  awsRating: ParityRating;
  azureRating: ParityRating;
  gcpRating: ParityRating;
  parityNote: string;
}

export interface C4LevelSpec {
  level: 'L1' | 'L2' | 'L3';
  title: string;
  summary: string;
  mermaid: string;
}

export interface RejectedAlternative {
  alternative: string;
  whyRejected: string;
}

export interface ArchitectureDecisionRecord {
  id: string;
  code: string;
  title: string;
  status: 'Accepted' | 'Superseded';
  context: string;
  decision: string;
  rejectedAlternatives: RejectedAlternative[];
  consequences: string[];
}

export interface CostModelConfig {
  awsMonthlyBaselineUsd: number;
  azureMonthlyBaselineUsd: number;
  gcpMonthlyBaselineUsd: number;
  costPerTenantUnitUsd: number;
  costPerLogGbUsd: number;
  tenantUnits: number;
  dailyAuditLogGb: number;
}

export interface ThreatModelEntry {
  id: string;
  trustBoundary: string;
  threat: string;
  stride:
    | 'Spoofing'
    | 'Tampering'
    | 'Repudiation'
    | 'Information Disclosure'
    | 'Denial of Service'
    | 'Elevation of Privilege';
  impact: 'Critical' | 'High' | 'Medium';
  controlAndVerification: string;
}

export interface FailureModeEntry {
  id: string;
  failureMode: string;
  affectedClouds: string;
  detectionSignal: string;
  blastRadius: string;
  mitigationAndRollback: string;
}

export type HierarchyTier =
  | 'Root'
  | 'Platform'
  | 'Security'
  | 'Workloads'
  | 'Sandbox'
  | 'Quarantine';

export interface HierarchyNode {
  id: string;
  parentId: string | null;
  canonicalName: string;
  slug: string;
  tier: HierarchyTier;
  awsOuName: string;
  azureMgId: string;
  gcpFolderName: string;
  guardrailPolicies: string[];
  leafUnitCount: number;
}

export interface HierarchyValidationIssue {
  id: string;
  severity: 'Error' | 'Warning' | 'Pass';
  ruleCode: string;
  cloudScope: 'All Clouds' | 'AWS Control Tower' | 'Azure Landing Zone' | 'GCP Foundation';
  affectedNodeName?: string;
  message: string;
}

export type Domain1Subdomain =
  | 'Hierarchy & Inheritance'
  | 'Account & Project Vending'
  | 'Isolation, Billing & Quotas'
  | 'Residency, Compliance & Lifecycle';

export interface Domain1CapabilitySpec {
  code: string;
  title: string;
  subdomain: Domain1Subdomain;
  awsMechanism: string;
  azureMechanism: string;
  gcpMechanism: string;
  primaryRisk: string;
  verificationGate: string;
  implementedInApp?: boolean;
}