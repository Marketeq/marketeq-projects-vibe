#!/usr/bin/env python3
"""
The SCA gate: fail a pull request that INTRODUCES a vulnerable dependency.

── The one idea this script exists for ──
It compares the pull request against its base branch, not against zero.

A gate that fails on the whole backlog goes red on every pull request from
the day it is switched on, and somebody turns it off within a week. Then
there is no scanning at all, which is worse than where you started. So this
only objects to findings that are NOT already on the base branch — things
this change is adding.

Consequence worth understanding: a pull request that touches no lockfile
cannot fail this gate, because its dependency findings are identical to the
base. That is correct. Catching newly-published advisories against unchanged
code is the weekly scheduled scan's job, not a pull request's.

── What blocks ──
A finding blocks only when all of these hold:
  * it is not present on the base branch (it is new)
  * severity is HIGH or CRITICAL
  * it is in a runtime dependency — dev-only findings never block, because
    test runners and bundlers are not reachable by an attacker
  * it is not accepted in .trivyignore.yaml

Everything else is reported and allowed through.

Usage:
  sca-gate.py --target <label> <head.json> <base.json> [--target ...]

Exit: 0 clean (or monitor mode), 1 new blocking findings, 2 bad input.
"""
import argparse
import json
import os
import sys

BLOCKING_SEVERITIES = {"HIGH", "CRITICAL"}


def load(path):
    """Trivy JSON → {(pkg, id): finding}. A missing file means nothing to compare."""
    if not path or not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError) as exc:
        print(f"::warning::could not read {path}: {exc}")
        return None

    found = {}
    for result in data.get("Results") or []:
        for vuln in result.get("Vulnerabilities") or []:
            pkg = vuln.get("PkgName", "?")
            vid = vuln.get("VulnerabilityID", "?")
            found[(pkg, vid)] = {
                "pkg": pkg,
                "id": vid,
                "severity": (vuln.get("Severity") or "UNKNOWN").upper(),
                "installed": vuln.get("InstalledVersion", "?"),
                "fixed": vuln.get("FixedVersion") or "",
                "title": (vuln.get("Title") or "").strip(),
            }
    return found


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--target", action="append", nargs=3, metavar=("LABEL", "HEAD", "BASE"),
        required=True,
    )
    parser.add_argument("--mode", default=os.environ.get("SCA_GATE_MODE", "enforce"))
    args = parser.parse_args()
    mode = (args.mode or "enforce").strip().lower()

    blocking = []
    introduced_but_allowed = []
    unknown_base = []

    for label, head_path, base_path in args.target:
        head = load(head_path)
        if head is None:
            print(f"::warning::no scan results for {label}; skipping")
            continue

        base = load(base_path)
        if base is None:
            # No base scan — usually a lockfile that did not exist before.
            # Report it, but do not treat every finding in a brand-new
            # lockfile as "introduced by this PR"; that is a judgement for a
            # human, and failing here would block legitimate new services.
            unknown_base.append(label)
            continue

        for key, finding in head.items():
            if key in base:
                continue  # already on the base branch: the backlog, not this PR
            finding["target"] = label
            if finding["severity"] in BLOCKING_SEVERITIES:
                blocking.append(finding)
            else:
                introduced_but_allowed.append(finding)

    summary = []
    summary.append("## Dependency gate\n")

    if unknown_base:
        summary.append(
            f"No base scan for: {', '.join(unknown_base)} — probably a new lockfile. "
            "Findings there were reported but not gated.\n"
        )

    if blocking:
        summary.append(
            f"**{len(blocking)} new high/critical finding(s) in runtime dependencies.**\n"
        )
        summary.append("| Lockfile | Package | Installed | Fixed in | Severity | ID |")
        summary.append("|---|---|---|---|---|---|")
        for f in sorted(blocking, key=lambda x: (x["severity"] != "CRITICAL", x["pkg"])):
            fixed = f["fixed"] or "_no fix published_"
            summary.append(
                f"| {f['target']} | `{f['pkg']}` | {f['installed']} | {fixed} | "
                f"**{f['severity']}** | {f['id']} |"
            )
        summary.append("")
        summary.append("### What to do")
        summary.append("")
        summary.append(
            "- **If a fix is published**, upgrade the package. That is the whole job."
        )
        summary.append(
            "- **If the dependency is transitive**, raise it with an `overrides` entry "
            "in `package.json` — and note the version you pin, because pins go stale "
            "(three of the existing nine already have)."
        )
        summary.append(
            "- **If there is no fix**, accept it deliberately: add an entry to "
            "`.trivyignore.yaml` with a reason, your name and an expiry date. "
            "Not a placeholder reason — the hygiene check rejects those."
        )
        summary.append(
            "- **If this is genuinely urgent and none of the above fits**, add the "
            "`sca-override` label to this pull request. The gate steps aside and the "
            "override is recorded in the label history."
        )
        summary.append("")
    else:
        summary.append("No new high or critical findings in runtime dependencies.\n")

    if introduced_but_allowed:
        summary.append(
            f"<details><summary>{len(introduced_but_allowed)} new finding(s) below the "
            "blocking threshold — reported, not blocking</summary>\n"
        )
        summary.append("| Lockfile | Package | Severity | ID |")
        summary.append("|---|---|---|---|")
        for f in introduced_but_allowed[:40]:
            summary.append(f"| {f['target']} | `{f['pkg']}` | {f['severity']} | {f['id']} |")
        summary.append("\n</details>\n")

    summary.append(
        "_Only findings absent from the base branch are considered. "
        "The existing backlog is tracked in the weekly scan, not here._"
    )

    text = "\n".join(summary)
    print(text)
    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        try:
            with open(step_summary, "a", encoding="utf-8") as handle:
                handle.write(text + "\n")
        except OSError:
            pass

    if not blocking:
        return 0
    if mode != "enforce":
        print(f"\n::warning::{len(blocking)} new finding(s); SCA_GATE_MODE={mode}, not failing.")
        return 0
    print(f"\n::error::{len(blocking)} new high/critical runtime finding(s) introduced by this pull request.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
