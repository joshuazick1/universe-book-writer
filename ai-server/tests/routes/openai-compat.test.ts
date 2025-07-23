/**
 * Test suite for OpenAI API compatibility endpoints
 * Tests all implemented OpenAI v1 API endpoints for proper functionality
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import { getOrchestratorInstance, resetOrchestratorInstance } from '../../src/orchestrator-instance';

// Import the router after setting up orchestrator
const openaiCompat = await import('../../src/routes/openaiCompat');

const app = express();
app.use('/v1', openaiCompat.default);

// Mock auth token for testing
const mockAuthToken = 'Bearer test-api-key';

describe('OpenAI API Compatibility', () => {
    let orchestrator: any;

    beforeAll(() => {
        // Reset orchestrator and set up test state
        resetOrchestratorInstance();
        orchestrator = getOrchestratorInstance();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('Authentication', () => {
        it('should reject requests without authorization header', async () => {
            const response = await request(app)
                .get('/v1/models');

            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('invalid_api_key');
        });

        it('should accept requests with Bearer token', async () => {
            const response = await request(app)
                .get('/v1/models')
                .set('Authorization', mockAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('object', 'list');
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('Models API', () => {
        it('should list available models', async () => {
            const response = await request(app)
                .get('/v1/models')
                .set('Authorization', mockAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('object', 'list');
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should retrieve a specific model', async () => {
            const response = await request(app)
                .get('/v1/models/llama3')
                .set('Authorization', mockAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', 'llama3');
            expect(response.body).toHaveProperty('object', 'model');
        });
    });

    describe('Chat Completions API', () => {
        it('should handle chat completion requests', async () => {
            // Mock the actual streaming handler response since we can't easily test streaming in Jest
            jest.doMock('../../src/compat/openai/chatCompletions.js', () => ({
                handleChatCompletions: jest.fn().mockImplementation((req: any, res: any) => {
                    res.status(200).json({
                        id: 'chatcmpl-test',
                        object: 'chat.completion',
                        created: Math.floor(Date.now() / 1000),
                        model: 'llama3',
                        choices: [{
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: 'Test response'
                            },
                            finish_reason: 'stop'
                        }],
                        usage: {
                            prompt_tokens: 10,
                            completion_tokens: 5,
                            total_tokens: 15
                        }
                    });
                })
            }));

            const response = await request(app)
                .post('/v1/chat/completions')
                .set('Authorization', mockAuthToken)
                .send({
                    model: 'llama3',
                    messages: [{ role: 'user', content: 'Hello' }]
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('object', 'chat.completion');
            expect(response.body).toHaveProperty('choices');
            expect(Array.isArray(response.body.choices)).toBe(true);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/v1/chat/completions')
                .set('Authorization', mockAuthToken)
                .send({});

            expect(response.status).toBe(400);
        });
    });

    describe('Completions API', () => {
        it('should handle completion requests', async () => {
            // Mock the completions handler
            jest.doMock('../../src/compat/openai/completions.js', () => ({
                handleCompletions: jest.fn().mockImplementation((req: any, res: any) => {
                    res.status(200).json({
                        id: 'cmpl-test',
                        object: 'text_completion',
                        created: Math.floor(Date.now() / 1000),
                        model: 'llama3',
                        choices: [{
                            text: 'Test completion',
                            index: 0,
                            finish_reason: 'stop'
                        }],
                        usage: {
                            prompt_tokens: 5,
                            completion_tokens: 5,
                            total_tokens: 10
                        }
                    });
                })
            }));

            const response = await request(app)
                .post('/v1/completions')
                .set('Authorization', mockAuthToken)
                .send({
                    model: 'llama3',
                    prompt: 'Hello'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('object', 'text_completion');
            expect(response.body).toHaveProperty('choices');
        });
    });

    describe('Files API', () => {
        it('should list files', async () => {
            const response = await request(app)
                .get('/v1/files')
                .set('Authorization', mockAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('object', 'list');
            expect(response.body).toHaveProperty('data');
        });

        it('should upload a file', async () => {
            const response = await request(app)
                .post('/v1/files')
                .set('Authorization', mockAuthToken)
                .field('purpose', 'fine-tune')
                .attach('file', Buffer.from('test content'), 'test.txt');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('object', 'file');
        });

        it('should validate file purpose', async () => {
            const response = await request(app)
                .post('/v1/files')
                .set('Authorization', mockAuthToken)
                .field('purpose', 'invalid')
                .attach('file', Buffer.from('test content'), 'test.txt');

            expect(response.status).toBe(400);
        });
    });

    describe('Assistants API', () => {
        it('should create an assistant', async () => {
            const response = await request(app)
                .post('/v1/assistants')
                .set('Authorization', mockAuthToken)
                .send({
                    model: 'gpt-4',
                    name: 'Test Assistant',
                    instructions: 'You are a helpful assistant.'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('object', 'assistant');
            expect(response.body).toHaveProperty('name', 'Test Assistant');
        });

        it('should list assistants', async () => {
            const response = await request(app)
                .get('/v1/assistants')
                .set('Authorization', mockAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('object', 'list');
            expect(response.body).toHaveProperty('data');
        });
    });

    describe('Threads API', () => {
        it('should create a thread', async () => {
            const response = await request(app)
                .post('/v1/threads')
                .set('Authorization', mockAuthToken)
                .send({});

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('object', 'thread');
        });

        it('should list threads', async () => {
            const response = await request(app)
                .get('/v1/threads')
                .set('Authorization', mockAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('object', 'list');
            expect(response.body).toHaveProperty('data');
        });
    });

    describe('Fine-tuning API', () => {
        it('should create a fine-tuning job', async () => {
            const response = await request(app)
                .post('/v1/fine-tuning/jobs')
                .set('Authorization', mockAuthToken)
                .send({
                    training_file: 'file-test',
                    model: 'gpt-3.5-turbo'
                });

            expect(response.status).toBe(400); // Expected since we don't have file validation
        });

        it('should list fine-tuning jobs', async () => {
            const response = await request(app)
                .get('/v1/fine-tuning/jobs')
                .set('Authorization', mockAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('object', 'list');
            expect(response.body).toHaveProperty('data');
        });
    });

    describe('Audio API', () => {
        it('should handle transcription requests', async () => {
            const response = await request(app)
                .post('/v1/audio/transcriptions')
                .set('Authorization', mockAuthToken)
                .field('model', 'whisper-1')
                .attach('file', Buffer.from('fake audio'), 'audio.mp3');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('text');
        });

        it('should handle speech generation', async () => {
            const response = await request(app)
                .post('/v1/audio/speech')
                .set('Authorization', mockAuthToken)
                .send({
                    model: 'tts-1',
                    input: 'Hello world',
                    voice: 'alloy'
                });

            expect(response.status).toBe(200);
        });
    });

    describe('Images API', () => {
        it('should generate images', async () => {
            const response = await request(app)
                .post('/v1/images/generations')
                .set('Authorization', mockAuthToken)
                .send({
                    prompt: 'A beautiful sunset',
                    n: 1,
                    size: '1024x1024'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
        });
    });

    describe('Moderations API', () => {
        it('should moderate content', async () => {
            const response = await request(app)
                .post('/v1/moderations')
                .set('Authorization', mockAuthToken)
                .send({
                    input: 'Hello world'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('results');
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for unknown endpoints', async () => {
            const response = await request(app)
                .get('/v1/unknown')
                .set('Authorization', mockAuthToken);

            expect(response.status).toBe(404);
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/v1/chat/completions')
                .set('Authorization', mockAuthToken)
                .set('Content-Type', 'application/json')
                .send('invalid json{');

            expect(response.status).toBe(400);
        });
    });
});
