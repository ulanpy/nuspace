# iam.tf

# Create a service account for the VM with bucket access permissions
resource "google_service_account" "vm_service_account" {
  depends_on = [google_project_service.iam_api]
  account_id   = "nuspace-vm-sa"
  display_name = "Nuspace VM Service Account"
  description  = "Service account for VM with bucket access and CORS management permissions"
}

# Create a service account for Loki with logs bucket access
resource "google_service_account" "loki_service_account" {
  depends_on = [google_project_service.iam_api]
  account_id   = "nuspace-loki-sa"
  display_name = "Nuspace Loki Service Account"
  description  = "Service account for Loki with logs bucket access permissions"
}

# Create a service account key for Loki (for use in Docker Compose)
resource "google_service_account_key" "loki_key" {
  service_account_id = google_service_account.loki_service_account.name
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

# Grant the Loki service account Storage Object Admin role for logs bucket access
resource "google_project_iam_member" "loki_storage_object_admin" {
  project = "nuspace-staging"
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.loki_service_account.email}"
}
