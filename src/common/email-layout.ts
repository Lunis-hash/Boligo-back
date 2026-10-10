/**
 * Mise en page commune des e-mails BOLIGO : même en-tête, même pied de page,
 * mêmes couleurs que l'application. HTML en tableaux et styles en ligne pour
 * rester lisible dans Gmail, Outlook et les messageries mobiles.
 * Tout texte passé ici est échappé : il peut venir d'un membre.
 */

export const BRAND = {
  primary: '#C62A6E',
  primaryDark: '#A32159',
  violet: '#7C5CDB',
  ink: '#2A1B3D',
  text: '#5E4F6E',
  muted: '#8A7B98',
  page: '#FFF8FA',
  line: '#F3E4EC',
  soft: '#FDF1F6',
  success: '#1A8A4A',
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Étapes du parcours d'un membre, dans l'ordre où il les vit. */
export const JOURNEY_STEPS = [
  'Grand Entretien',
  'Découverte',
  'Invitation',
  'Sondeur',
  'Messagerie',
  'Appel vidéo',
  'Coordonnées',
] as const;
export type JourneyStep = (typeof JOURNEY_STEPS)[number];

export type EmailBlock =
  | { kind: 'text'; text: string }
  | { kind: 'code'; label: string; value: string; hint?: string }
  | { kind: 'highlight'; label: string; value: string; hint?: string }
  | {
      kind: 'rows';
      title: string;
      rows: [string, string][];
      total?: [string, string];
      note?: string;
    }
  | { kind: 'list'; title?: string; items: { title: string; text: string }[] }
  | { kind: 'quote'; text: string; author?: string }
  | { kind: 'note'; text: string };

export interface EmailOptions {
  /** Ligne d'aperçu affichée dans la boîte de réception, à côté du sujet. */
  preheader: string;
  /** Petit libellé au-dessus du titre (ex. « Votre parcours »). */
  eyebrow?: string;
  title: string;
  /** Prénom du membre : ajoute « Bonjour Prénom, ». */
  firstName?: string;
  blocks: EmailBlock[];
  cta?: { label: string; url: string };
  /** Étape mise en avant dans la frise du parcours. */
  step?: JourneyStep;
  /** Texte discret sous le bouton (sécurité, délai, etc.). */
  footnote?: string;
  lang?: 'fr' | 'en';
  /** Mention ajoutée au pied de page (ex. « Cet e-mail est votre reçu »). */
  legalNote?: string;
  /** Signature : « L'équipe BOLIGO » par défaut, rien pour les e-mails internes. */
  signature?: string | null;
}

export function webAppUrl(): string {
  return (process.env.WEB_APP_URL || 'https://boligo-web.onrender.com').replace(
    /\/+$/,
    '',
  );
}

export function contactAddress(): string {
  return process.env.CONTACT_EMAIL?.trim() || 'contact@boligo.fr';
}

function seller() {
  const name = process.env.BILLING_SELLER_NAME?.trim() || 'BOLIGO';
  const form = process.env.BILLING_SELLER_LEGAL_FORM?.trim();
  const details = [
    process.env.BILLING_SELLER_ADDRESS?.trim(),
    process.env.BILLING_SELLER_SIREN?.trim() &&
      `SIREN ${process.env.BILLING_SELLER_SIREN.trim()}`,
  ].filter(Boolean);
  return {
    title: [name, form].filter(Boolean).join(', '),
    details: details.join(' · '),
  };
}

const p = (text: string, extra = '') =>
  `<p style="margin: 0 0 14px; font-size: 15px; line-height: 1.65; color: ${BRAND.text}; white-space: pre-line;${extra}">${esc(text)}</p>`;

function renderBlock(block: EmailBlock): string {
  switch (block.kind) {
    case 'text':
      return p(block.text);
    case 'code':
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 8px 0 18px;"><tr><td align="center" style="background-color: ${BRAND.soft}; border: 1.5px dashed #E7A9C4; border-radius: 16px; padding: 20px 12px;">
<p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: ${BRAND.primary};">${esc(block.label)}</p>
<p style="margin: 0; font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: ${BRAND.ink};">${esc(block.value)}</p>
${block.hint ? `<p style="margin: 8px 0 0; font-size: 12.5px; color: ${BRAND.muted};">${esc(block.hint)}</p>` : ''}
</td></tr></table>`;
    case 'highlight':
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 8px 0 18px;"><tr><td align="center" style="background-color: ${BRAND.soft}; border: 1px solid ${BRAND.line}; border-radius: 16px; padding: 20px 16px;">
<p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: ${BRAND.primary};">${esc(block.label)}</p>
<p style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: ${BRAND.ink};">${esc(block.value)}</p>
${block.hint ? `<p style="margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: ${BRAND.muted};">${esc(block.hint)}</p>` : ''}
</td></tr></table>`;
    case 'rows': {
      const rows = block.rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding: 9px 16px; font-size: 13.5px; color: ${BRAND.text}; border-top: 1px solid ${BRAND.line};">${esc(k)}</td><td align="right" style="padding: 9px 16px; font-size: 13.5px; font-weight: 600; color: ${BRAND.ink}; border-top: 1px solid ${BRAND.line};">${esc(v)}</td></tr>`,
        )
        .join('');
      const total = block.total
        ? `<tr><td style="padding: 12px 16px; font-size: 15px; font-weight: 800; color: ${BRAND.ink}; border-top: 2px solid ${BRAND.line};">${esc(block.total[0])}</td><td align="right" style="padding: 12px 16px; font-size: 19px; font-weight: 800; color: ${BRAND.success}; border-top: 2px solid ${BRAND.line};">${esc(block.total[1])}</td></tr>`
        : '';
      const note = block.note
        ? `<tr><td colspan="2" style="padding: 0 16px 12px; font-size: 12px; color: ${BRAND.muted};">${esc(block.note)}</td></tr>`
        : '';
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 6px 0 18px; border: 1px solid ${BRAND.line}; border-radius: 14px; border-collapse: separate;">
<tr><td colspan="2" style="padding: 12px 16px; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: ${BRAND.muted}; background-color: ${BRAND.page}; border-radius: 14px 14px 0 0;">${esc(block.title)}</td></tr>${rows}${total}${note}</table>`;
    }
    case 'list': {
      const items = block.items
        .map(
          (item, i) => `<tr>
<td width="34" valign="top" style="padding: 0 12px 14px 0;"><div style="width: 26px; height: 26px; border-radius: 13px; background-color: ${i === 0 ? BRAND.primary : BRAND.violet}; color: #FFFFFF; font-size: 12.5px; font-weight: 800; line-height: 26px; text-align: center;">${i + 1}</div></td>
<td valign="top" style="padding: 0 0 14px;"><p style="margin: 0 0 2px; font-size: 14.5px; font-weight: 700; color: ${BRAND.ink};">${esc(item.title)}</p><p style="margin: 0; font-size: 13.5px; line-height: 1.55; color: ${BRAND.muted};">${esc(item.text)}</p></td>
</tr>`,
        )
        .join('');
      const title = block.title
        ? `<p style="margin: 8px 0 12px; font-size: 12px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: ${BRAND.ink};">${esc(block.title)}</p>`
        : '';
      return `${title}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 8px;">${items}</table>`;
    }
    case 'quote':
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 4px 0 18px;"><tr><td style="border-left: 3px solid ${BRAND.primary}; padding: 6px 0 6px 16px;">
<p style="margin: 0; font-size: 15px; font-style: italic; line-height: 1.6; color: ${BRAND.ink}; white-space: pre-line;">« ${esc(block.text)} »</p>
${block.author ? `<p style="margin: 6px 0 0; font-size: 12.5px; color: ${BRAND.muted};">${esc(block.author)}</p>` : ''}
</td></tr></table>`;
    case 'note':
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 6px 0 16px;"><tr><td style="background-color: ${BRAND.page}; border-radius: 12px; padding: 12px 14px; font-size: 13px; line-height: 1.55; color: ${BRAND.text}; white-space: pre-line;">${esc(block.text)}</td></tr></table>`;
  }
}

/** Frise du parcours : étapes passées en couleur, étape en cours mise en avant. */
function renderJourney(step: JourneyStep): string {
  const current = JOURNEY_STEPS.indexOf(step);
  const cells = JOURNEY_STEPS.map((name, i) => {
    const done = i < current;
    const now = i === current;
    const dot = now ? BRAND.primary : done ? BRAND.violet : '#E9DFF0';
    const color = now ? BRAND.primary : done ? BRAND.text : '#B5A9C2';
    return `<td align="center" valign="top" style="padding: 0 2px;">
<div style="width: 12px; height: 12px; border-radius: 6px; background-color: ${dot}; margin: 0 auto 6px;${now ? ` box-shadow: 0 0 0 4px #F8D7E5;` : ''}"></div>
<p style="margin: 0; font-size: 10px; line-height: 1.25; font-weight: ${now ? 800 : 600}; color: ${color};">${esc(name)}</p></td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 2px 0 22px; table-layout: fixed;"><tr>${cells}</tr></table>`;
}

export function renderEmail(opts: EmailOptions): string {
  const lang = opts.lang === 'en' ? 'en' : 'fr';
  const web = webAppUrl();
  const contact = contactAddress();
  const s = seller();
  const greeting = opts.firstName
    ? p(
        lang === 'en'
          ? `Hello ${opts.firstName},`
          : `Bonjour ${opts.firstName},`,
        ' color: ' + BRAND.ink + '; font-weight: 600;',
      )
    : '';
  const button = opts.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 10px 0 8px;"><tr><td style="border-radius: 999px; background-color: ${BRAND.primary};">
<a href="${esc(opts.cta.url)}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 999px;">${esc(opts.cta.label)}</a></td></tr></table>`
    : '';
  const footnote = opts.footnote
    ? `<p style="margin: 14px 0 0; font-size: 12.5px; line-height: 1.55; color: ${BRAND.muted};">${esc(opts.footnote)}</p>`
    : '';
  const signature =
    opts.signature === null
      ? ''
      : `<p style="margin: 26px 0 0; font-size: 14.5px; line-height: 1.5; color: ${BRAND.ink};">${lang === 'en' ? 'Warmly,' : 'Avec attention,'}<br><strong>${esc(opts.signature || (lang === 'en' ? 'The BOLIGO team' : 'L’équipe BOLIGO'))}</strong></p>`;
  const why =
    lang === 'en'
      ? 'You are receiving this e-mail because you have a BOLIGO account.'
      : 'Vous recevez cet e-mail car vous avez un compte BOLIGO.';

  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light only"><title>${esc(opts.title)}</title></head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.page}; font-family: ${FONT}; -webkit-text-size-adjust: 100%;">
<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: ${BRAND.page};">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND.page};"><tr><td align="center" style="padding: 28px 12px 36px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px;">
<tr><td align="center" style="padding: 0 0 18px;">
<p style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 6px; color: ${BRAND.primary};">BOLIGO</p>
<p style="margin: 4px 0 0; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: ${BRAND.muted};">${lang === 'en' ? 'Dating by real affinity' : 'Rencontres par affinité réelle'}</p>
</td></tr>
<tr><td style="background-color: #FFFFFF; border: 1px solid ${BRAND.line}; border-radius: 24px; overflow: hidden;">
<div style="height: 6px; line-height: 6px; font-size: 0; background-color: ${BRAND.primary}; background-image: linear-gradient(90deg, ${BRAND.primary}, ${BRAND.violet}); border-radius: 24px 24px 0 0;">&nbsp;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding: 30px 32px 34px;">
${opts.eyebrow ? `<p style="margin: 0 0 10px; font-size: 11px; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase; color: ${BRAND.violet};">${esc(opts.eyebrow)}</p>` : ''}
<h1 style="margin: 0 0 20px; font-size: 25px; line-height: 1.25; font-weight: 800; color: ${BRAND.ink};">${esc(opts.title)}</h1>
${opts.step ? renderJourney(opts.step) : ''}
${greeting}${opts.blocks.map(renderBlock).join('\n')}${button}${footnote}${signature}
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding: 22px 20px 0;">
<p style="margin: 0 0 6px; font-size: 12px; color: ${BRAND.text};"><a href="${esc(web)}" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 700;">${lang === 'en' ? 'Open BOLIGO' : 'Ouvrir BOLIGO'}</a> &nbsp;·&nbsp; <a href="mailto:${esc(contact)}" style="color: ${BRAND.text}; text-decoration: none;">${esc(contact)}</a> &nbsp;·&nbsp; <a href="${esc(web)}/legal/confidentialite" style="color: ${BRAND.text}; text-decoration: none;">${lang === 'en' ? 'Privacy' : 'Confidentialité'}</a></p>
${opts.legalNote ? `<p style="margin: 0 0 6px; font-size: 11px; line-height: 1.5; color: ${BRAND.muted};">${esc(opts.legalNote)}</p>` : ''}
<p style="margin: 0; font-size: 11px; line-height: 1.5; color: ${BRAND.muted};">${esc(s.title)}${s.details ? ` · ${esc(s.details)}` : ''}<br>${why}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
