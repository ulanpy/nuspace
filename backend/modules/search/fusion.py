"""Merging ranked lists of Sources into one: Reciprocal Rank Fusion.

Each list is a ranking of Source keys (`page:12`), best first. A key's fused
score is the sum over the lists it appears in of `1 / (k + rank)`. Ties keep
the order the keys were first seen in, list by list, so a single list comes
back exactly as it went in.

Today there is one list, the lexical one. Dense retrieval (#441) passes its
own list alongside it and nothing else changes: merge, then predicate, then
slice.
"""

from collections.abc import Sequence

# The constant from the RRF paper (Cormack et al., 2009), and the usual default.
RRF_K = 60


def fuse(rankings: Sequence[Sequence[str]], *, k: int = RRF_K) -> list[str]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, key in enumerate(ranking, start=1):
            scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank)
    # dicts keep insertion order and `sorted` is stable, so ties keep first-seen order.
    return sorted(scores, key=lambda key: -scores[key])
