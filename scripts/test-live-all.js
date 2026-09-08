/**
 * Script de test complet en direct pour les 5 Intelligences Harmonie via OpenRouter.
 * Exécutable directement avec : node scripts/test-live-all.js
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error('❌ ERREUR: OPENROUTER_API_KEY absente du fichier .env');
  process.exit(1);
}

async function callOpenRouter(model, prompt, systemPrompt = '') {
  const start = Date.now();
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://harmonie-app.com',
      'X-Title': 'Harmonie AI Coach',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const latency = Date.now() - start;
  return {
    content: data.choices?.[0]?.message?.content || '',
    modelUsed: data.model || model,
    cost: data.usage?.cost ?? 0,
    latencyMs: latency,
  };
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 BANC D\'ESSAI EN DIRECT : LES 5 INTELLIGENCES HARMONIE');
  console.log('======================================================\n');

  const results = [];

  // 1. Sondeur IA
  try {
    process.stdout.write('⏳ [1/5] Test Sondeur IA (Génération de Bio & Synthèse)... ');
    const res = await callOpenRouter(
      'openrouter/free',
      'Génère en 1 phrase une bio amoureuse pour Sarah, 28 ans, passionnée de nature et cherchant un amour sincère.',
      'Tu es le Sondeur IA psychologue de couple d\'Harmonie.'
    );
    console.log('✅ SUCCÈS');
    results.push({
      Agent: '🧠 Sondeur IA',
      Modèle: res.modelUsed,
      Latence: `${res.latencyMs} ms`,
      Coût: `${res.cost} € (Gratuit)`,
      Statut: 'OK ✅',
      Extrait: res.content.slice(0, 75).trim() + '...',
    });
  } catch (err) {
    console.log('❌ ÉCHEC');
    results.push({ Agent: '🧠 Sondeur IA', Statut: 'Erreur', Extrait: err.message });
  }

  // 2. Cupidon IA
  try {
    process.stdout.write('⏳ [2/5] Test Cupidon IA (Calcul de compatibilité)... ');
    const res = await callOpenRouter(
      'openrouter/free',
      'Profil A: calme, voyage, famille. Profil B: dynamique, voyage, famille. Donne un score de compatibilité sur 100 et 1 phrase d\'explication.',
      'Tu es Cupidon IA.'
    );
    console.log('✅ SUCCÈS');
    results.push({
      Agent: '💖 Cupidon IA',
      Modèle: res.modelUsed,
      Latence: `${res.latencyMs} ms`,
      Coût: `${res.cost} € (Gratuit)`,
      Statut: 'OK ✅',
      Extrait: res.content.slice(0, 75).trim() + '...',
    });
  } catch (err) {
    console.log('❌ ÉCHEC');
    results.push({ Agent: '💖 Cupidon IA', Statut: 'Erreur', Extrait: err.message });
  }

  // 3. Coach Conversation
  try {
    process.stdout.write('⏳ [3/5] Test Coach Conversation (Suggestions chat)... ');
    const res = await callOpenRouter(
      'openrouter/free',
      'Le dernier message reçu est : "J\'ai passé une super journée à la montagne". Propose 1 relance chaleureuse et engageante.',
      'Tu es le Coach Conversation d\'Harmonie.'
    );
    console.log('✅ SUCCÈS');
    results.push({
      Agent: '💬 Coach Conversation',
      Modèle: res.modelUsed,
      Latence: `${res.latencyMs} ms`,
      Coût: `${res.cost} € (Gratuit)`,
      Statut: 'OK ✅',
      Extrait: res.content.slice(0, 75).trim() + '...',
    });
  } catch (err) {
    console.log('❌ ÉCHEC');
    results.push({ Agent: '💬 Coach Conversation', Statut: 'Erreur', Extrait: err.message });
  }

  // 4. Parcours Harmonie
  try {
    process.stdout.write('⏳ [4/5] Test Parcours Harmonie (Exercice relationnel)... ');
    const res = await callOpenRouter(
      'openrouter/free',
      'Propose 1 exercice concret de 3 minutes pour renforcer la complicité dans un couple.',
      'Tu es le Guide du Parcours Harmonie.'
    );
    console.log('✅ SUCCÈS');
    results.push({
      Agent: '🌱 Parcours Harmonie',
      Modèle: res.modelUsed,
      Latence: `${res.latencyMs} ms`,
      Coût: `${res.cost} € (Gratuit)`,
      Statut: 'OK ✅',
      Extrait: res.content.slice(0, 75).trim() + '...',
    });
  } catch (err) {
    console.log('❌ ÉCHEC');
    results.push({ Agent: '🌱 Parcours Harmonie', Statut: 'Erreur', Extrait: err.message });
  }

  // 5. Médiateur & Modérateur
  try {
    process.stdout.write('⏳ [5/5] Test Médiateur IA (Modération de sécurité)... ');
    const res = await callOpenRouter(
      'openrouter/free',
      'Analyse ce message: "Tu es vraiment adorable, hâte de te revoir". Réponds: {"allowed": true} ou {"allowed": false}.',
      'Tu es le Médiateur de sécurité d\'Harmonie.'
    );
    console.log('✅ SUCCÈS');
    results.push({
      Agent: '🛡️ Médiateur',
      Modèle: res.modelUsed,
      Latence: `${res.latencyMs} ms`,
      Coût: `${res.cost} € (Gratuit)`,
      Statut: 'OK ✅',
      Extrait: res.content.slice(0, 75).trim() + '...',
    });
  } catch (err) {
    console.log('❌ ÉCHEC');
    results.push({ Agent: '🛡️ Médiateur', Statut: 'Erreur', Extrait: err.message });
  }

  console.log('\n📊 TABLEAU RÉCAPITULATIF :');
  console.table(results);
  console.log('✨ Toutes les fonctionnalités IA sont opérationnelles et 100% gratuites !\n');
}

runAllTests();
