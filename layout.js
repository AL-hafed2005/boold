// الشريط العلوي (حاسوب) + الدراور (هاتف) + التذييل
let _navActive = '', _navSig = null, _navSettled = false;
const HINT_KEY = 'ibddmp_navhint';

// تلميح محفوظ لآخر مستخدم: يعرض الروابط الصحيحة فوراً قبل انتهاء التحقق من الدخول (يمنع الوميض)
function readHint() { try { return JSON.parse(localStorage.getItem(HINT_KEY)); } catch (e) { return null; } }
function saveHint() {
  const s = getSession();
  try { if (s) localStorage.setItem(HINT_KEY, JSON.stringify({ mode: s.mode, role: s.role, name: s.name })); else if (_navSettled) localStorage.removeItem(HINT_KEY); } catch (e) {}
}
function navUser() { return getSession() || (_navSettled ? null : readHint()); }

function navItems(s) {
  const a = [['index.html', 'الرئيسية', 'index', 'home']];
  if (s) a.push(['dashboard.html', 'لوحة التحكم', 'dashboard', 'layout-dashboard'], ['donors.html', 'المتبرعون', 'donors', 'users'], ['log.html', 'السجل', 'log', 'history']);
  if (s && s.role === 'admin' && s.mode === 'cloud') a.push(['staff.html', 'الموظفون', 'staff', 'user-cog']);
  a.push(['architecture.html', 'المعمارية الذكية', 'architecture', 'brain-circuit'], ['eligibility.html', 'الفحص الطبي', 'eligibility', 'stethoscope']);
  return a;
}

function openDrawer() {
  document.getElementById('navDrawer').classList.remove('pointer-events-none');
  document.getElementById('drawerOverlay').classList.remove('opacity-0');
  document.getElementById('drawerPanel').classList.remove('translate-x-full');
  document.body.classList.add('overflow-hidden');
}
function closeDrawer() {
  const d = document.getElementById('navDrawer'); if (!d) return;
  d.classList.add('pointer-events-none');
  document.getElementById('drawerOverlay').classList.add('opacity-0');
  document.getElementById('drawerPanel').classList.add('translate-x-full');
  document.body.classList.remove('overflow-hidden');
}

function renderNav() {
  const s = navUser();
  const sig = s ? [s.mode, s.role, s.name].join('|') : 'out';
  if (sig === _navSig) return; _navSig = sig;
  const items = navItems(s);
  const desk = items.map(([href, label, key]) =>
    `<a href="${href}" class="${key === _navActive ? 'text-crimson-600' : ''} hover:text-crimson-600 transition whitespace-nowrap">${label}</a>`).join('');
  const cloud = s && s.mode === 'cloud';

  const deskRight = s ? `
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-full ${cloud ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'} border text-xs font-bold">
      <span class="w-2 h-2 rounded-full ${cloud ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}"></span><span>${cloud ? 'متصل بالسحابة' : 'وضع محلي'}</span>
    </div>
    <div class="text-right leading-tight">
      <div class="text-xs font-black text-slate-900">${escapeHTML(s.name)}</div>
      <div class="text-[11px] font-bold text-crimson-600">${ROLE_LABEL[s.role] || s.role}</div>
    </div>
    <button onclick="logoutUser()" class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-crimson-600 text-white font-bold text-sm transition shadow-md flex items-center gap-2"><i data-lucide="log-out" class="w-4 h-4"></i><span>خروج</span></button>`
    : `<a href="login.html" class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-crimson-600 text-white font-bold text-sm transition shadow-md flex items-center gap-2"><i data-lucide="shield-check" class="w-4 h-4"></i><span>تسجيل الدخول</span></a>`;

  document.getElementById('app-nav').innerHTML = `
  <nav class="sticky top-0 z-40 glass-card shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16 md:h-20">
        <a href="index.html" class="flex items-center gap-2.5 min-w-0">
          <div class="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-crimson-600 to-crimson-800 flex items-center justify-center text-white shadow-lg shadow-crimson-600/30 shrink-0"><i data-lucide="droplet" class="w-6 h-6 md:w-7 md:h-7 fill-current"></i></div>
          <div class="min-w-0"><span class="text-lg md:text-xl font-black tracking-tight text-slate-900 block leading-none">IBDDMP</span>
          <span class="text-[10px] md:text-xs font-semibold text-crimson-600 block truncate">المنصة الذكية لإدارة الدم</span></div>
        </a>
        <div class="hidden md:flex items-center gap-5 text-sm font-semibold text-slate-600">${desk}</div>
        <div class="hidden md:flex items-center gap-3">${deskRight}</div>
        <div class="flex md:hidden items-center gap-2">
          ${s ? '' : '<a href="login.html" class="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">دخول</a>'}
          <button onclick="openDrawer()" aria-label="القائمة" class="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition"><i data-lucide="menu" class="w-6 h-6"></i></button>
        </div>
      </div>
    </div>
  </nav>`;

  const dl = items.map(([href, label, key, icon]) =>
    `<a href="${href}" onclick="closeDrawer()" class="flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition ${key === _navActive ? 'bg-crimson-50 text-crimson-600' : 'text-slate-700 hover:bg-slate-100'}"><i data-lucide="${icon}" class="w-5 h-5"></i><span>${label}</span></a>`).join('');
  document.getElementById('drawerPanel').innerHTML = `
    <div class="flex items-center justify-between px-5 h-16 border-b border-slate-100 shrink-0">
      <span class="font-black text-slate-900">القائمة</span>
      <button onclick="closeDrawer()" aria-label="إغلاق" class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    <div class="flex-1 overflow-y-auto p-3 space-y-1">${dl}</div>
    <div class="p-4 border-t border-slate-100 shrink-0">
      ${s ? `<div class="flex items-center gap-3 mb-3 p-3 rounded-2xl bg-slate-50">
          <div class="w-10 h-10 rounded-xl bg-crimson-600 text-white font-black flex items-center justify-center">${escapeHTML((s.name || '?').trim().charAt(0))}</div>
          <div class="min-w-0"><div class="text-sm font-black text-slate-900 truncate">${escapeHTML(s.name)}</div>
          <div class="text-[11px] font-bold ${cloud ? 'text-emerald-600' : 'text-amber-600'}">${ROLE_LABEL[s.role] || s.role} • ${cloud ? 'متصل بالسحابة' : 'وضع محلي'}</div></div></div>
        <button onclick="logoutUser()" class="w-full py-3 rounded-xl bg-slate-900 hover:bg-crimson-600 text-white font-bold text-sm transition flex items-center justify-center gap-2"><i data-lucide="log-out" class="w-4 h-4"></i><span>تسجيل الخروج</span></button>`
        : `<a href="login.html" class="w-full py-3 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white font-bold text-sm transition flex items-center justify-center gap-2"><i data-lucide="shield-check" class="w-4 h-4"></i><span>تسجيل الدخول</span></a>`}
    </div>`;
  refreshIcons();
}

function mountLayout(active) {
  _navActive = active;
  if (!document.getElementById('navDrawer')) {
    document.body.insertAdjacentHTML('beforeend', `
    <div id="navDrawer" class="fixed inset-0 z-50 pointer-events-none md:hidden" role="dialog" aria-modal="true">
      <div id="drawerOverlay" onclick="closeDrawer()" class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm opacity-0 transition-opacity duration-300"></div>
      <aside id="drawerPanel" class="absolute inset-y-0 right-0 w-72 max-w-[85%] bg-white shadow-2xl translate-x-full transition-transform duration-300 ease-out flex flex-col"></aside>
    </div>`);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 768) closeDrawer(); });
  }
  renderNav();
  document.getElementById('app-footer').innerHTML = `
  <footer class="bg-slate-900 text-slate-400 py-8 md:py-10 border-t border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-crimson-600 flex items-center justify-center text-white shrink-0"><i data-lucide="droplet" class="w-5 h-5"></i></div>
        <div>
          <span class="text-white font-bold block text-sm">المنصة الذكية للتبرع بالدم وإدارة المتبرعين (IBDDMP)</span>
          <span class="text-xs text-slate-500">نموذج مشروع التخرج الهندسي المتكامل • جميع الحقوق محفوظة</span>
        </div>
      </div>
      <div class="text-xs text-slate-500">مدعوم بتقنيات السحابة الفورية وخوارزميات الذكاء الاصطناعي الطبي</div>
    </div>
  </footer>`;
  onStoreChange(() => { saveHint(); renderNav(); });
  storeReady.then(() => { _navSettled = true; saveHint(); _navSig = null; renderNav(); });
  initStore();
  refreshIcons();
}
