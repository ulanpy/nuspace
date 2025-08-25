# apis.tf

# This block enables the Compute Engine API.
# It is a best practice to add these resources for any APIs
# your infrastructure depends on.
resource "google_project_service" "compute_api" {
  project = "nuspace-staging"
  service = "compute.googleapis.com"

  # This setting ensures the API is NOT disabled if you delete this Terraform resource.
  # This is useful for shared projects where other teams might use the same API.
  disable_on_destroy = false
}

# The Cloud Resource Manager API is required by the google_project_service resource itself.
# This must be enabled for the automation to work.
resource "google_project_service" "cloudresourcemanager_api" {
  project = "nuspace-staging"
  service = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

# The Service Usage API is also required to manage APIs.
resource "google_project_service" "serviceusage_api" {
  project = "nuspace-staging"
  service = "serviceusage.googleapis.com"
  disable_on_destroy = false
}

# Enable the Cloud Storage API so we can manage buckets via Terraform.
resource "google_project_service" "storage_api" {
  project = "nuspace-staging"
  service = "storage.googleapis.com"
  disable_on_destroy = false
}

# Enable the Pub/Sub API for topics/subscriptions.
resource "google_project_service" "pubsub_api" {
  project = "nuspace-staging"
  service = "pubsub.googleapis.com"
  disable_on_destroy = false
}

# Enable the IAM API for service accounts and IAM policies.
resource "google_project_service" "iam_api" {
  project = "nuspace-staging"
  service = "iam.googleapis.com"
  disable_on_destroy = false
}
