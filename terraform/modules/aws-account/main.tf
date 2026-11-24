terraform {
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
  name         = "${var.account_name}-monthly-cap"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
}

output "account_id" { value = aws_organizations_account.vended.id }
output "oidc_provider_arn" { value = aws_iam_openid_connect_provider.github_actions.arn }