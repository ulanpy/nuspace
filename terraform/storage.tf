# storage.tf

# Create a regional Cloud Storage bucket for app media/assets.
# Place it in the same region as compute for lower latency and consistency.
resource "google_storage_bucket" "media_bucket" {
  # Ensure the Storage API is enabled first
  depends_on = [google_project_service.storage_api]

  name          = "nuspace-media-staging"
  location      = "europe-central2"  # Co-located with compute (Warsaw)
  storage_class = "STANDARD"

  # Keep bucket private with uniform access and prevent public ACLs
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Optional safety: do not allow terraform destroy to purge non-empty bucket
  force_destroy = false

  # Mirror soft delete behavior (~7 days)
  soft_delete_policy {
    retention_duration_seconds = 604800
  }
}

# Create a regional Cloud Storage bucket for Loki logs.
# Using europe-central2 to match your existing production setup.
resource "google_storage_bucket" "logs_bucket" {
  # Ensure the Storage API is enabled first
  depends_on = [google_project_service.storage_api]

  name          = "nuspace-logs-staging"
  location      = "europe-central2"  # Match production location
  storage_class = "STANDARD"

  # Keep bucket private with uniform access and prevent public ACLs
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Optional safety: do not allow terraform destroy to purge non-empty bucket
  force_destroy = false

  # Lifecycle rule for log retention (optional - adjust as needed)
  lifecycle_rule {
    condition {
      age = 7  # Delete logs older than 30 days
    }
    action {
      type = "Delete"
    }
  }
}
