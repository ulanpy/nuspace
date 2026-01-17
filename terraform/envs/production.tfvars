# Production environment variables
credentials_file = "./creds/production.json"


# Boot disk strategy
use_existing_boot_disk  = true
existing_boot_disk_name = "nuspace-instance-boot"
use_boot_snapshot       = false
boot_snapshot_name      = "nuspace-boot-20250901-0012"
boot_disk_size_gb       = 30

project_id  = "nuspace2025"
region      = "europe-central2"
zone        = "europe-central2-a"

vm_name          = "nuspace-instance"
vm_machine_type  = "e2-medium"
vm_instance_tags = ["https-server"]
static_ip_name   = "nuspace-static-ip"

media_bucket_name = "nuspace-media"
logs_bucket_name  = "nuspace-logs"

# Pub/Sub
topic_name          = "gcs-object-created"
subscription_name   = "gcs-object-created-sub"
subscription_suffix = "prod"

# Push subscription
push_endpoint                   = "https://nuspace.kz/api/bucket/gcs-hook"
push_auth_service_account_email = "nuspace-vm-sa@nuspace2025.iam.gserviceaccount.com"
push_auth_audience              = "nuspace"

# Service accounts (IDs)
vm_account_id      = "nuspace-vm-sa"
ansible_account_id = "nuspace-ansible-sa"
signing_account_id = "nuspace-signing-sa"

media_migration_region      = "europe-central2"

# WIF: GitHub repo allowed to impersonate (format: owner/repo)
github_repository = "ulanpy/nuspace"