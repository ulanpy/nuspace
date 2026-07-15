"""Interfaces for the media module."""

from __future__ import annotations

from typing import Protocol


class ObjectStorage(Protocol):
    async def generate_download_urls(self, filenames: list[str]) -> list[str]:
        """Return download URLs in the same order as filenames."""

    async def delete_object(self, filename: str) -> None:
        """Delete a single stored object."""

    async def delete_objects(self, filenames: list[str]) -> None:
        """Delete multiple stored objects."""

