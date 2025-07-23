/**
 * Event Management System
 * Handles real-time event processing, distribution, and persistence
 */

import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import type { EventConfig } from '../config/collaboration.config.js';
import { Logger } from '../utils/logger.js';

const logger = Logger.getInstance();

export interface CollaborationEvent {
  /** Unique event identifier */
  id: string;
  /** Event type */
  type: string;
  /** Event payload */
  payload: unknown;
  /** User who triggered the event */
  userId: string;
  /** Target room/channel */
  targetRoom?: string;
  /** Target user(s) */
  targetUsers?: string[];
  /** Event timestamp */
  timestamp: Date;
  /** Event priority */
  priority: 'low' | 'normal' | 'high' | 'critical';
  /** Event metadata */
  metadata: {
    source?: string;
    version?: string;
    [key: string]: unknown;
  };
}

export interface EventHandler {
  /** Event type to handle */
  eventType: string;
  /** Handler function */
  handler: (event: CollaborationEvent, connections: string[]) => Promise<void> | void;
  /** Handler priority */
  priority: number;
}

export interface EventMetrics {
  /** Total events processed */
  totalEvents: number;
  /** Events processed by type */
  eventsByType: Map<string, number>;
  /** Average processing time */
  averageProcessingTime: number;
  /** Failed events */
  failedEvents: number;
  /** Queued events */
  queuedEvents: number;
  /** Events in current batch */
  batchedEvents: number;
}

export interface EventBatch {
  /** Batch identifier */
  id: string;
  /** Events in the batch */
  events: CollaborationEvent[];
  /** Batch creation time */
  createdAt: Date;
  /** Batch target rooms */
  targetRooms: Set<string>;
  /** Batch target users */
  targetUsers: Set<string>;
}

export class EventManager extends EventEmitter {
  private eventQueue: CollaborationEvent[] = [];
  private eventHandlers = new Map<string, EventHandler[]>();
  private eventHistory: CollaborationEvent[] = [];
  private config: EventConfig;
  private metrics: EventMetrics;
  private processingTimer?: NodeJS.Timeout;
  private batchTimer?: NodeJS.Timeout;
  private currentBatch?: EventBatch;
  private isProcessing = false;

  constructor(config: EventConfig) {
    super();
    this.config = config;
    this.metrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      averageProcessingTime: 0,
      failedEvents: 0,
      queuedEvents: 0,
      batchedEvents: 0,
    };

    this.startProcessing();
    this.startHistoryCleanup();
  }

  /**
   * Register an event handler
   */
  public registerHandler(eventType: string, handler: EventHandler['handler'], priority = 0): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    const handlers = this.eventHandlers.get(eventType)!;
    handlers.push({ eventType, handler, priority });

    // Sort handlers by priority (higher priority first)
    handlers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister an event handler
   */
  public unregisterHandler(eventType: string, handler: EventHandler['handler']): void {
    const handlers = this.eventHandlers.get(eventType);
    if (!handlers) return;

    const index = handlers.findIndex(h => h.handler === handler);
    if (index >= 0) {
      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      this.eventHandlers.delete(eventType);
    }
  }

  /**
   * Emit an event
   */
  public emitEvent(
    type: string,
    payload: unknown,
    userId: string,
    options: {
      targetRoom?: string;
      targetUsers?: string[];
      priority?: CollaborationEvent['priority'];
      metadata?: Record<string, unknown>;
    } = {}
  ): string {
    const event: CollaborationEvent = {
      id: uuidv4(),
      type,
      payload,
      userId,
      targetRoom: options.targetRoom,
      targetUsers: options.targetUsers,
      timestamp: new Date(),
      priority: options.priority || 'normal',
      metadata: options.metadata || {},
    };

    // Check queue size limit
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      throw new Error('Event queue is full');
    }

    // Add to queue
    this.eventQueue.push(event);
    this.metrics.queuedEvents = this.eventQueue.length;

    // Add to current batch if batching is enabled
    if (this.config.batching.enabled) {
      this.addToBatch(event);
    }

    // Store in history if persistence is enabled
    if (this.config.enablePersistence) {
      this.eventHistory.push(event);
    }

    this.emit('eventQueued', event);
    return event.id;
  }

  /**
   * Process events from the queue
   */
  public async processEvents(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process events in batches if batching is enabled
      if (
        this.config.batching.enabled &&
        this.currentBatch &&
        this.currentBatch.events.length > 0
      ) {
        await this.processBatch(this.currentBatch);
        this.currentBatch = undefined;
      } else {
        // Process individual events
        const eventsToProcess = this.eventQueue.splice(0, this.config.batching.maxBatchSize || 10);

        for (const event of eventsToProcess) {
          await this.processEvent(event);
        }
      }

      this.metrics.queuedEvents = this.eventQueue.length;
    } catch (error) {
      logger.error(
        'Error processing events:',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      this.emit('processingError', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: CollaborationEvent): Promise<void> {
    const startTime = Date.now();

    try {
      const handlers = this.eventHandlers.get(event.type) || [];
      const targetConnections = this.getTargetConnections(event);

      // Execute all handlers for this event type
      for (const { handler } of handlers) {
        await Promise.race([
          handler(event, targetConnections),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Handler timeout')), this.config.processingTimeout)
          ),
        ]);
      }

      // Update metrics
      this.metrics.totalEvents++;
      const eventTypeCount = this.metrics.eventsByType.get(event.type) || 0;
      this.metrics.eventsByType.set(event.type, eventTypeCount + 1);

      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);

      this.emit('eventProcessed', event.type, targetConnections.length);
    } catch (error) {
      this.metrics.failedEvents++;
      logger.error(
        `Failed to process event ${event.id}:`,
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      this.emit(
        'eventError',
        event.type,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Process a batch of events
   */
  private async processBatch(batch: EventBatch): Promise<void> {
    const startTime = Date.now();

    try {
      // Group events by type for efficient processing
      const eventsByType = new Map<string, CollaborationEvent[]>();

      for (const event of batch.events) {
        if (!eventsByType.has(event.type)) {
          eventsByType.set(event.type, []);
        }
        eventsByType.get(event.type)!.push(event);
      }

      // Process each event type
      for (const [eventType, events] of eventsByType) {
        const handlers = this.eventHandlers.get(eventType) || [];
        const targetConnections = this.getBatchTargetConnections(batch);

        for (const { handler } of handlers) {
          // Process all events of this type with the handler
          for (const event of events) {
            await Promise.race([
              handler(event, targetConnections),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error('Batch handler timeout')),
                  this.config.processingTimeout
                )
              ),
            ]);
          }
        }
      }

      // Update metrics
      this.metrics.totalEvents += batch.events.length;
      this.metrics.batchedEvents = 0;

      for (const event of batch.events) {
        const eventTypeCount = this.metrics.eventsByType.get(event.type) || 0;
        this.metrics.eventsByType.set(event.type, eventTypeCount + 1);
      }

      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);

      this.emit('batchProcessed', batch.id, batch.events.length);
    } catch (error) {
      this.metrics.failedEvents += batch.events.length;
      logger.error(
        `Failed to process batch ${batch.id}:`,
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      this.emit('batchError', batch.id, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Add event to current batch
   */
  private addToBatch(event: CollaborationEvent): void {
    if (!this.currentBatch) {
      this.currentBatch = {
        id: uuidv4(),
        events: [],
        createdAt: new Date(),
        targetRooms: new Set(),
        targetUsers: new Set(),
      };

      // Schedule batch processing
      this.batchTimer = setTimeout(() => {
        if (this.currentBatch) {
          this.processBatch(this.currentBatch);
          this.currentBatch = undefined;
        }
      }, this.config.batching.batchTimeout);
    }

    this.currentBatch.events.push(event);
    this.metrics.batchedEvents = this.currentBatch.events.length;

    if (event.targetRoom) {
      this.currentBatch.targetRooms.add(event.targetRoom);
    }
    if (event.targetUsers) {
      event.targetUsers.forEach(userId => this.currentBatch!.targetUsers.add(userId));
    }

    // Process batch immediately if it reaches max size
    if (this.currentBatch.events.length >= this.config.batching.maxBatchSize) {
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      this.processBatch(this.currentBatch);
      this.currentBatch = undefined;
    }
  }

  /**
   * Get target connections for an event
   */
  private getTargetConnections(event: CollaborationEvent): string[] {
    // This would be implemented to work with the ConnectionManager
    // For now, return empty array as placeholder
    const connections: string[] = [];

    if (event.targetRoom) {
      // Get connections in the target room
      // connections.push(...this.connectionManager.getConnectionsInRoom(event.targetRoom));
    }

    if (event.targetUsers) {
      // Get connections for target users
      // for (const userId of event.targetUsers) {
      //   connections.push(...this.connectionManager.getUserConnections(userId));
      // }
    }

    return connections;
  }

  /**
   * Get target connections for a batch
   */
  private getBatchTargetConnections(batch: EventBatch): string[] {
    const connections: string[] = []; // Aggregate all target connections from the batch
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _room of batch.targetRooms) {
      // connections.push(...this.connectionManager.getConnectionsInRoom(room));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _userId of batch.targetUsers) {
      // connections.push(...this.connectionManager.getUserConnections(userId));
    }

    // Remove duplicates
    return [...new Set(connections)];
  }

  /**
   * Get event history
   */
  public getEventHistory(
    options: {
      eventType?: string;
      userId?: string;
      since?: Date;
      limit?: number;
    } = {}
  ): CollaborationEvent[] {
    let history = this.eventHistory;

    if (options.eventType) {
      history = history.filter(event => event.type === options.eventType);
    }

    if (options.userId) {
      history = history.filter(event => event.userId === options.userId);
    }

    if (options.since) {
      history = history.filter(event => event.timestamp >= options.since!);
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Get event metrics
   */
  public getMetrics(): EventMetrics {
    return {
      ...this.metrics,
      eventsByType: new Map(this.metrics.eventsByType),
    };
  }

  /**
   * Start event processing timer
   */
  private startProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processEvents();
    }, 100); // Process every 100ms
  }

  /**
   * Start history cleanup
   */
  private startHistoryCleanup(): void {
    if (!this.config.enablePersistence) return;

    setInterval(() => {
      const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
      this.eventHistory = this.eventHistory.filter(event => event.timestamp >= cutoffTime);
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(processingTime: number): void {
    const alpha = 0.1; // Smoothing factor for exponential moving average
    this.metrics.averageProcessingTime =
      alpha * processingTime + (1 - alpha) * this.metrics.averageProcessingTime;
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    // Clear timers
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Process remaining events
    await this.processEvents();

    // Clear data structures
    this.eventQueue = [];
    this.eventHandlers.clear();
    this.eventHistory = [];
    this.currentBatch = undefined;

    // Remove all listeners
    this.removeAllListeners();
  }
}
