// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';

  /* -------- remove any stale cookies ---------- */
  for (const c of ['session', 'session_uid']) {
    document.cookie = `${c}=; Path=/; SameSite=None; Secure; Max-Age=0`;
  }

  /* -------- call /api/session ---------- */
  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password', { username: username.value, password: password.value }]]
  });

  try {
    const { data } = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    const uid = data?.uid;
    if (!uid) throw new Error('No uid in response');

    /* -------- store BOTH cookies ---------- */
    const attrs = '; Path=/; SameSite=None; Secure';
    document.cookie = `session=${uid}${attrs}`;
    document.cookie = `session_uid=${uid}${attrs}`;

    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
