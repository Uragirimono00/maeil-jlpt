// Build data.json: vocab, kanji, grammar with furigana markup "漢字{かんじ}"
const kuromoji = require('kuromoji');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const D = p => path.join(ROOT, 'data', p);
process.chdir(ROOT);

const K = '[\\u4e00-\\u9fff\\u3005\\u3006\\u30f6\\u30f5]';
const isK = c => new RegExp(K).test(c);
const kata2hira = s => (s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

// Align surface with hiragana reading -> segments [[text, ruby|null], ...]
function align(surface, reading) {
  reading = kata2hira(reading);
  if (![...surface].some(isK)) return [[surface, null]];
  const parts = surface.match(new RegExp(`${K}+|[^${K.slice(1, -1)}]+`, 'g'));
  const re = new RegExp('^' + parts.map(p => isK(p[0]) ? '(.+?)' : '(' + kata2hira(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')').join('') + '$');
  const m = reading.match(re);
  if (!m) return [[surface, reading]];
  return parts.map((p, i) => isK(p[0]) ? [p, m[i + 1]] : [p, null]);
}
const segStr = segs => segs.map(([t, r]) => r ? `${t}{${r}}` : t).join('');

// manual reading fixes for kuromoji
const FIX = { '今日': 'きょう', '一人': 'ひとり', '後': 'あと', '方': 'ほう' };

const POST = [['一{いち}人{にん}','一人{ひとり}'],['十{じゅう}一{いち}時{じ}','十一時{じゅういちじ}'],['今日{きょう}中{ちゅう}','今日中{きょうじゅう}'],['開{ひら}','開{あ}'],['説明{せつめい}書{しょ}','説明書{せつめいしょ}'],['日本{にっぽん}','日本{にほん}'],['三{さん}百{ひゃく}円{えん}','三百円{さんびゃくえん}'],['一{いち}日{にち}','一日{いちにち}'],['一{いち}週間{しゅうかん}','一週間{いっしゅうかん}'],['十{じゅう}四{よん}時間{じかん}','十四時間{じゅうよじかん}'],['一{いち}年{ねん}','一年{いちねん}'],['一{いち}時間{じかん}','一時間{いちじかん}'],['十{じゅう}時{じ}','十時{じゅうじ}'],['十{じゅう}年{ねん}','十年{じゅうねん}'],['三{さん}時間{じかん}','三時間{さんじかん}'],['二{に}時間{じかん}','二時間{にじかん}'],['四{よん}十{じゅう}二{に}','四十二{よんじゅうに}'],['二{に}度{ど}','二度{にど}']];
function main(tok) {
  // ---------- Sentences ----------
  function furi(sentence) {
    const plain = sentence.replace(/\[\[|\]\]/g, '');
    // marker positions in plain coordinates
    const marks = []; let pos = 0;
    for (let i = 0; i < sentence.length;) {
      if (sentence.startsWith('[[', i)) { marks.push([pos, '[[']); i += 2; }
      else if (sentence.startsWith(']]', i)) { marks.push([pos, ']]']); i += 2; }
      else { pos++; i++; }
    }
    const segs = [];
    for (const t of tok.tokenize(plain)) {
      let rd = t.reading && t.reading !== '*' ? t.reading : t.surface_form;
      if (FIX[t.surface_form] && t.pos === '名詞') rd = FIX[t.surface_form];
      if (t.surface_form === '何' && /^[でだのか]/.test('')) rd = 'なに';
      segs.push(...align(t.surface_form, rd));
    }
    // emit with markers
    let out = '', p = 0, mi = 0;
    for (const [t, r] of segs) {
      // markers that fall within or at start of this segment
      while (mi < marks.length && marks[mi][0] <= p) { out += marks[mi][1]; mi++; }
      if (!r) {
        // split plain text segment at marker positions
        let chunk = '';
        for (const ch of t) {
          while (mi < marks.length && marks[mi][0] === p) { out += chunk; chunk = ''; out += marks[mi][1]; mi++; }
          chunk += ch; p++;
        }
        out += chunk;
      } else { out += `${t}{${r}}`; p += t.length; }
    }
    while (mi < marks.length) { out += marks[mi][1]; mi++; }
    for (const [a, b] of POST) out = out.split(a).join(b);
    return out;
  }

  // ---------- Vocab ----------
  const raw = JSON.parse(fs.readFileSync(D('source/vocab_raw.json')));
  const ko = {};
  for (const f of fs.readdirSync(D('ko')).filter(f => f.startsWith('v'))) {
    for (const line of fs.readFileSync(D('ko/' + f), 'utf8').split('\n')) {
      const m = line.match(/^(\d+)\|(.+)$/); if (m) ko[+m[1]] = m[2].trim();
    }
  }
  const vocab = [];
  raw.forEach(([e, r, en], i) => {
    e = e.replace(/\s*\(かん\)/, '').replace(/^～/, '').split(';')[0].trim();
    r = r.replace(/\s*\(かん\)/, '').replace(/～/g, '').trim();
    if (!ko[i]) throw new Error('missing ko ' + i + ' ' + e);
    const toks = tok.tokenize(e);
    let pos = '명사';
    if (/^to /.test(en) && /[うくぐすつぬぶむる]$/.test(r)) pos = '동사';
    else if (toks.length === 1 && toks[0].pos === '形容詞') pos = 'い형용사';
    else if (/い$/.test(r) && toks[toks.length - 1].pos === '形容詞') pos = 'い형용사';
    else if (toks.length === 1 && toks[0].pos_detail_1 === '形容動詞語幹') pos = 'な형용사';
    else if (toks.length === 1 && toks[0].pos === '副詞') pos = '부사';
    else if (toks.length === 1 && toks[0].pos === '接続詞') pos = '접속사';
    else if (toks.length === 1 && toks[0].pos === '感動詞') pos = '감동사';
    else if (/^[゠-ヿ]+$/.test(e)) pos = '외래어';
    else if (/^[぀-ゟ]+$/.test(e) && toks.length === 1 && toks[0].pos === '副詞') pos = '부사';
    if (/^(ありがとう|おめでとう|こんにちは|ごめんなさい|すみません|いらっしゃい|いただきます|どうぞよろしく|よろしく|しまった|はあ)$/.test(e)) pos = '인사·감탄';
    vocab.push({ i, w: e, r, f: segStr(align(e, r)), k: ko[i], p: pos });
  });
  // manual POS tweaks
  const NA = ['明らか', '新た', '哀れ', '意外', '異常', '意地悪', '偉大', '穏やか', 'お洒落', '快適', '確実', '可能', '完全', '乾燥', '気の毒', '奇妙', '器用', '急激', '急速', '貴重', '巨大', '強力', '具体', '豪華', '幸運', '高価', '公正', '公平', '幸福', '困難', '最高', '最低', '様々', '幸せ', '自然', '親しい', '地味', '重大', '重要', '順調', '上等', '正直', '真剣', '深刻', '新鮮', '慎重', '贅沢', '清潔', '正確', '精巧', '正式', '絶対', '粗末', '相当', '退屈', '大した', '平ら', '単純', '適切', '適度', '典型', '得意', '独特', '同様', '派手', '必死', '非常', '微妙', '平等', '不安', '不思議', '不自由', '不正', '不満', '不利', '豊富', '本当', '真っ赤', '見事', '妙', '無駄', '夢中', '明確', '迷惑', '面倒', '厄介', '優秀', '有能', '有利', '有効', '愉快', '豊か', '容易', '陽気', '余分', '楽', '利口', '冷静', '僅か', 'わがまま', '可愛そう', '大人しい', '素敵', 'すてき', '確か', 'たしか', '苦手', '莫大', '唯一', '密', '粋', '盛ん', '急', '自由'];
  const ADV = ['相変わらず', 'あいにく', '案外', '一度に', '一層', '一体', 'いつか', 'いつでも', 'いつのまにか', 'いつまでも', '今に', '今にも', '言わば', 'うっかり', '大いに', '恐らく', '主に', '思わず', 'およそ', 'かなり', '必ずしも', 'きちんと', '急に', '偶然', 'ぐっすり', '結局', '極', '幸い', '更に', 'ざっと', 'しきりに', 'しばしば', '直に', '直', '実に', '実は', 'じっと', '徐々に', '少しも', '既に', 'ずっと', '全て', 'すくなくとも', '精々', '絶対', '相当', 'そっくり', 'そっと', 'そのうち', 'そのまま', 'それぞれ', 'たしか', '多少', 'ただ', '直ちに', 'たった', 'たっぷり', 'たとえ', 'たびたび', '偶々', '単に', 'ちゃんと', '遂に', '次々', '常に', 'つまり', 'できれば', '突然', 'とにかく', '共に', 'どうしても', 'どんなに', 'なお', '何とか', '何でも', 'にっこり', 'のんびり', 'ばったり', 'ぴったり', 'ふと', '再び', '普段', '別に', 'ほっと', 'ほぼ', 'ぼんやり', '前もって', 'まさか', 'まさに', 'ますます', '全く', 'まるで', '万一', '滅多に', 'もしかすると', 'もしも', 'やがて', 'やや', '要するに', 'わざと', '寧ろ', 'あんなに', 'あんまり', 'こんなに', 'あちこち', '一時', '一瞬', '一生', '至急', 'さっぱり', '大半', '少々', 'ことによると', '依然'];
  const CONJ = ['あるいは', 'しかも', 'したがって', 'すなわち', 'そこで', 'そして', 'そのうえ', 'それでも', 'それと', 'それとも', 'だが', 'だけど', 'だって', 'ですから', 'ところが', 'ところで', 'なぜなら', 'さて', 'と'];
  for (const v of vocab) {
    if (v.p === '동사') continue;
    if (CONJ.includes(v.w)) v.p = '접속사';
    else if (ADV.includes(v.w)) v.p = '부사';
    else if (NA.includes(v.w) && !/い$/.test(v.r) || ['大した'].includes(v.w)) v.p = 'な형용사';
  }
  ['親しい', '大人しい'].forEach(w => vocab.filter(v => v.w === w).forEach(v => v.p = 'い형용사'));

  // ---------- Kanji ----------
  const kraw = JSON.parse(fs.readFileSync(D('source/kanji_raw.json')));
  const kko = {};
  fs.readFileSync(D('ko/kanji.txt'), 'utf8').split('\n').forEach(l => { const [a, b] = l.split('|'); if (b) kko[a] = b.trim(); });
  const kanji = kraw.map(([c, s, on, kun]) => {
    if (!kko[c]) throw new Error('missing kanji ko ' + c);
    const ex = vocab.filter(v => v.w.includes(c)).sort((a, b) => a.w.length - b.w.length).slice(0, 5).map(v => v.i);
    return { c, s, on: on.map(kata2hira), kun: kun.map(k => k.replace(/^-|-$/g, '').replace(/\.(.+)$/, '($1)')), h: kko[c], ex };
  });

  // ---------- Grammar ----------
  const grammar = [];
  for (const f of fs.readdirSync(D('grammar')).filter(f => f.endsWith('.txt')).sort()) {
    let cur = null;
    for (const line of fs.readFileSync(D('grammar/' + f), 'utf8').split('\n')) {
      if (line.startsWith('## ')) { cur = { t: line.slice(3).trim(), s: [] }; grammar.push(cur); }
      else if (line.startsWith('M: ')) cur.m = line.slice(3).trim();
      else if (line.startsWith('C: ')) cur.c = line.slice(3).trim();
      else if (line.startsWith('E: ')) cur.e = line.slice(3).trim();
      else if (line.startsWith('S: ')) { const [jp, k] = line.slice(3).split('|'); cur.s.push({ j: furi(jp.trim()), k: k.trim() }); }
    }
  }
  grammar.forEach((g, i) => { g.id = i; g.cf = furi(g.c.replace(/[{}]/g, '')); });

  const KD = JSON.parse(fs.readFileSync(D('source/kanji-data.json')));
  const score = v => { const f = [...v.w].filter(isK).map(c => (KD[c] && KD[c].freq) || 2600); return f.length ? Math.max(...f) : (v.p === '외래어' ? 1200 : 900); };
  vocab.forEach(v => v.sc = score(v));
  const ord = [...vocab].sort((a, b) => a.sc - b.sc || a.i - b.i);
  ord.forEach((v, n) => v.o = n); vocab.forEach(v => delete v.sc);
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'build/data.json'), JSON.stringify({ vocab, kanji, grammar }));
  const cnt = {}; vocab.forEach(v => cnt[v.p] = (cnt[v.p] || 0) + 1);
  console.log('vocab', vocab.length, cnt, 'kanji', kanji.length, 'grammar', grammar.length, grammar.reduce((a, g) => a + g.s.length, 0), 'sentences');
  // alignment failures (whole-word ruby for mixed words)
  const bad = vocab.filter(v => /[぀-ゟ]/.test(v.w) && /[一-鿿]/.test(v.w) && v.f === `${v.w}{${v.r}}`);
  console.log('align fail', bad.map(v => v.w + ':' + v.r).join(' '));
}

kuromoji.builder({ dicPath: path.join(ROOT, 'node_modules/kuromoji/dict') }).build((err, tok) => { if (err) throw err; main(tok); });
