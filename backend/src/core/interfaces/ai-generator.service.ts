export interface UniverseGenerationRequest {
  prompt: string;
  genre?: string;
  complexity?: 'low' | 'medium' | 'high';
  additionalContext?: string;
  userId: string;
}

export interface UniverseExpansionRequest {
  universeId: string;
  prompt: string;
  aspects?: string[];
  userId: string;
}

export interface UniverseValidationRequest {
  universeId: string;
  userId: string;
}

export interface CharacterGenerationRequest {
  prompt: string;
  universeId?: string;
  characterType?: 'protagonist' | 'antagonist' | 'supporting' | 'background';
  relationshipContext?: string;
  userId: string;
}

export interface CharacterExpansionRequest {
  characterId: string;
  prompt: string;
  aspects?: string[];
  userId: string;
}

export interface CharacterValidationRequest {
  characterId: string;
  userId: string;
}

export interface MemoryIntegrationRequest {
  characterId: string;
  memoryData: {
    content: string;
    context?: string;
    importance?: number;
    tags?: string[];
  };
  userId: string;
}

export interface CharacterMemoriesRequest {
  characterId: string;
  userId: string;
}

export interface GeneratedUniverse {
  id: string;
  name: string;
  description: string;
  genre: string;
  setting: {
    timeFrame: string;
    location: string;
    technologyLevel: string;
  };
  rules: string[];
  themes: string[];
  conflicts: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedCharacter {
  id: string;
  name: string;
  description: string;
  backstory: string;
  personality: {
    traits: string[];
    motivations: string[];
    fears: string[];
  };
  appearance: {
    physicalDescription: string;
    distinguishingFeatures: string[];
  };
  relationships: Array<{
    characterId?: string;
    characterName: string;
    relationship: string;
    description: string;
  }>;
  skills: string[];
  equipment: string[];
  universeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  isValid: boolean;
  issues: Array<{
    type: 'inconsistency' | 'contradiction' | 'missing_info' | 'quality';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestions: string[];
  }>;
  score: number; // 0-100
  recommendations: string[];
}

export interface MemoryIntegrationResult {
  success: boolean;
  memoryId: string;
  integratedCount: number;
  suggestions: string[];
}

export interface CharacterMemory {
  id: string;
  content: string;
  context?: string;
  importance: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  aiServerConnection: boolean;
  modelAvailability: {
    [modelName: string]: boolean;
  };
  responseTime: number;
  lastChecked: Date;
}

export interface AIGeneratorService {
  generateUniverse(request: UniverseGenerationRequest): Promise<GeneratedUniverse>;
  expandUniverse(request: UniverseExpansionRequest): Promise<GeneratedUniverse>;
  validateUniverse(request: UniverseValidationRequest): Promise<ValidationResult>;
  
  generateCharacter(request: CharacterGenerationRequest): Promise<GeneratedCharacter>;
  expandCharacter(request: CharacterExpansionRequest): Promise<GeneratedCharacter>;
  validateCharacter(request: CharacterValidationRequest): Promise<ValidationResult>;
  
  integrateMemory(request: MemoryIntegrationRequest): Promise<MemoryIntegrationResult>;
  getCharacterMemories(request: CharacterMemoriesRequest): Promise<CharacterMemory[]>;
  
  getHealth(): Promise<HealthStatus>;
}
