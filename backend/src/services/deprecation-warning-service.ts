/**
 * Deprecation Warning Service
 * Detects when a new decision has similar parameters to deprecated decisions that failed
 * Provides warnings to users to help them avoid repeating past mistakes
 */

import { getDatabase } from '../data/database';
import { logger } from '../utils/logger';

export interface DeprecatedDecision {
  id: string;
  title: string;
  description: string;
  category?: string;
  parameters?: Record<string, any>;
  deprecation_outcome?: string;
  deprecation_conclusions?: {
    what_happened?: string;
    why_outcome?: string;
    lessons_learned?: string[];
    key_issues?: string[];
    recommendations?: string[];
    failure_reasons?: string[];
  };
  created_at: string;
}

export interface SimilarityWarning {
  deprecatedDecisionId: string;
  deprecatedDecisionTitle: string;
  similarityScore: number; // 0-1, how similar the parameters are
  matchingParameters: string[]; // Which parameters matched
  failureReasons?: string[]; // Why the deprecated decision failed
  lessons?: string[]; // Lessons learned from the failure
  recommendations?: string[]; // What to do differently
  warningMessage: string; // Human-readable warning
}

export class DeprecationWarningService {
  /**
   * Check if a decision with given parameters is similar to any failed deprecated decisions
   */
  static async checkForSimilarFailures(
    organizationId: string,
    category?: string,
    parameters?: Record<string, any>
  ): Promise<SimilarityWarning[]> {
    try {
      const db = getDatabase();

      // Get all failed deprecated decisions in the same organization
      const { data: deprecatedDecisions, error } = await db
        .from('decisions')
        .select('id, title, description, category, parameters, deprecation_outcome, deprecation_conclusions, created_at')
        .eq('organization_id', organizationId)
        .in('lifecycle', ['RETIRED', 'INVALIDATED'])
        .eq('deprecation_outcome', 'failed');

      if (error) {
        logger.error('Failed to fetch deprecated decisions', { error });
        return [];
      }

      if (!deprecatedDecisions || deprecatedDecisions.length === 0) {
        return [];
      }

      const warnings: SimilarityWarning[] = [];

      // Check each deprecated decision for similarity
      for (const deprecated of deprecatedDecisions) {
        const similarity = this.calculateSimilarity(category, parameters, deprecated);
        
        // Only warn if similarity is significant (>= 60%)
        if (similarity.score >= 0.6) {
          const warning: SimilarityWarning = {
            deprecatedDecisionId: deprecated.id,
            deprecatedDecisionTitle: deprecated.title,
            similarityScore: similarity.score,
            matchingParameters: similarity.matchingParams,
            failureReasons: deprecated.deprecation_conclusions?.failure_reasons || 
                           deprecated.deprecation_conclusions?.key_issues,
            lessons: deprecated.deprecation_conclusions?.lessons_learned,
            recommendations: deprecated.deprecation_conclusions?.recommendations,
            warningMessage: this.generateWarningMessage(
              deprecated,
              similarity.score,
              similarity.matchingParams
            )
          };
          warnings.push(warning);
        }
      }

      // Sort by similarity score (highest first)
      warnings.sort((a, b) => b.similarityScore - a.similarityScore);

      if (warnings.length > 0) {
        logger.info('Similar failed decisions detected', {
          organizationId,
          category,
          warningCount: warnings.length
        });
      }

      return warnings;
    } catch (error) {
      logger.error('Error checking for similar failures', { error });
      return [];
    }
  }

  /**
   * Calculate similarity between new decision parameters and a deprecated decision
   */
  private static calculateSimilarity(
    newCategory?: string,
    newParameters?: Record<string, any>,
    deprecated?: DeprecatedDecision
  ): { score: number; matchingParams: string[] } {
    let score = 0;
    const matchingParams: string[] = [];
    let totalChecks = 0;

    // Category match is worth 40% if both have categories
    if (newCategory && deprecated?.category) {
      totalChecks++;
      if (newCategory === deprecated.category) {
        score += 0.4;
        matchingParams.push(`category: ${newCategory}`);
      }
    }

    // Parameters match
    if (newParameters && deprecated?.parameters) {
      const newKeys = Object.keys(newParameters);
      const deprecatedKeys = Object.keys(deprecated.parameters);
      
      // Find common keys
      const commonKeys = newKeys.filter(key => deprecatedKeys.includes(key));
      
      if (commonKeys.length > 0) {
        let paramMatches = 0;
        const totalParams = commonKeys.length;

        for (const key of commonKeys) {
          totalChecks++;
          const newValue = newParameters[key];
          const depValue = deprecated.parameters[key];

          // Check if values match (handle different types)
          if (this.valuesMatch(newValue, depValue)) {
            paramMatches++;
            matchingParams.push(`${key}: ${JSON.stringify(newValue)}`);
          }
        }

        // Parameters are worth 60% of the score
        score += (paramMatches / totalParams) * 0.6;
      }
    }

    // If no checks were made (no category or parameters), return 0 similarity
    if (totalChecks === 0) {
      return { score: 0, matchingParams: [] };
    }

    return { score, matchingParams };
  }

  /**
   * Check if two parameter values match (handles various types)
   */
  private static valuesMatch(value1: any, value2: any): boolean {
    // Exact match
    if (value1 === value2) return true;

    // String comparison (case-insensitive)
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() === value2.toLowerCase();
    }

    // Array comparison (check if arrays have significant overlap)
    if (Array.isArray(value1) && Array.isArray(value2)) {
      const overlap = value1.filter(v => value2.includes(v));
      return overlap.length >= Math.min(value1.length, value2.length) * 0.7; // 70% overlap
    }

    // Object comparison (as JSON string)
    if (typeof value1 === 'object' && typeof value2 === 'object' && value1 && value2) {
      return JSON.stringify(value1) === JSON.stringify(value2);
    }

    return false;
  }

  /**
   * Generate a human-readable warning message
   */
  private static generateWarningMessage(
    deprecated: DeprecatedDecision,
    score: number,
    matchingParams: string[]
  ): string {
    const similarityPercent = Math.round(score * 100);
    const paramList = matchingParams.slice(0, 3).join(', '); // Show up to 3 matching params
    
    let message = `⚠️ Warning: This decision is ${similarityPercent}% similar to a previous decision that failed: "${deprecated.title}"`;
    
    if (matchingParams.length > 0) {
      message += `\n\nMatching parameters: ${paramList}`;
      if (matchingParams.length > 3) {
        message += `, and ${matchingParams.length - 3} more`;
      }
    }

    // Add failure reasons if available
    const conclusions = deprecated.deprecation_conclusions;
    if (conclusions?.failure_reasons && conclusions.failure_reasons.length > 0) {
      message += `\n\nThe previous decision failed because:\n${conclusions.failure_reasons.map(r => `• ${r}`).join('\n')}`;
    } else if (conclusions?.key_issues && conclusions.key_issues.length > 0) {
      message += `\n\nKey issues from the previous decision:\n${conclusions.key_issues.map(i => `• ${i}`).join('\n')}`;
    } else if (conclusions?.why_outcome) {
      message += `\n\nReason: ${conclusions.why_outcome}`;
    }

    // Add recommendations if available
    if (conclusions?.recommendations && conclusions.recommendations.length > 0) {
      message += `\n\nRecommendations:\n${conclusions.recommendations.map(r => `• ${r}`).join('\n')}`;
    }

    return message;
  }
}
