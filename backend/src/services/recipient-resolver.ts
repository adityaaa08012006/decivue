import { getDatabase } from '@data/database';
import { logger } from '@utils/logger';

export interface Recipient {
  id: string;
  email: string | null;
  email_notifications: any;
}

/**
 * Resolve eligible recipients for a decision-scoped notification.
 * - includes decision owner and collaborators (flexible schema handling)
 * - excludes the triggering user
 */
export async function resolveRecipients(decisionId: string, triggeredByUserId?: string): Promise<Recipient[]> {
  const db = getDatabase();

  try {
    const { data: decision, error: decErr } = await db.from('decisions').select('id, title, metadata, created_by').eq('id', decisionId).single();
    if (decErr || !decision) {
      logger.warn('resolveRecipients: decision not found', { decisionId, decErr });
      return [];
    }

    const candidateIds: string[] = [];

    // Try common owner fields
    if (decision.created_by) candidateIds.push(decision.created_by);
    if (decision.metadata && decision.metadata.ownerId) candidateIds.push(decision.metadata.ownerId);
    if (decision.metadata && decision.metadata.owner) candidateIds.push(decision.metadata.owner);

    // Try collaborators from metadata (array of uuids)
    if (decision.metadata && Array.isArray(decision.metadata.collaborators)) {
      candidateIds.push(...decision.metadata.collaborators);
    }

    // Fallback: check a join table decision_collaborators
    if (candidateIds.length === 0) {
      const { data: rows } = await db.from('decision_collaborators').select('user_id').eq('decision_id', decisionId);
      if (rows && rows.length) candidateIds.push(...rows.map((r: any) => r.user_id));
    }

    const uniq = Array.from(new Set(candidateIds.filter(Boolean)));
    const filtered = triggeredByUserId ? uniq.filter((id) => id !== triggeredByUserId) : uniq;
    if (filtered.length === 0) return [];

    // Fetch user records (users table will be added later)
    // For now, return empty array gracefully
    const { data: users, error: userErr } = await db.from('users').select('id, email, email_notifications').in('id', filtered as string[]);
    if (userErr) {
      // Users table doesn't exist yet - this is expected until auth is implemented
      logger.info('resolveRecipients: users table not available yet (auth pending)', { decisionId });
      return [];
    }

    return (users || []).map((u: any) => ({ id: u.id, email: u.email, email_notifications: u.email_notifications || {} }));
  } catch (err: any) {
    logger.error('resolveRecipients error', { message: err?.message || err });
    return [];
  }
}

export default resolveRecipients;
