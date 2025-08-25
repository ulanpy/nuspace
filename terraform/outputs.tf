# outputs.tf

# An output block makes it easy to find the IP address after Terraform applies the changes.
output "vm_public_ip" {
  value = google_compute_address.static_ip.address
}

# Convenient outputs for the newly created bucket
output "media_bucket_name" {
  value = google_storage_bucket.media_bucket.name
}

output "media_bucket_url" {
  value = format("gs://%s", google_storage_bucket.media_bucket.name)
}

# Service account information
output "vm_service_account_email" {
  value = google_service_account.vm_service_account.email
  description = "Email of the service account attached to the VM"
}

# Logs bucket information
output "logs_bucket_name" {
  value = google_storage_bucket.logs_bucket.name
  description = "Name of the logs bucket for Loki"
}

output "logs_bucket_url" {
  value = format("gs://%s", google_storage_bucket.logs_bucket.name)
  description = "URL of the logs bucket for Loki"
}

# Loki service account information
output "loki_service_account_email" {
  value = google_service_account.loki_service_account.email
  description = "Email of the Loki service account"
}

# Loki service account key (base64 encoded)
output "loki_service_account_key" {
  value = google_service_account_key.loki_key.private_key
  description = "Base64 encoded private key for the Loki service account"
  sensitive = true
}
