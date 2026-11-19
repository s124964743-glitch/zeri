(function () {
  'use strict';
  var Z = window.Zeri, L = Z.L;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var KEY = 'zeri.v1';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr(add) { var d = new Date(); d.setDate(d.getDate() + (add || 0)); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseD(s) { var a = (s || '').split('-'); return a.length === 3 ? { y: +a[0], m: +a[1], d: +a[2] } : null; }
  var uid = 1;

  var DEF_HOURS = { ta: [4, 5, 6, 7, 8], pai: [3, 4, 5, 6, 7, 8] };
  var state = {
    tab: 'data', task: 'ta', strict: 'std',
    persons: [], seat: { ta: { zuo: null }, pai: { zuo: null } },
    from: todayStr(0), to: todayStr(90), hours: { ta: DEF_HOURS.ta.slice(), pai: DEF_HOURS.pai.slice() },
    sort: 'date', showBad: false, res: null, resMeta: null
  };
  function save() { try { var s = Object.assign({}, state); delete s.res; delete s.resMeta; localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s) { Object.keys(s).forEach(function (k) { state[k] = s[k]; }); state.res = null; state.tab = 'data'; }
    } catch (e) {}
    ['ta', 'pai'].forEach(function (t) { var z = state.seat[t] && state.seat[t].zuo; if (z != null) state.seat[t].zuo = (Math.round(z / 3) * 3) % 24; if (t === 'pai' && state.seat[t].zuo % 6 !== 0) state.seat[t].zuo = null; });
    state.persons.forEach(function (p) {
      uid = Math.max(uid, (p.id || 0) + 1);
      if (!p.era) {
        p.era = 'ad';
        var a = parseD(p.date) || {}, b = parseD(p.death) || {};
        p.y = a.y || ''; p.m = a.m || ''; p.d = a.d || ''; p.dy = b.y || ''; p.dm = b.m || ''; p.dd = b.d || '';
      }
    });
    if (!state.persons.some(function (p) { return p.role === 'dead'; })) state.persons.unshift(newPerson('dead'));
    if (state.from < todayStr(0)) { state.from = todayStr(0); state.to = todayStr(90); }
  }
  function newPerson(role) {
    return { id: uid++, role: role, label: '', cal: 'solar', era: 'roc', y: '', m: '', d: '', ly: '', lm: '', ld: '', leap: false, hour: '', dy: '', dm: '', dd: '', use: true };
  }

  // ---------- 個人資料 ----------
  function toAD(p, y) { y = +y; return p.era === 'roc' ? y + 1911 : y; }
  function specOf(p) {
    if (p.cal === 'lunar') { if (!p.ly || !p.lm || !p.ld) return null; return { cal: 'lunar', y: toAD(p, p.ly), m: +p.lm, d: +p.ld, leap: !!p.leap, hour: p.hour }; }
    if (!p.y || !p.m || !p.d) return null;
    return { cal: 'solar', y: toAD(p, p.y), m: +p.m, d: +p.d, hour: p.hour };
  }
  function profOf(p) {
    var sp = specOf(p); if (!sp) return null;
    var ref = null;
    if (p.role === 'dead' && p.dy && p.dm && p.dd) { try { var dy = toAD(p, p.dy); var rs = L.Solar.fromYmd(dy, +p.dm, +p.dd); if (rs.getYear() === dy && rs.getMonth() === +p.dm && rs.getDay() === +p.dd) ref = rs; } catch (e) {} }
    try { var r = Z.profile(sp, ref); r.hasDeath = !!ref; return r; } catch (e) { return { error: '日期超出支援範圍（1901–2099）' }; }
  }
  function infoHtml(p) {
    var r = profOf(p);
    if (!r) return '<div class="note">請輸入出生日期</div>';
    if (r.error) return '<div class="err">' + esc(r.error) + '</div>';
    var s = r.solar, l = r.lunar, o = '';
    o += '<div><b>國曆</b> 西元' + s.y + '年' + s.m + '月' + s.d + '日（民國' + s.minguo + '年' + s.m + '月' + s.d + '日）星期' + s.week + '・' + s.xz + '</div>';
    o += '<div><b>農曆</b> 歲次' + l.gz + '年・屬' + l.zodiac + '・民國' + l.minguo + '年' + l.monthCn + l.dayCn + (r.hourName ? '・' + r.hourName : '') + '</div>';
    var lab = p.role === 'dead' ? (r.hasDeath ? '享壽' : '至今日（' + r.ref + '）') : '';
    o += '<div><b>' + (lab ? lab + ' ' : '') + '足歲</b> ' + r.zu + ' 歲　<b>虛歲</b> ' + r.xu + ' 歲</div>';
    r.note.forEach(function (n) { o += '<div class="note">※ ' + esc(n) + '</div>'; });
    return o;
  }
  function yf(k, v, label, ph) { return '<label class="f" style="flex:1.4"><span>' + label + '</span><input type="number" inputmode="numeric" data-k="' + k + '" value="' + esc(v) + '" placeholder="' + ph + '"></label>'; }
  function selF(k, v, n, unit, names) {
    var o = '<option value="">—</option>';
    for (var i = 1; i <= n; i++) o += '<option value="' + i + '"' + (+v === i ? ' selected' : '') + '>' + (names === 'cn' ? dayCn(i) : names ? names[i - 1] + '月' : i + unit) + '</option>';
    return '<label class="f" style="min-width:70px"><span>' + unit + '</span><select data-k="' + k + '">' + o + '</select></label>';
  }
  function personCard(p) {
    var dead = p.role === 'dead';
    var o = '<div class="card" data-id="' + p.id + '">';
    o += '<div class="row"><label class="f"><span>' + (dead ? '亡者稱謂（選填）' : '稱謂（選填，如長子）') + '</span><input data-k="label" value="' + esc(p.label) + '" placeholder="' + (dead ? '例：先父' : '例：長子') + '"></label>';
    if (!dead) o += '<label class="f" style="flex:0 0 74px;align-items:center"><span>納入</span><input type="checkbox" data-k="use" ' + (p.use ? 'checked' : '') + '></label>';
    o += '</div>';
    o += '<div class="seg" style="margin:6px 0"><button data-a="cal" data-v="solar" class="' + (p.cal === 'solar' ? 'on' : '') + '">國曆</button><button data-a="cal" data-v="lunar" class="' + (p.cal === 'lunar' ? 'on' : '') + '">農曆</button></div>';
    o += '<div class="seg" style="margin:6px 0"><button data-a="era" data-v="roc" class="' + (p.era === 'roc' ? 'on' : '') + '">民國紀年</button><button data-a="era" data-v="ad" class="' + (p.era === 'ad' ? 'on' : '') + '">西元紀年</button></div>';
    var ey = p.era === 'roc' ? '民國年' : '西元年', ph = p.era === 'roc' ? '例：39' : '例：1950';
    var MN = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'];
    if (p.cal === 'solar') {
      o += '<div class="row">' + yf('y', p.y, '出生' + ey, ph) + selF('m', p.m, 12, '月', null) + selF('d', p.d, 31, '日', null) + '</div>';
    } else {
      o += '<div class="row">' + yf('ly', p.ly, '農曆' + ey, ph) + selF('lm', p.lm, 12, '月', MN) + selF('ld', p.ld, 30, '日', 'cn') +
        '<label class="f" style="flex:0 0 60px;align-items:center"><span>閏月</span><input type="checkbox" data-k="leap" ' + (p.leap ? 'checked' : '') + '></label></div>';
    }
    if (dead) {
      var hs = '<option value="">時辰不詳</option>';
      for (var h = 0; h < 12; h++) hs += '<option value="' + h + '"' + (String(p.hour) === String(h) ? ' selected' : '') + '>' + Z.ZHI[h] + '時 ' + Z.HOUR_RANGE[h] + '</option>';
      o += '<div class="row"><label class="f"><span>出生時辰</span><select data-k="hour">' + hs + '</select></label>' +
        '</div><div class="row">' + yf('dy', p.dy, '亡故' + ey + '（選填，算享壽）', ph) + selF('dm', p.dm, 12, '月', null) + selF('dd', p.dd, 31, '日', null) + '</div>';
    }
    o += '<div class="info" id="info' + p.id + '">' + infoHtml(p) + '</div>';
    if (!dead || state.persons.filter(function (x) { return x.role === 'dead'; }).length > 1)
      o += '<div class="row" style="justify-content:flex-end"><button class="b sm red" data-a="del">刪除</button></div>';
    return o + '</div>';
  }
  function dayCn(d) {
    var n = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
    return n[d];
  }

  // ---------- 座向 ----------
  var EIGHT = [['北', 0], ['東北', 3], ['東', 6], ['東南', 9], ['南', 12], ['西南', 15], ['西', 18], ['西北', 21]];
  function seatHtml(task, title) {
    var st = state.seat[task], opts = '<option value="">（不指定，略過座向檢核）</option>';
    EIGHT.forEach(function (e) {
      if (task === 'pai' && e[0].length > 1) return;
      var op = EIGHT[(EIGHT.indexOf(e) + 4) % 8][0];
      opts += '<option value="' + e[1] + '"' + (st.zuo === e[1] ? ' selected' : '') + '>坐' + e[0] + '向' + op + '</option>';
    });
    var si = st.zuo == null ? null : Z.seatInfo(st.zuo);
    return '<div class="card" data-seat="' + task + '"><div style="font-weight:700;margin-bottom:4px">' + title + '</div>' +
      '<div class="row"><label class="f"><span>座向（背後為座、面對為向）</span><select data-s="zuo">' + opts + '</select></label></div>' +
      '<div class="info" id="seat' + task + '">' + (si ? '<b>' + esc(si.text) + '</b><div class="note">座在' + si.zuoDir + '（' + si.zuoPalace + '宮）・向在' + si.xiangDir + '（' + si.xiangPalace + '宮）</div>' : '<span class="note">未指定</span>') + '</div></div>';
  }

  // ---------- 畫面：資料 ----------
  function viewData() {
    var o = '<h2>亡者資料<small>預設國曆，自動轉農曆</small></h2>';
    state.persons.filter(function (p) { return p.role === 'dead'; }).forEach(function (p) { o += personCard(p); });
    o += '<button class="add" data-a="addDead">＋ 新增亡者／祖先</button>';
    o += '<h2>參與人員<small>可多位，勾選納入沖剋計算</small></h2>';
    state.persons.filter(function (p) { return p.role !== 'dead'; }).forEach(function (p) { o += personCard(p); });
    o += '<button class="add" data-a="addJoin">＋ 新增參與人員</button>';
    o += '<h2>座向<small>八方位，向＝座對沖</small></h2>' + seatHtml('ta', '入塔：塔位座向') + seatHtml('pai', '安奉：祖先牌位座向');
    o += '<div class="hint">資料只存在這支手機裡，不會上傳。填完到「擇日」頁開始。</div>';
    return o;
  }

  // ---------- 畫面：擇日 ----------
  function activePersons() {
    return state.persons.filter(function (p) { return p.use !== false; }).map(function (p) {
      var pr = profOf(p); if (!pr || pr.error) return null;
      return { role: p.role === 'dead' ? 'dead' : 'join', label: p.label || (p.role === 'dead' ? '亡者' : '參與者'), zhi: pr.zhi };
    }).filter(Boolean);
  }
  function yearPanel() {
    var out = '', f = parseD(state.from), t = parseD(state.to); if (!f || !t) return '';
    var seat = state.seat[state.task].zuo == null ? null : Z.seatInfo(state.seat[state.task].zuo);
    var seen = {};
    [f, t].forEach(function (d) {
      var so = L.Solar.fromYmd(d.y, d.m, d.d), lu = so.getLunar();
      var yz = Z.ZHI.indexOf(lu.getYearZhiByLiChun()), yn = Z.yearNumberOf(lu, so);
      if (seen[yn]) return; seen[yn] = 1;
      var yi = Z.yearInfo(yn, yz), o = '<div class="card"><div style="font-weight:700">' + lu.getYearInGanZhiByLiChun() + '年（立春換年）年家方位</div>';
      o += '<div class="info"><div><b>太歲</b>在' + Z.ZHI[yz] + '　<b>歲破</b>在' + Z.ZHI[yi.suipo] + '</div>' +
        '<div><b>三煞</b>在' + yi.sansha.dir + '方（' + yi.sansha.zhi.map(function (z) { return Z.ZHI[z]; }).join('') + '）</div>' +
        '<div><b>五黃</b>在' + (Z.PALACE_DIR[yi.wuhuang] || '中宮') + '　<b>二黑</b>在' + (Z.PALACE_DIR[yi.erhei] || '中宮') + '</div></div>';
      if (seat) {
        var tags = '', bad = false;
        function T(c, txt) { tags += '<span class="tag ' + c + '">' + txt + '</span>'; if (c === 'bad') bad = true; }
        yi.sansha.zhi.indexOf(seat.zuoZhi) >= 0 ? T('bad', '座犯三煞') : T('ok', '座避三煞');
        yi.sansha.zhi.indexOf(seat.xiangZhi) >= 0 ? T('warn', '向犯三煞') : T('ok', '向避三煞');
        (seat.zuoZhi === yz || seat.zuoZhi === yi.suipo) ? T('bad', seat.zuoZhi === yz ? '坐太歲' : '坐歲破') : T('ok', '不犯太歲軸');
        seat.zuoPalace === yi.wuhuang ? T('warn', '座臨五黃') : 0;
        o += '<div style="margin-top:6px">' + esc(seat.text) + '：' + tags + '</div>';
      }
      state.persons.filter(function (p) { return p.use !== false; }).forEach(function (p) {
        var pr = profOf(p); if (!pr || pr.error) return;
        var rel = Z.relations(yz, pr.zhi);
        if (rel.length) o += '<div class="warnline">' + esc((p.label || (p.role === 'dead' ? '亡者' : '參與者')) + '（屬' + pr.zodiac + '）與太歲：' + rel.join('、')) + '</div>';
      });
      out += o + '</div>';
    });
    return out;
  }
  function viewPlan() {
    var t = state.task, o = '<h2>擇日事項</h2><div class="seg"><button data-a="task" data-v="ta" class="' + (t === 'ta' ? 'on' : '') + '">入塔</button><button data-a="task" data-v="pai" class="' + (t === 'pai' ? 'on' : '') + '">安奉祖先牌位</button></div>';
    var seat = state.seat[t].zuo == null ? '<span class="tag warn">尚未設定座向</span>' : '<span class="tag gold">' + esc(Z.seatInfo(state.seat[t].zuo).text) + '</span>';
    var ppl = activePersons();
    o += '<div class="row" style="margin-top:8px">' + seat + '<span class="tag">納入 ' + ppl.length + ' 人（亡者 ' + ppl.filter(function (x) { return x.role === 'dead'; }).length + '）</span></div>';
    o += '<h2>日期範圍<small>最多 400 天</small></h2><div class="row"><label class="f"><span>起</span><input type="date" id="from" value="' + state.from + '"></label><label class="f"><span>迄</span><input type="date" id="to" value="' + state.to + '"></label></div>';
    o += '<div class="chips">' + [['30天', 30], ['60天', 60], ['90天', 90], ['半年', 180], ['一年', 365]].map(function (a) { return '<button class="chip" data-a="range" data-v="' + a[1] + '">' + a[0] + '</button>'; }).join('') + '</div>';
    o += '<h2>可用時辰<small>點選開關</small></h2><div class="chips">';
    for (var h = 1; h <= 11; h++) o += '<button class="chip ' + (state.hours[t].indexOf(h) >= 0 ? 'on' : '') + '" data-a="hour" data-v="' + h + '">' + Z.ZHI[h] + ' ' + Z.HOUR_RANGE[h].replace(/–/g, '-') + '</button>';
    o += '</div><div class="hint">子時（23–01）不列入。入塔預設辰～申（靈骨塔開放時間），牌位預設寅～申。</div>';
    o += '<h2>煞忌嚴格度</h2><div class="seg">' + [['loose', '寬鬆'], ['std', '標準'], ['strict', '嚴格']].map(function (a) { return '<button data-a="strict" data-v="' + a[0] + '" class="' + (state.strict === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div>';
    o += '<div class="hint">標準：沖生肖、座山犯各層煞、歲破月破、四絕四離四廢、楊公忌、日忌事項皆排除；向首犯煞、黑道、月忌等只扣分提醒。嚴格：以上全部排除，並要求通書日宜該事項。寬鬆：僅排除沖亡者、月破、日忌該事項。</div>';
    o += '<div style="height:10px"></div><button class="b pri" style="width:100%;padding:14px;font-size:16px" data-a="run">開始擇日</button>';
    o += '<h2>年家方位檢視</h2>' + yearPanel();
    return o;
  }

  // ---------- 畫面：結果 ----------
  function fmtMD(d) { return d.m + '/' + d.d; }
  function gcls(r) { return !r.valid ? 'gx' : r.grade === '上吉' ? 'g0' : r.grade === '吉' ? 'g1' : 'g2'; }
  function dayCard(r, i) {
    var d = r.day, o = '<div class="card" data-i="' + i + '" data-a="open"><div class="top"><div class="dt">' + d.y + '/' + fmtMD(d) + '<small>週' + d.week + '</small></div><span class="badge ' + gcls(r) + '">' + (r.valid ? r.grade + ' ' + r.score : '不宜') + '</span></div>';
    o += '<div class="l2">農曆' + d.lunarText + '・' + d.yearGz + '年 ' + d.monthGz + '月 ' + d.dayGz + '日</div>';
    o += '<div class="l3">' + d.zhixing + '日・' + d.xiu + '宿・' + d.tianshen + d.tsType + '・' + d.chongDesc.replace(/^\(.{2}\)/, '沖') + '煞' + d.sha + (d.jieqi ? '・' + d.jieqi : '') + '</div>';
    if (r.valid) {
      o += '<div class="hrs">' + r.hours.map(function (h) { return '<span class="hr ' + (h.valid ? '' : 'bad') + '">' + h.name + ' ' + h.range.replace(/–/g, '-').replace(/:00/g, '') + (h.valid ? ' ' + h.tsType.charAt(0) : '') + '</span>'; }).join('') + '</div>';
      if (r.soft.length) o += '<div class="warnline">提醒：' + esc(Array.from(new Set(r.soft.map(function (s) { return s.name; }))).join('、')) + '</div>';
    } else {
      var names = Array.from(new Set(r.hard.map(function (s) { return s.name; })));
      if (r.noHour) names.push('所選時段無可用時辰');
      o += '<div class="warnline" style="color:#f1a79d">' + esc(names.slice(0, 4).join('、') + (names.length > 4 ? '…' : '')) + '</div>';
    }
    return o + '</div>';
  }
  function viewRes() {
    if (!state.res) return '<div class="ctr">還沒有結果。<br>到「資料」填好亡者、參與人員與座向，<br>再到「擇日」按「開始擇日」。</div>';
    var all = state.res, m = state.resMeta, valid = all.filter(function (r) { return r.valid; });
    var g = { 上吉: 0, 吉: 0, 可用: 0 }; valid.forEach(function (r) { g[r.grade]++; });
    var o = '<div class="card"><b>' + m.taskName + '</b>　' + m.from + ' ～ ' + m.to + '<div class="info"><div>共檢核 ' + all.length + ' 天，可用 <b>' + valid.length + '</b> 天（上吉 ' + g.上吉 + '・吉 ' + g.吉 + '・可用 ' + g.可用 + '）</div><div class="note">' + esc(m.seat) + '・' + esc(m.ppl) + '・' + m.strictName + '・時辰 ' + esc(m.hours) + '</div></div>';
    o += '<div class="row"><div class="seg" style="flex:1"><button data-a="sort" data-v="date" class="' + (state.sort === 'date' ? 'on' : '') + '">依日期</button><button data-a="sort" data-v="score" class="' + (state.sort === 'score' ? 'on' : '') + '">依吉度</button></div><button class="chip ' + (state.showBad ? 'on' : '') + '" data-a="bad">顯示不宜日</button></div></div>';
    var idx = all.map(function (r, i) { return i; }).filter(function (i) { return state.showBad || all[i].valid; });
    if (state.sort === 'score') idx.sort(function (a, b) { return (all[b].valid - all[a].valid) || (all[b].score - all[a].score) || (a - b); });
    if (!idx.length) o += '<div class="ctr">這段期間沒有符合條件的日子。<br>可延長日期範圍、放寬嚴格度，或調整可用時辰。<br>也請看「擇日」頁最下方年家方位，確認座向是否整年犯煞。</div>';
    idx.forEach(function (i) { o += dayCard(all[i], i); });
    return o;
  }

  // ---------- 明細 ----------
  function rrows(list, cls) { return list.map(function (c) { return '<div class="rr ' + cls + '">' + (cls === 'hard' ? '✗ ' : '△ ') + '<b>' + esc(c.name) + '</b>　' + esc(c.detail) + '</div>'; }).join(''); }
  function layerHtml(layer, r) {
    var hard = r.hard.filter(function (c) { return c.layer === layer; }), soft = r.soft.filter(function (c) { return c.layer === layer; });
    var ok = r.checked.filter(function (c) { return c.layer === layer && c.status === 'ok'; });
    var okn = Array.from(new Set(ok.map(function (c) { return c.name; })));
    return '<div class="lay">' + layer + '煞　' + (hard.length ? '<span class="tag bad">有犯 ' + hard.length + '</span>' : soft.length ? '<span class="tag warn">提醒 ' + soft.length + '</span>' : '<span class="tag ok">全避開</span>') + '</div>' +
      rrows(hard, 'hard') + rrows(soft, 'soft') + (okn.length ? '<div class="rr ok">✓ 已避開：' + esc(okn.join('、')) + '</div>' : '');
  }
  function openDetail(i) {
    var r = state.res[i], d = r.day, m = state.resMeta;
    var o = '<div class="bar"><button class="b" data-a="close">← 返回</button><button class="b pri" data-a="copy" data-i="' + i + '">複製日課</button></div>';
    o += '<div class="card"><div class="top"><div class="dt">' + d.y + '年' + d.m + '月' + d.d + '日<small>民國' + d.minguo + '年・週' + d.week + '</small></div><span class="badge ' + gcls(r) + '">' + (r.valid ? r.grade + ' ' + r.score : '不宜') + '</span></div>';
    o += '<div class="info"><div><b>農曆</b> ' + d.lunarText + '</div><div><b>干支</b> ' + d.yearGz + '年 ' + d.monthGz + '月 ' + d.dayGz + '日</div>' +
      '<div><b>建除</b> ' + d.zhixing + '日　<b>二十八宿</b> ' + d.xiu + '宿（' + d.xiuLuck + '）</div>' +
      '<div><b>值日天神</b> ' + d.tianshen + '（' + d.tsType + '）　<b>日沖</b> ' + d.chongDesc + '　<b>煞</b>' + d.sha + '</div>' + (d.jieqi ? '<div><b>節氣</b> ' + d.jieqi + '</div>' : '') + '</div></div>';
    o += '<h2>通書日宜忌</h2><p class="t"><b style="color:var(--ok)">宜</b>　' + esc(d.yi.join('、') || '無') + '</p><p class="t"><b style="color:var(--red)">忌</b>　' + esc(d.ji.join('、') || '無') + '</p>';
    o += '<p class="t"><b style="color:var(--gold)">吉神</b>　' + esc(d.jishen.join('、') || '無') + '</p><p class="t"><b style="color:var(--warn)">凶煞</b>　' + esc(d.xiongsha.join('、') || '無') + '</p>';
    o += '<h2>年・月・日煞檢核</h2>' + layerHtml('年', r) + layerHtml('月', r) + layerHtml('日', r);
    o += '<h2>時辰檢核<small>' + esc(m.seat) + '</small></h2>';
    r.hours.forEach(function (h) {
      o += '<div class="card" style="padding:9px"><div class="top"><b>' + h.name + ' <small style="color:var(--mut)">' + h.range + '</small></b><span class="tag ' + (h.valid ? 'ok' : 'bad') + '">' + (h.valid ? '可用' : '不可用') + '</span></div>' +
        '<div class="l3">' + h.gz + '時・' + h.tianshen + h.tsType + '・' + h.chongDesc.replace(/^\(.{2}\)/, '沖') + '煞' + h.sha + '</div>' +
        '<div class="l3">時宜：' + esc(h.yi.join('、') || '無') + '　時忌：' + esc(h.ji.join('、') || '無') + '</div>' + rrows(h.hard, 'hard') + rrows(h.soft, 'soft') + '</div>';
    });
    o += '<p class="hint">本工具依傳統擇日神煞推算，僅供參考；正式使用前請與印刷版通書及擇日師核對。</p>';
    var s = $('#sheet'); s.innerHTML = o; s.scrollTop = 0; s.classList.add('open');
  }
  function closeDetail() { $('#sheet').classList.remove('open'); }
  function copyText(i) {
    var r = state.res[i], d = r.day, m = state.resMeta;
    var t = '【' + m.taskName + '擇日】\n國曆：' + d.y + '年' + d.m + '月' + d.d + '日（民國' + d.minguo + '年）星期' + d.week + '\n農曆：' + d.lunarText + '\n干支：' + d.yearGz + '年 ' + d.monthGz + '月 ' + d.dayGz + '日\n' +
      d.zhixing + '日・' + d.xiu + '宿・' + d.tianshen + d.tsType + '・日' + d.chongDesc + '煞' + d.sha + '\n座向：' + m.seat + '\n吉時：' +
      (r.bestHours.map(function (h) { return h.name + '（' + h.range + '，' + h.gz + '時' + h.tianshen + h.tsType + '，' + h.chongDesc + '煞' + h.sha + '）'; }).join('、') || '無') + '\n人員：' + m.ppl;
    var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove();
    toast(ok ? '已複製' : '複製失敗');
  }

  // ---------- 說明 ----------
  function viewAbout() {
    return '<h2>擇日邏輯</h2>' +
      '<p class="t">一、<b>人</b>：亡者與參與人員以農曆年支定生肖；日支、時支與生肖六沖者排除（亡者一律排除；參與者「標準」以上排除）。另提醒刑、害、破與犯太歲。</p>' +
      '<p class="t">二、<b>座向</b>：座向以八方位選擇，內部取各方位正中之山（子、艮、卯、巽、午、坤、酉、乾）歸十二支；向＝座對沖。座山或向首落入各層煞方、與日時相沖，依嚴格度排除或扣分。</p>' +
      '<p class="t">三、<b>四層煞</b>：</p><ul class="t">' +
      '<li><b>年煞</b>：太歲、歲破、三煞方（申子辰→南、亥卯未→西、寅午戌→北、巳酉丑→東）、五黃、二黑；年界以立春為準。</li>' +
      '<li><b>月煞</b>：月破日、月三煞方、月建軸、月忌（初五十四廿三）、四廢、天地轉殺、四絕四離、楊公忌；月令以節為界。</li>' +
      '<li><b>日煞</b>：日沖、日煞方、歲破日、黑道日、重日復日三喪等喪忌、其他凶神；並核對通書日宜忌是否宜「安葬」（入塔）或「安香、祭祀」（牌位）。</li>' +
      '<li><b>時煞</b>：時沖、時煞方、黑道時、日時相沖、時宜忌。</li></ul>' +
      '<h2>資料來源與限制</h2>' +
      '<p class="t">曆法、節氣、干支、建除、二十八宿、黃黑道、神煞與日宜忌，採用《協紀辨方書》體系的萬年曆資料（開源 lunar-javascript，已轉繁體），這也是各家通書共同的根基。</p>' +
      '<p class="t">本程式<b>並未逐頁內建林先知通書印刷版的內文</b>；各家通書在個別神煞取捨、宜忌用語上略有差異。擇定日期後，請務必與當年度林先知通書核對，並請擇日師最後審定。</p>' +
      '<p class="t">足歲依國曆生日計算；虛歲＝出生即一歲，每逢農曆新年加一歲（填亡故日期則以亡故時計算享壽）。生肖、歲次以農曆年（春節）為界。</p>' +
      '<p class="t">版本 ' + (window.__ver || '1.0') + '・資料範圍 1901–2099</p>';
  }

  // ---------- 渲染與事件 ----------
  function render() {
    var v = $('#view');
    v.innerHTML = state.tab === 'data' ? viewData() : state.tab === 'plan' ? viewPlan() : state.tab === 'res' ? viewRes() : viewAbout();
    document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === state.tab); });
  }
  function toast(s) { var t = $('#toast'); t.textContent = s; t.classList.add('on'); setTimeout(function () { t.classList.remove('on'); }, 1600); }
  function pById(id) { return state.persons.filter(function (p) { return p.id === +id; })[0]; }

  function run() {
    var f = parseD(state.from), t = parseD(state.to);
    if (!f || !t) return toast('請選擇日期範圍');
    var a = L.Solar.fromYmd(f.y, f.m, f.d), b = L.Solar.fromYmd(t.y, t.m, t.d);
    if (a.toYmd() > b.toYmd()) return toast('起日不可晚於迄日');
    var dead = state.persons.filter(function (p) { return p.role === 'dead' && p.use !== false; }).map(profOf).filter(function (x) { return x && !x.error; });
    if (!dead.length) { toast('請先在「資料」填入亡者出生日期'); state.tab = 'data'; render(); return; }
    if (!state.hours[state.task].length) return toast('請至少選一個時辰');
    var days = Math.round((new Date(t.y, t.m - 1, t.d) - new Date(f.y, f.m - 1, f.d)) / 86400000) + 1;
    if (days > 400) return toast('日期範圍最多 400 天');
    var seat = state.seat[state.task].zuo == null ? null : Z.seatInfo(state.seat[state.task].zuo);
    var ppl = activePersons();
    toast('計算中…');
    setTimeout(function () {
      state.res = Z.search({ task: state.task, strict: state.strict, persons: ppl, seat: seat, hours: state.hours[state.task].slice().sort(function (x, y) { return x - y; }), from: f, to: t });
      state.resMeta = {
        taskName: Z.task(state.task).name, from: state.from, to: state.to, seat: seat ? seat.text : '未指定座向',
        ppl: '亡者' + ppl.filter(function (x) { return x.role === 'dead'; }).length + '人、參與' + ppl.filter(function (x) { return x.role !== 'dead'; }).length + '人（' + ppl.map(function (x) { return x.label + '屬' + Z.ZODIAC[x.zhi]; }).join('、') + '）',
        strictName: { loose: '寬鬆', std: '標準', strict: '嚴格' }[state.strict], hours: state.hours[state.task].slice().sort(function (x, y) { return x - y; }).map(function (h) { return Z.ZHI[h]; }).join('')
      };
      state.tab = 'res'; state.sort = 'date'; save(); render(); $('#toast').classList.remove('on'); $('#view').scrollTop = 0;
    }, 30);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a],#tabs button'); if (!el) return;
    if (el.dataset.t) { state.tab = el.dataset.t; closeDetail(); render(); return; }
    var a = el.dataset.a, v = el.dataset.v, card = el.closest('[data-id]'), p = card && pById(card.dataset.id);
    switch (a) {
      case 'cal': p.cal = v; save(); render(); break;
      case 'era': if (p.era !== v) { ['y', 'ly', 'dy'].forEach(function (k) { var n = +p[k]; if (n) p[k] = v === 'ad' ? n + 1911 : (n > 1911 ? n - 1911 : n); }); p.era = v; save(); render(); } break;
      case 'del': state.persons = state.persons.filter(function (x) { return x !== p; }); save(); render(); break;
      case 'addDead': state.persons.push(newPerson('dead')); save(); render(); break;
      case 'addJoin': state.persons.push(newPerson('join')); save(); render(); break;
      case 'task': state.task = v; save(); render(); break;
      case 'strict': state.strict = v; save(); render(); break;
      case 'range': var from = parseD(state.from); var d = new Date(from.y, from.m - 1, from.d + (+v - 1)); state.to = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); save(); render(); break;
      case 'hour': var hs = state.hours[state.task], k = hs.indexOf(+v); if (k >= 0) hs.splice(k, 1); else hs.push(+v); save(); render(); break;
      case 'run': run(); break;
      case 'sort': state.sort = v; render(); break;
      case 'bad': state.showBad = !state.showBad; render(); break;
      case 'open': openDetail(+el.dataset.i); break;
      case 'close': closeDetail(); break;
      case 'copy': copyText(+el.dataset.i); break;
    }
  });
  document.addEventListener('input', function (e) { onField(e, false); });
  document.addEventListener('change', function (e) { onField(e, true); });
  function onField(e, isChange) {
    var el = e.target, card = el.closest('[data-id]');
    if (card && el.dataset.k) {
      var p = pById(card.dataset.id), k = el.dataset.k;
      p[k] = el.type === 'checkbox' ? el.checked : el.value;
      save();
      if (k !== 'label' && k !== 'use') { var inf = $('#info' + p.id); if (inf) inf.innerHTML = infoHtml(p); }
      return;
    }
    var sc = el.closest('[data-seat]');
    if (sc && el.dataset.s) {
      var t = sc.dataset.seat;
      if (el.dataset.s === 'zuo') state.seat[t].zuo = el.value === '' ? null : +el.value;
      else return;
      save(); render(); return;
    }
    if (el.id === 'from' || el.id === 'to') { state[el.id] = el.value; save(); if (isChange) render(); }
  }
  window.__back = function () {
    if ($('#sheet').classList.contains('open')) { closeDetail(); return true; }
    if (state.tab !== 'data') { state.tab = state.tab === 'res' ? 'plan' : 'data'; render(); return true; }
    return false;
  };

  load(); render();
})();
