import type { VoiceState } from 'discord.js';
import { logger } from '../../shared/logger.js';
import { handleVoiceStateUpdate } from '../../services/levelService.js';

export async function voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  try {
    await handleVoiceStateUpdate(oldState, newState);
  } catch (error) {
    logger.error(error);
  }
}