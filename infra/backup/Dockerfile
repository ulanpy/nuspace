FROM postgres:17-bookworm

ARG WALG_VERSION=v3.0.8
ARG WALG_ASSET=wal-g-pg-22.04-amd64
ARG SUPERCRONIC_VERSION=v0.2.46

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl jq gzip \
    && curl -fsSL "https://github.com/wal-g/wal-g/releases/download/${WALG_VERSION}/${WALG_ASSET}.tar.gz" \
        -o /tmp/wal-g.tar.gz \
    && tar -xzf /tmp/wal-g.tar.gz -C /tmp \
    && mv /tmp/${WALG_ASSET} /usr/local/bin/wal-g \
    && chmod +x /usr/local/bin/wal-g \
    && curl -fsSL "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" \
        -o /usr/local/bin/supercronic \
    && chmod +x /usr/local/bin/supercronic \
    && rm -rf /tmp/wal-g.tar.gz /var/lib/apt/lists/*

ENV PATH="/usr/lib/postgresql/17/bin:${PATH}"

COPY scripts/ /scripts/
COPY crontab /etc/crontab

RUN chmod +x /scripts/*.sh \
    && supercronic -test /etc/crontab

# v0.2.33 reaper bug: bare "supercronic" in os.Args[0] fails as PID 1 (aptible/supercronic#177).
CMD ["/usr/local/bin/supercronic", "-passthrough-logs", "/etc/crontab"]
