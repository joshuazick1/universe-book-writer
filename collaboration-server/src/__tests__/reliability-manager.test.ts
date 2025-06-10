import { ReliabilityManager } from '../reliability/reliability-manager.js';

describe('ReliabilityManager', () => {
  let reliabilityManager: ReliabilityManager;

  beforeEach(() => {
    reliabilityManager = new ReliabilityManager({
      maxQueueSize: 100,
      maxRetries: 3,
      retryDelay: 100,
      maxRetryDelay: 1000,
      reconnectAttempts: 3,
      reconnectDelay: 100,
      messageExpiration: 5000,
      queueCleanupInterval: 1000,
    });
  });

  afterEach(() => {
    reliabilityManager.stop();
  });

  describe('initialization', () => {
    it('should create a reliability manager with default options', () => {
      const manager = new ReliabilityManager();
      expect(manager).toBeInstanceOf(ReliabilityManager);
    });

    it('should create a reliability manager with custom options', () => {
      const options = {
        maxQueueSize: 500,
        maxRetries: 5,
        retryDelay: 2000,
        maxRetryDelay: 60000,
        reconnectAttempts: 10,
        reconnectDelay: 10000,
        messageExpiration: 600000,
        queueCleanupInterval: 120000,
      };
      const manager = new ReliabilityManager(options);
      expect(manager).toBeInstanceOf(ReliabilityManager);
    });
  });

  describe('message queueing', () => {
    it('should queue a message successfully', () => {
      const result = reliabilityManager.queueMessage('user123', 'test-event', {
        content: 'test message',
      });

      expect(result).toBe(true);
      expect(reliabilityManager.getQueuedMessageCount('user123')).toBe(1);
    });

    it('should reject messages when queue is full', () => {
      const smallQueueManager = new ReliabilityManager({ maxQueueSize: 2 });

      expect(smallQueueManager.queueMessage('user123', 'event1', {})).toBe(true);
      expect(smallQueueManager.queueMessage('user123', 'event2', {})).toBe(true);
      expect(smallQueueManager.queueMessage('user123', 'event3', {})).toBe(false);

      smallQueueManager.stop();
    });

    it('should prioritize messages correctly', () => {
      reliabilityManager.queueMessage('user123', 'low-priority', {}, 1);
      reliabilityManager.queueMessage('user123', 'high-priority', {}, 10);
      reliabilityManager.queueMessage('user123', 'medium-priority', {}, 5);

      expect(reliabilityManager.getQueuedMessageCount('user123')).toBe(3);
    });

    it('should emit message-queued events', done => {
      reliabilityManager.on('message-queued', message => {
        expect(message.userId).toBe('user123');
        expect(message.event).toBe('test-event');
        expect(message.data).toEqual({ content: 'test' });
        done();
      });

      reliabilityManager.queueMessage('user123', 'test-event', { content: 'test' });
    });
  });

  describe('message delivery', () => {
    it('should deliver messages when callback is registered', async () => {
      const deliveredMessages: any[] = [];

      reliabilityManager.registerDeliveryCallback('user123', async message => {
        deliveredMessages.push(message);
        return true; // Successful delivery
      });

      reliabilityManager.queueMessage('user123', 'test-event', { content: 'test' });
      reliabilityManager.start();

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(deliveredMessages.length).toBe(1);
      expect(deliveredMessages[0].event).toBe('test-event');
    });

    it('should retry failed deliveries', async () => {
      let attemptCount = 0;
      const deliveredMessages: any[] = [];

      reliabilityManager.registerDeliveryCallback('user123', async message => {
        attemptCount++;
        if (attemptCount < 3) {
          return false; // Fail first two attempts
        }
        deliveredMessages.push(message);
        return true; // Succeed on third attempt
      });

      reliabilityManager.queueMessage('user123', 'test-event', { content: 'test' });
      reliabilityManager.start();

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(attemptCount).toBeGreaterThanOrEqual(3);
      expect(deliveredMessages.length).toBe(1);
    });

    it('should emit message-delivered events', done => {
      reliabilityManager.on('message-delivered', message => {
        expect(message.event).toBe('test-event');
        done();
      });

      reliabilityManager.registerDeliveryCallback('user123', async () => true);
      reliabilityManager.queueMessage('user123', 'test-event', { content: 'test' });
      reliabilityManager.start();
    });

    it('should emit message-failed events after max retries', done => {
      reliabilityManager.on('message-failed', (message, error) => {
        expect(message.event).toBe('test-event');
        expect(error.message).toBe('Max retries exceeded');
        done();
      });

      reliabilityManager.registerDeliveryCallback('user123', async () => false);
      reliabilityManager.queueMessage('user123', 'test-event', { content: 'test' }, 1, 1); // 1 retry
      reliabilityManager.start();
    });
  });

  describe('reconnection management', () => {
    it('should schedule reconnection attempts', () => {
      reliabilityManager.scheduleReconnection('user123');

      const attempts = reliabilityManager.getPendingReconnections();
      expect(attempts.length).toBe(1);
      expect(attempts[0].userId).toBe('user123');
      expect(attempts[0].attemptCount).toBe(1);
    });

    it('should stop scheduling after max attempts', () => {
      for (let i = 0; i < 5; i++) {
        reliabilityManager.scheduleReconnection('user123');
      }

      const attempts = reliabilityManager.getPendingReconnections();
      expect(attempts[0].attemptCount).toBe(3); // Max attempts reached
    });

    it('should clear reconnection attempts on success', () => {
      reliabilityManager.scheduleReconnection('user123');
      expect(reliabilityManager.getPendingReconnections().length).toBe(1);

      reliabilityManager.onReconnectionSuccess('user123');
      expect(reliabilityManager.getPendingReconnections().length).toBe(0);
    });

    it('should emit reconnection-scheduled events', done => {
      reliabilityManager.on('reconnection-scheduled', attempt => {
        expect(attempt.userId).toBe('user123');
        expect(attempt.attemptCount).toBe(1);
        done();
      });

      reliabilityManager.scheduleReconnection('user123');
    });
  });

  describe('cleanup operations', () => {
    it('should clear user queue', () => {
      reliabilityManager.queueMessage('user123', 'test-event', {});
      expect(reliabilityManager.getQueuedMessageCount('user123')).toBe(1);

      reliabilityManager.clearUserQueue('user123');
      expect(reliabilityManager.getQueuedMessageCount('user123')).toBe(0);
    });
    it('should clean up expired messages', async () => {
      const expiredEvents: any[] = [];

      reliabilityManager.on('message-expired', message => {
        expiredEvents.push(message);
      }); // Queue message with very short expiration
      reliabilityManager.queueMessage('user123', 'test-event', {}, 1, 3, 100);
      reliabilityManager.start();

      // Wait for expiration then force cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      reliabilityManager.forceCleanup();

      expect(reliabilityManager.getQueuedMessageCount('user123')).toBe(0);
      expect(expiredEvents.length).toBe(1);
      expect(expiredEvents[0].event).toBe('test-event');
    });
  });

  describe('metrics and monitoring', () => {
    it('should track queued message count', () => {
      expect(reliabilityManager.getQueuedMessageCount('user123')).toBe(0);

      reliabilityManager.queueMessage('user123', 'event1', {});
      reliabilityManager.queueMessage('user123', 'event2', {});

      expect(reliabilityManager.getQueuedMessageCount('user123')).toBe(2);
    });

    it('should track pending reconnections', () => {
      expect(reliabilityManager.getPendingReconnections().length).toBe(0);

      reliabilityManager.scheduleReconnection('user123');
      reliabilityManager.scheduleReconnection('user456');

      expect(reliabilityManager.getPendingReconnections().length).toBe(2);
    });
  });
});
