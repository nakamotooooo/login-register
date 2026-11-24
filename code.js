(() => {
  const root = document.documentElement;
  const card = document.getElementById('card');
  const toggle = document.getElementById('themeToggle');
  const faces = { login: document.getElementById('loginFace'), register: document.getElementById('registerFace') };

  /* ---------- Theme (dark by default, remembered) ---------- */
  const safe = (fn) => { try { return fn(); } catch { return null; } };
  const setTheme = (t) => {
    root.dataset.theme = t;
    toggle.setAttribute('aria-label', `Switch to ${t === 'dark' ? 'light' : 'dark'} theme`);
    safe(() => localStorage.setItem('theme', t));
  };
  setTheme(safe(() => localStorage.getItem('theme')) === 'light' ? 'light' : 'dark');
  toggle.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  /* ---------- Flip between login and register ---------- */
  const show = (which) => {
    card.classList.toggle('is-register', which === 'register');
    faces.login.inert = which === 'register';
    faces.register.inert = which === 'login';
    setTimeout(() => faces[which].querySelector('input').focus(), 450);
  };
  document.querySelectorAll('[data-flip]').forEach((b) =>
    b.addEventListener('click', () => show(b.dataset.flip)));

  /* ---------- Show / hide password ---------- */
  document.querySelectorAll('.eye').forEach((btn) => btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    btn.textContent = reveal ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
  }));

  /* ---------- Helpers ---------- */
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const setError = (input, msg) => {
    const field = input.closest('.field');
    field.classList.toggle('invalid', !!msg);
    field.querySelector('.err').textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const say = (form, msg, type) => {
    const s = form.querySelector('.status');
    s.textContent = msg; s.className = `status ${type || ''}`;
  };
  const shake = (form) => { form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); };
  const strength = (p) =>
    Math.min(4, (p.length >= 8) + (/[a-z]/.test(p) && /[A-Z]/.test(p)) + /\d/.test(p) + /[^A-Za-z0-9]/.test(p));
  const hash = async (text) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  /* Demo-only storage: a static GitHub Pages site has no server, so accounts live in this browser. */
  const getUsers = () => safe(() => JSON.parse(localStorage.getItem('users'))) || {};
  const saveUsers = (u) => safe(() => localStorage.setItem('users', JSON.stringify(u)));

  /* ---------- Register ---------- */
  const regForm = document.getElementById('registerForm');
  const [name, regEmail, regPass, regConfirm] = ['regName', 'regEmail', 'regPass', 'regConfirm'].map((id) => document.getElementById(id));
  const meter = regForm.querySelector('.meter');

  regPass.addEventListener('input', () => { meter.dataset.level = regPass.value ? strength(regPass.value) : 0; });

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = [
      setError(name, name.value.trim().length < 2 ? 'Enter your full name.' : ''),
      setError(regEmail, emailOk(regEmail.value.trim()) ? '' : 'Enter a valid email address.'),
      setError(regPass, regPass.value.length < 8 ? 'Use at least 8 characters.' : ''),
      setError(regConfirm, regConfirm.value !== regPass.value ? 'Passwords do not match.' : ''),
    ].every(Boolean);
    if (!ok) { say(regForm, 'Fix the highlighted fields and try again.', 'bad'); return shake(regForm); }

    const users = getUsers();
    const key = regEmail.value.trim().toLowerCase();
    if (users[key]) { setError(regEmail, 'An account with this email already exists.'); return shake(regForm); }

    users[key] = { name: name.value.trim(), pass: await hash(regPass.value) };
    saveUsers(users);
    say(regForm, `Account created. Welcome, ${name.value.trim().split(' ')[0]}!`, 'ok');
    regForm.reset(); meter.dataset.level = 0;
    setTimeout(() => { say(regForm, ''); show('login'); }, 1400);
  });

  /* ---------- Login ---------- */
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPass = document.getElementById('loginPass');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = [
      setError(loginEmail, emailOk(loginEmail.value.trim()) ? '' : 'Enter a valid email address.'),
      setError(loginPass, loginPass.value ? '' : 'Enter your password.'),
    ].every(Boolean);
    if (!ok) return shake(loginForm);

    const btn = loginForm.querySelector('.btn');
    btn.disabled = true; say(loginForm, 'Checking your details…');
    const user = getUsers()[loginEmail.value.trim().toLowerCase()];
    const match = user && user.pass === await hash(loginPass.value);
    btn.disabled = false;

    if (!match) { say(loginForm, 'Email or password is incorrect.', 'bad'); return shake(loginForm); }
    say(loginForm, `Logged in. Good to see you, ${user.name.split(' ')[0]}!`, 'ok');
    loginForm.reset();
  });

  /* Clear a field's error as soon as the person edits it */
  document.querySelectorAll('.field input').forEach((i) =>
    i.addEventListener('input', () => i.closest('.field').classList.contains('invalid') && setError(i, '')));
})();