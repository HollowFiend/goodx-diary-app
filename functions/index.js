const functions = require('firebase-functions/v2/https');
const fetch     = (...a) => import('node-fetch').then(m => m.default(...a));

exports.apiProxy = functions.onRequest(
  { cors: [true], maxInstances: 2 },
  async (req, res) => {
    try {
      // build full upstream URL
      const upstream =
        'https://dev_interview.qagoodx.co.za/api' +
        req.originalUrl.replace(/^\/api/, '');  // remove first /api only

      const hdrs = { ...req.headers };
      delete hdrs.host;                         // avoid 400 from upstream

      const apiRes = await fetch(upstream, {
        method   : req.method,
        headers  : hdrs,
        body     : ['GET', 'HEAD'].includes(req.method) ? undefined : req.rawBody,
        redirect : 'manual',
        compress : false                         // keep body as-is
      });

      res.status(apiRes.status);

      // copy headers but skip gzip info so the browser won’t double-decode
      apiRes.headers.forEach((v, k) => {
        const h = k.toLowerCase();
        if (h !== 'content-encoding' && h !== 'content-length') {
          res.setHeader(k, v);
        }
      });

      // add CORS
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      apiRes.body.pipe(res);
    } catch (err) {
      console.error(err);
      res.status(502).send('Proxy error');
    }
  }
);
