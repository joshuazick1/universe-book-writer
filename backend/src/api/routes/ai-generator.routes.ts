import { Router } from 'express';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { AIGeneratorController } from '../controllers/ai-generator.controller.js';

export function createAIGeneratorRoutes(
  authMiddleware: AuthMiddleware,
  aiGeneratorController: AIGeneratorController
): Router {
  const router = Router();

  // All generator routes require authentication
  router.use(authMiddleware.authenticate);

  // Universe generation endpoints
  router.post('/universe/generate', aiGeneratorController.generateUniverse.bind(aiGeneratorController));
  router.post('/universe/:universeId/expand', aiGeneratorController.expandUniverse.bind(aiGeneratorController));
  router.post('/universe/:universeId/validate', aiGeneratorController.validateUniverse.bind(aiGeneratorController));

  // Character generation endpoints
  router.post('/character/generate', aiGeneratorController.generateCharacter.bind(aiGeneratorController));
  router.post('/character/:characterId/expand', aiGeneratorController.expandCharacter.bind(aiGeneratorController));
  router.post('/character/:characterId/validate', aiGeneratorController.validateCharacter.bind(aiGeneratorController));

  // Memory integration endpoints
  router.post('/character/:characterId/memories', aiGeneratorController.integrateMemory.bind(aiGeneratorController));
  router.get('/character/:characterId/memories', aiGeneratorController.getCharacterMemories.bind(aiGeneratorController));

  // Health check
  router.get('/health', aiGeneratorController.getHealth.bind(aiGeneratorController));

  return router;
}
