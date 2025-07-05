// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';            // clear any previous error

  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password', { username: username.value, password: password.value }]],
  });

  try {
    /* ---------- POST /api/session ---------- */
    const json = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });                                  // gxFetch throws if status not OK

    /* ---------- extract uid ---------- */
    const sessionId = json?.data?.uid || json?.uid;
    if (!sessionId) throw new Error('No uid in response');

    /* ---------- store cookie ---------- */
    // GoodX expects cookie name:  session
    document.cookie = `session=${sessionId}; Path=/; SameSite=Lax; Secure`;

    /* ---------- go to dashboard ---------- */
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
