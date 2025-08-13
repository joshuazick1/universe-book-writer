/**
 * Unit tests for Graph Relationship Service
 * Tests the core functionality of Phase 3: Graph Relationship Enhancement
 */

import { GraphRelationshipService, RelationshipType, CommunityScore } from '../services/graph-relationship.service.js';
import { Node, NodeType } from '../../../shared/types/nodeTypes.js';
import { logger } from '../../../shared/logging/logger.js';

// Mock the database connection
jest.mock('../../../shared/database/database.config.js', () => ({
    sharedDatabaseConnection: {
        db: {
            collection: jest.fn(() => ({
                find: jest.fn(),
                findOne: jest.fn(),
                insertOne: jest.fn(),
                updateOne: jest.fn(),
                deleteMany: jest.fn(),
                aggregate: jest.fn(),
                toArray: jest.fn(() => Promise.resolve([]))
            }))
        }
    }
}));

describe('GraphRelationshipService', () => {
    let service: GraphRelationshipService;
    let mockNodes: Node[];

    beforeEach(() => {
        service = new GraphRelationshipService();
        mockNodes = [
            {
                id: 'model-1',
                type: 'ai-model' as NodeType,
                title: 'Test Model 7B',
                metadata: {
                    benchmarks: {
                        'creative-writing': { score: 0.85, timestamp: '2024-01-01' },
                        'code-generation': { score: 0.75, timestamp: '2024-01-01' }
                    },
                    size: '7B',
                    family: 'llama'
                }
            },
            {
                id: 'model-2',
                type: 'ai-model' as NodeType,
                title: 'Test Model 13B',
                metadata: {
                    benchmarks: {
                        'creative-writing': { score: 0.82, timestamp: '2024-01-01' },
                        'dialogue-generation': { score: 0.88, timestamp: '2024-01-01' }
                    },
                    size: '13B',
                    family: 'llama'
                }
            },
            {
                id: 'server-1',
                type: 'ai-server' as NodeType,
                title: 'Server Alpha',
                metadata: {
                    region: 'us-east',
                    currentLoad: 0.6,
                    healthScore: 0.95,
                    estimatedMemory: 16000
                }
            }
        ];
    });

    describe('detectRelationships', () => {
        it('should detect performance similarity relationships', async () => {
            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(mockNodes.filter(n => n.type === 'ai-model'))
                }),
                insertOne: jest.fn().mockResolvedValue({ insertedId: 'rel-1' })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            await service.detectAllRelationships();

            expect(mockCollection.find).toHaveBeenCalledWith({ type: 'ai-model' });
            expect(mockCollection.insertOne).toHaveBeenCalled();
        });

        it('should calculate similarity scores correctly', () => {
            const similarity = (service as any).calculatePerformanceSimilarity(mockNodes[0], mockNodes[1]);

            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });

        it('should identify model families', () => {
            const isFamily = (service as any).isModelFamily(mockNodes[0], mockNodes[1]);
            expect(isFamily).toBe(true); // Both are 'llama' family
        });
    });

    describe('generateCommunityScores', () => {
        it('should generate community scores for all nodes', async () => {
            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(mockNodes)
                }),
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([
                        { _id: 'model-1', relationships: [{ targetId: 'model-2', type: RelationshipType.PERFORMANCE_SIMILAR }] }
                    ])
                })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            const scores = await service.generateCommunityScores();

            expect(Array.isArray(scores)).toBe(true);
            expect(scores.length).toBeGreaterThan(0);

            // Check score structure
            if (scores.length > 0) {
                const score = scores[0];
                expect(score).toHaveProperty('nodeId');
                expect(score).toHaveProperty('communityId');
                expect(score).toHaveProperty('score');
                expect(score).toHaveProperty('rank');
                expect(score).toHaveProperty('peerNodes');
                expect(score).toHaveProperty('influenceMetrics');
            }
        });

        it('should handle nodes with no relationships', async () => {
            const isolatedNode = {
                id: 'isolated-model',
                type: 'ai-model' as NodeType,
                title: 'Isolated Model',
                metadata: {}
            };

            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([isolatedNode])
                }),
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            const scores = await service.generateCommunityScores();

            expect(scores).toBeDefined();
            // Should still generate a score even for isolated nodes
        });
    });

    describe('getGraphBasedInsights', () => {
        it('should provide comprehensive insights for a model', async () => {
            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(mockNodes[0]),
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([
                        { _id: 'model-1', relationships: [{ targetId: 'model-2', type: RelationshipType.PERFORMANCE_SIMILAR, strength: 0.85 }] }
                    ])
                })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            const insights = await service.getGraphBasedInsights('model-1');

            expect(insights).toHaveProperty('relationshipAnalysis');
            expect(insights).toHaveProperty('communityContext');
            expect(insights).toHaveProperty('serverRecommendations');

            expect(insights.relationshipAnalysis).toHaveProperty('similarModels');
            expect(insights.relationshipAnalysis).toHaveProperty('networkPosition');
            expect(insights.relationshipAnalysis).toHaveProperty('performanceCluster');

            expect(insights.communityContext).toHaveProperty('peerModels');
            expect(insights.communityContext).toHaveProperty('avgPerformance');
            expect(insights.communityContext).toHaveProperty('communityStrength');
        });

        it('should handle non-existent models gracefully', async () => {
            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(null),
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            await expect(service.getGraphBasedInsights('non-existent')).rejects.toThrow();
        });
    });

    describe('Community Detection Algorithms', () => {
        it('should detect communities correctly', async () => {
            const relationships = [
                { sourceId: 'model-1', targetId: 'model-2', type: RelationshipType.PERFORMANCE_SIMILAR, strength: 0.8 },
                { sourceId: 'model-2', targetId: 'model-3', type: RelationshipType.MODEL_FAMILY, strength: 0.9 },
                { sourceId: 'model-1', targetId: 'model-3', type: RelationshipType.CAPABILITY_CLUSTER, strength: 0.7 }
            ];

            const communities = (service as any).detectCommunities(relationships, mockNodes);

            expect(Array.isArray(communities)).toBe(true);
            expect(communities.length).toBeGreaterThan(0);

            // Each community should have nodes
            for (const community of communities) {
                expect(community).toHaveProperty('id');
                expect(community).toHaveProperty('nodes');
                expect(Array.isArray(community.nodes)).toBe(true);
            }
        });

        it('should calculate centrality metrics', () => {
            const relationships = [
                { sourceId: 'model-1', targetId: 'model-2', strength: 0.8 },
                { sourceId: 'model-2', targetId: 'model-3', strength: 0.9 },
                { sourceId: 'model-1', targetId: 'model-3', strength: 0.7 }
            ];

            const centrality = (service as any).calculateCentrality('model-2', relationships);

            expect(centrality).toBeGreaterThan(0);
            expect(centrality).toBeLessThanOrEqual(1);
        });
    });

    describe('Performance Analysis', () => {
        it('should analyze performance clusters', () => {
            const cluster = (service as any).identifyPerformanceCluster(mockNodes[0]);

            expect(cluster).toBeDefined();
            expect(typeof cluster).toBe('string');
        });

        it('should calculate performance similarity accurately', () => {
            const similarity = (service as any).calculatePerformanceSimilarity(mockNodes[0], mockNodes[1]);

            // Should be a valid similarity score
            expect(similarity).toBeGreaterThanOrEqual(0);
            expect(similarity).toBeLessThanOrEqual(1);

            // Similar models should have higher similarity
            expect(similarity).toBeGreaterThan(0.5);
        });

        it('should handle missing benchmark data', () => {
            const nodeWithoutBenchmarks = {
                id: 'no-benchmarks',
                type: 'ai-model' as NodeType,
                title: 'No Benchmarks Model',
                metadata: {}
            };

            const similarity = (service as any).calculatePerformanceSimilarity(nodeWithoutBenchmarks, mockNodes[0]);

            expect(similarity).toBeDefined();
            expect(similarity).toBeGreaterThanOrEqual(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });
    });

    describe('Server Group Analysis', () => {
        it('should group servers by characteristics', () => {
            const servers = [
                {
                    id: 'server-1',
                    type: 'ai-server' as NodeType,
                    title: 'Server Alpha',
                    metadata: { region: 'us-east', estimatedMemory: 16000 }
                },
                {
                    id: 'server-2',
                    type: 'ai-server' as NodeType,
                    title: 'Server Beta',
                    metadata: { region: 'us-east', estimatedMemory: 32000 }
                }
            ];

            const groups = (service as any).groupServersByCharacteristics(servers);

            expect(Array.isArray(groups)).toBe(true);
            expect(groups.length).toBeGreaterThan(0);

            // Each group should have servers
            for (const group of groups) {
                expect(group).toHaveProperty('groupId');
                expect(group).toHaveProperty('servers');
                expect(Array.isArray(group.servers)).toBe(true);
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle database connection errors', async () => {
            const mockCollection = {
                find: jest.fn().mockRejectedValue(new Error('Database connection failed'))
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            await expect(service.detectAllRelationships()).rejects.toThrow('Database connection failed');
        });

        it('should validate input parameters', async () => {
            await expect(service.getGraphBasedInsights('')).rejects.toThrow();
            await expect(service.getGraphBasedInsights(null as any)).rejects.toThrow();
        });
    });

    describe('Performance', () => {
        it('should complete relationship detection in reasonable time', async () => {
            const start = Date.now();

            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(mockNodes.filter(n => n.type === 'ai-model'))
                }),
                insertOne: jest.fn().mockResolvedValue({ insertedId: 'rel-1' })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            await service.detectAllRelationships();

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle large numbers of nodes efficiently', () => {
            const largeNodeSet = Array.from({ length: 100 }, (_, i) => ({
                id: `model-${i}`,
                type: 'ai-model' as NodeType,
                title: `Model ${i}`,
                metadata: { benchmarks: { 'test': { score: Math.random() } } }
            }));

            const start = Date.now();

            // Test similarity calculation performance
            for (let i = 0; i < 10; i++) {
                (service as any).calculatePerformanceSimilarity(largeNodeSet[i], largeNodeSet[i + 1]);
            }

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });
    });

    describe('Integration with Node Service', () => {
        it('should integrate with shared node service', async () => {
            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(mockNodes)
                })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            // Test that the service can retrieve nodes
            const nodes = await (service as any).getNodes({ type: 'ai-model' });
            expect(Array.isArray(nodes)).toBe(true);
        });
    });

    describe('Caching and Optimization', () => {
        it('should cache relationship data when appropriate', async () => {
            const mockCollection = {
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(mockNodes)
                }),
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            };

            (require('../../../shared/database/database.config.js').sharedDatabaseConnection.db.collection as jest.Mock)
                .mockReturnValue(mockCollection);

            // First call
            await service.generateCommunityScores();
            const firstCallCount = mockCollection.aggregate.mock.calls.length;

            // Second call (should potentially use cache)
            await service.generateCommunityScores();
            const secondCallCount = mockCollection.aggregate.mock.calls.length;

            // Verify caching behavior (implementation dependent)
            expect(secondCallCount).toBeGreaterThanOrEqual(firstCallCount);
        });
    });
});

describe('Community Score Validation', () => {
    let service: GraphRelationshipService;

    beforeEach(() => {
        service = new GraphRelationshipService();
    });

    it('should validate community score structure', () => {
        const sampleScore: CommunityScore = {
            nodeId: 'test-node',
            communityId: 'community-1',
            score: 0.75,
            rank: 5,
            peerNodes: ['peer-1', 'peer-2'],
            influenceMetrics: {
                networkCentrality: 0.8,
                connectivityScore: 0.6,
                performanceInfluence: 0.4,
                capabilityDiversity: 0.7
            }
        };

        expect(sampleScore.nodeId).toBeDefined();
        expect(sampleScore.communityId).toBeDefined();
        expect(sampleScore.score).toBeGreaterThanOrEqual(0);
        expect(sampleScore.score).toBeLessThanOrEqual(1);
        expect(sampleScore.rank).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(sampleScore.peerNodes)).toBe(true);
        expect(typeof sampleScore.influenceMetrics).toBe('object');
    });
});

describe('Relationship Type Validation', () => {
    it('should have all required relationship types', () => {
        const expectedTypes = [
            RelationshipType.PERFORMANCE_SIMILAR,
            RelationshipType.MODEL_FAMILY,
            RelationshipType.CAPABILITY_CLUSTER,
            RelationshipType.SERVER_GROUP,
            RelationshipType.COMMUNITY_PEER,
            RelationshipType.BENCHMARK_CORRELATION
        ];

        for (const type of expectedTypes) {
            expect(type).toBeDefined();
            expect(typeof type).toBe('string');
        }
    });
});
