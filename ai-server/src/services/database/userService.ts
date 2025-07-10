import { getCollections } from '../../config/database.config.js';
import { ObjectId } from 'mongodb';

export interface UserRecord {
    _id: ObjectId;
    email: string;
    // Add other user fields as needed
}

/**
 * Look up a user by their ID (ObjectId or string).
 * Returns null if not found.
 */
export async function getUserById(id: string | ObjectId): Promise<UserRecord | null> {
    const collections = await getCollections();
    const users = collections.users;
    if (!users) throw new Error('users collection not found');
    const _id = typeof id === 'string' ? new ObjectId(id) : id;
    const user = await users.findOne({ _id });
    return user as UserRecord | null;
}
