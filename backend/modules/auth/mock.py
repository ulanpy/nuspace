MOCK_USERS: list[dict] = [
    {
        "email": "alice@example.com",
        "given_name": "Alice",
        "family_name": "Anderson",
        "picture": "https://i.pravatar.cc/150?img=3",
        "sub": "mock-sub-alice",
    },
    {
        "email": "bob@example.com",
        "given_name": "Bob",
        "family_name": "Brown",
        "picture": "https://i.pravatar.cc/150?img=4",
        "sub": "mock-sub-bob",
    },
    {
        "email": "charlie@example.com",
        "given_name": "Charlie",
        "family_name": "Clark",
        "picture": "https://i.pravatar.cc/150?img=5",
        "sub": "mock-sub-charlie",
    },
]


def select_mock_user(selector: str | None) -> dict:
    if not selector:
        return MOCK_USERS[0]
    s = selector.strip().lower()
    if s in {"1", "2", "3"}:
        return MOCK_USERS[int(s) - 1]
    for user in MOCK_USERS:
        if s in {user["email"].lower(), user["sub"].lower(), user["given_name"].lower()}:
            return user
    return MOCK_USERS[0]


def get_mock_user_by_sub(sub: str) -> dict:
    for user in MOCK_USERS:
        if user["sub"] == sub:
            return user
    return MOCK_USERS[0]


def build_mock_creds(userinfo: dict) -> dict:
    sub = userinfo["sub"]
    return {
        "access_token": f"mock_access_{sub}",
        "refresh_token": f"mock_refresh_{sub}",
        "id_token": f"mock_id_{sub}",
        "userinfo": userinfo,
    }
