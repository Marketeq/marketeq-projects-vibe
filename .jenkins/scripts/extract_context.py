#!/usr/bin/env python3
"""Extract manifest files and check affected critical flows."""
import json
import sys
import os

def extract_manifest_files(manifest_path):
    """Print all file paths from the regression manifest."""
    try:
        m = json.load(open(manifest_path))
        files = set()
        for flow in m.get('critical_data_flows', []):
            for k in ['backend_source', 'backend_service']:
                v = flow.get(k, '')
                if v:
                    files.add(v.replace('/**', '').replace('/*', ''))
            for c in flow.get('frontend_consumers', []):
                files.add(c)
            for c in flow.get('critical_files', []):
                files.add(c.replace('/**', '').replace('/*', ''))
        for f in files:
            print(f)
    except Exception:
        pass


def check_affected_flows(manifest_path, changed_files_path):
    """Check which critical flows are affected by the changed files."""
    try:
        m = json.load(open(manifest_path))
        changed = open(changed_files_path).read().strip().split('\n')
    except Exception:
        return

    for cf in changed:
        if not cf:
            continue
        for flow in m.get('critical_data_flows', []):
            sources = []
            for k in ['backend_source', 'backend_service']:
                v = flow.get(k, '')
                if v:
                    sources.append(v)
            sources += flow.get('frontend_consumers', [])
            sources += flow.get('critical_files', [])
            for s in sources:
                clean = s.replace('/**', '').replace('/*', '')
                if cf.startswith(clean):
                    print(f'CRITICAL FLOW AFFECTED: {flow["name"]}')
                    print(f'  File: {cf}')
                    print(f'  Description: {flow["description"]}')
                    for ex in flow.get('regression_examples', []):
                        print(f'  Known regression: {ex}')
                    print()
                    break


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'manifest-files':
        extract_manifest_files(sys.argv[2])
    elif cmd == 'affected-flows':
        check_affected_flows(sys.argv[2], sys.argv[3])
    else:
        print(f'Usage: {sys.argv[0]} <manifest-files|affected-flows> <args...>')
        sys.exit(1)
