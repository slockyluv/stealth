import type { SelectMenuHandler } from '../../../types/component.js';
import { settingsSectionSelect } from './settingsSection.js';
import { settingsAutoRolesSelect } from './settingsAutoRoles.js';

export const selectMenuHandlers: SelectMenuHandler[] = [
  settingsSectionSelect,
  settingsAutoRolesSelect
];