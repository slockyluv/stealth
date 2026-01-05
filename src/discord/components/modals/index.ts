import type { ModalHandler } from '../../../types/component.js';
import { settingsEmojiColorModal } from './settingsEmojiColor.js';
import { applicationDecisionModal, applicationSubmitModal } from './applications.js';
import { settingsCountriesEditModal } from './settingsCountries.js';
import { profileEditModal } from './profile.js';
import { financeForeignTaxEditModal, financeResidentTaxEditModal, financeTaxationEditModal } from './finance.js';
import { companyNameModal } from './companyRegistration.js';

export const modalHandlers: ModalHandler[] = [
  settingsEmojiColorModal,
  applicationSubmitModal,
  applicationDecisionModal,
  settingsCountriesEditModal,
  profileEditModal,
  financeTaxationEditModal,
  financeResidentTaxEditModal,
  financeForeignTaxEditModal,
  companyNameModal
];