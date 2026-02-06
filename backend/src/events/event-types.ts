/**
 * Event Types
 * Defines all event types that can occur in the system
 */

import { Decision, Assumption, Constraint } from '@data/models';
import { EvaluationOutput } from '@engine/types';

export enum EventType {
  DECISION_CREATED = 'DECISION_CREATED',
  DECISION_UPDATED = 'DECISION_UPDATED',
  DECISION_EVALUATED = 'DECISION_EVALUATED',
  ASSUMPTION_CREATED = 'ASSUMPTION_CREATED',
  ASSUMPTION_UPDATED = 'ASSUMPTION_UPDATED',
  CONSTRAINT_VIOLATED = 'CONSTRAINT_VIOLATED',
  DEPENDENCY_CHANGED = 'DEPENDENCY_CHANGED',
  RE_EVALUATION_TRIGGERED = 'RE_EVALUATION_TRIGGERED'
}

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DecisionCreatedEvent extends BaseEvent {
  type: EventType.DECISION_CREATED;
  decision: Decision;
}

export interface DecisionUpdatedEvent extends BaseEvent {
  type: EventType.DECISION_UPDATED;
  decisionId: string;
  changes: Partial<Decision>;
}

export interface DecisionEvaluatedEvent extends BaseEvent {
  type: EventType.DECISION_EVALUATED;
  decisionId: string;
  evaluationResult: EvaluationOutput;
}

export interface AssumptionCreatedEvent extends BaseEvent {
  type: EventType.ASSUMPTION_CREATED;
  assumption: Assumption;
}

export interface AssumptionUpdatedEvent extends BaseEvent {
  type: EventType.ASSUMPTION_UPDATED;
  assumptionId: string;
  decisionId: string;
  changes: Partial<Assumption>;
}

export interface ConstraintViolatedEvent extends BaseEvent {
  type: EventType.CONSTRAINT_VIOLATED;
  decisionId: string;
  constraint: Constraint;
}

export interface DependencyChangedEvent extends BaseEvent {
  type: EventType.DEPENDENCY_CHANGED;
  sourceDecisionId: string;
  targetDecisionId: string;
}

export interface ReEvaluationTriggeredEvent extends BaseEvent {
  type: EventType.RE_EVALUATION_TRIGGERED;
  decisionIds: string[];
  reason: string;
}

export type DomainEvent =
  | DecisionCreatedEvent
  | DecisionUpdatedEvent
  | DecisionEvaluatedEvent
  | AssumptionCreatedEvent
  | AssumptionUpdatedEvent
  | ConstraintViolatedEvent
  | DependencyChangedEvent
  | ReEvaluationTriggeredEvent;
