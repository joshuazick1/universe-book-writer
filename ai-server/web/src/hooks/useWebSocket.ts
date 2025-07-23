/**
 * WebSocket Hook - Manages real-time communication for character chat
 * 
 * Features:
 * - Automatic connection management
 * - Event subscription and emission
 * - Connection status tracking
 * - Automatic reconnection
 * - Message queuing during disconnection
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketHookConfig {
    autoConnect?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    timeout?: number;
}

interface WebSocketMessage {
    event: string;
    data: any;
    timestamp: Date;
    id: string;
}

export const useWebSocket = (
    namespace: string = '',
    config: WebSocketHookConfig = {}
) => {
    const {
        autoConnect = true,
        reconnectionAttempts = 5,
        reconnectionDelay = 1000,
        timeout = 20000
    } = config;

    // State
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [lastActivity, setLastActivity] = useState<Date | null>(null);
    const [messageQueue, setMessageQueue] = useState<WebSocketMessage[]>([]);
    const [reconnectAttempt, setReconnectAttempt] = useState(0);

    // Refs
    const socketRef = useRef<Socket | null>(null);
    const eventListenersRef = useRef<Map<string, Function[]>>(new Map());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize socket connection
    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        setIsConnecting(true);
        setConnectionError(null);

        try {
            // Connect to the AI server Socket.IO, not the Vite dev server
            const socketUrl = `http://localhost:5100${namespace}`;
            const socketInstance = io(socketUrl, {
                transports: ['websocket', 'polling'],
                timeout,
                reconnection: false, // We handle reconnection manually
                forceNew: true
            });

            // Connection event handlers
            socketInstance.on('connect', () => {
                console.log(`Connected to ${namespace || 'default'} namespace`);
                setIsConnected(true);
                setIsConnecting(false);
                setConnectionError(null);
                setLastActivity(new Date());
                setReconnectAttempt(0);

                // Process queued messages
                processMessageQueue(socketInstance);

                // Re-register event listeners
                reregisterEventListeners(socketInstance);
            });

            socketInstance.on('disconnect', (reason) => {
                console.log(`Disconnected from ${namespace || 'default'} namespace:`, reason);
                setIsConnected(false);
                setIsConnecting(false);

                // Attempt reconnection if not manually disconnected
                if (reason !== 'io client disconnect' && reconnectAttempt < reconnectionAttempts) {
                    scheduleReconnect();
                }
            });

            socketInstance.on('connect_error', (error) => {
                console.error(`Connection error for ${namespace || 'default'} namespace:`, error);
                setConnectionError(error.message);
                setIsConnecting(false);

                if (reconnectAttempt < reconnectionAttempts) {
                    scheduleReconnect();
                }
            });

            // Activity tracking
            socketInstance.onAny(() => {
                setLastActivity(new Date());
            });

            socketRef.current = socketInstance;
            setSocket(socketInstance);

        } catch (error) {
            console.error('Failed to create socket connection:', error);
            setConnectionError(error instanceof Error ? error.message : 'Connection failed');
            setIsConnecting(false);
        }
    }, [namespace, timeout, reconnectionAttempts, reconnectAttempt]);

    // Schedule reconnection attempt
    const scheduleReconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        const delay = reconnectionDelay * Math.pow(2, reconnectAttempt); // Exponential backoff

        reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connect();
        }, delay);
    }, [reconnectionDelay, reconnectAttempt, connect]);

    // Disconnect socket
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
        }

        setIsConnected(false);
        setIsConnecting(false);
        setReconnectAttempt(0);
    }, []);

    // Send message
    const sendMessage = useCallback((event: string, data: any = {}) => {
        const message: WebSocketMessage = {
            event,
            data,
            timestamp: new Date(),
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        if (socketRef.current?.connected) {
            try {
                socketRef.current.emit(event, data);
                setLastActivity(new Date());
                return Promise.resolve(message);
            } catch (error) {
                console.error('Failed to send message:', error);
                return Promise.reject(error);
            }
        } else {
            // Queue message for later sending
            setMessageQueue(prev => [...prev, message]);
            return Promise.reject(new Error('Socket not connected, message queued'));
        }
    }, []);

    // Process queued messages
    const processMessageQueue = useCallback((socketInstance: Socket) => {
        setMessageQueue(prev => {
            prev.forEach(message => {
                try {
                    socketInstance.emit(message.event, message.data);
                } catch (error) {
                    console.error('Failed to send queued message:', error);
                }
            });
            return [];
        });
    }, []);

    // Register event listener
    const on = useCallback((event: string, handler: Function) => {
        // Store listener for re-registration
        const listeners = eventListenersRef.current.get(event) || [];
        listeners.push(handler);
        eventListenersRef.current.set(event, listeners);

        // Register with current socket if connected
        if (socketRef.current) {
            socketRef.current.on(event, handler as any);
        }

        // Return unsubscribe function
        return () => {
            const currentListeners = eventListenersRef.current.get(event) || [];
            const index = currentListeners.indexOf(handler);
            if (index > -1) {
                currentListeners.splice(index, 1);
                eventListenersRef.current.set(event, currentListeners);
            }

            if (socketRef.current) {
                socketRef.current.off(event, handler as any);
            }
        };
    }, []);

    // Remove event listener
    const off = useCallback((event: string, handler?: Function) => {
        if (handler) {
            const listeners = eventListenersRef.current.get(event) || [];
            const index = listeners.indexOf(handler);
            if (index > -1) {
                listeners.splice(index, 1);
                eventListenersRef.current.set(event, listeners);
            }
        } else {
            eventListenersRef.current.delete(event);
        }

        if (socketRef.current) {
            if (handler) {
                socketRef.current.off(event, handler as any);
            } else {
                socketRef.current.removeAllListeners(event);
            }
        }
    }, []);

    // Re-register all event listeners
    const reregisterEventListeners = useCallback((socketInstance: Socket) => {
        eventListenersRef.current.forEach((listeners, event) => {
            listeners.forEach(listener => {
                socketInstance.on(event, listener as any);
            });
        });
    }, []);

    // Initialize connection on mount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            disconnect();
        };
    }, [disconnect]);

    return {
        socket,
        isConnected,
        isConnecting,
        connectionError,
        lastActivity,
        messageQueue: messageQueue.length,
        reconnectAttempt,
        connect,
        disconnect,
        sendMessage,
        on,
        off
    };
};

export default useWebSocket;
