// public/js/auth.js
import { gxFetch } from './api.js';

/* ─── DOM refs ────────────────────────────── */
// grab the form and its inputs so we can read values and show errors
const loginForm = document.getElementById('loginForm');
const username  = document.getElementById('username');
const password  = document.getElementById('password');
const error     = document.getElementById('error');

/* ─── Login flow ──────────────────────────── */
// when the user clicks “Log in”, run this async function
loginForm.addEventListener('submit', async e => {
  e.preventDefault();       // stop the browser from reloading the page
  error.textContent = '';   // clear any old error message

  try {
    /* 1 – call POST /session with username/password
          gxFetch will let the server set a cookie via our proxy */
    const { data } = await gxFetch('/session', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model: { timeout: 259_200 },        // keep session alive for 3 days
        auth : [
          ['password', {
            username: username.value,       // what user typed
            password: password.value        // what user typed
          }]
        ]
      })
    });

    /* 2 – stash the session token in a cookie
          so the very first request after login will have it */
    const token = data?.uid;
    if (token) {
      // __session cookie, valid for 14 days, Secure & SameSite=None for cross-site
      document.cookie = `__session=${token}; Path=/; Max-Age=1209600; Secure; SameSite=None`;
    }

    /* 3 – navigate to the dashboard page */
    location.href = 'dashboard.html';

  } catch (err) {
    console.error(err);           // log details for debugging
    error.textContent = 'Login failed';  // show a simple error to the user
  }
});
