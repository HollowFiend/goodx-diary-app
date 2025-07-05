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
    /* 1. POST /api/session */
    const json = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    /* 2. Extract the UID the API returns */
    const uid = json?.data?.uid || json?.uid;
    if (!uid) throw new Error('No uid in response');

    /* 3. Remove any old cookie named "session" (just in case) */
    document.cookie = 'session=; Max-Age=0; Path=/';

    /* 4. Save UID exactly as GXWeb expects */
    document.cookie = `session_uid=${uid}; Path=/; SameSite=Lax; Secure`;

    /* 5. Go to dashboard */
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
