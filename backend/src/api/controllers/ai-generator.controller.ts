import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AIGeneratorService } from '../../core/interfaces/ai-generator.service.js';
import logger from '../../../../shared/logging/logger.js';

export class AIGeneratorController {
  constructor(private aiGeneratorService: AIGeneratorService) { }

  /**
   * Generate a new universe
   */
  async generateUniverse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { prompt, genre, complexity, additionalContext } = req.body;
      const userId = req.user!.id;

      logger.info(`Generating universe for user ${userId}`);

      const result = await this.aiGeneratorService.generateUniverse({
        prompt,
        genre,
        complexity,
        additionalContext,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error generating universe', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to generate universe',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Expand an existing universe
   */
  async expandUniverse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { universeId } = req.params;
      const { prompt, aspects } = req.body;
      const userId = req.user!.id;

      const result = await this.aiGeneratorService.expandUniverse({
        universeId,
        prompt,
        aspects,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error expanding universe', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to expand universe',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate universe consistency
   */
  async validateUniverse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { universeId } = req.params;
      const userId = req.user!.id;

      const result = await this.aiGeneratorService.validateUniverse({
        universeId,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error validating universe', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to validate universe',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate a new character
   */
  async generateCharacter(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { prompt, universeId, characterType, relationshipContext } = req.body;
      const userId = req.user!.id;

      const result = await this.aiGeneratorService.generateCharacter({
        prompt,
        universeId,
        characterType,
        relationshipContext,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error generating character', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to generate character',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Expand an existing character
   */
  async expandCharacter(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { characterId } = req.params;
      const { prompt, aspects } = req.body;
      const userId = req.user!.id;

      const result = await this.aiGeneratorService.expandCharacter({
        characterId,
        prompt,
        aspects,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error expanding character', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to expand character',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate character consistency
   */
  async validateCharacter(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { characterId } = req.params;
      const userId = req.user!.id;

      const result = await this.aiGeneratorService.validateCharacter({
        characterId,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error validating character', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to validate character',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Integrate memory for a character
   */
  async integrateMemory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { characterId } = req.params;
      const { memoryData } = req.body;
      const userId = req.user!.id;

      const result = await this.aiGeneratorService.integrateMemory({
        characterId,
        memoryData,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error integrating memory', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to integrate memory',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get character memories
   */
  async getCharacterMemories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { characterId } = req.params;
      const userId = req.user!.id;

      const result = await this.aiGeneratorService.getCharacterMemories({
        characterId,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting character memories', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get character memories',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Health check for AI generator service
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.aiGeneratorService.getHealth();

      res.status(200).json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Error checking AI generator health', { error });
      res.status(500).json({
        success: false,
        message: 'AI generator service unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
