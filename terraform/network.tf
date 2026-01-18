resource "google_compute_network" "main" {
  name                    = var.network_name
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = var.subnetwork_name
  ip_cidr_range = var.subnetwork_cidr
  region        = var.region
  network       = google_compute_network.main.id
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
  network = google_compute_network.main.name

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
  network = google_compute_network.main.name

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
  network = google_compute_network.main.name

  allow {
    protocol = "icmp"
  }

  source_ranges = local.cloudflare_ipv4_ranges
  target_tags   = var.vm_instance_tags
}

# IPv6 firewall rules for Cloudflare
resource "google_compute_firewall" "allow_http_ipv6" {
  name    = "allow-http-ingress-ipv6"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = concat(local.cloudflare_ipv6_ranges)
  target_tags   = var.vm_instance_tags
}

resource "google_compute_firewall" "allow_https_ipv6" {
  name    = "allow-https-ingress-ipv6"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = concat(local.cloudflare_ipv6_ranges)
  target_tags   = var.vm_instance_tags
}

# Firewall rule to allow WireGuard VPN traffic (UDP 51820) from clients
resource "google_compute_firewall" "allow_wireguard" {
  name    = "allow-wireguard-ingress"
  network = google_compute_network.main.name

  allow {
    protocol = "udp"
    ports    = ["51820"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = var.vm_instance_tags
}

# Default-like rules for basic access (SSH/ICMP/internal)
resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh-ingress"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = [var.wireguard_subnet_cidr]
}

# Allow SSH via IAP only (no public 22).
# Source range is fixed by Google for IAP TCP forwarding.
resource "google_compute_firewall" "allow_ssh_iap" {
  name    = "allow-ssh-iap-ingress"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = var.vm_instance_tags
}

resource "google_compute_firewall" "allow_icmp_any" {
  name    = "allow-icmp-ingress-any"
  network = google_compute_network.main.name

  allow {
    protocol = "icmp"
  }

  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [var.subnetwork_cidr]
}
