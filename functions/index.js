// functions/index.js
const functions = require('firebase-functions/v2/https');
const fetch     = (...a) => import('node-fetch').then(m => m.default(...a));

exports.apiProxy = functions.onRequest({ cors: [true], maxInstances: 2 }, async (req, res) => {
  /* ------------------------------------------------ upstream URL */
  const upstream = 'https://dev_interview.qagoodx.co.za/api' +
                   req.originalUrl.replace(/^\/api/, '');

  /* -------------------------------------------- clone headers */
  const hdrs = { ...req.headers };
  delete hdrs.host;                              // Cloud-Run 400 guard

  /* ------------------------------------------------ cookies */
  if (hdrs.cookie) {
    // pull the uid out of __session=xxxx (set by Firebase Hosting)
    const m   = hdrs.cookie.match(/__session=([^;]+)/);
    const uid = m?.[1];

    if (uid && !/session_id=/.test(hdrs.cookie)) {
      // add the companion cookie exactly the way GX-Web wants it
      hdrs.cookie += `; session_id="\\\"${uid}\\\"_applicant_003"`;
    }
  }

  /* -------------------------------------------- forward to GX-Web */
  const apiRes = await fetch(upstream, {
    method  : req.method,
    headers : hdrs,
    body    : ['GET','HEAD'].includes(req.method) ? undefined : req.rawBody,
    redirect: 'manual'
  });

  /* -------------------------------------------- status */
  res.status(apiRes.status);

  /* ---- rewrite Set-Cookie back (collapse to __session only) ---- */
  const raw = apiRes.headers.raw()['set-cookie'] ?? [];
  const back = raw
    .filter(c => !/^session_uid=/i.test(c))       // drop mobile cookie
    .map(c =>
      c.replace(/^session=/i, '__session=')
       .replace(/;\s*domain=[^;]+/i, '')
       .replace(/;\s*samesite=[^;]+/i, '')
       .replace(/;\s*secure/i, '')
       .trim() + '; Secure; SameSite=None'
    );
  if (back.length) res.setHeader('set-cookie', back);

  /* -------------------------------------------- copy headers */
  apiRes.headers.forEach((v, k) => {
    const low = k.toLowerCase();
    if (!['set-cookie','content-encoding','content-length'].includes(low)) {
      res.setHeader(k, v);
    }
  });

  /* -------------------------------------------- CORS */
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  /* -------------------------------------------- body passthrough */
  apiRes.body.pipe(res);
});
