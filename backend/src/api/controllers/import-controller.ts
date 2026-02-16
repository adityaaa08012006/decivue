/**
 * Import Controller
 * Handles decision import from documents and templates
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { DecisionRepository } from '../../data/repositories/decision-repository';
import { getAdminDatabase } from '../../data/database';
import { logger } from '../../utils/logger';

interface ExtractedDecision {
  title: string;
  description?: string;
  category?: string;
  assumptions?: string[];
  constraints?: string[];
  expiryDate?: string;
  confidence?: number;
}

export class ImportController {
  /**
   * POST /api/decisions/import/parse
   * Extract decisions from uploaded document using AI
   */
  async parseDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      logger.info(`Parsing document: ${file.originalname} (${file.mimetype})`);

      // Extract text from document based on file type
      let text = '';
      
      if (file.mimetype === 'application/pdf') {
        text = await this.extractFromPDF(file.buffer);
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await this.extractFromDOCX(file.buffer);
      } else if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
        text = file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      // Use AI to extract structured decisions
      const extractedDecisions = await this.extractDecisionsWithAI(text);

      logger.info(`Extracted ${extractedDecisions.length} decisions from document`);

      return res.json({ 
        decisions: extractedDecisions,
        source: file.originalname 
      });
    } catch (error) {
      logger.error('Error parsing document:', error);
      return next(error);
    }
  }

  /**
   * POST /api/decisions/import/template
   * Parse decisions from CSV/Excel template
   */
  async parseTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      logger.info(`Parsing template: ${file.originalname} (${file.mimetype})`);

      // Parse CSV file
      const decisions = await this.parseCSV(file.buffer);

      logger.info(`Parsed ${decisions.length} decisions from template`);

      return res.json({ 
        decisions,
        source: file.originalname 
      });
    } catch (error) {
      logger.error('Error parsing template:', error);
      return next(error);
    }
  }

  /**
   * POST /api/decisions/import/bulk
   * Bulk create validated decisions
   */
  async bulkImport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { decisions } = req.body;
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!decisions || !Array.isArray(decisions) || decisions.length === 0) {
        return res.status(400).json({ error: 'No decisions provided' });
      }

      const db = getAdminDatabase();
      const decisionRepo = new DecisionRepository(db);

      const results = {
        created: [] as any[],
        failed: [] as any[],
      };

      // Process each decision
      for (const decisionData of decisions) {
        try {
          // Extract assumptions from the decision data
          const assumptions = decisionData.assumptions || [];
          delete decisionData.assumptions;

          // Create the decision
          const newDecision = await decisionRepo.create({
            title: decisionData.title,
            description: decisionData.description || '',
            lifecycle: 'STABLE',
            health_signal: 100,
            metadata: {
              category: decisionData.category || null,
            },
            expiry_date: decisionData.expiryDate || null,
            organization_id: organizationId,
            created_by: userId,
          } as any);

          // Create or link assumptions
          const assumptionIds: string[] = [];
          for (const assumptionText of assumptions) {
            if (!assumptionText || typeof assumptionText !== 'string') continue;
            
            // Check if assumption already exists (by description)
            const { data: existing } = await db
              .from('assumptions')
              .select('id')
              .eq('description', assumptionText.trim())
              .eq('organization_id', organizationId)
              .single();
            
            let assumptionId: string;
            if (existing) {
              assumptionId = existing.id;
            } else {
              // Create new assumption
              const { data: newAssumption, error: createError } = await db
                .from('assumptions')
                .insert({
                  description: assumptionText.trim(),
                  status: 'VALID',
                  scope: 'UNIVERSAL',
                  organization_id: organizationId,
                })
                .select()
                .single();
              
              if (createError) throw createError;
              assumptionId = newAssumption.id;
            }
            
            assumptionIds.push(assumptionId);
          }

          // Link assumptions to decision
          if (assumptionIds.length > 0) {
            const links = assumptionIds.map(aid => ({
              decision_id: newDecision.id,
              assumption_id: aid,
            }));
            
            const { error: linkError } = await db
              .from('decision_assumptions')
              .insert(links);
            
            if (linkError) throw linkError;
          }

          results.created.push({
            id: newDecision.id,
            title: newDecision.title,
            assumptionsLinked: assumptionIds.length,
          });

          logger.info(`Imported decision: ${newDecision.title} with ${assumptionIds.length} assumptions`);
        } catch (error: any) {
          logger.error(`Failed to import decision ${decisionData.title}:`, error);
          results.failed.push({
            title: decisionData.title,
            error: error.message,
          });
        }
      }

      logger.info(`Bulk import completed: ${results.created.length} succeeded, ${results.failed.length} failed`);

      return res.json({
        success: true,
        created: results.created.length,
        failed: results.failed.length,
        details: results,
      });
    } catch (error) {
      logger.error('Error in bulk import:', error);
      return next(error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract text from PDF file
   */
  private async extractFromPDF(buffer: Buffer): Promise<string> {
    // TODO: Implement PDF extraction using pdf-parse
    // Placeholder for now
    try {
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      logger.error('PDF extraction error (pdf-parse not installed):', error);
      // Fallback: return empty string or throw error
      throw new Error('PDF parsing not available. Please install pdf-parse package.');
    }
  }

  /**
   * Extract text from DOCX file
   */
  private async extractFromDOCX(buffer: Buffer): Promise<string> {
    // TODO: Implement DOCX extraction using mammoth
    // Placeholder for now
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('DOCX extraction error (mammoth not installed):', error);
      throw new Error('DOCX parsing not available. Please install mammoth package.');
    }
  }

  /**
   * Parse CSV template
   */
  private async parseCSV(buffer: Buffer): Promise<ExtractedDecision[]> {
    // TODO: Implement CSV parsing using csv-parse
    // Placeholder for now
    try {
      const { parse } = require('csv-parse/sync');
      
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      return records.map((record: any) => ({
        title: record.title,
        description: record.description,
        category: record.category,
        assumptions: record.assumptions 
          ? record.assumptions.split(';').map((a: string) => a.trim()).filter(Boolean)
          : [],
        constraints: record.constraints 
          ? record.constraints.split(';').map((c: string) => c.trim()).filter(Boolean)
          : [],
        expiryDate: record.expiryDate || null,
      }));
    } catch (error) {
      logger.error('CSV parsing error (csv-parse not installed):', error);
      throw new Error('CSV parsing not available. Please install csv-parse package.');
    }
  }

  /**
   * Extract decisions using AI (temporary implementation)
   */
  private async extractDecisionsWithAI(text: string): Promise<ExtractedDecision[]> {
    try {
      // Check if we have Gemini API key
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        logger.warn('GEMINI_API_KEY not set - using fallback extraction');
        return this.fallbackExtraction(text);
      }

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are a decision analysis assistant. Extract explicit decisions from this document.

Document:
${text.substring(0, 10000)} 

Return ONLY a valid JSON array with this exact schema (no markdown, no code blocks):
[{
  "title": "Clear decision title",
  "description": "Full context and rationale",
  "category": "Strategic Initiative|Budget & Financial|Technical Initiative|Policy & Compliance|Operational",
  "assumptions": ["assumption 1", "assumption 2"],
  "confidence": 85
}]

Rules:
- Only extract explicit decisions, not suggestions or discussions
- Be concise but informative
- Include 2-5 underlying assumptions per decision
- Confidence is 0-100 (how certain you are this is a real decision)
- Return empty array [] if no decisions found
- Respond with ONLY the JSON array, nothing else`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let responseText = response.text();

      // Clean up response (remove code blocks if present)
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      logger.info('AI Response:', responseText.substring(0, 200));

      const decisions = JSON.parse(responseText);

      if (!Array.isArray(decisions)) {
        throw new Error('AI response is not an array');
      }

      return decisions;
    } catch (error: any) {
      logger.error('AI extraction error:', error);
      logger.warn('Falling back to basic extraction');
      return this.fallbackExtraction(text);
    }
  }

  /**
   * Fallback extraction when AI is not available
   */
  private fallbackExtraction(text: string): ExtractedDecision[] {
    const decisions: ExtractedDecision[] = [];
    
    // Simple heuristic: look for decision indicators
    const lines = text.split('\n');
    const decisionKeywords = ['decide', 'decision', 'chose', 'selected', 'approved', 'implement'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      if (decisionKeywords.some(keyword => line.includes(keyword))) {
        // Found a potential decision
        const title = lines[i].trim().substring(0, 200);
        
        if (title.length > 10) {
          decisions.push({
            title,
            description: lines.slice(i + 1, i + 3).join(' ').substring(0, 500),
            confidence: 50, // Low confidence for fallback
          });
        }
      }
    }

    return decisions.slice(0, 10); // Limit to 10 decisions
  }
}
