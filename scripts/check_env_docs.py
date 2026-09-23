#!/usr/bin/env python3
"""CI gate: every variable documented in .env.example must exist in
docs/architecture/environments.md (doc-sync rule from
docs/process/development-workflow.md). Add new vars to BOTH in the same commit.

Exit 1 on mismatch. Pure stdlib.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def env_names() -> set[str]:
    text = (ROOT / ".env.example").read_text()
    names = set()
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.match(r"^([A-Z][A-Z0-9_]+)=", line)
        if match:
            names.add(match.group(1))
    return names


def documented_names() -> set[str]:
    text = (ROOT / "docs/architecture/environments.md").read_text()
    return set(re.findall(r"`([A-Z][A-Z0-9_]+)`", text))


def main() -> int:
    envs = env_names()
    docs = documented_names()
    missing = sorted(envs - docs)
    if missing:
        print("ERROR: variables in .env.example missing from docs/architecture/environments.md:")
        for name in missing:
            print(f"  - {name}")
        print("Add them to the environment table (docs-sync rule).")
        return 1
    print(f"OK: {len(envs)} env vars documented ({len(docs)} names referenced in docs).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
