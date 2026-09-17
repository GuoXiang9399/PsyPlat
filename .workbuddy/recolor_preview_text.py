# -*- coding: utf-8 -*-
"""preview.html: text colors -> WorkBuddy dark ink. Icons/controls keep blue."""
import io
import re

PATH = r"E:\GitHub\PsyPlat\preview.html"

# CSS declarations where the blue is TEXT (not an icon / focus ring / hover)
CSS_TEXT_FIX = [
    (".b-orange { background: rgba(0,82,217,.08); color: #0045bd; }",
     ".b-orange { background: rgba(0,82,217,.08); color: #4e5969; }"),
    (".b-blue { background: rgba(0,82,217,.08); color: #0052d9; }",
     ".b-blue { background: rgba(0,82,217,.08); color: #4e5969; }"),
    (".step-circle.now { background: rgba(0,82,217,.1); color: #0052d9; border: 1px solid rgba(0,82,217,.35); }",
     ".step-circle.now { background: rgba(0,82,217,.1); color: #1d2129; border: 1px solid rgba(0,82,217,.35); }"),
    (".step-label.now { color: #0052d9; }", ".step-label.now { color: #1d2129; }"),
    (".s3-overview b { color: #0052d9; }", ".s3-overview b { color: #1d2129; }"),
    (".opt.sel { background: rgba(0,82,217,.1); color: #0052d9; border-color: rgba(0,82,217,.35); }",
     ".opt.sel { background: rgba(0,82,217,.1); color: #1d2129; border-color: rgba(0,82,217,.35); }"),
    (".a-opt.sel { background: rgba(0,82,217,.1); color: #0052d9; border-color: rgba(0,82,217,.35); }",
     ".a-opt.sel { background: rgba(0,82,217,.1); color: #1d2129; border-color: rgba(0,82,217,.35); }"),
    (".sub-btn.active { background: rgba(0,82,217,.1); color: #0052d9; border-color: rgba(0,82,217,.3); }",
     ".sub-btn.active { background: rgba(0,82,217,.1); color: #1d2129; border-color: rgba(0,82,217,.3); }"),
    (".d-num { color: #0052d9; font-size: 15px; font-weight: 700; }",
     ".d-num { color: #1d2129; font-size: 15px; font-weight: 700; }"),
    (".d-opt.on { background: rgba(0,82,217,.1); color: #0052d9; border-color: rgba(0,82,217,.35); font-weight: 500; }",
     ".d-opt.on { background: rgba(0,82,217,.1); color: #1d2129; border-color: rgba(0,82,217,.35); font-weight: 500; }"),
    ('.detail-btn { background: rgba(0,82,217,.07); color: #0052d9; border: 1px solid rgba(0,82,217,.3);',
     '.detail-btn { background: rgba(0,82,217,.07); color: #4e5969; border: 1px solid rgba(0,82,217,.3);'),
]

# inline style: color only (never background-color / border-color)
INLINE_FIX = [
    (re.compile(r"(?<![-\w])color:\s*#0045bd", re.I), "color:#4e5969"),  # secondary copy
    (re.compile(r"(?<![-\w])color:\s*#003a9e", re.I), "color:#1d2129"),  # data / emphasis
    (re.compile(r"(?<![-\w])color:\s*#0052d9", re.I), "color:#1d2129"),  # strong numbers
]


def main():
    with io.open(PATH, "r", encoding="utf-8") as f:
        s = f.read()

    n = 0
    for old, new in CSS_TEXT_FIX:
        if old in s:
            s = s.replace(old, new)
            n += 1

    before = s
    for pat, rep in INLINE_FIX:
        s, cnt = pat.subn(rep, s)
        n += cnt

    with io.open(PATH, "w", encoding="utf-8", newline="") as f:
        f.write(s)
    print("preview.html text-color fixes:", n)


if __name__ == "__main__":
    main()
