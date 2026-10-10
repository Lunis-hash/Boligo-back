import { renderEmail, webAppUrl, EmailBlock } from './email-layout';

/**
 * Textes des e-mails envoyés aux membres, étape par étape. Chaque fonction
 * rend { subject, html } sans rien envoyer : l'aperçu et les tests s'en
 * servent tels quels.
 */
export interface RenderedEmail {
  subject: string;
  html: string;
}

const app = (path = '') => `${webAppUrl()}${path}`;

// ─── Compte ──────────────────────────────────────────────────────────────────

export function verificationEmail(code: string): RenderedEmail {
  return {
    subject: `${code} est votre code de confirmation BOLIGO`,
    html: renderEmail({
      preheader: 'Votre code de confirmation, valable 15 minutes.',
      eyebrow: 'Création de compte',
      title: 'Confirmez votre adresse e-mail',
      blocks: [
        {
          kind: 'text',
          text: 'Bienvenue chez BOLIGO. Saisissez ce code dans l’application pour terminer votre inscription :',
        },
        {
          kind: 'code',
          label: 'Votre code',
          value: code,
          hint: 'Valable 15 minutes',
        },
      ],
      footnote:
        'Vous n’êtes pas à l’origine de cette demande ? Ignorez simplement cet e-mail : aucun compte ne sera créé sans ce code.',
    }),
  };
}

export function welcomeEmail(firstName: string): RenderedEmail {
  return {
    subject: `Bienvenue chez BOLIGO, ${firstName}`,
    html: renderEmail({
      preheader:
        'Votre compte est prêt. Première étape : le Grand Entretien, gratuit.',
      eyebrow: 'Bienvenue',
      title: 'Votre compte est prêt',
      firstName,
      step: 'Grand Entretien',
      blocks: [
        {
          kind: 'text',
          text: 'Merci de nous faire confiance. Chez BOLIGO, on ne fait pas défiler des photos : on part de qui vous êtes vraiment pour vous présenter des personnes avec qui une relation durable a du sens.',
        },
        {
          kind: 'list',
          title: 'Comment ça se passe',
          items: [
            {
              title: 'Le Grand Entretien (gratuit)',
              text: 'Des questions sur vos valeurs, votre façon d’aimer et ce que vous cherchez. Vous pouvez le faire en plusieurs fois.',
            },
            {
              title: 'La Découverte',
              text: 'Des profils choisis pour leur compatibilité avec vous, expliquée point par point.',
            },
            {
              title: 'Le Parcours Harmonie',
              text: 'Trois jours de questions à deux, puis la messagerie, un appel vidéo et, si vous le souhaitez, l’échange de vos coordonnées.',
            },
          ],
        },
      ],
      cta: { label: 'Commencer le Grand Entretien', url: app('/') },
      footnote:
        'Prenez votre temps : il n’y a pas de bonne réponse, seulement les vôtres.',
    }),
  };
}

export function passwordResetEmail(code: string): RenderedEmail {
  return {
    subject: `${code} est votre code de réinitialisation BOLIGO`,
    html: renderEmail({
      preheader:
        'Votre code pour choisir un nouveau mot de passe, valable 15 minutes.',
      eyebrow: 'Sécurité du compte',
      title: 'Choisissez un nouveau mot de passe',
      blocks: [
        {
          kind: 'text',
          text: 'Vous avez demandé à réinitialiser votre mot de passe. Saisissez ce code dans l’application :',
        },
        {
          kind: 'code',
          label: 'Votre code',
          value: code,
          hint: 'Valable 15 minutes',
        },
      ],
      footnote:
        'Vous n’avez rien demandé ? Ignorez cet e-mail : votre mot de passe actuel reste valable. Ne communiquez jamais ce code, l’équipe BOLIGO ne vous le demandera pas.',
    }),
  };
}

// ─── Grand Entretien et Découverte ──────────────────────────────────────────

export function profileReadyEmail(firstName: string): RenderedEmail {
  return {
    subject: `${firstName}, votre profil BOLIGO est prêt`,
    html: renderEmail({
      preheader:
        'Grand Entretien terminé : vos premiers profils compatibles vous attendent.',
      eyebrow: 'Grand Entretien terminé',
      title: 'Bravo, votre profil est prêt',
      firstName,
      step: 'Découverte',
      blocks: [
        {
          kind: 'text',
          text: 'Vous avez terminé le Grand Entretien. Merci pour la sincérité de vos réponses : c’est elle qui rend les rencontres justes.',
        },
        {
          kind: 'text',
          text: 'Votre portrait relationnel est rédigé, et la Découverte vous présente désormais des profils choisis pour vous, avec ce qui vous rapproche et les sujets à aborder ensemble.',
        },
      ],
      cta: { label: 'Découvrir mes profils', url: app('/discover') },
      footnote:
        'Vos réponses ne sont jamais montrées telles quelles aux autres membres.',
    }),
  };
}

export function newMatchEmail(
  firstName: string,
  score: number,
  expiresInDays = 7,
): RenderedEmail {
  const pct = Math.round(score);
  return {
    subject: `${firstName}, un profil très compatible vous attend`,
    html: renderEmail({
      preheader: `Compatibilité de ${pct} % : découvrez ce profil dans BOLIGO.`,
      eyebrow: 'Découverte',
      title: 'Un profil très compatible vous attend',
      firstName,
      step: 'Découverte',
      blocks: [
        {
          kind: 'text',
          text: 'À partir de votre Grand Entretien, BOLIGO a repéré une personne avec qui vous partagez beaucoup.',
        },
        {
          kind: 'highlight',
          label: 'Compatibilité',
          value: `${pct} %`,
          hint: 'Valeurs, projets de vie et façon d’être en couple',
        },
      ],
      cta: { label: 'Voir le profil', url: app('/discover') },
      footnote: `Cette proposition reste ouverte ${expiresInDays} jours.`,
    }),
  };
}

// ─── Invitation ──────────────────────────────────────────────────────────────

export function invitationReceivedEmail(
  firstName: string,
  expiresInDays = 7,
): RenderedEmail {
  return {
    subject: `${firstName}, quelqu’un souhaite vivre un Parcours Harmonie avec vous`,
    html: renderEmail({
      preheader: 'Une invitation vous attend. Vous avez 7 jours pour répondre.',
      eyebrow: 'Nouvelle invitation',
      title: 'Quelqu’un souhaite vous découvrir',
      firstName,
      step: 'Invitation',
      blocks: [
        {
          kind: 'text',
          text: 'Un membre dont le profil est compatible avec le vôtre vous invite à commencer un Parcours Harmonie.',
        },
        {
          kind: 'text',
          text: 'Regardez sa fiche et votre compatibilité, puis acceptez ou déclinez en toute liberté : votre réponse reste bienveillante dans les deux cas.',
        },
      ],
      cta: { label: 'Voir l’invitation', url: app('/discover') },
      footnote: `L’invitation reste ouverte ${expiresInDays} jours.`,
    }),
  };
}

export function journeyStartedEmail(
  firstName: string,
  partnerName: string,
  role: 'inviteur' | 'invite',
): RenderedEmail {
  const accepted = role === 'inviteur';
  return {
    subject: accepted
      ? `${partnerName} a accepté votre invitation`
      : `Votre Parcours Harmonie avec ${partnerName} commence`,
    html: renderEmail({
      preheader: 'Le Sondeur commence : trois jours de questions à deux.',
      eyebrow: accepted ? 'Invitation acceptée' : 'Parcours Harmonie',
      title: accepted
        ? `${partnerName} a dit oui`
        : `Votre parcours avec ${partnerName} commence`,
      firstName,
      step: 'Sondeur',
      blocks: [
        {
          kind: 'text',
          text: accepted
            ? `Bonne nouvelle : ${partnerName} a accepté votre invitation. Votre Parcours Harmonie commence dès aujourd’hui.`
            : `Vous avez accepté l’invitation de ${partnerName}. Votre Parcours Harmonie commence dès aujourd’hui.`,
        },
        {
          kind: 'list',
          title: 'Les étapes de votre parcours',
          items: [
            {
              title: 'Le Sondeur, pendant 3 jours',
              text: 'Chaque jour, 7 questions pour vous découvrir. Vous voyez les réponses de l’autre une fois les vôtres données.',
            },
            {
              title: 'La messagerie',
              text: 'Elle s’ouvre à la fin du Sondeur pour échanger librement.',
            },
            {
              title: 'L’appel vidéo, puis vos coordonnées',
              text: 'Un premier appel de 7 minutes, puis l’échange de coordonnées si vous le souhaitez tous les deux.',
            },
          ],
        },
      ],
      cta: { label: 'Répondre aux questions du jour', url: app('/messages') },
      footnote:
        'Répondre chaque jour compte : un parcours sans réponse pendant plusieurs jours peut être clos.',
    }),
  };
}

export type InvitationOutcome = 'refusee' | 'expiree' | 'autre_parcours';

export function invitationClosedEmail(
  firstName: string,
  outcome: InvitationOutcome,
  refunded: boolean,
): RenderedEmail {
  const reason =
    outcome === 'expiree'
      ? 'Votre invitation est restée sans réponse pendant 7 jours.'
      : outcome === 'autre_parcours'
        ? 'La personne que vous avez invitée vient de commencer un autre parcours.'
        : 'Votre invitation n’a pas abouti cette fois-ci.';
  return {
    subject: 'Votre invitation n’a pas abouti',
    html: renderEmail({
      preheader: refunded
        ? 'Votre crédit vous a été rendu. De nouveaux profils vous attendent.'
        : 'De nouveaux profils vous attendent.',
      eyebrow: 'Invitation',
      title: 'Votre invitation n’a pas abouti',
      firstName,
      step: 'Découverte',
      blocks: [
        { kind: 'text', text: reason },
        ...(refunded
          ? [
              {
                kind: 'highlight',
                label: 'Votre crédit',
                value: 'Rendu sur votre compte',
                hint: 'Vous pouvez inviter quelqu’un d’autre quand vous le souhaitez.',
              } as EmailBlock,
            ]
          : []),
        {
          kind: 'text',
          text: 'Ce n’est jamais un jugement sur vous : le bon moment compte autant que la compatibilité. D’autres profils proches de vous vous attendent.',
        },
      ],
      cta: { label: 'Voir mes profils compatibles', url: app('/discover') },
    }),
  };
}

// ─── Parcours Harmonie ──────────────────────────────────────────────────────

export function chatOpenEmail(
  firstName: string,
  partnerName: string,
): RenderedEmail {
  return {
    subject: `La messagerie avec ${partnerName} est ouverte`,
    html: renderEmail({
      preheader: 'Le Sondeur est terminé : vous pouvez maintenant vous écrire.',
      eyebrow: 'Sondeur terminé',
      title: 'Place à la conversation',
      firstName,
      step: 'Messagerie',
      blocks: [
        {
          kind: 'text',
          text: `Vous avez terminé les trois jours du Sondeur avec ${partnerName}. Votre bilan Harmonie est prêt, et la messagerie est maintenant ouverte.`,
        },
        {
          kind: 'note',
          text: 'Une idée pour commencer : rebondissez sur une réponse de l’autre qui vous a touché ou surpris.',
        },
      ],
      cta: { label: 'Écrire à ' + partnerName, url: app('/messages') },
    }),
  };
}

export function videoUnlockedEmail(
  firstName: string,
  partnerName: string,
): RenderedEmail {
  return {
    subject: `Votre appel vidéo avec ${partnerName} est disponible`,
    html: renderEmail({
      preheader:
        'Premier face-à-face : un appel vidéo de 7 minutes, depuis l’application.',
      eyebrow: 'Appel vidéo',
      title: 'Le moment de vous voir',
      firstName,
      step: 'Appel vidéo',
      blocks: [
        {
          kind: 'text',
          text: `Vos échanges avec ${partnerName} vous ont menés jusqu’ici. L’appel vidéo est maintenant disponible.`,
        },
        {
          kind: 'highlight',
          label: 'Prochaine étape',
          value: `Appeler ${partnerName}`,
          hint: 'Un premier appel de 7 minutes maximum, sans partager votre numéro.',
        },
      ],
      cta: { label: 'Ouvrir mon parcours', url: app('/messages') },
      footnote:
        'Un comportement vous met mal à l’aise ? Signalez-le depuis l’application : l’équipe le traite en priorité.',
    }),
  };
}

export function journeyEndedEmail(
  firstName: string,
  partnerName: string,
  farewell: string | null,
  refunded: boolean,
): RenderedEmail {
  const blocks: EmailBlock[] = [
    {
      kind: 'text',
      text: `${partnerName} a choisi de mettre fin à votre Parcours Harmonie.`,
    },
  ];
  if (farewell)
    blocks.push({
      kind: 'quote',
      text: farewell,
      author: `Son message pour vous`,
    });
  if (refunded)
    blocks.push({
      kind: 'highlight',
      label: 'Votre crédit',
      value: 'Rendu sur votre compte',
      hint: 'Vous pourrez inviter quelqu’un d’autre quand vous serez prêt.',
    });
  blocks.push({
    kind: 'text',
    text: 'Une rencontre qui s’arrête n’est pas un échec : elle vous apprend aussi ce que vous cherchez. Prenez le temps qu’il vous faut.',
  });
  return {
    subject: 'Votre Parcours Harmonie est terminé',
    html: renderEmail({
      preheader: refunded
        ? `${partnerName} a mis fin au parcours. Votre crédit vous a été rendu.`
        : `${partnerName} a mis fin au parcours.`,
      eyebrow: 'Parcours Harmonie',
      title: 'Votre parcours s’arrête ici',
      firstName,
      blocks,
      cta: { label: 'Revenir à la Découverte', url: app('/discover') },
    }),
  };
}

// ─── Paiement ───────────────────────────────────────────────────────────────

export interface ReceiptDetails {
  firstName: string;
  amountEur: number;
  planName: string;
  paymentRef: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  exclTaxCents?: number;
  taxCents?: number;
  ratePercent?: number;
  taxMention?: string;
  earlyStartConsentAt?: string;
}

export function paymentReceiptEmail(d: ReceiptDetails): RenderedEmail {
  const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;
  const rows: [string, string][] = [
    ['Offre', d.planName],
    [
      'Date',
      new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Paris',
      }),
    ],
    ['Référence', d.paymentRef],
  ];
  if (d.invoiceNumber) rows.push(['Facture', d.invoiceNumber]);
  const rate = (d.ratePercent ?? 0).toString().replace('.', ',');
  const note =
    typeof d.taxCents === 'number' && d.taxCents > 0
      ? `dont TVA (${rate} %) : ${euros(d.taxCents / 100)}`
      : d.taxMention;
  const consentAt = d.earlyStartConsentAt
    ? new Date(d.earlyStartConsentAt)
    : null;
  const consent =
    consentAt && !Number.isNaN(consentAt.getTime())
      ? `Le ${consentAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })}, vous avez demandé que votre parcours puisse commencer avant la fin du délai de rétractation de 14 jours : si vous vous rétractez après son début, un montant proportionnel au service déjà fourni reste dû. `
      : '';
  return {
    subject: `Paiement confirmé : ${d.planName}`,
    html: renderEmail({
      preheader: `Reçu de ${euros(d.amountEur)} pour votre ${d.planName}.`,
      eyebrow: 'Paiement confirmé',
      title: 'Merci, votre paiement est confirmé',
      firstName: d.firstName,
      blocks: [
        {
          kind: 'text',
          text: `Votre ${d.planName} est activé. Vous pouvez inviter la personne de votre choix depuis la Découverte.`,
        },
        {
          kind: 'rows',
          title: 'Reçu de paiement',
          rows,
          total: ['Total payé TTC', euros(d.amountEur)],
          note,
        },
        {
          kind: 'note',
          text: `${consent}Vous pouvez vous rétracter pendant 14 jours à compter du paiement depuis votre profil, rubrique « Mes achats et factures ».`,
        },
      ],
      cta: d.invoiceUrl
        ? { label: 'Télécharger ma facture', url: d.invoiceUrl }
        : { label: 'Ouvrir BOLIGO', url: app('/discover') },
      legalNote:
        'Cet e-mail est votre reçu de paiement. La facture est disponible dans l’application, rubrique « Mes achats et factures ».',
    }),
  };
}
