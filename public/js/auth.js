// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';

  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password', { username: username.value, password: password.value }]],
  });

  try {
    /* 1 – POST /api/session */
    const { data } = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const uid = data?.uid;
    if (!uid) throw new Error('No uid in response');

    /* 2 – remove any old cookies (match Path + SameSite + Secure) */
    ['session_uid', 'session'].forEach(
      c => document.cookie = `${c}=; Path=/; SameSite=None; Secure; Max-Age=0`
    );

    /* 3 – save the required cookie */
    // SameSite=None is safest because our proxy and frontend share the origin.
    document.cookie = `session=${uid}; Path=/; SameSite=None; Secure`;

    /* 4 – into the dashboard */
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
