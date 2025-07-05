const functions = require('firebase-functions/v2/https');
const fetch     = (...a) => import('node-fetch').then(m => m.default(...a));

exports.apiProxy = functions.onRequest(
  { cors: [true], maxInstances: 2 },
  async (req, res) => {
    try {
      /* ───────── build upstream URL ───────── */
      const upstream =
        'https://dev_interview.qagoodx.co.za/api' +
        req.originalUrl.replace(/^\/api/, '');

      /* ───────── copy headers, strip host ─── */
      const hdrs = { ...req.headers };
      delete hdrs.host;

      /* ★★★ strip the session_uid cookie ★★★ */
      if (hdrs.cookie) {
        hdrs.cookie = hdrs.cookie
          .split(';')
          .map(s => s.trim())
          .filter(c => !c.startsWith('session_uid='))
          .join('; ');
        if (!hdrs.cookie) delete hdrs.cookie;
      }

      /* ───────── upstream fetch ───────────── */
      const apiRes = await fetch(upstream, {
        method  : req.method,
        headers : hdrs,
        body    : ['GET','HEAD'].includes(req.method) ? undefined : req.rawBody,
        redirect: 'manual'
      });

      /* ───────── forward status & headers ─── */
      res.status(apiRes.status);

      // forward Set-Cookie from upstream (but we *don’t* add session_uid ourselves)
      const rawCookies = apiRes.headers.raw()['set-cookie'];
      if (rawCookies) res.setHeader('set-cookie', rawCookies);

      apiRes.headers.forEach((v, k) => {
        const h = k.toLowerCase();
        if (h !== 'set-cookie' && h !== 'content-encoding' && h !== 'content-length') {
          res.setHeader(k, v);
        }
      });

      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      /* ───────── stream body ──────────────── */
      apiRes.body.pipe(res);

    } catch (err) {
      console.error(err);
      res.status(502).send('Proxy error');
    }
  }
);
