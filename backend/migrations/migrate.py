#!/usr/bin/env python3
"""
Simple migration management script for the Nuros backend.
"""

import subprocess
import sys
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def main():
    """Main migration management function."""
    if len(sys.argv) < 2:
        print("Usage: python migrate.py <command>")
        print("Commands:")
        print("  create <message>  - Create a new migration")
        print("  upgrade           - Apply pending migrations")
        print("  downgrade         - Rollback last migration")
        print("  current           - Show current migration")
        print("  history           - Show migration history")
        return

    command = sys.argv[1]
    
    if command == "create" and len(sys.argv) >= 3:
        message = sys.argv[2]
        run_command(f"alembic revision --autogenerate -m '{message}'", f"Creating migration: {message}")
    
    elif command == "upgrade":
        run_command("alembic upgrade head", "Applying migrations")
    
    elif command == "downgrade":
        run_command("alembic downgrade -1", "Rolling back last migration")
    
    elif command == "current":
        run_command("alembic current", "Checking current migration")
    
    elif command == "history":
        run_command("alembic history", "Showing migration history")
    
    else:
        print("Invalid command. Use 'python migrate.py' for help.")

if __name__ == "__main__":
    main()
