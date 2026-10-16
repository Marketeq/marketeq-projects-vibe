#!/usr/bin/env python3
"""
Refuses client-exposed cryptographic seed material.

`NEXT_PUBLIC_*` (Next.js) and `VITE_*` (Vite) variables are inlined into the
JavaScript bundle at build time and served to every visitor. A value with one
of those prefixes is published, not configured. That is fine for an API base
URL or a Stripe publishable key, and fatal for anything a cryptographic
operation depends on being unguessable.

This check exists because of Security Tasklist item #2. `deriveKEK()` in
frontend/src/crypto/backup.ts derives the key that protects every user's
private key from `userId` + `NEXT_PUBLIC_SYSTEM_SECRET` + a constant salt.
The user id is not secret and the system secret is in the bundle, so the key
is public. The flow is wired and inert only because the variable is unset —
which makes "nobody sets that variable" the entire defence. A defence that
depends on nobody noticing an unset variable is not a defence, so it is
written down here instead.

What it does:

  - scans the tracked tree for client-exposed names that look like secrets
  - every occurrence must be matched by an entry in the allowlist
  - every allowlist entry must say why, and must expire
  - an allowlist entry matching nothing is itself a failure, so that the
    entry cannot outlive the line it was written for

That last rule is the point. An allowlist entry is a tombstone: when Phase 1
removes the derivation, this check fails until the entry goes too, and the
exception cannot quietly become permanent.

Exit codes: 0 clean, 1 problems found, 2 could not read the allowlist.
"""
import datetime
import json
import os
import re
import subprocess
import sys

ALLOWLIST_FILE = ".github/client-exposed-secrets-allowlist.json"
MAX_WINDOW_DAYS = 90
MIN_REASON_CHARS = 40

# Words that mean the value is relied on to be unguessable. Deliberately NOT
# including TOKEN or KEY on their own: a publishable key and a public map
# token are both legitimate and common, and a check that cries wolf on those
# gets switched off within a month. Add a word here the first time one of
# them turns out to matter, not in anticipation.
SECRET_WORDS = r"SECRET|PRIVATE|PRIVKEY|SEED|PASSPHRASE|SIGNING|CREDENTIAL"

PATTERN = re.compile(rf"\b((?:NEXT_PUBLIC_|VITE_)[A-Z0-9_]*(?:{SECRET_WORDS})[A-Z0-9_]*)\b")

# Paths that may name these variables without introducing one: prose about
# the problem, and this check's own machinery, which necessarily spells the
# pattern out.
EXCLUDED_PREFIXES = (
    "docs/",
    ".github/scripts/",
    ALLOWLIST_FILE,
)
EXCLUDED_SUFFIXES = (".md", ".mdx", ".lock", ".svg", ".png", ".jpg", ".ico", ".woff", ".woff2")
EXCLUDED_DIR_PARTS = ("node_modules/", ".next/", "dist/", "build/", "coverage/")


def tracked_files():
    out = subprocess.run(
        ["git", "ls-files", "-z"], capture_output=True, text=True, check=True
    ).stdout
    for path in out.split("\0"):
        if not path:
            continue
        if path.startswith(EXCLUDED_PREFIXES):
            continue
        if path.endswith(EXCLUDED_SUFFIXES):
            continue
        if any(part in path for part in EXCLUDED_DIR_PARTS):
            continue
        yield path


# A comment cannot read an environment variable, so a match inside one is
# never a real exposure — it is almost always prose explaining this very
# problem. Skipping them keeps the check from making the codebase harder to
# document, which is how a check earns its place rather than being worked
# around.
COMMENT_STARTS = ("//", "#", "*", "/*", "--", "<!--", ";")


def is_comment(line: str) -> bool:
    return line.lstrip().startswith(COMMENT_STARTS)


def scan():
    """Every (path, variable, line_no) occurrence in the tracked tree."""
    found = []
    for path in tracked_files():
        # In an env file a commented-out entry is still a prompt to fill it
        # in, so comments there are NOT skipped. Everywhere else they are.
        env_file = os.path.basename(path).startswith(".env")
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                for line_no, line in enumerate(fh, 1):
                    if not env_file and is_comment(line):
                        continue
                    for match in PATTERN.finditer(line):
                        found.append((path, match.group(1), line_no))
        except (OSError, UnicodeDecodeError):
            continue
    return found


def load_allowlist():
    if not os.path.exists(ALLOWLIST_FILE):
        return []
    with open(ALLOWLIST_FILE, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    entries = data.get("allowed")
    if not isinstance(entries, list):
        raise ValueError("'allowed' must be a list")
    return entries


def main():
    problems = []

    try:
        allowed = load_allowlist()
    except Exception as exc:  # noqa: BLE001 - any failure here must be loud
        print(f"Could not read {ALLOWLIST_FILE}: {exc}")
        return 2

    today = datetime.date.today()

    # --- the allowlist has to be worth trusting before it is used ---
    valid_entries = []
    for i, entry in enumerate(allowed):
        label = f"allowlist entry {i + 1}"
        path = entry.get("path")
        variable = entry.get("variable")
        reason = (entry.get("reason") or "").strip()
        expires_raw = entry.get("expires")

        if not path or not variable:
            problems.append(f"{label}: needs both 'path' and 'variable'.")
            continue
        label = f"allowlist entry for {variable} in {path}"

        if len(reason) < MIN_REASON_CHARS:
            problems.append(
                f"{label}: 'reason' must explain why this is tolerable, in at "
                f"least {MIN_REASON_CHARS} characters."
            )
            continue

        if not expires_raw:
            problems.append(f"{label}: needs an 'expires' date (YYYY-MM-DD).")
            continue
        try:
            expires = datetime.date.fromisoformat(str(expires_raw))
        except ValueError:
            problems.append(f"{label}: 'expires' must be YYYY-MM-DD, got '{expires_raw}'.")
            continue

        if expires < today:
            problems.append(
                f"{label}: expired on {expires}. Remove the variable, or renew the "
                f"entry with a fresh justification."
            )
            continue
        if (expires - today).days > MAX_WINDOW_DAYS:
            problems.append(
                f"{label}: expires {expires}, more than {MAX_WINDOW_DAYS} days out. "
                f"Nothing is accepted for longer than that at a time."
            )
            continue

        valid_entries.append((path, variable))

    # --- every occurrence must be covered ---
    occurrences = scan()
    covered = set()
    for path, variable, line_no in occurrences:
        if (path, variable) in valid_entries:
            covered.add((path, variable))
            continue
        prefix = "VITE_" if variable.startswith("VITE_") else "NEXT_PUBLIC_"
        problems.append(
            f"{path}:{line_no} introduces {variable}. A {prefix}* variable is "
            f"compiled into the public JavaScript bundle, so its value is published. "
            f"Source it server-side, or add a justified, expiring entry to "
            f"{ALLOWLIST_FILE}."
        )

    # --- an entry that covers nothing is an exception that outlived its cause ---
    for path, variable in valid_entries:
        if (path, variable) not in covered:
            problems.append(
                f"{ALLOWLIST_FILE} still allows {variable} in {path}, but it is no "
                f"longer there. Delete the entry — the exception has outlived the code."
            )

    if problems:
        for problem in problems:
            print(problem)
        return 1

    print(f"No client-exposed secret material. {len(occurrences)} allowlisted occurrence(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
