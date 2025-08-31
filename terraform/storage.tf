# storage.tf

# Create a regional Cloud Storage bucket for app media/assets.
# Place it in the same region as compute for lower latency and consistency.
resource "google_storage_bucket" "media_bucket" {
  # Ensure the Storage API is enabled first
  depends_on = [google_project_service.storage_api]

  name          = var.media_bucket_name
  location      = var.region  # Co-located with compute (Warsaw)
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

  # CORS configuration for web access
  cors {
    max_age_seconds = 3600
    method = [
      "GET",
      "POST", 
      "PUT",
      "OPTIONS",
    ]
    origin = [
      "*",
    ]
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

# # Target bucket for media migration
# resource "google_storage_bucket" "media_bucket_target" {
#   depends_on = [google_project_service.storage_api]

#   name          = var.media_migration_bucket_name
#   location      = var.media_migration_region
#   storage_class = "STANDARD"

#   uniform_bucket_level_access = true
#   public_access_prevention    = "enforced"

#   force_destroy = false

#   soft_delete_policy {
#     retention_duration_seconds = 604800
#   }

#   cors {
#     max_age_seconds = 3600
#     method = [
#       "GET",
#       "POST",
#       "PUT",
#       "OPTIONS",
#     ]
#     origin = ["*"]
#     response_header = [
#       "x-goog-meta-filename",
#       "x-goog-meta-media-table",
#       "x-goog-meta-entity-id",
#       "x-goog-meta-media-format",
#       "x-goog-meta-media-order",
#       "x-goog-meta-mime-type",
#       "Content-Type",
#     ]
#   }
# }

# Create a regional Cloud Storage bucket for Loki logs.
# Using US-CENTRAL1 to match your existing production setup.
resource "google_storage_bucket" "logs_bucket" {
  # Ensure the Storage API is enabled first
  depends_on = [google_project_service.storage_api]

  name          = var.logs_bucket_name
  location      = "US-CENTRAL1"  # Match existing bucket location
  storage_class = "STANDARD"

  # Keep bucket private with uniform access and prevent public ACLs
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Optional safety: do not allow terraform destroy to purge non-empty bucket
  force_destroy = false

  # Lifecycle rule for log retention (matches existing: 7 days)
  lifecycle_rule {
    condition {
      age = 7  # Delete logs older than 7 days
    }
    action {
      type = "Delete"
    }
  }

  # Soft delete policy (matches existing: no retention)
  soft_delete_policy {
    retention_duration_seconds = 0
  }

  # Hierarchical namespace (disabled for compatibility)
  hierarchical_namespace {
    enabled = false
  }
}
