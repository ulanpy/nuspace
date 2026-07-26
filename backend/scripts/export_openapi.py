import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENV_FILE = REPOSITORY_ROOT / "infra" / ".env.example"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export the FastAPI contract without starting external services."
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=DEFAULT_ENV_FILE,
        help="Dummy configuration fixture loaded before importing the app.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Write JSON here instead of stdout.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    load_dotenv(args.env_file, override=False)
    sys.path.insert(0, str(REPOSITORY_ROOT))

    # Config is instantiated while importing the app, so the fixture must be
    # loaded first. Importing does not run FastAPI lifespan.
    from backend.main import app

    schema = app.openapi()
    if not schema.get("paths"):
        raise RuntimeError("OpenAPI export has no paths; routers were not registered.")

    # FastAPI's insertion order follows router registration and is stable.
    # Preserve it so codegen diffs reflect contract changes instead of sorting
    # thousands of generated declarations alphabetically.
    document = json.dumps(schema, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(document, encoding="utf-8")
        return
    sys.stdout.write(document)


if __name__ == "__main__":
    main()
