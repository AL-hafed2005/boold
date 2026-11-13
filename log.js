function renderLog() {
  const f = document.getElementById('filterKind').value;
  const list = state.log.filter(l => !f || l.kind === f);
  const sum = k => state.log.filter(l => l.kind === k).reduce((a, l) => a + (l.units || 0), 0);
  document.getElementById('sumIn').textContent = sum('donation') + sum('adjust');
  document.getElementById('sumOut').textContent = sum('dispense');
  document.getElementById('sumAlerts').textContent = state.log.filter(l => l.kind === 'alert').length;
  const body = document.getElementById('logRows'), cards = document.getElementById('logCards');
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400 text-sm">لا توجد حركات.</td></tr>';
    cards.innerHTML = '<div class="p-8 text-center text-slate-400 text-sm">لا توجد حركات.</div>'; return;
  }
  cards.innerHTML = list.map(l => {
    const k = LOG_KINDS[l.kind] || { label: l.kind, cls: 'bg-slate-100 text-slate-700', sign: '' };
    return `<div class="p-3 rounded-2xl border border-slate-200 bg-slate-50">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2"><span class="px-2 py-1 rounded-md font-black text-xs ${k.cls}">${k.label}</span>
          <span class="font-black text-slate-900 text-sm" dir="ltr">${escapeHTML(l.bloodType || '')}${l.units ? ' ' + k.sign + l.units : ''}</span></div>
        <span class="text-[11px] text-slate-400" dir="ltr">${fmtTime(l.ts)}</span></div>
      <div class="text-xs text-slate-700 mt-2">${escapeHTML(l.donorName || l.note || '')}</div>
      <div class="text-[11px] text-slate-400 mt-1">بواسطة: ${escapeHTML(l.by || '')}</div></div>`;
  }).join('');
  body.innerHTML = list.map(l => {
    const k = LOG_KINDS[l.kind] || { label: l.kind, cls: 'bg-slate-100 text-slate-700', sign: '' };
    return `<tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="p-3 text-slate-500 whitespace-nowrap" dir="ltr">${fmtTime(l.ts)}</td>
      <td class="p-3"><span class="px-2 py-1 rounded-md font-black ${k.cls}">${k.label}</span></td>
      <td class="p-3 font-black text-slate-900" dir="ltr">${escapeHTML(l.bloodType || '—')}</td>
      <td class="p-3 font-black ${k.sign === '-' ? 'text-crimson-600' : 'text-emerald-600'}" dir="ltr">${l.units ? k.sign + l.units : '—'}</td>
      <td class="p-3 text-slate-700">${escapeHTML(l.donorName || l.note || '')}</td>
      <td class="p-3 text-slate-500">${escapeHTML(l.by || '')}</td></tr>`;
  }).join('');
}
mountLayout('log');
requireAuth().then(() => {
  document.getElementById('filterKind').addEventListener('change', renderLog);
  onStoreChange(renderLog); renderLog();
});
