import { Injectable } from '@nestjs/common';
import * as dns from 'dns';

// Force Node.js à privilégier l'IPv4 pour éviter tout ENETUNREACH sur Render
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  (dns as any).setDefaultResultOrder('ipv4first');
}

@Injectable()
export class EmailService {
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
          tls: {
            rejectUnauthorized: false,
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

    // 2. Resend API
    if (resendKey && resendKey !== 'placeholder' && !resendKey.includes('placeholder')) {
      console.log(`[EMAIL] Sending real email to ${to} via Resend...`);
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'BOLIGO <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: html,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[EMAIL] Resend API error: ${response.status} - ${errText}`);
          if (errText.includes('You can only send testing emails') || errText.includes('validation_error')) {
            console.log(`[EMAIL] Resend Test Mode: Routing code delivery to account owner (stevebandama@gmail.com)...`);
            const fallbackRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'BOLIGO <onboarding@resend.dev>',
                to: ['stevebandama@gmail.com'],
                subject: `[Destinataire: ${to}] ${subject}`,
                html: html,
              }),
            });
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              console.log(`[EMAIL] Test mode email successfully delivered to stevebandama@gmail.com. ID: ${fallbackData.id}`);
              return;
            }
          }
        } else {
          const data = await response.json();
          console.log(`[EMAIL] Email sent successfully via Resend to ${to}. ID: ${data.id}`);
          return;
        }
      } catch (error) {
        console.error('[EMAIL] Failed to send email via Resend:', error);
      }
    }

    // 3. SendGrid API Fallback
    if (sendgridKey && sendgridKey !== 'placeholder' && !sendgridKey.includes('placeholder')) {
      console.log(`[EMAIL] Sending real email to ${to} via SendGrid...`);
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: 'no-reply@harmonie.app', name: 'BOLIGO' },
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
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'BOLIGO', email: process.env.EMAIL_FROM || 'contact@boligo.app' },
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
    console.log(`✉️ [EMAIL SIMULATED] Subject: ${subject}`);
    console.log('==================================================\n');
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
      <body style="margin: 0; padding: 0; background-color: #F8F6F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8F6F4; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(20, 16, 14, 0.06); border: 1px solid rgba(20, 16, 14, 0.05);">
                <!-- Header Gradient -->
                <tr>
                  <td align="center" style="padding: 40px 30px 24px; background: linear-gradient(135deg, #FFF5F4 0%, #FFFFFF 100%);">
                    <div style="display: inline-block; padding: 4px 14px; border-radius: 20px; border: 1px solid rgba(232, 64, 58, 0.25); background-color: rgba(232, 64, 58, 0.05); margin-bottom: 14px;">
                      <span style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #E8403A; text-transform: uppercase;">Sécurité & Vérification</span>
                    </div>
                    <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #E8403A; line-height: 1;">BOLIGO</h1>
                    <p style="margin: 6px 0 0; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #918780; text-transform: uppercase;">Rencontres par affinité réelle</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 10px 36px 36px;">
                    <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #14100E; text-align: center;">
                      Validez votre compte
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #5C534C; text-align: center;">
                      Merci de rejoindre l'aventure BOLIGO. Pour finaliser votre inscription et accéder à votre entretien IA, saisissez ce code à 4 chiffres :
                    </p>

                    <!-- OTP Code Box -->
                    <div style="background: linear-gradient(135deg, rgba(232,64,58,0.06), rgba(124,92,232,0.06)); border: 1.5px dashed rgba(232,64,58,0.35); border-radius: 16px; padding: 22px 16px; text-align: center; margin: 0 0 24px;">
                      <span style="font-family: monospace, Courier; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #E8403A; padding-left: 12px;">
                        ${code}
                      </span>
                    </div>

                    <p style="margin: 0 0 8px; font-size: 12.5px; color: #918780; text-align: center;">
                      ⏱️ Ce code expire dans <strong style="color: #5C534C;">15 minutes</strong>.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #A8A099; text-align: center;">
                      Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #FAF9F8; border-top: 1px solid rgba(20, 16, 14, 0.05); text-align: center;">
                    <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #5C534C;">
                      BOLIGO — Société HARMONIE
                    </p>
                    <p style="margin: 0; font-size: 10px; color: #918780;">
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
      <body style="margin: 0; padding: 0; background-color: #F8F6F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8F6F4; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(20, 16, 14, 0.06); border: 1px solid rgba(20, 16, 14, 0.05);">
                <!-- Header Gradient -->
                <tr>
                  <td align="center" style="padding: 40px 30px 24px; background: linear-gradient(135deg, #FFF5F4 0%, #FFFFFF 100%);">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #E8403A; line-height: 1;">BOLIGO</h1>
                    <p style="margin: 6px 0 0; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #918780; text-transform: uppercase;">Sécurité du compte</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 10px 36px 36px;">
                    <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #14100E; text-align: center;">
                      Nouveau mot de passe
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #5C534C; text-align: center;">
                      Vous avez demandé la réinitialisation de votre mot de passe. Utilisez le code suivant pour sécuriser votre compte :
                    </p>

                    <!-- Code Box -->
                    <div style="background: linear-gradient(135deg, rgba(232,64,58,0.06), rgba(124,92,232,0.06)); border: 1.5px dashed rgba(232,64,58,0.35); border-radius: 16px; padding: 22px 16px; text-align: center; margin: 0 0 24px;">
                      <span style="font-family: monospace, Courier; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #E8403A; padding-left: 12px;">
                        ${code}
                      </span>
                    </div>

                    <p style="margin: 0 0 8px; font-size: 12.5px; color: #918780; text-align: center;">
                      ⏱️ Ce code expire dans <strong style="color: #5C534C;">15 minutes</strong>.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #FAF9F8; border-top: 1px solid rgba(20, 16, 14, 0.05); text-align: center;">
                    <p style="margin: 0; font-size: 10px; color: #918780;">
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
}
