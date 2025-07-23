// events/eventBus.ts
// Event bus for plugins and internal modules

export type EventType = 'preRun' | 'postRun' | 'suiteStart' | 'suiteEnd' | 'testStart' | 'testEnd';

export type EventPayload = Record<string, any>;

export type EventListener = (payload: EventPayload) => void;

const listeners: Record<EventType, EventListener[]> = {
    preRun: [],
    postRun: [],
    suiteStart: [],
    suiteEnd: [],
    testStart: [],
    testEnd: []
};

export function on(event: EventType, listener: EventListener) {
    listeners[event].push(listener);
}

export function emit(event: EventType, payload: EventPayload) {
    listeners[event].forEach(listener => listener(payload));
}
