// Tests unitaires : jamais la qualification réelle des modèles
// (config/sondeur-models.json). Chaque test qui en a besoin fournit la sienne.
process.env.SONDEUR_MODELS_FILE =
  process.env.SONDEUR_MODELS_FILE_TEST || '/nonexistent/sondeur-models.json';
