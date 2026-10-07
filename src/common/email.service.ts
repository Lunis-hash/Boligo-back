import { Injectable, OnModuleInit } from '@nestjs/common';
import * as dns from 'dns';

// Force Node.js à privilégier l'IPv4 pour éviter tout ENETUNREACH sur Render
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  (dns as any).setDefaultResultOrder('ipv4first');
}

const isRealKey = (key?: string) => Boolean(key && !key.includes('placeholder'));

/** Canal d'envoi actif, sans jamais révéler de clé. */
export function emailDeliveryMode(): 'smtp' | 'sendgrid' | 'brevo' | 'simulation' {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
  if (isRealKey(process.env.SENDGRID_API_KEY)) return 'sendgrid';
  if (isRealKey(process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY)) return 'brevo';
  return 'simulation';
}

@Injectable()
export class EmailService implements OnModuleInit {
  private static modeLogged = false;

  onModuleInit() {
    // Service fourni par plusieurs modules : une seule ligne au démarrage.
    if (EmailService.modeLogged) return;
    EmailService.modeLogged = true;
    const mode = emailDeliveryMode();
    if (mode === 'simulation') {
      console.warn(
        "[EMAIL] Mode d'envoi : simulation — aucun e-mail réel n'est envoyé (codes de vérification et de réinitialisation non délivrés). Configurez SMTP_HOST/SMTP_USER/SMTP_PASS ou BREVO_API_KEY.",
      );
    } else {
      console.log(`[EMAIL] Mode d'envoi : ${mode}`);
    }
  }

  private async dispatchEmail(to: string, subject: string, html: string) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const sendgridKey = process.env.SENDGRID_API_KEY;



    // 2. SMTP / Nodemailer Fallback (Gmail, Brevo, OVH, etc.)
    if ((smtpHost || smtpUser) && smtpPass) {
      console.log(`[EMAIL] Sending real email to ${to} via SMTP (port ${smtpPort})...`);
      try {
        const nodemailer = require('nodemailer');
        const cleanPass = smtpPass.replace(/\s+/g, '');
        const isGmail = (smtpHost && smtpHost.includes('gmail')) || (smtpUser && smtpUser.includes('@gmail.com'));

        const targetPort = isGmail ? 465 : (smtpPort || 587);
        const isSecure = targetPort === 465;

        const transporter = nodemailer.createTransport({
          host: smtpHost || 'smtp.gmail.com',
          port: targetPort,
          secure: isSecure,
          family: 4, // Force IPv4 pour contourner l'erreur ENETUNREACH IPv6 sur Render
          auth: {
            user: smtpUser,
            pass: cleanPass,
          },
          // Certificat du serveur SMTP vérifié (pas d'interception possible).
          tls: {
            servername: smtpHost || 'smtp.gmail.com',
          },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
        });

        const fromAddress = process.env.EMAIL_FROM || `BOLIGO <${smtpUser}>`;
        await transporter.sendMail({
          from: fromAddress,
          to,
          subject,
          html,
        });

        console.log(`[EMAIL] Email sent successfully via SMTP to ${to}`);
        return;
      } catch (error) {
        console.error('[EMAIL] Failed to send email via SMTP:', error);
      }
    }



    // 3. SendGrid API Fallback
    if (sendgridKey && sendgridKey !== 'placeholder' && !sendgridKey.includes('placeholder')) {
      console.log(`[EMAIL] Sending real email to ${to} via SendGrid...`);
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
          headers: {
            'Authorization': `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: process.env.EMAIL_FROM || 'no-reply@boligo.fr', name: 'BOLIGO' },
            subject: subject,
            content: [{ type: 'text/html', value: html }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[EMAIL] SendGrid API error: ${response.status} - ${errText}`);
        } else {
          console.log(`[EMAIL] Email sent successfully via SendGrid to ${to}`);
          return;
        }
      } catch (error) {
        console.error('[EMAIL] Failed to send email via SendGrid:', error);
      }
    }

    // 4. Brevo (Sendinblue) HTTP API (Port 443 - Toujours autorisé sur Render)
    const brevoKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    if (brevoKey && brevoKey !== 'placeholder' && !brevoKey.includes('placeholder')) {
      console.log(`[EMAIL] Sending real email to ${to} via Brevo API...`);
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'BOLIGO', email: process.env.EMAIL_FROM || 'no-reply@boligo.fr' },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[EMAIL] Brevo API error: ${response.status} - ${errText}`);
        } else {
          console.log(`[EMAIL] Email sent successfully via Brevo API to ${to}`);
          return;
        }
      } catch (error) {
        console.error('[EMAIL] Failed to send email via Brevo API:', error);
      }
    }

    // 3. Mode Simulation dans la console
    console.log('\n==================================================');
    console.log(`✉️ [EMAIL SIMULATED] To: ${to}`);
    // Le sujet contient le code de vérification : jamais dans les journaux de production.
    console.log(
      `[EMAIL SIMULATED] Subject: ${process.env.NODE_ENV === 'production' ? subject.replace(/\d/g, '•') : subject}`,
    );
    console.log('==================================================\n');
  }

  /**
   * E-mail court aux couleurs de BOLIGO (titre + paragraphes). Le texte est
   * échappé : il peut contenir des données saisies par un visiteur.
   */
  async sendSimpleEmail(
    to: string,
    subject: string,
    title: string,
    paragraphs: string[],
    lang = 'fr',
    cta?: { label: string; url: string },
  ) {
    const esc = (v: string) =>
      v
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const body = paragraphs
      .map(
        (p) =>
          `<p style="margin: 0 0 14px; font-size: 14.5px; line-height: 1.6; color: #5E4F6E; white-space: pre-line;">${esc(p)}</p>`,
      )
      .join('');
    const button = cta
      ? `<p style="margin: 22px 0 6px;"><a href="${esc(cta.url)}" style="display: inline-block; background-color: #C62A6E; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 15px; padding: 13px 24px; border-radius: 999px;">${esc(cta.label)}</a></p><p style="margin: 10px 0 0; font-size: 12px; line-height: 1.5; color: #8A7B99; word-break: break-all;">${esc(cta.url)}</p>`
      : '';
    const html = `<!DOCTYPE html><html lang="${lang === 'en' ? 'en' : 'fr'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(subject)}</title></head>
<body style="margin: 0; padding: 0; background-color: #FFF8FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFF8FA; padding: 40px 16px;"><tr><td align="center">
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #F3E4EC;">
<tr><td style="padding: 32px 36px 8px;"><p style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 3px; color: #C62A6E;">BOLIGO</p></td></tr>
<tr><td style="padding: 8px 36px 32px;"><h1 style="margin: 0 0 16px; font-size: 20px; color: #2A1B3D;">${esc(title)}</h1>${body}${button}</td></tr>
</table></td></tr></table></body></html>`;
    await this.dispatchEmail(to, subject, html);
  }

  async sendVerificationEmail(email: string, code: string) {
    const subject = `${code} est votre code de confirmation BOLIGO`;
    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code de confirmation BOLIGO</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FFF8FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFF8FA; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(20, 16, 14, 0.06); border: 1px solid rgba(20, 16, 14, 0.05);">
                <!-- Header Gradient -->
                <tr>
                  <td align="center" style="padding: 40px 30px 24px; background: linear-gradient(135deg, #FDE6EF 0%, #FFFFFF 100%);">
                    <div style="display: inline-block; padding: 4px 14px; border-radius: 20px; border: 1px solid rgba(232, 64, 58, 0.25); background-color: rgba(232, 64, 58, 0.05); margin-bottom: 14px;">
                      <span style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #C62A6E; text-transform: uppercase;">Sécurité & Vérification</span>
                    </div>
                    <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #C62A6E; line-height: 1;">BOLIGO</h1>
                    <p style="margin: 6px 0 0; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #8A7B98; text-transform: uppercase;">Rencontres par affinité réelle</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 10px 36px 36px;">
                    <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #2A1B3D; text-align: center;">
                      Validez votre compte
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #5E4F6E; text-align: center;">
                      Merci de rejoindre l'aventure BOLIGO. Pour finaliser votre inscription et accéder à votre entretien IA, saisissez ce code à 4 chiffres :
                    </p>

                    <!-- OTP Code Box -->
                    <div style="background: linear-gradient(135deg, rgba(232,64,58,0.06), rgba(124,92,232,0.06)); border: 1.5px dashed rgba(232,64,58,0.35); border-radius: 16px; padding: 22px 16px; text-align: center; margin: 0 0 24px;">
                      <span style="font-family: monospace, Courier; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #C62A6E; padding-left: 12px;">
                        ${code}
                      </span>
                    </div>

                    <p style="margin: 0 0 8px; font-size: 12.5px; color: #8A7B98; text-align: center;">
                      ⏱️ Ce code expire dans <strong style="color: #5E4F6E;">15 minutes</strong>.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9A8FA8; text-align: center;">
                      Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #FFF8FA; border-top: 1px solid rgba(20, 16, 14, 0.05); text-align: center;">
                    <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #5E4F6E;">
                      BOLIGO — Société HARMONIE
                    </p>
                    <p style="margin: 0; font-size: 10px; color: #8A7B98;">
                      45 rue Cécile Duparc, 95870 Bezons, France · Données 100% sécurisées
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.dispatchEmail(email, subject, html);
  }

  async sendPasswordResetEmail(email: string, code: string) {
    const subject = `${code} est votre code de réinitialisation BOLIGO`;
    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de mot de passe</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FFF8FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFF8FA; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(20, 16, 14, 0.06); border: 1px solid rgba(20, 16, 14, 0.05);">
                <!-- Header Gradient -->
                <tr>
                  <td align="center" style="padding: 40px 30px 24px; background: linear-gradient(135deg, #FDE6EF 0%, #FFFFFF 100%);">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #C62A6E; line-height: 1;">BOLIGO</h1>
                    <p style="margin: 6px 0 0; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #8A7B98; text-transform: uppercase;">Sécurité du compte</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 10px 36px 36px;">
                    <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #2A1B3D; text-align: center;">
                      Nouveau mot de passe
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #5E4F6E; text-align: center;">
                      Vous avez demandé la réinitialisation de votre mot de passe. Utilisez le code suivant pour sécuriser votre compte :
                    </p>

                    <!-- Code Box -->
                    <div style="background: linear-gradient(135deg, rgba(232,64,58,0.06), rgba(124,92,232,0.06)); border: 1.5px dashed rgba(232,64,58,0.35); border-radius: 16px; padding: 22px 16px; text-align: center; margin: 0 0 24px;">
                      <span style="font-family: monospace, Courier; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #C62A6E; padding-left: 12px;">
                        ${code}
                      </span>
                    </div>

                    <p style="margin: 0 0 8px; font-size: 12.5px; color: #8A7B98; text-align: center;">
                      ⏱️ Ce code expire dans <strong style="color: #5E4F6E;">15 minutes</strong>.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #FFF8FA; border-top: 1px solid rgba(20, 16, 14, 0.05); text-align: center;">
                    <p style="margin: 0; font-size: 10px; color: #8A7B98;">
                      BOLIGO — 45 rue Cécile Duparc, 95870 Bezons, France
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.dispatchEmail(email, subject, html);
  }

  // ─── NOUVEAU : Confirmation de paiement ────────────────────────────────────
  async sendPaymentConfirmationEmail(
    email: string,
    firstName: string,
    amountEur: number,
    planName: string,
    stripePaymentRef: string,
    invoiceUrl?: string,
    billing: {
      invoiceNumber?: string;
      exclTaxCents?: number;
      taxCents?: number;
      ratePercent?: number;
      taxMention?: string;
      earlyStartConsentAt?: string;
    } = {},
  ) {
    const subject = `Paiement confirmé — Bienvenue dans le Parcours Harmonie, ${firstName} !`;
    const formattedAmount = amountEur.toFixed(2).replace('.', ',');
    const cents = (c: number) => (c / 100).toFixed(2).replace('.', ',');
    const rate = (billing.ratePercent ?? 0).toString().replace('.', ',');
    const taxRow =
      typeof billing.taxCents === 'number' && billing.taxCents > 0
        ? `<tr><td style="padding: 6px 20px; font-size: 12.5px; color: #8A7B98;">dont TVA (${rate} %)</td><td style="padding: 6px 20px; font-size: 12.5px; color: #8A7B98; text-align: right;">${cents(billing.taxCents)} €</td></tr>`
        : billing.taxMention
          ? `<tr><td colspan="2" style="padding: 6px 20px; font-size: 12px; color: #8A7B98;">${billing.taxMention}</td></tr>`
          : '';
    const invoiceRow = billing.invoiceNumber
      ? `<tr><td style="padding: 10px 20px; font-size: 13.5px; color: #5E4F6E;">Facture</td><td style="padding: 10px 20px; font-size: 13.5px; font-weight: 600; color: #2A1B3D; text-align: right;">${billing.invoiceNumber}</td></tr>`
      : '';
    const consentAt = billing.earlyStartConsentAt
      ? new Date(billing.earlyStartConsentAt)
      : null;
    const consentNote =
      consentAt && !Number.isNaN(consentAt.getTime())
        ? `Le ${consentAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })}, vous avez demandé que votre parcours puisse commencer avant la fin du délai de rétractation de 14 jours : si vous vous rétractez après son début, un montant proportionnel au service déjà fourni reste dû.`
        : '';
    const seller = [
      process.env.BILLING_SELLER_NAME?.trim() || 'BOLIGO',
      process.env.BILLING_SELLER_LEGAL_FORM?.trim(),
    ]
      .filter(Boolean)
      .join(', ');
    const sellerDetails = [
      process.env.BILLING_SELLER_ADDRESS?.trim(),
      process.env.BILLING_SELLER_SIREN?.trim() &&
        `SIREN ${process.env.BILLING_SELLER_SIREN.trim()}`,
      process.env.BILLING_SELLER_VAT_NUMBER?.trim() &&
        `TVA ${process.env.BILLING_SELLER_VAT_NUMBER.trim()}`,
    ]
      .filter(Boolean)
      .join(' · ');
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const invoiceBtn = invoiceUrl
      ? `<a href="${invoiceUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 28px; background: linear-gradient(135deg, #C62A6E, #A32159); color: #FFFFFF; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 700;">Télécharger ma facture</a>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmation de paiement BOLIGO</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FFF8FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFF8FA; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(20, 16, 14, 0.08);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 44px 30px 28px; background: linear-gradient(145deg, #2A1B3D 0%, #2A1B3D 100%);">
                    <h1 style="margin: 0 0 4px; font-size: 30px; font-weight: 900; letter-spacing: 4px; color: #C62A6E;">BOLIGO</h1>
                    <p style="margin: 0; font-size: 11px; font-weight: 600; letter-spacing: 2px; color: #6B5E7A; text-transform: uppercase;">Parcours Harmonie</p>
                  </td>
                </tr>

                <!-- Success Banner -->
                <tr>
                  <td style="padding: 0;">
                    <div style="background: linear-gradient(135deg, #1A8A4A, #22A55A); padding: 18px 30px; text-align: center;">
                      <p style="margin: 0; font-size: 17px; font-weight: 700; color: #FFFFFF;">Paiement confirmé avec succès !</p>
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 36px 36px 12px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #2A1B3D;">
                      Bonjour <strong>${firstName}</strong>,
                    </p>
                    <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.7; color: #5E4F6E;">
                      Votre paiement a bien été reçu et votre accès au <strong>Parcours Harmonie</strong> est désormais actif. Vous pouvez dès maintenant démarrer votre rencontre guidée par l'IA BOLIGO.
                    </p>
                  </td>
                </tr>

                <!-- Reçu détaillé -->
                <tr>
                  <td style="padding: 0 36px 28px;">
                    <div style="background-color: #FFF8FA; border: 1px solid rgba(20,16,14,0.08); border-radius: 16px; overflow: hidden;">
                      <div style="padding: 14px 20px; background: rgba(20,16,14,0.04); border-bottom: 1px solid rgba(20,16,14,0.06);">
                        <p style="margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #8A7B98; text-transform: uppercase;">Reçu de paiement</p>
                      </div>
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 6px 0;">
                        <tr>
                          <td style="padding: 10px 20px; font-size: 13.5px; color: #5E4F6E;">Offre</td>
                          <td style="padding: 10px 20px; font-size: 13.5px; font-weight: 600; color: #2A1B3D; text-align: right;">${planName}</td>
                        </tr>
                        <tr style="background: rgba(20,16,14,0.02);">
                          <td style="padding: 10px 20px; font-size: 13.5px; color: #5E4F6E;">Date</td>
                          <td style="padding: 10px 20px; font-size: 13.5px; font-weight: 600; color: #2A1B3D; text-align: right;">${dateStr}</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 20px; font-size: 13.5px; color: #5E4F6E;">Référence Stripe</td>
                          <td style="padding: 10px 20px; font-size: 11px; font-weight: 600; color: #8A7B98; text-align: right; font-family: monospace;">${stripePaymentRef}</td>
                        </tr>
                        ${invoiceRow}
                        <tr style="border-top: 1.5px solid rgba(20,16,14,0.08);">
                          <td style="padding: 14px 20px; font-size: 15px; font-weight: 800; color: #2A1B3D;">Total payé TTC</td>
                          <td style="padding: 14px 20px; font-size: 20px; font-weight: 900; color: #1A8A4A; text-align: right;">${formattedAmount} €</td>
                        </tr>
                        ${taxRow}
                      </table>
                    </div>
                    <div style="text-align: center; margin-top: 8px;">
                      ${invoiceBtn}
                    </div>
                    <p style="margin: 18px 0 0; font-size: 12px; line-height: 1.6; color: #8A7B98;">
                      ${consentNote} Vous pouvez vous rétracter pendant 14 jours à compter du paiement depuis votre profil, rubrique « Mes achats » (« Se rétracter du contrat ici »).
                    </p>
                  </td>
                </tr>

                <!-- Étapes du parcours -->
                <tr>
                  <td style="padding: 0 36px 28px;">
                    <p style="margin: 0 0 14px; font-size: 13px; font-weight: 700; color: #2A1B3D; text-transform: uppercase; letter-spacing: 1px;">Votre parcours en 4 étapes :</p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="padding: 0 10px 12px 0;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #C62A6E, #A32159); border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; color: white; font-weight: 800;">1</div>
                        </td>
                        <td valign="top" style="padding-bottom: 12px;">
                          <p style="margin: 0 0 2px; font-size: 13.5px; font-weight: 700; color: #2A1B3D;">Phase Harmonie (3 jours)</p>
                          <p style="margin: 0; font-size: 12.5px; color: #8A7B98;">Questions guidées par l'IA pour mieux vous connaître</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="36" valign="top" style="padding: 0 10px 12px 0;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #7C5CDB, #5A3AC7); border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; color: white; font-weight: 800;">2</div>
                        </td>
                        <td valign="top" style="padding-bottom: 12px;">
                          <p style="margin: 0 0 2px; font-size: 13.5px; font-weight: 700; color: #2A1B3D;">Chat libre</p>
                          <p style="margin: 0; font-size: 12.5px; color: #8A7B98;">Échange authentique en temps réel</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="36" valign="top" style="padding: 0 10px 12px 0;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #7C5CDB, #5A3AC7); border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; color: white; font-weight: 800;">3</div>
                        </td>
                        <td valign="top" style="padding-bottom: 12px;">
                          <p style="margin: 0 0 2px; font-size: 13.5px; font-weight: 700; color: #2A1B3D;">Appel vidéo</p>
                          <p style="margin: 0; font-size: 12.5px; color: #8A7B98;">Première rencontre visuelle sécurisée</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="36" valign="top" style="padding: 0 10px 0 0;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #1A8A4A, #117A38); border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; color: white; font-weight: 800;">4</div>
                        </td>
                        <td valign="top">
                          <p style="margin: 0 0 2px; font-size: 13.5px; font-weight: 700; color: #2A1B3D;">Échange de contacts</p>
                          <p style="margin: 0; font-size: 12.5px; color: #8A7B98;">Partagez vos coordonnées si vous le souhaitez</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #FFF8FA; border-top: 1px solid rgba(20, 16, 14, 0.05); text-align: center;">
                    <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #5E4F6E;">${seller}</p>
                    ${sellerDetails ? `<p style="margin: 0; font-size: 10px; color: #8A7B98;">${sellerDetails}</p>` : ''}
                    <p style="margin: 6px 0 0; font-size: 10px; color: #8A7B98;">Cet e-mail est votre reçu de paiement ; la facture est disponible dans l’application. Conservez-le.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.dispatchEmail(email, subject, html);
  }

  // ─── NOUVEAU : Appel vidéo débloqué ───────────────────────────────────────
  async sendVideoUnlockEmail(email: string, firstName: string, partnerName: string) {
    const subject = `Votre appel vidéo avec ${partnerName} est débloqué, ${firstName} !`;
    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appel vidéo débloqué — BOLIGO</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F0F4FF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0F4FF; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(30, 40, 100, 0.10);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 44px 30px 28px; background: linear-gradient(145deg, #33287A 0%, #33287A 100%);">
                    <h1 style="margin: 0 0 4px; font-size: 28px; font-weight: 900; letter-spacing: 3px; color: #C62A6E;">BOLIGO</h1>
                    <p style="margin: 0; font-size: 11px; font-weight: 600; letter-spacing: 2px; color: #7B6FCC; text-transform: uppercase;">Appel vidéo disponible</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 36px 36px 28px;">
                    <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #2A1B3D; text-align: center;">
                      Félicitations, ${firstName} !
                    </h2>
                    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #5E4F6E; text-align: center;">
                      Vous avez terminé la <strong>Phase Harmonie</strong> et le chat libre avec <strong>${partnerName}</strong>. Votre appel vidéo est maintenant disponible !
                    </p>

                    <!-- Highlight box -->
                    <div style="background: linear-gradient(135deg, rgba(30,16,96,0.06), rgba(124,92,232,0.10)); border: 1.5px solid rgba(124,92,232,0.25); border-radius: 16px; padding: 24px; text-align: center; margin: 0 0 24px;">
                      <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #5A3AC7; text-transform: uppercase; letter-spacing: 1px;">Prochaine étape</p>
                      <p style="margin: 0; font-size: 18px; font-weight: 800; color: #2A1B3D;">Appelez ${partnerName} en vidéo</p>
                      <p style="margin: 8px 0 0; font-size: 13px; color: #8A7B98;">Durée maximum : 7 minutes pour cette première rencontre</p>
                    </div>

                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #8A7B98; text-align: center;">
                      Ouvrez l'application BOLIGO et rendez-vous dans votre parcours pour lancer l'appel vidéo dès maintenant.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #F8F7FF; border-top: 1px solid rgba(30,16,96,0.06); text-align: center;">
                    <p style="margin: 0; font-size: 10px; color: #8A7B98;">BOLIGO — 45 rue Cécile Duparc, 95870 Bezons, France</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.dispatchEmail(email, subject, html);
  }

  // ─── NOUVEAU : Nouveau match proposé ─────────────────────────────────────
  async sendNewMatchEmail(
    email: string,
    firstName: string,
    compatibilityScore: number,
    expiresInDays: number = 7,
  ) {
    const subject = `Un match exceptionnel vous attend sur BOLIGO, ${firstName} !`;
    const scorePercent = Math.round(compatibilityScore);
    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouveau match BOLIGO</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FDE6EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FDE6EF; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(232, 64, 58, 0.12);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 44px 30px 28px; background: linear-gradient(145deg, #C62A6E 0%, #A32159 100%);">
                    <h1 style="margin: 0 0 4px; font-size: 30px; font-weight: 900; letter-spacing: 4px; color: #FFFFFF;">BOLIGO</h1>
                    <p style="margin: 0; font-size: 11px; font-weight: 600; letter-spacing: 2px; color: rgba(255,255,255,0.7); text-transform: uppercase;">Nouveau match</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 36px 36px 28px;">
                    <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #2A1B3D; text-align: center;">
                      ${firstName}, l'IA a trouvé votre match !
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.7; color: #5E4F6E; text-align: center;">
                      Après analyse de votre profil et de votre entretien IA, nous avons identifié une compatibilité remarquable avec un profil soigneusement sélectionné.
                    </p>

                    <!-- Score -->
                    <div style="background: linear-gradient(135deg, rgba(232,64,58,0.07), rgba(124,92,232,0.07)); border: 1.5px solid rgba(232,64,58,0.2); border-radius: 16px; padding: 24px; text-align: center; margin: 0 0 24px;">
                      <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #C62A6E; text-transform: uppercase; letter-spacing: 1.5px;">Score de compatibilité IA</p>
                      <p style="margin: 0; font-size: 52px; font-weight: 900; color: #2A1B3D; line-height: 1;">${scorePercent}<span style="font-size: 28px; color: #C62A6E;">%</span></p>
                      <p style="margin: 8px 0 0; font-size: 13px; color: #8A7B98;">Calculé sur 190 critères d'affinité réelle</p>
                    </div>

                    <p style="margin: 0 0 8px; font-size: 13.5px; line-height: 1.6; color: #5E4F6E; text-align: center;">
                      ⏰ Cette proposition expire dans <strong style="color: #C62A6E;">${expiresInDays} jours</strong>. Ouvrez l'app BOLIGO pour accepter ou refuser ce match.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #FFF8FA; border-top: 1px solid rgba(20, 16, 14, 0.05); text-align: center;">
                    <p style="margin: 0; font-size: 10px; color: #8A7B98;">BOLIGO — 45 rue Cécile Duparc, 95870 Bezons, France</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.dispatchEmail(email, subject, html);
  }
}

