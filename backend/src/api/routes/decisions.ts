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
router.get('/:id', controller.getById.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));
router.put('/:id/retire', controller.retire.bind(controller));
router.post('/batch-evaluate', controller.batchEvaluate.bind(controller)); // Batch evaluation (before /:id routes)
router.post('/:id/evaluate', controller.evaluate.bind(controller));
router.put('/:id/mark-reviewed', controller.markReviewed.bind(controller));

// Version control endpoints
router.get('/:id/versions', controller.getVersionHistory.bind(controller));
router.get('/:id/relation-history', controller.getRelationHistory.bind(controller));
router.get('/:id/health-history', controller.getHealthHistory.bind(controller));
router.get('/:id/timeline', controller.getTimeline.bind(controller));

export default router;
