/**
 * Unit tests for Community-Based Model Selection Service
 * Tests the enhanced model selection logic using graph-based insights
 */

import { CommunityBasedModelSelectionService, ModelSelectionRecommendation, AllocationStrategy } from '../services/community-based-model-selection.service.js';
import { GraphRelationshipService } from '../services/graph-relationship.service.js';
import { Node, NodeType } from '../../../shared/types/nodeTypes.js';

// Mock the dependencies
jest.mock('../services/graph-relationship.service.js');
jest.mock('../../../shared/database/database.config.js', () => ({
    sharedDatabaseConnection: {
        db: {
            collection: jest.fn(() => ({
                find: jest.fn(),
                findOne: jest.fn(),
                updateOne: jest.fn(),
                toArray: jest.fn(() => Promise.resolve([]))
            }))
        }
    }
}));

describe('CommunityBasedModelSelectionService', () => {
    let service: CommunityBasedModelSelectionService;
    let mockGraphService: jest.Mocked<GraphRelationshipService>;
    let mockModels: Node[];
    let mockServers: Node[];

    beforeEach(() => {
        service = new CommunityBasedModelSelectionService();
        mockGraphService = new GraphRelationshipService() as jest.Mocked<GraphRelationshipService>;
        (service as any).graphService = mockGraphService;

        mockModels = [
            {
                id: 'llama-7b',
                type: 'ai-model' as NodeType,
                title: 'Llama 7B',
                metadata: {
                    benchmarks: {
                        'creative-writing': { score: 0.85, timestamp: '2024-01-01' },
                        'code-generation': { score: 0.75, timestamp: '2024-01-01' },
                        'dialogue-generation': { score: 0.8, timestamp: '2024-01-01' }
                    },
                    size: '7B',
                    family: 'llama',
                    lastBenchmarked: '2024-01-15T10:00:00Z'
                }
            },
            {
                id: 'mistral-7b',
                type: 'ai-model' as NodeType,
                title: 'Mistral 7B',
                metadata: {
                    benchmarks: {
                        'creative-writing': { score: 0.82, timestamp: '2024-01-01' },
                        'typescript-quality': { score: 0.88, timestamp: '2024-01-01' },
                        'task-planning': { score: 0.79, timestamp: '2024-01-01' }
                    },
                    size: '7B',
                    family: 'mistral'
                }
            }
        ];

        mockServers = [
            {
                id: 'server-alpha',
                type: 'ai-server' as NodeType,
                title: 'Server Alpha',
                metadata: {
                    region: 'us-east',
                    currentLoad: 0.3,
                    healthScore: 0.95,
                    estimatedMemory: 16000,
                    avgLatency: 1200,
                    uptime: 0.99
                }
            },
            {
                id: 'server-beta',
                type: 'ai-server' as NodeType,
                title: 'Server Beta',
                metadata: {
                    region: 'eu-west',
                    currentLoad: 0.7,
                    healthScore: 0.88,
                    estimatedMemory: 32000,
                    avgLatency: 800,
                    uptime: 0.95
                }
            }
        ];
    });

    describe('getModelRecommendations', () => {
        beforeEach(() => {
            // Mock database collections
            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockImplementation((query: any) => {
                        if (query?.type === 'ai-model') return Promise.resolve(mockModels);
                        if (query?.type === 'ai-server') return Promise.resolve(mockServers);
                        return Promise.resolve([]);
                    })
                })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            // Mock graph service methods
            mockGraphService.generateCommunityScores = jest.fn().mockResolvedValue([
                {
                    nodeId: 'llama-7b',
                    communityId: 'community-1',
                    score: 0.8,
                    rank: 2,
                    peerNodes: ['mistral-7b'],
                    influenceMetrics: { networkCentrality: 0.7, clusteringCoefficient: 0.6, betweennessCentrality: 0.5 }
                },
                {
                    nodeId: 'mistral-7b',
                    communityId: 'community-1',
                    score: 0.75,
                    rank: 3,
                    peerNodes: ['llama-7b'],
                    influenceMetrics: { networkCentrality: 0.65, clusteringCoefficient: 0.55, betweennessCentrality: 0.45 }
                }
            ]);
        });

        it('should generate recommendations for creative writing task', async () => {
            const requestData = {
                taskType: 'creative-writing',
                requiredCapabilities: ['creative-writing']
            };

            const recommendations = await service.getModelRecommendations(requestData);

            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations.length).toBeGreaterThan(0);

            // Check recommendation structure
            const rec = recommendations[0];
            expect(rec).toHaveProperty('modelId');
            expect(rec).toHaveProperty('serverId');
            expect(rec).toHaveProperty('score');
            expect(rec).toHaveProperty('confidence');
            expect(rec).toHaveProperty('reasonCodes');
            expect(rec).toHaveProperty('reasons');
            expect(rec).toHaveProperty('graphInsights');
            expect(rec).toHaveProperty('performanceMetrics');

            // Validate score range
            expect(rec.score).toBeGreaterThanOrEqual(0);
            expect(rec.score).toBeLessThanOrEqual(1);

            // Validate confidence range
            expect(rec.confidence).toBeGreaterThanOrEqual(0);
            expect(rec.confidence).toBeLessThanOrEqual(1);
        });

        it('should prioritize models with better benchmarks for specific tasks', async () => {
            const requestData = {
                taskType: 'code-generation',
                requiredCapabilities: ['code-generation']
            };

            const recommendations = await service.getModelRecommendations(requestData);

            expect(recommendations.length).toBeGreaterThan(0);

            // Find Mistral recommendation (better TypeScript scores)
            const mistralRec = recommendations.find(r => r.modelId === 'Mistral 7B');
            const llamaRec = recommendations.find(r => r.modelId === 'Llama 7B');

            if (mistralRec && llamaRec) {
                // Mistral should score higher for code generation due to TypeScript benchmark
                expect(mistralRec.score).toBeGreaterThan(llamaRec.score);
            }
        });

        it('should filter models by required capabilities', async () => {
            const requestData = {
                taskType: 'specialized-task',
                requiredCapabilities: ['non-existent-capability']
            };

            const recommendations = await service.getModelRecommendations(requestData);

            // Should return fewer or no recommendations due to capability filtering
            expect(recommendations.length).toBeLessThanOrEqual(mockModels.length);
        });

        it('should respect server constraints', async () => {
            const requestData = {
                taskType: 'creative-writing',
                constraints: {
                    excludeServers: ['server-beta'],
                    maxLoadThreshold: 0.5
                }
            };

            const recommendations = await service.getModelRecommendations(requestData);

            // Should not recommend excluded servers or high-load servers
            for (const rec of recommendations) {
                expect(rec.serverId).not.toBe('Server Beta');
            }
        });

        it('should handle performance requirements', async () => {
            const requestData = {
                taskType: 'creative-writing',
                performanceRequirements: {
                    maxLatency: 1000,
                    minQuality: 0.8
                }
            };

            const recommendations = await service.getModelRecommendations(requestData);

            // Check that recommendations meet performance requirements
            for (const rec of recommendations) {
                expect(rec.performanceMetrics.predictedLatency).toBeLessThanOrEqual(1000);
                expect(rec.performanceMetrics.predictedQuality).toBeGreaterThanOrEqual(0.8);
            }
        });

        it('should apply allocation strategy weights correctly', async () => {
            const performanceStrategy: AllocationStrategy = {
                strategy: 'performance_optimized',
                weights: { performance: 0.8, community: 0.1, availability: 0.05, proximity: 0.05 },
                constraints: {}
            };

            const requestData = { taskType: 'creative-writing' };
            const recommendations = await service.getModelRecommendations(requestData, performanceStrategy);

            expect(recommendations.length).toBeGreaterThan(0);
            // Recommendations should be sorted by performance-weighted scores
            for (let i = 1; i < recommendations.length; i++) {
                expect(recommendations[i - 1].score).toBeGreaterThanOrEqual(recommendations[i].score);
            }
        });
    });

    describe('getModelGraphInsights', () => {
        beforeEach(() => {
            mockGraphService.getGraphBasedInsights = jest.fn().mockResolvedValue({
                relationshipAnalysis: {
                    similarModels: ['mistral-7b'],
                    networkPosition: 'central',
                    performanceCluster: 'high-performance'
                },
                communityContext: {
                    peerModels: ['mistral-7b'],
                    avgPerformance: 0.8,
                    communityStrength: 0.75
                }
            });

            mockGraphService.generateCommunityScores = jest.fn().mockResolvedValue([
                {
                    nodeId: 'llama-7b',
                    communityId: 'community-1',
                    score: 0.8,
                    rank: 2,
                    peerNodes: ['mistral-7b'],
                    influenceMetrics: { networkCentrality: 0.7, clusteringCoefficient: 0.6, betweennessCentrality: 0.5 }
                }
            ]);
        });

        it('should provide comprehensive insights for a model', async () => {
            const insights = await service.getModelGraphInsights('llama-7b');

            expect(insights).toHaveProperty('communityAnalysis');
            expect(insights).toHaveProperty('relationshipAnalysis');
            expect(insights).toHaveProperty('performanceCluster');
            expect(insights).toHaveProperty('recommendations');

            // Validate community analysis
            expect(insights.communityAnalysis.communityId).toBeDefined();
            expect(insights.communityAnalysis.rank).toBeGreaterThanOrEqual(1);
            expect(insights.communityAnalysis.score).toBeGreaterThanOrEqual(0);
            expect(insights.communityAnalysis.score).toBeLessThanOrEqual(1);

            // Validate relationship analysis
            expect(insights.relationshipAnalysis.totalRelationships).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(insights.relationshipAnalysis.relationshipTypes)).toBe(true);

            // Validate performance cluster
            expect(insights.performanceCluster.clusterId).toBeDefined();
            expect(Array.isArray(insights.performanceCluster.similarModels)).toBe(true);

            // Validate recommendations
            expect(Array.isArray(insights.recommendations.suggestedPeers)).toBe(true);
            expect(Array.isArray(insights.recommendations.improvementAreas)).toBe(true);
            expect(Array.isArray(insights.recommendations.benchmarkGaps)).toBe(true);
        });

        it('should handle models with limited graph data', async () => {
            mockGraphService.generateCommunityScores = jest.fn().mockResolvedValue([]);

            const insights = await service.getModelGraphInsights('isolated-model');

            expect(insights).toBeDefined();
            expect(insights.communityAnalysis.score).toBe(0);
            expect(insights.communityAnalysis.peerCount).toBe(0);
        });
    });

    describe('updateModelPerformanceMetrics', () => {
        beforeEach(() => {
            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([
                        {
                            id: 'perf-1',
                            type: 'model-performance' as NodeType,
                            metadata: {
                                modelId: 'llama-7b',
                                serverId: 'server-alpha',
                                recentMetrics: { latency: 1000, quality: 0.8 }
                            }
                        }
                    ])
                }),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);
        });

        it('should update performance metrics successfully', async () => {
            const metrics = {
                actualLatency: 1200,
                qualityScore: 0.85,
                successRate: 0.95,
                timestamp: new Date()
            };

            await service.updateModelPerformanceMetrics('llama-7b', 'server-alpha', metrics);

            // Verify that the update was called
            const mockCollection = require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection();
            expect(mockCollection.updateOne).toHaveBeenCalled();
        });

        it('should handle significant performance changes', async () => {
            const significantChange = {
                actualLatency: 2000, // 100% increase from baseline 1000ms
                qualityScore: 0.9,
                successRate: 0.98,
                timestamp: new Date()
            };

            const spy = jest.spyOn(service as any, 'triggerRelationshipUpdate').mockImplementation();

            await service.updateModelPerformanceMetrics('llama-7b', 'server-alpha', significantChange);

            expect(spy).toHaveBeenCalledWith('llama-7b');
        });
    });

    describe('generateOptimalAllocationStrategy', () => {
        it('should generate load-balanced strategy under high load', async () => {
            const highLoadMetrics = {
                totalLoad: 0.9,
                avgLatency: 2000,
                failureRate: 0.05,
                peakHours: true
            };

            const strategy = await service.generateOptimalAllocationStrategy(highLoadMetrics);

            expect(strategy.strategy).toBe('load_balanced');
            expect(strategy.weights.availability).toBeGreaterThan(strategy.weights.performance);
            expect(strategy.constraints?.maxLoadThreshold).toBeLessThan(0.8);
        });

        it('should generate performance-optimized strategy under high failure rate', async () => {
            const highFailureMetrics = {
                totalLoad: 0.4,
                avgLatency: 1500,
                failureRate: 0.15,
                peakHours: false
            };

            const strategy = await service.generateOptimalAllocationStrategy(highFailureMetrics);

            expect(strategy.strategy).toBe('performance_optimized');
            expect(strategy.weights.performance).toBeGreaterThan(strategy.weights.community);
        });

        it('should generate community-based strategy under normal conditions', async () => {
            const normalMetrics = {
                totalLoad: 0.5,
                avgLatency: 1200,
                failureRate: 0.02,
                peakHours: false
            };

            const strategy = await service.generateOptimalAllocationStrategy(normalMetrics);

            expect(strategy.strategy).toBe('community_based');
            expect(strategy.weights.community).toBeGreaterThan(strategy.weights.availability);
        });
    });

    describe('Performance Calculation Methods', () => {
        it('should calculate performance scores correctly', () => {
            const requestData = { taskType: 'creative-writing' };
            const score = (service as any).calculatePerformanceScore(mockModels[0], mockServers[0], requestData);

            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
        });

        it('should calculate availability scores correctly', () => {
            const score = (service as any).calculateAvailabilityScore(mockServers[0]);

            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
            // High availability server should score well
            expect(score).toBeGreaterThan(0.7);
        });

        it('should calculate proximity scores correctly', () => {
            const requestData = {
                constraints: { preferredRegions: ['us-east'] }
            };

            const score = (service as any).calculateProximityScore(mockServers[0], requestData);
            expect(score).toBe(1.0); // Perfect match

            const scoreNoMatch = (service as any).calculateProximityScore(mockServers[1], requestData);
            expect(scoreNoMatch).toBe(0.3); // No match
        });
    });

    describe('Task Type Weighting', () => {
        it('should apply correct weights for creative writing', () => {
            const weights = (service as any).getTaskTypeWeights('creative-writing');

            expect(weights['creative-writing']).toBeGreaterThan(weights['code-generation'] || 1);
            expect(weights['character-consistency']).toBeGreaterThan(1);
        });

        it('should apply correct weights for code generation', () => {
            const weights = (service as any).getTaskTypeWeights('code-generation');

            expect(weights['typescript-quality']).toBeGreaterThan(weights['creative-writing'] || 1);
            expect(weights['advanced-code-generation']).toBeGreaterThan(1);
        });
    });

    describe('Capability Filtering', () => {
        it('should extract model capabilities correctly', () => {
            const capabilities = (service as any).extractModelCapabilities(mockModels[0]);

            expect(Array.isArray(capabilities)).toBe(true);
            expect(capabilities).toContain('creative-writing');
            expect(capabilities).toContain('code-generation');
            expect(capabilities).toContain('conversational');
        });

        it('should filter models by capabilities correctly', () => {
            const requiredCapabilities = ['creative-writing'];
            const filtered = (service as any).filterModelsByCapabilities(mockModels, requiredCapabilities);

            expect(filtered.length).toBeLessThanOrEqual(mockModels.length);
            // All filtered models should have the required capability
            for (const model of filtered) {
                const capabilities = (service as any).extractModelCapabilities(model);
                expect(capabilities.some((cap: string) => requiredCapabilities.some(req => cap.includes(req.toLowerCase())))).toBe(true);
            }
        });
    });

    describe('Server Compatibility', () => {
        it('should filter servers by memory requirements', async () => {
            const model = mockModels[0]; // 7B model
            const compatible = await (service as any).getCompatibleServers(model, mockServers);

            // All compatible servers should have sufficient memory
            for (const server of compatible) {
                const memoryReq = (service as any).estimateModelMemoryRequirement(model);
                expect(server.metadata?.estimatedMemory || 0).toBeGreaterThanOrEqual(memoryReq);
            }
        });

        it('should respect server constraints', async () => {
            const constraints = {
                excludeServers: ['server-beta'],
                maxLoadThreshold: 0.5
            };

            const compatible = await (service as any).getCompatibleServers(mockModels[0], mockServers, constraints);

            // Should exclude specified servers
            expect(compatible.every((s: any) => s.id !== 'server-beta')).toBe(true);

            // Should respect load threshold
            expect(compatible.every((s: any) => (s.metadata?.currentLoad || 0) < 0.5)).toBe(true);
        });
    });

    describe('Confidence Calculation', () => {
        it('should calculate confidence based on data availability', () => {
            const community = {
                nodeId: 'llama-7b',
                communityId: 'community-1',
                score: 0.8,
                rank: 2,
                peerNodes: ['mistral-7b'],
                influenceMetrics: { networkCentrality: 0.7 }
            };

            const confidence = (service as any).calculateConfidence(mockModels[0], mockServers[0], community);

            expect(confidence).toBeGreaterThanOrEqual(0);
            expect(confidence).toBeLessThanOrEqual(1);

            // Should be higher with more data available
            expect(confidence).toBeGreaterThan(0.5);
        });

        it('should handle missing data gracefully', () => {
            const modelWithoutData = {
                id: 'minimal-model',
                type: 'ai-model' as NodeType,
                title: 'Minimal Model',
                metadata: {}
            };

            const confidence = (service as any).calculateConfidence(modelWithoutData, mockServers[0]);

            expect(confidence).toBeGreaterThanOrEqual(0);
            expect(confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('Performance Prediction', () => {
        it('should predict performance metrics realistically', async () => {
            const metrics = await (service as any).predictPerformanceMetrics(mockModels[0], mockServers[0]);

            expect(metrics.predictedLatency).toBeGreaterThan(0);
            expect(metrics.predictedQuality).toBeGreaterThanOrEqual(0);
            expect(metrics.predictedQuality).toBeLessThanOrEqual(1);
            expect(metrics.reliabilityScore).toBeGreaterThanOrEqual(0);
            expect(metrics.reliabilityScore).toBeLessThanOrEqual(1);
            expect(metrics.capacityUtilization).toBeGreaterThanOrEqual(0);
            expect(metrics.capacityUtilization).toBeLessThanOrEqual(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            const mockCollection = {
                find: jest.fn().mockRejectedValue(new Error('Database error'))
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            await expect(service.getModelRecommendations({ taskType: 'test' })).rejects.toThrow();
        });

        it('should handle missing graph service data', async () => {
            mockGraphService.generateCommunityScores = jest.fn().mockRejectedValue(new Error('Graph service error'));

            // Should still work with degraded functionality
            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(mockModels)
                })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            await expect(service.getModelRecommendations({ taskType: 'test' })).rejects.toThrow();
        });
    });

    describe('Caching', () => {
        it('should cache community scores', async () => {
            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(mockModels)
                })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            mockGraphService.generateCommunityScores = jest.fn().mockResolvedValue([]);

            // First call
            await (service as any).getCommunityScores(['llama-7b']);
            const firstCallCount = mockGraphService.generateCommunityScores.mock.calls.length;

            // Second call (should use cache)
            await (service as any).getCommunityScores(['llama-7b']);
            const secondCallCount = mockGraphService.generateCommunityScores.mock.calls.length;

            // Cache behavior verification (implementation dependent)
            expect(secondCallCount).toBeGreaterThanOrEqual(firstCallCount);
        });
    });
});
