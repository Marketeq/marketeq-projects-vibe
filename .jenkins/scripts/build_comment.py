#!/usr/bin/env python3
"""Build a GitHub PR comment from the verdict JSON."""
import json
import sys

data = json.load(open('/tmp/verdict.json'))
verdict = data.get('verdict', 'ERROR')
summary = data.get('summary', '')
regressions = data.get('regressions', [])
flows = data.get('affected_critical_flows', [])
safe = data.get('safe_changes', '')

icon_map = {
    'SAFE': ':white_check_mark:',
    'RISKY': ':warning:',
    'BLOCK': ':no_entry:',
    'ERROR': ':grey_question:',
    'SKIP': ':fast_forward:'
}
icon = icon_map.get(verdict, ':grey_question:')
bt = chr(96)

lines = []
lines.append(f'## {icon} Deep Regression Check - {verdict}')
lines.append('')
lines.append(f'**Summary:** {summary}')
lines.append('')

if regressions:
    lines.append(f'### Regressions Found ({len(regressions)})')
    lines.append('')
    for r in regressions:
        sev = r.get('severity', '?')
        sev_icon = {
            'CRITICAL': ':rotating_light:',
            'HIGH': ':red_circle:',
            'MEDIUM': ':large_orange_diamond:',
            'LOW': ':yellow_circle:'
        }.get(sev, ':grey_question:')
        lines.append(
            f'{sev_icon} **{sev}** | '
            f'{bt}{r.get("category", "?")}{bt} | '
            f'{bt}{r.get("file", "?")}:{r.get("line_range", "?")}{bt}'
        )
        lines.append(f'> {r.get("description", "")}')
        if r.get('before'):
            lines.append(f'> **Before:** {r.get("before", "")}')
        if r.get('after'):
            lines.append(f'> **After:** {r.get("after", "")}')
        if r.get('impact'):
            lines.append(f'> **Impact:** {r.get("impact", "")}')
        lines.append('')

if flows:
    lines.append('### Critical Data Flows Affected')
    for f in flows:
        lines.append(f'- :rotating_light: **{f}**')
    lines.append('')

if safe:
    lines.append(f'<details><summary>Safe changes</summary>{safe}</details>')
    lines.append('')

lines.append('<!-- deep-regression-check -->')
lines.append('Posted by Jenkins CI - Deep Regression Detector')

print('\n'.join(lines))
