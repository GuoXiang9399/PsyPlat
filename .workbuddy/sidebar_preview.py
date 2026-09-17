# -*- coding: utf-8 -*-
"""preview.html sidebar -> WorkBuddy structure + dark (non-blue) text."""
import io
import re

PATH = r"E:\GitHub\PsyPlat\preview.html"

NEW_SIDEBAR_CSS = """  /* ===== 侧边栏 ===== */
  .sidebar { width: 252px; background: #f7f8fa; border-right: 1px solid #e5e6eb; display: flex; flex-direction: column; flex-shrink: 0; transition: width .2s ease; }
  .sidebar.collapsed { width: 68px; }
  .logo-box { height: 56px; padding: 0 12px; border-bottom: 1px solid #e5e6eb; display: flex; align-items: center; }
  .logo-inner { display: flex; align-items: center; gap: 10px; width: 100%; }
  .sidebar.collapsed .logo-inner { justify-content: center; }
  .logo-mark { width: 32px; height: 32px; border-radius: 8px; background: #0052d9; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .logo-text { min-width: 0; flex: 1; }
  .sidebar.collapsed .logo-text { display: none; }
  .logo-title { font-size: 13px; font-weight: 600; color: #1d2129; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .logo-sub { font-size: 11px; color: #86909c; line-height: 1.3; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
  .nav-group { padding: 0 12px 8px; font-size: 11px; font-weight: 500; color: #86909c; }
  .sidebar.collapsed .nav-group { display: none; }
  .nav-btn {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 12px;
    border-radius: 8px; font-size: 13px; font-family: inherit; cursor: pointer;
    background: transparent; border: 1px solid transparent; color: #4e5969; transition: all .15s;
  }
  .nav-btn svg { width: 18px; height: 18px; color: #86909c; flex-shrink: 0; }
  .sidebar.collapsed .nav-btn { justify-content: center; padding: 8px 0; }
  .nav-label { white-space: nowrap; }
  .sidebar.collapsed .nav-label { display: none; }
  .nav-btn:hover { background: #edeff2; color: #1d2129; }
  .nav-btn.active { background: #eaf1ff; color: #1d2129; font-weight: 500; border-color: transparent; }
  .nav-btn.active svg { color: #0052d9; }
  .sidebar-foot { padding: 8px; border-top: 1px solid #e5e6eb; }
  .collapse-btn {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 12px;
    border: none; background: transparent; border-radius: 8px; color: #4e5969; font-size: 13px;
    font-family: inherit; cursor: pointer; transition: all .15s;
  }
  .sidebar.collapsed .collapse-btn { justify-content: center; padding: 8px 0; }
  .collapse-btn svg { width: 18px; height: 18px; color: #86909c; flex-shrink: 0; }
  .collapse-btn:hover { background: #edeff2; color: #1d2129; }
"""

OLD_LOGO_BLOCK = """    <div class="logo-box">
      <div class="logo-inner">
        <div class="logo-title">河南大学基础医学院心理站</div>
        <button class="collapse-btn" id="collapseBtn" title="折叠侧边栏" aria-label="折叠侧边栏">
          <svg width="18" height="18"><use href="#i-panel-l"/></svg>
        </button>
      </div>
    </div>
    <nav class="nav" id="nav">
      <button class="nav-btn active" data-tab="dashboard">"""

NEW_LOGO_BLOCK = """    <div class="logo-box">
      <div class="logo-inner">
        <div class="logo-mark"><svg width="18" height="18"><use href="#i-brain"/></svg></div>
        <div class="logo-text">
          <div class="logo-title">心理预警系统</div>
          <div class="logo-sub">河南大学基础医学院</div>
        </div>
      </div>
    </div>
    <nav class="nav" id="nav">
      <div class="nav-group">功能导航</div>
      <button class="nav-btn active" data-tab="dashboard">"""

OLD_NAV_END = """      <button class="nav-btn" data-tab="about"><svg width="20" height="20"><use href="#i-info"/></svg><span class="nav-label">关于系统</span></button>
    </nav>
  </aside>"""

NEW_NAV_END = """      <button class="nav-btn" data-tab="about"><svg width="20" height="20"><use href="#i-info"/></svg><span class="nav-label">关于系统</span></button>
    </nav>
    <div class="sidebar-foot">
      <button class="collapse-btn" id="collapseBtn" title="收起侧边栏" aria-label="收起侧边栏">
        <svg width="18" height="18"><use href="#i-panel-l"/></svg><span class="nav-label">收起侧边栏</span>
      </button>
    </div>
  </aside>"""

# text colors that must NOT be blue (links / de-emphasised copy)
TEXT_FIX = [
    (".link-blue { color: #0052d9; font-size: 14px;", ".link-blue { color: #4e5969; font-size: 14px;"),
    (".link-blue:hover { color: #0045bd; }", ".link-blue:hover { color: #0052d9; }"),
]


def main():
    with io.open(PATH, "r", encoding="utf-8") as f:
        s = f.read()
    n = 0

    # 1) replace sidebar CSS block
    start = s.find("  /* ===== 侧边栏 ===== */")
    assert start != -1, "sidebar css start not found"
    end_marker = ".nav-btn.active { background: rgba(0,82,217,.1); color: #0052d9; border-color: rgba(0,82,217,.3); }"
    end = s.find(end_marker, start)
    assert end != -1, "sidebar css end not found"
    s = s[:start] + NEW_SIDEBAR_CSS + s[end + len(end_marker):]
    n += 1

    # 2) logo block + nav group
    if OLD_LOGO_BLOCK in s:
        s = s.replace(OLD_LOGO_BLOCK, NEW_LOGO_BLOCK)
        n += 1

    # 3) footer collapse button
    if OLD_NAV_END in s:
        s = s.replace(OLD_NAV_END, NEW_NAV_END)
        n += 1

    # 4) blue text -> dark text
    for old, new in TEXT_FIX:
        if old in s:
            s = s.replace(old, new)
            n += 1

    with io.open(PATH, "w", encoding="utf-8", newline="") as f:
        f.write(s)
    print("preview.html sidebar edits:", n)


if __name__ == "__main__":
    main()
