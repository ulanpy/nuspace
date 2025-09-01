# apis.tf

# This block enables the Compute Engine API.
# It is a best practice to add these resources for any APIs
# your infrastructure depends on.
resource "google_project_service" "compute_api" {
  project = var.project_id
  service = "compute.googleapis.com"

  # This setting ensures the API is NOT disabled if you delete this Terraform resource.
  # This is useful for shared projects where other teams might use the same API.
  disable_on_destroy = false
}

# The Cloud Resource Manager API is required by the google_project_service resource itself.
# This must be enabled for the automation to work.
resource "google_project_service" "cloudresourcemanager_api" {
  project = var.project_id
  service = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

# The Service Usage API is also required to manage APIs.
resource "google_project_service" "serviceusage_api" {
  project = var.project_id
  service = "serviceusage.googleapis.com"
  disable_on_destroy = false
}

# Enable the Cloud Storage API so we can manage buckets via Terraform.
resource "google_project_service" "storage_api" {
  project = var.project_id
  service = "storage.googleapis.com"
  disable_on_destroy = false
}

# Enable the Pub/Sub API for topics/subscriptions.
resource "google_project_service" "pubsub_api" {
  project = var.project_id
  service = "pubsub.googleapis.com"
  disable_on_destroy = false
}

# Enable the IAM API for service accounts and IAM policies.
resource "google_project_service" "iam_api" {
  project = var.project_id
  service = "iam.googleapis.com"
  disable_on_destroy = false
}

# Enable the Secret Manager API for managing secrets.
resource "google_project_service" "secretmanager_api" {
  project = var.project_id
  service = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# Enable the IAM Credentials API (needed for service account impersonation)
resource "google_project_service" "iamcredentials_api" {
  project            = var.project_id
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

# Enable the Security Token Service API (needed for Workload Identity Federation)
resource "google_project_service" "sts_api" {
  project            = var.project_id
  service            = "sts.googleapis.com"
  disable_on_destroy = false
}

# Enable the OS Login API for OS Login-based SSH access
resource "google_project_service" "oslogin_api" {
  project            = var.project_id
  service            = "oslogin.googleapis.com"
  disable_on_destroy = false
}
