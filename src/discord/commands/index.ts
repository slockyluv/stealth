import { ping } from './ping.js';
import { ui } from './ui.js';
import { server } from './server.js';
import { settings } from './settings.js';
import { mute, unmute } from './mute.js';
import { mutes } from './mutes.js';
import { ban, unban } from './ban.js';
import { kick } from './kick.js';
import { setnick } from './setnick.js';
import { addRole, takeRole, tempRole } from './roles.js';
import { nabor } from './nabor.js';

export const commands = [
  ping,
  ui,
  server,
  settings,
  mute,
  unmute,
  mutes,
  ban,
  unban,
  kick,
  setnick,
  nabor,
  addRole,
  takeRole,
  tempRole
];