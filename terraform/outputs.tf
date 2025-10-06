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

output "signing_service_account_email" {
  value       = google_service_account.signing_service_account.email
  description = "Email of the signing service account"
}

output "signing_service_account_key_json" {
  value = jsonencode({
    type                        = "service_account"
    project_id                  = var.project_id
    private_key_id              = reverse(split("/", google_service_account_key.signing_service_account_key.name))[0]
    private_key                 = replace(base64decode(google_service_account_key.signing_service_account_key.private_key), "\n", "\\n")
    client_email                = google_service_account.signing_service_account.email
    client_id                   = google_service_account.signing_service_account.unique_id
    auth_uri                    = "https://accounts.google.com/o/oauth2/auth"
    token_uri                   = "https://oauth2.googleapis.com/token"
    auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
    client_x509_cert_url        = "https://www.googleapis.com/robot/v1/metadata/x509/${google_service_account.signing_service_account.email}"
    universe_domain             = "googleapis.com"
  })
  sensitive   = true
  description = "Service account key JSON for signing service account"
}

output "project_number" {
  value       = data.google_project.current.number
  description = "Project number"
}

# WIF pool and provider resource names
output "wif_pool_name" {
  value       = google_iam_workload_identity_pool.github_pool.name
  description = "Full resource name of the WIF pool"
}

output "wif_provider_name" {
  value       = google_iam_workload_identity_pool_provider.github_provider.name
  description = "Full resource name of the WIF provider"
}
