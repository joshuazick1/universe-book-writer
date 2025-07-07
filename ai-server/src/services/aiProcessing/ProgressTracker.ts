/**
 * Progress Tracking System for Universal AI Processing Framework
 * 
 * Tracks and reports progress of multi-pass AI processing operations.
 * Provides real-time updates on processing status, pass completion, and estimated time.
 * 
 * @author Universe Book Writer Team
 * @version 1.0.0
 */

import {
    ProgressUpdate,
    PassProgress,
    PassType,
    AIResponse,
    ProcessingEvent,
    FrameworkEvent
} from './types.js';

interface ProgressState {
    requestId: string;
    totalPasses: number;
    completedPasses: number;
    currentPass: number;
    startTime: number;
    estimatedEndTime: number;
    passProgress: Map<number, PassProgress>;
    events: ProcessingEvent[];
    status: 'initializing' | 'processing' | 'completed' | 'failed';
}

/**
 * Manages progress tracking for multi-pass AI processing operations
 */
export class ProgressTracker {
    private progressStates: Map<string, ProgressState> = new Map();
    private progressCallbacks: Map<string, (update: ProgressUpdate) => void> = new Map();
    private eventListeners: ((event: FrameworkEvent) => void)[] = [];

    /**
     * Initialize progress tracking for a new request
     */
    initializeProgress(requestId: string, totalPasses: number): void {
        const now = Date.now();
        const estimatedTimePerPass = 30000; // 30 seconds per pass estimate

        const progressState: ProgressState = {
            requestId,
            totalPasses,
            completedPasses: 0,
            currentPass: 0,
            startTime: now,
            estimatedEndTime: now + (totalPasses * estimatedTimePerPass),
            passProgress: new Map(),
            events: [],
            status: 'initializing'
        };

        this.progressStates.set(requestId, progressState);

        // Emit initialization event
        this.emitEvent({
            type: 'processing_started',
            requestId,
            timestamp: new Date(),
            data: {
                totalPasses,
                estimatedTime: totalPasses * estimatedTimePerPass,
                classification: null // Will be filled by caller if available
            }
        });

        // Send initial progress update
        this.sendProgressUpdate(requestId, {
            requestId,
            passNumber: 0,
            status: 'starting',
            progress: 0,
            message: `Starting processing with ${totalPasses} planned passes`,
            timestamp: new Date()
        });
    }

    /**
     * Track progress of a specific pass
     */
    trackPassProgress(requestId: string, passProgress: Partial<PassProgress> & {
        passNumber: number;
        status: PassProgress['status'];
        timestamp: number;
        reason?: string;
        result?: any;
        error?: string;
    }): void {
        const state = this.progressStates.get(requestId);
        if (!state) {
            console.warn(`No progress state found for request ${requestId}`);
            return;
        }

        // Update current pass number
        if (passProgress.passNumber > state.currentPass) {
            state.currentPass = passProgress.passNumber;
        }

        // Create full pass progress object
        const fullPassProgress: PassProgress = {
            requestId,
            passNumber: passProgress.passNumber,
            totalPasses: state.totalPasses,
            passType: this.determinePassType(passProgress.passNumber),
            status: passProgress.status,
            progress: this.calculatePassProgress(passProgress.status),
            estimatedTimeRemaining: this.calculateRemainingTime(state, passProgress.passNumber),
            currentActivity: this.getActivityDescription(passProgress.status, passProgress.passNumber),
            qualityScore: passProgress.result?.qualityScore
        };

        // Store pass progress
        state.passProgress.set(passProgress.passNumber, fullPassProgress);

        // Add event to history
        const event: ProcessingEvent = {
            timestamp: new Date(passProgress.timestamp),
            type: this.getEventType(passProgress.status),
            passNumber: passProgress.passNumber,
            details: {
                status: passProgress.status,
                reason: passProgress.reason,
                error: passProgress.error,
                result: passProgress.result
            }
        };
        state.events.push(event);

        // Update completion count
        if (passProgress.status === 'completed') {
            state.completedPasses = Math.max(state.completedPasses, passProgress.passNumber);
        }

        // Update overall status
        if (passProgress.status === 'failed' && !passProgress.reason?.includes('retrying')) {
            state.status = 'failed';
        } else if (state.completedPasses >= state.totalPasses) {
            state.status = 'completed';
        } else {
            state.status = 'processing';
        }

        // Send progress update
        this.sendProgressUpdate(requestId, {
            requestId,
            passNumber: passProgress.passNumber,
            status: passProgress.status as any,
            progress: this.calculateOverallProgress(state),
            message: this.getProgressMessage(passProgress, state),
            timestamp: new Date(passProgress.timestamp),
            details: {
                currentPass: passProgress.passNumber,
                totalPasses: state.totalPasses,
                estimatedTimeRemaining: fullPassProgress.estimatedTimeRemaining,
                qualityScore: fullPassProgress.qualityScore
            }
        });

        // Emit framework event for pass completion
        if (passProgress.status === 'completed') {
            this.emitEvent({
                type: 'pass_complete',
                requestId,
                timestamp: new Date(passProgress.timestamp),
                data: {
                    passNumber: passProgress.passNumber,
                    passType: fullPassProgress.passType,
                    result: passProgress.result,
                    nextPass: passProgress.passNumber < state.totalPasses ?
                        this.createNextPassProgress(state, passProgress.passNumber + 1) : undefined
                }
            });
        }
    }

    /**
     * Finalize progress tracking when processing completes
     */
    finalizeProgress(requestId: string, response: AIResponse): void {
        const state = this.progressStates.get(requestId);
        if (!state) {
            console.warn(`No progress state found for request ${requestId}`);
            return;
        }

        // Update final state
        state.status = response.success ? 'completed' : 'failed';
        state.completedPasses = response.passResults.length;

        // Send final progress update
        this.sendProgressUpdate(requestId, {
            requestId,
            passNumber: state.currentPass,
            status: state.status as any,
            progress: 1.0,
            message: response.success ?
                `Processing completed successfully in ${response.passResults.length} passes` :
                `Processing failed: ${response.error || 'Unknown error'}`,
            timestamp: new Date(),
            details: {
                success: response.success,
                totalExecutionTime: response.processingMetrics.totalExecutionTime,
                passesExecuted: response.processingMetrics.passesExecuted,
                finalQualityScore: response.qualityScore,
                error: response.error
            }
        });

        // Emit final event
        this.emitEvent({
            type: 'processing_complete',
            requestId,
            timestamp: new Date(),
            data: {
                success: response.success,
                totalTime: response.processingMetrics.totalExecutionTime,
                passesExecuted: response.processingMetrics.passesExecuted,
                finalResult: response
            }
        });

        // Clean up state after a delay (keep for debugging)
        setTimeout(() => {
            this.progressStates.delete(requestId);
            this.progressCallbacks.delete(requestId);
        }, 300000); // 5 minutes
    }

    /**
     * Get current progress for a request
     */
    getProgress(requestId: string): ProgressState | null {
        return this.progressStates.get(requestId) || null;
    }

    /**
     * Register a callback for progress updates
     */
    onProgress(requestId: string, callback: (update: ProgressUpdate) => void): void {
        this.progressCallbacks.set(requestId, callback);
    }

    /**
     * Register a callback for framework events
     */
    addEventListener(listener: (event: FrameworkEvent) => void): void {
        this.eventListeners.push(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(listener: (event: FrameworkEvent) => void): void {
        const index = this.eventListeners.indexOf(listener);
        if (index > -1) {
            this.eventListeners.splice(index, 1);
        }
    }

    /**
     * Get progress summary for all active requests
     */
    getAllProgress(): Record<string, ProgressState> {
        const result: Record<string, ProgressState> = {};
        this.progressStates.forEach((state, requestId) => {
            result[requestId] = state;
        });
        return result;
    }

    /**
     * Private helper methods
     */

    private sendProgressUpdate(requestId: string, update: ProgressUpdate): void {
        const callback = this.progressCallbacks.get(requestId);
        if (callback) {
            try {
                callback(update);
            } catch (error) {
                console.error(`Error in progress callback for ${requestId}:`, error);
            }
        }
    }

    private emitEvent(event: FrameworkEvent): void {
        this.eventListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }

    private determinePassType(passNumber: number): PassType {
        // Map pass numbers to types based on common patterns
        const passTypeMap: Record<number, PassType> = {
            1: 'analysis_classification',
            2: 'context_gathering',
            3: 'initial_generation',
            4: 'quality_assessment',
            5: 'targeted_improvement',
            6: 'cross_reference_validation',
            7: 'final_polish_integration'
        };

        return passTypeMap[passNumber] || 'initial_generation';
    }

    private calculatePassProgress(status: PassProgress['status']): number {
        const progressMap: Record<PassProgress['status'], number> = {
            'starting': 0.1,
            'in_progress': 0.5,
            'quality_check': 0.8,
            'completed': 1.0,
            'failed': 0.0,
            'skipped': 0.0
        };

        return progressMap[status] || 0.0;
    }

    private calculateOverallProgress(state: ProgressState): number {
        if (state.totalPasses === 0) return 0;

        let totalProgress = 0;

        // Add progress from completed passes
        totalProgress += state.completedPasses;

        // Add partial progress from current pass
        const currentPassProgress = state.passProgress.get(state.currentPass);
        if (currentPassProgress && state.currentPass > state.completedPasses) {
            totalProgress += currentPassProgress.progress;
        }

        return Math.min(1.0, totalProgress / state.totalPasses);
    }

    private calculateRemainingTime(state: ProgressState, currentPass: number): number {
        const elapsed = Date.now() - state.startTime;
        const passesCompleted = state.completedPasses +
            (state.passProgress.get(currentPass)?.progress || 0);

        if (passesCompleted === 0) {
            return state.estimatedEndTime - Date.now();
        }

        const averageTimePerPass = elapsed / passesCompleted;
        const remainingPasses = state.totalPasses - passesCompleted;

        return Math.max(0, remainingPasses * averageTimePerPass);
    }

    private getActivityDescription(status: PassProgress['status'], passNumber: number): string {
        const passName = this.getPassName(passNumber);

        switch (status) {
            case 'starting':
                return `Starting ${passName}`;
            case 'in_progress':
                return `Executing ${passName}`;
            case 'quality_check':
                return `Quality checking ${passName}`;
            case 'completed':
                return `Completed ${passName}`;
            case 'failed':
                return `Failed ${passName}`;
            default:
                return `Processing ${passName}`;
        }
    }

    private getPassName(passNumber: number): string {
        const passNames: Record<number, string> = {
            1: 'Task Analysis',
            2: 'Context Gathering',
            3: 'Initial Generation',
            4: 'Quality Assessment',
            5: 'Targeted Improvement',
            6: 'Cross-Reference Validation',
            7: 'Final Polish & Integration'
        };

        return passNames[passNumber] || `Pass ${passNumber}`;
    }

    private getEventType(status: PassProgress['status']): ProcessingEvent['type'] {
        switch (status) {
            case 'starting':
                return 'pass_started';
            case 'completed':
                return 'pass_completed';
            case 'failed':
                return 'error';
            case 'quality_check':
                return 'quality_check';
            default:
                return 'decision';
        }
    }

    private getProgressMessage(passProgress: any, state: ProgressState): string {
        const passName = this.getPassName(passProgress.passNumber);
        const overallPercent = Math.round(this.calculateOverallProgress(state) * 100);

        switch (passProgress.status) {
            case 'starting':
                return `Starting ${passName} (${overallPercent}% complete)`;
            case 'in_progress':
                return `Processing ${passName} (${overallPercent}% complete)`;
            case 'quality_check':
                return `Quality checking ${passName} (${overallPercent}% complete)`;
            case 'completed':
                return `Completed ${passName} (${overallPercent}% complete)`;
            case 'failed':
                return `Failed ${passName}: ${passProgress.error || 'Unknown error'}`;
            case 'skipped':
                return `Skipped ${passName}: ${passProgress.reason || 'Not needed'}`;
            default:
                return `Processing ${passName} (${overallPercent}% complete)`;
        }
    }

    private createNextPassProgress(state: ProgressState, nextPassNumber: number): PassProgress {
        return {
            requestId: state.requestId,
            passNumber: nextPassNumber,
            totalPasses: state.totalPasses,
            passType: this.determinePassType(nextPassNumber),
            status: 'starting',
            progress: 0,
            estimatedTimeRemaining: this.calculateRemainingTime(state, nextPassNumber),
            currentActivity: `Preparing ${this.getPassName(nextPassNumber)}`
        };
    }
}
