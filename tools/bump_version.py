#!/usr/bin/env python3
"""Stamp a new asset version into index.html and js/audio.js.

Run before every release (commit + push). Browsers, iPhone Safari especially,
cache CSS/JS/sound files; a changed ?v= query forces them to fetch the new
files together instead of mixing old cached files with new ones.

    python3 tools/bump_version.py
"""
import os
import re
import time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
version = time.strftime('%Y%m%d%H%M%S')

html = os.path.join(ROOT, 'index.html')
s = open(html, encoding='utf-8').read()
s = re.sub(r'((?:href|src)="(?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=\w+)?"', rf'\1?v={version}"', s)
open(html, 'w', encoding='utf-8').write(s)

audio = os.path.join(ROOT, 'js', 'audio.js')
s = open(audio, encoding='utf-8').read()
s = re.sub(r"const ASSET_VERSION = '\w*';", f"const ASSET_VERSION = '{version}';", s)
open(audio, 'w', encoding='utf-8').write(s)

print('asset version ->', version)
