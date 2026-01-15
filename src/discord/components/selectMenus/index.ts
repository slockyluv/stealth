import type { SelectMenuHandler } from '../../../types/component.js';
import { settingsSectionSelect } from './settingsSection.js';
import { settingsAutoRolesSelect } from './settingsAutoRoles.js';
import { actionLogsChannelSelect, actionLogsSectionSelect } from './actionLogs.js';
import { applicationReviewSelect, applicationSelectMenu } from './applications.js';
import { settingsCountriesContinentSelect, settingsCountriesSelect } from './settingsCountries.js';
import { registrationContinentSelect } from './registrationContinent.js';
import { registrationCountrySelect } from './registrationCountry.js';
import { profileTabSelect } from './profile.js';
import { registrationTypeSelect } from './registrationType.js';
import { companyIndustrySelect } from './companyIndustry.js';
import { companyContinentSelect } from './companyContinent.js';
import { companyCountrySelect } from './companyCountry.js';
import { companyProfileTabSelect } from './companyProfile.js';
import { companyExistingSelect } from './companyExisting.js';
import { topSectionSelect } from './top.js';

export const selectMenuHandlers: SelectMenuHandler[] = [
  settingsSectionSelect,
  settingsAutoRolesSelect,
  settingsCountriesContinentSelect,
  settingsCountriesSelect,
  registrationContinentSelect,
  registrationCountrySelect,
  registrationTypeSelect,
  companyIndustrySelect,
  companyContinentSelect,
  companyCountrySelect,
  companyExistingSelect,
  actionLogsSectionSelect,
  actionLogsChannelSelect,
  applicationSelectMenu,
  applicationReviewSelect,
  profileTabSelect,
  companyProfileTabSelect,
  topSectionSelect
];