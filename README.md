# 迹心 PsyTrace

**低成本、易部署的本地大学生心理健康测评平台 — 问卷 + 非接触式行为感知**
**A Low-Cost, Easily Deployable Local Platform for College Mental Health Screening Using Questionnaires and Unobtrusive Behavioral Sensing**

完全开源 · 本地优先 · 零额外硬件 | Fully open source · Local-first · Zero additional hardware

---

### 简介 | Overview

**中文**

迹心（PsyTrace）是一个面向高校心理咨询中心的心理健康测评服务平台。学生在作答 成熟量表（PHQ-9、GAD-7、C-SSRS、PSS-10、PSQI、SIAS-6、ASLEC）的同时，平台同步采集鼠标轨迹与摄像头视频等行为数据，实现"自评问卷 + 客观行为信号"的互补式筛查。所有数据仅保存在本地（SQLite / IndexedDB），零网络依赖；无需脑电、手环等任何额外外设，普通办公电脑即可部署，硬件成本趋近于零。系统提供中英双语界面与隐私脱敏导出，完整源代码已在 GitHub 开源。

**English**

PsyTrace is a mental health screening platform for college counseling centers. While respondents complete a battery of validated scales (PHQ-9, GAD-7, C-SSRS, PSS-10, PSQI, SIAS-6, ASLEC), the platform silently captures behavioral data — mouse trajectories and optional camera video — combining self-report questionnaires with objective behavioral signals. All data stays on-device (SQLite / IndexedDB) with zero network dependency; no extra peripherals such as EEG headsets or wristbands are required, so a standard workstation is enough and the marginal hardware cost is effectively zero. The interface is bilingual (Chinese/English), exports support privacy masking, and the complete source code is openly available on GitHub.

---

### 核心特性 | Key Features

| # | 中文 | English |
|---|---|---|
| 1 | **本地优先与隐私保护**：测评记录、行为流、摄像头视频与设置仅存本地（SQLite + IndexedDB），不经过任何服务器 | **Local-first & privacy-preserving**: records, behavioral streams, camera video, and settings persist exclusively on-device (SQLite + IndexedDB); no server involved |
| 2 | **量表 + 自定义量表**：7套内置量表独立启用/停用，支持 JSON/TXT 上传自定义量表 | **7 built-in scales + custom scales**: each scale can be enabled/disabled independently; custom scales uploadable from JSON/TXT |
| 3 | **鼠标轨迹传感**：作答全程采样指针位置与点击事件，提取 14 个运动学特征与 5 个可解释行为信号 | **Mouse-trajectory sensing**: pointer position and clicks sampled throughout the questionnaire, yielding 14 kinematic features and 5 interpretable behavioral signals |
| 4 | **摄像头采集与降级模式**：320×240 WebM 录制；拒绝授权或无摄像头时自动降级，测评流程不中断 | **Camera capture with degraded mode**: 320×240 WebM recording; falls back gracefully when permission is denied, with the assessment flow never blocked |
| 5 | **数据管理与探索性分析**：多维度筛选、逐量表风险分布、行为信号 × 风险交叉表、量表-行为相关性热力矩阵 | **Data management & exploratory analysis**: multi-dimension filtering, per-scale risk distributions, signal × risk cross-tabulations, scale-behavior correlation heatmaps |
| 6 | **隐私脱敏导出**：CSV / JSON / 自包含 HTML 报告与单记录报告均支持一键脱敏；视频可独立导出并附带处理警示 | **Privacy-aware export**: CSV/JSON/self-contained HTML reports and per-record reports with one-click de-identification; video exportable separately with an explicit handling warning |
| 7 | **中英双语界面**：545+ 国际化键，文档标题与元信息随语言切换 | **Bilingual interface**: 545+ i18n keys in Chinese and English; document title and meta update with the active language |

---

### 内置量表 | Built-in Scales

| 量表 Scale | 条目 Items | 测量窗口 Window | 构念 Construct | 默认切分 Default cutoffs |
|---|---|---|---|---|
| PHQ-9 | 9 | 近 2 周 | 抑郁严重度 | 0–4 / 5–9 / 10–14 / ≥15 |
| GAD-7 | 7 | 近 2 周 | 广泛性焦虑 | 0–4 / 5–9 / 10–14 / ≥15 |
| C-SSRS（筛查版） | 4 | 近 1 月 | 自杀意念/行为 | 任一阳性 → 高风险 |
| PSS-10 | 10 | 近 1 月 | 感知压力 | 0–13 / 14–19 / 20–26 / ≥27 |
| PSQI | 19（7 成分） | 近 1 月 | 睡眠质量 | 0–5 / 6–10 / 11–15 / ≥16 |
| SIAS-6 | 6 | 近 2 周 | 社交互动焦虑 | 0–6 / 7–12 / 13–18 / ≥19 |
| ASLEC | 27 | 近 1 年 | 负性生活事件 | 0–15 / 16–35 / 36–60 / ≥61 |

---

### 技术栈 | Tech Stack

| 层 Layer | 技术 Technology |
|---|---|
| 桌面框架 Desktop shell | Tauri 2（Rust + WebView） |
| 前端 Front end | Next.js 14 · React 18 · TypeScript |
| 样式 Styling | TailwindCSS |
| 本地存储 Storage | SQLite（Rust 核心，测评记录与设置）+ IndexedDB（WebView，摄像头视频） |
| 验证 Verification | `tsc --noEmit`、生产构建 `next build`、26 项 DOM 级冒烟测试 |

---

### 快速开始 | Getting Started

#### 环境要求 | Prerequisites

- Node.js ≥ 18 与 npm / Node.js ≥ 18 and npm
- Rust 工具链（rustup）/ Rust toolchain
- Windows：WebView2 运行时与 Visual Studio Build Tools（Tauri 依赖）/ Windows: WebView2 runtime and Visual Studio Build Tools (Tauri requirements)

#### 安装与运行 | Install & Run

```bash
npm install          # 安装前端依赖 / install front-end dependencies
npm run tauri:dev    # 桌面应用开发模式 / desktop app in dev mode
npm run tauri:build  # 打包安装程序（MSI / NSIS）/ build installers
```

浏览器内纯前端预览 / browser-only front-end preview:

```bash
npm run dev
```

另附无需构建的独立演示文件 `preview.html`（本地直接双击打开，管理密码 `admin123`）。/ A build-free standalone demo file `preview.html` is also included (open locally; default admin password `admin123`).

---

### 使用流程 | Workflow

1. **管理员配置**：在"测评设置 → 量表管理"中启用量表、调整阈值、上传自定义量表。/ **Admin setup**: enable scales, adjust thresholds, and upload custom scales in Assessment Setup → Scale Management.
2. **学生作答**：填写基本信息 → 阅读知情同意（摄像头在此预授权，可拒绝）→ 作答量表；期间鼠标轨迹静默采样，摄像头按同意情况录制。/ **Respondent assessment**: basic info → informed consent (camera pre-authorized here, may be declined) → questionnaire battery, with silent mouse sampling and consent-based camera recording.
3. **本地归档**：记录完整存入本地，含逐量表得分、风险标签、行为特征与信号、摄像头模式与视频引用。/ **Local archival**: the record is stored locally with per-scale scores, risk labels, behavior metrics and signals, camera mode, and video references.
4. **咨询师分析**：多维度筛选与检索，查看完整答题卷与鼠标轨迹 SVG 回放，进行探索性分析。/ **Staff analysis**: filter and search records, inspect the full answer sheet with the mouse-trajectory SVG replay, and run exploratory analytics.
5. **导出**：生成脱敏 CSV/JSON/HTML 批量报告或单记录报告，可打印为 PDF。/ **Export**: privacy-masked CSV/JSON/HTML batch reports or per-record reports, printable to PDF.

---

### 量表版权说明 | Scale Licensing

**中文**

- PHQ-9、GAD-7 属公共领域，版权方 Pfizer 声明无需许可即可复制、翻译、展示或分发。
- C-SSRS 面向临床与社区使用免费（© 2008 Research Foundation of Mental Hygiene, Inc.），商用需另行授权。
- PSQI 版权属匹兹堡大学，仅限非商业研究与教育用途免费重印且不得修改，商用需联系校方技术管理办公室。
- PSS-10 非商业研究与教育使用通行免费。
- SIAS-6 为 Mattick & Clarke (1998) SIAS 的 6 题简版（Peters 等, 2012），学术使用通行免费。
- NSSI 模块为基于 Nock 自伤研究框架自编的 2 题筛查；ASLEC 为刘贤臣等（1997）编制的中国本土量表。
- 内置中文条目依据通行版本整理（筛查用途）；正式投入临床或商业使用前，请与量表版权方核校。

**English**

- PHQ-9 and GAD-7 are in the public domain; Pfizer, the copyright holder, states that no permission is required to reproduce, translate, display, or distribute them.
- C-SSRS is free for clinical and community use (© 2008 Research Foundation of Mental Hygiene, Inc.); commercial use requires a separate license.
- PSQI is copyrighted by the University of Pittsburgh and may be reprinted without charge only for non-commercial research and educational purposes, without modification; contact the university's Office of Technology Management for commercial licensing.
- PSS-10 is commonly free for non-commercial research and educational use.
- SIAS-6 is the 6-item short form of the SIAS (Mattick & Clarke, 1998) derived by Peters et al. (2012); free for academic use.
- The NSSI module is a 2-item screen compiled following Nock's NSSI research framework; ASLEC is a Chinese domestic scale developed by Liu et al. (1997).
- The built-in Chinese items are compiled from common practice versions for screening purposes; verify them with the scale rights holders before clinical or commercial deployment.

---

### 免责声明 | Disclaimer

**中文** 本平台输出（风险分级、行为信号、相关性分析）均为启发式筛查参考，不构成临床诊断；任何服务决策须由专业人员结合完整记录综合判断。

**English** All outputs (risk tiers, behavioral signals, correlation analyses) are heuristic screening references, not clinical diagnoses; any service decision requires professional evaluation of the full record.

---

### 引用 | Citation

如在工作中使用本软件，请引用 / If you use PsyTrace in your work, please cite:

> Miaoling Luo, Guo X*. PsyTrace: A Low-Cost, Easily Deployable Local Platform for College Mental Health Screening Using Questionnaires and Unobtrusive Behavioral Sensing. Preprint. 2026. doi: 10.20944/preprints202609.1662.v1

---

### 开源与联系方式 | Open Source & Contact

本项目完全开源，托管于 GitHub / This project is fully open source and hosted on GitHub:
<https://github.com/GuoXiang9399/PsyPlat>

作者 / Author: **Xiang Guo**— Henan University, Kaifeng, China
邮箱 / Email: <guoxiang@henu.edu.cn>
