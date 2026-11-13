// الحالة + تسجيل الدخول (مدير/موظف) + حركات المصرف + Firebase Realtime Database
const firebaseConfig = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY')
  ? window.FIREBASE_CONFIG : null;
const ROOT = 'ibddmp', USERS = 'ibddmp_users';
const DEMO_KEY = 'ibddmp_demo_v2', DEMO_ON = 'ibddmp_demo_on';
const WAIT_DAYS = 90;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const DEFAULT_DONORS = [
  { id:'d1', name:'أحمد كريم العبيدي', bloodType:'O-', city:'بغداد', phone:'07701234567', lastDate:'2026-06-10', health:'eligible', donationCount:5 },
  { id:'d2', name:'زينب علي الساعدي', bloodType:'O-', city:'الكوت', phone:'07809876543', lastDate:'2026-05-15', health:'eligible', donationCount:3 },
  { id:'d3', name:'مصطفى جاسم الربيعي', bloodType:'A+', city:'بغداد', phone:'07712223344', lastDate:'2026-07-01', health:'eligible', donationCount:2 },
  { id:'d4', name:'نور الهدى حسن', bloodType:'B+', city:'البصرة', phone:'07815556677', lastDate:'2026-04-20', health:'eligible', donationCount:7 },
  { id:'d5', name:'عمر فاروق الدليمي', bloodType:'O+', city:'بغداد', phone:'07728889900', lastDate:'2026-06-25', health:'eligible', donationCount:4 },
  { id:'d6', name:'سارة محمود الجبوري', bloodType:'AB-', city:'أربيل', phone:'07501112233', lastDate:'2026-10-01', health:'deferred', donationCount:1 }
];
const DEFAULT_INVENTORY = { 'A+':24,'A-':9,'B+':19,'B-':7,'AB+':16,'AB-':5,'O+':28,'O-':6 };

function zeroInv() { const o = {}; BLOOD_TYPES.forEach(t => o[t] = 0); return o; }
const state = { donors: [], inventory: zeroInv(), log: [], cloud: false };
let session = null, db = null, fb = null, appM = null, authM = null, auth = null, fbApp = null;
let _started = false, _listening = false, _busy = false;
const storeListeners = [];
let _readyRes; const storeReady = new Promise(r => _readyRes = r);

function onStoreChange(fn) { storeListeners.push(fn); }
function emitChange() { storeListeners.forEach(fn => fn(state)); }
function getSession() { return session; }
function isAdmin() { return !!session && session.role === 'admin'; }
function isCloud() { return !!session && session.mode === 'cloud'; }
function who() { return session ? (session.name || session.email || '') : ''; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysSince(d) { if (!d) return Infinity; return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }
function toIntlPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('964')) return d;
  if (d.startsWith('0')) return '964' + d.slice(1);
  return d;
}
function donorReadiness(d) {
  if (d.health !== 'eligible') return { ready: false, text: 'مؤجل صحياً' };
  const days = daysSince(d.lastDate);
  if (days >= WAIT_DAYS) return { ready: true, text: 'جاهز للتبرع' };
  return { ready: false, text: `بعد ${WAIT_DAYS - days} يوم` };
}

// ---------- الوضع التجريبي المحلي ----------
function saveDemo() {
  if (session && session.mode === 'demo')
    try { localStorage.setItem(DEMO_KEY, JSON.stringify({ donors: state.donors, inventory: state.inventory, log: state.log })); } catch (e) {}
}
function resetDemoData() {
  state.donors = DEFAULT_DONORS.map(d => ({ ...d }));
  state.inventory = { ...DEFAULT_INVENTORY };
  state.log = [];
  saveDemo();
}
function enterDemo() {
  session = { mode: 'demo', name: 'عرض تجريبي (محلي)', role: 'admin' };
  let s = null; try { s = JSON.parse(localStorage.getItem(DEMO_KEY)); } catch (e) {}
  if (s && Array.isArray(s.donors)) { state.donors = s.donors; state.inventory = { ...zeroInv(), ...s.inventory }; state.log = s.log || []; }
  else resetDemoData();
  state.cloud = false;
}
function startDemo() { try { localStorage.setItem(DEMO_ON, '1'); } catch (e) {} enterDemo(); emitChange(); }

// ---------- التهيئة والمصادقة ----------
async function initStore() {
  if (_started) return storeReady;
  _started = true;
  let demoOn = false; try { demoOn = localStorage.getItem(DEMO_ON) === '1'; } catch (e) {}
  if (demoOn) enterDemo();
  if (!firebaseConfig || demoOn) { emitChange(); _readyRes(); return; }
  try {
    const base = 'https://www.gstatic.com/firebasejs/11.6.1/';
    [appM, authM, fb] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-database.js')]);
    fbApp = appM.initializeApp(firebaseConfig);
    auth = authM.getAuth(fbApp);
    db = fb.getDatabase(fbApp);
    let first = true;
    authM.onAuthStateChanged(auth, async user => {
      if (!_busy) await handleAuth(user);
      if (first) { first = false; _readyRes(); }
    });
  } catch (err) {
    console.error('Firebase Init Warning:', err);
    showToast('تعذّر الاتصال بالسحابة', 'راجع Console للتفاصيل.', 'alert');
    _readyRes();
  }
}

async function handleAuth(user) {
  if (!user) { session = null; emitChange(); return; }
  try {
    const u = (await fb.get(fb.ref(db, `${USERS}/${user.uid}`))).val();
    if (!u || !u.role) {
      showToast('لا توجد صلاحية', 'هذا الحساب غير مسجّل كموظف أو مدير. راجع مدير النظام.', 'alert');
      await authM.signOut(auth); session = null; emitChange(); return;
    }
    session = { mode: 'cloud', uid: user.uid, email: user.email, name: u.name || user.email, role: u.role };
    state.cloud = true;
    startListeners();
    emitChange();
  } catch (e) {
    console.error(e);
    showToast('تعذّر التحقق من الصلاحية', 'تحقق من قواعد Realtime Database.', 'alert');
  }
}

function startListeners() {
  if (_listening) return; _listening = true;
  const err = e => { console.error('Sync Error:', e); showToast('خطأ مزامنة', 'تحقق من قواعد القاعدة وصلاحيات الحساب.', 'alert'); };
  fb.onValue(fb.ref(db, `${ROOT}/inventory`), s => {
    const v = s.val() || {}; state.inventory = zeroInv();
    Object.entries(v).forEach(([t, x]) => { if (x && typeof x.units === 'number') state.inventory[t] = x.units; });
    emitChange();
  }, err);
  fb.onValue(fb.ref(db, `${ROOT}/donors`), s => {
    const v = s.val() || {}; state.donors = Object.entries(v).map(([id, d]) => ({ ...d, id })); emitChange();
  }, err);
  fb.onValue(fb.query(fb.ref(db, `${ROOT}/log`), fb.limitToLast(200)), s => {
    const v = s.val() || {};
    state.log = Object.entries(v).map(([id, x]) => ({ ...x, id })).sort((a, b) => b.ts - a.ts); emitChange();
  }, err);
}

async function requireAuth(adminOnly = false) {
  await storeReady;
  if (!session) { location.replace('login.html'); return new Promise(() => {}); }
  if (adminOnly && session.role !== 'admin') { location.replace('dashboard.html'); return new Promise(() => {}); }
  return session;
}

async function loginUser(email, pw) {
  try { localStorage.removeItem(DEMO_ON); } catch (e) {}
  await storeReady;
  if (!auth) { const e = new Error('no-config'); e.code = 'app/no-config'; throw e; }
  _busy = true;
  try {
    const cred = await authM.signInWithEmailAndPassword(auth, email, pw);
    await handleAuth(cred.user);
    if (!session) { const e = new Error('no-role'); e.code = 'app/no-role'; throw e; }
  } finally { _busy = false; }
}
async function setupFirstAdmin(name, email, pw) {
  try { localStorage.removeItem(DEMO_ON); } catch (e) {}
  await storeReady;
  if (!auth) { const e = new Error('no-config'); e.code = 'app/no-config'; throw e; }
  _busy = true;
  try {
    const cred = await authM.createUserWithEmailAndPassword(auth, email, pw);
    try { await fb.set(fb.ref(db, `${USERS}/${cred.user.uid}`), { email, name, role: 'admin', createdAt: Date.now() }); }
    catch (e) { await cred.user.delete(); const er = new Error('exists'); er.code = 'app/admin-exists'; throw er; }
    await handleAuth(cred.user);
  } finally { _busy = false; }
}
async function logoutUser() {
  await storeReady;
  try { localStorage.removeItem(DEMO_ON); } catch (e) {}
  if (isCloud() && auth) await authM.signOut(auth);
  session = null; location.href = 'login.html';
}

// ---------- إدارة الموظفين (مدير فقط) ----------
async function createStaffAccount(name, email, pw, role) {
  if (!isAdmin() || !isCloud()) return;
  const sec = appM.initializeApp(firebaseConfig, 'sec_' + Date.now());
  try {
    const sAuth = authM.getAuth(sec);
    const cred = await authM.createUserWithEmailAndPassword(sAuth, email, pw);
    await fb.set(fb.ref(db, `${USERS}/${cred.user.uid}`), { email, name, role, createdAt: Date.now(), by: session.email });
    await authM.signOut(sAuth);
  } finally { await appM.deleteApp(sec); }
}
async function listUsers() {
  const v = (await fb.get(fb.ref(db, USERS))).val() || {};
  return Object.entries(v).map(([uid, u]) => ({ uid, ...u }));
}
async function removeUserAccess(uid) { await fb.remove(fb.ref(db, `${USERS}/${uid}`)); }

// ---------- حركات المصرف ----------
async function changeStock(type, delta) {
  if (isCloud()) {
    const r = await fb.runTransaction(fb.ref(db, `${ROOT}/inventory/${type}`), cur => {
      const u = (cur && cur.units) || 0;
      if (u + delta < 0) return;
      return { type, units: u + delta, updatedAt: new Date().toISOString() };
    });
    return r.committed;
  }
  const u = state.inventory[type] || 0;
  if (u + delta < 0) return false;
  state.inventory[type] = u + delta; return true;
}
async function writeLog(entry) {
  entry.ts = Date.now();
  if (isCloud()) await fb.push(fb.ref(db, `${ROOT}/log`), entry);
  else { state.log.unshift({ id: 'l' + entry.ts + Math.random().toString(36).slice(2, 5), ...entry }); saveDemo(); emitChange(); }
}

// تسجيل تبرع: يزيد رصيد الفصيلة + عدّاد المتبرع + يحدّث تاريخ آخر تبرع
async function recordDonation(donorId) {
  const d = state.donors.find(x => x.id === donorId); if (!d) return false;
  if (d.health !== 'eligible') { showToast('المتبرع غير مؤهل', 'حالته الصحية مؤجلة مؤقتاً.', 'alert'); return false; }
  const days = daysSince(d.lastDate);
  if (days < WAIT_DAYS) { showToast('لا يمكن التبرع الآن', `يجب مرور ${WAIT_DAYS} يوماً على آخر تبرع (المتبقي ${WAIT_DAYS - days} يوم).`, 'alert'); return false; }
  const count = (d.donationCount || 0) + 1, today = todayStr();
  const entry = { ts: Date.now(), kind: 'donation', bloodType: d.bloodType, units: 1, donorId: d.id, donorName: d.name, by: who() };
  try {
    await changeStock(d.bloodType, 1);
    if (isCloud()) {
      const key = fb.push(fb.ref(db, `${ROOT}/log`)).key;
      await fb.update(fb.ref(db, ROOT), { [`donors/${d.id}/donationCount`]: count, [`donors/${d.id}/lastDate`]: today, [`log/${key}`]: entry });
    } else { d.donationCount = count; d.lastDate = today; state.log.unshift({ id: 'l' + Date.now(), ...entry }); saveDemo(); emitChange(); }
  } catch (e) { console.error(e); showToast('فشل تسجيل التبرع', 'تحقق من الصلاحيات والقواعد.', 'alert'); return false; }
  showToast('تم تسجيل التبرع', `${d.name}: +1 وحدة ${d.bloodType} (إجمالي تبرعاته ${count}).`, 'success');
  return true;
}

// صرف وحدات من المخزون (لا يسمح بالصرف أكثر من الرصيد)
async function dispenseUnits(type, units, note) {
  units = parseInt(units, 10); if (!(units > 0)) return false;
  const before = state.inventory[type] || 0;
  try {
    if (!(await changeStock(type, -units))) { showToast('المخزون غير كافٍ', `رصيد ${type} الحالي (${before}) أقل من ${units} وحدة.`, 'alert'); return false; }
    await writeLog({ kind: 'dispense', bloodType: type, units, note: note || '', by: who() });
  } catch (e) { console.error(e); showToast('فشل الصرف', 'تحقق من الصلاحيات والقواعد.', 'alert'); return false; }
  showToast('تم صرف الدم', `تم صرف ${units} وحدة ${type}. المتبقي ${before - units}.`, 'success');
  if (before - units <= 7) showToast(`تحذير عجز حرج (${type})`, `انخفض المخزون إلى ${before - units} وحدات. يُنصح بإطلاق نداء استغاثة.`, 'alert');
  return true;
}
// إضافة رصيد/جرد (مدير فقط)
async function adjustInventory(type, units, note) {
  if (!isAdmin()) { showToast('غير مسموح', 'هذه العملية للمدير فقط.', 'alert'); return false; }
  units = parseInt(units, 10); if (!(units > 0)) return false;
  try { await changeStock(type, units); await writeLog({ kind: 'adjust', bloodType: type, units, note: note || 'جرد / رصيد افتتاحي', by: who() }); }
  catch (e) { console.error(e); showToast('فشلت العملية', 'تحقق من الصلاحيات.', 'alert'); return false; }
  showToast('تمت الإضافة', `تمت إضافة ${units} وحدة ${type} إلى المخزون.`, 'success'); return true;
}

async function registerDonor(donor) {
  donor.createdAt = Date.now();
  try {
    if (isCloud()) await fb.push(fb.ref(db, `${ROOT}/donors`), donor);
    else { donor.id = 'local_' + Date.now(); state.donors.unshift(donor); saveDemo(); emitChange(); }
  } catch (e) { console.error(e); showToast('فشل الحفظ', 'تحقق من الصلاحيات والقواعد.', 'alert'); return false; }
  showToast('تم تسجيل المتبرع', `تمت إضافة ${donor.name} بنجاح.`, 'success'); return true;
}

// الحذف للمدير فقط
async function deleteDonor(id) {
  if (!isAdmin()) { showToast('غير مسموح', 'حذف المتبرعين للمدير فقط.', 'alert'); return; }
  const d = state.donors.find(x => x.id === id);
  try {
    if (isCloud()) await fb.remove(fb.ref(db, `${ROOT}/donors/${id}`));
    else { state.donors = state.donors.filter(x => x.id !== id); saveDemo(); emitChange(); }
    await writeLog({ kind: 'donor_deleted', bloodType: d ? d.bloodType : '', units: 0, note: d ? d.name : id, by: who() });
  } catch (e) { console.error(e); showToast('فشل الحذف', 'تحقق من الصلاحيات والقواعد.', 'alert'); return; }
  showToast('تم حذف المتبرع', d ? `تم حذف ${d.name}.` : 'تم الحذف.', 'success');
}

async function clearAllData() {
  if (!isAdmin()) { showToast('غير مسموح', 'مسح البيانات للمدير فقط.', 'alert'); return; }
  try {
    if (isCloud()) {
      const inv = {}; BLOOD_TYPES.forEach(t => inv[t] = { type: t, units: 0, updatedAt: new Date().toISOString() });
      await fb.update(fb.ref(db, ROOT), { donors: null, log: null, inventory: inv });
    } else { state.donors = []; state.inventory = zeroInv(); state.log = []; saveDemo(); emitChange(); }
  } catch (e) { console.error(e); showToast('فشل المسح', 'تحقق من الصلاحيات والقواعد.', 'alert'); return; }
  showToast('تم مسح كل البيانات', 'تم حذف المتبرعين والسجل وتصفير المخزون.', 'success');
}
async function seedInitialData() {
  if (!isAdmin()) return;
  try {
    if (isCloud()) {
      const inv = {}, donors = {};
      Object.entries(DEFAULT_INVENTORY).forEach(([t, u]) => inv[t] = { type: t, units: u, updatedAt: new Date().toISOString() });
      DEFAULT_DONORS.forEach(d => { const { id, ...rest } = d; donors[id] = rest; });
      await fb.update(fb.ref(db, ROOT), { inventory: inv, donors });
    } else { resetDemoData(); emitChange(); }
  } catch (e) { console.error(e); showToast('فشلت التعبئة', 'تحقق من الصلاحيات.', 'alert'); return; }
  showToast('تمت التعبئة', 'تمت إضافة البيانات التجريبية.', 'success');
}
