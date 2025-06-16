import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Message {
  id: string;
  userId: string;
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: number;
  priority: number;
  retryCount: number;
  maxRetries: number;
  expiresAt?: number;
}

export interface QueuedMessage {
  id: string;
  userId: string;
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: number;
  priority: number;
  retryCount: number;
  maxRetries: number;
  expiresAt?: number;
}

export interface ReconnectionAttempt {
  userId: string;
  attemptCount: number;
  lastAttempt: number;
  nextAttempt: number;
  backoffDelay: number;
}

export interface ReliabilityOptions {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  maxRetryDelay: number;
  reconnectAttempts: number;
  reconnectDelay: number;
  messageExpiration: number;
  queueCleanupInterval: number;
}

export interface ReliabilityManagerEvents {
  'message-queued': (message: QueuedMessage) => void;
  'message-delivered': (message: QueuedMessage) => void;
  'message-failed': (message: QueuedMessage, error: Error) => void;
  'message-expired': (message: QueuedMessage) => void;
  'reconnection-scheduled': (attempt: ReconnectionAttempt) => void;
  'reconnection-failed': (attempt: ReconnectionAttempt) => void;
  'queue-full': (userId: string, queueSize: number) => void;
  error: (error: Error) => void;
}

export class ReliabilityManager extends EventEmitter {
  private readonly logger = Logger.getInstance();
  private readonly options: ReliabilityOptions;
  private readonly messageQueue = new Map<string, QueuedMessage[]>();
  private readonly reconnectionAttempts = new Map<string, ReconnectionAttempt>();
  private readonly deliveryCallbacks = new Map<
    string,
    (message: QueuedMessage) => Promise<boolean>
  >();
  private cleanupInterval?: NodeJS.Timeout;
  private processingInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(options: Partial<ReliabilityOptions> = {}) {
    super();
    this.options = {
      maxQueueSize: options.maxQueueSize ?? 1000,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      maxRetryDelay: options.maxRetryDelay ?? 30000,
      reconnectAttempts: options.reconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 5000,
      messageExpiration: options.messageExpiration ?? 300000, // 5 minutes
      queueCleanupInterval: options.queueCleanupInterval ?? 60000, // 1 minute
    };
  }
  public start(): void {
    this.logger.info('Starting reliability manager');
    this.isRunning = true;

    // Start message processing
    this.processingInterval = setInterval(() => {
      this.processQueuedMessages();
    }, 1000);

    // Start cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredMessages();
      this.cleanupOldReconnectionAttempts();
    }, this.options.queueCleanupInterval);
  }
  public stop(): void {
    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.logger.info('Reliability manager stopped');
  }
  public registerDeliveryCallback(
    userId: string,
    callback: (message: QueuedMessage) => Promise<boolean>
  ): void {
    this.deliveryCallbacks.set(userId, callback);
    // Trigger immediate processing when callback is registered, especially if there are queued messages
    const userMessages = this.messageQueue.get(userId);
    if (userMessages && userMessages.length > 0) {
      setImmediate(() => this.processQueuedMessages());
    }
  }

  public unregisterDeliveryCallback(userId: string): void {
    this.deliveryCallbacks.delete(userId);
  }

  public queueMessage(
    userId: string,
    event: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    priority: number = 1,
    maxRetries?: number,
    expiresIn?: number
  ): boolean {
    const userQueue = this.messageQueue.get(userId) || [];

    if (userQueue.length >= this.options.maxQueueSize) {
      this.emit('queue-full', userId, userQueue.length);
      this.logger.warn('Message queue full for user', { userId, queueSize: userQueue.length });
      return false;
    }

    const message: QueuedMessage = {
      id: this.generateMessageId(),
      userId,
      event,
      data,
      timestamp: Date.now(),
      priority,
      retryCount: 0,
      maxRetries: maxRetries ?? this.options.maxRetries,
      expiresAt: expiresIn ? Date.now() + expiresIn : Date.now() + this.options.messageExpiration,
    };
    userQueue.push(message);
    userQueue.sort((a, b) => b.priority - a.priority); // Higher priority first
    this.messageQueue.set(userId, userQueue);

    this.emit('message-queued', message);
    this.logger.debug('Message queued', { messageId: message.id, userId, event });

    // Trigger immediate processing if callback is available
    const callback = this.deliveryCallbacks.get(userId);
    if (callback) {
      setImmediate(() => this.processQueuedMessages());
    }

    return true;
  }

  public scheduleReconnection(userId: string): void {
    let attempt = this.reconnectionAttempts.get(userId);

    if (!attempt) {
      attempt = {
        userId,
        attemptCount: 0,
        lastAttempt: 0,
        nextAttempt: 0,
        backoffDelay: this.options.reconnectDelay,
      };
    }

    if (attempt.attemptCount >= this.options.reconnectAttempts) {
      this.logger.warn('Max reconnection attempts reached', {
        userId,
        attempts: attempt.attemptCount,
      });
      return;
    }

    attempt.attemptCount++;
    attempt.lastAttempt = Date.now();
    attempt.nextAttempt = Date.now() + attempt.backoffDelay;

    // Exponential backoff with jitter
    attempt.backoffDelay = Math.min(
      attempt.backoffDelay * 2 + Math.random() * 1000,
      this.options.maxRetryDelay
    );

    this.reconnectionAttempts.set(userId, attempt);
    this.emit('reconnection-scheduled', attempt);

    this.logger.info('Reconnection scheduled', {
      userId,
      attempt: attempt.attemptCount,
      nextAttempt: new Date(attempt.nextAttempt),
      backoffDelay: attempt.backoffDelay,
    });
  }

  public onReconnectionSuccess(userId: string): void {
    this.reconnectionAttempts.delete(userId);
    this.logger.info('Reconnection successful', { userId });

    // Process queued messages for this user
    this.processUserQueue(userId);
  }

  public onReconnectionFailed(userId: string): void {
    const attempt = this.reconnectionAttempts.get(userId);
    if (attempt) {
      this.emit('reconnection-failed', attempt);
      this.logger.warn('Reconnection failed', { userId, attempt: attempt.attemptCount });
    }
  }

  public getQueuedMessageCount(userId: string): number {
    return this.messageQueue.get(userId)?.length ?? 0;
  }

  public getPendingReconnections(): ReconnectionAttempt[] {
    return Array.from(this.reconnectionAttempts.values());
  }
  public clearUserQueue(userId: string): void {
    this.messageQueue.delete(userId);
    this.reconnectionAttempts.delete(userId);
    this.deliveryCallbacks.delete(userId);
    this.logger.debug('Cleared user queue', { userId });
  }

  // Force cleanup for testing purposes
  public forceCleanup(): void {
    this.cleanupExpiredMessages();
    this.cleanupOldReconnectionAttempts();
  }

  private async processQueuedMessages(): Promise<void> {
    const now = Date.now();

    for (const [userId, messages] of this.messageQueue.entries()) {
      if (messages.length === 0) continue;

      const callback = this.deliveryCallbacks.get(userId);
      if (!callback) continue;

      // Process messages in priority order
      const message = messages[0];
      if (!message) continue;

      if (message.expiresAt && now > message.expiresAt) {
        messages.shift();
        this.emit('message-expired', message);
        this.logger.debug('Message expired', { messageId: message.id });
        continue;
      }

      try {
        const delivered = await callback(message);

        if (delivered) {
          messages.shift();
          this.emit('message-delivered', message);
          this.logger.debug('Message delivered', { messageId: message.id });
        } else {
          message.retryCount++;

          if (message.retryCount >= message.maxRetries) {
            messages.shift();
            this.emit('message-failed', message, new Error('Max retries exceeded'));
            this.logger.warn('Message failed after max retries', { messageId: message.id });
          } else {
            // Move to end of queue with delay
            messages.shift();
            setTimeout(() => {
              const userQueue = this.messageQueue.get(userId);
              if (userQueue) {
                userQueue.push(message);
                // Trigger processing after retry delay
                setImmediate(() => this.processQueuedMessages());
              }
            }, this.calculateRetryDelay(message.retryCount));
          }
        }
      } catch (error) {
        this.logger.error('Error processing message', { messageId: message.id, error });
        this.emit('error', error as Error);
      }
    }
  }

  private async processUserQueue(userId: string): Promise<void> {
    const messages = this.messageQueue.get(userId);
    if (!messages || messages.length === 0) return;

    const callback = this.deliveryCallbacks.get(userId);
    if (!callback) return;

    this.logger.info('Processing queued messages after reconnection', {
      userId,
      count: messages.length,
    });

    // Process all queued messages
    while (messages.length > 0) {
      const message = messages[0];
      if (!message) break;

      try {
        const delivered = await callback(message);

        if (delivered) {
          messages.shift();
          this.emit('message-delivered', message);
        } else {
          break; // Stop processing if delivery fails
        }
      } catch (error) {
        this.logger.error('Error processing queued message', { messageId: message.id, error });
        break;
      }
    }
  }

  private cleanupExpiredMessages(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [userId, messages] of this.messageQueue.entries()) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message && message.expiresAt && now > message.expiresAt) {
          messages.splice(i, 1);
          this.emit('message-expired', message);
          expiredCount++;
        }
      }

      if (messages.length === 0) {
        this.messageQueue.delete(userId);
      }
    }

    if (expiredCount > 0) {
      this.logger.info('Cleaned up expired messages', { count: expiredCount });
    }
  }

  private cleanupOldReconnectionAttempts(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [userId, attempt] of this.reconnectionAttempts.entries()) {
      if (now - attempt.lastAttempt > maxAge) {
        this.reconnectionAttempts.delete(userId);
        this.logger.debug('Cleaned up old reconnection attempt', { userId });
      }
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.options.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * baseDelay;

    return Math.min(exponentialDelay + jitter, this.options.maxRetryDelay);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
