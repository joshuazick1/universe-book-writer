/**
 * Character Chat Components - Main exports
 * 
 * Export all character chat interface components, hooks, and types
 * for use throughout the AI server showcase application.
 */

// Main Interface Components
// CharacterChatInterface is in pages/character-chat/ not components

// Chat Components
export { default as ChatMessagePanel } from './ChatMessagePanel';
export type { ChatMessagePanelRef } from './ChatMessagePanel';

export { default as MemoryTimelineVisualization } from './MemoryTimelineVisualization';
export type { MemoryTimelineRef } from './MemoryTimelineVisualization';

export { default as ContextGatheringVisualizer } from './ContextGatheringVisualizer';

export { default as MemoryInfluenceTracker } from './MemoryInfluenceTracker';

export { default as CharacterPersonalityDisplay } from './CharacterPersonalityDisplay';

export { default as CharacterSwitcher } from './CharacterSwitcher';

export { default as ConversationHistoryManager } from './ConversationHistoryManager';

// Memory Components
export { default as MemoryDetailsPanel } from './MemoryDetailsPanel';

export { default as MessageMemoryInfluence } from './MessageMemoryInfluence';

// UI Components
export { default as TypingIndicator } from './TypingIndicator';

export { default as MemoryTypeIcon } from './MemoryTypeIcon';

export { default as MessageActions } from './MessageActions';

// Hooks
export { default as useWebSocket } from '../../hooks/useWebSocket';
export { default as useCharacterMemory } from '../../hooks/useCharacterMemory';

// Types
export * from '../../types/character-chat';
// - MemoryInfluenceFlow
// - MemoryInfluenceTracker

// Additional utility components that would enhance the interface:
// - VoiceInputButton
// - MessageRatingSystem
// - ConversationExporter
// - MemorySearchBar
// - ContextOptimizationPanel
// - RealTimeAnalytics
// - ErrorBoundary
// - LoadingStates
// - EmptyStates

/**
 * Usage Example:
 * 
 * ```tsx
 * import { 
 *   CharacterChatInterface,
 *   useWebSocket,
 *   useCharacterMemory
 * } from './components/character-chat';
 * 
 * function App() {
 *   return (
 *     <CharacterChatInterface
 *       initialCharacterId="char_123"
 *       universeId="universe_456"
 *       showAdvancedFeatures={true}
 *       enableMultiCharacter={false}
 *     />
 *   );
 * }
 * ```
 */
