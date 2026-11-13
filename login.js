mountLayout('login');
storeReady.then(() => { if (getSession()) location.replace('dashboard.html'); });
// إن كان initStore لم يبدأ بعد، mountLayout يبدأه

function authMsg(e) {
  const c = (e && (e.code || e.message)) || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (/operation-not-allowed|admin-restricted/.test(c)) return 'فعّل Email/Password من Firebase: Authentication ← Sign-in method.';
  if (/email-already-in-use/.test(c)) return 'هذا البريد مستخدم مسبقاً.';
  if (/weak-password/.test(c)) return 'كلمة المرور ضعيفة (6 أحرف على الأقل).';
  if (/too-many-requests/.test(c)) return 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.';
  if (/admin-exists/.test(c)) return 'يوجد مدير مسجّل بالفعل. اطلب من المدير إنشاء حسابك.';
  if (/no-role/.test(c)) return 'هذا الحساب لا يملك صلاحية. اطلب من المدير إضافته.';
  if (/no-config/.test(c)) return 'إعدادات Firebase غير مضبوطة في js/firebase-config.js.';
  if (/PERMISSION_DENIED|permission_denied/i.test(c)) return 'القواعد (Rules) تمنع العملية. تأكد من نشر قواعد المشروع.';
  return 'حدث خطأ: ' + c;
}
function showErr(id, msg) { const b = document.getElementById(id); b.textContent = msg; b.classList.toggle('hidden', !msg); }
async function run(btn, errId, fn) {
  showErr(errId, ''); btn.disabled = true; btn.classList.add('opacity-60');
  try { await fn(); location.href = 'dashboard.html'; }
  catch (e) { console.error(e); showErr(errId, authMsg(e)); }
  finally { btn.disabled = false; btn.classList.remove('opacity-60'); }
}
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  run(e.target.querySelector('button[type=submit]'), 'loginError',
    () => loginUser(document.getElementById('loginEmail').value.trim(), document.getElementById('loginPass').value));
});
document.getElementById('setupForm').addEventListener('submit', e => {
  e.preventDefault();
  run(e.target.querySelector('button[type=submit]'), 'setupError',
    () => setupFirstAdmin(document.getElementById('setupName').value.trim(), document.getElementById('setupEmail').value.trim(), document.getElementById('setupPass').value));
});
document.getElementById('demoBtn').addEventListener('click', () => { startDemo(); location.href = 'dashboard.html'; });
