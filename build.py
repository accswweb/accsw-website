#!/usr/bin/env python3
"""
build.py — Packages the ACCSW website for GitHub Pages deployment.

What it does:
  • Rewrites every *.html page into a "pretty URL" directory:
      en/about.html  →  docs/en/about/index.html   (served at /en/about/)
  • Files that are already index.html stay as index.html.
  • Updates ALL relative links (href, src, action, meta-refresh, JS location)
    so they resolve correctly from the new file locations.
  • Copies assets/ unchanged.
  • Creates bulletins/ with a README placeholder.
  • Creates .nojekyll so GitHub Pages skips Jekyll processing.

Usage:
    python3 build.py

GitHub Pages setup (after pushing to GitHub):
    Settings → Pages → Source: Deploy from branch → Branch: main
"""

import os
import re
import shutil
from pathlib import Path

WORKSPACE = Path(__file__).parent
DOCS = WORKSPACE

# ─── File map ─────────────────────────────────────────────────────────────────
# source path (relative to WORKSPACE)  →  dest path (relative to DOCS)
FILE_MAP: dict[str, str] = {
    'index.html':          'index.html',
    'en/index.html':       'en/index.html',
    'en/about.html':       'en/about/index.html',
    'en/connect.html':     'en/connect/index.html',
    'en/welcome.html':     'en/welcome/index.html',
    'en/legal.html':       'en/legal/index.html',
    'en/resources.html':   'en/resources/index.html',
    'en/sermons.html':     'en/sermons/index.html',
    'zh/index.html':       'zh/index.html',
    'zh/about.html':       'zh/about/index.html',
    'zh/connect.html':     'zh/connect/index.html',
    'zh/welcome.html':     'zh/welcome/index.html',
}


# ─── Link helpers ─────────────────────────────────────────────────────────────

def normalize_path(base_dir: str, href: str) -> str:
    """
    Resolve href relative to base_dir and return a normalised workspace-relative
    posix path string (no leading slash).
    """
    parts = [p for p in base_dir.split('/') if p and p != '.'] if base_dir else []
    for seg in href.split('/'):
        if seg == '..':
            if parts:
                parts.pop()
        elif seg and seg != '.':
            parts.append(seg)
    return '/'.join(parts)


def transform_link(href: str, src_rel: str) -> str:
    """
    Given a link value (href/src/location) from the file at src_rel, return
    the equivalent link that works correctly from the new docs/ location.
    """
    # Leave external / special / data URIs alone
    if re.match(r'^(https?://|mailto:|tel:|data:|//)', href):
        return href

    # Pure anchor – no path component to transform
    if href.startswith('#'):
        return href

    # Split off anchor fragment
    anchor = ''
    if '#' in href:
        idx = href.index('#')
        anchor = href[idx:]
        href = href[:idx]

    if not href:
        return anchor

    # Resolve to a workspace-relative path
    src_dir = '/'.join(src_rel.split('/')[:-1])          # '' for root files
    resolved = normalize_path(src_dir, href)              # e.g. 'en/connect.html'

    curr_dest     = FILE_MAP[src_rel]
    curr_dest_dir = '/'.join(curr_dest.split('/')[:-1]) or '.'

    if resolved in FILE_MAP:
        # ── HTML page: point to its new pretty-URL directory
        dest     = FILE_MAP[resolved]
        dest_dir = '/'.join(dest.split('/')[:-1]) or '.'

        rel = os.path.relpath(dest_dir, curr_dest_dir).replace('\\', '/')
        if rel == '.':
            rel = './'
        elif not rel.endswith('/'):
            rel += '/'
        return rel + anchor

    else:
        # ── Asset or unknown file: rebase relative path for new depth
        rel = os.path.relpath(resolved, curr_dest_dir).replace('\\', '/')
        return rel + anchor


# ─── HTML processing ──────────────────────────────────────────────────────────

def process_html(content: str, src_rel: str) -> str:
    """Update every URL-bearing attribute in an HTML file."""

    # 1. href / src / action attributes
    def replace_attr(m: re.Match) -> str:
        attr, quote, val = m.group(1), m.group(2), m.group(3)
        return f'{attr}={quote}{transform_link(val, src_rel)}{quote}'

    content = re.sub(r'(href|src|action)=(["\'])([^"\']*)\2', replace_attr, content)

    # 2. <meta http-equiv="refresh" content="0; url=...">
    def replace_refresh(m: re.Match) -> str:
        prefix, url, quote = m.group(1), m.group(2), m.group(3)
        return f'{prefix}{transform_link(url, src_rel)}{quote}'

    content = re.sub(
        r'(content=["\']0;\s*url=)([^"\']+)(["\'])',
        replace_refresh,
        content,
    )

    # 3. window.location.replace("...") and window.location.href = "..."
    def replace_js_loc(m: re.Match) -> str:
        prefix, quote, url, close = m.group(1), m.group(2), m.group(3), m.group(4)
        return f'{prefix}{quote}{transform_link(url, src_rel)}{close}'

    content = re.sub(
        r'(window\.location(?:\.replace\(|\.href\s*=\s*))(["\'])([^"\']+)(\2\)?)',
        replace_js_loc,
        content,
    )

    return content


# ─── Build ────────────────────────────────────────────────────────────────────

def build() -> None:
    # Wipe and recreate docs/
    if DOCS.exists():
        shutil.rmtree(DOCS)
    DOCS.mkdir()
    print(f'Building → {DOCS}\n')

    # .nojekyll — tells GitHub Pages to skip Jekyll
    (DOCS / '.nojekyll').touch()
    print('  ✓  .nojekyll')

    # Copy assets/ verbatim (CSS url() paths are self-contained inside assets/)
    shutil.copytree(WORKSPACE / 'assets', DOCS / 'assets')
    print('  ✓  assets/')

    # bulletins/ — ready for PDF files
    bulletins = DOCS / 'bulletins'
    bulletins.mkdir()
    (bulletins / '.gitkeep').touch()   # keeps the empty dir tracked by git
    (bulletins / 'README.md').write_text(
        '# Bulletins\n\n'
        'Drop weekly bulletin PDF files into this folder.\n\n'
        'Suggested naming convention: `YYYY-MM-DD.pdf`\n'
        'Example: `2025-09-21.pdf`\n',
        encoding='utf-8',
    )
    print('  ✓  bulletins/')

    # Process HTML files
    print()
    errors = 0
    for src_rel, dest_rel in FILE_MAP.items():
        src_path  = WORKSPACE / src_rel
        dest_path = DOCS / dest_rel
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            content     = src_path.read_text(encoding='utf-8')
            new_content = process_html(content, src_rel)
            dest_path.write_text(new_content, encoding='utf-8')
            print(f'  ✓  {src_rel:<32} → docs/{dest_rel}')
        except Exception as exc:
            print(f'  ✗  {src_rel}  ERROR: {exc}')
            errors += 1

    # Summary
    print(f'\n{"✓ Build complete" if not errors else f"✗ Build finished with {errors} error(s)"}.')
    print(f'  {len(FILE_MAP)} HTML files processed → {DOCS}')
    print()
    print('GitHub Pages setup:')
    print('  1. Push this repo to GitHub.')
    print('  2. Settings → Pages → Source: "Deploy from a branch"')
    print('     Branch: main  |  Folder: /docs')
    print('  3. (Optional) Add a CNAME file to docs/ for a custom domain.')


if __name__ == '__main__':
    build()
