// public/js/auth.js
import { gxFetch } from './api.js';

loginForm.addEventListener('submit', async e => {
  e.preventDefault();

  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password', { username: username.value, password: password.value }]]
  });

  try {
    await gxFetch('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    location.href = 'dashboard.html';
  } catch (err) {
    error.textContent = 'Bad credentials';
  }
});
