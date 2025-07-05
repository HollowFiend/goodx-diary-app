// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  error.textContent = '';

  try {
    /* 1 – login (proxy will pass Set-Cookie back) */
    const { data } = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model : { timeout: 259_200 },
        auth  : [['password', { username: username.value, password: password.value }]]
      })
    });

    /* 2 – manually stash token just once so the very first request works */
    const token = data?.uid;
    if (token) {
      document.cookie = `__session=${token}; Path=/; Max-Age=1209600; Secure; SameSite=None`;
    }

    /* 3 – dashboard */
    location.href = 'dashboard.html';

  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
