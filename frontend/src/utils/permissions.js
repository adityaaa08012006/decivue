/**
 * Permission utilities for role-based access control
 */

export const canEditDecision = (user, decision) => {
  if (!user || !decision) return false;

  // Leads can edit any decision in their org
  if (user.role === 'lead') return true;

  // Members can only edit their own decisions
  return decision.createdBy === user.id || decision.created_by === user.id;
};

export const canDeleteDecision = (user) => {
  // Only leads can delete decisions
  return user?.role === 'lead';
};

export const canRetireDecision = (user) => {
  // Only leads can retire decisions
  return user?.role === 'lead';
};

export const canReviewDecision = (user) => {
  // Only leads can review/acknowledge decisions
  return user?.role === 'lead';
};

export const canAcknowledgeDecision = (user) => {
  // Only leads can acknowledge decisions
  return user?.role === 'lead';
};

export const canCreateDecision = (user) => {
  // All authenticated users can create decisions
  return !!user;
};

export const isDecisionCreator = (user, decision) => {
  // Check if user created this decision
  return decision?.createdBy === user?.id || decision?.created_by === user?.id;
};
