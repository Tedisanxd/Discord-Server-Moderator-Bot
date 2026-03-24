/* ─────────────────────────────────────────────
   THEME — apply before first paint
───────────────────────────────────────────── */
(function () {
  try {
    const t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();

/* ─────────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────────── */
const Progress = (() => {
  let bar, timer, val = 0, visible = false;

  function getBar() {
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'nprogress';
      bar.innerHTML = '<div class="np-bar"></div><div class="np-spinner"></div>';
      document.body.appendChild(bar);
    }
    return bar;
  }

  function set(n) {
    val = Math.min(Math.max(n, 0.08), 1);
    const b = getBar().querySelector('.np-bar');
    b.style.transform = `translateX(${(-1 + val) * 100}%)`;
    b.style.opacity = '1';
  }

  function start() {
    if (visible) return;
    visible = true;
    val = 0;
    getBar().classList.add('active');
    set(0.15);
    timer = setInterval(() => {
      if (val < 0.75) set(val + 0.04);
      else if (val < 0.9) set(val + 0.01);
    }, 120);
  }

  function done() {
    clearInterval(timer);
    set(1);
    setTimeout(() => {
      if (bar) bar.classList.remove('active');
      setTimeout(() => { val = 0; visible = false; }, 300);
    }, 200);
  }

  return { start, done };
})();

/* ─────────────────────────────────────────────
   PAGE TRANSITIONS
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Finish progress bar on load
  Progress.done();

  // Intercept link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (
      !href || href.startsWith('#') || href.startsWith('javascript') ||
      href.startsWith('http') || href.startsWith('mailto') ||
      link.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey
    ) return;

    e.preventDefault();
    Progress.start();

    // Fade out content
    const wrapper = document.querySelector('.page-wrapper');
    if (wrapper) {
      wrapper.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      wrapper.style.opacity = '0';
      wrapper.style.transform = 'translateY(-6px)';
    }

    setTimeout(() => { window.location.href = href; }, 190);
  });

  // Fade in on load
  const wrapper = document.querySelector('.page-wrapper');
  if (wrapper) {
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapper.style.transition = 'opacity 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.4,0,0.2,1)';
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'translateY(0)';
      });
    });
  }
});

// Start bar immediately on script load (before DOM)
Progress.start();

/* ─────────────────────────────────────────────
   THEME SWITCHER
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('theme') || 'dark';

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    document.querySelectorAll('.theme-option').forEach(el => {
      el.classList.toggle('current', el.dataset.theme === t);
    });
  }

  applyTheme(saved);

  const btn = document.getElementById('themeToggle');
  const dropdown = document.getElementById('themeDropdown');

  if (btn && dropdown) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
    dropdown.addEventListener('click', (e) => {
      const opt = e.target.closest('.theme-option');
      if (opt) { applyTheme(opt.dataset.theme); dropdown.classList.remove('open'); }
    });
  }
});

/* ─────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────── */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span style="font-size:15px;font-weight:700">${icons[type] || icons.info}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 260);
  }, 3000);
}

/* ─────────────────────────────────────────────
   DASHBOARD API HELPERS
───────────────────────────────────────────── */
async function toggle(guildId, type, key, value) {
  const res = await fetch(`/api/${guildId}/${type}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: value ? 1 : 0 })
  });
  showToast(res.ok ? 'Setting saved.' : 'Failed to save.', res.ok ? 'success' : 'error');
}

async function toggleLinkFilter(guildId, enabled) {
  const res = await fetch(`/api/${guildId}/linkfilter`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: enabled ? 1 : 0 })
  });
  showToast(res.ok ? 'Link filter updated.' : 'Failed.', res.ok ? 'success' : 'error');
}

async function toggleInviteFilter(guildId, enabled) {
  const res = await fetch(`/api/${guildId}/invitefilter`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: enabled ? 1 : 0 })
  });
  showToast(res.ok ? 'Invite filter updated.' : 'Failed.', res.ok ? 'success' : 'error');
}

async function saveMessages(guildId) {
  await fetch(`/api/${guildId}/welcome`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'welcome_message', value: document.getElementById('welcome-msg').value })
  });
  await fetch(`/api/${guildId}/welcome`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'leave_message', value: document.getElementById('leave-msg').value })
  });
  showToast('Messages saved!');
}

async function saveThreshold(guildId) {
  await fetch(`/api/${guildId}/automod`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'automod_warn_threshold', value: document.getElementById('warn-threshold').value })
  });
  await fetch(`/api/${guildId}/automod`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'automod_warn_punishment', value: document.getElementById('warn-punishment').value })
  });
  showToast('Threshold saved!');
}

async function voteOnSuggestion(id, btn) {
  const res = await fetch(`/suggestions/${id}/vote`, { method: 'POST' });
  const data = await res.json();
  if (res.ok) {
    btn.classList.toggle('voted', data.voted);
    btn.querySelector('.vote-count').textContent = data.votes;
  } else {
    showToast(data.error || 'Login to vote.', 'info');
  }
}
