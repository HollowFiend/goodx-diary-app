// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';

  /* wipe any leftovers */
  ['session', 'session_uid'].forEach(
    c => (document.cookie = `${c}=; Path=/; Max-Age=0; SameSite=None; Secure`)
  );

  try {
    /* 1 — login */
    const { data } = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model: { timeout: 259_200 },
        auth : [['password', { username: username.value, password: password.value }]],
      }),
    });

    const token = data?.uid;
    if (!token) throw new Error('No session token in response');

    /* 2 — GXWeb expects *both* cookies */
    const attrs = '; Path=/; SameSite=None; Secure';
    document.cookie = `session=${token}${attrs}`;
    document.cookie = `session_uid=${token}${attrs}`;

    /* 3 — dashboard */
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
