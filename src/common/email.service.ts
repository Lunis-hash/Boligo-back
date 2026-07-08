import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
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

    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey && apiKey !== 'placeholder' && !apiKey.includes('placeholder')) {
      console.log(`[EMAIL] Sending real verification email to ${email} via SendGrid...`);
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: 'no-reply@harmonie.app', name: 'BOLIGO' },
            subject: subject,
            content: [{ type: 'text/html', value: html }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[EMAIL] SendGrid API error: ${response.status} - ${errText}`);
        } else {
          console.log(`[EMAIL] Verification email sent successfully to ${email}`);
        }
      } catch (error) {
        console.error('[EMAIL] Failed to send email via SendGrid:', error);
      }
    } else {
      console.log('\n==================================================');
      console.log(`✉️ [EMAIL SIMULATED] To: ${email}`);
      console.log(`✉️ [EMAIL SIMULATED] Subject: ${subject}`);
      console.log(`✉️ [EMAIL SIMULATED] Code: ${code}`);
      console.log('==================================================\n');
    }
  }
}
