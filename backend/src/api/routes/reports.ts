/**
 * Report Routes
 * HTTP routes for report generation
 */

import { Router } from 'express';
import { ReportController } from '../controllers/report-controller';

const router = Router();
const controller = new ReportController();

// Individual activity report (authenticated users)
router.get('/my-activity', controller.generateMyActivityReport.bind(controller));

// Organization-wide report (leads only)
router.get('/organization', controller.generateOrganizationReport.bind(controller));

// Custom report with filters
router.get('/custom', controller.generateCustomReport.bind(controller));

// Team member AI-powered report (leads only)
router.post('/team-member', controller.generateTeamMemberReport.bind(controller));

// Team member AI-powered report as PDF (leads only)
router.post('/team-member-pdf', controller.generateTeamMemberReportPDF.bind(controller));

export default router;
