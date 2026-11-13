function renderDonors() {
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const ft = document.getElementById('filterType').value;
  const list = state.donors.filter(d => (!ft || d.bloodType === ft) && (!q || (d.name || '').toLowerCase().includes(q) || (d.phone || '').includes(q)))
    .sort((a, b) => (b.donationCount || 0) - (a.donationCount || 0));
  document.getElementById('donorCount').textContent = `${list.length} متبرع`;
  const body = document.getElementById('donorRows'), cards = document.getElementById('donorCards');
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-400 text-sm">لا يوجد متبرعون. أضف متبرعاً جديداً من النموذج.</td></tr>';
    cards.innerHTML = '<div class="p-8 text-center text-slate-400 text-sm">لا يوجد متبرعون. أضف متبرعاً جديداً من النموذج.</div>';
    return;
  }
  const actions = (d, r) => `
    <button data-id="${escapeHTML(d.id)}" class="donate-btn px-3 py-2 rounded-xl ${r.ready ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500'} font-bold text-xs transition">تسجيل تبرع</button>
    ${isAdmin() ? `<button data-id="${escapeHTML(d.id)}" data-name="${escapeHTML(d.name)}" class="del-btn w-9 h-9 rounded-xl bg-crimson-50 hover:bg-crimson-600 text-crimson-600 hover:text-white border border-crimson-200 flex items-center justify-center transition shrink-0" title="حذف (مدير فقط)"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>` : ''}`;
  body.innerHTML = list.map(d => {
    const r = donorReadiness(d);
    return `<tr class="border-t border-slate-100 hover:bg-slate-50">
      <td class="p-3 font-bold text-slate-900 text-sm">${escapeHTML(d.name)}</td>
      <td class="p-3"><span class="px-2.5 py-1 rounded-lg bg-crimson-600 text-white text-xs font-black" dir="ltr">${escapeHTML(d.bloodType)}</span></td>
      <td class="p-3 text-xs text-slate-600">${escapeHTML(d.city || '')}</td>
      <td class="p-3 text-xs text-slate-600" dir="ltr">${escapeHTML(d.phone || '')}</td>
      <td class="p-3 text-center"><span class="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-black">${d.donationCount || 0}</span></td>
      <td class="p-3 text-xs"><div class="text-slate-600" dir="ltr">${escapeHTML(d.lastDate || '—')}</div><div class="font-bold ${r.ready ? 'text-emerald-600' : 'text-amber-600'}">${r.text}</div></td>
      <td class="p-3"><div class="flex items-center gap-2 justify-end">${actions(d, r)}</div></td></tr>`;
  }).join('');
  cards.innerHTML = list.map(d => {
    const r = donorReadiness(d);
    return `<div class="p-4 rounded-2xl border border-slate-200 bg-slate-50">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0"><div class="font-bold text-slate-900 text-sm">${escapeHTML(d.name)}</div>
          <div class="text-xs text-slate-500 mt-1">📍 ${escapeHTML(d.city || '')} &nbsp; 📞 <span dir="ltr">${escapeHTML(d.phone || '')}</span></div></div>
        <span class="px-2.5 py-1 rounded-lg bg-crimson-600 text-white text-xs font-black shrink-0" dir="ltr">${escapeHTML(d.bloodType)}</span>
      </div>
      <div class="flex items-center justify-between mt-3 text-xs">
        <span class="font-black text-slate-700">تبرع ${d.donationCount || 0} مرة</span>
        <span class="font-bold ${r.ready ? 'text-emerald-600' : 'text-amber-600'}">${r.text}</span>
      </div>
      <div class="text-[11px] text-slate-400 mt-1">آخر تبرع: <span dir="ltr">${escapeHTML(d.lastDate || '—')}</span></div>
      <div class="flex items-center gap-2 mt-3 [&>.donate-btn]:flex-1">${actions(d, r)}</div></div>`;
  }).join('');
  refreshIcons();
}

mountLayout('donors');
requireAuth().then(() => {
  document.getElementById('donorForm').addEventListener('submit', async e => {
    e.preventDefault();
    const ok = await registerDonor({
      name: document.getElementById('donorName').value.trim(),
      bloodType: document.getElementById('donorBloodType').value,
      city: document.getElementById('donorCity').value,
      phone: document.getElementById('donorPhone').value.trim(),
      lastDate: document.getElementById('donorLastDate').value || '',
      donationCount: Math.max(0, parseInt(document.getElementById('donorCountInput').value, 10) || 0),
      health: document.getElementById('donorHealth').value
    });
    if (ok) e.target.reset();
  });
  ['donorRows', 'donorCards'].forEach(id => document.getElementById(id).addEventListener('click', async e => {
    const dn = e.target.closest('.donate-btn'), del = e.target.closest('.del-btn');
    if (dn) recordDonation(dn.dataset.id);
    else if (del) { if (await askConfirm('حذف المتبرع؟', `سيتم حذف ${del.dataset.name} نهائياً.`, 'نعم، احذف')) deleteDonor(del.dataset.id); }
  }));
  document.getElementById('searchBox').addEventListener('input', renderDonors);
  document.getElementById('filterType').addEventListener('change', renderDonors);
  onStoreChange(renderDonors); renderDonors();
});
