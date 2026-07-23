# WireGuard VPN with UI using wg-easy

WireGuard VPN setup used for SSH access to the server and internal services (e.g. the [monitoring stack](../README.md)).

## Why WireGuard + wg-easy

We previously ran a headless WireGuard setup, which was fine for a small team but not convenient to hand down or scale. `wg-easy` gives us a UI for managing peers without sacrificing the underlying WireGuard config.

## Accessing the UI for the first time

We use [Identity-Aware Proxy (IAP)](https://cloud.google.com/security/products/iap) to grant specific Google accounts SSH access to the server and generate the very first WireGuard peer configs, without exposing the UI publicly.

```sh
gcloud compute ssh user@instance --tunnel-through-iap -- -L 51821:127.0.0.1:51821
```

This forwards `127.0.0.1:51821` from the server to your machine over the IAP tunnel. Since the compose file binds the UI to `127.0.0.1`, it's only reachable this way — never from the public internet.

Once tunneled, open the UI at `localhost:51821`. Add your clients and connect to VPN.

As of wg-easy v15, the UI does not support being served under a sub-path, so `wg-easy`'s UI is served at the root of `vpn.nuspace.kz`, restricted to internal traffic only. Handle to all the services are available at `vpn.nuspace.kz/monitoring`.

> University or corporate networks may block WireGuard if multiple VPN connections are active simultaneously from the same network — using a mobile hotspot as a fallback is recommended.

## Explanation

For a full detailed explanation see the blog post at [sagyzdop.com](https://sagyzdop.com/blog/wireguard-for-nuspace/).
