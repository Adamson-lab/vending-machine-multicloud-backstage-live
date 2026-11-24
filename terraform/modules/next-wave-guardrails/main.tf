terraform {
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
}