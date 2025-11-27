# VPN HTTPS Timeout – Incident Notes

## 1. Summary

Desktop clients on Arch Linux could establish the WireGuard tunnel (`wg0`), route Internet traffic, and reach `http://vpn.nuspace.kz`, but any HTTPS request (`https://vpn.nuspace.kz`, Grafana, etc.) timed out during TLS handshake. iOS clients worked fine. Root cause: MTU/MSS mismatch in the hairpin path (client → WireGuard → host → Docker nginx). TLS records were larger than the effective path MTU, resulting in dropped TCP segments and a stalled handshake. Setting `MTU = 1320` on the client (or clamping MSS on the server) restored HTTPS.

## 2. Symptoms & Timeline

1. **Initial state** – `wg0` came up, `ping 10.13.13.1` succeeded, general browsing via VPN worked.  
2. **HTTP vs HTTPS** – `curl http://vpn.nuspace.kz` returned 301 immediately, while `curl https://vpn.nuspace.kz --connect-timeout 5` hung until timeout.  
3. **Mobile works** – peer1.conf on iOS succeeded, so the issue was client-specific.  
4. **IPv6 suspicion** – disabling IPv6 and removing custom `PostUp` rules had no effect.  
5. **Diagnostics** – `tcpdump -ni wg0 host 34.116.135.20 and port 443` showed the TLS ClientHello leaving the laptop and the server replying with segments that never got acknowledged by the client. Eventually both sides sent RST/FIN.  
6. **Fix** – setting `MTU = 1320` in `/etc/wireguard/wg0.conf` (or equivalently clamping MSS to 1320 on the server) made HTTPS succeed instantly.

## 3. Key Concepts

| Concept | Why it mattered |
| --- | --- |
| **MTU (Maximum Transmission Unit)** | WireGuard defaults to MTU 1420. When traffic hairpins inside the same host (WireGuard container → Docker nginx), the effective MTU shrinks due to encapsulation and bridging overhead. TLS packets larger than that get dropped. |
| **MSS (Maximum Segment Size)** | TCP negotiates MSS during the SYN handshake. Without clamping, the client advertises 1380 bytes, but the path only supports ~1320 bytes, so the server’s TLS fragments were silently discarded. |
| **DNAT hairpinning** | Our hook routes `vpn.nuspace.kz` back into nginx via DNAT. Traffic never leaves Docker, so we rely on wg0 → bridge forwarding, which is more sensitive to MTU. |
| **IPv6** | Disabling IPv6 was useful to eliminate false positives (Happy Eyeballs delays), but IPv6 was not the root cause. |
| **Custom `ip rule`** | Early debugging revealed leftover `ip rule add to 34.116.135.20 lookup main`, which bypassed the tunnel. Removing it was necessary but not sufficient. |

## 4. Troubleshooting Checklist

1. **Basic connectivity**  
   ```bash
   ping 10.13.13.1
   curl http://vpn.nuspace.kz
   curl -4 -v https://vpn.nuspace.kz --connect-timeout 5
   ```
2. **Routing sanity**  
   ```bash
   ip route get 34.116.135.20
   ip rule show | grep 34.116.135.20
   ```
   (no extra rules should divert HTTPS outside the tunnel).
3. **Packet capture**  
   ```bash
   sudo tcpdump -ni wg0 host 34.116.135.20 and port 443
   ```
   - Only outgoing packets → routing problem.  
   - SYN/SYN-ACK visible but TLS stalls → MTU/MSS issue.  
4. **Server-side log**  
   ```bash
   docker compose -f infra/prod.docker-compose.yml logs --tail=50 nginx
   ```
   (no entries → packet dropped before nginx).

## 5. Fix & Verification

### Client-side fix (quickest)

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.13.13.2
MTU = 1320        # <-- new line
```

Then:

```bash
sudo wg-quick down wg0 || true
sudo wg-quick up wg0
curl -v https://vpn.nuspace.kz
```

### Server-side optional fix

Clamp MSS for traffic entering wg0 (add to `infra/wireguard/hooks/20-wireguard-iptables.sh`):

```sh
iptables -t mangle -C FORWARD -o wg0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1320 2>/dev/null \
  || iptables -t mangle -A FORWARD -o wg0 -p tcp --tcp-flags SYN,RST SYN \
     -j TCPMSS --set-mss 1320
```

Recreate the WireGuard container and verify with tcpdump + curl as above.

## 6. Lessons Learned / Prevention

1. **Document hairpin paths** – DNAT’ing traffic back into Docker changes MTU characteristics; future changes should consider MSS clamping from the start.  
2. **Avoid per-client hacks** – Custom `PostUp` rules (e.g., forcing traffic to `lookup main`) complicate debugging. Keep client configs minimal.  
3. **Monitoring** – Add a simple HTTPS health-check inside the tunnel (e.g., `curl -kfsS https://vpn.nuspace.kz/health`). Alert when it fails.  
4. **Templates** – Update WireGuard client templates to include `MTU = 1320` or at least mention it in comments so that new peers don’t hit the same issue.

With these notes, anyone hitting similar HTTPS timeouts can walk through the checklist and either reduce the client MTU or enable MSS clamping on the server without repeating the full investigation.

