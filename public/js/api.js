// public/js/api.js

// the base path for all API requests
export const API_BASE = '/api';

/**
 * gxFetch: a wrapper around fetch that:
 * 1) Prepends API_BASE to your path
 * 2) Includes credentials (cookies) automatically
 * 3) Throws an Error if the response isn't OK
 * 4) Parses and returns JSON
 *
 * @param {string} path - the API endpoint (e.g. '/session' or 'booking')
 * @param {object} opts - any fetch options (method, headers, body, etc)
 */
export async function gxFetch(path, opts = {}) {
  // 1) Build the full URL:
  //    If path starts with '/', join directly: '/api' + '/session' -> '/api/session'
  //    Otherwise insert a '/' between: '/api' + 'session' -> '/api/session'
  const url = path.startsWith('/')
    ? `${API_BASE}${path}`
    : `${API_BASE}/${path}`;

  // 2) Call fetch with include-credentials so cookies work
  const res = await fetch(url, { credentials: 'include', ...opts });

  // 3) If the HTTP status isn't in the 200–299 range, throw an Error
  if (!res.ok) {
    // await res.text() to get any error message the server sent
    throw new Error(await res.text());
  }

  // 4) Parse and return the JSON body
  return res.json();
}
