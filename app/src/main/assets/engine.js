/* 擇日引擎：以農曆／節氣／干支／神煞（協紀辨方書體系，通書通用）為基礎，
   針對「入塔」「安奉祖先牌位」做年、月、日、時四層煞忌檢核。 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./lunar.js'));
  else root.Zeri = factory(root);
})(this, function (L) {
  var ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
  var ZODIAC = '鼠牛虎兔龍蛇馬羊猴雞狗豬'.split('');
  var WEEK = '日一二三四五六'.split('');
  var SHAN = '子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬'.split(''); // 第 i 山中心 = i*15°
  var PALACE_OF_SHAN = ['坎', '坎', '艮', '艮', '艮', '震', '震', '震', '巽', '巽', '巽', '離', '離', '離', '坤', '坤', '坤', '兌', '兌', '兌', '乾', '乾', '乾', '坎'];
  var PALACE_DIR = { 坎: '北', 艮: '東北', 震: '東', 巽: '東南', 離: '南', 坤: '西南', 兌: '西', 乾: '西北' };
  var HOUR_RANGE = ['23:00–01:00', '01:00–03:00', '03:00–05:00', '05:00–07:00', '07:00–09:00', '09:00–11:00', '11:00–13:00', '13:00–15:00', '15:00–17:00', '17:00–19:00', '19:00–21:00', '21:00–23:00'];

  var HAI = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];
  var PO = [9, 4, 11, 6, 1, 8, 3, 10, 5, 0, 7, 2];
  var HE6 = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  function xingOf(a, b) {
    if ((a === 2 && b === 5) || (a === 5 && b === 8) || (a === 8 && b === 2)) return true;
    if ((a === 1 && b === 10) || (a === 10 && b === 7) || (a === 7 && b === 1)) return true;
    if ((a === 0 && b === 3) || (a === 3 && b === 0)) return true;
    return false;
  }
  function chong(z) { return (z + 6) % 12; }
  function relations(a, b) { // a 與 b 之間的關係
    var r = [];
    if (a === b) r.push('同');
    if (chong(a) === b) r.push('沖');
    if (HAI[a] === b) r.push('害');
    if (PO[a] === b) r.push('破');
    if (xingOf(a, b)) r.push('刑');
    return r;
  }
  function isHe(a, b) { return HE6[a] === b || (a !== b && (a % 4) === (b % 4) && ((a - b + 12) % 12) % 4 === 0); }

  // ---------- 方位 ----------
  var SAN = [
    { dir: '南', zhi: [5, 6, 7] }, // 申子辰
    { dir: '東', zhi: [2, 3, 4] }, // 巳酉丑
    { dir: '北', zhi: [11, 0, 1] }, // 寅午戌
    { dir: '西', zhi: [8, 9, 10] }  // 亥卯未
  ];
  function sansha(zhi) { return SAN[zhi % 4]; }
  function dirToZhi(dir) { for (var i = 0; i < 4; i++) if (SAN[i].dir === dir) return SAN[i].zhi; return []; }
  function shanZhi(i) { return Math.floor(((i + 1) % 24) / 2); }
  function shanFromDeg(deg) { return Math.floor((((deg % 360) + 360 + 7.5) % 360) / 15); }
  function seatInfo(zuo) {
    if (zuo == null) return null;
    var xiang = (zuo + 12) % 24;
    return { zuo: zuo, xiang: xiang, zuoName: SHAN[zuo], xiangName: SHAN[xiang], zuoZhi: shanZhi(zuo), xiangZhi: shanZhi(xiang),
      zuoDir: PALACE_DIR[PALACE_OF_SHAN[zuo]], xiangDir: PALACE_DIR[PALACE_OF_SHAN[xiang]],
      zuoPalace: PALACE_OF_SHAN[zuo], xiangPalace: PALACE_OF_SHAN[xiang],
      text: '坐' + SHAN[zuo] + '向' + SHAN[xiang] + '（坐' + PALACE_DIR[PALACE_OF_SHAN[zuo]] + '向' + PALACE_DIR[PALACE_OF_SHAN[xiang]] + '）' };
  }

  // ---------- 年家資料 ----------
  function yearNumberOf(lunar, solar) {
    var gz = lunar.getYearInGanZhiByLiChun();
    var idx = -1;
    for (var k = 0; k < 60; k++) if (GAN[k % 10] + ZHI[k % 12] === gz) { idx = k; break; }
    var y = solar.getYear();
    return ((y - 4) % 60 + 60) % 60 === idx ? y : y - 1;
  }
  var FLY = ['乾', '兌', '艮', '離', '坎', '坤', '震', '巽'];
  function starPalace(center, star) {
    var k = (((star - center) % 9) + 9) % 9;
    return k === 0 ? '中' : FLY[k - 1];
  }
  var yearCache = {};
  function yearInfo(yearNum, yz) {
    var key = yearNum;
    if (yearCache[key]) return yearCache[key];
    var center = ((((2020 - yearNum) + 6) % 9) + 9) % 9 + 1;
    var ss = sansha(yz);
    var o = { yearNum: yearNum, taisui: yz, suipo: chong(yz), sansha: ss, center: center,
      wuhuang: starPalace(center, 5), erhei: starPalace(center, 2) };
    yearCache[key] = o;
    return o;
  }

  // ---------- 個人檔案 ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var XZ_FIX = { 摩羯: '摩羯', 水瓶: '水瓶' };
  function profile(spec, refSolar) {
    var y = spec.y, m = spec.m, d = spec.d, solar, lunar;
    if (spec.cal === 'lunar') {
      lunar = L.Lunar.fromYmd(y, spec.leap ? -m : m, d);
      if (lunar.getDay() !== d || Math.abs(lunar.getMonth()) !== m || lunar.getYear() !== y) return { error: '農曆日期不存在（該月沒有這一天，或閏月不正確）' };
      solar = lunar.getSolar();
    } else {
      solar = L.Solar.fromYmd(y, m, d);
      if (solar.getYear() !== y || solar.getMonth() !== m || solar.getDay() !== d) return { error: '國曆日期不正確' };
      lunar = solar.getLunar();
    }
    var sy = solar.getYear(), sm = solar.getMonth(), sd = solar.getDay();
    var ref = refSolar || (function () { var n = new Date(); return L.Solar.fromYmd(n.getFullYear(), n.getMonth() + 1, n.getDate()); })();
    var zu = ref.getYear() - sy - ((ref.getMonth() < sm || (ref.getMonth() === sm && ref.getDay() < sd)) ? 1 : 0);
    var refLunar = ref.getLunar();
    var xu = refLunar.getYear() - lunar.getYear() + 1;
    var zhi = ZHI.indexOf(lunar.getYearZhi());
    var hourIdx = (spec.hour == null || spec.hour === '') ? null : Number(spec.hour);
    var note = [];
    if (lunar.getYearInGanZhi() !== lunar.getYearInGanZhiByLiChun()) note.push('生於立春後、春節前：民間生肖依農曆年（' + lunar.getYearInGanZhi() + '年屬' + ZODIAC[zhi] + '），八字年柱則為' + lunar.getYearInGanZhiByLiChun() + '。');
    if (hourIdx === 0 && spec.hourLate) note.push('晚子時（23:00–24:00）。');
    var mo = lunar.getMonth();
    return {
      solar: { y: sy, m: sm, d: sd, week: WEEK[solar.getWeek()], xz: solar.getXingZuo() + '座', minguo: sy - 1911 },
      lunar: { y: lunar.getYear(), m: Math.abs(mo), leap: mo < 0, d: lunar.getDay(), gz: lunar.getYearInGanZhi(), zodiac: ZODIAC[zhi],
        minguo: lunar.getYear() - 1911, monthCn: lunar.getMonthInChinese() + '月', dayCn: lunar.getDayInChinese() },
      zhi: zhi, zodiac: ZODIAC[zhi], hourIdx: hourIdx, hourName: hourIdx == null ? null : ZHI[hourIdx] + '時（' + HOUR_RANGE[hourIdx] + '）',
      zu: zu, xu: xu, note: note, ref: ref.toYmd()
    };
  }
  function hourFromTime(hhmm) {
    if (!hhmm) return null;
    var h = parseInt(hhmm.split(':')[0], 10);
    if (isNaN(h)) return null;
    return Math.floor(((h + 1) % 24) / 2);
  }

  // ---------- 規則 ----------
  var KEY_VIRTUE = ['天德', '月德', '天德合', '月德合', '天赦', '天願', '母倉', '天恩', '月恩', '三合', '六合', '五合', '不將', '陰德', '玉宇', '福生', '要安', '天喜', '天醫', '敬安', '普護', '福德', '時德'];
  var HARD_SHA_TA = ['月破', '天吏', '重日', '復日', '三喪', '致死', '四廢'];
  var HARD_SHA_PAI = ['月破', '天吏', '致死', '四廢'];
  var SOFT_SHA = ['往亡', '月煞', '月刑', '月害', '月厭', '土符', '地囊', '天賊', '九空', '五虛', '五墓', '血支', '血忌', '歸忌', '大耗', '小耗', '四耗', '劫煞', '災煞', '天火', '地火', '河魁', '天罡', '厭對', '招搖', '八風', '四擊', '九坎', '九焦', '孤辰', '陰錯', '陽錯', '大煞', '死神', '死氣', '四窮', '四忌', '遊禍', '五離', '行狠', '了戾', '重日', '復日', '三喪'];
  var BLACK_ALL = true;
  var YANG = [[1, 13], [2, 11], [3, 9], [4, 7], [5, 5], [6, 3], [7, 1], [7, 29], [8, 27], [9, 25], [10, 23], [11, 21], [12, 19]];
  var SI_FEI = [['庚申', '辛酉'], ['壬子', '癸亥'], ['甲寅', '乙卯'], ['丙午', '丁巳']];
  var TIAN_ZHUAN = ['乙卯', '丙午', '辛酉', '壬子'];
  var DI_ZHUAN = ['辛卯', '戊午', '癸酉', '丙子'];
  var STRICT = { loose: 0, std: 1, strict: 2 };

  function task(t) {
    return t === 'ta'
      ? { key: 'ta', name: '入塔', yiWords: ['安葬'], jiWords: ['安葬'], hardSha: HARD_SHA_TA, sha: '喪事' }
      : { key: 'pai', name: '安奉歷代祖先牌位', yiWords: ['安香', '祭祀'], jiWords: ['安香'], jiSoft: ['祭祀'], hardSha: HARD_SHA_PAI };
  }

  function has(arr, words) { for (var i = 0; i < words.length; i++) if (arr.indexOf(words[i]) >= 0) return words[i]; return null; }
  function sameMember(arr, zhi) { return arr.indexOf(zhi) >= 0; }

  function makeEval(ctx) {
    var lv = ctx.sIdx;
    return function (bucket, layer, name, hit, tri, detail, weight) {
      // tri：[寬鬆,標準,嚴格]，x 忽略 s 提醒 h 排除
      var sev = tri[lv];
      var rec = { layer: layer, name: name, status: 'ok', detail: detail || '' };
      if (hit && sev !== 'x') {
        rec.status = sev === 'h' ? 'hard' : 'soft';
        rec.weight = weight || 1;
        if (sev === 'h') bucket.hard.push(rec); else bucket.soft.push(rec);
      } else if (hit) rec.status = 'ignored';
      bucket.checked.push(rec);
      return rec;
    };
  }

  function personText(p) { return (p.label || (p.role === 'dead' ? '亡者' : '參與者')) + '（屬' + ZODIAC[p.zhi] + '）'; }

  function evalDate(y, m, d, ctx) {
    var solar = L.Solar.fromYmd(y, m, d), lunar = solar.getLunar();
    var T = ctx.task, R = makeEval(ctx);
    var seat = ctx.seat;
    var dz = ZHI.indexOf(lunar.getDayZhi()), mz = ZHI.indexOf(lunar.getMonthZhi()), yz = ZHI.indexOf(lunar.getYearZhiByLiChun());
    var gz = lunar.getDayInGanZhi();
    var yi = lunar.getDayYi(), ji = lunar.getDayJi(), jishen = lunar.getDayJiShen(), xs = lunar.getDayXiongSha();
    var dayData = {
      ymd: solar.toYmd(), y: y, m: m, d: d, week: WEEK[solar.getWeek()], minguo: y - 1911,
      lunarText: lunar.getMonthInChinese() + '月' + lunar.getDayInChinese(),
      lunarMonth: Math.abs(lunar.getMonth()), lunarDay: lunar.getDay(),
      yearGz: lunar.getYearInGanZhiByLiChun(), monthGz: lunar.getMonthInGanZhi(), dayGz: gz,
      zhixing: lunar.getZhiXing(), xiu: lunar.getXiu(), xiuLuck: lunar.getXiuLuck(),
      tianshen: lunar.getDayTianShen(), tsType: lunar.getDayTianShenType(), tsLuck: lunar.getDayTianShenLuck(),
      chongDesc: lunar.getDayChongDesc(), sha: lunar.getDaySha(), jieqi: lunar.getJieQi(),
      yi: yi, ji: ji, jishen: jishen, xiongsha: xs
    };
    var B = { hard: [], soft: [], checked: [] };
    var yinfo = yearInfo(yearNumberOf(lunar, solar), yz);
    dayData.yearInfo = yinfo;
    var dead = ctx.persons.filter(function (p) { return p.role === 'dead'; });
    var join = ctx.persons.filter(function (p) { return p.role !== 'dead'; });
    var ta = T.key === 'ta';
    var X = 'x', S = 's', H = 'h';

    // ===== 年煞 =====
    if (seat) {
      R(B, '年', '座山犯三煞', sameMember(yinfo.sansha.zhi, seat.zuoZhi), [S, H, H], '今年（' + ZHI[yz] + '年）三煞在' + yinfo.sansha.dir + '方（' + yinfo.sansha.zhi.map(function (z) { return ZHI[z]; }).join('') + '），座' + seat.zuoName + '山落入三煞方');
      R(B, '年', '向首犯三煞', sameMember(yinfo.sansha.zhi, seat.xiangZhi), [X, S, H], '向' + seat.xiangName + '落入三煞方');
      R(B, '年', '座向犯太歲／歲破', seat.zuoZhi === yz || seat.zuoZhi === chong(yz) , [X, H, H], seat.zuoZhi === yz ? '座山坐太歲（向沖歲破）' : '座山坐歲破（向首對太歲）');
      R(B, '年', '座山臨五黃', seat.zuoPalace === yinfo.wuhuang, [X, S, H], '今年五黃在' + (PALACE_DIR[yinfo.wuhuang] || '中宮') + '方');
      R(B, '年', '向首臨五黃', seat.xiangPalace === yinfo.wuhuang, [X, S, S], '向首落入五黃方');
      R(B, '年', '座山臨二黑', seat.zuoPalace === yinfo.erhei, [X, S, S], '今年二黑在' + (PALACE_DIR[yinfo.erhei] || '中宮') + '方');
    }
    dead.forEach(function (p) {
      R(B, '年', '亡者沖歲破', p.zhi === chong(yz), [X, S, H], personText(p) + '與太歲（' + ZHI[yz] + '）相沖');
    });
    join.forEach(function (p) {
      var rel = relations(yz, p.zhi);
      R(B, '年', '參與者犯太歲', rel.indexOf('沖') >= 0 || rel.indexOf('同') >= 0, [X, S, S], personText(p) + (rel.indexOf('沖') >= 0 ? '沖太歲' : '值太歲') + '（建議事前安太歲／避免擔任主事）');
    });

    // ===== 月煞 =====
    R(B, '月', '月破日', dz === chong(mz), [H, H, H], '日支' + ZHI[dz] + '沖月建' + ZHI[mz]);
    var lm = Math.abs(lunar.getMonth()), ld = lunar.getDay();
    R(B, '月', '月忌日', ld === 5 || ld === 14 || ld === 23, [X, S, H], '農曆初五、十四、二十三為月忌日');
    var msan = sansha(mz);
    if (seat) {
      R(B, '月', '座山犯月三煞', sameMember(msan.zhi, seat.zuoZhi), [X, S, H], '本月三煞在' + msan.dir + '方，座山落入');
      R(B, '月', '向首犯月三煞', sameMember(msan.zhi, seat.xiangZhi), [X, X, S], '本月三煞在' + msan.dir + '方，向首落入');
      R(B, '月', '月建／月破臨座向', seat.zuoZhi === mz || seat.zuoZhi === chong(mz), [X, S, H], '座向與月建（' + ZHI[mz] + '）同軸');
    }
    var sea = Math.floor(((mz - 2 + 12) % 12) / 3);
    R(B, '月', '四廢日', SI_FEI[sea].indexOf(gz) >= 0, ta ? [S, H, H] : [S, S, H], '四時死氣之日');
    R(B, '月', '天轉地轉殺', gz === TIAN_ZHUAN[sea] || gz === DI_ZHUAN[sea], ta ? [S, H, H] : [X, S, H], '天轉／地轉殺日');
    var cj = (lunar.getNextJieQi() && lunar.getNextJieQi().getName()) || '';
    var tom = solar.next(1).getLunar().getJieQi();
    R(B, '月', '四絕日', ['立春', '立夏', '立秋', '立冬'].indexOf(tom) >= 0, [S, H, H], '四立前一日（' + tom + '前一日）');
    R(B, '月', '四離日', ['春分', '夏至', '秋分', '冬至'].indexOf(tom) >= 0, [S, H, H], '二分二至前一日（' + tom + '前一日）');
    var yang = false;
    for (var q = 0; q < YANG.length; q++) if (YANG[q][0] === lm && YANG[q][1] === ld) yang = true;
    R(B, '月', '楊公忌日', yang, [S, H, H], '楊公十三忌日');

    // ===== 日煞 =====
    dead.forEach(function (p) {
      R(B, '日', '日沖亡者', p.zhi === chong(dz), [H, H, H], personText(p) + '與日支' + ZHI[dz] + '相沖');
    });
    join.forEach(function (p) {
      R(B, '日', '日沖參與者', p.zhi === chong(dz), [S, H, H], personText(p) + '與日支' + ZHI[dz] + '相沖');
    });
    R(B, '日', '歲破日', dz === chong(yz), [S, H, H], '日支沖太歲');
    var dsha = dirToZhi(lunar.getDaySha());
    if (seat) {
      R(B, '日', '座山犯日煞', sameMember(dsha, seat.zuoZhi), [S, H, H], '日煞' + lunar.getDaySha() + '方，座山落入');
      R(B, '日', '向首犯日煞', sameMember(dsha, seat.xiangZhi), [X, S, H], '日煞' + lunar.getDaySha() + '方，向首落入');
      R(B, '日', '日沖座山', dz === seat.xiangZhi, [S, H, H], '日支' + ZHI[dz] + '沖座山');
      R(B, '日', '日沖向首', dz === seat.zuoZhi, [X, S, H], '日支' + ZHI[dz] + '沖向首');
    }
    var jiHit = has(ji, T.jiWords);
    R(B, '日', '日忌' + T.jiWords[0], !!jiHit, [H, H, H], '通書日忌：' + ji.join('、'));
    if (T.jiSoft) R(B, '日', '日忌祭祀', ji.indexOf('祭祀') >= 0, [X, S, H], '通書日忌：' + ji.join('、'));
    var yiHit = has(yi, T.yiWords);
    R(B, '日', '通書未載宜' + T.yiWords[0], !yiHit, [X, X, H], '當日宜：' + yi.join('、'));
    var hardNames = [];
    T.hardSha.forEach(function (n) { if (xs.indexOf(n) >= 0) hardNames.push(n); });
    R(B, '日', '重大凶煞', hardNames.length > 0 && !ta ? false : hardNames.length > 0, [S, H, H], hardNames.join('、'));
    if (!ta) {
      var soft2 = ['重日', '復日', '三喪'].filter(function (n) { return xs.indexOf(n) >= 0; });
      R(B, '日', '喪忌凶煞', soft2.length > 0, [X, S, H], soft2.join('、'));
    }
    var otherSha = xs.filter(function (n) { return SOFT_SHA.indexOf(n) >= 0 && T.hardSha.indexOf(n) < 0 && !(!ta && ['重日', '復日', '三喪'].indexOf(n) >= 0); });
    R(B, '日', '其他凶神', otherSha.length > 0, [S, S, S], otherSha.join('、'), Math.min(otherSha.length, 4) * 0.5);
    R(B, '日', '黑道日', dayData.tsType === '黑道', [X, S, H], dayData.tianshen + '黑道');
    join.concat(dead).forEach(function (p) {
      var rel = relations(dz, p.zhi).filter(function (x) { return x === '刑' || x === '害' || x === '破'; });
      R(B, '日', '日刑害破', rel.length > 0, [X, S, S], personText(p) + '與日支' + ZHI[dz] + '相' + rel.join('、'), 0.5);
    });

    // ===== 時煞 =====
    var times = lunar.getTimes();
    var hours = [];
    var any = false;
    for (var hi = 1; hi <= 11; hi++) {
      if (ctx.hours.indexOf(hi) < 0) continue;
      var t = times[hi];
      var H_ = { hard: [], soft: [], checked: [] };
      var tz = hi;
      dead.forEach(function (p) { R(H_, '時', '時沖亡者', p.zhi === chong(tz), [H, H, H], personText(p) + '與' + ZHI[tz] + '時相沖'); });
      join.forEach(function (p) { R(H_, '時', '時沖參與者', p.zhi === chong(tz), [S, H, H], personText(p) + '與' + ZHI[tz] + '時相沖'); });
      R(H_, '時', '日時相沖', tz === chong(dz), [X, S, H], ZHI[tz] + '時沖日支' + ZHI[dz]);
      var tsha = dirToZhi(t.getSha());
      if (seat) {
        R(H_, '時', '座山犯時煞', sameMember(tsha, seat.zuoZhi), [S, H, H], '時煞' + t.getSha() + '方，座山落入');
        R(H_, '時', '向首犯時煞', sameMember(tsha, seat.xiangZhi), [X, S, H], '時煞' + t.getSha() + '方，向首落入');
        R(H_, '時', '時沖座山', tz === seat.xiangZhi, [S, H, H], ZHI[tz] + '時沖座山');
        R(H_, '時', '時沖向首', tz === seat.zuoZhi, [X, S, H], ZHI[tz] + '時沖向首');
      }
      R(H_, '時', '黑道時', t.getTianShenType() === '黑道', [S, H, H], t.getTianShen() + '黑道');
      var tyi = t.getYi(), tji = t.getJi();
      R(H_, '時', '時忌' + T.jiWords[0], !!has(tji, T.jiWords), [X, S, H], '時忌：' + tji.join('、'));
      if (T.jiSoft) R(H_, '時', '時忌祭祀', tji.indexOf('祭祀') >= 0, [X, S, H], '時忌：' + tji.join('、'));
      var hscore = 50 + (t.getTianShenType() === '黃道' ? 20 : 0) + (has(tyi, T.yiWords) ? 15 : 0) - H_.soft.length * 8 - H_.hard.length * 40;
      var hv = H_.hard.length === 0;
      if (hv) any = true;
      hours.push({ idx: hi, name: ZHI[hi] + '時', range: HOUR_RANGE[hi], gz: t.getGanZhi(), tianshen: t.getTianShen(), tsType: t.getTianShenType(), chongDesc: t.getChongDesc(),
        sha: t.getSha(), yi: tyi, ji: tji, valid: hv, hard: H_.hard, soft: H_.soft, checked: H_.checked, score: hscore });
    }
    if (!any) B.noHour = true;

    // ===== 評分 =====
    var score = 60;
    if (dayData.tsType === '黃道') score += 8;
    var vir = jishen.filter(function (n) { return KEY_VIRTUE.indexOf(n) >= 0; });
    score += Math.min(vir.length * 3, 15);
    if (yiHit) score += 8;
    var goodZx = ta ? ['成', '開', '定', '閉'] : ['成', '開', '定', '滿', '收'];
    if (goodZx.indexOf(dayData.zhixing) >= 0) score += 4;
    B.soft.forEach(function (r) { score -= 3 * (r.weight || 1); });
    dead.concat(join).forEach(function (p) { if (isHe(dz, p.zhi) && dz !== p.zhi) score += 1; });
    score = Math.max(0, Math.min(100, Math.round(score)));
    var valid = B.hard.length === 0 && !B.noHour;
    var bestHours = hours.filter(function (h) { return h.valid; }).sort(function (a, b) { return b.score - a.score; });
    return { day: dayData, valid: valid, score: score, grade: score >= 82 ? '上吉' : score >= 70 ? '吉' : '可用', hard: B.hard, soft: B.soft, checked: B.checked, noHour: !!B.noHour,
      hours: hours, virtues: vir, yiHit: yiHit, bestHours: bestHours };
  }

  function search(opts) {
    var ctx = { task: task(opts.task), sIdx: STRICT[opts.strict == null ? 'std' : opts.strict], persons: opts.persons, seat: opts.seat, hours: opts.hours };
    var out = [];
    var cur = L.Solar.fromYmd(opts.from.y, opts.from.m, opts.from.d);
    var end = L.Solar.fromYmd(opts.to.y, opts.to.m, opts.to.d);
    var n = 0;
    while (cur.toYmd() <= end.toYmd() && n < 800) {
      out.push(evalDate(cur.getYear(), cur.getMonth(), cur.getDay(), ctx));
      cur = cur.next(1); n++;
    }
    return out;
  }

  return { ZHI: ZHI, GAN: GAN, ZODIAC: ZODIAC, SHAN: SHAN, HOUR_RANGE: HOUR_RANGE, PALACE_DIR: PALACE_DIR, PALACE_OF_SHAN: PALACE_OF_SHAN,
    profile: profile, hourFromTime: hourFromTime, seatInfo: seatInfo, shanFromDeg: shanFromDeg, yearInfo: yearInfo, yearNumberOf: yearNumberOf,
    evalDate: evalDate, search: search, task: task, relations: relations, chong: chong, sansha: sansha, L: L };
});
