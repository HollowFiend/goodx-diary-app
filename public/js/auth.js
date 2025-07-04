import { API_BASE } from './api.js';

loginForm.addEventListener('submit', async e => {
  e.preventDefault();

  const body = JSON.stringify({
    model: { timeout: 259_200 },
    auth : [['password', { username: username.value, password: password.value }]]
  });

  const res = await fetch(`${API_BASE}/api/session`, {
    method      : 'POST',
    headers     : { 'Content-Type': 'application/json' },
    credentials : 'include',
    body
  });

  if (!res.ok) {
    error.textContent = 'Bad credentials';
    return;
  }

  location.href = 'dashboard.html';
});
