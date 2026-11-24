terraform {
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

output "project_number" { value = google_project.vended.number }