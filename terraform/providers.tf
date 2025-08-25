# providers.tf

provider "google" {
    project = "nuspace-staging"
    credentials = file("terraform.json")
    region = "europe-central2"
    zone = "europe-central2-a"
}
