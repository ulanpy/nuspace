# event_reminder_job.tf
# Cloud Run Job + Cloud Scheduler: send the 24h event reminders due now (#447).
# Every 15 minutes; each attendee is claimed (reminded_at) before the send, so a run never repeats one.
#
# The job reads the same dotenv secret as the VM (nuspace-env), mounted as a file.

data "google_secret_manager_secret" "nuspace_env" {
  secret_id = var.event_reminder_env_secret
  project   = var.project_id
}

resource "google_service_account" "event_reminder_job" {
  depends_on   = [google_project_service.iam_api]
  account_id   = var.event_reminder_job_account_id
  display_name = "Nuspace Event Reminder Job"
  description  = "Runs Cloud Run Job that DMs 24h event reminders on Telegram"
}

resource "google_service_account" "event_reminder_scheduler" {
  depends_on   = [google_project_service.iam_api]
  account_id   = var.event_reminder_scheduler_account_id
  display_name = "Nuspace Event Reminder Scheduler"
  description  = "Cloud Scheduler identity that invokes the event reminder Cloud Run Job"
}

resource "google_secret_manager_secret_iam_member" "event_reminder_job_env_accessor" {
  project   = var.project_id
  secret_id = data.google_secret_manager_secret.nuspace_env.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.event_reminder_job.email}"
}

resource "google_cloud_run_v2_job" "event_reminder" {
  depends_on = [google_project_service.run_api]

  name     = var.event_reminder_job_name
  location = var.region
  project  = var.project_id

  template {
    template {
      service_account = google_service_account.event_reminder_job.email
      timeout         = "600s"
      max_retries     = 0

      volumes {
        name = "env-file"
        secret {
          secret = data.google_secret_manager_secret.nuspace_env.secret_id
          items {
            path    = "nuspace.env"
            version = "latest"
          }
        }
      }

      containers {
        image   = var.event_reminder_job_image
        command = ["/nuros/backend/.venv/bin/python"]
        args = [
          "-m",
          "backend.modules.events.reminder_job",
        ]

        volume_mounts {
          name       = "env-file"
          mount_path = "/secrets"
        }

        env {
          name  = "PYTHONPATH"
          value = "/nuros"
        }
        env {
          name  = "PYTHONUNBUFFERED"
          value = "1"
        }
        env {
          name  = "NUSPACE_ENV_FILE"
          value = "/secrets/nuspace.env"
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

resource "google_cloud_run_v2_job_iam_member" "event_reminder_scheduler_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_job.event_reminder.location
  name     = google_cloud_run_v2_job.event_reminder.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.event_reminder_scheduler.email}"
}

# Allow Ansible / GitHub Actions SA to update job image and execute for cutover
resource "google_cloud_run_v2_job_iam_member" "event_reminder_ansible_developer" {
  project  = var.project_id
  location = google_cloud_run_v2_job.event_reminder.location
  name     = google_cloud_run_v2_job.event_reminder.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

resource "google_service_account_iam_member" "ansible_act_as_event_reminder_job" {
  service_account_id = google_service_account.event_reminder_job.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.ansible_service_account.email}"
}

resource "google_cloud_scheduler_job" "event_reminder" {
  depends_on = [
    google_project_service.cloudscheduler_api,
    google_cloud_run_v2_job_iam_member.event_reminder_scheduler_invoker,
  ]

  name             = "${var.event_reminder_job_name}-every-15m"
  description      = "Send 24h event reminders on Telegram (cron from event_reminder_cron)"
  schedule         = var.event_reminder_cron
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
      google_cloud_run_v2_job.event_reminder.name,
      ":run",
    ])

    oauth_token {
      service_account_email = google_service_account.event_reminder_scheduler.email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }
}
