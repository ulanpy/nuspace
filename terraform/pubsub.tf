# pubsub.tf

# Pub/Sub topic for GCS object creation notifications
resource "google_pubsub_topic" "gcs_object_created" {
  depends_on = [google_project_service.pubsub_api]
  name       = var.topic_name
}

# Get the GCS service account that will publish notifications
# This service account is automatically created when you first use Cloud Storage
data "google_storage_project_service_account" "gcs_account" {
  project = var.project_id
}

# Allow Cloud Storage to publish to the topic
# GCS publishes as the service account from the data source
resource "google_pubsub_topic_iam_member" "gcs_can_publish" {
  depends_on = [google_project_service.iam_api]
  topic = google_pubsub_topic.gcs_object_created.name
  role  = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
}

# Configure the bucket to publish OBJECT_FINALIZE events to the topic
resource "google_storage_notification" "bucket_object_finalize" {
  depends_on     = [google_pubsub_topic_iam_member.gcs_can_publish]
  bucket         = google_storage_bucket.media_bucket.name
  topic          = google_pubsub_topic.gcs_object_created.id
  payload_format = "JSON_API_V1"
  event_types    = ["OBJECT_FINALIZE"]
}

# Optional: Manage the push subscription via Terraform to avoid runtime creation
resource "google_pubsub_subscription" "gcs_object_created_push" {
  name  = "${var.subscription_name}-${var.subscription_suffix}"
  topic = google_pubsub_topic.gcs_object_created.name

  depends_on = [
    google_project_service.pubsub_api,
    google_service_account_iam_member.push_sa_token_creator
  ]

  push_config {
    push_endpoint = var.push_endpoint
    oidc_token {
      service_account_email = var.push_auth_service_account_email != "" ? var.push_auth_service_account_email : google_service_account.vm_service_account.email
      audience              = var.push_auth_audience
    }
  }
}
