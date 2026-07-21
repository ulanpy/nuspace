"""Discover the latest registrar term from public NU pages."""

from __future__ import annotations

import re

import httpx

_TERM_PATTERN = re.compile(
    r"(?P<label>(Spring|Summer|Fall)\s+(?P<year>\d{4})).*?termid=(?P<termid>\d+)",
    re.IGNORECASE | re.DOTALL,
)
_SEASON_ORDER = {"Spring": 0, "Summer": 1, "Fall": 2}
_DISCOVERY_PAGES = [
    "https://registrar.nu.edu.kz/course-schedules",
    "https://registrar.nu.edu.kz/course-requirements",
]


async def discover_latest_term() -> dict:
    """Scrape registrar pages to find the latest term label + termid."""
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        texts = []
        for url in _DISCOVERY_PAGES:
            resp = await client.get(url)
            resp.raise_for_status()
            texts.append(resp.text)

    candidates: list[dict] = []
    for text in texts:
        for m in _TERM_PATTERN.finditer(text):
            label = m.group("label").strip()
            season = label.split()[0].capitalize()
            year = int(m.group("year"))
            termid = m.group("termid")
            candidates.append(
                {
                    "label": label,
                    "season": season,
                    "year": year,
                    "termid": termid,
                }
            )

    if not candidates:
        raise RuntimeError("No term entries found during discovery")

    def sort_key(item: dict):
        return (item["year"], _SEASON_ORDER.get(item["season"], 0))

    return max(candidates, key=sort_key)
