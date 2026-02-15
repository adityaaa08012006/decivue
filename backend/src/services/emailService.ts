import { Resend } from 'resend';
import { logger } from '@utils/logger';

// Lazy initialization to ensure environment variables are loaded first
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const resend = getResendClient();
    // Use Resend's test email for now - user can update later
    const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
    });

    if (result.error) {
      logger.error('Resend API error', { error: result.error, to, subject });
      throw new Error(`Resend API error: ${result.error.message}`);
    }

    logger.info('Email sent', { to, subject, emailId: result.data?.id });
  } catch (err: any) {
    logger.error('emailService.sendEmail error', { message: err?.message || err, to, subject });
    throw new Error(`FailedToSendEmail: ${err?.message || err}`);
  }
}

export default sendEmail;
