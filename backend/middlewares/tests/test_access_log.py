import io
import json
import logging

from backend.middlewares import access_log
from backend.middlewares.access_log import configure_access_logger, emit_access_log


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

    emit_access_log(
        method="GET",
        path="/planner/semesters",
        status_code="200",
        duration_seconds=0.0123,
    )

    line = capsys.readouterr().out.strip()
    payload = json.loads(line)
    assert payload["method"] == "GET"
    assert payload["path"] == "/planner/semesters"
    assert payload["status_code"] == "200"
    assert payload["level"] == "info"
    assert payload["log_type"] == "access"
    assert payload["duration_ms"] == 12.3
    assert "message" not in payload
    assert not line.startswith("INFO")


def test_emit_access_log_levels_and_exception():
    buf = io.StringIO()
    _reset_logger(buf)

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
