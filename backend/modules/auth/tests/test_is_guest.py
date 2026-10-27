"""`is_guest` is the one guest test in the codebase, so it has to agree with what
`get_creds_or_guest` actually returns, not with a shape a fixture invented.

Production's guest carries `sub == "guest"` in the Keycloak claims and
`is_guest` only in the app claims. Each case below is a shape the credentials
tuple can take; the half-populated ones are what a consumer reading a single
half of the tuple would get wrong.
"""

import pytest
from backend.modules.auth.dependencies import is_guest

# What `get_creds_or_guest` returns for an unauthenticated caller.
PRODUCTION_GUEST = ({"sub": "guest"}, {"role": "default", "is_guest": True, "scope": "allowed"})
# What `get_creds_or_401` returns for a signed-in caller: no `is_guest` key at all.
SIGNED_IN = ({"sub": "owner", "email": "a@nu.edu.kz"}, {"role": "user", "scope": "allowed"})
SITE_ADMIN = ({"sub": "root"}, {"role": "admin", "scope": "allowed"})


@pytest.mark.parametrize(
    ("user", "expected"),
    [
        pytest.param(PRODUCTION_GUEST, True, id="production_guest"),
        pytest.param(SIGNED_IN, False, id="signed_in"),
        pytest.param(SITE_ADMIN, False, id="site_admin"),
        # either half alone marks a guest
        pytest.param(({"sub": "guest"}, {"role": "default"}), True, id="kc_sub_only"),
        pytest.param(({"sub": "someone"}, {"is_guest": True}), True, id="app_flag_only"),
        pytest.param(({"sub": None}, {"is_guest": True}), True, id="app_flag_without_sub"),
        # a falsy flag is not a guest
        pytest.param(({"sub": "owner"}, {"is_guest": False}), False, id="flag_false"),
        pytest.param(({"sub": "owner"}, {"is_guest": None}), False, id="flag_none"),
        # the kc dict never carries the flag in production, so it does not count
        pytest.param(
            ({"sub": "owner", "is_guest": True}, {"role": "user"}), False, id="kc_flag_ignored"
        ),
        # empty claims are not a guest by this test; BasePolicy rejects them separately
        pytest.param(({}, {}), False, id="empty_claims"),
    ],
)
def test_is_guest(user: tuple[dict, dict], expected: bool) -> None:
    assert is_guest(user) is expected
