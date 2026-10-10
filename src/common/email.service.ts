import { Injectable, OnModuleInit } from '@nestjs/common';
import * as dns from 'dns';
import { renderEmail } from './email-layout';
import * as T from './email-templates';
import type { RenderedEmail } from './email-templates';

// Force Node.js à privilégier l'IPv4 pour éviter tout ENETUNREACH sur Render
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  (dns as any).setDefaultResultOrder('ipv4first');
}

/** Adresse masquée pour les journaux : a•••@exemple.fr. */
export function maskEmail(address: string): string {
  const [user, domain] = String(address ?? '').split('@');
  if (!domain) return '•••';
  return `${user.slice(0, 1)}•••@${domain}`;
}

const isRealKey = (key?: string) =>
  Boolean(key && !key.includes('placeholder'));

/** Canal d'envoi actif, sans jamais révéler de clé. */
export function emailDeliveryMode():
  | 'resend'
  | 'smtp'
  | 'sendgrid'
  | 'brevo'
  | 'simulation' {
  if (isRealKey(process.env.RESEND_API_KEY)) return 'resend';
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    return 'smtp';
  if (isRealKey(process.env.SENDGRID_API_KEY)) return 'sendgrid';
  if (isRealKey(process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY))
    return 'brevo';
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
        "[EMAIL] Mode d'envoi : simulation — aucun e-mail réel n'est envoyé (codes de vérification et de réinitialisation non délivrés). Configurez RESEND_API_KEY, SMTP_HOST/SMTP_USER/SMTP_PASS ou BREVO_API_KEY.",
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

    // 1. Resend HTTP API (port 443 : passe même quand l'hébergeur bloque le SMTP)
    const resendKey = process.env.RESEND_API_KEY;
    if (isRealKey(resendKey)) {
      console.log(
        `[EMAIL] Sending real email to ${maskEmail(to)} via Resend API...`,
      );
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'BOLIGO <no-reply@boligo.fr>',
            to: [to],
            subject,
            html,
            ...(process.env.EMAIL_REPLY_TO
              ? { reply_to: process.env.EMAIL_REPLY_TO }
              : {}),
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(
            `[EMAIL] Resend API error: ${response.status} - ${errText}`,
          );
        } else {
          console.log(
            `[EMAIL] Email sent successfully via Resend API to ${maskEmail(to)}`,
          );
          return;
        }
      } catch (error) {
        console.error('[EMAIL] Failed to send email via Resend API:', error);
      }
    }

    // 2. SMTP / Nodemailer Fallback (Gmail, Brevo, OVH, etc.)
    if ((smtpHost || smtpUser) && smtpPass) {
      console.log(
        `[EMAIL] Sending real email to ${maskEmail(to)} via SMTP (port ${smtpPort})...`,
      );
      try {
        const nodemailer = require('nodemailer');
        const cleanPass = smtpPass.replace(/\s+/g, '');
        const isGmail =
          (smtpHost && smtpHost.includes('gmail')) ||
          (smtpUser && smtpUser.includes('@gmail.com'));

        const targetPort = isGmail ? 465 : smtpPort || 587;
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

        console.log(
          `[EMAIL] Email sent successfully via SMTP to ${maskEmail(to)}`,
        );
        return;
      } catch (error) {
        console.error('[EMAIL] Failed to send email via SMTP:', error);
      }
    }

    // 3. SendGrid API Fallback
    if (
      sendgridKey &&
      sendgridKey !== 'placeholder' &&
      !sendgridKey.includes('placeholder')
    ) {
      console.log(
        `[EMAIL] Sending real email to ${maskEmail(to)} via SendGrid...`,
      );
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
          headers: {
            Authorization: `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: {
              email: process.env.EMAIL_FROM || 'no-reply@boligo.fr',
              name: 'BOLIGO',
            },
            subject: subject,
            content: [{ type: 'text/html', value: html }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(
            `[EMAIL] SendGrid API error: ${response.status} - ${errText}`,
          );
        } else {
          console.log(
            `[EMAIL] Email sent successfully via SendGrid to ${maskEmail(to)}`,
          );
          return;
        }
      } catch (error) {
        console.error('[EMAIL] Failed to send email via SendGrid:', error);
      }
    }

    // 4. Brevo (Sendinblue) HTTP API (Port 443 - Toujours autorisé sur Render)
    const brevoKey =
      process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    if (
      brevoKey &&
      brevoKey !== 'placeholder' &&
      !brevoKey.includes('placeholder')
    ) {
      console.log(
        `[EMAIL] Sending real email to ${maskEmail(to)} via Brevo API...`,
      );
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'BOLIGO',
              email: process.env.EMAIL_FROM || 'no-reply@boligo.fr',
            },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(
            `[EMAIL] Brevo API error: ${response.status} - ${errText}`,
          );
        } else {
          console.log(
            `[EMAIL] Email sent successfully via Brevo API to ${maskEmail(to)}`,
          );
          return;
        }
      } catch (error) {
        console.error('[EMAIL] Failed to send email via Brevo API:', error);
      }
    }

    // 3. Mode Simulation dans la console
    console.log('\n==================================================');
    console.log(`✉️ [EMAIL SIMULATED] To: ${maskEmail(to)}`);
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
    const html = renderEmail({
      preheader: paragraphs[0] ?? title,
      title,
      blocks: paragraphs.map((text) => ({ kind: 'text' as const, text })),
      cta,
      lang: lang === 'en' ? 'en' : 'fr',
    });
    await this.dispatchEmail(to, subject, html);
  }

  private async send(to: string, email: RenderedEmail) {
    await this.dispatchEmail(to, email.subject, email.html);
  }

  async sendVerificationEmail(email: string, code: string) {
    await this.send(email, T.verificationEmail(code));
  }

  async sendWelcomeEmail(email: string, firstName: string) {
    await this.send(email, T.welcomeEmail(firstName));
  }

  async sendPasswordResetEmail(email: string, code: string) {
    await this.send(email, T.passwordResetEmail(code));
  }

  async sendProfileReadyEmail(email: string, firstName: string) {
    await this.send(email, T.profileReadyEmail(firstName));
  }

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
    await this.send(
      email,
      T.paymentReceiptEmail({
        firstName,
        amountEur,
        planName,
        paymentRef: stripePaymentRef,
        invoiceUrl,
        ...billing,
      }),
    );
  }

  async sendVideoUnlockEmail(
    email: string,
    firstName: string,
    partnerName: string,
  ) {
    await this.send(email, T.videoUnlockedEmail(firstName, partnerName));
  }

  async sendNewMatchEmail(
    email: string,
    firstName: string,
    compatibilityScore: number,
    expiresInDays: number = 7,
  ) {
    await this.send(
      email,
      T.newMatchEmail(firstName, compatibilityScore, expiresInDays),
    );
  }

  /** E-mail d'une étape du parcours (invitation, début, messagerie, fin). */
  async sendStepEmail(email: string, rendered: RenderedEmail) {
    await this.send(email, rendered);
  }
}
