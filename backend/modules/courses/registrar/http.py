import httpx

from backend.modules.courses.registrar.errors import RegistrarUnavailableError


def ensure_registrar_response(response: httpx.Response) -> None:
    """Map registrar HTTP failures to a domain error for upstream callers."""
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise RegistrarUnavailableError() from exc


def registrar_unavailable_from_request_error(exc: httpx.RequestError) -> RegistrarUnavailableError:
    return RegistrarUnavailableError()
