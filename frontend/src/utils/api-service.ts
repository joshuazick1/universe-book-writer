/**
 * Base API Service
 * 
 * Base class for all API services with authentication and error handling
 */

import { useAuthStore } from '../auth/stores/auth.store';

export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Array<{
        field?: string;
        message: string;
    }>;
}

export interface ApiError {
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
}

export class ApiService {
    protected readonly baseURL: string;

    constructor(baseURL: string = '/api') {
        this.baseURL = baseURL;
    }

    /**
     * Get default headers
     */
    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        return headers;
    }

    /**
     * Handle API response and errors
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        let responseData: any;
        if (isJson) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401) {
                // For cookie-based auth, trigger logout through the auth store
                const { logout } = useAuthStore.getState();
                logout();
                throw new Error('Authentication required. Please log in again.');
            }

            // Handle validation errors
            if (response.status === 400 && responseData.errors) {
                const error: ApiError = {
                    code: 'VALIDATION_ERROR',
                    message: responseData.message || 'Validation failed',
                    details: { errors: responseData.errors }
                };
                throw error;
            }

            // Handle general errors
            const error: ApiError = {
                code: `HTTP_${response.status}`,
                message: responseData.message || responseData.error || response.statusText,
                details: responseData
            };
            throw error;
        }

        return responseData;
    }

    /**
     * Get fetch options with credentials for cookie-based auth
     */
    private getFetchOptions(options: RequestInit = {}): RequestInit {
        return {
            ...options,
            credentials: 'include', // Include cookies for authentication
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        };
    }
    /**
     * Make GET request
     */
    protected async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`,
            this.getFetchOptions({ method: 'GET' })
        );

        return this.handleResponse<T>(response);
    }

    /**
     * Make POST request
     */
    protected async post<T>(endpoint: string, data?: any): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`,
            this.getFetchOptions({
                method: 'POST',
                body: data ? JSON.stringify(data) : undefined,
            })
        );

        return this.handleResponse<T>(response);
    }

    /**
     * Make PUT request
     */
    protected async put<T>(endpoint: string, data?: any): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`,
            this.getFetchOptions({
                method: 'PUT',
                body: data ? JSON.stringify(data) : undefined,
            })
        );

        return this.handleResponse<T>(response);
    }

    /**
     * Make PATCH request
     */
    protected async patch<T>(endpoint: string, data?: any): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`,
            this.getFetchOptions({
                method: 'PATCH',
                body: data ? JSON.stringify(data) : undefined,
            })
        );

        return this.handleResponse<T>(response);
    }

    /**
     * Make DELETE request
     */
    protected async delete<T = void>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`,
            this.getFetchOptions({ method: 'DELETE' })
        );

        return this.handleResponse<T>(response);
    }

    /**
     * Upload file with form data
     */
    protected async upload<T>(endpoint: string, formData: FormData): Promise<T> {
        const options = this.getFetchOptions({
            method: 'POST',
            body: formData,
        });

        // Remove content-type for FormData - let browser set it with boundary
        delete (options.headers as any)['Content-Type'];

        const response = await fetch(`${this.baseURL}${endpoint}`, options);

        return this.handleResponse<T>(response);
    }

    /**
     * Check if API is available
     */
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        return this.get<{ status: string; timestamp: string }>('/health');
    }
}
