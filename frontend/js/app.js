/* ════════════════════════════════════════════════════════
   SkillSpire — app.js
   Covers: Variables · Functions · Arrays · Objects
           Event Handling · DOM Manipulation
           Async/Await · Fetch API · Promises · ES6+
════════════════════════════════════════════════════════ */

'use strict';

/* ── 1. CONSTANTS & VARIABLES (ES6 const / let) ─────── */
const API = 'http://localhost:3000/api';
const PER_PAGE = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Application state — single source of truth (Object)
const state = {
  user:    null,
  token:   null,
  skills:  [],       // Array
  jobs:    [],       // Array
  page:    { skills: 1, jobs: 1 },
  filters: {
    skills: { cat: 'all', lvl: 'all', q: '' },
    jobs:   { type: 'all', q: '' },
  },
};

/* ── 2. UTILITY FUNCTIONS (Arrow functions) ─────────── */
const $      = id  => document.getElementById(id);
const $$     = sel => document.querySelectorAll(sel);
const fmt    = n   => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const stars  = r   => `★ ${r.toFixed(1)}`;
const sleep  = ms  => new Promise(r => setTimeout(r, ms));
const clamp  = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* ── 3. SIMPLE EVENT EMITTER (ES6 Class) ────────────── */
class EventBus {
  constructor() { this._map = {}; }
  on(ev, fn)  { (this._map[ev] ??= []).push(fn); return this; }
  off(ev, fn) { this._map[ev] = (this._map[ev] ?? []).filter(f => f !== fn); }
  emit(ev, ...args) { (this._map[ev] ?? []).forEach(fn => fn(...args)); }
}
const bus = new EventBus();
bus.on('user:login',  u => console.log('🔐 Login:', u.name));
bus.on('user:logout', () => console.log('🚪 Logout'));
bus.on('nav',        s => console.log('🧭 Nav →', s));

/* ── 4. TOAST NOTIFICATION ──────────────────────────── */
let toastTimer = null;
const toast = (msg, type = '') => {
  const el = $('toast');
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.className = `toast show ${type}`.trim();
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3400);
};

/* ── 5. NAVBAR SCROLL ───────────────────────────────── */
window.addEventListener('scroll', () => {
  $('navbar').classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

/* ── 6. HAMBURGER MENU ──────────────────────────────── */
$('navHamburger').addEventListener('click', function () {
  $('navLinks').classList.toggle('open');
  this.classList.toggle('open');
});

// Close menu on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.navbar')) {
    $('navLinks').classList.remove('open');
    $('navHamburger').classList.remove('open');
  }
});

/* ── 7. SPA NAVIGATION ──────────────────────────────── */
const navigate = section => {
  if (section === 'dashboard' && !state.user) {
    showModal('loginModal');
    return;
  }

  // Hide all pages, deactivate all links
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.nav-link').forEach(a => a.classList.remove('active'));

  const page = $(`page-${section}`);
  if (page) {
    page.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Activate matching nav link
  const link = document.querySelector(`.nav-link[data-nav="${section}"]`);
  if (link) link.classList.add('active');

  // Close mobile nav
  $('navLinks').classList.remove('open');
  $('navHamburger').classList.remove('open');

  // Trigger section data load
  const loaders = {
    home:      loadHomeFeatured,
    skills:    loadSkills,
    jobs:      loadJobs,
    dashboard: renderDashboard,
  };
  loaders[section]?.();
  bus.emit('nav', section);
};

// Intercept all data-nav clicks (event delegation)
document.addEventListener('click', e => {
  const el = e.target.closest('[data-nav]');
  if (el) { e.preventDefault(); navigate(el.dataset.nav); }
});

/* ── 8. MODAL HELPERS ───────────────────────────────── */
const showModal  = id => { $(id).classList.add('open');    document.body.style.overflow = 'hidden'; };
const closeModal = id => { $(id).classList.remove('open'); document.body.style.overflow = '';       clearModalErrors(id); };
const switchModal = (from, to) => { closeModal(from); showModal(to); };

// Click overlay to close
$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

// Escape key closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $$('.modal-overlay.open').forEach(m => closeModal(m.id));
    closeUserMenu();
  }
});

const clearModalErrors = id => {
  $(id)?.querySelectorAll('.ferr, .ferr-block').forEach(el => {
    el.textContent = '';
    el.classList.add('hidden');
  });
  $(id)?.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
};

/* ── 9. USER DROPDOWN ───────────────────────────────── */
const toggleUserMenu = () => $('userDropdown').classList.toggle('open');
const closeUserMenu  = () => $('userDropdown').classList.remove('open');
document.addEventListener('click', e => {
  if (!e.target.closest('.nav-user-wrap')) closeUserMenu();
});

/* ── 10. SESSION MANAGEMENT ─────────────────────────── */
const restoreSession = () => {
  const token = localStorage.getItem('ss_token');
  const user  = localStorage.getItem('ss_user');
  if (token && user) {
    try {
      state.token = token;
      state.user  = JSON.parse(user);
      refreshAuthUI();
    } catch { localStorage.clear(); }
  }
};

const saveSession = (token, user) => {
  // ✅ ADD DEFAULT ARRAYS
  user.enrolledSkills = user.enrolledSkills || [];
  user.appliedJobs = user.appliedJobs || [];

  state.token = token;
  state.user  = user;

  localStorage.setItem('ss_token', token);
  localStorage.setItem('ss_user',  JSON.stringify(user));

  refreshAuthUI();
  bus.emit('user:login', user);
};

const logout = () => {
  state.token = null;
  state.user  = null;
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  refreshAuthUI();
  navigate('home');
  toast('Signed out. See you soon! 👋');
  bus.emit('user:logout');
};

const refreshAuthUI = () => {
  const in_ = !!state.user;
  $('navAuth').classList.toggle('hidden', in_);
  $('navUser').classList.toggle('hidden', !in_);
  if (state.user) {
    $('userName').textContent  = state.user.name?.split(' ')[0] || 'User';
    $('userAvatar').textContent = (state.user.name?.[0] || 'U').toUpperCase();
  }
};

/* ── 11. FETCH API WRAPPER (Async / Await) ──────────── */
const api = async (endpoint, opts = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const res = await fetch(`${API}${endpoint}`, { ...opts, headers });

  // ✅ Safe JSON handling (from File 2)
  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    console.error("Invalid JSON response:", text);
    throw new Error("Server returned invalid JSON");
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
};

/* ── 12. FORM VALIDATION ENGINE ─────────────────────── */
const validate = rules => {
  let valid = true;
  rules.forEach(({ id, errId, checks }) => {
    const el  = $(id);
    const val = el?.value.trim() ?? '';
    let passed = true;

    for (const { test, msg } of checks) {
      if (!test(val)) {
        if (errId) { const e = $(errId); if (e) e.textContent = msg; }
        el?.classList.add('has-error');
        passed = false;
        valid  = false;
        break;
      }
    }
    if (passed) {
      el?.classList.remove('has-error');
      if (errId) { const e = $(errId); if (e) e.textContent = ''; }
    }
  });
  return valid;
};

/* ── 13. LOADING STATE HELPER ───────────────────────── */
const setLoading = (btnId, txtId, spinId, loading) => {
  const btn  = $(btnId);
  const txt  = $(txtId);
  const spin = $(spinId);
  if (!btn) return;
  btn.disabled = loading;
  txt?.classList.toggle('hidden', loading);
  spin?.classList.toggle('hidden', !loading);
};

/* ── 14. SIGNUP FORM ────────────────────────────────── */
$('signupForm').addEventListener('submit', async e => {
  e.preventDefault();

  const ok = validate([
    { id:'sName',  errId:'errSName', checks:[{ test: v => v.length >= 2,       msg:'Name must be at least 2 characters.' }] },
    { id:'sEmail', errId:'errSEmail',checks:[{ test: v => EMAIL_RE.test(v),    msg:'Enter a valid email address.' }] },
    { id:'sPass',  errId:'errSPass', checks:[{ test: v => v.length >= 6,       msg:'Password must be at least 6 characters.' }] },
  ]);
  if (!ok) return;

  setLoading('signupBtn','btn-txt','btn-spin', true);
  $('signupErr').classList.add('hidden');

  try {
    const { token, user } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name:     $('sName').value.trim(),
        email:    $('sEmail').value.trim(),
        password: $('sPass').value,
      }),
    });
    saveSession(token, user);
    closeModal('signupModal');
    toast(`Welcome, ${user.name}! 🎉`, 'success');
    navigate('skills');
  } catch (err) {
    const el = $('signupErr');
    el.textContent = err.message;
    el.classList.remove('hidden');
  } finally {
    setLoading('signupBtn','btn-txt','btn-spin', false);
  }
});

// Password strength meter (DOM event + conditionals)
$('sPass').addEventListener('input', function () {
  const v   = this.value;
  const bar = $('passStrengthBar');
  const fill = $('psb');
  const lbl  = $('psbLbl');
  if (!v) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';

  let score = 0;
  if (v.length >= 8)           score++;
  if (/[A-Z]/.test(v))         score++;
  if (/[0-9]/.test(v))         score++;
  if (/[^A-Za-z0-9]/.test(v))  score++;

  const configs = [
    { w: '25%', bg: '#e74c3c', t: 'Weak' },
    { w: '50%', bg: '#e67e22', t: 'Fair' },
    { w: '75%', bg: '#f1c40f', t: 'Good' },
    { w: '100%',bg: '#27ae60', t: 'Strong' },
  ];
  const cfg = configs[clamp(score - 1, 0, 3)];
  fill.style.width      = cfg.w;
  fill.style.background = cfg.bg;
  lbl.textContent       = cfg.t;
});

/* ── 15. LOGIN FORM ─────────────────────────────────── */
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();

  const ok = validate([
    { id:'lEmail', errId:'errLEmail', checks:[{ test: v => EMAIL_RE.test(v), msg:'Enter a valid email.' }] },
    { id:'lPass',  errId:'errLPass',  checks:[{ test: v => v.length >= 1,   msg:'Password is required.' }] },
  ]);
  if (!ok) return;

  setLoading('loginBtn','btn-txt','btn-spin', true);
  $('loginErr').classList.add('hidden');

  try {
    const { token, user } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email:    $('lEmail').value.trim(),
        password: $('lPass').value,
      }),
    });
    saveSession(token, user);
    closeModal('loginModal');
    toast(`Welcome back, ${user.name}! 👋`, 'success');
    navigate('dashboard');
  } catch (err) {
    const el = $('loginErr');
    el.textContent = err.message;
    el.classList.remove('hidden');
  } finally {
    setLoading('loginBtn','btn-txt','btn-spin', false);
  }
});

/* ── 16. CONTACT FORM ───────────────────────────────── */
$('contactForm').addEventListener('submit', async e => {
  e.preventDefault();

  const ok = validate([
    { id:'cName',    errId:'errCName',    checks:[{ test: v => v.length >= 2,    msg:'Name is required (min. 2 chars).' }] },
    { id:'cEmail',   errId:'errCEmail',   checks:[{ test: v => EMAIL_RE.test(v), msg:'Enter a valid email address.' }] },
    { id:'cMessage', errId:'errCMessage', checks:[{ test: v => v.length >= 10,   msg:'Message must be at least 10 characters.' }] },
  ]);
  if (!ok) return;

  const agree = $('cAgree');
  if (agree && !agree.checked) {
    $('errContactGeneral').textContent = 'Please accept the privacy policy to continue.';
    return;
  }
  $('errContactGeneral').textContent = '';

  setLoading('contactBtn','btn-txt','btn-spin', true);

  try {
    await api('/contact', {
      method: 'POST',
      body: JSON.stringify({
        name:    $('cName').value.trim(),
        email:   $('cEmail').value.trim(),
        subject: $('cSubject')?.value || 'General Enquiry',
        message: $('cMessage').value.trim(),
      }),
    });
    $('contactOK').classList.remove('hidden');
    $('contactForm').reset();
  } catch {
    $('errContactGeneral').textContent = 'Failed to send. Please try again shortly.';
  } finally {
    setLoading('contactBtn','btn-txt','btn-spin', false);
  }
});

/* ── 17. PASSWORD VISIBILITY TOGGLE ─────────────────── */
const togglePass = (inputId, btn) => {
  const inp = $(inputId);
  const show = inp.type === 'password';
  inp.type  = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
};

/* ── 18. FAQ ACCORDION ───────────────────────────────── */
const toggleFaq = el => {
  const isOpen = el.classList.contains('open');
  $$('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
};

/* ── 19. FETCH + RENDER SKILLS ───────────────────────── */
const loadSkills = async () => {
  const grid = $('skillsGrid');
  grid.innerHTML = `<div class="loading-ph">Loading skills…</div>`;

  try {
    const { cat, lvl, q } = state.filters.skills;
    const params = new URLSearchParams({ page: state.page.skills, limit: PER_PAGE });
    if (cat !== 'all') params.set('category', cat);
    if (lvl !== 'all') params.set('level', lvl);

    // Fetch API + destructuring
    const { skills, total, page, totalPages } = await api(`/skills?${params}`);
    state.skills = skills;

    // Array.filter for local search
    const visible = q
      ? skills.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q))
      : skills;

    $('skillResultsInfo').textContent = `Showing ${visible.length} of ${total} skills`;
    renderSkillGrid(visible);
    renderPager('skillsPagination', page, totalPages, p => { state.page.skills = p; loadSkills(); });

  } catch {
    grid.innerHTML = `<div class="loading-ph">⚠️ Could not load skills — is the backend running?</div>`;
  }
};

// Build HTML from array using .map() + template literals
const renderSkillGrid = skills => {
  const grid = $('skillsGrid');
  if (!skills.length) {
    grid.innerHTML = `<div class="loading-ph">No skills match your filters.</div>`;
    return;
  }

  // Array.find to look up user progress
  const getProgress = skill => state.user?.skillsProgress?.find(
    p => p.skillId?.toString() === skill._id?.toString() || p.skillTitle === skill.title
  ) ?? null;

  grid.innerHTML = skills.map(skill => {
    const prog = getProgress(skill);
    const isEnrolled = state.user?.enrolledSkills?.includes(skill.title);
    return /* html */`
    <div class="skill-card">
      <div class="skill-card-top">
        <span class="skill-cat">${skill.category}</span>
        <span class="skill-lvl">${skill.level}</span>
      </div>
      <div class="skill-title">${skill.title}</div>
      <p class="skill-desc">${skill.description}</p>
      <div class="skill-meta">
        <span class="skill-rating">${stars(skill.rating)}</span>
        <span class="skill-enrolled">${fmt(skill.enrolled)} enrolled</span>
      </div>
      ${prog ? `
        <div class="skill-progress-wrap">
          <div class="skill-progress-bar">
            <div class="skill-progress-fill" style="width:${prog.progress}%"></div>
          </div>
          <div class="skill-progress-label">${prog.progress}% complete</div>
        </div>` : ''}
      <div class="skill-footer">
        <span class="skill-duration">⏱ ${skill.duration}</span>
        <button class="btn-enroll ${prog || isEnrolled ? 'enrolled' : ''}"
  onclick="enroll('${skill._id}','${skill.title.replace(/'/g,"\\'")}')"
  ${isEnrolled ? 'disabled' : ''}>
  ${isEnrolled ? 'Enrolled' : (prog ? '▶ Continue' : '+ Enroll')}
</button>
      </div>
    </div>`;
  }).join('');
};

// Enroll / progress update (Async/Await + error handling)
const enroll = async (skillId, skillTitle) => {
  if (!state.user) { showModal('loginModal'); return; }
  // 🔥 ALL COURSE LINKS HERE
  const courseLinks = {
    "JavaScript Fundamentals": "https://www.youtube.com/watch?v=PkZNo7MFNFg",
    "React & Modern Frontend": "https://www.youtube.com/watch?v=bMknfKXIFA8",
    "Node.js & Express": "https://www.youtube.com/watch?v=Oe421EPjeBE",
    "MongoDB & Mongoose": "https://www.youtube.com/watch?v=ofme2o29ngU",
    "Python for Data Science": "https://www.youtube.com/watch?v=LHBE6Q9XlzI",
    "UI/UX Design Principles": "https://www.youtube.com/watch?v=c9Wg6Cb_YlU"
  };

  // 🔗 OPEN LINK
  // FIRST: call backend to save enroll
await fetch("http://localhost:3000/enroll-skill", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${state.token}`
  },
  body: JSON.stringify({ skill: skillTitle })
});

// 🔗 THEN open YouTube (DO NOT REMOVE)
if (courseLinks[skillTitle]) {
  window.open(courseLinks[skillTitle], "_blank");
}

  const existing = state.user.skillsProgress?.find(
    p => p.skillId?.toString() === skillId?.toString()
  );
  const progress = existing ? Math.min(existing.progress + 10, 100) : 5;

  try {
    const data = await api('/skills/progress', {
      method: 'POST',
      body: JSON.stringify({ skillId, skillTitle, progress }),
    });

    // Update local user state (immutable pattern)
    if (data.skillsProgress) {
      state.user = { ...state.user, skillsProgress: data.skillsProgress };
    } else {
      const sp  = state.user.skillsProgress ?? [];
      const idx = sp.findIndex(p => p.skillId?.toString() === skillId?.toString());
      if (idx >= 0) sp[idx] = { ...sp[idx], progress };
      else          sp.push({ skillId, skillTitle, progress });
      state.user = { ...state.user, skillsProgress: sp };
    }

    localStorage.setItem('ss_user', JSON.stringify(state.user));
    toast(`"${skillTitle}" updated — ${progress}% ✅`, 'success');
    loadSkills();
  } catch {
    toast('Could not update progress. Try again.', 'error');
  }
};

// Skill category pill filter (event delegation)
$('skillCatFilter').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  $$('#skillCatFilter .pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  state.filters.skills.cat = pill.dataset.cat;
  state.page.skills = 1;
  loadSkills();
});

// Skill level pill filter
$('skillLvlFilter').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  $$('#skillLvlFilter .pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  state.filters.skills.lvl = pill.dataset.lvl;
  state.page.skills = 1;
  loadSkills();
});

// Search with debounce (closures + setTimeout)
let skillTimer;
$('skillSearch').addEventListener('input', e => {
  clearTimeout(skillTimer);
  const val = e.target.value.trim().toLowerCase();
  $('skillSearchClear').classList.toggle('hidden', !val);
  skillTimer = setTimeout(() => {
    state.filters.skills.q = val;
    loadSkills();
  }, 320);
});

const clearSkillSearch = () => {
  $('skillSearch').value = '';
  $('skillSearchClear').classList.add('hidden');
  state.filters.skills.q = '';
  loadSkills();
};

/* ── 20. FETCH + RENDER JOBS ─────────────────────────── */
const loadJobs = async () => {
  const list = $('jobsList');
  list.innerHTML = `<div class="loading-ph">Loading opportunities…</div>`;

  try {
    const { type, q } = state.filters.jobs;
    const params = new URLSearchParams({ page: state.page.jobs, limit: PER_PAGE });
    if (type !== 'all') params.set('type', type);
    if (q)             params.set('search', q);

    const { jobs, total, page, totalPages } = await api(`/jobs?${params}`);
    state.jobs = jobs;

    $('jobResultsInfo').textContent = `Showing ${jobs.length} of ${total} jobs`;
    renderJobsList(jobs);
    renderPager('jobsPagination', page, totalPages, p => { state.page.jobs = p; loadJobs(); });

  } catch {
    list.innerHTML = `<div class="loading-ph">⚠️ Could not load jobs — is the backend running?</div>`;
  }
};

const renderJobsList = jobs => {
  const list = $('jobsList');
  if (!jobs.length) {
    list.innerHTML = `<div class="loading-ph">No jobs match your search.</div>`;
    return;
  }

  list.innerHTML = jobs.map(job => /* html */`
    <div class="job-card">
      <div class="job-logo">${job.logo || '🏢'}</div>
      <div class="job-main">
        <div class="job-title">${job.title}</div>
        <div class="job-company">${job.company}</div>
        <div class="job-tags">
          <span class="job-tag t-type">${job.type}</span>
          <span class="job-tag t-loc">📍 ${job.location}</span>
          ${(job.requiredSkills ?? []).slice(0, 4).map(s => `<span class="job-tag">${s}</span>`).join('')}
        </div>
      </div>
      <div class="job-right">
        <div class="job-salary">${job.salary}</div>
       ${(() => {
  const isApplied = state.user?.appliedJobs?.some(j => j.job === job.title);
  return `
    <button class="btn-apply"
      onclick="applyJob('${job.title.replace(/'/g,"\\'")}')"
      ${isApplied ? 'disabled' : ''}>
      ${isApplied ? 'Applied' : 'Apply Now'}
    </button>
  `;
})()} </div>
    </div>`).join('');
};
const applyJob = (title) => {
  if (!state.user) {
    showModal('loginModal');
    return;
  }

  document.getElementById("jobTitleInput").value = title;
  showModal('jobApplyModal');
};

// Job type filter
$('jobTypeFilter').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  $$('#jobTypeFilter .pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  state.filters.jobs.type = pill.dataset.type;
  state.page.jobs = 1;
  loadJobs();
});

// Job search with debounce
let jobTimer;
$('jobSearch').addEventListener('input', e => {
  clearTimeout(jobTimer);
  const val = e.target.value.trim();
  $('jobSearchClear').classList.toggle('hidden', !val);
  jobTimer = setTimeout(() => {
    state.filters.jobs.q = val;
    state.page.jobs = 1;
    loadJobs();
  }, 350);
});

const clearJobSearch = () => {
  $('jobSearch').value = '';
  $('jobSearchClear').classList.add('hidden');
  state.filters.jobs.q = '';
  loadJobs();
};

/* ── 21. PAGINATION RENDERER ─────────────────────────── */
const renderPager = (containerId, current, total, cb) => {
  const c = $(containerId);
  if (!c) return;
  if (total <= 1) { c.innerHTML = ''; return; }

  // Array.from to generate page numbers
  const btns = Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    return `<button class="pg-btn ${n === current ? 'active' : ''}" data-p="${n}">${n}</button>`;
  }).join('');

  c.innerHTML = btns;
  c.querySelectorAll('.pg-btn').forEach(btn => {
    btn.addEventListener('click', () => cb(parseInt(btn.dataset.p)));
  });
};

/* ── 22. HOME — FEATURED SKILLS ──────────────────────── */
const loadHomeFeatured = async () => {
  const el = $('homeFeatSkills');
  try {
    const { skills } = await api('/skills?page=1&limit=3');
    el.innerHTML = skills.map(skill => /* html */`
      <div class="skill-card" style="cursor:pointer" onclick="navigate('skills')">
        <div class="skill-card-top">
          <span class="skill-cat">${skill.category}</span>
          <span class="skill-lvl">${skill.level}</span>
        </div>
        <div class="skill-title">${skill.title}</div>
        <p class="skill-desc">${skill.description}</p>
        <div class="skill-meta">
          <span class="skill-rating">${stars(skill.rating)}</span>
          <span class="skill-enrolled">${fmt(skill.enrolled)} enrolled</span>
        </div>
        <div class="skill-footer">
          <span class="skill-duration">⏱ ${skill.duration}</span>
          <span class="btn-enroll">View course →</span>
        </div>
      </div>`).join('');
  } catch {
    el.innerHTML = `<div class="loading-ph" style="grid-column:1/-1">
      Start the backend server to see live skill data here.<br/>
      <code>cd backend && npm install && node server.js</code>
    </div>`;
  }
};

/* ── 23. DASHBOARD ───────────────────────────────────── */
const renderDashboard = async () => {
  if (!state.user) return;
  $('dashWelcome').innerHTML = `Welcome back, <strong>${state.user.name}</strong>! 👋`;

  const sp        = state.user.skillsProgress ?? [];
  const completed = sp.filter(p => p.progress === 100).length;
  const avg       = sp.length
    ? Math.round(sp.reduce((acc, p) => acc + p.progress, 0) / sp.length)
    : 0;

  // DOM manipulation — update multiple elements
  $('dSkillCount').textContent = sp.length;
  $('dAvgProg').textContent    = `${avg}%`;
  $('dCompleted').textContent  = completed;

  renderProgressList(sp);
  loadDashJobs();
};

const renderProgressList = sp => {
  const list = $('progressList');
  if (!sp.length) {
    list.innerHTML = `<div class="loading-ph">Enroll in skills to see your progress here.</div>`;
    return;
  }

  list.innerHTML = sp.map(p => /* html */`
    <div class="prog-item">
      <div class="prog-item-hdr">
        <div class="prog-item-title">${p.skillTitle || 'Unnamed Skill'}</div>
        <div class="prog-item-pct" id="pct-${p.skillId}">${p.progress}%</div>
      </div>
      <div class="prog-bar-track">
        <div class="prog-bar-fill" id="fill-${p.skillId}" style="width:${p.progress}%"></div>
      </div>
      <div class="prog-controls">
        <input type="range" min="0" max="100" step="5" value="${p.progress}"
          oninput="liveProgressUI('${p.skillId}', this.value)" />
        <button class="btn-save-prog"
          onclick="saveProgress('${p.skillId}','${(p.skillTitle||'').replace(/'/g,"\\'")}',
            document.querySelector('input[oninput*=\\'${p.skillId}\\']').value)">
          Save
        </button>
      </div>
    </div>`).join('');
};

const liveProgressUI = (skillId, val) => {
  const fill = $(`fill-${skillId}`);
  const pct  = $(`pct-${skillId}`);
  if (fill) fill.style.width  = `${val}%`;
  if (pct)  pct.textContent   = `${val}%`;
};

const saveProgress = async (skillId, skillTitle, rawVal) => {
  if (!state.user) return;
  const progress = parseInt(rawVal);

  try {
    await api('/skills/progress', {
      method: 'POST',
      body: JSON.stringify({ skillId, skillTitle, progress }),
    });

    // Immutable state update using .map()
    const sp = (state.user.skillsProgress ?? []).map(p =>
      p.skillId?.toString() === skillId?.toString()
        ? { ...p, progress }
        : p
    );
    state.user = { ...state.user, skillsProgress: sp };
    localStorage.setItem('ss_user', JSON.stringify(state.user));

    toast('Progress saved! ✅', 'success');
    renderDashboard();
  } catch {
    toast('Could not save progress.', 'error');
  }
};

// Load a few jobs for the dashboard
const loadDashJobs = async () => {
  const el = $('dashJobs');
  try {
    const { jobs } = await api('/jobs?page=1&limit=3');
    el.innerHTML = jobs.map(job => /* html */`
      <div class="dash-job-card">
        <div class="djc-top">
          <div class="djc-logo">${job.logo || '🏢'}</div>
          <div>
            <div class="djc-title">${job.title}</div>
            <div class="djc-co">${job.company}</div>
          </div>
        </div>
        <div class="djc-tags">
          ${(job.requiredSkills ?? []).slice(0,3).map(s => `<span class="djc-tag">${s}</span>`).join('')}
        </div>
        <div class="djc-sal">${job.salary}</div>
        <button class="btn-dj-apply" onclick="applyJob('${job.title.replace(/'/g,"\\'")}')">Apply Now</button>
      </div>`).join('');
  } catch {
    el.innerHTML = `<div class="loading-ph">Start the backend to see job recommendations.</div>`;
  }
};

/* ── 24. ANIMATED STAT COUNTERS ──────────────────────── */
const animateCounters = () => {
  $$('[data-target]').forEach(el => {
    const target   = parseInt(el.dataset.target);
    const duration = 1800;
    const step     = target / (duration / 16);
    let cur = 0;

    const tick = () => {
      cur += step;
      if (cur >= target) {
        el.textContent = target.toLocaleString();
        return;
      }
      el.textContent = Math.floor(cur).toLocaleString();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
};

// IntersectionObserver — trigger counters when hero stats scroll into view
const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      animateCounters();
      observer.disconnect();
    }
  }, { threshold: 0.5 });
  observer.observe(heroStats);
}

/* ── 25. EXPOSE GLOBALS ──────────────────────────────── */
// Functions called via inline onclick attrs need to be on window
Object.assign(window, {
  navigate, showModal, closeModal, switchModal,
  toggleUserMenu, logout,
  enroll, applyJob,
  liveProgressUI, saveProgress,
  togglePass, toggleFaq,
  clearSkillSearch, clearJobSearch,
});

/* ── 26. BOOT ─────────────────────────────────────────── */
const boot = () => {
  restoreSession();
  navigate('home');
  console.log('%c⬡ SkillSpire booted', 'color:#3a8a62;font-weight:bold;font-size:14px');
};
document.getElementById("jobApplyForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("applicantName").value;
  const bio = document.getElementById("applicantBio").value;
  const file = document.getElementById("applicantResume").files[0];
  const job = document.getElementById("jobTitleInput").value;

  const formData = new FormData();
  formData.append("name", name);
  formData.append("bio", bio);
  formData.append("resume", file);
  formData.append("job", job);

  await fetch("http://localhost:3000/apply-job", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${state.token}`
    },
    body: formData
  });

  // ✅ update state
  state.user.appliedJobs = [
    ...(state.user.appliedJobs || []),
    { job }
  ];

  localStorage.setItem('ss_user', JSON.stringify(state.user));

  closeModal('jobApplyModal');
  toast(`Applied for "${job}" 🚀`, 'success');
  loadJobs();
});
boot();
