"""Service origins and the shape of every absolute link the backend mints."""

from types import SimpleNamespace

import pytest
from backend.common.service_origin import (
    SERVICES,
    app_hosts,
    cookie_domain,
    environment_from,
    service_origin,
)
from backend.core.configs.config import Config
from backend.modules.bot.routes.user.private.messages.post_event import _event_link
from backend.modules.bot.services.grades import build_site_grades_url
from backend.modules.pages.service import PageService


def _config(environment: str, dev_app_url: str = "http://localhost"):
    fake = SimpleNamespace(ENVIRONMENT=environment, DEV_APP_URL=dev_app_url)
    return SimpleNamespace(service_origin=lambda s: Config.service_origin(fake, s))


def test_six_services():
    assert set(SERVICES) == {"root", "courses", "events", "opportunities", "pages", "my"}


@pytest.mark.parametrize("service", [s for s in SERVICES if s != "root"])
def test_production_and_staging_service_hosts(service):
    assert service_origin(service, "production") == f"https://{service}.nuspace.kz"
    assert service_origin(service, "staging") == f"https://{service}_staging.nuspace.kz"


def test_apex_hosts():
    assert service_origin("root", "production") == "https://nuspace.kz"
    assert service_origin("root", "staging") == "https://stage.nuspace.kz"


def test_dev_uses_localhost_hosts_with_optional_port():
    assert service_origin("root", "dev") == "http://localhost"
    assert service_origin("events", "dev") == "http://events.localhost"
    assert service_origin("pages", "dev", 8080) == "http://pages.localhost:8080"


def test_unknown_service_rejected():
    with pytest.raises(ValueError):
        service_origin("admin", "production")  # type: ignore[arg-type]


def test_app_hosts_are_the_service_hosts_plus_extra_origins():
    assert app_hosts("staging") == {"stage.nuspace.kz"} | {
        f"{s}_staging.nuspace.kz" for s in SERVICES if s != "root"
    }
    assert "quick-fox.trycloudflare.com" in app_hosts("dev", "https://quick-fox.trycloudflare.com")


def test_cookie_domain_per_environment():
    assert cookie_domain("production") == ".nuspace.kz"
    assert cookie_domain("staging") == ".nuspace.kz"
    assert cookie_domain("dev") is None


def test_environment_detection():
    assert environment_from(is_debug=True, nuspace_url="https://nuspace.kz") == "dev"
    assert environment_from(is_debug=False, nuspace_url="https://nuspace.kz") == "production"
    assert environment_from(is_debug=False, nuspace_url="https://stage.nuspace.kz/") == "staging"


def test_config_dev_origin_follows_dev_app_url_port():
    cfg = _config("dev", "http://localhost:3000")
    assert cfg.service_origin("events") == "http://events.localhost:3000"
    assert _config("production").service_origin("events") == "https://events.nuspace.kz"


def test_admin_invite_link_shape():
    infra = SimpleNamespace(config=_config("production"))
    page = SimpleNamespace(slug="my-club")
    url = PageService._build_admin_link_url(infra, page, "tok")
    assert url == "https://pages.nuspace.kz/my-club?admin=tok"


def test_admin_invite_link_staging():
    infra = SimpleNamespace(config=_config("staging"))
    url = PageService._build_admin_link_url(infra, SimpleNamespace(slug="x"), "t")
    assert url == "https://pages_staging.nuspace.kz/x?admin=t"


def test_bot_event_link_shape():
    assert _event_link(service_origin("events", "production"), 42) == "https://events.nuspace.kz/42"


def test_bot_course_link_shape():
    origin = service_origin("courses", "production")
    assert build_site_grades_url(origin, "MATH 161") == (
        "https://courses.nuspace.kz/stats?keyword=MATH%20161"
    )
