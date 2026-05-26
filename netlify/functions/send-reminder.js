exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let payload;
  try { payload = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { invitations, teamId, teamName, surveySlug } = payload;
  if (!invitations?.length) return { statusCode: 400, body: 'No invitations' };

  const POSTMARK_KEY = process.env.POSTMARK_API_KEY;
  const FROM = 'arthur@infobesite.org';
  const SITE_URL = 'https://ia.infobesite.org';

  const reminderHtml = (shareUrl, email) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#C7E7F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#C7E7F0;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="background:#015DAA;border-radius:12px 12px 0 0;padding:28px 36px">
  <div style="color:#C7E7F0;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">OICN — Rappel</div>
  <div style="color:#ffffff;font-size:18px;font-weight:600;line-height:1.3">Usages et perceptions de l'IA générative</div>
</td></tr>
<tr><td style="background:#ffffff;padding:36px 36px 28px">
  <h2 style="font-size:18px;font-weight:600;color:#015DAA;margin:0 0 12px">Un petit rappel 👋</h2>
  <p style="font-size:14px;color:#444;margin:0 0 8px;line-height:1.7">
    Vous n'avez pas encore répondu au questionnaire de <strong style="color:#012d52">${teamName}</strong>.
  </p>
  <p style="font-size:14px;color:#666;margin:0 0 28px;line-height:1.7">
    Cela prend 5 à 10 minutes. Vos réponses sont anonymes et contribuent à mieux comprendre les pratiques de votre équipe.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
    <tr><td align="center">
      <a href="${shareUrl}" style="background:#015DAA;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block">Répondre maintenant →</a>
    </td></tr>
  </table>
  <p style="font-size:12px;color:#888;line-height:1.7;margin:0;padding-top:20px;border-top:1px solid #C7E7F0">
    Ce lien est personnel — il vous est réservé.<br>Si vous avez déjà répondu, ignorez ce message.
  </p>
</td></tr>
<tr><td style="background:#015DAA;border-radius:0 0 12px 12px;padding:16px 36px">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="font-size:12px;color:#80C1E8">L'équipe OICN</td>
      <td align="right"><a href="https://www.infobesite.org" style="font-size:12px;color:#C7E7F0;text-decoration:none">www.infobesite.org</a></td>
    </tr>
  </table>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const slugParam = surveySlug ? '&q=' + surveySlug : '';
  const messages = invitations.map(inv => {
    const shareUrl = `${SITE_URL}?team=${teamId}&name=${encodeURIComponent(teamName)}${slugParam}&token=${inv.token}`;
    return {
      From: FROM,
      To: inv.email,
      Subject: `Rappel — ${teamName} attend votre réponse`,
      HtmlBody: reminderHtml(shareUrl, inv.email),
      TextBody: `Rappel : ${teamName} vous invite à répondre au questionnaire OICN.\n\nLien : ${shareUrl}\n\n— OICN`,
      MessageStream: 'outbound'
    };
  });

  // Batch Postmark
  const chunks = [];
  for (let i = 0; i < messages.length; i += 500) chunks.push(messages.slice(i, i + 500));
  for (const chunk of chunks) {
    await fetch('https://api.postmarkapp.com/email/batch', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Postmark-Server-Token': POSTMARK_KEY },
      body: JSON.stringify(chunk)
    });
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, sent: invitations.length }) };
};
