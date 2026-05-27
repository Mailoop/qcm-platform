const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY non configurée' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) }; }

  const { prompt } = body;
  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Paramètre prompt manquant' }) };
  }

  const payload = JSON.stringify({
    model: 'claude-sonnet-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            // Retourner la réponse brute pour débugger
            resolve({
              statusCode: res.statusCode,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: json.error?.message || JSON.stringify(json) })
            });
          } else {
            resolve({
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: json.content?.[0]?.text || '' })
            });
          }
        } catch(e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: 'Parse error: ' + e.message + ' raw: ' + data.substring(0, 200) }) });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: 'Network error: ' + e.message }) });
    });

    req.write(payload);
    req.end();
  });
};
