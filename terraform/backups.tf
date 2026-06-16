locals {
  backup_bucket_location = coalesce(var.backup_bucket_region, var.region)
}

resource "google_storage_bucket" "backups" {
  depends_on = [google_project_service.storage_api]

  name          = var.backups_bucket_name
  location      = local.backup_bucket_location
  storage_class = "STANDARD"

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  soft_delete_policy {
    retention_duration_seconds = 604800 # 7 days
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}
