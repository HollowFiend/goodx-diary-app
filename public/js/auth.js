// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  error.textContent = '';

  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password', { username: username.value, password: password.value }]],
  });

  try {
    /* 1 – login */
    const { data } = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const uid = data?.uid;
    if (!uid) throw new Error('No uid in response');

    /* 2 – clear any old cookies */
    document.cookie = 'session=; Max-Age=0; Path=/';
    document.cookie = 'session_uid=; Max-Age=0; Path=/';

    /* 3 – set the required cookie */
    // SameSite=Lax so it’s sent to /api calls on same origin
    document.cookie = `session=${uid}; Path=/; SameSite=Lax; Secure`;

    /* 4 – go to dashboard */
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
