"""The one place a Gemini client is built (ADR 0003: modules share it from `common`)."""

from backend.core.configs.config import Config, config
from google import genai


def build_gemini_client(app_config: Config | None = None) -> genai.Client:
    """Developer API (API key) locally; GCP enterprise (ADC) on prod VM."""
    cfg = app_config or config
    if cfg.gemini_use_enterprise:
        return genai.Client(
            enterprise=True,
            project=cfg.GCP_PROJECT_ID,
            location=cfg.GEMINI_LOCATION,
        )
    if not cfg.GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Set GEMINI_API_KEY for local dev or GEMINI_USE_ENTERPRISE=true on GCP."
        )
    return genai.Client(api_key=cfg.GEMINI_API_KEY)
