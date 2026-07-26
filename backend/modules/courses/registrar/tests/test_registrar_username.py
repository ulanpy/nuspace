import pytest
from backend.modules.courses.registrar.username import (
    RegistrarDebugUsernameMissing,
    resolve_registrar_username,
)


def test_debug_requires_an_explicit_nonblank_username():
    for configured in (None, "", "   "):
        with pytest.raises(RegistrarDebugUsernameMissing):
            resolve_registrar_username(
                None,
                is_debug=True,
                debug_username=configured,
            )


def test_debug_uses_only_the_configured_username():
    assert (
        resolve_registrar_username(
            "mock-user@example.com",
            is_debug=True,
            debug_username="  developer  ",
        )
        == "developer"
    )


def test_production_derives_the_email_local_part():
    assert (
        resolve_registrar_username(
            "student@nu.edu.kz",
            is_debug=False,
            debug_username="ignored",
        )
        == "student"
    )


@pytest.mark.parametrize("email", [None, "", "not-an-email", "@nu.edu.kz"])
def test_production_rejects_an_invalid_email(email):
    with pytest.raises(ValueError):
        resolve_registrar_username(
            email,
            is_debug=False,
            debug_username=None,
        )
