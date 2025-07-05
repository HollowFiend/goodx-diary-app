// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  error.textContent = '';

  /* ------ wipe previous cookies (must match attributes) ------ */
  ['session_uid','session'].forEach(
    c => document.cookie = `${c}=; Path=/; SameSite=None; Secure; Max-Age=0`
  );

  /* ------ login ------ */
  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password',{ username: username.value, password: password.value }]]
  });

  try {
    const { data } = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type':'application/json' },
      body
    });

    const uid = data?.uid;
    if (!uid) throw new Error('No uid in response');

    /* ------ store required cookie ------ */
    document.cookie = `session=${uid}; Path=/; SameSite=None; Secure`;

    /* ------ go to dashboard ------ */
    location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    error.textContent = 'Login failed';
  }
});
