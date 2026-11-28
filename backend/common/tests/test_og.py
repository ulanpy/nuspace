"""The shared link-preview builder, below the HTTP seam."""

import pytest
from backend.common.og import Card, render_card, title_from_path


def test_a_card_with_an_image_is_a_large_summary():
    html = render_card(Card(title="T", description="D", url="https://nuspace.kz/x", image="i.png"))
    assert 'content="summary_large_image"' in html
    assert '<meta property="og:image" content="i.png" />' in html


def test_a_card_without_an_image_is_a_summary_with_no_image_tags():
    html = render_card(Card(title="T", description="D", url="https://nuspace.kz/x"))
    assert 'content="summary"' in html
    assert "og:image" not in html and "twitter:image" not in html


def test_every_field_is_escaped():
    html = render_card(
        Card(title='<b>"x"</b>', description="<i>", url='https://nuspace.kz/"><x>', link_text="<a>")
    )
    assert "<b>" not in html and "<i>" not in html and "<x>" not in html and "<a>" not in html


@pytest.mark.parametrize(
    ("path", "title"),
    [
        ("/", None),
        ("/42", None),
        ("/about", "About"),
        ("/privacy-policy/", "Privacy Policy"),
        ("/p/chess_club/settings", "Settings"),
        ("/events/42", "Events"),
        ("/a\x00b\x1f", "Ab"),
    ],
)
def test_the_title_is_the_last_segment_that_is_words(path, title):
    assert title_from_path(path) == title


def test_a_long_segment_is_cut():
    assert len(title_from_path("/" + "a" * 500)) == 80
