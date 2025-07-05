// public/js/api.js
export const API_BASE = '/api';

export async function gxFetch (path, opts = {}) {
  // make sure the pieces join nicely:  '/api' + '/session'  ➜  '/api/session'
  const url = path.startsWith('/') ? `${API_BASE}${path}` 
                                   : `${API_BASE}/${path}`;

  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
