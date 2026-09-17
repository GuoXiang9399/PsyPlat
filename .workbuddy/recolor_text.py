# -*- coding: utf-8 -*-
"""Pass 2: text colors -> WorkBuddy ink palette (dark text, NOT blue).

Rule: icons keep the brand blue; any class that colors TEXT becomes ink
(#1D2129 strong / #4E5969 body / #86909C muted). Semantic risk colors keep
their meaning (amber for risk, red for danger).

Idempotent: re-running yields 0 further changes.
"""
import io

FILES = [r"E:\GitHub\PsyPlat\src\app\%s\content.tsx" % n
         for n in ("dashboard", "assessment", "data", "analysis", "settings", "about")]

# (old, new) applied to every file
SHARED = [
    # sidebar / tag "active" state: light blue bg + DARK text (was blue text)
    ("bg-orange-500/15 text-orange-500 border border-orange-500/30",
     "bg-[#EAF1FF] text-ink font-medium"),
    ("bg-orange-500/15 text-orange-500 border-orange-500/30 font-medium",
     "bg-[#EAF1FF] text-ink font-medium"),
    ("bg-orange-500/20 text-orange-500 border border-orange-500/40 font-medium",
     "bg-[#EAF1FF] text-ink font-medium"),
    ("bg-orange-500/15 border-orange-500/30 text-orange-500",
     "bg-[#EAF1FF] text-ink font-medium"),
    ("bg-orange-500/10 text-orange-500 border-orange-500/30",
     "bg-[#EAF1FF] text-ink font-medium"),
    # ghost button: light blue bg + dark text
    ("bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30",
     "bg-[#EAF1FF] hover:bg-[#DCE8FF] text-ink-soft border border-orange-200"),
    # numeric emphasis -> strong dark
    ('<b className="text-orange-500 text-base">', '<b className="text-ink text-base">'),
    ('<b className="text-orange-500">{c}</b>', '<b className="text-ink">{c}</b>'),
    ('<b className="text-orange-500">{selected.aslecScore ?? 0}</b>',
     '<b className="text-ink">{selected.aslecScore ?? 0}</b>'),
    ('<b className="text-orange-500">{selectedTraj.mouseTrajectory?.length ?? 0}</b>',
     '<b className="text-ink">{selectedTraj.mouseTrajectory?.length ?? 0}</b>'),
]

PER_FILE = {
    "assessment": [
        ('<span className="text-orange-500 font-semibold">', '<span className="text-ink font-semibold">'),
        ("bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-2 text-xs text-orange-600",
         "bg-[#EAF1FF] border border-orange-200 rounded-lg px-4 py-2 text-xs text-ink-soft"),
        ("step === currentStep ? 'text-orange-500' : step < currentStep ? 'text-green-400' : 'text-slate-500'",
         "step === currentStep ? 'text-ink' : step < currentStep ? 'text-emerald-500' : 'text-ink-muted'"),
    ],
    "data": [
        ('<h4 className="text-sm font-semibold text-orange-700">行为动力学特征</h4>',
         '<h4 className="text-sm font-semibold text-ink">行为动力学特征</h4>'),
        ("bg-orange-100 px-2 py-0.5 text-xs text-orange-600",
         "bg-orange-100 px-2 py-0.5 text-xs text-ink-soft"),
        ("r.hint ? 'text-amber-600' : 'text-orange-700'", "r.hint ? 'text-amber-600' : 'text-ink'"),
        ('<div className="text-xs text-orange-700">未见明显异常信号。</div>',
         '<div className="text-xs text-ink">未见明显异常信号。</div>'),
        ('<b className="text-orange-500 text-sm">自伤行为阳性</b>',
         '<b className="text-[#D54941] text-sm">自伤行为阳性</b>'),
    ],
    "analysis": [
        ("'中度风险': 'bg-orange-500/15 text-orange-600 border border-orange-500/30'",
         "'中度风险': 'bg-amber-500/15 text-amber-700 border border-amber-500/30'"),
        ("strength < 0.5 ? 'text-orange-600 font-medium' : 'text-red-500 font-bold'",
         "strength < 0.5 ? 'text-amber-600 font-medium' : 'text-[#D54941] font-bold'"),
    ],
    "dashboard": [
        ('<button className="text-orange-500 text-sm flex items-center hover:text-orange-400">',
         '<button className="text-ink-soft text-sm flex items-center hover:text-[#0052D9]">'),
    ],
    "about": [
        ("bg-orange-500/15 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-orange-500",
         "bg-[#EAF1FF] rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-ink"),
    ],
}


def main():
    grand = 0
    for path in FILES:
        key = path.split("\\")[-2]
        with io.open(path, "r", encoding="utf-8") as f:
            s = f.read()
        pairs = SHARED + PER_FILE.get(key, [])
        n = 0
        for old, new in pairs:
            c = s.count(old)
            if c:
                s = s.replace(old, new)
                n += c
        with io.open(path, "w", encoding="utf-8", newline="") as f:
            f.write(s)
        grand += n
        print("%-12s %d" % (key, n))
    print("total:", grand)


if __name__ == "__main__":
    main()
