/* ============================================================
   SYNAPSE GARDEN —— ml.js 纯算法标本库（无 DOM 依赖，ES5）
   ============================================================ */
(function (root) {
'use strict';

var ML = {};

/* ---------------- 随机 ---------------- */
function rng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
ML.rng = rng;

function gauss(r) {
  var u = 0, v = 0;
  while (u === 0) { u = r(); }
  while (v === 0) { v = r(); }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ---------------- 数据集 ---------------- */
/* 两个高斯团：label ∈ {-1,+1} */
ML.blobs = function (n, seed) {
  var r = rng(seed || 7), pts = [];
  for (var i = 0; i < n; i++) {
    var pos = i % 2 === 0;
    var cx = pos ? 6.2 : 3.4, cy = pos ? 6.4 : 3.2;
    pts.push({ x: cx + gauss(r) * 0.95, y: cy + gauss(r) * 0.95, label: pos ? 1 : -1 });
  }
  return pts;
};
/* 同心圆：内圈 label=0，外环 label=1 */
ML.circles = function (n, seed) {
  var r = rng(seed || 11), pts = [];
  for (var i = 0; i < n; i++) {
    var inner = i % 2 === 0;
    var rad = inner ? (1.3 + r() * 0.9) : (3.4 + r() * 1.1);
    var ang = r() * Math.PI * 2;
    pts.push({ x: Math.cos(ang) * rad + gauss(r) * 0.12, y: Math.sin(ang) * rad + gauss(r) * 0.12, label: inner ? 0 : 1 });
  }
  return pts;
};
/* 三个团：label ∈ {0,1,2} */
ML.clusters3 = function (n, seed) {
  var r = rng(seed || 23), pts = [], centers = [
    { x: 3.0, y: 6.6, s: 0.8 }, { x: 6.6, y: 6.4, s: 0.85 }, { x: 4.9, y: 2.9, s: 0.9 }
  ];
  for (var i = 0; i < n; i++) {
    var c = centers[i % 3];
    pts.push({ x: c.x + gauss(r) * c.s, y: c.y + gauss(r) * c.s, label: i % 3 });
  }
  return pts;
};

/* ---------------- 感知机 ---------------- */
ML.Perceptron = function (dim) {
  this.w = [];
  for (var i = 0; i < dim; i++) { this.w.push(0); }
  this.b = 0;
  this.steps = 0;
};
ML.Perceptron.prototype.score = function (p) {
  var s = this.b;
  for (var i = 0; i < this.w.length; i++) { s += this.w[i] * p[i]; }
  return s;
};
ML.Perceptron.prototype.predict = function (p) { return this.score(p) >= 0 ? 1 : -1; };
/* 单轮遍历全部样本，返回误分类数 */
ML.Perceptron.prototype.epoch = function (X, y, lr) {
  var miss = 0;
  for (var i = 0; i < X.length; i++) {
    if (y[i] * this.score(X[i]) <= 0) {
      miss++;
      for (var j = 0; j < this.w.length; j++) { this.w[j] += lr * y[i] * X[i][j]; }
      this.b += lr * y[i];
    }
  }
  this.steps++;
  return miss;
};

/* ---------------- 逻辑回归 ---------------- */
ML.sigmoid = function (z) {
  if (z > 40) { return 1; }
  if (z < -40) { return 0; }
  return 1 / (1 + Math.exp(-z));
};
ML.Logistic = function (dim) {
  this.w = [];
  for (var i = 0; i < dim; i++) { this.w.push(0); }
  this.b = 0;
};
ML.Logistic.prototype.score = function (p) {
  var s = this.b;
  for (var i = 0; i < this.w.length; i++) { s += this.w[i] * p[i]; }
  return s;
};
ML.Logistic.prototype.prob = function (p) { return ML.sigmoid(this.score(p)); };
/* 全批量梯度下降一步，返回平均 BCE */
ML.Logistic.prototype.step = function (X, y, lr) {
  var gw = [], i, j;
  for (i = 0; i < this.w.length; i++) { gw.push(0); }
  var gb = 0, loss = 0;
  for (i = 0; i < X.length; i++) {
    var pr = this.prob(X[i]);
    var e = pr - y[i];
    for (j = 0; j < gw.length; j++) { gw[j] += e * X[i][j]; }
    gb += e;
    var pc = Math.min(0.9999999, Math.max(1e-8, pr));
    loss += -(y[i] * Math.log(pc) + (1 - y[i]) * Math.log(1 - pc));
  }
  for (j = 0; j < gw.length; j++) { this.w[j] -= lr * gw[j] / X.length; }
  this.b -= lr * gb / X.length;
  return loss / X.length;
};

/* ---------------- K-Means ---------------- */
ML.KMeans = function (pts, k, rand) {
  var r = rand || rng(1);
  var idxs = [];
  while (idxs.length < k) {
    var v = Math.floor(r() * pts.length);
    if (idxs.indexOf(v) < 0) { idxs.push(v); }
  }
  this.centers = idxs.map(function (i) { return { x: pts[i].x, y: pts[i].y }; });
  this.labels = [];
  this.sse = 0;
  this.round = 0;
};
function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
ML.KMeans.prototype.assign = function (pts) {
  var sse = 0;
  for (var i = 0; i < pts.length; i++) {
    var best = 0, bd = dist2(pts[i], this.centers[0]);
    for (var c = 1; c < this.centers.length; c++) {
      var d = dist2(pts[i], this.centers[c]);
      if (d < bd) { bd = d; best = c; }
    }
    this.labels[i] = best;
    sse += bd;
  }
  this.sse = sse;
};
/* 移动质心，返回总位移 */
ML.KMeans.prototype.update = function (pts) {
  var moved = 0;
  for (var c = 0; c < this.centers.length; c++) {
    var sx = 0, sy = 0, n = 0;
    for (var i = 0; i < pts.length; i++) {
      if (this.labels[i] === c) { sx += pts[i].x; sy += pts[i].y; n++; }
    }
    if (n > 0) {
      var nx = sx / n, ny = sy / n;
      moved += Math.abs(nx - this.centers[c].x) + Math.abs(ny - this.centers[c].y);
      this.centers[c] = { x: nx, y: ny };
    }
  }
  this.round++;
  return moved;
};

/* ---------------- KNN ---------------- */
ML.knnVote = function (pts, q, k) {
  var arr = pts.map(function (p) {
    return { d: dist2(p, q), label: p.label };
  }).sort(function (a, b) { return a.d - b.d; }).slice(0, k);
  var tally = {};
  for (var i = 0; i < arr.length; i++) { tally[arr[i].label] = (tally[arr[i].label] || 0) + 1; }
  var best = arr[0].label, bn = -1;
  Object.keys(tally).forEach(function (key) {
    if (tally[key] > bn) { bn = tally[key]; best = parseInt(key, 10); }
  });
  return { label: best, tally: tally, neighbors: arr.map(function (a) { return Math.sqrt(a.d); }) };
};

/* ---------------- 梯度下降 ---------------- */
ML.lossXY = function (x, y) { return x * x + 3 * y * y; };
ML.gradXY = function (x, y) { return [2 * x, 6 * y]; };
ML.descend = function (p, lr) {
  var g = ML.gradXY(p.x, p.y);
  p.x -= lr * g[0];
  p.y -= lr * g[1];
  p.steps = (p.steps || 0) + 1;
};

/* ---------------- 激活函数 ---------------- */
ML.ACT = {
  sigmoid: { name: 'Sigmoid', fn: function (x) { return ML.sigmoid(x); } },
  tanh: { name: 'Tanh', fn: function (x) { return Math.tanh(x); } },
  relu: { name: 'ReLU', fn: function (x) { return Math.max(0, x); } },
  leaky: { name: 'Leaky ReLU', fn: function (x) { return x > 0 ? x : 0.1 * x; } },
  gelu: {
    name: 'GELU',
    fn: function (x) {
      var k = Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x);
      return 0.5 * x * (1 + Math.tanh(k));
    }
  },
  softplus: { name: 'Softplus', fn: function (x) { return Math.log(1 + Math.exp(-Math.abs(x))) + Math.max(x, 0); } },
  elu: { name: 'ELU', fn: function (x) { return x > 0 ? x : Math.exp(x) - 1; } }
};
ML.numericDeriv = function (fn, x) {
  var e = 1e-6;
  return (fn(x + e) - fn(x - e)) / (2 * e);
};

/* ---------------- 朴素贝叶斯（字符 bigram 词袋） ---------------- */
ML.tokenize = function (text) {
  var s = String(text).toLowerCase();
  var tokens = [];
  var words = s.match(/[a-z0-9]{2,}/g);
  if (words) { tokens = tokens.concat(words); }
  var han = s.match(/[\u4e00-\u9fa5]+/g);
  if (han) {
    for (var h = 0; h < han.length; h++) {
      var seg = han[h];
      for (var i = 0; i < seg.length - 1; i++) { tokens.push(seg.substr(i, 2)); }
    }
  }
  return tokens;
};
ML.NaiveBayes = function (spamDocs, hamDocs) {
  var counts = { spam: {}, ham: {} }, totals = { spam: 0, ham: 0 };
  var docs = [['spam', spamDocs], ['ham', hamDocs]];
  docs.forEach(function (pair) {
    var cls = pair[0], list = pair[1];
    list.forEach(function (text) {
      ML.tokenize(text).forEach(function (t) { counts[cls][t] = (counts[cls][t] || 0) + 1; totals[cls]++; });
    });
  });
  this.spamN = spamDocs.length;
  this.hamN = hamDocs.length;
  this.counts = counts;
  this.totals = totals;
  var vocab = {};
  ['spam', 'ham'].forEach(function (c) { Object.keys(counts[c]).forEach(function (t) { vocab[t] = 1; }); });
  this.V = Object.keys(vocab).length;
};
ML.NaiveBayes.prototype.predict = function (text) {
  var tokens = ML.tokenize(text);
  var logS = Math.log(this.spamN / (this.spamN + this.hamN));
  var logH = Math.log(this.hamN / (this.spamN + this.hamN));
  var seen = {}, contrib = [];
  tokens.forEach(function (t) {
    if (seen[t]) { return; }
    seen[t] = 1;
    var ps = (this.counts.spam[t] || 0) + 1;
    var ph = (this.counts.ham[t] || 0) + 1;
    var ls = Math.log(ps / (this.totals.spam + this.V));
    var lh = Math.log(ph / (this.totals.ham + this.V));
    logS += ls; logH += lh;
    contrib.push({ tok: t, d: ls - lh, spam: ps > ph });
  }, this);
  var pSpam = 1 / (1 + Math.exp(logH - logS));
  contrib.sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
  return { pSpam: pSpam, tokens: tokens, contrib: contrib.slice(0, 10) };
};

/* ---------------- 迷你多层感知机 2→H→1（sigmoid + 全批量反向传播） ---------------- */
ML.MLP = function (layers) {
  var r = rng(20260919);
  this.W = []; this.B = [];
  for (var l = 0; l < layers.length - 1; l++) {
    var wm = [], bv = [];
    for (var j = 0; j < layers[l + 1]; j++) {
      var row = [];
      for (var i = 0; i < layers[l]; i++) { row.push((r() * 2 - 1) * 0.8); }
      wm.push(row);
      bv.push(0);
    }
    this.W.push(wm); this.B.push(bv);
  }
};
ML.MLP.prototype.forward = function (x) {
  var acts = [x.slice()];
  var cur = x.slice();
  for (var l = 0; l < this.W.length; l++) {
    var nxt = [];
    for (var j = 0; j < this.W[l].length; j++) {
      var z = this.B[l][j];
      for (var i = 0; i < cur.length; i++) { z += this.W[l][j][i] * cur[i]; }
      nxt.push(ML.sigmoid(z));
    }
    acts.push(nxt);
    cur = nxt;
  }
  return acts;
};
ML.MLP.prototype.score = function (x) { return this.forward(x)[this.W.length][0]; };
/* 全批量 BCE 一步，返回 {loss, acc} */
ML.MLP.prototype.trainStep = function (X, y, lr) {
  var gW = this.W.map(function (m) { return m.map(function (row) { return row.map(function () { return 0; }); }); });
  var gB = this.B.map(function (v) { return v.map(function () { return 0; }); });
  var loss = 0, correct = 0;
  for (var s = 0; s < X.length; s++) {
    var acts = this.forward(X[s]);
    var deltas = acts.map(function (a) { return a.slice(); });
    var out = acts[acts.length - 1][0];
    deltas[deltas.length - 1] = [out - y[s]];
    for (var l = this.W.length - 1; l >= 1; l--) {
      var d = [];
      for (var j = 0; j < acts[l].length; j++) {
        var a = acts[l][j];
        var sum = 0;
        for (var k2 = 0; k2 < this.W[l].length; k2++) { sum += deltas[l + 1][k2] * this.W[l][k2][j]; }
        d.push(a * (1 - a) * sum);
      }
      deltas[l] = d;
    }
    for (var L = 0; L < this.W.length; L++) {
      for (var jj = 0; jj < this.W[L].length; jj++) {
        for (var ii = 0; ii < acts[L].length; ii++) {
          gW[L][jj][ii] += deltas[L + 1][jj] * acts[L][ii];
        }
        gB[L][jj] += deltas[L + 1][jj];
      }
    }
    var pc = Math.min(0.9999999, Math.max(1e-8, out));
    loss += -(y[s] * Math.log(pc) + (1 - y[s]) * Math.log(1 - pc));
    if ((out >= 0.5 ? 1 : 0) === y[s]) { correct++; }
  }
  for (var u = 0; u < this.W.length; u++) {
    for (var a = 0; a < this.W[u].length; a++) {
      for (var b = 0; b < this.W[u][a].length; b++) { this.W[u][a][b] -= lr * gW[u][a][b] / X.length; }
      this.B[u][a] -= lr * gB[u][a] / X.length;
    }
  }
  return { loss: loss / X.length, acc: correct / X.length };
};

root.ML = ML;
})(typeof window !== 'undefined' ? window : this);
