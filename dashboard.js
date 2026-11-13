let currentAlert = null;          // {type, hospital, sent:Set}
let lastAlertSeen = Date.now();

function renderHeader() {
  const s = getSession(); if (!s) return;
  document.getElementById('currentUserRole').textContent = `${s.name} • ${ROLE_LABEL[s.role] || s.role}`;
  document.getElementById('seedBtn').classList.toggle('hidden', !isAdmin());
  document.getElementById('clearBtn').classList.toggle('hidden', !isAdmin());
  document.getElementById('adjustOpt').classList.toggle('hidden', !isAdmin());
}

function renderInventory() {
  const grid = document.getElementById('inventoryGrid'); grid.innerHTML = '';
  BLOOD_TYPES.forEach(type => {
    const units = state.inventory[type] || 0;
    let badge, border = 'border-slate-200', bar = 'bg-emerald-500';
    if (units <= 7) { badge = '<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-crimson-100 text-crimson-700">عجز حرج</span>'; border = 'border-crimson-300 bg-crimson-50/30'; bar = 'bg-crimson-600'; }
    else if (units < 15) { badge = '<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">منخفض</span>'; border = 'border-amber-300 bg-amber-50/20'; bar = 'bg-amber-500'; }
    else badge = '<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">آمن</span>';
    const pct = Math.min(100, Math.round(units / 35 * 100));
    const card = document.createElement('div');
    card.className = `p-4 rounded-2xl border ${border} transition hover:shadow-md flex flex-col justify-between`;
    card.innerHTML = `
      <div class="flex items-center justify-between mb-3"><span class="text-xl font-black text-slate-900" dir="ltr">${type}</span>${badge}</div>
      <div class="my-2">
        <div class="text-2xl font-black text-slate-800">${units} <span class="text-xs font-semibold text-slate-500">وحدة</span></div>
        <div class="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden"><div class="h-full ${bar} transition-all duration-500" style="width:${pct}%"></div></div>
      </div>
      <button data-type="${type}" class="quick-dispense mt-3 pt-2 border-t border-slate-100 text-[11px] font-black text-crimson-600 hover:text-crimson-800 text-center">صرف وحدة ←</button>`;
    grid.appendChild(card);
  });
}

function renderRecent() {
  const box = document.getElementById('recentLog');
  if (!state.log.length) { box.innerHTML = '<div class="text-xs text-slate-400 text-center py-4">لا توجد حركات بعد.</div>'; return; }
  box.innerHTML = state.log.slice(0, 6).map(l => {
    const k = LOG_KINDS[l.kind] || { label: l.kind, cls: 'bg-slate-100 text-slate-700', sign: '' };
    const det = l.donorName || l.note || '';
    return `<div class="flex items-center justify-between gap-2 py-2 border-b border-slate-100 text-xs">
      <div class="flex items-center gap-2 min-w-0"><span class="px-2 py-0.5 rounded-md font-black ${k.cls}">${k.label}</span>
      <span class="font-black text-slate-800" dir="ltr">${escapeHTML(l.bloodType || '')}${l.units ? ' ' + k.sign + l.units : ''}</span>
      <span class="text-slate-500 truncate">${escapeHTML(det)}</span></div>
      <span class="text-slate-400 shrink-0" dir="ltr">${fmtTime(l.ts)}</span></div>`;
  }).join('');
}

// ---------- نداء الاستغاثة ----------
function getRecipients(type, city) {
  return state.donors.filter(d => d.bloodType === type)
    .map(d => ({ ...d, r: donorReadiness(d), sameCity: d.city === city }))
    .sort((a, b) => (b.r.ready - a.r.ready) || (b.sameCity - a.sameCity) || ((b.donationCount || 0) - (a.donationCount || 0)));
}
function buildMessage(type, hospital, note) {
  return `🚨 نداء استغاثة عاجل 🚨\nالسلام عليكم {الاسم}،\nنحتاج بشكل عاجل إلى متبرع بفصيلة الدم (${type}) في ${hospital}.\nتبرعك قد ينقذ حياة مريض. إن كنت مستعداً يرجى الحضور أو الرد على هذه الرسالة فوراً.` +
    (note ? `\n${note}` : '') + `\nشكراً لإنسانيتك 🩸 — المنصة الذكية للتبرع بالدم (IBDDMP)`;
}
async function launchAlert(e) {
  e.preventDefault();
  const type = document.getElementById('reqBloodType').value;
  const sel = document.getElementById('reqCity');
  const hospital = sel.options[sel.selectedIndex].text;
  const note = document.getElementById('reqNote').value.trim();
  currentAlert = { type, city: sel.value, hospital, sent: new Set() };
  document.getElementById('alertMessage').value = buildMessage(type, hospital, note);
  document.getElementById('alertResult').classList.remove('hidden');
  const n = getRecipients(type, sel.value).length;
  renderRecipients();
  await writeLog({ kind: 'alert', bloodType: type, units: 0, note: `${hospital} — ${n} متبرع بنفس الفصيلة`, by: who() });
  lastAlertSeen = Date.now();
  showToast(`تم إطلاق نداء الاستغاثة (${type})`, `${n} متبرع مسجّل بنفس الفصيلة. أرسل لهم عبر واتساب من القائمة.`, 'alert');
}
function renderRecipients() {
  if (!currentAlert) return;
  const list = getRecipients(currentAlert.type, currentAlert.city);
  const ready = list.filter(d => d.r.ready).length;
  document.getElementById('alertSummary').textContent = list.length
    ? `${list.length} متبرع بفصيلة ${currentAlert.type} (${ready} جاهز للتبرع) — تم الإرسال لـ ${currentAlert.sent.size}`
    : `لا يوجد متبرعون مسجّلون بفصيلة ${currentAlert.type}.`;
  const box = document.getElementById('recipientList'); box.innerHTML = '';
  list.forEach(d => {
    const sent = currentAlert.sent.has(d.id);
    const item = document.createElement('div');
    item.className = `p-3 rounded-2xl border ${d.r.ready ? 'border-crimson-200 bg-crimson-50/30' : 'border-slate-200 bg-slate-50'} flex flex-col sm:flex-row sm:items-center justify-between gap-3`;
    item.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-11 h-11 rounded-xl bg-crimson-600 text-white font-black flex items-center justify-center shrink-0" dir="ltr">${escapeHTML(d.bloodType)}</div>
        <div class="min-w-0">
          <div class="font-bold text-slate-900 text-sm flex flex-wrap items-center gap-2"><span>${escapeHTML(d.name)}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-md font-bold ${d.r.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${d.r.text}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">تبرع ${d.donationCount || 0} مرة</span></div>
          <div class="text-xs text-slate-500 mt-1">📍 ${escapeHTML(d.city)} &nbsp; 📞 <span dir="ltr">${escapeHTML(d.phone)}</span></div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        ${sent ? '<span class="text-emerald-600 text-xs font-black">✔ أُرسل</span>' : ''}
        <button data-id="${escapeHTML(d.id)}" class="wa-btn px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition">واتساب</button>
        <button data-id="${escapeHTML(d.id)}" class="sms-btn px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-bold text-xs transition">SMS</button>
      </div>`;
    box.appendChild(item);
  });
}
function openChannel(kind, id) {
  const d = state.donors.find(x => x.id === id); if (!d || !currentAlert) return;
  const msg = document.getElementById('alertMessage').value.split('{الاسم}').join(d.name);
  if (kind === 'wa') window.open(`https://wa.me/${toIntlPhone(d.phone)}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  else window.location.href = `sms:${d.phone}?body=${encodeURIComponent(msg)}`;
  currentAlert.sent.add(id); renderRecipients();
}
function sendNext() {
  if (!currentAlert) return;
  const next = getRecipients(currentAlert.type, currentAlert.city).find(d => d.r.ready && !currentAlert.sent.has(d.id));
  if (!next) { showToast('اكتمل الإرسال', 'تم الإرسال لكل المتبرعين الجاهزين بهذه الفصيلة.', 'success'); return; }
  openChannel('wa', next.id);
}

// ---------- أحداث ----------
async function submitOps(e) {
  e.preventDefault();
  const kind = document.getElementById('opKind').value, type = document.getElementById('opType').value;
  const units = document.getElementById('opUnits').value, note = document.getElementById('opNote').value.trim();
  const ok = kind === 'adjust' ? await adjustInventory(type, units, note) : await dispenseUnits(type, units, note);
  if (ok) { document.getElementById('opUnits').value = 1; document.getElementById('opNote').value = ''; }
}
async function confirmClearAll() {
  const ok = await askConfirm('مسح كل البيانات؟', 'سيتم حذف جميع المتبرعين والسجل وتصفير مخزون الدم. لا يمكن التراجع عن هذا الإجراء.', 'نعم، امسح');
  if (ok) { currentAlert = null; document.getElementById('alertResult').classList.add('hidden'); await clearAllData(); }
}
function refreshAll() {
  renderHeader(); renderInventory(); renderRecent(); renderRecipients();
  // تنبيه عند إطلاق نداء من موظف آخر
  const fresh = state.log.find(l => l.kind === 'alert' && l.ts > lastAlertSeen && l.by !== who());
  if (fresh) { lastAlertSeen = fresh.ts; showToast(`🚨 نداء استغاثة (${fresh.bloodType})`, fresh.note || '', 'alert'); }
  refreshIcons();
}

mountLayout('dashboard');
requireAuth().then(() => {
  document.getElementById('inventoryGrid').addEventListener('click', e => {
    const b = e.target.closest('.quick-dispense'); if (!b) return;
    document.getElementById('opKind').value = 'dispense'; document.getElementById('opType').value = b.dataset.type;
    document.getElementById('opsForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('opUnits').focus();
  });
  document.getElementById('recipientList').addEventListener('click', e => {
    const w = e.target.closest('.wa-btn'), s = e.target.closest('.sms-btn');
    if (w) openChannel('wa', w.dataset.id); else if (s) openChannel('sms', s.dataset.id);
  });
  document.getElementById('copyMsgBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(document.getElementById('alertMessage').value); showToast('تم النسخ', 'تم نسخ نص الرسالة.', 'success'); } catch (e) {}
  });
  document.getElementById('nextBtn').addEventListener('click', sendNext);
  onStoreChange(refreshAll);
  refreshAll();
});
