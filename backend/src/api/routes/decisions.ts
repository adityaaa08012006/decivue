/**
 * Decision Routes
 * HTTP routes for decision operations
 */

import { Router } from 'express';
import { DecisionController } from '../controllers/decision-controller';

const router = Router();
const controller = new DecisionController();

// Bind methods to preserve 'this' context
router.get('/', controller.getAll.bind(controller));
router.post('/batch-evaluate', controller.batchEvaluate.bind(controller)); // Batch evaluation (before /:id routes)

// Governance endpoints (must be before /:id routes)
router.get('/governance/pending-approvals', controller.getPendingApprovals.bind(controller));
router.post('/governance/approve-edit/:auditId', controller.resolveEditRequest.bind(controller));

// Individual decision routes
router.get('/:id', controller.getById.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));
router.put('/:id/retire', controller.retire.bind(controller));
router.post('/:id/evaluate', controller.evaluate.bind(controller));
router.put('/:id/mark-reviewed', controller.markReviewed.bind(controller));

// Version control endpoints
router.get('/:id/versions', controller.getVersionHistory.bind(controller));
router.get('/:id/relation-history', controller.getRelationHistory.bind(controller));
router.get('/:id/health-history', controller.getHealthHistory.bind(controller));
router.get('/:id/timeline', controller.getTimeline.bind(controller));

// Review intelligence endpoints
router.get('/:id/review-urgency', controller.getReviewUrgency.bind(controller));
router.post('/:id/recalculate-urgency', controller.recalculateUrgency.bind(controller));

// Other governance mode endpoints
router.post('/:id/check-edit-permission', controller.checkEditPermission.bind(controller));
router.post('/:id/request-edit-approval', controller.requestEditApproval.bind(controller));
router.get('/:id/governance-audit', controller.getGovernanceAudit.bind(controller));
router.post('/:id/toggle-lock', controller.toggleLock.bind(controller));
router.put('/:id/governance-settings', controller.updateGovernanceSettings.bind(controller));

export default router;
