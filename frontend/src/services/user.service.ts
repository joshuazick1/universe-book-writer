/**
 * User Service
 * 
 * API service for user management operations
 */

import { ApiService, ApiResponse } from '../utils/api-service.js';
import type { User, UserSearchResult, UserRole, UserStatus, UserSearchResponse } from '../types/user.types';

interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

class UserService extends ApiService {
    constructor() {
        super('/api');
    }
    /**
     * Search users for collaboration
     */
    async searchUsersForCollaboration(
        query: string,
        limit: number = 10
    ): Promise<UserSearchResponse> {
        return await this.get<UserSearchResponse>(`/users/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    }  /**
   * Get user list (admin)
   */
    async getUsers(options?: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        status?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<UserListResponse> {
        const params = new URLSearchParams();
        if (options) {
            Object.entries(options).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.append(key, value.toString());
                }
            });
        }
        const queryString = params.toString();
        return await this.get<UserListResponse>(`/users${queryString ? `?${queryString}` : ''}`);
    }

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<User> {
        return await this.get<User>(`/users/${id}`);
    }

    /**
     * Update user profile
     */
    async updateProfile(profileData: any): Promise<User> {
        return await this.put<User>('/users/profile', profileData);
    }

    /**
     * Update user role (admin)
     */
    async updateUserRole(
        userId: string,
        role: UserRole
    ): Promise<User> {
        return await this.put<User>(`/users/${userId}/roles`, { role });
    }

    /**
     * Update user status (admin)
     */
    async updateUserStatus(
        userId: string,
        status: UserStatus
    ): Promise<User> {
        return await this.put<User>(`/users/${userId}/status`, { status });
    }

    /**
     * Change password
     */
    async changePassword(data: {
        currentPassword: string;
        newPassword: string;
    }): Promise<void> {
        return await this.put<void>('/users/change-password', data);
    }

    /**
     * Delete user account
     */
    async deleteAccount(): Promise<void> {
        return await this.delete<void>('/users/account');
    }
}

export const userService = new UserService();
