import type { SelectMenuHandler } from '../../../types/component.js';
import { settingsSectionSelect } from './settingsSection.js';
import { settingsAutoRolesSelect } from './settingsAutoRoles.js';
import { actionLogsChannelSelect, actionLogsSectionSelect } from './actionLogs.js';

export const selectMenuHandlers: SelectMenuHandler[] = [
  settingsSectionSelect,
  settingsAutoRolesSelect,
  actionLogsSectionSelect,
  actionLogsChannelSelect
];