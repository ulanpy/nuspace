variable "push_endpoint" {
  description = "Full HTTPS endpoint for Pub/Sub push (e.g., https://nuspace.kz/api/bucket/gcs-hook)"
  type        = string
  default     = ""
}

variable "push_auth_service_account_email" {
  description = "Service account email to sign OIDC tokens for Pub/Sub push (defaults to VM SA)"
  type        = string
  default     = ""
}

variable "push_auth_audience" {
  description = "OIDC audience value expected by the receiver"
  type        = string
  default     = ""
}

variable "subscription_suffix" {
  description = "Suffix to distinguish subscription names across environments"
  type        = string
  default     = "staging"
}

