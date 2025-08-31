# Staging environment variables
credentials_file = "./creds/staging.json"

# Boot disk strategy
use_existing_boot_disk = false
use_boot_snapshot      = false
boot_snapshot_name     = null
boot_disk_size_gb      = 30
boot_disk_type         = "pd-standard"


project_id  = "nuspace-staging"
region      = "europe-central2"
zone        = "europe-central2-a"

vm_name          = "nuspace-instance"
vm_machine_type  = "e2-medium"
vm_instance_tags = ["https-server"]
static_ip_name   = "nuspace-static-ip"

media_bucket_name = "nuspace-media-staging"
logs_bucket_name  = "nuspace-logs-staging"

# Pub/Sub
topic_name          = "gcs-object-created"
subscription_name   = "gcs-object-created-sub"
subscription_suffix = "staging"

# Push subscription
push_endpoint                   = "https://stage.nuspace.kz/api/bucket/gcs-hook"
push_auth_service_account_email = "nuspace-vm-sa@nuspace-staging.iam.gserviceaccount.com"
push_auth_audience              = "https://stage.nuspace.kz"

# Service accounts (IDs)
vm_account_id      = "nuspace-vm-sa"
ansible_account_id = "nuspace-ansible-sa"


media_migration_bucket_name = "nuspace-media"
media_migration_region      = "europe-central2"