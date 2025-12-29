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
  settingsCountriesFirstButton,
  settingsCountriesLastButton,
  settingsCountriesNextButton,
  settingsCountriesPrevButton
} from './settingsCountries.js';
import { serverTabsButton } from './serverTabs.js';
import { mutesPageButton } from './mutes.js';

export const buttonHandlers: ButtonHandler[] = [
  demoHelloButton,
  actionLogsPageButton,
  actionLogsHomeButton,
  settingsBackButton,
  settingsClearRolesButton,
  settingsAutoPrevButton,
  settingsAutoNextButton,
  settingsCountriesFirstButton,
  settingsCountriesPrevButton,
  settingsCountriesNextButton,
  settingsCountriesLastButton,
  serverTabsButton,
  mutesPageButton
];