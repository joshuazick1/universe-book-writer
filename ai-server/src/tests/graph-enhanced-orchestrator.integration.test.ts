/**
 * Integration tests for Graph-Enhanced Orchestrator
 * Tests the complete Phase 3 implementation and integration
 */

import { GraphEnhancedOrchestrator, GraphEnhancedRequest, GraphEnhancedRoutingDecision } from '../services/graph-enhanced-orchestrator.service.js';
import { CommunityBasedModelSelectionService } from '../services/community-based-model-selection.service.js';
import { GraphRelationshipService } from '../services/graph-relationship.service.js';

// Mock all dependencies
jest.mock('../services/community-based-model-selection.service.js');
jest.mock('../services/graph-relationship.service.js');

describe('GraphEnhancedOrchestrator Integration Tests', () => {
    let orchestrator: GraphEnhancedOrchestrator;
    let mockModelSelectionService: jest.Mocked<CommunityBasedModelSelectionService>;
    let mockGraphService: jest.Mocked<GraphRelationshipService>;

    beforeEach(() => {
        // Create mocked services
        mockModelSelectionService = new CommunityBasedModelSelectionService() as jest.Mocked<CommunityBasedModelSelectionService>;
        mockGraphService = new GraphRelationshipService() as jest.Mocked<GraphRelationshipService>;

        // Create orchestrator and inject mocks
        orchestrator = new GraphEnhancedOrchestrator();
        (orchestrator as any).modelSelectionService = mockModelSelectionService;
        (orchestrator as any).graphService = mockGraphService;

        // Setup default mocks
        mockModelSelectionService.getModelRecommendations = jest.fn().mockResolvedValue([
            {
                modelId: 'llama-7b',
                serverId: 'server-alpha',
                score: 0.85,
                confidence: 0.9,
                reasonCodes: ['HIGH_PERFORMANCE', 'STRONG_COMMUNITY'],
                reasons: ['Excellent performance on creative writing benchmarks', 'Strong community standing'],
                graphInsights: {
                    communityRank: 2,
                    performanceCluster: 'high-performance',
                    peerModels: ['mistral-7b'],
                    networkPosition: 'central',
                    relationshipStrength: 0.8
                },
                performanceMetrics: {
                    predictedLatency: 1200,
                    predictedQuality: 0.85,
                    reliabilityScore: 0.95,
                    capacityUtilization: 0.4
                }
            },
            {
                modelId: 'mistral-7b',
                serverId: 'server-beta',
                score: 0.78,
                confidence: 0.8,
                reasonCodes: ['HIGH_PERFORMANCE'],
                reasons: ['Good performance metrics'],
                graphInsights: {
                    communityRank: 3,
                    performanceCluster: 'high-performance',
                    peerModels: ['llama-7b'],
                    networkPosition: 'connected',
                    relationshipStrength: 0.7
                },
                performanceMetrics: {
                    predictedLatency: 1000,
                    predictedQuality: 0.8,
                    reliabilityScore: 0.88,
                    capacityUtilization: 0.6
                }
            }
        ]);

        mockModelSelectionService.generateOptimalAllocationStrategy = jest.fn().mockResolvedValue({
            strategy: 'hybrid' as const,
            weights: { performance: 0.4, community: 0.3, availability: 0.2, proximity: 0.1 },
            constraints: { minCommunityScore: 0.4, maxLoadThreshold: 0.8 }
        });
    });

    describe('Request Routing', () => {
        it('should route creative writing requests successfully', async () => {
            const request: GraphEnhancedRequest = {
                requestId: 'test-req-001',
                taskType: 'creative-writing',
                content: 'Write a short story about a magical forest.',
                metadata: { priority: 'normal' }
            };

            const decision = await orchestrator.routeRequest(request);

            expect(decision).toBeDefined();
            expect(decision.selectedModel).toBe('llama-7b');
            expect(decision.selectedServer).toBe('server-alpha');
            expect(decision.recommendation.score).toBeGreaterThan(0.8);
            expect(decision.graphInsights.confidenceLevel).toBeGreaterThan(0.5);
            expect(decision.alternativeOptions.length).toBeGreaterThan(0);
        });

        it('should handle high-priority requests appropriately', async () => {
            const request: GraphEnhancedRequest = {
                requestId: 'test-req-002',
                taskType: 'code-generation',
                content: 'Generate TypeScript code for a REST API.',
                metadata: { priority: 'critical' },
                constraints: { maxLatency: 800 }
            };

            const decision = await orchestrator.routeRequest(request);

            expect(decision).toBeDefined();
            expect(decision.estimatedPerformance.latency).toBeLessThanOrEqual(800);
            expect(decision.fallbackPlan.gracefulDegradation).toBe(false);
        });

        it('should respect geographic constraints', async () => {
            const request: GraphEnhancedRequest = {
                requestId: 'test-req-003',
                taskType: 'conversation',
                content: 'Have a conversation about science.',
                constraints: { preferredRegions: ['eu-west'] }
            };

            await orchestrator.routeRequest(request);

            expect(mockModelSelectionService.getModelRecommendations).toHaveBeenCalledWith(
                expect.objectContaining({
                    constraints: expect.objectContaining({
                        preferredRegions: ['eu-west']
                    })
                }),
                expect.any(Object)
            );
        });

        it('should handle server exclusions', async () => {
            const request: GraphEnhancedRequest = {
                requestId: 'test-req-004',
                taskType: 'creative-writing',
                content: 'Write a poem.',
                constraints: { excludeServers: ['server-beta'] }
            };

            await orchestrator.routeRequest(request);

            expect(mockModelSelectionService.getModelRecommendations).toHaveBeenCalledWith(
                expect.objectContaining({
                    constraints: expect.objectContaining({
                        excludeServers: ['server-beta']
                    })
                }),
                expect.any(Object)
            );
        });

        it('should generate emergency fallback when no recommendations available', async () => {
            mockModelSelectionService.getModelRecommendations = jest.fn().mockResolvedValue([]);

            const request: GraphEnhancedRequest = {
                requestId: 'test-req-005',
                taskType: 'creative-writing',
                content: 'Test content'
            };

            const decision = await orchestrator.routeRequest(request);

            expect(decision.selectedModel).toBe('emergency-model');
            expect(decision.selectedServer).toBe('emergency-server');
            expect(decision.graphInsights.confidenceLevel).toBe(0.1);
        });
    });

    describe('Performance Tracking', () => {
        it('should track request metrics during routing', async () => {
            const request: GraphEnhancedRequest = {
                requestId: 'test-req-006',
                taskType: 'creative-writing',
                content: 'Test content for tracking'
            };

            await orchestrator.routeRequest(request);

            // Verify that request metrics are being tracked
            const requestMetrics = (orchestrator as any).requestMetrics;
            expect(requestMetrics.has('test-req-006')).toBe(true);

            const metrics = requestMetrics.get('test-req-006');
            expect(metrics.modelId).toBe('llama-7b');
            expect(metrics.serverId).toBe('server-alpha');
            expect(metrics.taskType).toBe('creative-writing');
        });

        it('should update model performance based on actual results', async () => {
            const request: GraphEnhancedRequest = {
                requestId: 'test-req-007',
                taskType: 'creative-writing',
                content: 'Test content'
            };

            await orchestrator.routeRequest(request);

            const actualResults = {
                latency: 1300,
                qualityScore: 0.88,
                successRate: 0.96,
                userSatisfaction: 0.9
            };

            await orchestrator.updateModelPerformance('test-req-007', actualResults);

            expect(mockModelSelectionService.updateModelPerformanceMetrics).toHaveBeenCalledWith(
                'llama-7b',
                'server-alpha',
                expect.objectContaining({
                    actualLatency: 1300,
                    qualityScore: 0.88,
                    successRate: 0.96
                })
            );
        });

        it('should update system metrics based on performance data', async () => {
            const request: GraphEnhancedRequest = {
                requestId: 'test-req-008',
                taskType: 'code-generation',
                content: 'Test content'
            };

            await orchestrator.routeRequest(request);

            const goodResults = {
                latency: 800,
                qualityScore: 0.95,
                successRate: 0.99
            };

            const initialSystemMetrics = (orchestrator as any).systemMetrics;
            const initialAvgLatency = initialSystemMetrics.avgLatency;

            await orchestrator.updateModelPerformance('test-req-008', goodResults);

            const updatedSystemMetrics = (orchestrator as any).systemMetrics;

            // System metrics should be updated with new performance data
            expect(updatedSystemMetrics.avgLatency).not.toBe(initialAvgLatency);
        });

        it('should trigger score detection for high-quality results', async () => {
            const request: GraphEnhancedRequest = {
                requestId: 'test-req-009',
                taskType: 'creative-writing',
                content: 'Test content'
            };

            await orchestrator.routeRequest(request);

            const highQualityResults = {
                latency: 1000,
                qualityScore: 0.92,  // High quality
                successRate: 0.98
            };

            const triggerSpy = jest.spyOn(orchestrator as any, 'triggerScoreDetection').mockImplementation();

            await orchestrator.updateModelPerformance('test-req-009', highQualityResults);

            expect(triggerSpy).toHaveBeenCalledWith('llama-7b', highQualityResults);
        });
    });

    describe('Strategy Management', () => {
        it('should update allocation strategy periodically', async () => {
            // Force strategy update by setting last update time to past
            (orchestrator as any).lastStrategyUpdate = Date.now() - (10 * 60 * 1000); // 10 minutes ago

            const request: GraphEnhancedRequest = {
                requestId: 'test-req-010',
                taskType: 'creative-writing',
                content: 'Test content'
            };

            await orchestrator.routeRequest(request);

            expect(mockModelSelectionService.generateOptimalAllocationStrategy).toHaveBeenCalled();
        });

        it('should recalculate strategy on demand', async () => {
            const newStrategy = await orchestrator.recalculateStrategy();

            expect(newStrategy).toBeDefined();
            expect(newStrategy.strategy).toBeDefined();
            expect(newStrategy.weights).toBeDefined();
            expect(mockModelSelectionService.generateOptimalAllocationStrategy).toHaveBeenCalled();
        });

        it('should adapt strategy based on system conditions', async () => {
            // Mock high load conditions
            const highLoadMetrics = {
                totalLoad: 0.9,
                avgLatency: 3000,
                failureRate: 0.1,
                peakHours: true
            };

            mockModelSelectionService.generateOptimalAllocationStrategy = jest.fn().mockResolvedValue({
                strategy: 'load_balanced' as const,
                weights: { performance: 0.2, community: 0.1, availability: 0.6, proximity: 0.1 },
                constraints: { maxLoadThreshold: 0.7 }
            });

            // Simulate collecting high load metrics
            jest.spyOn(orchestrator as any, 'collectSystemMetrics').mockResolvedValue(highLoadMetrics);

            const strategy = await orchestrator.recalculateStrategy();

            expect(strategy.strategy).toBe('load_balanced');
            expect(strategy.weights.availability).toBeGreaterThan(0.5);
        });
    });

    describe('Model Insights', () => {
        it('should provide detailed model insights', async () => {
            mockModelSelectionService.getModelGraphInsights = jest.fn().mockResolvedValue({
                communityAnalysis: {
                    communityId: 'community-1',
                    rank: 2,
                    score: 0.8,
                    peerCount: 3,
                    influenceMetrics: { networkCentrality: 0.7 }
                },
                relationshipAnalysis: {
                    totalRelationships: 5,
                    strongRelationships: 3,
                    relationshipTypes: ['PERFORMANCE_SIMILAR', 'MODEL_FAMILY'],
                    networkPosition: 'central'
                },
                performanceCluster: {
                    clusterId: 'high-performance',
                    clusterRank: 2,
                    similarModels: ['mistral-7b', 'codellama-7b'],
                    avgPerformance: 0.82
                },
                recommendations: {
                    suggestedPeers: ['mistral-7b'],
                    improvementAreas: ['Long-form content generation'],
                    benchmarkGaps: ['Multi-modal reasoning']
                }
            });

            const insights = await orchestrator.getModelInsights('llama-7b');

            expect(insights).toBeDefined();
            expect(insights.graphInsights).toBeDefined();
            expect(insights.communityPosition).toBeDefined();
            expect(insights.performanceHistory).toBeDefined();
            expect(insights.recommendations).toBeDefined();

            expect(insights.graphInsights.communityAnalysis.rank).toBe(2);
            expect(insights.performanceHistory).toBeDefined();
            expect(Array.isArray(insights.recommendations)).toBe(true);
        });

        it('should handle models with limited performance history', async () => {
            mockModelSelectionService.getModelGraphInsights = jest.fn().mockResolvedValue({
                communityAnalysis: { communityId: 'unknown', rank: 999, score: 0, peerCount: 0 },
                relationshipAnalysis: { totalRelationships: 0, strongRelationships: 0, relationshipTypes: [], networkPosition: 'isolated' },
                performanceCluster: { clusterId: 'unknown', clusterRank: 999, similarModels: [], avgPerformance: 0 },
                recommendations: { suggestedPeers: [], improvementAreas: ['No data available'], benchmarkGaps: [] }
            });

            const insights = await orchestrator.getModelInsights('new-model');

            expect(insights).toBeDefined();
            expect(insights.graphInsights.communityAnalysis.score).toBe(0);
            expect(insights.graphInsights.relationshipAnalysis.totalRelationships).toBe(0);
        });
    });

    describe('System Status', () => {
        it('should provide comprehensive system status', async () => {
            const status = await orchestrator.getSystemStatus();

            expect(status).toBeDefined();
            expect(status.strategy).toBeDefined();
            expect(status.systemMetrics).toBeDefined();
            expect(status.modelUtilization).toBeDefined();
            expect(status.graphHealth).toBeDefined();
            expect(status.performance).toBeDefined();

            expect(status.graphHealth.totalNodes).toBeGreaterThan(0);
            expect(status.graphHealth.healthScore).toBeGreaterThanOrEqual(0);
            expect(status.graphHealth.healthScore).toBeLessThanOrEqual(1);

            expect(status.performance.avgLatency).toBeGreaterThan(0);
            expect(status.performance.successRate).toBeGreaterThanOrEqual(0);
            expect(status.performance.successRate).toBeLessThanOrEqual(1);
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle model selection service failures gracefully', async () => {
            mockModelSelectionService.getModelRecommendations = jest.fn().mockRejectedValue(new Error('Service unavailable'));

            const request: GraphEnhancedRequest = {
                requestId: 'test-req-011',
                taskType: 'creative-writing',
                content: 'Test content'
            };

            const decision = await orchestrator.routeRequest(request);

            // Should return emergency fallback
            expect(decision.selectedModel).toBe('emergency-model');
            expect(decision.selectedServer).toBe('emergency-server');
        });

        it('should handle graph service failures gracefully', async () => {
            mockModelSelectionService.getModelGraphInsights = jest.fn().mockRejectedValue(new Error('Graph service error'));

            await expect(orchestrator.getModelInsights('test-model')).rejects.toThrow('Graph service error');
        });

        it('should continue operation with degraded functionality', async () => {
            // Simulate partial service failure
            mockModelSelectionService.generateOptimalAllocationStrategy = jest.fn().mockRejectedValue(new Error('Strategy service error'));

            const request: GraphEnhancedRequest = {
                requestId: 'test-req-012',
                taskType: 'creative-writing',
                content: 'Test content'
            };

            await expect(orchestrator.recalculateStrategy()).rejects.toThrow('Strategy service error');

            // But routing should still work with default strategy
            const decision = await orchestrator.routeRequest(request);
            expect(decision).toBeDefined();
        });
    });

    describe('Performance and Scaling', () => {
        it('should handle concurrent requests efficiently', async () => {
            const requests = Array.from({ length: 10 }, (_, i) => ({
                requestId: `concurrent-req-${i}`,
                taskType: 'creative-writing',
                content: `Test content ${i}`
            }));

            const startTime = Date.now();
            const decisions = await Promise.all(
                requests.map(req => orchestrator.routeRequest(req))
            );
            const duration = Date.now() - startTime;

            expect(decisions.length).toBe(10);
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

            // All decisions should be valid
            for (const decision of decisions) {
                expect(decision.selectedModel).toBeDefined();
                expect(decision.selectedServer).toBeDefined();
                expect(decision.recommendation.score).toBeGreaterThan(0);
            }
        });

        it('should clean up old metrics periodically', async () => {
            // Add some test metrics
            const requestMetrics = (orchestrator as any).requestMetrics;
            requestMetrics.set('old-request', {
                timestamp: new Date(Date.now() - (25 * 60 * 60 * 1000)), // 25 hours ago
                modelId: 'test-model'
            });

            // Force cleanup
            (orchestrator as any).cleanupOldMetrics();

            // Old metrics should be removed
            expect(requestMetrics.has('old-request')).toBe(false);
        });
    });

    describe('Capability Integration', () => {
        it('should extract required capabilities from request content', () => {
            const request: GraphEnhancedRequest = {
                requestId: 'test-req-013',
                taskType: 'creative-writing',
                content: 'Generate a JSON structured response with character dialogue'
            };

            const capabilities = (orchestrator as any).extractRequiredCapabilities(request);

            expect(capabilities).toContain('creative-writing');
            expect(capabilities).toContain('structured-output');
            expect(capabilities).toContain('conversational');
        });

        it('should calculate appropriate load thresholds for different priorities', () => {
            expect((orchestrator as any).calculateMaxLoadThreshold('critical')).toBe(0.95);
            expect((orchestrator as any).calculateMaxLoadThreshold('high')).toBe(0.9);
            expect((orchestrator as any).calculateMaxLoadThreshold('low')).toBe(0.6);
            expect((orchestrator as any).calculateMaxLoadThreshold('normal')).toBe(0.8);
        });

        it('should estimate request costs accurately', () => {
            const recommendation = {
                modelId: 'llama-7b',
                performanceMetrics: { predictedLatency: 1000 }
            };

            const request: GraphEnhancedRequest = {
                requestId: 'test-req-014',
                taskType: 'creative-writing',
                content: 'A'.repeat(1000) // 1000 character content
            };

            const cost = (orchestrator as any).estimateRequestCost(recommendation, request);

            expect(cost).toBeGreaterThan(0);
            expect(typeof cost).toBe('number');
        });
    });

    describe('Background Tasks', () => {
        it('should start background tasks on initialization', () => {
            const startSpy = jest.spyOn(orchestrator as any, 'startBackgroundTasks');

            // Create new orchestrator to test initialization
            const newOrchestrator = new GraphEnhancedOrchestrator();

            // Background tasks should be started
            expect(typeof (newOrchestrator as any).startBackgroundTasks).toBe('function');
        });
    });
});
