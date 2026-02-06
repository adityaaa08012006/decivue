/**
 * Dependency Model
 * Represents a dependency relationship between decisions
 */

export interface Dependency {
  id: string;
  sourceDecisionId: string;        // The dependent decision
  targetDecisionId: string;        // The decision it depends on
  createdAt: Date;
}

export interface DependencyCreate {
  sourceDecisionId: string;
  targetDecisionId: string;
}
