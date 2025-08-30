# iam.tf

# Create a service account for the VM with bucket access permissions
resource "google_service_account" "vm_service_account" {
  depends_on = [google_project_service.iam_api]
  account_id   = "nuspace-vm-sa"
  display_name = "Nuspace VM Service Account"
  description  = "Service account for VM with bucket access and CORS management permissions"
}



# Grant the VM service account Storage Admin role for bucket management (CORS, policies, etc.)
resource "google_project_iam_member" "storage_admin" {
  project = "nuspace-staging"
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.vm_service_account.email}"
}

# Grant the VM service account Pub/Sub Subscriber role for GCS notifications
resource "google_project_iam_member" "pubsub_subscriber" {
  project = "nuspace-staging"
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.vm_service_account.email}"
}

# Grant the VM service account Pub/Sub Editor role for managing subscriptions
resource "google_project_iam_member" "pubsub_editor" {
  project = "nuspace-staging"
  role    = "roles/pubsub.editor"
  member  = "serviceAccount:${google_service_account.vm_service_account.email}"
}



# Create a service account for Ansible deployment
resource "google_service_account" "ansible_service_account" {
  depends_on = [google_project_service.iam_api]
  account_id   = "nuspace-ansible-sa"
  display_name = "Nuspace Ansible Service Account"
  description  = "Service account for Ansible deployment and VM access"
}

# Create a service account key for Ansible (for authentication)
resource "google_service_account_key" "ansible_key" {
  service_account_id = google_service_account.ansible_service_account.name
}

# Grant the Ansible service account Compute Instance Admin role for VM management
resource "google_project_iam_member" "ansible_compute_instance_admin" {
  project = "nuspace-staging"
  role    = "roles/compute.instanceAdmin.v1"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Grant the Ansible service account Compute Viewer role to read instance details
resource "google_project_iam_member" "ansible_compute_viewer" {
  project = "nuspace-staging"
  role    = "roles/compute.viewer"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Grant the Ansible service account Secret Manager Secret Accessor role
resource "google_project_iam_member" "ansible_secret_accessor" {
  project = "nuspace-staging"
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Grant the Ansible service account Service Account User role to act as other service accounts
resource "google_project_iam_member" "ansible_service_account_user" {
  project = "nuspace-staging"
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Allow Ansible SA to SSH via OS Login with admin privileges
resource "google_project_iam_member" "ansible_os_admin_login" {
  project = "nuspace-staging"
  role    = "roles/compute.osAdminLogin"
  member  = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

# Allow the VM's attached service account to access Secret Manager for secrets access
resource "google_project_iam_member" "vm_secret_accessor" {
  project = "nuspace-staging"
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

# Allow the VM service account to use itself for impersonation
resource "google_service_account_iam_member" "vm_sa_user" {
  service_account_id = google_service_account.vm_service_account.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.vm_service_account.email}"
}
