const PROFANITY_LIST = [
  'con', 'conne', 'merde', 'putain', 'salope', 'encule', 'bâtard', 'batard', 'chienne'
];

export function moderateOutgoingMessage(text: string): { success: true } | { reason: string } {
  const lower = text.toLowerCase();
  for (const word of PROFANITY_LIST) {
    if (lower.includes(word)) {
      return { reason: 'Votre message contient des termes inappropriés non autorisés.' };
    }
  }
  return { success: true };
}

export function maskProfanityForDisplay(text: string): string {
  if (!text) return '';
  let result = text;
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, '***');
  }
  return result;
}
