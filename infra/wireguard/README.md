# WireGuard VPN Configuration

This directory contains the WireGuard VPN configuration used in the production environment for secure access to monitoring tools and internal services.

## VPN Network Architecture

### Network Configuration
- **Docker Network**: `nuspace_nuros` (172.28.0.0/24)
- **WireGuard Container IP**: 172.28.0.10
- **VPN Subnet**: 10.13.13.0/24
- **Allowed IPs**: 0.0.0.0/0 (all traffic routed through VPN)
- **DNS**: 1.1.1.1 (Cloudflare)
- **Server URL**: vpn.nuspace.kz
- **Port**: 51820/udp

### WireGuard Container Configuration

```yaml
wireguard:
  image: lscr.io/linuxserver/wireguard:latest
  container_name: wireguard
  cap_add:
    - NET_ADMIN
    - SYS_MODULE
  networks:
    nuros:
      ipv4_address: 172.28.0.10
  environment:
    - PUID=3182562138
    - PGID=1007
    - TZ=Etc/UTC
    - SERVERURL=vpn.nuspace.kz
    - PEERS=10
    - PEERDNS=1.1.1.1
    - INTERNAL_SUBNET=10.13.13.0/24
    - ALLOWEDIPS=0.0.0.0/0
    - LOG_CONFS=true
    - POST_UP_SCRIPT=sysctl -w net.ipv4.ip_forward=1; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; iptables -t nat -A POSTROUTING -s 172.28.0.0/24 -o wg0 -j MASQUERADE
    - POST_DOWN_SCRIPT=iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE; iptables -t nat -D POSTROUTING -s 172.28.0.0/24 -o wg0 -j MASQUERADE
  volumes:
    - ./wireguard/config:/config
    - /lib/modules:/lib/modules
  ports:
    - 51820:51820/udp
  sysctls:
    - net.ipv4.conf.all.src_valid_mark=1
  restart: unless-stopped
```

## Nginx VPN Access Control

The VPN access is controlled through nginx configuration in `backend/core/configs/nginx.conf`:

```nginx
server {
    listen 443 ssl;
    server_name vpn.nuspace.kz;

    # IP Restrictions - Only VPN and server access
    allow 172.28.0.0/24; # Docker network (all containers)
    allow 34.133.121.60; # Public IP of the server
    deny all;

    # Monitoring Services Proxy
    location /grafana/ {
        proxy_pass http://grafana:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;  
        proxy_set_header X-Script-Name /grafana;
        rewrite ^/grafana(/.*)$ $1 break;
        rewrite ^/grafana$ /grafana/ permanent;  
    }

    location /alloy/ {
        proxy_pass http://alloy:12345/alloy/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /prometheus/ {
        proxy_pass http://prometheus:9090/prometheus/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # VPN Portal Landing Page
    location / {
        root /etc/nginx;
        index vpn-index.html;
        try_files /vpn-index.html =404;
    }
}
```

## Security Configuration

### Network Isolation
- **WireGuard Interface**: Creates isolated network (10.13.13.0/24)
- **Traffic Routing**: All VPN traffic routed through secure tunnel
- **Container Access**: Docker containers accessible only through VPN
- **IP Forwarding**: Enabled for NAT and routing

### Access Control
- **IP Restrictions**: Only Docker network and server IP allowed
- **SSL/TLS**: Cloudflare Origin certificates (commented in VPN block)
- **Protocols**: TLS 1.2 and 1.3
- **Cipher Suites**: Strong encryption (ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256)

### Firewall Rules
```bash
# POST_UP_SCRIPT
sysctl -w net.ipv4.ip_forward=1
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -t nat -A POSTROUTING -s 172.28.0.0/24 -o wg0 -j MASQUERADE

# POST_DOWN_SCRIPT
iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
iptables -t nat -D POSTROUTING -s 172.28.0.0/24 -o wg0 -j MASQUERADE
```

## VPN Services Access

### Monitoring Stack URLs
- **Grafana**: https://vpn.nuspace.kz/grafana/
- **Prometheus**: https://vpn.nuspace.kz/prometheus/
- **Alloy**: https://vpn.nuspace.kz/alloy/
- **VPN Portal**: https://vpn.nuspace.kz/

### Service Configuration
- **Grafana**: Root URL configured for sub-path, admin credentials via env vars
- **Prometheus**: Remote write receiver enabled, 30-day retention
- **Alloy**: UI accessible through sub-path prefix
- **Portal**: Static HTML landing page with service links

## WireGuard Configuration Details

### Container Capabilities
- `NET_ADMIN`: Required for network interface management
- `SYS_MODULE`: Required for WireGuard kernel module

### Volume Mounts
- `./wireguard/config:/config`: Configuration storage
- `/lib/modules:/lib/modules`: Kernel modules access

### System Settings
- `net.ipv4.conf.all.src_valid_mark=1`: Required for routing

### Environment Variables
- `PUID=3182562138`: User ID for file permissions
- `PGID=1007`: Group ID for file permissions
- `SERVERURL=vpn.nuspace.kz`: Server endpoint
- `PEERS=10`: Maximum number of VPN peers
- `PEERDNS=1.1.1.1`: DNS server for VPN clients
- `INTERNAL_SUBNET=10.13.13.0/24`: VPN network range
- `ALLOWEDIPS=0.0.0.0/0`: All traffic through VPN
- `LOG_CONFS=true`: Enable configuration logging

## Network Flow

1. **Client Connection**: WireGuard client connects to vpn.nuspace.kz:51820
2. **Tunnel Establishment**: Secure tunnel created in 10.13.13.0/24 subnet
3. **Traffic Routing**: All client traffic routed through VPN tunnel
4. **Nginx Proxy**: VPN traffic reaches nginx with Docker network IP
5. **Service Access**: Nginx proxies to monitoring services based on URL path
6. **Response**: Encrypted response sent back through VPN tunnel

## Configuration Files

### WireGuard Config Location
- **Directory**: `./wireguard/config/`
- **Peer Configs**: Automatically generated for up to 10 peers
- **Server Config**: Auto-generated with container environment variables

### Nginx Integration
- **Config File**: `backend/core/configs/nginx.conf`
- **VPN Portal**: `monitoring/vpn-index.html`
- **SSL Certificates**: Cloudflare Origin certificates

## Security Considerations

1. **Network Isolation**: Complete traffic isolation through WireGuard tunnel
2. **IP Restrictions**: Strict access control at nginx level
3. **Encryption**: End-to-end encryption for all VPN traffic
4. **DNS Security**: Using Cloudflare DNS (1.1.1.1)
5. **Certificate Management**: Cloudflare Origin certificates for HTTPS
6. **Firewall Rules**: Proper NAT and routing configuration
7. **Container Security**: Minimal capabilities and network isolation 