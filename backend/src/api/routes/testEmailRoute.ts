import express from 'express';
import decisionAlertTemplate from '@templates/decisionAlertTemplate';
import { sendEmail } from '@services/emailService';
import { logger } from '@utils/logger';

const router = express.Router();

/**
 * POST /api/test-email
 * Sends a test email. Accepts email in body.
 * Note: Auth/users table will be added later - for now accepts email directly
 */
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'Missing email in request body' });

    const html = decisionAlertTemplate({
      title: 'Decivue — Test email',
      decisionName: 'Test decision',
      message: 'This is a test notification email from Decivue.'
    });

    await sendEmail(email, 'Decivue — Test notification', html);

    return res.json({ ok: true });
  } catch (err: any) {
    logger.error('test-email route failed', { message: err?.message || err });
    return res.status(500).json({ ok: false, error: 'FailedToSendTestEmail' });
  }
});

export default router;
