# schedule_sync_job.tf
# Cloud Run Job + Cloud Scheduler: parse registrar PDFs → GCS JSON.
# FastAPI pulls the artifact into Meilisearch on GCS OBJECT_FINALIZE (Pub/Sub → /gcs-hook).
#
# Note: Cloud Scheduler no longer requires an App Engine app when region is set.

resource "google_project_service" "run_api" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudscheduler_api" {
  project            = var.project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_service_account" "schedule_sync_job" {
  depends_on   = [google_project_service.iam_api]
  account_id   = var.schedule_sync_job_account_id
  display_name = "Nuspace Schedule Sync Job"
  description  = "Runs Cloud Run Job that parses registrar PDFs and writes JSON to GCS"
}

resource "google_service_account" "schedule_sync_scheduler" {
  depends_on   = [google_project_service.iam_api]
  account_id   = var.schedule_sync_scheduler_account_id
  display_name = "Nuspace Schedule Sync Scheduler"
  description  = "Cloud Scheduler identity that invokes the schedule-sync Cloud Run Job"
}

# Job SA: write schedule artifacts under registrar/ in the media bucket
resource "google_storage_bucket_iam_member" "schedule_sync_job_object_admin" {
  bucket = google_storage_bucket.media_bucket_target.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.schedule_sync_job.email}"
}

resource "google_cloud_run_v2_job" "schedule_sync" {
  depends_on = [google_project_service.run_api]

  name     = var.schedule_sync_job_name
  location = var.region
  project  = var.project_id

  template {
    template {
      service_account = google_service_account.schedule_sync_job.email
      timeout         = "3600s"
      max_retries     = 1

      containers {
        image   = var.schedule_sync_job_image
        # Bypass start.sh (API server / Config). Job only needs GCS + egress.
        command = ["/nuros/backend/.venv/bin/python"]
        args = [
          "-m",
          "backend.modules.courses.registrar.schedule_sync_job",
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
          name  = "SCHEDULE_SYNC_GCS_OBJECT"
          value = "registrar/course_schedule_catalog.json"
        }
        env {
          name  = "SCHEDULE_SYNC_GCS_META_OBJECT"
          value = "registrar/meta.json"
        }

        resources {
          limits = {
            cpu    = "2"
            memory = "2Gi"
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

resource "google_cloud_run_v2_job_iam_member" "schedule_sync_scheduler_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_job.schedule_sync.location
  name     = google_cloud_run_v2_job.schedule_sync.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.schedule_sync_scheduler.email}"
}

# Allow Ansible / GitHub Actions SA to update job image and execute for cutover
resource "google_cloud_run_v2_job_iam_member" "schedule_sync_ansible_developer" {
  project  = var.project_id
  location = google_cloud_run_v2_job.schedule_sync.location
  name     = google_cloud_run_v2_job.schedule_sync.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

resource "google_service_account_iam_member" "ansible_act_as_schedule_sync_job" {
  service_account_id = google_service_account.schedule_sync_job.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

resource "google_cloud_scheduler_job" "schedule_sync_daily" {
  depends_on = [
    google_project_service.cloudscheduler_api,
    google_cloud_run_v2_job_iam_member.schedule_sync_scheduler_invoker,
  ]

  name             = "${var.schedule_sync_job_name}-daily"
  description      = "Parse registrar schedule PDFs and upload JSON to GCS (cron from schedule_sync_cron)"
  schedule         = var.schedule_sync_cron
  time_zone        = "UTC"
  # Must exceed Cloud Run Job wall time (parse ~1–2m); Scheduler waits for HTTP :run accept only,
  # but keep headroom for API latency.
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
      google_cloud_run_v2_job.schedule_sync.name,
      ":run",
    ])

    oauth_token {
      service_account_email = google_service_account.schedule_sync_scheduler.email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }
}
