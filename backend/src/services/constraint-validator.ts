/**
 * Constraint Validator Service
 * Evaluates constraint rules against decision context
 *
 * Supported rule types:
 * - budget_threshold: Check if decision cost <= limit
 * - policy_regex: Match decision description against pattern
 * - technical_compatibility: Check metadata fields against allowed values
 * - compliance_required_fields: Ensure required fields are present
 *
 * Rule Format Example:
 * {
 *   "type": "budget_threshold",
 *   "operator": "<=",
 *   "value": 500000,
 *   "field": "metadata.budget"
 * }
 */

import { logger } from '@utils/logger';

/**
 * Database constraint format (snake_case from Supabase)
 * This differs from the model's camelCase format
 */
export interface ConstraintDB {
  id: string;
  name: string;
  description?: string;
  constraint_type: string;
  rule_expression?: string;
  is_immutable: boolean;
  validation_config?: any;
}

export interface ValidationResult {
  passed: boolean;
  violation?: {
    constraintId: string;
    constraintName: string;
    reason: string;
    details: any;
  };
}

export interface DecisionContext {
  id: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
}

export class ConstraintValidator {
  /**
   * Validate decision against a constraint
   */
  validate(constraint: ConstraintDB, context: DecisionContext): ValidationResult {
    // If no rule expression, constraint passes (not configured)
    if (!constraint.rule_expression && !constraint.validation_config) {
      return { passed: true };
    }

    const config = this.parseValidationConfig(constraint);

    // If no type specified, skip validation
    if (!config.type) {
      logger.warn(`Constraint ${constraint.id} has no validation type defined`);
      return { passed: true };
    }

    try {
      switch (config.type) {
        case 'budget_threshold':
          return this.validateBudgetThreshold(constraint, context, config);
        case 'policy_regex':
          return this.validatePolicyRegex(constraint, context, config);
        case 'technical_compatibility':
          return this.validateTechnicalCompatibility(constraint, context, config);
        case 'compliance_required_fields':
          return this.validateRequiredFields(constraint, context, config);
        default:
          logger.warn(`Unknown constraint validation type: ${config.type}`);
          return { passed: true };
      }
    } catch (error) {
      logger.error(`Error validating constraint ${constraint.id}`, { error });
      // On error, assume constraint passes (fail open for safety)
      return { passed: true };
    }
  }

  /**
   * Parse validation config from constraint
   * Tries validation_config first, then rule_expression
   */
  private parseValidationConfig(constraint: ConstraintDB): any {
    if (constraint.validation_config) {
      return constraint.validation_config;
    }

    if (constraint.rule_expression) {
      try {
        return JSON.parse(constraint.rule_expression);
      } catch (error) {
        logger.warn(`Failed to parse rule_expression for constraint ${constraint.id}`);
        return {};
      }
    }

    return {};
  }

  /**
   * Validate budget threshold
   * Example config: { "type": "budget_threshold", "operator": "<=", "value": 500000, "field": "metadata.budget" }
   */
  private validateBudgetThreshold(
    constraint: ConstraintDB,
    context: DecisionContext,
    config: any
  ): ValidationResult {
    const field = config.field || 'metadata.cost';
    const threshold = config.value;
    const operator = config.operator || '<=';

    const actualValue = this.getNestedValue(context, field);

    // If field doesn't exist or is not a number, violation
    if (typeof actualValue !== 'number') {
      return {
        passed: false,
        violation: {
          constraintId: constraint.id,
          constraintName: constraint.name,
          reason: `Budget field "${field}" not found or invalid (expected number, got ${typeof actualValue})`,
          details: {
            field,
            expectedType: 'number',
            actualType: typeof actualValue,
            threshold
          }
        }
      };
    }

    // Evaluate based on operator
    let passed = false;
    switch (operator) {
      case '<=':
        passed = actualValue <= threshold;
        break;
      case '<':
        passed = actualValue < threshold;
        break;
      case '>=':
        passed = actualValue >= threshold;
        break;
      case '>':
        passed = actualValue > threshold;
        break;
      case '==':
      case '===':
        passed = actualValue === threshold;
        break;
      default:
        logger.warn(`Unknown operator ${operator} for budget_threshold`);
        passed = true;
    }

    return passed
      ? { passed: true }
      : {
          passed: false,
          violation: {
            constraintId: constraint.id,
            constraintName: constraint.name,
            reason: `Budget constraint violated: ${actualValue} ${operator} ${threshold} is false`,
            details: {
              field,
              actual: actualValue,
              operator,
              threshold,
              message: `Expected ${field} to be ${operator} ${threshold}, but got ${actualValue}`
            }
          }
        };
  }

  /**
   * Validate policy regex
   * Example config: { "type": "policy_regex", "pattern": "approved by.*manager", "flags": "i" }
   */
  private validatePolicyRegex(
    constraint: ConstraintDB,
    context: DecisionContext,
    config: any
  ): ValidationResult {
    const pattern = config.pattern;
    const flags = config.flags || 'i';
    const field = config.field || 'description';

    if (!pattern) {
      logger.warn(`No pattern defined for policy_regex constraint ${constraint.id}`);
      return { passed: true };
    }

    // Get text to match against
    const text = field === 'description' ? context.description : this.getNestedValue(context, field);

    if (typeof text !== 'string') {
      return {
        passed: false,
        violation: {
          constraintId: constraint.id,
          constraintName: constraint.name,
          reason: `Field "${field}" must be a string for regex matching`,
          details: { field, actualType: typeof text, pattern }
        }
      };
    }

    try {
      const regex = new RegExp(pattern, flags);
      const passed = regex.test(text);

      return passed
        ? { passed: true }
        : {
            passed: false,
            violation: {
              constraintId: constraint.id,
              constraintName: constraint.name,
              reason: `Decision ${field} does not match required pattern: ${pattern}`,
              details: {
                pattern,
                flags,
                text: text.substring(0, 200), // Limit logged text
                message: `Text must match pattern /${pattern}/${flags}`
              }
            }
          };
    } catch (error) {
      logger.error(`Invalid regex pattern in constraint ${constraint.id}: ${pattern}`, { error });
      return { passed: true }; // Fail open on invalid regex
    }
  }

  /**
   * Validate technical compatibility
   * Example config: { "type": "technical_compatibility", "field": "metadata.tech_stack", "allowedValues": ["React", "Vue", "Angular"] }
   */
  private validateTechnicalCompatibility(
    constraint: ConstraintDB,
    context: DecisionContext,
    config: any
  ): ValidationResult {
    const field = config.field;
    const allowedValues = config.allowedValues || [];

    if (!field) {
      logger.warn(`No field defined for technical_compatibility constraint ${constraint.id}`);
      return { passed: true };
    }

    const actualValue = this.getNestedValue(context, field);

    // Check if value is in allowed list
    const passed = allowedValues.includes(actualValue);

    return passed
      ? { passed: true }
      : {
          passed: false,
          violation: {
            constraintId: constraint.id,
            constraintName: constraint.name,
            reason: `Value "${actualValue}" not in allowed list for ${field}`,
            details: {
              field,
              actual: actualValue,
              allowedValues,
              message: `${field} must be one of: ${allowedValues.join(', ')}`
            }
          }
        };
  }

  /**
   * Validate required fields
   * Example config: { "type": "compliance_required_fields", "fields": ["metadata.security_review", "metadata.compliance_check"] }
   */
  private validateRequiredFields(
    constraint: ConstraintDB,
    context: DecisionContext,
    config: any
  ): ValidationResult {
    const requiredFields = config.fields || [];

    if (!Array.isArray(requiredFields) || requiredFields.length === 0) {
      logger.warn(`No required fields defined for compliance_required_fields constraint ${constraint.id}`);
      return { passed: true };
    }

    // Check each required field
    const missingFields: string[] = [];
    for (const field of requiredFields) {
      const value = this.getNestedValue(context, field);
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }

    const passed = missingFields.length === 0;

    return passed
      ? { passed: true }
      : {
          passed: false,
          violation: {
            constraintId: constraint.id,
            constraintName: constraint.name,
            reason: `Missing required fields: ${missingFields.join(', ')}`,
            details: {
              missingFields,
              requiredFields,
              message: `The following required fields are missing: ${missingFields.join(', ')}`
            }
          }
        };
  }

  /**
   * Get nested value from object using dot notation
   * Example: getNestedValue(obj, 'metadata.cost') => obj.metadata.cost
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) return undefined;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}
