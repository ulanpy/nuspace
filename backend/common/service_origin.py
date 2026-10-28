"""Per-environment service origins: the hosts the app is served on.

Mirrors the host-to-route table: six hosts (the root search host and five services).
Every absolute link the backend mints is built from these origins, which come from
the environment, never from a request header. The same table bounds which `Host` a
login may return to (`app_hosts`) and the domain the session cookies cover.
"""

from typing import Literal, get_args
from urllib.parse import urlsplit

Service = Literal["root", "courses", "events", "opportunities", "pages", "my"]
Environment = Literal["production", "staging", "dev"]

SERVICES: tuple[str, ...] = get_args(Service)

PRODUCTION_APEX = "nuspace.kz"
STAGING_APEX = "stage.nuspace.kz"


def environment_from(*, is_debug: bool, nuspace_url: str) -> Environment:
    """Dev when debugging; staging when the configured origin is the staging apex."""
    if is_debug:
        return "dev"
    host = urlsplit(nuspace_url).hostname or ""
    return "staging" if host == STAGING_APEX else "production"


def service_origin(service: Service, environment: Environment, dev_port: int | None = None) -> str:
    """Origin (scheme + host, no trailing slash) of a service in an environment.

    production: https://events.nuspace.kz (root: https://nuspace.kz)
    staging:    https://events_staging.nuspace.kz (root: https://stage.nuspace.kz)
    dev:        http://events.localhost[:port] (root: http://localhost[:port])
    """
    if service not in SERVICES:
        raise ValueError(f"Unknown service: {service!r}")
    if environment == "production":
        host = PRODUCTION_APEX if service == "root" else f"{service}.{PRODUCTION_APEX}"
        return f"https://{host}"
    if environment == "staging":
        host = STAGING_APEX if service == "root" else f"{service}_staging.{PRODUCTION_APEX}"
        return f"https://{host}"
    if environment == "dev":
        host = "localhost" if service == "root" else f"{service}.localhost"
        return f"http://{host}" + (f":{dev_port}" if dev_port else "")
    raise ValueError(f"Unknown environment: {environment!r}")


def app_hosts(environment: Environment, *origins: str) -> frozenset[str]:
    """Hostnames (no scheme, no port) of the six service hosts, plus those of `origins`."""
    urls = [*(service_origin(service, environment) for service in SERVICES), *origins]
    return frozenset(host for url in urls if (host := urlsplit(url).hostname))


def cookie_domain(environment: Environment) -> str | None:
    """`Domain` of the session cookies, so one sign-in covers every host.

    production and staging: `.nuspace.kz`. Staging's hosts (`stage.` and
    `*_staging.`) sit under the same parent, so staging and production share one
    cookie slot and signing into one signs out of the other (accepted, #397).
    dev: None (host-only). Browsers reject `Domain=.localhost`.
    """
    if environment == "dev":
        return None
    return f".{PRODUCTION_APEX}"
