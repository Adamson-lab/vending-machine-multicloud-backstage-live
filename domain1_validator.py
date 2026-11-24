from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import json
import re
from typing import Dict, List, Optional


@dataclass
class HierarchyNode:
    node_id: str
    parent_id: Optional[str]
    name: str
    slug: str
    tier: str  # Root | Security | Platform | Workloads | Sandbox | Quarantine
    archetype: str = "Corp"  # Corp | Online | Sandbox | Platform | Security
    aws_ou: str = ""
    azure_mg: str = ""
    gcp_folder: str = ""
    policies: List[str] = field(default_factory=list)
    has_billing_link: bool = True
    has_cost_center: bool = True
    has_owner: bool = True
    quota_usage_pct: float = 35.0
    sleep_schedule_enabled: bool = False
    is_shadow: bool = False
    leaf_count: int = 0


@dataclass
class TenantRequest:
    slug: str
    owner: str
    cost_center: str
    target_node_id: str
    env_tier: str  # Sandbox | Dev | Staging | Prod
    isolation_mode: str  # Shared | Dedicated-Per-Env | Dedicated-Per-App-Env
    criticality_tier: str  # Tier 0 | Tier 1 | Tier 2 | Tier 3 | Tier 4
    compliance_zone: str  # Standard | PCI-DSS | HIPAA | Sovereign
    region: str
    ttl_days: int
    lease_renewals: int = 0
    lifecycle_state: str = "Active"  # Active | LeaseExpiring | Quarantined | Decommissioned
    snapshot_verified: bool = True
    resource_lock_enabled: bool = True
    legal_hold_active: bool = False
    retention_satisfied: bool = True
    provisioning_minutes: int = 12
    image_approved: bool = True
    region_enabled_all_clouds: bool = True
    sovereign_compatible: bool = True


@dataclass
class WaiverRecord:
    waiver_id: str
    rule_code: str
    owner: str
    approver: str
    risk_accepted: bool
    days_until_expiry: int
    auto_revert: bool = True


class Domain1Engine:
    AWS_MAX_DEPTH = 5
    AZURE_MAX_DEPTH = 6
    GCP_MAX_DEPTH = 10
    APPROVED_REGIONS = {
        "eu-west-1",
        "eu-central-1",
        "us-east-1",
        "us-west-2",
        "af-south-1",
    }

    def __init__(self, nodes: List[HierarchyNode]) -> None:
        self.nodes: Dict[str, HierarchyNode] = {n.node_id: n for n in nodes}

    def path_to_root(self, node_id: str) -> List[HierarchyNode]:
        chain: List[HierarchyNode] = []
        seen = set()
        curr = self.nodes.get(node_id)
        while curr and curr.node_id not in seen:
            seen.add(curr.node_id)
            chain.append(curr)
            curr = self.nodes.get(curr.parent_id) if curr.parent_id else None
        chain.reverse()
        return chain

    def validate_hierarchy(self) -> List[str]:
        issues: List[str] = []
        roots = [n for n in self.nodes.values() if n.parent_id is None]
        if len(roots) != 1:
            issues.append(f"[001] Expected exactly 1 root node, found {len(roots)}.")

        slug_re = re.compile(r"^[a-z0-9](-[a-z0-9]){1,38}$")
        seen_slugs = set()

        for node in self.nodes.values():
            if not slug_re.match(node.slug):
                issues.append(f"[009] Invalid slug '{node.slug}' on node '{node.name}'.")
            if node.slug in seen_slugs:
                issues.append(f"[009] Duplicate slug '{node.slug}' detected.")
            seen_slugs.add(node.slug)

            if node.is_shadow:
                issues.append(f"[028] Shadow/duplicate container detected: '{node.name}'.")

            if not node.has_billing_link:
                issues.append(f"[007] Missing billing linkage on '{node.name}'.")

            if not node.has_cost_center or not node.has_owner:
                issues.append(f"[012/014] Missing owner or cost center on '{node.name}'.")

            if node.quota_usage_pct >= 75.0:
                issues.append(
                    f"[013] Quota headroom alert on '{node.name}': {node.quota_usage_pct}% used."
                )

            chain = self.path_to_root(node.node_id)
            depth = max(0, len(chain) - 1)
            if depth > self.AWS_MAX_DEPTH:
                issues.append(f"[001] AWS OU depth {depth} > {self.AWS_MAX_DEPTH} on '{node.name}'.")
            if depth > self.AZURE_MAX_DEPTH:
                issues.append(
                    f"[001/022] Azure MG depth {depth} > {self.AZURE_MAX_DEPTH} on '{node.name}'."
                )
            if depth > self.GCP_MAX_DEPTH:
                issues.append(f"[001/023] GCP Folder depth {depth} > {self.GCP_MAX_DEPTH} on '{node.name}'.")

            if node.tier in ("Root", "Security", "Platform") and node.leaf_count > 10:
                issues.append(
                    f"[008/017] High blast radius ({node.leaf_count} units) on core tier '{node.name}'."
                )

            if node.tier == "Workloads" and "Prod" in node.name and not node.sleep_schedule_enabled:
                pass
            elif node.tier in ("Sandbox",) and not node.sleep_schedule_enabled:
                issues.append(f"[027] Off-hours sleep schedule disabled on '{node.name}'.")

        return issues

    def simulate_inheritance(self, target_node_id: str, gcp_reset_child: bool = False) -> Dict[str, object]:
        chain = self.path_to_root(target_node_id)
        inherited_policies = [p for n in chain for p in n.policies]
        has_explicit_deny = any("deny" in p.lower() for p in inherited_policies)
        return {
            "capability": "002",
            "target": target_node_id,
            "hops": [n.name for n in chain],
            "inherited_policy_count": len(inherited_policies),
            "aws_scp_effective": "DENY_WINS" if has_explicit_deny else "ALLOW_INTERSECTED",
            "azure_mg_effective": "INHERITED_ENFORCED" if has_explicit_deny else "INHERITED_EVALUATED",
            "gcp_org_policy_effective": (
                "PARENT_DENY_RETAINS"
                if (has_explicit_deny and not gcp_reset_child)
                else ("CHILD_RESET_APPLIED" if gcp_reset_child else "INHERITED")
            ),
        }

    def evaluate_tenant(self, req: TenantRequest) -> Dict[str, object]:
        findings: List[str] = []
        node = self.nodes.get(req.target_node_id)
        if not node:
            return {"slug": req.slug, "approved": False, "findings": ["[003] Unknown target node."]}

        if req.env_tier == "Prod" and node.tier == "Sandbox":
            findings.append("[010] Invalid promotion: Sandbox node cannot host Prod.")

        if req.criticality_tier in ("Tier 0", "Tier 1") and req.isolation_mode == "Shared":
            findings.append("[004/039] Tier 0/1 workload should not use Shared isolation.")

        if req.compliance_zone != "Standard" and node.tier == "Sandbox":
            findings.append(f"[026] Ring-fence violation: {req.compliance_zone} not allowed in Sandbox.")

        if req.region not in self.APPROVED_REGIONS:
            findings.append(f"[016] Region '{req.region}' violates residency allowlist.")

        if not req.region_enabled_all_clouds:
            findings.append(f"[036] Region '{req.region}' opt-in/API parity incomplete across clouds.")

        if req.compliance_zone == "Sovereign" and not req.sovereign_compatible:
            findings.append("[046] Workload lacks sovereign/isolated enclave parity.")

        if not req.image_approved:
            findings.append("[035] Base/golden image lineage is unapproved or deprecated.")

        if req.env_tier in ("Sandbox", "Dev") and req.ttl_days > 30:
            findings.append(f"[005/030] Non-prod TTL {req.ttl_days}d exceeds 30d cap.")

        if req.lease_renewals > 2:
            findings.append(f"[005] Lease renewal count {req.lease_renewals} exceeds max 2.")

        sla_cap = 15 if req.env_tier == "Sandbox" else (120 if req.env_tier == "Prod" else 45)
        if req.provisioning_minutes > sla_cap:
            findings.append(
                f"[045] Provisioning SLA breach: {req.provisioning_minutes}m > {sla_cap}m."
            )

        if req.lifecycle_state in ("Quarantined", "Decommissioned"):
            if req.legal_hold_active or not req.retention_satisfied:
                findings.append("[037] Offboarding blocked: active legal hold or retention unmet.")
            if not req.snapshot_verified or not req.resource_lock_enabled:
                findings.append("[006] Quarantine/decommission gate failed: lock or snapshot missing.")

        return {
            "slug": req.slug,
            "approved": len(findings) == 0,
            "findings": findings,
        }

    def evaluate_waivers(self, waivers: List[WaiverRecord]) -> List[str]:
        alerts: List[str] = []
        for w in waivers:
            if not w.owner or not w.approver or not w.risk_accepted:
                alerts.append(f"[019] Waiver {w.waiver_id} missing owner, approver, or risk sign-off.")
            if w.days_until_expiry <= 0:
                action = "AUTO-REVERT" if w.auto_revert else "ESCALATE"
                alerts.append(f"[019/042] Waiver {w.waiver_id} ({w.rule_code}) EXPIRED -> {action}.")
            elif w.days_until_expiry <= 7:
                alerts.append(
                    f"[042] Waiver {w.waiver_id} ({w.rule_code}) expiring in {w.days_until_expiry}d."
                )
        return alerts

    def maturity_score(self, hierarchy_issues: List[str], tenant_results: List[Dict[str, object]]) -> Dict[str, object]:
        approved_tenants = sum(1 for r in tenant_results if r["approved"])
        tenant_pass_rate = (approved_tenants / len(tenant_results)) if tenant_results else 1.0
        hierarchy_penalty = min(1.5, len(hierarchy_issues) * 0.25)
        raw_score = max(1.0, min(4.0, round(4.0 - hierarchy_penalty - (1.0 - tenant_pass_rate) * 1.5, 2)))
        tier_label = (
            "Tier 4: Autonomous/Verified"
            if raw_score >= 3.6
            else ("Tier 3: Standardized/Automated" if raw_score >= 2.6 else "Tier 2: Repeatable")
        )
        return {"capability": "040", "score": raw_score, "maturity_tier": tier_label}


def main() -> None:
    nodes = [
        HierarchyNode("n-root", None, "Enterprise Root", "root", "Root", "Platform", "r-root", "mg-root", "org-root", ["GR-001 Deny Root Keys"]),
        HierarchyNode("n-sec", "n-root", "Security & Audit", "security", "Security", "Security", "ou-sec", "mg-sec", "fldr-sec", ["GR-004 Audit Sink"], leaf_count=3),
        HierarchyNode("n-plat", "n-root", "Platform Shared", "platform", "Platform", "Platform", "ou-plat", "mg-plat", "fldr-plat", ["GR-006 Hub Egress"], leaf_count=3),
        HierarchyNode("n-prod", "n-plat", "Production", "prod", "Workloads", "Corp", "ou-prod", "mg-prod", "fldr-prod", ["GR-010 Prod Deny"], leaf_count=6, quota_usage_pct=78.0),
        HierarchyNode("n-sbx", "n-root", "Sandbox R&D", "sandbox", "Sandbox", "Sandbox", "ou-sbx", "mg-sbx", "fldr-sbx", ["GR-013 TTL Guard"], leaf_count=2, sleep_schedule_enabled=False),
    ]

    tenants = [
        TenantRequest("payments-prod-01", "pay@org.io", "CC-1001", "n-prod", "Prod", "Dedicated-Per-App-Env", "Tier 0", "PCI-DSS", "eu-west-1", 365, provisioning_minutes=28),
        TenantRequest("ml-sandbox-04", "ml@org.io", "CC-2004", "n-sbx", "Sandbox", "Shared", "Tier 4", "Standard", "us-east-1", 14, provisioning_minutes=8),
        TenantRequest("legacy-retire-02", "ops@org.io", "CC-3002", "n-prod", "Prod", "Dedicated-Per-Env", "Tier 2", "Standard", "eu-west-1", 30, lifecycle_state="Quarantined", snapshot_verified=True, resource_lock_enabled=True, legal_hold_active=False),
    ]

    waivers = [
        WaiverRecord("WAV-01", "GR-006", "net-lead@org.io", "ciso@org.io", True, 5, True),
        WaiverRecord("WAV-02", "GR-010", "app-lead@org.io", "sec-lead@org.io", True, -2, True),
    ]

    engine = Domain1Engine(nodes)
    h_issues = engine.validate_hierarchy()
    inh = engine.simulate_inheritance("n-prod")
    t_results = [engine.evaluate_tenant(t) for t in tenants]
    w_alerts = engine.evaluate_waivers(waivers)
    maturity = engine.maturity_score(h_issues, t_results)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "domain": "Domain 1: Hierarchy, Tenancy & Account/Project Vending (001-050)",
        "hierarchy_issues": h_issues,
        "inheritance_simulation": inh,
        "tenant_evaluations": t_results,
        "waiver_alerts": w_alerts,
        "maturity": maturity,
        "nodes": [asdict(n) for n in nodes],
    }

    with open("domain1_attestation_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("Domain 1 Validation Complete. Report written to domain1_attestation_report.json")
    print(f"Hierarchy issues: {len(h_issues)} | Maturity: {maturity['score']} ({maturity['maturity_tier']})")


if __name__ == "__main__":
    main()