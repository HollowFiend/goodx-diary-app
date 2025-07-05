// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';

  /* ------- remove any stale cookies from previous runs ------- */
  ['session_uid', 'session'].forEach(
    c => document.cookie = `${c}=; Path=/; SameSite=None; Secure; Max-Age=0`
  );

  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password', { username: username.value, password: password.value }]],
  });

  try {
    /* 1 — POST /api/session
       gxFetch will forward Set-Cookie ↦ browser stores session_uid */
    const { status } = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (status !== 'OK') throw new Error('Login failed');

    /* 2 — jump to dashboard (cookie already set) */
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
