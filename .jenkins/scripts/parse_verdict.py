#!/usr/bin/env python3
"""Parse Claude API response and extract structured verdict JSON."""
import json
import sys

try:
    r = json.load(sys.stdin)
    if 'error' in r:
        print(json.dumps({
            'verdict': 'ERROR',
            'summary': 'API error: ' + str(r['error']),
            'regressions': []
        }))
    else:
        text = r.get('content', [{}])[0].get('text', '')
        text = text.strip()
        fence = chr(96) * 3
        if text.startswith(fence):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
            if text.endswith(fence):
                text = text[:-3]
            text = text.strip()
        if text.startswith('json'):
            text = text[4:].strip()
        parsed = json.loads(text)
        print(json.dumps(parsed))
except Exception as e:
    print(json.dumps({
        'verdict': 'ERROR',
        'summary': 'Parse error: ' + str(e),
        'regressions': []
    }))
