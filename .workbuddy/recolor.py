# -*- coding: utf-8 -*-
"""PsyPlat UI recolor: cream/brown palette -> WorkBuddy blue + neutral gray.
Idempotent string replacements; safe to re-run.
"""
import io

DATA = r"E:\GitHub\PsyPlat\src\app\data\content.tsx"
SETTINGS = r"E:\GitHub\PsyPlat\src\app\settings\content.tsx"

data_pairs = [
    # trajectory canvas
    ("ctx.fillStyle = '#F7F2E8'", "ctx.fillStyle = '#F5F6F8'"),
    ("style={{ background: '#F7F2E8', maxHeight: 220 }}", "style={{ background: '#F5F6F8', maxHeight: 220 }}"),
    ("ctx.strokeStyle = '#A8905F'", "ctx.strokeStyle = '#0052D9'"),
    ("ctx.fillStyle = isClick ? '#dc2626' : isEdge ? '#8F7A4E' : '#A8905F'",
     "ctx.fillStyle = isClick ? '#D54941' : isEdge ? '#003A9E' : '#0052D9'"),
    ("ctx.fillStyle = '#8F7A4E'", "ctx.fillStyle = '#003A9E'"),
    # metrics card
    ("rounded-xl border border-[#E3D9C6] bg-[#F7F2E8] p-4", "rounded-xl border border-orange-100 bg-orange-50/60 p-4"),
    ("text-sm font-semibold text-[#5C4A32]", "text-sm font-semibold text-orange-700"),
    ("rounded-full bg-[#EAE3D5] px-2 py-0.5 text-xs text-[#8F7A4E]", "rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600"),
    ('<span className="text-[#8F7A4E]">{r.label}</span>', '<span className="text-warm-600">{r.label}</span>'),
    ("'text-amber-600' : 'text-[#5C4A32]'", "'text-amber-600' : 'text-orange-700'"),
    ("mt-3 border-t border-[#E3D9C6] pt-2.5", "mt-3 border-t border-orange-100 pt-2.5"),
    ('text-xs font-medium text-[#8F7A4E]">行为信号', 'text-xs font-medium text-warm-600">行为信号'),
    ('text-xs text-[#5C4A32]">未见明显异常信号', 'text-xs text-orange-700">未见明显异常信号'),
    ("text-[11px] leading-relaxed text-[#8F7A4E]", "text-[11px] leading-relaxed text-warm-600"),
    # comments
    ("按采样顺序绘制折线（奶油色主题）", "按采样顺序绘制折线（品牌蓝主题）"),
]

settings_pairs = [
    ("鼠标轨迹调试画布：与数据管理页同款奶油色绘制", "鼠标轨迹调试画布：与数据管理页同款品牌蓝绘制"),
    ("ctx.fillStyle = '#F7F2E8'", "ctx.fillStyle = '#F5F6F8'"),
    ("style={{ background: '#F7F2E8', maxHeight: 220 }}", "style={{ background: '#F5F6F8', maxHeight: 220 }}"),
    ("ctx.strokeStyle = '#A8905F'", "ctx.strokeStyle = '#0052D9'"),
    ("i === 0 || i === traj.length - 1 ? '#8F7A4E' : '#A8905F'",
     "i === 0 || i === traj.length - 1 ? '#003A9E' : '#0052D9'"),
    ("ctx.fillStyle = '#8F7A4E'", "ctx.fillStyle = '#003A9E'"),
    ("style={{ background: '#EAE3D5' }}", "style={{ background: '#EDEFF2' }}"),
]


def apply(path, pairs):
    with io.open(path, "r", encoding="utf-8") as f:
        s = f.read()
    changed = 0
    for old, new in pairs:
        if old in s:
            n = s.count(old)
            s = s.replace(old, new)
            changed += n
    with io.open(path, "w", encoding="utf-8", newline="") as f:
        f.write(s)
    return changed


if __name__ == "__main__":
    n1 = apply(DATA, data_pairs)
    n2 = apply(SETTINGS, settings_pairs)
    print("data/content.tsx replacements:", n1)
    print("settings/content.tsx replacements:", n2)
