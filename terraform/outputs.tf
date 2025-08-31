# outputs.tf

# An output block makes it easy to find the IP address after Terraform applies the changes.
output "vm_public_ip" {
  value = google_compute_address.static_ip.address
}

# Convenient outputs for the newly created bucket
output "media_bucket_name" {
  value = google_storage_bucket.media_bucket_target.name
}

output "media_bucket_url" {
  value = format("gs://%s", google_storage_bucket.media_bucket_target.name)
}

# Service account information
output "vm_service_account_email" {
  value = google_service_account.vm_service_account.email
  description = "Email of the service account attached to the VM"
}

# Logs bucket information
output "logs_bucket_name" {
  value = google_storage_bucket.logs_bucket.name
  description = "Name of the logs bucket"
}

output "logs_bucket_url" {
  value = format("gs://%s", google_storage_bucket.logs_bucket.name)
  description = "URL of the logs bucket"
}

# Ansible service account information
output "ansible_service_account_email" {
  value = google_service_account.ansible_service_account.email
  description = "Email of the Ansible service account"
}

# Ansible service account key (base64 encoded)
output "ansible_service_account_key" {
  value = google_service_account_key.ansible_key.private_key
  description = "Base64 encoded private key for the Ansible service account"
  sensitive = true
}
