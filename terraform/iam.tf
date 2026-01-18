# iam.tf

# Create a service account for the VM with bucket access permissions
resource "google_service_account" "vm_service_account" {
  depends_on   = [google_project_service.iam_api]
  account_id   = var.vm_account_id
  display_name = "Nuspace VM Service Account"
  description  = "Service account for VM with bucket access and CORS management permissions"
}

resource "google_service_account" "signing_service_account" {
  depends_on   = [google_project_service.iam_api]
  account_id   = var.signing_account_id
  display_name = "Nuspace Signing Service Account"
  description  = "Dedicated service account for signing GCS URLs"
}

locals {
  push_auth_service_account_id = var.push_auth_service_account_email != "" ? "projects/${var.project_id}/serviceAccounts/${var.push_auth_service_account_email}" : google_service_account.vm_service_account.name
}

resource "google_project_iam_member" "signing_service_account_storage_object_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.signing_service_account.email}"
}

resource "google_storage_bucket_iam_member" "signing_service_account_bucket_admin" {
  bucket = google_storage_bucket.media_bucket_target.name
  role   = "roles/storage.legacyBucketOwner"
  member = "serviceAccount:${google_service_account.signing_service_account.email}"
}

resource "google_project_iam_member" "signing_service_account_pubsub_editor" {
  project = var.project_id
  role    = "roles/pubsub.editor"
  member  = "serviceAccount:${google_service_account.signing_service_account.email}"
}

resource "google_service_account_iam_member" "push_auth_token_creator" {
  service_account_id = local.push_auth_service_account_id
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.signing_service_account.email}"
}

resource "google_service_account_iam_member" "push_auth_act_as" {
  service_account_id = local.push_auth_service_account_id
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.signing_service_account.email}"
}

# Grant the VM service account Storage Admin role for bucket management (CORS, policies, etc.)
resource "google_project_iam_member" "storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.vm_service_account.email}"
}

# Grant the VM service account Pub/Sub Subscriber role for GCS notifications
resource "google_project_iam_member" "pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.vm_service_account.email}"
}

# Grant the VM service account Pub/Sub Editor role for managing subscriptions
resource "google_project_iam_member" "pubsub_editor" {
  project = var.project_id
  role    = "roles/pubsub.editor"
  member  = "serviceAccount:${google_service_account.vm_service_account.email}"
}



# Create a service account for Ansible deployment
resource "google_service_account" "ansible_service_account" {
  depends_on = [google_project_service.iam_api]
  account_id   = var.ansible_account_id
  display_name = "Nuspace Ansible Service Account"
  description  = "Service account for Ansible deployment and VM access"
}

# Workload Identity Federation for GitHub Actions
# Create a Workload Identity Pool
resource "google_iam_workload_identity_pool" "github_pool" {
  depends_on = [
    google_project_service.iam_api,
    google_project_service.iamcredentials_api,
    google_project_service.sts_api
  ]
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions Pool"
  description               = "OIDC pool for GitHub Actions"
}

# Create a Workload Identity Provider for GitHub OIDC
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC Provider"
  description                        = "Trusts tokens from token.actions.githubusercontent.com"
  attribute_mapping = {
    "google.subject"            = "assertion.sub"
    "attribute.repository"      = "assertion.repository"
    "attribute.repository_owner"= "assertion.repository_owner"
    "attribute.ref"             = "assertion.ref"
    "attribute.actor"           = "assertion.actor"
    "attribute.workflow"        = "assertion.workflow"
  }

  attribute_condition = format(
    "attribute.repository == '%s' && (%s)",
    var.github_repository,
    join(" || ", [for b in var.github_branches : format("attribute.ref == 'refs/heads/%s'", b)])
  )

  oidc {
    issuer_uri        = "https://token.actions.githubusercontent.com"
  }
}

# Allow identities from the provider to impersonate the Ansible service account.
# Restrict to this repository and branches.
resource "google_service_account_iam_member" "ansible_wif_binding" {
  service_account_id = google_service_account.ansible_service_account.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/${var.github_repository}"
}

# Grant the Ansible service account Compute Instance Admin role for VM management
resource "google_project_iam_member" "ansible_compute_instance_admin" {
  project = var.project_id
  role    = "roles/compute.instanceAdmin.v1"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Grant the Ansible service account Compute Viewer role to read instance details
resource "google_project_iam_member" "ansible_compute_viewer" {
  project = var.project_id
  role    = "roles/compute.viewer"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Grant the Ansible service account Secret Manager Secret Accessor role
resource "google_project_iam_member" "ansible_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Grant the Ansible service account Service Account User role to act as other service accounts
resource "google_project_iam_member" "ansible_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Allow Ansible SA to SSH via OS Login with admin privileges
resource "google_project_iam_member" "ansible_os_admin_login" {
  project = var.project_id
  role    = "roles/compute.osAdminLogin"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Allow Ansible SA to use IAP TCP forwarding for SSH.
# This is the auth side of IAP SSH (gcloud --tunnel-through-iap).
resource "google_project_iam_member" "ansible_iap_tunnel" {
  project = var.project_id
  role    = "roles/iap.tunnelResourceAccessor"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Allow the VM's attached service account to access Secret Manager for secrets access
resource "google_project_iam_member" "vm_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.vm_service_account.email}"
}

# Allow Pub/Sub service agent to sign OIDC tokens for the VM service account
data "google_project" "current" {}

resource "google_service_account_iam_member" "push_sa_token_creator" {
  service_account_id = google_service_account.vm_service_account.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Allow the VM service account to impersonate itself for signed URL generation
resource "google_service_account_iam_member" "vm_sa_token_creator" {
  service_account_id = google_service_account.vm_service_account.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.vm_service_account.email}"
}

# Allow the VM service account to act as the push auth service account (self in this setup)
resource "google_service_account_iam_member" "vm_sa_act_as_self" {
  service_account_id = google_service_account.vm_service_account.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.vm_service_account.email}"
}

resource "google_service_account_key" "signing_service_account_key" {
  service_account_id = google_service_account.signing_service_account.name
}
