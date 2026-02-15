/**
 * LLM Service
 * Handles communication with Google Gemini API for report generation
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '@utils/logger';

export interface TeamMemberMetrics {
  userId: string;
  userName: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  
  // Decision patterns
  decisionPatterns: {
    totalDecisions: number;
    lifecycleDistribution: {
      STABLE: number;
      UNDER_REVIEW: number;
      AT_RISK: number;
      INVALIDATED: number;
      RETIRED: number;
    };
    averageHealthSignal: number;
    frequencyTrend: string; // "increasing" | "stable" | "decreasing"
    qualityTrend: string; // "improving" | "stable" | "declining"
  };
  
  // Assumptions & constraints
  assumptionsUsage: {
    totalAssumptionsCreated: number;
    assumptionStatusDistribution: {
      VALID: number;
      SHAKY: number;
      BROKEN: number;
    };
    averageValidationTime: number; // days
    riskManagementScore: number; // 0-100
  };
  
  // Collaboration metrics
  collaborationMetrics: {
    conflictsInvolved: number;
    conflictsResolved: number;
    violationsDetected: number;
    dependenciesCreated: number;
    reviewsPerformed: number;
  };
  
  // Performance insights
  performanceInsights: {
    averageTimeToDecision: number; // days
    reviewFrequency: number; // reviews per month
    invalidationRate: number; // percentage
    proactivityScore: number; // 0-100
  };
}

export class LLMService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Use Gemini 1.5 Flash for fast, efficient generation
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
    
    logger.info('LLM Service initialized with Google Gemini');
  }
  
  /**
   * Generate a comprehensive performance report for a team member
   * @param metrics Team member performance metrics
   * @returns Markdown-formatted report
   */
  async generateTeamMemberReport(metrics: TeamMemberMetrics): Promise<string> {
    try {
      logger.info(`Generating report for user ${metrics.userId}`);
      
      const prompt = this.buildReportPrompt(metrics);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const report = response.text();
      
      logger.info(`Report generated successfully for user ${metrics.userId}`);
      
      return report;
    } catch (error) {
      logger.error('Failed to generate report with Gemini API', { error });
      throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Build the prompt for the LLM
   */
  private buildReportPrompt(metrics: TeamMemberMetrics): string {
    const { userName, dateRange, decisionPatterns, assumptionsUsage, collaborationMetrics, performanceInsights } = metrics;
    
    const startDate = dateRange.start.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const endDate = dateRange.end.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return `You are an expert organizational analyst specializing in decision-making systems. Generate a comprehensive performance report for a team member based on their activity in a decision monitoring platform.

**Team Member:** ${userName}
**Report Period:** ${startDate} - ${endDate}

## Raw Metrics Data

### Decision Patterns
- Total Decisions: ${decisionPatterns.totalDecisions}
- Lifecycle Distribution:
  - Stable: ${decisionPatterns.lifecycleDistribution.STABLE}
  - Under Review: ${decisionPatterns.lifecycleDistribution.UNDER_REVIEW}
  - At Risk: ${decisionPatterns.lifecycleDistribution.AT_RISK}
  - Invalidated: ${decisionPatterns.lifecycleDistribution.INVALIDATED}
  - Retired: ${decisionPatterns.lifecycleDistribution.RETIRED}
- Average Health Signal: ${decisionPatterns.averageHealthSignal}/100
- Decision Frequency Trend: ${decisionPatterns.frequencyTrend}
- Decision Quality Trend: ${decisionPatterns.qualityTrend}

### Assumptions & Constraints Usage
- Total Assumptions Created: ${assumptionsUsage.totalAssumptionsCreated}
- Assumption Status Distribution:
  - Valid: ${assumptionsUsage.assumptionStatusDistribution.VALID}
  - Shaky: ${assumptionsUsage.assumptionStatusDistribution.SHAKY}
  - Broken: ${assumptionsUsage.assumptionStatusDistribution.BROKEN}
- Average Validation Time: ${assumptionsUsage.averageValidationTime.toFixed(1)} days
- Risk Management Score: ${assumptionsUsage.riskManagementScore}/100

### Collaboration Metrics
- Conflicts Involved: ${collaborationMetrics.conflictsInvolved}
- Conflicts Resolved: ${collaborationMetrics.conflictsResolved}
- Violations Detected: ${collaborationMetrics.violationsDetected}
- Dependencies Created: ${collaborationMetrics.dependenciesCreated}
- Reviews Performed: ${collaborationMetrics.reviewsPerformed}

### Performance Insights
- Average Time to Decision: ${performanceInsights.averageTimeToDecision.toFixed(1)} days
- Review Frequency: ${performanceInsights.reviewFrequency.toFixed(1)} reviews/month
- Invalidation Rate: ${performanceInsights.invalidationRate.toFixed(1)}%
- Proactivity Score: ${performanceInsights.proactivityScore}/100

---

## Instructions

Generate a comprehensive, professional performance report in **Markdown format** with the following structure:

1. **Executive Summary** (2-3 paragraphs)
   - Overall performance assessment
   - Key strengths and areas for improvement
   - High-level trends

2. **Decision-Making Patterns**
   - Analysis of decision lifecycle distribution
   - Quality trends and health signals
   - Decision frequency patterns
   - Notable patterns or concerns

3. **Risk Management & Assumptions**
   - Assumption creation and validation practices
   - Risk management effectiveness
   - Reasoning quality assessment
   - Recommendations for improvement

4. **Collaboration & Teamwork**
   - Conflict resolution capabilities
   - Dependency management
   - Peer review participation
   - Team contribution level

5. **Performance Highlights**
   - Key metrics summary
   - Standout achievements
   - Areas of excellence

6. **Areas for Development**
   - Specific improvement opportunities
   - Actionable recommendations
   - Skills to develop

7. **Overall Rating & Conclusion**
   - Holistic performance assessment
   - Future outlook
   - Final thoughts

**Style Guidelines:**
- Be professional, constructive, and balanced
- Use bullet points and subheadings for clarity
- Highlight both strengths and areas for growth
- Provide specific, actionable insights
- Use emojis sparingly for visual appeal (✅ ⚠️ 📊 🎯 💡)
- Keep language positive and encouraging
- Be data-driven in your analysis

Generate the report now:`;
  }
  
  /**
   * Test the Gemini API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hello, Gemini!');
      const response = await result.response;
      const text = response.text();
      
      logger.info('Gemini API connection test successful', { response: text });
      return true;
    } catch (error) {
      logger.error('Gemini API connection test failed', { error });
      return false;
    }
  }
}
