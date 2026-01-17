# SSH Access (VPN Only)

This project exposes SSH only through the WireGuard VPN. Public SSH access is
disabled at the firewall layer.

## What this means
- You must be connected to the VPN to reach SSH.
- SSH is allowed only from the WireGuard client subnet.
- Use the VM internal IP address for SSH (not the public IP).
- OS Login is required for SSH access.

## Why this is safe
- The public IP does not accept TCP/22.
- Access is restricted by GCP firewall rules to the VPN subnet only.

## Operator notes
- The VPN client subnet is defined in Terraform as `wireguard_subnet_cidr`.
- The VM internal IP can be obtained from `gcloud compute instances describe`.
