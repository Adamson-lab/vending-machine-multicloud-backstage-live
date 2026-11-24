terraform {
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

output "subscription_id" { value = azurerm_subscription.vended.subscription_id }