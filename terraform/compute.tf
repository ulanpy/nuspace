# compute.tf

# Reserve a static public IP address in the specified region.
resource "google_compute_address" "static_ip" {
  # We make sure this resource depends on the Compute API being enabled first.
  depends_on = [google_project_service.compute_api]
  
  # Give the static IP a meaningful name
  name   = var.static_ip_name
  # It needs to be in the same region as the VM.
  region = var.region
}

# Create the VM instance and attach the static IP.
resource "google_compute_instance" "vm_instance" {
  # We make sure this resource depends on the Compute API being enabled first.
  depends_on = [google_project_service.compute_api]

  name         = var.vm_name
  machine_type = var.vm_machine_type
  zone         = var.zone
  allow_stopping_for_update = true

  # Attach the service account to the VM for automatic authentication
  service_account {
    email  = google_service_account.vm_service_account.email
    scopes = ["cloud-platform"]
  }

  boot_disk {
    source      = var.use_existing_boot_disk ? data.google_compute_disk.existing_boot[0].self_link : (var.use_boot_snapshot ? google_compute_disk.from_snapshot[0].self_link : google_compute_disk.new_boot[0].self_link)
    auto_delete = var.use_existing_boot_disk ? false : true
    interface   = "SCSI"
  }

  network_interface {
    network = "default"
    # Attach the static IP address to the VM's network interface.
    # We get the IP address from the "static_ip" resource we just created.
    access_config {
      nat_ip = google_compute_address.static_ip.address
    }
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  tags = var.vm_instance_tags

  # Scheduling configuration
  scheduling {
    automatic_restart   = true
    on_host_maintenance = "MIGRATE"
  }
}
# Lookup existing disk (when reusing)
data "google_compute_disk" "existing_boot" {
  count = var.use_existing_boot_disk ? 1 : 0
  name  = var.existing_boot_disk_name
  zone  = var.zone
}

# Create new boot disk (when not reusing)
resource "google_compute_disk" "new_boot" {
  count = (var.use_existing_boot_disk || var.use_boot_snapshot) ? 0 : 1
  name  = "${var.vm_name}-boot"
  zone  = var.zone
  size  = var.boot_disk_size_gb
  type  = var.boot_disk_type
  image = "debian-cloud/debian-12"
}

# Create boot disk from a snapshot (when requested)
resource "google_compute_disk" "from_snapshot" {
  count           = var.use_boot_snapshot && !var.use_existing_boot_disk ? 1 : 0
  name            = "${var.vm_name}-boot"
  zone            = var.zone
  type            = var.boot_disk_type
  size            = var.boot_disk_size_gb
  snapshot        = "projects/${var.project_id}/global/snapshots/${var.boot_snapshot_name}"
}

# Cloudflare IPv4 ranges - https://www.cloudflare.com/ips-v4
locals {
  cloudflare_ipv4_ranges = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]

  cloudflare_ipv6_ranges = [
    "2400:cb00::/32",
    "2606:4700::/32",
    "2803:f800::/32",
    "2405:b500::/32",
    "2405:8100::/32",
    "2a06:98c0::/29",
    "2c0f:f248::/32",
  ]

}

# Firewall rule to allow HTTP traffic from Cloudflare only
resource "google_compute_firewall" "allow_http" {
  name    = "allow-http-ingress"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = local.cloudflare_ipv4_ranges
  target_tags   = var.vm_instance_tags
}

# Firewall rule to allow HTTPS traffic from Cloudflare only
resource "google_compute_firewall" "allow_https" {
  name    = "allow-https-ingress"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = local.cloudflare_ipv4_ranges
  target_tags   = var.vm_instance_tags
}

# Firewall rule to allow ICMP from Cloudflare only
resource "google_compute_firewall" "allow_icmp" {
  name    = "allow-icmp-ingress"
  network = "default"

  allow {
    protocol = "icmp"
  }

  source_ranges = local.cloudflare_ipv4_ranges
  target_tags   = var.vm_instance_tags
}

# IPv6 firewall rules for Cloudflare
resource "google_compute_firewall" "allow_http_ipv6" {
  name    = "allow-http-ingress-ipv6"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = concat(local.cloudflare_ipv6_ranges)
  target_tags   = var.vm_instance_tags
}

resource "google_compute_firewall" "allow_https_ipv6" {
  name    = "allow-https-ingress-ipv6"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = concat(local.cloudflare_ipv6_ranges)
  target_tags   = var.vm_instance_tags
}
