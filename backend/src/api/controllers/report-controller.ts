/**
 * Report Controller
 * Handles HTTP requests for report generation
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth';
import { getAuthenticatedDatabase, getAdminDatabase } from '@data/database';
import { ReportDataAggregator } from '../../services/report-data-aggregator';
import { ReportGenerator } from '../../services/report-generator';
import { TeamReportDataAggregator } from '../../services/team-report-data-aggregator';
import { LLMService } from '../../services/llm-service';
import { logger } from '@utils/logger';

export class ReportController {
  /**
   * GET /api/reports/my-activity
   * Generate individual activity report (user's own decisions/assumptions)
   */
  async generateMyActivityReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      logger.info(`Generating individual activity report for user ${req.user.id}`);

      // Use authenticated database so RLS applies
      const db = getAuthenticatedDatabase(req.accessToken!);

      const aggregator = new ReportDataAggregator(db);
      const reportData = await aggregator.aggregateReportData({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        includeArchived: false,
      });

      const generator = new ReportGenerator();
      const pdfStream = generator.generatePDF(reportData);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="decivue-my-activity-${Date.now()}.pdf"`);

      // Pipe PDF stream to response
      pdfStream.pipe(res);

      logger.info(`Individual activity report generated successfully for user ${req.user.id}`);
    } catch (error) {
      logger.error('Failed to generate individual activity report', { error });
      next(error);
    }
  }

  /**
   * GET /api/reports/organization
   * Generate organization-wide report (all team data)
   * REQUIRES: Organization Lead role
   */
  async generateOrganizationReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is organization lead
      if (req.user.role !== 'lead') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only organization leads can generate organization-wide reports',
        });
      }

      logger.info(`Generating organization report for org ${req.user.organizationId}`);

      // Use authenticated database so RLS applies
      const db = getAuthenticatedDatabase(req.accessToken!);

      const aggregator = new ReportDataAggregator(db);
      const reportData = await aggregator.aggregateReportData({
        organizationId: req.user.organizationId,
        includeArchived: false,
        // No userId - fetch all organization data
      });

      const generator = new ReportGenerator();
      const pdfStream = generator.generatePDF(reportData);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="decivue-org-report-${Date.now()}.pdf"`);

      // Pipe PDF stream to response
      pdfStream.pipe(res);

      logger.info(`Organization report generated successfully for org ${req.user.organizationId}`);
    } catch (error) {
      logger.error('Failed to generate organization report', { error });
      next(error);
    }
  }

  /**
   * GET /api/reports/custom
   * Generate custom report with date range filters
   * REQUIRES: Organization Lead role for org-wide, otherwise user's own data
   */
  async generateCustomReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { startDate, endDate, includeArchived } = req.query;

      // Determine if this is individual or org-wide based on role
      const isOrgWide = req.user.role === 'lead';
      const userId = isOrgWide ? undefined : req.user.id;

      logger.info(`Generating custom report for ${isOrgWide ? 'organization' : 'user'}`);

      const db = getAuthenticatedDatabase(req.accessToken!);

      const aggregator = new ReportDataAggregator(db);
      const reportData = await aggregator.aggregateReportData({
        userId,
        organizationId: req.user.organizationId,
        includeArchived: includeArchived === 'true',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      const generator = new ReportGenerator();
      const pdfStream = generator.generatePDF(reportData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="decivue-custom-report-${Date.now()}.pdf"`);

      pdfStream.pipe(res);

      logger.info(`Custom report generated successfully`);
    } catch (error) {
      logger.error('Failed to generate custom report', { error });
      next(error);
    }
  }

  /**
   * POST /api/reports/team-member
   * Generate AI-powered performance report for a team member
   * REQUIRES: Organization Lead role
   * 
   * Request body:
   * - userId: Team member's user ID
   * - startDate (optional): Start date (defaults to 30 days ago)
   * - endDate (optional): End date (defaults to now)
   */
  async generateTeamMemberReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is organization lead
      if (req.user.role !== 'lead') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only organization leads can generate team member reports',
        });
      }

      const { userId, startDate, endDate } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      // Default to last 30 days if no date range provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      logger.info(`Generating team member report for user ${userId} from ${start} to ${end}`);

      // Use admin database to bypass RLS for user lookup
      const adminDb = getAdminDatabase();

      // Check if user is in the same organization
      const { data: targetUser } = await adminDb
        .from('users')
        .select('id, organization_id, full_name, email')
        .eq('id', userId)
        .eq('organization_id', req.user.organizationId)
        .single();

      if (!targetUser) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User not found in your organization',
        });
      }

      const userName = targetUser.full_name || targetUser.email;

      // Now use authenticated database for the rest of the queries
      const db = getAuthenticatedDatabase(req.accessToken!);

      // Check for cached report (valid for 24 hours)
      const { data: cachedReport } = await db
        .from('team_member_reports')
        .select('*')
        .eq('organization_id', req.user.organizationId)
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (cachedReport) {
        logger.info(`Returning cached report for user ${userId}`);
        return res.json({
          report: cachedReport.report_markdown,
          generatedAt: cachedReport.generated_at,
          metricsSnapshot: cachedReport.metrics_snapshot,
          cached: true,
        });
      }

      // Generate new report
      logger.info(`No cached report found, generating new report for user ${userId}`);

      const aggregator = new TeamReportDataAggregator(db);
      const metrics = await aggregator.aggregateTeamMemberMetrics(
        userId,
        userName,
        req.user.organizationId,
        start,
        end
      );

      const llmService = new LLMService();
      const reportMarkdown = await llmService.generateTeamMemberReport(metrics);

      // Cache the report
      const { error: insertError } = await db
        .from('team_member_reports')
        .insert({
          organization_id: req.user.organizationId,
          user_id: userId,
          generated_by: req.user.id,
          report_markdown: reportMarkdown,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          metrics_snapshot: {
            totalDecisions: metrics.decisionPatterns.totalDecisions,
            averageHealthSignal: metrics.decisionPatterns.averageHealthSignal,
            riskManagementScore: metrics.assumptionsUsage.riskManagementScore,
            proactivityScore: metrics.performanceInsights.proactivityScore,
          },
        });

      if (insertError) {
        logger.error('Failed to cache report', { error: insertError });
        // Continue anyway, don't fail the request
      }

      logger.info(`Team member report generated successfully for user ${userId}`);

      res.json({
        report: reportMarkdown,
        generatedAt: new Date().toISOString(),
        metricsSnapshot: {
          totalDecisions: metrics.decisionPatterns.totalDecisions,
          averageHealthSignal: metrics.decisionPatterns.averageHealthSignal,
          riskManagementScore: metrics.assumptionsUsage.riskManagementScore,
          proactivityScore: metrics.performanceInsights.proactivityScore,
        },
        cached: false,
      });
    } catch (error) {
      logger.error('Failed to generate team member report', { error });
      next(error);
    }
  }
}
