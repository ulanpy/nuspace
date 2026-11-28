"""The app base URL per environment: the request's host if it is ours, else the apex.

Production is covered over HTTP in `modules/auth/tests/test_session_across_hosts_http.py`;
these cover the hosts the HTTP suite (which runs as production) cannot reach.
"""

from types import SimpleNamespace

import pytest
from backend.common.request_url import request_app_base_url, request_service
from backend.common.service_origin import app_hosts
from starlette.requests import Request


def _config(environment: str, home_url: str, *extra_origins: str):
    return SimpleNamespace(
        ENVIRONMENT=environment,
        HOME_URL=home_url,
        APP_HOSTS=app_hosts(environment, home_url, *extra_origins),
    )


def _request(host: str | None, scheme: str = "http", **headers: str) -> Request:
    raw = [(k.replace("_", "-").encode(), v.encode()) for k, v in headers.items()]
    if host is not None:
        raw.append((b"host", host.encode()))
    return Request(
        {"type": "http", "scheme": scheme, "headers": raw, "path": "/", "query_string": b""}
    )


STAGING = _config("staging", "https://stage.nuspace.kz")
DEV = _config("dev", "http://localhost", "https://quick-fox.trycloudflare.com")


@pytest.mark.parametrize("host", ["stage.nuspace.kz", "events_staging.nuspace.kz"])
def test_staging_returns_to_its_own_hosts(host):
    request = _request(host, x_forwarded_proto="https")
    assert request_app_base_url(request, STAGING) == f"https://{host}"


def test_outside_dev_a_port_on_host_is_dropped():
    request = _request("events_staging.nuspace.kz:9999", x_forwarded_proto="https")
    assert request_app_base_url(request, STAGING) == "https://events_staging.nuspace.kz"


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


@pytest.mark.parametrize(
    ("config", "host", "expected"),
    [
        (STAGING, "events_staging.nuspace.kz", "events"),
        (STAGING, "stage.nuspace.kz", "root"),
        (STAGING, "events.nuspace.kz", None),
        (STAGING, "evil.example", None),
        (STAGING, None, None),
        (DEV, "events.localhost:3000", "events"),
        (DEV, "localhost", "root"),
        (DEV, "quick-fox.trycloudflare.com", None),
    ],
)
def test_the_service_is_the_validated_host(config, host, expected):
    assert request_service(_request(host), config) == expected


def test_forwarded_host_is_no_service():
    request = _request("stage.nuspace.kz", x_forwarded_host="events_staging.nuspace.kz")
    assert request_service(request, STAGING) == "root"
