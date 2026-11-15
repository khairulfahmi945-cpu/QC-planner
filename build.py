#!/usr/bin/env python3
"""Build index.html (one self-contained page) from the parts in src/.

    python3 build.py            writes index.html
    python3 build.py --artifact also writes build/artifact.html, the same page without
                                <html>/<head>/<body> for publishing on claude.ai
"""
import os, sys
R = os.path.dirname(os.path.abspath(__file__))
src = lambda n: open(os.path.join(R, 'src', n), encoding='utf-8').read()
JS = ['a1_core.js', 'a2_crane.js', 'a3_pages.js', 'a4_io.js', 'a5_app.js']
head = src('head.html').rstrip('\n')
body = src('body.html').replace('__SVG__', src('hero-fallback.svg.html').strip())
js = ''.join(src(n).rstrip('\n') + '\n' for n in JS)
out = (head + '\n' + src('base.css').rstrip('\n') + '\n' + src('app.css') + body + src('crane3d.js')
       + '<script>\n' + js + '</script>\n</body>\n</html>\n')
open(os.path.join(R, 'index.html'), 'w', encoding='utf-8').write(out)
print('index.html', len(out.encode('utf-8')), 'bytes')
if '--artifact' in sys.argv:
    art = out
    for a in ['<!DOCTYPE html>\n', '<html lang="en">\n', '<head>\n', '<meta charset="utf-8">\n',
              '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n',
              '</head>\n<body>\n']:
        assert a in art, a
        art = art.replace(a, '', 1)
    assert art.endswith('\n</body>\n</html>\n')
    art = art[:-len('</body>\n</html>\n')]
    t = '<title>QC Dashboard Status</title>'
    assert t in art
    art = t + '\n<meta name="claude:viewport-fit-sides" content="cover">\n' + art.replace(t + '\n', '', 1)
    os.makedirs(os.path.join(R, 'build'), exist_ok=True)
    open(os.path.join(R, 'build', 'artifact.html'), 'w', encoding='utf-8').write(art)
    print('build/artifact.html', len(art.encode('utf-8')), 'bytes')
