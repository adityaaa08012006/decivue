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
router.post('/:id/evaluate', controller.evaluate.bind(controller));
router.put('/:id/mark-reviewed', controller.markReviewed.bind(controller));

export default router;
