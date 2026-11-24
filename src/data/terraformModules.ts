export interface TerraformModuleSpec {
  id: string;
  name: string;
  path: string;
  cloud: 'AWS' | 'Azure' | 'GCP' | 'Multicloud';
  providerConstraint: string;
  resources: string[];
  hcl: string;
}

export const TERRAFORM_MODULES: TerraformModuleSpec[] = [
  {
    id: 'aws-account',
    name: 'AWS Account Vending & OIDC Guardrail Module',
    path: 'terraform/modules/aws-account/main.tf',
    cloud: 'AWS',
    providerConstraint: 'hashicorp/aws ~> 5.70',
    resources: ['aws_organizations_account', 'aws_iam_openid_connect_provider', 'aws_budgets_budget'],
    hcl: `terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

variable "account_name" { type = string }
variable "account_email" { type = string }
variable "parent_ou_id" { type = string }
variable "oidc_provider_url" {
  type    = string
  default = "https://token.actions.githubusercontent.com"
}
variable "monthly_budget_usd" {
  type    = number
  default = 1000
}
variable "mandatory_tags" {
  type = map(string)
}

resource "aws_organizations_account" "vended" {
  name                       = var.account_name
  email                      = var.account_email
  parent_id                  = var.parent_ou_id
  iam_user_access_to_billing = "DENY"
  close_on_deletion          = false
  tags                       = var.mandatory_tags
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = var.oidc_provider_url
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_budgets_budget" "guardrail" {
  name         = "\${var.account_name}-monthly-cap"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
}

output "account_id" { value = aws_organizations_account.vended.id }
output "oidc_provider_arn" { value = aws_iam_openid_connect_provider.github_actions.arn }`
  },
  {
    id: 'azure-subscription',
    name: 'Azure Subscription & Management Group Vending Module',
    path: 'terraform/modules/azure-subscription/main.tf',
    cloud: 'Azure',
    providerConstraint: 'hashicorp/azurerm ~> 4.8',
    resources: ['azurerm_subscription', 'azurerm_management_group_subscription_association'],
    hcl: `terraform {
  required_version = ">= 1.6.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.8"
    }
  }
}

variable "subscription_alias" { type = string }
variable "billing_scope_id" { type = string }
variable "management_group_id" { type = string }
variable "monthly_budget_usd" {
  type    = number
  default = 1000
}
variable "tags" {
  type = map(string)
}

resource "azurerm_subscription" "vended" {
  alias             = var.subscription_alias
  subscription_name = var.subscription_alias
  billing_scope_id  = var.billing_scope_id
  workload          = "Production"
  tags              = var.tags
}

resource "azurerm_management_group_subscription_association" "placement" {
  management_group_id = var.management_group_id
  subscription_id     = azurerm_subscription.vended.id
}

output "subscription_id" { value = azurerm_subscription.vended.subscription_id }`
  },
  {
    id: 'gcp-project',
    name: 'GCP Project, Billing & Service Usage Vending Module',
    path: 'terraform/modules/gcp-project/main.tf',
    cloud: 'GCP',
    providerConstraint: 'hashicorp/google ~> 6.8',
    resources: ['google_project', 'google_project_service'],
    hcl: `terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.8"
    }
  }
}

variable "project_id" { type = string }
variable "folder_id" { type = string }
variable "billing_account_id" { type = string }
variable "labels" {
  type = map(string)
}

resource "google_project" "vended" {
  name            = var.project_id
  project_id      = var.project_id
  folder_id       = var.folder_id
  billing_account = var.billing_account_id
  deletion_policy = "PREVENT"
  labels          = var.labels
}

resource "google_project_service" "core_apis" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "cloudbilling.googleapis.com",
    "logging.googleapis.com"
  ])
  project            = google_project.vended.project_id
  service            = each.value
  disable_on_destroy = false
}

output "project_number" { value = google_project.vended.number }`
  },
  {
    id: 'next-wave-guardrails',
    name: 'Next-Wave AI Spend, Sovereignty & TTL Guardrail Module',
    path: 'terraform/modules/next-wave-guardrails/main.tf',
    cloud: 'Multicloud',
    providerConstraint: 'terraform >= 1.6.0',
    resources: ['output.guardrail_policy_summary'],
    hcl: `terraform {
  required_version = ">= 1.6.0"
}

variable "environment_slug" {
  type        = string
  description = "Unique identifier for the vended environment"
}

variable "sovereignty_profile" {
  type        = string
  default     = "Standard"
  description = "Regulatory or regional sovereignty guardrail profile"
}

variable "ai_spend_circuit_breaker_usd" {
  type        = number
  default     = 500
  description = "Monthly AI/GPU spend guardrail threshold in USD"
}

variable "ttl_days" {
  type        = number
  default     = 30
  description = "Environment time-to-live window in days"
}

output "guardrail_policy_summary" {
  description = "Evaluated guardrail baseline metadata for downstream orchestration"
  value = {
    environment_slug             = var.environment_slug
    sovereignty_profile           = var.sovereignty_profile
    ai_spend_circuit_breaker_usd = var.ai_spend_circuit_breaker_usd
    ttl_days                     = var.ttl_days
  }
}`
  }
];