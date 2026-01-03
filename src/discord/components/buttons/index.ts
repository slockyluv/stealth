import type { ButtonHandler } from '../../../types/component.js';
import { demoHelloButton } from './demoHello.js';
import { actionLogsHomeButton, actionLogsPageButton } from './actionLogs.js';
import {
  settingsAutoNextButton,
  settingsAutoPrevButton,
  settingsBackButton,
  settingsClearRolesButton
} from './settingsAutoRoles.js';
import {
  settingsCountriesBackButton,
  settingsCountriesEditButton,
  settingsCountriesFirstButton,
  settingsCountriesLastButton,
  settingsCountriesNextButton,
  settingsCountriesTabButton,
  settingsCountriesResetButton,
  settingsCountriesPrevButton
} from './settingsCountries.js';
import { serverTabsButton } from './serverTabs.js';
import { mutesPageButton } from './mutes.js';
import { registrationBackButton, registrationPageButton } from './registrationNavigation.js';
import { profileEditButton } from './profile.js';
import { financeBudgetBackButton, financeBudgetButton, financeTaxationEditButton } from './finance.js';

export const buttonHandlers: ButtonHandler[] = [
  demoHelloButton,
  actionLogsPageButton,
  actionLogsHomeButton,
  settingsBackButton,
  settingsClearRolesButton,
  settingsAutoPrevButton,
  settingsAutoNextButton,
  settingsCountriesBackButton,
  settingsCountriesEditButton,
  settingsCountriesFirstButton,
  settingsCountriesPrevButton,
  settingsCountriesNextButton,
  settingsCountriesLastButton,
  settingsCountriesTabButton,
  settingsCountriesResetButton,
  serverTabsButton,
  mutesPageButton,
  registrationBackButton,
  registrationPageButton,
  profileEditButton,
  financeBudgetButton,
  financeBudgetBackButton,
  financeTaxationEditButton
];