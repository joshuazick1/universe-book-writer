/**
 * @fileoverview Shared type definitions for API request/response shapes.
 * @module shared/types/api
 *
 * Defines interfaces and types for API payloads, errors, and metadata.
 *
 * @example
 * import { ApiResponse } from 'shared/types/api';
 *
 * @edgecase
 * Handles error responses and optional metadata.
 */

export interface ApiResponse<T> {
    readonly success: boolean;
    readonly data?: T;
    readonly error?: ApiError;
    readonly metadata?: Record<string, unknown>;
}

export interface ApiError {
    readonly code: string;
    readonly message: string;
    readonly details?: string;
}
