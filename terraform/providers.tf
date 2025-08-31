# providers.tf

provider "google" {
    project = var.project_id
    credentials = file(var.credentials_file)
    region = var.region
    zone = var.zone
}
