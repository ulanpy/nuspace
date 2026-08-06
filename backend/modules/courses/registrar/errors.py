"""Domain errors for NU registrar integration."""


class RegistrarUnavailableError(Exception):
    """Registrar is unreachable or returned a server/network error."""

    def __init__(self, detail: str = "registrar_unavailable") -> None:
        self.detail = detail
        super().__init__(detail)
