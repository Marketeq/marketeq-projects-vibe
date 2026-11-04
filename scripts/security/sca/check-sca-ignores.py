#!/usr/bin/env python3
"""
Hygiene check for .trivyignore.yaml.

An ignore file is how a scanner stops being useful. Entries go in during an
incident, the reason is "temporary", and three years later nobody can say
what any of them are for. This refuses that outcome mechanically:

  - every entry must say why, in more than a few words
  - every entry must expire
  - nothing may be accepted for more than 90 days at a time
  - an expired entry fails the build until someone renews or removes it

This is the one part of SCA that is allowed to fail a build, and the reason
is worth stating: it does not judge third-party code. It checks OUR OWN
record of what we decided to tolerate. An accepted risk that quietly
outlives its expiry is precisely the failure this whole exercise exists to
prevent, so it is the one thing that should stop a merge.

Exit codes: 0 clean, 1 problems found, 2 could not read the file.
"""
import datetime
import sys

MAX_WINDOW_DAYS = 90
MIN_STATEMENT_CHARS = 30
IGNORE_FILE = ".trivyignore.yaml"

# Phrases that look like a reason but say nothing. Not exhaustive and not
# meant to be clever — just enough to catch the laziest version.
EMPTY_REASONS = {
    "not exploitable",
    "false positive",
    "n/a",
    "na",
    "wontfix",
    "won't fix",
    "accepted",
    "known issue",
    "not applicable",
    "low risk",
    "tbd",
    "todo",
}


def main() -> int:
    try:
        import yaml
    except ImportError:
        print("::error::pyyaml is not installed; cannot validate the ignore file")
        return 2

    try:
        with open(IGNORE_FILE, encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
    except FileNotFoundError:
        print(f"{IGNORE_FILE} not present - nothing to validate.")
        return 0
    except yaml.YAMLError as exc:
        print(f"::error file={IGNORE_FILE}::not valid YAML: {exc}")
        return 2

    entries = data.get("vulnerabilities") or []
    if not isinstance(entries, list):
        print(f"::error file={IGNORE_FILE}::`vulnerabilities` must be a list")
        return 1

    if not entries:
        print(f"{IGNORE_FILE}: no accepted vulnerabilities. Nothing to check.")
        return 0

    today = datetime.date.today()
    problems = []

    for index, entry in enumerate(entries):
        label = (entry or {}).get("id") or f"entry #{index + 1}"
        problems_before = len(problems)

        if not isinstance(entry, dict):
            problems.append(f"{label}: not a mapping")
            continue

        if not entry.get("id"):
            problems.append(f"{label}: no `id` - name the advisory being accepted")

        statement = (entry.get("statement") or "").strip()
        if not statement:
            problems.append(f"{label}: no `statement` - say why this is accepted")
        elif len(statement) < MIN_STATEMENT_CHARS:
            problems.append(
                f"{label}: `statement` is too short to be a reason "
                f"({len(statement)} chars, need {MIN_STATEMENT_CHARS})"
            )
        elif statement.strip().lower().rstrip(".") in EMPTY_REASONS:
            problems.append(
                f'{label}: "{statement}" is a verdict, not a reason. '
                "Say what makes it survivable"
            )

        expiry = entry.get("expired_at")
        if not expiry:
            problems.append(f"{label}: no `expired_at` - there are no permanent exceptions")
            continue

        if isinstance(expiry, datetime.datetime):
            expiry = expiry.date()
        if not isinstance(expiry, datetime.date):
            try:
                expiry = datetime.date.fromisoformat(str(expiry))
            except ValueError:
                problems.append(f"{label}: `expired_at` is not a date (use YYYY-MM-DD)")
                continue

        if expiry < today:
            problems.append(
                f"{label}: EXPIRED on {expiry} ({(today - expiry).days} days ago) - "
                "fix it, or renew the acceptance with a current reason"
            )
        elif (expiry - today).days > MAX_WINDOW_DAYS:
            problems.append(
                f"{label}: expires {expiry}, which is "
                f"{(expiry - today).days} days out (max {MAX_WINDOW_DAYS})"
            )
        elif len(problems) == problems_before:
            # Only clean entries get a tick. Reporting "ok" for an entry that
            # failed an earlier check reads as a contradiction.
            print(f"  ok  {label} - expires {expiry} ({(expiry - today).days} days)")

    if problems:
        print()
        print(f"::error file={IGNORE_FILE}::{len(problems)} problem(s) in the ignore file")
        for problem in problems:
            print(f"  - {problem}")
        print()
        print("An accepted risk needs a reason, an owner and an expiry date.")
        return 1

    print(f"\n{IGNORE_FILE}: {len(entries)} accepted finding(s), all documented and current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
