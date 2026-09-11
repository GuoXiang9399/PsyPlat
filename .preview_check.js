
(function () {
  "use strict";

  /* ============ 图标工具 ============ */
  function icon(id, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '"><use href="#' + id + '"/></svg>';
  }

  /* ============ 全局：侧边栏折叠 ============ */
  var sidebarEl = document.getElementById("sidebar");
  var collapseBtn = document.getElementById("collapseBtn");
  var sidebarCollapsed = false;
  try { sidebarCollapsed = localStorage.getItem("psyc_sidebar_collapsed") === "1"; } catch (e) {}
  function applySidebarState() {
    if (!sidebarEl) return;
    if (sidebarCollapsed) sidebarEl.classList.add("collapsed"); else sidebarEl.classList.remove("collapsed");
    if (collapseBtn) {
      collapseBtn.title = sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏";
      collapseBtn.setAttribute("aria-label", collapseBtn.title);
      collapseBtn.innerHTML = icon(sidebarCollapsed ? "i-panel-r" : "i-panel-l", 18);
    }
  }
  applySidebarState();
  if (collapseBtn) {
    collapseBtn.addEventListener("click", function () {
      sidebarCollapsed = !sidebarCollapsed;
      try { localStorage.setItem("psyc_sidebar_collapsed", sidebarCollapsed ? "1" : "0"); } catch (e) {}
      applySidebarState();
    });
  }

  /* ============ 全局：管理密码 ============ */
  var PROTECTED = { data: "数据管理", settings: "系统设置", about: "关于系统" };
  function getAdminPwd() {
    try { return localStorage.getItem("psyc_admin_pwd") || "123456"; } catch (e) { return "123456"; }
  }
  var adminOk = false;
  try { adminOk = sessionStorage.getItem("psyc_admin_auth") === "1"; } catch (e) {}
  var pendingTab = null;

  var pwdMask = document.getElementById("pwd-mask");
  var pwdInput = document.getElementById("pwd-input");
  var pwdErr = document.getElementById("pwd-err");

  function showPwdModal(tab) {
    pendingTab = tab;
    document.getElementById("pwd-tab-name").textContent = PROTECTED[tab];
    pwdInput.value = "";
    pwdErr.style.display = "none";
    pwdMask.style.display = "flex";
    pwdInput.focus();
  }
  function hidePwdModal() { pwdMask.style.display = "none"; pendingTab = null; }
  function submitPwd() {
    if (pwdInput.value === getAdminPwd()) {
      adminOk = true;
      try { sessionStorage.setItem("psyc_admin_auth", "1"); } catch (e) {}
      var go = pendingTab;
      hidePwdModal();
      if (go) activateTab(go);
    } else {
      pwdErr.style.display = "block";
      pwdInput.focus();
    }
  }
  document.getElementById("pwd-close").addEventListener("click", hidePwdModal);
  document.getElementById("pwd-cancel").addEventListener("click", hidePwdModal);
  document.getElementById("pwd-confirm").addEventListener("click", submitPwd);
  pwdInput.addEventListener("keydown", function (e) { if (e.key === "Enter") submitPwd(); });

  /* ============ 全局：主 Tab 切换 ============ */
  var navBtns = document.querySelectorAll("#nav .nav-btn");
  function activateTab(tab) {
    navBtns.forEach(function (b) { b.classList.remove("active"); });
    document.querySelector('#nav .nav-btn[data-tab="' + tab + '"]').classList.add("active");
    document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
    document.getElementById("tab-" + tab).classList.add("active");
    if (tab === "data" && typeof renderData === "function") renderData();
  }
  navBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tab = btn.getAttribute("data-tab");
      if (PROTECTED[tab] && !adminOk) { showPwdModal(tab); return; }
      activateTab(tab);
    });
  });

  document.getElementById("btn-start-assessment").addEventListener("click", function () {
    activateTab("assessment");
  });

  /* ============ 最近活动数据 ============ */
  var dashData = [
    { id: "A001", sid: "20230801", time: "2026-09-11 09:23", st: "completed"  },
    { id: "A002", sid: "20230815", time: "2026-09-11 10:45", st: "incomplete" },
    { id: "A003", sid: "20230722", time: "2026-09-11 11:02", st: "completed"  },
    { id: "A004", sid: "20230905", time: "2026-09-11 13:18", st: "completed"  },
    { id: "A005", sid: "20230833", time: "2026-09-11 14:30", st: "completed"  }
  ];

  var riskClass = { "高风险": "b-red", "中度风险": "b-orange", "轻度风险": "b-yellow", "低风险": "b-green" };
  var statusText = { completed: "已完成", pending_review: "待审核", intervened: "已干预" };
  var statusClass = { completed: "b-blue", pending_review: "b-yellow", intervened: "b-purple" };
  // 首页最近活动：仅显示完成与否
  var dashStatusText = { completed: "已完成", incomplete: "未完成" };
  var dashStatusClass = { completed: "b-green", incomplete: "b-blue" };

  function rowHtml(r) {
    return '<tr>' +
      '<td>' + r.id + '</td><td>' + r.sid + '</td><td>' + r.time + '</td><td>' + r.p + '</td><td>' + r.g + '</td>' +
      '<td><span class="badge ' + riskClass[r.risk] + '">' + r.risk + '</span></td>' +
      '<td><span class="badge ' + statusClass[r.st] + '">' + statusText[r.st] + '</span></td>' +
      '<td><button class="detail-btn" onclick="openDetail(&quot;' + r.id + '&quot;)">' + icon("i-eye", 14) + ' 查看明细</button></td></tr>';
  }

  /* ============ 记录明细弹窗（量表全部选项与逐题作答结果） ============ */
  function questionBlock(qs, answers, title, score, maxScore, opts) {
    var optLabels = opts || riskOptions;
    var html = '<div class="d-card">' +
      '<div class="d-card-head"><b>' + title + '</b>' +
      '<span class="d-score">总分：<span class="d-num">' + score + '</span> / ' + maxScore + '</span></div>' +
      '<div class="d-qs">';
    qs.forEach(function (q, i) {
      html += '<div class="d-q">' +
        '<div class="d-q-text">' + (i + 1) + '. ' + q + '</div>' +
        '<div class="d-opts">';
      optLabels.forEach(function (opt, oi) {
        var on = answers[i] === oi;
        html += '<span class="d-opt' + (on ? ' on' : '') + '">' + opt + '</span>';
      });
      html += '</div></div>';
    });
    return html + '</div></div>';
  }

  // 补充量表详情（第一层红边 / 第二层橙边），含旧记录空值容错
  function flagBadge(flags, key, label, cls, bg) {
    return (flags || []).indexOf(key) >= 0
      ? '<span class="badge" style="background:' + bg + ';color:' + cls + ';border:1px solid ' + cls + '">' + label + '</span>'
      : '';
  }
  function optChip(opt, on, onCls) {
    return '<span class="d-opt' + (on ? ' on' : '') + '" style="' + (on && onCls ? onCls : '') + '">' + opt + '</span>';
  }
  function suppDetailHtml(r) {
    var flags = r.riskFlags || [];
    var cssrs = r.cssrs || [], nssi = r.nssi || [], pss10 = r.pss10 || [];
    var psqi = r.psqi, sias6 = r.sias6 || [], aslec = r.aslec || [];
    var h = '';

    /* ---- 第一层 · 核心预警 ---- */
    h += '<div class="d-card" style="border:1px solid rgba(248,113,113,.45)">' +
      '<div class="d-card-head" style="background:rgba(248,113,113,.08)"><b>第一层 · 核心预警</b>' +
      '<span class="d-score">' +
      flagBadge(flags, 'suicide', '自杀风险', '#ef4444', 'rgba(239,68,68,.15)') +
      flagBadge(flags, 'nssi', '自伤风险', '#f97316', 'rgba(249,115,22,.15)') +
      '</span></div><div class="d-qs">';
    /* C-SSRS */
    h += '<div class="d-q"><div class="d-q-text"><b>C-SSRS 自杀严重度评定量表</b>' +
      '<span class="d-score" style="float:right">阳性条目：<b style="color:#ef4444">' + (r.cssrsPositive || 0) + '</b> / 4</span></div>';
    if (cssrs.length === 0) {
      h += '<div style="font-size:13px;color:#94a3b8;padding:6px 0">该记录未采集 C-SSRS 数据（旧版本记录）。</div>';
    } else {
      cssrs.forEach(function (ans, i) {
        var positive = ans === 1;
        h += '<div class="d-q" style="background:' + (positive ? 'rgba(248,113,113,.10)' : 'transparent') + ';border:' + (positive ? '1px solid rgba(248,113,113,.30)' : 'none') + ';border-radius:8px;padding:8px;margin-bottom:8px">' +
          '<div class="d-q-text">' + (i + 1) + '. ' + cssrsQ[i] + '</div><div class="d-opts">' +
          cssrsOpts.map(function (opt, oi) {
            var on = ans === oi;
            return optChip(opt, on, on && positive ? 'background:rgba(248,113,113,.2);color:#ef4444;border-color:rgba(248,113,113,.5);font-weight:500' : '');
          }).join('') + '</div></div>';
      });
    }
    h += '</div>';
    /* NSSI */
    h += '<div class="d-q"><div class="d-q-text"><b>NSSI 非自杀性自伤筛查</b>' +
      '<span class="d-score" style="float:right">' + (nssi[0] === 1 ? '<b style="color:#f97316">自伤行为阳性</b>' : '<span style="color:#94a3b8">无自伤行为</span>') + '</span></div>';
    if (nssi.length === 0) {
      h += '<div style="font-size:13px;color:#94a3b8;padding:6px 0">该记录未采集 NSSI 数据（旧版本记录）。</div>';
    } else {
      [0, 1].forEach(function (qi) {
        h += '<div class="d-q" style="padding:4px 0"><div class="d-q-text" style="margin-bottom:6px">' + (qi + 1) + '. ' + nssiQ[qi] + '</div><div class="d-opts">' +
          (qi === 0 ? nssiHasOpts : nssiFreqOpts).map(function (opt, oi) {
            var on = nssi[qi] === oi;
            return optChip(opt, on, on && qi === 0 && oi === 1 ? 'background:rgba(249,115,22,.2);color:#f97316;border-color:rgba(249,115,22,.45);font-weight:500' : '');
          }).join('') + '</div></div>';
      });
    }
    h += '</div></div>';

    /* ---- 第二层 · 扩充画像 ---- */
    h += '<div class="d-card" style="border:1px solid rgba(251,146,60,.45)">' +
      '<div class="d-card-head" style="background:rgba(251,146,60,.08)"><b>第二层 · 扩充画像</b>' +
      '<span class="d-score" style="color:#94a3b8">辅助评估与干预参考</span></div><div class="d-qs">';
    /* PSS-10 */
    h += '<div class="d-q"><div class="d-q-text"><b>PSS-10 感知压力量表</b>' +
      '<span class="d-score" style="float:right">总分：<b style="color:#f97316">' + (r.pss10Score ?? 0) + '</b> / 40 <span style="color:#94a3b8">' + pss10LevelOf(r.pss10Score ?? 0) + '</span></span></div>';
    if (pss10.length === 0) {
      h += '<div style="font-size:13px;color:#94a3b8;padding:6px 0">该记录未采集 PSS-10 数据（旧版本记录）。</div>';
    } else {
      pss10.forEach(function (ans, i) {
        h += '<div class="d-q" style="padding:4px 0"><div class="d-q-text" style="margin-bottom:6px">' + (i + 1) + '. ' + pss10Q[i] +
          (PSS10_REV.indexOf(i) >= 0 ? '<span class="badge" style="background:#fff;color:#94a3b8;border:1px solid #e5d8c2;margin-left:6px;font-weight:400">反向计分</span>' : '') +
          '</div><div class="d-opts">' + pss10Opts.map(function (opt, oi) { return optChip(opt, ans === oi, ''); }).join('') + '</div></div>';
      });
    }
    h += '</div>';
    /* PSQI */
    h += '<div class="d-q"><div class="d-q-text"><b>PSQI 匹兹堡睡眠质量指数</b>' +
      '<span class="d-score" style="float:right">总分：<b style="color:#f97316">' + (r.psqiScore ?? 0) + '</b> / 21 <span style="color:#94a3b8">' + psqiLevelOf(r.psqiScore ?? 0) + '</span></span></div>';
    if (!psqi) {
      h += '<div style="font-size:13px;color:#94a3b8;padding:6px 0">该记录未采集 PSQI 数据（旧版本记录）。</div>';
    } else {
      var comps = r.psqiComps || [];
      h += '<div class="d-q" style="padding:4px 0"><div style="font-size:12px;color:#94a3b8;margin-bottom:6px">7 项成分得分（0-3）：</div>' +
        '<div class="d-opts">' + comps.map(function (c, i) {
          return '<span class="d-opt" style="color:#475569;background:#fff">' + psiqCompNames[i] + '：<b style="color:#f97316">' + c + '</b></span>';
        }).join('') + '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">' +
        '<div class="d-opt" style="color:#475569;background:#F7F2E8;border:none">就寝 / 起床：<b>' + psqi.bed + ':00 — ' + psqi.wake + ':00</b></div>' +
        '<div class="d-opt" style="color:#475569;background:#F7F2E8;border:none">入睡耗时 / 睡眠时长：<b>' + psqi.latency + ' 分钟 / ' + psqi.hours + ' 小时</b></div>' +
        '<div class="d-opt" style="color:#475569;background:#F7F2E8;border:none">总体睡眠质量：<b>' + (psqiQualityOpts[psqi.quality] ?? '-') + '</b></div>' +
        '<div class="d-opt" style="color:#475569;background:#F7F2E8;border:none">催眠药物 / 困倦 / 精力：<b>' + (psqiFreqOpts[psqi.meds] ?? '-') + ' / ' + (psqiFreqOpts[psqi.day] ?? '-') + ' / ' + (psqiFreqOpts[psqi.energy] ?? '-') + '</b></div>' +
        '</div>' +
        '<div style="font-size:12px;color:#94a3b8;margin-bottom:4px">睡眠障碍频率（10 项）：</div>' +
        psqiDisturbanceItems.map(function (item, i) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#475569;padding:2px 0"><span>' + (i + 1) + '. ' + item +
          '</span><span class="badge" style="background:#F7F2E8;color:#64748b;border:1px solid #e5d8c2;font-weight:400">' + (psqiFreqOpts[psqi.d[i]] ?? '-') + '</span></div>';
        }).join('');
    }
    h += '</div>';
    /* SIAS-6 */
    h += '<div class="d-q"><div class="d-q-text"><b>SIAS-6 社交焦虑筛查</b>' +
      '<span class="d-score" style="float:right">总分：<b style="color:#f97316">' + (r.sias6Score ?? 0) + '</b> / 24</span></div>';
    if (sias6.length === 0) {
      h += '<div style="font-size:13px;color:#94a3b8;padding:6px 0">该记录未采集 SIAS-6 数据（旧版本记录）。</div>';
    } else {
      sias6.forEach(function (ans, i) {
        h += '<div class="d-q" style="padding:4px 0"><div class="d-q-text" style="margin-bottom:6px">' + (i + 1) + '. ' + sias6Q[i] + '</div><div class="d-opts">' +
          sias6Opts.map(function (opt, oi) { return optChip(opt, ans === oi, ''); }).join('') + '</div></div>';
      });
    }
    h += '</div>';
    /* ASLEC */
    h += '<div class="d-q"><div class="d-q-text"><b>ASLEC 青少年生活事件</b>' +
      '<span class="d-score" style="float:right">发生事件：<b style="color:#f97316">' + (r.aslecCount ?? 0) + '</b> 件<span style="margin-left:6px">影响总分：<b style="color:#f97316">' + (r.aslecScore ?? 0) + '</b></span></span></div>';
    if (aslec.length === 0) {
      h += '<div style="font-size:13px;color:#94a3b8;padding:6px 0">该记录未采集 ASLEC 数据（旧版本记录）。</div>';
    } else {
      h += '<div style="max-height:300px;overflow-y:auto;padding-right:4px">' +
        aslec.map(function (ans, i) {
          var occurred = ans > 0;
          var cls = !occurred ? 'color:#cbd5e1'
            : ans >= 5 ? 'background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3);font-weight:500'
            : ans === 4 ? 'background:rgba(249,115,22,.15);color:#f97316;border:1px solid rgba(249,115,22,.3)'
            : ans === 3 ? 'background:rgba(234,179,8,.15);color:#d97706;border:1px solid rgba(234,179,8,.3)'
            : 'background:#F7F2E8;color:#64748b';
          return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:3px 0"><span style="' + (occurred ? 'color:#475569' : 'color:#94a3b8') + '">' + (i + 1) + '. ' + aslecItems[i] +
          '</span><span class="badge" style="' + cls + ';font-weight:400">' + (aslecImpactOpts[ans] ?? '未发生') + '</span></div>';
        }).join('') + '</div>';
    }
    h += '</div></div>';
    return h;
  }

  // 鼠标轨迹可视化：按采样顺序绘制折线（奶油色主题），标注起点/终点
  function drawTraj(canvas, traj) {
    if (!canvas || !traj || traj.length === 0) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#F7F2E8";
    ctx.fillRect(0, 0, W, H);
    var xs = traj.map(function (p) { return p.x; });
    var ys = traj.map(function (p) { return p.y; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
    var pad = 18;
    var px = function (x) { return pad + ((x - minX) / spanX) * (W - pad * 2); };
    var py = function (y) { return pad + ((y - minY) / spanY) * (H - pad * 2); };
    ctx.strokeStyle = "#A8905F";
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    traj.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(px(p.x), py(p.y));
      else ctx.lineTo(px(p.x), py(p.y));
    });
    ctx.stroke();
    traj.forEach(function (p, i) {
      ctx.fillStyle = (i === 0 || i === traj.length - 1) ? "#8F7A4E" : "#A8905F";
      ctx.beginPath();
      ctx.arc(px(p.x), py(p.y), (i === 0 || i === traj.length - 1) ? 3.2 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    var first = traj[0], last = traj[traj.length - 1];
    ctx.fillStyle = "#8F7A4E";
    ctx.font = "10px sans-serif";
    ctx.fillText("起点", px(first.x) - 14, py(first.y) - 6);
    ctx.fillText("终点 " + last.t + "ms", px(last.x) - 18, py(last.y) + 14);
  }

  function openDetail(id) {
    var r = null;
    for (var i = 0; i < dataRecords.length; i++) if (dataRecords[i].id === id) { r = dataRecords[i]; break; }
    if (!r) return;
    var genderText = r.gender === "male" ? "男" : r.gender === "female" ? "女" : (r.gender || "其他");
    var traj = r.traj || [];
    var camTxt = (r.cam === "degraded") ? "摄像头降级" : "正常";
    var trajHtml = '<div class="d-card">' +
      '<div class="d-card-head"><b>鼠标轨迹（行为数据）</b>' +
      '<span class="d-score">采样点：<span class="d-num">' + traj.length + '</span>' +
      '<span style="margin-left:8px;color:#94a3b8">· 采集模式：' + camTxt + '</span></span></div>' +
      '<div class="d-qs">';
    if (traj.length > 0) {
      trajHtml +=
        '<canvas id="traj-canvas" width="560" height="220" style="width:100%;border-radius:8px;background:#F7F2E8"></canvas>' +
        '<div style="background:#F7F2E8;border-radius:8px;overflow:hidden;margin-top:10px">' +
          '<div class="traj-head">坐标序列（x, y, 相对时间 ms）<span>共 ' + traj.length + ' 点</span></div>' +
          '<div class="traj-list">' + traj.map(function (p) { return "(" + p.x + ", " + p.y + ", " + p.t + "ms)"; }).join("  ") + '</div>' +
        '</div>' +
        '<p class="traj-note">鼠标轨迹在测评答题过程中自动采集（约 80ms 一个采样点），用于行为特征分析，不涉及键盘输入内容。</p>';
    } else {
      trajHtml += '<p class="traj-note">本次测评未采集到鼠标轨迹样本（可能因设备/浏览器限制或作答时间过短），其余测评数据不受影响。</p>';
    }
    trajHtml += '</div></div>';

    var html =
      '<div class="flex-between mb-2">' +
        '<h2 class="modal-title">' + icon("i-db", 20) + '测评记录明细</h2>' +
        '<button class="icon-btn" id="detail-close" aria-label="关闭">' + icon("i-x", 20) + '</button>' +
      '</div>' +
      '<div class="d-basic">' +
        '<p><b>学号：</b>' + r.sid + '　<b>时间：</b>' + r.time + '</p>' +
        '<p>' +
          (r.edu ? '学习层次：' + r.edu + '　' : '') +
          (r.grade ? '年级：' + r.grade + '　' : '') +
          (r.major ? '专业：' + r.major + '　' : '') +
          (r.age ? '年龄：' + r.age + '　' : '') +
          '性别：' + genderText +
        '</p>' +
        '<p><span class="badge ' + riskClass[r.risk] + '">' + r.risk + '</span>' +
        '　<span class="badge ' + statusClass[r.st] + '">' + statusText[r.st] + '</span></p>' +
      '</div>' +
      questionBlock(phq9Q, r.phq9, "PHQ-9 抑郁症筛查量表", r.p, 27) +
      questionBlock(gad7Q, r.gad7, "GAD-7 广泛性焦虑量表", r.g, 21) +
      suppDetailHtml(r) +
      trajHtml +
      '<div class="btn-row" style="justify-content:flex-end">' +
        '<button class="btn btn-primary" id="detail-ok">关闭</button>' +
      '</div>';
    document.getElementById("detail-body").innerHTML = html;
    var canvas = document.getElementById("traj-canvas");
    if (canvas) drawTraj(canvas, traj);
    document.getElementById("detail-mask").style.display = "flex";
    document.getElementById("detail-close").addEventListener("click", closeDetail);
    document.getElementById("detail-ok").addEventListener("click", closeDetail);
  }

  function closeDetail() {
    document.getElementById("detail-mask").style.display = "none";
  }
  document.getElementById("detail-mask").addEventListener("click", function (e) {
    if (e.target === document.getElementById("detail-mask")) closeDetail();
  });
  /* 内联 onclick 需要全局可见（脚本整体位于 IIFE 内） */
  window.openDetail = openDetail;
  window.closeDetail = closeDetail;

  function dashRowHtml(r) {
    return '<tr>' +
      '<td>' + r.id + '</td><td>' + r.sid + '</td><td>' + r.time + '</td>' +
      '<td><span class="badge ' + dashStatusClass[r.st] + '">' + dashStatusText[r.st] + '</span></td></tr>';
  }

  var dashRows = document.getElementById("dash-rows");
  dashRows.innerHTML = dashData.map(dashRowHtml).join("");

  /* ============ 数据管理页 ============ */
  function fillScore(target, total) {
    var arr = new Array(total).fill(0), left = target;
    for (var i = 0; i < total && left > 0; i++) { var v = Math.min(3, left); arr[i] = v; left -= v; }
    return arr;
  }
  function mkTraj(n) {
    var pts = [];
    for (var i = 0; i < n; i++) pts.push({ x: Math.round(Math.random() * 280 + 10), y: Math.round(Math.random() * 180 + 10), t: Math.round(i * 120 + 500) });
    return pts;
  }
  var dataRecords = loadRecsLocal() || (function () {
    function mkPsqi(p, g) {
      var psqi = {
        bed: 23,
        latency: p >= 15 ? 55 : p >= 8 ? 30 : 15,
        wake: 7,
        hours: p >= 15 ? 5 : p >= 8 ? 6 : 7,
        quality: p >= 15 ? 3 : p >= 8 ? 2 : 0,
        d: [p >= 15 ? 3 : 1, 0, 0, 0, 0, p >= 15 ? 2 : 0, 0, g >= 12 ? 2 : 1, 0, 0],
        meds: p >= 18 ? 2 : 0, day: p >= 12 ? 2 : 1, energy: p >= 12 ? 2 : 1
      };
      var res = scorePsqi(psqi);
      return { psqi: psqi, comps: res.comps, score: res.total };
    }
    function mkPss10(p) { return fillScore(Math.min(30, p + 2), 10); }
    function mkSias6(g) { return fillScore(Math.min(18, g + 3), 6); }
    function mkAslec(p) {
      var arr = new Array(27).fill(0);
      var cnt = Math.min(6, Math.round(p / 4));
      for (var i = 0; i < cnt; i++) arr[i] = (i % 5) + 1;
      return arr;
    }
    var base = [
    { id: "A001", sid: "20230801", time: "2026-09-11 09:23", edu: "本科", grade: "2024", major: "临床医学", age: "20", gender: "女", phq9: fillScore(8, 9),  gad7: fillScore(6, 7),  p: 8,  g: 6,  risk: "轻度风险", st: "completed",    traj: mkTraj(12), cam: "normal" },
    { id: "A002", sid: "20230815", time: "2026-09-11 10:45", edu: "硕士研究生", grade: "2025", major: "心理学", age: "23", gender: "男", phq9: fillScore(15, 9), gad7: fillScore(12, 7), p: 15, g: 12, risk: "高风险", st: "pending_review", traj: mkTraj(12), cam: "normal" },
    { id: "A003", sid: "20230722", time: "2026-09-11 11:02", edu: "本科", grade: "2024", major: "护理学", age: "19", gender: "女", phq9: fillScore(4, 9),  gad7: fillScore(3, 7),  p: 4,  g: 3,  risk: "低风险",   st: "completed",    traj: mkTraj(12), cam: "normal" },
    { id: "A004", sid: "20230905", time: "2026-09-11 13:18", edu: "博士研究生", grade: "2023", major: "生物医学工程", age: "27", gender: "男", phq9: fillScore(18, 9), gad7: fillScore(16, 7), p: 18, g: 16, risk: "高风险",   st: "intervened",   traj: mkTraj(12), cam: "normal" },
    { id: "A005", sid: "20230833", time: "2026-09-11 14:30", edu: "本科", grade: "2025", major: "药学", age: "20", gender: "女", phq9: fillScore(7, 9),  gad7: fillScore(5, 7),  p: 7,  g: 5,  risk: "轻度风险", st: "completed",    traj: mkTraj(12), cam: "normal" },
    { id: "A006", sid: "20230789", time: "2026-09-11 15:12", edu: "硕士研究生", grade: "2024", major: "临床医学", age: "24", gender: "女", phq9: fillScore(12, 9), gad7: fillScore(9, 7),  p: 12, g: 9,  risk: "中度风险", st: "intervened",   traj: mkTraj(12), cam: "normal" },
    { id: "A007", sid: "20230912", time: "2026-09-11 16:45", edu: "本科", grade: "2026", major: "预防医学", age: "19", gender: "男", phq9: fillScore(3, 9),  gad7: fillScore(2, 7),  p: 3,  g: 2,  risk: "低风险",   st: "completed",    traj: mkTraj(12), cam: "normal" },
    { id: "A008", sid: "20230877", time: "2026-09-11 17:20", edu: "硕士研究生", grade: "2023", major: "基础医学", age: "25", gender: "女", phq9: fillScore(20, 9), gad7: fillScore(18, 7), p: 20, g: 18, risk: "高风险",   st: "pending_review", traj: mkTraj(12), cam: "normal" }
    ];
    return base.map(function (r) {
      var cssrs = (r.id === "A002") ? [0, 0, 1, 0] : (r.id === "A008") ? [0, 0, 1, 1] : [0, 0, 0, 0];
      var nssi = (r.id === "A008") ? [1, 3] : [0, 0];
      var flags = [];
      if (cssrs.filter(function (v) { return v === 1; }).length > 0) flags.push("suicide");
      if (nssi[0] === 1) flags.push("nssi");
      var pp = mkPss10(r.p), ss = mkSias6(r.g);
      var al = mkAslec(r.p);
      var ps = mkPsqi(r.p, r.g);
      return {
        id: r.id, sid: r.sid, time: r.time, edu: r.edu, grade: r.grade, major: r.major, age: r.age, gender: r.gender,
        phq9: r.phq9, gad7: r.gad7, p: r.p, g: r.g,
        cssrs: cssrs, cssrsPositive: cssrs.filter(function (v) { return v === 1; }).length,
        nssi: nssi,
        pss10: pp, pss10Score: scorePss10(pp),
        psqi: ps.psqi, psqiComps: ps.comps, psqiScore: ps.score,
        sias6: ss, sias6Score: scoreSias6(ss),
        aslec: al, aslecScore: scoreAslec(al).total, aslecCount: scoreAslec(al).count,
        risk: r.risk, st: r.st, traj: r.traj, cam: r.cam, riskFlags: flags
      };
    });
  })();
  function persistRecsLocal() {
    try { localStorage.setItem("psyc_records", JSON.stringify(dataRecords)); } catch (e) {}
  }
  function loadRecsLocal() {
    try {
      var raw = localStorage.getItem("psyc_records");
      if (!raw) return null;
      var list = JSON.parse(raw);
      return Array.isArray(list) && list.length > 0 ? list : null;
    } catch (e) { return null; }
  }

  var dataTbody = document.getElementById("data-rows");
  var searchInput = document.getElementById("data-search");
  var filterSelect = document.getElementById("data-filter");
  var emptyBox = document.getElementById("data-empty");

  function renderStats() {
    var total = dataRecords.length;
    var high = dataRecords.filter(function (r) { return r.risk === "高风险"; }).length;
    var pending = dataRecords.filter(function (r) { return r.st === "pending_review"; }).length;
    var done = dataRecords.filter(function (r) { return r.st === "completed"; }).length;
    document.getElementById("data-count").textContent = total;
    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-high").textContent = high;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-completed").textContent = done;
  }

  function renderData() {
    var q = searchInput.value.trim();
    var f = filterSelect.value;
    var list = dataRecords.filter(function (r) {
      var okSearch = !q || r.sid.indexOf(q) >= 0 || r.id.indexOf(q) >= 0;
      var okRisk = f === "all" || r.risk === f;
      return okSearch && okRisk;
    });
    dataTbody.innerHTML = list.map(rowHtml).join("");
    emptyBox.style.display = list.length === 0 ? "block" : "none";
    renderStats();
  }
  searchInput.addEventListener("input", renderData);
  filterSelect.addEventListener("change", renderData);
  renderData();

  document.getElementById("btn-export").addEventListener("click", function () {
    var headers = ["ID", "学号", "时间", "PHQ-9", "GAD-7", "风险等级", "状态"];
    var rows = dataRecords.map(function (r) {
      return [r.id, r.sid, r.time, r.p, r.g, r.risk, statusText[r.st]].join(",");
    });
    var csv = "\ufeff" + headers.join(",") + "\n" + rows.join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "assessment_data_" + new Date().toISOString().split("T")[0] + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ============ 系统设置页 ============ */
  var subBtns = document.querySelectorAll("#sub-nav .sub-btn");
  var subContent = document.getElementById("sub-content");
  var saveBtn = document.getElementById("btn-save");
  var saveLabel = document.getElementById("save-label");

  var capture = { ms: 50, md: 30, cfps: 30, cres: "640x480", cdur: 60 };
  var privacy = { local: true, delraw: true, enc: true, ano: true };
  var warn = { pm: 5, pmo: 10, ps: 15, gm: 5, gmo: 10, gs: 15, mail: true, push: true };
  var sys = { path: "/data/assessments", theme: "light", autosave: true, debug: false };
  var pwdMsg = null;
  // 采集设置调试状态
  var trajSelId = "";
  var camStatus = "idle"; // idle | testing | normal | degraded
  var camStream = null;
  var camTimer = null;

  function range(label, val, min, max, unit, onChange) {
    return '<div>' +
      '<label class="field-label">' + label + '</label>' +
      '<div class="range-row">' +
      '<input type="range" min="' + min + '" max="' + max + '" value="' + val + '" data-key data-min="' + min + '" data-max="' + max + '">' +
      '<input type="number" class="range-num" value="' + val + '">' +
      '</div></div>';
  }

  function renderSettings() {
    var key = document.querySelector("#sub-nav .sub-btn.active").getAttribute("data-sub");
    var html = "";
    if (key === "capture") {
      html =
        '<h2 class="sec-title">' + icon("i-eye", 20) + '数据采集设置</h2>' +
        range("鼠标采样率 (Hz)", capture.ms, 10, 100, "Hz") +
        range("鼠标追踪时长 (秒)", capture.md, 10, 120, "s") +
        range("摄像头帧率 (FPS)", capture.cfps, 15, 60, "fps") +
        '<div><label class="field-label">摄像头分辨率</label><select id="res-sel">' +
        '<option>320x240</option><option>640x480</option><option>1280x720</option><option>1920x1080</option></select></div>' +
        range("视频采集时长 (秒)", capture.cdur, 10, 180, "s") +
        captureDebugHtml();
    } else if (key === "privacy") {
      var items = [
        { k: "local", t: "本地处理", d: "所有数据处理在本地完成，不上传至云端", i: "i-lock" },
        { k: "delraw", t: "删除原始数据", d: "测评结束后自动删除原始视频和鼠标轨迹数据", i: "i-eye" },
        { k: "enc", t: "加密存储", d: "使用AES-256加密存储测评结果", i: "i-lock" },
        { k: "ano", t: "匿名化处理", d: "学号等敏感信息经过哈希处理", i: "i-eye" }
      ];
      html = '<h2 class="sec-title">' + icon("i-shield", 20) + '隐私保护设置</h2>';
      items.forEach(function (it) {
        html += '<div class="check-row"><input type="checkbox" data-pk="' + it.k + '" ' + (privacy[it.k] ? "checked" : "") + '>' +
          '<div style="flex:1"><div class="flex-center" style="gap:8px">' + icon(it.i, 16) + '<span class="text-sm" style="color:#334155;font-weight:500">' + it.t + '</span></div>' +
          '<p class="check-desc">' + it.d + '</p></div></div>';
      });
    } else if (key === "warning") {
      html =
        '<h2 class="sec-title">' + icon("i-bell", 20) + '预警阈值配置</h2>' +
        '<div style="background:#F7F2E8;border-radius:8px;padding:16px" class="mb-4">' +
        '<h3 style="font-size:14px;font-weight:600;color:#334155;margin-bottom:12px">PHQ-9 阈值</h3>' +
        '<div class="form-grid">' +
        '<div><label class="field-label">轻度阈值</label><input type="number" value="' + warn.pm + '" data-wk="pm"></div>' +
        '<div><label class="field-label">中度阈值</label><input type="number" value="' + warn.pmo + '" data-wk="pmo"></div>' +
        '<div><label class="field-label">重度阈值</label><input type="number" value="' + warn.ps + '" data-wk="ps"></div>' +
        '</div></div>' +
        '<div style="background:#F7F2E8;border-radius:8px;padding:16px" class="mb-4">' +
        '<h3 style="font-size:14px;font-weight:600;color:#334155;margin-bottom:12px">GAD-7 阈值</h3>' +
        '<div class="form-grid">' +
        '<div><label class="field-label">轻度阈值</label><input type="number" value="' + warn.gm + '" data-wk="gm"></div>' +
        '<div><label class="field-label">中度阈值</label><input type="number" value="' + warn.gmo + '" data-wk="gmo"></div>' +
        '<div><label class="field-label">重度阈值</label><input type="number" value="' + warn.gs + '" data-wk="gs"></div>' +
        '</div></div>' +
        '<div style="background:#F7F2E8;border-radius:8px;padding:16px">' +
        '<h3 style="font-size:14px;font-weight:600;color:#334155;margin-bottom:12px">通知设置</h3>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<label class="check-simple"><input type="checkbox" data-wk="mail" ' + (warn.mail ? "checked" : "") + '><span class="text-sm" style="color:#475569">高风险时发送邮件通知</span></label>' +
        '<label class="check-simple"><input type="checkbox" data-wk="push" ' + (warn.push ? "checked" : "") + '><span class="text-sm" style="color:#475569">高风险时发送推送通知</span></label>' +
        '</div></div>';
    } else {
      var pwdHtml = '';
      if (pwdMsg) {
        pwdHtml = '<p style="font-size:12px;margin-top:8px;color:' + (pwdMsg.ok ? '#16a34a' : '#ef4444') + '">' + pwdMsg.text + '</p>';
      }
      html =
        '<h2 class="sec-title">' + icon("i-sliders", 20) + '系统选项</h2>' +
        '<div class="mb-4"><label class="field-label">数据存储路径</label><div style="display:flex;gap:8px">' +
        '<input type="text" value="' + sys.path + '" id="data-path">' +
        '<button class="btn btn-ghost" style="padding:8px 12px">' + icon("i-folder", 16) + '</button></div></div>' +
        '<div class="mb-4"><label class="field-label">主题</label><select id="theme-sel">' +
        '<option value="light" ' + (sys.theme === "light" ? "selected" : "") + '>浅色</option>' +
        '<option value="dark" ' + (sys.theme === "dark" ? "selected" : "") + '>深色</option>' +
        '<option value="auto" ' + (sys.theme === "auto" ? "selected" : "") + '>自动</option></select></div>' +
        '<div class="check-row"><input type="checkbox" id="auto-save" ' + (sys.autosave ? "checked" : "") + '>' +
        '<div><div class="text-sm" style="color:#334155;font-weight:500">自动保存</div><p class="check-desc">测评完成后自动保存结果</p></div></div>' +
        '<div class="check-row"><input type="checkbox" id="debug-mode" ' + (sys.debug ? "checked" : "") + '>' +
        '<div><div class="text-sm" style="color:#334155;font-weight:500">调试模式</div><p class="check-desc">启用详细的日志输出和调试信息</p></div></div>' +
        '<div style="background:#F7F2E8;border:1px solid #e5d8c2;border-radius:8px;padding:16px" class="mt-4">' +
        '<h3 style="font-size:14px;font-weight:600;color:#334155;margin-bottom:4px">' + icon("i-lock", 16) + ' 管理密码</h3>' +
        '<p class="check-desc mb-2">数据管理、系统设置、关于系统页面的访问密码（至少 6 位）</p>' +
        '<div class="form-grid">' +
        '<div><label class="field-label">原密码</label><input type="password" id="pwd-old" placeholder="原密码"></div>' +
        '<div><label class="field-label">新密码</label><input type="password" id="pwd-new" placeholder="至少 6 位"></div>' +
        '<div><label class="field-label">确认新密码</label><input type="password" id="pwd-confirm-input" placeholder="再次输入"></div>' +
        '<div style="display:flex;align-items:flex-end"><button class="btn btn-primary" id="btn-pwd-change" style="width:100%">修改</button></div>' +
        '</div>' + pwdHtml + '</div>';
    }
    subContent.innerHTML = html;
    bindSettingsEvents(key);
  }

  function bindSettingsEvents(key) {
    subContent.querySelectorAll('input[type="range"]').forEach(function (r) {
      var num = r.nextElementSibling;
      r.addEventListener("input", function () {
        num.value = r.value;
        if (key === "capture") {
          syncCapture(r);
        }
      });
      num.addEventListener("input", function () {
        r.value = num.value;
        syncCapture(r);
      });
      if (key === "capture") syncCapture(r);
    });
    var resSel = document.getElementById("res-sel");
    if (resSel) {
      resSel.value = capture.cres;
      resSel.addEventListener("change", function () { capture.cres = resSel.value; });
    }
    var theme = document.getElementById("theme-sel");
    if (theme) theme.addEventListener("change", function () { sys.theme = theme.value; });
    var dataPath = document.getElementById("data-path");
    if (dataPath) dataPath.addEventListener("input", function () { sys.path = dataPath.value; });
    var autoSave = document.getElementById("auto-save");
    if (autoSave) autoSave.addEventListener("change", function () { sys.autosave = autoSave.checked; });
    var debug = document.getElementById("debug-mode");
    if (debug) debug.addEventListener("change", function () { sys.debug = debug.checked; });
    subContent.querySelectorAll('input[type="checkbox"][data-pk]').forEach(function (c) {
      c.addEventListener("change", function () { privacy[c.getAttribute("data-pk")] = c.checked; });
    });
    subContent.querySelectorAll('input[data-wk]').forEach(function (c) {
      if (c.type === "checkbox") {
        c.addEventListener("change", function () { warn[c.getAttribute("data-wk")] = c.checked; });
      } else {
        c.addEventListener("input", function () { warn[c.getAttribute("data-wk")] = parseInt(c.value, 10) || 0; });
      }
    });
    var pwdChange = document.getElementById("btn-pwd-change");
    if (pwdChange) {
      pwdChange.addEventListener("click", function () {
        var oldPwd = document.getElementById("pwd-old").value;
        var newPwd = document.getElementById("pwd-new").value;
        var confirmPwd = document.getElementById("pwd-confirm-input").value;
        if (oldPwd !== getAdminPwd()) {
          pwdMsg = { ok: false, text: "原密码不正确" };
        } else if (newPwd.length < 6) {
          pwdMsg = { ok: false, text: "新密码不能少于 6 位" };
        } else if (newPwd !== confirmPwd) {
          pwdMsg = { ok: false, text: "两次输入的新密码不一致" };
        } else {
          try { localStorage.setItem("psyc_admin_pwd", newPwd); } catch (e) {}
          pwdMsg = { ok: true, text: "管理密码修改成功" };
        }
        renderSettings();
      });
    }
    if (key === "capture") bindCaptureDebug();
  }

  /* ============ 采集设置调试：鼠标轨迹 + 摄像头 ============ */
  function captureDebugHtml() {
    var trajRecords = dataRecords.filter(function (r) { return r.traj && r.traj.length > 0; });
    var html = "";

    // —— 鼠标轨迹调试 ——
    html += '<div style="background:#F7F2E8;border:1px solid #e5d8c2;border-radius:8px;padding:16px" class="mt-4">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
        '<h3 style="font-size:14px;font-weight:600;color:#334155;display:flex;align-items:center;gap:8px">' + icon("i-mouse", 16) + '鼠标轨迹调试</h3>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-ghost" id="btn-traj-refresh" style="font-size:12px;padding:6px 10px">' + icon("i-refresh", 14) + ' 刷新</button>' +
          '<button class="btn btn-ghost" id="btn-traj-clear" style="font-size:12px;padding:6px 10px">' + icon("i-trash", 14) + ' 清空轨迹</button>' +
        '</div>' +
      '</div>' +
      '<p class="check-desc mb-2">选择任意一条已采集的测评记录，可查看其鼠标轨迹采样点、坐标序列与相对时间，确认行为数据采集是否正常（测评第 3 步答题时自动采集，约 80ms 一个点、上限 60 点）。</p>';
    if (trajRecords.length === 0) {
      html += '<div style="background:#fff;border:1px solid #e5d8c2;border-radius:8px;padding:14px;font-size:13px;color:#94a3b8">' +
        '暂无已采集的鼠标轨迹数据。可先到「心理测评」完成一次测评（填问卷时轨迹自动采集、无需单独操作），再回到这里点「刷新」查看。</div>';
    } else {
      var shown = trajRecords.slice().reverse().slice(0, 6);
      var list = shown.map(function (r) {
        var on = (r.id === trajSelId);
        var camTxt = (r.cam === "degraded") ? "摄像头降级" : "采集正常";
        return '<button data-traj-sel="' + r.id + '" style="display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border-radius:8px;border:1px solid ' + (on ? "rgba(168,144,95,.5)" : "#e5d8c2") + ';background:' + (on ? "rgba(168,144,95,.14)" : "#fff") + ';color:' + (on ? "#8F7A4E" : "#64748b") + ';font-size:13px;text-align:left;cursor:pointer;transition:background .15s">' +
          '<b>' + r.id + '</b>' +
          '<span style="color:#94a3b8;font-size:12px">' + r.sid + '</span>' +
          '<span style="margin-left:auto;color:#94a3b8;font-size:12px">' + r.time + '</span>' +
          '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#F7F2E8;color:#64748b;white-space:nowrap">' + (r.traj ? r.traj.length : 0) + ' 点 · ' + camTxt + '</span>' +
        '</button>';
      }).join("");
      html += '<div style="display:grid;gap:8px;margin-bottom:12px">' + list + '</div>';
    }
    var sel = null;
    for (var i = 0; i < dataRecords.length; i++) if (dataRecords[i].id === trajSelId) { sel = dataRecords[i]; break; }
    if (sel && sel.traj && sel.traj.length > 0) {
      html += '<div style="background:#fff;border:1px solid #e5d8c2;border-radius:8px;padding:12px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:10px">' +
          '<span>记录 ' + sel.id + ' · 学号 ' + sel.sid + '</span>' +
          '<span>采样点 <b style="color:#A8905F">' + sel.traj.length + '</b>' +
          '<span style="margin:0 8px;color:#C4B697">·</span>采集模式 ' + (sel.cam === "degraded" ? "摄像头降级" : "正常") +
          '</span></div>' +
        '<canvas id="dbg-traj-canvas" width="560" height="220" style="width:100%;border-radius:8px;background:#F7F2E8"></canvas>' +
        '<div style="background:#F7F2E8;border-radius:8px;overflow:hidden;margin-top:10px">' +
          '<div class="traj-head">坐标序列（x, y, 相对时间 ms）<span>共 ' + sel.traj.length + ' 点</span></div>' +
          '<div class="traj-list">' + sel.traj.map(function (p) { return "(" + p.x + ", " + p.y + ", " + p.t + "ms)"; }).join("  ") + '</div>' +
        '</div>' +
        '<p class="traj-note">x/y 为页面内采样坐标，t 为相对采集起点的毫秒时间。这些数据同样可在「数据管理 → 查看明细」中查阅。</p>' +
      '</div>';
    }

    // —— 摄像头调试 ——
    var camMsgCls = "color:#94a3b8;background:#fff;border:1px solid #e5d8c2";
    var camMsgTxt = "尚未检测。将验证摄像头权限、视频流与降级逻辑是否正常";
    if (camStatus === "testing") {
      camMsgCls = "color:#8F7A4E;background:rgba(168,144,95,.1);border:1px solid rgba(168,144,95,.3)";
      camMsgTxt = "正在请求摄像头权限（8 秒内未响应将自动降级）…";
    } else if (camStatus === "normal") {
      camMsgCls = "color:#16a34a;background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.25)";
      camMsgTxt = "摄像头调用成功：权限与视频流正常（320×240）。预览展示 2.5 秒后自动关闭，与测评第 3 步采集窗口一致。";
    } else if (camStatus === "degraded") {
      camMsgCls = "color:#b45309;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3)";
      camMsgTxt = "摄像头不可用（无摄像头 / 权限被拒绝 / 等待超时），已降级：正式测评时将自动使用受限模式，答题流程不受影响。";
    }
    html += '<div style="background:#F7F2E8;border:1px solid #e5d8c2;border-radius:8px;padding:16px" class="mt-4">' +
      '<h3 style="font-size:14px;font-weight:600;color:#334155;margin-bottom:6px;display:flex;align-items:center;gap:8px">' + icon("i-cam", 16) + '摄像头调试</h3>' +
      '<p class="check-desc mb-2">点击「开始检测」会请求摄像头权限并启动实时预览，模拟测评第 3 步的面部数据采集（320×240，采集窗口 2.5 秒）。本机无摄像头、权限被拒绝或 8 秒等待超时，将提示降级信息——与正式测评的降级逻辑一致。</p>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
        '<button class="btn btn-primary" id="btn-cam-test" style="display:inline-flex;align-items:center;gap:6px">' +
          icon(camStatus === "testing" ? "i-refresh" : "i-video", 16) +
          '<span>' + (camStatus === "testing" ? "检测中…" : (camStatus === "normal" || camStatus === "degraded" ? "重新检测" : "开始检测")) + '</span>' +
        '</button>' +
        (camStatus === "normal" || camStatus === "degraded" ? '<button class="btn btn-ghost" id="btn-cam-end">结束调试</button>' : '') +
      '</div>' +
      '<div style="border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.7;' + camMsgCls + '">' + camMsgTxt + '</div>' +
      (camStatus === "normal" ? '<video id="dbg-cam-video" autoplay muted playsinline style="width:100%;max-width:384px;border-radius:8px;border:1px solid #e5d8c2;background:#EAE3D5;margin-top:12px"></video>' : '') +
    '</div>';
    return html;
  }

  function stopCamDebug() {
    if (camTimer) { clearTimeout(camTimer); camTimer = null; }
    if (camStream) {
      camStream.getTracks().forEach(function (t) { t.stop(); });
      camStream = null;
    }
    var v = document.getElementById("dbg-cam-video");
    if (v) v.srcObject = null;
  }

  function startCamTest() {
    stopCamDebug();
    camStatus = "testing";
    renderSettings();
    if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      camStatus = "degraded";
      renderSettings();
      return;
    }
    camTimer = setTimeout(function () {
      stopCamDebug();
      camStatus = "degraded";
      renderSettings();
    }, 8000);
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then(function (stream) {
        if (camTimer) { clearTimeout(camTimer); camTimer = null; }
        camStream = stream;
        camStatus = "normal";
        renderSettings();
        var v = document.getElementById("dbg-cam-video");
        if (v) {
          v.srcObject = stream;
          v.play().catch(function () {});
        }
        camTimer = setTimeout(function () {
          stopCamDebug();
        }, 2500);
      })
      .catch(function (err) {
        if (camTimer) { clearTimeout(camTimer); camTimer = null; }
        stopCamDebug();
        camStatus = "degraded";
        renderSettings();
      });
  }

  function bindCaptureDebug() {
    subContent.querySelectorAll("button[data-traj-sel]").forEach(function (b) {
      b.addEventListener("click", function () {
        trajSelId = b.getAttribute("data-traj-sel");
        renderSettings();
        var cv = document.getElementById("dbg-traj-canvas");
        if (cv) {
          var sel = null;
          for (var i = 0; i < dataRecords.length; i++) if (dataRecords[i].id === trajSelId) { sel = dataRecords[i]; break; }
          if (sel) drawTraj(cv, sel.traj || []);
        }
      });
    });
    var refresh = document.getElementById("btn-traj-refresh");
    if (refresh) refresh.addEventListener("click", function () { renderSettings(); });
    var clearBtn = document.getElementById("btn-traj-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!window.confirm("将清空所有测评记录的鼠标轨迹数据（量表作答与其余数据保留），确定吗？")) return;
        dataRecords.forEach(function (r) { r.traj = []; });
        persistRecsLocal();
        trajSelId = "";
        renderSettings();
      });
    }
    var camTest = document.getElementById("btn-cam-test");
    if (camTest) camTest.addEventListener("click", startCamTest);
    var camEnd = document.getElementById("btn-cam-end");
    if (camEnd) {
      camEnd.addEventListener("click", function () {
        stopCamDebug();
        camStatus = "idle";
        renderSettings();
      });
    }
  }

  function syncCapture(r) {
    var id = r.getAttribute("data-key");
    var parent = r.closest("div.range-row").parentNode;
    var idx = Array.prototype.indexOf.call(parent.parentNode.children, parent);
    var list = ["ms", "md", "cfps", "cdur"];
    if (idx >= 0 && idx < list.length) {
      capture[list[idx]] = parseInt(r.value, 10) || 0;
    }
  }

  subBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      subBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      if (btn.getAttribute("data-sub") !== "capture") {
        stopCamDebug();
        camStatus = "idle";
      }
      renderSettings();
    });
  });

  saveBtn.addEventListener("click", function () {
    saveLabel.textContent = "已保存";
    setTimeout(function () { saveLabel.textContent = "保存设置"; }, 2000);
  });

  renderSettings();

  /* ============ 关于页：技术架构树 ============ */
  var techTree = [
    { label: "前端层", icon: "i-layers", children: [
      { label: "Tauri 2 (Rust + WebView)", icon: "i-cpu" },
      { label: "Next.js 14", icon: "i-layers" },
      { label: "TailwindCSS", icon: "i-layers" },
      { label: "TypeScript", icon: "i-tag" },
      { label: "Lucide 图标", icon: "i-eye" }
    ]},
    { label: "后端层", icon: "i-cpu", children: [
      { label: "Rust + Tokio", icon: "i-cpu" },
      { label: "Tauri IPC", icon: "i-git" },
      { label: "SQLite 本地存储", icon: "i-db" }
    ]},
    { label: "数据采集层", icon: "i-eye", children: [
      { label: "鼠标轨迹追踪", icon: "i-eye" },
      { label: "OpenCV 面部检测", icon: "i-eye" },
      { label: "心率变异性分析", icon: "i-eye" }
    ]},
    { label: "AI 模型层", icon: "i-brain", children: [
      { label: "多模态融合模型", icon: "i-brain" },
      { label: "PHQ-9 / GAD-7 量表", icon: "i-doc" },
      { label: "行为特征提取", icon: "i-cpu" }
    ]}
  ];

  function treeRows(nodes, depth) {
    var html = "";
    nodes.forEach(function (n) {
      var hasChildren = n.children && n.children.length > 0;
      html += '<div style="margin-left:' + (depth * 20) + 'px">' +
        '<div class="tree-item" ' + (hasChildren ? 'data-tree' : '') + '>' +
        (hasChildren
          ? '<span class="tt"><svg width="14" height="14"><use href="#i-chev-d"/></svg></span>'
          : '<span class="tt" style="width:14px"></span>') +
        '<svg width="16" height="16" class="tt"><use href="#' + n.icon + '"/></svg>' +
        '<span class="tt-label">' + n.label + '</span></div>' +
        (hasChildren ? '<div class="tree-children">' + treeRows(n.children, depth + 1) + '</div>' : '') +
        '</div>';
    });
    return html;
  }

  var treeBox = document.getElementById("tech-tree");
  treeBox.innerHTML = treeRows(techTree, 0);
  treeBox.addEventListener("click", function (e) {
    var item = e.target.closest("[data-tree]");
    if (!item) return;
    var chev = item.querySelector("use");
    var children = item.nextElementSibling;
    if (children.style.display === "none") {
      children.style.display = "block";
      chev.setAttribute("href", "#i-chev-d");
    } else {
      children.style.display = "none";
      chev.setAttribute("href", "#i-chev-r");
    }
  });

  /* ============ 测评页：四步流程 ============ */
  var stepNames = ["基本信息", "知情同意", "心理测评", "结束"];
  var totalSteps = 4;
  var riskOptions = ["完全不会", "好几天", "一半以上天数", "几乎每天"];
  var phq9Q = [
    "对事物几乎没有兴趣或愉悦感",
    "感到心情低落、沮丧或绝望",
    "入睡困难、睡不安稳或睡眠过多",
    "感到疲倦或没有活力",
    "食欲不振或吃太多",
    "觉得自己很糟糕、或觉得自己很失败、或让自己或家人失望",
    "难以集中注意力",
    "动作或说话速度缓慢到别人已经察觉，或相反地，烦躁不安",
    "有不如死掉或用某种方式伤害自己的念头"
  ];
  var gad7Q = [
    "感到紧张、焦虑或急切",
    "无法停止或控制担忧",
    "对各种事情担忧过多",
    "很难放松下来",
    "烦躁不安，坐立不宁",
    "容易烦恼或急躁",
    "感到好像有可怕的事要发生"
  ];
  // ---- 补充量表（第一层核心预警 / 第二层扩充画像） ----
  var cssrsQ = [
    "过去一个月内，是否希望自己死去，或希望睡着后不再醒来？",
    "过去一个月内，是否想过要结束自己的生命？",
    "过去一个月内，是否有过具体的自杀方法（方式）的想法，但没有采取行动的打算？",
    "过去一个月内，是否有过具体的自杀方法，并且有采取行动的意图或计划？"
  ];
  var cssrsOpts = ["否", "是"];
  var nssiQ = [
    "过去一年内，是否曾有意地伤害自己的身体，但并非为了结束生命（如割伤、烫伤、撞头、抓挠、咬伤等）？",
    "若发生过上述行为，过去一年内大约发生了几次？"
  ];
  var nssiHasOpts = ["否", "是"];
  var nssiFreqOpts = ["未发生", "1-2 次", "3-5 次", "6-10 次", "11 次及以上"];
  var pss10Q = [
    "因意料之外的事情而感到心烦",
    "感到无法控制生活中重要的事情",
    "感到紧张或有压力",
    "能够成功地处理生活中的麻烦事",
    "觉得事情处理得得心应手",
    "觉得自己无法承担所有必须做的事情",
    "能够控制生活中的情绪波动",
    "觉得事情都在自己的掌控之中",
    "因为事情超出自己的控制而感到气愤",
    "觉得困难堆积如山，自己无法克服"
  ];
  var pss10Opts = ["从不", "偶尔", "有时", "经常", "总是"];
  var PSS10_REV = [3, 4, 6, 7];
  var psqiDisturbanceItems = [
    "入睡困难（30 分钟内无法入睡）",
    "夜间易醒或早醒",
    "需要起床上厕所",
    "呼吸不畅",
    "咳嗽或大声打鼾",
    "感觉太冷",
    "感觉太热",
    "做噩梦",
    "疼痛不适",
    "其他影响睡眠的情况"
  ];
  var psqiFreqOpts = ["无", "每周少于1次", "每周1-2次", "每周3次或以上"];
  var psqiQualityOpts = ["很好", "尚好", "较差", "很差"];
  var psiqCompNames = ["睡眠质量", "入睡时间", "睡眠时长", "睡眠效率", "睡眠障碍", "催眠药物", "日间功能"];
  var sias6Q = [
    "与不熟悉的人在一起时，我会感到紧张",
    "在社交场合中，我担心自己会说错话或做错事",
    "与老师、领导等权威人物交谈时，我感到困难",
    "我担心别人会注意到我在社交中的不自在",
    "在人群中，我会感到不自然",
    "当众发言或做事时，我会紧张不安"
  ];
  var sias6Opts = ["完全不符合", "有点符合", "基本符合", "比较符合", "完全符合"];
  var aslecItems = [
    "被人误会或错怪", "受人歧视或冷遇", "考试失败或不理想", "与同学或好友发生纠纷",
    "生活习惯（饮食、作息）明显变化", "不喜欢上学或学习环境不佳", "恋爱不顺利或失恋",
    "与人发生打架或冲突", "遭家长打骂", "家庭给你施加学习压力", "意外惊吓或事故",
    "家人重病或病故", "家庭经济困难", "父母（或监护人）离异", "父母（或监护人）吵架、不和睦",
    "家庭成员患严重疾病需住院治疗", "本人患重病或重伤", "本人因病休学或停学", "与老师关系紧张",
    "被学校处分或批评", "转学或休学", "学习负担过重", "与家长（或监护人）关系紧张",
    "名誉受损", "被同学或他人欺凌", "重要考试或考核失利", "其他重要生活事件"
  ];
  var aslecImpactOpts = ["未发生", "无影响", "轻度", "中度", "重度", "极重"];

  var step = 1;
  var agreed = false;
  var phq9 = new Array(9).fill(-1);
  var gad7 = new Array(7).fill(-1);
  // ---- 补充量表作答状态 ----
  var cssrsAns = new Array(4).fill(-1);
  var nssiAns = [-1, -1];
  var pss10Ans = new Array(10).fill(-1);
  var psqiAns = { bed: 23, latency: 15, wake: 7, hours: 7, d: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], quality: 0, meds: 0, day: 0, energy: 0 };
  var sias6Ans = new Array(6).fill(-1);
  var aslecAns = new Array(27).fill(0);
  var mouseStatus = "idle", mouseProgress = 0;
  var camStatus = "idle", camProgress = 0;
  var mouseTimer = null, camTimer = null;
  var mouseTraj = [];       // 鼠标轨迹采样点 {x, y, t(相对首点ms)}
  var mouseStopFn = null;   // 移除 mousemove 监听
  var camMode = "normal";   // 摄像头采集模式：normal | degraded
  var camStream = null;     // 摄像头 MediaStream（真实采集时持有，用于停止轨道）
  var fsActive = false;
  var formState = { sid: "", age: "", gender: "male", edu: "本科", grade: "", major: "" };

  var stepsBar = document.getElementById("steps-bar");
  var stepContent = document.getElementById("step-content");
  var stepNav = document.getElementById("step-nav");
  var btnPrev = document.getElementById("btn-prev");
  var btnNext = document.getElementById("btn-next");

  function renderSteps() {
    var html = "";
    stepNames.forEach(function (name, i) {
      var n = i + 1;
      var cls = n < step ? "done" : (n === step ? "now" : "todo");
      html += '<div style="display:flex;align-items:center;flex:1">' +
        '<div class="step-node">' +
        '<div class="step-circle ' + cls + '">' + (n < step ? icon("i-check", 16) : n) + '</div>' +
        '<span class="step-label ' + cls + '">' + name + '</span></div>';
      if (n < totalSteps) html += '<div class="step-line ' + (n < step ? "done" : "todo") + '"></div>';
    });
    stepsBar.innerHTML = html;
  }

function questionCard(title, iconId, qList, answers, mark, answered, opts, note, revIdx) {
    var optList = opts || riskOptions;
    var noteTxt = note || "在过去两周里，以下问题困扰您的频率如何？";
    var revList = revIdx || [];
    var html = '<div class="card p-6"><div class="flex-between" style="margin-bottom:4px">' +
      '<h3 class="sec-title" style="margin-bottom:0">' + icon(iconId, 20) + title + '</h3>' +
      '<span class="badge ' + (answered ? "b-green" : "b-blue") + '">' + (answered ? "已完成" : "已答 " + answers.filter(function (a) { return a >= 0; }).length + "/" + qList.length) + '</span>' +
      '</div>' +
      '<p class="text-sm text-slate-400 mb-4">' + noteTxt + '</p>' +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
      qList.map(function (q, i) {
        return '<div class="question-box"><div class="question-text">' + (i + 1) + '. ' + q +
          (revList.indexOf(i) >= 0 ? ' <span class="badge" style="background:#fff;color:#94a3b8;border:1px solid #e5d8c2;margin-left:4px;font-weight:400">反向计分</span>' : '') +
          '</div><div class="option-row">' +
          optList.map(function (o, oi) {
            return '<button class="opt ' + (answers[i] === oi ? "sel" : "") + '" ' + mark + '="' + i + '" data-o="' + oi + '">' + o + '</button>';
          }).join("") + '</div></div>';
      }).join("") + '</div></div>';
    return html;
  }

  /* 第一层/第二层 分组容器与 NSSI/PSQI/ASLEC 专用卡片 */
  function layerBox(level, titleTxt, subTxt, borderColor, innerHtml) {
    return '<div class="card p-6" style="border-left:4px solid ' + borderColor + '">' +
      '<div class="flex-between" style="margin-bottom:8px"><div>' +
      '<h3 class="sec-title" style="margin-bottom:2px">' + titleTxt + '</h3>' +
      '<p class="text-sm" style="color:#94a3b8;margin:0">' + subTxt + '</p></div>' +
      '<span class="badge" style="background:rgba(' + (level === 1 ? '239,68,68' : '249,115,22') + ',.12);color:' + (level === 1 ? '#dc2626' : '#ea580c') + '">' + (level === 1 ? "第一层 · 核心预警" : "第二层 · 扩充画像") + '</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:14px">' + innerHtml + '</div></div>';
  }
  function nssiCard(answered) {
    var done = nssiAns[0] >= 0;
    var html = '<div class="card p-6"><div class="flex-between" style="margin-bottom:4px">' +
      '<h3 class="sec-title" style="margin-bottom:0">' + icon("i-chart", 20) + 'NSSI 非自杀性自伤筛查</h3>' +
      '<span class="badge ' + (answered ? "b-green" : "b-blue") + '">' + (answered ? "已完成" : nssiAns[0] >= 0 ? "已答 1/2" : "已答 0/2") + '</span>' +
      '</div>' +
      '<p class="text-sm text-slate-400 mb-4">过去一年内，是否曾有意伤害自己的身体（并非为了结束生命）？</p>' +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
      '<div class="question-box"><div class="question-text">1. ' + nssiQ[0] + '</div><div class="option-row">' +
      nssiHasOpts.map(function (o, oi) {
        return '<button class="opt ' + (nssiAns[0] === oi ? "sel" : "") + '" data-n="0" data-o="' + oi + '">' + o + '</button>';
      }).join("") + '</div></div>';
    if (nssiAns[0] === 1) {
      html += '<div class="question-box"><div class="question-text">2. ' + nssiQ[1] + '</div><div class="option-row">' +
        nssiFreqOpts.map(function (o, oi) {
          return '<button class="opt ' + (nssiAns[1] === oi ? "sel" : "") + '" data-n="1" data-o="' + oi + '">' + o + '</button>';
        }).join("") + '</div></div>';
    }
    return html + '</div></div>';
  }
  function psqiCard(valid) {
    var html = '<div class="card p-6"><div class="flex-between" style="margin-bottom:4px">' +
      '<h3 class="sec-title" style="margin-bottom:0">' + icon("i-chart", 20) + 'PSQI 匹兹堡睡眠质量指数</h3>' +
      '<span class="badge ' + (valid ? "b-green" : "b-blue") + '">' + (valid ? "已完成" : "请完善睡眠信息") + '</span>' +
      '</div>' +
      '<p class="text-sm text-slate-400 mb-4">请根据过去一个月的睡眠情况填写。</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">' +
      numField("p-bed", "通常几点上床睡觉（小时 0-23）", psqiAns.bed, 0, 23) +
      numField("p-latency", "通常需要多少分钟入睡", psqiAns.latency, 0, 240) +
      numField("p-wake", "通常几点起床（小时 0-23）", psqiAns.wake, 0, 23) +
      numField("p-hours", "每晚实际睡眠大约几小时（0-12）", psqiAns.hours, 0, 12) +
      '</div>' +
      '<div class="text-sm text-slate-500 mb-2">过去一个月里，以下睡眠障碍发生频率如何？</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">' +
      psqiDisturbanceItems.map(function (item, i) {
        return '<div class="question-box" style="padding:10px 12px"><div class="question-text" style="margin-bottom:8px">' + (i + 1) + '. ' + item + '</div><div class="option-row">' +
          psqiFreqOpts.map(function (o, oi) {
            return '<button class="opt ' + (psqiAns.d[i] === oi ? "sel" : "") + '" data-pd="' + i + '" data-o="' + oi + '">' + o + '</button>';
          }).join("") + '</div></div>';
      }).join("") + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      selField("p-quality", "总体睡眠质量", psqiQualityOpts, psqiAns.quality) +
      selField("p-meds", "催眠药物使用频率", psqiFreqOpts, psqiAns.meds) +
      selField("p-day", "白天困倦频率", psqiFreqOpts, psqiAns.day) +
      selField("p-energy", "精力不足频率", psqiFreqOpts, psqiAns.energy) +
      '</div></div>';
    return html;
  }
  function numField(id, labelTxt, val, min, max) {
    return '<div><label class="text-sm" style="color:#64748b;display:block;margin-bottom:4px">' + labelTxt + '</label>' +
      '<input type="number" id="' + id + '" min="' + min + '" max="' + max + '" value="' + val + '" class="psqi-num" style="width:100%;background:#F7F2E8;border:1px solid #e5d8c2;border-radius:8px;padding:8px 10px;font-size:14px;color:#475569" /></div>';
  }
  function selField(id, labelTxt, opts, val) {
    return '<div><label class="text-sm" style="color:#64748b;display:block;margin-bottom:4px">' + labelTxt + '</label>' +
      '<select id="' + id + '" class="psqi-sel" style="width:100%;background:#F7F2E8;border:1px solid #e5d8c2;border-radius:8px;padding:8px 10px;font-size:14px;color:#475569">' +
      opts.map(function (o, oi) {
        return '<option value="' + oi + '"' + (val === oi ? " selected" : "") + '>' + o + '</option>';
      }).join("") +
      '</select></div>';
  }
  function aslecCard() {
    var html = '<div class="card p-6"><div class="flex-between" style="margin-bottom:4px">' +
      '<h3 class="sec-title" style="margin-bottom:0">' + icon("i-chart", 20) + 'ASLEC 青少年生活事件量表</h3>' +
      '<span class="badge b-blue">27 项事件</span>' +
      '</div>' +
      '<p class="text-sm text-slate-400 mb-4">过去一年内，以下事件对您的影响程度如何？（未发生请选择"未发生"）</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;max-height:480px;overflow-y:auto">' +
      aslecItems.map(function (item, i) {
        return '<div class="question-box" style="padding:8px 10px"><div class="question-text" style="margin-bottom:6px;font-size:13px">' + (i + 1) + '. ' + item + '</div><div class="option-row">' +
          aslecImpactOpts.map(function (o, oi) {
            return '<button class="opt ' + (aslecAns[i] === oi ? "sel" : "") + '" data-a="' + i + '" data-o="' + oi + '">' + o + '</button>';
          }).join("") + '</div></div>';
      }).join("") + '</div></div>';
    return html;
  }

  function s3Overview() {
    var pn = phq9.filter(function (a) { return a >= 0; }).length;
    var gn = gad7.filter(function (a) { return a >= 0; }).length;
    var cn = cssrsAns.filter(function (a) { return a >= 0; }).length;
    var nn = nssiAns[0] >= 0 ? (nssiAns[0] === 0 || nssiAns[1] >= 0 ? 2 : 1) : 0;
    var pssn = pss10Ans.filter(function (a) { return a >= 0; }).length;
    var sn = sias6Ans.filter(function (a) { return a >= 0; }).length;
    var answered = pn + gn + cn + nn + pssn + sn;
    return '<div class="s3-overview">' +
      '<span>量表答题进度：<b>' + answered + '/38</b></span>' +
      '<span class="fs-hint">温馨提示：作答过程中系统将自动同步采集行为与生理数据，无需额外操作。</span>' +
      '</div>';
  }

  function renderStep() {
    var html = "";
    if (step === 1) {
      html =
      '<div class="card p-6">' +
        '<h3 class="sec-title">' + icon("i-user", 20) + '基本信息</h3>' +
        '<p class="text-sm text-slate-400 mb-4">请填写以下基本信息（标注 <span style="color:#ef4444">*</span> 的为必填项），信息仅用于测评结果归档。</p>' +
        '<div class="form-grid">' +
        '<div><label class="field-label">学号 <span style="color:#ef4444">*</span></label><input type="text" id="f-sid" placeholder="请输入学号"></div>' +
        '<div><label class="field-label">年龄</label><input type="number" id="f-age" placeholder="请输入年龄"></div>' +
        '<div><label class="field-label">性别</label><select id="f-gender"><option value="male">男</option><option value="female">女</option><option value="other">其他</option></select></div>' +
        '<div><label class="field-label">学习层次</label><select id="f-edu"><option value="本科">本科</option><option value="硕士研究生">硕士研究生</option><option value="博士研究生">博士研究生</option></select></div>' +
        '<div><label class="field-label">年级</label><input type="text" id="f-grade" placeholder="如：2026"></div>' +
        '<div><label class="field-label">专业</label><input type="text" id="f-major" placeholder="请输入专业"></div>' +
        '</div></div>';
    } else if (step === 2) {
      html =
      '<div class="card p-6">' +
        '<h3 class="sec-title">' + icon("i-shield", 20) + '知情同意书</h3>' +
        '<div style="font-size:14px;line-height:1.7;color:#475569;display:flex;flex-direction:column;gap:12px">' +
        '<p>本系统旨在通过多模态数据采集（包括量表评估、鼠标行为追踪和面部微表情分析）进行心理问题早期预警。</p>' +
        '<p>在参与测评前，请您了解以下事项：</p>' +
        '<ul class="consent-list">' +
        '<li>所有数据仅用于心理健康评估目的</li>' +
        '<li>您的个人信息将被加密存储和匿名化处理</li>' +
        '<li>您可以随时终止测评过程</li>' +
        '<li>测评结果仅供参考，不作为临床诊断依据</li>' +
        '<li>数据采集过程不会记录可识别个人身份的视频图像</li>' +
        '</ul>' +
        '<p style="color:#a9946f">请仔细阅读以上内容，确认理解并同意后继续。</p></div></div>' +
        '<div style="display:flex;gap:16px" class="mt-4">' +
        '<button class="agree-btn ' + (agreed ? "agree-on" : "") + '" id="btn-agree">' + icon("i-check", 16) + ' 我同意</button>' +
        '<button class="agree-btn ' + (!agreed ? "agree-off selected" : "agree-off") + '" id="btn-disagree">' + icon("i-x", 16) + ' 我不同意</button>' +
        '</div>';
    } else if (step === 3) {
      var phq9Done = phq9.every(function (a) { return a >= 0; });
      var gad7Done = gad7.every(function (a) { return a >= 0; });
      var cssrsDone = cssrsAns.every(function (a) { return a >= 0; });
      var nssiDone = nssiAns[0] >= 0 && (nssiAns[0] === 0 || nssiAns[1] >= 0);
      var pss10Done = pss10Ans.every(function (a) { return a >= 0; });
      var psqiValid = psqiAns.latency >= 0 && psqiAns.hours > 0;
      var sias6Done = sias6Ans.every(function (a) { return a >= 0; });
      var aslecDone = aslecAns.every(function (a) { return a >= 0; });
      html =
        s3Overview() +
        questionCard("PHQ-9 抑郁症筛查量表", "i-chart", phq9Q, phq9, "data-q", phq9Done) +
        questionCard("GAD-7 广泛性焦虑量表", "i-chart", gad7Q, gad7, "data-g", gad7Done) +
        layerBox(1, "第一层 · 核心预警", "直接关联风险分级与干预转介，请务必如实作答。", "#f87171",
          questionCard("C-SSRS 自杀严重度评定量表", "i-chart", cssrsQ, cssrsAns, "data-c", cssrsDone, cssrsOpts, "过去一个月内，是否出现过以下想法或行为？（任一选择\u201c是\u201d即触发高危预警）") +
          nssiCard(nssiDone)
        ) +
        layerBox(2, "第二层 · 扩充画像", "覆盖睡眠、压力、社交与生活事件，辅助刻画心理状态全景。", "#fb923c",
          questionCard("PSS-10 感知压力量表", "i-chart", pss10Q, pss10Ans, "data-p", pss10Done, pss10Opts, "过去一个月里，以下情况发生的频率如何？（标注 * 的题目为反向计分题）", PSS10_REV) +
          psqiCard(psqiValid) +
          questionCard("SIAS-6 社交焦虑量表", "i-chart", sias6Q, sias6Ans, "data-s", sias6Done, sias6Opts, "过去两周里，在社交情境中的体验如何？") +
          aslecCard()
        );
    } else if (step === 4) {
      html =
      '<div class="card p-6" style="padding:48px 24px;text-align:center">' +
        '<svg width="64" height="64" class="c-green" style="margin:0 auto 16px"><use href="#i-check-circle"/></svg>' +
        '<h3 style="font-size:20px;font-weight:700;color:#334155;margin-bottom:8px">本次心理测评已完成</h3>' +
        '<p style="font-size:14px;color:#a9946f;line-height:1.7;max-width:440px;margin:0 auto 24px">感谢您的配合！您的测评数据已安全提交，将由心理站工作人员统一查看与跟进，请您耐心等待后续反馈。</p>' +
        '<button class="btn btn-primary" id="btn-restart">' + icon("i-rotate", 16) + ' 重新开始测评</button>' +
        '</div>';
    }
    stepContent.innerHTML = html;
    bindStepEvents();
    autoStartCollect();
  }

  function bindStepEvents() {
    var sid = document.getElementById("f-sid");
    if (sid) sid.addEventListener("input", function () { formState.sid = sid.value; updateNav(); });
    var fAge = document.getElementById("f-age");
    if (fAge) fAge.addEventListener("input", function () { formState.age = fAge.value; });
    var fGender = document.getElementById("f-gender");
    if (fGender) fGender.addEventListener("change", function () { formState.gender = fGender.value; });
    var fEdu = document.getElementById("f-edu");
    if (fEdu) fEdu.addEventListener("change", function () { formState.edu = fEdu.value; });
    var fGrade = document.getElementById("f-grade");
    if (fGrade) fGrade.addEventListener("input", function () { formState.grade = fGrade.value; });
    var fMajor = document.getElementById("f-major");
    if (fMajor) fMajor.addEventListener("input", function () { formState.major = fMajor.value; });

    var agree = document.getElementById("btn-agree");
    var disagree = document.getElementById("btn-disagree");
    if (agree) agree.addEventListener("click", function () { agreed = true; renderStep(); updateNav(); });
    if (disagree) disagree.addEventListener("click", function () { agreed = false; renderStep(); updateNav(); });

    stepContent.querySelectorAll(".opt").forEach(function (b) {
      b.addEventListener("click", function () {
        var oi = parseInt(b.getAttribute("data-o"), 10);
        if (b.hasAttribute("data-q")) {
          phq9[parseInt(b.getAttribute("data-q"), 10)] = oi;
        } else if (b.hasAttribute("data-g")) {
          gad7[parseInt(b.getAttribute("data-g"), 10)] = oi;
        } else if (b.hasAttribute("data-c")) {
          cssrsAns[parseInt(b.getAttribute("data-c"), 10)] = oi;
        } else if (b.hasAttribute("data-n")) {
          nssiAns[parseInt(b.getAttribute("data-n"), 10)] = oi;
        } else if (b.hasAttribute("data-p")) {
          pss10Ans[parseInt(b.getAttribute("data-p"), 10)] = oi;
        } else if (b.hasAttribute("data-s")) {
          sias6Ans[parseInt(b.getAttribute("data-s"), 10)] = oi;
        } else if (b.hasAttribute("data-a")) {
          aslecAns[parseInt(b.getAttribute("data-a"), 10)] = oi;
        } else if (b.hasAttribute("data-pd")) {
          psqiAns.d[parseInt(b.getAttribute("data-pd"), 10)] = oi;
        }
        renderStep(); updateNav();
      });
    });
    bindPsqiEvents();
    bindAslecEvents();

    var fsBtn = document.getElementById("btn-fs");
    if (fsBtn) fsBtn.addEventListener("click", function () {
      if (!fsActive) {
        var el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(function () {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(function () {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    });

    var restart = document.getElementById("btn-restart");
    if (restart) restart.addEventListener("click", function () {
      step = 1; agreed = false;
      phq9 = new Array(9).fill(-1); gad7 = new Array(7).fill(-1);
      cssrsAns = new Array(4).fill(-1); nssiAns = [-1, -1];
      pss10Ans = new Array(10).fill(-1);
      psqiAns = { bed: 23, latency: 15, wake: 7, hours: 7, d: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], quality: 0, meds: 0, day: 0, energy: 0 };
      sias6Ans = new Array(6).fill(-1);
      aslecAns = new Array(27).fill(0);
      mouseStatus = "idle"; mouseProgress = 0;
      camStatus = "idle"; camProgress = 0;
      if (mouseStopFn) { mouseStopFn(); mouseStopFn = null; }
      mouseTraj = [];
      if (mouseTimer) { clearTimeout(mouseTimer); mouseTimer = null; }
      if (camTimer) { clearTimeout(camTimer); camTimer = null; }
      if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; }
      renderSteps(); renderStep(); updateNav();
    });
    updateFsUI();
  }

  /* PSQI 数字输入与下拉框事件绑定（renderStep 重渲染后重新绑定） */
  function bindPsqiEvents() {
    var mapId = {
      "p-bed": "bed", "p-latency": "latency", "p-wake": "wake", "p-hours": "hours"
    };
    Object.keys(mapId).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var k = mapId[id];
      el.addEventListener("input", function () {
        var v = parseInt(el.value, 10);
        if (isNaN(v)) return;
        if (k === "bed" || k === "wake") v = Math.max(0, Math.min(23, v));
        else if (k === "latency") v = Math.max(0, Math.min(240, v));
        else v = Math.max(0, Math.min(12, v));
        psqiAns[k] = v;
        updateNav();
      });
    });
    var mapSel = { "p-quality": "quality", "p-meds": "meds", "p-day": "day", "p-energy": "energy" };
    Object.keys(mapSel).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var k = mapSel[id];
      el.addEventListener("change", function () {
        psqiAns[k] = parseInt(el.value, 10) || 0;
        updateNav();
      });
    });
  }

  /* ASLEC 选项点击事件（data-a 行 + data-o 档位） */
  function bindAslecEvents() {}

  /* ============ 全屏按钮 UI 同步 ============ */
  function updateFsUI() {
    var fsBtn = document.getElementById("btn-fs");
    var fsNote = document.getElementById("fs-note");
    if (fsBtn) {
      fsBtn.innerHTML = fsActive
        ? icon("i-compress", 16) + ' 退出全屏'
        : icon("i-expand", 16) + ' 全屏模式';
    }
    if (fsNote) fsNote.style.display = fsActive ? "block" : "none";
  }

  /* 进入心理测评步骤时自动开始数据采集（随答题并行，无需单独操作） */
  function finishMouseTrack() {
    if (mouseStopFn) { mouseStopFn(); mouseStopFn = null; }
    if (mouseTimer) { clearTimeout(mouseTimer); mouseTimer = null; }
    mouseStatus = "completed";
    mouseProgress = 100;
    renderStep(); updateNav();
  }
  function autoStartCollect() {
    if (step !== 3) return;
    if (mouseStatus === "idle") {
      // 真实鼠标轨迹采样：监听 mousemove，节流约 80ms 记一个点，满 60 点或 3 秒兜底完成
      mouseStatus = "running"; mouseProgress = 0;
      mouseTraj = [];
      var lastT = 0;
      function onMove(e) {
        var now = performance.now();
        if (now - lastT < 80) return;
        lastT = now;
        var first = mouseTraj[0];
        mouseTraj.push({
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
          t: Math.round(now - (first ? first.t : now))
        });
        mouseProgress = Math.min(100, Math.round(mouseTraj.length * (100 / 60)));
        if (mouseTraj.length >= 60) finishMouseTrack();
      }
      document.addEventListener("mousemove", onMove);
      mouseStopFn = function () { document.removeEventListener("mousemove", onMove); };
      // 轨迹采集覆盖整个答题过程：不设超时，直至提交测评（saveAssessmentRecord）时停止
    }
    if (camStatus === "idle") {
      camStatus = "running"; camProgress = 0; camMode = "normal";
      var camSettled = false;
      function camSettle(mode) {
        if (camSettled) return;
        camSettled = true;
        camMode = mode;
        if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; }
        camProgress = 100;
        camStatus = "completed";
        renderStep(); updateNav();
      }
      // 8 秒兜底：权限弹窗未响应或环境不支持时降级，避免流程卡死
      var camFail = setTimeout(function () { camSettle("degraded"); }, 8000);
      camTimer = camFail;
      function camWindow() {
        camTimer = setTimeout(function () { camSettle("normal"); }, 2500);
      }
      var hasCam = typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      if (!hasCam) {
        clearTimeout(camFail);
        camSettle("degraded");
      } else {
        try {
          navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
            .then(function (stream) {
              if (camSettled) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
              clearTimeout(camFail);
              camStream = stream;
              camWindow();
            })
            .catch(function () {
              clearTimeout(camFail);
              camSettle("degraded");
            });
        } catch (e) {
          clearTimeout(camFail);
          camSettle("degraded");
        }
      }
    }
  }

  function canProceed() {
    if (step === 1) {
      var sid = document.getElementById("f-sid");
      return sid && sid.value.trim().length > 0;
    }
    if (step === 2) return agreed;
    if (step === 3) {
      var cssrsDone3 = cssrsAns.every(function (a) { return a >= 0; });
      var nssiDone3 = nssiAns[0] >= 0 && (nssiAns[0] === 0 || nssiAns[1] >= 0);
      var pss10Done3 = pss10Ans.every(function (a) { return a >= 0; });
      var psqiDone3 = psqiAns.latency >= 0 && psqiAns.hours > 0;
      var sias6Done3 = sias6Ans.every(function (a) { return a >= 0; });
      return phq9.every(function (a) { return a >= 0; }) &&
        gad7.every(function (a) { return a >= 0; }) &&
        cssrsDone3 && nssiDone3 && pss10Done3 && psqiDone3 && sias6Done3 &&
        camStatus === "completed";
    }
    return true;
  }

  function updateNav() {
    btnPrev.disabled = step === 1;
    stepNav.style.display = step < totalSteps ? "flex" : "none";
    if (step < totalSteps) {
      btnNext.innerHTML = (step === 3 ? "完成测评" : "下一步") + ' ' + icon("i-chev-r", 16);
      btnNext.disabled = !canProceed();
    }
  }

  btnPrev.addEventListener("click", function () {
    if (step > 1) { step--; renderSteps(); renderStep(); updateNav(); }
  });
  function riskLevel(score) { if (score <= 4) return 0; if (score <= 9) return 1; if (score <= 14) return 2; return 3; }
  function riskOf(p, g) {
    var ls = ["低风险", "轻度风险", "中度风险", "高风险"];
    var pScore = p.reduce(function (s, a) { return s + (a >= 0 ? a : 0); }, 0);
    var gScore = g.reduce(function (s, a) { return s + (a >= 0 ? a : 0); }, 0);
    return ls[Math.max(riskLevel(pScore), riskLevel(gScore))];
  }
  /* ---- 补充量表评分（与 source src/lib/scales.ts 一致） ---- */
  function scorePss10(a) {
    return a.reduce(function (s, v, i) { return s + (PSS10_REV.indexOf(i) >= 0 ? 4 - v : v); }, 0);
  }
  function pss10LevelOf(t) { return t <= 13 ? "压力水平较低" : t <= 19 ? "压力水平中等" : t <= 26 ? "压力水平偏高" : "压力水平高"; }
  function scoreSias6(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function scoreAslec(a) {
    var total = 0, count = 0;
    a.forEach(function (v) { if (v > 0) { total += v; count++; } });
    return { total: total, count: count };
  }
  function scorePsqi(a) {
    var clamp = function (v) { return Math.max(0, Math.min(3, v)); };
    var c1 = clamp(a.quality);
    var ls = a.latency <= 15 ? 0 : a.latency <= 30 ? 1 : a.latency <= 60 ? 2 : 3;
    var so = ls + (a.d[0] || 0);
    var c2 = so === 0 ? 0 : so <= 2 ? 1 : so <= 4 ? 2 : 3;
    var c3 = a.hours >= 7 ? 0 : a.hours >= 6 ? 1 : a.hours >= 5 ? 2 : 3;
    var bedDur = a.wake - a.bed;
    if (bedDur <= 0) bedDur += 24;
    if (bedDur <= 0) bedDur = a.hours + 1;
    var eff = (a.hours / bedDur) * 100;
    var c4 = eff >= 85 ? 0 : eff >= 75 ? 1 : eff >= 65 ? 2 : 3;
    var distSum = a.d.slice(1).reduce(function (s, v) { return s + v; }, 0);
    var c5 = distSum === 0 ? 0 : distSum <= 9 ? 1 : distSum <= 18 ? 2 : 3;
    var c6 = clamp(a.meds);
    var daySum = (a.day || 0) + (a.energy || 0);
    var c7 = daySum === 0 ? 0 : daySum <= 2 ? 1 : daySum <= 4 ? 2 : 3;
    var comps = [c1, c2, c3, c4, c5, c6, c7];
    return { comps: comps, total: comps.reduce(function (s, v) { return s + v; }, 0) };
  }
  function psqiLevelOf(t) { return t <= 5 ? "睡眠正常" : t <= 10 ? "轻度睡眠障碍" : t <= 15 ? "中度睡眠障碍" : "重度睡眠障碍"; }
  function buildRisk(p, g, c, n) {
    var flags = [];
    var pScore = p.reduce(function (s, a) { return s + (a >= 0 && a <= 3 ? a : 0); }, 0);
    var gScore = g.reduce(function (s, a) { return s + (a >= 0 && a <= 3 ? a : 0); }, 0);
    var level = Math.max(riskLevel(pScore), riskLevel(gScore));
    var pos = c.filter(function (v) { return v === 1; }).length;
    if (pos > 0) { flags.push("suicide"); level = Math.max(level, 3); }
    var nssiPos = (n[0] || 0) === 1;
    var phq9Item9 = (p[8] || -1) > 0;
    if (nssiPos) { flags.push("nssi"); level = Math.max(level, 2); if (phq9Item9) level = Math.max(level, 3); }
    return { level: level, label: ["低风险", "轻度风险", "中度风险", "高风险"][level], flags: flags };
  }
  function saveAssessmentRecord() {
    // 提交测评时停止轨迹采样，确保覆盖整个答题过程的全部轨迹点
    if (mouseStopFn) { mouseStopFn(); mouseStopFn = null; }
    if (mouseTimer) { clearTimeout(mouseTimer); mouseTimer = null; }
    if (!formState.sid.trim()) return;
    var now = new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var time = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
    var psqiRes = scorePsqi(psqiAns);
    var aslecRes = scoreAslec(aslecAns);
    var riskRes = buildRisk(phq9, gad7, cssrsAns, nssiAns);
    var rec = {
      id: "A" + String(Date.now()).slice(-5),
      sid: formState.sid.trim(),
      age: formState.age,
      gender: formState.gender,
      edu: formState.edu,
      grade: formState.grade,
      major: formState.major,
      time: time,
      phq9: phq9.slice(), gad7: gad7.slice(),
      p: phq9.reduce(function (s, a) { return s + (a >= 0 ? a : 0); }, 0),
      g: gad7.reduce(function (s, a) { return s + (a >= 0 ? a : 0); }, 0),
      cssrs: cssrsAns.slice(),
      cssrsPositive: cssrsAns.filter(function (v) { return v === 1; }).length,
      nssi: nssiAns.slice(),
      pss10: pss10Ans.slice(),
      pss10Score: scorePss10(pss10Ans),
      psqi: JSON.parse(JSON.stringify(psqiAns)),
      psqiComps: psqiRes.comps,
      psqiScore: psqiRes.total,
      sias6: sias6Ans.slice(),
      sias6Score: scoreSias6(sias6Ans),
      aslec: aslecAns.slice(),
      aslecScore: aslecRes.total,
      aslecCount: aslecRes.count,
      risk: riskRes.label,
      riskFlags: riskRes.flags,
      st: "completed",
      traj: (typeof mouseTraj !== "undefined" ? mouseTraj : []).slice(),
      cam: (typeof camMode !== "undefined" ? camMode : "normal")
    };
    dataRecords.push(rec);
    persistRecsLocal();
  }
  function getVal(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.value : fallback;
  }
  btnNext.addEventListener("click", function () {
    if (!canProceed()) return;
    if (step === 3 && step < totalSteps) saveAssessmentRecord();
    if (step < totalSteps) { step++; }
    renderSteps(); renderStep(); updateNav();
  });

  /* ============ 全屏状态监听 ============ */
  document.addEventListener("fullscreenchange", function () {
    fsActive = !!document.fullscreenElement;
    if (document.webkitFullscreenElement) fsActive = true;
    updateFsUI();
  });
  document.addEventListener("webkitfullscreenchange", function () {
    fsActive = !!document.webkitFullscreenElement;
    updateFsUI();
  });

  renderSteps();
  renderStep();
  updateNav();
})();

