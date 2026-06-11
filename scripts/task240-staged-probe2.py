#!/usr/bin/env python3
"""TASK-240 — staged-response timing probe (eval lane, explicit staged opt-in)."""
import json
import time
import sys
import urllib.request
from pathlib import Path

PREVIEW = sys.argv[1] if len(sys.argv) > 1 else 'https://gonr-qasf8dtoq-gonrpros-projects.vercel.app'
assert PREVIEW.startswith('https://gonr-') and PREVIEW.endswith('.vercel.app'), 'gonr previews only'

secret = ''
envfile = Path(__file__).resolve().parent.parent / '.vercel' / '.env.preview.local'
for line in envfile.read_text(encoding='utf-8').splitlines():
    if line.startswith('GONR_EVAL_SECRET='):
        v = line.split('=', 1)[1].strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in '\'"':
            v = v[1:-1]
        secret = v
        break
assert secret, 'no eval secret'


def staged(body):
    req = urllib.request.Request(
        PREVIEW + '/api/solve', data=json.dumps(body).encode(),
        headers={'Content-Type': 'application/json', 'x-gonr-eval-secret': secret})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=120) as resp:
        ctype = resp.headers.get('Content-Type', '')
        if 'x-ndjson' not in ctype:
            data = json.loads(resp.read())
            print(f'  classic: total={time.time()-t0:.3f}s source={data.get("source")} card={bool(data.get("card"))}')
            return
        buf = b''
        while True:
            ch = resp.read(1)
            if not ch:
                break
            buf += ch
            if ch == b'\n':
                line = buf.decode().strip()
                buf = b''
                if not line:
                    continue
                o = json.loads(line)
                print(f'  stage={o.get("_stage")}: t={time.time()-t0:.3f}s firstAid={bool(o.get("firstAid"))} '
                      f'directAnswer={bool(o.get("directAnswer"))} source={o.get("source")} card={bool(o.get("card"))}')


print('== staged AI path (ketchup/polyester, evalViewerTier=home):')
for i in range(2):
    print(f' run {i+1}:')
    staged({'stain': 'ketchup', 'surface': 'polyester kid shirt', 'staged': True, 'evalViewerTier': 'home'})
print('== staged + direct hazard question (bleach Q, white cotton):')
staged({'stain': 'coffee, can I use bleach?', 'surface': 'white cotton shirt, machine-wash label', 'staged': True, 'evalViewerTier': 'home'})
print('== no staged flag -> classic (harness shape):')
staged({'stain': 'ketchup', 'surface': 'polyester kid shirt', 'evalViewerTier': 'home'})
