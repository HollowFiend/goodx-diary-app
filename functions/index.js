const functions = require('firebase-functions/v2/https');
const fetch     = (...a) => import('node-fetch').then(m => m.default(...a));

exports.apiProxy = functions.onRequest(
  { cors: [true], maxInstances: 2 },
  async (req, res) => {
    try {
      // full upstream URL (keep one /api)
      const upstream =
        'https://dev_interview.qagoodx.co.za/api' +
        req.originalUrl.replace(/^\/api/, '');

      const hdrs = { ...req.headers };
      delete hdrs.host;                     // avoid 400 from upstream

      const apiRes = await fetch(upstream, {
        method  : req.method,
        headers : hdrs,
        body    : ['GET', 'HEAD'].includes(req.method) ? undefined : req.rawBody,
        redirect: 'manual'                 // no compress:false → node-fetch auto-unzips
      });

      res.status(apiRes.status);

      // forward headers except those referring to gzip
      apiRes.headers.forEach((v, k) => {
        const h = k.toLowerCase();
        if (h !== 'content-encoding' && h !== 'content-length') {
          res.setHeader(k, v);
        }
      });

      // add CORS
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // stream body
      apiRes.body.pipe(res);
    } catch (err) {
      console.error(err);
      res.status(502).send('Proxy error');
    }
  }
);
