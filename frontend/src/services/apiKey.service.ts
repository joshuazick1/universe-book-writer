// API Key Service for frontend
// Handles creation, listing, and revocation of API keys for the user

import { ApiService } from '../utils/api-service.js';

export interface ApiKey {
    key: string;
    createdAt: string;
    lastUsedAt?: string;
    revoked?: boolean;
    scopes?: string[];
}


// Use VITE_AI_SERVER_URL or fallback to '/api' for dev
const API_BASE = import.meta.env.VITE_AI_SERVER_URL ? `${import.meta.env.VITE_AI_SERVER_URL}/api` : '/api';

export class ApiKeyService extends ApiService {
    constructor() {
        super(API_BASE);
    }

    async listApiKeys(): Promise<ApiKey[]> {
        return this.get<ApiKey[]>('/user/api-keys');
    }

    async createApiKey(scopes: string[] = []): Promise<ApiKey> {
        return this.post<ApiKey>('/user/api-keys', { scopes });
    }

    async revokeApiKey(key: string): Promise<void> {
        await this.post(`/user/api-keys/${encodeURIComponent(key)}/revoke`, {});
    }
}

export const apiKeyService = new ApiKeyService();
