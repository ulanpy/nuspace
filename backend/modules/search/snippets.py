"""Snippets: a short stretch of a Source's text, with where the query matched in it.

Meilisearch crops the text and wraps each match in a pair of tags. The tags are
two private-use characters no Source contains, so they can be stripped back out
while the offsets of what they wrapped are recorded. Offsets are in UTF-16 code
units, the unit a JavaScript string is indexed in, because the browser is what
highlights them.
"""

import re

from backend.modules.search.schemas import MatchSpan, Snippet

PRE_TAG = ""
POST_TAG = ""
CROP_WORDS = 30


def _utf16_length(text: str) -> int:
    return len(text.encode("utf-16-le")) // 2


def from_highlighted(highlighted: str) -> Snippet | None:
    """A snippet from Meilisearch's cropped, tagged text; None when there is none."""
    text: list[str] = []
    matches: list[MatchSpan] = []
    position = 0
    start: int | None = None
    for part in re.split(f"([{PRE_TAG}{POST_TAG}])", highlighted):
        if part == PRE_TAG:
            start = position
        elif part == POST_TAG:
            if start is not None and position > start:
                matches.append(MatchSpan(start=start, length=position - start))
            start = None
        else:
            text.append(part)
            position += _utf16_length(part)
    joined = "".join(text)
    if not joined.strip():
        return None
    return Snippet(text=joined, matches=matches)


def from_text(text: str | None, *, words: int = CROP_WORDS) -> Snippet | None:
    """A snippet from text Meilisearch did not crop: its first `words` words, no matches."""
    if not text or not text.strip():
        return None
    tokens = text.split()
    cropped = " ".join(tokens[:words])
    return Snippet(text=cropped + ("…" if len(tokens) > words else ""))
