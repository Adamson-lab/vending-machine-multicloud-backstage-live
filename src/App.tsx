import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Code2,
  Copy,
  Download,
  FileText,
  GitPullRequest,
  Layers,
  Play,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BACKSTAGE_VENDING_FEATURES,
  FEATURE_CATEGORIES,
  type FeatureCategory,
} from './data/backstageVendingFeatures';
import { TERRAFORM_MODULES } from './data/terraformModules';

const SITE_NAME = 'vending-machine-multicloud-backstage';
const LIVE_URL = `https://${SITE_NAME}.onrender.com`;
const DEFAULT_REPO = 'Adamson-lab/vending-machine-multicloud-backstage';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  slug: string;
  detail: string;
}

interface ScenarioPreset {
  id: string;
  label: string;
  envSlug: string;
  ownerTeam: string;
  costCenter: string;
  sovereignty: string;
  gpuQuota: string;
  ttlDays: string;
  attested: boolean;
  breakGlass: boolean;
  clouds: { aws: boolean; azure: boolean; gcp: boolean };
  awsScope: string;
  azureScope: string;
  gcpScope: string;
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'pci-fintech',
    label: 'PCI FinTech Prod',
    envSlug: 'payments-core-prod',
    ownerTeam: 'payments-platform',
    costCenter: 'CC-4090',
    sovereignty: 'PCI',
    gpuQuota: '8x GPU / AI Ready',
    ttlDays: '30',
    attested: true,
    breakGlass: false,
    clouds: { aws: true, azure: true, gcp: true },
    awsScope: 'ou-prod-pci-workloads',
    azureScope: '/providers/Microsoft.Management/managementGroups/mg-prod-pci',
    gcpScope: 'folders/1004090001',
  },
  {
    id: 'gdpr-eu',
    label: 'GDPR EU Banking',
    envSlug: 'eu-ledger-sovereign',
    ownerTeam: 'eu-core-banking',
    costCenter: 'CC-7120',
    sovereignty: 'GDPR',
    gpuQuota: 'None (Standard)',
    ttlDays: '90',
    attested: true,
    breakGlass: false,
    clouds: { aws: true, azure: true, gcp: false },
    awsScope: 'ou-eu-sovereign-prod',
    azureScope: '/providers/Microsoft.Management/managementGroups/mg-eu-gdpr',
    gcpScope: 'folders/2007120001',
  },
  {
    id: 'ai-sandbox',
    label: 'AI/GPU Research Sandbox',
    envSlug: 'llm-eval-sandbox-01',
    ownerTeam: 'applied-ai-lab',
    costCenter: 'CC-9015',
    sovereignty: 'Standard',
    gpuQuota: 'Multi-Node AI Cluster',
    ttlDays: '7',
    attested: false,
    breakGlass: false,
    clouds: { aws: true, azure: false, gcp: true },
    awsScope: 'ou-sandbox-ephemeral',
    azureScope: '/providers/Microsoft.Management/managementGroups/mg-sandbox',
    gcpScope: 'folders/3009015001',
  },
  {
    id: 'break-glass',
    label: 'Zero-Trust Break-Glass',
    envSlug: 'incident-containment-01',
    ownerTeam: 'secops-incident-resp',
    costCenter: 'CC-0911',
    sovereignty: 'FedRAMP',
    gpuQuota: 'None (Standard)',
    ttlDays: '1',
    attested: true,
    breakGlass: true,
    clouds: { aws: true, azure: true, gcp: true },
    awsScope: 'ou-secops-breakglass',
    azureScope: '/providers/Microsoft.Management/managementGroups/mg-breakglass',
    gcpScope: 'folders/4000911001',
  },
];

export function App() {
  const [selectedCategory, setSelectedCategory] = useState<'All' | FeatureCategory>('All');
  const [selectedCloud, setSelectedCloud] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeEnvTab, setActiveEnvTab] = useState<
    'overview' | 'finops' | 'policy' | 'network' | 'iam' | 'audit'
  >('overview');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    TERRAFORM_MODULES[0]?.id ?? 'aws-account'
  );
  const [copiedHcl, setCopiedHcl] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);
  const [showWorkflowSnippet, setShowWorkflowSnippet] = useState(false);

  const [envSlug, setEnvSlug] = useState('payments-core-prod');
  const [ownerTeam, setOwnerTeam] = useState('payments-platform');
  const [costCenter, setCostCenter] = useState('CC-4090');
  const [sovereignty, setSovereignty] = useState('PCI');
  const [gpuQuota, setGpuQuota] = useState('8x GPU / AI Ready');
  const [ttlDays, setTtlDays] = useState('30');
  const [attested, setAttested] = useState(true);
  const [breakGlass, setBreakGlass] = useState(false);
  const [clouds, setClouds] = useState({ aws: true, azure: true, gcp: true });
  const [planOutput, setPlanOutput] = useState<string | null>(null);

  const [awsTargetScope, setAwsTargetScope] = useState('ou-target-workload');
  const [azureTargetScope, setAzureTargetScope] = useState(
    '/providers/Microsoft.Management/managementGroups/mg-workload'
  );
  const [gcpTargetScope, setGcpTargetScope] = useState('folders/000000000000');

  const [ghRepo, setGhRepo] = useState(DEFAULT_REPO);
  const [ghWorkflow, setGhWorkflow] = useState('vending-provision.yml');
  const [ghRef, setGhRef] = useState('main');
  const [ghToken, setGhToken] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const activeModule = useMemo(
    () => TERRAFORM_MODULES.find((m) => m.id === selectedModuleId) ?? TERRAFORM_MODULES[0],
    [selectedModuleId]
  );

  const vendingPayload = useMemo(() => {
    const selectedTargets = [
      clouds.aws ? 'aws' : null,
      clouds.azure ? 'azure' : null,
      clouds.gcp ? 'gcp' : null,
    ].filter(Boolean);

    return {
      control_plane: SITE_NAME,
      environment_slug: envSlug.trim(),
      owner_team: ownerTeam.trim(),
      cost_center: costCenter.trim(),
      sovereignty_profile: sovereignty,
      ai_gpu_quota: gpuQuota,
      ttl_days: Number(ttlDays) || 30,
      regulated_attestation: attested,
      break_glass: breakGlass,
      target_clouds: selectedTargets,
      target_scopes: {
        aws: awsTargetScope.trim(),
        azure: azureTargetScope.trim(),
        gcp: gcpTargetScope.trim(),
      },
      mandatory_tags: {
        owner: ownerTeam.trim(),
        'cost-center': costCenter.trim(),
        environment: envSlug.trim(),
        'data-classification': sovereignty.toLowerCase(),
        ttl: `${Number(ttlDays) || 30}d`,
      },
    };
  }, [
    envSlug,
    ownerTeam,
    costCenter,
    sovereignty,
    gpuQuota,
    ttlDays,
    attested,
    breakGlass,
    clouds,
    awsTargetScope,
    azureTargetScope,
    gcpTargetScope,
  ]);

  const guardrailFindings = useMemo(() => {
    const findings: Array<{ severity: 'warn' | 'pass'; message: string }> = [];
    const regulatedProfiles = ['PCI', 'HIPAA', 'FedRAMP', 'GDPR'];
    const ttlNum = Number(ttlDays) || 0;

    if (vendingPayload.target_clouds.length === 0) {
      findings.push({
        severity: 'warn',
        message: 'Select at least one target cloud (AWS Account, Azure Subscription, or GCP Project).',
      });
    } else {
      findings.push({
        severity: 'pass',
        message: `Target clouds selected: ${vendingPayload.target_clouds.map((c) => c?.toUpperCase()).join(', ')}.`,
      });
    }

    if (regulatedProfiles.includes(sovereignty) && !attested) {
      findings.push({
        severity: 'warn',
        message: `${sovereignty} profile selected without Regulated Workload Attestation checked.`,
      });
    } else {
      findings.push({
        severity: 'pass',
        message: `Compliance posture aligned for ${sovereignty} profile (Attested: ${attested ? 'Yes' : 'No'}).`,
      });
    }

    if (breakGlass && ttlNum > 7) {
      findings.push({
        severity: 'warn',
        message: `Break-Glass emergency mode is active with a ${ttlNum}-day TTL (recommend <= 7 days with post-review).`,
      });
    } else {
      findings.push({
        severity: 'pass',
        message: `Lifecycle TTL set to ${ttlNum || 30}d with mandatory cost/owner tags.`,
      });
    }

    return findings;
  }, [vendingPayload.target_clouds, sovereignty, attested, breakGlass, ttlDays]);

  const dynamicReadinessScore = useMemo(() => {
    const warnCount = guardrailFindings.filter((f) => f.severity === 'warn').length;
    return Math.max(45, 100 - warnCount * 15);
  }, [guardrailFindings]);

  const estimatedBudgetCapUsd = useMemo(() => {
    const cloudCount = Math.max(1, vendingPayload.target_clouds.length);
    const gpuMultiplier =
      gpuQuota === 'Multi-Node AI Cluster'
        ? 4500
        : gpuQuota === '8x GPU / AI Ready'
          ? 2400
          : gpuQuota === '4x GPU / Inference'
            ? 1200
            : 600;
    const sovereigntyPremium = sovereignty === 'Standard' ? 1 : 1.25;
    return Math.round(cloudCount * gpuMultiplier * sovereigntyPremium);
  }, [vendingPayload.target_clouds.length, gpuQuota, sovereignty]);

  const workflowTemplateYml = useMemo(() => {
    return `name: Vending Provision Dispatch

on:
  workflow_dispatch:
    inputs:
      environment_slug:
        description: "Target environment slug"
        required: true
        type: string
      owner_team:
        description: "Owning team"
        required: true
        type: string
      cost_center:
        description: "Cost center"
        required: true
        type: string
      sovereignty_profile:
        description: "Sovereignty profile"
        required: true
        type: string
      target_clouds:
        description: "Target clouds"
        required: true
        type: string
      aws_target_scope:
        description: "AWS OU or scope"
        required: false
        default: "${vendingPayload.target_scopes.aws}"
        type: string
      azure_target_scope:
        description: "Azure MG or scope"
        required: false
        default: "${vendingPayload.target_scopes.azure}"
        type: string
      gcp_target_scope:
        description: "GCP folder or scope"
        required: false
        default: "${vendingPayload.target_scopes.gcp}"
        type: string

jobs:
  validate-and-stage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.9.8
      - name: Stage tfvars artifact
        run: |
          mkdir -p staged-envs
          cat <<EOF > "staged-envs/\${{ inputs.environment_slug }}.auto.tfvars.json"
          {
            "environment_slug": "\${{ inputs.environment_slug }}",
            "owner_team": "\${{ inputs.owner_team }}",
            "cost_center": "\${{ inputs.cost_center }}",
            "sovereignty_profile": "\${{ inputs.sovereignty_profile }}",
            "target_clouds": "\${{ inputs.target_clouds }}",
            "target_scopes": {
              "aws": "\${{ inputs.aws_target_scope }}",
              "azure": "\${{ inputs.azure_target_scope }}",
              "gcp": "\${{ inputs.gcp_target_scope }}"
            }
          }
          EOF
      - name: Validate Terraform modules
        run: |
          for dir in terraform/modules/*; do
            if [ -f "\$dir/main.tf" ]; then
              terraform -chdir="\$dir" init -backend=false -input=false
              terraform -chdir="\$dir" validate
            fi
          done`;
  }, [vendingPayload.target_scopes.aws, vendingPayload.target_scopes.azure, vendingPayload.target_scopes.gcp]);

  const filteredFeatures = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return BACKSTAGE_VENDING_FEATURES.filter((feat) => {
      const catMatch = selectedCategory === 'All' || feat.category === selectedCategory;
      const cloudMatch = selectedCloud === 'All' || feat.cloudScope === selectedCloud;
      const textMatch =
        !q ||
        feat.title.toLowerCase().includes(q) ||
        feat.summary.toLowerCase().includes(q) ||
        feat.category.toLowerCase().includes(q) ||
        feat.cloudScope.toLowerCase().includes(q);
      return catMatch && cloudMatch && textMatch;
    });
  }, [selectedCategory, selectedCloud, searchTerm]);

  function recordAudit(action: string, detail: string) {
    const entry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      slug: vendingPayload.environment_slug || 'unnamed-env',
      detail,
    };
    setAuditLog((prev) => [entry, ...prev].slice(0, 25));
  }

  function applyPreset(preset: ScenarioPreset) {
    setEnvSlug(preset.envSlug);
    setOwnerTeam(preset.ownerTeam);
    setCostCenter(preset.costCenter);
    setSovereignty(preset.sovereignty);
    setGpuQuota(preset.gpuQuota);
    setTtlDays(preset.ttlDays);
    setAttested(preset.attested);
    setBreakGlass(preset.breakGlass);
    setClouds(preset.clouds);
    setAwsTargetScope(preset.awsScope);
    setAzureTargetScope(preset.azureScope);
    setGcpTargetScope(preset.gcpScope);
    setPlanOutput(null);
    recordAudit('Preset Loaded', `Applied "${preset.label}" scenario template.`);
  }

  function handleGeneratePlan(e: React.FormEvent) {
    e.preventDefault();
    const targetClouds = [
      clouds.aws ? 'AWS Account' : null,
      clouds.azure ? 'Azure Subscription' : null,
      clouds.gcp ? 'GCP Project' : null,
    ]
      .filter(Boolean)
      .join(' + ');

    const summary = `[${SITE_NAME}] Score ${dynamicReadinessScore}/100 · Cap $${estimatedBudgetCapUsd.toLocaleString()}/mo · ${sovereignty} guardrails for "${envSlug}" (${ownerTeam}, ${costCenter}, ${gpuQuota}, TTL ${ttlDays}d${
      breakGlass ? ', Break-Glass' : ''
    }${attested ? ', Attested' : ''}) across ${targetClouds || 'none selected'} -> ${LIVE_URL}`;

    setPlanOutput(summary);
    recordAudit('Pre-Flight Plan', summary);
  }

  async function handleCopyHcl() {
    if (!activeModule) return;
    try {
      await navigator.clipboard.writeText(activeModule.hcl);
      setCopiedHcl(true);
      setTimeout(() => setCopiedHcl(false), 1800);
      recordAudit('Copied HCL', `Copied ${activeModule.path}`);
    } catch {
      setCopiedHcl(false);
    }
  }

  async function handleCopyTfvars() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(vendingPayload, null, 2));
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 1800);
      recordAudit('Copied tfvars.json', `Copied payload for "${vendingPayload.environment_slug}"`);
    } catch {
      setCopiedPayload(false);
    }
  }

  function handleDownloadTfvars() {
    const fileName = `${envSlug.trim() || 'vending-env'}.auto.tfvars.json`;
    const blob = new Blob([JSON.stringify(vendingPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    recordAudit('Downloaded tfvars', `Downloaded ${fileName}`);
  }

  async function handleCopyWorkflow() {
    try {
      await navigator.clipboard.writeText(workflowTemplateYml);
      setCopiedWorkflow(true);
      setTimeout(() => setCopiedWorkflow(false), 1800);
    } catch {
      setCopiedWorkflow(false);
    }
  }

  function handleExportAuditMarkdown() {
    const lines = [
      `# ${SITE_NAME} — Vending Audit & Pre-Flight Export`,
      `- Target Control Plane URL: ${LIVE_URL}`,
      `- Environment Slug: ${vendingPayload.environment_slug}`,
      `- Owner Team: ${vendingPayload.owner_team}`,
      `- Cost Center: ${vendingPayload.cost_center}`,
      `- Sovereignty Profile: ${vendingPayload.sovereignty_profile}`,
      `- Readiness Score: ${dynamicReadinessScore}/100`,
      `- Estimated Monthly Budget Cap: $${estimatedBudgetCapUsd}`,
      '',
      '## Session Events',
      ...auditLog.map((e) => `- [${e.timestamp}] **${e.action}** (${e.slug}): ${e.detail}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vendingPayload.environment_slug || 'vending'}-audit.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleTriggerGitHubWorkflow() {
    if (!ghRepo.trim() || !ghWorkflow.trim() || !ghToken.trim()) {
      setDispatchStatus('Enter GitHub owner/repo, workflow filename, and a token to trigger.');
      return;
    }
    setIsDispatching(true);
    setDispatchStatus(null);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${ghRepo.trim()}/actions/workflows/${ghWorkflow.trim()}/dispatches`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${ghToken.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: ghRef.trim() || 'main',
            inputs: {
              environment_slug: vendingPayload.environment_slug,
              owner_team: vendingPayload.owner_team,
              cost_center: vendingPayload.cost_center,
              sovereignty_profile: vendingPayload.sovereignty_profile,
              target_clouds: vendingPayload.target_clouds.join(','),
              aws_target_scope: vendingPayload.target_scopes.aws,
              azure_target_scope: vendingPayload.target_scopes.azure,
              gcp_target_scope: vendingPayload.target_scopes.gcp,
            },
          }),
        }
      );
      if (res.status === 204) {
        const msg = `Dispatched ${ghWorkflow.trim()} on ${ghRepo.trim()} (${ghRef.trim() || 'main'}) for "${vendingPayload.environment_slug}".`;
        setDispatchStatus(msg);
        recordAudit('Workflow Dispatched', msg);
      } else {
        const errBody = await res.text();
        const errMsg = `GitHub API returned ${res.status}: ${errBody || 'Check token, branch, & workflow file.'}`;
        setDispatchStatus(errMsg);
        recordAudit('Dispatch Failed', errMsg);
      }
    } catch (err) {
      const failMsg = `Request failed: ${err instanceof Error ? err.message : 'Network or CORS error'}`;
      setDispatchStatus(failMsg);
      recordAudit('Dispatch Error', failMsg);
    } finally {
      setIsDispatching(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-sky-400 uppercase">
              {SITE_NAME} · Terraform &amp; Backstage Control Plane
            </p>
            <h1 className="text-2xl font-bold text-white">
              Multicloud Account, Subscription &amp; Project Vending Machine
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-emerald-700/60 bg-emerald-950/60 px-3 py-1.5 text-emerald-300">
              Embedded Capabilities: {BACKSTAGE_VENDING_FEATURES.length}
            </span>
            <span className="rounded-md border border-sky-700/60 bg-sky-950/60 px-3 py-1.5 text-sky-300">
              Terraform Modules: {TERRAFORM_MODULES.length}
            </span>
            <span className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-200">
              Target URL: {LIVE_URL}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section className="grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleGeneratePlan}
            className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Cloud className="h-4 w-4 text-sky-400" />
                <span>Backstage Scaffolder Vending &amp; Policy Pre-Flight</span>
              </div>
              <span className="rounded bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-medium text-sky-300">
                JSON Schema &amp; RJSF Ready
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Real-World Scenarios:</span>
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-sky-500 hover:text-white"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs text-slate-300">
                Environment Slug
                <input
                  value={envSlug}
                  onChange={(e) => setEnvSlug(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  required
                />
              </label>
              <label className="block text-xs text-slate-300">
                Owner Team &amp; Escalation
                <input
                  value={ownerTeam}
                  onChange={(e) => setOwnerTeam(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  required
                />
              </label>
              <label className="block text-xs text-slate-300">
                Cost Center &amp; Budget Cap
                <input
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  required
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs text-slate-300">
                Sovereign Cloud Profile
                <select
                  value={sovereignty}
                  onChange={(e) => setSovereignty(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="Standard">Standard</option>
                  <option value="FedRAMP">FedRAMP</option>
                  <option value="HIPAA">HIPAA</option>
                  <option value="PCI">PCI</option>
                  <option value="GDPR">GDPR</option>
                  <option value="Local Residency">Local Residency</option>
                </select>
              </label>
              <label className="block text-xs text-slate-300">
                AI Workload &amp; GPU Quota
                <select
                  value={gpuQuota}
                  onChange={(e) => setGpuQuota(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="None (Standard)">None (Standard)</option>
                  <option value="4x GPU / Inference">4x GPU / Inference</option>
                  <option value="8x GPU / AI Ready">8x GPU / AI Ready</option>
                  <option value="Multi-Node AI Cluster">Multi-Node AI Cluster</option>
                </select>
              </label>
              <label className="block text-xs text-slate-300">
                TTL Window (Days)
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={ttlDays}
                  onChange={(e) => setTtlDays(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs text-slate-300">
                AWS Target OU / Scope
                <input
                  value={awsTargetScope}
                  onChange={(e) => setAwsTargetScope(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="block text-xs text-slate-300">
                Azure Management Group / Scope
                <input
                  value={azureTargetScope}
                  onChange={(e) => setAzureTargetScope(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="block text-xs text-slate-300">
                GCP Folder / Scope
                <input
                  value={gcpTargetScope}
                  onChange={(e) => setGcpTargetScope(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-200">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={clouds.aws}
                  onChange={(e) => setClouds({ ...clouds, aws: e.target.checked })}
                />
                AWS Account
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={clouds.azure}
                  onChange={(e) => setClouds({ ...clouds, azure: e.target.checked })}
                />
                Azure Subscription
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={clouds.gcp}
                  onChange={(e) => setClouds({ ...clouds, gcp: e.target.checked })}
                />
                GCP Project
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                />
                Regulated Workload Attestation
              </label>
              <label className="flex items-center gap-2 text-amber-300">
                <input
                  type="checkbox"
                  checked={breakGlass}
                  onChange={(e) => setBreakGlass(e.target.checked)}
                />
                Break-Glass Emergency Request
              </label>
            </div>

            <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs">
              {guardrailFindings.map((f, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 ${
                    f.severity === 'warn' ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  {f.severity === 'warn' ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{f.message}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
              >
                <GitPullRequest className="h-4 w-4" />
                <span>Run Pre-Flight &amp; Generate GitOps Plan</span>
              </button>
              {planOutput && <p className="text-xs text-emerald-400">{planOutput}</p>}
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  Real GitOps Artifact &amp; GitHub Actions Workflow Dispatch
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTfvars}
                    className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedPayload ? 'Copied tfvars.json' : 'Copy tfvars.json'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTfvars}
                    className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download .auto.tfvars.json</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWorkflowSnippet((s) => !s)}
                    className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-sky-300 hover:bg-slate-700"
                  >
                    <FileText className="h-3 w-3" />
                    <span>{showWorkflowSnippet ? 'Hide Workflow YAML' : 'Workflow YAML'}</span>
                  </button>
                </div>
              </div>

              {showWorkflowSnippet && (
                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Target file: .github/workflows/{ghWorkflow || 'vending-provision.yml'}</span>
                    <button
                      type="button"
                      onClick={handleCopyWorkflow}
                      className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-200 hover:bg-slate-800"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedWorkflow ? 'Copied YAML' : 'Copy YAML'}</span>
                    </button>
                  </div>
                  <pre className="max-h-52 overflow-auto font-mono text-[11px] text-sky-300">
                    <code>{workflowTemplateYml}</code>
                  </pre>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
                  placeholder="owner/repo"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  value={ghWorkflow}
                  onChange={(e) => setGhWorkflow(e.target.value)}
                  placeholder="workflow.yml"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="password"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder="GitHub PAT (actions:write)"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isDispatching}
                  onClick={handleTriggerGitHubWorkflow}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{isDispatching ? 'Dispatching...' : 'Dispatch GitHub Workflow'}</span>
                </button>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Branch:</span>
                  <input
                    value={ghRef}
                    onChange={(e) => setGhRef(e.target.value)}
                    placeholder="main"
                    className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                  />
                </label>
                {dispatchStatus && <p className="text-xs text-amber-300">{dispatchStatus}</p>}
              </div>
            </div>
          </form>

          <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Vended Environment Inspector</span>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                  Active · Readiness {dynamicReadinessScore}/100
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['overview', 'Overview'],
                    ['finops', 'Cost & FinOps'],
                    ['policy', 'Policy & Drift'],
                    ['network', 'CIDR & Net'],
                    ['iam', 'IAM & OIDC'],
                    ['audit', 'Audit Trail'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveEnvTab(key)}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                      activeEnvTab === key
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-300">
                {activeEnvTab === 'overview' && (
                  <p>
                    System &rarr; Domain &rarr; Component &rarr; Resource graph linked for{' '}
                    <span className="font-semibold text-white">{envSlug}</span> under{' '}
                    <span className="text-sky-400">{ownerTeam}</span> ({sovereignty}).
                  </p>
                )}
                {activeEnvTab === 'finops' && (
                  <p>
                    Cost center <span className="font-semibold text-white">{costCenter}</span> ·
                    Suggested monthly cap{' '}
                    <span className="font-semibold text-emerald-300">
                      ${estimatedBudgetCapUsd.toLocaleString()}
                    </span>{' '}
                    (50/80/100% alerts) · {gpuQuota} · TTL {ttlDays}d.
                  </p>
                )}
                {activeEnvTab === 'policy' && (
                  <p>
                    AWS SCPs, Azure Policy initiatives, and GCP Org Policies mapped for{' '}
                    <span className="font-semibold text-white">{sovereignty}</span> with drift
                    checks on Terraform state.
                  </p>
                )}
                {activeEnvTab === 'network' && (
                  <p>
                    Targets: AWS (<code className="text-sky-300">{awsTargetScope}</code>), Azure (
                    <code className="text-sky-300">{azureTargetScope}</code>), GCP (
                    <code className="text-sky-300">{gcpTargetScope}</code>).
                  </p>
                )}
                {activeEnvTab === 'iam' && (
                  <p>
                    Short-lived OIDC federation trusts, PIM/JIT elevation paths, and ITSM approval
                    gates verified.
                  </p>
                )}
                {activeEnvTab === 'audit' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Session events: {auditLog.length}</span>
                      <button
                        type="button"
                        onClick={handleExportAuditMarkdown}
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
                      >
                        Export Audit .md
                      </button>
                    </div>
                    {auditLog.length > 0 ? (
                      <ul className="max-h-28 space-y-1 overflow-auto text-[11px] text-slate-400">
                        {auditLog.slice(0, 6).map((item) => (
                          <li key={item.id}>
                            <span className="text-sky-300">{item.action}:</span> {item.detail}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400">
                        Run pre-flight, export tfvars, or dispatch a workflow to log events here.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>TechDocs runbooks, RBAC policies &amp; multi-tenant catalog active</span>
            </div>
          </div>
        </section>

        {activeModule && (
          <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Code2 className="h-4 w-4 text-sky-400" />
                <span>Terraform Vending Modules &amp; HCL Blueprints</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {TERRAFORM_MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setSelectedModuleId(mod.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      activeModule.id === mod.id
                        ? 'bg-sky-500 text-slate-950'
                        : 'border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {mod.path}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-slate-300">
              <div>
                <span className="font-semibold text-white">{activeModule.name}</span> · Provider:{' '}
                <code className="text-sky-300">{activeModule.providerConstraint}</code>
              </div>
              <button
                type="button"
                onClick={handleCopyHcl}
                className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedHcl ? 'Copied HCL' : 'Copy HCL'}</span>
              </button>
            </div>

            <pre className="max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300">
              <code>{activeModule.hcl}</code>
            </pre>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-sky-400" />
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  selectedCategory === 'All'
                    ? 'bg-sky-500 text-slate-950'
                    : 'border border-slate-800 bg-slate-900 text-slate-300'
                }`}
              >
                All ({BACKSTAGE_VENDING_FEATURES.length})
              </button>
              {FEATURE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    selectedCategory === cat
                      ? 'bg-sky-500 text-slate-950'
                      : 'border border-slate-800 bg-slate-900 text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['All', 'AWS', 'Azure', 'GCP', 'Multicloud', 'Backstage', 'Terraform'].map(
                (scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setSelectedCloud(scope)}
                    className={`rounded-md px-2.5 py-1 text-xs ${
                      selectedCloud === scope
                        ? 'bg-emerald-400 font-semibold text-slate-950'
                        : 'border border-slate-800 bg-slate-900 text-slate-300'
                    }`}
                  >
                    {scope}
                  </button>
                )
              )}
              <div className="relative w-64">
                <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Backstage features..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 pr-3 pl-8 text-xs text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFeatures.map((feat) => (
              <div
                key={feat.id}
                className="rounded-xl border border-slate-800 bg-slate-900/90 p-4"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-medium text-sky-400">
                    <Layers className="h-3 w-3" />
                    {feat.cloudScope}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                    {feat.status}
                  </span>
                </div>
                <h2 className="mt-1.5 text-sm font-semibold text-white">{feat.title}</h2>
                <p className="mt-1 text-xs text-slate-400">{feat.summary}</p>
                <p className="mt-2 text-[11px] text-slate-500">{feat.category}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;