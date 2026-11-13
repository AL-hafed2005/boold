// منطق صفحة الفحص الصحي الآلي
function evaluateEligibility() {
  const age = parseInt(document.getElementById('checkAge').value, 10);
  const weight = parseFloat(document.getElementById('checkWeight').value);
  const hb = parseFloat(document.getElementById('checkHb').value);
  const days = parseInt(document.getElementById('checkDays').value, 10);
  const healthy = document.getElementById('checkHealthy').checked;
  const statusEl = document.getElementById('eligibilityStatusText');
  const detailEl = document.getElementById('eligibilityDetailText');
  const reasons = [];

  if (age < 18 || age > 65) reasons.push('العمر يجب أن يكون بين 18 و 65 عاماً');
  if (weight < 50) reasons.push('الوزن أقل من الحد الأدنى المسموح (50 كغم)');
  if (hb < 12.5) reasons.push('نسبة الهيموجلوبين أقل من المعدل الآمن (12.5 g/dL)');
  if (days < 90) reasons.push(`يجب مرور 90 يوماً على آخر تبرع (المتبقي: ${90 - days} يوم)`);
  if (!healthy) reasons.push('وجود موانع صحية مؤقتة أو تناول أدوية');

  if (reasons.length === 0) {
    statusEl.textContent = '✅ مؤهل طبياً للتبرع بالدم فوراً';
    statusEl.className = 'text-lg font-black text-emerald-400';
    detailEl.textContent = 'جميع مؤشراتك الحيوية مثالية ومطابقة لمعايير منظمة الصحة العالمية وبنوك الدم.';
    showToast('نتيجة الفحص: مؤهل', 'يمكنك التوجه لأقرب مركز تبرع أو التسجيل في المنصة.', 'success');
  } else {
    statusEl.textContent = '⚠️ غير مؤهل حالياً (تأجيل مؤقت)';
    statusEl.className = 'text-lg font-black text-amber-400';
    detailEl.textContent = 'السبب: ' + reasons.join(' • ');
    showToast('نتيجة الفحص: تأجيل مؤقت', reasons[0], 'alert');
  }
}
mountLayout('eligibility');
