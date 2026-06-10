FROM postgres:17-bookworm

ARG WALG_VERSION=v3.0.8
# WAL-G release assets use Ubuntu ABI tags (no debian-12); bookworm ≈ 22.04.
ARG WALG_ASSET=wal-g-pg-22.04-amd64

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl -fsSL "https://github.com/wal-g/wal-g/releases/download/${WALG_VERSION}/${WALG_ASSET}.tar.gz" \
        -o /tmp/wal-g.tar.gz \
    && tar -xzf /tmp/wal-g.tar.gz -C /tmp \
    && mv /tmp/${WALG_ASSET} /usr/local/bin/wal-g \
    && chmod +x /usr/local/bin/wal-g \
    && rm -rf /tmp/wal-g.tar.gz /var/lib/apt/lists/* \
    && apt-get purge -y curl \
    && apt-get autoremove -y
