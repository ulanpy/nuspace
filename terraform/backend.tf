terraform {
  backend "gcs" {
    # bucket and credentials configured via -backend-config during init
    prefix      = "infra"
  }
}