#!/bin/bash
# Chien de garde du webhook Render TEST, lancé détaché par recette-stripe-test.sh.
# Si le script principal (PID $1) disparaît sans avoir restauré le webhook
# (arrêt brutal), ou au plus tard après 45 minutes, il le restaure et vérifie.
# Clé et chemins hérités par l'environnement (jamais en argument).
MAIN=$1
for _ in $(seq 540); do
  kill -0 "$MAIN" 2>/dev/null || break
  sleep 5
done
if [ -f "$GARDE_DIR/COUPE" ]; then
  if ! node "$(dirname "$0")/recette-stripe-test.js" webhook-restore >> "$GARDE_DIR/chien-de-garde.log" 2>&1; then
    echo "🚨 ALERTE $(date -Is) : chien de garde, webhook Render TEST NON réactivé" >> "$GARDE_DIR/ALERTE"
  fi
fi
