async function loadUsers() {
  const box = document.getElementById('userRows');
  try {
    const users = await listUsers();
    const me = getSession().uid;
    box.innerHTML = users.map(u => `
      <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="font-bold text-slate-900 text-sm flex items-center gap-2"><span>${escapeHTML(u.name || '')}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-md font-black ${u.role === 'admin' ? 'bg-crimson-100 text-crimson-700' : 'bg-blue-100 text-blue-700'}">${ROLE_LABEL[u.role] || u.role}</span></div>
          <div class="text-xs text-slate-500 mt-1" dir="ltr">${escapeHTML(u.email || '')}</div>
        </div>
        ${u.uid === me ? '<span class="text-xs text-slate-400 font-bold">حسابك</span>'
          : `<button data-uid="${escapeHTML(u.uid)}" data-name="${escapeHTML(u.name || u.email)}" class="revoke-btn px-3 py-2 rounded-xl bg-crimson-50 hover:bg-crimson-600 text-crimson-600 hover:text-white border border-crimson-200 font-bold text-xs transition">إلغاء الصلاحية</button>`}
      </div>`).join('') || '<div class="text-sm text-slate-400 text-center py-6">لا يوجد مستخدمون.</div>';
  } catch (e) { console.error(e); box.innerHTML = '<div class="text-sm text-crimson-600">تعذّر تحميل المستخدمين. تحقق من القواعد.</div>'; }
}
mountLayout('staff');
requireAuth(true).then(s => {
  if (s.mode !== 'cloud') {
    document.getElementById('staffContent').innerHTML = '<div class="p-8 rounded-3xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold text-center">إدارة الموظفين تتطلب الاتصال بالسحابة. سجّل الدخول بحساب مدير حقيقي (وليس الوضع المحلي).</div>';
    return;
  }
  loadUsers();
  document.getElementById('staffForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      await createStaffAccount(document.getElementById('stName').value.trim(), document.getElementById('stEmail').value.trim(),
        document.getElementById('stPass').value, document.getElementById('stRole').value);
      showToast('تم إنشاء الحساب', 'يمكن للموظف الدخول الآن بالبريد وكلمة المرور.', 'success'); e.target.reset(); loadUsers();
    } catch (err) {
      console.error(err);
      const c = err.code || err.message || '';
      showToast('فشل إنشاء الحساب', /email-already/.test(c) ? 'البريد مستخدم مسبقاً.' : /weak/.test(c) ? 'كلمة المرور ضعيفة (6 أحرف على الأقل).' : /PERMISSION/i.test(c) ? 'القواعد تمنع العملية.' : c, 'alert');
    } finally { btn.disabled = false; }
  });
  document.getElementById('userRows').addEventListener('click', async e => {
    const b = e.target.closest('.revoke-btn'); if (!b) return;
    if (await askConfirm('إلغاء الصلاحية؟', `سيفقد ${b.dataset.name} القدرة على استخدام النظام.`, 'نعم، إلغاء')) {
      try { await removeUserAccess(b.dataset.uid); showToast('تم الإلغاء', 'تم سحب صلاحية الحساب.', 'success'); loadUsers(); }
      catch (err) { showToast('فشلت العملية', 'القواعد تمنع العملية.', 'alert'); }
    }
  });
});
