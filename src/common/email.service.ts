import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  private async dispatchEmail(to: string, subject: string, html: string) {
    const resendKey = process.env.RESEND_API_KEY;
    const sendgridKey = process.env.SENDGRID_API_KEY;

    // 1. Resend API
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
        } else {
          const data = await response.json();
          console.log(`[EMAIL] Email sent successfully via Resend to ${to}. ID: ${data.id}`);
          return;
        }
      } catch (error) {
        console.error('[EMAIL] Failed to send email via Resend:', error);
      }
    }

    // 2. SendGrid API Fallback
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

    // 3. Mode Simulation dans la console
    console.log('\n==================================================');
    console.log(`✉️ [EMAIL SIMULATED] To: ${to}`);
    console.log(`✉️ [EMAIL SIMULATED] Subject: ${subject}`);
    console.log('==================================================\n');
  }

  async sendVerificationEmail(email: string, code: string) {
    const subject = 'Confirmez votre adresse email - BOLIGO';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #FF4D67; text-align: center;">Bienvenue sur BOLIGO</h2>
        <p>Bonjour,</p>
        <p>Merci de vous être inscrit sur BOLIGO. Pour finaliser la création de votre compte, veuillez saisir le code de vérification ci-dessous dans l'application :</p>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0; border-radius: 5px; border: 1px dashed #FF4D67;">
          ${code}
        </div>
        <p>Ce code est valable pendant 15 minutes.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">L'équipe BOLIGO</p>
      </div>
    `;

    await this.dispatchEmail(email, subject, html);
  }

  async sendPasswordResetEmail(email: string, code: string) {
    const subject = 'Réinitialisation de votre mot de passe - BOLIGO';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #FF4D67; text-align: center;">Réinitialisation de votre mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe sur l'application BOLIGO.</p>
        <p>Veuillez utiliser le code à 6 chiffres ci-dessous pour créer un nouveau mot de passe :</p>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #FF4D67; margin: 20px 0; border-radius: 5px; border: 1px dashed #FF4D67;">
          ${code}
        </div>
        <p>Ce code expire dans <strong>15 minutes</strong>.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel restera inchangé.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">L'équipe BOLIGO</p>
      </div>
    `;

    await this.dispatchEmail(email, subject, html);
  }
}
