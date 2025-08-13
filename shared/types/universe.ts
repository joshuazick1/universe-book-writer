/**
 * @fileoverview Shared type definitions for Universe entities.
 * @module shared/types/universe
 *
 * Defines interfaces and types for universe data models used across plugins and core logic.
 *
 * @example
 * import { Universe } from 'shared/types/universe';
 *
 * @edgecase
 * Supports universes with custom metadata and plugin extensions.
 */

export interface Universe {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}
