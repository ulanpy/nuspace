# channel_poll_job.tf
# Cloud Run Job + Cloud Scheduler: poll t.me/s/<channel> daily → append to telegram/<channel>/result.json in GCS.
# The job never touches Postgres or Meilisearch. FastAPI re-indexes a channel on GCS OBJECT_FINALIZE
# (Pub/Sub → /gcs-hook), as for the schedule catalogue. Reuses the APIs enabled in schedule_sync_job.tf.

resource "google_service_account" "channel_poll_job" {
  depends_on   = [google_project_service.iam_api]
  account_id   = var.channel_poll_job_account_id
  display_name = "Nuspace Channel Poll Job"
  description  = "Runs Cloud Run Job that polls Telegram channel previews and writes JSON to GCS"
}

resource "google_service_account" "channel_poll_scheduler" {
  depends_on   = [google_project_service.iam_api]
  account_id   = var.channel_poll_scheduler_account_id
  display_name = "Nuspace Channel Poll Scheduler"
  description  = "Cloud Scheduler identity that invokes the channel-poll Cloud Run Job"
}

# Job SA: read and write telegram/ objects in the media bucket
resource "google_storage_bucket_iam_member" "channel_poll_job_object_admin" {
  bucket = google_storage_bucket.media_bucket_target.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.channel_poll_job.email}"
}

resource "google_cloud_run_v2_job" "channel_poll" {
  depends_on = [google_project_service.run_api]

  name     = var.channel_poll_job_name
  location = var.region
  project  = var.project_id

  template {
    template {
      service_account = google_service_account.channel_poll_job.email
      timeout         = "900s"
      max_retries     = 1

      containers {
        image   = var.channel_poll_job_image
        command = ["/nuros/backend/.venv/bin/python"]
        args = [
          "-m",
          "backend.modules.search.channel_poll_job",
        ]

        env {
          name  = "PYTHONPATH"
          value = "/nuros"
        }
        env {
          name  = "PYTHONUNBUFFERED"
          value = "1"
        }
        env {
          name  = "BUCKET_NAME"
          value = var.media_bucket_name
        }
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }
        env {
          name  = "TELEGRAM_POLL_CHANNELS"
          value = var.telegram_poll_channels
        }
        # A page the parser cannot read alerts this chat (same bot as Grafana alerts).
        env {
          name  = "TELEGRAM_BOT_TOKEN"
          value = var.telegram_alert_bot_token
        }
        env {
          name  = "TELEGRAM_CHAT_ID"
          value = var.telegram_alert_chat_id
        }

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }
    }
  }

  lifecycle {
    # CI updates the image tag after each backend deploy; Terraform owns the rest.
    ignore_changes = [
      template[0].template[0].containers[0].image,
    ]
  }
}

resource "google_cloud_run_v2_job_iam_member" "channel_poll_scheduler_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_job.channel_poll.location
  name     = google_cloud_run_v2_job.channel_poll.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.channel_poll_scheduler.email}"
}

resource "google_cloud_run_v2_job_iam_member" "channel_poll_ansible_developer" {
  project  = var.project_id
  location = google_cloud_run_v2_job.channel_poll.location
  name     = google_cloud_run_v2_job.channel_poll.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

resource "google_service_account_iam_member" "ansible_act_as_channel_poll_job" {
  service_account_id = google_service_account.channel_poll_job.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

resource "google_cloud_scheduler_job" "channel_poll_daily" {
  depends_on = [
    google_project_service.cloudscheduler_api,
    google_cloud_run_v2_job_iam_member.channel_poll_scheduler_invoker,
  ]

  name             = "${var.channel_poll_job_name}-daily"
  description      = "Poll Telegram channel previews and append new posts to GCS (cron from channel_poll_cron)"
  schedule         = var.channel_poll_cron
  time_zone        = "UTC"
  attempt_deadline = "320s"
  region           = var.region
  project          = var.project_id

  http_target {
    http_method = "POST"
    uri = join("", [
      "https://",
      var.region,
      "-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/",
      var.project_id,
      "/jobs/",
      google_cloud_run_v2_job.channel_poll.name,
      ":run",
    ])

    oauth_token {
      service_account_email = google_service_account.channel_poll_scheduler.email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }
}
