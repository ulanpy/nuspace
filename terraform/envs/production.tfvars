# Production environment variables
credentials_file = "./creds/production.json"


# Boot disk strategy
use_existing_boot_disk  = true
existing_boot_disk_name = "nuspace"


project_id  = "nuspace2025"
region      = "europe-central2"
zone        = "europe-central2-a"

vm_name          = "nuspace-vm-prod"
vm_machine_type  = "e2-medium"
vm_instance_tags = ["https-server"]
static_ip_name   = "nuspace-static-ip-prod"

media_bucket_name = "nuspace"
logs_bucket_name  = "nuspace-logs"

# Pub/Sub
topic_name          = "gcs-object-created"
subscription_name   = "gcs-object-created-sub"
subscription_suffix = "prod"

# Push subscription
push_endpoint                   = "https://nuspace.kz/api/bucket/gcs-hook"
push_auth_service_account_email = "nuspace-vm-sa@nuspace-production.iam.gserviceaccount.com"
push_auth_audience              = "https://nuspace.kz"

# Service accounts (IDs)
vm_account_id      = "nuspace-vm-sa"
ansible_account_id = "nuspace-ansible-sa"

media_migration_bucket_name = "nuspace-media"
media_migration_region      = "europe-central2"