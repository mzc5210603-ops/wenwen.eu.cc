/* ============================================================
   SYNAPSE GARDEN —— app.js 八份算法标本，IIFE + ES5
   ============================================================ */
(function () {
'use strict';

/* ---------------- 基础 ---------------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function bind(el, ev, fn) { if (el) { el.addEventListener(ev, fn); } }
function r2(x) { return (Math.round(x * 1000) / 1000).toString(); }
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

var COL = { coral: '#ef6f61', blue: '#2f88b5', green: '#65a06a', purple: '#8b6fb5', honey: '#e5b94e', gray: '#9c9385' };
var CLS5 = [COL.coral, COL.blue, COL.green, COL.purple, COL.honey, COL.gray];
var CLASS_CN3 = ['珊瑚菌群', '试剂蓝群', '霉绿菌群'];

var viewTimer = null;
function stopTimer() { if (viewTimer) { clearInterval(viewTimer); viewTimer = null; } }

/* ---------------- 培养皿画布 ---------------- */
function sizeCanvas(cv) {
  var w = cv.clientWidth || 460;
  var h = cv.clientHeight || 360;
  if (cv.width !== Math.round(w) || cv.height !== Math.round(h)) {
    cv.width = Math.round(w);
    cv.height = Math.round(h);
  }
}
/* 世界坐标 → 皿内像素（按比例收进圆形视野） */
function makeMap(cv, xmin, xmax, ymin, ymax, margin) {
  var w = cv.width, h = cv.height;
  var cx = w / 2, cy = h / 2;
  var r = Math.min(w, h) / 2 - (margin || 26);
  var sx = (2 * r) / (xmax - xmin), sy = (2 * r) / (ymax - ymin);
  var scale = Math.min(sx, sy);
  function X(x) { return cx + (x - (xmin + xmax) / 2) * scale; }
  function Y(y) { return cy - (y - (ymin + ymax) / 2) * scale; }
  return { X: X, Y: Y, cx: cx, cy: cy, r: r, scale: scale, w: w, h: h, xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
}
function inDish(m, px, py) {
  var dx = px - m.cx, dy = py - m.cy;
  return dx * dx + dy * dy <= (m.r + 8) * (m.r + 8);
}
function drawRings(ctx, m) {
  ctx.save();
  ctx.strokeStyle = 'rgba(120,100,60,.10)';
  ctx.lineWidth = 1;
  for (var k = 1; k <= 3; k++) {
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, m.r * k / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
function dot(ctx, x, y, rr, color, halo) {
  ctx.save();
  if (halo) {
    ctx.beginPath();
    ctx.arc(x, y, rr + 3.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
function cross(ctx, x, y, rr, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, rr + 3, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdf6';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - rr, y - rr); ctx.lineTo(x + rr, y + rr);
  ctx.moveTo(x + rr, y - rr); ctx.lineTo(x - rr, y + rr);
  ctx.stroke();
  ctx.restore();
}
function bindDish(cv, cb) {
  bind(cv, 'click', function (e) {
    var rect = cv.getBoundingClientRect();
    var px = (e.clientX - rect.left) * (cv.width / rect.width);
    var py = (e.clientY - rect.top) * (cv.height / rect.height);
    cb(px, py);
  });
}
/* 分段胶囊（事件委托） */
function bindSeg(id, value, onPick) {
  var seg = document.getElementById(id);
  function refresh() {
    $all('[data-v]', seg).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === String(value)); });
  }
  seg.addEventListener('click', function (e) {
    var b = e.target;
    while (b && b !== seg && !b.getAttribute('data-v')) { b = b.parentNode; }
    if (!b || b === seg) { return; }
    value = b.getAttribute('data-v');
    refresh();
    onPick(value, b);
  });
  refresh();
  return { get: function () { return value; }, set: function (v) { value = v; refresh(); } };
}
function runningBtn(id, flag) {
  var b = document.getElementById(id);
  if (b) { b.textContent = flag ? '暂停培养' : '连续培养'; }
}

/* ================= 首页 ================= */
var SPECIMENS = [
  { k: 'sp01', no: 'SP-01', name: '感知机', desc: '一条会自己挪位置的分界线', svg:
    '<circle cx="20" cy="20" r="6" fill="' + COL.coral + '"/><circle cx="36" cy="24" r="6" fill="' + COL.coral + '"/>' +
    '<circle cx="30" cy="42" r="6" fill="' + COL.blue + '"/><circle cx="48" cy="40" r="6" fill="' + COL.blue + '"/>' +
    '<line x1="10" y1="48" x2="56" y2="12" stroke="#35302a" stroke-width="2.4" stroke-linecap="round"/>' },
  { k: 'sp02', no: 'SP-02', name: '逻辑回归', desc: 'S 形概率膜覆盖培养皿', svg:
    '<path d="M8 44 Q32 42 32 28 T56 12" fill="none" stroke="' + COL.coral + '" stroke-width="2.6"/>' +
    '<circle cx="15" cy="40" r="4.5" fill="' + COL.blue + '"/><circle cx="47" cy="16" r="4.5" fill="' + COL.coral + '"/>' },
  { k: 'sp03', no: 'SP-03', name: 'K-Means', desc: '菌群向各自的中心聚拢', svg:
    '<circle cx="17" cy="18" r="4.5" fill="' + COL.coral + '"/><circle cx="22" cy="24" r="4.5" fill="' + COL.coral + '"/>' +
    '<circle cx="42" cy="18" r="4.5" fill="' + COL.blue + '"/><circle cx="38" cy="25" r="4.5" fill="' + COL.blue + '"/>' +
    '<circle cx="28" cy="42" r="4.5" fill="' + COL.green + '"/><circle cx="34" cy="38" r="4.5" fill="' + COL.green + '"/>' +
    '<path d="M19 21 v6 M40 21 v6 M31 40 v-6" stroke="#35302a" stroke-width="2" stroke-dasharray="3 3"/>' },
  { k: 'sp04', no: 'SP-04', name: 'KNN 近邻', desc: '新落的孢子归谁，问邻居', svg:
    '<circle cx="20" cy="36" r="4.5" fill="' + COL.coral + '"/><circle cx="40" cy="20" r="4.5" fill="' + COL.blue + '"/>' +
    '<circle cx="30" cy="28" r="6" fill="none" stroke="#35302a" stroke-width="2.2"/>' +
    '<line x1="30" y1="28" x2="20" y2="36" stroke="#9c9385" stroke-width="1.5"/><line x1="30" y1="28" x2="40" y2="20" stroke="#9c9385" stroke-width="1.5"/>' },
  { k: 'sp05', no: 'SP-05', name: '梯度下山', desc: '三颗孢子沿碗壁找谷底', svg:
    '<ellipse cx="32" cy="32" rx="22" ry="12" fill="none" stroke="' + COL.green + '" stroke-width="2"/>' +
    '<ellipse cx="32" cy="32" rx="12" ry="6.5" fill="none" stroke="' + COL.green + '" stroke-width="2"/>' +
    '<circle cx="16" cy="24" r="4" fill="' + COL.coral + '"/><circle cx="46" cy="25" r="4" fill="' + COL.blue + '"/>' +
    '<circle cx="32" cy="32" r="4.5" fill="#35302a"/>' },
  { k: 'sp06', no: 'SP-06', name: '激活液图谱', desc: '七种激活液与其导数', svg:
    '<path d="M8 42 L24 42 Q32 42 32 32 T40 12 H56" fill="none" stroke="' + COL.purple + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<line x1="10" y1="46" x2="54" y2="46" stroke="#cdc3ac" stroke-width="1.5"/>' },
  { k: 'sp07', no: 'SP-07', name: '贝叶斯滤信器', desc: '分辨垃圾消息的朴素贝叶斯', svg:
    '<rect x="12" y="10" width="40" height="10" rx="5" fill="rgba(239,111,97,.3)" stroke="' + COL.coral + '" stroke-width="1.6"/>' +
    '<rect x="8" y="24" width="44" height="10" rx="5" fill="rgba(47,136,181,.25)" stroke="' + COL.blue + '" stroke-width="1.6"/>' +
    '<circle cx="32" cy="44" r="6" fill="none" stroke="#35302a" stroke-width="2"/>' },
  { k: 'sp08', no: 'SP-08', name: '迷你神经网络', desc: '前向传播加反向传播，学会圆环', svg:
    '<circle cx="14" cy="18" r="4" fill="' + COL.coral + '"/><circle cx="14" cy="44" r="4" fill="' + COL.coral + '"/>' +
    '<circle cx="32" cy="12" r="4" fill="' + COL.green + '"/><circle cx="32" cy="26" r="4" fill="' + COL.green + '"/><circle cx="32" cy="40" r="4" fill="' + COL.green + '"/><circle cx="32" cy="52" r="4" fill="' + COL.green + '"/>' +
    '<circle cx="50" cy="31" r="5" fill="' + COL.blue + '"/>' +
    '<g stroke="#9c9385" stroke-width="1.2"><line x1="14" y1="18" x2="32" y2="12"/><line x1="14" y1="18" x2="32" y2="40"/><line x1="14" y1="44" x2="32" y2="26"/><line x1="14" y1="44" x2="32" y2="52"/><line x1="32" y1="12" x2="50" y2="31"/><line x1="32" y1="52" x2="50" y2="31"/></g>' }
];

var homeView = {
  html: function () {
    var h = '<section class="hero"><div><h1>在培养皿里，<br>养出一个<em>会学习</em>的小东西</h1>' +
      '<p>八份经典机器学习标本：从感知机到多层神经网络。全部算法在你的浏览器里实时训练，点「连续培养」就能看着它们一点点学聪明。</p></div>' +
      '<div class="big-dish"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i><i class="b5"></i></div></section>';
    h += '<div class="cabinet-title">标本柜<span>点击任一培养皿开始观察</span></div><div class="specimens">';
    SPECIMENS.forEach(function (t) {
      h += '<a class="specimen" href="#/' + t.k + '"><span class="sp-icon"><svg viewBox="0 0 64 64" width="86" height="86">' +
        t.svg + '</svg></span><span class="sp-no">' + t.no + '</span><h3>' + t.name + '</h3><p>' + t.desc + '</p></a>';
    });
    return h + '</div>';
  },
  mount: function () {}
};

function pageHead(no, title, desc) {
  return '<div class="crumb"><a href="#/">标本台</a> / ' + no + '</div>' +
    '<div class="sp-head"><span class="sp-badge">' + no + '</span><div><h2>' + title + '</h2><p>' + desc + '</p></div></div>';
}
function stage(canvasId, hint) {
  return '<div class="stage"><div class="dish-wrap"><div class="dish"><canvas id="' + canvasId + '"></canvas></div><div class="dish-glass"></div></div>' +
    '<div class="stage-hint">' + hint + '</div></div>';
}

/* ================= SP-01 感知机 ================= */
var sp01 = {
  html: function () {
    return pageHead('SP-01', '感知机', 'Rosenblatt, 1958。误分类一点，分界线就朝它挪一点。') +
      '<div class="experiment">' + stage('cv01', '珊瑚点与蓝点各为一类；当某点落在分界线错误一侧时会出现白圈。') +
      '<div class="notebook nb"><div class="nb-title">实验操作</div>' +
      '<div class="btn-row"><button class="btn coral" id="b01-step" type="button">单步修正</button>' +
      '<button class="btn blue" id="b01-run" type="button">连续培养</button>' +
      '<button class="btn green" id="b01-fast" type="button">连跑 100 轮</button>' +
      '<button class="btn ghost" id="b01-reset" type="button">重新接种</button></div>' +
      '<div class="nb-title">记录本</div><div class="kv2" id="k01"></div>' +
      '<div class="readout" id="r01"></div></div></div>';
  },
  mount: function () {
    var cv = $('#cv01'), pts, model, running, miss = 0;
    function seed() { pts = ML.blobs(42, (Math.random() * 9999) | 0); model = new ML.Perceptron(2); miss = pts.length; }
    function draw() {
      sizeCanvas(cv);
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      var m = makeMap(cv, 0, 10, 0, 10, 30);
      drawRings(ctx, m);
      var X = pts.map(function (p) { return [p.x, p.y]; });
      if (model.w[0] !== 0 || model.w[1] !== 0 || model.b !== 0) {
        var w = model.w, b = model.b;
        var xs = [m.xmin, m.xmax];
        for (var t = 0; t < 2; t++) {
          var xx = xs[t], yy = -(w[0] * xx + b) / (w[1] || 1e-9);
          if (!isFinite(yy) || yy < m.ymin - 6 || yy > m.ymax + 6) { xs[t] = -b / (w[0] || 1e-9); }
        }
        ctx.save();
        ctx.strokeStyle = '#35302a'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(m.X(xs[0]), m.Y(-(w[0] * xs[0] + b) / (w[1] || 1e-9)));
        ctx.lineTo(m.X(xs[1]), m.Y(-(w[0] * xs[1] + b) / (w[1] || 1e-9))); ctx.stroke();
        ctx.restore();
      }
      miss = 0;
      pts.forEach(function (p) {
        var pred = model.predict([p.x, p.y]);
        if (pred !== p.label) {
          miss++;
          ctx.save(); ctx.beginPath(); ctx.arc(m.X(p.x), m.Y(p.y), 9, 0, Math.PI * 2);
          ctx.lineWidth = 2; ctx.strokeStyle = '#35302a'; ctx.stroke(); ctx.restore();
        }
        dot(ctx, m.X(p.x), m.Y(p.y), 5.5, p.label === 1 ? COL.coral : COL.blue, true);
      });
      $('#k01').innerHTML =
        '<div><span>w₁</span><b>' + r2(model.w[0]) + '</b></div>' +
        '<div><span>w₂</span><b>' + r2(model.w[1]) + '</b></div>' +
        '<div><span>偏置 b</span><b>' + r2(model.b) + '</b></div>' +
        '<div><span>轮数</span><b>' + model.steps + '</b></div>' +
        '<div><span>误分点</span><b>' + miss + '</b></div>' +
        '<div><span>状态</span><b>' + (miss === 0 && model.steps > 0 ? '已收敛' : '培养中') + '</b></div>';
      $('#r01').innerHTML = model.steps === 0 ? '刚开始：分界线还没出现，点「单步修正」接种规则。' :
        (miss === 0 ? '<span class="warm">两类菌群已被完全分开，感知机收敛。</span>' : '还有 ' + miss + ' 个点站错了边。');
    }
    function step1() {
      var X = pts.map(function (p) { return [p.x, p.y]; });
      var y = pts.map(function (p) { return p.label; });
      model.epoch(X, y, 0.1);
      draw();
      if (miss === 0) { stop(); }
    }
    function stop() { running = false; stopTimer(); runningBtn('b01-run', false); }
    bind($('#b01-step'), 'click', step1);
    bind($('#b01-run'), 'click', function () {
      if (running) { stop(); return; }
      running = true; runningBtn('b01-run', true);
      viewTimer = setInterval(step1, 70);
    });
    bind($('#b01-fast'), 'click', function () {
      stop();
      var X = pts.map(function (p) { return [p.x, p.y]; });
      var y = pts.map(function (p) { return p.label; });
      for (var i = 0; i < 100 && miss > 0; i++) { model.epoch(X, y, 0.1); draw(); }
    });
    bind($('#b01-reset'), 'click', function () { stop(); seed(); draw(); });
    seed(); draw();
  }
};

/* ================= SP-02 逻辑回归 ================= */
var sp02 = {
  html: function () {
    return pageHead('SP-02', '逻辑回归', '输出不是「是/否」，而是 0 到 1 之间的概率。') +
      '<div class="experiment">' + stage('cv02', '暖色膜偏向珊瑚类，冷色膜偏向蓝类；颜色越浓把握越大。') +
      '<div class="notebook nb"><div class="nb-title">实验操作</div>' +
      '<div class="pill-row" id="seg02lr"><button class="pill" data-v="0.03" type="button">学习率 0.03</button><button class="pill on" data-v="0.15" type="button">0.15</button><button class="pill" data-v="0.5" type="button">0.5（偏大）</button></div>' +
      '<div class="btn-row"><button class="btn coral" id="b02-step" type="button">迭代一轮</button>' +
      '<button class="btn blue" id="b02-run" type="button">连续培养</button>' +
      '<button class="btn ghost" id="b02-reset" type="button">重新接种</button></div>' +
      '<div class="nb-title">记录本</div><div class="kv2" id="k02"></div>' +
      '<div class="readout" id="r02"></div></div></div>';
  },
  mount: function () {
    var cv = $('#cv02'), pts, model, running, loss = 0, lr = 0.15, rounds = 0;
    function seed() { pts = ML.blobs(42, 4242); model = new ML.Logistic(2); loss = 0; rounds = 0; }
    function draw() {
      sizeCanvas(cv);
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      var m = makeMap(cv, 0, 10, 0, 10, 30);
      drawRings(ctx, m);
      var N = 38, i, j;
      for (i = 0; i <= N; i++) {
        for (j = 0; j <= N; j++) {
          var wx = m.xmin + (m.xmax - m.xmin) * (i + 0.5) / (N + 1);
          var wy = m.ymin + (m.ymax - m.ymin) * (j + 0.5) / (N + 1);
          var px = m.X(wx), py = m.Y(wy);
          if (!inDish(m, px, py)) { continue; }
          var pr = model.prob([wx, wy]);
          ctx.fillStyle = pr > 0.5 ? 'rgba(239,111,97,' + (0.06 + (pr - 0.5) * 0.5) + ')'
            : 'rgba(47,136,181,' + (0.06 + (0.5 - pr) * 0.5) + ')';
          var cellW = (m.r * 2) / N * 1.15;
          ctx.fillRect(px - cellW / 2, py - cellW / 2, cellW + 0.6, cellW + 0.6);
        }
      }
      if (rounds > 0) {
        var w = model.w, b = model.b;
        if (Math.abs(w[1]) > 1e-9) {
          ctx.save();
          ctx.strokeStyle = '#35302a'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
          ctx.beginPath();
          ctx.moveTo(m.X(m.xmin), m.Y(-(w[0] * m.xmin + b) / w[1]));
          ctx.lineTo(m.X(m.xmax), m.Y(-(w[0] * m.xmax + b) / w[1]));
          ctx.stroke(); ctx.restore();
        }
      }
      var correct = 0;
      pts.forEach(function (p) {
        var realOne = p.label === 1;
        var pr = model.prob([p.x, p.y]);
        if (rounds > 0 && (pr >= 0.5) === realOne) { correct++; }
        dot(ctx, m.X(p.x), m.Y(p.y), 5.5, realOne ? COL.coral : COL.blue, true);
      });
      $('#k02').innerHTML =
        '<div><span>轮数</span><b>' + rounds + '</b></div>' +
        '<div><span>交叉熵损失</span><b>' + r2(loss) + '</b></div>' +
        '<div><span>准确率</span><b>' + (rounds ? Math.round(correct / pts.length * 100) + '%' : '—') + '</b></div>' +
        '<div><span>w₁</span><b>' + r2(model.w[0]) + '</b></div>' +
        '<div><span>w₂</span><b>' + r2(model.w[1]) + '</b></div>' +
        '<div><span>偏置 b</span><b>' + r2(model.b) + '</b></div>';
      $('#r02').innerHTML = rounds === 0 ? '膜面一片琼脂色：尚未训练。概率膜会随梯度下降逐渐染上颜色。' :
        '当前决策边界（虚线）即概率恰为 0.5 的位置。';
    }
    function step1() {
      var X = pts.map(function (p) { return [p.x, p.y]; });
      var y = pts.map(function (p) { return p.label === 1 ? 1 : 0; });
      loss = model.step(X, y, lr);
      rounds++;
      draw();
      if (loss < 0.02) { stop(); }
    }
    function stop() { running = false; stopTimer(); runningBtn('b02-run', false); }
    bindSeg('seg02lr', '0.15', function (v) { lr = parseFloat(v); });
    bind($('#b02-step'), 'click', step1);
    bind($('#b02-run'), 'click', function () {
      if (running) { stop(); return; }
      running = true; runningBtn('b02-run', true);
      viewTimer = setInterval(step1, 70);
    });
    bind($('#b02-reset'), 'click', function () { stop(); seed(); draw(); });
    seed(); draw();
  }
};

/* ================= SP-03 K-Means ================= */
var sp03 = {
  html: function () {
    return pageHead('SP-03', 'K-Means 聚类', '无监督：没人告诉它谁是谁，只按「离谁近」抱团。') +
      '<div class="experiment">' + stage('cv03', 'X 记号是簇中心；点的颜色即当前所属簇。') +
      '<div class="notebook nb"><div class="nb-title">菌群份数 K</div>' +
      '<div class="pill-row" id="seg03k">' +
      [2, 3, 4, 5, 6].map(function (k) { return '<button class="pill' + (k === 3 ? ' on' : '') + '" data-v="' + k + '" type="button">' + k + ' 簇</button>'; }).join('') +
      '</div><div class="btn-row"><button class="btn coral" id="b03-step" type="button">单步迭代</button>' +
      '<button class="btn blue" id="b03-run" type="button">连续培养</button>' +
      '<button class="btn ghost" id="b03-reset" type="button">换一批菌</button></div>' +
      '<div class="nb-title">记录本</div><div class="kv2" id="k03"></div>' +
      '<div class="readout" id="r03"></div></div></div>';
  },
  mount: function () {
    var cv = $('#cv03'), pts, km, running, k = 3, converged = false;
    function seed() {
      pts = ML.clusters3(96, (Math.random() * 9999) | 0);
      km = new ML.KMeans(pts, k, ML.rng((Math.random() * 9999) | 0));
      km.assign(pts);
      converged = false;
    }
    function draw() {
      sizeCanvas(cv);
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      var m = makeMap(cv, 0, 10, 0, 10, 30);
      drawRings(ctx, m);
      pts.forEach(function (p, i) { dot(ctx, m.X(p.x), m.Y(p.y), 5, CLS5[km.labels[i] % CLS5.length], true); });
      km.centers.forEach(function (c, i) { cross(ctx, m.X(c.x), m.Y(c.y), 6, CLS5[i % CLS5.length]); });
      var sizes = km.centers.map(function (_, i) {
        return pts.filter(function (p, j) { return km.labels[j] === i; }).length;
      });
      $('#k03').innerHTML =
        '<div><span>迭代轮数</span><b>' + km.round + '</b></div>' +
        '<div><span>簇内平方和 SSE</span><b>' + Math.round(km.sse * 100) / 100 + '</b></div>' +
        sizes.map(function (n, i) {
          return '<div><span style="color:' + CLS5[i % CLS5.length] + '">● 第 ' + (i + 1) + ' 簇</span><b>' + n + ' 点</b></div>';
        }).join('');
      $('#r03').innerHTML = converged ? '<span class="warm">簇心不再移动，聚类收敛。换一批菌或改 K 再试。</span>'
        : '迭代 = 先「分配到最近中心」，再「中心挪到均值处」，反复直到稳定。';
    }
    function step1() {
      var moved = km.update(pts);
      km.assign(pts);
      if (moved < 1e-9) { converged = true; stop(); }
      draw();
    }
    function stop() { running = false; stopTimer(); runningBtn('b03-run', false); }
    bindSeg('seg03k', '3', function (v) { k = parseInt(v, 10); stop(); seed(); draw(); });
    bind($('#b03-step'), 'click', step1);
    bind($('#b03-run'), 'click', function () {
      if (running) { stop(); return; }
      running = true; runningBtn('b03-run', true);
      viewTimer = setInterval(step1, 300);
    });
    bind($('#b03-reset'), 'click', function () { stop(); seed(); draw(); });
    seed(); draw();
  }
};

/* ================= SP-04 KNN ================= */
var sp04 = {
  html: function () {
    return pageHead('SP-04', 'KNN 最近邻', 'K-Nearest Neighbors：新孢子落进培养皿，数最近的 k 个邻居投票。') +
      '<div class="experiment">' + stage('cv04', '点击皿内任意位置放置新孢子；细线连向参与投票的 k 个邻居。') +
      '<div class="notebook nb"><div class="nb-title">邻居数 k</div>' +
      '<div class="pill-row" id="seg04k">' +
      [1, 3, 5, 7, 9].map(function (k2) { return '<button class="pill' + (k2 === 5 ? ' on' : '') + '" data-v="' + k2 + '" type="button">k=' + k2 + '</button>'; }).join('') +
      '</div><label class="field" style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink-soft)"><input type="checkbox" id="bg04" checked> 绘出整片领地（决策区域）</label>' +
      '<div class="btn-row"><button class="btn ghost" id="b04-reset" type="button">换一批菌</button></div>' +
      '<div class="nb-title">投票结果</div><div class="vote" id="vote04"></div>' +
      '<div class="readout" id="r04"></div></div></div>';
  },
  mount: function () {
    var cv = $('#cv04'), pts, k = 5, q = { x: 5, y: 5 }, result, bgOn = true;
    function seed() { pts = ML.clusters3(54, 909); }
    function draw() {
      sizeCanvas(cv);
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      var m = makeMap(cv, 0, 10, 0, 10, 30);
      drawRings(ctx, m);
      if (bgOn) {
        var N = 30, i, j;
        for (i = 0; i < N; i++) {
          for (j = 0; j < N; j++) {
            var wx = m.xmin + (m.xmax - m.xmin) * (i + 0.5) / N;
            var wy = m.ymin + (m.ymax - m.ymin) * (j + 0.5) / N;
            var px = m.X(wx), py = m.Y(wy);
            if (!inDish(m, px, py)) { continue; }
            var lab = ML.knnVote(pts, { x: wx, y: wy }, k).label;
            ctx.fillStyle = [
              'rgba(239,111,97,.13)', 'rgba(47,136,181,.13)', 'rgba(101,160,106,.13)'
            ][lab];
            var cw = m.r * 2 / N * 1.15;
            ctx.fillRect(px - cw / 2, py - cw / 2, cw + 0.6, cw + 0.6);
          }
        }
      }
      pts.forEach(function (p) { dot(ctx, m.X(p.x), m.Y(p.y), 5, [COL.coral, COL.blue, COL.green][p.label], true); });
      result = ML.knnVote(pts, q, k);
      /* 找最近 k 个点画线 */
      var ranked = pts.map(function (p, idx) {
        return { p: p, d: (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y) };
      }).sort(function (a, b) { return a.d - b.d; }).slice(0, k);
      ctx.save();
      ctx.strokeStyle = 'rgba(53,48,42,.4)';
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
      ranked.forEach(function (it) {
        ctx.beginPath(); ctx.moveTo(m.X(q.x), m.Y(q.y)); ctx.lineTo(m.X(it.p.x), m.Y(it.p.y)); ctx.stroke();
      });
      ctx.restore();
      dot(ctx, m.X(q.x), m.Y(q.y), 8, '#35302a', false);
      dot(ctx, m.X(q.x), m.Y(q.y), 4, '#fff', false);

      var html = '';
      for (var c = 0; c < 3; c++) {
        var v = result.tally[c] || 0;
        html += '<div class="v-row"><span class="v-lab">' + CLASS_CN3[c] + '</span>' +
          '<span class="v-track"><span class="v-fill" style="width:' + (v / k * 100) + '%;background:' +
          [COL.coral, COL.blue, COL.green][c] + '"></span></span><span class="v-val">' + v + ' / ' + k + '</span></div>';
      }
      $('#vote04').innerHTML = html;
      $('#r04').innerHTML = '新孢子被判给 <span class="warm">' + CLASS_CN3[result.label] + '</span>；' +
        'k 越大边界越平滑，但太大会把远处不相干的点也算进来。';
    }
    bindSeg('seg04k', '5', function (v) { k = parseInt(v, 10); draw(); });
    bind($('#bg04'), 'change', function (e) { bgOn = e.target.checked; draw(); });
    bind($('#b04-reset'), 'click', function () { seed(); draw(); });
    bindDish(cv, function (px, py) {
      var m = makeMap(cv, 0, 10, 0, 10, 30);
      q = {
        x: clamp((px - m.cx) / m.scale + 5, 0, 10),
        y: clamp(-(py - m.cy) / m.scale + 5, 0, 10)
      };
      draw();
    });
    seed(); draw();
  }
};

/* ================= SP-05 梯度下降 ================= */
var sp05 = {
  html: function () {
    return pageHead('SP-05', '梯度下山', '损失函数 L = x² + 3y² 是只碗；学习率决定步子大小。') +
      '<div class="experiment">' + stage('cv05', '三颗同起点的孢子，学习率分别 0.05 / 0.25 / 1.05，看谁先到谷底。') +
      '<div class="notebook nb"><div class="nb-title">实验操作</div>' +
      '<div class="field" style="font-size:13px;color:var(--ink-soft)">三颗孢子学习率：0.05 / 0.25 / 1.05，同起点 (2.2, −2.0)</div>' +
      '<div class="btn-row"><button class="btn coral" id="b05-step" type="button">走一步</button>' +
      '<button class="btn blue" id="b05-run" type="button">连续下山</button>' +
      '<button class="btn green" id="b05-fast" type="button">走 60 步</button>' +
      '<button class="btn ghost" id="b05-reset" type="button">放回坡顶</button></div>' +
      '<div class="nb-title">三颗孢子</div><div class="kv2" id="k05"></div>' +
      '<div class="readout" id="r05"></div></div></div>';
  },
  mount: function () {
    var cv = $('#cv05'), running;
    var spores = [];
    function seed() {
      spores = [
        { x: 2.2, y: -2.0, lr: 0.05, color: COL.coral, trail: [], dead: false, steps: 0 },
        { x: 2.2, y: -2.0, lr: 0.25, color: COL.blue, trail: [], dead: false, steps: 0 },
        { x: 2.2, y: -2.0, lr: 1.05, color: COL.purple, trail: [], dead: false, steps: 0 }
      ];
    }
    function draw() {
      sizeCanvas(cv);
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      var m = makeMap(cv, -3, 3, -3, 3, 26);
      var N = 46, i, j;
      for (i = 0; i < N; i++) {
        for (j = 0; j < N; j++) {
          var wx = -3 + 6 * (i + 0.5) / N, wy = -3 + 6 * (j + 0.5) / N;
          var px = m.X(wx), py = m.Y(wy);
          if (!inDish(m, px, py)) { continue; }
          var v = ML.lossXY(wx, wy);
          var a = clamp(v / 36, 0, 1);
          ctx.fillStyle = 'rgba(101,160,106,' + (0.05 + a * 0.16) + ')';
          var cw = m.r * 2 / N * 1.2;
          ctx.fillRect(px - cw / 2, py - cw / 2, cw + 0.6, cw + 0.6);
        }
      }
      drawRings(ctx, m);
      spores.forEach(function (s) {
        if (s.trail.length > 1) {
          ctx.save();
          ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.moveTo(m.X(s.trail[0].x), m.Y(s.trail[0].y));
          for (i = 1; i < s.trail.length; i++) { ctx.lineTo(m.X(s.trail[i].x), m.Y(s.trail[i].y)); }
          ctx.stroke(); ctx.restore();
        }
        dot(ctx, m.X(s.x), m.Y(s.y), 6, s.dead ? COL.gray : s.color, true);
      });
      dot(ctx, m.cx, m.cy, 4, '#35302a', false);
      var html = '';
      spores.forEach(function (s) {
        var status = s.dead ? '已发散' : (ML.lossXY(s.x, s.y) < 0.002 ? '已到谷底' : '下降中');
        html += '<div><span style="color:' + s.color + '">● lr=' + s.lr + '</span><b>' + status + '</b></div>' +
          '<div><span>步数 / 损失</span><b>' + s.steps + ' · ' + r2(ML.lossXY(s.x, s.y)) + '</b></div>';
      });
      $('#k05').innerHTML = html;
      $('#r05').innerHTML = '紫色孢子学习率 1.05 会在碗壁上越弹越远（发散）；蓝色 0.25 很快收敛；珊瑚色 0.05 走得很稳但慢。';
    }
    function step1() {
      spores.forEach(function (s) {
        if (s.dead || ML.lossXY(s.x, s.y) < 1e-7) { return; }
        ML.descend(s, s.lr);
        s.trail.push({ x: s.x, y: s.y });
        if (Math.abs(s.x) > 6 || Math.abs(s.y) > 6) { s.dead = true; }
      });
      draw();
    }
    function stop() { running = false; stopTimer(); runningBtn('b05-run', false); }
    bind($('#b05-step'), 'click', step1);
    bind($('#b05-run'), 'click', function () {
      if (running) { stop(); return; }
      running = true; runningBtn('b05-run', true);
      viewTimer = setInterval(step1, 160);
    });
    bind($('#b05-fast'), 'click', function () { for (var i = 0; i < 60; i++) { step1(); } });
    bind($('#b05-reset'), 'click', function () { stop(); seed(); draw(); });
    seed(); draw();
  }
};

/* ================= SP-06 激活函数 ================= */
var sp06 = {
  html: function () {
    return pageHead('SP-06', '激活液图谱', '非线性激活让神经网络能弯出曲线；虚线是它的导数。') +
      '<div class="experiment">' + stage('cv06', '横轴 x 从 −5 到 5，纵轴 −2.2 到 2.2。') +
      '<div class="notebook nb"><div class="nb-title">选择激活液</div>' +
      '<div class="pill-row" id="seg06">' +
      Object.keys(ML.ACT).map(function (key, i) {
        return '<button class="pill' + (i === 0 ? ' on' : '') + '" data-v="' + key + '" type="button">' + ML.ACT[key].name + '</button>';
      }).join('') + '</div>' +
      '<label class="field" style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink-soft)"><input type="checkbox" id="d06" checked> 叠加导函数 f′(x)</label>' +
      '<div class="nb-title">关键数值</div><table class="data-tbl" id="t06"></table>' +
      '<div class="readout" id="r06"></div></div></div>';
  },
  mount: function () {
    var cv = $('#cv06'), which = 'sigmoid', showD = true;
    function draw() {
      sizeCanvas(cv);
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      var m = makeMap(cv, -5, 5, -2.2, 2.2, 28);
      drawRings(ctx, m);
      /* 坐标轴 */
      ctx.save();
      ctx.strokeStyle = 'rgba(53,48,42,.22)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(m.X(-5), m.Y(0)); ctx.lineTo(m.X(5), m.Y(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m.X(0), m.Y(-2.2)); ctx.lineTo(m.X(0), m.Y(2.2)); ctx.stroke();
      ctx.restore();
      var fn = ML.ACT[which].fn;
      function curve(f, color, width) {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        var started = false;
        for (var i = 0; i <= 200; i++) {
          var x = -5 + 10 * i / 200, y = f(x);
          y = clamp(y, -3, 3);
          var px = m.X(x), py = m.Y(y);
          if (!started) { ctx.moveTo(px, py); started = true; } else { ctx.lineTo(px, py); }
        }
        ctx.stroke(); ctx.restore();
      }
      curve(fn, COL.purple, 3.2);
      if (showD) { curve(function (x) { return ML.numericDeriv(fn, x); }, COL.coral, 2.2); }
      var xs = [-2, -1, 0, 1, 2];
      var h = '<tr><th>x</th>' + xs.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr>' +
        '<tr><td>f(x)</td>' + xs.map(function (x) { return '<td>' + r2(clamp(fn(x), -99, 99)) + '</td>'; }).join('') + '</tr>' +
        '<tr><td>f′(x)</td>' + xs.map(function (x) { return '<td>' + r2(ML.numericDeriv(fn, x)) + '</td>'; }).join('') + '</tr>';
      $('#t06').innerHTML = h;
      var notes = {
        sigmoid: 'Sigmoid：把任意数压进 (0,1)，适合表示概率；两端梯度接近 0，深层网络易梯度消失。',
        tanh: 'Tanh：压进 (−1,1)，零中心，同样有两端饱和问题。',
        relu: 'ReLU：正区间原样通过、负区间归零，计算极快，是现代网络最常用的激活液。',
        leaky: 'Leaky ReLU：负区间保留一条 0.1 的细缝，缓解神经元「死亡」。',
        gelu: 'GELU：Transformer/GPT 系列的常客，平滑版 ReLU，负区间不完全清零。',
        softplus: 'Softplus：ReLU 的光滑版，处处可导，输出恒正。',
        elu: 'ELU：负区间平滑趋向 −1，输出均值更接近零。'
      };
      $('#r06').innerHTML = notes[which] + (showD ? ' 虚线为导数：训练时它决定梯度怎么往回传。' : '');
    }
    bindSeg('seg06', 'sigmoid', function (v) { which = v; draw(); });
    bind($('#d06'), 'change', function (e) { showD = e.target.checked; draw(); });
    draw();
  }
};

/* ================= SP-07 朴素贝叶斯 ================= */
var SPAM_DOCS = [
  '恭喜您中奖了，点击链接立即领取百万奖金', '免费领取优惠券，限时特价马上点击',
  '您的账户存在风险，请立即验证密码解封', '代开发票，正规发票低价出售加微信',
  '好消息，您被选为幸运用户，奖金待领取', '贷款秒批，无需抵押，超低利息点击办理',
  '游戏充值低价代充，加群享额外折扣', '您的快递丢失，点链接办理三倍赔偿',
  '刷单兼职，日结工资，足不出户轻松赚钱', '紧急通知，医保社保已停用，请点击链接解封',
  '重金求子，成功重谢，保密交易', '线上赌场上线啦，充值送彩金',
  '无抵押贷款，黑户可贷，当天下款', '您有一笔退款未领取，限时24小时点击确认',
  '股票内幕消息，加老师微信带你稳赚不赔', '低价出售香烟名酒，厂家直销货到付款',
  '你的手机号已被抽中，奖品为最新款手机', '网络兼职刷信誉，每单佣金50元当天结算',
  '点击链接免费领取比特币，数量有限', '银行卡积分即将清零，请尽快兑换现金',
  'win a free prize now click here to claim', '特价房产急售，不限购不要名额马上抢购'
];
var HAM_DOCS = [
  '明天下午三点开会，记得带项目资料', '妈，周末回家吃饭吗，我炖了汤',
  '你的快递放在小区门卫处了，记得取', '报告我看过了，第三部分的数据再核对一下',
  '晚上一起打球吗，老地方七点', '老师您好，作业已经发到您的邮箱了',
  '会议改到周五上午十点，在二号会议室', '下雨了，记得收阳台的衣服',
  '生日快乐，给你准备了小礼物', '孩子今天在学校表现很好，请家长放心',
  '地铁八号线故障，记得提前出门', '你借我的那本书下周还你可以吗',
  '晚饭少做点，我今晚加班晚点回', '体检报告出来了，各项指标都正常',
  '火车票已经取好了，在我这里', '周末一起去图书馆复习吗',
  '物业费通知已贴在单元门口', '你订的花已经送到前台了',
  '文章改好了，你再看看有没有错别字', '明天降温，多穿件衣服',
  'the meeting is moved to room 302', '奶奶问你国庆回不回老家'
];
var sp07 = {
  html: function () {
    return pageHead('SP-07', '贝叶斯滤信器', '朴素贝叶斯 + 中文双字词袋：用一小批语料学会分辨垃圾消息。') +
      '<div class="experiment">' +
      '<div class="notebook nb" style="max-width:560px"><div class="nb-title">待检消息</div>' +
      '<textarea id="txt07">恭喜您中奖了，点击链接领取奖金</textarea>' +
      '<div class="nb-title" style="margin-top:16px">垃圾概率</div>' +
      '<div class="gauge"><div class="g-track"><span class="g-mark" id="mark07" style="left:50%"></span></div>' +
      '<div class="g-labs"><span>正常 0</span><span id="pct07">50%</span><span>垃圾 100</span></div></div>' +
      '<div class="readout" id="r07"></div>' +
      '<div class="nb-title">关键词证据（越靠前影响越大）</div><div class="tok-list" id="toks07"></div>' +
      '<p class="stage-hint" style="text-align:left;margin-top:12px">训练语料：垃圾 22 条 / 正常 22 条，全部内置；分类只在本地进行。</p></div>' +
      '<div class="stage" style="align-self:start"><div class="dish-wrap" style="aspect-ratio:1"><div class="dish"><canvas id="cv07"></canvas></div><div class="dish-glass"></div></div>' +
      '<div class="stage-hint">培养皿里的染色面积即垃圾概率。</div></div></div>';
  },
  mount: function () {
    var model = new ML.NaiveBayes(SPAM_DOCS, HAM_DOCS);
    var cv = $('#cv07');
    function draw(p) {
      sizeCanvas(cv);
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      var cx = cv.width / 2, cy = cv.height / 2, r = Math.min(cv.width, cv.height) / 2 - 22;
      /* 从底部起按概率填充珊瑚色液滴 */
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      var h = r * 2 * p;
      ctx.fillStyle = 'rgba(239,111,97,.55)';
      ctx.beginPath();
      var top = cy + r - h, phase = Date.now() / 600;
      ctx.moveTo(cx - r, top);
      for (var x = -r; x <= r; x += 6) {
        ctx.lineTo(cx + x, top + Math.sin(x / 22 + phase) * 2.4);
      }
      ctx.lineTo(cx + r, cy + r); ctx.lineTo(cx - r, cy + r); ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = '#35302a';
      ctx.font = '700 ' + Math.round(r * 0.42) + 'px "PingFang SC",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(p * 100) + '%', cx, cy + 2);
      ctx.restore();
    }
    function update() {
      var res = model.predict($('#txt07').value || '');
      $('#pct07').textContent = Math.round(res.pSpam * 100) + '%';
      $('#mark07').style.left = (res.pSpam * 100) + '%';
      var verdict = res.tokens.length === 0 ? '还没有有效词汇，先写一句话吧。'
        : (res.pSpam >= 0.7 ? '判定：垃圾消息（概率 ' + Math.round(res.pSpam * 100) + '%）'
          : res.pSpam <= 0.3 ? '判定：正常消息（垃圾概率 ' + Math.round(res.pSpam * 100) + '%）'
          : '判定：拿不准（垃圾概率 ' + Math.round(res.pSpam * 100) + '%）');
      $('#r07').innerHTML = verdict;
      $('#toks07').innerHTML = res.contrib.map(function (c) {
        return '<span class="tok ' + (c.spam ? 'spam' : 'ham') + '">' + esc(c.tok) + ' ' + (c.d > 0 ? '↑垃圾' : '↑正常') + '</span>';
      }).join('') || '<span class="stage-hint">无</span>';
      draw(res.pSpam);
    }
    bind($('#txt07'), 'input', update);
    update();
    viewTimer = setInterval(function () {
      if (document.body.contains(cv)) {
        var res = model.predict($('#txt07').value || '');
        draw(res.pSpam);
      }
    }, 120);
  }
};

/* ================= SP-08 MLP ================= */
var sp08 = {
  html: function () {
    return pageHead('SP-08', '迷你神经网络', '2 → 5 → 1 的小网络，用反向传播学会「里圈是一类、外圈是一类」。') +
      '<div class="experiment">' + stage('cv08', '内圈与外圈在一条直线上不可分——必须靠非线性。背景色是网络输出。') +
      '<div class="notebook nb"><div class="nb-title">学习率</div>' +
      '<div class="pill-row" id="seg08lr"><button class="pill" data-v="0.03" type="button">0.03</button><button class="pill" data-v="0.1" type="button">0.1</button><button class="pill on" data-v="0.3" type="button">0.3</button></div>' +
      '<div class="btn-row"><button class="btn coral" id="b08-step" type="button">训练 10 轮</button>' +
      '<button class="btn blue" id="b08-run" type="button">连续训练</button>' +
      '<button class="btn ghost" id="b08-reset" type="button">重新接种</button></div>' +
      '<div class="nb-title">记录本</div><div class="kv2" id="k08"></div>' +
      '<canvas class="spark" id="spark08" width="260" height="72"></canvas>' +
      '<svg class="net-mini" id="net08" viewBox="0 0 150 92" width="100%" height="92" aria-label="突触权重"></svg>' +
      '<div class="readout" id="r08"></div></div></div>';
  },
  mount: function () {
    var cv = $('#cv08'), spark = $('#spark08');
    var pts, net, running, lr = 0.3, epochs = 0, lossHist = [], lastLoss = 0, lastAcc = 0;
    function seed() {
      pts = ML.circles(80, 314);
      net = new ML.MLP([2, 5, 1]);
      epochs = 0; lossHist = []; lastLoss = 0; lastAcc = 0;
    }
    function draw() {
      sizeCanvas(cv);
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      var m = makeMap(cv, -5, 5, -5, 5, 28);
      drawRings(ctx, m);
      var N = 34, i, j;
      for (i = 0; i < N; i++) {
        for (j = 0; j < N; j++) {
          var wx = -5 + 10 * (i + 0.5) / N, wy = -5 + 10 * (j + 0.5) / N;
          var px = m.X(wx), py = m.Y(wy);
          if (!inDish(m, px, py)) { continue; }
          var out = net.score([wx, wy]);
          ctx.fillStyle = out > 0.5 ? 'rgba(239,111,97,' + (0.06 + (out - 0.5) * 0.5) + ')'
            : 'rgba(47,136,181,' + (0.06 + (0.5 - out) * 0.5) + ')';
          var cw = m.r * 2 / N * 1.2;
          ctx.fillRect(px - cw / 2, py - cw / 2, cw + 0.6, cw + 0.6);
        }
      }
      pts.forEach(function (p) { dot(ctx, m.X(p.x), m.Y(p.y), 4.5, p.label === 1 ? COL.coral : COL.blue, true); });

      $('#k08').innerHTML =
        '<div><span>训练轮数</span><b>' + epochs + '</b></div>' +
        '<div><span>损失 loss</span><b>' + r2(lastLoss) + '</b></div>' +
        '<div><span>准确率</span><b>' + (epochs ? Math.round(lastAcc * 100) + '%' : '—') + '</b></div>' +
        '<div><span>结构</span><b>2-5-1</b></div>';
      drawSpark();
      drawNet();
      $('#r08').innerHTML = epochs === 0 ? '初始网络是随机权重，背景一片混沌。点「训练 10 轮」开始反向传播。'
        : (lastAcc >= 0.95 ? '<span class="warm">准确率 ≥95%：网络已经学会用圆环而不是直线划界。</span>'
          : '观察损失曲线下降、背景逐渐分成内外两色。');
    }
    function drawSpark() {
      var ctx = spark.getContext('2d');
      ctx.clearRect(0, 0, spark.width, spark.height);
      if (lossHist.length < 2) { return; }
      var max = Math.max.apply(null, lossHist), min = Math.min.apply(null, lossHist);
      if (max - min < 1e-6) { max = min + 1; }
      ctx.save();
      ctx.strokeStyle = COL.honey; ctx.lineWidth = 2; ctx.beginPath();
      lossHist.forEach(function (v, i) {
        var x = 6 + i / Math.max(1, lossHist.length - 1) * (spark.width - 12);
        var y = spark.height - 8 - (v - min) / (max - min) * (spark.height - 16);
        if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      });
      ctx.stroke(); ctx.restore();
    }
    function drawNet() {
      var pos = [[10, 26], [10, 66], [55, 10], [55, 30], [55, 50], [55, 70], [140, 40]];
      var h = '';
      net.W.forEach(function (mat, li) {
        var fromCols = mat[0].length, toRows = mat.length;
        mat.forEach(function (row, j) {
          row.forEach(function (wgt, i) {
            var a = clamp(Math.abs(wgt) * 1.4, 0.08, 1);
            var from = li === 0 ? pos[i] : pos[2 + i];
            var to = li === 0 ? pos[2 + j] : pos[6];
            h += '<line x1="' + from[0] + '" y1="' + from[1] + '" x2="' + to[0] + '" y2="' + to[1] +
              '" stroke="' + (wgt >= 0 ? COL.coral : COL.blue) + '" stroke-opacity="' + a.toFixed(2) + '" stroke-width="1.3"/>';
          });
        });
      });
      pos.forEach(function (p, i) {
        h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="' + (i < 2 ? COL.coral : (i < 6 ? COL.green : COL.blue)) + '"/>';
      });
      $('#net08').innerHTML = h;
    }
    function train(n) {
      var X = pts.map(function (p) { return [p.x, p.y]; });
      var y = pts.map(function (p) { return p.label; });
      for (var i = 0; i < n; i++) {
        var s = net.trainStep(X, y, lr);
        lastLoss = s.loss; lastAcc = s.acc;
        epochs++;
        if (i % 2 === 0) { lossHist.push(lastLoss); }
        if (lossHist.length > 120) { lossHist.shift(); }
      }
      draw();
      if (lastAcc >= 0.97 && lossHist.length > 4) { stop(); }
    }
    function stop() { running = false; stopTimer(); runningBtn('b08-run', false); }
    bindSeg('seg08lr', '0.3', function (v) { lr = parseFloat(v); });
    bind($('#b08-step'), 'click', function () { train(10); });
    bind($('#b08-run'), 'click', function () {
      if (running) { stop(); return; }
      running = true; runningBtn('b08-run', true);
      viewTimer = setInterval(function () { train(5); }, 60);
    });
    bind($('#b08-reset'), 'click', function () { stop(); seed(); draw(); });
    seed(); draw();
  }
};

/* ---------------- 路由 ---------------- */
var VIEWS = {
  home: homeView, sp01: sp01, sp02: sp02, sp03: sp03, sp04: sp04,
  sp05: sp05, sp06: sp06, sp07: sp07, sp08: sp08
};
var app = document.getElementById('app');
function render() {
  stopTimer();
  var key = (location.hash || '').replace(/^#\/?/, '');
  if (!VIEWS[key]) { key = 'home'; }
  app.innerHTML = VIEWS[key].html();
  VIEWS[key].mount();
  $all('#chips a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-key') === key); });
  if (window.scrollTo) { window.scrollTo(0, 0); }
}
window.addEventListener('hashchange', render);

var burger = document.getElementById('burger');
var chips = document.getElementById('chips');
if (burger) {
  burger.addEventListener('click', function () { chips.classList.toggle('open'); });
  chips.addEventListener('click', function (e) { if (e.target.tagName === 'A') { chips.classList.remove('open'); } });
}
render();

})();
