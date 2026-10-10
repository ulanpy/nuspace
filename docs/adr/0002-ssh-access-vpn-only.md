# ADR 0002: SSH Access Only Through WireGuard VPN

## Status

Accepted

## Context

The staging and production VMs need SSH access for debugging and administration. Public SSH access is a common attack vector.

## Decision

SSH is only exposed through the WireGuard VPN. Public TCP/22 is blocked at the firewall layer. Operators must connect to the VPN first, then SSH to the VM's internal IP. OS Login is required for authentication.

## Consequences

- **No public attack surface**: The public IP does not accept TCP/22.
- **Network-level restriction**: GCP firewall rules limit SSH to the WireGuard client subnet (`wireguard_subnet_cidr` in Terraform).
- **OS Login required**: SSH uses OS Login for identity, not local accounts.
- **Operator workflow**: Connect to VPN → resolve VM internal IP → `gcloud compute ssh --tunnel-through-iap` or direct SSH.

## Related

- CI/CD uses IAP TCP forwarding to reach VMs without VPN (see ADR-0001).
