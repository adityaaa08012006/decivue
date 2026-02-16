/**
 * Assumption Conflict Detector
 * Detects potential conflicts between assumptions using structured data and NLP-like strategies
 */

import { logger } from '../utils/logger';

export interface Assumption {
  id: string;
  text: string;
  status: string;
  scope?: string;
  category?: string;
  parameters?: Record<string, any>;
}

export interface ConflictDetectionResult {
  conflictType: 'CONTRADICTORY' | 'MUTUALLY_EXCLUSIVE' | 'INCOMPATIBLE';
  confidenceScore: number; // 0.0 - 1.0
  reason: string;
}

export class AssumptionConflictDetector {
  // Antonym pairs for keyword-based detection
  private readonly antonymPairs = [
    ['increase', 'decrease'],
    ['more', 'less'],
    ['higher', 'lower'],
    ['grow', 'shrink'],
    ['rise', 'fall'],
    ['expand', 'contract'],
    ['improve', 'worsen'],
    ['gain', 'lose'],
    ['add', 'remove'],
    ['include', 'exclude'],
    ['enable', 'disable'],
    ['allow', 'prevent'],
    ['accept', 'reject'],
    ['success', 'failure'],
    ['positive', 'negative'],
    ['always', 'never'],
    ['all', 'none'],
    ['every', 'no'],
  ];

  /**
   * Detect conflicts between two assumptions
   */
  public detectConflict(assumptionA: Assumption, assumptionB: Assumption): ConflictDetectionResult | null {
    // Don't check an assumption against itself
    if (assumptionA.id === assumptionB.id) {
      return null;
    }

    // PRIORITY 1: Structured data detection (highest confidence)
    if (assumptionA.category && assumptionB.category && assumptionA.parameters && assumptionB.parameters) {
      const structuredResult = this.detectStructuredConflict(assumptionA, assumptionB);
      if (structuredResult) {
        logger.debug('Structured conflict detected', {
          assumptionA: assumptionA.id,
          assumptionB: assumptionB.id,
          confidence: structuredResult.confidenceScore,
        });
        return structuredResult;
      }
    }

    const textA = assumptionA.text.toLowerCase();
    const textB = assumptionB.text.toLowerCase();

    // Strategy 2: Negation detection
    const negationResult = this.detectNegationConflict(textA, textB);
    if (negationResult) {
      logger.debug('Negation conflict detected', {
        assumptionA: assumptionA.id,
        assumptionB: assumptionB.id,
        confidence: negationResult.confidenceScore,
      });
      return negationResult;
    }

    // Strategy 3: Antonym/keyword detection
    const keywordResult = this.detectKeywordConflict(textA, textB);
    if (keywordResult) {
      logger.debug('Keyword conflict detected', {
        assumptionA: assumptionA.id,
        assumptionB: assumptionB.id,
        confidence: keywordResult.confidenceScore,
      });
      return keywordResult;
    }

    // Strategy 4: Contextual similarity with contradictory sentiment
    const contextualResult = this.detectContextualConflict(textA, textB);
    if (contextualResult) {
      logger.debug('Contextual conflict detected', {
        assumptionA: assumptionA.id,
        assumptionB: assumptionB.id,
        confidence: contextualResult.confidenceScore,
      });
      return contextualResult;
    }

    return null;
  }

  /**
   * Detect conflicts in a list of assumptions (compare all pairs)
   */
  public detectConflictsInList(assumptions: Assumption[]): Array<{
    assumptionA: Assumption;
    assumptionB: Assumption;
    conflict: ConflictDetectionResult;
  }> {
    const conflicts: Array<{
      assumptionA: Assumption;
      assumptionB: Assumption;
      conflict: ConflictDetectionResult;
    }> = [];

    for (let i = 0; i < assumptions.length; i++) {
      for (let j = i + 1; j < assumptions.length; j++) {
        const conflict = this.detectConflict(assumptions[i], assumptions[j]);
        if (conflict && conflict.confidenceScore > 0.7) {
          conflicts.push({
            assumptionA: assumptions[i],
            assumptionB: assumptions[j],
            conflict,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * STRATEGY 1: Detect structured parameter conflicts (HIGHEST CONFIDENCE)
   * Uses category and parameters fields for deterministic conflict detection
   */
  private detectStructuredConflict(assumptionA: Assumption, assumptionB: Assumption): ConflictDetectionResult | null {
    // Only works if both have the same category
    if (assumptionA.category !== assumptionB.category) {
      return null;
    }

    const paramsA = assumptionA.parameters || {};
    const paramsB = assumptionB.parameters || {};

    // Budget & Financial conflicts
    if (assumptionA.category === 'Budget & Financial') {
      if (paramsA.amount && paramsB.amount && paramsA.timeframe === paramsB.timeframe) {
        // Different amounts for same timeframe = potential conflict
        if (paramsA.amount !== paramsB.amount) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.95,
            reason: `Different budget amounts specified for ${paramsA.timeframe}: ${paramsA.amount} vs ${paramsB.amount}`
          };
        }
      }

      // Check for contradictory outcome expectations
      if (paramsA.outcome && paramsB.outcome) {
        const opposites = [
          ['Approval Required', 'Approval Denied'],
          ['Funding Secured', 'Funding Rejected'],
          ['Budget Approved', 'Budget Rejected']
        ];
        
        for (const [outcome1, outcome2] of opposites) {
          if ((paramsA.outcome.includes(outcome1) && paramsB.outcome.includes(outcome2)) ||
              (paramsA.outcome.includes(outcome2) && paramsB.outcome.includes(outcome1))) {
            return {
              conflictType: 'CONTRADICTORY',
              confidenceScore: 0.98,
              reason: `Contradictory outcomes: "${paramsA.outcome}" vs "${paramsB.outcome}"`
            };
          }
        }
      }
    }

    // Timeline & Schedule conflicts
    if (assumptionA.category === 'Timeline & Schedule') {
      if (paramsA.timeframe === paramsB.timeframe && paramsA.outcome && paramsB.outcome) {
        // Same timeframe but different outcome expectations
        const incompatibleOutcomes = ['Deadline Met', 'Deadline Missed', 'Milestone Achieved', 'Milestone Failed'];
        const hasIncompatible = incompatibleOutcomes.some(o1 => 
          incompatibleOutcomes.some(o2 => 
            o1 !== o2 && paramsA.outcome.includes(o1) && paramsB.outcome.includes(o2)
          )
        );

        if (hasIncompatible) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.92,
            reason: `Incompatible timeline outcomes for ${paramsA.timeframe}: "${paramsA.outcome}" vs "${paramsB.outcome}"`
          };
        }
      }
    }

    // Resource & Staffing conflicts
    if (assumptionA.category === 'Resource & Staffing') {
      if (paramsA.resourceType === paramsB.resourceType && paramsA.timeframe === paramsB.timeframe) {
        // Check for contradictory availability
        if (paramsA.outcome && paramsB.outcome) {
          if ((paramsA.outcome.includes('Available') && paramsB.outcome.includes('Unavailable')) ||
              (paramsA.outcome.includes('Unavailable') && paramsB.outcome.includes('Available'))) {
            return {
              conflictType: 'CONTRADICTORY',
              confidenceScore: 0.96,
              reason: `Contradictory resource availability for ${paramsA.resourceType} in ${paramsA.timeframe}`
            };
          }
        }
      }
    }

    // Impact Area conflicts - check if they target same area with opposite directions
    if (paramsA.impactArea && paramsB.impactArea && paramsA.impactArea === paramsB.impactArea) {
      // Check for explicitly opposite directions
      if (paramsA.direction && paramsB.direction) {
        const dirA = paramsA.direction.toLowerCase();
        const dirB = paramsB.direction.toLowerCase();
        
        if (dirA !== dirB) {
          const oppositeDirections = [
            ['increase', 'decrease'],
            ['improve', 'worsen'],
            ['positive', 'negative'],
            ['up', 'down']
          ];

          let isOpposite = false;
          for (const [dir1, dir2] of oppositeDirections) {
            if ((dirA.includes(dir1) && dirB.includes(dir2)) ||
                (dirA.includes(dir2) && dirB.includes(dir1))) {
              isOpposite = true;
              break;
            }
          }

          if (isOpposite) {
            return {
              conflictType: 'CONTRADICTORY',
              confidenceScore: 0.94,
              reason: `Opposite impact directions on ${paramsA.impactArea}: ${paramsA.direction} vs ${paramsB.direction}`
            };
          }
        }
      }
      
      // Even without explicit directions, if both target the same impact area,
      // check the assumption text for contradictory keywords
      const textA = assumptionA.text.toLowerCase();
      const textB = assumptionB.text.toLowerCase();
      
      // Look for contradictory keywords in the text
      const contradictoryPairs = [
        ['increase', 'decrease'],
        ['grow', 'shrink'],
        ['rise', 'fall'],
        ['improve', 'decline'],
        ['gain', 'lose'],
        ['up', 'down'],
        ['higher', 'lower'],
        ['more', 'less']
      ];
      
      for (const [word1, word2] of contradictoryPairs) {
        if ((textA.includes(word1) && textB.includes(word2)) ||
            (textA.includes(word2) && textB.includes(word1))) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.88,
            reason: `Contradictory impact predictions for ${paramsA.impactArea}: "${word1}" vs "${word2}"`
          };
        }
      }
    }

    // BUDGET conflicts (uppercase category)
    if (assumptionA.category === 'BUDGET') {
      // Check for budget range conflicts (min/max)
      if (paramsA.type && paramsB.type && paramsA.budget !== undefined && paramsB.budget !== undefined) {
        // Maximum budget less than minimum budget
        if (paramsA.type === 'maximum' && paramsB.type === 'minimum' && paramsA.budget < paramsB.budget) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.99,
            reason: `Maximum budget (${paramsA.currency || '$'}${paramsA.budget}) is less than minimum budget (${paramsB.currency || '$'}${paramsB.budget})`
          };
        }
        if (paramsA.type === 'minimum' && paramsB.type === 'maximum' && paramsA.budget > paramsB.budget) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.99,
            reason: `Minimum budget (${paramsA.currency || '$'}${paramsA.budget}) is greater than maximum budget (${paramsB.currency || '$'}${paramsB.budget})`
          };
        }
        
        // Conflicting fixed budgets
        if (paramsA.type === 'fixed' && paramsB.type === 'fixed' && paramsA.budget !== paramsB.budget) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.95,
            reason: `Conflicting fixed budgets: ${paramsA.currency || '$'}${paramsA.budget} vs ${paramsB.currency || '$'}${paramsB.budget}`
          };
        }
      }
    }

    // TIMELINE conflicts (uppercase category)
    if (assumptionA.category === 'TIMELINE') {
      if (paramsA.duration !== undefined && paramsB.duration !== undefined && paramsA.unit === paramsB.unit) {
        // Minimum duration greater than deadline
        if (paramsA.type === 'minimum' && paramsB.type === 'deadline' && paramsA.duration > paramsB.duration) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.98,
            reason: `Minimum duration (${paramsA.duration} ${paramsA.unit}) exceeds deadline (${paramsB.duration} ${paramsB.unit})`
          };
        }
        if (paramsA.type === 'deadline' && paramsB.type === 'minimum' && paramsA.duration < paramsB.duration) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.98,
            reason: `Deadline (${paramsA.duration} ${paramsA.unit}) is less than minimum duration (${paramsB.duration} ${paramsB.unit})`
          };
        }
        
        // Maximum duration less than minimum duration
        if (paramsA.type === 'maximum' && paramsB.type === 'minimum' && paramsA.duration < paramsB.duration) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.97,
            reason: `Maximum duration (${paramsA.duration} ${paramsA.unit}) is less than minimum duration (${paramsB.duration} ${paramsB.unit})`
          };
        }
        if (paramsA.type === 'minimum' && paramsB.type === 'maximum' && paramsA.duration > paramsB.duration) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.97,
            reason: `Minimum duration (${paramsA.duration} ${paramsA.unit}) exceeds maximum duration (${paramsB.duration} ${paramsB.unit})`
          };
        }
      }
    }

    // RESOURCE conflicts (uppercase category)
    if (assumptionA.category === 'RESOURCE') {
      if (paramsA.resourceType === paramsB.resourceType && 
          paramsA.quantity !== undefined && 
          paramsB.quantity !== undefined) {
        // Required resources exceed available resources
        if (paramsA.type === 'required' && paramsB.type === 'available' && paramsA.quantity > paramsB.quantity) {
          return {
            conflictType: 'INCOMPATIBLE',
            confidenceScore: 0.96,
            reason: `Required ${paramsA.resourceType} (${paramsA.quantity}) exceeds available (${paramsB.quantity})`
          };
        }
        if (paramsA.type === 'available' && paramsB.type === 'required' && paramsA.quantity < paramsB.quantity) {
          return {
            conflictType: 'INCOMPATIBLE',
            confidenceScore: 0.96,
            reason: `Available ${paramsA.resourceType} (${paramsA.quantity}) is less than required (${paramsB.quantity})`
          };
        }
        
        // Maximum less than minimum
        if (paramsA.type === 'maximum' && paramsB.type === 'minimum' && paramsA.quantity < paramsB.quantity) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.95,
            reason: `Maximum ${paramsA.resourceType} (${paramsA.quantity}) is less than minimum (${paramsB.quantity})`
          };
        }
        if (paramsA.type === 'minimum' && paramsB.type === 'maximum' && paramsA.quantity > paramsB.quantity) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: 0.95,
            reason: `Minimum ${paramsA.resourceType} (${paramsA.quantity}) exceeds maximum (${paramsB.quantity})`
          };
        }
      }
    }

    return null;
  }

  /**
   * Strategy 2: Detect negation-based conflicts
   * e.g., "X will happen" vs "X will not happen"
   */
  private detectNegationConflict(textA: string, textB: string): ConflictDetectionResult | null {
    // Remove common words to find the core statement
    const removeCommonWords = (text: string) => {
      return text
        .replace(/\b(the|a|an|will|would|should|could|may|might|can|must|is|are|was|were|be|been|being)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const coreA = removeCommonWords(textA);
    const coreB = removeCommonWords(textB);

    // Check if one contains "not" and the other doesn't, with similar core text
    const hasNotA = /\bnot\b|\bn't\b/.test(textA);
    const hasNotB = /\bnot\b|\bn't\b/.test(textB);

    if (hasNotA !== hasNotB) {
      // Remove "not" and check similarity
      const normalizedA = coreA.replace(/\bnot\b/g, '').trim();
      const normalizedB = coreB.replace(/\bnot\b/g, '').trim();

      const similarity = this.calculateSimilarity(normalizedA, normalizedB);

      if (similarity > 0.6) {
        return {
          conflictType: 'CONTRADICTORY',
          confidenceScore: Math.min(0.95, 0.7 + similarity * 0.25),
          reason: 'One assumption negates the other with similar core statement',
        };
      }
    }

    return null;
  }

  /**
   * Strategy 2: Detect keyword/antonym-based conflicts
   * e.g., "revenue will increase" vs "revenue will decrease"
   */
  private detectKeywordConflict(textA: string, textB: string): ConflictDetectionResult | null {
    for (const [word1, word2] of this.antonymPairs) {
      const hasWord1InA = textA.includes(word1);
      const hasWord2InA = textA.includes(word2);
      const hasWord1InB = textB.includes(word1);
      const hasWord2InB = textB.includes(word2);

      // Check if they have opposite antonyms
      if ((hasWord1InA && hasWord2InB) || (hasWord2InA && hasWord1InB)) {
        // Extract context around the keywords
        const contextA = this.extractContext(textA, hasWord1InA ? word1 : word2);
        const contextB = this.extractContext(textB, hasWord1InB ? word1 : word2);

        // Check if contexts are similar (talking about same thing)
        const contextSimilarity = this.calculateSimilarity(contextA, contextB);

        if (contextSimilarity > 0.5) {
          return {
            conflictType: 'CONTRADICTORY',
            confidenceScore: Math.min(0.9, 0.6 + contextSimilarity * 0.3),
            reason: `Contradictory keywords detected: "${hasWord1InA ? word1 : word2}" vs "${hasWord1InB ? word1 : word2}" in similar context`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Strategy 3: Detect contextual conflicts
   * Similar topics but with incompatible assertions
   */
  private detectContextualConflict(textA: string, textB: string): ConflictDetectionResult | null {
    // Extract key entities/subjects (very basic)
    const entitiesA = this.extractKeyEntities(textA);
    const entitiesB = this.extractKeyEntities(textB);

    // Check if they share common entities
    const commonEntities = entitiesA.filter(e => entitiesB.includes(e));

    if (commonEntities.length > 0) {
      // They're talking about similar things
      // Check for incompatible states or mutual exclusivity patterns
      const incompatibilityScore = this.checkIncompatibility(textA, textB);

      if (incompatibilityScore > 0.6) {
        return {
          conflictType: 'INCOMPATIBLE',
          confidenceScore: Math.min(0.8, incompatibilityScore),
          reason: `Potentially incompatible assertions about shared topics: ${commonEntities.join(', ')}`,
        };
      }
    }

    return null;
  }

  /**
   * Calculate simple similarity score between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Jaccard similarity based on word tokens
    const tokens1 = new Set(str1.split(/\s+/));
    const tokens2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Extract context around a keyword (words before and after)
   */
  private extractContext(text: string, keyword: string, windowSize: number = 3): string {
    const words = text.split(/\s+/);
    const keywordIndex = words.findIndex(w => w.includes(keyword));

    if (keywordIndex === -1) return '';

    const start = Math.max(0, keywordIndex - windowSize);
    const end = Math.min(words.length, keywordIndex + windowSize + 1);

    return words.slice(start, end).join(' ');
  }

  /**
   * Extract key entities (nouns, important words)
   * Very basic implementation - in production, use NLP library
   */
  private extractKeyEntities(text: string): string[] {
    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'will', 'would', 'should', 'could', 'may', 'might',
      'can', 'must', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'to', 'of', 'in', 'for',
      'on', 'with', 'as', 'by', 'at', 'from', 'not', 'or', 'and', 'but',
    ]);

    const words = text.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
    return words.filter(w => w.length > 3 && !stopWords.has(w));
  }

  /**
   * Check for incompatibility patterns
   */
  private checkIncompatibility(textA: string, textB: string): number {
    let score = 0;

    // Mutual exclusivity patterns
    const mutuallyExclusivePatterns = [
      ['always', 'sometimes'],
      ['always', 'rarely'],
      ['never', 'sometimes'],
      ['all', 'some'],
      ['none', 'some'],
      ['only', 'multiple'],
      ['single', 'multiple'],
      ['mandatory', 'optional'],
      ['required', 'optional'],
    ];

    for (const [pattern1, pattern2] of mutuallyExclusivePatterns) {
      if ((textA.includes(pattern1) && textB.includes(pattern2)) ||
          (textA.includes(pattern2) && textB.includes(pattern1))) {
        score += 0.3;
      }
    }

    // Conflicting states
    const stateConflicts = [
      ['active', 'inactive'],
      ['enabled', 'disabled'],
      ['online', 'offline'],
      ['open', 'closed'],
      ['public', 'private'],
    ];

    for (const [state1, state2] of stateConflicts) {
      if ((textA.includes(state1) && textB.includes(state2)) ||
          (textA.includes(state2) && textB.includes(state1))) {
        score += 0.4;
      }
    }

    return Math.min(score, 1.0);
  }
}
