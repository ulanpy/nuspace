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
    source      = var.use_existing_boot_disk ? data.google_compute_disk.existing_boot[0].self_link : google_compute_disk.new_boot[0].self_link
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
  count = var.use_existing_boot_disk ? 0 : 1
  name  = "${var.vm_name}-boot"
  zone  = var.zone
  size  = var.boot_disk_size_gb
  type  = var.boot_disk_type
  image = "debian-cloud/debian-12"
}

# Firewall rule to allow HTTP traffic
resource "google_compute_firewall" "allow_http" {
  name    = "allow-http-ingress"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = var.vm_instance_tags
}

# Firewall rule to allow HTTPS traffic
resource "google_compute_firewall" "allow_https" {
  name    = "allow-https-ingress"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = var.vm_instance_tags
}

# Optional: Firewall rule to allow ICMP (ping) for debugging
resource "google_compute_firewall" "allow_icmp" {
  name    = "allow-icmp-ingress"
  network = "default"

  allow {
    protocol = "icmp"
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = var.vm_instance_tags
}
