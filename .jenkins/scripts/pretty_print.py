#!/usr/bin/env python3
"""Pretty-print the regression verdict to console."""
import json
import sys

data = json.load(sys.stdin)
print()
print('Summary:', data.get('summary', ''))
print()
for r in data.get('regressions', []):
    sev = r.get('severity', '?')
    icon = {
        'CRITICAL': '[!!!]',
        'HIGH': '[!!]',
        'MEDIUM': '[!]',
        'LOW': '[.]'
    }.get(sev, '[?]')
    print(f"{icon} {sev} - {r.get('category', '?')} in {r.get('file', '?')}:{r.get('line_range', '?')}")
    print(f"    {r.get('description', '')}")
    print(f"    Impact: {r.get('impact', '')}")
    print()

flows = data.get('affected_critical_flows', [])
if flows:
    print('Critical flows affected:', ', '.join(flows))
print()
print('Safe changes:', data.get('safe_changes', ''))
