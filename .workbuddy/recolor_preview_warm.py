# -*- coding: utf-8 -*-
"""preview.html: shift the whole UI palette to match the warm "心之芽" logo.

Blue brand -> coral (#E05A3C), neutral grey -> warm grey, dark text -> warm
near-black. Semantic colours keep meaning; warning moves to amber so it no
longer collides with the new coral primary.

Idempotent: re-running yields 0 further changes.
"""
import io

PATH = r"E:\GitHub\PsyPlat\preview.html"

MAP = {
    # --- brand: blue -> coral (matches logo heart) ---
    "#0052d9": "#E05A3C",
    "#0045bd": "#C74A2F",
    "#003a9e": "#A83C24",
    "#2e6be6": "#E87A5D",
    "rgba(0,82,217,.1)": "rgba(224,90,60,.1)",
    "rgba(0,82,217,.15)": "rgba(224,90,60,.15)",
    "rgba(0,82,217,.35)": "rgba(224,90,60,.35)",
    "rgba(0,82,217,.3)": "rgba(224,90,60,.3)",
    "rgba(0,82,217,.08)": "rgba(224,90,60,.08)",
    "rgba(0,82,217,.07)": "rgba(224,90,60,.07)",
    "rgba(0,82,217,.06)": "rgba(224,90,60,.06)",
    "rgba(0,82,217,.05)": "rgba(224,90,60,.05)",
    "rgba(0,82,217,.04)": "rgba(224,90,60,.04)",
    "rgba(0,82,217,.14)": "rgba(224,90,60,.14)",
    "rgba(0,82,217,.2)": "rgba(224,90,60,.2)",
    "rgba(0,82,217,.5)": "rgba(224,90,60,.5)",
    # active tint / banner copy -> logo plate colour
    "#eaf1ff": "#FDEEE8",
    "#edf4ff": "#FDEEE8",
    # --- neutral grey -> warm grey ---
    "#e5e6eb": "#E6E3DE",
    "#edeff2": "#F1EFEC",
    "#f9fafb": "#FBFAF9",
    "#f5f6f8": "#F7F6F4",
    "#f7f8fa": "#F7F6F4",
    "#f1f5f9": "#F1EFEC",
    "#eef0f4": "#F1EFEC",
    "#cbd5e1": "#C5C0B8",
    "rgba(229,230,235,.6)": "rgba(230,227,222,.6)",
    "rgba(229,230,235,.7)": "rgba(230,227,222,.7)",
    # --- dark text -> warm near-black ---
    "#1d2129": "#1F1D1A",
    "#4e5969": "#524E48",
    "#475569": "#55504A",
    "#334155": "#3A362F",
    "#64748b": "#6B665F",
    "#94a3b8": "#86817A",
    "#8a9099": "#86817A",
    "#86909c": "#86817A",
    # --- semantic: warning off coral, onto amber ---
    "#ed7b2f": "#D48806",
    "rgba(237,123,47,.15)": "rgba(212,136,6,.15)",
    "rgba(237,123,47,.2)": "rgba(212,136,6,.2)",
    "rgba(237,123,47,.3)": "rgba(212,136,6,.3)",
    "rgba(237,123,47,.35)": "rgba(212,136,6,.35)",
    "rgba(237,123,47,.45)": "rgba(212,136,6,.45)",
    "rgba(237,123,47,.85)": "rgba(212,136,6,.85)",
}


def main():
    with io.open(PATH, "r", encoding="utf-8") as f:
        s = f.read()

    total = 0
    for old, new in MAP.items():
        for variant in {old, old.upper()}:
            n = s.count(variant)
            if n:
                s = s.replace(variant, new)
                total += n

    with io.open(PATH, "w", encoding="utf-8", newline="") as f:
        f.write(s)
    print("preview.html warm-palette replacements:", total)


if __name__ == "__main__":
    main()
