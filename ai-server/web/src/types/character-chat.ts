/**
 * Character Chat System Types and Interfaces
 * 
 * Comprehensive type definitions for the character chat interface,
 * memory system, and context gathering visualizations.
 */

// =============================================================================
// Core Memory Types
// =============================================================================

export interface CharacterMemory {
    id: string;
    characterId: string;
    memoryType: 'trait' | 'knowledge' | 'event' | 'relationship' | 'goal' | 'skill' | 'emotion' | 'preference';
    content: string;
    importance: number; // 0.0 to 1.0
    timelineAnchor?: string;
    associatedEntities: string[];
    sourceChunk?: number;
    accessCount: number;
    lastAccessed: Date;
    createdAt: Date;
    updatedAt: Date;
    memorySource: 'book_extraction' | 'user_interaction' | 'ai_gap_filling' | 'manual_entry';
    canonStatus: 'canon' | 'non_canon' | 'disputed' | 'pending_approval';
    affectsTimeline: boolean;
    conversationId?: string;
    
    // Gap-filling specific fields
    gapFillingContext?: {
        scenario: string;
        timeframe: string;
        confidence: number;
        userApproved?: boolean;
        approvalDate?: Date;
        reviewNotes?: string;
        alternativeScenarios?: string[];
    };
    
    // Relationship-specific fields
    relationshipDetails?: {
        targetEntityId: string;
        relationshipType: string;
        strength: number; // -1.0 to 1.0
        isSymmetrical: boolean;
        contextNotes?: string;
    };
    
    // Metadata
    tags: string[];
    emotionalValence?: number; // -1.0 to 1.0
    confidenceLevel: number; // 0.0 to 1.0
    isPrivate: boolean;
    requiresValidation: boolean;
}

// =============================================================================
// Chat System Types
// =============================================================================

export interface ChatMessage {
    id: string;
    conversationId: string;
    characterId: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
    memoryInfluence: Map<string, number>; // memoryId -> influence score
    contextUsed: string[]; // memory IDs used for context
    isStreaming?: boolean;
    reactions?: MessageReaction[];
    metadata?: {
        tokens?: number;
        model?: string;
        temperature?: number;
        responseTime?: number;
        contextLength?: number;
    };
}

export interface MessageReaction {
    id: string;
    messageId: string;
    userId: string;
    emoji: string;
    timestamp: Date;
}

export interface ConversationState {
    id: string;
    characterId: string;
    universeId?: string;
    title: string;
    status: 'active' | 'paused' | 'archived';
    messageCount: number;
    createdAt: Date;
    lastActivity: Date;
    participants: string[];
    settings: {
        memoryFilters: MemoryFilter[];
        contextWindowSize: number;
        temperature: number;
        enableMemoryFormation: boolean;
        enableContextVisualization: boolean;
    };
}

// =============================================================================
// Context Gathering Types
// =============================================================================

export interface ContextGatheringState {
    isGathering: boolean;
    searchResults: CharacterMemory[];
    selectedMemories: CharacterMemory[];
    relevanceScores: Map<string, number>; // memoryId -> relevance score
    contextPrompt: string;
    searchQuery?: string;
    searchStartTime?: Date;
    searchEndTime?: Date;
    gatheringStep?: 'searching' | 'scoring' | 'selecting' | 'assembling' | 'complete';
}

export interface SemanticSearchResult {
    memory: CharacterMemory;
    relevanceScore: number;
    similarityMetrics: {
        semantic: number;
        temporal: number;
        entity: number;
        importance: number;
        combined: number;
    };
    matchedTerms: string[];
    contextPath: string[];
}

export type ContextAssemblyStep = 
    | 'idle' 
    | 'searching' 
    | 'scoring' 
    | 'filtering' 
    | 'ranking' 
    | 'assembling' 
    | 'optimizing' 
    | 'complete';

// =============================================================================
// Memory Timeline Types
// =============================================================================

export interface MemoryTimelineNode {
    memory: CharacterMemory;
    isActive: boolean;
    relevanceScore: number;
    influenceScore: number;
    isHighlighted: boolean;
    position: {
        index: number;
        timestamp: Date;
        relativeTime: string;
    };
    clusters?: {
        topicCluster: string;
        temporalCluster: string;
        entityCluster: string[];
    };
}

export interface MemoryFilter {
    type: 'memory_type' | 'importance' | 'recency' | 'source' | 'canon_status' | 'entity' | 'tag';
    value: string | number | [number, number];
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
    isActive: boolean;
    label: string;
}

export interface TemporalPeriod {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
    memoryCount: number;
    importance: number;
    majorEvents: string[];
}

// =============================================================================
// Character Information Types
// =============================================================================

export interface CharacterInfo {
    id: string;
    name: string;
    universeId: string;
    description: string;
    personality: {
        traits: Array<{
            name: string;
            value: number; // -1.0 to 1.0
            description: string;
        }>;
        archetype: string;
        motivations: string[];
        fears: string[];
        quirks: string[];
    };
    
    // Visual representation
    avatar?: {
        url: string;
        description: string;
        style: 'realistic' | 'artistic' | 'cartoon' | 'abstract';
    };
    
    // Memory statistics
    memoryStats: {
        totalMemories: number;
        memoryTypes: Record<string, number>;
        avgImportance: number;
        lastMemoryCreated: Date;
        memoryFormationRate: number; // memories per conversation
    };
    
    // Chat settings
    chatSettings: {
        responseStyle: 'casual' | 'formal' | 'character_appropriate';
        verbosity: 'concise' | 'normal' | 'detailed';
        emotionalExpression: number; // 0.0 to 1.0
        creativityLevel: number; // 0.0 to 1.0
        memoryIntegrationLevel: 'minimal' | 'balanced' | 'comprehensive';
    };
    
    // Status
    status: 'active' | 'developing' | 'archived';
    lastActive: Date;
    conversationCount: number;
    totalMessageCount: number;
}

// =============================================================================
// Voice and Input Types
// =============================================================================

export type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error';

export interface VoiceSettings {
    enabled: boolean;
    language: string;
    autoSubmit: boolean;
    noiseReduction: boolean;
    confidence_threshold: number;
}

export interface TextToSpeechSettings {
    enabled: boolean;
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
    autoPlay: boolean;
    voiceGender: 'male' | 'female' | 'neutral';
}

// =============================================================================
// UI and Visualization Types
// =============================================================================

export interface MemoryVisualizationSettings {
    layout: 'timeline' | 'network' | 'cluster' | 'importance';
    colorScheme: 'type' | 'importance' | 'recency' | 'source';
    showConnections: boolean;
    animateChanges: boolean;
    groupBy: 'type' | 'time' | 'importance' | 'none';
    filterVisibility: boolean;
}

export interface ChatLayoutSettings {
    mode: 'dual-pane' | 'timeline-focus' | 'chat-focus' | 'minimal';
    timelinePosition: 'right' | 'left' | 'bottom' | 'floating';
    showContextVisualization: boolean;
    showMemoryInfluence: boolean;
    showAdvancedMetrics: boolean;
    autoScroll: boolean;
    compactMode: boolean;
}

export interface ThemeSettings {
    colorScheme: 'light' | 'dark' | 'auto';
    accentColor: string;
    fontFamily: 'system' | 'serif' | 'mono';
    fontSize: 'small' | 'medium' | 'large';
    density: 'compact' | 'comfortable' | 'spacious';
    animations: boolean;
    reducedMotion: boolean;
}

// =============================================================================
// Analytics and Metrics Types
// =============================================================================

export interface ConversationAnalytics {
    conversationId: string;
    startTime: Date;
    endTime?: Date;
    messageCount: number;
    userMessageCount: number;
    assistantMessageCount: number;
    
    // Memory metrics
    memoriesUsed: number;
    uniqueMemoriesUsed: number;
    avgMemoryRelevance: number;
    memoryTypesUsed: string[];
    newMemoriesFormed: number;
    
    // Quality metrics
    avgResponseTime: number;
    avgResponseLength: number;
    characterConsistencyScore: number;
    contextRelevanceScore: number;
    
    // Engagement metrics
    userEngagementScore: number;
    conversationDepth: number;
    topicTransitions: number;
    emotionalRange: number;
    
    // Technical metrics
    totalTokensUsed: number;
    avgContextLength: number;
    errorCount: number;
    regenerationCount: number;
}

export interface MemoryUsageMetrics {
    memoryId: string;
    accessCount: number;
    avgRelevanceScore: number;
    lastAccessed: Date;
    contextAppearances: number;
    influenceScore: number;
    usagePatterns: {
        conversationTypes: string[];
        topicContexts: string[];
        timePatterns: string[];
    };
}

// =============================================================================
// Error and Validation Types
// =============================================================================

export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code?: string;
}

export interface ChatError {
    id: string;
    type: 'network' | 'validation' | 'generation' | 'memory' | 'context' | 'system';
    message: string;
    details?: any;
    timestamp: Date;
    conversationId: string;
    recoverable: boolean;
    retryCount: number;
    context?: {
        messageId?: string;
        memoryId?: string;
        action?: string;
    };
}

// =============================================================================
// Plugin and Extension Types
// =============================================================================

export interface ChatPlugin {
    id: string;
    name: string;
    version: string;
    description: string;
    enabled: boolean;
    settings: Record<string, any>;
    
    // Plugin capabilities
    capabilities: {
        memoryTypes: string[];
        messageProcessing: boolean;
        contextModification: boolean;
        visualizations: string[];
        customActions: string[];
    };
    
    // Hooks
    hooks: {
        beforeMessageSend?: (message: ChatMessage) => Promise<ChatMessage>;
        afterMessageReceive?: (message: ChatMessage) => Promise<ChatMessage>;
        onMemoryAccess?: (memory: CharacterMemory) => Promise<CharacterMemory>;
        onContextGathering?: (context: ContextGatheringState) => Promise<ContextGatheringState>;
    };
}

// =============================================================================
// Export all types
// =============================================================================

export type {
    // Re-export for convenience
    CharacterMemory as Memory,
    ChatMessage as Message,
    CharacterInfo as Character,
    ConversationState as Conversation,
    ContextGatheringState as ContextGathering,
    MemoryTimelineNode as TimelineNode,
    MemoryFilter as Filter
};
