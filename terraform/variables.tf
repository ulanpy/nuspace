

variable "push_endpoint" {
  description = "Full HTTPS endpoint for Pub/Sub push (e.g., https://nuspace.kz/api/bucket/gcs-hook)"
  type        = string
}

variable "push_auth_service_account_email" {
  description = "Service account email to sign OIDC tokens for Pub/Sub push (defaults to VM SA)"
  type        = string
}

variable "push_auth_audience" {
  description = "OIDC audience value expected by the receiver"
  type        = string
}

variable "subscription_suffix" {
  description = "Suffix to distinguish subscription names across environments"
  type        = string
}

variable "project_id" {
  description = "Project ID"
  type        = string
}

variable "region" {
  description = "Region"
  type        = string
}

variable "zone" {
  description = "Zone"
  type        = string
}

variable "credentials_file" {
  description = "Path to Google Cloud credentials JSON file"
  type        = string
}

variable "vm_name" {
  description = "VM name"
  type        = string
}

variable "vm_machine_type" {
  description = "VM machine type"
  type        = string
}

variable "vm_instance_tags" {
  description = "Instance tags"
  type        = list(string)
}

variable "static_ip_name" {
  description = "Static IP name"
  type        = string
}

variable "media_bucket_name" {
  description = "Media bucket name. nuspace-media-staging/nuspace-media-production"
  type        = string
}

variable "logs_bucket_name" {
  description = "Logs bucket name. nuspace-logs-staging/nuspace-logs-production"
  type        = string
}

variable "media_migration_bucket_name" {
  description = "Temporary/target media bucket name for migration"
  type        = string
}

variable "media_migration_region" {
  description = "Region for the target media bucket during migration"
  type        = string
}

variable "vm_account_id" {
  description = "VM account ID"
  type        = string
}

variable "ansible_account_id" {
  description = "Ansible account ID"
  type        = string
}

variable "topic_name" {
  description = "Topic name"
  type        = string
}

variable "subscription_name" {
  description = "Subscription name"
  type        = string
}

# Boot disk strategy
variable "use_existing_boot_disk" {
  description = "Use an existing boot disk instead of creating one"
  type        = bool
  default     = false
}

variable "existing_boot_disk_name" {
  description = "Name of the existing boot disk to attach (when use_existing_boot_disk = true)"
  type        = string
  default     = null
}

variable "boot_disk_size_gb" {
  description = "Size of boot disk when creating a new one"
  type        = number
}

variable "boot_disk_type" {
  description = "Type of boot disk when creating a new one"
  type        = string
  default     = "pd-standard"
}

# Snapshot-based boot restoration/migration
variable "use_boot_snapshot" {
  description = "Create boot disk from a snapshot when true (ignores image)"
  type        = bool
  default     = false
}

variable "boot_snapshot_name" {
  description = "Snapshot name to restore from when use_boot_snapshot = true"
  type        = string
  default     = null
}