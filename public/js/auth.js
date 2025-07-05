// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async e => {
  e.preventDefault();

  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password', { username: username.value, password: password.value }]]
  });

  try {
    // 1. POST /api/session
    const resp = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    // 2. GoodX returns { data: { uid: "<session_uuid>" }, ... }
    const sessionUid = resp?.data?.uid;
    if (!sessionUid) throw new Error('No session_uid in response');

    // 3. Store it as a cookie on our origin
    // Path=/  -> sent to every page
    // SameSite=None; Secure -> works on HTTPS
    document.cookie = `session_uid=${sessionUid}; Path=/; SameSite=None; Secure`;

    // 4. Go to dashboard
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Bad credentials';
  }
});
