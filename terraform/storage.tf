# storage.tf


# Target bucket for media migration. media_bucket_target is the legacy name for the bucket.
resource "google_storage_bucket" "media_bucket_target" {
  depends_on = [google_project_service.storage_api]

  name          = var.media_bucket_name
  location      = var.media_migration_region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  force_destroy = false

  soft_delete_policy {
    retention_duration_seconds = 604800
  }

  cors {
    max_age_seconds = 3600
    method = [
      "GET",
      "POST",
      "PUT",
      "OPTIONS",
    ]
    origin = ["*"]
    response_header = [
      "x-goog-meta-filename",
      "x-goog-meta-media-table",
      "x-goog-meta-entity-id",
      "x-goog-meta-media-format",
      "x-goog-meta-media-order",
      "x-goog-meta-mime-type",
      "Content-Type",
    ]
  }
}
