#!/bin/sh

set -eu

WG_SUBNET="${WIREGUARD_VPN_SUBNET:-10.13.13.0/24}"
DOCKER_SUBNET="${DOCKER_BRIDGE_SUBNET:-172.28.0.0/24}"
WG_CONTAINER_IP="${WIREGUARD_CONTAINER_IP:-172.28.0.10}"
SERVER_HOST="${SERVERURL:-vpn.nuspace.kz}"
NGINX_SERVICE="${NGINX_SERVICE_NAME:-nginx}"
DNS_RETRIES="${DNS_RETRIES:-10}"
DNS_SLEEP="${DNS_SLEEP_SECONDS:-1}"

resolve_host() {
  local host="$1"
  local attempts=0
  local ip=""

  while [ "$attempts" -lt "$DNS_RETRIES" ]; do
    ip=$(getent hosts "$host" | awk 'NR==1 {print $1}')
    if [ -n "$ip" ]; then
      echo "$ip"
      return 0
    fi
    attempts=$((attempts + 1))
    sleep "$DNS_SLEEP"
  done

  echo ""
  return 1
}

PUBLIC_IP=$(resolve_host "$SERVER_HOST")
NGINX_IP=$(resolve_host "$NGINX_SERVICE")

# Clean up legacy SNAT rules from earlier revisions, ignore failures
iptables -t nat -D POSTROUTING -s "$WG_SUBNET" -d "$DOCKER_SUBNET" -j SNAT --to-source "$WG_CONTAINER_IP" 2>/dev/null || true
if [ -n "$PUBLIC_IP" ]; then
  iptables -t nat -D POSTROUTING -s "$WG_SUBNET" -d "$PUBLIC_IP" -j SNAT --to-source "$WG_CONTAINER_IP" 2>/dev/null || true
fi

# Hairpin: route VPN traffic destined to the public IP into the nginx container
if [ -n "$PUBLIC_IP" ] && [ -n "$NGINX_IP" ]; then
  for PORT in 80 443; do
    iptables -t nat -C PREROUTING -s "$WG_SUBNET" -d "$PUBLIC_IP" -p tcp --dport "$PORT" -j DNAT --to-destination "$NGINX_IP":"$PORT" 2>/dev/null \
      || iptables -t nat -A PREROUTING -s "$WG_SUBNET" -d "$PUBLIC_IP" -p tcp --dport "$PORT" -j DNAT --to-destination "$NGINX_IP":"$PORT"
  done
fi

# Allow Docker containers to reach VPN clients via wg0 while keeping replies symmetric
iptables -t nat -C POSTROUTING -s "$DOCKER_SUBNET" -o wg0 -j MASQUERADE 2>/dev/null \
  || iptables -t nat -A POSTROUTING -s "$DOCKER_SUBNET" -o wg0 -j MASQUERADE
