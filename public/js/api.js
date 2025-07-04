export const API_BASE = '/api';
export async function gxFetch(path, opts={}) {
  const res = await fetch(`${API_BASE}${path}`, {credentials:'include', ...opts});
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
