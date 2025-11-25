# WireGuard VPN Overview

This doc explains how VPN access to `vpn.nuspace.kz` works today. It is meant to describe the flow, not to duplicate config files.

## Quick Facts
- WireGuard container lives in Docker network `nuspace_nuros` as `172.28.0.10` and serves clients from `10.13.13.0/24`.
- Clients route `0.0.0.0/0` through the tunnel; DNS is Cloudflare `1.1.1.1`.
- The public endpoint is `vpn.nuspace.kz:51820` (Cloudflare DNS, no proxy).
- The container image is linuxserver/wireguard; any executable in `infra/wireguard/hooks/` runs before the tunnel is brought up.

## Traffic Flow
1. Client establishes WireGuard tunnel and receives an address in `10.13.13.0/24`.
2. When the client hits `https://vpn.nuspace.kz`, the hook `hooks/20-wireguard-iptables.sh` DNATs that traffic directly to the `nginx` container inside Docker. The packet never leaves the bridge network, so Cloudflare & GCP firewalls are bypassed.
3. Nginx trusts only `172.28.0.0/24` and `10.13.13.0/24`, so non-VPN requests are denied.
4. Responses travel back through the tunnel; non-portal traffic (e.g., browsing the internet) still goes out via the VM’s public IP because the base image keeps the default `-o eth+ MASQUERADE` rule.

## Firewall & Access Control Snapshot
- GCP allows TCP/80 and TCP/443 only from Cloudflare ranges; UDP/51820 is open to everyone.
- Nginx enforces `allow 172.28.0.0/24` and `allow 10.13.13.0/24` for the `vpn` server block (Grafana/Prometheus/Alloy live behind this).
- Inside WireGuard, the hook performs:
  - DNAT of VPN traffic aimed at the public IP back onto the `nginx` container (ports 80/443).
  - MASQUERADE for Docker → VPN replies so containers can reach users if needed.
  - Removal of any legacy SNAT rules so client source IPs remain 10.13.13.x for nginx logging.

## Operational Notes
- To inspect the tunnel: `docker compose -f infra/prod.docker-compose.yml exec wireguard wg show`.
- To view recent nginx hits (should show 172.28.x or 10.13.x sources): `docker compose -f infra/prod.docker-compose.yml logs --tail=50 nginx`.
- The WireGuard config and peer files live in `infra/wireguard/config/` (mounted read/write into the container).
- Any change to iptables logic should be done in `hooks/20-wireguard-iptables.sh`; remember to `docker compose up -d --force-recreate wireguard` afterward.

## Troubleshooting Checklist
- **Tunnel up?** `wg show` should have recent handshakes and non-zero transfer counters.
- **Portal reachable?** If VPN clients hang on HTTPS, ensure the DNAT rules exist: `iptables -t nat -S PREROUTING | grep 10.13.13` inside the wireguard container.
- **GCP firewall?** Without VPN you should still get 403/timeout—if not, revisit Cloudflare-only rules.
- **Logs?** WireGuard container logs are available via `docker compose logs wireguard` and include hook output during startup.

This summary should give future readers enough context to understand why VPN access is routed internally and what knobs exist when debugging.
