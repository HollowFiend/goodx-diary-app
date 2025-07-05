const functions = require('firebase-functions/v2/https');
const fetch     = (...a) => import('node-fetch').then(m => m.default(...a));

exports.apiProxy = functions.onRequest(
  { cors: [true], maxInstances: 2 },
  async (req, res) => {
    try {
      // keep one /api in the upstream path
      const upstream =
        'https://dev_interview.qagoodx.co.za/api' +
        req.originalUrl.replace(/^\/api/, '');

      const hdrs = { ...req.headers };
      delete hdrs.host;

      const apiRes = await fetch(upstream, {
        method  : req.method,
        headers : hdrs,
        body    : ['GET','HEAD'].includes(req.method) ? undefined : req.rawBody,
        redirect: 'manual'
      });

      /* ---------- forward status & headers ---------- */
      res.status(apiRes.status);

      // 1. copy *all* Set-Cookie headers
      const rawCookies = apiRes.headers.raw()['set-cookie'];
      if (rawCookies) res.setHeader('set-cookie', rawCookies);

      // 2. copy everything else, except gzip markers we stripped before
      apiRes.headers.forEach((v, k) => {
        const h = k.toLowerCase();
        if (h !== 'set-cookie' && h !== 'content-encoding' && h !== 'content-length') {
          res.setHeader(k, v);
        }
      });

      // 3. add CORS for browser
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      /* ---------- stream body ---------- */
      apiRes.body.pipe(res);

    } catch (err) {
      console.error(err);
      res.status(502).send('Proxy error');
    }
  }
);
