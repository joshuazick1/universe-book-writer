/**
 * MongoDB Collaboration Invitation Repository Implementation
 * 
 * Handles persistence of collaboration invitation entities in MongoDB
 */

import { Db, ObjectId } from 'mongodb';
import {
    CollaborationInvitation,
    InvitationStatus
} from '../../core/entities/collaboration-invitation.entity.js';
import {
    CollaborationInvitationRepository,
    CollaborationInvitationSearchFilters
} from '../../core/interfaces/collaboration-invitation.repository.js';
import { CollaborationRole } from '../../core/entities/universe.entity.js';

/**
 * MongoDB document interface for collaboration invitations
 */
interface CollaborationInvitationDocument {
    _id?: ObjectId;
    id: string;
    universe_id: string;
    inviter_id: string;
    invitee_email: string;
    invitee_id?: string;
    role: CollaborationRole;
    status: InvitationStatus;
    token: string;
    message?: string;
    expires_at?: Date;
    created_at: Date;
    updated_at: Date;
    accepted_at?: Date;
    declined_at?: Date;
    revoked_at?: Date;
}

/**
 * MongoDB implementation of CollaborationInvitationRepository
 */
export class MongoCollaborationInvitationRepository implements CollaborationInvitationRepository {
    private readonly collection = 'collaboration_invitations';

    constructor(private db: Db) { }

    /**
     * Save a collaboration invitation
     */
    async save(invitation: CollaborationInvitation): Promise<CollaborationInvitation> {
        const document = this.toDocument(invitation);

        const filter = { id: invitation.id };
        const update = { $set: document };
        const options = { upsert: true };

        await this.db.collection(this.collection).updateOne(filter, update, options);

        return invitation;
    }

    /**
     * Find invitation by ID
     */
    async findById(id: string): Promise<CollaborationInvitation | null> {
        const document = await this.db
            .collection<CollaborationInvitationDocument>(this.collection)
            .findOne({ id });

        return document ? this.toEntity(document) : null;
    }

    /**
     * Find invitation by token
     */
    async findByToken(token: string): Promise<CollaborationInvitation | null> {
        const document = await this.db
            .collection<CollaborationInvitationDocument>(this.collection)
            .findOne({ token });

        return document ? this.toEntity(document) : null;
    }

    /**
     * Find invitations with filters
     */
    async findMany(
        filters: CollaborationInvitationSearchFilters = {},
        options: {
            limit?: number;
            offset?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
        } = {}
    ): Promise<{
        invitations: CollaborationInvitation[];
        total: number;
        hasMore: boolean;
    }> {
        const query = this.buildQuery(filters);

        // Count total matching documents
        const total = await this.db.collection(this.collection).countDocuments(query);

        // Build aggregation pipeline
        const pipeline: any[] = [
            { $match: query }
        ];

        // Add sorting
        const sortBy = options.sortBy || 'created_at';
        const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
        pipeline.push({ $sort: { [sortBy]: sortOrder } });

        // Add pagination
        if (options.offset) {
            pipeline.push({ $skip: options.offset });
        }
        if (options.limit) {
            pipeline.push({ $limit: options.limit });
        } const documents = await this.db
            .collection<CollaborationInvitationDocument>(this.collection)
            .aggregate(pipeline)
            .toArray() as CollaborationInvitationDocument[];

        const invitations = documents.map(doc => this.toEntity(doc));
        const hasMore = options.limit ?
            (options.offset || 0) + invitations.length < total :
            false;

        return {
            invitations,
            total,
            hasMore
        };
    }

    /**
     * Update invitation status
     */
    async updateStatus(
        id: string,
        status: InvitationStatus,
        metadata?: {
            accepted_at?: Date;
            declined_at?: Date;
            revoked_at?: Date;
            invitee_id?: string;
        }
    ): Promise<CollaborationInvitation | null> {
        const updateDoc: any = {
            status,
            updated_at: new Date()
        };

        if (metadata?.accepted_at) updateDoc.accepted_at = metadata.accepted_at;
        if (metadata?.declined_at) updateDoc.declined_at = metadata.declined_at;
        if (metadata?.revoked_at) updateDoc.revoked_at = metadata.revoked_at;
        if (metadata?.invitee_id) updateDoc.invitee_id = metadata.invitee_id; const result = await this.db
            .collection<CollaborationInvitationDocument>(this.collection)
            .findOneAndUpdate(
                { id },
                { $set: updateDoc },
                { returnDocument: 'after' }
            );

        return result ? this.toEntity(result) : null;
    }    /**
     * Delete invitation
     */
    async delete(id: string): Promise<void> {
        await this.db
            .collection(this.collection)
            .deleteOne({ id });
    }

    /**
     * Check if user has pending invitation for universe
     */
    async hasPendingInvitation(universe_id: string, invitee_email: string): Promise<boolean> {
        const count = await this.db
            .collection(this.collection)
            .countDocuments({
                universe_id,
                invitee_email,
                status: InvitationStatus.PENDING,
                $or: [
                    { expires_at: { $exists: false } },
                    { expires_at: { $gt: new Date() } }
                ]
            });

        return count > 0;
    }

    /**
     * Clean up expired invitations
     */
    async cleanupExpired(): Promise<number> {
        const result = await this.db
            .collection(this.collection)
            .updateMany(
                {
                    status: InvitationStatus.PENDING,
                    expires_at: { $lt: new Date() }
                },
                {
                    $set: {
                        status: InvitationStatus.EXPIRED,
                        updated_at: new Date()
                    }
                }
            );

        return result.modifiedCount;
    }

    /**
     * Build MongoDB query from filters
     */
    private buildQuery(filters: CollaborationInvitationSearchFilters): any {
        const query: any = {};

        if (filters.universe_id) {
            query.universe_id = filters.universe_id;
        }

        if (filters.inviter_id) {
            query.inviter_id = filters.inviter_id;
        }

        if (filters.invitee_email) {
            query.invitee_email = filters.invitee_email;
        }

        if (filters.invitee_id) {
            query.invitee_id = filters.invitee_id;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.role) {
            query.role = filters.role;
        }

        if (filters.expired !== undefined) {
            if (filters.expired) {
                // Find expired invitations
                query.expires_at = { $lt: new Date() };
                query.status = InvitationStatus.PENDING;
            } else {
                // Find non-expired invitations
                query.$or = [
                    { expires_at: { $exists: false } },
                    { expires_at: { $gt: new Date() } }
                ];
            }
        }

        if (filters.created_after) {
            query.created_at = { ...query.created_at, $gte: filters.created_after };
        }

        if (filters.created_before) {
            query.created_at = { ...query.created_at, $lte: filters.created_before };
        }

        return query;
    }

    /**
     * Convert entity to MongoDB document
     */
    private toDocument(invitation: CollaborationInvitation): CollaborationInvitationDocument {
        return {
            id: invitation.id,
            universe_id: invitation.universe_id,
            inviter_id: invitation.inviter_id,
            invitee_email: invitation.invitee_email,
            invitee_id: invitation.invitee_id,
            role: invitation.role,
            status: invitation.status,
            token: invitation.token,
            message: invitation.message,
            expires_at: invitation.expires_at,
            created_at: invitation.created_at, updated_at: invitation.updated_at,
            accepted_at: invitation.accepted_at,
            declined_at: invitation.declined_at
        };
    }

    /**
     * Convert MongoDB document to entity
     */
    private toEntity(document: CollaborationInvitationDocument): CollaborationInvitation {
        const data = {
            id: document.id,
            universe_id: document.universe_id,
            inviter_id: document.inviter_id,
            invitee_email: document.invitee_email,
            invitee_id: document.invitee_id,
            role: document.role,
            status: document.status,
            token: document.token,
            message: document.message,
            expires_at: document.expires_at,
            created_at: document.created_at, updated_at: document.updated_at,
            accepted_at: document.accepted_at,
            declined_at: document.declined_at
        };

        return new CollaborationInvitation(data);
    }    /**
     * Update invitation
     */
    async update(id: string, invitation: CollaborationInvitation): Promise<CollaborationInvitation> {
        const document = this.toDocument(invitation);

        await this.db
            .collection<CollaborationInvitationDocument>(this.collection)
            .updateOne(
                { id },
                { $set: document }
            );

        return invitation;
    }

    /**
     * Get invitations for a universe
     */
    async findByUniverseId(universeId: string): Promise<CollaborationInvitation[]> {
        const documents = await this.db
            .collection<CollaborationInvitationDocument>(this.collection)
            .find({ universe_id: universeId })
            .toArray();

        return documents.map(doc => this.toEntity(doc));
    }

    /**
     * Get invitations for a user (by email)
     */
    async findByUserEmail(email: string): Promise<CollaborationInvitation[]> {
        const documents = await this.db
            .collection<CollaborationInvitationDocument>(this.collection)
            .find({ invitee_email: email.toLowerCase().trim() })
            .toArray();

        return documents.map(doc => this.toEntity(doc));
    }

    /**
     * Count invitations with filters
     */
    async count(filters?: CollaborationInvitationSearchFilters): Promise<number> {
        const query = filters ? this.buildQuery(filters) : {};

        return await this.db
            .collection(this.collection)
            .countDocuments(query);
    }
}
