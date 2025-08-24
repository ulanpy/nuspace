# compute.tf

# Reserve a static public IP address in the specified region.
resource "google_compute_address" "static_ip" {
  # We make sure this resource depends on the Compute API being enabled first.
  depends_on = [google_project_service.compute_api]
  
  # Give the static IP a meaningful name
  name   = "nuspace-static-ip"
  # It needs to be in the same region as the VM.
  region = "europe-central2"
}

# Create the VM instance and attach the static IP.
resource "google_compute_instance" "vm_instance" {
  # We make sure this resource depends on the Compute API being enabled first.
  depends_on = [google_project_service.compute_api]

  name         = "nuspace-instance"
  machine_type = "e2-medium"
  zone         = "europe-central2-a"
  allow_stopping_for_update = true

  # Attach the service account to the VM for automatic authentication
  service_account {
    email  = google_service_account.vm_service_account.email
    scopes = ["cloud-platform"]
  }

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
    }
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

  tags = ["https-server"]

  # Scheduling configuration
  scheduling {
    automatic_restart   = true
    on_host_maintenance = "MIGRATE"
  }
}
