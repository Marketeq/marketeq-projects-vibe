#!/usr/bin/env python3
"""JSON-encode the prompt file for the Claude API."""
import json
import sys

with open('prompt.txt', 'r') as f:
    content = f.read()

if len(content) > 180000:
    content = content[:180000] + '\n\n[TRUNCATED - analyze what is provided]'

print(json.dumps(content))
