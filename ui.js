// أدوات واجهة مشتركة: الإشعارات + الأيقونات + تعقيم النصوص
function showToast(title, message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm sm:w-full z-50 flex flex-col gap-3 pointer-events-none';
    document.body.appendChild(container);
  }
  const colors = {
    success: 'bg-slate-900 border-emerald-500 text-white',
    alert: 'bg-crimson-700 border-crimson-400 text-white',
    info: 'bg-slate-800 border-blue-400 text-white'
  };
  const toast = document.createElement('div');
  toast.className = `pointer-events-auto p-4 rounded-2xl border-r-4 shadow-xl transition-all transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `<div class="font-bold text-sm">${escapeHTML(title)}</div><div class="text-xs opacity-90 mt-0.5">${escapeHTML(message)}</div>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.remove('translate-y-2', 'opacity-0'));
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
function refreshIcons() { if (window.lucide) lucide.createIcons(); }
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

const ROLE_LABEL = { admin: 'مدير النظام', staff: 'موظف' };
const LOG_KINDS = {
  donation:      { label: 'تبرع',         cls: 'bg-emerald-100 text-emerald-700', sign: '+' },
  dispense:      { label: 'صرف',          cls: 'bg-crimson-100 text-crimson-700', sign: '-' },
  adjust:        { label: 'إضافة رصيد',   cls: 'bg-blue-100 text-blue-700',       sign: '+' },
  alert:         { label: 'نداء استغاثة', cls: 'bg-amber-100 text-amber-800',     sign: '' },
  donor_deleted: { label: 'حذف متبرع',    cls: 'bg-slate-200 text-slate-700',     sign: '' }
};
function fmtTime(ts) {
  try { return new Date(ts).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: false }); } catch (e) { return ''; }
}
// نافذة تأكيد عامة (تُرجع true عند التأكيد)
function askConfirm(title, text, okLabel) {
  return new Promise(resolve => {
    document.getElementById('confirmModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', `
    <div id="confirmModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
        <div class="w-14 h-14 rounded-2xl bg-crimson-50 text-crimson-600 flex items-center justify-center mx-auto mb-3"><i data-lucide="trash-2" class="w-7 h-7"></i></div>
        <h3 class="text-lg font-black text-slate-900 mb-2">${escapeHTML(title)}</h3>
        <p class="text-xs text-slate-500 leading-relaxed mb-5">${escapeHTML(text)}</p>
        <div class="flex gap-3">
          <button id="confirmCancel" class="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition">إلغاء</button>
          <button id="confirmOk" class="flex-1 py-3 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white font-bold text-sm transition">${escapeHTML(okLabel)}</button>
        </div>
      </div>
    </div>`);
    refreshIcons();
    const done = v => { document.getElementById('confirmModal')?.remove(); resolve(v); };
    document.getElementById('confirmCancel').onclick = () => done(false);
    document.getElementById('confirmOk').onclick = () => done(true);
  });
}
