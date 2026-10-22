#!/usr/bin/env python3
"""
The weekly dependency report — phase 4, "sustain".

── The problem this solves ──
Phases 1 to 3 made the scanning happen. None of them make anyone LOOK. A
weekly job that writes a table into a run summary nobody opens is theatre:
it produces the appearance of monitoring without the thing monitoring is
for. Phase 4 is the part that puts the result in front of a person.

── The design rule: silence when nothing changed ──
This maintains ONE tracking issue rather than opening a new one each week,
and it comments only when the finding set actually moves. A notification
that says the same thing every Monday is muted within a month, and then the
Monday it finally says something different is muted too.

So: the issue body is always current, and a comment — the thing that
generates a notification — happens only on a real change.

── Where the previous state lives ──
In the issue body, in a fenced JSON block. The issue is the durable record
people actually read, so making it the state store means there is one place
to look and nothing to keep in sync. No artifact archaeology across runs.

Usage:
  sca-weekly-report.py --scan LABEL FILE [--scan ...] [--dry-run]

Environment (supplied by Actions): GITHUB_TOKEN, GITHUB_REPOSITORY.
Exit code is 0 unless something genuinely broke — this reports, it does not
gate. Phase 3 is the gate.
"""
import argparse
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.request

ISSUE_TITLE = "Dependency vulnerabilities — weekly report"
ISSUE_LABEL = "security:dependencies"
STATE_RE = re.compile(r"<!-- sca-state\s*(\{.*?\})\s*-->", re.DOTALL)
BLOCKING = {"CRITICAL", "HIGH"}
EXPIRY_WARNING_DAYS = 14
API = "https://api.github.com"


# ───────────────────────── scan parsing ─────────────────────────

def read_scan(path):
    """Trivy JSON → {'pkg@ID': {...}}. Missing file is not fatal."""
    if not os.path.exists(path):
        return {}
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError) as exc:
        print(f"::warning::could not read {path}: {exc}")
        return {}

    out = {}
    for result in data.get("Results") or []:
        for vuln in result.get("Vulnerabilities") or []:
            key = f"{vuln.get('PkgName','?')}@{vuln.get('VulnerabilityID','?')}"
            out[key] = {
                "pkg": vuln.get("PkgName", "?"),
                "id": vuln.get("VulnerabilityID", "?"),
                "severity": (vuln.get("Severity") or "UNKNOWN").upper(),
                "fixed": vuln.get("FixedVersion") or "",
            }
    return out


def expiring_soon(path=".trivyignore.yaml"):
    """Accepted findings whose expiry is near or past — a warning before the
    hygiene check turns it into a failed build on somebody's unrelated PR."""
    try:
        import yaml
    except ImportError:
        return []
    if not os.path.exists(path):
        return []
    try:
        with open(path, encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
    except Exception:
        return []

    today = datetime.date.today()
    soon = []
    for entry in data.get("vulnerabilities") or []:
        if not isinstance(entry, dict):
            continue
        expiry = entry.get("expired_at")
        if isinstance(expiry, datetime.datetime):
            expiry = expiry.date()
        if not isinstance(expiry, datetime.date):
            continue
        days = (expiry - today).days
        if days <= EXPIRY_WARNING_DAYS:
            soon.append({"id": entry.get("id", "?"), "days": days, "expiry": str(expiry)})
    return sorted(soon, key=lambda e: e["days"])


# ───────────────────────── GitHub API ─────────────────────────

def api(method, path, token, body=None):
    req = urllib.request.Request(
        f"{API}{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "sca-weekly-report",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read() or "null")


def find_issue(repo, token):
    issues = api("GET", f"/repos/{repo}/issues?state=open&labels={ISSUE_LABEL}&per_page=50", token)
    for issue in issues or []:
        if issue.get("title") == ISSUE_TITLE:
            return issue
    return None


# ───────────────────────── rendering ─────────────────────────

def render_body(current, by_target, expiring, now):
    counts = {s: 0 for s in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN")}
    for f in current.values():
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1

    lines = [
        f"_Updated automatically by the weekly dependency scan. Last run: {now}._",
        "",
        "## Where things stand",
        "",
        "| Critical | High | Medium | Low |",
        "|---|---|---|---|",
        f"| {counts['CRITICAL']} | {counts['HIGH']} | {counts['MEDIUM']} | {counts['LOW']} |",
        "",
        "Runtime dependencies only — dev-only findings are excluded, "
        "since they are not reachable from production.",
        "",
    ]

    for label, findings in sorted(by_target.items()):
        urgent = sorted(
            (f for f in findings.values() if f["severity"] in BLOCKING),
            key=lambda f: (f["severity"] != "CRITICAL", f["pkg"]),
        )
        lines.append(f"### {label} — {len(findings)} finding(s), {len(urgent)} high or critical")
        lines.append("")
        if urgent:
            lines.append("| Package | Severity | Fixed in | ID |")
            lines.append("|---|---|---|---|")
            for f in urgent[:25]:
                lines.append(
                    f"| `{f['pkg']}` | {f['severity']} | "
                    f"{f['fixed'] or '_none published_'} | {f['id']} |"
                )
            if len(urgent) > 25:
                lines.append(f"| … | _{len(urgent) - 25} more_ | | |")
        else:
            lines.append("Nothing high or critical.")
        lines.append("")

    if expiring:
        lines.append("## Accepted findings expiring soon")
        lines.append("")
        lines.append(
            "When one of these lapses, the ignore-file hygiene check starts failing "
            "builds — including pull requests that have nothing to do with it. "
            "Renew or resolve them before that happens."
        )
        lines.append("")
        lines.append("| ID | Expires | |")
        lines.append("|---|---|---|")
        for e in expiring:
            state = "**EXPIRED**" if e["days"] < 0 else f"{e['days']} days"
            lines.append(f"| {e['id']} | {e['expiry']} | {state} |")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(
        "A comment is added here only when the finding set changes. "
        "No comment means nothing moved — not that the scan failed to run."
    )
    lines.append("")
    state = {"generated": now, "findings": sorted(current.keys())}
    lines.append(f"<!-- sca-state {json.dumps(state)} -->")
    return "\n".join(lines)


def render_comment(added, removed, expiring, now):
    lines = [f"### Dependency scan — {now}", ""]
    if added:
        crit = [f for f in added if f["severity"] == "CRITICAL"]
        high = [f for f in added if f["severity"] == "HIGH"]
        headline = f"**{len(added)} new finding(s)**"
        if crit or high:
            headline += f" — {len(crit)} critical, {len(high)} high"
        lines += [headline, ""]
        lines.append("| Package | Severity | Fixed in | ID |")
        lines.append("|---|---|---|---|")
        for f in sorted(added, key=lambda x: (x["severity"] != "CRITICAL", x["pkg"]))[:25]:
            lines.append(
                f"| `{f['pkg']}` | {f['severity']} | "
                f"{f['fixed'] or '_none published_'} | {f['id']} |"
            )
        lines.append("")
        lines.append(
            "These appeared against code that has not changed — a newly published "
            "advisory against a dependency already installed. No pull request would "
            "have caught these."
        )
        lines.append("")
    if removed:
        lines.append(f"{len(removed)} finding(s) resolved since the last report.")
        lines.append("")
    newly_expired = [e for e in expiring if e["days"] < 0]
    if newly_expired:
        lines.append(
            f"**{len(newly_expired)} accepted finding(s) have expired** and are now "
            "failing the ignore-file hygiene check."
        )
        lines.append("")
    lines.append("_See the issue body above for the full current picture._")
    return "\n".join(lines)


# ───────────────────────── main ─────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scan", action="append", nargs=2, metavar=("LABEL", "FILE"), required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    by_target = {label: read_scan(path) for label, path in args.scan}
    current = {}
    for findings in by_target.values():
        current.update(findings)

    expiring = expiring_soon()
    now = datetime.date.today().isoformat()
    body = render_body(current, by_target, expiring, now)

    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")

    if args.dry_run or not token or not repo:
        if not args.dry_run:
            print("::warning::GITHUB_TOKEN or GITHUB_REPOSITORY missing; printing only.")
        print(body)
        return 0

    try:
        issue = find_issue(repo, token)
    except urllib.error.HTTPError as exc:
        print(f"::warning::could not list issues ({exc.code}); printing instead.")
        print(body)
        return 0

    previous = set()
    if issue:
        match = STATE_RE.search(issue.get("body") or "")
        if match:
            try:
                previous = set(json.loads(match.group(1)).get("findings") or [])
            except json.JSONDecodeError:
                pass

    added = [current[k] for k in sorted(set(current) - previous)]
    removed = sorted(previous - set(current))
    first_run = issue is None

    try:
        if first_run:
            issue = api("POST", f"/repos/{repo}/issues", token, {
                "title": ISSUE_TITLE, "body": body, "labels": [ISSUE_LABEL],
            })
            print(f"Opened tracking issue #{issue['number']}")
        else:
            api("PATCH", f"/repos/{repo}/issues/{issue['number']}", token, {"body": body})
            print(f"Updated tracking issue #{issue['number']}")

        # The whole point: notify on change, stay quiet otherwise.
        if not first_run and (added or removed or any(e["days"] < 0 for e in expiring)):
            api("POST", f"/repos/{repo}/issues/{issue['number']}/comments", token,
                {"body": render_comment(added, removed, expiring, now)})
            print(f"Commented: {len(added)} new, {len(removed)} resolved")
        elif not first_run:
            print("No change since the last report — issue updated, no comment.")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:300]
        print(f"::warning::GitHub API {exc.code} — {detail}")
        print("The scan itself succeeded; only the report could not be posted.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
