const functions = require("firebase-functions/v2/https");
const fetch     = (...a) => import('node-fetch').then(m => m.default(...a));

exports.apiProxy = functions.onRequest(
  { cors: [true], maxInstances: 2 },
  async (req, res) => {
    try {
      const upstream =
        'https://dev_interview.qagoodx.co.za/api' +   // keep /api
        req.originalUrl.replace(/^\/api/, '');        // remove first /api only

      const hdrs = { ...req.headers }; delete hdrs.host;

      const apiRes = await fetch(upstream, {
        method : req.method,
        headers: hdrs,
        body   : ["GET","HEAD"].includes(req.method) ? undefined : req.rawBody,
        redirect: "manual"
      });

      res.status(apiRes.status);
      apiRes.headers.forEach((v, k) => res.setHeader(k, v));
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      apiRes.body.pipe(res);
    } catch (err) {
      console.error(err);
      res.status(502).send('Proxy error');
    }
});
