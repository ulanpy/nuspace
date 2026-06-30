import json
from typing import Any
import time
import re

import httpx
from httpx import Cookies


HOST = "https://registrar.nu.edu.kz"
LOGIN_PATH = "/index.php"
SCHEDULE_HTML_PATH = "/my-registrar/personal-schedule"
SCHEDULE_JSON_PATH = "/my-registrar/personal-schedule/json"


class RegistrarClient:
    """
    HTTP client for interacting with NU registrar system.
    
    Provides async context manager interface for authenticated requests to fetch
    student schedule data. Handles login authentication and session management
    automatically.
    
    Args:
        verify_ssl: Whether to verify SSL certificates (default: False for registrar)
        timeout: Request timeout in seconds (default: 30.0)
    """
    def __init__(self, *, verify_ssl: bool = False, timeout: float = 30.0) -> None:
        self.verify_ssl = verify_ssl
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> "RegistrarClient":
        await self._ensure_client()
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=HOST,
                timeout=self.timeout,
                verify=self.verify_ssl,
            )
            self._client.cookies.set("has_js", "1", domain="registrar.nu.edu.kz")
        return self._client

    async def login(self, username: str, password: str) -> None:
        client = await self._ensure_client()
        payload = {
            "name": username,
            "pass": password,
            "form_build_id": "form-tFAqQhbP6TRrM1eFFrnkFOGsb2ExDtyBNHcywT3RB8s",
            "form_id": "user_login",
            "op": "Log in",
        }
        response = await client.post(
            LOGIN_PATH,
            params={"q": "user/login"},
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            follow_redirects=True,
        )
        if response.status_code >= 400:
            response.raise_for_status()

        cookies: Cookies = client.cookies
        if not any(cookie for cookie in cookies.jar if cookie.name == "AUTHSSL"):
            raise ValueError("Invalid registrar credentials")

    async def _get_schedule_type(self) -> str:
        client = await self._ensure_client()
        response = await client.get(SCHEDULE_HTML_PATH)
        response.raise_for_status()
        html = response.text
        marker = "jQuery.extend(Drupal.settings, "
        if marker not in html:
            return "current"
        try:
            payload = html.split(marker, 1)[1].split("})", 1)[0] + "}"
            data = json.loads(payload)
            access = data["personalSchedule"]["access"]
            if access.get("reg") == 1:
                return "reg"
        except (json.JSONDecodeError, KeyError, IndexError):
            pass
        return "current"

    async def _get_schedule(self, schedule_type: str) -> dict[str, Any]:
        client = await self._ensure_client()
        response = await client.get(
            SCHEDULE_JSON_PATH,
            params={
                "method": "getTimetable",
                "type": schedule_type,
                "page": 1,
                "start": 0,
                "limit": 50,
            },
        )
        response.raise_for_status()
        return response.json()

    async def fetch_schedule(self, username: str, password: str) -> dict[str, Any]:
        await self.login(username=username, password=password)
        schedule_type = await self._get_schedule_type()
        return await self._get_schedule(schedule_type)

    async def fetch_unofficial_transcript_raw(self, username: str, password: str) -> tuple[str, Any]:
        """
        Fetch unofficial transcript payload directly from registrar.
        Returns tuple of (content_type, payload) where payload is JSON (dict)
        or raw bytes (e.g., PDF). Caller decides how to parse.
        """
        await self.login(username=username, password=password)
        client = await self._ensure_client()
        resp = await client.get(
            "/my-registrar/unofficial-transcript/json",
            params={"method": "getData", "_dc": str(int(time.time() * 1000))},
        )
        resp.raise_for_status()
        content_type = resp.headers.get("Content-Type", "").lower()
        if "application/json" in content_type or "text/json" in content_type:
            return "json", resp.json()
        return content_type or "application/octet-stream", resp.content

    async def fetch_unofficial_transcript_pdf(self, username: str, password: str) -> bytes:
        """
        Fetch unofficial transcript as PDF bytes. Handles HTML wrapper that links to PDF.
        """
        await self.login(username=username, password=password)
        client = await self._ensure_client()
        resp = await client.get(
            "/my-registrar/unofficial-transcript/json",
            params={"method": "getData", "_dc": str(int(time.time() * 1000))},
        )
        resp.raise_for_status()
        content_type = resp.headers.get("Content-Type", "").lower()
        body = resp.content

        if "pdf" in content_type or body.lstrip().startswith(b"%PDF"):
            return body

        # HTML page containing a link to the PDF render endpoint.
        text = ""
        try:
            text = body.decode("utf-8", errors="ignore")
        except Exception:
            pass

        if text:
            m = re.search(r'(?:href|src)="([^"]*transcriptRenderDocumentPDF[^"]+)"', text, re.IGNORECASE)
            if m:
                url = m.group(1)
                # Support both absolute and relative links.
                pdf_resp = await client.get(url)
                pdf_resp.raise_for_status()
                pdf_ct = pdf_resp.headers.get("Content-Type", "").lower()
                if "pdf" in pdf_ct or pdf_resp.content.lstrip().startswith(b"%PDF"):
                    return pdf_resp.content

        raise ValueError("Could not retrieve transcript PDF (unexpected response)")
