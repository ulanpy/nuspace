"""The app base URL per environment: the request's host if it is ours, else the apex.

Production is covered over HTTP in `modules/auth/tests/test_session_across_hosts_http.py`;
these cover the hosts the HTTP suite (which runs as production) cannot reach.
"""

from types import SimpleNamespace

import pytest
from backend.common.request_url import request_app_base_url
from backend.common.service_origin import cookie_domain
from backend.core.configs.config import Config
from starlette.requests import Request


def _config(environment: str, home_url: str, tunnel_url: str | None = None):
    fake = SimpleNamespace(
        ENVIRONMENT=environment,
        DEV_APP_URL="http://localhost",
        HOME_URL=home_url,
        PUBLIC_WEBHOOK_URL=tunnel_url or home_url,
    )
    fake.service_origin = lambda s: Config.service_origin(fake, s)
    fake.APP_HOSTS = Config.APP_HOSTS.func(fake)
    return fake


def _request(host: str | None, scheme: str = "http", **headers: str) -> Request:
    raw = [(k.replace("_", "-").encode(), v.encode()) for k, v in headers.items()]
    if host is not None:
        raw.append((b"host", host.encode()))
    return Request(
        {"type": "http", "scheme": scheme, "headers": raw, "path": "/", "query_string": b""}
    )


STAGING = _config("staging", "https://stage.nuspace.kz")
DEV = _config("dev", "http://localhost", tunnel_url="https://quick-fox.trycloudflare.com")


@pytest.mark.parametrize("host", ["stage.nuspace.kz", "events_staging.nuspace.kz"])
def test_staging_returns_to_its_own_hosts(host):
    request = _request(host, x_forwarded_proto="https")
    assert request_app_base_url(request, STAGING) == f"https://{host}"


def test_staging_does_not_return_to_a_production_host():
    request = _request("events.nuspace.kz", x_forwarded_proto="https")
    assert request_app_base_url(request, STAGING) == "https://stage.nuspace.kz"


@pytest.mark.parametrize(
    ("host", "expected"),
    [
        ("localhost:3000", "http://localhost:3000"),
        ("events.localhost:3000", "http://events.localhost:3000"),
        ("quick-fox.trycloudflare.com", "http://quick-fox.trycloudflare.com"),
        ("evil.example", "http://localhost"),
        (None, "http://localhost"),
    ],
)
def test_dev_hosts(host, expected):
    assert request_app_base_url(_request(host), DEV) == expected


def test_forwarded_host_and_userinfo_are_ignored():
    request = _request("evil.example@stage.nuspace.kz", x_forwarded_host="evil.example")
    assert request_app_base_url(request, STAGING) == "http://stage.nuspace.kz"


def test_unusable_forwarded_proto_falls_back_to_the_request_scheme():
    request = _request("stage.nuspace.kz", scheme="https", x_forwarded_proto="javascript")
    assert request_app_base_url(request, STAGING) == "https://stage.nuspace.kz"


def test_cookie_domain_per_environment():
    assert cookie_domain("production") == ".nuspace.kz"
    assert cookie_domain("staging") == ".nuspace.kz"
    assert cookie_domain("dev") is None
