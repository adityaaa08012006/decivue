/**
 * Decision Routes
 * HTTP routes for decision operations
 */

import { Router } from 'express';
import { DecisionController } from '../controllers/decision-controller';
import { ImportController } from '../controllers/import-controller';
import multer from 'multer';

const router = Router();
const controller = new DecisionController();
const importController = new ImportController();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|txt|md|docx|csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, MD, DOCX, CSV, and XLS files are allowed.'));
    }
  },
});

// Import endpoints (before other routes)
router.post('/import/parse', upload.single('document'), importController.parseDocument.bind(importController));
router.post('/import/template', upload.single('template'), importController.parseTemplate.bind(importController));
router.post('/import/bulk', importController.bulkImport.bind(importController));

// Bind methods to preserve 'this' context
router.get('/', controller.getAll.bind(controller));
router.post('/batch-evaluate', controller.batchEvaluate.bind(controller)); // Batch evaluation (before /:id routes)
router.post('/check-similar-failures', controller.checkSimilarFailures.bind(controller)); // Check for similar deprecated failures

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
