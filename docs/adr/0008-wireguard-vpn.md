# ADR 0008: WireGuard VPN with wg-easy

## Status

Accepted

## Context

The team needed secure access to internal services (SSH, monitoring) without exposing them publicly. A previous headless WireGuard setup was fine for a small team but hard to hand down or scale.

## Decision

Use **wg-easy** (WireGuard with a web UI) for VPN access. The UI is bound to `127.0.0.1` and only reachable via IAP TCP forwarding:

```sh
gcloud compute ssh user@instance --tunnel-through-iap -- -L 51821:127.0.0.1:51821
```

**Access:**
- VPN UI: `vpn.nuspace.kz` (restricted to internal traffic)
- All services: `vpn.nuspace.kz/monitoring`
- SSH: via VPN only (see ADR 0002)

**Why wg-easy over headless WireGuard:**
- UI for managing peers without touching config files
- Easier to onboard new team members
- Underlying WireGuard config is unchanged

## Consequences

- No public attack surface for SSH or monitoring
- Peer management is self-service via UI
- University/corporate networks may block WireGuard — mobile hotspot fallback recommended

## Related

- ADR 0002 (SSH access via VPN)
- ADR 0001 (WIF for CI/CD)
