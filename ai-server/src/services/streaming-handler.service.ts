/**
 * Handle streaming responses transparently
 * Maintains exact NDJSON and SSE formats
 */

import { Readable } from 'stream';
import fetch from 'node-fetch';
import { logger } from '../../../shared/logging/logger.js';

export interface StreamingOptions {
    readonly url: string;
    readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    readonly headers?: Record<string, string>;
    readonly body?: any;
    readonly timeout?: number;
}

export class StreamingHandlerService {
    /**
     * Handle streaming request and return a passthrough stream
     * @param options - Streaming request options
     * @returns ReadableStream that maintains exact format
     */
    async handleStreamingRequest(options: StreamingOptions): Promise<Readable> {
        try {
            logger.info('StreamingHandler: Initiating streaming request', { url: options.url });

            const requestOptions: any = {
                method: options.method,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                timeout: options.timeout || 30000
            };

            if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
                requestOptions.body = typeof options.body === 'string'
                    ? options.body
                    : JSON.stringify(options.body);
            }

            const response = await fetch(options.url, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('No response body available for streaming');
            }

            logger.info('StreamingHandler: Successfully initiated stream', {
                url: options.url,
                status: response.status
            });

            // Return the response body as a readable stream
            // This maintains exact NDJSON/SSE format without modification
            return response.body as Readable;

        } catch (error) {
            logger.error('StreamingHandler: Failed to handle streaming request', {
                error: error instanceof Error ? error.message : 'Unknown error',
                url: options.url
            });
            throw error;
        }
    }

    /**
     * Create a passthrough stream that logs data flow
     * @param sourceStream - The source stream to monitor
     * @param jobId - Job ID for logging context
     * @returns Monitored readable stream
     */
    createMonitoredStream(sourceStream: Readable, jobId: string): Readable {
        const monitoredStream = new Readable({
            read() {
                // Passthrough - no-op
            }
        });

        let bytesTransferred = 0;
        let chunksReceived = 0;

        sourceStream.on('data', (chunk) => {
            bytesTransferred += chunk.length;
            chunksReceived++;

            // Forward the chunk unchanged
            monitoredStream.push(chunk);
        });

        sourceStream.on('end', () => {
            logger.info('StreamingHandler: Stream completed', {
                jobId,
                bytesTransferred,
                chunksReceived
            });
            monitoredStream.push(null); // End the stream
        });

        sourceStream.on('error', (error) => {
            logger.error('StreamingHandler: Stream error', {
                jobId,
                error: error.message,
                bytesTransferred,
                chunksReceived
            });
            monitoredStream.destroy(error);
        });

        return monitoredStream;
    }

    /**
     * Validate that streaming response maintains correct format
     * @param data - Chunk of streaming data
     * @param expectedFormat - Expected format (ndjson, sse, etc.)
     * @returns True if format is valid
     */
    validateStreamingFormat(data: Buffer | string, expectedFormat: 'ndjson' | 'sse' | 'plain'): boolean {
        try {
            const content = data.toString();

            switch (expectedFormat) {
                case 'ndjson':
                    // Each line should be valid JSON
                    const lines = content.split('\n').filter(line => line.trim());
                    return lines.every(line => {
                        try {
                            JSON.parse(line);
                            return true;
                        } catch {
                            return false;
                        }
                    });

                case 'sse':
                    // Should start with "data: " or be event lines
                    return content.includes('data: ') || content.includes('event: ');

                case 'plain':
                    return true; // Plain text always valid

                default:
                    return false;
            }
        } catch (error) {
            logger.warn('StreamingHandler: Failed to validate streaming format', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
}
