// public/js/auth.js
import { gxRaw } from './api.js';   // gxRaw is the “no-parse” helper in api.js

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';           // clear any old error

  /* ---------- build body ---------- */
  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password', { username: username.value, password: password.value }]],
  });

  try {
    /* ---------- POST /api/session ---------- */
    const res = await gxRaw('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) throw new Error('Bad credentials');

    /* ---------- read uid from JSON ---------- */
    const json      = await res.json();              // { data: { uid: "…" }, … }
    const sessionId = json?.data?.uid || json?.uid;  // fallback
    if (!sessionId) throw new Error('No uid in response');

    /* ---------- store cookie the way GoodX expects ---------- */
    document.cookie = `session=${sessionId}; Path=/; SameSite=Lax; Secure`;

    /* ---------- go to dashboard ---------- */
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
