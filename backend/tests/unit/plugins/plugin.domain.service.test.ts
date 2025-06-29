/**
 * Tests for the PluginDomainService class
 */

import { PluginState, PluginType } from '@universe-book-writer/core';
import { PluginDomainService } from '../../../src/core/services/plugin.domain.service.js';
import type { PluginRepository } from '../../../src/core/interfaces/plugin.repository.interface.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('PluginDomainService', () => {  // Mock plugin repository
  const mockRepository = {
    initialize: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findDependents: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<PluginRepository>;

  // Test metadata
  const testMetadata = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    type: PluginType.CORE,
    dependencies: {},
    keywords: ['test'],
  };

  // Test registry entry
  const testRegistryEntry = {
    id: 'plugin-test-plugin-123456789',
    pluginMetadata: testMetadata,
    config: { enabled: true, settings: {} },
    state: PluginState.INITIALIZED,
    loadPath: '/path/to/plugin',
    dependents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      createdBy: 'system',
      tags: ['test'],
    },
  };

  let domainService: PluginDomainService;

  beforeEach(() => {
    jest.clearAllMocks();
    domainService = new PluginDomainService(mockRepository);
  });

  describe('validateMetadata', () => {
    it('should validate valid metadata', () => {
      const result = domainService.validateMetadata(testMetadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate metadata with missing required fields', () => {
      const invalidMetadata = {
        ...testMetadata,
        name: '',
      };

      const result = domainService.validateMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin name is required');
    });

    it('should invalidate metadata with incorrect name format', () => {
      const invalidMetadata = {
        ...testMetadata,
        name: 'Test Plugin',  // Contains uppercase and space
      };

      const result = domainService.validateMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin name must contain only lowercase letters, numbers, and hyphens');
    });

    it('should invalidate metadata with incorrect version format', () => {
      const invalidMetadata = {
        ...testMetadata,
        version: 'v1',  // Not semver
      };

      const result = domainService.validateMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin version must follow semantic versioning (e.g., 1.0.0)');
    });

    it('should invalidate metadata with invalid plugin type', () => {
      const invalidMetadata = {
        ...testMetadata,
        type: 'INVALID_TYPE' as PluginType,
      };

      const result = domainService.validateMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`Invalid plugin type: ${invalidMetadata.type}`);
    });
  });

  describe('checkConflicts', () => {
    it('should return no conflicts when plugin name is unique', async () => {
      mockRepository.findByName.mockResolvedValue(null);

      const result = await domainService.checkConflicts(testMetadata);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
      expect(mockRepository.findByName).toHaveBeenCalledWith(testMetadata.name);
    }); it('should detect conflict when plugin name already exists', async () => {
      // Create a registry entry with an OLDER version to trigger a conflict
      const olderRegistryEntry = {
        ...testRegistryEntry,
        pluginMetadata: {
          ...testMetadata,
          version: '2.0.0' // Newer version already exists
        },
        metadata: {
          ...testRegistryEntry.metadata,
          version: '2.0.0'
        }
      };

      mockRepository.findByName.mockResolvedValue(olderRegistryEntry);

      const result = await domainService.checkConflicts(testMetadata); // testMetadata has version 1.0.0

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0]).toContain(`Plugin '${testMetadata.name}'`);
    });
  });

  describe('validateDependencies', () => {
    const pluginWithDeps = {
      metadata: {
        ...testMetadata,
        dependencies: {
          'dependency-plugin': '1.0.0',
          'missing-plugin': '2.0.0',
        },
      },
    };

    it('should validate when all dependencies are satisfied', async () => {
      // Mock dependency exists with correct version
      mockRepository.findByName.mockImplementation(async (name) => {
        if (name === 'dependency-plugin') {
          return {
            ...testRegistryEntry,
            pluginMetadata: {
              ...testMetadata,
              name: 'dependency-plugin',
              version: '1.0.0',
            },
          };
        }
        if (name === 'missing-plugin') {
          return {
            ...testRegistryEntry,
            pluginMetadata: {
              ...testMetadata,
              name: 'missing-plugin',
              version: '2.0.0',
            },
          };
        }
        return null;
      });

      const result = await domainService.validateDependencies(pluginWithDeps as any);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect missing dependencies', async () => {
      // Mock only one dependency exists
      mockRepository.findByName.mockImplementation(async (name) => {
        if (name === 'dependency-plugin') {
          return {
            ...testRegistryEntry,
            pluginMetadata: {
              ...testMetadata,
              name: 'dependency-plugin',
              version: '1.0.0',
            },
          };
        }
        return null;
      });

      const result = await domainService.validateDependencies(pluginWithDeps as any);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('missing-plugin@2.0.0');
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect version conflicts', async () => {
      // Mock dependency exists but with wrong version
      mockRepository.findByName.mockImplementation(async (name) => {
        if (name === 'dependency-plugin') {
          return {
            ...testRegistryEntry,
            pluginMetadata: {
              ...testMetadata,
              name: 'dependency-plugin',
              version: '1.1.0', // Different version
            },
          };
        }
        if (name === 'missing-plugin') {
          return {
            ...testRegistryEntry,
            pluginMetadata: {
              ...testMetadata,
              name: 'missing-plugin',
              version: '2.0.0',
            },
          };
        }
        return null;
      });

      const result = await domainService.validateDependencies(pluginWithDeps as any);

      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(0);
      expect(result.conflicts).toContain('dependency-plugin: required 1.0.0, found 1.1.0');
    });
  });
  describe('getDependencyGraph and resolveLoadOrder', () => {
    it('should build dependency graph correctly', async () => {
      const plugins = [
        {
          ...testRegistryEntry,
          pluginMetadata: {
            ...testMetadata,
            name: 'plugin-a',
            dependencies: { 'plugin-b': '1.0.0' } as Record<string, string>,
          },
        },
        {
          ...testRegistryEntry,
          pluginMetadata: {
            ...testMetadata,
            name: 'plugin-b',
            dependencies: { 'plugin-c': '1.0.0' } as Record<string, string>,
          },
        },
        {
          ...testRegistryEntry,
          pluginMetadata: {
            ...testMetadata,
            name: 'plugin-c',
            dependencies: {} as Record<string, string>,
          },
        },
      ];

      mockRepository.findAll.mockResolvedValue(plugins as any);

      const graph = await domainService.getDependencyGraph();

      expect(graph.size).toBe(3);
      expect(graph.get('plugin-a')).toEqual(['plugin-b']);
      expect(graph.get('plugin-b')).toEqual(['plugin-c']);
      expect(graph.get('plugin-c')).toEqual([]);
    });

    it('should resolve load order correctly', async () => {
      // Mock dependency graph
      jest.spyOn(domainService, 'getDependencyGraph').mockResolvedValue(
        new Map([
          ['plugin-a', ['plugin-b']],
          ['plugin-b', ['plugin-c']],
          ['plugin-c', []],
        ])
      );

      const loadOrder = await domainService.resolveLoadOrder(['plugin-a', 'plugin-b', 'plugin-c']);

      // c should be loaded first, then b, then a
      expect(loadOrder).toEqual(['plugin-c', 'plugin-b', 'plugin-a']);
    });

    it('should detect circular dependencies', async () => {
      // Mock circular dependency graph
      jest.spyOn(domainService, 'getDependencyGraph').mockResolvedValue(
        new Map([
          ['plugin-a', ['plugin-b']],
          ['plugin-b', ['plugin-c']],
          ['plugin-c', ['plugin-a']], // Circular
        ])
      );

      await expect(domainService.resolveLoadOrder(['plugin-a', 'plugin-b', 'plugin-c']))
        .rejects.toThrow(/Circular dependency detected/);
    });
  });

  describe('canUnload', () => {
    it('should allow unloading when no active dependents', async () => {
      mockRepository.findDependents.mockResolvedValue([]);

      const result = await domainService.canUnload('test-plugin');

      expect(result.canUnload).toBe(true);
      expect(result.dependents).toHaveLength(0);
    });

    it('should prevent unloading when active dependents exist', async () => {
      mockRepository.findDependents.mockResolvedValue([
        {
          ...testRegistryEntry,
          pluginMetadata: { ...testMetadata, name: 'dependent-plugin' },
          state: PluginState.ACTIVE,
        },
      ]);

      const result = await domainService.canUnload('test-plugin');

      expect(result.canUnload).toBe(false);
      expect(result.dependents).toContain('dependent-plugin');
    });
  });

  describe('createRegistryEntry', () => {
    it('should create registry entry with correct structure', () => {
      const loadPath = '/path/to/plugin';
      const config = { enabled: true, settings: { test: true } };

      const entry = domainService.createRegistryEntry(testMetadata, loadPath, config);

      expect(entry.pluginMetadata).toEqual(testMetadata);
      expect(entry.loadPath).toBe(loadPath);
      expect(entry.config).toEqual(config);
      expect(entry.state).toBe(PluginState.UNLOADED); expect(entry.id).toMatch(/^plugin-test-plugin-\d+$/);
      expect(entry.metadata?.tags).toEqual(testMetadata.keywords);
    });

    it('should use default config if none provided', () => {
      const entry = domainService.createRegistryEntry(testMetadata, '/path/to/plugin');

      expect(entry.config).toEqual({ enabled: true, settings: {} });
    });
  });
});
