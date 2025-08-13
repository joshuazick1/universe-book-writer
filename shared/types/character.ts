/**
 * @fileoverview Shared type definitions for Character entities.
 * @module shared/types/character
 *
 * Defines interfaces and types for character data models used across universes and plugins.
 *
 * @example
 * import { Character } from 'shared/types/character';
 *
 * @edgecase
 * Handles missing optional fields and plugin-specific extensions.
 */

export interface Character {
    readonly id: string;
    readonly name: string;
    readonly universeId: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}
