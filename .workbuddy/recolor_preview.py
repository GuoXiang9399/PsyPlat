# -*- coding: utf-8 -*-
"""preview.html recolor: cream palette -> WorkBuddy blue + neutral gray.
Order matters: gradient & banner text handled BEFORE generic single-color pass.
Idempotent: re-running produces no further changes.
"""
import io

PATH = r"E:\GitHub\PsyPlat\preview.html"

# Pass 1: compound patterns that must run BEFORE generic single-color replace
compound = [
    # banner gradient (blue ramp, not blue->darkblue)
    ("linear-gradient(90deg, #A8905F, #8F7A4E)", "linear-gradient(90deg, #003A9E, #2E6BE6)"),
    # banner subtitle text: light blue-white on blue (NOT the gray block bg)
    (".banner p { color: #F7F2E8; }", ".banner p { color: #EDF4FF; }"),
]

# Pass 2: generic single-color / rgba mapping (case-insensitive)
generic = {
    # backgrounds & borders: cream -> neutral gray
    "#eae3d5": "#f5f6f8",
    "#f7f2e8": "#f9fafb",
    "#e5d8c2": "#e5e6eb",
    "#e3d9c6": "#e5e6eb",
    "#f2e9da": "#edeff2",
    "#f0e8da": "#edeff2",
    "#fbf7ef": "#f9fafb",
    "#a9946f": "#8a9099",
    "#c4b697": "#a9aeb8",
    "#5c4a32": "#003a9e",
    # brand: cream brown -> brand blue
    "#a8905f": "#0052d9",
    "#8f7a4e": "#0045bd",
    # semantic: red/green/orange -> TDesign equivalents
    "#ef4444": "#d54941",
    "#dc2626": "#d54941",
    "#f97316": "#ed7b2f",
    "#ea580c": "#ed7b2f",
    "#d97706": "#ed7b2f",
    "#16a34a": "#2ba344",
    "#22c55e": "#2ba344",
    "#c9b895": "#ed7b2f",
    "#e7c98a": "#fde68a",
    "#fdf6e3": "#fffbeb",
    "#9a6700": "#b45309",
}

rgba_map = {
    "rgba(168,144,95,.15)": "rgba(0,82,217,.1)",
    "rgba(168,144,95,.3)": "rgba(0,82,217,.3)",
    "rgba(168,144,95,.35)": "rgba(0,82,217,.35)",
    "rgba(168,144,95,.12)": "rgba(0,82,217,.08)",
    "rgba(168,144,95,.1)": "rgba(0,82,217,.07)",
    "rgba(168,144,95,.08)": "rgba(0,82,217,.06)",
    "rgba(168,144,95,.05)": "rgba(0,82,217,.04)",
    "rgba(168,144,95,.2)": "rgba(0,82,217,.14)",
    "rgba(168,144,95,.5)": "rgba(0,82,217,.5)",
    "rgba(168,144,95,.14)": "rgba(0,82,217,.1)",
    "rgba(229,216,194,.5)": "rgba(229,230,235,.6)",
    "rgba(229,216,194,.6)": "rgba(229,230,235,.7)",
    "rgba(239,68,68,.3)": "rgba(213,73,65,.3)",
    "rgba(239,68,68,.15)": "rgba(213,73,65,.15)",
    "rgba(239,68,68,.12)": "rgba(213,73,65,.12)",
    "rgba(239,68,68,.1)": "rgba(213,73,65,.1)",
    "rgba(249,115,22,.15)": "rgba(237,123,47,.15)",
    "rgba(249,115,22,.2)": "rgba(237,123,47,.2)",
    "rgba(249,115,22,.45)": "rgba(237,123,47,.45)",
    "rgba(249,115,22,.3)": "rgba(237,123,47,.3)",
    "rgba(217,119,6,.35)": "rgba(237,123,47,.35)",
    "rgba(217,119,6,.85)": "rgba(237,123,47,.85)",
    "rgba(34,197,94,.12)": "rgba(43,163,68,.12)",
    "rgba(34,197,94,.3)": "rgba(43,163,68,.3)",
    "rgba(22,163,74,.08)": "rgba(43,163,68,.08)",
    "rgba(22,163,74,.25)": "rgba(43,163,68,.25)",
}


def main():
    with io.open(PATH, "r", encoding="utf-8") as f:
        s = f.read()
    total = 0
    for old, new in compound:
        n = s.count(old)
        s = s.replace(old, new)
        total += n
    # case-insensitive generic pass
    for old, new in generic.items():
        for variant in {old, old.upper(), old.capitalize()}:
            n = s.count(variant)
            if n:
                s = s.replace(variant, new)
                total += n
    for old, new in rgba_map.items():
        n = s.count(old)
        s = s.replace(old, new)
        total += n
    with io.open(PATH, "w", encoding="utf-8", newline="") as f:
        f.write(s)
    print("preview.html replacements:", total)


if __name__ == "__main__":
    main()
