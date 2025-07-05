// functions/index.js
const functions = require('firebase-functions/v2/https');
const https     = require('node:https');           // ← NEW
const fetch     = (...a) => import('node-fetch').then(m => m.default(...a));

// Keep a single agent so Cloud Functions won’t strip Cookie / Auth headers
const keepCookieAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

exports.apiProxy = functions.onRequest(
  { cors: [true], maxInstances: 2 },
  async (req, res) => {
    try {
      /* -------- build upstream URL -------- */
      const upstream =
        'https://dev_interview.qagoodx.co.za/api' +
        req.originalUrl.replace(/^\/api/, '');

      /* -------- minimal header set --------
         – host must NOT be forwarded
         – cookie is the whole point here
      -------------------------------------- */
      const outHeaders = {
        cookie        : req.headers.cookie || '',
        'content-type': req.headers['content-type'] || '',
      };

      /* -------- call GoodX -------- */
      const apiRes = await fetch(upstream, {
        method  : req.method,
        headers : outHeaders,
        body    : ['GET','HEAD'].includes(req.method) ? undefined : req.rawBody,
        redirect: 'manual',
        agent   : keepCookieAgent          // ← keeps Cookie intact
      });

      /* -------- pipe status & headers back -------- */
      res.status(apiRes.status);

      // copy Set-Cookie(s) if GoodX refreshes the session
      const setCookies = apiRes.headers.raw()['set-cookie'];
      if (setCookies) res.setHeader('set-cookie', setCookies);

      // copy everything else except gzip metadata we stripped
      apiRes.headers.forEach((v, k) => {
        const h = k.toLowerCase();
        if (!['set-cookie','content-encoding','content-length'].includes(h)) {
          res.setHeader(k, v);
        }
      });

      // allow browser to read cookies
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      /* -------- stream body -------- */
      apiRes.body.pipe(res);

    } catch (err) {
      console.error(err);
      res.status(502).send('Proxy error');
    }
  }
);
