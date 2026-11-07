/* Sổ chi tiêu & Quẹt thẻ nào
   Dữ liệu nằm trong máy (localStorage). Sao lưu: file SoChiTieu.json trên OneDrive (Lưu vào Tệp), giống app bánh bao.
   Không lưu số thẻ, CVV, OTP, số tài khoản. */
'use strict';
const APP_VERSION = '1.4.0';

/* ---------- tiện ích ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad = n => String(n).padStart(2, '0');
const fmt = n => (n < 0 ? '-' : '') + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const short = n => { const a = Math.abs(n); const s = a >= 1e6 ? (Math.round(a / 1e5) / 10).toString().replace('.', ',') + 'tr' : a >= 1000 ? Math.round(a / 1000) + 'k' : String(Math.round(a)); return (n < 0 ? '-' : '') + s; };
const pct = r => (Math.round(r * 10000) / 100).toString().replace('.', ',') + '%';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const digits = s => parseInt(String(s == null ? '' : s).replace(/\D/g, ''), 10) || 0;
const clone = o => JSON.parse(JSON.stringify(o));
const newUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowIso = () => new Date().toISOString();
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dm = s => { const d = parseYmd(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const mdy = s => `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(2, 4)}`;   // MM/dd/yy, dùng ở Kế hoạch tháng
const dmy = s => { const d = parseYmd(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
const monthKey = s => s.slice(0, 7);
const addMonths = (mk, n) => { let [y, m] = mk.split('-').map(Number); m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}-${pad(m)}`; };
const daysInMonth = mk => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const dateIn = (mk, day) => `${mk}-${pad(Math.max(1, Math.min(day, daysInMonth(mk))))}`;
const mLabel = mk => `T${+mk.slice(5)}/${mk.slice(0, 4)}`;
const TODAY = () => ymd(new Date());
const WD = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const unaccent = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const norm = t => ' ' + String(t || '').toLowerCase().replace(/[.,!?;:()"]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const deepMerge = (a, b) => { if (!b || typeof b !== 'object') return a; for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], b[k]); else a[k] = b[k]; } return a; };

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800); }

/* ---------- danh mục ---------- */
const GROUPS = ['Đi chợ – siêu thị', 'Ăn uống ngoài', 'Con – học tập', 'Con – sinh hoạt', 'Y tế – thuốc', 'Bảo hiểm', 'Hóa đơn nhà', 'Đi lại – xe', 'Mua sắm', 'Thuê bao online', 'Trả nợ', 'Hiếu hỉ – biếu tặng', 'Giải trí – du lịch', 'Kinh doanh bánh', 'Khác'];
const BIZ = 'Kinh doanh bánh';
const METHODS = {
  sup: { name: 'Supreme', img: 'card', type: 'Tín dụng' },
  eve: { name: 'Everyday', img: 'card', type: 'Tín dụng' },
  eco: { name: 'Eco', img: 'card', type: 'Ghi nợ' },
  ck: { name: 'Chuyển khoản/QR', img: 'wallet', type: '' },
  cash: { name: 'Tiền mặt', img: 'cash', type: '' }
};
const CARDS3 = ['sup', 'eve', 'eco'];
const isCard = m => CARDS3.includes(m);
// nhóm hoàn tiền / MCC
const KINDS = {
  tmdt: 'Sàn TMĐT online (5262)', dienmay: 'Điện máy (5732/5722)', giaoduc: 'Giáo dục', nhasach: 'Nhà sách',
  benhvien: 'Bệnh viện (8011/8062/8099)', baohiem: 'Bảo hiểm (6300/5960)', sieuthi: 'Siêu thị, tiện lợi (5411)',
  thuoc: 'Nhà thuốc (5912)', tiem: 'Tiêm chủng (5912 hay 8011?)', dien: 'Tiền điện (4900)',
  sub_usd: 'Thuê bao USD (5734/5817)', sub_vnd: 'Thuê bao (5815–5818)', khac: 'Khác', none: 'Không quẹt thẻ'
};
const pill = m => `<span class="pill m-${m}">${METHODS[m] ? METHODS[m].name : 'Tự chọn'}</span>`;
const img = n => `img/${n}.jpg`;

/* ---------- quy định thẻ mặc định (cập nhật bằng mã #QUYDINH) ---------- */
const DEFAULT_RULES = {
  sup: { rates: { tmdt: .12, dienmay: .12, giaoduc: .12, nhasach: .12, benhvien: .06, baohiem: .06 }, base: .003, min: 3e6, cap: 3e5, high: 15e6, capHigh: 1e6, fx: .029, expiry: '', updated: '2026-11-07' },
  eve: { online: .05, intl: .08, minTx: 2e5, cap: 5e5, capHigh: 7e5, high: 3e7, fx: .0295, excl: ['dien', 'sub_vnd'], expiry: '2026-12-31', updated: '2026-11-07' },
  eco: { updated: '2026-11-07' },
  inspire: { expiry: '2027-03-10' }
};
// Ngày chốt / hạn trả Jasmine báo (07/11/2026): Supreme chốt 5 trả 20 cùng tháng · Everyday chốt 20 trả 5 tháng sau
const DEFAULT_CARDS = {
  sup: { limit: 0, closeDay: 5, dueDay: 20, openDate: '', fee: 550000, feeWaive: 55e6, confirmed: true },
  eve: { limit: 0, closeDay: 20, dueDay: 5, openDate: '', fee: 599000, feeWaive: 150e6, confirmed: true },
  eco: { openDate: '', confirmed: true }
};
const DEFAULT_ITEMS = [
  { id: 'dai1', name: 'Dai-ichi – hợp đồng 1', sched: 'quarterly', months: [1, 4, 7, 10], day: 10, method: 'sup', kind: 'baohiem', chan: 'online', group: 'Bảo hiểm', hint: 5400000, text: 'nộp bảo hiểm Dai-ichi' },
  { id: 'dai2', name: 'Dai-ichi – hợp đồng 2', sched: 'quarterly', months: [2, 5, 8, 11], day: 10, method: 'sup', kind: 'baohiem', chan: 'online', group: 'Bảo hiểm', hint: 5400000, text: 'nộp bảo hiểm Dai-ichi' },
  { id: 'dien', name: 'Tiền điện', sched: 'monthly', months: [], day: 12, method: 'sup', kind: 'dien', chan: 'online', group: 'Hóa đơn nhà', hint: 1000000, note: 'qua cổng EVN, không dùng Bill Payment', text: 'tiền điện EVN' },
  { id: 'claude', name: 'Claude AI (USD)', sched: 'monthly', months: [], day: 5, method: 'eve', kind: 'sub_usd', chan: 'online', group: 'Thuê bao online', hint: 570000, text: 'Claude AI' },
  { id: 'yt', name: 'YouTube Premium', sched: 'monthly', months: [], day: 18, method: 'sup', kind: 'sub_vnd', chan: 'online', group: 'Thuê bao online', hint: 165000, text: 'YouTube Premium' },
  { id: 'shopee', name: 'Shopee (ước tính)', sched: 'monthly', months: [], day: 0, method: 'auto', kind: 'tmdt', chan: 'online', group: 'Mua sắm', hint: 1000000, note: 'app tự chọn: Everyday khi có Dai-ichi, Supreme 12% tháng nghỉ', text: 'Shopee' },
  { id: 'win', name: 'WinMart+ (ước tính)', sched: 'monthly', months: [], day: 0, method: 'sup', kind: 'sieuthi', chan: 'quay', group: 'Đi chợ – siêu thị', hint: 1000000, text: 'WinMart+' },
  { id: 'thuoc', name: 'Thuốc Long Châu (ước tính)', sched: 'monthly', months: [], day: 0, method: 'eve', kind: 'thuoc', chan: 'online', group: 'Y tế – thuốc', hint: 500000, text: 'thuốc Long Châu' },
  { id: 'tiem', name: 'Tiêm chủng Long Châu', sched: 'once', months: [], day: 0, method: 'sup', kind: 'tiem', chan: 'quay', group: 'Y tế – thuốc', hint: 1000000, text: 'tiêm chủng Long Châu' },
  { id: 'vcb', name: 'Trả nợ Vietcombank', sched: 'monthly', months: [], day: 25, method: 'ck', kind: 'none', chan: 'online', group: 'Trả nợ', hint: 4000000, text: 'trả nợ vay ô tô Vietcombank' },
  { id: 'hocphi', name: 'Học phí của con', sched: 'once', months: [], day: 0, method: 'ck', kind: 'none', chan: 'online', group: 'Con – học tập', hint: 0, text: 'học phí' }
];
// Quy luật lặp: "Chép từ tháng trước" lấy khoản theo tháng của tháng trước, theo quý của 3 tháng trước, theo năm của 12 tháng trước
const SCHED = { monthly: 'Tháng', quarterly: 'Quý', yearly: 'Năm', once: 'Một lần' };
const PERIOD = { monthly: 1, quarterly: 3, yearly: 12 };
const monthsBetween = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5) - +a.slice(5));
// Đổi sang cách lưu mới: mỗi tháng chỉ có những khoản đã chép / đã thêm vào tháng đó
function migratePlan(s) {
  if (s.plan.v === 2) return;
  const cur = monthKey(TODAY()), m = +cur.slice(5);
  const ent = s.plan.entries[cur] = s.plan.entries[cur] || {};
  for (const it of s.plan.items) {
    if (it.sched === 'term') it.sched = 'once';
    const activeNow = it.sched === 'monthly' || (it.sched === 'quarterly' && (it.months || []).includes(m));
    if (it.sched === 'quarterly' && !it.anchor) { let mk = cur; for (let i = 0; i < 12 && !(it.months || []).includes(+mk.slice(5)); i++) mk = addMonths(mk, -1); it.anchor = mk; }
    if (it.sched === 'monthly' && !it.anchor) it.anchor = cur;
    if (activeNow && !ent[it.id]) ent[it.id] = { amt: 0, day: it.day || 0 };
  }
  s.plan.v = 2;
}

/* ---------- dữ liệu ---------- */
const KEY = 'sct.v1';
const FILE = 'SoChiTieu.json';
function seed() {
  return {
    v: 1, firstAt: nowIso(), tx: [], deleted: {},
    plan: { items: clone(DEFAULT_ITEMS), entries: {}, buys: [] },
    cards: clone(DEFAULT_CARDS), rules: clone(DEFAULT_RULES), merchants: {}, actual: {}, stmts: {},
    settings: { vibe: 'noel', palette: null, saveRemind: false, names: [] },
    cfgAt: nowIso(), changedAt: null, exportedAt: null, importedAt: null
  };
}
function fixup(s) {
  const d = seed();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.rules = deepMerge(clone(DEFAULT_RULES), s.rules);
  s.cards = deepMerge(clone(DEFAULT_CARDS), s.cards);
  s.settings = deepMerge(clone(d.settings), s.settings);
  s.plan.items = s.plan.items || []; s.plan.entries = s.plan.entries || {}; s.plan.buys = s.plan.buys || [];
  migratePlan(s);
  // bản 1.4.0: ghi ngày chốt/hạn trả thật của hai thẻ một lần (Jasmine đổi được ở trang Nguyên tắc)
  if (!s.cardDays2) {
    Object.assign(s.cards.sup, { closeDay: 5, dueDay: 20, confirmed: true });
    Object.assign(s.cards.eve, { closeDay: 20, dueDay: 5, confirmed: true });
    s.cardDays2 = true; s.cfgAt = nowIso();
  }
  return s;
}
let S = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return fixup(s); } catch (e) {} const s = seed(); migratePlan(s); return s; })();
function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Không lưu được vào máy. Hãy Lưu lên OneDrive ngay.'); } }
function save(cfg) { S.changedAt = nowIso(); if (cfg) S.cfgAt = S.changedAt; persist(); renderSyncDot(); }
persist();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- kỳ sao kê ---------- */
// kỳ sao kê chứa ngày `date` của thẻ `card` (theo ngày chốt)
function stmtPeriod(card, date) {
  const c = (S.cards[card] && S.cards[card].closeDay) || 20;
  const d = parseYmd(date);
  const mk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const endMk = d.getDate() <= Math.min(c, daysInMonth(mk)) ? mk : addMonths(mk, 1);
  const end = dateIn(endMk, c);
  const start = addDays(dateIn(addMonths(endMk, -1), c), 1);
  return { card, key: `${card}:${end}`, start, end };
}
// kỳ tính hoàn tiền: Supreme theo kỳ sao kê, Everyday theo tháng dương lịch
function cashPeriod(card, date) {
  if (card === 'sup') return stmtPeriod('sup', date);
  const mk = monthKey(date);
  return { card, key: `${card}:${mk}`, start: `${mk}-01`, end: dateIn(mk, 31), mk };
}
// Ngày phải trả của một kỳ sao kê: ngày đến hạn đầu tiên SAU ngày chốt.
// VD chốt 05, hạn 20 → cùng tháng (chốt 05/11, trả 20/11); chốt 20, hạn 05 → tháng sau (chốt 20/11, trả 05/12).
function dueOf(p, dueDay) {
  const mk = monthKey(p.end);
  const same = dateIn(mk, dueDay);
  return same > p.end ? same : dateIn(addMonths(mk, 1), dueDay);
}
const shiftPeriod = (p, n) => p.card === 'sup' ? stmtPeriod('sup', n < 0 ? addDays(p.start, -1) : addDays(p.end, 1)) : cashPeriod(p.card, n < 0 ? addDays(p.start, -1) : addDays(p.end, 1));
const pLabel = p => `${dm(p.start)}–${dm(p.end)}`;

/* ---------- phân loại câu nhập ---------- */
const WORDNUM = { 'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10 };
function parseAmount(s) {
  let m = s.match(/(\d+(?:[.,]\d+)?)\s*(tr|triệu|củ)\s*(\d{0,3})(?!\d)/);
  if (m) { let v = parseFloat(m[1].replace(',', '.')) * 1e6; if (m[3]) v += parseInt(m[3], 10) * Math.pow(10, 6 - m[3].length); return { v: Math.round(v), raw: m[0] }; }
  m = s.match(/(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn)(?![a-zà-ỹ])/);
  if (m) return { v: Math.round(parseFloat(m[1].replace(',', '.')) * 1000), raw: m[0] };
  m = s.match(/\d{1,3}(?:\.\d{3})+|\d{4,}/);
  if (m) return { v: parseInt(m[0].replace(/\./g, ''), 10), raw: m[0] };
  m = s.match(/(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s+(chục|trăm)/);
  if (m) return { v: WORDNUM[m[1]] * (m[2] === 'chục' ? 10000 : 100000), raw: m[0] };
  return null;
}
// [từ khóa, nhóm, loại hoàn, cách: 'swipe' | 'ck' | 'cash' | 'ask', kênh]
const RULES = [
  [['điện máy xanh', 'thế giới di động', 'tgdd', 'fpt shop', 'nguyễn kim', 'tủ lạnh', 'máy giặt', 'điều hòa', 'tivi', 'laptop', 'điện thoại mới'], 'Mua sắm', 'dienmay', 'swipe', 'quay'],
  [['shopee', 'tiktok', 'tiktok shop', 'lazada', 'tiki'], null, 'tmdt', 'swipe', 'online'],
  [['dai-ichi', 'daiichi', 'dai ichi', 'dai-ichi life', 'bảo hiểm'], 'Bảo hiểm', 'baohiem', 'swipe', 'online'],
  [['google youtube', 'youtube premium'], 'Thuê bao online', 'sub_vnd', 'swipe', 'online'],
  [['claude'], 'Thuê bao online', 'sub_usd', 'swipe', 'online'],
  [['youtube'], 'Thuê bao online', 'sub_vnd', 'swipe', 'online'],
  [['vinmec', 'viện phí', 'bệnh viện'], 'Y tế – thuốc', 'benhvien', 'swipe', 'quay'],
  [['tiêm', 'tiêm chủng'], 'Y tế – thuốc', 'tiem', 'swipe', 'quay'],
  [['thuốc', 'long châu'], 'Y tế – thuốc', 'thuoc', 'swipe', 'online'],
  [['winmart', 'winmart+', 'bách hóa xanh', 'bhx', 'coop', 'co op', 'co-op', 'circle k', 'gs25', 'aeon'], 'Đi chợ – siêu thị', 'sieuthi', 'swipe', 'quay'],
  [['nhà sách', 'fahasa'], 'Con – học tập', 'nhasach', 'swipe', 'quay'],
  [['tiền điện', 'evn'], 'Hóa đơn nhà', 'dien', 'swipe', 'online'],
  [['vay', 'trả nợ', 'vietcombank', 'vcb'], 'Trả nợ', 'none', 'ck'],
  [['học phí', 'sách vở', 'năng khiếu', 'học thêm'], 'Con – học tập', 'none', 'ck'],
  [['làm bánh', 'nguyên liệu', 'bao bì', 'bột', 'hộp bánh', 'túi bánh'], BIZ, 'none', 'ck'],
  [['sữa', 'bỉm', 'tã', 'đồ chơi'], 'Con – sinh hoạt', 'khac', 'ask', 'quay'],
  [['chợ cóc'], 'Đi chợ – siêu thị', 'none', 'cash'],
  [['chợ', 'rau', 'thịt', 'cá', 'trứng', 'hoa quả', 'trái cây'], 'Đi chợ – siêu thị', 'none', 'ck'],
  [['bánh mì', 'cà phê', 'cafe', 'phở', 'bún', 'cơm', 'quán', 'trà sữa', 'trà đá', 'trà chanh', 'ăn sáng', 'ăn trưa', 'ăn tối', 'xôi', 'bánh cuốn'], 'Ăn uống ngoài', 'none', 'ck'],
  [['nước', 'internet', 'mạng', 'wifi', 'gas', 'cước'], 'Hóa đơn nhà', 'none', 'ck'],
  [['xăng', 'gửi xe', 'rửa xe', 'bảo dưỡng', 'phí đường'], 'Đi lại – xe', 'khac', 'ask', 'quay'],
  [['đám cưới', 'cưới', 'mừng', 'biếu', 'quà', 'lì xì'], 'Hiếu hỉ – biếu tặng', 'none', 'ck'],
  [['du lịch', 'khách sạn', 'vé', 'xem phim'], 'Giải trí – du lịch', 'khac', 'ask', 'online']
];
function classify(text) {
  const s = norm(text);
  // cửa hàng Jasmine đã dạy app (tên dài trước)
  const names = Object.keys(S.merchants).sort((a, b) => b.length - a.length);
  for (const n of names) {
    if (n && s.includes(' ' + n + ' ')) { const m = S.merchants[n]; return { group: m.group || 'Khác', kind: m.kind || 'khac', mode: m.kind === 'none' ? 'ck' : 'swipe', chan: m.chan || 'quay', merchant: n, confirmed: !!m.confirmed }; }
  }
  // lượt 1: khớp có dấu (câu Jasmine gõ); lượt 2: khớp không dấu (tên cửa hàng trên sao kê, VD "BACH HOA XANH")
  for (const strip of [false, true]) {
    const t = strip ? unaccent(s) : s;
    for (const r of RULES) {
      if (r[0].some(k => t.includes(' ' + (strip ? unaccent(k) : k) + ' '))) {
        let g = r[1];
        if (!g) g = /( sữa | bỉm | tã | đồ chơi | sua | bim | do choi )/.test(t) ? 'Con – sinh hoạt' : 'Mua sắm';
        return { group: g, kind: r[2], mode: r[3], chan: r[4] || 'quay' };
      }
    }
  }
  return { group: 'Khác', kind: 'khac', mode: 'unknown', chan: 'quay' };
}

/* ---------- tính hoàn tiền ---------- */
// Danh sách chi bằng thẻ: khoản đã ghi + khoản kế hoạch chưa trả (tùy chọn)
function txSpends() {
  return S.tx.filter(t => isCard(t.method)).map(t => ({ date: t.date, amt: t.amount, method: t.method, kind: t.kind || 'khac', chan: t.chan || 'quay', inst: !!t.inst, ref: 'tx:' + t.uid }));
}
let PROJ = [];
function spendsIn(card, p, opt) {
  opt = opt || {};
  let list = txSpends();
  // kế hoạch chỉ tính phần CHƯA thấy trong sổ (remain), nên khoản đã ghi thật không bị cộng trùng.
  // opt.cut: khoản đang gõ (chưa lưu) lấp vào dòng kế hoạch nào → trừ trước phần đó, không cộng trùng.
  const cut = opt.cut;
  if (opt.plan) list = list.concat(PROJ.filter(r => isCard(r.method)).map(r => ({ date: r.date, amt: r.remain - (cut && cut.ref === r.ref ? cut.amt : 0), method: r.method, kind: r.kind, chan: r.chan, inst: !!r.inst, ref: r.ref })).filter(x => x.amt > 0));
  return list.filter(x => x.method === card && x.date >= p.start && x.date <= p.end && x.ref !== opt.exclude);
}
function supRate(kind) { const R = S.rules.sup; return R.rates[kind] != null ? R.rates[kind] : R.base; }
function eveRate(x) {
  const R = S.rules.eve;
  if (R.excl.includes(x.kind) || x.chan !== 'online' || x.amt < R.minTx || x.kind === 'none') return 0;
  return x.kind === 'sub_usd' ? R.intl : R.online;
}
function supEst(list) {
  const R = S.rules.sup; let T = 0, raw = 0;
  for (const x of list) { if (x.inst) continue; T += x.amt; raw += x.amt * supRate(x.kind); }
  if (T < R.min) return { T, est: T * R.base, cap: 0, raw };
  const cap = T >= R.high ? R.capHigh : R.cap;
  return { T, est: Math.min(raw, cap), cap, raw };
}
function eveEst(list) {
  const R = S.rules.eve; let T = 0, raw = 0;
  for (const x of list) { if (x.inst) continue; T += x.amt; raw += x.amt * eveRate(x); }
  const cap = T >= R.high ? R.capHigh : R.cap;
  return { T, est: Math.min(raw, cap), cap, raw };
}
const estFor = (card, list) => card === 'sup' ? supEst(list) : card === 'eve' ? eveEst(list) : { T: list.reduce((s, x) => s + x.amt, 0), est: 0, cap: 0, raw: 0 };
// Tiền hoàn thêm nếu trả khoản x bằng thẻ `card` (đã tính khoản kế hoạch, trần, mốc, phí ngoại tệ)
function gain(card, x) {
  const p = cashPeriod(card, x.date);
  const base = spendsIn(card, p, { plan: true, exclude: x.ref, cut: x.cut });
  const a = estFor(card, base), b = estFor(card, base.concat([Object.assign({ method: card }, x)]));
  const fee = x.kind === 'sub_usd' && card !== 'eco' ? x.amt * (S.rules[card].fx || 0) : 0;
  return { m: card, p, a, b, cash: b.est - a.est - fee, fee };
}
function why(g, x) {
  const R = S.rules;
  if (g.m === 'sup') {
    const r = supRate(x.kind);
    if (x.inst) return 'trả góp: mất toàn bộ điểm';
    if (g.b.T < R.sup.min) return `kỳ ${pLabel(g.p)} dưới ${short(R.sup.min)}: chỉ ${pct(R.sup.base)}`;
    if (x.kind === 'tiem') return 'MCC chưa chắc (5912 hay 8011)';
    if (r > R.sup.base) {
      if (g.cash < 1) return `${pct(r)} nhưng trần kỳ ${pLabel(g.p)} đã dùng hết`;
      if (g.b.cap > g.a.cap && g.a.T >= R.sup.min) return `${pct(r)} · đưa kỳ lên ≥${short(R.sup.high)}, trần mở ${short(R.sup.capHigh)}`;
      return `${pct(r)} · kỳ ${pLabel(g.p)} còn ${short(Math.max(0, g.b.cap - g.a.est))} trần`;
    }
    return `${pct(R.sup.base)} · giúp đạt ${short(S.cards.sup.feeWaive)}/năm miễn phí thường niên`;
  }
  if (g.m === 'eve') {
    if (R.eve.excl.includes(x.kind)) return 'MCC tiện ích/dịch vụ số có thể bị loại trừ';
    if (x.chan !== 'online') return 'quẹt tại quầy gần như 0';
    if (x.amt < R.eve.minTx) return `đơn dưới ${short(R.eve.minTx)} không được hoàn`;
    if (g.cash < 1) return 'trần tháng đã dùng hết';
    if (x.kind === 'sub_usd') return `${pct(R.eve.intl)} online quốc tế, trừ phí ngoại tệ ${pct(R.eve.fx)}`;
    return `${pct(R.eve.online)} online · trần tháng còn ${short(Math.max(0, g.b.cap - g.a.est))}`;
  }
  return 'thẻ ghi nợ, không có hoàn cố định';
}
function rank(x, cards) {
  return (cards || CARDS3).map(c => { const g = gain(c, x); g.why = why(g, x); return g; })
    .sort((a, b) => (b.cash - a.cash) || ((a.m === 'sup' ? -1 : 1) - (b.m === 'sup' ? -1 : 1)));
}

/* ---------- kế hoạch tháng ---------- */
function rowsFor(mk) {
  const ent = S.plan.entries[mk] || {}, out = [];
  for (const it of S.plan.items) {
    const e = ent[it.id];
    if (!e) continue;   // tháng chỉ có khoản đã chép / đã thêm
    const day = (e.day != null ? e.day : it.day) || 0;
    out.push({ ref: `plan:${mk}:${it.id}`, mk, id: it.id, item: it, e, amt: e ? (e.amt || 0) : 0, day, date: dateIn(mk, day || 15),
      method: (e && e.method) || it.method, chosen: (e && e.method) || it.method, kind: it.kind, chan: it.chan || 'online', group: it.group });
  }
  for (const b of S.plan.buys) {
    if (b.month !== mk) continue;
    out.push({ ref: 'buy:' + b.id, mk, id: 'buy:' + b.id, buy: b, item: { name: b.name, sched: 'buy', hint: b.amt }, amt: b.amt, day: +b.date.slice(8), date: b.date,
      method: b.method, chosen: b.method, kind: b.kind, chan: b.chan, group: 'Mua sắm', inst: b.pay === 'installment' });
  }
  return out;
}
/* ---------- tự khớp khoản thật (Nhập liệu / sao kê) với khoản kế hoạch ----------
   Mỗi dòng kế hoạch là một "chỗ giữ trước"; khoản thật vào thì lấp chỗ đó, app chỉ tính chỗ còn trống.
   Khoản có nhóm hoàn rõ (bảo hiểm, tiền điện, Shopee, siêu thị, thuốc…) khớp theo nhóm hoàn.
   Khoản chuyển khoản / khác khớp theo tên (VD "Vietcombank"), hoặc cùng nhóm chi và số tiền gần bằng.
   Hai kiểu dòng (tự suy từ ô ngày đóng, không cần hỏi):
   - Hóa đơn (có ngày đóng, hoặc Quý/Năm/Một lần, Dự định mua): trả 1 lần là xong, nhận 1 khoản thật,
     khớp được cả khoản trả sớm/muộn trong ±15 ngày quanh ngày đóng (ưu tiên cùng tháng).
   - Ước tính (theo tháng, không có ngày: Shopee, WinMart, thuốc): cộng dồn nhiều khoản trong tháng. */
const isBill = r => !!r.buy || r.item.sched !== 'monthly' || (r.day || 0) > 0;
const NEAR_DAYS = 15;
// dòng r có nhận khoản thật t không (ngày + loại); `filled`: hóa đơn đã có khoản thật thì không nhận thêm
function fitsRow(r, t, filled) {
  if (!matchesRow(r, t)) return false;
  const same = monthKey(t.date) === r.mk;
  if (!isBill(r)) return same;
  if (filled) return false;
  return same || (r.day > 0 && Math.abs(daysBetween(r.date, t.date)) <= NEAR_DAYS);
}
// chọn dòng hợp nhất: cùng tháng trước, rồi số tiền còn trống gần với khoản thật nhất
function bestRow(c, t) {
  return c.sort((a, b) => ((monthKey(t.date) === b.mk) - (monthKey(t.date) === a.mk)) || (Math.abs(planOf(a) - a.actual - t.amount) - Math.abs(planOf(b) - b.actual - t.amount)))[0];
}
const STOP = new Set(['hop', 'dong', 'tien', 'tra', 'cua', 'con', 'uoc', 'tinh', 'nop', 'mua', 'thang', 'phi', 'khoan']);
const nameTokens = s => unaccent(norm(s)).replace(/\(.*?\)/g, ' ').split(/[\s–\-+]+/).filter(w => w.length >= 3 && !STOP.has(w));
const planOf = r => r.amt || r.item.hint || 0;
function matchesRow(r, t) {
  if (t.planRef && t.planRef === r.ref) return true;
  if (!['khac', 'none'].includes(r.kind)) return t.kind === r.kind;
  const note = unaccent(norm(t.note));
  if (nameTokens(r.item.name).some(w => w.length >= 5 ? note.includes(w) : note.includes(' ' + w + ' '))) return true;
  const p = planOf(r);
  return !!p && t.group === r.group && t.amount >= p * .5 && t.amount <= p * 1.5;
}
function matchActuals(rows) {
  rows.forEach(r => { r.actual = 0; r.txs = []; });
  if (rows.length) {
    const from = addDays(rows.reduce((m, r) => r.date < m ? r.date : m, rows[0].date).slice(0, 8) + '01', -NEAR_DAYS);
    const to = addDays(dateIn(monthKey(rows.reduce((m, r) => r.date > m ? r.date : m, rows[0].date)), 31), NEAR_DAYS);
    const txs = S.tx.filter(x => x.date >= from && x.date <= to).sort((a, b) => (b.amount - a.amount) || a.date.localeCompare(b.date));
    for (const t of txs) {
      const c = rows.filter(r => fitsRow(r, t, r.txs.length > 0));
      if (!c.length) continue;
      const r = bestRow(c, t);
      r.actual += t.amount; r.txs.push(t.uid);
    }
  }
  const cur = monthKey(TODAY());
  rows.forEach(r => {
    r.past = r.mk < cur;
    // hóa đơn đã có khoản thật → xong, không còn "phần dư" (trả 5,2tr cho kế hoạch 5,4tr vẫn là xong)
    r.remain = r.past ? 0 : isBill(r) && r.actual > 0 ? 0 : Math.max(0, r.amt - r.actual);
    r.done = r.actual > 0 && (isBill(r) || r.actual >= planOf(r) * .9);
  });
}
// Khoản đang gõ ở Nhập liệu sẽ lấp dòng kế hoạch nào (còn chỗ trống). Trả về { r, cut } hoặc null.
function findPlanRow(t) {
  if (!t.amount) return null;
  const c = PROJ.filter(r => r.remain > 0 && fitsRow(r, t, isBill(r) && r.txs.length > 0));
  if (!c.length) return null;
  const r = bestRow(c, t);
  return { r, cut: { ref: r.ref, amt: isBill(r) ? r.remain : Math.min(t.amount, r.remain) } };
}
function buildProjection() {
  const base = monthKey(TODAY());
  let rows = [];
  for (let i = -2; i <= 4; i++) rows = rows.concat(rowsFor(addMonths(base, i)));
  rows.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  matchActuals(rows);
  PROJ = rows.filter(r => r.method !== 'auto');
  for (const r of rows.filter(r => r.method === 'auto')) {
    const amt = r.amt || r.item.hint || 0;
    const best = amt ? rank({ date: r.date, amt, kind: r.kind, chan: r.chan, ref: r.ref }, ['sup', 'eve'])[0] : { m: 'eve', why: '' };
    r.method = best.m; r.autoWhy = best.why;
    PROJ.push(r);
  }
}
const projRows = mk => PROJ.filter(r => r.mk === mk).sort((a, b) => (a.buy ? 1 : 0) - (b.buy ? 1 : 0) || S.plan.items.findIndex(i => i.id === a.id) - S.plan.items.findIndex(i => i.id === b.id));
// Phần hoàn của riêng khoản này trong kỳ (theo tỷ lệ của nó, chia lại nếu kỳ chạm trần), trừ phí ngoại tệ
function rowGain(r) {
  if (!isCard(r.method) || r.method === 'eco' || r.inst) return 0;
  const amt = r.amt || r.item.hint || 0; if (!amt) return 0;
  const x = { date: r.date, amt, kind: r.kind, chan: r.chan, method: r.method, ref: r.ref };
  const p = cashPeriod(r.method, r.date);
  const e = estFor(r.method, spendsIn(r.method, p, { plan: true, exclude: r.ref }).concat([x]));
  const fee = r.kind === 'sub_usd' ? amt * (S.rules[r.method].fx || 0) : 0;
  if (r.method === 'sup' && e.T < S.rules.sup.min) return amt * S.rules.sup.base - fee;
  const own = r.method === 'sup' ? amt * supRate(r.kind) : amt * eveRate(x);
  return (e.raw ? own * e.est / e.raw : 0) - fee;
}
function entry(mk, id, create) {
  if (!S.plan.entries[mk]) { if (!create) return null; S.plan.entries[mk] = {}; }
  if (!S.plan.entries[mk][id] && create) S.plan.entries[mk][id] = { amt: 0 };
  return S.plan.entries[mk][id];
}
function lastAmount(id, mk) {
  for (let i = 1; i <= 12; i++) { const e = (S.plan.entries[addMonths(mk, -i)] || {})[id]; if (e && e.amt) return e.amt; }
  return 0;
}
// Tháng gần nhất (≤ mk) có khoản này; chưa có thì lấy tháng mốc của khoản
function lastMonthOf(it, mk) {
  for (let i = 0; i <= 24; i++) { const k = addMonths(mk, -i); if ((S.plan.entries[k] || {})[it.id]) return k; }
  return it.anchor || null;
}
// Theo quy luật, khoản này có rơi vào tháng mk không (dùng để báo tháng nghỉ Dai-ichi)
function occurs(it, mk) {
  if ((S.plan.entries[mk] || {})[it.id]) return true;
  const P = PERIOD[it.sched]; if (!P) return false;
  const a = lastMonthOf(it, mk); if (!a) return false;
  const d = monthsBetween(a, mk); return d > 0 && d % P === 0;
}
// "Chép từ tháng trước": tháng → tháng trước, quý → 3 tháng trước, năm → 12 tháng trước. Kèm số tiền, ngày, cách trả.
function copyInto(mk) {
  let n = 0;
  const ent = S.plan.entries[mk] = S.plan.entries[mk] || {};
  for (const it of S.plan.items) {
    const P = PERIOD[it.sched];
    if (!P || ent[it.id]) continue;
    let src = (S.plan.entries[addMonths(mk, -P)] || {})[it.id];
    if (!src && P > 1) {
      // khoản quý/năm chưa có lịch sử trong app (VD Dai-ichi đóng trước khi dùng app): dựa vào tháng mốc
      let recent = false;
      for (let i = 1; i < P; i++) if ((S.plan.entries[addMonths(mk, -i)] || {})[it.id]) recent = true;
      if (!recent && it.anchor && monthsBetween(it.anchor, mk) > 0 && monthsBetween(it.anchor, mk) % P === 0) src = { amt: 0, day: it.day };
    }
    if (!src) continue;
    ent[it.id] = { amt: src.amt || 0, day: src.day != null ? src.day : (it.day || 0), method: src.method || null, updatedAt: nowIso() };
    n++;
  }
  if (!Object.keys(ent).length) delete S.plan.entries[mk];
  return n;
}
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/* ---------- giao dịch ---------- */
function deleteTx(uid, quiet) {
  const i = S.tx.findIndex(t => t.uid === uid); if (i < 0) return;
  const t = S.tx[i];
  S.tx.splice(i, 1); S.deleted[uid] = nowIso();
  if (t.planRef && !quiet) {
    if (t.planRef.startsWith('plan:')) { const [, mk, id] = t.planRef.split(':'); const e = entry(mk, id, false); if (e && e.txUid === uid) { e.paid = false; e.txUid = null; } }
    else if (t.planRef.startsWith('buy:')) { const b = S.plan.buys.find(x => 'buy:' + x.id === t.planRef); if (b) { b.bought = false; b.txUid = null; } }
  }
  save(true);
}

/* ===================================================================
   TRANG 1 — NHẬP LIỆU
   =================================================================== */
const st = { amount: 0, kind: 'khac', mode: 'ck', chan: 'online', method: 'ck', group: 'Khác', note: '', ask: null, merchant: null, manualMethod: false };
$('#fGroup').innerHTML = GROUPS.map(g => `<option>${g}</option>`).join('');
$('#methods').innerHTML = Object.keys(METHODS).map(k => `<button type="button" class="m-${k}" data-m="${k}" aria-pressed="false"><span class="sw"></span>${METHODS[k].name}</button>`).join('');
$('#fDate').value = TODAY();
$('#fGroup').value = 'Khác';

function fromText() {
  const text = $('#q').value.trim();
  const a = parseAmount(text.toLowerCase());
  const c = classify(text);
  st.amount = a ? a.v : 0;
  let note = text;
  if (a) { const i = text.toLowerCase().indexOf(a.raw); if (i >= 0) note = (text.slice(0, i) + text.slice(i + a.raw.length)).replace(/\s+/g, ' ').trim(); }
  st.note = note ? note.charAt(0).toUpperCase() + note.slice(1) : '';
  Object.assign(st, { kind: c.kind, mode: c.mode, chan: c.chan, group: c.group, ask: null, merchant: c.merchant || null, manualMethod: false });
  $('#fNote').value = st.note;
  $('#fAmt').value = st.amount ? fmt(st.amount) : '';
  $('#fGroup').value = st.group;
  renderSuggest();
}
// Khoản đang gõ, dạng giống khoản sẽ lưu, để tìm dòng kế hoạch nó lấp vào (HIT)
let HIT = null;
function composerTx() {
  const swipe = st.mode === 'swipe' || st.ask === 'swipe';
  return { date: $('#fDate').value || TODAY(), amount: st.amount, note: ($('#fNote').value || '').trim(), group: $('#fGroup').value, kind: swipe ? (st.kind === 'none' ? 'khac' : st.kind) : 'none' };
}
function composerX() { const x = { date: $('#fDate').value || TODAY(), amt: st.amount, kind: st.kind, chan: st.chan }; if (HIT) x.cut = HIT.cut; return x; }
function planHitLine() {
  if (!HIT) return '';
  const r = HIT.r, name = esc(r.item.name.replace(/\s*\(ước tính\)/, ''));
  return `<div class="second plan-hit"><span class="ok">✓</span> Khớp kế hoạch: <b>${name}</b>${isBill(r) ? ` (${short(planOf(r))}) · không tính trùng` : ` · sau khoản này còn ${short(Math.max(0, r.remain - HIT.cut.amt))} ước tính`}</div>`;
}
// Dòng "App hiểu: số tiền · nhóm · ngày" thay cho 4 ô; app tách sai thì bấm ✎ Sửa mới mở 4 ô
function renderSum() {
  const has = !!$('#q').value.trim();
  $('#sumLine').hidden = !has;
  if (!has) { $('#parsedBox').hidden = true; $('#sumEdit').setAttribute('aria-expanded', 'false'); return; }
  const d = $('#fDate').value || TODAY();
  $('#sumText').innerHTML = '<span class="muted">App hiểu:</span> ' + [st.amount ? `<b class="num">${fmt(st.amount)} đ</b>` : '<b style="color:var(--warn)">chưa có số tiền</b>', esc($('#fGroup').value), d === TODAY() ? 'hôm nay' : dm(d)].join(' · ');
}
function renderSuggest() { suggestInner(); renderSum(); }
function suggestInner() {
  const box = $('#suggestBox');
  const swipe = st.mode === 'swipe' || st.ask === 'swipe';
  $('#chanWrap').hidden = !swipe;
  $$('#chan button').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === st.chan));
  const pick = m => { if (!st.manualMethod) setMethod(m); };
  HIT = null;
  if (!$('#q').value.trim() && !st.amount) { box.innerHTML = ''; pick('ck'); return; }
  if ((st.mode === 'ask' || st.mode === 'unknown') && !st.ask) {
    box.innerHTML = `<div class="suggest plain"><b>Khoản này quẹt thẻ hay chuyển khoản?</b><div class="ask"><button class="btn sm primary" type="button" data-ans="swipe">Quẹt thẻ</button><button class="btn sm" type="button" data-ans="ck">Chuyển khoản/QR</button><button class="btn sm" type="button" data-ans="cash">Tiền mặt</button></div></div>`;
    pick('ck'); return;
  }
  HIT = findPlanRow(composerTx());
  if (!swipe) {
    // chợ cóc… chỉ nhận tiền mặt (mode 'cash')
    const m = st.ask === 'cash' || st.mode === 'cash' ? 'cash' : 'ck';
    box.innerHTML = `<div class="suggest plain"><div class="row"><span class="sticker sm"><img src="${img(METHODS[m].img)}" alt=""></span><span class="grow small"><b>${m === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'} – không hoàn tiền</b><br><span class="muted">Chỉ ghi sổ, không gợi ý thẻ.</span></span></div>${planHitLine()}</div>`;
    pick(m); return;
  }
  if (!st.amount) { box.innerHTML = `<div class="suggest plain small">Nhập số tiền để app gợi ý thẻ.</div>`; return; }
  const x = composerX();
  const r = rank(x);
  const b = r[0], s2 = r[1];
  let extra = '';
  if (st.kind === 'dienmay') extra = `<div class="second">Mua lớn: thêm vào <a href="#ke-hoach">Kế hoạch tháng → Dự định mua</a> để app chọn tháng có lợi nhất. Quẹt thẳng thẻ, không qua VNPAY/MoMo.</div>`;
  if (st.kind === 'benhvien' && st.amount >= 5e6) extra = `<div class="second">Viện phí lớn: không mua đồ lớn cùng kỳ (dùng chung trần). Trả đủ, không trả góp.</div>`;
  if (st.merchant) extra += `<div class="second">Cửa hàng đã nhớ: <b>${esc(st.merchant)}</b>${S.merchants[st.merchant].confirmed ? ' · MCC đã xác nhận' : ''}</div>`;
  box.innerHTML = `<div class="suggest">
    <div class="best"><span class="sticker"><img src="${img('coins')}" alt=""></span>
      <div class="grow"><div class="small muted">Nên dùng</div><div class="row wrap" style="gap:8px">${pill(b.m)}<span class="small">${esc(b.why)}</span></div></div>
      <div style="text-align:right"><div class="cb num">${b.cash >= 1 ? '+' + fmt(b.cash) : '0'}</div><div class="xs muted">hoàn dự kiến</div></div></div>
    <div class="second">Thứ 2: <b>${METHODS[s2.m].name}</b> ${s2.cash >= 1 ? '+' + fmt(s2.cash) + ' đ' : '0 đ'} · ${esc(s2.why)}</div>${extra}${planHitLine()}</div>`;
  pick(b.m);
}
function setMethod(m) { st.method = m; $$('#methods button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m)); }

$('#q').addEventListener('input', fromText);
$('#fAmt').addEventListener('input', e => { const d = digits(e.target.value); st.amount = d; e.target.value = d ? fmt(d) : ''; renderSuggest(); });
$('#fDate').addEventListener('change', renderSuggest);
$('#fGroup').addEventListener('change', e => { st.group = e.target.value; renderSuggest(); });
$('#fNote').addEventListener('input', e => { st.note = e.target.value; renderSuggest(); });
$('#sumEdit').addEventListener('click', e => { const p = $('#parsedBox'); p.hidden = !p.hidden; e.currentTarget.setAttribute('aria-expanded', String(!p.hidden)); });
$('#chan').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.chan = b.dataset.c; renderSuggest(); });
$('#methods').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.manualMethod = true; setMethod(b.dataset.m); });
$('#suggestBox').addEventListener('click', e => { const b = e.target.closest('[data-ans]'); if (!b) return; st.ask = b.dataset.ans; if (st.ask === 'swipe' && st.kind === 'none') st.kind = 'khac'; renderSuggest(); });

$('#saveBtn').addEventListener('click', () => {
  if (!st.amount) { toast('Chưa có số tiền: gõ thêm, ví dụ "20k" hoặc "5tr4"'); return; }
  const date = $('#fDate').value || TODAY();
  const swipe = st.mode === 'swipe' || st.ask === 'swipe';
  const kind = isCard(st.method) ? (st.kind === 'none' ? 'khac' : st.kind) : 'none';
  const t = { uid: newUid(), date, time: nowTime(), note: ($('#fNote').value || '').trim() || 'Khoản chi', amount: st.amount, group: $('#fGroup').value, method: st.method, kind, chan: swipe ? st.chan : 'quay', source: 'manual', updatedAt: nowIso() };
  // khoản này lấp dòng kế hoạch nào thì trừ dòng đó ra khi tính hoàn, không cộng trùng
  const hit = findPlanRow(t);
  t.cb = isCard(t.method) ? Math.max(0, Math.round(gain(t.method, { date, amt: t.amount, kind: t.kind, chan: t.chan, cut: hit && hit.cut }).cash)) : 0;
  S.tx.push(t); save();
  $('#q').value = ''; $('#fDate').value = TODAY(); fromText();
  renderAll();
  toast(t.cb ? `Đã lưu · hoàn dự kiến +${fmt(t.cb)} đ` : 'Đã lưu khoản chi');
});

/* nút nhanh: 4 icon chỗ hay mua (luôn hiện) + "Cố định tháng này" (ẩn sau nút) */
const BRANDS = [
  { id: 'win', label: 'WinMart+', text: 'WinMart+ ', svg: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="18" fill="#E5262D"/><text x="31" y="40" text-anchor="middle" font-family="'Baloo 2',sans-serif" font-weight="800" font-size="30" fill="#fff">W</text><circle cx="48" cy="17" r="6" fill="#fff"/><path d="M48 14v6M45 17h6" stroke="#E5262D" stroke-width="2.4" stroke-linecap="round"/><path d="M23 46q8 6 16 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="44" r="3" fill="#FF8A8F"/><circle cx="46" cy="44" r="3" fill="#FF8A8F"/></svg>` },
  { id: 'thuoc', label: 'Long Châu', text: 'thuốc Long Châu ', svg: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="18" fill="#1D2C7A"/><rect x="15" y="15" width="10" height="22" rx="5" fill="#2E8BEA" transform="rotate(18 20 26)"/><rect x="27" y="12" width="10" height="25" rx="5" fill="#F47A20" transform="rotate(18 32 24.5)"/><rect x="39" y="15" width="10" height="22" rx="5" fill="#3DB54A" transform="rotate(18 44 26)"/><path d="M25 46q7 6 14 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="46" r="3" fill="#F8A3B4"/><circle cx="46" cy="46" r="3" fill="#F8A3B4"/></svg>` },
  { id: 'shopee', label: 'Shopee', text: 'Shopee ', svg: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="18" fill="#FFF0E8"/><path d="M24 23v-4a8 8 0 0 1 16 0v4" fill="none" stroke="#EE4D2D" stroke-width="3.6" stroke-linecap="round"/><path d="M14 23h36l-3 27a5 5 0 0 1-5 4.5H22a5 5 0 0 1-5-4.5z" fill="#EE4D2D"/><circle cx="26" cy="34" r="2.6" fill="#fff"/><circle cx="38" cy="34" r="2.6" fill="#fff"/><path d="M27 41q5 5 10 0" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/><circle cx="21" cy="40" r="2.6" fill="#FFB199"/><circle cx="43" cy="40" r="2.6" fill="#FFB199"/></svg>` },
  // chợ cóc chỉ nhận tiền mặt: không gợi ý thẻ
  { id: null, label: 'Chợ cóc', text: 'chợ cóc ', cash: true, svg: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="18" fill="#E5F2D8"/><path d="M26 59q0-13 6-15q6 2 6 15z" fill="#D9446A"/><circle cx="32" cy="33" r="6.5" fill="#FFE0C2"/><circle cx="29.6" cy="34" r="1.1" fill="#5A3B2A"/><circle cx="34.4" cy="34" r="1.1" fill="#5A3B2A"/><circle cx="27.8" cy="36.6" r="1.5" fill="#F7A3A3"/><circle cx="36.2" cy="36.6" r="1.5" fill="#F7A3A3"/><path d="M30.6 37.2q1.4 1.3 2.8 0" fill="none" stroke="#5A3B2A" stroke-width="1" stroke-linecap="round"/><path d="M18 30L32 11L46 30Q32 33.5 18 30z" fill="#EBD394" stroke="#B8954F" stroke-width="1.2" stroke-linejoin="round"/><path d="M24.5 23.5q7.5-1.6 15 0M21.5 27.5q10.5-1.8 21 0" fill="none" stroke="#C9A85F" stroke-width="1"/><path d="M6 45Q32 38 58 45" fill="none" stroke="#8A5A2B" stroke-width="2.6" stroke-linecap="round"/><path d="M8 44.5l-3 6M8 44.5l9 6M56 44.5l-9 6M56 44.5l3 6" stroke="#8A5A2B" stroke-width="1.1"/><circle cx="7.5" cy="49" r="3.2" fill="#F2A33A"/><circle cx="12.5" cy="48" r="3.2" fill="#7BC043"/><circle cx="16.5" cy="49.5" r="2.8" fill="#F27C9A"/><path d="M3.5 51h16l-2 5.5a3 3 0 0 1-3 2h-6a3 3 0 0 1-3-2z" fill="#C98B4B"/><circle cx="47.5" cy="49.5" r="2.8" fill="#F27C9A"/><circle cx="51.5" cy="48" r="3.2" fill="#7BC043"/><circle cx="56.5" cy="49" r="3.2" fill="#F2A33A"/><path d="M44.5 51h16l-2 5.5a3 3 0 0 1-3 2h-6a3 3 0 0 1-3-2z" fill="#C98B4B"/></svg>` }
];
const BRAND_IDS = BRANDS.map(b => b.id).filter(Boolean);
$('#brands').innerHTML = BRANDS.map((b, i) => `<button class="brand" type="button" data-brand="${i}">${b.svg}<span>${b.label}</span></button>`).join('');
// "Cố định tháng này": khoản đã có trong Kế hoạch tháng này (chưa chép thì hiện tất cả), trừ 3 khoản đã có icon
function quickList() {
  const mk = monthKey(TODAY()), ent = S.plan.entries[mk];
  const inMonth = it => !ent || !Object.keys(ent).length || !!ent[it.id];
  const qs = S.plan.items.filter(i => !BRAND_IDS.includes(i.id) && (i.id !== 'hocphi' || (ent && ent.hocphi)) && inMonth(i)).map(it => {
    const e = (S.plan.entries[mk] || {})[it.id];
    const amt = (e && e.amt) || lastAmount(it.id, mk) || it.hint || 0;
    return { t: it.name.replace(/\s*\(ước tính\)/, '').replace('Dai-ichi – hợp đồng ', 'Dai-ichi HĐ'), s: amt ? `~${fmt(amt)}${it.method === 'ck' ? ' · CK' : ''}` : (it.chan === 'online' ? 'đặt online' : 'tại quầy'), text: it.text || it.name, img: it.method === 'ck' ? 'wallet' : it.kind === 'baohiem' ? 'bag' : it.kind === 'tmdt' ? 'stack' : it.kind === 'sieuthi' ? 'coins' : 'card', it };
  });
  const vi = qs.findIndex(q => q.it.id === 'vcb');
  qs.splice(vi < 0 ? qs.length : vi, 0, { t: 'Vinmec', s: 'viện phí', text: 'viện phí Vinmec ', img: 'bag' });
  return qs;
}
let QUICK = [];
function renderQuick() {
  QUICK = quickList();
  $('#quick').innerHTML = QUICK.map((x, i) => `<button class="qbtn" type="button" data-q="${i}"><span class="sticker sm"><img src="${img(x.img)}" alt=""></span><span><span class="t">${esc(x.t)}</span><br><span class="s">${esc(x.s)}</span></span></button>`).join('');
}
// số tiền dạng chữ app hiểu được: 5400000 → "5tr4", 570000 → "570k"
function spoken(n) { if (n >= 1e6) { const tr = Math.floor(n / 1e6), rest = Math.round((n % 1e6) / 1e3); return rest ? `${tr}tr${String(rest).padStart(3, '0').replace(/0+$/, '')}` : `${tr}tr`; } return Math.round(n / 1000) + 'k'; }
function fillComposer(text, opts) {
  const q = $('#q'); q.value = text; fromText();
  if (opts) { Object.assign(st, opts); if (opts.group) $('#fGroup').value = opts.group; renderSuggest(); }
  q.focus(); try { q.setSelectionRange(text.length, text.length); } catch (e) {}
  q.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
// điền sẵn theo một khoản trong Kế hoạch (hóa đơn có số tiền thì điền luôn số tiền)
function fillItem(it) {
  const mk = monthKey(TODAY()); const e2 = (S.plan.entries[mk] || {})[it.id];
  const amt = (e2 && e2.amt) || lastAmount(it.id, mk) || it.hint || 0;
  const fixed = ['dai1', 'dai2', 'dien', 'claude', 'yt', 'vcb'].includes(it.id);
  fillComposer((it.text || it.name) + (fixed && amt ? ' ' + spoken(amt) : ' '), { kind: it.kind, chan: it.chan || st.chan, group: it.group, mode: it.kind === 'none' ? 'ck' : 'swipe' });
}
$('#quick').addEventListener('click', e => {
  const b = e.target.closest('[data-q]'); if (!b) return;
  const x = QUICK[+b.dataset.q];
  if (x.it) fillItem(x.it); else fillComposer(x.text);
});
$('#brands').addEventListener('click', e => {
  const b = e.target.closest('[data-brand]'); if (!b) return;
  const x = BRANDS[+b.dataset.brand], it = x.id && S.plan.items.find(i => i.id === x.id);
  if (it) fillItem(it);
  else fillComposer(x.text, x.cash ? { mode: 'cash', kind: 'none', ask: null } : null);
});
// mở "Cửa hàng quẹt thẻ" thì đóng "Cố định tháng này" và ngược lại, cho gọn
function openOnly(which) {
  [['#storeToggle', '#stores'], ['#moreToggle', '#quick']].forEach(([t, p]) => {
    const show = t === which && $(p).hidden;
    $(p).hidden = !show; $(t).setAttribute('aria-expanded', String(show));
  });
}
$('#moreToggle').addEventListener('click', () => openOnly('#moreToggle'));

/* cửa hàng quẹt thẻ được */
const STORE_CATS = {
  sieuthi: { name: 'Siêu thị, cửa hàng tiện lợi', group: 'Đi chợ – siêu thị', kind: 'sieuthi', list: ['Bách Hóa Xanh', 'Co.op', 'Circle K', 'GS25', 'WinMart'] },
  dienmay: { name: 'Điện máy, điện thoại · mở phần mua lớn', group: 'Mua sắm', kind: 'dienmay', list: ['Điện Máy Xanh', 'Thế Giới Di Động', 'FPT Shop', 'Nguyễn Kim'] },
  quanao: { name: 'Quần áo, đồ dùng', group: 'Mua sắm', kind: 'khac', list: ['Quần áo', 'Đồ dùng'] },
  nhasach: { name: 'Nhà sách', group: 'Con – học tập', kind: 'nhasach', list: ['Nhà sách'] },
  khac: { name: 'Khác', group: 'Khác', kind: 'khac', list: [] }
};
let storeChan = 'quay';
function renderStores() {
  const learned = {};
  for (const [n, m] of Object.entries(S.merchants)) if (m.cat) (learned[m.cat] = learned[m.cat] || []).push(m.label || n);
  $('#storeGroups').innerHTML = Object.entries(STORE_CATS).map(([k, c]) => {
    const names = c.list.concat(learned[k] || []);
    if (!names.length) return '';
    return `<div><p class="xs muted" style="margin:0 0 6px">${c.name}</p><div class="chips">${names.map(n => `<button class="chipbtn" type="button" data-store="${esc(n)}" data-cat="${k}">${esc(n)}</button>`).join('')}</div></div>`;
  }).join('');
  $('#nsCat').innerHTML = Object.entries(STORE_CATS).map(([k, c]) => `<option value="${k}">${c.name.split(' · ')[0]}</option>`).join('');
}
$('#storeToggle').addEventListener('click', () => openOnly('#storeToggle'));
$('#storeChan').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; storeChan = b.dataset.c; $$('#storeChan button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
$('#storeGroups').addEventListener('click', e => {
  const b = e.target.closest('[data-store]'); if (!b) return;
  const c = STORE_CATS[b.dataset.cat];
  fillComposer(b.dataset.store + ' ', { kind: c.kind, group: c.group, mode: 'swipe', chan: storeChan, ask: null });
  $('#fGroup').value = c.group;
});
$('#nsAdd').addEventListener('click', () => {
  const name = $('#nsName').value.trim(); if (!name) { toast('Gõ tên cửa hàng trước'); return; }
  const cat = $('#nsCat').value, c = STORE_CATS[cat];
  S.merchants[norm(name).trim()] = { label: name, cat, group: c.group, kind: c.kind, chan: storeChan, confirmed: false };
  save(true); $('#nsName').value = ''; renderStores(); toast(`Đã nhớ "${name}". Lần sau gõ tên là app tự nhận.`);
});

/* danh sách hôm nay */
function txItem(t) {
  return `<button class="item" type="button" data-tx="${t.uid}">
    <span class="sticker sm"><img src="${img(METHODS[t.method].img)}" alt=""></span>
    <span class="grow"><span style="font-weight:600;display:block">${esc(t.note)}</span><span class="sub">${t.date === TODAY() ? esc(t.time || '') : dm(t.date)} · ${esc(t.group)} · ${pill(t.method)}${t.source === 'saoke' ? '<span class="tag">từ sao kê</span>' : ''}${t.stmt ? '<span class="tag ok">✓ sao kê</span>' : ''}</span></span>
    <span><span class="amt num" style="display:block">${fmt(t.amount)}</span>${t.cb ? `<span class="cbk num" style="display:block;text-align:right">+${fmt(t.cb)} hoàn</span>` : ''}</span></button>`;
}
function renderToday() {
  const list = S.tx.filter(t => t.date === TODAY()).sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  const el = $('#todayList');
  if (!list.length) { el.innerHTML = `<div class="empty"><span class="sticker"><img src="${img('piggy')}" alt=""></span><span class="small">Hôm nay chưa ghi khoản nào.</span></div>`; $('#todayTotal').textContent = ''; return; }
  el.innerHTML = list.map(txItem).join('');
  $('#todayTotal').textContent = fmt(list.reduce((s, x) => s + x.amount, 0)) + ' đ';
}
document.addEventListener('click', e => { const b = e.target.closest('[data-tx]'); if (b) openTx(b.dataset.tx); });

/* sửa khoản chi (gồm sửa MCC theo thực tế) */
let delArm = false;
function openTx(uid) {
  const t = S.tx.find(x => x.uid === uid); if (!t) return;
  delArm = false;
  const mkey = norm(t.note).trim();
  const known = S.merchants[mkey];
  $('#txSheetIn').innerHTML = `<div class="grab"></div>
    <div class="row between"><h2>Sửa khoản chi</h2><button class="btn sm ghost" type="button" data-close>Đóng</button></div>
    <div class="fgrid">
      <div class="field wide"><label for="tNote">Nội dung</label><input id="tNote" value="${esc(t.note)}"></div>
      <div class="field"><label for="tAmt">Số tiền</label><input id="tAmt" inputmode="numeric" value="${fmt(t.amount)}"></div>
      <div class="field"><label for="tDate">Ngày</label><input id="tDate" type="date" value="${t.date}"></div>
      <div class="field wide"><label for="tGroup">Nhóm</label><select id="tGroup">${GROUPS.map(g => `<option${g === t.group ? ' selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label for="tMethod">Cách trả</label><select id="tMethod">${Object.keys(METHODS).map(k => `<option value="${k}"${k === t.method ? ' selected' : ''}>${METHODS[k].name}</option>`).join('')}</select></div>
      <div class="field"><label for="tChan">Kênh</label><select id="tChan"><option value="quay"${t.chan !== 'online' ? ' selected' : ''}>Tại quầy</option><option value="online"${t.chan === 'online' ? ' selected' : ''}>Online</option></select></div>
      <div class="field wide"><label for="tKind">Nhóm hoàn / MCC thực tế</label><select id="tKind">${Object.entries(KINDS).map(([k, n]) => `<option value="${k}"${k === (t.kind || 'khac') ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    <label class="check-row"><input type="checkbox" id="tInst"${t.inst ? ' checked' : ''}> Trả góp (không được hoàn)</label>
    <label class="check-row"><input type="checkbox" id="tConfirm"${known && known.confirmed ? ' checked' : ''}> Đã xem sao kê: nhớ MCC này cho "${esc(t.note)}", lần sau gợi ý theo đây</label>
    <button class="btn primary" type="button" id="tSave">Lưu thay đổi</button>
    <button class="btn danger" type="button" id="tDel">Xóa khoản này</button>`;
  $('#tAmt').addEventListener('input', e => { const d = digits(e.target.value); e.target.value = d ? fmt(d) : ''; });
  $('#tSave').onclick = () => {
    Object.assign(t, { note: $('#tNote').value.trim() || t.note, amount: digits($('#tAmt').value) || t.amount, date: $('#tDate').value || t.date, group: $('#tGroup').value, method: $('#tMethod').value, chan: $('#tChan').value, kind: $('#tKind').value, inst: $('#tInst').checked, updatedAt: nowIso() });
    if (!isCard(t.method)) t.kind = 'none';
    buildProjection();
    t.cb = isCard(t.method) && !t.inst ? Math.max(0, Math.round(gain(t.method, { date: t.date, amt: t.amount, kind: t.kind, chan: t.chan, ref: 'tx:' + t.uid }).cash)) : 0;
    let cfg = false;
    if ($('#tConfirm').checked) { const k = norm(t.note).trim(); S.merchants[k] = Object.assign(S.merchants[k] || { label: t.note }, { group: t.group, kind: t.kind, chan: t.chan, confirmed: true }); cfg = true; }
    save(cfg); closeSheets(); renderAll(); toast($('#tConfirm').checked ? 'Đã lưu · đã nhớ MCC "đã xác nhận"' : 'Đã lưu thay đổi');
  };
  $('#tDel').onclick = e => {
    if (!delArm) { delArm = true; e.currentTarget.textContent = 'Bấm lần nữa để xóa hẳn'; return; }
    deleteTx(t.uid); closeSheets(); renderAll(); toast('Đã xóa khoản chi');
  };
  openSheet('txSheet');
}

/* ===================================================================
   TRANG 2 — KẾ HOẠCH THÁNG
   =================================================================== */
let curMonth = monthKey(TODAY());
const MONTHS = () => [-2, -1, 0, 1, 2, 3].map(i => addMonths(monthKey(TODAY()), i));
const isRestMonth = mk => { const q = S.plan.items.filter(i => i.sched === 'quarterly' && i.kind === 'baohiem'); return q.length > 0 && !q.some(i => occurs(i, mk)); };
function renderMonthbar() {
  const ms = MONTHS(), cur = monthKey(TODAY());
  if (!ms.includes(curMonth)) curMonth = cur;
  $('#monthbar').innerHTML = ms.map(mk => { const d = monthsBetween(cur, mk); return `<button type="button" data-k="${mk}" aria-pressed="${mk === curMonth}"><b>${mLabel(mk)}</b><span>${d === 0 ? 'tháng này' : d < 0 ? 'đã qua · so thực tế' : '+' + d}${d >= 0 && isRestMonth(mk) ? ' · nghỉ Dai-ichi' : ''}</span></button>`; }).join('');
  const on = $('#monthbar [aria-pressed="true"]'); if (on && on.scrollIntoView && !renderMonthbar.done) { on.scrollIntoView({ inline: 'center', block: 'nearest' }); renderMonthbar.done = true; }
}
// Khung Everyday: hoàn tính theo tháng dương lịch (trần tháng), thanh toán theo kỳ sao kê riêng
function everydayBlock(mk, ee, stmt) {
  const R = S.rules.eve, cap = ee.cap || R.cap;
  const w = cap ? Math.min(100, ee.est / cap * 100) : 0;
  const left = Math.max(0, cap - ee.est);
  const status = ee.est >= cap - 1 ? '<span class="tag warn">đã chạm trần</span>' : ee.est >= cap * .8 ? `<span class="tag warn">sắp hết trần · còn ${short(left)}</span>` : `<span class="tag ok">còn ${short(left)} trần</span>`;
  return `<div class="row between wrap"><b>Everyday tháng ${+mk.slice(5)}/${mk.slice(0, 4)}</b>${status}</div>
    <div class="row between small"><span class="muted">Đã chi + dự kiến trong tháng</span><b class="num">${fmt(ee.T)}</b></div>
    <div class="meter eve"><i style="width:${w}%"></i></div>
    <div class="ticks"><span style="left:0">0</span><span style="left:100%">trần ${short(cap)}</span></div>
    <p class="xs muted">Hoàn dự kiến ${fmt(ee.est)} / trần ${fmt(cap)} · hoàn tính theo tháng ${+mk.slice(5)} (1/${+mk.slice(5)}–${daysInMonth(mk)}/${+mk.slice(5)}) · chỉ đơn online ≥${short(R.minTx)}${ee.T >= R.high ? '' : ` · tổng chi ≥${short(R.high)} thì trần lên ${short(R.capHigh)}`}</p>
    <p class="xs muted">Sao kê kỳ ${pLabel(stmt)} · chốt <b>${dmy(stmt.end)}</b> · hạn trả <b>${dmy(dueOf(stmt, S.cards.eve.dueDay))}</b></p>`;
}
function methodSelect(r) {
  const opts = (r.item.sched === 'buy' ? ['sup', 'eve'] : ['auto', 'sup', 'eve', 'eco', 'ck', 'cash']).map(m => `<option value="${m}"${m === r.chosen ? ' selected' : ''}>${m === 'auto' ? (r.chosen === 'auto' && METHODS[r.method] ? 'Tự: ' + METHODS[r.method].name : 'Tự chọn') : m === 'ck' ? 'CK/QR' : METHODS[m].name}</option>`).join('');
  return `<select class="chip card m-${r.method}" data-msel="${esc(r.ref)}" aria-label="Cách trả ${esc(r.item.name)}">${opts}</select>`;
}
function renderPlan() {
  const mk = curMonth, rows = projRows(mk);
  // KPI
  const past = mk < monthKey(TODAY());
  let total = 0, card = 0, planned = 0, actual = 0;
  rows.forEach(r => { const a = r.actual + r.remain; total += a; if (isCard(r.method)) card += a; planned += r.amt; actual += r.actual; });
  $('#copyPrev').hidden = past;
  // kỳ Supreme chứa giữa tháng (ngày 15): chốt ngày 5 → kỳ 06/11–05/12 cho tháng 11; chốt ngày 20 → kỳ 21/10–20/11
  const supP = stmtPeriod('sup', `${mk}-15`);
  const eveP = cashPeriod('eve', `${mk}-01`);
  const eveStmt = stmtPeriod('eve', `${mk}-15`);
  const se = supEst(spendsIn('sup', supP, { plan: true })), ee = eveEst(spendsIn('eve', eveP, { plan: true }));
  $('#restBanner').innerHTML = isRestMonth(mk) ? `<div class="rest-banner"><span class="sticker sm"><img src="${img('piggy')}" alt=""></span><span class="grow"><b>Tháng nghỉ Dai-ichi.</b> Trần ${short(S.rules.sup.cap)} Supreme còn trống: Shopee chuyển sang Supreme 12%. Hợp lý để mua điện máy.</span></div>` : '';
  $('#planKpis').innerHTML = past ? `
    <div class="kpi"><span class="l">Kế hoạch</span><span class="v num">${fmt(planned)}</span></div>
    <div class="kpi"><span class="l">Thực tế (khớp kế hoạch)</span><span class="v num">${fmt(actual)}</span></div>` : `
    <div class="kpi"><span class="l">Tổng chi dự kiến</span><span class="v num">${fmt(total)}</span></div>
    <div class="kpi"><span class="l">Phần quẹt thẻ</span><span class="v num">${fmt(card)}</span></div>
    <div class="kpi hl"><span class="l">Hoàn tiền dự kiến</span><span class="v num">${fmt(se.est + ee.est)}</span></div>
    <div class="kpi"><span class="l">Supreme · Everyday</span><span class="v num" style="font-size:17px">${short(se.est)} · ${short(ee.est)}</span></div>`;
  const R = S.rules.sup, pctW = Math.min(100, se.T / R.high * 100), minAt = R.min / R.high * 100;
  const status = se.T >= R.high ? `<span class="tag ok">≥${short(R.high)} · trần ${short(R.capHigh)}</span>` : se.T >= R.min ? (se.T < R.min * 1.12 ? `<span class="tag warn">vừa sát mốc ${short(R.min)}</span>` : `<span class="tag ok">đạt mốc ${short(R.min)}</span>`) : `<span class="tag warn">chưa đủ ${short(R.min)}</span>`;
  const hasHosp = spendsIn('sup', supP, { plan: true }).some(x => x.kind === 'benhvien');
  $('#supMeter').innerHTML = `<div class="row between wrap"><b>Kỳ Supreme ${pLabel(supP)}</b>${status}</div>
    <div class="row between small"><span class="muted">Đã chi + dự kiến trong kỳ</span><b class="num">${fmt(se.T)}</b></div>
    <div class="meter sup"><i style="width:${pctW}%"></i></div>
    <div class="ticks"><span style="left:0">0</span><span style="left:${minAt}%">${short(R.min)}</span><span style="left:100%">${short(R.high)}</span></div>
    <p class="xs muted">Hoàn dự kiến ${fmt(se.est)}${se.cap ? ` / trần ${fmt(se.cap)}` : ''} · còn ${se.T >= R.high ? '0' : fmt(R.high - se.T)} đ tới mốc ${short(R.high)}${se.T < R.min && se.T > 0 ? ` · thiếu ${fmt(R.min - se.T)} đ để đạt ${short(R.min)}: dồn thêm tiêm chủng hoặc thuốc vào Supreme` : ''}${hasHosp ? ' · kỳ này có viện phí: không mua đồ lớn' : ''}</p>
    <p class="xs muted">Sao kê chốt <b>${dmy(supP.end)}</b> · hạn trả <b>${dmy(dueOf(supP, S.cards.sup.dueDay))}</b></p>`;
  $('#eveMeter').innerHTML = everydayBlock(mk, ee, eveStmt);
  // dòng
  const el = $('#planRows');
  if (!rows.length) { el.innerHTML = `<div class="empty small">${mLabel(mk)} chưa có khoản nào.<br>Bấm <b>Chép từ tháng trước</b>, hoặc chạm khoản bên dưới để thêm.</div>`; }
  else el.innerHTML = rows.map(r => {
    const g = rowGain(r), it = r.item;
    const amtVal = r.amt;
    const ph = lastAmount(r.id, mk) || it.hint || 0;
    const ruleSel = r.buy ? '<span class="chip">Dự định mua</span>' : `<select class="chip" data-rule="${esc(r.ref)}" aria-label="Quy luật lặp ${esc(it.name)}">${Object.entries(SCHED).map(([k, n]) => `<option value="${k}"${k === it.sched ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
    const dateBox = r.buy ? `<span class="chip">trước ${mdy(r.date)}</span>`
      : `<label class="chip dchip${r.day ? '' : ' empty'}">${r.day ? mdy(dateIn(mk, r.day)) : 'trong tháng'}<input type="date" data-day="${esc(r.ref)}" min="${mk}-01" max="${dateIn(mk, 31)}" value="${r.day ? dateIn(mk, r.day) : ''}" aria-label="Ngày đóng ${esc(it.name)}"></label>`;
    const cb = g >= 1 ? `<span class="cb num">~${fmt(g)} hoàn${r.amt ? '' : ' (như lần trước)'}</span>` : `<span class="cb none">${isCard(r.method) && r.method !== 'eco' ? 'trần đã đủ' : 'không hoàn'}</span>`;
    const note = r.autoWhy && !r.past ? `<div class="l4 auto">Tự chọn: ${esc(r.autoWhy)}</div>` : it.note ? `<div class="l4">${esc(it.note)}</div>` : '';
    // tháng đã qua: dòng 3 so kế hoạch với thực tế (khoản trong sổ / sao kê đã tự khớp)
    let l3;
    if (r.past) {
      const diff = r.actual - r.amt;
      l3 = r.actual ? `<span class="xs">Thực tế <b class="num">${fmt(r.actual)}</b> · ${r.txs.length} khoản</span><span class="cb num ${diff === 0 ? '' : 'none'}" style="${diff > 0 ? 'color:var(--warn)' : ''}">${diff === 0 ? 'đúng kế hoạch' : (diff > 0 ? 'vượt +' : 'ít hơn ') + fmt(Math.abs(diff))}</span>`
        : `<span class="xs" style="color:var(--warn);font-weight:600">chưa thấy trong sổ</span><span class="cb none">kế hoạch ${fmt(r.amt)}</span>`;
    } else l3 = `<button class="chip xb" type="button" data-rm="${esc(r.ref)}" aria-label="Bỏ ${esc(it.name)} khỏi tháng này">✕</button>${cb}`;
    return `<div class="crow">
      <div class="l1"><button class="nm" type="button" data-edit="${esc(r.id)}">${esc(it.name)}</button><input class="amt" inputmode="numeric" aria-label="Số tiền kế hoạch ${esc(it.name)}" data-amt="${esc(r.ref)}" value="${amtVal ? fmt(amtVal) : ''}" placeholder="${ph ? fmt(ph) : 'số tiền'}"${r.buy ? ' disabled' : ''}></div>
      <div class="l2">${ruleSel}${dateBox}${methodSelect(r)}</div>
      <div class="l3">${l3}</div>
      ${note}</div>`;
  }).join('');
  // thêm khoản chưa có trong tháng
  const notIn = S.plan.items.filter(i => !(S.plan.entries[mk] || {})[i.id]);
  $('#onceChips').innerHTML = notIn.length ? `<span class="xs muted">Thêm khoản vào ${mLabel(mk)} · chạm để thêm</span><div class="chips">${notIn.map(i => `<button class="chipbtn" type="button" data-once="${i.id}">+ ${esc(i.name)} <span class="muted xs">${SCHED[i.sched] || ''}</span></button>`).join('')}</div>` : '';
  renderBuys();
}
function findRow(ref) { return PROJ.find(r => r.ref === ref); }
$('#monthbar').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; curMonth = b.dataset.k; renderMonthbar(); renderPlan(); });
$('#planRows').addEventListener('change', e => {
  const inp = e.target.closest('[data-amt]');
  if (inp) { const r = findRow(inp.dataset.amt); if (!r) return; const en = entry(r.mk, r.id, true); en.amt = digits(inp.value); en.updatedAt = nowIso(); save(true); renderAll(); return; }
  const dsel = e.target.closest('[data-day]');
  if (dsel) {
    const r = findRow(dsel.dataset.day); if (!r) return;
    const v = dsel.value, day = v ? +v.slice(8) : 0;
    if (v && monthKey(v) !== r.mk) toast(`Đã lấy ngày ${day} cho ${mLabel(r.mk)}`);
    const en = entry(r.mk, r.id, true); en.day = day; en.updatedAt = nowIso();
    r.item.day = day;   // lần chép sau và khi thêm khoản này vào tháng khác sẽ dùng ngày mới
    save(true); renderAll(); return;
  }
  const rsel = e.target.closest('[data-rule]');
  if (rsel) {
    const r = findRow(rsel.dataset.rule); if (!r) return;
    r.item.sched = rsel.value; r.item.anchor = r.mk;
    save(true); renderAll();
    toast(rsel.value === 'once' ? `${r.item.name}: một lần, không chép sang tháng sau` : `${r.item.name}: lặp theo ${SCHED[rsel.value].toLowerCase()}, tính từ ${mLabel(r.mk)}`);
    return;
  }
  const sel = e.target.closest('[data-msel]');
  if (sel) {
    const r = findRow(sel.dataset.msel); if (!r) return;
    if (r.buy) { r.buy.method = sel.value; }
    else { const en = entry(r.mk, r.id, true); en.method = sel.value === r.item.method ? null : sel.value; en.updatedAt = nowIso(); }
    save(true); renderAll();
  }
});
$('#planRows').addEventListener('input', e => { const inp = e.target.closest('[data-amt]'); if (!inp) return; const d = digits(inp.value); inp.value = d ? fmt(d) : ''; });
$('#planRows').addEventListener('click', e => {
  const rm = e.target.closest('[data-rm]');
  if (rm) {
    const r = findRow(rm.dataset.rm); if (!r) return;
    if (r.buy) { Object.assign(r.buy, { month: null, method: null, date: null }); }
    else { delete S.plan.entries[r.mk][r.id]; if (!Object.keys(S.plan.entries[r.mk]).length) delete S.plan.entries[r.mk]; }
    save(true); renderAll(); toast(`Đã bỏ ${r.item.name} khỏi ${mLabel(r.mk)}`); return;
  }
  const ed = e.target.closest('[data-edit]');
  if (ed) { const id = ed.dataset.edit; if (id.startsWith('buy:')) openBuy(id.slice(4)); else openItem(id); }
});
$('#onceChips').addEventListener('click', e => {
  const b = e.target.closest('[data-once]'); if (!b) return;
  const it = S.plan.items.find(i => i.id === b.dataset.once); if (!it) return;
  const en = entry(curMonth, it.id, true); en.amt = 0; en.day = it.day || 0; en.updatedAt = nowIso();
  if (!it.anchor || PERIOD[it.sched]) it.anchor = curMonth;
  save(true); renderAll();
});
$('#copyPrev').addEventListener('click', () => {
  const n = copyInto(curMonth);
  save(true); renderAll();
  toast(n ? `Đã chép ${n} khoản vào ${mLabel(curMonth)} (kèm số tiền và ngày)` : 'Không có khoản nào cần chép: tháng trước trống, hoặc đã chép rồi');
});

/* dự định mua lớn */
function buyOptions(b) {
  const opts = [], today = TODAY(), base = monthKey(today);
  for (let i = 0; i < 4; i++) {
    const mk = addMonths(base, i);
    const supDate = dateIn(mk, S.cards.sup.closeDay);
    if (supDate >= today) {
      const x = { date: supDate, amt: b.amt, kind: b.kind, chan: b.chan, ref: 'buy:' + b.id };
      const g = gain('sup', x);
      const hosp = spendsIn('sup', g.p, { plan: true, exclude: x.ref }).some(s => s.kind === 'benhvien');
      opts.push({ m: 'sup', mk, date: supDate, cash: g.cash, p: g.p, hosp, text: `Supreme · mua trước ${dm(supDate)} (ngày chốt) · kỳ ${pLabel(g.p)}` });
    }
    if (b.chan === 'online') {
      const d = i === 0 ? today : dateIn(mk, 10);
      const g = gain('eve', { date: d, amt: b.amt, kind: b.kind, chan: 'online', ref: 'buy:' + b.id });
      opts.push({ m: 'eve', mk, date: d, cash: g.cash, text: `Everyday · đặt online trong ${mLabel(mk)}` });
    }
  }
  return opts.sort((a, c) => (c.cash - (c.hosp ? 1e9 : 0)) - (a.cash - (a.hosp ? 1e9 : 0)));
}
function renderBuys() {
  // món đã thấy trong sổ (khớp tự động) hoặc tháng đã qua thì không còn là "dự định"
  const done = new Set(PROJ.filter(r => r.buy && (r.done || r.past)).map(r => r.buy.id));
  const list = S.plan.buys.filter(b => !b.bought && !done.has(b.id));
  $('#buys').innerHTML = list.map(b => {
    const opts = buyOptions(b), best = opts[0];
    const planned = !!b.month;
    const cur = planned ? opts.find(o => o.m === b.method && o.mk === b.month) : null;
    const show = cur || best;
    const full = show ? show.cash : 0;
    const quay = b.chan !== 'online' && b.amt < 7.4e6 ? '<p class="xs muted">Mua tại quầy dưới ~7,4tr thì thẻ nào cũng gần như 0. Nên đặt online rồi nhận tại cửa hàng (đổi kênh trong phần sửa).</p>' : '';
    return `<div class="bigbuy">
      <div class="row"><span class="sticker"><img src="${img('brief')}" alt=""></span><div class="grow"><button class="name" style="font-weight:700;background:none;border:0;padding:0;text-align:left;color:var(--ink)" type="button" data-buyedit="${b.id}">Dự định mua: ${esc(b.name)} ~${short(b.amt)}</button><div class="xs muted">${KINDS[b.kind] || ''} · ${b.chan === 'online' ? 'đặt online' : 'tại quầy'}</div></div>${planned ? `<span class="tag ok">${mLabel(b.month)}</span>` : '<span class="tag gold">gợi ý</span>'}</div>
      ${show ? `<p class="small">Nên: <b>${esc(show.text)}</b>${show.hosp ? ' · <span style="color:var(--warn)">kỳ này có viện phí, dùng chung trần</span>' : ''}</p>` : '<p class="small">Chưa tính được (kiểm tra ngày chốt sao kê ở trang Nguyên tắc).</p>'}
      ${opts[1] ? `<p class="xs muted">Thứ 2: ${esc(opts[1].text)} · +${fmt(opts[1].cash)}</p>` : ''}
      <div class="opt">
        <button type="button" data-bpay="${b.id}:full" aria-pressed="${b.pay !== 'installment'}"><span class="xs muted">Trả đủ</span><b class="num">+${fmt(Math.max(0, full))}</b><span class="xs muted">hoàn thêm</span></button>
        <button type="button" data-bpay="${b.id}:installment" aria-pressed="${b.pay === 'installment'}"><span class="xs muted">Trả góp 0%</span><b class="num">+0</b><span class="xs muted">mất toàn bộ điểm</span></button>
      </div>${quay}
      <p class="xs muted">Không mua cùng kỳ với viện phí. Quẹt thẳng thẻ, không qua VNPAY/MoMo.</p>
      <div class="row" style="gap:8px">${planned ? `<button class="btn sm grow" type="button" data-bunplan="${b.id}">Bỏ khỏi kế hoạch</button>` :`<button class="btn sm primary grow" type="button" data-bplan="${b.id}">Đưa vào kế hoạch ${show ? mLabel(show.mk) : ''}</button>`}</div>
    </div>`;
  }).join('');
}
$('#buys').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const ds = t.dataset;
  if (ds.buyedit) { openBuy(ds.buyedit); return; }
  if (ds.bpay) { const [id, pay] = ds.bpay.split(':'); const b = S.plan.buys.find(x => x.id === id); b.pay = pay; save(true); renderAll(); return; }
  if (ds.bplan) { const b = S.plan.buys.find(x => x.id === ds.bplan); const o = buyOptions(b)[0]; if (!o) return; Object.assign(b, { month: o.mk, method: o.m, date: o.date }); save(true); curMonth = o.mk; renderAll(); toast(`Đã đưa vào kế hoạch ${mLabel(o.mk)}`); return; }
  if (ds.bunplan) { const b = S.plan.buys.find(x => x.id === ds.bunplan); Object.assign(b, { month: null, method: null, date: null }); save(true); renderAll(); return; }
});

/* thêm / sửa khoản cố định */
function openItem(id) {
  const it = id ? S.plan.items.find(i => i.id === id) : { id: '', name: '', sched: 'monthly', months: [], day: 0, method: 'sup', kind: 'khac', chan: 'online', group: 'Khác', hint: 0 };
  if (!it) return;
  $('#itemSheetIn').innerHTML = `<div class="grab"></div>
    <div class="row between"><h2>${id ? 'Sửa khoản cố định' : 'Thêm khoản vào ' + mLabel(curMonth)}</h2><button class="btn sm ghost" type="button" data-close>Đóng</button></div>
    <div class="fgrid">
      <div class="field wide"><label for="iName">Tên khoản</label><input id="iName" value="${esc(it.name)}"></div>
      <div class="field"><label for="iSched">Quy luật lặp</label><select id="iSched">${Object.entries(SCHED).map(([k, n]) => `<option value="${k}"${k === it.sched ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label for="iDay">Ngày đóng (0 = trong tháng)</label><input id="iDay" inputmode="numeric" value="${it.day || 0}"></div>
      <div class="field"><label for="iHint">Số tiền thường</label><input id="iHint" inputmode="numeric" value="${it.hint ? fmt(it.hint) : ''}"></div>
      <div class="field"><label for="iMethod">Cách trả gợi ý</label><select id="iMethod">${['auto', 'sup', 'eve', 'eco', 'ck', 'cash'].map(m => `<option value="${m}"${m === it.method ? ' selected' : ''}>${m === 'auto' ? 'App tự chọn thẻ' : METHODS[m].name}</option>`).join('')}</select></div>
      <div class="field"><label for="iChan">Kênh</label><select id="iChan"><option value="online"${it.chan === 'online' ? ' selected' : ''}>Online</option><option value="quay"${it.chan !== 'online' ? ' selected' : ''}>Tại quầy</option></select></div>
      <div class="field wide"><label for="iGroup">Nhóm</label><select id="iGroup">${GROUPS.map(g => `<option${g === it.group ? ' selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field wide"><label for="iKind">Nhóm hoàn / MCC</label><select id="iKind">${Object.entries(KINDS).map(([k, n]) => `<option value="${k}"${k === it.kind ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    <button class="btn primary" type="button" id="iSave">Lưu</button>
    ${id ? '<button class="btn danger" type="button" id="iDel">Xóa khoản này khỏi kế hoạch</button>' : ''}`;
  $('#iHint').oninput = e => { const d = digits(e.target.value); e.target.value = d ? fmt(d) : ''; };
  $('#iSave').onclick = () => {
    const name = $('#iName').value.trim(); if (!name) { toast('Nhập tên khoản'); return; }
    const data = { name, sched: $('#iSched').value, day: Math.min(31, digits($('#iDay').value)), hint: digits($('#iHint').value), method: $('#iMethod').value, chan: $('#iChan').value, group: $('#iGroup').value, kind: $('#iKind').value, text: name };
    if (!isCard(data.method) && data.method !== 'auto') data.kind = 'none';
    if (id) { if (data.sched !== it.sched) data.anchor = curMonth; Object.assign(it, data); }
    else {
      // khoản mới: thêm luôn vào tháng đang xem, tháng sau "Chép" sẽ theo quy luật đã chọn
      const nid = 'i' + newUid();
      S.plan.items.push(Object.assign({ id: nid, anchor: curMonth }, data));
      const en = entry(curMonth, nid, true); en.amt = data.hint || 0; en.day = data.day; en.updatedAt = nowIso();
    }
    save(true); closeSheets(); renderAll(); toast(id ? 'Đã lưu khoản cố định' : `Đã thêm vào ${mLabel(curMonth)}`);
  };
  if (id) { let arm = false; $('#iDel').onclick = e => { if (!arm) { arm = true; e.currentTarget.textContent = 'Bấm lần nữa để xóa'; return; } S.plan.items = S.plan.items.filter(i => i.id !== id); save(true); closeSheets(); renderAll(); toast('Đã xóa khoản'); }; }
  openSheet('itemSheet');
}
function openBuy(id) {
  const b = id ? S.plan.buys.find(x => x.id === id) : { id: '', name: '', amt: 0, kind: 'dienmay', chan: 'online', pay: 'full' };
  if (!b) return;
  $('#itemSheetIn').innerHTML = `<div class="grab"></div>
    <div class="row between"><h2>${id ? 'Sửa dự định mua' : 'Dự định mua'}</h2><button class="btn sm ghost" type="button" data-close>Đóng</button></div>
    <div class="fgrid">
      <div class="field wide"><label for="bName">Món định mua</label><input id="bName" value="${esc(b.name)}" placeholder="VD: tủ lạnh"></div>
      <div class="field"><label for="bAmt">Giá khoảng</label><input id="bAmt" inputmode="numeric" value="${b.amt ? fmt(b.amt) : ''}"></div>
      <div class="field"><label for="bChan">Mua ở đâu</label><select id="bChan"><option value="online"${b.chan === 'online' ? ' selected' : ''}>Đặt online</option><option value="quay"${b.chan !== 'online' ? ' selected' : ''}>Tại quầy</option></select></div>
      <div class="field wide"><label for="bKind">Loại</label><select id="bKind">${['dienmay', 'tmdt', 'nhasach', 'khac'].map(k => `<option value="${k}"${k === b.kind ? ' selected' : ''}>${KINDS[k]}</option>`).join('')}</select></div>
    </div>
    <button class="btn primary" type="button" id="bSave">Lưu</button>
    ${id ? '<button class="btn danger" type="button" id="bDel">Xóa dự định này</button>' : ''}`;
  $('#bAmt').oninput = e => { const d = digits(e.target.value); e.target.value = d ? fmt(d) : ''; };
  $('#bSave').onclick = () => {
    const name = $('#bName').value.trim(), amt = digits($('#bAmt').value);
    if (!name || !amt) { toast('Nhập tên món và giá'); return; }
    const data = { name, amt, chan: $('#bChan').value, kind: $('#bKind').value };
    if (id) { Object.assign(b, data); b.month = null; b.method = null; b.date = null; } else S.plan.buys.push(Object.assign({ id: newUid(), pay: 'full', month: null, method: null, date: null, bought: false }, data));
    save(true); closeSheets(); renderAll(); toast('Đã lưu. Xem gợi ý tháng nên mua ở Kế hoạch tháng.');
  };
  if (id) { let arm = false; $('#bDel').onclick = e => { if (!arm) { arm = true; e.currentTarget.textContent = 'Bấm lần nữa để xóa'; return; } S.plan.buys = S.plan.buys.filter(x => x.id !== id); save(true); closeSheets(); renderAll(); }; }
  openSheet('itemSheet');
}
$('#addItem').addEventListener('click', () => openItem(null));
$('#addBuy').addEventListener('click', () => openBuy(null));

/* ===================================================================
   TRANG 3 — BÁO CÁO
   =================================================================== */
const RG = { mode: 'month', anchor: TODAY(), from: '', to: '' };
const pPer = { sup: null, eve: null };
function rangeOf() {
  const d = parseYmd(RG.anchor), y = d.getFullYear(), m = d.getMonth() + 1;
  if (RG.mode === 'day') return { start: RG.anchor, end: RG.anchor, label: `${WD[d.getDay()]}, ${dmy(RG.anchor)}` };
  if (RG.mode === 'month') { const mk = monthKey(RG.anchor); return { start: `${mk}-01`, end: dateIn(mk, 31), label: `Tháng ${m}/${y}` }; }
  if (RG.mode === 'quarter') { const q = Math.ceil(m / 3), sm = `${y}-${pad(q * 3 - 2)}`, em = `${y}-${pad(q * 3)}`; return { start: `${sm}-01`, end: dateIn(em, 31), label: `Quý ${q}/${y}` }; }
  if (RG.mode === 'year') return { start: `${y}-01-01`, end: `${y}-12-31`, label: `Năm ${y}` };
  const f = RG.from || addDays(TODAY(), -30), t = RG.to || TODAY();
  return { start: f <= t ? f : t, end: f <= t ? t : f, label: `${dmy(f <= t ? f : t)} – ${dmy(f <= t ? t : f)}` };
}
function stepRange(n) {
  const d = parseYmd(RG.anchor);
  if (RG.mode === 'day') d.setDate(d.getDate() + n);
  else if (RG.mode === 'month') d.setMonth(d.getMonth() + n, 1);
  else if (RG.mode === 'quarter') d.setMonth(d.getMonth() + 3 * n, 1);
  else if (RG.mode === 'year') d.setFullYear(d.getFullYear() + n, 0, 1);
  RG.anchor = ymd(d);
}
function reminders() {
  const out = [], today = TODAY();
  // thanh toán thẻ
  for (const c of ['sup', 'eve']) {
    const cd = S.cards[c];
    const last = stmtPeriod(c, addDays(stmtPeriod(c, today).start, -1));
    const due = dueOf(last, cd.dueDay);
    const n = daysBetween(today, due);
    const bal = S.tx.filter(t => t.method === c && t.date >= last.start && t.date <= last.end).reduce((s, t) => s + t.amount, 0);
    if (n >= 0 && n <= 5 && bal > 0) out.push({ w: true, t: `<b>Hạn trả ${METHODS[c].name} ${dm(due)}</b> (còn ${n} ngày): trả đủ ${fmt(bal)} đ của kỳ ${pLabel(last)} để tránh lãi 33–36%/năm.` });
  }
  // sắp chốt sao kê Supreme
  const sp = stmtPeriod('sup', today), nClose = daysBetween(today, sp.end);
  if (nClose >= 0 && nClose <= 7) out.push({ t: `<b>Supreme chốt sao kê ${dm(sp.end)}</b> (còn ${nClose} ngày). Khoản lớn muốn tính vào kỳ này thì mua trước ngày này.` });
  // mốc & trần
  buildProjection();
  const se = supEst(spendsIn('sup', sp, { plan: true }));
  if (se.T > 0 && se.T < S.rules.sup.min && nClose <= 10) out.push({ w: true, t: `<b>Supreme kỳ này mới ${fmt(se.T)} đ</b> (kể cả kế hoạch), chưa đủ ${short(S.rules.sup.min)}: chỉ được ${pct(S.rules.sup.base)}.` });
  const ep = cashPeriod('eve', today), ee = eveEst(spendsIn('eve', ep));
  if (ee.cap && ee.est >= ee.cap * .8) out.push({ t: `<b>Everyday sắp hết trần tháng:</b> đã dùng ${fmt(ee.est)} / ${fmt(ee.cap)}.` });
  // phí thường niên
  for (const c of ['sup', 'eve']) {
    const od = S.cards[c].openDate; if (!od) continue;
    const [oy, om] = od.split('-').map(Number); const yNow = parseYmd(today).getFullYear();
    let ann = `${yNow}-${pad(om)}-01`; if (ann < addDays(today, -1)) ann = `${yNow + 1}-${pad(om)}-01`;
    const n = daysBetween(today, ann);
    if (n >= 0 && n <= 30) {
      const spent = S.tx.filter(t => t.method === c && t.date >= addDays(ann, -365) && t.date < ann).reduce((s, t) => s + t.amount, 0);
      out.push({ t: `<b>Phí thường niên ${METHODS[c].name}</b> khoảng ${dm(ann)}: ${fmt(S.cards[c].fee)} đ. Đã chi ${short(spent)} / ${short(S.cards[c].feeWaive)} để được miễn.` });
    }
  }
  // thể lệ hết hạn
  const exp = [['OneU (Techcombank)', S.rules.eve.expiry], ['Shinhan Supreme', S.rules.sup.expiry], ['Inspire Pro', S.rules.inspire.expiry]];
  for (const [n, d] of exp) { if (!d) continue; const k = daysBetween(today, d); if (k <= 7) out.push({ w: k < 0, t: k < 0 ? `<b>Thể lệ ${n} đã hết hạn ${dmy(d)}.</b> Nhờ Claude kiểm tra quy định mới (trang Nguyên tắc → Cập nhật quy định).` : `<b>Thể lệ ${n} hết hạn ${dmy(d)}</b> (còn ${k} ngày).` }); }
  // gửi tiết kiệm
  if (S.settings.saveRemind) { const day = parseYmd(today).getDate(); if (day >= 3 && day <= 8) out.push({ t: '<b>Ngày 3–8:</b> gửi tiết kiệm mới được cộng tới 1,5%/năm (Inspire Pro).' }); }
  // hoàn thực nhận lệch
  const prevSup = stmtPeriod('sup', addDays(sp.start, -1)), prevEve = cashPeriod('eve', addDays(ep.start, -1));
  for (const p of [prevSup, prevEve]) {
    const act = S.actual[p.key]; if (act == null) continue;
    const est = estFor(p.card, spendsIn(p.card, p)).est;
    if (Math.abs(act - est) > Math.max(20000, est * .15)) out.push({ w: true, t: `<b>${METHODS[p.card].name} ${pLabel(p)}:</b> hoàn thực nhận ${fmt(act)}, dự kiến ${fmt(est)}. Kiểm tra MCC (sửa khoản chi → Nhóm hoàn / MCC thực tế).` });
  }
  // sao lưu
  const lastSave = S.exportedAt || S.firstAt;
  if ((!S.exportedAt || (S.changedAt || '') > S.exportedAt) && S.changedAt && (Date.now() - new Date(lastSave)) > 7 * 864e5) out.push({ w: true, t: '<b>Đã hơn 7 ngày chưa lưu lên OneDrive.</b> Bấm nút đám mây ở trang Nhập liệu → Lưu lên OneDrive.' });
  // chưa nhập ngày chốt
  if (!S.cards.sup.confirmed || !S.cards.eve.confirmed) out.push({ t: '<b>Chưa nhập ngày chốt sao kê, ngày đến hạn của thẻ.</b> App đang dùng tạm (Supreme chốt 20, Everyday chốt 25). Sửa ở trang Nguyên tắc.' });
  return out;
}
function renderReport() {
  $('#reminders').innerHTML = reminders().map(r => `<div class="remind${r.w ? ' warn' : ''}"><span class="dot"></span><span>${r.t}</span></div>`).join('');
  // đến hạn tuần này
  const today = TODAY();
  // chỉ nhắc: khoản có ngày đóng trong 7 ngày tới (hoặc quá hạn ≤10 ngày) mà chưa thấy trong sổ
  const due = PROJ.filter(r => !r.buy && !r.past && r.day && r.actual === 0 && r.date >= addDays(today, -10) && r.date <= addDays(today, 7)).sort((a, b) => a.date.localeCompare(b.date));
  $('#dueWrap').hidden = !due.length;
  $('#dueList').innerHTML = due.map(r => {
    const amt = r.amt || lastAmount(r.id, r.mk) || r.item.hint || 0;
    const n = daysBetween(today, r.date);
    const g = rowGain(r);
    return `<div class="due"><span class="sticker"><img src="${img(isCard(r.method) ? 'card' : 'wallet')}" alt=""></span>
      <div class="grow"><div style="font-weight:600">${esc(r.item.name)}</div><div class="when">Hạn ${dm(r.date)} · ${n < 0 ? `<b style="color:var(--bad)">quá ${-n} ngày</b>` : n === 0 ? 'hôm nay' : `còn ${n} ngày`}${r.item.note ? ' · ' + esc(r.item.note) : ''}</div>
      <div class="row wrap" style="gap:6px;margin-top:4px">${pill(r.method)}${g >= 1 ? `<span class="xs cbk">~${fmt(g)} hoàn</span>` : ''}</div></div>
      <b class="num">${amt ? fmt(amt) : '—'}</b></div>`;
  }).join('');
  // khoảng thời gian
  const rg = rangeOf();
  $('#rangeLabel').textContent = rg.label;
  $$('#rangeNav button').forEach(b => { b.hidden = RG.mode === 'custom'; });
  $('#customRange').hidden = RG.mode !== 'custom';
  const tx = S.tx.filter(t => t.date >= rg.start && t.date <= rg.end);
  const fam = tx.filter(t => t.group !== BIZ), biz = tx.filter(t => t.group === BIZ);
  const famT = fam.reduce((s, t) => s + t.amount, 0);
  $('#repTotal').textContent = fmt(famT) + ' đ';
  $('#repCount').textContent = `chi phí gia đình · ${fam.length} khoản`;
  $('#repBiz').textContent = fmt(biz.reduce((s, t) => s + t.amount, 0));
  const by = {}; fam.forEach(t => { by[t.group] = (by[t.group] || 0) + t.amount; });
  const gs = Object.entries(by).sort((a, b) => b[1] - a[1]);
  $('#groupBars').innerHTML = gs.length ? gs.map(([n, v]) => `<div class="bar"><span>${esc(n)}</span><span class="num" style="font-weight:600">${fmt(v)}</span><div class="track"><i style="width:${v / gs[0][1] * 100}%"></i></div></div>`).join('') : '<div class="empty small">Chưa có khoản chi trong khoảng này.</div>';
  const pm = {}; tx.forEach(t => { pm[t.method] = (pm[t.method] || 0) + t.amount; });
  const allT = tx.reduce((s, t) => s + t.amount, 0) || 1;
  const order = ['sup', 'eve', 'eco', 'ck', 'cash'];
  $('#payBar').innerHTML = order.filter(m => pm[m]).map(m => `<i style="width:${pm[m] / allT * 100}%;background:var(--c-${m})" title="${METHODS[m].name}"></i>`).join('');
  $('#payLegend').innerHTML = order.map(m => `<div><span class="sw" style="background:var(--c-${m})"></span><span>${METHODS[m].name}${METHODS[m].type ? ` <span class="xs muted">${METHODS[m].type.toLowerCase()}</span>` : ''}</span><span class="v num">${short(pm[m] || 0)}</span></div>`).join('');
  renderCardReports();
  // sắp trả
  const up = PROJ.filter(r => !r.past && r.actual === 0 && r.date > addDays(today, 7) && r.date <= addDays(today, 30) && (r.amt || r.item.hint)).sort((a, b) => a.date.localeCompare(b.date));
  $('#upcoming').innerHTML = up.length ? up.map(r => { const g = rowGain(r); const a = r.amt || r.item.hint; return `<div class="item"><span class="sticker sm"><img src="${img(isCard(r.method) ? 'card' : 'wallet')}" alt=""></span><span class="grow"><span style="font-weight:600;display:block">${esc(r.item.name)}</span><span class="sub">${r.day ? 'hạn ' + dm(r.date) : 'trong ' + mLabel(r.mk)} · ${pill(r.method)}${r.amt ? '' : '<span class="tag">số lần trước</span>'}</span></span><span><span class="amt num" style="display:block">${fmt(a)}</span>${g >= 1 ? `<span class="cbk num" style="display:block;text-align:right">~${fmt(g)} hoàn</span>` : ''}</span></div>`; }).join('') : '<div class="empty small">Không có khoản nào trong 30 ngày tới.</div>';
  // danh sách khoản chi
  const sorted = tx.slice().sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  $('#txCount').textContent = `${sorted.length} khoản`;
  $('#txList').innerHTML = sorted.length ? sorted.map(txItem).join('') : '<div class="empty small">Chưa có khoản nào.</div>';
}
function renderCardReports() {
  const today = TODAY();
  if (!pPer.sup) pPer.sup = cashPeriod('sup', today);
  if (!pPer.eve) pPer.eve = cashPeriod('eve', today);
  $('#cardReports').innerHTML = ['sup', 'eve'].map(c => {
    const p = pPer[c], R = S.rules[c];
    const act = estFor(c, spendsIn(c, p)), proj = estFor(c, spendsIn(c, p, { plan: true }));
    const spent = act.T, planned = proj.T - act.T;
    const ended = p.end < today, actual = S.actual[p.key];
    const capNow = proj.cap || (c === 'sup' ? R.cap : R.cap);
    const wAct = capNow ? Math.min(100, act.est / capNow * 100) : 0, wProj = capNow ? Math.min(100, proj.est / capNow * 100) : 0;
    let flag = '';
    if (actual != null) flag = Math.abs(actual - act.est) > Math.max(20000, act.est * .15) ? '<span class="tag warn">lệch, kiểm tra MCC</span>' : '<span class="tag ok">khớp dự kiến</span>';
    else if (S.stmts[p.key]) flag = '<span class="tag ok">đã khớp sao kê</span>';
    const yearStart = addDays(today, -365);
    const yearSpent = S.tx.filter(t => t.method === c && t.date >= yearStart).reduce((s, t) => s + t.amount, 0);
    return `<div class="cardrep">
      <div class="row between wrap"><span class="row" style="gap:8px">${pill(c)}<span class="pnav"><button type="button" data-pnav="${c}:-1" aria-label="Kỳ trước">‹</button><span class="small muted">${c === 'sup' ? 'kỳ ' + pLabel(p) : 'tháng ' + (+p.start.slice(5, 7)) + '/' + p.start.slice(0, 4)}</span><button type="button" data-pnav="${c}:1" aria-label="Kỳ sau">›</button></span></span>${flag}</div>
      <div class="row between small"><span class="muted">Trần hoàn</span><b class="num">${fmt(act.est)} / ${capNow ? fmt(capNow) : '—'}${capNow && act.est >= capNow - 1 ? ' · đã chạm trần' : ''}</b></div>
      <div class="meter ${c}"><i class="ghost" style="width:${wProj}%"></i><i style="width:${wAct}%"></i></div>
      <div class="kv">
        <span class="k">Đã chi trong ${c === 'sup' ? 'kỳ' : 'tháng'}</span><span class="v num">${fmt(spent)}</span>
        ${planned > 0 ? `<span class="k">Dự kiến thêm (kế hoạch)</span><span class="v num">${fmt(planned)}</span>` : ''}
        ${c === 'sup' ? `<span class="k">Mốc ${short(R.min)}</span><span class="v" style="color:${proj.T >= R.min ? 'var(--ok)' : 'var(--warn)'}">${proj.T >= R.min ? 'đã đạt' : 'còn thiếu ' + fmt(R.min - proj.T)}</span>
        <span class="k">Còn tới mốc ${short(R.high)}</span><span class="v num">${proj.T >= R.high ? 'đã đạt' : fmt(R.high - proj.T)}</span>` : ''}
        <span class="k">Hoàn dự kiến${planned > 0 ? ' (cả kế hoạch)' : ''}</span><span class="v num">${fmt(act.est)}${planned > 0 ? ` (${fmt(proj.est)})` : ''}</span>
        <span class="k">Thực nhận ${c === 'sup' ? '(điểm sao kê)' : '(U-Point)'}</span><span class="v"><input inputmode="numeric" data-actual="${p.key}" value="${actual != null ? fmt(actual) : ''}" placeholder="${ended ? 'nhập số' : 'sau kỳ'}"></span>
        <span class="k">Chi 12 tháng (miễn phí năm)</span><span class="v num">${short(yearSpent)} / ${short(S.cards[c].feeWaive)}</span>
      </div></div>`;
  }).join('');
}
$('#cardReports').addEventListener('click', e => { const b = e.target.closest('[data-pnav]'); if (!b) return; const [c, n] = b.dataset.pnav.split(':'); pPer[c] = shiftPeriod(pPer[c], +n); renderCardReports(); });
$('#cardReports').addEventListener('change', e => { const i = e.target.closest('[data-actual]'); if (!i) return; const v = i.value.trim(); if (v === '') delete S.actual[i.dataset.actual]; else S.actual[i.dataset.actual] = digits(v); save(true); renderReport(); });
$('#cardReports').addEventListener('input', e => { const i = e.target.closest('[data-actual]'); if (!i) return; const d = digits(i.value); i.value = i.value.trim() === '' ? '' : fmt(d); });
$('#rangeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; RG.mode = b.dataset.r; RG.anchor = TODAY(); $$('#rangeSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (RG.mode === 'custom') { $('#rFrom').value = RG.from || addDays(TODAY(), -30); $('#rTo').value = RG.to || TODAY(); } renderReport(); });
$('#rangeNav').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (!b) return; stepRange(+b.dataset.step); renderReport(); });
$('#rFrom').addEventListener('change', e => { RG.from = e.target.value; renderReport(); });
$('#rTo').addEventListener('change', e => { RG.to = e.target.value; renderReport(); });

/* ===================================================================
   TRANG 4 — NGUYÊN TẮC DÙNG THẺ
   =================================================================== */
const CARD_INFO = {
  sup: { name: 'Shinhan Supreme', type: 'Tín dụng Visa · hạng Chuẩn' },
  eve: { name: 'Techcombank Everyday', type: 'Tín dụng Visa' },
  eco: { name: 'Techcombank Eco', type: 'Ghi nợ · phi vật lý' }
};
function rateRows(c) {
  const R = S.rules[c];
  if (c === 'sup') return [
    ['TMĐT 5262, điện máy 5732/5722, giáo dục, nhà sách', pct(R.rates.tmdt)], ['Bệnh viện 8011/8062/8099, bảo hiểm 6300/5960', pct(R.rates.baohiem)],
    ['Mọi khoản khác', pct(R.base)], [`Trần: kỳ ≥${short(R.min)} / kỳ ≥${short(R.high)}`, `${short(R.cap)} / ${short(R.capHigh)}`],
    [`Kỳ dưới ${short(R.min)}`, `chỉ ${pct(R.base)}`], ['Phí ngoại tệ', pct(R.fx)], ['Trả góp 0% (từ 3tr)', 'mất toàn bộ điểm']];
  if (c === 'eve') return [
    ['Online quốc tế', pct(R.intl)], [`Online nội địa (mỗi GD ≥${short(R.minTx)})`, pct(R.online)], ['Quẹt tại quầy', '~0'],
    [`Trần tháng (tổng chi ≥${short(R.high)}: ${short(R.capHigh)})`, short(R.cap)], ['Phí ngoại tệ', pct(R.fx)]];
  return [['Hoàn cố định', 'Không có'], ['Voucher lẻ', 'Starbucks, Grab/Be, Metro']];
}
function renderRules() {
  const unconf = !S.cards.sup.confirmed || !S.cards.eve.confirmed;
  $('#cardsBanner').innerHTML = unconf ? '<div class="remind warn"><span class="dot"></span><span><b>Nhập ngày chốt sao kê và ngày đến hạn</b> của Supreme và Everyday (mở thẻ bên dưới, sửa ô, bấm Lưu). App dùng các ngày này để biết khoản rơi vào kỳ nào.</span></div>' : '';
  const open = $('#cardBoxes').dataset.open || 'sup';
  $('#cardBoxes').innerHTML = ['sup', 'eve', 'eco'].map(c => {
    const cd = S.cards[c], info = CARD_INFO[c];
    const f = c === 'eco' ? [['openDate', 'Ngày mở thẻ', 'month']] : [['limit', 'Hạn mức', 'money'], ['closeDay', 'Ngày chốt sao kê', 'day'], ['dueDay', 'Ngày đến hạn thanh toán', 'day'], ['openDate', 'Ngày mở thẻ', 'month'], ['fee', 'Phí thường niên', 'money'], ['feeWaive', 'Chi để miễn phí (năm)', 'money']];
    const ex = c === 'sup' ? `Loại trừ: nạp ví, rút tiền mặt, phí, lãi, trả góp, Bill Payment của Shinhan. Thể lệ: ${S.rules.sup.expiry ? 'hết hạn ' + dmy(S.rules.sup.expiry) : 'chưa thấy ngày hết hạn'}.`
      : c === 'eve' ? `Loại trừ: nạp ví, rút tiền, phí, lãi, trả góp; có thể loại trừ tiện ích 4900, dịch vụ số 5734, 5815–5818. Thể lệ OneU hết hạn ${S.rules.eve.expiry ? dmy(S.rules.eve.expiry) : '—'}.`
      : 'Dùng khi có voucher, hoặc thay tiền mặt cho khoản nhỏ.';
    return `<details class="cardbox" data-card="${c}"${open === c ? ' open' : ''}>
      <summary><div class="bankcard ${c}"><div class="chip"></div><div><div class="nm">${info.name}</div><div class="ty">${info.type}</div></div><span class="upd">cập nhật ${dmy(S.rules[c].updated)}</span></div></summary>
      <div class="cardbody">
        <div class="fgrid">${f.map(([k, l, t]) => `<div class="field"><label for="cf-${c}-${k}">${l}</label><input id="cf-${c}-${k}" data-cf="${c}:${k}:${t}" ${t === 'month' ? 'type="month"' : 'inputmode="numeric"'} value="${t === 'money' ? (cd[k] ? fmt(cd[k]) : '') : (cd[k] || '')}"></div>`).join('')}</div>
        ${c !== 'eco' ? `<p class="small" data-cfhint="${c}" style="padding:9px 11px;border-radius:12px;background:var(--surface-2)">${dueHint(c, cd.closeDay, cd.dueDay)}</p>
        <button class="btn sm primary" type="button" data-cfsave="${c}">Lưu thông tin thẻ</button>` : ''}
        <table class="rates"><tbody>${rateRows(c).map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>
        <p class="small muted">${ex}</p>
      </div></details>`;
  }).join('');
  // khoản nào → thẻ nào
  const MCC = { baohiem: '6300', tmdt: '5262', sub_usd: '5734/5817 ?', thuoc: '5912', sieuthi: '5411', dien: '4900', sub_vnd: '5815–5818', tiem: '5912 / 8011 ?', none: '–', dienmay: '5732/5722', benhvien: '8062', nhasach: '5942' };
  const rateOf = it => { if (it.method === 'auto') return 'tự chọn'; if (!isCard(it.method)) return '0'; if (it.method === 'sup') return pct(supRate(it.kind)); if (it.method === 'eve') return pct(eveRate({ kind: it.kind, chan: it.chan, amt: Math.max(it.hint || 0, S.rules.eve.minTx) })); return '0'; };
  $('#mapRows').innerHTML = S.plan.items.map(it => `<tr><td>${esc(it.name)}</td><td>${it.method === 'auto' ? '<span class="pill m-eve">Everyday</span> / <span class="pill m-sup">Supreme</span>' : pill(it.method)}</td><td class="num">${MCC[it.kind] || '–'}</td><td class="num">${rateOf(it)}</td></tr>`).join('')
    + `<tr><td>Viện phí Vinmec</td><td>${pill('sup')}</td><td class="num">8062</td><td class="num">${pct(S.rules.sup.rates.benhvien)}</td></tr>`;
  $('#inspireTag').textContent = 'tới ' + dmy(S.rules.inspire.expiry);
  $('#saveRemind').checked = !!S.settings.saveRemind;
  $('#appVersion').textContent = `Sổ chi tiêu · phiên bản ${APP_VERSION}`;
  renderSyncInfo();
}
$('#cardBoxes').addEventListener('toggle', e => { const d = e.target.closest('details[data-card]'); if (d && d.open) $('#cardBoxes').dataset.open = d.dataset.card; }, true);
// Dòng kiểm tra: kỳ sao kê gần nhất và ngày phải trả, tính theo số đang gõ (chưa cần bấm Lưu)
function dueHint(c, closeDay, dueDay) {
  if (!closeDay || !dueDay) return 'Nhập ngày chốt và ngày đến hạn để xem kỳ sao kê.';
  const saved = S.cards[c].closeDay; S.cards[c].closeDay = closeDay;
  const cur = stmtPeriod(c, TODAY()), last = stmtPeriod(c, addDays(cur.start, -1));
  S.cards[c].closeDay = saved;
  const d1 = dueOf(last, dueDay), d2 = dueOf(cur, dueDay);
  const sameMonth = monthKey(d1) === monthKey(last.end);
  return `Kỳ ${dmy(last.start)}–${dmy(last.end)} → hạn trả <b>${dmy(d1)}</b><br>Kỳ ${dmy(cur.start)}–${dmy(cur.end)} → hạn trả <b>${dmy(d2)}</b><br><span class="muted">Hạn trả rơi vào ${sameMonth ? 'cùng tháng với' : 'tháng sau'} ngày chốt. Đúng với sao kê thì bấm Lưu.</span>`;
}
$('#cardBoxes').addEventListener('input', e => {
  const i = e.target.closest('[data-cf]'); if (!i) return;
  const [c, , t] = i.dataset.cf.split(':');
  if (t === 'money') { const d = digits(i.value); i.value = d ? fmt(d) : ''; }
  if (t === 'day') i.value = String(Math.min(31, digits(i.value)) || '');
  const h = $(`[data-cfhint="${c}"]`);
  if (h) h.innerHTML = dueHint(c, digits(($(`[data-cf="${c}:closeDay:day"]`) || {}).value), digits(($(`[data-cf="${c}:dueDay:day"]`) || {}).value));
});
$('#cardBoxes').addEventListener('change', e => { const i = e.target.closest('[data-cf]'); if (!i) return; const [c, k, t] = i.dataset.cf.split(':'); if (c === 'eco') { S.cards.eco[k] = i.value; save(true); } });
$('#cardBoxes').addEventListener('click', e => {
  const b = e.target.closest('[data-cfsave]'); if (!b) return;
  const c = b.dataset.cfsave;
  $$(`[data-cf^="${c}:"]`).forEach(i => { const [, k, t] = i.dataset.cf.split(':'); S.cards[c][k] = t === 'month' ? i.value : (t === 'day' ? Math.min(31, digits(i.value)) || DEFAULT_CARDS[c][k] : digits(i.value)); });
  S.cards[c].confirmed = true; pPer.sup = null; pPer.eve = null;
  save(true); renderAll(); toast(`Đã lưu thông tin ${METHODS[c].name}. App đã tính lại kỳ.`);
});
$('#saveRemind').addEventListener('change', e => { S.settings.saveRemind = e.target.checked; save(true); renderReport(); });

/* ===================================================================
   ĐỒNG BỘ ONEDRIVE (qua file trong ứng dụng Tệp, giống app bánh bao)
   =================================================================== */
const stamp = s => { if (!s) return 'chưa có'; const d = new Date(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function renderSyncDot() { const on = !S.exportedAt || (S.changedAt || '') > S.exportedAt; $$('[data-syncdot]').forEach(d => { d.hidden = !on || !S.changedAt; }); }
function renderSyncInfo() {
  const t = `Lưu lên OneDrive gần nhất: <b>${stamp(S.exportedAt)}</b> · Lấy về gần nhất: <b>${stamp(S.importedAt)}</b>${(!S.exportedAt || (S.changedAt || '') > S.exportedAt) && S.changedAt ? '<br><span style="color:var(--bad)">Máy này còn thay đổi chưa lưu lên OneDrive.</span>' : ''}`;
  $('#syncInfo').innerHTML = t; $('#syncInfo4').innerHTML = t;
}
function exportData() {
  return JSON.stringify({ app: 'so-chi-tieu', v: 1, savedAt: nowIso(), tx: S.tx, deleted: S.deleted, plan: S.plan, cards: S.cards, rules: S.rules, merchants: S.merchants, actual: S.actual, stmts: S.stmts, settings: S.settings, cfgAt: S.cfgAt, firstAt: S.firstAt });
}
function mergeIn(d) {
  if (!d || d.app !== 'so-chi-tieu' || !Array.isArray(d.tx)) throw new Error('bad file');
  const fresh = !S.changedAt;   // máy mới / vừa cài lại: lấy nguyên bản trên OneDrive
  let added = 0, updated = 0;
  for (const [u, t] of Object.entries(d.deleted || {})) if (!S.deleted[u] || S.deleted[u] < t) S.deleted[u] = t;
  const mine = new Map(S.tx.map(t => [t.uid, t]));
  for (const t of d.tx) {
    if (!t || !t.uid) continue;
    const m = mine.get(t.uid);
    if (!m) { S.tx.push(t); mine.set(t.uid, t); added++; }
    else if ((t.updatedAt || '') > (m.updatedAt || '')) { Object.assign(m, t); updated++; }
  }
  const before = S.tx.length;
  S.tx = S.tx.filter(t => !(S.deleted[t.uid] && S.deleted[t.uid] >= (t.updatedAt || '')));
  const removed = before - S.tx.length;
  let cfg = false;
  if ((d.cfgAt || '') > (S.cfgAt || '') || !S.changedAt) {
    for (const k of ['plan', 'cards', 'rules', 'merchants', 'actual', 'stmts', 'settings']) if (d[k]) S[k] = d[k];
    S.cfgAt = d.cfgAt || S.cfgAt; if (d.firstAt && d.firstAt < S.firstAt) S.firstAt = d.firstAt;
    fixup(S); cfg = true;
  }
  S.importedAt = nowIso();
  if (fresh) { S.changedAt = S.exportedAt = S.importedAt; }       // giống hệt file trên OneDrive → không cần lưu lại
  else if (added || updated || removed) { S.changedAt = nowIso(); }
  persist(); renderSyncDot();
  return { added, updated, removed, cfg };
}
$$('[data-open-sync]').forEach(b => b.addEventListener('click', () => { renderSyncInfo(); openSheet('syncSheet'); }));
$('#syImport').addEventListener('click', () => $('#syFile').click());
$('#syFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const r = mergeIn(JSON.parse(await f.text()));
    applyVibe(); renderAll(); renderSyncInfo();
    toast(`Đã lấy dữ liệu · ${r.added} khoản mới · ${r.updated} cập nhật${r.removed ? ` · ${r.removed} đã xóa` : ''}${r.cfg ? ' · kế hoạch và thẻ' : ''}`);
  } catch (err) { toast('File không đúng. Chọn file SoChiTieu.json.'); }
});
$('#syExport').addEventListener('click', async () => {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const file = new File([blob], FILE, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch (err) { if (err.name === 'AbortError') return; toast('Không mở được bảng chia sẻ'); return; }
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = FILE; document.body.appendChild(a); a.click(); a.remove();
  }
  S.exportedAt = nowIso(); persist(); renderSyncDot(); renderSyncInfo();
  toast('Đã lưu file ' + FILE);
});

/* ===================================================================
   DÁN MÃ TỪ CLAUDE (#SAOKE, #QUYDINH)
   =================================================================== */
const CARD_NAME = { sup: 'Supreme', eve: 'Everyday', eco: 'Eco' };
const nameToCard = n => { n = String(n || '').toLowerCase(); return n.includes('supreme') || n.includes('shinhan') ? 'sup' : n.includes('everyday') ? 'eve' : n.includes('eco') ? 'eco' : null; };
const RULE_KEYS = {
  sup: { tmdt: ['rates.tmdt', 'p'], dien_may: ['rates.dienmay', 'p'], giao_duc: ['rates.giaoduc', 'p'], nha_sach: ['rates.nhasach', 'p'], benh_vien: ['rates.benhvien', 'p'], bao_hiem: ['rates.baohiem', 'p'], co_ban: ['base', 'p'], moc_toi_thieu: ['min', 'm'], tran: ['cap', 'm'], moc_cao: ['high', 'm'], tran_cao: ['capHigh', 'm'], phi_ngoai_te: ['fx', 'p'], het_han_the_le: ['expiry', 'd'] },
  eve: { online_noi_dia: ['online', 'p'], online_quoc_te: ['intl', 'p'], giao_dich_toi_thieu: ['minTx', 'm'], tran_thang: ['cap', 'm'], moc_cao: ['high', 'm'], tran_cao: ['capHigh', 'm'], phi_ngoai_te: ['fx', 'p'], het_han_the_le: ['expiry', 'd'] },
  eco: {},
  inspire: { het_han: ['expiry', 'd'] }
};
let pType = 'saoke', pending = null;
function periodsFor(card) {
  const out = []; let p = card === 'eco' ? cashPeriod('eve', TODAY()) : stmtPeriod(card, TODAY());
  for (let i = 0; i < 5; i++) { p = card === 'eco' ? cashPeriod('eve', addDays(p.start, -1)) : stmtPeriod(card, addDays(p.start, -1)); out.push(p); }
  return out;
}
function promptFor() {
  const card = $('#pCard').value;
  if (pType === 'saoke') {
    const p = periodsFor(card).find(x => x.key === $('#pPeriod').value) || periodsFor(card)[0];
    return `Tách sao kê ${CARD_NAME[card]} kỳ ${dmy(p.start)}–${dmy(p.end)} thành mã #SAOKE cho app Sổ chi tiêu.
Trả về đúng một khung mã, theo mẫu:
#SAOKE v1
the: ${CARD_NAME[card]}
ky: ${p.start} → ${p.end}
tong_chi: <tổng tiền> | tong_diem: <tổng điểm hoàn>
<ngày YYYY-MM-DD> | <tên cửa hàng> | <số tiền> | <điểm hoàn, để trống nếu sao kê không ghi>
(mỗi giao dịch một dòng; tiền viết dạng 1.000.000; bỏ dòng thanh toán thẻ, phí, lãi)`;
  }
  const keys = Object.keys(RULE_KEYS[card === 'eco' ? 'eco' : card]).join(', ');
  return `Kiểm tra quy định mới của thẻ ${CARD_NAME[card]}, cập nhật lần cuối ${dmy(S.rules[card].updated)}, trả mã #QUYDINH cho app Sổ chi tiêu.
Trả về đúng một khung mã, theo mẫu:
#QUYDINH v1
the: ${CARD_NAME[card]}
cap_nhat: <YYYY-MM-DD>
<khóa>: <giá trị cũ> -> <giá trị mới>
(chỉ ghi những dòng thay đổi; % viết dạng 5%, tiền dạng 500.000, ngày dạng YYYY-MM-DD; khóa dùng được: ${keys || 'không có'}${card === 'eve' ? ', inspire_het_han' : ''})`;
}
function renderPaste() {
  $$('#pasteType button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === pType)));
  $('#pPeriodWrap').hidden = pType !== 'saoke';
  const card = $('#pCard').value;
  if (pType === 'saoke') { const cur = $('#pPeriod').value; const ps = periodsFor(card); $('#pPeriod').innerHTML = ps.map(p => `<option value="${p.key}"${p.key === cur ? ' selected' : ''}>${pLabel(p)}/${p.end.slice(2, 4)}</option>`).join(''); }
  $('#pStep1').textContent = pType === 'saoke' ? '1. Copy câu lệnh, mở chat với Claude, dán vào và gửi kèm file PDF sao kê (che số thẻ, số tài khoản).' : '1. Copy câu lệnh, mở chat với Claude, dán vào và gửi. Claude tìm thể lệ mới trên web ngân hàng.';
  $('#promptText').textContent = promptFor();
  $('#codeIn').placeholder = pType === 'saoke' ? '#SAOKE v1 …' : '#QUYDINH v1 …';
}
function openPaste(t) { pType = t; pending = null; $('#preview').hidden = true; $('#codeIn').value = ''; $('#pCard').value = t === 'quydinh' ? 'eve' : 'sup'; renderPaste(); openSheet('pasteSheet'); }
$$('[data-open-paste]').forEach(b => b.addEventListener('click', () => openPaste(b.dataset.openPaste)));
$('#pasteType').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pType = b.dataset.t; $('#preview').hidden = true; renderPaste(); });
$('#pCard').addEventListener('change', renderPaste);
$('#pPeriod').addEventListener('change', () => { $('#promptText').textContent = promptFor(); });
function copyText(txt, box, okMsg) {
  const fallback = () => { const r = document.createRange(); r.selectNodeContents(box); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Đã chọn câu lệnh, bấm Sao chép của iPhone'); };
  try { navigator.clipboard.writeText(txt).then(() => toast(okMsg), fallback); } catch (err) { fallback(); }
}
$('#copyPrompt').addEventListener('click', () => copyText($('#promptText').textContent, $('#promptText'), 'Đã copy câu lệnh'));
const money = s => digits(String(s).replace(/,\d{1,2}$/, ''));
function parsePct(v) { const m = String(v).match(/(\d+(?:[.,]\d+)?)\s*%/); return m ? parseFloat(m[1].replace(',', '.')) / 100 : null; }
function parseMoneyStr(v) { const s = String(v).toLowerCase().trim(); const a = parseAmount(s); return a ? a.v : (digits(s) || null); }
function parseDateStr(v) { const s = String(v).trim(); let m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`; return null; }
function parseSaoke(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!/^#SAOKE/i.test(lines[0] || '')) throw new Error('Mã phải bắt đầu bằng #SAOKE.');
  const d = { lines: [] };
  for (const l of lines.slice(1)) {
    let m;
    if ((m = l.match(/^the\s*:\s*(.+)$/i))) { d.card = nameToCard(m[1]); continue; }
    if ((m = l.match(/^ky\s*:\s*(\S+)\s*(?:→|->|-|–|đến)\s*(\S+)/i))) { d.start = parseDateStr(m[1]); d.end = parseDateStr(m[2]); continue; }
    if ((m = l.match(/^tong_chi\s*:\s*([\d.,]+)(?:\s*\|\s*tong_diem\s*:\s*([\d.,]*))?/i))) { d.total = money(m[1]); d.points = m[2] ? money(m[2]) : null; continue; }
    const parts = l.split('|').map(x => x.trim());
    if (parts.length >= 3 && parseDateStr(parts[0])) d.lines.push({ date: parseDateStr(parts[0]), merchant: parts[1], amt: money(parts[2]), pts: parts[3] ? money(parts[3]) : null });
  }
  if (!d.card) throw new Error('Thiếu dòng "the:" (Supreme / Everyday / Eco).');
  if (!d.start || !d.end) throw new Error('Thiếu dòng "ky:" (ngày bắt đầu → ngày kết thúc).');
  if (!d.lines.length) throw new Error('Không thấy dòng giao dịch nào.');
  const sumA = d.lines.reduce((s, x) => s + x.amt, 0);
  if (d.total != null && Math.abs(sumA - d.total) > d.lines.length) throw new Error(`Tổng tiền các dòng (${fmt(sumA)}) không khớp tong_chi (${fmt(d.total)}). Nhờ Claude kiểm tra lại.`);
  const withPts = d.lines.filter(x => x.pts != null);
  if (d.points != null && withPts.length === d.lines.length) { const sumP = withPts.reduce((s, x) => s + x.pts, 0); if (Math.abs(sumP - d.points) > d.lines.length) throw new Error(`Tổng điểm các dòng (${fmt(sumP)}) không khớp tong_diem (${fmt(d.points)}).`); }
  return d;
}
function previewSaoke(d) {
  const used = new Set(), matched = [], added = [];
  for (const l of d.lines) {
    const t = S.tx.filter(x => x.method === d.card && x.amount === l.amt && !used.has(x.uid) && Math.abs(daysBetween(x.date, l.date)) <= 3).sort((a, b) => Math.abs(daysBetween(a.date, l.date)) - Math.abs(daysBetween(b.date, l.date)))[0];
    if (t) { used.add(t.uid); matched.push({ l, t }); } else added.push(l);
  }
  const missing = S.tx.filter(x => x.method === d.card && x.date >= d.start && x.date <= d.end && !used.has(x.uid));
  const key = d.card === 'sup' ? `sup:${d.end}` : d.card === 'eve' ? `eve:${monthKey(d.end)}` : `eco:${monthKey(d.end)}`;
  const mcc = [];
  for (const { l, t } of matched) {
    if (l.pts == null || !l.amt) continue;
    const r = l.pts / l.amt, exp = d.card === 'sup' ? supRate(t.kind) : d.card === 'eve' ? eveRate({ kind: t.kind, chan: t.chan, amt: t.amount }) : 0;
    if (exp > .01 && r < .005) mcc.push({ bad: true, t, r });
    else if (r >= .03) mcc.push({ bad: false, t, r });
  }
  return { d, matched, added, missing, key, mcc, exists: S.actual[key] != null || !!S.stmts[`stmt:${d.card}:${d.end}`] };
}
function applySaoke(pv) {
  const d = pv.d, now = nowIso();
  for (const { t } of pv.matched) { t.stmt = `stmt:${d.card}:${d.end}`; t.updatedAt = now; }
  for (const l of pv.added) {
    const c = classify(l.merchant);
    S.tx.push({ uid: newUid(), date: l.date, time: '', note: l.merchant, amount: l.amt, group: c.group === 'Khác' && c.mode === 'unknown' ? 'Khác' : c.group, method: d.card, kind: c.kind === 'none' ? 'khac' : c.kind, chan: c.chan, source: 'saoke', stmt: `stmt:${d.card}:${d.end}`, cb: l.pts || 0, updatedAt: now });
  }
  for (const m of pv.mcc) if (!m.bad) { const k = norm(m.t.note).trim(); S.merchants[k] = Object.assign(S.merchants[k] || { label: m.t.note }, { group: m.t.group, kind: m.t.kind, chan: m.t.chan, confirmed: true }); }
  if (d.points != null) S.actual[pv.key] = d.points;
  S.stmts[`stmt:${d.card}:${d.end}`] = { at: now, total: d.total, points: d.points };
  save(true);
}
function parseQuydinh(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!/^#QUYDINH/i.test(lines[0] || '')) throw new Error('Mã phải bắt đầu bằng #QUYDINH.');
  const d = { changes: [] };
  for (const l of lines.slice(1)) {
    const m = l.match(/^([a-z_]+)\s*:\s*(.+)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'the') { d.card = nameToCard(v); continue; }
    if (k === 'cap_nhat') { d.updated = parseDateStr(v); continue; }
    const nv = v.split(/->|→/).pop().trim();
    let grp = d.card, key = k;
    if (k === 'inspire_het_han') { grp = 'inspire'; key = 'het_han'; }
    const def = (RULE_KEYS[grp] || {})[key];
    if (!def) { d.changes.push({ k, unknown: true, raw: v }); continue; }
    const val = def[1] === 'p' ? parsePct(nv) : def[1] === 'm' ? parseMoneyStr(nv) : parseDateStr(nv);
    if (val == null) { d.changes.push({ k, unknown: true, raw: v }); continue; }
    const path = def[0].split('.'); let o = S.rules[grp]; for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
    d.changes.push({ k, grp, path, type: def[1], old: o[path[path.length - 1]], val });
  }
  if (!d.card) throw new Error('Thiếu dòng "the:".');
  if (!d.changes.length) throw new Error('Không có thay đổi nào trong mã.');
  return d;
}
const showVal = (v, t) => v == null || v === '' ? '—' : t === 'p' ? pct(v) : t === 'm' ? fmt(v) : dmy(v);
$('#readCode').addEventListener('click', () => {
  const v = $('#codeIn').value.trim(), pv = $('#preview');
  pending = null;
  if (!v) { toast('Chưa có mã: dán mã Claude trả lại vào ô trên'); return; }
  try {
    if (/^#SAOKE/i.test(v)) {
      const p = previewSaoke(parseSaoke(v)); pending = { type: 'saoke', p };
      const d = p.d;
      pv.innerHTML = `<div class="stack" style="gap:4px"><h3>Xem trước · ${CARD_NAME[d.card]} ${dm(d.start)}–${dm(d.end)}</h3><p class="xs muted">Tổng ${fmt(d.total != null ? d.total : d.lines.reduce((s, x) => s + x.amt, 0))} đ${d.points != null ? ` · điểm ${fmt(d.points)}` : ''} · khớp với các dòng.</p></div>
        <div class="check"><span class="mk ok">✓</span><span class="grow">Khớp sổ ${p.matched.length} giao dịch${p.matched.length ? ': ' + esc(p.matched.slice(0, 4).map(m => m.t.note).join(', ')) + (p.matched.length > 4 ? '…' : '') : ''}</span></div>
        <div class="check"><span class="mk add">+</span><span class="grow">Thêm ${p.added.length} khoản từ sao kê${p.added.length ? ': ' + esc(p.added.slice(0, 3).map(l => `${l.merchant} ${fmt(l.amt)}`).join(', ')) + (p.added.length > 3 ? '…' : '') : ''}</span></div>
        <div class="check"><span class="mk ${p.missing.length ? 'bad' : 'no'}">${p.missing.length || 0}</span><span class="grow">Có trong sổ nhưng không có trong sao kê${p.missing.length ? ': ' + esc(p.missing.slice(0, 3).map(t => `${t.note} ${fmt(t.amount)}`).join(', ')) : ': không có'}</span></div>
        ${p.mcc.map(m => `<div class="check"><span class="mk ${m.bad ? 'bad' : 'ok'}">${m.bad ? '!' : '✓'}</span><span class="grow">${esc(m.t.note)}: hoàn thực ${pct(m.r)}${m.bad ? ' · không được nhóm ưu đãi, kiểm tra MCC' : ' · ghi nhớ MCC "đã xác nhận"'}</span></div>`).join('')}
        ${d.points != null ? `<div class="check"><span class="mk ok">₫</span><span class="grow">Hoàn thực nhận ${fmt(d.points)} đ sẽ được ghi cho kỳ này</span></div>` : '<div class="check"><span class="mk no">?</span><span class="grow">Sao kê không ghi điểm: chỉ khớp giao dịch</span></div>'}
        ${p.exists ? '<p class="small" style="margin-top:10px"><b>Kỳ này đã nhập rồi.</b> Ghi đè hay bỏ qua?</p><div class="row" style="gap:8px;margin-top:6px"><button class="btn primary grow" type="button" id="applyCode">Ghi đè</button><button class="btn grow" type="button" data-close>Bỏ qua</button></div>' : '<button class="btn primary block" type="button" id="applyCode" style="margin-top:10px">Cập nhật</button>'}`;
    } else if (/^#QUYDINH/i.test(v)) {
      const d = parseQuydinh(v); pending = { type: 'quydinh', d };
      pv.innerHTML = `<div class="stack" style="gap:4px"><h3>Xem trước · ${CARD_NAME[d.card] || ''} thay đổi</h3><p class="xs muted">Duyệt từng thay đổi trước khi áp dụng.</p></div>
        ${d.changes.map(c => c.unknown ? `<div class="check"><span class="mk no">?</span><span class="grow">${esc(c.k)}: ${esc(c.raw)} · app không dùng khóa này, bỏ qua</span></div>` : `<div class="check"><span class="mk add">~</span><span class="grow">${esc(c.k)}: <s>${showVal(c.old, c.type)}</s> → <b>${showVal(c.val, c.type)}</b></span></div>`).join('')}
        <button class="btn primary block" type="button" id="applyCode" style="margin-top:10px">Cập nhật</button>`;
    } else throw new Error('Mã phải bắt đầu bằng #SAOKE hoặc #QUYDINH. Copy lại cả khung mã Claude gửi.');
  } catch (err) {
    pv.innerHTML = `<div class="check"><span class="mk bad">!</span><span class="grow"><b>Mã không đọc được.</b> ${esc(err.message)}</span></div>`;
  }
  pv.hidden = false;
});
$('#preview').addEventListener('click', e => {
  if (!e.target.closest('#applyCode') || !pending) return;
  if (pending.type === 'saoke') { applySaoke(pending.p); toast(`Đã cập nhật sao kê · ${pending.p.added.length} khoản mới`); }
  else {
    const d = pending.d;
    for (const c of d.changes) { if (c.unknown) continue; let o = S.rules[c.grp]; for (let i = 0; i < c.path.length - 1; i++) o = o[c.path[i]]; o[c.path[c.path.length - 1]] = c.val; }
    S.rules[d.card].updated = d.updated || TODAY(); save(true); toast('Đã cập nhật quy định. Gợi ý thẻ đã tính lại.');
  }
  pending = null; closeSheets(); renderAll();
});

/* ===================================================================
   VIBE & MÀU
   =================================================================== */
const darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
const curVibe = () => VIBES[S.settings.vibe] || VIBES.basic;
const curPalette = () => PALETTES[S.settings.palette] ? S.settings.palette : (curVibe().palette || 'pink');
function applyPalette() {
  const vals = PALETTES[curPalette()][darkMQ && darkMQ.matches ? 'd' : 'l'];
  PAL_KEYS.forEach((k, i) => document.documentElement.style.setProperty(k, vals[i]));
  const meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', vals[0]);
  $$('[data-palettes] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === curPalette())));
}
function applyVibe() {
  const v = curVibe();
  document.documentElement.setAttribute('data-vibe', S.settings.vibe in VIBES ? S.settings.vibe : 'basic');
  $('#vband').innerHTML = (v.band || []).map(s => `<img src="${s}" alt="">`).join('');
  $('#vband').hidden = !(v.band && v.band.length);
  $$('[data-pageicon]').forEach(i => { i.src = (v.pageIcons && v.pageIcons[i.dataset.pageicon]) || i.dataset.base; });
  $('#sparks').innerHTML = '';
  if (v.sparks) { let h = ''; for (let i = 0; i < 14; i++) { const edge = i % 2 ? 92 + Math.random() * 6 : Math.random() * 6; const sz = 9 + Math.random() * 9; h += `<i style="left:${edge.toFixed(1)}%;top:${(4 + Math.random() * 86).toFixed(1)}%;--s:${sz.toFixed(0)}px;animation-duration:${(1.8 + Math.random() * 2.4).toFixed(1)}s;animation-delay:-${(Math.random() * 3).toFixed(1)}s"></i>`; } $('#sparks').innerHTML = h; }
  $$('[data-vibes]').forEach(el => { el.innerHTML = Object.keys(VIBES).map(k => `<button type="button" data-vibe="${k}" aria-pressed="${k === S.settings.vibe}"><img src="${VIBES[k].icon}" alt=""><span>${esc(VIBES[k].name)}</span></button>`).join(''); });
  applyPalette(); renderHello();
}
// Tên gọi: mỗi ngày bốc ngẫu nhiên một tên trong danh sách (cả ngày giữ nguyên tên đó)
const nickList = () => (S.settings.names || []).map(s => s.trim()).filter(Boolean);
function todayName() {
  const ns = nickList();
  if (!ns.length) return 'bạn';
  if (ns.length === 1) return ns[0];
  let h = 2166136261;
  for (const ch of TODAY() + '|' + ns.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return ns[h % ns.length];
}
function renderNick() {
  const ta = $('#nickNames');
  if (document.activeElement !== ta) ta.value = (S.settings.names || []).join('\n');
  const ns = nickList();
  $('#nickPreview').innerHTML = ns.length ? `Hôm nay: <b>Chào ${esc(todayName())}</b>${ns.length > 1 ? ` · ${ns.length} tên, mai có thể là tên khác` : ''}` : 'Để trống thì app ghi "Chào bạn".';
}
$('#nickNames').addEventListener('input', e => { S.settings.names = e.target.value.split('\n').map(s => s.slice(0, 30)); save(true); renderHello(); renderNick(); });
function renderHello() {
  $('#helloName').textContent = 'Chào ' + todayName();
  const d = new Date();
  const extra = curVibe().greet ? curVibe().greet(d) : '';
  const sp = stmtPeriod('sup', TODAY());
  $('#helloSub').textContent = `${WD[d.getDay()]}, ${dmy(TODAY())} · ${extra || 'kỳ Supreme ' + pLabel(sp)}`;
}
function vibePrompt(topic) {
  const t = (topic || '').trim() || '[chủ đề]';
  return `Thêm vibe "${t}" cho app Sổ chi tiêu & Quẹt thẻ nào (mã nguồn ở thư mục app, đang chạy trên GitHub Pages kho sochitieu; cách thêm vibe ghi ở đầu file app/vibes.js). Lấy màu sắc, icon và hình trang trí từ ảnh mình gửi kèm; ảnh có logo hoặc watermark thì vẽ lại theo phong cách đó. Vibe mới có bảng màu sáng và tối riêng. Giữ nguyên các vibe cũ, chức năng, cách lưu dữ liệu và file SoChiTieu.json. Xong thì liệt kê đúng những file mình cần tải lên GitHub.`;
}
$$('[data-vibepanel]').forEach(el => {
  const s = el.dataset.vibepanel;
  el.innerHTML = `<div class="vibepanel">
    <div class="vnote"><b>Nhắc nhanh</b><span>Vibe có sẵn ở dưới: bấm là đổi ngay, không cần làm gì thêm.</span><span>Muốn <b>vibe mới</b>: cần máy tính và GitHub, làm đúng 7 bước ở cuối bảng này. Mất khoảng 10 phút.</span></div>
    <div class="stack" style="gap:8px"><div class="row between"><h3>Vibe</h3><span class="xs muted">trang trí theo dịp</span></div><div class="vibes" data-vibes></div></div>
    <div class="stack" style="gap:8px"><div class="row between"><h3>Màu</h3><span class="xs muted">tông pastel · tự có bản tối</span></div><div class="palettes" data-palettes></div></div>
    <hr>
    <div class="stack" style="gap:10px">
      <h3>Thêm vibe mới · 7 bước</h3>
      <ol class="vsteps">
        <li><b>Lưu dữ liệu trước cho chắc.</b> Bấm nút đám mây → <b>Lưu lên OneDrive</b> → Lưu vào Tệp → OneDrive → Thay thế.</li>
        <li><b>Gõ chủ đề rồi copy câu lệnh</b> ở ngay dưới đây.
          <div class="field" style="margin-top:6px"><label for="vt-${s}">Chủ đề vibe</label><input id="vt-${s}" data-vtopic placeholder="VD: Tết, mùa hè, Trung thu, Halloween" autocomplete="off"></div>
          <div class="prompt" data-vprompt style="margin-top:6px"></div>
          <button class="btn primary sm" type="button" data-vcopy style="margin-top:6px">Copy câu lệnh</button>
          <span class="xs muted" style="display:block;margin-top:4px">Gửi câu lệnh sang máy tính bằng Zalo hoặc ghi chú để dán ở bước 3.</span></li>
        <li><b>Trên máy tính, mở Claude</b> (Claude Code), chọn thư mục <b>PHẦN MỀM QUẢN LÝ THẺ VÀ QUẢN LÝ CHI TIÊU</b>. Dán câu lệnh, kéo thả vài ảnh mẫu vào, rồi gửi.</li>
        <li><b>Đợi Claude làm xong.</b> Claude sửa file trong thư mục <b>app</b> và báo những file nào cần tải lên.</li>
        <li><b>Vào github.com</b> → kho <b>sochitieu</b> → <b>Add file</b> → <b>Upload files</b> → kéo các file Claude báo vào (giữ đúng thư mục, ví dụ ảnh trong img/…) → <b>Commit changes</b>.</li>
        <li><b>Đợi 1–2 phút</b>, rồi mở app trên màn hình chính <b>2 lần</b>: lần 1 tải bản mới ngầm, lần 2 mới hiện. Dữ liệu chi tiêu không mất.</li>
        <li><b>Bấm Đổi vibe</b> → chọn vibe mới trong danh sách. Xong.</li>
      </ol>
      <p class="xs muted">Nếu mở app thấy mất dữ liệu: nút đám mây → <b>Lấy dữ liệu</b> → mở SoChiTieu.json trong OneDrive.</p>
    </div></div>`;
});
$$('[data-palettes]').forEach(el => { el.innerHTML = Object.keys(PALETTES).map(k => { const p = PALETTES[k].l; return `<button type="button" data-p="${k}" aria-pressed="false"><span class="dots"><i style="background:${p[8]}"></i><i style="background:${p[9]}"></i><i style="background:${p[6]}"></i></span>${esc(PALETTES[k].name)}</button>`; }).join(''); });
function renderVPrompts() { $$('[data-vprompt]').forEach(el => { const inp = el.parentElement.querySelector('[data-vtopic]'); el.textContent = vibePrompt(inp.value); }); }
document.addEventListener('input', e => { if (e.target.matches('[data-vtopic]')) { const v = e.target.value; $$('[data-vtopic]').forEach(x => { if (x !== e.target) x.value = v; }); renderVPrompts(); } });
document.addEventListener('click', e => {
  const vb = e.target.closest('[data-vibes] button');
  if (vb) { S.settings.vibe = vb.dataset.vibe; S.settings.palette = null; save(true); applyVibe(); toast('Đã đổi vibe: ' + curVibe().name); return; }
  const pb = e.target.closest('[data-palettes] button');
  if (pb) { S.settings.palette = pb.dataset.p; save(true); applyPalette(); toast('Đã đổi màu: ' + PALETTES[pb.dataset.p].name); return; }
  const cp = e.target.closest('[data-vcopy]');
  if (cp) { const box = cp.parentElement.querySelector('[data-vprompt]'); copyText(box.textContent, box, 'Đã copy. Tiếp theo: bước 3 trên máy tính'); }
});
$('#vibeToggle').addEventListener('click', e => { const p = $('#vibeQuick'); p.hidden = !p.hidden; e.currentTarget.setAttribute('aria-expanded', String(!p.hidden)); });
if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener('change', applyPalette);

/* ===================================================================
   KHUNG CHUNG: bảng trượt, điều hướng, khởi động
   =================================================================== */
function openSheet(id) { $$('.sheet').forEach(s => { s.hidden = s.id !== id; }); $('#backdrop').hidden = false; $('#' + id).scrollTop = 0; }
function closeSheets() { $$('.sheet').forEach(s => { s.hidden = true; }); $('#backdrop').hidden = true; }
$('#backdrop').addEventListener('click', closeSheets);
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheets(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheets(); });

const VIEWS = ['nhap', 'ke-hoach', 'bao-cao', 'nguyen-tac'];
function route() {
  let v = location.hash.slice(1); if (!VIEWS.includes(v)) v = 'nhap';
  VIEWS.forEach(x => { $('#v-' + x).hidden = x !== v; });
  $$('.nav a').forEach(a => { if (a.dataset.v === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  closeSheets(); window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

function renderAll() {
  buildProjection();
  renderQuick(); renderStores(); renderToday(); renderSuggest();
  renderMonthbar(); renderPlan(); renderReport(); renderRules(); renderSyncDot(); renderVPrompts(); renderHello(); renderNick();
}
// mở lại app sau nửa đêm: cập nhật "hôm nay"
let lastDay = TODAY();
document.addEventListener('visibilitychange', () => { if (!document.hidden && TODAY() !== lastDay) { lastDay = TODAY(); $('#fDate').value = TODAY(); RG.anchor = TODAY(); pPer.sup = pPer.eve = null; renderAll(); } });

applyVibe(); renderAll(); route();
if (S.changedAt && (!S.exportedAt || S.changedAt > S.exportedAt) && Date.now() - new Date(S.exportedAt || S.firstAt) > 7 * 864e5) setTimeout(() => toast('Đã hơn 7 ngày chưa lưu lên OneDrive'), 800);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
