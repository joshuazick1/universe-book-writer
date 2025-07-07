/**
 * OpenAI Compatibility: /v1/fine-tuning/jobs endpoint with full OpenAI compatibility
 *
 * GET /v1/fine-tuning/jobs - List all jobs
 * POST /v1/fine-tuning/jobs - Create a job
 * GET /v1/fine-tuning/jobs/:job_id - Retrieve job
 * POST /v1/fine-tuning/jobs/:job_id/cancel - Cancel job
 * GET /v1/fine-tuning/jobs/:job_id/events - List events for a job
 * GET /v1/fine-tuning/jobs/:job_id/checkpoints - List checkpoints for a job
 *
 * This is an in-memory implementation. Real implementation should use persistent storage and background processing.
 */
import { Request, Response, RequestHandler } from 'express';

// OpenAI Fine-tuning Job interface
interface FineTuningJob {
    id: string;
    object: 'fine_tuning.job';
    created_at: number;
    finished_at?: number | null;
    model: string;
    fine_tuned_model?: string | null;
    organization_id?: string;
    status: 'validating_files' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
    hyperparameters: {
        n_epochs: number | 'auto';
        batch_size?: number | 'auto' | null;
        learning_rate_multiplier?: number | 'auto' | null;
    };
    training_file: string;
    validation_file?: string | null;
    result_files: string[];
    trained_tokens?: number | null;
    error?: {
        code: string;
        message: string;
        param?: string | null;
    } | null;
    user_provided_suffix?: string | null;
    seed?: number | null;
    estimated_finish?: number | null;
    integrations?: Array<{
        type: 'wandb';
        wandb: {
            project: string;
            name?: string | null;
            entity?: string | null;
            tags?: string[];
        };
    }> | null;
}

// OpenAI Fine-tuning Job Event interface
interface FineTuningJobEvent {
    id: string;
    object: 'fine_tuning.job.event';
    created_at: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: Record<string, any> | null;
    type: 'message' | 'metrics';
}

// OpenAI Fine-tuning Job Checkpoint interface
interface FineTuningJobCheckpoint {
    id: string;
    object: 'fine_tuning.job.checkpoint';
    created_at: number;
    fine_tuned_model_checkpoint: string;
    step_number: number;
    metrics: {
        step?: number;
        train_loss?: number;
        train_mean_token_accuracy?: number;
        valid_loss?: number;
        valid_mean_token_accuracy?: number;
        full_valid_loss?: number;
        full_valid_mean_token_accuracy?: number;
    };
    fine_tuning_job_id: string;
}

// In-memory stores (for demo only)
const fineTuningJobs: FineTuningJob[] = [];
const fineTuningJobEvents: FineTuningJobEvent[] = [];
const fineTuningJobCheckpoints: FineTuningJobCheckpoint[] = [];

export const openaiListFineTuningJobsHandler: RequestHandler = (req, res) => {
    const { after, limit = 20 } = req.query;

    let filteredJobs = [...fineTuningJobs];

    // Apply pagination
    if (after) {
        const afterIndex = filteredJobs.findIndex(j => j.id === after);
        if (afterIndex !== -1) {
            filteredJobs = filteredJobs.slice(afterIndex + 1);
        }
    }

    // Apply limit
    filteredJobs = filteredJobs.slice(0, Number(limit));

    res.json({
        object: 'list',
        data: filteredJobs,
        has_more: false // Simplified for demo
    });
};

export const openaiCreateFineTuningJobHandler: RequestHandler = (req, res) => {
    const {
        model,
        training_file,
        validation_file,
        hyperparameters = {},
        suffix,
        seed,
        integrations
    } = req.body;

    // Validate required fields
    if (!model) {
        res.status(400).json({
            error: {
                message: 'Missing required field: model is required.',
                type: 'invalid_request_error',
                param: 'model',
                code: 'missing_required_parameter'
            }
        });
        return;
    }

    if (!training_file) {
        res.status(400).json({
            error: {
                message: 'Missing required field: training_file is required.',
                type: 'invalid_request_error',
                param: 'training_file',
                code: 'missing_required_parameter'
            }
        });
        return;
    }

    // Validate model
    const supportedModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'babbage-002', 'davinci-002'];
    if (!supportedModels.includes(model)) {
        res.status(400).json({
            error: {
                message: `Model '${model}' is not supported for fine-tuning.`,
                type: 'invalid_request_error',
                param: 'model',
                code: 'invalid_value'
            }
        });
        return;
    }

    const id = 'ftjob-' + Math.random().toString(36).slice(2, 15);
    const created_at = Math.floor(Date.now() / 1000);

    const job: FineTuningJob = {
        id,
        object: 'fine_tuning.job',
        created_at,
        finished_at: null,
        model,
        fine_tuned_model: null,
        status: 'validating_files',
        hyperparameters: {
            n_epochs: hyperparameters.n_epochs || 'auto',
            batch_size: hyperparameters.batch_size || 'auto',
            learning_rate_multiplier: hyperparameters.learning_rate_multiplier || 'auto'
        },
        training_file,
        validation_file: validation_file || null,
        result_files: [],
        trained_tokens: null,
        error: null,
        user_provided_suffix: suffix || null,
        seed: seed || null,
        estimated_finish: null,
        integrations: integrations || null
    };

    fineTuningJobs.push(job);

    // Create initial event
    const eventId = 'ftevent-' + Math.random().toString(36).slice(2, 15);
    const event: FineTuningJobEvent = {
        id: eventId,
        object: 'fine_tuning.job.event',
        created_at,
        level: 'info',
        message: 'Fine-tuning job created. Validating training file.',
        data: null,
        type: 'message'
    };
    fineTuningJobEvents.push(event);

    // Simulate job progression
    setTimeout(() => {
        job.status = 'queued';
        job.estimated_finish = created_at + 3600; // 1 hour estimate

        const queuedEvent: FineTuningJobEvent = {
            id: 'ftevent-' + Math.random().toString(36).slice(2, 15),
            object: 'fine_tuning.job.event',
            created_at: Math.floor(Date.now() / 1000),
            level: 'info',
            message: 'Fine-tuning job queued. Please wait for training to start.',
            data: null,
            type: 'message'
        };
        fineTuningJobEvents.push(queuedEvent);

        // Simulate start of training
        setTimeout(() => {
            job.status = 'running';

            const runningEvent: FineTuningJobEvent = {
                id: 'ftevent-' + Math.random().toString(36).slice(2, 15),
                object: 'fine_tuning.job.event',
                created_at: Math.floor(Date.now() / 1000),
                level: 'info',
                message: 'Fine-tuning job started.',
                data: { step: 1, train_loss: 2.5 },
                type: 'metrics'
            };
            fineTuningJobEvents.push(runningEvent);

            // Create some checkpoints
            for (let step = 10; step <= 50; step += 10) {
                const checkpoint: FineTuningJobCheckpoint = {
                    id: 'ftckpt-' + Math.random().toString(36).slice(2, 15),
                    object: 'fine_tuning.job.checkpoint',
                    created_at: Math.floor(Date.now() / 1000) + step,
                    fine_tuned_model_checkpoint: `${id}:ckpt-${step}`,
                    step_number: step,
                    metrics: {
                        step: step,
                        train_loss: 2.5 - (step * 0.03),
                        train_mean_token_accuracy: 0.5 + (step * 0.01),
                        valid_loss: 2.3 - (step * 0.025),
                        valid_mean_token_accuracy: 0.52 + (step * 0.008)
                    },
                    fine_tuning_job_id: id
                };
                fineTuningJobCheckpoints.push(checkpoint);
            }

            // Simulate completion
            setTimeout(() => {
                job.status = 'succeeded';
                job.finished_at = Math.floor(Date.now() / 1000);
                job.fine_tuned_model = `ft:${model}:${suffix || 'personal'}:${id.slice(-8)}`;
                job.trained_tokens = 50000;

                const completedEvent: FineTuningJobEvent = {
                    id: 'ftevent-' + Math.random().toString(36).slice(2, 15),
                    object: 'fine_tuning.job.event',
                    created_at: job.finished_at,
                    level: 'info',
                    message: 'Fine-tuning job completed successfully.',
                    data: {
                        step: 50,
                        train_loss: 1.0,
                        train_mean_token_accuracy: 0.95,
                        valid_loss: 1.05,
                        valid_mean_token_accuracy: 0.92
                    },
                    type: 'metrics'
                };
                fineTuningJobEvents.push(completedEvent);
            }, 5000); // Complete after 5 seconds for demo
        }, 2000); // Start after 2 seconds for demo
    }, 1000); // Queue after 1 second for demo

    res.status(201).json(job);
};

export const openaiRetrieveFineTuningJobHandler: RequestHandler = (req, res) => {
    const { job_id } = req.params;
    const job = fineTuningJobs.find(j => j.id === job_id);
    if (!job) {
        res.status(404).json({
            error: {
                message: 'No fine-tuning job found with that ID.',
                type: 'invalid_request_error',
                param: 'job_id',
                code: 'not_found'
            }
        });
        return;
    }
    res.json(job);
};

export const openaiCancelFineTuningJobHandler: RequestHandler = (req, res) => {
    const { job_id } = req.params;
    const job = fineTuningJobs.find(j => j.id === job_id);
    if (!job) {
        res.status(404).json({
            error: {
                message: 'No fine-tuning job found with that ID.',
                type: 'invalid_request_error',
                param: 'job_id',
                code: 'not_found'
            }
        });
        return;
    }

    if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') {
        res.status(400).json({
            error: {
                message: 'Cannot cancel a fine-tuning job that is already in a terminal state.',
                type: 'invalid_request_error',
                code: 'invalid_request'
            }
        });
        return;
    }

    job.status = 'cancelled';
    job.finished_at = Math.floor(Date.now() / 1000);

    // Create cancellation event
    const cancelEvent: FineTuningJobEvent = {
        id: 'ftevent-' + Math.random().toString(36).slice(2, 15),
        object: 'fine_tuning.job.event',
        created_at: job.finished_at,
        level: 'info',
        message: 'Fine-tuning job cancelled by user.',
        data: null,
        type: 'message'
    };
    fineTuningJobEvents.push(cancelEvent);

    res.json(job);
};

export const openaiListFineTuningJobEventsHandler: RequestHandler = (req, res) => {
    const { job_id } = req.params;
    const { after, limit = 20 } = req.query;

    // Check if job exists
    const job = fineTuningJobs.find(j => j.id === job_id);
    if (!job) {
        res.status(404).json({
            error: {
                message: 'No fine-tuning job found with that ID.',
                type: 'invalid_request_error',
                param: 'job_id',
                code: 'not_found'
            }
        });
        return;
    }

    let jobEvents = fineTuningJobEvents.slice(); // All events for simplicity

    // Apply pagination
    if (after) {
        const afterIndex = jobEvents.findIndex(e => e.id === after);
        if (afterIndex !== -1) {
            jobEvents = jobEvents.slice(afterIndex + 1);
        }
    }

    // Apply limit
    jobEvents = jobEvents.slice(0, Number(limit));

    res.json({
        object: 'list',
        data: jobEvents,
        has_more: false // Simplified for demo
    });
};

export const openaiListFineTuningJobCheckpointsHandler: RequestHandler = (req, res) => {
    const { job_id } = req.params;
    const { after, limit = 10 } = req.query;

    // Check if job exists
    const job = fineTuningJobs.find(j => j.id === job_id);
    if (!job) {
        res.status(404).json({
            error: {
                message: 'No fine-tuning job found with that ID.',
                type: 'invalid_request_error',
                param: 'job_id',
                code: 'not_found'
            }
        });
        return;
    }

    let jobCheckpoints = fineTuningJobCheckpoints.filter(c => c.fine_tuning_job_id === job_id);

    // Sort by step number descending
    jobCheckpoints.sort((a, b) => b.step_number - a.step_number);

    // Apply pagination
    if (after) {
        const afterIndex = jobCheckpoints.findIndex(c => c.id === after);
        if (afterIndex !== -1) {
            jobCheckpoints = jobCheckpoints.slice(afterIndex + 1);
        }
    }

    // Apply limit
    jobCheckpoints = jobCheckpoints.slice(0, Number(limit));

    res.json({
        object: 'list',
        data: jobCheckpoints,
        first_id: jobCheckpoints[0]?.id || null,
        last_id: jobCheckpoints[jobCheckpoints.length - 1]?.id || null,
        has_more: false // Simplified for demo
    });
};
