/**
 * Universal AI Processing Framework - Main Exports
 * 
 * This barrel file exports all the core framework components for easy importing
 * throughout the application.
 * 
 * @author Universe Book Writer Team
 * @version 1.0.0
 */

// Core abstract base class
export { UniversalProcessor } from './UniversalProcessor.js';

// Supporting framework classes
export { QualityGates } from './QualityGates.js';
export { ProgressTracker } from './ProgressTracker.js';
export { PassSelector } from './PassSelector.js';
export { TaskClassifier } from './TaskClassifier.js';

// All framework types
export * from './types.js';

// Framework utilities and helpers - import directly from utils.js as needed
