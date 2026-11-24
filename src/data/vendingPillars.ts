export interface VendingComponentItem {
  id: string;
  pillar: string;
  name: string;
  layer: 'Backstage' | 'Terraform' | 'Policy' | 'FinOps' | 'Security';
  summary: string;
}

export const VENDING_PILLARS: string[] = [
  'Backstage Developer Portal & Golden Path',
  'AWS Account Vending & Organizations',
  'Azure Subscription Vending & Management Groups',
  'GCP Project Vending & Folders',
  'Tagging, Labeling & Metadata Taxonomy',
  'Terraform Modules, State & GitOps',
  'Policy-as-Code, Guardrails & Compliance',
  'FinOps, Quotas, IPAM & Capacity',
  'Observability, Audit & Lifecycle Operations',
  'Extensibility, Integrations & Platform Scale',
];

const PILLAR_SEEDS: Record<string, { layer: VendingComponentItem['layer']; items: string[] }> = {
  'Backstage Developer Portal & Golden Path': {
    layer: 'Backstage',
    items: [
      'Software Catalog Entity Provider',
      'Custom VendingRequest Catalog Kind',
      'Scaffolder AWS Account Workflow',
      'Scaffolder Azure Subscription Workflow',
      'Scaffolder GCP Project Workflow',
      'Scaffolder Three-Cloud Landing Zone Bundle',
      'Quota & IPAM Pre-Flight Action',
      'Cost Center & Budget Cap Validator',
      'Data Residency & Sovereignty Resolver',
      'Naming Convention & Slug Generator',
    ],
  },
  'AWS Account Vending & Organizations': {
    layer: 'Terraform',
    items: [
      'Organizations Root & OU Hierarchy Manager',
      'Control Tower Account Creation Orchestrator',
      'Service Control Policy Attachment Engine',
      'Declarative Policies & Region Opt-In Enforcer',
      'IAM Identity Center Permission Set Provisioner',
      'OIDC Federation Trust Bootstrapper',
      'Cross-Account Vending Execution Role',
      'Mandatory Cost Allocation Tag Activator',
      'AWS Budgets & Alert Guardrail Configurator',
      'Organizations CloudTrail & Security Hub Enroller',
    ],
  },
  'Azure Subscription Vending & Management Groups': {
    layer: 'Terraform',
    items: [
      'Management Group Hierarchy Engine',
      'Subscription Alias & Billing Scope Binder',
      'Azure Policy Initiative Assignment Engine',
      'Policy Exemption & Expiry Workflow',
      'Entra ID PIM Eligible Role Provisioner',
      'Workload Identity Federation Configurator',
      'Subscription Tag Inheritance & Policy Enforcer',
      'Cost Management Budget & Alert Provisioner',
      'Activity Log & Defender Enrollment Hook',
      'VNet IPAM & Private DNS Zone Linker',
    ],
  },
  'GCP Project Vending & Folders': {
    layer: 'Terraform',
    items: [
      'Organization, Folder & Project Hierarchy Manager',
      'Project Creation & Billing Account Binder',
      'Organization Policy Constraint Enforcer',
      'Hierarchy Policy Inheritance Validator',
      'IAM Binding & Workload Identity Federation Setup',
      'Resource Manager Tags & Bindings Provisioner',
      'Project Labels & Billing Export Synchronizer',
      'Cloud Billing Budget & Pub/Sub Alert Hook',
      'Service Usage API & Quota Pre-Checker',
      'Shared VPC & Private Service Connect Hook',
    ],
  },
  'Tagging, Labeling & Metadata Taxonomy': {
    layer: 'Policy',
    items: [
      'Canonical Cross-Cloud Taxonomy Schema',
      'Mandatory Tag & Label Key Registry',
      'Allowed Value Enum & Regex Validator',
      'Key/Value Case Normalization Engine',
      'Cloud Character & Length Limit Enforcer',
      'Reserved & System Prefix Guardrail',
      'Hierarchical Tag & Label Inheritance Engine',
      'Backstage Catalog Auto-Tagging Enricher',
      'Terraform PR Tag Compliance Linter',
      'Tag Drift Scanner & Remediation Workflow',
    ],
  },
  'Terraform Modules, State & GitOps': {
    layer: 'Terraform',
    items: [
      'Modular Root & Child Vending Modules',
      'Isolated Remote State Backend Bootstrapper',
      'State Locking & Concurrency Guard',
      'Encrypted State Storage Access Policy',
      'Format, Validate, Tflint & Security Gate',
      'Automated Plan PR Commenter',
      'Approval Gate Before Terraform Apply',
      'Automated Apply & Retry Orchestrator',
      'Scheduled Drift Detection & Remediation',
      'Existing Account/Subscription/Project Importer',
    ],
  },
  'Policy-as-Code, Guardrails & Compliance': {
    layer: 'Policy',
    items: [
      'Unified AWS SCP, Azure Policy & GCP Org Policy Map',
      'OPA / Rego Vending Request Evaluator',
      'Pre-Provisioning Guardrail Blocker',
      'Preventive vs. Detective Control Classifier',
      'Data Residency & Sovereignty Allowlist',
      'Network Public Exposure Guardrail',
      'Encryption & KMS Baseline Enforcer',
      'Compliance Framework Control Crosswalk',
      'Time-Bound Policy Exception Workflow',
      'Policy Simulation & Dry-Run Evaluator',
    ],
  },
  'FinOps, Quotas, IPAM & Capacity': {
    layer: 'FinOps',
    items: [
      'Pre-Vending Budget Cap Validator',
      'Multi-Threshold Spend & Forecast Alerts',
      'Sandbox Auto-Teardown & Expiration Guardrail',
      'Chargeback & Showback Tag Attribution',
      'Commitment & Savings Coverage View',
      'Multi-Cloud IPAM CIDR Pool Allocator',
      'Overlapping CIDR Conflict Detector',
      'Regional Compute & GPU Quota Pre-Check',
      'Automated Quota Increase Request Flow',
      'Orphaned & Idle Environment Reclaimer',
    ],
  },
  'Observability, Audit & Lifecycle Operations': {
    layer: 'Security',
    items: [
      'End-to-End Vending Correlation & Trace IDs',
      'Immutable Vending Audit Log Stream',
      'Provisioning Latency & Success Telemetry',
      'Quarantine & Access Isolation Action',
      'Controlled Decommission & Cleanup Workflow',
      'Backstage Catalog Sync Health Monitor',
      'Webhook Signature & Replay Guard',
      'Synthetic Canary Vending Smoke Check',
      'Environment State Machine Tracker',
      'Incident & Failure Runbook Resolver',
    ],
  },
  'Extensibility, Integrations & Platform Scale': {
    layer: 'Backstage',
    items: [
      'Control Plane REST & Event Bus API',
      'ServiceNow & Jira Approval Connector',
      'Enterprise SSO & Group Sync Adapter',
      'CMDB Bidirectional Metadata Sync',
      'CI/CD Runner & OIDC Adapter',
      'Custom Guardrail Plugin Extension Point',
      'Multi-Tenant & Sovereign Cloud Mode',
      'Saved Filters, Search & Diff Inspector',
      'Exportable JSON/YAML Blueprint Bundle',
      'End-to-End Platform Readiness Verifier',
    ],
  },
};

export const VENDING_COMPONENTS: VendingComponentItem[] = VENDING_PILLARS.flatMap((pillar) => {
  const seed = PILLAR_SEEDS[pillar];
  return Array.from({ length: 50 }, (_, idx) => {
    const baseName = seed.items[idx % seed.items.length];
    const variantSuffix = idx < seed.items.length ? '' : ` — Profile ${Math.floor(idx / seed.items.length) + 1}`;
    const slug = `${pillar.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${idx + 1}`;
    return {
      id: slug,
      pillar,
      name: `${baseName}${variantSuffix}`,
      layer: seed.layer,
      summary: `${baseName}${variantSuffix} within ${pillar} across AWS, Azure, and GCP.`,
    };
  });
});