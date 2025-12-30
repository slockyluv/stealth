import type { SelectMenuHandler } from '../../../types/component.js';
import { settingsSectionSelect } from './settingsSection.js';
import { settingsAutoRolesSelect } from './settingsAutoRoles.js';
import { actionLogsChannelSelect, actionLogsSectionSelect } from './actionLogs.js';
import { applicationReviewSelect, applicationSelectMenu } from './applications.js';
import { settingsCountriesContinentSelect, settingsCountriesSelect } from './settingsCountries.js';
import { registrationContinentSelect } from './registrationContinent.js';
import { registrationCountrySelect } from './registrationCountry.js';

export const selectMenuHandlers: SelectMenuHandler[] = [
  settingsSectionSelect,
  settingsAutoRolesSelect,
  settingsCountriesContinentSelect,
  settingsCountriesSelect,
  registrationContinentSelect,
  registrationCountrySelect,
  actionLogsSectionSelect,
  actionLogsChannelSelect,
  applicationSelectMenu,
  applicationReviewSelect
];