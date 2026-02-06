/**
 * Event Bus
 * Simple in-memory event bus for event-driven architecture
 */

import { EventEmitter } from 'events';
import { DomainEvent, EventType } from './event-types';
import { logger } from '@utils/logger';

type EventHandler = (event: DomainEvent) => void | Promise<void>;

export class EventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Increase for production use
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit(event: DomainEvent): Promise<void> {
    logger.info(`Event emitted: ${event.type}`, { eventId: event.id });
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event); // Allow wildcard listeners
  }

  /**
   * Register a handler for a specific event type
   */
  on(eventType: EventType | '*', handler: EventHandler): void {
    this.emitter.on(eventType, handler);
  }

  /**
   * Register a one-time handler for a specific event type
   */
  once(eventType: EventType | '*', handler: EventHandler): void {
    this.emitter.once(eventType, handler);
  }

  /**
   * Unregister a handler
   */
  off(eventType: EventType | '*', handler: EventHandler): void {
    this.emitter.off(eventType, handler);
  }

  /**
   * Remove all handlers for an event type
   */
  removeAllListeners(eventType?: EventType | '*'): void {
    this.emitter.removeAllListeners(eventType);
  }
}

// Singleton instance
export const eventBus = new EventBus();
