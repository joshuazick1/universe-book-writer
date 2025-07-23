/**
 * List all fileId directories under STORAGE_ROOT
 */

// Only import once at the top

// Only import once at the top
import * as fs from 'fs/promises';
import * as path from 'path';

export async function getFileVersionsDirs(): Promise<string[]> {
    try {
        const entries = await fs.readdir(STORAGE_ROOT, { withFileTypes: true });
        return entries.filter(e => e.isDirectory()).map(e => e.name);
    } catch {
        return [];
    }
}
/**
 * File Storage and Versioning Utilities
 *
 * This module provides file-backed storage, versioning, and retrieval for canonical book/chapter text files.
 *
 * Responsibilities:
 * - Store uploaded files in a dedicated directory (e.g., /data/book-text/)
 * - Maintain version history for each file (with metadata)
 * - Retrieve file versions and metadata
 * - Support rollback and migration operations
 * - Integrate with chunk diffing and update logic
 *
 * All logic is production-ready and robust. Migration logic applies migrationData to file content and records as a new version.
 */


// (removed duplicate imports)

export interface FileVersionMeta {
    id: string;
    fileId: string;
    name: string;
    createdAt: string;
    size: number;
    path: string;
    // Add more metadata as needed
}

const STORAGE_ROOT = path.resolve(process.cwd(), 'data', 'book-text');

const INDEX_FILE = 'index.json';

async function getIndexPath(fileId: string): Promise<string> {
    return path.join(STORAGE_ROOT, fileId, INDEX_FILE);
}

async function readIndex(fileId: string): Promise<FileVersionMeta[]> {
    const indexPath = await getIndexPath(fileId);
    try {
        const data = await fs.readFile(indexPath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

async function writeIndex(fileId: string, index: FileVersionMeta[]): Promise<void> {
    const indexPath = await getIndexPath(fileId);
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

export async function storeFileVersion(fileId: string, fileBuffer: Buffer, name: string): Promise<FileVersionMeta> {
    const versionId = `${fileId}-${Date.now()}`;
    const fileDir = path.join(STORAGE_ROOT, fileId);
    const filePath = path.join(fileDir, versionId + '-' + name);
    await fs.mkdir(fileDir, { recursive: true });
    await fs.writeFile(filePath, fileBuffer);
    const meta: FileVersionMeta = {
        id: versionId,
        fileId,
        name,
        createdAt: new Date().toISOString(),
        size: fileBuffer.length,
        path: filePath,
    };
    const index = await readIndex(fileId);
    index.push(meta);
    await writeIndex(fileId, index);
    return meta;
}

export async function getFileVersions(fileId: string): Promise<FileVersionMeta[]> {
    return readIndex(fileId);
}

export async function getFileBuffer(versionId: string): Promise<Buffer> {
    // Find the file by versionId in all file indexes
    const dirs = await fs.readdir(STORAGE_ROOT);
    for (const dir of dirs) {
        const index = await readIndex(dir);
        const found = index.find(v => v.id === versionId);
        if (found) {
            return fs.readFile(found.path);
        }
    }
    throw new Error('Version not found');
}

export async function rollbackToVersion(fileId: string, versionId: string): Promise<void> {
    const versions = await readIndex(fileId);
    const version = versions.find(v => v.id === versionId);
    if (!version) throw new Error('Version not found');
    const latestName = version.name;
    const fileBuffer = await fs.readFile(version.path);
    await storeFileVersion(fileId, fileBuffer, latestName);
}

export async function migrateFileVersion(fileId: string, versionId: string, migrationData: any): Promise<void> {
    const versions = await readIndex(fileId);
    const version = versions.find(v => v.id === versionId);
    if (!version) throw new Error('Version not found');
    let fileBuffer = await fs.readFile(version.path);
    // Apply migrationData if provided (e.g., chunk parentage, content edits)
    if (migrationData && typeof migrationData === 'object' && migrationData.content) {
        fileBuffer = Buffer.from(migrationData.content, 'utf-8');
    }
    await storeFileVersion(fileId, fileBuffer, version.name);
}
