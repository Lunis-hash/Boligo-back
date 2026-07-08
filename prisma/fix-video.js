
require('dotenv').config();

async function main() {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    console.log('Clé DAILY_API_KEY introuvable dans .env');
    return;
  }

  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        exp: Math.floor(Date.now() / 1000) + 24 * 3600, // expire dans 24h
        enable_chat: true,
      },
    }),
  });

  if (!response.ok) {
    console.error('Erreur API Daily:', await response.text());
    return;
  }

  const data = await response.json();
  console.log('✅ URL de la VRAIE salle :');
  console.log(data.url);
}

main();
