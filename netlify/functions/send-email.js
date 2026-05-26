exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let payload;
  try { payload = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const POSTMARK_KEY = process.env.POSTMARK_API_KEY;
  const FROM = 'arthur@infobesite.org';

  // ── MODE BULK : envoi aux participants (immédiat ou planifié) ──
  if (payload.mode === 'bulk') {
    const { recipients, teamName, teamId, shareUrl, sendAt } = payload;
    if (!recipients || !recipients.length) return { statusCode: 400, body: 'No recipients' };

    const memberHtml = (email) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#C7E7F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#C7E7F0;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="background:#015DAA;border-radius:12px 12px 0 0;padding:32px 36px">
  <div style="color:#C7E7F0;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px">OICN</div>
  <div style="color:#ffffff;font-size:19px;font-weight:600;line-height:1.3">Usages et perceptions<br>de l'IA générative</div>
</td></tr>
<tr><td style="background:#ffffff;padding:36px 36px 28px">
  <h2 style="font-size:20px;font-weight:600;color:#015DAA;margin:0 0 12px">Votre équipe vous invite à répondre</h2>
  <p style="font-size:14px;color:#444;margin:0 0 8px;line-height:1.7">
    <strong style="color:#012d52">${teamName}</strong> vous invite à participer au questionnaire sur les usages et perceptions de l'IA générative.
  </p>
  <p style="font-size:14px;color:#666;margin:0 0 28px;line-height:1.7">Cela prend environ 5 à 10 minutes. Vos réponses sont anonymes et agrégées.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
    <tr>
      <td align="center">
        <a href="${shareUrl}" style="background:#015DAA;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block">Répondre au questionnaire →</a>
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbfe;border:1px solid #80C1E8;border-radius:8px;margin-bottom:28px">
    <tr>
      <td style="padding:13px 16px;font-size:12px;color:#444;word-break:break-all;font-family:monospace">
        <a href="${shareUrl}" style="color:#015DAA;text-decoration:none">${shareUrl}</a>
      </td>
    </tr>
  </table>
  <p style="font-size:12px;color:#888;line-height:1.7;margin:0;padding-top:20px;border-top:1px solid #C7E7F0">
    Cet email vous a été envoyé par votre équipe via la plateforme OICN.<br>
    Identifiant d'équipe : <strong style="font-family:monospace">${teamId}</strong>
  </p>
</td></tr>
<tr><td style="background:#015DAA;border-radius:0 0 12px 12px;padding:18px 36px">
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

    // Postmark batch messages (max 500 par appel)
    const messages = recipients.map(to => ({
      From: FROM,
      To: to,
      Subject: `${teamName} vous invite à répondre au questionnaire OICN`,
      HtmlBody: memberHtml(to),
      TextBody: `${teamName} vous invite à répondre au questionnaire OICN sur les usages de l'IA générative.\n\nLien : ${shareUrl}\n\n— OICN`,
      MessageStream: 'outbound',
      ...(sendAt ? { ScheduledAt: sendAt } : {})
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 500) chunks.push(messages.slice(i, i + 500));

    let errors = 0;
    for (const chunk of chunks) {
      const r = await fetch('https://api.postmarkapp.com/email/batch', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Postmark-Server-Token': POSTMARK_KEY },
        body: JSON.stringify(chunk)
      });
      if (!r.ok) errors++;
      const body = await r.json();
      console.log('Batch result:', JSON.stringify(body).substring(0, 300));
    }

    if (errors) return { statusCode: 500, body: JSON.stringify({ ok: false, errors }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true, sent: recipients.length, scheduled: !!sendAt }) };
  }

  // ── MODE MANAGER : récap avec les deux liens ──
  const { to, teamName, teamId, shareUrl, resultsUrl } = payload;
  console.log('Sending to:', to, 'team:', teamName);

  console.log('Sending to:', to, 'team:', teamName);

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#C7E7F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#C7E7F0;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

<tr><td style="background:#015DAA;border-radius:12px 12px 0 0;padding:32px 36px">
  <img src="data:image/avif;base64,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" alt="Logo OICN" style="height:96px;width:auto;display:block;margin-bottom:12px">
  <div style="color:#C7E7F0;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px">OICN</div>
  <div style="color:#ffffff;font-size:19px;font-weight:600;line-height:1.3">Usages et perceptions<br>de l'IA générative</div>
  <div style="color:#80C1E8;font-size:12px;margin-top:6px">Observatoire de l'Infobésité et de la Collaboration Numérique</div>
</td></tr>

<tr><td style="background:#ffffff;padding:36px 36px 28px">
  <h2 style="font-size:20px;font-weight:600;color:#015DAA;margin:0 0 8px">Votre questionnaire est prêt !</h2>
  <p style="font-size:14px;color:#444;margin:0 0 28px;line-height:1.7">
    Le questionnaire est configuré pour votre équipe. Partagez le lien ci-dessous à vos collaborateurs.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#C7E7F0;border-radius:8px;margin-bottom:28px">
    <tr>
      <td style="padding:16px 20px;width:50%;border-right:1px solid #80C1E8">
        <div style="font-size:10px;color:#015DAA;text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:4px">Équipe</div>
        <div style="font-size:15px;font-weight:700;color:#015DAA">${teamName}</div>
      </td>
      <td style="padding:16px 20px;width:50%">
        <div style="font-size:10px;color:#015DAA;text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:4px">Identifiant</div>
        <div style="font-size:14px;font-weight:700;color:#015DAA;font-family:monospace">${teamId}</div>
      </td>
    </tr>
  </table>

  <div style="margin-bottom:16px">
    <div style="font-size:11px;font-weight:700;color:#015DAA;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">🔗 Lien à partager à votre équipe</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbfe;border:1px solid #80C1E8;border-radius:8px">
      <tr>
        <td style="padding:13px 16px;font-size:12px;color:#444;word-break:break-all;font-family:monospace">
          <a href="${shareUrl}" style="color:#015DAA;text-decoration:none">${shareUrl}</a>
        </td>
        <td style="padding:13px 16px;white-space:nowrap">
          <a href="${shareUrl}" style="background:#015DAA;color:#fff;font-size:12px;font-weight:600;padding:7px 16px;border-radius:6px;text-decoration:none;display:inline-block">Ouvrir →</a>
        </td>
      </tr>
    </table>
  </div>

  <div style="margin-bottom:32px">
    <div style="font-size:11px;font-weight:700;color:#015DAA;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">📊 Lien pour consulter les résultats</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbfe;border:1px solid #80C1E8;border-radius:8px">
      <tr>
        <td style="padding:13px 16px;font-size:12px;color:#444;word-break:break-all;font-family:monospace">
          <a href="${resultsUrl}" style="color:#015DAA;text-decoration:none">${resultsUrl}</a>
        </td>
        <td style="padding:13px 16px;white-space:nowrap">
          <a href="${resultsUrl}" style="background:#80C1E8;color:#015DAA;font-size:12px;font-weight:600;padding:7px 16px;border-radius:6px;text-decoration:none;display:inline-block">Voir →</a>
        </td>
      </tr>
    </table>
  </div>

  <p style="font-size:12px;color:#888;line-height:1.7;margin:0;padding-top:20px;border-top:1px solid #C7E7F0">
    Conservez cet email — ces liens sont uniques à votre équipe.<br>
    Les résultats seront disponibles dès que les premiers membres auront répondu.
  </p>
</td></tr>

<tr><td style="background:#015DAA;border-radius:0 0 12px 12px;padding:18px 36px">
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

  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY },
    body: JSON.stringify({
      From: 'arthur@infobesite.org',
      To: to,
      Subject: 'OICN — Votre questionnaire IA est pret pour ' + teamName,
      HtmlBody: html,
      TextBody: 'OICN — Votre questionnaire IA est pret\n\nEquipe : ' + teamName + '\nIdentifiant : ' + teamId + '\n\nLien equipe :\n' + shareUrl + '\n\nLien resultats :\n' + resultsUrl + '\n\n— OICN\nwww.infobesite.org',
      MessageStream: 'outbound'
    })
  });

  const responseBody = await response.text();
  console.log('Postmark status:', response.status);
  console.log('Postmark response:', responseBody);
  if (!response.ok) return { statusCode: 500, body: 'Postmark error ' + response.status + ': ' + responseBody };
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
