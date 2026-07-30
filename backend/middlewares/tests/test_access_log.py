import io
import json
import logging
from types import SimpleNamespace
from unittest.mock import patch

from backend.middlewares import access_log
from backend.middlewares.access_log import configure_access_logger, emit_access_log

_FAKE_TELEMETRY = SimpleNamespace(current_trace_ids=lambda: (None, None))


def _reset_logger(stream: io.StringIO | None = None) -> None:
    logger = logging.getLogger(access_log._ACCESS_LOGGER_NAME)
    logger.handlers.clear()
    logger.propagate = False
    logger.setLevel(logging.INFO)
    if stream is not None:
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
    else:
        configure_access_logger()


def test_emit_access_log_writes_pure_json(capsys):
    _reset_logger()

    with patch.dict("sys.modules", {"backend.telemetry": _FAKE_TELEMETRY}):
        emit_access_log(
            method="GET",
            path="/planner/semesters",
            raw_path="/planner/semesters",
            status_code="200",
            duration_seconds=0.0123,
            is_guest=True,
            actor="guest",
        )

    line = capsys.readouterr().out.strip()
    payload = json.loads(line)
    assert payload["method"] == "GET"
    assert payload["path"] == "/planner/semesters"
    assert payload["raw_path"] == "/planner/semesters"
    assert payload["status_code"] == "200"
    assert payload["level"] == "info"
    assert payload["log_type"] == "access"
    assert payload["duration_ms"] == 12.3
    assert payload["user_sub"] is None
    assert payload["is_guest"] is True
    assert payload["actor"] == "guest"
    assert "message" not in payload
    assert not line.startswith("INFO")
    assert '"user_sub":null' in line


def test_emit_access_log_unmatched_keeps_template_and_raw_path(capsys):
    _reset_logger()

    with patch.dict("sys.modules", {"backend.telemetry": _FAKE_TELEMETRY}):
        emit_access_log(
            method="GET",
            path="[unmatched]",
            raw_path="/wp-admin/install.php",
            status_code="404",
            duration_seconds=0.002,
        )

    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["path"] == "[unmatched]"
    assert payload["raw_path"] == "/wp-admin/install.php"
    assert payload["status_code"] == "404"


def test_emit_access_log_null_user_sub_when_unset(capsys):
    _reset_logger()

    with patch.dict("sys.modules", {"backend.telemetry": _FAKE_TELEMETRY}):
        emit_access_log(
            method="GET",
            path="/metrics",
            status_code="200",
            duration_seconds=0.01,
        )

    line = capsys.readouterr().out.strip()
    payload = json.loads(line)
    assert "user_sub" in payload
    assert payload["user_sub"] is None
    assert '"user_sub":null' in line
    assert "is_guest" not in payload
    assert "actor" not in payload


def test_emit_access_log_levels_and_exception():
    buf = io.StringIO()
    _reset_logger(buf)

    with patch.dict("sys.modules", {"backend.telemetry": _FAKE_TELEMETRY}):
        emit_access_log(
            method="POST",
            path="/foo",
            status_code="500",
            duration_seconds=1.0,
            exception_type="ValueError",
            traceback_text="Traceback (most recent call last):\n  ValueError: boom",
        )
        emit_access_log(
            method="GET",
            path="/bar",
            status_code="404",
            duration_seconds=0.1,
        )

    lines = [json.loads(line) for line in buf.getvalue().strip().splitlines()]
    assert lines[0]["level"] == "error"
    assert lines[0]["exception_type"] == "ValueError"
    assert "ValueError: boom" in lines[0]["traceback"]
    assert "traceback" not in lines[1]
    assert lines[1]["level"] == "warn"
