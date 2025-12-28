import type { ModalHandler } from '../../../types/component.js';
import { settingsEmojiColorModal } from './settingsEmojiColor.js';
import { applicationDecisionModal, applicationSubmitModal } from './applications.js';

export const modalHandlers: ModalHandler[] = [
  settingsEmojiColorModal,
  applicationSubmitModal,
  applicationDecisionModal
];