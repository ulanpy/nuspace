import httpx
import pytest

from backend.modules.courses.registrar.errors import RegistrarUnavailableError
from backend.modules.courses.registrar.http import ensure_registrar_response


def test_ensure_registrar_response_maps_http_error_to_unavailable() -> None:
    request = httpx.Request("POST", "https://registrar.nu.edu.kz/index.php")
    response = httpx.Response(500, request=request, text="Service unavailable")

    with pytest.raises(RegistrarUnavailableError, match="registrar_unavailable"):
        ensure_registrar_response(response)


def test_ensure_registrar_response_passes_on_success() -> None:
    request = httpx.Request("GET", "https://registrar.nu.edu.kz/")
    response = httpx.Response(200, request=request)

    ensure_registrar_response(response)
