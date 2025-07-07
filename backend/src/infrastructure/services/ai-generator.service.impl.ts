import axios, { AxiosInstance } from 'axios';
import { 
  AIGeneratorService,
  UniverseGenerationRequest,
  UniverseExpansionRequest,
  UniverseValidationRequest,
  CharacterGenerationRequest,
  CharacterExpansionRequest,
  CharacterValidationRequest,
  MemoryIntegrationRequest,
  CharacterMemoriesRequest,
  GeneratedUniverse,
  GeneratedCharacter,
  ValidationResult,
  MemoryIntegrationResult,
  CharacterMemory,
  HealthStatus
} from '../../core/interfaces/ai-generator.service.js';

export class AIGeneratorServiceImpl implements AIGeneratorService {
  private client: AxiosInstance;

  constructor() {
    const aiServerUrl = process.env.AI_SERVER_URL || 'http://localhost:3001';
    
    this.client = axios.create({
      baseURL: `${aiServerUrl}/api/generate`,
      timeout: 300000, // 5 minutes for AI operations
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async generateUniverse(request: UniverseGenerationRequest): Promise<GeneratedUniverse> {
    try {
      const response = await this.client.post('/universe/generate', {
        prompt: request.prompt,
        genre: request.genre,
        complexity: request.complexity,
        additionalContext: request.additionalContext,
        userContext: {
          userId: request.userId
        }
      });

      return response.data.universe;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Server Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async expandUniverse(request: UniverseExpansionRequest): Promise<GeneratedUniverse> {
    try {
      const response = await this.client.post(`/universe/${request.universeId}/expand`, {
        prompt: request.prompt,
        aspects: request.aspects,
        userContext: {
          userId: request.userId
        }
      });

      return response.data.universe;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Server Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async validateUniverse(request: UniverseValidationRequest): Promise<ValidationResult> {
    try {
      const response = await this.client.post(`/universe/${request.universeId}/validate`, {
        userContext: {
          userId: request.userId
        }
      });

      return response.data.validation;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Server Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async generateCharacter(request: CharacterGenerationRequest): Promise<GeneratedCharacter> {
    try {
      const response = await this.client.post('/character/generate', {
        prompt: request.prompt,
        universeId: request.universeId,
        characterType: request.characterType,
        relationshipContext: request.relationshipContext,
        userContext: {
          userId: request.userId
        }
      });

      return response.data.character;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Server Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async expandCharacter(request: CharacterExpansionRequest): Promise<GeneratedCharacter> {
    try {
      const response = await this.client.post(`/character/${request.characterId}/expand`, {
        prompt: request.prompt,
        aspects: request.aspects,
        userContext: {
          userId: request.userId
        }
      });

      return response.data.character;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Server Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async validateCharacter(request: CharacterValidationRequest): Promise<ValidationResult> {
    try {
      const response = await this.client.post(`/character/${request.characterId}/validate`, {
        userContext: {
          userId: request.userId
        }
      });

      return response.data.validation;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Server Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async integrateMemory(request: MemoryIntegrationRequest): Promise<MemoryIntegrationResult> {
    try {
      const response = await this.client.post(`/character/${request.characterId}/memories`, {
        memoryData: request.memoryData,
        userContext: {
          userId: request.userId
        }
      });

      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Server Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getCharacterMemories(request: CharacterMemoriesRequest): Promise<CharacterMemory[]> {
    try {
      const response = await this.client.get(`/character/${request.characterId}/memories`, {
        params: {
          userId: request.userId
        }
      });

      return response.data.memories;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AI Server Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getHealth(): Promise<HealthStatus> {
    try {
      const response = await this.client.get('/health');
      return response.data.health;
    } catch (error) {
      // If we can't reach the AI server, return unhealthy status
      return {
        status: 'unhealthy',
        aiServerConnection: false,
        modelAvailability: {},
        responseTime: -1,
        lastChecked: new Date()
      };
    }
  }
}
