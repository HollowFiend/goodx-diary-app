// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';

  try {
    /* 1 — login (server sends the two Set-Cookie headers) */
    await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model: { timeout: 259_200 },
        auth : [['password', { username: username.value, password: password.value }]]
      })
      /*  credentials:"include" lives inside gxFetch  */
    });

    /* 2 — cookies are now in the jar → go to dashboard */
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
