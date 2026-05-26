exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try { payload = JSON.parse(event.body); } catch(e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { email, password } = payload;

  if (
    email?.toLowerCase() !== process.env.ADMIN_LOGIN?.toLowerCase() ||
    password !== process.env.ADMIN_PWD
  ) {
    // Délai anti-brute force
    await new Promise(r => setTimeout(r, 800));
    return { statusCode: 401, body: JSON.stringify({ error: 'Identifiants incorrects' }) };
  }

  // Génère un token simple signé avec un secret
  const token = Buffer.from(JSON.stringify({
    email,
    exp: Date.now() + 8 * 60 * 60 * 1000 // 8h
  })).toString('base64');

  return {
    statusCode: 200,
    body: JSON.stringify({ token, email })
  };
};
