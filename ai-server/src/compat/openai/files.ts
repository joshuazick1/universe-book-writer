/**
 * OpenAI Compatibility: /v1/files endpoint (list, upload, retrieve, delete)
 *
 * GET /v1/files - List all files
 * POST /v1/files - Upload a file (multipart/form-data)
 * GET /v1/files/:file_id - Retrieve file metadata
 * DELETE /v1/files/:file_id - Delete a file
 * GET /v1/files/:file_id/content - Retrieve file content
 *
 * This is a minimal placeholder implementation. Real implementation should use persistent storage.
 */
import { Request, Response, RequestHandler } from 'express';

// In-memory file store (for demo only)
interface FileRecord {
    id: string;
    object: 'file';
    filename: string;
    bytes: number;
    created_at: number;
    purpose: string;
    status: 'uploaded' | 'processed' | 'error';
    status_details?: string;
    content?: Buffer; // Store file content in memory for demo
}

const files: FileRecord[] = [];

/**
 * GET /v1/files - List all files
 */
export const openaiListFilesHandler: RequestHandler = (req, res) => {
    const { purpose } = req.query;
    let filteredFiles = files;

    if (purpose && typeof purpose === 'string') {
        filteredFiles = files.filter(f => f.purpose === purpose);
    }

    res.json({
        object: 'list',
        data: filteredFiles.map(f => ({
            id: f.id,
            object: f.object,
            filename: f.filename,
            bytes: f.bytes,
            created_at: f.created_at,
            purpose: f.purpose,
            status: f.status,
            status_details: f.status_details
        }))
    });
};

/**
 * POST /v1/files - Upload a file
 * Note: This is a simplified implementation without actual file parsing
 * In production, you would use multer or similar for proper multipart/form-data handling
 */
export const openaiUploadFileHandler: RequestHandler = (req, res) => {
    try {
        const { purpose = 'assistants', filename = 'uploaded-file.txt', content = 'Mock file content' } = req.body;

        // Validate purpose
        const validPurposes = ['fine-tune', 'assistants', 'batch', 'fine-tune-results', 'assistants-output'];
        if (!validPurposes.includes(purpose)) {
            res.status(400).json({
                error: {
                    message: `Invalid purpose. Must be one of: ${validPurposes.join(', ')}`,
                    type: 'invalid_request_error',
                    param: 'purpose',
                    code: 'invalid_purpose'
                }
            });
            return;
        }

        // Generate file ID and create record
        const id = 'file-' + Math.random().toString(36).slice(2, 15);
        const contentBuffer = Buffer.from(content, 'utf-8');

        const fileRecord: FileRecord = {
            id,
            object: 'file',
            filename,
            bytes: contentBuffer.length,
            created_at: Math.floor(Date.now() / 1000),
            purpose,
            status: 'uploaded',
            content: contentBuffer
        };

        files.push(fileRecord);

        res.status(201).json({
            id: fileRecord.id,
            object: fileRecord.object,
            filename: fileRecord.filename,
            bytes: fileRecord.bytes,
            created_at: fileRecord.created_at,
            purpose: fileRecord.purpose,
            status: fileRecord.status
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error during file upload.',
                type: 'server_error',
                code: 'internal_error'
            }
        });
    }
};

/**
 * GET /v1/files/:file_id - Retrieve file metadata
 */
export const openaiGetFileHandler: RequestHandler = (req, res) => {
    const { file_id } = req.params;
    const file = files.find(f => f.id === file_id);

    if (!file) {
        res.status(404).json({
            error: {
                message: 'File not found',
                type: 'invalid_request_error',
                param: 'file_id',
                code: 'not_found'
            }
        });
        return;
    }

    res.json({
        id: file.id,
        object: file.object,
        filename: file.filename,
        bytes: file.bytes,
        created_at: file.created_at,
        purpose: file.purpose,
        status: file.status,
        status_details: file.status_details
    });
};

/**
 * DELETE /v1/files/:file_id - Delete a file
 */
export const openaiDeleteFileHandler: RequestHandler = (req, res) => {
    const { file_id } = req.params;
    const idx = files.findIndex(f => f.id === file_id);

    if (idx === -1) {
        res.status(404).json({
            error: {
                message: 'File not found',
                type: 'invalid_request_error',
                param: 'file_id',
                code: 'not_found'
            }
        });
        return;
    }

    files.splice(idx, 1);
    res.json({
        id: file_id,
        object: 'file',
        deleted: true
    });
};

/**
 * GET /v1/files/:file_id/content - Retrieve file content
 */
export const openaiGetFileContentHandler: RequestHandler = (req, res) => {
    const { file_id } = req.params;
    const file = files.find(f => f.id === file_id);

    if (!file) {
        res.status(404).json({
            error: {
                message: 'File not found',
                type: 'invalid_request_error',
                param: 'file_id',
                code: 'not_found'
            }
        });
        return;
    }

    if (!file.content) {
        res.status(404).json({
            error: {
                message: 'File content not available',
                type: 'invalid_request_error',
                code: 'file_not_ready'
            }
        });
        return;
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
};
